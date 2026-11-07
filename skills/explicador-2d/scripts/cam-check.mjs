// Confere as chaves de câmera K do scene.html: aponta chaves coladas (< 0,35 s) ou rápidas demais,
// que o QA acusa como "pulos de imagem fora dos cortes". Uso: node cam-check.mjs videos/<slug>
import fs from "node:fs";
const dir = process.argv[2];
const words = JSON.parse(fs.readFileSync(`${dir}/words.json`, "utf8"));
const W = (i) => words[i].start;
const END = JSON.parse(fs.readFileSync(`${dir}/video.json`, "utf8")).duration;
const s = fs.readFileSync(`${dir}/scene.html`, "utf8");
const a = s.indexOf("const K = ") + 10, b = s.indexOf("].sort(", a) + 1;
if (a < 10) { console.log("sem `const K = [...]` no scene.html"); process.exit(0); }
const K = eval(s.slice(a, b)).sort((x, y) => x[0] - y[0]);
let bad = 0;
for (let i = 1; i < K.length; i++) {
  const dt = K[i][0] - K[i - 1][0];
  const mv = Math.hypot(K[i][1] - K[i - 1][1], K[i][2] - K[i - 1][2]) + 800 * Math.abs(K[i][3] - K[i - 1][3]);
  if (dt < .35 || mv / dt > 1000) { bad++; console.log(`chave ${i}: ${K[i - 1][0].toFixed(2)}→${K[i][0].toFixed(2)} s, dt ${dt.toFixed(2)}, ${(mv / dt).toFixed(0)} px/s`); }
}
console.log(bad ? `${bad} chave(s) para espaçar` : "câmera ok");
process.exit(bad ? 1 : 0);
