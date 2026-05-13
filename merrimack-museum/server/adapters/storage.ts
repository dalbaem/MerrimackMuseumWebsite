import { DeleteObjectCommand, PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import type { ArtworkMutationInput } from "@/server/artworks/types";
import {
  type ArtworkMutationRequest,
  toArtworkMutationInput,
} from "@/server/artworks/schemas";
import { AppError } from "@/server/errors";

const ARTWORK_BUCKET_NAME = "merrimackartcollection";
const ARTWORK_BUCKET_REGION = "us-east-2";
const DEFAULT_CLOUDFRONT_BASE_URL = "https://d1pv6hg7024ex5.cloudfront.net";
function createS3Client() {
  const accessKeyId = process.env.AWS_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SECRET_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials are not configured");
  }

  return new S3({
    region: ARTWORK_BUCKET_REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}
function getCloudfrontBaseUrl() {
  return (
    process.env.AWS_CLOUDFRONT_BASE_URL || DEFAULT_CLOUDFRONT_BASE_URL
  ).replace(/\/$/, "");
}

function getManagedArtworkImageKey(imagePath: string | null | undefined) {
  const normalizedImagePath = imagePath?.trim();
  if (!normalizedImagePath) {
    return null;
  }

  const cloudfrontBaseUrl = getCloudfrontBaseUrl();

  try {
    const imageUrl = new URL(normalizedImagePath);
    const baseUrl = new URL(`${cloudfrontBaseUrl}/`);

    if (imageUrl.origin !== baseUrl.origin) {
      return null;
    }

    const basePath = baseUrl.pathname.endsWith("/")
      ? baseUrl.pathname
      : `${baseUrl.pathname}/`;

    if (!imageUrl.pathname.startsWith(basePath)) {
      return null;
    }

    const encodedObjectKey = imageUrl.pathname.slice(basePath.length);
    if (!encodedObjectKey) {
      return null;
    }

    return decodeURIComponent(encodedObjectKey);
  } catch {
    const managedPrefix = `${cloudfrontBaseUrl}/`;
    if (!normalizedImagePath.startsWith(managedPrefix)) {
      return null;
    }

    const objectKey = normalizedImagePath
      .slice(managedPrefix.length)
      .split(/[?#]/, 1)[0]
      .trim();

    return objectKey || null;
  }
}

function parseImageDataUrl(dataUrl: string) {
  const base64Data = dataUrl.split(",")[1];
  if (!base64Data) {
    throw new Error("Uploaded image is invalid");
  }

  const contentTypeMatch = dataUrl.match(/^data:(.*?);base64,/);

  return {
    body: Buffer.from(base64Data, "base64"),
    contentType: contentTypeMatch?.[1] || "application/octet-stream",
  };
}

async function uploadArtworkImage(input: {
  fileName: string;
  dataUrl: string;
}) {
  const { body, contentType } = parseImageDataUrl(input.dataUrl);
  const s3 = createS3Client();
  const objectKey = `${Date.now()}_${input.fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: ARTWORK_BUCKET_NAME,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `${getCloudfrontBaseUrl()}/${objectKey}`;
}

export async function deleteManagedArtworkImage(imagePath: string | null | undefined) {
  const objectKey = getManagedArtworkImageKey(imagePath);
  if (!objectKey) {
    return false;
  }

  const s3 = createS3Client();

  await s3.send(
    new DeleteObjectCommand({
      Bucket: ARTWORK_BUCKET_NAME,
      Key: objectKey,
    }),
  );

  return true;
}

function getArtworkUploadFailure(error: unknown) {
  const message = error instanceof Error ? error.message : null;

  if (message === "Uploaded image is invalid") {
    return { status: 400, error: message };
  }

  if (message === "AWS credentials are not configured") {
    return { status: 500, error: message };
  }

  return {
    status: 502,
    error: "Artwork image upload failed",
  };
}

export async function uploadArtworkImageFromFields(
  input: {
    uploadedFileName?: string | null;
    uploadedImage?: string | null;
  },
  options: { required: boolean },
) {
  const hasUploadedFileName = Boolean(input.uploadedFileName);
  const hasUploadedImage = Boolean(input.uploadedImage);

  if (hasUploadedFileName !== hasUploadedImage) {
    throw new AppError(
      400,
      "Artwork image upload must include both file name and image data",
    );
  }

  if (!hasUploadedFileName || !hasUploadedImage) {
    if (options.required) {
      throw new AppError(400, "Artwork image is required");
    }

    return undefined;
  }

  const uploadedFileName = input.uploadedFileName;
  const uploadedImage = input.uploadedImage;

  if (!uploadedFileName || !uploadedImage) {
    throw new AppError(
      400,
      "Artwork image upload must include both file name and image data",
    );
  }

  try {
    return await uploadArtworkImage({
      fileName: uploadedFileName,
      dataUrl: uploadedImage,
    });
  } catch (error) {
    const failure = getArtworkUploadFailure(error);
    throw new AppError(failure.status, failure.error);
  }
}

export async function resolveArtworkMutationInput(
  data: ArtworkMutationRequest,
  options: { requireImage: boolean },
): Promise<ArtworkMutationInput> {
  const imagePath = await uploadArtworkImageFromFields(data, {
    required: options.requireImage,
  });

  return toArtworkMutationInput(data, imagePath);
}
