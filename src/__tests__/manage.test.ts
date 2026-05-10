import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { moveFile, deleteFile, createManageTools } from "../manage.js";

let tmpDir: string;

function write(relPath: string, content: string = "") {
  const full = path.join(tmpDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function exists(relPath: string): boolean {
  return fs.existsSync(path.join(tmpDir, relPath));
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

describe("moveFile", () => {
  it("moves a file to a new path", () => {
    write("source.md", "content");
    moveFile(tmpDir, "source.md", "dest.md");
    expect(exists("source.md")).toBe(false);
    expect(exists("dest.md")).toBe(true);
  });

  it("creates destination directories if missing", () => {
    write("note.md", "content");
    moveFile(tmpDir, "note.md", "folder/sub/note.md");
    expect(exists("folder/sub/note.md")).toBe(true);
  });

  it("throws when source file does not exist", () => {
    expect(() => moveFile(tmpDir, "ghost.md", "dest.md")).toThrow(
      "Source file not found"
    );
  });
});

describe("deleteFile", () => {
  it("deletes an existing .md file", () => {
    write("note.md");
    deleteFile(tmpDir, "note.md");
    expect(exists("note.md")).toBe(false);
  });

  it("throws when file does not exist", () => {
    expect(() => deleteFile(tmpDir, "ghost.md")).toThrow("File not found");
  });

  it("throws for non-.md files", () => {
    expect(() => deleteFile(tmpDir, "image.png")).toThrow(
      "Only .md files can be deleted"
    );
  });
});

describe("createManageTools", () => {
  it("returns two tools", () => {
    const tools = createManageTools(tmpDir);
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toEqual(["moveFile", "deleteFile"]);
  });

  describe("moveFile handler", () => {
    it("returns success message on move", () => {
      write("a.md", "content");
      const tool = createManageTools(tmpDir).find((t) => t.name === "moveFile")!;
      const result = tool.handler({ sourcePath: "a.md", destinationPath: "b.md" }, {} as any);
      expect(result.content[0].text).toContain("Successfully moved");
      expect(result.content[0].text).toContain("a.md → b.md");
    });

    it("returns error message when source missing", () => {
      const tool = createManageTools(tmpDir).find((t) => t.name === "moveFile")!;
      const result = tool.handler({ sourcePath: "ghost.md", destinationPath: "b.md" }, {} as any);
      expect(result.content[0].text).toContain("Error moving file");
    });
  });

  describe("deleteFile handler", () => {
    it("returns success message on delete", () => {
      write("note.md");
      const tool = createManageTools(tmpDir).find((t) => t.name === "deleteFile")!;
      const result = tool.handler({ filePath: "note.md" }, {} as any);
      expect(result.content[0].text).toContain("Successfully deleted");
    });

    it("returns error message when file missing", () => {
      const tool = createManageTools(tmpDir).find((t) => t.name === "deleteFile")!;
      const result = tool.handler({ filePath: "ghost.md" }, {} as any);
      expect(result.content[0].text).toContain("Error deleting file");
    });

    it("returns error message for non-.md file", () => {
      const tool = createManageTools(tmpDir).find((t) => t.name === "deleteFile")!;
      const result = tool.handler({ filePath: "image.png" }, {} as any);
      expect(result.content[0].text).toContain("Error deleting file");
    });
  });
});
