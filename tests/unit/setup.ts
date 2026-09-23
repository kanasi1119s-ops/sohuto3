import 'fake-indexeddb/auto'

// jsdom does not implement Web Crypto's SubtleCrypto by default in older versions,
// but Node's global `crypto` (webcrypto) covers getRandomValues + subtle for our tests.
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  const { webcrypto } = await import('node:crypto')
  globalThis.crypto = webcrypto as unknown as Crypto
}
