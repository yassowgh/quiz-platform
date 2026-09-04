"use client";
import { useRef, useEffect } from "react";

export default function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.innerHTML = value || ""; }, []);
  function cmd(c: string, v?: string) { document.execCommand(c, false, v); if (ref.current) onChange(ref.current.innerHTML); }
  function link() { const u = prompt("Link URL:"); if (u) cmd("createLink", u); }
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b border-gray-100 bg-gray-50 p-1.5 text-sm">
        <button type="button" onClick={() => cmd("bold")} className="px-2 py-1 rounded hover:bg-gray-200 font-bold">B</button>
        <button type="button" onClick={() => cmd("italic")} className="px-2 py-1 rounded hover:bg-gray-200 italic">I</button>
        <button type="button" onClick={() => cmd("underline")} className="px-2 py-1 rounded hover:bg-gray-200 underline">U</button>
        <button type="button" onClick={() => cmd("insertUnorderedList")} className="px-2 py-1 rounded hover:bg-gray-200">• List</button>
        <button type="button" onClick={() => cmd("formatBlock", "H2")} className="px-2 py-1 rounded hover:bg-gray-200 font-bold">H</button>
        <button type="button" onClick={link} className="px-2 py-1 rounded hover:bg-gray-200 text-indigo-600">🔗 Link</button>
      </div>
      <div ref={ref} contentEditable onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)} className="min-h-[180px] p-3 text-sm focus:outline-none" suppressContentEditableWarning />
    </div>
  );
}
