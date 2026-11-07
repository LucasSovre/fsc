import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import { registerTools } from "../mcp";
import type { ToolContext } from "../mcp/context";

export type Tool = { description: string; schema: z.ZodType; run: (input: unknown) => Promise<unknown> };

export function captureTools(userId: string, invoke: ToolContext["invoke"]) {
  const tools = new Map<string, Tool>();
  const server = {
    registerTool: (name: string, config: { description: string; inputSchema: z.ZodType }, handler: (input: unknown, extra: unknown) => Promise<unknown>) =>
      tools.set(name, { description: config.description, schema: config.inputSchema, run: input => handler(input, {}) }),
  } as unknown as McpServer;
  registerTools({ server, userId, invoke });
  return tools;
}

export async function toolScopes() {
  const found = Symbol("scope");
  let current = "";
  const scopes = new Map<string, string>();
  const invoke = (async (scope: string) => { current = scope; throw found; }) as unknown as ToolContext["invoke"];
  for (const [name, tool] of captureTools("", invoke)) {
    try { await tool.run({}); } catch (error) { if (error !== found) throw error; }
    scopes.set(name, current);
  }
  return scopes;
}
