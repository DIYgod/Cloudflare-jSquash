import { init as initJpegDecode } from '@jsquash/jpeg/decode'
import { init as initJpegEncode } from '@jsquash/jpeg/encode'
import { init as initPngDecode } from '@jsquash/png/decode'
import { init as initPngEncode } from '@jsquash/png/encode'
import { init as initWebpDecode } from '@jsquash/webp/decode'
import { init as initWebpEncode } from '@jsquash/webp/encode'
import { initResize } from '@jsquash/resize'
import { simd } from 'wasm-feature-detect'

import JPEG_DEC_WASM from '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm'
import JPEG_ENC_WASM from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm'
import PNG_WASM from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm'
import WEBP_DEC_WASM from '@jsquash/webp/codec/dec/webp_dec.wasm'
import WEBP_ENC_WASM from '@jsquash/webp/codec/enc/webp_enc.wasm'
import WEBP_ENC_SIMD_WASM from '@jsquash/webp/codec/enc/webp_enc_simd.wasm'
import RESIZE_WASM from '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm'

let initPromise: Promise<void> | null = null
let webpUsesSimd: boolean | null = null

async function initialiseCodecs() {
  await Promise.all([
    initJpegDecode(JPEG_DEC_WASM),
    initJpegEncode(JPEG_ENC_WASM),
    initPngDecode(PNG_WASM),
    initPngEncode(PNG_WASM),
    initWebpDecode(WEBP_DEC_WASM),
    initResize(RESIZE_WASM)
  ])

  webpUsesSimd = await simd()
  await initWebpEncode(webpUsesSimd ? WEBP_ENC_SIMD_WASM : WEBP_ENC_WASM)
}

export const ensureCodecsInitialised = () => {
  if (!initPromise) {
    initPromise = initialiseCodecs()
  }
  return initPromise
}

export const doesWebpEncodeUseSimd = () => webpUsesSimd
