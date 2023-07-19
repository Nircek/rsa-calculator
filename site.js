import {
  randomNumber, randomPrime, bits, utf2int, int2utf, isProbablyPrime, powmod, invmod, epoch2date, genPGP
} from "./rsa.js";
var g = {};
window.ginit = () => {
  [...document.querySelectorAll('*')]
    .filter((e) => e.id != '')
    .forEach((e) => {
      g[e.id] = e;
    });

  const updateTime = () => {
    var now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    now.setMilliseconds(null)
    g.date.value = now.toISOString().slice(0, -1);
    g.date.dispatchEvent(new Event('change'));
  }
  const getTime = () => new Date(g.date.value) / 1000
  g.date.addEventListener("change", () => {
    g.isodate.innerText = epoch2date(getTime());
  })
  g.date.dispatchEvent(new Event('change'));
  let updateTimeInterval = null;
  g.now.addEventListener("change", () => {
    g.date.readOnly = g.now.checked;
    if (g.now.checked) updateTimeInterval = setInterval(updateTime, 1000);
    else clearInterval(updateTimeInterval);
    updateTime();
  });
  g.now.dispatchEvent(new Event('change'));
  const random = () => {
    g.number.value = randomNumber(g.bits.value);
  };
  const if_prime = async () => {
    let arr = [g.number_prime, g.number_not_prime];
    if (await isProbablyPrime(BigInt(g.number.value))) arr.reverse();
    arr[0].classList.add('hidden');
    arr[1].classList.remove('hidden');
  };
  const gen_prime = async () => {
    g.number.value = await randomPrime(g.bits.value);
  };
  const atop = () => {
    g.p.value = g.number.value;
  };
  const atoq = () => {
    g.q.value = g.number.value;
  };
  const calc_n = () => {
    g.n.value = BigInt(g.p.value) * BigInt(g.q.value);
  };
  const calc_phi = () => {
    g.phi.value = (BigInt(g.p.value) - 1n) * (BigInt(g.q.value) - 1n);
  };
  Array.prototype.min = function () {
    return this.reduce((b, e) => (b > e && e != null ? e : b));
  };
  const calc_e = async () => {
    const mgn = Math.floor(bits(g.phi.value) / 2) + 1;
    g.e.value = mgn < 16 && Math.random() * 7 < 1 && g.phi.value % 3 != 0 ? 3 : await randomPrime(Math.min(17, mgn));
  };
  const default_e = () => {
    g.e.value = 0x10001;
  }
  const calc_d = () => {
    g.d.value = invmod(g.e.value, g.phi.value);
  };
  const gen = async () => {
    if (
      powmod(100n, BigInt(g.e.value) * BigInt(g.d.value), BigInt(g.n.value)) == 100n
    ) {
      const time = getTime();
      const [pgpfpr, pgp] = await genPGP(g.n.value, g.e.value, time);
      g.fpr.innerText = `RFC 4880 OpenPGP V4 Fingerprint:\n${pgpfpr}`;
      g.pub.innerText = `RSA public key\nt=${epoch2date(time)}\nn=${g.n.value}\ne=${g.e.value}\n${bits(
        g.n.value
      )} bits\n\nbase64 RFC 4880 OpenPGP: ${pgp}`;
      g.sec.innerText = `RSA private key\nn=${g.n.value}\nd=${g.d.value}\n${bits(
        g.n.value
      )} bits`;
    }
    else {
      g.fpr.innerText = g.sec.innerText = g.pub.innerText = 'e\u00d7d\u22621 \u2228 p\u2209\u2119 \u2228 q\u2209\u2119';
    }
  };

  const ttom = () => {
    g.m.value = utf2int(g.text.value);
  };
  const mtot = () => {
    g.text.value = int2utf(g.m.value);
  };
  const encrypt = () => {
    g.c.value = BigInt(g.m.value) < BigInt(g.n.value) ?
      powmod(g.m.value, g.e.value, g.n.value) :
      `m \u2265 n -- m > 2^${bits(g.m.value) - 1}`;
  };
  const decrypt = () => {
    g.m.value = powmod(g.c.value, g.d.value, g.n.value);
  };
  const verify = () => {
    g.m.value = powmod(g.c.value, g.e.value, g.n.value);
  };
  const sign = () => {
    g.c.value = powmod(g.m.value, g.d.value, g.n.value);
  };

  Object.entries({
    random: random,
    if_prime: if_prime,
    gen_prime: gen_prime,
    atop: atop,
    atoq: atoq,
    calc_n: calc_n,
    calc_phi: calc_phi,
    calc_e: calc_e,
    default_e: default_e,
    calc_d: calc_d,
    gen: gen,
    ttom: ttom,
    mtot: mtot,
    encrypt: encrypt,
    decrypt: decrypt,
    verify: verify,
    sign: sign,
  }).forEach((e) => {
    g[e[0]].onclick = e[1];
  });
};
