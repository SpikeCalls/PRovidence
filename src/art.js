"use strict";
/**
 * PRovidence art kit.
 * The Eye of Providence, on eight riveted steel legs. One eye that never closes.
 * Everything in /assets is generated from this file: `npm run art`.
 */

const W = 400;
const H = 320;
const APEX = [200, 50];
const BASE_L = [113, 204];
const BASE_R = [287, 204];
const INK = '#111111';
const STEEL = '#c9c9c9';
const STEEL_HI = '#e4e4e4';
const SHADOW = '#a4a4a4';
const SHADOW_OFF = [10, 11];
const HAT_DY = APEX[1] - 40; // hats were drawn for an apex at y=40

// [hip, knee, foot] for the four RIGHT legs, traced from the reference character; left legs are mirrored.
const RIGHT_LEGS = [
  [[215, 95], [258, 11], [356, 63]],
  [[232, 125], [309, 64], [395, 146]],
  [[240, 155], [334, 127], [383, 218]],
  [[245, 180], [335, 210], [332, 305]],
];

const pt = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function legPaths(prefix, animated) {
  const shadow = [];
  const legsOut = [];
  const sides = [['r', (p) => p], ['l', (p) => [W - p[0], p[1]]]];
  for (const [side, fx] of sides) {
    RIGHT_LEGS.forEach(([hip0, knee0, foot0], i) => {
      const hip = fx(hip0), knee = fx(knee0), foot = fx(foot0);
      const footIn = lerp(foot, knee, 3 / Math.hypot(foot[0] - knee[0], foot[1] - knee[1]));
      const delay = ((i * 0.17 + (side === 'l' ? 0.09 : 0)) % 0.7).toFixed(2);
      const anim = animated
        ? ` style="transform-origin:${hip[0].toFixed(1)}px ${hip[1]}px;animation:${prefix}-leg 1s ease-in-out ${delay}s infinite alternate"`
        : '';
      const line = `${pt(hip)} ${pt(knee)} ${pt(foot)}`;
      shadow.push(`<polyline${anim} points="${line}" fill="none" stroke="${SHADOW}" stroke-width="12.5" stroke-linejoin="round"/>`);
      // rivets: a dot roughly every 24px along both segments
      const dots = (a, b, from, to) => {
        const n = Math.max(1, Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 24));
        return Array.from({ length: n }, (_, k) => lerp(a, b, from + ((to - from) * (k + 0.5)) / n));
      };
      const rivets = [...dots(hip, knee, 0.35, 0.92), ...dots(knee, foot, 0.1, 0.9)]
        .map((r) => `<circle cx="${r[0].toFixed(1)}" cy="${r[1].toFixed(1)}" r="1.8" fill="${INK}"/>`).join('');
      legsOut.push(`<g class="leg"${anim}>
  <polyline points="${line}" fill="none" stroke="${INK}" stroke-width="12.5" stroke-linejoin="round"/>
  <polyline points="${pt(hip)} ${pt(knee)} ${pt(footIn)}" fill="none" stroke="${STEEL}" stroke-width="8" stroke-linejoin="round"/>
  <polyline points="${pt(lerp(hip, knee, 0.04))} ${pt(knee)} ${pt(lerp(footIn, knee, 0.04))}" fill="none" stroke="${STEEL_HI}" stroke-width="2.8" stroke-linejoin="round" transform="translate(-1.2,-1.2)"/>
  ${rivets}
  <circle cx="${knee[0]}" cy="${knee[1]}" r="5.2" fill="#ffffff" stroke="${INK}" stroke-width="2.4"/>
</g>`);
    });
  }
  return { shadow: shadow.join('\n'), legs: legsOut.join('\n') };
}

function legs(prefix, animated) {
  const { shadow, legs: l } = legPaths(prefix, animated);
  return `<g transform="translate(${SHADOW_OFF[0]} ${SHADOW_OFF[1]})" filter="url(#${prefix}-soft)">${shadow}</g>\n${l}`;
}

function body(prefix, { blink = false } = {}) {
  const tri = `${pt(APEX)} ${pt(BASE_R)} ${pt(BASE_L)}`;
  // engraved rays: a fan from under the eye down to the base, and fine lines rising to the apex
  const rays = [];
  for (let x = 118; x <= 282; x += 7.5) rays.push(`<line x1="200" y1="148" x2="${x.toFixed(1)}" y2="200" stroke="#2a2a2a" stroke-width="1.25"/>`);
  for (let x = 170; x <= 230; x += 5) rays.push(`<line x1="200" y1="62" x2="${x}" y2="120" stroke="#2a2a2a" stroke-width="1"/>`);
  // the eye: almond, thick black upper lid, dark lower band, green iris looking left of centre
  const EYE = 'M137 137 Q200 84 263 137 Q200 186 137 137 Z';
  const SCLERA = 'M139 137 Q200 99 261 137 Q200 170 139 137 Z';
  const look = blink
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;12 0;12 0;-6 1;-6 1;0 0" keyTimes="0;.3;.38;.6;.68;.9;1" dur="7s" repeatCount="indefinite"/>`
    : '';
  return `
<g class="body">
  <polygon points="${tri}" fill="${SHADOW}" stroke="${SHADOW}" stroke-width="7" stroke-linejoin="round" transform="translate(${SHADOW_OFF[0]} ${SHADOW_OFF[1]})"/>
  <polygon points="${tri}" fill="url(#${prefix}-shell)" stroke="${INK}" stroke-width="6.5" stroke-linejoin="round"/>
  <clipPath id="${prefix}-in"><polygon points="200,70 128,196 272,196"/></clipPath>
  <clipPath id="${prefix}-sclera"><path d="${SCLERA}"/></clipPath>
  <g clip-path="url(#${prefix}-in)">${rays.join('')}</g>
  <polygon points="200,70 128,196 272,196" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
  <!-- the eye that never closes -->
  <g transform="translate(0 8)">
  <path d="${EYE}" fill="${INK}"/>
  <path d="${SCLERA}" fill="#efefef"/>
  <g clip-path="url(#${prefix}-sclera)"><g>${look}
    <circle cx="187" cy="137" r="20" fill="url(#${prefix}-iris)" stroke="#0a2e10" stroke-width="2.4"/>
    <circle cx="187" cy="137" r="13" fill="none" stroke="#1b5e20" stroke-width="1.1" opacity=".8"/>
    <circle cx="187" cy="137" r="8.2" fill="#070907"/>
    <circle cx="193" cy="131" r="4" fill="#ffffff"/>
  </g></g>
  <path d="M139 137 Q200 172 261 137 Q200 158 139 137 Z" fill="#16241a"/>
  </g>
</g>`;
}

function defs(prefix) {
  return `<defs>
  <linearGradient id="${prefix}-shell" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e6e6e6"/><stop offset="1" stop-color="#cbcbcb"/>
  </linearGradient>
  <filter id="${prefix}-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.1"/></filter>
  <radialGradient id="${prefix}-iris" cx=".62" cy=".32" r=".8">
    <stop offset="0" stop-color="#7fcf7f"/><stop offset=".5" stop-color="#2f8a3b"/><stop offset="1" stop-color="#0f3d14"/>
  </radialGradient>
</defs>`;
}

/* ───────────────────────── hats ─────────────────────────
 * Every hat sits on the apex (200,40). Nine hats: one per leg, plus a spare.
 */
const HATS = {
  none: { name: 'Bare', line: 'Factory settings.', svg: '' },
  cap: {
    name: 'Night-Shift Cap',
    line: 'Backwards. Obviously.',
    svg: `<g>
  <path d="M158 44 Q160 4 200 2 Q240 4 242 44 Z" fill="#238636" stroke="#0e4429" stroke-width="2"/>
  <path d="M170 40 Q200 30 230 40" stroke="#2ea043" stroke-width="2" fill="none"/>
  <path d="M236 40 Q276 36 292 50 Q262 54 236 50 Z" fill="#196c2e" stroke="#0e4429" stroke-width="2"/>
  <circle cx="200" cy="4" r="4" fill="#0e4429"/>
  <text x="200" y="32" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="16" fill="#e6ffe9">PR</text>
</g>`,
  },
  beanie: {
    name: 'Hacker Beanie',
    line: 'Keeps the one eye warm at 3 AM.',
    svg: `<g>
  <path d="M160 48 Q160 0 200 -2 Q240 0 240 48 Z" fill="#1f2937"/>
  <path d="M160 48 Q160 0 200 -2 Q240 0 240 48" fill="none" stroke="#39d353" stroke-width="2" stroke-dasharray="3 5"/>
  <rect x="154" y="38" width="92" height="16" rx="6" fill="#111827" stroke="#39d353" stroke-width="2"/>
  <circle cx="200" cy="-6" r="10" fill="#39d353"/>
  <path d="M176 24 l8 -8 l8 8 l8 -8 l8 8 l8 -8" stroke="#39d353" stroke-width="2" fill="none"/>
</g>`,
  },
  crown: {
    name: 'Merge King',
    line: 'Merged 1,337 PRs. Zero regrets.',
    svg: `<g>
  <path d="M158 48 L162 6 L182 28 L200 0 L218 28 L238 6 L242 48 Z" fill="#f2cc60" stroke="#9e6a03" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="158" y="40" width="84" height="9" fill="#d4a72c" stroke="#9e6a03" stroke-width="2"/>
  <circle cx="200" cy="30" r="5" fill="#39d353" stroke="#0e4429" stroke-width="1.5"/>
  <circle cx="176" cy="40" r="3.5" fill="#a371f7"/><circle cx="224" cy="40" r="3.5" fill="#a371f7"/>
</g>`,
  },
  wizard: {
    name: 'Regex Wizard',
    line: 'Speaks fluent /^(?:[a-z]+)$/.',
    svg: `<g>
  <path d="M150 50 Q200 34 250 50 Q200 62 150 50 Z" fill="#3b2a6b" stroke="#a371f7" stroke-width="2"/>
  <path d="M168 46 L206 -40 Q214 -46 216 -36 L232 46 Z" fill="#4c2889" stroke="#a371f7" stroke-width="2" stroke-linejoin="round"/>
  <path d="M188 2 l4 8 l8 1 l-6 6 l2 8 l-8 -4 l-8 4 l2 -8 l-6 -6 l8 -1 Z" fill="#f2cc60"/>
  <text x="214" y="34" font-family="ui-monospace,Menlo,monospace" font-size="10" fill="#d2a8ff">/.*/</text>
</g>`,
  },
  headphones: {
    name: 'Lo-Fi Mode',
    line: 'Beats to refactor to.',
    svg: `<g>
  <path d="M146 92 Q146 -6 200 -6 Q254 -6 254 92" fill="none" stroke="#30363d" stroke-width="9" stroke-linecap="round"/>
  <path d="M146 92 Q146 -6 200 -6 Q254 -6 254 92" fill="none" stroke="#39d353" stroke-width="2"/>
  <rect x="128" y="74" width="26" height="40" rx="10" fill="#161b22" stroke="#39d353" stroke-width="2.5"/>
  <rect x="246" y="74" width="26" height="40" rx="10" fill="#161b22" stroke="#39d353" stroke-width="2.5"/>
  <path d="M134 94 h4 l3 -7 l4 14 l3 -7 h4" stroke="#7ee787" stroke-width="2" fill="none"/>
</g>`,
  },
  hardhat: {
    name: 'Prod Safety Helmet',
    line: 'Never pushes to main. Ever.',
    svg: `<g>
  <path d="M162 46 Q162 6 200 4 Q238 6 238 46 Z" fill="#f0b72f" stroke="#9e6a03" stroke-width="2.5"/>
  <rect x="150" y="42" width="100" height="10" rx="5" fill="#d29922" stroke="#9e6a03" stroke-width="2"/>
  <rect x="194" y="6" width="12" height="38" rx="4" fill="#e3a21a"/>
  <text x="200" y="34" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="9" fill="#3d2a00">CI</text>
</g>`,
  },
  party: {
    name: 'Ship-It Party Hat',
    line: 'All checks green. Confetti authorized.',
    svg: `<g>
  <path d="M174 46 L200 -30 L226 46 Z" fill="#a371f7" stroke="#6e40c9" stroke-width="2" stroke-linejoin="round"/>
  <path d="M186 12 L214 12 M180 30 L220 30 M192 -6 L208 -6" stroke="#39d353" stroke-width="5"/>
  <circle cx="200" cy="-34" r="7" fill="#f2cc60"/>
  <rect x="150" y="-10" width="5" height="9" fill="#39d353" transform="rotate(25 152 -6)"/>
  <rect x="240" y="0" width="5" height="9" fill="#f2cc60" transform="rotate(-30 242 4)"/>
  <rect x="232" y="-24" width="5" height="9" fill="#ff7b72" transform="rotate(15 234 -20)"/>
</g>`,
  },
  tophat: {
    name: 'The Maintainer',
    line: 'Reviews your PR with a monocle.',
    svg: `<g>
  <ellipse cx="200" cy="46" rx="52" ry="9" fill="#0d1117" stroke="#8b949e" stroke-width="2"/>
  <rect x="172" y="-14" width="56" height="58" rx="4" fill="#161b22" stroke="#8b949e" stroke-width="2"/>
  <rect x="172" y="28" width="56" height="10" fill="#238636"/>
  <circle cx="192" cy="130" r="25" fill="none" stroke="#f2cc60" stroke-width="3"/>
  <path d="M213 142 Q226 170 222 196" stroke="#f2cc60" stroke-width="1.8" fill="none"/>
</g>`,
  },
  grad: {
    name: 'PhD in Bug Hunting',
    line: 'Thesis: "Reproduce first."',
    svg: `<g>
  <path d="M168 34 L168 52 Q200 62 232 52 L232 34 Z" fill="#161b22" stroke="#39d353" stroke-width="2"/>
  <path d="M138 26 L200 2 L262 26 L200 50 Z" fill="#0d1117" stroke="#39d353" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M200 26 L250 34 L252 62" stroke="#f2cc60" stroke-width="2.5" fill="none"/>
  <circle cx="252" cy="66" r="5" fill="#f2cc60"/>
</g>`,
  },
};

/**
 * @param {object} o
 * @param {keyof HATS} [o.hat]
 * @param {boolean} [o.animated]  leg wiggle + blink (CSS/SMIL, renders on GitHub)
 * @param {string} [o.bg]         background fill or 'none'
 * @param {string} [o.id]         unique id prefix when inlining several spiders
 */
function spider({ hat = 'none', animated = false, bg = 'none', id = 'pv', label = true } = {}) {
  const h = HATS[hat] || HATS.none;
  const top = hat === 'none' ? -14 : -50;
  const height = H - top + (label ? 40 : 6);
  const anim = animated
    ? `<style>@keyframes ${id}-leg{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}@keyframes ${id}-bob{from{transform:translateY(0)}to{transform:translateY(-6px)}}.${id}-all{animation:${id}-bob 1.6s ease-in-out infinite alternate}</style>`
    : '';
  const caption = label && hat !== 'none'
    ? `<text x="200" y="${H + 22}" text-anchor="middle" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-weight="700" font-size="20" fill="#39d353">${h.name}</text>
<text x="200" y="${H + 42}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="12" fill="#8b949e">${h.line}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top} ${W} ${height + 8}" width="${W}" height="${height + 8}" role="img" aria-label="PRovidence${hat !== 'none' ? ' wearing ' + h.name : ''}">
${defs(id)}${anim}
${bg !== 'none' ? `<rect x="0" y="${top}" width="${W}" height="${height + 8}" rx="24" fill="${bg}"/>` : ''}
<g class="${id}-all">
${legs(id, animated)}
${body(id, { blink: animated })}
<g transform="translate(0 ${HAT_DY})">${h.svg}</g>
</g>
${caption}
</svg>`;
}

/** Only the inner <g> (no <svg> wrapper) for embedding inside bigger scenes. */
function spiderGroup({ hat = 'none', id = 'pv', animated = false } = {}) {
  const h = HATS[hat] || HATS.none;
  return `${defs(id)}<g>${legs(id, animated)}${body(id, { blink: animated })}<g transform="translate(0 ${HAT_DY})">${h.svg}</g></g>`;
}

module.exports = { spider, spiderGroup, HATS, W, H };
