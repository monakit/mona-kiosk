import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import matter from "gray-matter";
import { glob } from "tinyglobby";
import { getGlobalConfig } from "../integration/config.js";
import { pathToContentId } from "../lib/content-id.js";
import { uploadFileToPolar } from "../lib/file-upload.js";
import {
  findFileByChecksum,
  normalizeFileKey,
  readStateFile,
  updateFileInState,
  writeStateFile,
} from "../lib/state-manager.js";

interface PayableData {
  price?: number;
  downloads?: Array<{
    title: string;
    file: string;
    description?: string;
  }>;
  slug?: string;
}

/**
 * Calculate SHA256 checksum for a file
 */
async function calculateChecksum(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Upload downloadable files to Polar
 * Only uploads if file is new or checksum has changed
 */
export async function uploadDownloadables(): Promise<void> {
  console.log("🚀 Starting upload of downloadable files...\n");

  const config = getGlobalConfig();
  const state = await readStateFile();
  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalReused = 0;
  const baseDir = process.cwd();

  for (const collectionConfig of config.collections) {
    const pattern = collectionConfig.include;

    try {
      const files = await glob(pattern, {
        absolute: true,
        onlyFiles: true,
      });

      if (!files || files.length === 0) {
        console.warn(`  ⚠️ No files found for pattern: ${pattern}`);
        continue;
      }

      for (const filePath of files) {
        try {
          const content = await readFile(filePath, "utf-8");
          const { data } = matter(content);

          // Skip non-payable content
          if (typeof data.price !== "number") {
            continue;
          }

          const payableData = data as PayableData;

          // Generate content ID
          const canonicalId = pathToContentId({
            filePath,
            collection: collectionConfig.name,
            frontmatterSlug: payableData.slug,
          });

          const contentDir = dirname(filePath);

          // Skip if no downloads declared
          if (!payableData.downloads || payableData.downloads.length === 0) {
            continue;
          }

          console.log(`📄 Processing: ${canonicalId}`);

          // Process each download
          for (const download of payableData.downloads) {
            const absoluteFilePath = resolve(contentDir, download.file);
            const filename = download.title;
            const fileKey = normalizeFileKey(absoluteFilePath, {
              baseDir,
            });

            // Calculate current checksum
            const currentChecksum = await calculateChecksum(absoluteFilePath);

            // Check state
            const cachedFile = state.files[fileKey];

            if (cachedFile && cachedFile.checksum === currentChecksum) {
              console.log(`  ✓ Skipped (unchanged): ${filename}`);
              totalSkipped++;
              updateFileInState(state, fileKey, {
                ...cachedFile,
                localPath: download.file,
              });
              await writeStateFile(state);
              continue;
            }

            const duplicate = findFileByChecksum(
              state,
              currentChecksum,
              fileKey,
            );
            if (duplicate) {
              console.log(
                `  ♻️ Reusing existing upload (${filename}) from ${duplicate.key}`,
              );
              updateFileInState(state, fileKey, {
                ...duplicate.entry,
                localPath: download.file,
              });
              totalReused++;
              await writeStateFile(state);
              continue;
            }

            // Upload to Polar
            console.log(`  📦 Uploading: ${filename}...`);
            const fileId = await uploadFileToPolar({
              filePath: absoluteFilePath,
            });

            // Update state
            updateFileInState(state, fileKey, {
              polarFileId: fileId,
              checksum: currentChecksum,
              localPath: download.file,
            });
            await writeStateFile(state);

            console.log(`  ✅ Uploaded: ${filename} → ${fileId}`);
            totalUploaded++;
          }
        } catch (error) {
          console.error(`  ✗ Failed to process ${filePath}:`, error);
          throw error;
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to process pattern ${pattern}: ${(error as Error).message}`,
        { cause: error },
      );
    }
  }

  // Save state file
  await writeStateFile(state);

  console.log(
    `\n✅ Upload complete: ${totalUploaded} uploaded, ${totalSkipped} skipped, ${totalReused} reused`,
  );
}
