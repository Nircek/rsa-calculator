var g = {};
const ginit = () => {
  [...document.querySelectorAll('*')]
    .filter((e) => e.id != '')
    .forEach((e) => {
      g[e.id] = e;
    });
  Object.entries({
    random: () => {
      g.number.value = randomNumber(g.bits.value);
    },
  }).forEach((e) => {
    g[e[0]].onclick = e[1];
  });
};
