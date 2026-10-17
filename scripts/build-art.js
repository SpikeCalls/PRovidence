#!/usr/bin/env node
'use strict';
// Regenerates every SVG in /assets and /docs/assets from src/art.js
const fs = require('fs');
const path = require('path');
const { spider, spiderGroup, HATS } = require('../src/art');

const root = path.join(__dirname, '..');
// hats are GitHub-only merch: they go to /assets, never to the website (/docs)
const out = (p, s, { web = !/^hats\/|^hat-wall|^sprites\/(?!none)/.test(p) } = {}) => {
  for (const base of web ? ['assets', 'docs/assets'] : ['assets']) {
    const f = path.join(root, base, p);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, s.trim() + '\n');
  }
};

// deterministic pseudo-random so the art is stable between builds
let seed = 1337;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const GREENS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

/* 1. the hero */
out('providence.svg', spider({ animated: true, id: 'hero', label: false }));

/* 2. a hat for every leg, plus one spare */
const hats = Object.keys(HATS).filter((h) => h !== 'none');
for (const h of hats) out(`hats/${h}.svg`, spider({ hat: h, animated: true, id: h, bg: '#0d1117' }));

/* 2b. game sprites: no background, no caption */
for (const h of Object.keys(HATS)) out(`sprites/${h}.svg`, spider({ hat: h, id: `sp${h}`, label: false }));

/* 4–5. the Night Note banner + the engraved safety web */
require('./note-art')(out, spiderGroup, rnd);
require('./note-art').plates(out, spider, spiderGroup, HATS);
require('./note-art').webAssets((p, svg) => { const f = path.join(root, 'docs/assets', p); fs.writeFileSync(f, svg.trim() + '\n'); });

/* 6. section divider: a strand of silk */
out('silk.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 24" width="1200" height="24"><path d="M0 12 Q150 2 300 12 T600 12 T900 12 T1200 12" fill="none" stroke="#39d353" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="6 6"><animate attributeName="stroke-dashoffset" from="0" to="-48" dur="2s" repeatCount="indefinite"/></path><circle cx="600" cy="12" r="4" fill="#39d353"/></svg>`);

console.log(`🕷  art rebuilt: hero, ${hats.length} hats, banner, anatomy, stamps, safety-web, silk`);
