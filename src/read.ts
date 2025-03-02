import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { tool } from "./types.js";
import { vaultPath } from "./index.js";
import fs from "fs";
import path from "path";
import { z } from "zod";

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
          text: `Files in vault:\n${filenames.join("\n")}`,
        },
      ],
    };
  },
};

export function getAllFilenames(
  dirPath: string,
  basePath: string = dirPath
): string[] {
  let filenames: string[] = [];

  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    if (item.name.startsWith(".")) {
      continue;
    }

    const itemPath = path.join(dirPath, item.name);
    const relativePath = path.relative(basePath, itemPath);

    if (item.isDirectory()) {
      filenames = filenames.concat(getAllFilenames(itemPath, basePath));
    } else if (item.isFile()) {
      filenames.push(relativePath);
    }
  }

  return filenames;
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

    const { filenames } = args;

    if (!filenames || filenames.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No filenames provided. Please provide at least one filename.",
          },
        ],
      };
    }

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
  const results: string[] = [];

  const fileMap = new Map<string, string>();
  allFiles.forEach((file) => {
    fileMap.set(file.toLowerCase(), file);
  });

  for (const targetName of targetFilenames) {
    let found = false;

    if (allFiles.includes(targetName)) {
      const content = fs.readFileSync(path.join(rootPath, targetName), "utf8");
      results.push(`# File: ${targetName}\n\n${content}`);
      found = true;
    } else if (fileMap.has(targetName.toLowerCase())) {
      const actualFilename = fileMap.get(targetName.toLowerCase())!;
      const content = fs.readFileSync(
        path.join(rootPath, actualFilename),
        "utf8"
      );
      results.push(`# File: ${actualFilename}\n\n${content}`);
      found = true;
    } else {
      const matchingFiles = allFiles.filter((file) =>
        path.basename(file).toLowerCase().includes(targetName.toLowerCase())
      );

      if (matchingFiles.length > 0) {
        for (const matchedFile of matchingFiles) {
          const content = fs.readFileSync(
            path.join(rootPath, matchedFile),
            "utf8"
          );
          results.push(`# File: ${matchedFile}\n\n${content}`);
          found = true;
        }
      }
    }

    if (!found) {
      results.push(`# File: ${targetName}\n\nFile not found in vault.`);
    }
  }

  return results;
}

export const readTools = [getAllFilenamesTool, readFiles];
