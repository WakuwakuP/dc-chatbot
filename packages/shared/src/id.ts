const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(timeMs: number): string {
  let value = Math.max(0, Math.floor(timeMs));
  let output = "";
  for (let index = 0; index < 10; index += 1) {
    output = CROCKFORD_BASE32[value % 32] + output;
    value = Math.floor(value / 32);
  }
  return output;
}

type CryptoLike = {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
};

function randomByte(): number {
  const bytes = new Uint8Array(1);
  const cryptoLike = (globalThis as typeof globalThis & { crypto: CryptoLike })
    .crypto;
  cryptoLike.getRandomValues(bytes);
  return bytes[0] ?? 0;
}

function encodeRandom(): string {
  let output = "";
  for (let index = 0; index < 16; index += 1) {
    output += CROCKFORD_BASE32[randomByte() % 32];
  }
  return output;
}

export function createUlid(date = new Date()): string {
  return `${encodeTime(date.getTime())}${encodeRandom()}`;
}
