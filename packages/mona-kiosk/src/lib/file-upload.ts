import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { getPolarClient } from "./polar-client";

interface UploadFileParams {
  filePath: string;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    zip: "application/zip",
    tar: "application/x-tar",
    gz: "application/gzip",
    "tar.gz": "application/gzip",
    tgz: "application/gzip",
    md: "text/markdown",
    txt: "text/plain",
    json: "application/json",
    xml: "application/xml",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

/**
 * Upload a file to Polar and return the file ID
 *
 * Process:
 * 1. Read file and calculate checksums
 * 2. Create file metadata in Polar → get presigned S3 URLs
 * 3. Upload file to S3 using presigned URLs
 * 4. Complete upload → file ready
 */
export async function uploadFileToPolar(
  params: UploadFileParams,
): Promise<string> {
  const { filePath } = params;
  const polar = getPolarClient();

  // Step 1: Read file and calculate metadata
  const fileBuffer = await readFile(filePath);
  const fileName = basename(filePath);
  const fileSize = fileBuffer.length;
  const mimeType = getMimeType(fileName);
  const checksumSha256 = createHash("sha256")
    .update(fileBuffer)
    .digest("base64");

  // Step 2: Create file metadata in Polar
  // Note: organizationId should NOT be passed when using an organization access token
  // The organization is already implicit in the token
  const fileCreate = await polar.files.create({
    name: fileName,
    mimeType: mimeType,
    size: fileSize,
    service: "downloadable",
    checksumSha256Base64: checksumSha256,
    upload: {
      parts: [
        {
          number: 1,
          chunkStart: 0,
          chunkEnd: fileSize,
          checksumSha256Base64: checksumSha256,
        },
      ],
    },
  });

  // Step 3: Upload to S3 using presigned URLs
  const uploadPart = fileCreate.upload.parts[0];
  const uploadHeaders = new Headers(uploadPart.headers ?? {});
  // S3 expects the checksum header to match the presigned request requirements
  if (!uploadHeaders.has("x-amz-checksum-sha256")) {
    uploadHeaders.set("x-amz-checksum-sha256", checksumSha256);
  }

  const uploadResponse = await fetch(uploadPart.url, {
    method: "PUT",
    headers: uploadHeaders,
    body: fileBuffer,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text().catch(() => null);
    const formattedBody = errorBody ? ` Response: ${errorBody}` : "";
    throw new Error(
      `Failed to upload file to S3: ${uploadResponse.status} ${uploadResponse.statusText}.${formattedBody}`,
    );
  }

  const etag = uploadResponse.headers.get("ETag")?.replace(/"/g, "");
  if (!etag) {
    throw new Error("No ETag returned from S3 upload");
  }

  // Step 4: Complete upload
  await polar.files.uploaded({
    id: fileCreate.id,
    fileUploadCompleted: {
      id: fileCreate.upload.id,
      path: fileCreate.upload.path,
      parts: [
        {
          number: uploadPart.number,
          checksumEtag: etag,
          checksumSha256Base64:
            uploadPart.checksumSha256Base64 ?? checksumSha256,
        },
      ],
    },
  });

  return fileCreate.id;
}
