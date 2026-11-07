import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type ToolContext = {
  server: McpServer;
  userId: string;
  invoke: (scope: string, fn: () => Promise<unknown>) => Promise<{ isError?: boolean; content: { type: "text"; text: string }[] }>;
};
export const confirm = z.literal(true, { error: "Demande confirmation à l’utilisateur puis passe confirm à true." });
export const version = z.number().int().min(0);
