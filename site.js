var g = {};
function getTXTFile(url) {
  return new Promise((r) => {
    let h = new XMLHttpRequest();
    h.open('GET', url);
    h.onreadystatechange = () => {
      if (h.readyState === 4)
        if (h.status === 200 || h.status == 0) {
          r(h.responseText);
        }
    };
    h.send(null);
  });
}
var small_primes;
getTXTFile('small-primes.txt').then((s) => {
  small_primes = s.split(', ');
});
const ginit = () => {
  [...document.querySelectorAll('*')]
    .filter((e) => e.id != '')
    .forEach((e) => {
      g[e.id] = e;
    });
  const random = () => {
    g.number.value = randomNumber(g.bits.value);
  };
  const if_prime = () => {
    let arr = [g.number_prime, g.number_not_prime];
    if (bigInt(g.number.value).isProbablePrime()) arr.reverse();
    arr[0].classList.add('hidden');
    arr[1].classList.remove('hidden');
  };
  const gen_prime = () => {
    g.number.value = randomPrime(g.bits.value);
  };
  const atop = () => {
    g.p.value = g.number.value;
  };
  const atoq = () => {
    g.q.value = g.number.value;
  };
  const calc_n = () => {
    g.n.value = bigInt(g.p.value).times(g.p.value);
  };
  const calc_phi = () => {
    g.phi.value = bigInt(g.p.value).minus(1).times(bigInt(g.q.value).minus(1));
  };
  const add_td = (tr, text) => {
    let td = document.createElement('td');
    td.innerText = text;
    tr.appendChild(td);
  };
  const calc_k = () => {
    let tbody = document.querySelectorAll('#k_table > tbody')[0];
    tbody.innerHTML = '';
    if (
      (g.k.value = calculateK(g.phi.value, g.e.value, (k, f, m) => {
        let tr = document.createElement('tr');
        tbody.appendChild(tr);
        [k, f, m].forEach((e) => add_td(tr, e));
      })) == null
    )
      g.k.value = 'gcd(\u03c6(n),e)\u22601';
  };
  Array.prototype.min = function () {
    return this.reduce((b, e) => (b > e && e != null ? e : b));
  };
  const calc_e = (_ = null, K = null) => {
    if (small_primes === undefined)
      g.e.value = 'primes not found (check your internet connection)';
    let calc = small_primes.slice(0, (bits(g.n.value) * 6542) / 1024).reduce(
      (b, e) => {
        b[0]++;
        if ((K == null && b[2] == 1) || (K != null && b[2] == K)) return b;
        let k = calculateK(g.phi.value, e);
        return (K == null ? b[2] > k : k == K) && k != null
          ? [b[0], b[0], k, e]
          : b;
      },
      [-1, null, Infinity, 'error']
    );
    if (g.e.value != 'error') g.k.value = calc[2];
    g.e.value = calc[3];
  };
  const hide_table = () => {
    g.k_table.className = g.k_table.className ? '' : 'hidden';
  };
  Object.entries({
    random: random,
    if_prime: if_prime,
    gen_prime: gen_prime,
    atop: atop,
    atoq: atoq,
    calc_n: calc_n,
    calc_phi: calc_phi,
    calc_k: calc_k,
    calc_e: calc_e,
    calc_e_k: () => calc_e(null, g.k.value),
    hide_table: hide_table,
  }).forEach((e) => {
    g[e[0]].onclick = e[1];
  });
};
