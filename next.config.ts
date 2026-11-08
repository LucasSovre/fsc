import { execSync } from "node:child_process";
import type { NextConfig } from "next";

const appVersion = (process.env.APP_VERSION || (() => {
  try { return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch { return "dev"; }
})()).trim().slice(0, 7);

const nextConfig: NextConfig = {
  output: "standalone",
  env: { NEXT_PUBLIC_APP_VERSION: appVersion },
  serverExternalPackages: ["pg", "nodemailer", "web-push"],
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
  async headers() {
    return [{ source: "/evenements/:id/billets/:attachment", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ] }, { source: "/((?!evenements/[^/]+/billets/).*)", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
};

export default nextConfig;
