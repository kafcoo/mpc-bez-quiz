import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
const name = fs.readdirSync(".").find((x) => x.endsWith(".pdf"));
const pdf = await getDocument({
  data: new Uint8Array(fs.readFileSync(name)),
  useSystemFonts: true,
}).promise;
let lines = [];
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const { items } = await page.getTextContent();
  let line = "",
    previous = null;
  for (const item of items) {
    if (!("str" in item)) continue;
    if (previous && Math.abs(previous.transform[5] - item.transform[5]) > 3) {
      if (line.trim()) lines.push(line.trim());
      line = "";
      previous = null;
    }
    const gap = previous
      ? item.transform[4] - (previous.transform[4] + previous.width)
      : 0;
    line += (gap > 2 && !line.endsWith(" ") ? " " : "") + item.str;
    previous = item;
    if (item.hasEOL) {
      if (line.trim()) lines.push(line.trim());
      line = "";
      previous = null;
    }
  }
  if (line.trim()) lines.push(line.trim());
}
lines = lines.slice(lines.findIndex((x) => x.startsWith("Automatické")));
let questions = [],
  q = null,
  option = null;
for (const line of lines) {
  if (line.startsWith("•")) {
    option = { id: "abc"[q.options.length], text: line.replace(/^•\s*/, "") };
    q.options.push(option);
  } else if (!q || q.options.length === 3) {
    q = {
      id: `q${questions.length + 1}`,
      originalNumber: questions.length + 1,
      question: line,
      options: [],
    };
    questions.push(q);
    option = null;
  } else if (option) {
    option.text += " " + line;
  } else {
    q.question += " " + line;
  }
}
fs.writeFileSync("src/data/source.txt", lines.join("\n"));
fs.writeFileSync("src/data/extracted.json", JSON.stringify(questions, null, 2));
console.log(
  questions
    .map((q) => `${q.originalNumber}. ${q.question} [${q.options.length}]`)
    .join("\n"),
);
