#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { crawl, summarize } = require('../src/crawl');
const { hunt } = require('../src/hunt');
const { fix } = require('../src/fix');
const { buildBrain } = require('../src/brain');
const { morningReport } = require('../src/report');
const { RULES, SafetyWebError } = require('../src/safety');
const { HATS } = require('../src/art');
const a = require('../src/ascii');
const pkg = require('../package.json');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((x) => x.startsWith('--')));
const args = argv.filter((x) => !x.startsWith('--'));
const cmd = args[0] || 'help';
const target = path.resolve(args[1] || '.');
const json = flags.has('--json');
const out = (s = '') => { if (!json) console.log(s); };
const ts = () => a.gray(`[${new Date().toTimeString().slice(0, 8)}]`);
const startedAt = Date.now();

function save(rel, data) {
  const f = path.join(target, '.providence', rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  return path.relative(process.cwd(), f) || f;
}

function doCrawl() {
  out(`${ts()} ${a.bright('eye.open()')} ${a.dim('→ night mode engaged')}`);
  const map = crawl(target);
  const summary = summarize(map);
  out(`${ts()} ${a.green('crawl')}  ${summary.files.toLocaleString('en-US')} files · ${summary.lines.toLocaleString('en-US')} lines · ${summary.dirs} dirs`);
  out(`${ts()} ${a.green('langs')}  ${summary.languages.slice(0, 5).map((l) => `${l.lang} ${l.pct}%`).join(' · ') || '—'}`);
  return { map, summary };
}

function doHunt(map) {
  const findings = hunt(map);
  const by = (s) => findings.filter((f) => f.status === s).length;
  out(`${ts()} ${a.yellow('hunt')}   ${findings.length} findings · ${by('reproduced')} reproduced · ${by('evidence')} evidence-only`);
  for (const f of findings.slice(0, json ? 0 : 12)) {
    const col = { critical: a.red, high: a.yellow, medium: a.purple, low: a.gray }[f.severity];
    out(`           ${col('●')} ${a.dim(f.id)} ${f.title} ${a.gray(`${f.file}:${f.line}`)}`);
  }
  if (findings.length > 12) out(a.gray(`           …${findings.length - 12} more in .providence/findings.json`));
  return findings;
}

function doFix(findings) {
  const apply = flags.has('--apply');
  const log = fix(target, findings, { apply, allowProtectedBranch: flags.has('--i-am-the-operator') });
  const n = (r) => log.filter((l) => l.result === r).length;
  if (apply) out(`${ts()} ${a.bright('fix')}    ${n('fixed')} fixed · ${n('rolled-back')} rolled back · ${n('not-reproduced')} not reproduced → untouched`);
  else out(`${ts()} ${a.bright('fix')}    ${n('would-fix')} reproduced & safely fixable ${a.dim('(dry run — add --apply to let it weave)')}`);
  return log;
}

function header() {
  out(a.spider(flags.has('--hat') ? argv[argv.indexOf('--hat') + 1] : 'cap'));
  out(`\n  ${a.bold('PRovidence')} ${a.dim('v' + pkg.version)} ${a.gray('· 8 legs · 1 eye that never closes')}\n`);
}

try {
  switch (cmd) {
    case 'crawl': {
      const { summary } = doCrawl();
      out(`${ts()} ${a.dim('saved')}  ${save('map.json', summary)}`);
      if (json) console.log(JSON.stringify(summary, null, 2));
      break;
    }
    case 'hunt': {
      const { map } = doCrawl();
      const findings = doHunt(map);
      out(`${ts()} ${a.dim('saved')}  ${save('findings.json', findings)}`);
      if (json) console.log(JSON.stringify(findings, null, 2));
      process.exitCode = findings.some((f) => f.severity === 'critical') && flags.has('--ci') ? 1 : 0;
      break;
    }
    case 'fix': {
      const { map } = doCrawl();
      const findings = doHunt(map);
      const log = doFix(findings);
      save('findings.json', findings);
      if (json) console.log(JSON.stringify(log, null, 2));
      break;
    }
    case 'brain': {
      const { map, summary } = doCrawl();
      const findings = doHunt(map);
      const b = buildBrain(target, summary, findings);
      out(`${ts()} ${a.purple('brain')}  ${b.notes} notes · ${b.links} links → ${path.relative(process.cwd(), b.dir)}/PRovidence.md`);
      break;
    }
    case 'night':
    case 'report': {
      header();
      const { map, summary } = doCrawl();
      const findings = doHunt(map);
      const fixLog = doFix(findings);
      const brain = buildBrain(target, summary, findings);
      out(`${ts()} ${a.purple('brain')}  ${brain.notes} notes · ${brain.links} links`);
      save('map.json', summary);
      save('findings.json', findings);
      const r = morningReport({ map, summary, findings, fixLog, brain, startedAt });
      const file = save('MORNING.md', r.md);
      out(`${ts()} ${a.green('report')} ${file}`);
      out(`\n  ${a.bold('What did I not see?')}`);
      for (const s of r.spots) out(`  ${a.gray('·')} ${s}`);
      out('');
      if (json) console.log(JSON.stringify({ summary, findings, fixLog }, null, 2));
      if (flags.has('--ci') && findings.some((f) => f.severity === 'critical' && f.status !== 'fixed')) process.exitCode = 1;
      break;
    }
    case 'web':
    case 'rules': {
      out(a.bold('\n  🕸  the safety web — hard limits it can never override\n'));
      for (const r of RULES) out(`  ${a.green('✓')} ${r.text.padEnd(36)} ${a.gray(r.enforced)}`);
      out('');
      break;
    }
    case 'hat':
    case 'hats': {
      const h = args[1];
      if (h && HATS[h]) { out(a.spider(h)); out(`\n  ${a.bold(HATS[h].name)} ${a.gray('— ' + HATS[h].line)}\n`); break; }
      out(a.bold('\n  wardrobe\n'));
      for (const [k, v] of Object.entries(HATS)) if (k !== 'none') out(`  ${a.green(k.padEnd(11))} ${v.name.padEnd(20)} ${a.gray(v.line)}`);
      out(a.gray('\n  try: providence hat crown\n'));
      break;
    }
    case 'version': case '--version': out(pkg.version); break;
    default:
      header();
      out(`  ${a.bold('usage')}  providence <command> [dir] [flags]

  ${a.green('night')}   [dir]   the full shift: crawl → hunt → fix → brain → morning report
  ${a.green('crawl')}   [dir]   map the repo before touching anything
  ${a.green('hunt')}    [dir]   every bug becomes a typed record
  ${a.green('fix')}     [dir]   reproduce → fix → reproduce again ${a.gray('(dry run)')}
  ${a.green('brain')}   [dir]   farm the second brain (Obsidian-ready vault + graph.json)
  ${a.green('rules')}           show the safety web
  ${a.green('hats')}    [name]  the wardrobe

  ${a.bold('flags')}
  --apply              let it weave (write safe fixes). refuses on main.
  --i-am-the-operator  allow --apply on a protected branch
  --ci                 exit 1 if a critical finding is left
  --json               machine output
  --hat <name>         pick the header hat
`);
  }
} catch (e) {
  if (e instanceof SafetyWebError) { console.error(a.red(e.message)); process.exitCode = 2; }
  else throw e;
}
