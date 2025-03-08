import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { tool } from "./types.js";
import { vaultPath } from "./index.js";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { glob } from "glob";

const getAllFilenamesTool: tool<{}> = {
  name: "getAllFilenames",
  description:
    "Get a list of all filenames in the Obsidian vault. Useful for retrieving their contents later. ",
  schema: {},
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

export function getAllFilenames(
  dirPath: string,
  basePath: string = dirPath
): string[] {
  // Ignore dot files/directories and get all files recursively
  const files = glob.sync("**/*", {
    cwd: dirPath,
    nodir: true,
    dot: false,
  });

  // Get file stats and sort by modification time (most recent first)
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

export const readFiles: tool<{
  filenames: z.ZodArray<z.ZodString>;
}> = {
  name: "readMultipleFiles",
  description:
    "Retrieves the contents of specified files from the Obsidian vault. You can provide exact filenames (with or without path), partial filenames, or case-insensitive matches. The tool will search for files that match any of these criteria and return their contents. If a file isn't found, it will indicate that in the response. Each file's content is prefixed with '# File: filename' for clear identification. Use this tool when you need to read specific documents from the vault.",
  schema: {
    filenames: z.array(z.string()),
  },
  handler: (args, extra: RequestHandlerExtra) => {
    const { filenames } = args;

    const fileContents = readFilesByName(vaultPath, filenames);

    if (fileContents.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No matching files found in the vault.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: fileContents.join("\n\n"),
        },
      ],
    };
  },
};

function readFilesByName(
  rootPath: string,
  targetFilenames: string[]
): string[] {
  const allFiles = getAllFilenames(rootPath);

  const fileMap = new Map<string, string>();
  allFiles.forEach((file) => {
    fileMap.set(file.toLowerCase(), file);
  });

  const readAndFormatFile = (filePath: string): string => {
    const content = fs.readFileSync(path.join(rootPath, filePath), "utf8");
    return `# File: ${filePath}\n\n${content}`;
  };

  return targetFilenames.flatMap((targetName) => {
    // 1. Try exact match
    if (allFiles.includes(targetName)) {
      return [readAndFormatFile(targetName)];
    }

    // 2. Try case-insensitive match
    const lowerTargetName = targetName.toLowerCase();
    if (fileMap.has(lowerTargetName)) {
      return [readAndFormatFile(fileMap.get(lowerTargetName)!)];
    }

    // 3. Try partial filename match
    const matchingFiles = allFiles.filter((file) =>
      path.basename(file).toLowerCase().includes(lowerTargetName)
    );

    if (matchingFiles.length > 0) {
      return matchingFiles.map(readAndFormatFile);
    }

    // 4. No matches found
    return [`# File: ${targetName}\n\nFile not found in vault.`];
  });
}

export const getOpenTodos: tool<{}> = {
  name: "getOpenTodos",
  description:
    "Retrieves all open TODO items in the Obsidian vault with their file locations. Useful for getting an overview of pending tasks.",
  schema: {},
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

    const todos = findOpenTodos(vaultPath);

    if (todos.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No open TODOs found in the vault.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `# Open TODOs in vault (${todos.length} items)\n\n${todos.join(
            "\n"
          )}`,
        },
      ],
    };
  },
};

function findOpenTodos(rootPath: string): string[] {
  const mdFiles = glob.sync("**/*.md", {
    cwd: rootPath,
    nodir: true,
    dot: false,
  });

  const todoRegex = /- \[ \] .+/g;
  const todos: string[] = [];

  mdFiles.forEach((filePath) => {
    const content = fs.readFileSync(path.join(rootPath, filePath), "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (line.includes("- [ ]")) {
        if (todoRegex.test(line)) {
          todos.push(`- **${filePath}**: ${line.trim()}`);
        }
        todoRegex.lastIndex = 0;
      }
    });
  });

  return todos;
}

export const readTools = [getAllFilenamesTool, readFiles, getOpenTodos];
