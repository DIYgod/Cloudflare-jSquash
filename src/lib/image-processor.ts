import decodeJpeg from '@jsquash/jpeg/decode'
import encodeJpeg from '@jsquash/jpeg/encode'
import decodePng from '@jsquash/png/decode'
import encodePng from '@jsquash/png/encode'
import decodeWebp from '@jsquash/webp/decode'
import encodeWebp from '@jsquash/webp/encode'
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
    default:
      throw new Error(`Unsupported image format: ${format}`)
  }
}

export const resizeImage = async (image: ImageData, width: number, height: number) => {
  if (width <= 0 || height <= 0) {
    throw new Error('Target dimensions must be greater than zero')
  }

  if (image.width === width && image.height === height) {
    return image
  }

  return resize(image, { width, height, fitMethod: 'stretch' })
}
