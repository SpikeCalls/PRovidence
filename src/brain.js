'use strict';
/**
 * The second brain. Four legs code, the other four farm this.
 * Every finding becomes a note, every note links to its file and module,
 * and the whole thing opens as a graph in Obsidian (or any [[wikilink]] tool).
 */
const fs = require('fs');
const path = require('path');

const slug = (s) => s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'root';

function buildBrain(root, summary, findings, { outDir = '.providence/brain' } = {}) {
  const dir = path.join(root, outDir);
  fs.mkdirSync(path.join(dir, 'findings'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'files'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'modules'), { recursive: true });

  const nodes = new Map();
  const links = [];
  const node = (id, group, label) => { if (!nodes.has(id)) nodes.set(id, { id, group, label }); return id; };
  const link = (a, b) => links.push({ source: a, target: b });

  const hub = node('PRovidence', 'hub', 'PRovidence');
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }

  // modules
  for (const [mod, count] of Object.entries(summary.modules)) {
    const id = node(`module:${mod}`, 'module', mod);
    link(hub, id);
    fs.writeFileSync(path.join(dir, 'modules', slug(mod) + '.md'),
      `# ${mod}\n\n- files: ${count}\n- part of [[PRovidence]]\n\n## Files with findings\n${[...byFile.keys()].filter((p) => (p.includes('/') ? p.split('/')[0] + '/' : '(root)') === mod).map((p) => `- [[${slug(p)}]]`).join('\n') || '- none. clean web.'}\n`);
  }

  // files + findings
  for (const [file, fs_] of byFile) {
    const mod = file.includes('/') ? file.split('/')[0] + '/' : '(root)';
    const fid = node(`file:${file}`, 'file', file);
    link(`module:${mod}`, fid);
    fs.writeFileSync(path.join(dir, 'files', slug(file) + '.md'),
      `# ${file}\n\nmodule: [[${slug(mod)}]]\n\n## Findings\n${fs_.map((f) => `- [[${f.id}]] ${f.severity} · ${f.title} (line ${f.line})`).join('\n')}\n`);
    for (const f of fs_) {
      const nid = node(`finding:${f.id}`, f.status === 'fixed' ? 'fixed' : f.severity, f.title);
      link(fid, nid);
      fs.writeFileSync(path.join(dir, 'findings', f.id + '.md'),
        `---\n${Object.entries(f).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n# ${f.title}\n\nfile: [[${slug(f.file)}]] · line ${f.line}\n\n\`\`\`\n${f.evidence}\n\`\`\`\n\n## Fix plan\n${f.fix_plan.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`);
    }
  }

  const index = `# PRovidence · second brain\n\n> ${summary.files} files · ${summary.lines.toLocaleString('en-US')} lines · ${findings.length} findings\n\n## Modules\n${Object.keys(summary.modules).map((m) => `- [[${slug(m)}]]`).join('\n')}\n\n## Languages\n${summary.languages.map((l) => `- ${l.lang}: ${l.pct}%`).join('\n')}\n`;
  fs.writeFileSync(path.join(dir, 'PRovidence.md'), index);

  const graph = { nodes: [...nodes.values()], links };
  fs.writeFileSync(path.join(dir, 'graph.json'), JSON.stringify(graph, null, 2));
  return { dir, notes: nodes.size, links: links.length, graph };
}

module.exports = { buildBrain, slug };
