const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

type ImageRefererMatch = {
  url: RegExp
  referer: string
  force?: boolean
}

// Host-specific referer/origin overrides for providers that block direct hotlinks.
export const imageRefererMatches: ImageRefererMatch[] = [
  {
    url: /^https:\/\/\w+\.sinaimg\.cn/,
    referer: 'https://weibo.com'
  },
  {
    url: /^https:\/\/i\.pximg\.net/,
    referer: 'https://www.pixiv.net'
  },
  {
    url: /^https:\/\/cdnfile\.sspai\.com/,
    referer: 'https://sspai.com'
  },
  {
    url: /^https:\/\/(?:\w|-)+\.cdninstagram\.com/,
    referer: 'https://www.instagram.com'
  },
  {
    url: /^https:\/\/sp1\.piokok\.com/,
    referer: 'https://www.piokok.com',
    force: true
  },
  {
    url: /^https?:\/\/[\w-]+\.xhscdn\.com/,
    referer: 'https://www.xiaohongshu.com'
  }
]

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

export const fetchRemoteImage = async (imageUrl: string): Promise<RemoteImage> => {
  let parsed: URL
  try {
    parsed = new URL(imageUrl)
  } catch {
    throw new FetchImageError('Invalid image url')
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new FetchImageError('Only http and https protocols are supported')
  }

  const origin = parsed.origin
  const matchedReferer = imageRefererMatches.find(({ url }) => url.test(parsed.href))
  const resolvedReferer = matchedReferer?.referer ?? origin

  let resolvedOrigin = origin
  if (matchedReferer) {
    try {
      resolvedOrigin = new URL(resolvedReferer).origin
    } catch {
      resolvedOrigin = resolvedReferer
    }
  }

  const headers = new Headers({
    'User-Agent': DEFAULT_UA,
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    Referer: resolvedReferer,
    Origin: resolvedOrigin
  })

  const response = await fetch(parsed.toString(), {
    headers,
    redirect: 'follow'
  })

  if (!response.ok) {
    throw new FetchImageError(`Failed to fetch image: ${response.statusText}`, response.status)
  }

  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type')

  return { buffer, contentType }
}
