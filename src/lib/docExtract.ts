"use client";
// In-browser text extraction from PDF / Word / PowerPoint / text.
// Loads parsers from CDN on demand. Nothing is uploaded or stored.
const MAX_CHARS = 12000;
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-src="' + src + '"]')) return resolve();
    const s = document.createElement("script");
    s.src = src; s.setAttribute("data-src", src);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load helper script."));
    document.head.appendChild(s);
  });
}
export async function extractTextFromFile(file: File): Promise<string> {
  const name = (file.name || "").toLowerCase();
  let text = "";
  if (name.endsWith(".txt")) {
    text = await file.text();
  } else if (name.endsWith(".pdf")) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const parts: string[] = [];
    for (let p = 1; p <= pdf.numPages && parts.join(" ").length < MAX_CHARS; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      parts.push(content.items.map((i: any) => i.str).join(" "));
    }
    text = parts.join("\n");
  } else if (name.endsWith(".docx")) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    const res = await (window as any).mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = res.value || "";
  } else if (name.endsWith(".pptx")) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
    const zip = await (window as any).JSZip.loadAsync(await file.arrayBuffer());
    const slides = Object.keys(zip.files).filter((n: string) => /ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
    const parts: string[] = [];
    for (const n of slides) {
      const xml = await zip.files[n].async("string");
      parts.push(xml.replace(/<a:t>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    }
    text = parts.join("\n");
  } else {
    throw new Error("Unsupported file. Use PDF, Word (.docx), PowerPoint (.pptx), or .txt.");
  }
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);
  return text;
}
