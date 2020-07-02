const randomNumber = (bits) =>
  bigInt.randBetween(
    bigInt[2].pow(bits - 1),
    bigInt[2].pow(bits).minus(1),
    Math.random
  );

const bits = (n) => n.toString(2).length;
