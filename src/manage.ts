import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { tool } from "./types.js";
import { toErrorMessage } from "./utils.js";
import fs from "fs";
import path from "path";
import { z } from "zod";

export function moveFile(
  vaultPath: string,
  sourcePath: string,
  destinationPath: string
): void {
  const fullSource = path.join(vaultPath, sourcePath);
  const fullDest = path.join(vaultPath, destinationPath);

  if (!fs.existsSync(fullSource)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const destDir = path.dirname(fullDest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  fs.renameSync(fullSource, fullDest);
}

export function deleteFile(vaultPath: string, filePath: string): void {
  if (!filePath.endsWith(".md")) {
    throw new Error(`Only .md files can be deleted, got: ${filePath}`);
  }

  const fullPath = path.join(vaultPath, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  fs.unlinkSync(fullPath);
}

export function createManageTools(vaultPath: string): tool<any>[] {
  const moveFileTool: tool<{
    sourcePath: z.ZodString;
    destinationPath: z.ZodString;
  }> = {
    name: "moveFile",
    description:
      "Moves or renames a file within the Obsidian vault. Creates destination directories if they don't exist.",
    schema: {
      sourcePath: z.string().describe("Current file path relative to vault root"),
      destinationPath: z
        .string()
        .describe("New file path relative to vault root"),
    },
    handler: (args, _extra: RequestHandlerExtra<any, any>) => {
      try {
        moveFile(vaultPath, args.sourcePath, args.destinationPath);
        return {
          content: [
            {
              type: "text",
              text: `Successfully moved: ${args.sourcePath} → ${args.destinationPath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error moving file: ${toErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  };

  const deleteFileTool: tool<{ filePath: z.ZodString }> = {
    name: "deleteFile",
    description:
      "Permanently deletes a markdown file from the Obsidian vault. Only .md files can be deleted as a safety guard. Provide a file path ending in .md.",
    schema: {
      filePath: z.string().regex(/\.md$/).describe("File path relative to vault root (must end in .md)"),
    },
    handler: (args, _extra: RequestHandlerExtra<any, any>) => {
      try {
        deleteFile(vaultPath, args.filePath);
        return {
          content: [
            {
              type: "text",
              text: `Successfully deleted: ${args.filePath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error deleting file: ${toErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  };

  return [moveFileTool, deleteFileTool];
}
