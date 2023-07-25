/**
 * @param {string} s
 * @param {number} n
 */
const hyphen_padding = (s, n = 17) => s.padStart(s.length + Math.floor((n - s.length) / 2), "-").padEnd(n, "-");

/**
 * Generate {@link http://www.dirk-loss.de/sshvis/drunken_bishop.pdf Drunken Bishop} randomart
 * @param {"RSA"} algo
 * @param {number} bitLength
 * @param {"MD5"|"SHA256"} hash
 * @param {Uint8Array|ArrayBuffer|Iterable<number>} bytes
 */
export function drunken_bishop(algo, bitLength, hash, bytes) {
    const upper_desc = hyphen_padding(`[${algo} ${bitLength}]`);
    const lower_desc = hyphen_padding(`[${hash}]`);

    const map = [...Array(9)].map((_) => Array(17).fill(0));

    let x = 8;
    let y = 4;
    for (let i = 0; i < bytes.length; i++) {
        let input = bytes[i];
        for (const _ of Array(4)) {
            // inspired by https://cvsweb.openbsd.org/cgi-bin/cvsweb/~checkout~/src/usr.bin/ssh/Attic/key.c?rev=1.79
            x = Math.min(Math.max(x + (input & 0x1 ? 1 : -1), 0), 16);
            y = Math.min(Math.max(y + (input & 0x2 ? 1 : -1), 0), 8);
            map[y][x]++;
            input >>= 2;
        }
    }
    map[y][x] = -1;
    map[4][8] = -2;
    const coin_mapping = {
        "-2": "S",
        "-1": "E",
        1: ".",
        2: "o",
        3: "+",
        4: "=",
        5: "*",
        6: "B",
        7: "O",
        8: "X",
        9: "@",
        10: "%",
        11: "&",
        12: "#",
        13: "/",
        14: "^",
    };
    const lines = [
        `+${hyphen_padding(upper_desc)}+`,
        ...map.map((line) => `|${line.map((coins) => coin_mapping[coins] || " ").join("")}|`),
        `+${hyphen_padding(lower_desc)}+`,
    ];
    return lines.join("\n");
}

let t = "data:application/octet-stream;base64,YG5Smr4aOCLdKIkPcPKaJw6tFbcqctB4QH6ENfB1cYk";
const exp = [
    "+-----[RSA 8]-----+",
    "| .+o . oo..      |",
    "| o..o .E..       |",
    "|o ..  +          |",
    "|.. . * .         |",
    "|o++ = o S        |",
    "|=Oo* +           |",
    "|@oB +            |",
    "|BXoo .           |",
    "|**+..            |",
    "+----[SHA256]-----+",
].join("\n");
t = drunken_bishop("RSA", 8, "SHA256", new Uint8Array(await (await fetch(t)).arrayBuffer()));
if (t != exp) throw new Error(t);
