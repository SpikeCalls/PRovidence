'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pv = require('../src');

// Build a tiny haunted repo. Secrets are assembled at runtime so this file
// never contains a real-looking token.
function haunted() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-'));
  const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(d, p)), { recursive: true }); fs.writeFileSync(path.join(d, p), s); };
  w('src/a.js', 'const x = 1;   \nfunction f(){ try { g() } catch (e) {' + '} }\n');
  w('src/b.js', 'export const y = 2;');
  w('src/c.js', 'function go() {\n  debugger;\n}\n');
  w('bad.json', '{ "a": 1, }');
  w('README.md', '[docs](docs/missing.md) and [ok](src/a.js)\n');
  w('conf.js', ['<'.repeat(7) + ' HEAD', 'a', '='.repeat(7), 'b', '>'.repeat(7) + ' feat', ''].join('\n'));
  w('leak.txt', 'token=' + 'gh' + 'p_' + 'A'.repeat(36) + '\n');
  w('package.json', JSON.stringify({ scripts: { start: 'node server.js' } }));
  w('.env', 'SECRET=1   \n');
  return d;
}

test('crawl maps the repo without writing', () => {
  const d = haunted();
  const before = fs.readdirSync(d).sort().join();
  const map = pv.crawl(d);
  assert.ok(map.files.length >= 8);
  assert.strictEqual(fs.readdirSync(d).sort().join(), before);
  assert.ok(pv.summarize(map).languages.find((l) => l.lang === 'JavaScript'));
});

test('hunt turns every bug into a typed record', () => {
  const findings = pv.hunt(pv.crawl(haunted()));
  const kinds = new Set(findings.map((f) => f.kind));
  for (const k of ['invalid-json', 'conflict-marker', 'leaked-secret', 'broken-link', 'missing-script-target', 'debugger-left', 'swallowed-error', 'trailing-whitespace', 'missing-final-newline']) {
    assert.ok(kinds.has(k), `expected ${k}`);
  }
  for (const f of findings) {
    for (const key of ['id', 'kind', 'title', 'severity', 'confidence', 'file', 'line', 'evidence', 'blast_radius', 'fix_plan', 'fixable', 'status']) assert.ok(key in f, key);
  }
  assert.strictEqual(findings[0].severity, 'critical');
});

test('secrets are redacted in evidence', () => {
  const f = pv.hunt(pv.crawl(haunted())).find((x) => x.kind === 'leaked-secret');
  assert.ok(!f.evidence.includes('A'.repeat(20)));
});

test('dry run touches nothing', () => {
  const d = haunted();
  const src = fs.readFileSync(path.join(d, 'src/a.js'), 'utf8');
  const log = pv.fix(d, pv.hunt(pv.crawl(d)));
  assert.ok(log.some((l) => l.result === 'would-fix'));
  assert.strictEqual(fs.readFileSync(path.join(d, 'src/a.js'), 'utf8'), src);
});

test('apply: reproduce → fix → reproduce again', () => {
  const d = haunted();
  const findings = pv.hunt(pv.crawl(d));
  pv.fix(d, findings, { apply: true });
  assert.strictEqual(fs.readFileSync(path.join(d, 'src/a.js'), 'utf8').split('\n')[0], 'const x = 1;');
  assert.ok(fs.readFileSync(path.join(d, 'src/b.js'), 'utf8').endsWith('\n'));
  assert.ok(findings.filter((f) => f.status === 'fixed').length >= 2);
  // nothing it could not reproduce or fix mechanically was touched
  assert.ok(fs.readFileSync(path.join(d, 'bad.json'), 'utf8').includes(', }'));
});

test('safety web: never touches secrets', () => {
  const d = haunted();
  assert.throws(() => pv.guard(d, '.env'), pv.SafetyWebError);
  assert.throws(() => pv.guard(d, '../outside.js'), pv.SafetyWebError);
  assert.throws(() => pv.guard(d, '.git/config'), pv.SafetyWebError);
  assert.strictEqual(pv.guard(d, 'src/a.js'), 'src/a.js');
});

test('safety web: refuses to weave on main', () => {
  const d = haunted();
  const { execFileSync } = require('child_process');
  try { execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: d }); } catch { return; }
  assert.throws(() => pv.guard(d, 'src/a.js'), /never-push-main/);
  assert.strictEqual(pv.guard(d, 'src/a.js', { allowProtectedBranch: true }), 'src/a.js');
});

test('second brain links findings → files → modules', () => {
  const d = haunted();
  const map = pv.crawl(d);
  const findings = pv.hunt(map);
  const b = pv.buildBrain(d, pv.summarize(map), findings);
  assert.ok(fs.existsSync(path.join(b.dir, 'PRovidence.md')));
  assert.ok(b.graph.links.length >= findings.length);
});

test('morning report asks what it did not see', () => {
  const d = haunted();
  const map = pv.crawl(d);
  const summary = pv.summarize(map);
  const findings = pv.hunt(map);
  const r = pv.morningReport({ map, summary, findings, fixLog: [], brain: null, startedAt: Date.now() });
  assert.match(r.md, /What did I not see\?/);
  assert.ok(r.spots.length >= 2);
});

test('every hat renders', () => {
  for (const h of Object.keys(pv.art.HATS)) assert.match(pv.art.spider({ hat: h }), /^<svg[\s\S]*<\/svg>$/);
});
