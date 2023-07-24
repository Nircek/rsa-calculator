import { isProbablyPrime } from "https://cdn.jsdelivr.net/gh/juanelas/bigint-crypto-utils/dist/index.browser.esm.js";
import MD5 from "https://cdn.jsdelivr.net/npm/md5-es@1.8.2/src/md5.js";
import { drunken_bishop } from "./drunken_bishop.js";
export { isProbablyPrime };
const raw_md5 = (bytes) => new Uint8Array(new Int32Array(MD5.md51(String.fromCharCode(...bytes))).buffer);

// #region integer
/** @param {string|number|bigint} n */
export const bits = (n) => n == 0 ? 0 : BigInt(n).toString(2).length;

/** @param {string|number|bigint} n */
const bytes = (n) => Math.floor((bits(n) + 7) / 8);
// #endregion

// #region bytes convertion
/**
 * like {@link DataView.setUint32} but with bigint and variable `size`
 * @param {DataView} dataview
 * @param {number} byteOffset
 * @param {string|number|bigint} bigint non-negative
 * @param {boolean} littleEndian
 * @param {number} size `null` means get {@link bytes}
 */
function setBigInt(dataview, byteOffset, bigint, littleEndian, size = null) {
    bigint = BigInt(bigint);
    size = size == null ? bytes(bigint) : size;
    for (let i = 0; i < size; ++i) {
        dataview.setUint8(byteOffset + (littleEndian ? i : size - i - 1), Number(bigint & 0xffn));
        bigint >>= 8n;
    }
}

/** @param {UInt8Array} bytes little-endian bytes representation @returns {bigint} */
const joinBytes = (bytes) => bytes.reduce((n, c, i) => n | (BigInt(c) << (BigInt(i) * 8n)), 0n);

/**
 * @param {string|number|bigint} bigint non-negative
 * @returns minimal little-endian bytes representation
 */
function splitBigInt(bigint) {
    bigint = BigInt(bigint);

    if (bigint == 0) return new Uint8Array();
    const buffer = new ArrayBuffer(bytes(bigint));
    setBigInt(new DataView(buffer), 0, bigint, true);
    return new Uint8Array(buffer);
}

for (let i of [0, 1, 42, 0xff, 0x100, 0xabcd])
    if (joinBytes(splitBigInt(i)) != i)
        throw new Error(`joinBytes(splitBigInt()) assertion failed: ${joinBytes(splitBigInt(i))} != ${i}`);

/**
 * @param {Uint8Array|ArrayBuffer|Iterable<number>} data
 * @param {string} delim
 * @returns lowercase hexadecimal representation
 */
function hexify(data, delim = "") {
    return [...new Uint8Array(data)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(delim);
}
// #endregion

// #region random
/** @param {number} bits */
const randomBits = (bits) => joinBytes(crypto.getRandomValues(new Uint8Array(Math.floor((bits + 7) / 8)))) & ((1n << BigInt(bits)) - 1n);

/** @param {number} bits */
export const randomNumber = (bits) => (1n << BigInt(bits - 1)) | randomBits(bits - 1);

/** @param {number} bits */
export async function randomPrime(bits) {
    if (bits < 2) return -1n;
    if (bits == 2) return randomNumber(bits);
    let x;
    do x = (randomNumber(bits - 1) << 1n) | 1n;
    while (!(await isProbablyPrime(x)));
    return x;
}
// #endregion

// #region modular arithmetic
/**
 * @param {string|number|bigint} base
 * @param {string|number|bigint} exp
 * @param {string|number|bigint} mod
 * @returns {bigint} `base`ᵉˣᵖ (mod `mod`)
 */
export function powmod(base, exp, mod) {
    base = BigInt(base);
    exp = BigInt(exp);
    mod = BigInt(mod);
    let x = base % mod;
    let res = exp & 1n ? x : 1n;
    do {
        x = x ** 2n % mod;
        if (exp & 2n) res = (res * x) % mod;
    } while (exp >>= 1n);
    return res;
}

/**
 * @param {string|number|bigint} val
 * @param {string|number|bigint} mod
 * @returns `val`⁻¹ (mod `mod`) OR `-1n` when does not exist
 */
export function invmod(val, mod) {
    let a = BigInt(val);
    let b = mod = BigInt(mod);
    let x = 0n;
    let y = 1n;
    let u = 1n;
    let v = 0n;

    while (a !== 0n) {
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        const n = y - v * q;
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
export const epoch2date = (epoch) => new Date(1000 * epoch).toISOString().replace(/\.\d{3}Z/, "Z");
if (epoch2date(60) != "1970-01-01T00:01:00Z") throw new Error();
// #endregion

// #region RFC 4880 OpenPGP
/** @param  {...Uint8Array|ArrayBuffer|Iterable<number>} l */
function concatBytes(...l) {
    l = l.map(e => new Uint8Array(e));
    const size = l.reduce((a, b) => a + b.length, 0);
    const c = new Uint8Array(size);
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
    const size = Math.floor((length + 7) / 8);
    const buffer = new ArrayBuffer(2 + size);
    const dataview = new DataView(buffer);
    dataview.setUint16(0, length, false);
    setBigInt(dataview, 2, bigint, false);
    return buffer;
}

if (hexify(mpi(511)).toUpperCase() != "000901FF") throw new Error();

/**
 * @param {string|number|bigint} n
 * @param {string|number|bigint} e
 * @param {number} timestamp
 * @returns A tuple consting of:
 *  1. base64 RFC 4880 OpenPGP public key
 *  2. RFC 4880 OpenPGP V4 Fingerprint
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
        ne,
    );

    const hash = hexify(await crypto.subtle.digest("SHA-1", bytes)).toUpperCase();
    const upper = hash.slice(0, 20);
    const lower = hash.slice(20, 40);
    /** @param {string} s */
    const spread = (s) => [...Array(5).keys()].map((i) => s.slice(4 * i, 4 * i + 4)).join(" ");
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

    const exported = btoa(
        String.fromCharCode(
            ...bytes,
            // ...payload
        ),
    );

    return [exported, fingerprint];
}
// #endregion

// #region SSH
/**
 * see `mpint` definition in {@link https://datatracker.ietf.org/doc/html/rfc4251#section-5 [RFC4251]}
 * 5. Data Type Representations Used in the SSH Protocols
 * @param {string|number|bigint} bigint number from which the SSH `mpint` will be returned
 */
function mpint(bigint) {
    const size =
        bigint < 0n
            ? bytes(bigint + 1n) // -16n -> 0b10000
            : bytes(bigint << 1n); //  15n -> 0b01111 but 0n -> 0b
    const buffer = new ArrayBuffer(4 + size);
    const dataview = new DataView(buffer);
    dataview.setUint32(0, size, false);
    setBigInt(dataview, 4, bigint, false, size);
    return buffer;
}

for (const [bigint, mpi] of [
    [0n, "00000000"],
    [0x9a378f9b2e332a7n, "0000000809a378f9b2e332a7"],
    [0x80n, "000000020080"],
    [-0x1234n, "00000002edcc"],
    [-0xdeadbeefn, "00000005ff21524111"],
])
    if (hexify(mpint(bigint)) != mpi)
        throw new Error(`mpint of ${bigint}: ${hexify(mpint(bigint))} != ${mpi}`);

/**
 * see `string` definition in {@link https://datatracker.ietf.org/doc/html/rfc4251#section-5 [RFC4251]}
 * 5. Data Type Representations Used in the SSH Protocols
 * @param {string} str string to be encoded
 */
function sshstring(str) {
    const bytes = new TextEncoder().encode(str);
    const dataview = new DataView(new ArrayBuffer(4));
    dataview.setUint32(0, bytes.length, false);
    return concatBytes(dataview.buffer, bytes);
}

if (hexify(sshstring("ssh-rsa")) != "000000077373682d727361")
    throw new Error();

/**
 * @param {string|number|bigint} n
 * @param {string|number|bigint} e
 * @returns A tuple consting of:
 *  1. SSH public key
 *  2. its MD5 fingerprint
 *  3. its SHA256 fingerprint
 *  4. its randomarts
 */
export async function genSSH(n, e) {
    const bytes = concatBytes( // see RFC 4253 6.6. Public Key Algorithms
        sshstring("ssh-rsa"),
        mpint(e),
        mpint(n)
    );
    const exported = btoa(String.fromCharCode(...bytes));

    const md5 = raw_md5(bytes);
    const sha256 = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));

    const fprmd5 = `MD5:${hexify(md5, ":")}`;
    const fprsha256 = `SHA256:${btoa(String.fromCharCode(...sha256)).replace("=", "")}`;

    const randomart_md5 = drunken_bishop("RSA", bits(n), "MD5", md5).split("\n");
    const randomart_sha256 = drunken_bishop("RSA", bits(n), "SHA256", sha256).split("\n");

    const randomart = randomart_md5.map((e, i) => ((a, b) => `${a} ${b}`)(e, randomart_sha256[i])).join("\n");
    return [`ssh-rsa ${exported}`, fprmd5, fprsha256, randomart];
}
// #endregion
