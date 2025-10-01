import resize from '@jsquash/resize'
import { rgbaToThumbHash } from 'thumbhash'

const MAX_THUMB_DIMENSION = 50

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

const scaleDown = async (image: ImageData): Promise<ImageData> => {
  if (image.width <= MAX_THUMB_DIMENSION && image.height <= MAX_THUMB_DIMENSION) {
    return image
  }

  const scale = Math.max(image.width, image.height) / MAX_THUMB_DIMENSION
  const targetWidth = Math.max(1, Math.round(image.width / scale))
  const targetHeight = Math.max(1, Math.round(image.height / scale))

  return resize(image, { width: targetWidth, height: targetHeight, fitMethod: 'stretch', method: 'triangle' })
}

export const generateThumbHash = async (image: ImageData): Promise<string> => {
  const source = await scaleDown(image)
  const hash = rgbaToThumbHash(source.width, source.height, source.data)
  return toBase64(hash)
}
