import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

export interface StateFileEntry {
  polarFileId: string;
  checksum: string;
  localPath: string;
}

export interface StateFile {
  files: Record<string, StateFileEntry>;
}

const STATE_DIR = "mona-kiosk";
const STATE_FILE = "state.json";

function createEmptyState(): StateFile {
  return {
    files: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Normalise a file path for use as a state key.
 * Prefers repo-relative paths when possible to keep entries portable.
 */
export function normalizeFileKey(
  filePath: string,
  options?: { baseDir?: string },
): string {
  const absolutePath = resolve(filePath);
  const baseDir = options?.baseDir ? resolve(options.baseDir) : process.cwd();
  const relativePath = relative(baseDir, absolutePath);
  const useRelative =
    relativePath && !relativePath.startsWith("..")
      ? relativePath
      : absolutePath;
  return useRelative.replace(/\\/g, "/");
}

function parseFileEntries(value: unknown): Record<string, StateFileEntry> {
  if (!isRecord(value)) {
    return {};
  }

  const entries: Record<string, StateFileEntry> = {};

  for (const [key, rawEntry] of Object.entries(value)) {
    if (
      isRecord(rawEntry) &&
      typeof rawEntry.polarFileId === "string" &&
      typeof rawEntry.checksum === "string" &&
      typeof rawEntry.localPath === "string"
    ) {
      entries[key] = {
        polarFileId: rawEntry.polarFileId,
        checksum: rawEntry.checksum,
        localPath: rawEntry.localPath,
      };
    }
  }

  return entries;
}

function normaliseState(raw: unknown): StateFile {
  if (!isRecord(raw)) {
    return createEmptyState();
  }

  if ("files" in raw) {
    const files = parseFileEntries((raw as Record<string, unknown>).files);
    if (Object.keys(files).length > 0) {
      return { files };
    }
  }

  return {
    files: parseFileEntries(raw),
  };
}

function serialiseState(state: StateFile): Record<string, unknown> {
  return {
    files: state.files,
  };
}

export function getStateFilePath(cwd: string = process.cwd()): string {
  return resolve(cwd, STATE_DIR, STATE_FILE);
}

export async function readStateFile(cwd?: string): Promise<StateFile> {
  const filePath = getStateFilePath(cwd);

  if (!existsSync(filePath)) {
    return createEmptyState();
  }

  try {
    const content = await readFile(filePath, "utf-8");
    return normaliseState(JSON.parse(content));
  } catch (error) {
    console.warn(`⚠️ Failed to read state file: ${filePath}`, error);
    return createEmptyState();
  }
}

export async function writeStateFile(
  state: StateFile,
  cwd?: string,
): Promise<void> {
  const filePath = getStateFilePath(cwd);
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  try {
    await writeFile(
      filePath,
      JSON.stringify(serialiseState(state), null, 2),
      "utf-8",
    );
  } catch (error) {
    throw new Error(`Failed to write state file: ${filePath}`, {
      cause: error,
    });
  }
}

export function updateFileInState(
  state: StateFile,
  fileKey: string,
  fileData: StateFileEntry,
): string {
  state.files[fileKey] = { ...fileData };
  return fileKey;
}

export function findFileByChecksum(
  state: StateFile,
  checksum: string,
  excludeKey?: string,
): { key: string; entry: StateFileEntry } | null {
  for (const [key, entry] of Object.entries(state.files)) {
    if (excludeKey && key === excludeKey) {
      continue;
    }
    if (entry.checksum === checksum) {
      return { key, entry };
    }
  }
  return null;
}
