import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getAllFilenames, readFilesByName, findOpenTodos, createReadTools } from "../read.js";

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

describe("getAllFilenames", () => {
  it("returns empty array for empty vault", () => {
    expect(getAllFilenames(tmpDir)).toEqual([]);
  });

  it("returns filenames sorted by modification time, newest first", () => {
    write("old.md", "old");
    write("new.md", "new");
    const past = new Date(Date.now() - 10000);
    fs.utimesSync(path.join(tmpDir, "old.md"), past, past);
    const files = getAllFilenames(tmpDir);
    expect(files[0]).toBe("new.md");
    expect(files[1]).toBe("old.md");
  });

  it("includes files in subdirectories", () => {
    write("folder/note.md", "content");
    const files = getAllFilenames(tmpDir);
    expect(files).toContain("folder/note.md");
  });

  it("excludes dot files and directories", () => {
    write(".obsidian/config.json", "{}");
    write("visible.md", "content");
    const files = getAllFilenames(tmpDir);
    expect(files).not.toContain(".obsidian/config.json");
    expect(files).toContain("visible.md");
  });
});

describe("readFilesByName", () => {
  beforeEach(() => {
    write("Notes/Project.md", "project content");
    write("daily.md", "daily content");
  });

  it("finds file by exact path", () => {
    const result = readFilesByName(tmpDir, ["Notes/Project.md"]);
    expect(result[0]).toContain("project content");
  });

  it("finds file by case-insensitive exact name", () => {
    const result = readFilesByName(tmpDir, ["notes/project.md"]);
    expect(result[0]).toContain("project content");
  });

  it("finds file by partial filename match", () => {
    const result = readFilesByName(tmpDir, ["proj"]);
    expect(result[0]).toContain("project content");
  });

  it("returns not-found message when no match", () => {
    const result = readFilesByName(tmpDir, ["nonexistent"]);
    expect(result[0]).toContain("File not found in vault.");
  });

  it("returns multiple files matching a partial name", () => {
    write("project-a.md", "a");
    write("project-b.md", "b");
    const result = readFilesByName(tmpDir, ["project-"]);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("prefixes each result with file header", () => {
    const result = readFilesByName(tmpDir, ["daily.md"]);
    expect(result[0]).toMatch(/^# File: daily\.md/);
  });
});

describe("findOpenTodos", () => {
  it("returns empty array when no todos exist", () => {
    write("note.md", "# Heading\nsome text");
    expect(findOpenTodos(tmpDir)).toEqual([]);
  });

  it("returns open todo items with file location", () => {
    write("tasks.md", "- [ ] buy milk\n- [x] done task");
    const todos = findOpenTodos(tmpDir);
    expect(todos).toHaveLength(1);
    expect(todos[0]).toContain("buy milk");
    expect(todos[0]).toContain("tasks.md");
  });

  it("ignores completed todos", () => {
    write("tasks.md", "- [x] already done");
    expect(findOpenTodos(tmpDir)).toEqual([]);
  });

  it("collects todos across multiple files", () => {
    write("a.md", "- [ ] task a");
    write("b.md", "- [ ] task b");
    const todos = findOpenTodos(tmpDir);
    expect(todos).toHaveLength(2);
  });
});

describe("createReadTools", () => {
  it("returns three tools", () => {
    const tools = createReadTools(tmpDir);
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name)).toEqual([
      "getAllFilenames",
      "readMultipleFiles",
      "getOpenTodos",
    ]);
  });

  it("getAllFilenames handler returns filenames text", () => {
    write("note.md", "hello");
    const tool = createReadTools(tmpDir).find((t) => t.name === "getAllFilenames")!;
    const result = tool.handler({}, {} as any);
    expect(result.content[0].text).toContain("note.md");
  });

  it("readMultipleFiles handler returns no-match message for empty filenames array", () => {
    const tool = createReadTools(tmpDir).find((t) => t.name === "readMultipleFiles")!;
    const result = tool.handler({ filenames: [] }, {} as any);
    expect(result.content[0].text).toBe("No matching files found in the vault.");
  });

  it("readMultipleFiles handler returns not-found message for unknown file", () => {
    const tool = createReadTools(tmpDir).find((t) => t.name === "readMultipleFiles")!;
    const result = tool.handler({ filenames: ["ghost.md"] }, {} as any);
    expect(result.content[0].text).toContain("File not found");
  });

  it("readMultipleFiles handler returns file contents", () => {
    write("note.md", "hello world");
    const tool = createReadTools(tmpDir).find((t) => t.name === "readMultipleFiles")!;
    const result = tool.handler({ filenames: ["note.md"] }, {} as any);
    expect(result.content[0].text).toContain("hello world");
  });

  it("getOpenTodos handler returns no-todos message when vault is empty", () => {
    const tool = createReadTools(tmpDir).find((t) => t.name === "getOpenTodos")!;
    const result = tool.handler({}, {} as any);
    expect(result.content[0].text).toBe("No open TODOs found in the vault.");
  });

  it("getOpenTodos handler returns todos when present", () => {
    write("tasks.md", "- [ ] fix bug");
    const tool = createReadTools(tmpDir).find((t) => t.name === "getOpenTodos")!;
    const result = tool.handler({}, {} as any);
    expect(result.content[0].text).toContain("fix bug");
  });
});
