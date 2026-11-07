// Regenerate the Better Auth portion from the installed provider's schema.
// All migrations remain owned by Prisma; Better Auth's migrate CLI is not used.
import { getAuthTables } from "better-auth/db";
import { authSchemaOptions } from "../src/server/auth-options";
import { readFileSync, writeFileSync } from "node:fs";

const tables = getAuthTables(authSchemaOptions);
const names = Object.fromEntries(Object.entries(tables).map(([key]) => [key, `Auth${key[0].toUpperCase()}${key.slice(1)}`]));
let output = "// Generated from Better Auth. Run bun run auth:contract after upgrading.\n";
for (const [key, table] of Object.entries(tables)) {
  output += `model ${names[key]} {\n  id String @id\n`;
  const relations: string[] = [];
  const indexes: string[] = [];
  for (const [field, attr] of Object.entries(table.fields)) {
    // Kysely's Better Auth adapter serializes array/json fields as JSON text.
    const type = attr.type === "json" ? "Json" : attr.type === "date" ? "DateTime" : attr.type === "boolean" ? "Boolean" : attr.type === "number" ? (attr.bigint ? "BigInt" : "Int") : "String";
    output += `  ${field} ${type}${attr.required === false ? "?" : ""}${attr.unique ? " @unique" : ""}${attr.fieldName && attr.fieldName !== field ? ` @map("${attr.fieldName}")` : ""}\n`;
    if (attr.index && !attr.unique) indexes.push(`  @@index([${field}])`);
    if (attr.references) relations.push(`  ${field}Ref ${names[attr.references.model]}${attr.required === false ? "?" : ""} @relation(fields: [${field}], references: [${attr.references.field}], onDelete: ${attr.references.onDelete === "set null" ? "SetNull" : "Cascade"})`);
  }
  for (const index of table.indexes ?? []) indexes.push(`  @@${index.unique ? "unique" : "index"}([${index.fields.join(", ")}])`);
  output += [...relations, ...new Set(indexes), `  @@map("${table.modelName}")`, "}", ""].join("\n") + "\n";
}
const domain = readFileSync("src/prisma/domain.prisma", "utf8");
writeFileSync("src/prisma/contract.prisma", `// use prisma-8\n\n${output}\n${domain}`);
