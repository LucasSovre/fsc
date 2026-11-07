import { pool } from "../src/server/database";
try {
  const { rows } = await pool.query('SELECT id FROM "workerHeartbeat" WHERE "updatedAt">now()-interval \'2 minutes\'');
  if (!rows.length) process.exitCode = 1;
} catch { process.exitCode = 1; }
finally { await pool.end(); }
