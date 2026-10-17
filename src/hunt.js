'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Every bug becomes a typed record. Then a cocoon.
 *
 * @typedef {'critical'|'high'|'medium'|'low'} Severity
 * @typedef {'reproduced'|'evidence'|'fixed'} Status
 *   reproduced → PRovidence re-ran a deterministic check and watched it fail
 *   evidence   → it smells, but it could not be reproduced; left for a human
 *   fixed      → patched, then reproduced again and the check now passes
 *
 * @typedef {object} Finding
 * @property {string}   id           stable hash: same bug → same id every night
 * @property {string}   kind
 * @property {string}   title
 * @property {Severity} severity
 * @property {number}   confidence   0..1
 * @property {string}   file
 * @property {number}   line
 * @property {string}   evidence     the exact thing it saw (secrets redacted)
 * @property {string[]} blast_radius files that could be affected
 * @property {string[]} fix_plan
 * @property {boolean}  fixable      only mechanical, provably-safe fixes are true
 * @property {Status}   status
 */

const CONFLICT = new RegExp('^(' + '<'.repeat(7) + '|' + '='.repeat(7) + '|' + '>'.repeat(7) + ')( |$)');
const NOTE = /(?:\/\/|#|\/\*|<!--|^\s*\*)\s*(TODO|FIXME|HACK|XXX)\b[:\s]?(.*)$/;
const SECRETS = [
  ['GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{36,})\b/],
  ['GitHub fine-grained token', /\b(github_pat_[A-Za-z0-9_]{60,})\b/],
  ['AWS access key', /\b(AKIA[0-9A-Z]{16})\b/],
  ['Private key', /(-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----)/],
  ['Slack token', /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/],
  ['OpenAI-style key', /\b(sk-[A-Za-z0-9]{32,})\b/],
];
const CODE = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);
const WS_EXT = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.rs', '.go', '.rb', '.java', '.c', '.h', '.cpp', '.css', '.scss', '.html', '.json', '.yml', '.yaml', '.toml', '.sh', '.sql']);

const redact = (s) => (s.length <= 8 ? '****' : s.slice(0, 4) + '…' + '*'.repeat(6) + s.slice(-2));
const idOf = (...parts) => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 8);

function rec(o) {
  return {
    id: idOf(o.kind, o.file, o.line, o.key || ''),
    kind: o.kind,
    title: o.title,
    severity: o.severity,
    confidence: o.confidence,
    file: o.file,
    line: o.line,
    evidence: o.evidence,
    blast_radius: o.blast_radius || [o.file],
    fix_plan: o.fix_plan || ['reproduce', 'failing test', 'fix', 'full suite', 'linter'],
    fixable: !!o.fixable,
    status: o.status || 'reproduced',
  };
}

/* ───────────── hunters: each returns Finding[] for one file ───────────── */

const hunters = {
  'invalid-json'(f) {
    if (f.ext !== '.json' || /tsconfig|jsconfig|\.vscode\//.test(f.path)) return [];
    try { JSON.parse(f.text); return []; } catch (e) {
      const m = /position (\d+)/.exec(e.message);
      const line = m ? f.text.slice(0, +m[1]).split('\n').length : 1;
      return [rec({ kind: 'invalid-json', title: 'JSON does not parse', severity: 'high', confidence: 0.99, file: f.path, line, evidence: e.message })];
    }
  },

  'conflict-marker'(f) {
    const out = [];
    f.text.split('\n').forEach((l, i) => {
      if (CONFLICT.test(l) && l.startsWith('<')) {
        out.push(rec({ kind: 'conflict-marker', title: 'Unresolved merge conflict', severity: 'critical', confidence: 1, file: f.path, line: i + 1, evidence: l.slice(0, 60), fix_plan: ['reproduce', 'ask operator which side wins', 'resolve', 'full suite'] }));
      }
    });
    return out;
  },

  'leaked-secret'(f) {
    const out = [];
    f.text.split('\n').forEach((l, i) => {
      for (const [name, re] of SECRETS) {
        const m = re.exec(l);
        if (m) out.push(rec({
          kind: 'leaked-secret', title: `${name} committed to the repo`, severity: 'critical', confidence: 0.9,
          file: f.path, line: i + 1, key: name, evidence: `${name}: ${redact(m[1])}`,
          fix_plan: ['revoke the credential first', 'move it to a secret store', 'purge from history (operator only)'],
        }));
      }
    });
    return out;
  },

  'broken-link'(f, ctx) {
    if (f.ext !== '.md') return [];
    const out = [];
    const re = /\]\(([^)\s#?]+)(?:[#?][^)\s]*)?(?:\s+"[^"]*")?\)/g;
    f.text.split('\n').forEach((l, i) => {
      let m;
      while ((m = re.exec(l))) {
        const target = m[1];
        if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//') || target.startsWith('/')) continue;
        const abs = path.resolve(ctx.root, path.dirname(f.path), decodeURI(target));
        if (!fs.existsSync(abs)) out.push(rec({
          kind: 'broken-link', title: 'Markdown link points at nothing', severity: 'low', confidence: 0.97,
          file: f.path, line: i + 1, key: target, evidence: `→ ${target} (missing)`, fix_plan: ['reproduce', 'find the moved file', 'relink'],
        }));
      }
    });
    return out;
  },

  'missing-script-target'(f, ctx) {
    if (path.basename(f.path) !== 'package.json') return [];
    let pkg; try { pkg = JSON.parse(f.text); } catch { return []; }
    const out = [];
    for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
      const m = /\bnode\s+(?:--[\w-]+\s+)*([\w./-]+\.(?:c|m)?js)\b/.exec(cmd);
      if (m && !fs.existsSync(path.resolve(ctx.root, path.dirname(f.path), m[1]))) {
        out.push(rec({ kind: 'missing-script-target', title: `npm script "${name}" runs a file that does not exist`, severity: 'high', confidence: 0.98, file: f.path, line: f.text.split('\n').findIndex((l) => l.includes(`"${name}"`)) + 1, key: name, evidence: cmd }));
      }
    }
    return out;
  },

  'debugger-left'(f) {
    if (!CODE.has(f.ext)) return [];
    const out = [];
    f.text.split('\n').forEach((l, i) => {
      if (/^\s*debugger;?\s*$/.test(l)) out.push(rec({ kind: 'debugger-left', title: '`debugger` statement shipped', severity: 'medium', confidence: 0.95, file: f.path, line: i + 1, evidence: l.trim() }));
    });
    return out;
  },

  'swallowed-error'(f) {
    if (!CODE.has(f.ext)) return [];
    const out = [];
    const re = /catch\s*(\([^)]*\))?\s*\{\s*\}/g;
    let m;
    while ((m = re.exec(f.text))) {
      out.push(rec({ kind: 'swallowed-error', title: 'Empty catch swallows the error', severity: 'medium', confidence: 0.6, file: f.path, line: f.text.slice(0, m.index).split('\n').length, evidence: m[0], status: 'evidence', fix_plan: ['decide: log, rethrow or document why it is safe'] }));
    }
    return out;
  },

  'note-left'(f) {
    const out = [];
    f.text.split('\n').forEach((l, i) => {
      const m = NOTE.exec(l);
      if (m) out.push(rec({ kind: 'note-left', title: `${m[1]} left in code`, severity: m[1] === 'FIXME' || m[1] === 'HACK' ? 'medium' : 'low', confidence: 0.5, file: f.path, line: i + 1, evidence: l.trim().slice(0, 120), status: 'evidence', fix_plan: ['ask the author what they meant'] }));
    });
    return out;
  },

  'trailing-whitespace'(f) {
    if (!WS_EXT.has(f.ext)) return [];
    const lines = f.text.split('\n').map((l, i) => [l, i + 1]).filter(([l]) => /[ \t]+\r?$/.test(l));
    if (!lines.length) return [];
    return [rec({ kind: 'trailing-whitespace', title: `Trailing whitespace on ${lines.length} line(s)`, severity: 'low', confidence: 1, file: f.path, line: lines[0][1], evidence: `lines ${lines.slice(0, 6).map((x) => x[1]).join(', ')}${lines.length > 6 ? '…' : ''}`, fixable: true, fix_plan: ['reproduce', 'strip', 'reproduce again (must pass)'] })];
  },

  'missing-final-newline'(f) {
    if (!WS_EXT.has(f.ext) || !f.text.length || f.text.endsWith('\n')) return [];
    return [rec({ kind: 'missing-final-newline', title: 'No newline at end of file', severity: 'low', confidence: 1, file: f.path, line: f.lines, evidence: JSON.stringify(f.text.slice(-24)), fixable: true, fix_plan: ['reproduce', 'append \\n', 'reproduce again (must pass)'] })];
  },
};

/** Run every hunter over the map. Read-only. */
function hunt(map, { only } = {}) {
  const ctx = { root: map.root };
  const findings = [];
  for (const f of map.files) {
    for (const [name, h] of Object.entries(hunters)) {
      if (only && !only.includes(name)) continue;
      findings.push(...h(f, ctx));
    }
  }
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);
}

/** Re-run the single hunter that produced a finding against the file on disk. */
function reproduce(root, finding) {
  const abs = path.join(root, finding.file);
  if (!fs.existsSync(abs)) return false;
  const text = fs.readFileSync(abs, 'utf8');
  const f = { path: finding.file, ext: path.extname(abs).toLowerCase(), text, lines: text.split('\n').length };
  return hunters[finding.kind](f, { root }).some((x) => x.kind === finding.kind);
}

module.exports = { hunt, hunters, reproduce, redact, SECRETS };
