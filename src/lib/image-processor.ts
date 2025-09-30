import decodeJpeg from '@jsquash/jpeg/decode'
import encodeJpeg from '@jsquash/jpeg/encode'
import decodePng from '@jsquash/png/decode'
import encodePng from '@jsquash/png/encode'
import decodeWebp from '@jsquash/webp/decode'
import encodeWebp from '@jsquash/webp/encode'
import decodeAvif from '@jsquash/avif/decode'
import encodeAvif from '@jsquash/avif/encode'
import resize from '@jsquash/resize'

import type { ImageFormat } from './detect-format'

export const decodeImage = async (data: ArrayBuffer, format: ImageFormat): Promise<ImageData> => {
  switch (format) {
    case 'jpeg':
      return decodeJpeg(data)
    case 'png':
      return decodePng(data)
    case 'webp':
      return decodeWebp(data)
    case 'avif':
      return decodeAvif(data)
    default:
      throw new Error(`Unsupported image format: ${format}`)
  }
}

export const encodeImage = async (image: ImageData, format: ImageFormat): Promise<ArrayBuffer> => {
  switch (format) {
    case 'jpeg':
      return encodeJpeg(image)
    case 'png':
      return encodePng(image)
    case 'webp':
      return encodeWebp(image)
    case 'avif':
      return encodeAvif(image)
    default:
      throw new Error(`Unsupported image format: ${format}`)
  }
}

const ASPECT_TOLERANCE = 0.01

const getAspectRatio = (width: number, height: number) => width / height

const shouldCropToMatchAspect = (source: ImageData, targetWidth: number, targetHeight: number) => {
  const sourceAspect = getAspectRatio(source.width, source.height)
  const targetAspect = getAspectRatio(targetWidth, targetHeight)

  if (!Number.isFinite(sourceAspect) || !Number.isFinite(targetAspect)) {
    return false
  }

  const relativeDifference = Math.abs(sourceAspect - targetAspect) / sourceAspect

  if (relativeDifference <= ASPECT_TOLERANCE) {
    return false
  }

  if (targetAspect > sourceAspect) {
    const cropHeight = source.width / targetAspect
    return cropHeight >= 1
  }

  const cropWidth = source.height * targetAspect

  return cropWidth >= 1
}

export const resizeImage = async (image: ImageData, width: number, height: number) => {
  if (width <= 0 || height <= 0) {
    throw new Error('Target dimensions must be greater than zero')
  }

  if (image.width === width && image.height === height) {
    return image
  }

  const fitMethod = shouldCropToMatchAspect(image, width, height) ? 'contain' : 'stretch'

  return resize(image, { width, height, fitMethod, method: 'triangle' })
}
