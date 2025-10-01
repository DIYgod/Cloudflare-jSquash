export type RemoteImage = {
  buffer: ArrayBuffer
  contentType: string | null
}

export class FetchImageError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'FetchImageError'
    this.status = status
  }
}

const buildProxyRequest = (imageUrl: string): Request => {
  const proxyUrl = new URL('/', 'https://image-proxy.internal')
  proxyUrl.searchParams.set('url', imageUrl)
  return new Request(proxyUrl.toString(), {
    method: 'GET'
  })
}

export const fetchRemoteImageThroughProxy = async (
  imageUrl: string,
  proxy: Fetcher
): Promise<RemoteImage> => {
  const request = buildProxyRequest(imageUrl)
  let response: Response
  try {
    response = await proxy.fetch(request)
  } catch {
    throw new FetchImageError('Failed to reach image proxy')
  }

  if (!response.ok) {
    let message = 'Failed to fetch image via proxy'
    try {
      const data = await response.clone().json()
      if (typeof data?.error === 'string' && data.error.length > 0) {
        message = data.error
      }
    } catch {
      // Ignore JSON parsing errors; we'll fall back to the default message.
    }
    throw new FetchImageError(message, response.status)
  }

  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type')

  return { buffer, contentType }
}
