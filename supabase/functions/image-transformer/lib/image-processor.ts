import type { ImageFormat } from "@/lib/detect-format.ts";
import {
  ensureResizeReady,
  getCodecHandlers,
  resize,
} from "@/lib/codec-init.ts";

export async function decodeImage(
  data: ArrayBuffer,
  format: ImageFormat,
): Promise<ImageData> {
  const codec = await getCodecHandlers(format);
  return await codec.decode(data);
}

export async function encodeImage(
  image: ImageData,
  format: ImageFormat,
): Promise<ArrayBuffer> {
  const codec = await getCodecHandlers(format);
  return await codec.encode(image);
}

const ASPECT_TOLERANCE = 0.01;

const getAspectRatio = (width: number, height: number) => width / height;

const shouldCropToMatchAspect = (
  source: ImageData,
  targetWidth: number,
  targetHeight: number,
) => {
  const sourceAspect = getAspectRatio(source.width, source.height);
  const targetAspect = getAspectRatio(targetWidth, targetHeight);

  if (!Number.isFinite(sourceAspect) || !Number.isFinite(targetAspect)) {
    return false;
  }

  const relativeDifference = Math.abs(sourceAspect - targetAspect) / sourceAspect;

  if (relativeDifference <= ASPECT_TOLERANCE) {
    return false;
  }

  if (targetAspect > sourceAspect) {
    const cropHeight = source.width / targetAspect;
    return cropHeight >= 1;
  }

  const cropWidth = source.height * targetAspect;
  return cropWidth >= 1;
};

export async function resizeImage(
  image: ImageData,
  width: number,
  height: number,
): Promise<ImageData> {
  if (width <= 0 || height <= 0) {
    throw new Error("Target dimensions must be greater than zero.");
  }

  if (image.width === width && image.height === height) {
    return image;
  }

  const fitMethod = shouldCropToMatchAspect(image, width, height)
    ? "contain"
    : "stretch";

  await ensureResizeReady();
  return await resize(image, {
    width,
    height,
    fitMethod,
    method: "triangle",
  });
}
