import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { validateVaultPath, toErrorMessage } from "../utils.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

describe("validateVaultPath", () => {
  it("throws when no argument provided", () => {
    expect(() => validateVaultPath(undefined)).toThrow(
      "Vault path must be provided"
    );
  });

  it("throws when path does not exist", () => {
    expect(() => validateVaultPath("/nonexistent/path/xyz")).toThrow(
      "Invalid vault path"
    );
  });

  it("returns the path when it exists", () => {
    expect(validateVaultPath(tmpDir)).toBe(tmpDir);
  });
});

describe("toErrorMessage", () => {
  it("returns message property for Error instances", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns String() for non-Error values", () => {
    expect(toErrorMessage("raw string")).toBe("raw string");
    expect(toErrorMessage(42)).toBe("42");
  });
});
