const isProbablyPrime = (await import("https://cdn.jsdelivr.net/gh/juanelas/bigint-crypto-utils/dist/index.browser.esm.js")).isProbablyPrime;
const bits = (n) => BigInt(n).toString(2).length;
const bytes = (n) => (bits(n) + 7) / 8;

const setBigInt = (dataview, byteOffset, bigint, littleEndian) => {
    bigint = BigInt(bigint);
    const size = bytes(bigint);
    for (let i = 0; bigint > 0; ++i) {
        dataview.setUint8(byteOffset + (littleEndian ? i : size - i - 1), Number(bigint & 0xFFn));
        bigint >>= 8n;
    }
}

// assuming non-negative bigints and little-endian
const joinBytes = (bytes) => bytes.reduce((n, c, i) => n | BigInt(c) << BigInt(i) * 8n, 0n);
const splitBigInt = (bigint) => {
    bigint = BigInt(bigint);
    if (bigint == 0) return new Uint8Array();
    let buffer = new ArrayBuffer(bytes(bigint));
    setBigInt(buffer, 0, bigint, true);
    return new Uint8Array(buffer);
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
    if (b !== 1n) {
        console.error(`${w} does not have inverse modulo ${n}`);
        return -1;
    }
    x = x % n;
    if (x < 0n) x += n;
    return x;
}

const utf2int = (s) => joinBytes(new TextEncoder().encode(s));
const int2utf = (i) => new TextDecoder().decode(splitBigInt(i));

const epoch2date = (epoch) => new Date(1000 * epoch).toISOString().replace(/\.\d{3}Z/, 'Z')
// if (epoch2date(60) != "1970-01-01T00:01:00Z") throw new Error();

const hexify = (data) => [...new Uint8Array(data)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

function concatBytes(...l) {
    const size = l.reduce((a, b) => a + b.length, 0);
    let c = new Uint8Array(size);
    let i = 0;
    for (const e of l) {
        c.set(e, i);
        i += e.length;
    }
    return c;
}


const mpi = (bigint) => {
    const length = bits(bigint);
    const size = (length + 7) / 8;
    const buffer = new ArrayBuffer(2 + size);
    const dataview = new DataView(buffer);
    dataview.setInt16(0, length, false);
    setBigInt(dataview, 2, bigint, false);
    return buffer;
}
// if (hexify(mpi(511)).toUpperCase() != "000901FF") throw new Error();

const genPGP = async (n, e, t) => {
    const nb = new Uint8Array(mpi(n));
    const ne = new Uint8Array(mpi(e));
    const size = 6 + nb.length + ne.length;

    // see RFC 4880: 12.2. Key IDs and Fingerprints
    const header = new DataView(new ArrayBuffer(9));
    header.setUint8(0, 0x99);
    header.setUint16(1, size, false);
    header.setUint8(3, 4);
    header.setUint32(4, t, false);
    header.setUint8(8, 1); // see 9.1. Public-Key Algorithms

    const bytes = concatBytes(
        // see 5.5.2.  Public-Key Packet Formats
        new Uint8Array(header.buffer),
        nb,
        ne
    )

    const hash = hexify(await crypto.subtle.digest("SHA-1", bytes)).toUpperCase();
    const upper = hash.slice(0, 20);
    const lower = hash.slice(20, 40);
    const spread = (s) => [...Array(5).keys()].map(i => s.slice(4 * i, 4 * i + 4)).join(' ');
    const fingerprint = `${spread(upper)}  ${spread(lower)}`;

    /*
    uid = new TextEncoder().encode(uid)
    if(uid.length > 255){
        console.warn("Dangerous UTF-8 slice!")
        uid = uid.slice(0, 255);
    }
    const payload = [0b10110100, uid.length, ...uid];
    //                 ||\  /\_ one-octet length
    //                 || \____ packet tag 13 - User ID Packet
    //                 | \_____ old packet format
    //                  \______ always one

    // now get a self-signature and it can be imported with GnuPG!
    */

    const exported = btoa(String.fromCharCode(
        ...bytes,
        // ...payload
    ));

    return [fingerprint, exported];
}

export {
    randomNumber, randomPrime, bits, utf2int, int2utf, isProbablyPrime, powmod, invmod, epoch2date, genPGP
};
