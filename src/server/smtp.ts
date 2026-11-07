import { rows } from "./database";
import { decryptSecret, encryptSecret } from "./secret";
import { DomainError, smtpSchema, type SmtpInput } from "./validation";

export type SmtpConfig = { host: string; port: number; secure: boolean; user: string; password: string; from: string };
type SmtpRow = { host: string; port: number; secure: boolean; user: string | null; encryptedPassword: string | null; from: string };

const columns = 'host,port,secure,"user","encryptedPassword","from"';

async function stored() {
  const [row] = await rows<SmtpRow>(`SELECT ${columns} FROM "smtpSetting" WHERE id='default'`);
  return row;
}
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const row = await stored();
  if (!row) return null;
  let password = "";
  try { password = row.encryptedPassword ? decryptSecret(row.encryptedPassword) : ""; }
  catch { throw new DomainError("Le mot de passe SMTP enregistré est illisible. Saisis-le à nouveau dans les réglages."); }
  return { host: row.host, port: row.port, secure: row.secure, user: row.user ?? "", password, from: row.from };
}
export async function isMailConfigured() {
  return Boolean(await stored());
}
export async function getSmtpSummary() {
  const row = await stored();
  return row ? { host: row.host, port: row.port, secure: row.secure, user: row.user ?? "", from: row.from, hasPassword: Boolean(row.encryptedPassword) } : null;
}
export async function saveSmtpConfig(raw: SmtpInput) {
  const input = smtpSchema.parse(raw);
  const current = await stored();
  const user = input.user;
  const encryptedPassword = !user ? null : input.password ? encryptSecret(input.password) : current?.encryptedPassword ?? null;
  await rows(
    `INSERT INTO "smtpSetting" (id,host,port,secure,"user","encryptedPassword","from","updatedAt") VALUES ('default',$1,$2,$3,$4,$5,$6,now())
     ON CONFLICT (id) DO UPDATE SET host=$1,port=$2,secure=$3,"user"=$4,"encryptedPassword"=$5,"from"=$6,"updatedAt"=now()`,
    [input.host, input.port, input.secure, user || null, encryptedPassword, input.from],
  );
}
