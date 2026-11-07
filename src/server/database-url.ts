export function databaseUrl(env: Readonly<Record<string, string | undefined>> = process.env) {
  const host = env.POSTGRES_HOST || "localhost";
  const hostname = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  const url = new URL(`postgresql://${hostname}:${env.POSTGRES_PORT || "5432"}`);
  url.username = encodeURIComponent(env.POSTGRES_USER || "fsc");
  url.password = encodeURIComponent(env.POSTGRES_PASSWORD || "");
  url.pathname = `/${encodeURIComponent(env.POSTGRES_DB || "fsc")}`;
  return url.toString();
}
