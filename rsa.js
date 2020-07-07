const randomNumber = (bits) =>
  bigInt.randBetween(
    bigInt[2].pow(bits - 1),
    bigInt[2].pow(bits).minus(1),
    Math.random
  );
const randomBits = (bits) =>
  bigInt.randBetween(0, bigInt[2].pow(bits).minus(1), Math.random);
const randomPrime = (bits) => {
  if (bits < 2) return bigInt(-1);
  if (bits == 2) return Math.random() < 0.5 ? bigInt(2) : bigInt(3);
  let x;
  do
    x = bigInt(1)
      .shiftLeft(bits - 2)
      .or(randomBits(bits - 2))
      .shiftLeft(1)
      .or(1);
  while (!x.isProbablePrime());
  return x;
};
const bits = (n) => bigInt(n).toString(2).length;
const calculateK = (phi, e, cb = (_, __, ___) => null) => {
  for (let k = 0, last = 0; k == 1 || last != 1; ++k) {
    let full = bigInt(phi).times(k).plus(1);
    last = full.mod(e);
    cb(k, full, last);
    if (last == 0) return k;
  }
  return null;
};
