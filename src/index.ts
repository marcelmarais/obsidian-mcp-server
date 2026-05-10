import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateVaultPath } from "./utils.js";
import { createReadTools } from "./read.js";
import { createWriteTools } from "./write.js";
import { createSearchTools } from "./search.js";
import { createManageTools } from "./manage.js";

const vaultPath = validateVaultPath(process.argv[2]);

const server = new McpServer({
  name: "obsidian-notes",
  version: "1.0.0",
});

const tools = [
  ...createReadTools(vaultPath),
  ...createWriteTools(vaultPath),
  ...createSearchTools(vaultPath),
  ...createManageTools(vaultPath),
];

tools.forEach((tool) => {
  server.tool(tool.name, tool.description, tool.schema, tool.handler);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Obsidian MCP Server running on stdio (vault: ${vaultPath})`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
