import { init as initJpegDecode } from '@jsquash/jpeg/decode'
import { init as initJpegEncode } from '@jsquash/jpeg/encode'
import { init as initPngDecode } from '@jsquash/png/decode'
import { init as initPngEncode } from '@jsquash/png/encode'
import { init as initWebpDecode } from '@jsquash/webp/decode'
import { init as initWebpEncode } from '@jsquash/webp/encode'
import { initResize } from '@jsquash/resize'
import { simd } from 'wasm-feature-detect'

import type { Bindings } from '../bindings'

let initPromise: Promise<void> | null = null
let webpUsesSimd: boolean | null = null

const ensureEnvModule = (name: keyof Bindings, module: WebAssembly.Module | undefined) => {
  if (!module) {
    throw new Error(`Missing WASM binding for ${name}`)
  }
  return module
}

async function initialiseCodecs(env: Bindings) {
  const jpegDec = ensureEnvModule('JPEG_DEC_WASM', env.JPEG_DEC_WASM)
  const jpegEnc = ensureEnvModule('JPEG_ENC_WASM', env.JPEG_ENC_WASM)
  const png = ensureEnvModule('PNG_WASM', env.PNG_WASM)
  const webpDec = ensureEnvModule('WEBP_DEC_WASM', env.WEBP_DEC_WASM)
  const webpEnc = ensureEnvModule('WEBP_ENC_WASM', env.WEBP_ENC_WASM)
  const webpEncSimd = ensureEnvModule('WEBP_ENC_SIMD_WASM', env.WEBP_ENC_SIMD_WASM)
  const resizeWasm = ensureEnvModule('RESIZE_WASM', env.RESIZE_WASM)

  await Promise.all([
    initJpegDecode(jpegDec),
    initJpegEncode(jpegEnc),
    initPngDecode(png),
    initPngEncode(png),
    initWebpDecode(webpDec),
    initResize(resizeWasm)
  ])

  webpUsesSimd = await simd()
  await initWebpEncode(webpUsesSimd ? webpEncSimd : webpEnc)
}

export const ensureCodecsInitialised = (env: Bindings) => {
  if (!initPromise) {
    initPromise = initialiseCodecs(env)
  }
  return initPromise
}

export const doesWebpEncodeUseSimd = () => webpUsesSimd
