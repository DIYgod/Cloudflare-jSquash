// Minimal process shim to keep esm.js builds from pulling in Deno's Node polyfill.
// Supabase Edge runtime disallows Deno.core APIs that std/node/process depends on.
const processShim = {
  release: { name: "deno" },
  env: {},
  versions: {},
} as const;

export default processShim;
