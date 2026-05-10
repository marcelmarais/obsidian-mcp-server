import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { writeFile, appendFile, createWriteTools } from "../write.js";

let tmpDir: string;

function read(relPath: string): string {
  return fs.readFileSync(path.join(tmpDir, relPath), "utf8");
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

describe("writeFile", () => {
  it("creates a new file and returns false (did not exist)", () => {
    const existed = writeFile(tmpDir, "new.md", "hello");
    expect(existed).toBe(false);
    expect(read("new.md")).toBe("hello");
  });

  it("overwrites an existing file and returns true (existed)", () => {
    fs.writeFileSync(path.join(tmpDir, "existing.md"), "old content", "utf8");
    const existed = writeFile(tmpDir, "existing.md", "new content");
    expect(existed).toBe(true);
    expect(read("existing.md")).toBe("new content");
  });

  it("creates nested directories as needed", () => {
    writeFile(tmpDir, "folder/sub/note.md", "nested");
    expect(read("folder/sub/note.md")).toBe("nested");
  });
});

describe("appendFile", () => {
  it("creates file when it does not exist and returns false", () => {
    const existed = appendFile(tmpDir, "new.md", "first line\n");
    expect(existed).toBe(false);
    expect(read("new.md")).toBe("first line\n");
  });

  it("appends to existing file and returns true", () => {
    fs.writeFileSync(path.join(tmpDir, "note.md"), "line1\n", "utf8");
    const existed = appendFile(tmpDir, "note.md", "line2\n");
    expect(existed).toBe(true);
    expect(read("note.md")).toBe("line1\nline2\n");
  });

  it("creates nested directories when appending to new nested path", () => {
    appendFile(tmpDir, "folder/note.md", "content");
    expect(read("folder/note.md")).toBe("content");
  });
});

describe("createWriteTools", () => {
  it("returns two tools", () => {
    const tools = createWriteTools(tmpDir);
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toEqual(["updateFileContent", "appendToFile"]);
  });

  describe("updateFileContent handler", () => {
    it("reports creation of new file", () => {
      const tool = createWriteTools(tmpDir).find((t) => t.name === "updateFileContent")!;
      const result = tool.handler({ filePath: "new.md", content: "hi" }, {} as any);
      expect(result.content[0].text).toContain("created new file");
    });

    it("reports update of existing file", () => {
      fs.writeFileSync(path.join(tmpDir, "existing.md"), "old", "utf8");
      const tool = createWriteTools(tmpDir).find((t) => t.name === "updateFileContent")!;
      const result = tool.handler({ filePath: "existing.md", content: "new" }, {} as any);
      expect(result.content[0].text).toContain("updated existing file");
    });

    it("returns error message on write failure", () => {
      const tool = createWriteTools(tmpDir).find((t) => t.name === "updateFileContent")!;
      // Pass a path that is actually a directory to force a write error
      fs.mkdirSync(path.join(tmpDir, "isdir.md"));
      const result = tool.handler({ filePath: "isdir.md", content: "hi" }, {} as any);
      expect(result.content[0].text).toContain("Error updating file");
    });
  });

  describe("appendToFile handler", () => {
    it("reports creation when file is new", () => {
      const tool = createWriteTools(tmpDir).find((t) => t.name === "appendToFile")!;
      const result = tool.handler({ filePath: "new.md", content: "hi" }, {} as any);
      expect(result.content[0].text).toContain("created and wrote new file");
    });

    it("reports append when file exists", () => {
      fs.writeFileSync(path.join(tmpDir, "note.md"), "existing\n", "utf8");
      const tool = createWriteTools(tmpDir).find((t) => t.name === "appendToFile")!;
      const result = tool.handler({ filePath: "note.md", content: "appended" }, {} as any);
      expect(result.content[0].text).toContain("appended to file");
    });

    it("returns error message on append failure", () => {
      const tool = createWriteTools(tmpDir).find((t) => t.name === "appendToFile")!;
      fs.mkdirSync(path.join(tmpDir, "isdir.md"));
      const result = tool.handler({ filePath: "isdir.md", content: "hi" }, {} as any);
      expect(result.content[0].text).toContain("Error appending to file");
    });
  });
});
