// Zeigt Aufgaben so, wie Felix sie sieht, inkl. gezogener Zahlen und Lösung.
// Aufruf: npm run content:preview -- <item_code> [<item_code> ...]   oder   -- <unit_code>
import { loadContentFiles } from "../lib/content/load";
import { fillTemplate, formatNumberDe, instantiate } from "../lib/engine/template";

const args = process.argv.slice(2);
const items = loadContentFiles(process.cwd()).flatMap((f) => f.items);
const selected = items.filter((i) => args.some((a) => i.code === a || i.code.startsWith(`${a}-`)));

for (const item of selected) {
  console.log(`\n=== ${item.code} (${item.type}, ${item.skill_code}, Stufe ${item.difficulty})`);
  if (item.type === "numeric_template") {
    for (let k = 0; k < 4; k++) {
      const inst = instantiate(item.payload, `preview-${k}`);
      console.log(`- ${fillTemplate(item.stem, inst.values)}\n  => ${formatNumberDe(inst.answer)} ${item.payload.unit ?? ""}`);
    }
  } else {
    console.log(item.stem);
    console.log(JSON.stringify({ payload: item.payload, solution: item.solution }, null, 1));
  }
  console.log(`Erklärung: ${item.explanation}`);
}
