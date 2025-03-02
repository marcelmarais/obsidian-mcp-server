import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readTools } from "./read.js";
import { writeTools } from "./write.js";
import { validateVaultPath } from "./utils.js";

export const server = new McpServer({
  name: "obsidian",
  version: "1.0.0",
});

export let vaultPath: string = validateVaultPath(process.argv[2]);

[...readTools, ...writeTools].forEach((tool) => {
  server.tool(tool.name, tool.description, tool.schema, tool.handler);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Obsidian MCP Server running on stdio");
  console.log(`Using vault path: ${vaultPath}`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
