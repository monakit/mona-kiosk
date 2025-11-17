import type { DownloadableRead } from "@polar-sh/sdk/models/components/downloadableread.js";
import { POLAR_API_PAGE_SIZE } from "../constants.js";
import { getGlobalConfig } from "../integration/config.js";
import { getPolarClient } from "./polar-client.js";
import { findFirstListItem } from "./polar-finder.js";

/**
 * Extended downloadable file with convenience fields and version tracking
 */
export interface DownloadableFile extends DownloadableRead {
  /**
   * Convenience field: direct download URL from file.download.url
   */
  downloadUrl: string;
  /**
   * Marks file as newest version when multiple versions exist
   */
  isNew?: boolean;
  /**
   * Marks file as older version when multiple versions exist
   */
  isLegacy?: boolean;
}

/**
 * Detect version badges for files
 * Marks files as "New" or "Legacy" based on Polar's version field and lastModifiedAt
 */
function detectVersions(files: DownloadableFile[]): DownloadableFile[] {
  // Group files by name to detect multiple versions
  const filesByName = new Map<string, DownloadableFile[]>();

  for (const file of files) {
    const group = filesByName.get(file.file.name) || [];
    group.push(file);
    filesByName.set(file.file.name, group);
  }

  // Mark new/legacy for files with multiple versions
  for (const group of filesByName.values()) {
    if (group.length > 1) {
      // Sort by lastModifiedAt (newest first)
      group.sort((a, b) => {
        const timeA = a.file.lastModifiedAt?.getTime() ?? 0;
        const timeB = b.file.lastModifiedAt?.getTime() ?? 0;
        return timeB - timeA;
      });

      group[0].isNew = true;
      for (let i = 1; i < group.length; i++) {
        group[i].isLegacy = true;
      }
    }
  }

  return files;
}

/**
 * Get downloadable files for a content ID using Customer Portal API
 * Returns the files that the authenticated customer can download
 */
export async function getDownloadableFiles(params: {
  contentId: string;
  customerToken?: string;
}): Promise<DownloadableFile[]> {
  const { contentId, customerToken } = params;

  if (!customerToken) {
    return [];
  }

  try {
    const globalConfig = getGlobalConfig();
    const polar = getPolarClient();

    // Find the downloadables benefit for this content
    const benefit = await findFirstListItem({
      list: (args) => polar.benefits.list(args),
      args: {
        organizationId: globalConfig.polar.organizationId,
        metadata: { content_id: contentId },
        limit: POLAR_API_PAGE_SIZE,
      },
      predicate: (item) => item.type === "downloadables",
    });

    if (!benefit) {
      return [];
    }

    // Use Customer Portal API to get downloadables with download URLs
    // This API returns files with signed S3 download URLs
    const response = await polar.customerPortal.downloadables.list(
      {
        customerSession: customerToken,
      },
      {
        benefitId: benefit.id,
        limit: 100,
      },
    );

    // Extract items from response and add convenience fields
    const files: DownloadableFile[] = response.result.items.map((item) => ({
      ...item,
      downloadUrl: item.file.download.url,
    }));

    // Detect new/legacy versions
    return detectVersions(files);
  } catch (error) {
    console.error("Failed to get downloadable files:", error);
    return [];
  }
}
