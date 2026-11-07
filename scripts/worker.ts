import { recoverInterrupted, tick } from "../src/server/worker";
import { assertProductionConfig } from "../src/server/config";
import { pool } from "../src/server/database";

assertProductionConfig();
let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
await recoverInterrupted();
while (!stopping) {
  try { await tick(); }
  catch { console.error("Le traitement des rappels a échoué ; nouvel essai au prochain passage."); }
  for (let i = 0; i < 30 && !stopping; i++) await new Promise(resolve => setTimeout(resolve, 1000));
}
await pool.end();
