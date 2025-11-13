import { POLAR_API_PAGE_SIZE } from "../constants.js";
import { getGlobalConfig } from "../integration/config.js";
import { getPolarClient } from "./polar-client.js";
import { findFirstListItem } from "./polar-finder.js";

/**
 * Get Polar API base URL based on server config
 */
function getPolarBaseUrl(): string {
  const config = getGlobalConfig();
  return config.polar.server === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";
}

export interface DownloadableFile {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  mimeType: string;
  downloadUrl: string;
}

/**
 * Customer Portal API response types
 */
interface CustomerPortalDownloadableFile {
  name: string;
  size: number;
  size_readable: string;
  mime_type: string;
  download: {
    url: string;
    expires_at: string;
  };
}

interface CustomerPortalDownloadableItem {
  id: string;
  benefit_id: string;
  file: CustomerPortalDownloadableFile;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
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
    const baseUrl = getPolarBaseUrl();

    const response = await fetch(
      `${baseUrl}/v1/customer-portal/downloadables/?benefit_id=${benefit.id}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch downloadables from Customer Portal: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = await response.json();

    // Parse the response and extract download information
    const items: CustomerPortalDownloadableItem[] = data.items || [];

    return items.map((item) => {
      const file = item.file;
      return {
        id: item.id,
        name: file.name,
        size: file.size,
        sizeFormatted: file.size_readable || formatFileSize(file.size),
        mimeType: file.mime_type,
        downloadUrl: file.download.url,
      };
    });
  } catch (error) {
    console.error("Failed to get downloadable files:", error);
    return [];
  }
}
