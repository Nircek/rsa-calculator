var g = {};
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
    for (let k = 0, last = 0; k == 1 || last != 1; ++k) {
      let tr = document.createElement('tr');
      tbody.appendChild(tr);
      add_td(tr, k);
      last = bigInt(g.phi.value).times(k).plus(1);
      add_td(tr, last);
      last = last.mod(g.e.value);
      add_td(tr, last);
      if (last == 0) {
        g.k.value = k;
        return;
      }
    }
    g.k.value = 'gcd(\u03c6(n),e)\u22601';
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
  }).forEach((e) => {
    g[e[0]].onclick = e[1];
  });
};
