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

const BEAM_PROMPT = `You are reading structural engineering beam or ground beam schedule drawings. The schedule may appear in one of two formats — handle both:

TYPE 1 — DIAGRAM STYLE (cross-section drawings with dimension labels):
Each beam mark shows a cross-section with W, D, top bars, bottom bars, and stirrups labelled directly on the drawing.
For diagram-style beams: set all extra_top and extra_bottom counts to 0, web_bars_count to 0, uniform_spacing to true, and use the single stirrup spacing for both stirrup_spacing_support_mm and stirrup_spacing_midspan_mm.

TYPE 2 — TABLE STYLE:
Table columns are: MARK, W, D, TOP BARS, BOTT BARS, EXTRA TOP @ SUPPORT, EXTRA TOP @ MIDSPAN, EXTRA BOTTOM @ SUPPORT, EXTRA BOTTOM @ MIDSPAN, WEB BARS, STIRRUPS @ SUPPORT, STIRRUPS @ MIDSPAN.
If STIRRUPS @ SUPPORT ≠ STIRRUPS @ MIDSPAN, set uniform_spacing to false and fill both fields with the correct values.
If only one stirrup spacing is shown, set uniform_spacing to true and copy it to both support and midspan fields.

Return JSON for all beams using this exact structure:

{
  "beams": [
    {
      "name": "B1",
      "width_mm": 200,
      "depth_mm": 400,
      "continuous_top_count": 2,
      "continuous_top_dia": "Y16",
      "continuous_bottom_count": 2,
      "continuous_bottom_dia": "Y16",
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
      "stirrup_dia": "Y8",
      "stirrup_spacing_support_mm": 150,
      "stirrup_spacing_midspan_mm": 150,
      "uniform_spacing": true,
      "notes": ""
    }
  ]
}

Bar notation parsing rules:
- A bar group written as "-2T16" or "2T16" or "-2Y16" means count: 2, dia: "Y16" — strip any leading minus sign, the count is always a positive integer.
- Stirrup notation "1Y8" or "2Y8": the leading digit is the ring count — extract only the diameter part ("Y8") for stirrup_dia; set stirrup_rings to that digit if shown, otherwise default stirrup_rings to 1.
- ${BAR_RULE}
- All dimensions in millimeters.
- If a cell shows '---' or is blank, set count to 0 and dia to null.
- stirrup_rings: default to 1 unless a cross-section detail clearly shows multiple closed rings.
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
const MODEL = 'gemini-2.5-flash';

// Returns { parsed, raw } — throws on HTTP error or parse failure (with raw logged to UI)
async function callGemini(images, prompt, apiKey, onLog, model) {
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const parts = [
    ...images.map(img => ({ inline_data: { mime_type: img.mime, data: img.data } })),
    { text: prompt },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const msg = (() => { try { return JSON.parse(body).error?.message; } catch { return body.slice(0, 200); } })();
    throw new Error(`API error ${res.status}: ${msg}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() ?? '';

  // Always log the raw response to the browser console for debugging
  console.log(`[Gemini ${model}] Raw response:`, raw);

  if (!raw) throw new Error('Gemini returned an empty response. Check the image quality and API key.');

  const clean = cleanJson(raw);

  try {
    const parsed = JSON.parse(clean);
    return { parsed, raw };
  } catch (err) {
    // Show the raw text in the log panel so the user can see what went wrong
    onLog(`✗ JSON parse error: ${err.message}`);
    onLog(`Raw Gemini response: ${raw.slice(0, 600)}${raw.length > 600 ? '…' : ''}`);
    throw new Error('Could not parse AI response — see log above for the raw text.');
  }
}

function countMembers(acc) {
  return Object.values(acc).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Single extraction run ────────────────────────────────────────────────────
async function runExtraction(images, prompt, apiKey, onLog, scheduleType, model) {
  const acc = { footingBoxes: [], stripFootings: [], groundBeams: [], columns: [], ringBeams: [], floorBeams: [], slabs: [] };
  let lastRaw = '';

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
        }
        else if (scheduleType === 'column')     acc.columns.push(...mapColumns(parsed));
        else if (scheduleType === 'ringBeam')   acc.ringBeams.push(...mapBeams(parsed));
        else if (scheduleType === 'floorBeam')  acc.floorBeams.push(...mapBeams(parsed));
        else if (scheduleType === 'groundBeam') acc.groundBeams.push(...mapBeams(parsed));
        onLog(`✓ Page ${i + 1} done`);
      } catch (err) {
        onLog(`✗ Page ${i + 1}: ${err.message}`);
      }
    }
  }

  return { acc, lastRaw };
}

const FLOOR_PLANS_PROMPT = `You are reading structural floor plan drawings for a villa construction project.

For each uploaded drawing page:
1. Read the title block, drawing title, or any label that identifies the floor level. Common examples: "GROUND FLOOR FRAMING PLAN", "FIRST FLOOR BEAM LAYOUT", "ROOF FLOOR PLAN", "KITCHEN FRAMING PLAN", "GARAGE FRAMING PLAN", "ANNEX", etc.
2. Scan the entire plan and identify all beam marks labeled on that drawing. Beam marks are typically alphanumeric codes like B1, B2, B3, CA1, Z-BEAM, RB1, GB1, etc.
3. Only include beam marks that are clearly and explicitly labeled on the plan. Do not guess or infer.

Normalize floor names as follows:
- Any title containing "ground" or "GF" or "G.F" → use key "ground"
- Any title containing "first" or "1st" or "FF" or "F.F" → use key "first"
- Any title containing "roof" or "top" or "RF" or "R.F" → use key "roof"
- Any title containing "second" or "2nd" → use key "second"
- Any title containing "third" or "3rd" → use key "third"
- Any title containing "kitchen" or "garage" or "annex" or "store" or "utility" or any auxiliary/ancillary space name → use key "ground" (these structures are always at ground level, their beams belong to Ground Floor)
- If the title is ambiguous or unreadable but the drawing looks like a ground-level ancillary structure, use key "ground"

Merging rule: If multiple pages map to the same floor key (e.g. ground floor plan + kitchen framing plan both → "ground"), merge all their beam marks into one list and remove duplicates.

Return ONLY a valid JSON object with no markdown, no explanation, no preamble. Format:
{
  "floorBeamMarks": {
    "ground": ["B1", "B2", "CA1"],
    "first": ["B1", "B3", "Z-BEAM"],
    "roof": ["B2", "B3"]
  }
}

Only include floors that you actually found in the uploaded drawings. If a floor plan page has no readable title, try to infer from context, otherwise skip it.`;

// ─── Exports ──────────────────────────────────────────────────────────────────
export const SCHEDULE_TYPES = [
  { id: 'auto',       label: 'Auto (all types)',  icon: '✦', section: null },
  { id: 'footing',    label: 'Footing Boxes',     icon: '⬛', section: 'footingBoxes' },
  { id: 'column',     label: 'Columns',           icon: '▐', section: 'columns' },
  { id: 'ringBeam',   label: 'Ring Beams',        icon: '◻', section: 'ringBeams' },
  { id: 'floorBeam',  label: 'Floor Beams',       icon: '━', section: 'floorBeams' },
  { id: 'groundBeam', label: 'Ground Beams',      icon: '━', section: 'groundBeams' },
  { id: 'floorPlans', label: 'Floor Plans',       icon: '⊞', section: null },
];

export async function extractFloorPlanBeams(files, apiKey, onLog) {
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

  onLog(`Sending ${images.length} floor plan page${images.length !== 1 ? 's' : ''} to Gemini...`);
  const { parsed, raw } = await callGemini(images, FLOOR_PLANS_PROMPT, apiKey, onLog, MODEL);

  if (!parsed.floorBeamMarks || typeof parsed.floorBeamMarks !== 'object') {
    onLog(`Raw response: ${raw.slice(0, 400)}`);
    throw new Error('Gemini did not return floorBeamMarks. Check image quality or floor plan titles.');
  }

  return parsed.floorBeamMarks; // { ground: ['B1', 'B2'], first: [...], ... }
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

  if (countMembers(acc) === 0) {
    onLog(`⚠ 0 members found.`);
    if (lastRaw) {
      onLog(`Raw response was: ${lastRaw.slice(0, 400)}${lastRaw.length > 400 ? '…' : ''}`);
    }
  }

  return acc;
}
