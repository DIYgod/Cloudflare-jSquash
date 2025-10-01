import { Hono } from 'hono'

import { FetchImageError, fetchRemoteImage } from './lib/image-fetcher'

const app = new Hono()

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade'
])

const createForwardHeaders = (upstream: Response): Headers => {
  const headers = new Headers()
  upstream.headers.forEach((value, key) => {
    if (hopByHopHeaders.has(key.toLowerCase())) {
      return
    }
    headers.append(key, value)
  })

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/octet-stream')
  }

  headers.set('Cache-Control', 'public, max-age=31536000')
  return headers
}

app.get('/', async (c) => {
  const url = c.req.query('url')
  if (!url) {
    return c.json({ error: 'Missing url parameter' }, 400)
  }

  try {
    const upstream = await fetchRemoteImage(url)
    const headers = createForwardHeaders(upstream)
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers
    })
  } catch (error) {
    if (error instanceof FetchImageError) {
      return c.json({ error: error.message }, error.status ?? 502)
    }
    console.error('Unexpected error fetching image', error)
    return c.json({ error: 'Unexpected error fetching image' }, 502)
  }
})

export default app
