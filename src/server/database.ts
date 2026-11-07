import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalDB = globalThis as unknown as { fscPool?: Pool };
export const pool = globalDB.fscPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== "production") globalDB.fscPool = pool;
export type Connection = Pick<PoolClient, "query">;
export async function rows<T extends QueryResultRow>(sql: string, values: unknown[] = [], db: Connection = pool): Promise<T[]> {
  return (await db.query<T>(sql, values)).rows;
}
export async function transaction<T>(fn: (db: PoolClient) => Promise<T>) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    // Calendar mutations and reminder dispatch share this lock. For a couple,
    // a short global lock is simpler than a fragile hierarchy of row locks.
    await db.query("SELECT pg_advisory_xact_lock(731923041)");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally { db.release(); }
}
