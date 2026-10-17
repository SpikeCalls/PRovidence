'use strict';
/**
 * The safety web. Hard limits, enforced in code — not in a prompt.
 * Nothing in PRovidence can write to disk without passing through `guard()`.
 */
const path = require('path');
const { execFileSync } = require('child_process');

const PROTECTED_BRANCHES = ['main', 'master', 'trunk', 'production', 'release'];
const SECRET_FILES = [/(^|\/)\.env(\..*)?$/, /\.pem$/, /\.key$/, /(^|\/)id_(rsa|ed25519|ecdsa)(\.pub)?$/, /\.p12$/, /\.pfx$/, /(^|\/)\.npmrc$/, /(^|\/)credentials(\.json)?$/];

const RULES = [
  { id: 'never-push-main', text: 'never push to main directly', enforced: 'PRovidence has no push code at all; --apply refuses on protected branches' },
  { id: 'never-touch-secrets', text: 'secrets, credentials, billing: hands off', enforced: 'writes to .env / *.pem / id_rsa / credentials are refused' },
  { id: 'never-delete', text: 'never delete files', enforced: 'the only write primitive is "rewrite file contents"' },
  { id: 'never-rewrite-history', text: 'never rewrite history', enforced: 'no git write commands are ever executed' },
  { id: 'repro-first', text: 'reproduce before fix', enforced: 'a fix is only applied to a finding whose check fails right now' },
  { id: 'verify-after', text: 'reproduce again after fix', enforced: 'if the check still fails, the original file is restored' },
  { id: 'operator-approval', text: 'operator approval to merge', enforced: 'dry-run by default; --apply is your approval' },
];

function currentBranch(root) {
  try {
    return execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch { return null; }
}

class SafetyWebError extends Error {
  constructor(rule, detail) { super(`🕸  safety web: ${rule} — ${detail}`); this.rule = rule; }
}

/** Throws unless writing `file` inside `root` is allowed. */
function guard(root, file, { allowProtectedBranch = false } = {}) {
  const rel = path.relative(root, path.resolve(root, file)).split(path.sep).join('/');
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new SafetyWebError('never-escape-repo', `${file} is outside the repo`);
  if (rel.startsWith('.git/') || rel === '.git') throw new SafetyWebError('never-rewrite-history', rel);
  if (SECRET_FILES.some((re) => re.test(rel))) throw new SafetyWebError('never-touch-secrets', rel);
  const branch = currentBranch(root);
  if (branch && PROTECTED_BRANCHES.includes(branch) && !allowProtectedBranch) {
    throw new SafetyWebError('never-push-main', `you are on "${branch}". Run: git switch -c night-shift/${new Date().toISOString().slice(0, 10)}`);
  }
  return rel;
}

module.exports = { RULES, guard, currentBranch, SafetyWebError, PROTECTED_BRANCHES, SECRET_FILES };
