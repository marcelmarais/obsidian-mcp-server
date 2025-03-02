import { existsSync } from "fs";

export const validateVaultPath = (path: string | undefined): string => {
  if (!path) {
    throw new Error(
      "Vault path must be provided as a command line argument.\nUsage: <command> <vault_path>"
    );
  }

  if (!existsSync(path)) {
    throw new Error(
      `Invalid vault path: "${path}"\nPlease provide a path to an existing Obsidian vault`
    );
  }

  return path;
};
