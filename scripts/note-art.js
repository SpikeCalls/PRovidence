'use strict';
/**
 * The Night Note: PRovidence printed like a banknote.
 * Eye of Providence → engraved currency. Green ink → GitHub green.
 * All lettering is pre-converted to paths (src/lettering.json) so it renders
 * the same on every machine, even inside GitHub's <img> sandbox.
 */
const L = require('../src/lettering.json');

const PAPER_A = '#eef2ea';
const PAPER_B = '#d9e3d5';
const INK = '#16271d';
const NOTE = '#2f6b45';
const SEAL = '#b3261e';
const GREENS = ['#c9d8c6', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

/** place a lettering path: x,y = baseline-left (or center when align='middle') */
function word(key, x, y, { scale = 1, fill = INK, align = 'start', opacity = 1 } = {}) {
  const g = L[key];
  const dx = align === 'middle' ? -(g.w * scale) / 2 : align === 'end' ? -g.w * scale : 0;
  return `<path d="${g.d}" fill="${fill}" opacity="${opacity}" transform="translate(${(x + dx).toFixed(1)} ${y}) scale(${scale})"/>`;
}

/** guilloche rosette: layered hypotrochoids */
function rosette(cx, cy, radius, { layers = 4, color = NOTE, width = 0.6, opacity = 0.55, lobes = 31, seed = 7 } = {}) {
  const paths = [];
  for (let l = 0; l < layers; l++) {
    const R = 1, r = seed / lobes, d = 0.35 + l * 0.12;
    const pts = [];
    const steps = 2400;
    const turns = seed * Math.PI * 2;
    let maxR = 0;
    const raw = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * turns;
      const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      raw.push([x, y]);
      maxR = Math.max(maxR, Math.hypot(x, y));
    }
    const k = (radius * (1 - l * 0.13)) / maxR;
    for (const [x, y] of raw) pts.push(`${(cx + x * k).toFixed(1)},${(cy + y * k).toFixed(1)}`);
    paths.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`);
  }
  return paths.join('\n');
}

/** interlaced sine band (the classic banknote border) */
function waveBand(x0, x1, y, amp, { strands = 3, period = 22, color = NOTE, width = 0.7, opacity = 0.8 } = {}) {
  const out = [];
  for (let s = 0; s < strands; s++) {
    const ph = (s / strands) * Math.PI * 2;
    const pts = [];
    for (let x = x0; x <= x1; x += 2) pts.push(`${x},${(y + Math.sin((x / period) * Math.PI * 2 + ph) * amp).toFixed(1)}`);
    out.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`);
  }
  return out.join('');
}
function waveBandV(y0, y1, x, amp, o = {}) {
  const { strands = 3, period = 22, color = NOTE, width = 0.7, opacity = 0.8 } = o;
  const out = [];
  for (let s = 0; s < strands; s++) {
    const ph = (s / strands) * Math.PI * 2;
    const pts = [];
    for (let y = y0; y <= y1; y += 2) pts.push(`${(x + Math.sin((y / period) * Math.PI * 2 + ph) * amp).toFixed(1)},${y}`);
    out.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`);
  }
  return out.join('');
}

function sunburst(cx, cy, r0, r1, n, { color = NOTE, opacity = 0.18, width = 0.8 } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    s += `<line x1="${(cx + Math.cos(a) * r0).toFixed(1)}" y1="${(cy + Math.sin(a) * r0).toFixed(1)}" x2="${(cx + Math.cos(a) * r1).toFixed(1)}" y2="${(cy + Math.sin(a) * r1).toFixed(1)}"/>`;
  }
  return `<g stroke="${color}" stroke-width="${width}" opacity="${opacity}">${s}</g>`;
}

function paperDefs(id, W, H) {
  return `<defs>
  <linearGradient id="${id}-paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PAPER_A}"/><stop offset=".55" stop-color="#e3eadf"/><stop offset="1" stop-color="${PAPER_B}"/></linearGradient>
  <pattern id="${id}-lines" width="6" height="3" patternUnits="userSpaceOnUse"><line x1="0" y1="1.5" x2="6" y2="1.5" stroke="${NOTE}" stroke-width=".5" opacity=".13"/></pattern>
  <radialGradient id="${id}-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fbfdf9" stop-opacity=".95"/><stop offset=".7" stop-color="#fbfdf9" stop-opacity=".35"/><stop offset="1" stop-color="#fbfdf9" stop-opacity="0"/></radialGradient>
  <clipPath id="${id}-clip"><rect width="${W}" height="${H}" rx="22"/></clipPath>
</defs>`;
}

function frame(W, H) {
  return `
<rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="12" fill="none" stroke="${INK}" stroke-width="2.2"/>
<rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="6" fill="none" stroke="${INK}" stroke-width=".9"/>
${waveBand(40, W - 40, 25, 4.5)}${waveBand(40, W - 40, H - 25, 4.5)}
${waveBandV(40, H - 40, 25, 4.5)}${waveBandV(40, H - 40, W - 25, 4.5)}`;
}

function corner(cx, cy, label) {
  return `<g>
  <circle cx="${cx}" cy="${cy}" r="50" fill="${PAPER_A}" stroke="${INK}" stroke-width="1.6"/>
  ${rosette(cx, cy, 46, { layers: 2, lobes: 19, seed: 5, opacity: 0.5, width: 0.5 })}
  <circle cx="${cx}" cy="${cy}" r="30" fill="${PAPER_A}" stroke="${INK}" stroke-width=".9"/>
  ${label ? word('n1337', cx, cy + 15, { scale: 0.62, align: 'middle', fill: INK }) : `<path d="M${cx} ${cy - 16} L${cx + 15} ${cy + 11} L${cx - 15} ${cy + 11} Z" fill="none" stroke="${INK}" stroke-width="2"/><circle cx="${cx}" cy="${cy + 3}" r="4" fill="${NOTE}"/>`}
</g>`;
}

function contribThread(x, y, rows, cols, cell, gap, rnd) {
  let s = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = rnd();
    const lvl = v < 0.22 ? 0 : v < 0.45 ? 1 : v < 0.68 ? 2 : v < 0.88 ? 3 : 4;
    const tw = lvl === 4 && rnd() < 0.3 ? `<animate attributeName="opacity" values="1;.35;1" dur="${(2 + rnd() * 3).toFixed(1)}s" repeatCount="indefinite"/>` : '';
    s += `<rect x="${(x + c * (cell + gap)).toFixed(1)}" y="${(y + r * (cell + gap)).toFixed(1)}" width="${cell}" height="${cell}" rx="1.6" fill="${GREENS[lvl]}">${tw}</rect>`;
  }
  return s;
}

module.exports = function noteArt(out, spiderGroup, rnd) {
  /* ── the banner: The Night Note ── */
  {
    const W = 1280, H = 560;
    const ex = 935, ey = 262; // the eye
    const sc = 1.0;
    const sp = spiderGroup({ id: 'nb', animated: true });
    out('banner.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="PRovidence: the night note. Eight legs. One eye that never closes. In repro we trust.">
<style>
@keyframes nb-leg{from{transform:rotate(-2.5deg)}to{transform:rotate(2.5deg)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes spinr{to{transform:rotate(-360deg)}}
.ro1{transform-origin:${ex}px ${ey}px;animation:spin 140s linear infinite}
.ro2{transform-origin:${ex}px ${ey}px;animation:spinr 200s linear infinite}
</style>
${paperDefs('nb', W, H)}
<g clip-path="url(#nb-clip)">
<rect width="${W}" height="${H}" fill="url(#nb-paper)"/>
<rect width="${W}" height="${H}" fill="url(#nb-lines)"/>
${frame(W, H)}
<g class="ro1">${rosette(ex, ey, 232, { layers: 4, lobes: 37, seed: 9, opacity: 0.42, width: 0.55 })}</g>
<g class="ro2">${rosette(ex, ey, 150, { layers: 3, lobes: 23, seed: 6, opacity: 0.35, width: 0.5 })}</g>
${sunburst(ex, ey, 70, 250, 120, { opacity: 0.12 })}
<circle cx="${ex}" cy="${ey}" r="205" fill="url(#nb-glow)"/>
<circle cx="${ex}" cy="${ey}" r="238" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".55"/>
<circle cx="${ex}" cy="${ey}" r="244" fill="none" stroke="${INK}" stroke-width=".6" opacity=".45" stroke-dasharray="2 3"/>

<!-- security thread: a contribution graph, printed sideways -->
<rect x="614" y="34" width="56" height="${H - 68}" fill="${PAPER_A}" opacity=".7"/>
<g>${contribThread(620, 44, 53, 6, 6.2, 2.4, rnd)}</g>
<line x1="613" y1="34" x2="613" y2="${H - 34}" stroke="${INK}" stroke-width=".7" opacity=".6"/>
<line x1="671" y1="34" x2="671" y2="${H - 34}" stroke="${INK}" stroke-width=".7" opacity=".6"/>

<!-- left: the face value -->
${word('serial', 82, 98, { fill: SEAL, scale: 1 })}
${word('night', 590, 96, { fill: NOTE, scale: 0.95, align: 'end' })}
${word('title', 76, 246, { scale: 0.75, fill: INK })}
<line x1="80" y1="276" x2="592" y2="276" stroke="${INK}" stroke-width="1.4"/>
<line x1="80" y1="281" x2="592" y2="281" stroke="${INK}" stroke-width=".5"/>
${word('tagline', 80, 322, { scale: 1.0, fill: INK })}
<g transform="translate(80 368)">
  <rect width="512" height="44" rx="22" fill="none" stroke="${NOTE}" stroke-width="1.2"/>
  <rect x="4" y="4" width="504" height="36" rx="18" fill="none" stroke="${NOTE}" stroke-width=".5"/>
  ${word('trust', 256, 30, { align: 'middle', fill: NOTE, scale: 0.92 })}
</g>
${word('eight', 186, 468, { fill: INK, opacity: 0.75 })}
<circle cx="337" cy="463" r="2.2" fill="${SEAL}"/>
${word('one', 348, 468, { fill: INK, opacity: 0.75 })}
${corner(110, H - 98, true)}

<!-- right: the portrait -->
<g transform="translate(${ex - 200 * sc} ${ey - 150 * sc}) scale(${sc})">${sp}</g>
<path d="M ${ex - 150} 455 Q ${ex} 432 ${ex + 150} 455 L ${ex + 138} 488 Q ${ex} 466 ${ex - 138} 488 Z" fill="${PAPER_A}" stroke="${INK}" stroke-width="1.6"/>
<path d="M ${ex - 150} 455 L ${ex - 176} 462 L ${ex - 160} 476 L ${ex - 180} 492 L ${ex - 138} 488" fill="${PAPER_B}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M ${ex + 150} 455 L ${ex + 176} 462 L ${ex + 160} 476 L ${ex + 180} 492 L ${ex + 138} 488" fill="${PAPER_B}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
${word('annuit', ex, 476, { align: 'middle', fill: INK, scale: 0.95 })}
${corner(W - 110, 98, true)}
${word('serial', W - 74, H - 58, { fill: SEAL, align: 'end' })}
</g>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="22" fill="none" stroke="${INK}" stroke-width="2"/>
</svg>`);
  }

  /* ── the safety web, engraved ── */
  {
    const W = 1200, H = 660;
    const rules = [
      ['never push to main', 'there is no push code at all'],
      ['never touch secrets', '.env · *.pem · id_rsa refuse writes'],
      ['never delete files', 'the only write is "rewrite contents"'],
      ['never rewrite history', 'no git write commands exist'],
      ['reproduce before fix', 'no repro, no touch'],
      ['ask before merge', 'dry run unless you say --apply'],
    ];
    const cx = 600, cy = 330, R = 200;
    let web = '';
    for (let ring = 1; ring <= 5; ring++) {
      const r = (R * ring) / 5;
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const seg = (i % 10) / 10, sag = Math.sin(seg * Math.PI) * r * 0.07;
        pts.push(`${(cx + (r - sag) * Math.cos(a)).toFixed(1)},${(cy + (r - sag) * Math.sin(a)).toFixed(1)}`);
      }
      web += `<polyline points="${pts.join(' ')}" fill="none" stroke="${INK}" stroke-width="${ring === 5 ? 1.6 : 0.9}" opacity=".75"/>`;
    }
    const nodes = rules.map(([t, s], i) => {
      const a = (i / rules.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      const lx = cx + (R + 34) * Math.cos(a), ly = cy + (R + 34) * Math.sin(a);
      const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
      const dy = Math.abs(Math.cos(a)) < 0.2 ? (Math.sin(a) < 0 ? -18 : 14) : 0;
      return `<line x1="${cx}" y1="${cy}" x2="${(cx + (R + 12) * Math.cos(a)).toFixed(1)}" y2="${(cy + (R + 12) * Math.sin(a)).toFixed(1)}" stroke="${INK}" stroke-width="1" opacity=".8"/>
<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${PAPER_A}" stroke="${SEAL}" stroke-width="2.5"/>
<text x="${lx.toFixed(1)}" y="${(ly - 2 + dy).toFixed(1)}" text-anchor="${anchor}" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="20" fill="${INK}">${t}</text>
<text x="${lx.toFixed(1)}" y="${(ly + 18 + dy).toFixed(1)}" text-anchor="${anchor}" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="12.5" fill="${NOTE}">${s}</text>`;
    });
    const sp = spiderGroup({ id: 'sw', animated: true });
    out('safety-web.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="The safety web: six hard limits PRovidence can never override">
<style>@keyframes sw-leg{from{transform:rotate(-2.5deg)}to{transform:rotate(2.5deg)}}</style>
${paperDefs('sw', W, H)}
<g clip-path="url(#sw-clip)">
<rect width="${W}" height="${H}" fill="url(#sw-paper)"/>
<rect width="${W}" height="${H}" fill="url(#sw-lines)"/>
${frame(W, H)}
${rosette(cx, cy, 130, { layers: 3, lobes: 29, seed: 8, opacity: 0.3, width: 0.5 })}
${web}${nodes.join('\n')}
<g transform="translate(${cx - 200 * 0.5} ${cy - 150 * 0.5}) scale(.5)">${sp}</g>
</g>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="22" fill="none" stroke="${INK}" stroke-width="2"/>
</svg>`);
  }
};

/* web-only pieces for the website */
module.exports.webAssets = function webAssets(outWeb) {
  const S = 520, c = S / 2;
  outWeb('rosette.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<style>@keyframes spin{to{transform:rotate(360deg)}}@keyframes spinr{to{transform:rotate(-360deg)}}.a{transform-origin:${c}px ${c}px;animation:spin 160s linear infinite}.b{transform-origin:${c}px ${c}px;animation:spinr 220s linear infinite}</style>
<g class="a">${rosette(c, c, 248, { layers: 4, lobes: 37, seed: 9, opacity: 0.5, width: 0.6 })}</g>
<g class="b">${rosette(c, c, 160, { layers: 3, lobes: 23, seed: 6, opacity: 0.42, width: 0.55 })}</g>
${sunburst(c, c, 60, 255, 144, { opacity: 0.14 })}
<circle cx="${c}" cy="${c}" r="254" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".6"/>
<circle cx="${c}" cy="${c}" r="259" fill="none" stroke="${INK}" stroke-width=".7" opacity=".45" stroke-dasharray="2 3"/>
</svg>`);
  outWeb('wave.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 14" width="44" height="14">${waveBand(0, 44, 7, 4.2, { period: 22, width: 0.8 })}</svg>`);
};
