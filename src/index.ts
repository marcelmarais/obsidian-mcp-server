import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readTools } from "./read.js";

export const server = new McpServer({
  name: "obsidian",
  version: "1.0.0",
});

export let vaultPath: string | undefined = process.argv[2];

readTools.forEach((tool) => {
  server.tool(tool.name, tool.description, tool.schema, tool.handler);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Obsidian MCP Server running on stdio");

  if (vaultPath) {
    console.error(`Using file path: ${vaultPath}`);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
