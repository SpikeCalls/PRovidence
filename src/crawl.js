'use strict';
const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set([
  '.git', 'node_modules', '.providence', 'dist', 'build', 'out', 'coverage',
  'vendor', '.next', '.nuxt', 'target', '__pycache__', '.venv', 'venv', '.cache',
]);
const MAX_BYTES = 1024 * 1024;

const LANG = {
  '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.jsx': 'JavaScript',
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.py': 'Python', '.rs': 'Rust', '.go': 'Go',
  '.rb': 'Ruby', '.java': 'Java', '.kt': 'Kotlin', '.swift': 'Swift', '.c': 'C', '.h': 'C',
  '.cpp': 'C++', '.cc': 'C++', '.hpp': 'C++', '.cs': 'C#', '.php': 'PHP', '.sh': 'Shell',
  '.css': 'CSS', '.scss': 'CSS', '.html': 'HTML', '.vue': 'Vue', '.svelte': 'Svelte',
  '.md': 'Markdown', '.json': 'JSON', '.yml': 'YAML', '.yaml': 'YAML', '.toml': 'TOML',
  '.sql': 'SQL', '.lua': 'Lua', '.dart': 'Dart', '.svg': 'SVG',
};

function isBinary(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

/**
 * Walk a repo and build its map. Never writes anything.
 * @returns {{root:string, files:Array<{path:string, ext:string, lang:string|null, bytes:number, lines:number, text:string}>, skipped:Array<{path:string, reason:string}>, languages:Record<string,number>, dirs:number}}
 */
function crawl(root) {
  root = path.resolve(root);
  const files = [];
  const skipped = [];
  let dirs = 0;

  (function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) {
      skipped.push({ path: path.relative(root, dir) || '.', reason: `unreadable: ${e.code}` });
      return;
    }
    dirs++;
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (ent.isSymbolicLink()) { skipped.push({ path: rel, reason: 'symlink' }); continue; }
      if (ent.isDirectory()) {
        if (IGNORE_DIRS.has(ent.name)) { skipped.push({ path: rel + '/', reason: 'ignored dir' }); continue; }
        walk(abs);
        continue;
      }
      if (!ent.isFile()) continue;
      const stat = fs.statSync(abs);
      if (stat.size > MAX_BYTES) { skipped.push({ path: rel, reason: `too big (${(stat.size / 1048576).toFixed(1)} MB)` }); continue; }
      const buf = fs.readFileSync(abs);
      if (isBinary(buf)) { skipped.push({ path: rel, reason: 'binary' }); continue; }
      const text = buf.toString('utf8');
      const ext = path.extname(ent.name).toLowerCase();
      files.push({
        path: rel,
        ext,
        lang: LANG[ext] || null,
        bytes: stat.size,
        lines: text.length ? text.split('\n').length : 0,
        text,
      });
    }
  })(root);

  const languages = {};
  for (const f of files) if (f.lang) languages[f.lang] = (languages[f.lang] || 0) + f.lines;
  return { root, files, skipped, languages, dirs };
}

/** Serializable summary (no file contents). */
function summarize(map) {
  const total = map.files.reduce((s, f) => s + f.lines, 0);
  const langs = Object.entries(map.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, lines]) => ({ lang, lines, pct: total ? +(100 * lines / total).toFixed(1) : 0 }));
  const modules = {};
  for (const f of map.files) {
    const top = f.path.includes('/') ? f.path.split('/')[0] + '/' : '(root)';
    modules[top] = (modules[top] || 0) + 1;
  }
  return {
    root: map.root,
    files: map.files.length,
    lines: total,
    dirs: map.dirs,
    languages: langs,
    modules,
    biggest: [...map.files].sort((a, b) => b.lines - a.lines).slice(0, 5).map((f) => ({ path: f.path, lines: f.lines })),
    skipped: map.skipped.length,
  };
}

module.exports = { crawl, summarize, IGNORE_DIRS, MAX_BYTES };
