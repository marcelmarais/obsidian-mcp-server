import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { searchVault, createSearchTools } from "../search.js";

let tmpDir: string;

function write(relPath: string, content: string) {
  const full = path.join(tmpDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

describe("searchVault", () => {
  it("returns empty array when vault has no files", () => {
    expect(searchVault(tmpDir, "anything")).toEqual([]);
  });

  it("returns empty array when query has no matches", () => {
    write("note.md", "hello world");
    expect(searchVault(tmpDir, "zzznomatch")).toEqual([]);
  });

  it("finds a match in a single file", () => {
    write("note.md", "line one\nfind me\nline three");
    const results = searchVault(tmpDir, "find me");
    expect(results).toHaveLength(1);
    expect(results[0].file).toBe("note.md");
    expect(results[0].line).toBe(2);
    expect(results[0].text).toBe("find me");
  });

  it("finds matches across multiple files", () => {
    write("a.md", "target word here");
    write("b.md", "another target line");
    const results = searchVault(tmpDir, "target");
    expect(results).toHaveLength(2);
  });

  it("is case-insensitive by default", () => {
    write("note.md", "Hello World");
    const results = searchVault(tmpDir, "hello world");
    expect(results).toHaveLength(1);
  });

  it("respects case-sensitive flag", () => {
    write("note.md", "Hello World\nhello world");
    const sensitive = searchVault(tmpDir, "Hello World", true);
    expect(sensitive).toHaveLength(1);
    expect(sensitive[0].line).toBe(1);
  });

  it("returns correct line numbers", () => {
    write("note.md", "alpha\nbeta\ngamma\nbeta again");
    const results = searchVault(tmpDir, "beta");
    expect(results.map((r) => r.line)).toEqual([2, 4]);
  });
});

describe("createSearchTools", () => {
  it("returns one tool named searchNotes", () => {
    const tools = createSearchTools(tmpDir);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("searchNotes");
  });

  it("returns no-match message when nothing found", () => {
    const tool = createSearchTools(tmpDir)[0];
    const result = tool.handler({ query: "ghost" }, {} as any);
    expect(result.content[0].text).toContain('No matches found for "ghost"');
  });

  it("returns formatted matches when found", () => {
    write("note.md", "important idea here");
    const tool = createSearchTools(tmpDir)[0];
    const result = tool.handler({ query: "important" }, {} as any);
    expect(result.content[0].text).toContain("note.md:1:");
    expect(result.content[0].text).toContain("1 matches");
  });

  it("passes caseSensitive flag through", () => {
    write("note.md", "Hello\nhello");
    const tool = createSearchTools(tmpDir)[0];
    const sensitive = tool.handler({ query: "Hello", caseSensitive: true }, {} as any);
    expect(sensitive.content[0].text).toContain("1 matches");
  });

  it("defaults to case-insensitive when caseSensitive is undefined", () => {
    write("note.md", "Hello\nhello");
    const tool = createSearchTools(tmpDir)[0];
    const result = tool.handler({ query: "hello" }, {} as any);
    expect(result.content[0].text).toContain("2 matches");
  });
});
