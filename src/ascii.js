'use strict';
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const green = c('32'), bright = c('92'), dim = c('2'), bold = c('1'), red = c('31'), yellow = c('33'), purple = c('35'), gray = c('90');

// [line1, line2, color] — centered over the apex automatically
const HAT_RAW = {
  none: ['', '', gray],
  cap: [' ▄███▄', '▀▀▀▀▀▀▀▀▄▄', green],
  beanie: ['●', '▟███▙', bright],
  crown: ['▲ ▲ ▲', '█████', yellow],
  wizard: ['▲ ✦', '▄███▄', purple],
  headphones: ['╭─────╮', '▐     ▌', green],
  hardhat: ['▄███▄', '▀▀▀▀▀▀▀', yellow],
  party: ['●', '▟█▙', purple],
  tophat: ['█████', '▀▀▀▀▀▀▀', gray],
  grad: ['◢█████◣', '▀▀▀╲', green],
};
const APEX_COL = 11;
const center = (s, col) => (s ? ' '.repeat(Math.max(0, col - Math.floor([...s].length / 2))) + s : '');
const HAT_ART = Object.fromEntries(Object.entries(HAT_RAW).map(([k, [l1, l2, col]]) => [k, [col(center(l1, APEX_COL)), col(center(l2, APEX_COL))]]));

function spider(hat = 'none') {
  const [h1, h2] = HAT_ART[hat] || HAT_ART.none;
  const L = gray;
  return [
    h1, h2,
    `  ${L('╲  ╲')}     ${bright('▲')}     ${L('╱  ╱')}`,
    `   ${L('╲__╲')}   ${green('╱ ╲')}   ${L('╱__╱')}`,
    ` ${L('──────')}  ${green('╱')}${dim('[')}${bright('◉')}${dim(']')}${green('╲')}  ${L('──────')}`,
    `  ${L('╱‾‾╱')}  ${green('╱_PR__╲')}  ${L('╲‾‾╲')}`,
    ` ${L('╱  ╱')}               ${L('╲  ╲')}`,
  ].filter((l, i) => i > 1 || l).join('\n');
}

module.exports = { spider, HAT_ART, green, bright, dim, bold, red, yellow, purple, gray };
