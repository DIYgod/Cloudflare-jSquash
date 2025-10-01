import "./image-data-polyfill.ts";
import type { ImageFormat } from "@/lib/detect-format.ts";

import decodeJpeg, {
  init as initJpegDecode,
} from "https://esm.sh/@jsquash/jpeg@1.6.0/decode?target=deno";
import encodeJpeg, {
  init as initJpegEncode,
} from "https://esm.sh/@jsquash/jpeg@1.6.0/encode?target=deno";
import decodePng, {
  init as initPngDecode,
} from "https://esm.sh/@jsquash/png@3.1.1/decode?target=deno";
import encodePng, {
  init as initPngEncode,
} from "https://esm.sh/@jsquash/png@3.1.1/encode?target=deno";
import decodeWebp, {
  init as initWebpDecode,
} from "https://esm.sh/@jsquash/webp@1.5.0/decode?target=deno";
import encodeWebp, {
  init as initWebpEncode,
} from "https://esm.sh/@jsquash/webp@1.5.0/encode?target=deno";
import decodeAvif, {
  init as initAvifDecode,
} from "https://esm.sh/@jsquash/avif@2.1.1/decode?target=deno";
import encodeAvif, {
  init as initAvifEncode,
} from "https://esm.sh/@jsquash/avif@2.1.1/encode?target=deno";
import resizeDefault, {
  initResize,
} from "https://esm.sh/@jsquash/resize@2.1.0?target=deno";
import { simd } from "https://esm.sh/wasm-feature-detect@1.8.0?target=deno";

const CDN_BASE = "https://cdn.jsdelivr.net/npm";

const VERSIONS = {
  jpeg: "1.6.0",
  png: "3.1.1",
  webp: "1.5.0",
  avif: "2.1.1",
  resize: "2.1.0",
};

const wasmModuleCache = new Map<string, Promise<WebAssembly.Module>>();

async function loadWasmModule(key: string, url: string): Promise<WebAssembly.Module> {
  let promise = wasmModuleCache.get(key);
  if (!promise) {
    promise = (async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch wasm module for ${key} (status ${response.status}).`);
      }
      const buffer = await response.arrayBuffer();
      return await WebAssembly.compile(buffer);
    })();
    wasmModuleCache.set(key, promise);
  }

  return promise;
}

const resizeInitKey = "resize-core";

export type CodecHandlers = {
  decode: (buffer: ArrayBuffer) => Promise<ImageData>;
  encode: (image: ImageData) => Promise<ArrayBuffer>;
};

interface CodecDescriptor {
  decode: (buffer: ArrayBuffer) => Promise<ImageData>;
  encode: (image: ImageData) => Promise<ArrayBuffer>;
  init(): Promise<void>;
}

const codecInitPromises = new Map<ImageFormat, Promise<void>>();

let webpEncodeUsesSimd: boolean | null = null;

const codecDescriptors: Record<ImageFormat, CodecDescriptor> = {
  jpeg: {
    decode: decodeJpeg,
    encode: (image) => encodeJpeg(image),
    init: async () => {
      const [decodeModule, encodeModule] = await Promise.all([
        loadWasmModule(
          "jpeg-decode",
          `${CDN_BASE}/@jsquash/jpeg@${VERSIONS.jpeg}/codec/dec/mozjpeg_dec.wasm`,
        ),
        loadWasmModule(
          "jpeg-encode",
          `${CDN_BASE}/@jsquash/jpeg@${VERSIONS.jpeg}/codec/enc/mozjpeg_enc.wasm`,
        ),
      ]);

      await Promise.all([
        initJpegDecode(decodeModule),
        initJpegEncode(encodeModule),
      ]);
    },
  },
  png: {
    decode: decodePng,
    encode: (image) => encodePng(image),
    init: async () => {
      const module = await loadWasmModule(
        "png-codec",
        `${CDN_BASE}/@jsquash/png@${VERSIONS.png}/codec/pkg/squoosh_png_bg.wasm`,
      );

      await Promise.all([
        initPngDecode(module),
        initPngEncode(module),
      ]);
    },
  },
  webp: {
    decode: decodeWebp,
    encode: (image) => encodeWebp(image),
    init: async () => {
      const [decodeModule, hasSimd] = await Promise.all([
        loadWasmModule(
          "webp-decode",
          `${CDN_BASE}/@jsquash/webp@${VERSIONS.webp}/codec/dec/webp_dec.wasm`,
        ),
        simd(),
      ]);

      webpEncodeUsesSimd = hasSimd;

      const encodeModule = await loadWasmModule(
        hasSimd ? "webp-encode-simd" : "webp-encode",
        hasSimd
          ? `${CDN_BASE}/@jsquash/webp@${VERSIONS.webp}/codec/enc/webp_enc_simd.wasm`
          : `${CDN_BASE}/@jsquash/webp@${VERSIONS.webp}/codec/enc/webp_enc.wasm`,
      );

      await Promise.all([
        initWebpDecode(decodeModule),
        initWebpEncode(encodeModule),
      ]);
    },
  },
  avif: {
    decode: decodeAvif,
    encode: (image) => encodeAvif(image),
    init: async () => {
      const [decodeModule, encodeModule] = await Promise.all([
        loadWasmModule(
          "avif-decode",
          `${CDN_BASE}/@jsquash/avif@${VERSIONS.avif}/codec/dec/avif_dec.wasm`,
        ),
        loadWasmModule(
          "avif-encode",
          `${CDN_BASE}/@jsquash/avif@${VERSIONS.avif}/codec/enc/avif_enc.wasm`,
        ),
      ]);

      await Promise.all([
        initAvifDecode(decodeModule),
        initAvifEncode(encodeModule),
      ]);
    },
  },
};

async function ensureCodecInitialised(format: ImageFormat): Promise<void> {
  let promise = codecInitPromises.get(format);
  if (!promise) {
    promise = codecDescriptors[format].init();
    codecInitPromises.set(format, promise);
  }
  await promise;
}

let codecsReady: Promise<void> | null = null;

export function ensureCodecsInitialised(): Promise<void> {
  if (!codecsReady) {
    codecsReady = Promise.all(
      (Object.keys(codecDescriptors) as ImageFormat[]).map((format) =>
        ensureCodecInitialised(format)
      ),
    ).then(() => undefined);
  }

  return codecsReady;
}

export async function getCodecHandlers(format: ImageFormat): Promise<CodecHandlers> {
  await ensureCodecInitialised(format);
  const descriptor = codecDescriptors[format];
  return {
    decode: descriptor.decode,
    encode: descriptor.encode,
  };
}

let resizeReady: Promise<void> | undefined;

export function ensureResizeReady(): Promise<void> {
  if (!resizeReady) {
    resizeReady = (async () => {
      const module = await loadWasmModule(
        resizeInitKey,
        `${CDN_BASE}/@jsquash/resize@${VERSIONS.resize}/lib/resize/pkg/squoosh_resize_bg.wasm`,
      );
      await initResize(module);
    })();
  }

  return resizeReady;
}

export function doesWebpEncodeUseSimd(): boolean | null {
  return webpEncodeUsesSimd;
}

export const resize = resizeDefault;
