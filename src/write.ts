import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { tool } from "./types.js";
import { vaultPath } from "./index.js";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { getAllFilenames } from "./read.js";

export const updateFileContent: tool<{
  filePath: z.ZodString;
  content: z.ZodString;
}> = {
  name: "updateFileContent",
  description:
    "Updates the content of a specified file in the Obsidian vault with new markdown content. If the file doesn't exist, it will be created. The tool accepts a file path (relative to the vault root) and the new content to write to the file. Note: if updating an existing file, you need to include both the old and new content in a single Markdown string.",
  schema: {
    filePath: z
      .string()
      .describe("The path of the file to update, relative to the vault root"),
    content: z.string().describe("The markdown content to write to the file"),
  },
  handler: (args, extra: RequestHandlerExtra) => {
    if (!vaultPath) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No vault path provided. Please specify a vault path when starting the server.",
          },
        ],
      };
    }

    const { filePath, content } = args;

    try {
      const allFiles = getAllFilenames(vaultPath);
      const fileExists = allFiles.includes(filePath);

      const fullPath = path.join(vaultPath, filePath);
      const dirPath = path.dirname(fullPath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, "utf8");

      return {
        content: [
          {
            type: "text",
            text: fileExists
              ? `Successfully updated existing file: ${filePath}`
              : `Successfully created new file: ${filePath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating file: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

export const writeTools = [updateFileContent];
