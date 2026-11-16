import { Sparkles, Box, RectangleVertical, Square, Rows4, Minus, LayoutGrid, Hash } from 'lucide-react';

// ─── PDF.js CDN loader ────────────────────────────────────────────────────────
async function loadPdfJs() {
  if (window.pdfjsLib) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load PDF renderer'));
    document.head.appendChild(s);
  });
}

async function pdfToImages(file, onLog) {
  await loadPdfJs();
  onLog('Reading PDF...');
  const ab = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
  const total = pdf.numPages;
  onLog(`${total} page${total !== 1 ? 's' : ''} found`);

  const limit = Math.min(total, 20);
  const images = [];
  for (let i = 1; i <= limit; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    images.push({ data: canvas.toDataURL('image/jpeg', 0.88).split(',')[1], mime: 'image/jpeg' });
    onLog(`Converted page ${i} of ${limit}`);
  }
  return images;
}

async function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const [meta, data] = r.result.split(',');
      resolve({ data, mime: meta.split(':')[1].split(';')[0] });
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ─── Bar normalization ────────────────────────────────────────────────────────
const BAR_REMAP = { T8: 'Y8', T12: 'Y12', T16: 'Y16', T20: 'Y20' };
function normDia(d) {
  if (!d) return null;
  // Strip leading digit prefix — e.g. "1Y8" (ring-count prefix) → "Y8"
  const stripped = String(d).replace(/^\d+/, '').trim();
  return BAR_REMAP[stripped] ?? stripped;
}
function normBar(b) {
  if (!b || !b.dia) return null;
  return { dia: normDia(b.dia), spacing: b.spacing_mm ?? b.spacing ?? 200 };
}
// Safely parse a bar count — handles negatives ("-2" → 2) and strings
function parseCount(v) {
  const n = parseInt(String(v ?? 0).replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
function isStripType(rawType, name) {
  const t = (rawType || '').toUpperCase();
  const n = (name   || '').toUpperCase();
  return t.includes('BOUNDARY') || t.includes('STRIP') ||
         n.startsWith('SF') || n.startsWith('SF-');
}

function mapFootingType(t) {
  const u = (t || '').toUpperCase();
  if (u.includes('ECCENTRIC'))                        return 'eccentric';
  if (u.includes('COMBINE') || u.includes('COMBINED')) return 'combined';
  if (u.includes('LIFT'))                             return 'lift';
  // CENTRIC, CONCENTRIC, ISOLATED, or no match → isolated
  return 'isolated';
}

// Returns { footingBoxes, stripFootings } — splits on BOUNDARY/STRIP/SF marks
function mapFootings(raw) {
  const footingBoxes  = [];
  const stripFootings = [];

  for (const f of (raw.footings || [])) {
    if (isStripType(f.type, f.name)) {
      stripFootings.push({
        name:         f.name,
        width:        typeof f.width_mm === 'number' ? f.width_mm : 600,
        depth:        typeof f.depth_mm === 'number' ? f.depth_mm : 400,
        bottomAlongL: normBar(f.bottom_along_L) || { dia: 'Y16', spacing: 200 },
        bottomAlongW: normBar(f.bottom_along_W) || { dia: 'Y16', spacing: 200 },
        topAlongL:    normBar(f.top_along_L),
        topAlongW:    normBar(f.top_along_W),
        runningMeters: 0,
      });
    } else {
      footingBoxes.push({
        name:         f.name,
        length:       typeof f.length_mm === 'number' ? f.length_mm : 1800,
        width:        typeof f.width_mm  === 'number' ? f.width_mm  : 1600,
        depth:        typeof f.depth_mm  === 'number' ? f.depth_mm  : 400,
        type:         mapFootingType(f.type),
        bottomAlongL: normBar(f.bottom_along_L) || { dia: 'Y16', spacing: 200 },
        bottomAlongW: normBar(f.bottom_along_W) || { dia: 'Y16', spacing: 200 },
        topAlongL:    normBar(f.top_along_L),
        topAlongW:    normBar(f.top_along_W),
        quantity:     0,
      });
    }
  }

  return { footingBoxes, stripFootings };
}

function mapColumns(raw) {
  return (raw.columns || []).map(c => ({
    name: c.name,
    width: c.width_mm || 300,
    depth: c.depth_mm || 300,
    vertBars: { count: c.main_bars_count || 4, dia: normDia(c.main_bars_dia) || 'T25' },
    stirrups: {
      dia: normDia(c.stirrup_dia) || 'Y8',
      spacing: c.stirrup_spacing_mm ?? c.stirrup_spacing_support_mm ?? 150,
      rings: c.stirrup_rings || 1,
    },
    quantity: 0,
  }));
}

function mapBeams(raw) {
  return (raw.beams || []).map(b => {
    const etsc = parseCount(b.extra_top_support_count);
    const etmc = parseCount(b.extra_top_midspan_count);
    const ebsc = parseCount(b.extra_bottom_support_count);
    const ebmc = parseCount(b.extra_bottom_midspan_count);
    const wbc  = parseCount(b.web_bars_count);
    const hasExtraTop    = etsc > 0 || etmc > 0;
    const hasExtraBottom = ebsc > 0 || ebmc > 0;
    const hasWebBars     = wbc  > 0;
    const spacingSupport = b.stirrup_spacing_support_mm ?? b.stirrup_spacing_midspan_mm ?? 150;
    const spacingMidspan = b.stirrup_spacing_midspan_mm ?? spacingSupport;
    const hasMidspan     = !b.uniform_spacing && spacingMidspan !== spacingSupport;
    return {
      name:  b.name,
      width: b.width_mm || 250,
      depth: b.depth_mm || 500,
      topBars:    { count: parseCount(b.continuous_top_count)    || 2, dia: normDia(b.continuous_top_dia)    || 'Y16' },
      bottomBars: { count: parseCount(b.continuous_bottom_count) || 2, dia: normDia(b.continuous_bottom_dia) || 'Y16' },
      hasExtraTop,
      extraTopSupport:    { count: etsc, dia: normDia(b.extra_top_support_dia)    || 'Y16' },
      extraTopMidspan:    { count: etmc, dia: normDia(b.extra_top_midspan_dia)    || 'Y16' },
      hasExtraBottom,
      extraBottomSupport: { count: ebsc, dia: normDia(b.extra_bottom_support_dia) || 'Y16' },
      extraBottomMidspan: { count: ebmc, dia: normDia(b.extra_bottom_midspan_dia) || 'Y16' },
      hasWebBars,
      webBars: { count: wbc, dia: normDia(b.web_bars_dia) || 'Y12' },
      stirrups: {
        dia:     normDia(b.stirrup_dia) || 'Y8',
        spacing: spacingSupport,
        rings:   b.stirrup_rings ?? 1,
      },
      hasMidspanStirrup: hasMidspan,
      stirrupsMidspan: { spacing: spacingMidspan },
      extraBarLenOverride: null,
      runningMeters: 0,
    };
  });
}

// ─── JSON cleaner ─────────────────────────────────────────────────────────────
function cleanJson(raw) {
  // Strip all markdown fences
  let s = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  // Extract only the content between the first { and last }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  return s.trim();
}

// ─── Extraction prompts ───────────────────────────────────────────────────────
const BAR_RULE = 'Bar names MUST be exactly one of: Y8, T10, Y12, Y16, Y20, T25, T32 — use these exact strings only.';

const FOOTING_PROMPT = `You are reading a structural engineering footing schedule table. Extract every footing mark listed. Return JSON with this exact structure:

{
  "footings": [
    {
      "name": "F1",
      "length_mm": 1900,
      "width_mm": 2100,
      "depth_mm": 500,
      "bottom_along_L": { "dia": "Y16", "spacing_mm": 175 },
      "bottom_along_W": { "dia": "Y16", "spacing_mm": 175 },
      "top_along_L": { "dia": "Y12", "spacing_mm": 175 },
      "top_along_W": { "dia": "Y12", "spacing_mm": 175 },
      "type": "Isolated",
      "notes": ""
    }
  ]
}

The table columns in this schedule are: FOOTING MARK, LENGTH (A), WIDTH (B), DEPTH (D), BOTTOM SHORT WAY (S), BOTTOM LONG WAY (L), TOP SHORT WAY (S), TOP LONG WAY (L), REMARKS.
Map these columns to JSON fields as follows:
- FOOTING MARK → name
- LENGTH (A) → length_mm
- WIDTH (B) → width_mm
- DEPTH (D) → depth_mm
- BOTTOM SHORT WAY (S) → bottom_along_L
- BOTTOM LONG WAY (L) → bottom_along_W
- TOP SHORT WAY (S) → top_along_L
- TOP LONG WAY (L) → top_along_W
- REMARKS → type

Rules:
- ${BAR_RULE}
- All dimensions in millimeters.
- If a footing has no top steel, set top_along_L and top_along_W to null.
- If the schedule shows 'B.W.' (Both Ways) next to a single spec, apply that same dia/spacing to both along-L and along-W for that layer.
- Copy the REMARKS column value into the type field (e.g. Isolated, Concentric, Eccentric, Combined, Lift).
- Return ONLY valid JSON, no markdown, no explanation.`;

const COLUMN_PROMPT = `You are reading a structural engineering column schedule. Extract every column mark. Return JSON:

{
  "columns": [
    {
      "name": "C1",
      "width_mm": 200,
      "depth_mm": 450,
      "main_bars_count": 8,
      "main_bars_dia": "T25",
      "stirrup_rings": 1,
      "stirrup_dia": "Y8",
      "stirrup_spacing_mm": 150,
      "notes": ""
    }
  ]
}

Rules:
- ${BAR_RULE}
- If stirrup spacing varies by zone (support vs midspan), use the support spacing for stirrup_spacing_mm and add a note.
- If ring count cannot be determined from the image, set stirrup_rings to 1 and note it.
- Return ONLY valid JSON, no markdown.`;

const BEAM_PROMPT = `You are reading structural engineering beam or ground beam schedule drawings. The schedule may appear in one of two formats — auto-detect which format is present and extract accordingly.

TYPE 1 — DIAGRAM STYLE (cross-section drawings with dimension labels):
Each beam mark shows a cross-section with W, D, top bars, bottom bars, and stirrups labelled directly on the drawing.
Stirrups are shown in notation like "1Y8@150" or "Y8@150" — the leading digit is the ring count.
For diagram-style beams: set all extra_top and extra_bottom counts to 0, web_bars_count to 0, uniform_spacing to true, and copy the single stirrup spacing to both stirrup_spacing_support_mm and stirrup_spacing_midspan_mm.

TYPE 2 — TABLE STYLE (titled "SCHEDULE OF BEAMS" or similar):
The table has these columns in order: MARK, W, D, TOP BARS, BOTT BARS (or BOTTOM BARS), EXTRA TOP @ SUPPORT, EXTRA TOP @ MIDSPAN, EXTRA BOTTOM @ SUPPORT, EXTRA BOTTOM @ MIDSPAN, WEB BARS (BOTH SIDES), STIRRUPS @ SUPPORT, STIRRUPS @ MIDSPAN.

For TYPE 2 table extraction, parse EVERY column for EVERY row — do not skip any column:
1. MARK → name. Keep the mark exactly as written (B-1, CB-1 etc.)
2. W → width_mm (integer, millimeters)
3. D → depth_mm (integer, millimeters)
4. TOP BARS → continuous_top_count and continuous_top_dia. Strip leading minus. "-2T16" → count 2, dia "T16"
5. BOTT BARS → continuous_bottom_count and continuous_bottom_dia. Same parsing.
6. EXTRA TOP @ SUPPORT: If cell contains a bar spec (e.g. "-2T16") → extra_top_support_count: 2, extra_top_support_dia: "T16". If cell shows "---" or is blank → extra_top_support_count: 0, extra_top_support_dia: null.
7. EXTRA TOP @ MIDSPAN: Same as above → extra_top_midspan_count, extra_top_midspan_dia.
8. EXTRA BOTTOM @ SUPPORT: Same → extra_bottom_support_count, extra_bottom_support_dia.
9. EXTRA BOTTOM @ MIDSPAN: Same → extra_bottom_midspan_count, extra_bottom_midspan_dia.
10. WEB BARS (BOTH SIDES / BOTH SIDE): This column contains the total web bar count for both sides combined. "-2T16" → web_bars_count: 2, web_bars_dia: "T16". "-2T12" → web_bars_count: 2, web_bars_dia: "T12". "---" or blank → web_bars_count: 0, web_bars_dia: null. IMPORTANT: Do not skip this column — it is always present in this table format.
11. STIRRUPS @ SUPPORT (labeled "1/3L @ SUPPORT" or "@ SUPPORT"): Parse "T10@150" or "T10 @ 150 C/C" → stirrup_dia: "T10", stirrup_spacing_support_mm: 150. The stirrup diameter from this column also sets the top-level stirrup_dia field.
12. STIRRUPS @ MIDSPAN: Same parsing → stirrup_spacing_midspan_mm.
    - If stirrup_spacing_support_mm equals stirrup_spacing_midspan_mm → uniform_spacing: true
    - If they differ → uniform_spacing: false
    - Ring count is always 1 in table format (never shown in table): stirrup_rings: 1

WORKED EXAMPLE — TYPE 2 TABLE:
Row: | B-2 | 200 | 600 | -2T16 | -4T16 | --- | --- | --- | --- | -2T12 | T10@150 | T10@200 |
→ name:"B-2", width_mm:200, depth_mm:600, continuous_top_count:2, continuous_top_dia:"T16", continuous_bottom_count:4, continuous_bottom_dia:"T16", extra_top_support_count:0, extra_top_support_dia:null, extra_top_midspan_count:0, extra_top_midspan_dia:null, extra_bottom_support_count:0, extra_bottom_support_dia:null, extra_bottom_midspan_count:0, extra_bottom_midspan_dia:null, web_bars_count:2, web_bars_dia:"T12", stirrup_rings:1, stirrup_dia:"T10", stirrup_spacing_support_mm:150, stirrup_spacing_midspan_mm:200, uniform_spacing:false

Row: | CB-1 | 200 | 600 | -4T16 | -4T16 | -2T16 | --- | --- | --- | -2T12 | T10@150 | T10@150 |
→ name:"CB-1", width_mm:200, depth_mm:600, continuous_top_count:4, continuous_top_dia:"T16", continuous_bottom_count:4, continuous_bottom_dia:"T16", extra_top_support_count:2, extra_top_support_dia:"T16", extra_top_midspan_count:0, extra_top_midspan_dia:null, extra_bottom_support_count:0, extra_bottom_support_dia:null, extra_bottom_midspan_count:0, extra_bottom_midspan_dia:null, web_bars_count:2, web_bars_dia:"T12", stirrup_rings:1, stirrup_dia:"T10", stirrup_spacing_support_mm:150, stirrup_spacing_midspan_mm:150, uniform_spacing:true

Return JSON for all beams using this exact structure:

{
  "beams": [
    {
      "name": "B1",
      "width_mm": 200,
      "depth_mm": 400,
      "continuous_top_count": 2,
      "continuous_top_dia": "T16",
      "continuous_bottom_count": 2,
      "continuous_bottom_dia": "T16",
      "extra_top_support_count": 0,
      "extra_top_support_dia": null,
      "extra_top_midspan_count": 0,
      "extra_top_midspan_dia": null,
      "extra_bottom_support_count": 0,
      "extra_bottom_support_dia": null,
      "extra_bottom_midspan_count": 0,
      "extra_bottom_midspan_dia": null,
      "web_bars_count": 0,
      "web_bars_dia": null,
      "stirrup_rings": 1,
      "stirrup_dia": "T10",
      "stirrup_spacing_support_mm": 150,
      "stirrup_spacing_midspan_mm": 150,
      "uniform_spacing": true,
      "notes": ""
    }
  ]
}

Parsing rules (apply to both formats):
- Bar notation: "-2T16" or "2T16" → count: 2, dia: "T16". Strip any leading minus sign. Count is always a positive integer.
- Diagram stirrup notation "1Y8" or "2Y8@150": leading digit is ring count, extract diameter part only.
- Table stirrup notation "T10@150" or "T10 @ 150 C/C": no ring count, always set stirrup_rings to 1.
- ${BAR_RULE}
- All dimensions in millimeters.
- "---" or blank cells → count: 0, dia: null.
- stirrup_rings: default 1 for table format; for diagram format default 1 unless cross-section clearly shows multiple closed rings.
- Return ONLY valid JSON, no markdown, no explanation.`;

const AUTO_PROMPT = `You are a structural engineer reading drawing schedules. Extract ALL structural member types shown in these schedule images and return ONLY valid JSON:

{
  "footingBoxes": [
    {
      "name": "F1",
      "length": 1800, "width": 1600, "depth": 400,
      "type": "isolated",
      "bottomAlongL": {"dia": "Y16", "spacing": 200},
      "bottomAlongW": {"dia": "Y16", "spacing": 200},
      "topAlongL": null, "topAlongW": null
    }
  ],
  "stripFootings": [
    {
      "name": "SF1", "width": 600, "depth": 400,
      "bottomAlongW": {"dia": "Y16", "spacing": 200},
      "bottomAlongL": {"dia": "Y12", "spacing": 200},
      "topAlongW": null, "topAlongL": null
    }
  ],
  "groundBeams": [
    {
      "name": "GB1", "width": 250, "depth": 400,
      "topBars": {"count": 3, "dia": "Y16"},
      "bottomBars": {"count": 3, "dia": "Y16"},
      "stirrups": {"dia": "Y8", "spacing": 150, "rings": 2}
    }
  ],
  "columns": [
    {
      "name": "C1", "width": 300, "depth": 300,
      "vertBars": {"count": 8, "dia": "T25"},
      "stirrups": {"dia": "Y8", "spacing": 150, "rings": 1}
    }
  ],
  "ringBeams": [
    {
      "name": "RB1", "width": 200, "depth": 500,
      "topBars": {"count": 3, "dia": "Y16"},
      "bottomBars": {"count": 3, "dia": "Y16"},
      "stirrups": {"dia": "Y8", "spacing": 150, "rings": 1}
    }
  ],
  "floorBeams": [
    {
      "name": "B1", "width": 250, "depth": 500,
      "topBars": {"count": 4, "dia": "Y20"},
      "bottomBars": {"count": 6, "dia": "Y20"},
      "stirrups": {"dia": "Y8", "spacing": 150, "rings": 2}
    }
  ],
  "slabs": [
    {
      "name": "GF Slab", "area": 0, "thickness": 200, "type": "structural",
      "layer1": {"dia": "T10", "spacing": 250},
      "layer2": {"dia": "Y12", "spacing": 200, "coverage": 0.5}
    }
  ]
}

STRICT RULES:
- Bar names MUST be one of: Y8, T10, Y12, Y16, Y20, T25, T32
- All dimensions in millimeters
- Footing type: "isolated" | "eccentric" | "combined" | "lift"
- Isolated footings: topAlongL and topAlongW MUST be null
- Return [] for any section not found in these drawings
- Return ONLY the JSON object — no markdown, no explanation`;

// ─── Gemini API call ──────────────────────────────────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-3.5-flash';

// Returns { parsed, raw } — retries up to MAX_RETRIES times on 503/empty/parse failures.
// Exponential backoff (2s/4s/6s) for 503 overload errors; immediate retry for parse failures.
const MAX_RETRIES = 3;

async function callGemini(images, prompt, apiKey, onLog, model, temperature = 0.1) {
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const parts = [
    ...images.map(img => ({ inline_data: { mime_type: img.mime, data: img.data } })),
    { text: prompt },
  ];

  let lastErr;
  let lastRaw = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature, maxOutputTokens: 8192 },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        const msg = (() => { try { return JSON.parse(body).error?.message; } catch { return body.slice(0, 200); } })();
        throw new Error(`API error ${res.status}: ${msg}`);
      }

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() ?? '';
      lastRaw = raw;

      console.log(`[Gemini ${model}] attempt ${attempt}/${MAX_RETRIES} RAW RESPONSE (${raw.length} chars):`, raw);

      if (!raw) throw new Error('Gemini returned an empty response. Check the image quality and API key.');

      const cleaned = cleanJson(raw);
      console.log(`[Gemini ${model}] attempt ${attempt}/${MAX_RETRIES} CLEANED JSON:`, cleaned.slice(0, 800));

      const parsed = JSON.parse(cleaned); // throws SyntaxError on malformed JSON
      console.log(`[Gemini ${model}] attempt ${attempt}/${MAX_RETRIES} PARSED OK — top-level keys:`, Object.keys(parsed));
      return { parsed, raw };

    } catch (err) {
      lastErr = err;
      console.warn(`[Gemini ${model}] attempt ${attempt}/${MAX_RETRIES} FAILED:`, err.message);

      if (attempt < MAX_RETRIES) {
        const is503 = /503|overload|high.demand|resource.exhaust/i.test(err.message);
        const waitMs = is503 ? attempt * 2000 : 0;
        if (waitMs > 0) {
          onLog(`⟳ Attempt ${attempt + 1}/${MAX_RETRIES} — waiting ${waitMs / 1000}s (API overloaded)…`);
          await sleep(waitMs);
        } else {
          onLog(`⟳ Attempt ${attempt + 1}/${MAX_RETRIES} — retrying…`);
        }
      }
    }
  }

  // All attempts failed — surface the error with raw output if available
  onLog(`✗ Failed after ${MAX_RETRIES} attempts: ${lastErr.message}`);
  if (lastRaw) onLog(`Raw response: ${lastRaw.slice(0, 600)}${lastRaw.length > 600 ? '…' : ''}`);
  throw lastErr;
}

function countMembers(acc) {
  return Object.values(acc).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Single extraction run ────────────────────────────────────────────────────
async function runExtraction(images, prompt, apiKey, onLog, scheduleType, model) {
  const acc = { footingBoxes: [], stripFootings: [], groundBeams: [], columns: [], ringBeams: [], floorBeams: [], slabs: [] };
  let lastRaw = '';

  console.log('=== BEAM SCHEDULE EXTRACTION START ===');
  console.log('Schedule type:', scheduleType, '| Images:', images.length, '| Model:', model);

  if (scheduleType === 'auto') {
    onLog(`Sending ${images.length} page${images.length !== 1 ? 's' : ''} to Gemini (${model})...`);
    const { parsed, raw } = await callGemini(images, prompt, apiKey, onLog, model);
    lastRaw = raw;
    acc.footingBoxes  = parsed.footingBoxes  || [];
    acc.stripFootings = parsed.stripFootings || [];
    acc.groundBeams   = parsed.groundBeams   || [];
    acc.columns       = parsed.columns       || [];
    acc.ringBeams     = parsed.ringBeams     || [];
    acc.floorBeams    = parsed.floorBeams    || [];
    acc.slabs         = parsed.slabs         || [];
  } else {
    for (let i = 0; i < images.length; i++) {
      if (i > 0) {
        onLog('Waiting 4 s before next request...');
        await sleep(4000);
      }
      onLog(`Processing page ${i + 1} of ${images.length} (${model})...`);
      try {
        const { parsed, raw } = await callGemini([images[i]], prompt, apiKey, onLog, model);
        lastRaw = raw;
        if (scheduleType === 'footing') {
          const split = mapFootings(parsed);
          acc.footingBoxes.push(...split.footingBoxes);
          acc.stripFootings.push(...split.stripFootings);
          console.log(`[QS] Page ${i + 1} footing result — boxes: ${split.footingBoxes.length}, strips: ${split.stripFootings.length}`);
        }
        else if (scheduleType === 'column') {
          const mapped = mapColumns(parsed);
          acc.columns.push(...mapped);
          console.log(`[QS] Page ${i + 1} column result — ${mapped.length} columns:`, mapped.map(c => c.name));
        }
        else if (scheduleType === 'ringBeam') {
          const mapped = mapBeams(parsed);
          acc.ringBeams.push(...mapped);
          console.log(`[QS] Page ${i + 1} ring beam result — ${mapped.length} beams:`, mapped.map(b => b.name));
          console.log('[QS] Raw parsed.beams array:', parsed.beams);
        }
        else if (scheduleType === 'floorBeam') {
          const mapped = mapBeams(parsed);
          acc.floorBeams.push(...mapped);
          console.log(`[QS] Page ${i + 1} floor beam result — ${mapped.length} beams:`, mapped.map(b => b.name));
        }
        else if (scheduleType === 'groundBeam') {
          const mapped = mapBeams(parsed);
          acc.groundBeams.push(...mapped);
          console.log(`[QS] Page ${i + 1} ground beam result — ${mapped.length} beams:`, mapped.map(b => b.name));
        }
        onLog(`✓ Page ${i + 1} done`);
      } catch (err) {
        onLog(`✗ Page ${i + 1}: ${err.message}`);
      }
    }
  }

  return { acc, lastRaw };
}

// Verification-based prompt: injects known beam marks so Gemini answers yes/no
// per mark instead of doing open-ended search (eliminates hallucination).
function makeFloorPlansPrompt(knownMarks) {
  const markList = knownMarks.join(', ');
  return `You are a structural engineer's assistant reading ONE structural slab framing plan drawing for a villa construction project.

The following beam marks exist in the beam schedule for this project:
${markList}

Your task is to check whether EACH of these beam marks appears on this specific floor plan drawing.
Only report marks that you can clearly see labeled on this drawing. Do not invent marks outside this list.

HOW TO IDENTIFY A BEAM MARK ON THE DRAWING:
- Beam marks appear as text labels on the structural beams drawn on the plan
- They are written in the format: B1 (20x50) or B2 (20 x 50) or B1(20x50) — the mark followed by dimensions in brackets
- Labels can be horizontal, vertical (rotated 90°), or at any angle
- Some marks have descriptive text, e.g. "Z - Beam With Stair Landing & Slab Level (20 x 50)" — this means Z-BEAM is present

WHERE TO LOOK FOR EACH BEAM MARK:
- TOP edge: perimeter beams along the top of the plan
- BOTTOM edge: perimeter beams along the bottom of the plan
- LEFT edge: perimeter beam running vertically — text is often rotated 90° sideways, read carefully
- RIGHT edge: perimeter beam running vertically — text is often rotated 90° sideways, read carefully
- INTERIOR: beams around lift shaft, stair well, internal spans between columns

WHAT IS NOT A BEAM MARK — do not confuse these with beam marks:
- Grid line numbers in circles (1, 2, 3, A, B, C along the edges)
- Column marks (C, C1, C2, C3, C4)
- Footing marks (F1, F3, SF1)
- Drawing/sheet numbers (STR-05, STR-07, AR-01)
- Slab reinforcement notes (Y12@150, phi16@150)
- Dimension strings (2000, 4600)
- Section references (X1, X2)

FLOOR IDENTIFICATION:
Read the drawing title at the bottom of the page and normalize:
- "KITCHEN" or "GARAGE" or "ANCILLARY" or "STORE" or "UTILITY" → "ground"
- "GROUND FLOOR" or "GF" → "ground"
- "FIRST FLOOR" or "1ST" or "FF" → "first"
- "UPPER ROOF" or "UPPER ROOF FLOOR" or "TOP ROOF" or "ROOF TERRACE" → "upper" (use key "upper", NOT "roof")
- "ROOF FLOOR" or "ROOF" or "RF" → "roof"
- "SECOND" or "2ND" → "second"
- "THIRD" or "3RD" → "third"

Return ONLY a valid JSON object with no markdown fences, no backticks, no explanation, no preamble:
{
  "floorBeamMarks": {
    "ground": ["B1", "Z-BEAM"]
  }
}

Only include ONE floor key. Only include beam marks from the list above (${markList}) that you can clearly see on this drawing.`;
}

// Verification-based prompt: injects known footing marks so Gemini counts each
// physical occurrence on the foundation layout, instead of open-ended search.
function makeFootingCountPrompt(knownMarks) {
  const markList = knownMarks.join(', ');
  return `You are a structural engineer's assistant reading ONE foundation / footing layout plan drawing for a villa construction project.

The following footing box marks exist in the footing schedule for this project:
${markList}

Your task is to find and count EVERY individual physical occurrence of each of these footing marks drawn on this foundation layout plan.

HOW FOOTING MARKS APPEAR ON THE DRAWING:
- Each footing is drawn as a rectangle/box (often hatched, dashed, or outlined) at a column location, with a text label like "F1", "F3", "F8" placed next to or inside it.
- The SAME mark (e.g. "F1") repeats at MANY different physical locations across the plan — one label per physical footing, not one label representing the whole type. Count every single labeled box separately, even when many share the same mark.
- Only count a mark where it labels an actual footing footprint on the plan. Do not count the mark if it only appears in a legend, note, or title block.

WHAT IS NOT A FOOTING MARK — do not confuse these with footing marks:
- Column marks (C, C1, C2, C3, C4) — small squares usually centered inside or near the footing, labeled separately from the footing mark
- Ground beam / strip footing marks (S1, S2, S3, SF1, SF-1) — these run along boundary/grid lines, not discrete footing boxes
- Grid line numbers/letters in circles along the plan edges (1, 2, 3, A, B, C...)
- Dimension strings (2000, 4600, 875...)
- Sheet/drawing numbers (e.g. STR-03)

FOR EACH OCCURRENCE FOUND, report its approximate location using the two nearest grid line labels that bound it (e.g. "2-B" meaning near column grid 2 and row grid B). This location tag is used only to detect duplicates — be as precise as you can from the nearest grid lines.

Return ONLY a valid JSON object with no markdown fences, no backticks, no explanation, no preamble:
{
  "footingInstances": [
    { "mark": "F1", "gridRef": "2-B" },
    { "mark": "F1", "gridRef": "9-K" }
  ]
}

Only include marks from this list: ${markList}. List EVERY occurrence separately — if F1 physically appears 5 times on the plan, include 5 separate entries for F1 with 5 different gridRef values.`;
}

// Canonicalizes a grid reference like "2-B" / "B-2" / "Grid 2, B" to the same
// key regardless of token order/formatting, so duplicate-detection across
// verification passes isn't thrown off by trivial phrasing differences.
function normGridRef(gridRef) {
  return String(gridRef ?? '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(s => s.toUpperCase())
    .sort()
    .join('-');
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export const SCHEDULE_TYPES = [
  { id: 'auto',       label: 'Auto (all types)',  icon: Sparkles, section: null },
  { id: 'footing',       label: 'Footing Schedule', icon: Box, section: 'footingBoxes' },
  { id: 'footingLayout', label: 'Footing Layout',   icon: Hash, section: null },
  { id: 'column',     label: 'Columns',           icon: RectangleVertical, section: 'columns' },
  { id: 'ringBeam',   label: 'Ring Beams',        icon: Square, section: 'ringBeams' },
  { id: 'floorBeam',  label: 'Floor Beams',       icon: Rows4, section: 'floorBeams' },
  { id: 'groundBeam', label: 'Ground Beams',      icon: Minus, section: 'groundBeams' },
  { id: 'floorPlans', label: 'Floor Plans',       icon: LayoutGrid, section: null },
];

// Returns { footingCounts, instancesByMark, pagesProcessed, pagesFailed, totalPages }.
// Verification-based, mirrors extractFloorPlanBeams: 3 parallel passes per page.
// Grid-reference text is only used to dedupe repeats WITHIN a single pass —
// independent passes rarely phrase the same footing's nearest grid line
// identically, so cross-pass agreement is taken on the per-mark COUNT
// (median across passes), not on matching grid-ref strings pass-to-pass.
export async function extractFootingQuantities(files, apiKey, onLog, knownMarks) {
  const images = [];
  for (const file of files) {
    if (file.type === 'application/pdf') {
      images.push(...await pdfToImages(file, onLog));
    } else if (file.type.startsWith('image/')) {
      onLog(`Reading ${file.name}...`);
      images.push(await imageToBase64(file));
    }
  }
  if (!images.length) throw new Error('No images could be read from the uploaded files');

  const prompt = makeFootingCountPrompt(knownMarks);
  const knownSet = new Set(knownMarks.map(m => m.toUpperCase().replace(/[-\s]/g, '')));
  const totalPages = images.length;
  let pagesProcessed = 0;
  let pagesFailed = 0;
  const countsByMark = {};      // { "F1": 5, ... } — final confirmed quantities
  const instancesByMark = {};   // { "F1": ["2-B", "9-K", ...] } — for review UI
  const PASSES = 3;

  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      onLog('Waiting 4s before next page...');
      await sleep(4000);
    }
    onLog(`Processing foundation layout ${i + 1} of ${totalPages} (${PASSES} verification passes)...`);

    try {
      const noop = () => {};
      const passResults = await Promise.allSettled(
        Array.from({ length: PASSES }, () =>
          callGemini([images[i]], prompt, apiKey, noop, MODEL, 0)
        )
      );

      const successful = passResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.parsed);

      if (successful.length === 0) {
        throw new Error(passResults[0].reason?.message || 'All passes failed');
      }

      // Per pass: dedupe repeats within that pass by (mark, gridRef) so one
      // pass can't inflate its own count, then tally instances per mark and
      // keep the original mark casing + gridRef list for display.
      const perPassCounts = []; // [{ F1: 5, F2: 1 }, ...] one entry per pass
      const displayMark = {};   // normMark -> original casing (e.g. "F1")
      const gridRefsByMark = {}; // normMark -> Set<gridRef string> (union across passes, for display only)

      successful.forEach((parsed, pi) => {
        const list = Array.isArray(parsed.footingInstances) ? parsed.footingInstances : [];
        console.log(`[QS] PAGE ${i + 1} PASS ${pi + 1} — ${list.length} instances:`, list);

        const seenThisPass = new Set();
        const passCounts = {};
        for (const inst of list) {
          if (!inst || typeof inst.mark !== 'string') continue;
          const normMark = inst.mark.trim().toUpperCase().replace(/[-\s]/g, '');
          if (!knownSet.has(normMark)) continue;
          const normGrid = normGridRef(inst.gridRef);
          const key = `${normMark}|${normGrid}`;
          if (seenThisPass.has(key)) continue;
          seenThisPass.add(key);

          displayMark[normMark] = inst.mark.trim();
          passCounts[normMark] = (passCounts[normMark] || 0) + 1;
          if (!gridRefsByMark[normMark]) gridRefsByMark[normMark] = new Set();
          if (inst.gridRef) gridRefsByMark[normMark].add(String(inst.gridRef).trim());
        }
        perPassCounts.push(passCounts);
      });

      // Median across passes per mark (falls back to 0 for passes that found none).
      const allMarksSeen = new Set(perPassCounts.flatMap(pc => Object.keys(pc)));
      let pageConfirmed = 0;
      for (const normMark of allMarksSeen) {
        const counts = perPassCounts.map(pc => pc[normMark] || 0).sort((a, b) => a - b);
        const median = counts[Math.floor(counts.length / 2)];
        if (median <= 0) continue;

        const mark = displayMark[normMark];
        countsByMark[mark] = (countsByMark[mark] || 0) + median;
        instancesByMark[mark] = [...(gridRefsByMark[normMark] || [])];
        pageConfirmed += median;
      }

      const failedPasses = passResults.filter(r => r.status === 'rejected').length;
      const passNote = failedPasses > 0 ? ` (${failedPasses}/${PASSES} passes failed)` : '';
      onLog(`✓ Page ${i + 1}: ${pageConfirmed} footing instance${pageConfirmed !== 1 ? 's' : ''} confirmed${passNote}`);
      pagesProcessed++;
    } catch (err) {
      console.error(`[QS] Footing layout page ${i + 1} all passes failed:`, err.message);
      onLog(`⚠ Page ${i + 1}: Could not read — try a higher resolution image`);
      pagesFailed++;
    }
  }

  return { footingCounts: countsByMark, instancesByMark, pagesProcessed, pagesFailed, totalPages };
}

// Returns { floorBeamMarks, pagesProcessed, pagesFailed, totalPages }
// Verification-based: injects knownMarks into the prompt so Gemini picks from a
// closed list rather than doing open-ended search. Eliminates hallucination.
// Each image is sent as a separate call to prevent truncation.
export async function extractFloorPlanBeams(files, apiKey, onLog, knownMarks) {
  const images = [];
  for (const file of files) {
    if (file.type === 'application/pdf') {
      images.push(...await pdfToImages(file, onLog));
    } else if (file.type.startsWith('image/')) {
      onLog(`Reading ${file.name}...`);
      images.push(await imageToBase64(file));
    }
  }
  if (!images.length) throw new Error('No images could be read from the uploaded files');

  const prompt = makeFloorPlansPrompt(knownMarks);
  // Pre-build the normalised known-marks guard set (same for every page)
  const knownSet = new Set(knownMarks.map(m => m.toUpperCase().replace(/[-\s]/g, '')));
  const totalPages = images.length;
  let pagesProcessed = 0;
  let pagesFailed = 0;
  const mergedSets = {}; // { floorKey: Set<string> }
  const PASSES = 3;

  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      onLog('Waiting 4s before next page...');
      await sleep(4000);
    }
    onLog(`Processing floor plan ${i + 1} of ${totalPages} (${PASSES} verification passes)...`);

    try {
      // Run all passes in parallel; use a no-op logger so duplicate error
      // messages from failed passes don't clutter the UI log
      const noop = () => {};
      const passResults = await Promise.allSettled(
        Array.from({ length: PASSES }, () =>
          callGemini([images[i]], prompt, apiKey, noop, MODEL, 0)
        )
      );

      const successful = passResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.parsed);

      if (successful.length === 0) {
        // All passes failed — surface the first error message
        throw new Error(passResults[0].reason?.message || 'All passes failed');
      }

      // Log what each pass returned so floor key misidentification is visible
      successful.forEach((parsed, pi) => {
        const keys = Object.keys(parsed.floorBeamMarks || {});
        const marks = Object.values(parsed.floorBeamMarks || {}).flat();
        console.log(`[QS] PAGE ${i + 1} PASS ${pi + 1} — floor key: "${keys.join('", "')}" marks:`, marks);
      });

      // Majority vote: count agreements per mark per floor key across all passes
      const voteCounts = {}; // { floorKey: { normMark: { count, mark } } }
      for (const parsed of successful) {
        if (!parsed.floorBeamMarks || typeof parsed.floorBeamMarks !== 'object') continue;
        for (const [floorKey, marks] of Object.entries(parsed.floorBeamMarks)) {
          if (!Array.isArray(marks)) continue;
          if (!voteCounts[floorKey]) voteCounts[floorKey] = {};
          marks.forEach(m => {
            if (typeof m !== 'string' || !m.trim()) return;
            const norm = m.trim().toUpperCase().replace(/[-\s]/g, '');
            if (!knownSet.has(norm)) return;
            if (!voteCounts[floorKey][norm]) voteCounts[floorKey][norm] = { count: 0, mark: m.trim() };
            voteCounts[floorKey][norm].count++;
          });
        }
      }

      console.log(`[QS] PAGE ${i + 1} VOTE COUNTS (threshold=${successful.length}):`, voteCounts);

      // Unanimous: all successful passes must agree (eliminates inconsistent hallucinations)
      const threshold = successful.length;
      for (const [floorKey, votes] of Object.entries(voteCounts)) {
        if (!mergedSets[floorKey]) mergedSets[floorKey] = new Set();
        for (const { count, mark } of Object.values(votes)) {
          if (count >= threshold) mergedSets[floorKey].add(mark);
        }
      }

      console.log(`[QS] PAGE ${i + 1} PASSED THRESHOLD — mergedSets now:`, Object.fromEntries(Object.entries(mergedSets).map(([k, s]) => [k, [...s]])));

      const floorKeys = [...new Set(successful.flatMap(p => Object.keys(p.floorBeamMarks || {})))];
      const markCount = floorKeys.reduce((s, k) => s + (mergedSets[k]?.size ?? 0), 0);
      const failedPasses = passResults.filter(r => r.status === 'rejected').length;
      const passNote = failedPasses > 0 ? ` (${failedPasses}/${PASSES} passes failed)` : '';
      onLog(`✓ Page ${i + 1}: floor "${floorKeys.join('", "')}" — ${markCount} mark${markCount !== 1 ? 's' : ''}${passNote}`);
      pagesProcessed++;
    } catch (err) {
      console.error(`[QS] Floor plan page ${i + 1} all passes failed:`, err.message);
      onLog(`⚠ Page ${i + 1}: Could not read — try a higher resolution image`);
      pagesFailed++;
    }
  }

  // Convert Sets to sorted arrays
  const floorBeamMarks = {};
  for (const [key, set] of Object.entries(mergedSets)) {
    floorBeamMarks[key] = [...set].sort();
  }

  return { floorBeamMarks, pagesProcessed, pagesFailed, totalPages };
}

export async function extractSchedules(files, apiKey, onLog, scheduleType = 'auto') {
  // Collect images
  const images = [];
  for (const file of files) {
    if (file.type === 'application/pdf') {
      images.push(...await pdfToImages(file, onLog));
    } else if (file.type.startsWith('image/')) {
      onLog(`Reading ${file.name}...`);
      images.push(await imageToBase64(file));
    }
  }
  if (!images.length) throw new Error('No images could be read from the uploaded files');

  const PROMPT = {
    footing:    FOOTING_PROMPT,
    column:     COLUMN_PROMPT,
    ringBeam:   BEAM_PROMPT,
    floorBeam:  BEAM_PROMPT,
    groundBeam: BEAM_PROMPT,
    auto:       AUTO_PROMPT,
  }[scheduleType] ?? AUTO_PROMPT;

  const { acc, lastRaw } = await runExtraction(images, PROMPT, apiKey, onLog, scheduleType, MODEL);

  console.log('=== BEAM SCHEDULE EXTRACTION COMPLETE ===');
  console.log('Final acc:', acc);
  console.log('Total members:', countMembers(acc));

  if (countMembers(acc) === 0) {
    onLog(`⚠ 0 members found.`);
    if (lastRaw) {
      onLog(`Raw response was: ${lastRaw.slice(0, 400)}${lastRaw.length > 400 ? '…' : ''}`);
    }
    onLog('Debug: Check browser console (F12 → Console tab) for full Gemini response');
  }

  return acc;
}
