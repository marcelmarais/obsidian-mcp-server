# Obsidian MCP Server

A lightweight [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that enables AI assistants like Cursor & Claude to read from and write to your Obsidian vault.

## Example Interactions

- "Create a new note for standup tomorrow describing the code changes I've made today" (should also use Git)
- "Check my notes about project ideas"
- "Check what todos I have related to refactoring"

## Tools

### Read

1. **getAllFilenames**

   - Gets a list of all filenames in the Obsidian vault
   - Useful for discovering what files are available
2. **readMultipleFiles**

   - Retrieves the contents of specified files from the Obsidian vault
   - Supports exact filenames, partial filenames, or case-insensitive matches
   - Each file's content is prefixed with '# File: filename' for clear identification
3. **getOpenTodos**

   - Retrieves all open TODO items from markdown files in the Obsidian vault
   - Finds unchecked checkbox items (lines containing '- [ ] ')
   - Returns them with their file locations

### Write

1. **updateFileContent**
   - Updates the content of a specified file in the Obsidian vault with new markdown content
   - If the file doesn't exist, it will be created
   - Automatically creates any necessary directories

## Install & build

```bash
npm install obsidian-mcp-server
npm run build
```

## Integrating with Claude Desktop and Cursor

To use your MCP server with Claude Desktop add it to your Claude configuration:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": [
        "obsidian-mcp-server/build/index.js",
        "/path/to/your/vault"
      ]
    }
  }
}
```

For Cursor go to the MCP tab `Cursor Settings` (command + shift + J). Add a server with this command:

```bash
node obsidian-mcp-server/build/index.js /path/to/your/vault
```

## Comparison with Other Solutions

While this implementation is intentionally lightweight, other solutions like [jacksteamdev/obsidian-mcp-tools](https://github.com/jacksteamdev/obsidian-mcp-tools) offer a more feature-rich approach as an Obsidian plugin.

This standalone server has the advantage of direct filesystem access without requiring the Obsidian application to be running.

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
