import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

/**
 * Metadata stored for each uploaded file
 */
export interface StateFileEntry {
  polarFileId: string;
  checksum: string;
  localPath: string;
}

/**
 * Mapping of content ID → file references
 */
export interface ContentStateEntry {
  contentUrl: string;
  files: string[];
}

export interface StateFile {
  files: Record<string, StateFileEntry>;
  contents: Record<string, ContentStateEntry>;
}

const STATE_DIR = "mona-kiosk";
const STATE_FILE = "state.json";

function createEmptyState(): StateFile {
  return {
    files: {},
    contents: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Normalise a file path for use as a state key.
 * Prefers the path relative to the current working directory so state remains portable.
 */
export function normalizeFileKey(
  filePath: string,
  options?: { baseDir?: string },
): string {
  const absolutePath = resolve(filePath);
  const baseDir = options?.baseDir ? resolve(options.baseDir) : process.cwd();
  const relativePath = relative(baseDir, absolutePath);
  const useRelative =
    relativePath && !relativePath.startsWith("..") ? relativePath : absolutePath;
  return useRelative.replace(/\\/g, "/");
}

function ensureContentEntry(
  state: StateFile,
  contentId: string,
  contentUrl: string,
): ContentStateEntry {
  if (!state.contents[contentId]) {
    state.contents[contentId] = {
      contentUrl,
      files: [],
    };
  } else {
    state.contents[contentId].contentUrl = contentUrl;
  }

  return state.contents[contentId];
}

function parseFileEntries(
  value: unknown,
): Record<string, StateFileEntry> {
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

function importCurrentState(record: Record<string, unknown>): StateFile {
  const files = parseFileEntries(record.files);
  const contents: Record<string, ContentStateEntry> = {};

  const source =
    isRecord(record.contents) && Object.keys(record.contents).length > 0
      ? (record.contents as Record<string, unknown>)
      : record;

  for (const [key, rawValue] of Object.entries(source)) {
    if (key === "files") {
      continue;
    }

    if (!isRecord(rawValue)) {
      continue;
    }

    const contentUrl =
      typeof rawValue.contentUrl === "string" ? rawValue.contentUrl : "";
    const filesArray = Array.isArray(rawValue.files)
      ? rawValue.files.filter((item): item is string => typeof item === "string")
      : [];

    if (contentUrl || filesArray.length > 0) {
      contents[key] = {
        contentUrl,
        files: filesArray,
      };
    }
  }

  return {
    files,
    contents,
  };
}

function normaliseState(raw: unknown): StateFile {
  if (!isRecord(raw)) {
    return createEmptyState();
  }

  return importCurrentState(raw);
}

function serialiseState(state: StateFile): Record<string, unknown> {
  const entries: Record<string, unknown> = {
    files: state.files,
  };

  for (const [contentId, entry] of Object.entries(state.contents)) {
    entries[contentId] = {
      contentUrl: entry.contentUrl,
      files: entry.files,
    };
  }

  return entries;
}

/**
 * Get the path to the state file
 */
export function getStateFilePath(cwd: string = process.cwd()): string {
  return resolve(cwd, STATE_DIR, STATE_FILE);
}

/**
 * Read state file from disk
 * Returns empty object if file doesn't exist
 */
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

/**
 * Write state file to disk
 * Creates directory if it doesn't exist
 */
export async function writeStateFile(
  state: StateFile,
  cwd?: string,
): Promise<void> {
  const filePath = getStateFilePath(cwd);
  const dir = dirname(filePath);

  // Ensure directory exists
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

/**
 * Get cached file IDs for a content
 */
export function getCachedFileIds(
  state: StateFile,
  contentId: string,
): string[] {
  const entry = state.contents[contentId];
  if (!entry) {
    return [];
  }

  const ids: string[] = [];
  for (const fileKey of entry.files) {
    const file = state.files[fileKey];
    if (file) {
      ids.push(file.polarFileId);
    }
  }

  return ids;
}

/**
 * Update state with new file upload
 */
export function updateFileInState(
  state: StateFile,
  contentId: string,
  contentUrl: string,
  fileKey: string,
  fileData: StateFileEntry,
): string {
  state.files[fileKey] = { ...fileData };
  ensureContentEntry(state, contentId, contentUrl);
  return fileKey;
}

/**
 * Ensure content entry references the provided file list
 */
export function setContentFilesInState(
  state: StateFile,
  contentId: string,
  contentUrl: string,
  fileKeys: string[],
): void {
  const entry = ensureContentEntry(state, contentId, contentUrl);
  const seen = new Set<string>();
  const orderedKeys: string[] = [];
  for (const key of fileKeys) {
    if (!seen.has(key)) {
      seen.add(key);
      orderedKeys.push(key);
    }
  }
  entry.files = orderedKeys;
}

/**
 * Remove content from state (cleanup)
 */
export function removeContentFromState(
  state: StateFile,
  contentId: string,
): void {
  delete state.contents[contentId];
}

/**
 * Get all content IDs with files in state
 */
export function getContentIdsWithFiles(state: StateFile): string[] {
  return Object.entries(state.contents)
    .filter(([, entry]) => entry.files.length > 0)
    .map(([contentId]) => contentId);
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
