'use strict';
const { RULES } = require('./safety');
const { hunters } = require('./hunt');

const COVERED = new Set(['JavaScript', 'TypeScript', 'JSON', 'Markdown']);

/** The things PRovidence knows it did not look at. Honesty is a feature. */
function blindSpots(map, summary, findings) {
  const spots = [];
  const by = {};
  for (const s of map.skipped) by[s.reason.split(' ')[0]] = (by[s.reason.split(' ')[0]] || 0) + 1;
  for (const [reason, n] of Object.entries(by)) spots.push(`${n} path(s) skipped: ${reason}`);
  const shallow = summary.languages.filter((l) => !COVERED.has(l.lang) && !['SVG', 'YAML', 'HTML', 'CSS'].includes(l.lang));
  if (shallow.length) spots.push(`only surface checks for ${shallow.map((l) => `${l.lang} (${l.pct}%)`).join(', ')}`);
  const evidence = findings.filter((f) => f.status === 'evidence').length;
  if (evidence) spots.push(`${evidence} finding(s) I could smell but not reproduce`);
  spots.push('I did not run your test suite. Green here ≠ green in CI.');
  spots.push('I read text, not intent. A bug that is "correct code doing the wrong thing" is invisible to me.');
  return spots;
}

function morningReport({ map, summary, findings, fixLog, brain, startedAt }) {
  const fixed = findings.filter((f) => f.status === 'fixed');
  const left = findings.filter((f) => f.status !== 'fixed');
  const sev = (s) => findings.filter((f) => f.severity === s).length;
  const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
  const spots = blindSpots(map, summary, findings);

  const md = `# 🕷 PRovidence · morning report

> ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · night shift took ${secs}s

| crawled | read | lines | findings | fixed | left with evidence |
|---|---|---|---|---|---|
| ${summary.dirs} dirs | ${summary.files.toLocaleString('en-US')} files | ${summary.lines.toLocaleString('en-US')} | ${findings.length} | ${fixed.length} | ${left.length} |

**Severity:** 🔴 ${sev('critical')} critical · 🟠 ${sev('high')} high · 🟡 ${sev('medium')} medium · ⚪ ${sev('low')} low

## Fixed (reproduced → fixed → reproduced again)
${fixed.length ? fixed.map((f) => `- \`${f.id}\` ${f.title} — \`${f.file}:${f.line}\``).join('\n') : '- nothing. either your repo is clean or you ran without `--apply`.'}

## Left for you, with evidence
${left.length ? left.slice(0, 40).map((f) => `- **${f.severity}** \`${f.id}\` ${f.title} — \`${f.file}:${f.line}\`\n  > ${f.evidence.replace(/\n/g, ' ')}`).join('\n') + (left.length > 40 ? `\n- …and ${left.length - 40} more in \`.providence/findings.json\`` : '') : '- none 🎉'}

## Second brain
${brain ? `${brain.notes} notes · ${brain.links} links → \`.providence/brain/PRovidence.md\`` : 'skipped'}

## Safety web (hard limits held tonight)
${RULES.map((r) => `- [x] ${r.text}`).join('\n')}

## What did I not see?
${spots.map((s) => `- ${s}`).join('\n')}

---
<sub>${Object.keys(hunters).length} hunters · every fix reproduced first · ${fixLog.filter((l) => l.result === 'rolled-back').length} rollbacks</sub>
`;
  return { md, spots, fixed, left };
}

module.exports = { morningReport, blindSpots };
