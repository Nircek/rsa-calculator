function randomBit() {
  // the randomness isn't meant to be secure
  // TODO: use crypto webapi
  return BigInt(Math.random() < 0.5);
}

function randomBits(bits) {
  if (bits == 0) return 0n;
  let x = 0n;
  do {
    x <<= 1n;
    x |= randomBit();
  } while (--bits);
  return x;
}

function randomOdd(bits) {
  --bits;
  if (bits) return (1n << BigInt(bits--)) | (randomBits(bits) << 1n) | 1n;
  else return 1n;
}

function bits(n) {
  let i = 1;
  while ((n >>= 1n)) ++i;
  return i;
}
