export async function pdfToImages(file, onLog) {
  if (!window.pdfjsLib) {
    onLog("Loading PDF reader...");
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  onLog(`PDF loaded: ${totalPages} pages. Converting structural pages to images...`);

  const images = [];
  const pagesToConvert = getPagesToConvert(totalPages);
  onLog(`Converting ${pagesToConvert.length} pages: ${pagesToConvert.join(", ")}`);

  for (const pageNum of pagesToConvert) {
    try {
      const page = await pdf.getPage(pageNum);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      images.push({
        data: dataUrl.split(",")[1],
        mime: "image/jpeg",
        name: `page_${pageNum}`,
      });
    } catch {
      onLog(`Warning: Could not convert page ${pageNum}`);
    }
  }

  onLog(`✓ Converted ${images.length} pages to images`);
  return images;
}

function getPagesToConvert(totalPages) {
  if (totalPages <= 20) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const startPages = [1, 2];
  const endStart = Math.max(3, totalPages - 17);
  const endPages = Array.from({ length: totalPages - endStart + 1 }, (_, i) => endStart + i);
  return [...new Set([...startPages, ...endPages])].sort((a, b) => a - b).slice(0, 20);
}
