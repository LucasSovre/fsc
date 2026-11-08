import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import { Readable } from "node:stream";
import type { fetchClientMetadataResource } from "@better-auth/cimd/node";

const privateV4 = new BlockList();
const privateV6 = new BlockList();
for (const [net, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3]] as const)
  privateV4.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [["::", 128], ["::1", 128], ["::ffff:0:0", 96], ["64:ff9b::", 96], ["100::", 64], ["2001:db8::", 32], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]] as const)
  privateV6.addSubnet(net, prefix, "ipv6");

const isPublic = (address: string) => isIP(address) === 6 ? !privateV6.check(address, "ipv6") : !privateV4.check(address, "ipv4");

function fetchFrom(webRequest: Request, url: URL, address: string, family: number) {
  const headers = Object.fromEntries(webRequest.headers.entries());
  headers.host = url.host;
  return new Promise<Response>((resolve, reject) => {
    const req = request(url, {
      agent: false, headers, method: webRequest.method, servername: url.hostname, signal: webRequest.signal,
      lookup: (_host, options, callback) => options.all ? callback(null, [{ address, family }]) : callback(null, address, family),
    } as Parameters<typeof request>[1], response => {
      const status = response.statusCode ?? 500;
      const body = webRequest.method === "HEAD" || [204, 205, 304].includes(status) ? null : Readable.toWeb(response) as unknown as ReadableStream;
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(response.headers)) for (const item of [value ?? []].flat()) responseHeaders.append(name, item);
      resolve(new Response(body, { status, headers: responseHeaders }));
    });
    req.once("error", reject);
    req.end();
  });
}

export const fetchMetadataWithFallback: typeof fetchClientMetadataResource = async (input, init) => {
  const webRequest = new Request(input, init);
  const url = new URL(webRequest.url);
  if (url.protocol !== "https:" || (webRequest.method !== "GET" && webRequest.method !== "HEAD")) throw new TypeError("CIMD requires an HTTPS GET or HEAD request");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || !addresses.every(({ address }) => isPublic(address))) throw new TypeError("metadata hostname must resolve only to public-routable addresses");
  let failure: unknown;
  for (const { address, family } of addresses) {
    try { return await fetchFrom(webRequest, url, address, family); }
    catch (error) { failure = error; }
  }
  throw failure;
};
