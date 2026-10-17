'use strict';
const fs = require('fs');
const path = require('path');
const { reproduce } = require('./hunt');
const { guard } = require('./safety');

const FIXERS = {
  'trailing-whitespace': (t) => t.replace(/[ \t]+(\r?)$/gm, '$1'),
  'missing-final-newline': (t) => (t.endsWith('\n') ? t : t + '\n'),
};

/**
 * Reproduce → fix → reproduce again. Dry-run unless `apply`.
 * Findings that are not mechanically fixable are left with their evidence.
 */
function fix(root, findings, { apply = false, allowProtectedBranch = false } = {}) {
  const log = [];
  for (const f of findings) {
    if (!f.fixable || !FIXERS[f.kind]) continue;
    // rule: reproduce first
    if (!reproduce(root, f)) { log.push({ id: f.id, file: f.file, result: 'not-reproduced', note: 'could not reproduce, did not touch' }); continue; }
    if (!apply) { f.status = 'reproduced'; log.push({ id: f.id, file: f.file, result: 'would-fix' }); continue; }

    const rel = guard(root, f.file, { allowProtectedBranch });
    const abs = path.join(root, rel);
    const before = fs.readFileSync(abs, 'utf8');
    fs.writeFileSync(abs, FIXERS[f.kind](before));
    // rule: reproduce again — the check must now pass, otherwise roll back
    if (reproduce(root, f)) {
      fs.writeFileSync(abs, before);
      log.push({ id: f.id, file: f.file, result: 'rolled-back', note: 'still reproducible after fix' });
    } else {
      f.status = 'fixed';
      log.push({ id: f.id, file: f.file, result: 'fixed' });
    }
  }
  return log;
}

module.exports = { fix, FIXERS };
