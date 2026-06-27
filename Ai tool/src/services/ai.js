import { STRUCTURAL_QS_PROMPT } from "../constants/prompt";

async function callAI(content, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: [...content, { type: "text", text: prompt }] }],
    }),
  });

  const data = await res.json();
  return data.content.map((c) => c.text || "").join("");
}

export async function analyzeDrawings(images, onLog) {
  onLog("Sending pages to AI for full analysis...");

  const imageContent = images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.mime, data: img.data },
  }));

  const raw = await callAI(imageContent, STRUCTURAL_QS_PROMPT);
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
