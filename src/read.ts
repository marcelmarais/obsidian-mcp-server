import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { tool } from "./types.js";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { glob } from "glob";

export function getAllFilenames(dirPath: string): string[] {
  const files = glob.sync("**/*", { cwd: dirPath, nodir: true, dot: false });
  return files
    .map((file: string) => ({
      path: file,
      mtime: fs.statSync(path.join(dirPath, file)).mtime,
    }))
    .sort(
      (a: { mtime: Date }, b: { mtime: Date }) =>
        b.mtime.getTime() - a.mtime.getTime()
    )
    .map((file: { path: string }) => file.path);
}

export function readFilesByName(
  rootPath: string,
  targetFilenames: string[]
): string[] {
  const allFiles = getAllFilenames(rootPath);
  const fileMap = new Map<string, string>();
  allFiles.forEach((file) => fileMap.set(file.toLowerCase(), file));

  const readAndFormat = (filePath: string): string => {
    const content = fs.readFileSync(path.join(rootPath, filePath), "utf8");
    return `# File: ${filePath}\n\n${content}`;
  };

  return targetFilenames.flatMap((targetName) => {
    if (allFiles.includes(targetName)) return [readAndFormat(targetName)];

    const lower = targetName.toLowerCase();
    if (fileMap.has(lower)) return [readAndFormat(fileMap.get(lower)!)];

    const partial = allFiles.filter((f) =>
      path.basename(f).toLowerCase().includes(lower)
    );
    if (partial.length > 0) return partial.map(readAndFormat);

    return [`# File: ${targetName}\n\nFile not found in vault.`];
  });
}

export function findOpenTodos(rootPath: string): string[] {
  const mdFiles = glob.sync("**/*.md", {
    cwd: rootPath,
    nodir: true,
    dot: false,
  });
  const todos: string[] = [];

  mdFiles.forEach((filePath) => {
    const content = fs.readFileSync(path.join(rootPath, filePath), "utf8");
    content.split("\n").forEach((line) => {
      if (/- \[ \] .+/.test(line)) {
        todos.push(`- **${filePath}**: ${line.trim()}`);
      }
    });
  });

  return todos;
}

export function createReadTools(vaultPath: string): tool<any>[] {
  const getAllFilenamesTool: tool<{}> = {
    name: "getAllFilenames",
    description:
      "Get a list of all filenames in the Obsidian vault. Useful for retrieving their contents later.",
    schema: {},
    handler: (_args, _extra: RequestHandlerExtra<any, any>) => {
      const filenames = getAllFilenames(vaultPath);
      return {
        content: [
          {
            type: "text",
            text: `# All markdown files in vault (note: today's date is ${
              new Date().toISOString().split("T")[0]
            })\n\n${filenames.join("\n")}`,
          },
        ],
      };
    },
  };

  const readMultipleFilesTool: tool<{ filenames: z.ZodArray<z.ZodString> }> = {
    name: "readMultipleFiles",
    description:
      "Retrieves the contents of specified files from the Obsidian vault. You can provide exact filenames (with or without path), partial filenames, or case-insensitive matches. Each file's content is prefixed with '# File: filename'.",
    schema: { filenames: z.array(z.string()) },
    handler: (args, _extra: RequestHandlerExtra<any, any>) => {
      const results = readFilesByName(vaultPath, args.filenames);
      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "No matching files found in the vault." }],
        };
      }
      return { content: [{ type: "text", text: results.join("\n\n") }] };
    },
  };

  const getOpenTodosTool: tool<{}> = {
    name: "getOpenTodos",
    description:
      "Retrieves all open TODO items in the Obsidian vault with their file locations. Useful for getting an overview of pending tasks.",
    schema: {},
    handler: (_args, _extra: RequestHandlerExtra<any, any>) => {
      const todos = findOpenTodos(vaultPath);
      if (todos.length === 0) {
        return {
          content: [{ type: "text", text: "No open TODOs found in the vault." }],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `# Open TODOs in vault (${todos.length} items)\n\n${todos.join("\n")}`,
          },
        ],
      };
    },
  };

  return [getAllFilenamesTool, readMultipleFilesTool, getOpenTodosTool];
}
