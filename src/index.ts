import { Hono } from 'hono'

import { ensureCodecsInitialised } from './lib/codec-init'
import { detectImageFormat, formatToContentType } from './lib/detect-format'
import type { ImageFormat } from './lib/detect-format'
import { resolveDimensions } from './lib/dimensions'
import { FetchImageError, fetchRemoteImage } from './lib/image-fetcher'
import { decodeImage, encodeImage, resizeImage } from './lib/image-processor'
import { generateThumbHash } from './lib/thumbhash'

const app = new Hono()

const parseDimensionParam = (value: string | undefined | null): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined
  }
  return parsed
}

const ensureSupportedFormat = (buffer: ArrayBuffer, contentType: string | null): ImageFormat => {
  const format = detectImageFormat(new Uint8Array(buffer), contentType)
  if (!format) {
    throw new Error('Unsupported or unrecognised image format')
  }
  return format
}

const parseTargetFormatParam = (value: string | undefined | null): ImageFormat | null => {
  if (!value) {
    return null
  }
  const normalised = value.trim().toLowerCase()
  switch (normalised) {
    case 'jpeg':
    case 'jpg':
      return 'jpeg'
    case 'png':
      return 'png'
    case 'webp':
      return 'webp'
    case 'avif':
      return 'avif'
    default:
      return null
  }
}

app.get('/', async (c) => {
  const url = c.req.query('url')
  if (!url) {
    return c.json({ error: 'Missing url parameter' }, 400)
  }

  const widthParam = parseDimensionParam(c.req.query('width'))
  const heightParam = parseDimensionParam(c.req.query('height'))

  let remote
  try {
    remote = await fetchRemoteImage(url)
  } catch (error) {
    if (error instanceof FetchImageError) {
      return c.json({ error: error.message }, error.status ?? 502)
    }
    console.error(error)
    return c.json({ error: 'Unexpected error fetching image' }, 502)
  }

  try {
    await ensureCodecsInitialised()
  } catch (error) {
    console.error('Failed to initialise codecs', error)
    return c.json({ error: 'Failed to prepare image codecs' }, 500)
  }

  let sourceFormat: ImageFormat
  try {
    sourceFormat = ensureSupportedFormat(remote.buffer, remote.contentType)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unsupported image format' }, 415)
  }

  let decoded: ImageData
  try {
    decoded = await decodeImage(remote.buffer, sourceFormat)
  } catch (error) {
    console.error('Failed to decode image', error)
    return c.json({ error: 'Failed to decode source image' }, 422)
  }

  let targetWidth: number
  let targetHeight: number
  try {
    const target = resolveDimensions(
      { width: decoded.width, height: decoded.height },
      { width: widthParam, height: heightParam }
    )
    targetWidth = target.width
    targetHeight = target.height
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Invalid resize parameters' }, 400)
  }

  let resized = decoded
  try {
    resized = await resizeImage(decoded, targetWidth, targetHeight)
  } catch (error) {
    console.error('Failed to resize image', error)
    return c.json({ error: 'Unable to resize image with the given parameters' }, 422)
  }

  const formatParam = c.req.query('format')
  const requestedTargetFormat = parseTargetFormatParam(formatParam)
  if (formatParam && !requestedTargetFormat) {
    return c.json({ error: 'Unsupported output format requested' }, 400)
  }
  const targetFormat: ImageFormat = requestedTargetFormat ?? 'webp'

  let encoded: ArrayBuffer
  try {
    encoded = await encodeImage(resized, targetFormat)
  } catch (error) {
    console.error('Failed to encode image', error)
    return c.json({ error: 'Failed to encode resized image' }, 500)
  }

  const headers = new Headers({
    'Content-Type': formatToContentType(targetFormat),
    'Cache-Control': 'public, max-age=31536000'
  })
  headers.set('Content-Length', encoded.byteLength.toString())

  return new Response(encoded, { status: 200, headers })
})

app.get('/meta/', async (c) => {
  const url = c.req.query('url')
  if (!url) {
    return c.json({ error: 'Missing url parameter' }, 400)
  }

  let remote
  try {
    remote = await fetchRemoteImage(url)
  } catch (error) {
    if (error instanceof FetchImageError) {
      return c.json({ error: error.message }, error.status ?? 502)
    }
    console.error(error)
    return c.json({ error: 'Unexpected error fetching image' }, 502)
  }

  try {
    await ensureCodecsInitialised()
  } catch (error) {
    console.error('Failed to initialise codecs', error)
    return c.json({ error: 'Failed to prepare image codecs' }, 500)
  }

  let format: ImageFormat
  try {
    format = ensureSupportedFormat(remote.buffer, remote.contentType)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unsupported image format' }, 415)
  }

  let decoded: ImageData
  try {
    decoded = await decodeImage(remote.buffer, format)
  } catch (error) {
    console.error('Failed to decode image', error)
    return c.json({ error: 'Failed to decode source image' }, 422)
  }

  let thumbHash: string
  try {
    thumbHash = await generateThumbHash(decoded)
  } catch (error) {
    console.error('Failed to generate thumbhash', error)
    return c.json({ error: 'Unable to generate thumbhash' }, 500)
  }

  c.header('Cache-Control', 'public, max-age=31536000')
  return c.json({
    width: decoded.width,
    height: decoded.height,
    thumbHash
  })
})

export default app
