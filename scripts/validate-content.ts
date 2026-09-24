// Aufruf: npm run content:check [-- <unit_code>]
import { loadContentFiles, loadStructure } from "../lib/content/load";
import { validateContent } from "../lib/content/validate";

const root = process.cwd();
const only = process.argv[2];
const structure = loadStructure(root);
const files = loadContentFiles(root).filter((f) => !only || f.unitCode === only);
const issues = validateContent(structure, files);

const counts = files.map((f) => {
  const types: Record<string, number> = {};
  for (const i of f.items) types[i.type] = (types[i.type] ?? 0) + 1;
  return `${f.unitCode}: ${f.items.length} Items (${Object.entries(types).map(([t, n]) => `${t} ${n}`).join(", ")})`;
});
console.log(counts.join("\n"));

for (const i of issues) console.log(`${i.level === "error" ? "FEHLER" : "Hinweis"} ${i.code}: ${i.msg}`);
const errors = issues.filter((i) => i.level === "error").length;
console.log(`\n${errors} Fehler, ${issues.length - errors} Hinweise`);
process.exit(errors ? 1 : 0);
