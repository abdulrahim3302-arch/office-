import { useState, useRef } from "react";

const STEEL_DENSITY = { 6: 0.222, 8: 0.395, 10: 0.617, 12: 0.889, 16: 1.58, 20: 2.469, 25: 3.855, 32: 6.313 };
const BAR_LENGTH = 12;
const DIAMETERS = [8, 10, 12, 16, 20, 25];

// ─── AI ───
async function callAI(content, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: [...content, { type: "text", text: prompt }] }]
    })
  });
  const data = await res.json();
  return data.content.map(c => c.text || "").join("");
}

async function analyzeDrawings(images, onLog) {
  onLog("Sending pages to AI for full analysis...");

  const imageContent = images.map(img => ({
    type: "image",
    source: { type: "base64", media_type: img.mime, data: img.data }
  }));

  const prompt = `You are a senior structural engineer and quantity surveyor. You are given multiple pages from a structural drawing set (could be footing schedules, column sections, layout plans, beam details, lintel schedules, structural notes, etc).

Your job: analyze ALL pages and produce a complete Bar Bending Schedule (BBS) output.

DO THE FOLLOWING:

1. IDENTIFY what each page contains (schedule table, layout plan, section detail, notes, etc.)

2. FROM SCHEDULE PAGES - extract member specifications:
   - Footing schedules: member name, dimensions (LxWxD in mm), reinforcement spec (e.g. "Y16@150c/c")
   - Column sections: member name, section size, vertical bars (e.g. "8Y16"), ties (e.g. "Y8@100/200"), heights per floor
   - Lintel/beam schedules: span ranges, sizes, reinforcement
   - Ground beam sections: concentric/eccentric details

3. FROM LAYOUT PLANS - count members:
   - Count every footing (F1, F2, F3...), column (C1, C2...) visible on the plan
   - For strip footings: estimate running length from grid dimensions
   - Count per floor if multiple floor plans shown

4. CALCULATE bar quantities properly:
   - For "@150c/c" on a 1900mm dimension: num_bars = floor(1900/150) + 1 = 14
   - Bar length = dimension - 2×cover (use 75mm cover for footings, 40mm for columns, 25mm for slabs)
   - Stirrup count = floor(column_height / stirrup_spacing) + 1
   - Stirrup perimeter = 2×(width + depth) - 8×cover + hooks

5. CALCULATE concrete volumes:
   - Footing: L × W × D (in meters) × quantity
   - Column: width × depth × height × quantity (per floor)

Respond ONLY with valid JSON, no markdown, no backticks, no explanation:
{
  "project_name": "...",
  "members": [
    {
      "category": "footing",
      "name": "F1",
      "type": "isolated",
      "quantity": 3,
      "dimensions": {"L_m": 1.9, "W_m": 2.1, "D_m": 0.4},
      "concrete_per_unit_m3": 1.596,
      "concrete_total_m3": 4.788,
      "steel": [
        {"description": "Bottom bars along L", "dia": 16, "shape": "Main bar", "bar_length_m": 1.75, "bars_per_unit": 15, "total_bars": 45, "weight_kg": 124.74},
        {"description": "Bottom bars along W", "dia": 16, "shape": "Distribution", "bar_length_m": 1.95, "bars_per_unit": 14, "total_bars": 42, "weight_kg": 129.402}
      ],
      "steel_total_kg": 254.142,
      "notes": "Y16@150c/c bottom both ways, no top steel"
    },
    {
      "category": "column", 
      "name": "C1",
      "type": "column",
      "quantity": 8,
      "dimensions": {"width_mm": 400, "depth_mm": 200},
      "floors": [
        {
          "level": "Foundation to 1st Floor",
          "height_m": 6.0,
          "quantity_this_floor": 8,
          "concrete_m3": 3.84,
          "steel": [
            {"description": "C1 main bars (Fdn-1F)", "dia": 16, "shape": "Main bar", "bar_length_m": 6.1, "total_bars": 64, "weight_kg": 616.768},
            {"description": "C1 stirrups (Fdn-1F)", "dia": 8, "shape": "Stirrup", "bar_length_m": 1.0, "total_bars": 480, "weight_kg": 189.6}
          ]
        }
      ],
      "concrete_total_m3": 3.84,
      "steel_total_kg": 806.368,
      "notes": "8Y16 vert, Y8@100/200 ties"
    }
  ],
  "summary": {
    "total_concrete_m3": 0,
    "total_steel_kg": 0,
    "total_steel_ton": 0,
    "steel_by_dia": {"8": 0, "10": 0, "12": 0, "16": 0, "20": 0, "25": 0},
    "by_section": {
      "Footings": {"concrete_m3": 0, "steel_kg": 0, "8mm": 0, "10mm": 0, "12mm": 0, "16mm": 0, "20mm": 0, "25mm": 0},
      "Columns": {"concrete_m3": 0, "steel_kg": 0, "8mm": 0, "10mm": 0, "12mm": 0, "16mm": 0, "20mm": 0, "25mm": 0},
      "Beams/Lintels": {"concrete_m3": 0, "steel_kg": 0, "8mm": 0, "10mm": 0, "12mm": 0, "16mm": 0, "20mm": 0, "25mm": 0},
      "Coping/Boundary": {"concrete_m3": 0, "steel_kg": 0, "8mm": 0, "10mm": 0, "12mm": 0, "16mm": 0, "20mm": 0, "25mm": 0}
    }
  },
  "pages_identified": [
    {"page": 1, "content": "Footing schedule table"},
    {"page": 2, "content": "Column sections"}
  ]
}

CRITICAL RULES:
- Calculate weight_kg = total_bars × bar_length_m × density (8mm=0.395, 10mm=0.617, 12mm=0.889, 16mm=1.58, 20mm=2.469, 25mm=3.855 kg/m)
- The summary totals MUST equal the sum of all individual member weights
- Be precise with bar counts from spacing: num = floor(dimension_mm / spacing_mm) + 1
- Include ALL structural members you can identify
- If you see multiple floor column plans, count columns PER FLOOR and calculate steel for each level
- For ground beams: estimate total running length from grid dimensions visible on the plans
- steel_total_kg for each member must equal the sum of all its steel[].weight_kg values
- summary.total_steel_kg must equal the sum of all members' steel_total_kg`;

  const raw = await callAI(imageContent, prompt);
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── File Handling ───
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ data: r.result.split(",")[1], mime: r.result.split(";")[0].split(":")[1], name: file.name });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// For PDF: we convert pages to images via canvas
async function pdfToImages(file, onLog) {
  // Load PDF.js from CDN
  if (!window.pdfjsLib) {
    onLog("Loading PDF reader...");
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  onLog(`PDF loaded: ${totalPages} pages. Converting structural pages to images...`);

  // We can only send ~20 images max to the API, so let's be smart about which pages to convert
  // Convert all pages but at lower res for initial scan, then we pick structural ones
  const images = [];
  const maxPages = Math.min(totalPages, 20); // API limit
  
  // If PDF has many pages, we need to pick the right ones
  // Structural pages are usually in the latter half of a drawing set
  let pagesToConvert = [];
  if (totalPages <= 20) {
    pagesToConvert = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    // Take last 20 pages (structural usually at end) + first 2
    const startPages = [1, 2];
    const endStart = Math.max(3, totalPages - 17);
    const endPages = Array.from({ length: totalPages - endStart + 1 }, (_, i) => endStart + i);
    pagesToConvert = [...new Set([...startPages, ...endPages])].sort((a, b) => a - b).slice(0, 20);
  }

  onLog(`Converting ${pagesToConvert.length} pages: ${pagesToConvert.join(", ")}`);

  for (const pageNum of pagesToConvert) {
    try {
      const page = await pdf.getPage(pageNum);
      const scale = 1.5; // Good balance of quality vs size
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      const base64 = dataUrl.split(",")[1];
      images.push({ data: base64, mime: "image/jpeg", name: `page_${pageNum}` });
    } catch (e) {
      onLog(`Warning: Could not convert page ${pageNum}`);
    }
  }

  onLog(`✓ Converted ${images.length} pages to images`);
  return images;
}

// ─── UI Components ───
function ResultCard({ m }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>{m.name}</span>
            <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", background: "rgba(196,135,58,0.12)", color: "#C4873A", padding: "2px 7px", borderRadius: "4px" }}>
              {m.type} × {m.quantity}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px", fontFamily: "monospace" }}>
            {m.dimensions ? Object.entries(m.dimensions).map(([k, v]) => `${k}: ${v}`).join(" · ") : ""}
            {m.notes && ` · ${m.notes}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={chipBox("#110f06", "#2a2208")}>
            <div style={chipLbl}>Concrete</div>
            <div style={{ ...chipVal, color: "#C4873A" }}>{(m.concrete_total_m3 || 0).toFixed(2)} m³</div>
          </div>
          <div style={chipBox("#060d12", "#0a2030")}>
            <div style={chipLbl}>Steel</div>
            <div style={{ ...chipVal, color: "#5BA4C9" }}>{(m.steel_total_kg || 0).toFixed(1)} kg</div>
          </div>
        </div>
      </div>
      {(m.steel?.length > 0 || m.floors?.length > 0) && (
        <div style={{ marginTop: "6px" }}>
          <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "#444", fontSize: "10px", cursor: "pointer", fontWeight: 600, padding: "2px 0" }}>
            {open ? "▾ Hide" : "▸ Show"} bar details
          </button>
          {open && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginTop: "6px" }}>
              <thead>
                <tr>{["Description", "Ø", "Shape", "Bar Len", "Bars", "Weight"].map(h =>
                  <th key={h} style={{ padding: "3px 5px", color: "#444", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #1a1a1a", fontSize: "9px", textTransform: "uppercase" }}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {(m.steel || []).map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #0e0e0e" }}>
                    <td style={{ padding: "3px 5px", color: "#888" }}>{s.description}</td>
                    <td style={{ padding: "3px 5px", color: "#5BA4C9", fontFamily: "monospace", fontWeight: 700 }}>{s.dia}mm</td>
                    <td style={{ padding: "3px 5px", color: "#666" }}>{s.shape}</td>
                    <td style={{ padding: "3px 5px", color: "#777", fontFamily: "monospace" }}>{s.bar_length_m}m</td>
                    <td style={{ padding: "3px 5px", color: "#bbb", fontFamily: "monospace", fontWeight: 600 }}>{s.total_bars}</td>
                    <td style={{ padding: "3px 5px", color: "#5BA4C9", fontFamily: "monospace", fontWeight: 700 }}>{(s.weight_kg || 0).toFixed(1)}</td>
                  </tr>
                ))}
                {(m.floors || []).flatMap((f, fi) => (f.steel || []).map((s, si) => (
                  <tr key={`${fi}-${si}`} style={{ borderBottom: "1px solid #0e0e0e" }}>
                    <td style={{ padding: "3px 5px", color: "#888" }}>{s.description}</td>
                    <td style={{ padding: "3px 5px", color: "#5BA4C9", fontFamily: "monospace", fontWeight: 700 }}>{s.dia}mm</td>
                    <td style={{ padding: "3px 5px", color: "#666" }}>{s.shape}</td>
                    <td style={{ padding: "3px 5px", color: "#777", fontFamily: "monospace" }}>{s.bar_length_m}m</td>
                    <td style={{ padding: "3px 5px", color: "#bbb", fontFamily: "monospace", fontWeight: 600 }}>{s.total_bars}</td>
                    <td style={{ padding: "3px 5px", color: "#5BA4C9", fontFamily: "monospace", fontWeight: 700 }}>{(s.weight_kg || 0).toFixed(1)}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const chipBox = (bg, bc) => ({ background: bg, border: `1px solid ${bc}`, borderRadius: "6px", padding: "5px 10px", textAlign: "center" });
const chipLbl = { fontSize: "8px", color: "#555", fontWeight: 700, textTransform: "uppercase" };
const chipVal = { fontSize: "13px", fontFamily: "monospace", fontWeight: 700, marginTop: "1px" };

// ─── Main ───
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const [fileName, setFileName] = useState("");
  const ref = useRef(null);

  const addLog = msg => setLog(p => [...p, { t: new Date().toLocaleTimeString(), msg }]);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setLoading(true); setError(null); setLog([]); setData(null);
    const file = files[0];
    setFileName(file.name);
    addLog(`File: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);

    try {
      let images;
      if (file.type === "application/pdf") {
        images = await pdfToImages(file, addLog);
      } else {
        addLog("Processing image...");
        images = [await fileToBase64(file)];
      }

      if (images.length === 0) throw new Error("No pages converted");

      // Send to AI in batches if needed (API has token limits per image)
      const batchSize = 8;
      let allResults = null;

      if (images.length <= batchSize) {
        const result = await analyzeDrawings(images, addLog);
        allResults = result;
      } else {
        // Process in batches and merge
        addLog(`Processing ${images.length} pages in batches of ${batchSize}...`);
        let allMembers = [];
        for (let i = 0; i < images.length; i += batchSize) {
          const batch = images.slice(i, i + batchSize);
          addLog(`Analyzing pages ${i + 1}-${i + batch.length}...`);
          try {
            const result = await analyzeDrawings(batch, () => {});
            if (result?.members) allMembers.push(...result.members);
            if (result?.summary && !allResults) allResults = result;
          } catch (e) {
            addLog(`Batch ${Math.floor(i / batchSize) + 1} partial error, continuing...`);
          }
        }
        // Merge: deduplicate by name, keep the one with more steel data
        const merged = {};
        allMembers.forEach(m => {
          if (!merged[m.name] || (m.steel_total_kg || 0) > (merged[m.name].steel_total_kg || 0)) {
            merged[m.name] = m;
          }
        });
        if (allResults) {
          allResults.members = Object.values(merged);
        } else {
          allResults = { members: Object.values(merged), summary: null };
        }
        // Recalculate summary
        recalcSummary(allResults);
      }

      if (!allResults?.members?.length) throw new Error("No structural members found. Make sure the PDF contains structural drawings.");

      // Recalc summary if needed
      if (!allResults.summary?.total_steel_kg) recalcSummary(allResults);

      setData(allResults);
      addLog(`✓ Found ${allResults.members.length} members`);
      addLog(`✓ Total steel: ${(allResults.summary?.total_steel_kg / 1000 || 0).toFixed(2)} tons`);
      addLog(`✓ Total concrete: ${(allResults.summary?.total_concrete_m3 || 0).toFixed(1)} m³`);
    } catch (e) {
      setError(e.message);
      addLog(`✗ ${e.message}`);
    }
    setLoading(false);
  };

  const recalcSummary = (result) => {
    let totalSteel = 0, totalConc = 0;
    const byDia = {}; DIAMETERS.forEach(d => byDia[d] = 0);
    const bySec = {};

    (result.members || []).forEach(m => {
      totalConc += m.concrete_total_m3 || 0;
      totalSteel += m.steel_total_kg || 0;
      const sec = m.category === "footing" ? "Footings" : m.category === "column" ? "Columns" : "Beams/Lintels";
      if (!bySec[sec]) { bySec[sec] = { concrete_m3: 0, steel_kg: 0 }; DIAMETERS.forEach(d => bySec[sec][`${d}mm`] = 0); }
      bySec[sec].concrete_m3 += m.concrete_total_m3 || 0;
      bySec[sec].steel_kg += m.steel_total_kg || 0;

      const allSteel = [...(m.steel || []), ...(m.floors || []).flatMap(f => f.steel || [])];
      allSteel.forEach(s => {
        byDia[s.dia] = (byDia[s.dia] || 0) + (s.weight_kg || 0);
        if (bySec[sec]) bySec[sec][`${s.dia}mm`] = (bySec[sec][`${s.dia}mm`] || 0) + (s.weight_kg || 0);
      });
    });

    result.summary = { total_concrete_m3: totalConc, total_steel_kg: totalSteel, total_steel_ton: totalSteel / 1000, steel_by_dia: byDia, by_section: bySec };
  };

  const sum = data?.summary;
  const members = data?.members || [];
  const activeDias = sum ? DIAMETERS.filter(d => (sum.steel_by_dia?.[d] || sum.steel_by_dia?.[String(d)] || 0) > 0) : [];
  const getDia = (d) => sum?.steel_by_dia?.[d] || sum?.steel_by_dia?.[String(d)] || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#ccc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      <div style={{ borderBottom: "1px solid #141414", padding: "16px 20px", background: "#0b0b0b" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "linear-gradient(135deg, #C4873A, #5BA4C9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900, color: "#080808" }}>QS</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#eee" }}>Structural QS</h1>
            <p style={{ margin: 0, fontSize: "10px", color: "#444" }}>Drop one PDF → AI reads everything → Full BBS output</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "18px" }}>

        {/* Upload */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => !loading && ref.current?.click()}
          style={{
            border: `2px dashed ${data ? "#2a5a2a" : "#222"}`,
            borderRadius: "14px", padding: loading ? "30px" : "40px 20px", textAlign: "center",
            cursor: loading ? "wait" : "pointer",
            background: data ? "rgba(42,90,42,0.03)" : "rgba(255,255,255,0.01)",
            marginBottom: "18px", transition: "all 0.2s",
          }}
        >
          <input ref={ref} type="file" accept=".pdf,image/*" onChange={e => handleFiles(Array.from(e.target.files))} style={{ display: "none" }} />
          {loading ? (
            <div>
              <div style={{ fontSize: "24px", marginBottom: "8px", animation: "spin 1.5s linear infinite" }}>⚙️</div>
              <div style={{ color: "#C4873A", fontSize: "14px", fontWeight: 700 }}>Analyzing your drawings...</div>
              <div style={{ color: "#555", fontSize: "11px", marginTop: "4px" }}>This takes 30-60 seconds depending on page count</div>
            </div>
          ) : data ? (
            <div>
              <div style={{ color: "#5aaa5a", fontSize: "14px", fontWeight: 700 }}>✓ {fileName}</div>
              <div style={{ color: "#444", fontSize: "11px", marginTop: "4px" }}>Drop a new file to re-analyze</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "32px", marginBottom: "8px", opacity: 0.5 }}>📐</div>
              <div style={{ color: "#bbb", fontSize: "15px", fontWeight: 700 }}>Drop your structural PDF or drawing here</div>
              <div style={{ color: "#555", fontSize: "12px", marginTop: "6px" }}>One file — the AI will find schedules, count members, and calculate everything</div>
              <div style={{ color: "#3a3a3a", fontSize: "11px", marginTop: "4px" }}>PDF, JPG, PNG</div>
            </div>
          )}
        </div>

        {/* Log */}
        {log.length > 0 && (
          <div style={{ padding: "8px 12px", background: "#0a0a0a", borderRadius: "8px", border: "1px solid #141414", marginBottom: "16px", maxHeight: "100px", overflowY: "auto" }}>
            {log.map((l, i) => (
              <div key={i} style={{ fontSize: "10px", color: l.msg.startsWith("✓") ? "#5aaa5a" : l.msg.startsWith("✗") ? "#c44" : "#555", fontFamily: "monospace", padding: "1px 0" }}>
                <span style={{ color: "#333", marginRight: "6px" }}>{l.t}</span>{l.msg}
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ padding: "10px 14px", background: "#1a0808", border: "1px solid #3a1010", borderRadius: "8px", color: "#c44", fontSize: "12px", marginBottom: "14px" }}>{error}</div>}

        {/* Results */}
        {sum && (
          <div>
            {/* Top cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px" }}>
              {[
                { l: "Total Concrete", v: (sum.total_concrete_m3 || 0).toFixed(1), u: "m³", c: "#C4873A", bg: "#110f06", bc: "#2a2208" },
                { l: "Total Steel", v: (sum.total_steel_ton || (sum.total_steel_kg || 0) / 1000).toFixed(2), u: `tons (${(sum.total_steel_kg || 0).toFixed(0)} kg)`, c: "#5BA4C9", bg: "#060d12", bc: "#0a2030" },
                { l: "Members Found", v: members.length, u: "types", c: "#5aaa5a", bg: "#060d08", bc: "#0a300a" },
              ].map(x => (
                <div key={x.l} style={{ background: x.bg, border: `1px solid ${x.bc}`, borderRadius: "10px", padding: "14px" }}>
                  <div style={{ fontSize: "9px", color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>{x.l}</div>
                  <div style={{ fontSize: "22px", color: x.c, fontFamily: "monospace", fontWeight: 700, marginTop: "4px" }}>{x.v}</div>
                  <div style={{ fontSize: "10px", color: "#3a3a3a" }}>{x.u}</div>
                </div>
              ))}
            </div>

            {/* Steel by diameter */}
            {activeDias.length > 0 && (
              <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
                <div style={{ fontSize: "10px", color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Steel by Diameter</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {activeDias.map(d => (
                    <div key={d} style={{ background: "#0a0a0a", border: "1px solid #161616", borderRadius: "8px", padding: "8px 12px", textAlign: "center", minWidth: "85px" }}>
                      <div style={{ fontSize: "13px", color: "#ddd", fontWeight: 700 }}>Ø{d}</div>
                      <div style={{ fontSize: "12px", color: "#5BA4C9", fontFamily: "monospace", fontWeight: 700, marginTop: "2px" }}>{getDia(d).toFixed(0)} kg</div>
                      <div style={{ fontSize: "9px", color: "#3a3a3a" }}>{(getDia(d) / 1000).toFixed(2)} ton</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cross table */}
            {sum.by_section && Object.keys(sum.by_section).length > 0 && (
              <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "14px", marginBottom: "14px", overflowX: "auto" }}>
                <div style={{ fontSize: "10px", color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Steel × Section (kg)</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #1a1a1a" }}>
                      <th style={{ padding: "4px", color: "#555", textAlign: "left" }}>Section</th>
                      {activeDias.map(d => <th key={d} style={{ padding: "4px", color: "#5BA4C9", textAlign: "right" }}>{d}mm</th>)}
                      <th style={{ padding: "4px", color: "#C4873A", textAlign: "right" }}>Total</th>
                      <th style={{ padding: "4px", color: "#C4873A", textAlign: "right" }}>Ton</th>
                      <th style={{ padding: "4px", color: "#C4873A", textAlign: "right" }}>m³</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sum.by_section).filter(([, v]) => v.steel_kg > 0).map(([sec, v]) => (
                      <tr key={sec} style={{ borderBottom: "1px solid #111" }}>
                        <td style={{ padding: "4px", color: "#999", fontWeight: 600 }}>{sec}</td>
                        {activeDias.map(d => {
                          const val = v[`${d}mm`] || 0;
                          return <td key={d} style={{ padding: "4px", color: val > 0 ? "#777" : "#222", textAlign: "right", fontFamily: "monospace" }}>{val > 0 ? val.toFixed(0) : "—"}</td>;
                        })}
                        <td style={{ padding: "4px", color: "#C4873A", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{v.steel_kg.toFixed(0)}</td>
                        <td style={{ padding: "4px", color: "#C4873A", textAlign: "right", fontFamily: "monospace" }}>{(v.steel_kg / 1000).toFixed(2)}</td>
                        <td style={{ padding: "4px", color: "#C4873A", textAlign: "right", fontFamily: "monospace" }}>{(v.concrete_m3 || 0).toFixed(1)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid #333" }}>
                      <td style={{ padding: "4px", color: "#fff", fontWeight: 800 }}>TOTAL</td>
                      {activeDias.map(d => <td key={d} style={{ padding: "4px", color: "#5BA4C9", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{getDia(d).toFixed(0)}</td>)}
                      <td style={{ padding: "4px", color: "#C4873A", textAlign: "right", fontFamily: "monospace", fontWeight: 800 }}>{(sum.total_steel_kg || 0).toFixed(0)}</td>
                      <td style={{ padding: "4px", color: "#C4873A", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{((sum.total_steel_kg || 0) / 1000).toFixed(2)}</td>
                      <td style={{ padding: "4px", color: "#C4873A", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{(sum.total_concrete_m3 || 0).toFixed(1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Member details by category */}
            {["footing", "column", "beam", "lintel", "ground_beam", "coping", "boundary"].map(cat => {
              const items = members.filter(m => (m.category || "").toLowerCase().includes(cat));
              if (!items.length) return null;
              const label = cat.charAt(0).toUpperCase() + cat.slice(1) + "s";
              return (
                <div key={cat} style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#888", marginBottom: "8px" }}>
                    {label} <span style={{ fontWeight: 500, color: "#444" }}>({items.length})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {items.map(m => <ResultCard key={m.name} m={m} />)}
                  </div>
                </div>
              );
            })}

            {/* Pages identified */}
            {data?.pages_identified?.length > 0 && (
              <div style={{ marginTop: "16px", padding: "10px 14px", background: "#0a0a0a", borderRadius: "8px", border: "1px solid #141414" }}>
                <div style={{ fontSize: "10px", color: "#444", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Pages Analyzed</div>
                {data.pages_identified.map((p, i) => (
                  <div key={i} style={{ fontSize: "10px", color: "#555", fontFamily: "monospace", padding: "1px 0" }}>
                    Page {p.page}: {p.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
