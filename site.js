import * as Comlink from "https://cdn.jsdelivr.net/npm/comlink@4.4.1/dist/esm/comlink.min.js";
const MyWorker = Comlink.wrap(new Worker("worker.js"));
const worker = await new MyWorker();
import {
    isProbablyPrime,
    bits,
    randomNumber,
    randomPrime,
    invmod,
    utf2int,
    int2utf,
    epoch2date,
    genPGP,
    genSSH,
} from "./rsa.js";

const inputs = {
    tour: document.getElementById("tour"),
    tour_continous: document.getElementById("tour_continous"),
    bits: document.getElementById("bits"),
    number: document.getElementById("number"),
    p: document.getElementById("p"),
    q: document.getElementById("q"),
    n: document.getElementById("n"),
    phi: document.getElementById("phi"),
    e: document.getElementById("e"),
    d: document.getElementById("d"),
    date: document.getElementById("date"),
    now: document.getElementById("now"),
    text: document.getElementById("text"),
    m: document.getElementById("m"),
    c: document.getElementById("c"),
    wasm: document.getElementById("wasm"),
    sec: document.getElementById("sec"),
};

const setValue = (input, value) => {
    const item = typeof input === "string" ? inputs[input] : input;
    item.value = value;
    item.dispatchEvent(new Event("change"));
}

const updateTime = () => {
    var now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    now.setMilliseconds(null);
    setValue("date", now.toISOString().slice(0, -1));
};

const getTime = () => new Date(inputs.date.value) / 1000;

inputs.date.addEventListener("change", () => {
    document.getElementById("isodate").innerText = epoch2date(getTime());
});

let updateTimeInterval = null;
inputs.now.addEventListener("change", () => {
    inputs.date.readOnly = inputs.now.checked;
    if (inputs.now.checked) updateTimeInterval = setInterval(updateTime, 1000);
    else clearInterval(updateTimeInterval);
    updateTime();
});

if (inputs.now.checked) inputs.now.dispatchEvent(new Event("change"));
inputs.date.dispatchEvent(new Event("change"));

/** @param {number} elapsed  */
function elapsedTime(elapsed) {
    const ranges = {
        h: 1000 * 3600,
        min: 1000 * 60,
        s: 1000,
        ms: 1,
    };
    const ret = [];
    for (let key in ranges) {
        let c = ranges[key] == 1 ? elapsed : Math.floor(elapsed / ranges[key]);
        if (ranges[key] == 1) c = c.toFixed(3);
        elapsed %= ranges[key];
        if (c > 0) ret.push(`${c} ${key}`);
    }
    return ret.length == 0 ? "0.000 ms" : ret.join(" ");
}

const tours = [];
let tour_interval = null;
let tour_cleared = false;

inputs.tour_continous.addEventListener("click", () => {
    if (tour_interval != null) {
        clearInterval(tour_interval);
        tour_interval = null;
        inputs.tour_continous.innerText = "More.";
        return;
    }
    tour_interval = setInterval(() => {
        if (inputs.tour.disabled) return;
        inputs.tour.click();
    }, 200);
    inputs.tour_continous.innerText = "Less.";
});

inputs.tour.addEventListener("click", async () => {
    inputs.tour.disabled = true;
    inputs.tour_continous.classList.remove("hidden");
    tour_cleared = false;
    const start = performance.now();
    const tour_steps = [
        ["gen_prime", "number"],
        ["transfer_p", "p"],
        ["gen_prime_until", "number"],
        ["transfer_q", "q"],
        ["calc_n", "n"],
        ["calc_phi", "phi"],
        ["calc_d", "d"],
        ["gen", "sec"]
    ];
    for (const [step, wait_for] of tour_steps) {
        let failed;
        do {
            failed = false;
            await new Promise((resolve) => {
                let listener = (e) => {
                    if (e.isTrusted) return;
                    inputs[wait_for].removeEventListener("change", listener);
                    resolve();
                };
                inputs[wait_for].addEventListener("change", listener);
                document.getElementById(step == "gen_prime_until" ? "gen_prime" : step).click();
            });
            if (tour_cleared) {
                inputs.tour.disabled = false;
                return;
            }
            failed = step == "gen_prime_until" && inputs.number.value == inputs.p.value;
        } while (failed);
    }
    const end = performance.now();
    tours.push(end - start);
    if (!last_key_test_status) {
        document.getElementById("failed_stats").classList.remove("hidden");
        document.getElementById("failed_number").innerText++;
    }
    document.getElementById("last_tour_time").innerText = elapsedTime(tours.slice(-1).pop());
    document.getElementById("tour_number").innerText = tours.length;
    document.getElementById("tour_avg_time").innerText = elapsedTime(tours.reduce((o, e) => o + e, 0) / tours.length);
    if (tours.length > 1)
        document.getElementById("plural_tours").classList.remove("hidden");
    document.getElementById("tour_stats").classList.remove("hidden");
    inputs.tour.disabled = false;
});

document.getElementById("tour_clear").addEventListener("click", () => {
    document.getElementById("tour_stats").classList.add("hidden");
    tours.length = 0;
    tour_cleared = true;
    document.getElementById("failed_stats").classList.add("hidden");
    document.getElementById("failed_number").innerText = 0;
});

document.getElementById("random").addEventListener("click", () => {
    setValue("number", randomNumber(inputs.bits.value));
});

document.getElementById("if_prime").addEventListener("click", async () => {
    const arr = [document.getElementById("number_prime"), document.getElementById("number_not_prime")];
    if (await isProbablyPrime(BigInt(inputs.number.value))) arr.reverse();
    arr[0].classList.add("hidden");
    arr[1].classList.remove("hidden");
});

inputs.number.value = inputs.number.value === "working..." ? "" : inputs.number.value;
document.getElementById("gen_prime").addEventListener("click", async () => {
    inputs.number.value = "working...";
    const func = inputs.wasm.value == 0 ? randomPrime : worker.gen_prime;
    setValue("number", await func(inputs.bits.value));
});

document.getElementById("transfer_p").addEventListener("click", () => {
    setValue("p", inputs.number.value);
});

document.getElementById("transfer_q").addEventListener("click", () => {
    setValue("q", inputs.number.value);
});

document.getElementById("calc_n").addEventListener("click", () => {
    setValue("n", BigInt(inputs.p.value) * BigInt(inputs.q.value));
});

document.getElementById("calc_phi").addEventListener("click", () => {
    setValue("phi", (BigInt(inputs.p.value) - 1n) * (BigInt(inputs.q.value) - 1n));
});

document.getElementById("calc_e").addEventListener("click", async () => {
    const mgn = Math.floor(bits(inputs.phi.value) / 2) + 1;
    setValue("e", mgn < 16 && Math.random() * 7 < 1 && inputs.phi.value % 3 != 0 ? 3 : await randomPrime(Math.min(17, mgn)));
});

document.getElementById("default_e").addEventListener("click", () => {
    setValue("e", 0x10001);
});

document.getElementById("calc_d").addEventListener("click", () => {
    setValue("d", invmod(inputs.e.value, inputs.phi.value));
});

let last_key_test_status = null;
document.getElementById("gen").addEventListener("click", async () => {
    document.getElementById("fpr").innerText = "checking if (e,d,n) tuple is valid..." + document.getElementById("fpr").innerText.replace(/[^\n]/g, "");
    document.getElementById("pub").innerText = document.getElementById("pub").innerText.replace(/[^\n]/g, "");
    inputs.sec.innerText = inputs.sec.innerText.replace(/[^\n]/g, "");
    const time = getTime();
    const n = BigInt(inputs.n.value);
    const e = BigInt(inputs.e.value);
    const d = BigInt(inputs.d.value);
    const t = randomNumber(bits(n) - 1);
    last_key_test_status = await worker.powmod(t, e * d, n) == t;
    const [pgp, pgpfpr] = await genPGP(n, e, time);
    const [ssh, sshfprmd5, sshfprsha256, sshrandomart] = await genSSH(n, e);
    // https://superuser.com/questions/22535/what-is-randomart-produced-by-ssh-keygen
    document.getElementById("fpr").innerText =
        `${last_key_test_status ? "" : "no known private key!!!\n"}RFC 4880 OpenPGP V4 Fingerprint:\n${pgpfpr}\n\n${sshfprmd5}\n${sshfprsha256}\n\n${sshrandomart}\n\n`;
    document.getElementById("pub").innerText =
        `${last_key_test_status ? "" : "no known private key!!!\n"}RSA public key\nt=${epoch2date(time)}\nn=${n}\ne=${e}\n${bits(n)} bits\n\nbase64 RFC 4880 OpenPGP: ${pgp}\n\n${ssh}\n\n`;
    // https://superuser.com/questions/1535116/generating-privatepublic-keypair-for-ssh-difference-between-ssh-keygen-and-ope?noredirect=1&lq=1
    inputs.sec.innerText =
        last_key_test_status ? `RSA private key\np=${inputs.p.value}\nq=${inputs.q.value}\nn=${n}\nd=${d}\n${bits(n)} bits\n\n` : "e\u00d7d\u22621 \u2228 p\u2209\u2119 \u2228 q\u2209\u2119 \u2228 p=q\n\n";
    setValue("sec", undefined);
});

document.getElementById("calc_m").addEventListener("click", () => {
    setValue("m", utf2int(inputs.text.value));
});

document.getElementById("calc_t").addEventListener("click", () => {
    setValue("text", int2utf(inputs.m.value));
});

document.getElementById("encrypt").addEventListener("click", async () => {
    setValue("c",
        BigInt(inputs.m.value) < BigInt(inputs.n.value)
            ? await worker.powmod(inputs.m.value, inputs.e.value, inputs.n.value)
            : `m \u2265 n -- m > 2^${bits(inputs.m.value) - 1}`);
});

document.getElementById("decrypt").addEventListener("click", async () => {
    setValue("m", await worker.powmod(inputs.c.value, inputs.d.value, inputs.n.value));
});

document.getElementById("verify").addEventListener("click", async () => {
    setValue("m", await worker.powmod(inputs.c.value, inputs.e.value, inputs.n.value));
});

document.getElementById("sign").addEventListener("click", async () => {
    setValue("c", await worker.powmod(inputs.m.value, inputs.d.value, inputs.n.value));
});

let firstWasmLoad = true;
inputs.wasm.value = 0;
inputs.wasm.addEventListener("change", async () => {
    if (firstWasmLoad) {
        firstWasmLoad = false;
        const setWasmStateColor = (color) => {
            document.getElementById("wasm-state").style.color = color;
        };
        document.getElementById("wasm-state").title = await (async () => {
            try {
                setWasmStateColor("white");
                await worker.initWasm();
                setWasmStateColor("yellow");
                const state = worker.state();
                setWasmStateColor("green");
                return state;
            } catch (e) {
                console.error(e);
                setWasmStateColor("red");
                return `FAILED (${e})`;
            }
        })();
    }
});
