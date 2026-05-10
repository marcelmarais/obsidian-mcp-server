import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { tool } from "./types.js";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { glob } from "glob";

export type SearchMatch = {
  file: string;
  line: number;
  text: string;
};

export function searchVault(
  vaultPath: string,
  query: string,
  caseSensitive: boolean = false
): SearchMatch[] {
  const mdFiles = glob.sync("**/*.md", {
    cwd: vaultPath,
    nodir: true,
    dot: false,
  });

  const matches: SearchMatch[] = [];

  mdFiles.forEach((filePath) => {
    const content = fs.readFileSync(path.join(vaultPath, filePath), "utf8");
    content.split("\n").forEach((lineText, index) => {
      const haystack = caseSensitive ? lineText : lineText.toLowerCase();
      const needle = caseSensitive ? query : query.toLowerCase();
      if (haystack.includes(needle)) {
        matches.push({ file: filePath, line: index + 1, text: lineText.trim() });
      }
    });
  });

  return matches;
}

export function createSearchTools(vaultPath: string): tool<any>[] {
  const searchNotesTool: tool<{
    query: z.ZodString;
    caseSensitive: z.ZodOptional<z.ZodBoolean>;
  }> = {
    name: "searchNotes",
    description:
      "Searches the full text of all markdown files in the Obsidian vault for a query string. Returns matching lines with their file path and line number. Case-insensitive by default (set caseSensitive: true to override). Use this to find notes about a topic without knowing the filename.",
    schema: {
      query: z.string().describe("Text to search for across all notes"),
      caseSensitive: z
        .boolean()
        .optional()
        .describe("Whether the search is case-sensitive (default: false)"),
    },
    handler: (args, _extra: RequestHandlerExtra<any, any>) => {
      const matches = searchVault(vaultPath, args.query, args.caseSensitive ?? false);
      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No matches found for "${args.query}".`,
            },
          ],
        };
      }
      const formatted = matches
        .map((m) => `${m.file}:${m.line}: ${m.text}`)
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text: `# Search results for "${args.query}" (${matches.length} matches)\n\n${formatted}`,
          },
        ],
      };
    },
  };

  return [searchNotesTool];
}
