import {
    isProbablyPrime,
    bits,
    randomNumber,
    randomPrime,
    powmod,
    invmod,
    utf2int,
    int2utf,
    epoch2date,
    genPGP
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
}

window.addEventListener("load", () => {
    if (inputs.now.checked) inputs.now.dispatchEvent(new Event('change'));
    inputs.date.dispatchEvent(new Event('change'));
});

const updateTime = () => {
    var now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    now.setMilliseconds(null)
    inputs.date.value = now.toISOString().slice(0, -1);
    inputs.date.dispatchEvent(new Event('change'));
}

const getTime = () => new Date(inputs.date.value) / 1000;

inputs.date.addEventListener("change", () => {
    document.getElementById("isodate").innerText = epoch2date(getTime());
})

let updateTimeInterval = null;
inputs.now.addEventListener("change", () => {
    inputs.date.readOnly = inputs.now.checked;
    if (inputs.now.checked) updateTimeInterval = setInterval(updateTime, 1000);
    else clearInterval(updateTimeInterval);
    updateTime();
});

function elapsedTime(elapsed) {
    const ranges = {
        h: 1000 * 3600,
        min: 1000 * 60,
        s: 1000,
        ms: 1
    };
    let ret = [];
    for (let key in ranges) {
        let c = ranges[key] == 1 ? elapsed : Math.floor(elapsed / ranges[key]);
        if (ranges[key] == 1) c = c.toFixed(3);
        elapsed %= ranges[key];
        if (c > 0)
            ret.push(`${c} ${key}`);
    }
    return ret.length == 0 ? "0.000 ms" : ret.join(" ");
}


let tours = [];
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
        "gen_prime",
        "transfer_p",
        "gen_prime_until",
        "transfer_q",
        "calc_n",
        "calc_phi",
        "calc_d",
        "gen",
    ];
    for (let step of tour_steps) {
        let failed;
        do {
            failed = false;
            let wait = step.startsWith("gen_prime");
            let promise = wait ? new Promise(resolve => {
                const controller = new AbortController();
                inputs.number.addEventListener("change", (e) => {
                    if (e.isTrusted) return;
                    controller.abort();
                    resolve();
                }, { signal: controller.signal });
            }) : null;
            document.getElementById(step == "gen_prime_until" ? "gen_prime" : step).click();
            if (wait) await promise;
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

document.getElementById("tour_clear").addEventListener("click", async () => {
    document.getElementById("tour_stats").classList.add("hidden");
    tours = [];
    tour_cleared = true;
    document.getElementById("failed_stats").classList.add("hidden");
    document.getElementById("failed_number").innerText = 0;
});

document.getElementById("random").addEventListener("click", () => {
    inputs.number.value = randomNumber(inputs.bits.value);
});

document.getElementById("if_prime").addEventListener("click", async () => {
    let arr = [document.getElementById("number_prime"), document.getElementById("number_not_prime")];
    if (await isProbablyPrime(BigInt(inputs.number.value))) arr.reverse();
    arr[0].classList.add('hidden');
    arr[1].classList.remove('hidden');
});

document.getElementById("gen_prime").addEventListener("click", async () => {
    inputs.number.value = await randomPrime(inputs.bits.value);
    inputs.number.dispatchEvent(new Event("change"));
});

document.getElementById("transfer_p").addEventListener("click", () => {
    inputs.p.value = inputs.number.value;
});

document.getElementById("transfer_q").addEventListener("click", () => {
    inputs.q.value = inputs.number.value;
});

document.getElementById("calc_n").addEventListener("click", () => {
    inputs.n.value = BigInt(inputs.p.value) * BigInt(inputs.q.value);
});

document.getElementById("calc_phi").addEventListener("click", () => {
    inputs.phi.value = (BigInt(inputs.p.value) - 1n) * (BigInt(inputs.q.value) - 1n);
});

document.getElementById("calc_e").addEventListener("click", async () => {
    const mgn = Math.floor(bits(inputs.phi.value) / 2) + 1;
    inputs.e.value = mgn < 16 && Math.random() * 7 < 1 && inputs.phi.value % 3 != 0 ? 3 : await randomPrime(Math.min(17, mgn));
});

document.getElementById("default_e").addEventListener("click", () => {
    inputs.e.value = 0x10001;
});

document.getElementById("calc_d").addEventListener("click", () => {
    inputs.d.value = invmod(inputs.e.value, inputs.phi.value);
});

let last_key_test_status = null;
document.getElementById("gen").addEventListener("click", async () => {
    const time = getTime(), n = BigInt(inputs.n.value), e = BigInt(inputs.e.value), d = BigInt(inputs.d.value);
    const t = randomNumber(bits(n) - 1);
    if (last_key_test_status = powmod(t, e * d, n) == t) {
        const [pgpfpr, pgp] = await genPGP(n, e, time);
        document.getElementById("fpr").innerText =
            `RFC 4880 OpenPGP V4 Fingerprint:\n${pgpfpr}`;
        document.getElementById("pub").innerText =
            `RSA public key\nt=${epoch2date(time)}\nn=${n}\ne=${e}\n${bits(n)} bits\n\nbase64 RFC 4880 OpenPGP: ${pgp}`;
        document.getElementById("sec").innerText =
            `RSA private key\nn=${n}\nd=${d}\n${bits(n)} bits`;
    } else {
        document.getElementById("fpr").innerText = document.getElementById("sec").innerText = document.getElementById("pub").innerText =
            'e\u00d7d\u22621 \u2228 p\u2209\u2119 \u2228 q\u2209\u2119';
    }
});

document.getElementById("calc_m").addEventListener("click", () => {
    inputs.m.value = utf2int(inputs.text.value);
});

document.getElementById("calc_t").addEventListener("click", () => {
    inputs.text.value = int2utf(inputs.m.value);
});

document.getElementById("encrypt").addEventListener("click", () => {
    inputs.c.value = BigInt(inputs.m.value) < BigInt(inputs.n.value) ?
        powmod(inputs.m.value, inputs.e.value, inputs.n.value) :
        `m \u2265 n -- m > 2^${bits(inputs.m.value) - 1}`;
});

document.getElementById("decrypt").addEventListener("click", () => {
    inputs.m.value = powmod(inputs.c.value, inputs.d.value, inputs.n.value);
});

document.getElementById("verify").addEventListener("click", () => {
    inputs.m.value = powmod(inputs.c.value, inputs.e.value, inputs.n.value);
});

document.getElementById("sign").addEventListener("click", () => {
    inputs.c.value = powmod(inputs.m.value, inputs.d.value, inputs.n.value);
});
