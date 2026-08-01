"use client";
import React from "react";

// Renders simple math notation without heavy libraries:
//   x^2 -> superscript, H_2O -> subscript, x^{n+1} / a_{ij} with braces.
// Plain text otherwise. No HTML injection (builds React nodes).
export default function MathText({ text, className }: { text?: string; className?: string }) {
  return <span className={className}>{parseMath(text || "")}</span>;
}

function parseMath(input: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = "";
  let key = 0;
  const flush = () => { if (buf) { out.push(<React.Fragment key={key++}>{buf}</React.Fragment>); buf = ""; } };
  const len = input.length;
  for (let i = 0; i < len; i++) {
    const ch = input[i];
    if ((ch === "^" || ch === "_") && i + 1 < len) {
      let content = "";
      let j = i + 1;
      if (input[j] === "{") {
        j++;
        while (j < len && input[j] !== "}") { content += input[j]; j++; }
        j++;
      } else {
        if (input[j] === "+" || input[j] === "-") { content += input[j]; j++; }
        if (j < len && /[0-9]/.test(input[j])) {
          while (j < len && /[0-9]/.test(input[j])) { content += input[j]; j++; }
        } else if (j < len && /[A-Za-z]/.test(input[j])) {
          content += input[j]; j++;
        }
      }
      if (content) {
        flush();
        out.push(ch === "^" ? <sup key={key++}>{content}</sup> : <sub key={key++}>{content}</sub>);
        i = j - 1;
        continue;
      }
    }
    buf += ch;
  }
  flush();
  return out;
}
