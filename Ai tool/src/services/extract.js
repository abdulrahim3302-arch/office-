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
    const vp = page.getViewport({ scale: 1.8 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    images.push({ data: canvas.toDataURL('image/jpeg', 0.88).split(',')[1], mime: 'image/jpeg' });
    onLog(`Page ${i}/${limit} converted`);
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

// ─── Extraction prompt ────────────────────────────────────────────────────────
const EXTRACT_PROMPT = `You are a structural engineer reading drawing schedules from a Bahrain villa project.

Extract ALL structural member types shown in these schedule images and return ONLY valid JSON:

{
  "footingBoxes": [
    {
      "name": "F1",
      "length": 1800,
      "width": 1600,
      "depth": 400,
      "type": "isolated",
      "bottomAlongL": {"dia": "Y16", "spacing": 200},
      "bottomAlongW": {"dia": "Y16", "spacing": 200},
      "topAlongL": null,
      "topAlongW": null
    }
  ],
  "stripFootings": [
    {
      "name": "SF1",
      "width": 600,
      "depth": 400,
      "bottomAlongW": {"dia": "Y16", "spacing": 200},
      "bottomAlongL": {"dia": "Y12", "spacing": 200},
      "topAlongW": null,
      "topAlongL": null
    }
  ],
  "groundBeams": [
    {
      "name": "GB1",
      "width": 250,
      "depth": 400,
      "topBars": {"count": 3, "dia": "Y16"},
      "bottomBars": {"count": 3, "dia": "Y16"},
      "stirrups": {"dia": "Y8", "spacing": 150, "rings": 2}
    }
  ],
  "columns": [
    {
      "name": "C1",
      "width": 300,
      "depth": 300,
      "vertBars": {"count": 8, "dia": "T25"},
      "stirrups": {"dia": "Y8", "spacing": 150, "rings": 1}
    }
  ],
  "ringBeams": [
    {
      "name": "RB1",
      "width": 200,
      "depth": 500,
      "topBars": {"count": 3, "dia": "Y16"},
      "bottomBars": {"count": 3, "dia": "Y16"},
      "stirrups": {"dia": "Y8", "spacing": 150, "rings": 1}
    }
  ],
  "floorBeams": [
    {
      "name": "B1",
      "width": 250,
      "depth": 500,
      "topBars": {"count": 4, "dia": "Y20"},
      "bottomBars": {"count": 6, "dia": "Y20"},
      "stirrups": {"dia": "Y8", "spacing": 150, "rings": 2}
    }
  ],
  "slabs": [
    {
      "name": "GF Slab",
      "area": 0,
      "thickness": 200,
      "type": "structural",
      "layer1": {"dia": "T10", "spacing": 250},
      "layer2": {"dia": "Y12", "spacing": 200, "coverage": 0.5}
    }
  ]
}

STRICT RULES:
- Bar names MUST be one of: Y8, T10, Y12, Y16, Y20, T25, T32
- All dimensions in millimeters
- Footing type: "isolated" (bottom steel only), "eccentric" (offset, needs top steel), "combined" (multiple columns, needs top steel), "lift" (lift pit, needs top steel)
- Isolated footings: topAlongL and topAlongW MUST be null
- Eccentric/combined/lift: copy bottom spec to top if not explicitly shown
- "Along L" = bars running parallel to the LONGER dimension (straight = L - cover, count = W/spacing)
- "Along W" = bars running parallel to the SHORTER dimension (straight = W - cover, count = L/spacing)
- Ring/coping/perimeter/boundary beams → ringBeams
- Ground/tie/strap/grade/foundation beams → groundBeams
- Internal/floor/spanning beams → floorBeams
- Slab: set area:0 (user fills in), thickness from drawing, type "grade" for ground slabs, "structural" for suspended slabs
- Slab layer1/layer2: extract from schedule if shown; use T10@250 layer1 and Y12@200 layer2 as defaults if not shown
- Return [] for any section not found in these drawings
- Return ONLY the JSON object — no markdown, no explanation, no extra text`;

// ─── Main export ──────────────────────────────────────────────────────────────
export async function extractSchedules(files, apiKey, onLog) {
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

  onLog(`Sending ${images.length} image${images.length !== 1 ? 's' : ''} to Gemini AI...`);

  const parts = [
    ...images.map(img => ({
      inline_data: { mime_type: img.mime, data: img.data },
    })),
    { text: EXTRACT_PROMPT },
  ];

  const res = await fetch(
    `/api/gemini/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    const msg = (() => { try { return JSON.parse(body).error?.message; } catch { return body.slice(0, 200); } })();
    throw new Error(`API error ${res.status}: ${msg}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() ?? '';

  if (!raw) throw new Error('Gemini returned an empty response. Check the image quality and try again.');

  const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    console.error('Raw Gemini response:', raw);
    throw new Error('AI returned unexpected format. Please try again or check the image quality.');
  }
}
