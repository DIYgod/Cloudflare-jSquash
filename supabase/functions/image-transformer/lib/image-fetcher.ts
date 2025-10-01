const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface ImageRefererMatch {
  url: RegExp;
  referer: string;
  force?: boolean;
}

const ACCEPT_HEADER = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";

export const imageRefererMatches: ImageRefererMatch[] = [
  {
    url: /^https:\/\/\w+\.sinaimg\.cn/,
    referer: "https://weibo.com",
  },
  {
    url: /^https:\/\/i\.pximg\.net/,
    referer: "https://www.pixiv.net",
  },
  {
    url: /^https:\/\/cdnfile\.sspai\.com/,
    referer: "https://sspai.com",
  },
  {
    url: /^https:\/\/(?:\w|-)+\.cdninstagram\.com/,
    referer: "https://www.instagram.com",
  },
  {
    url: /^https:\/\/sp1\.piokok\.com/,
    referer: "https://www.piokok.com",
    force: true,
  },
  {
    url: /^https?:\/\/[\w-]+\.xhscdn\.com/,
    referer: "https://www.xiaohongshu.com",
  },
];

export interface RemoteImage {
  buffer: ArrayBuffer;
  contentType: string | null;
}

export class FetchImageError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "FetchImageError";
    this.status = status;
  }
}

export async function fetchRemoteImage(imageUrl: string): Promise<RemoteImage> {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new FetchImageError("Invalid image url.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new FetchImageError("Only http and https protocols are supported.");
  }

  const origin = parsed.origin;
  const matchedReferer = imageRefererMatches.find(({ url }) => url.test(parsed.href));
  const resolvedReferer = matchedReferer?.referer ?? origin;

  let resolvedOrigin = origin;
  if (matchedReferer) {
    try {
      resolvedOrigin = new URL(resolvedReferer).origin;
    } catch {
      resolvedOrigin = resolvedReferer;
    }
  }

  const headers = new Headers({
    "User-Agent": DEFAULT_USER_AGENT,
    "Accept": ACCEPT_HEADER,
  });

  if (resolvedReferer) {
    headers.set("Referer", resolvedReferer);
  }

  if (resolvedOrigin && resolvedOrigin !== "null") {
    headers.set("Origin", resolvedOrigin);
  } else if (matchedReferer?.force && resolvedReferer) {
    headers.set("Origin", resolvedReferer);
  }

  const response = await fetch(parsed.toString(), {
    headers,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new FetchImageError(
      `Failed to fetch image: ${response.statusText}`,
      response.status,
    );
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type");

  return { buffer, contentType };
}
