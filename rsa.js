const isProbablyPrime = (await import("https://cdn.jsdelivr.net/gh/juanelas/bigint-crypto-utils/dist/index.browser.esm.js")).isProbablyPrime;
const bits = (n) => BigInt(n).toString(2).length;

// assuming non-negative bigints and little-endian
const joinBytes = (bytes) => bytes.reduce((n, c, i) => n | BigInt(c) << BigInt(i) * 8n, 0n);
const splitBigInt = (bigint) => {
  bigint = BigInt(bigint);
  let result = new Uint8Array((bits(bigint) + 7) / 8);
  for (let i = 0; bigint > 0; ++i) {
    result[i] = Number(bigint & 0xFFn);
    bigint >>= 8n;
  }
  return result;
}

// for(let i of [0, 1, 42, 0xFF, 0x100, 0xABCD])
//   if(joinBytes(splitBigInt(i)) != i)
//     throw new Error(`joinBytes(splitBigInt()) assertion failed: ${joinBytes(splitBigInt(i))} != ${i}`);

const randomBits = (bits) => joinBytes(crypto.getRandomValues(new Uint8Array((bits + 7) / 8))) % (1n << BigInt(bits));
const randomNumber = (bits) => (1n << BigInt(bits - 1)) | randomBits(bits - 1);
const randomPrime = async (bits) => {
  if (bits < 2) return -1n;
  if (bits == 2) return randomNumber(bits);
  let x;
  do
    x = (randomNumber(bits - 1) << 1n) | 1n;
  while (!(await isProbablyPrime(x)));
  return x;
};

const powmod = (base, exp, mod) => {
  base = BigInt(base), exp = BigInt(exp), mod = BigInt(mod);
  let x = base % mod, res = exp & 1n ? x : 1n;
  do {
    x = x ** 2n % mod;
    if (exp & 2n) res = res * x % mod;
  } while (exp >>= 1n);
  return res;
}

const invmod = (w, n) => {
  let a = BigInt(w), b = n = BigInt(n);
  let x = 0n;
  let y = 1n;
  let u = 1n;
  let v = 0n;

  while (a !== 0n) {
    const q = b / a;
    const r = b % a;
    const m = x - (u * q);
    const n = y - (v * q);
    b = a;
    a = r;
    x = u;
    y = v;
    u = m;
    v = n;
  }
  if (b !== 1n)
    throw new RangeError(`${w} does not have inverse modulo ${n}`);
  x = x % n;
  if(x < 0n) x += n;
  return x;
}

const calculateK = (phi, e, cb = (_, __, ___) => null) => {
  e = BigInt(e);
  for (let k = 0, last = 0; k == 1 || last != 1; ++k) {
    let full = BigInt(phi) * BigInt(k) + 1n;
    last = full % e;
    cb(k, full, last);
    if (last == 0) return k;
  }
  return null;
};

const utf2int = (s) => joinBytes(new TextEncoder().encode(s));
const int2utf = (i) => new TextDecoder().decode(splitBigInt(i));

export {
  randomNumber, randomPrime, bits, calculateK, utf2int, int2utf, isProbablyPrime, powmod
};
