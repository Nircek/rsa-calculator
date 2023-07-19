import { isProbablyPrime } from "https://cdn.jsdelivr.net/gh/juanelas/bigint-crypto-utils/dist/index.browser.esm.js";
export { isProbablyPrime };

// #region integer
/** @param {string|number|bigint} n */
export const bits = (n) => BigInt(n).toString(2).length;

/** @param {string|number|bigint} n */
const bytes = (n) => (bits(n) + 7) / 8;
// #endregion


// #region bytes convertion
/**
 * like {@link DataView.setUint32} but with bigint and variable size
 * @param {DataView} dataview
 * @param {number} byteOffset
 * @param {string|number|bigint} bigint non-negative
 * @param {boolean} littleEndian
*/
function setBigInt(dataview, byteOffset, bigint, littleEndian) {
    bigint = BigInt(bigint);
    const size = bytes(bigint);
    for (let i = 0; bigint > 0; ++i) {
        dataview.setUint8(byteOffset + (littleEndian ? i : size - i - 1), Number(bigint & 0xFFn));
        bigint >>= 8n;
    }
}

/** @param {UInt8Array} bytes little-endian bytes representation @returns {bigint} */
const joinBytes = (bytes) => bytes.reduce((n, c, i) => n | BigInt(c) << BigInt(i) * 8n, 0n);

/**
 * @param {string|number|bigint} bigint non-negative
 * @returns minimal little-endian bytes representation
 */
function splitBigInt(bigint) {
    bigint = BigInt(bigint);

    if (bigint == 0) return new Uint8Array();
    let buffer = new ArrayBuffer(bytes(bigint));
    setBigInt(new DataView(buffer), 0, bigint, true);
    return new Uint8Array(buffer);
}

for (let i of [0, 1, 42, 0xFF, 0x100, 0xABCD])
    if (joinBytes(splitBigInt(i)) != i)
        throw new Error(`joinBytes(splitBigInt()) assertion failed: ${joinBytes(splitBigInt(i))} != ${i}`);

/** @param {Uint8Array|ArrayBuffer|Iterable<number>} data @returns lowercase hexadecimal representation */
function hexify(data) {
    return [...new Uint8Array(data)]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}
// #endregion


// #region random
/** @param {number} bits */
const randomBits = (bits) => joinBytes(crypto.getRandomValues(new Uint8Array((bits + 7) / 8))) & ((1n << BigInt(bits)) - 1n);

/** @param {number} bits */
export const randomNumber = (bits) => (1n << BigInt(bits - 1)) | randomBits(bits - 1);

/** @param {number} bits */
export async function randomPrime(bits) {
    if (bits < 2) return -1n;
    if (bits == 2) return randomNumber(bits);
    let x;
    do
        x = (randomNumber(bits - 1) << 1n) | 1n;
    while (!(await isProbablyPrime(x)));
    return x;
};
// #endregion


// #region modular arithmetic
/**
 * @param {string|number|bigint} base
 * @param {string|number|bigint} exp
 * @param {string|number|bigint} mod
 * @returns {bigint} `base`ᵉˣᵖ (mod `mod`)
 */
export function powmod(base, exp, mod) {
    base = BigInt(base), exp = BigInt(exp), mod = BigInt(mod);
    let x = base % mod, res = exp & 1n ? x : 1n;
    do {
        x = x ** 2n % mod;
        if (exp & 2n) res = res * x % mod;
    } while (exp >>= 1n);
    return res;
}

/**
 * @param {string|number|bigint} val
 * @param {string|number|bigint} mod
 * @returns `val`⁻¹ (mod `mod`) OR `-1n` when does not exist
 */
export function invmod(val, mod) {
    let a = BigInt(val), b = mod = BigInt(mod);
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
        console.error(`${val} does not have inverse modulo ${mod}`);
        return -1n;
    }
    x = x % mod;
    if (x < 0n) x += mod;
    return x;
}
// #endregion


// #region text conversion
/** @param {string} s string from which the little-endian representation will be returned */
export const utf2int = (s) => joinBytes(new TextEncoder().encode(s));

/** @param {number} i the little-endian representation of string which will be returned */
export const int2utf = (i) => new TextDecoder().decode(splitBigInt(i));

/** @param {number} epoch timestamap in seconds @returns ISO 8601 date string */
export const epoch2date = (epoch) => new Date(1000 * epoch).toISOString().replace(/\.\d{3}Z/, 'Z')
if (epoch2date(60) != "1970-01-01T00:01:00Z") throw new Error();
// #endregion


// #region RFC 4880 OpenPGP
/** @param  {...Uint8Array|ArrayBuffer|Iterable<number>} l */
function concatBytes(...l) {
    l = l.map(e => new Uint8Array(e));
    const size = l.reduce((a, b) => a + b.length, 0);
    let c = new Uint8Array(size);
    let i = 0;
    for (const e of l) {
        c.set(e, i);
        i += e.length;
    }
    return c;
}

/** @param {string|number|bigint} bigint number from which the [RFC4880] 3.2. Multiprecision Integers representation will be returned */
function mpi(bigint) {
    const length = bits(bigint);
    const size = (length + 7) / 8;
    const buffer = new ArrayBuffer(2 + size);
    const dataview = new DataView(buffer);
    dataview.setInt16(0, length, false);
    setBigInt(dataview, 2, bigint, false);
    return buffer;
}

if (hexify(mpi(511)).toUpperCase() != "000901FF") throw new Error();

/**
 * @param {string|number|bigint} n
 * @param {string|number|bigint} e
 * @param {number} timestamp
 * @returns A tuple consting of:
 *  1. RFC 4880 OpenPGP V4 Fingerprint
 *  2. base64 RFC 4880 OpenPGP public key
 */
export async function genPGP(n, e, timestamp) {
    const nb = mpi(n);
    const ne = mpi(e);
    const size = 6 + nb.byteLength + ne.byteLength;

    // see RFC 4880: 12.2. Key IDs and Fingerprints
    const header = new DataView(new ArrayBuffer(9));
    header.setUint8(0, 0x99);
    header.setUint16(1, size, false);
    header.setUint8(3, 4);
    header.setUint32(4, timestamp, false);
    header.setUint8(8, 1); // see 9.1. Public-Key Algorithms

    const bytes = concatBytes(
        // see 5.5.2.  Public-Key Packet Formats
        header.buffer,
        nb,
        ne
    )

    const hash = hexify(await crypto.subtle.digest("SHA-1", bytes)).toUpperCase();
    const upper = hash.slice(0, 20);
    const lower = hash.slice(20, 40);
    /** @param {string} s */
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
// #endregion
