#!/usr/bin/env node
/* Convert Illustrator SVG exports into SPEC//FORGE symbols and merge them into
   spec-forge-symbols.json.
   Handles what these exports actually use: <style> class fills, class and
   group opacity, transforms, and rect/polygon/line primitives. Drops artboard
   frames and degenerate paths.

   Merges by id, so updating one symbol doesn't require re-passing the rest.

   usage: node tools/svg2sym.mjs <id>=<file.svg> [...] */
import fs from 'node:fs';
import path from 'node:path';

const LIB = path.join(import.meta.dirname, '..', 'spec-forge-symbols.json');

const num = v => parseFloat(v || 0);

/* ---- <style> block: class -> declarations (later rules win, like CSS) ---- */
function parseStyles(svg) {
  const map = {};
  const css = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
    for (const sel of m[1].split(',').map(s => s.trim())) {
      if (!sel.startsWith('.')) continue;
      const c = sel.slice(1);
      map[c] = { ...(map[c] || {}), ...decls };
    }
  }
  return map;
}

const parseAttrs = raw => {
  const a = {};
  for (const m of raw.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) a[m[1]] = m[2];
  return a;
};

/* ---- primitives -> path data ---- */
function toPath(tag, a) {
  if (tag === 'path') return a.d || null;
  if (tag === 'line') return `M${num(a.x1)},${num(a.y1)}L${num(a.x2)},${num(a.y2)}`;
  if (tag === 'rect') {
    const x = num(a.x), y = num(a.y), w = num(a.width), h = num(a.height);
    if (!w || !h) return null;
    return `M${x},${y}h${w}v${h}h${-w}Z`;
  }
  if (tag === 'circle') { const r = num(a.r); if (!r) return null;
    return `M${num(a.cx) - r},${num(a.cy)}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`; }
  if (tag === 'ellipse') { const rx = num(a.rx), ry = num(a.ry); if (!rx || !ry) return null;
    return `M${num(a.cx) - rx},${num(a.cy)}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 ${-rx * 2},0`; }
  if (tag === 'polygon' || tag === 'polyline') {
    const p = (a.points || '').trim().split(/[\s,]+/).map(Number);
    if (p.length < 4) return null;
    let d = '';
    for (let i = 0; i + 1 < p.length; i += 2) d += (i ? 'L' : 'M') + p[i] + ',' + p[i + 1];
    return d + (tag === 'polygon' ? 'Z' : '');
  }
  return null;
}

const SHAPES = ['path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline'];
const lum = hex => {
  const m = /^#?([\da-f]{6})$/i.exec((hex || '').trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255;
};

function convert(file) {
  const svg = fs.readFileSync(file, 'utf8');
  const styles = parseStyles(svg);

  const vbRaw = /viewBox\s*=\s*"([^"]+)"/.exec(svg);
  const vb = vbRaw ? vbRaw[1].trim().split(/[\s,]+/).map(Number) : [0, 0, 24, 24];
  const vbox = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };

  // opacity and transform are inherited from ancestor <g>s — track a stack
  const stack = [{ op: 1, tf: [] }];
  const paths = [];
  let dropped = 0, degenerate = 0;

  for (const m of svg.matchAll(/<(\/?)([\w:-]+)((?:"[^"]*"|[^>"])*?)(\/?)>/g)) {
    const [, close, tag, attrsRaw, selfClose] = m;
    if (close) { if (tag === 'g') stack.pop(); continue; }
    if (tag === 'style' || tag === 'defs' || tag === 'desc') continue;

    const a = parseAttrs(attrsRaw);
    const st = a.class ? (styles[a.class] || {}) : {};
    const own = a.opacity !== undefined ? parseFloat(a.opacity)
              : st.opacity !== undefined ? parseFloat(st.opacity) : 1;
    const top = stack[stack.length - 1];

    if (tag === 'g') {
      if (!selfClose) stack.push({ op: top.op * own, tf: a.transform ? [...top.tf, a.transform] : top.tf });
      continue;
    }
    if (!SHAPES.includes(tag)) continue;

    // artboard frame: a rect matching the viewBox bounds is not artwork
    if (tag === 'rect') {
      const tol = Math.max(2, vbox.w * 0.02);
      const near = (p, q) => Math.abs(p - q) <= tol;
      if (near(num(a.width), vbox.w) && near(num(a.height), vbox.h) &&
          near(num(a.x), vbox.x) && near(num(a.y), vbox.y)) { dropped++; continue; }
    }

    const d = toPath(tag, a);
    if (!d) continue;
    // a moveto with no drawing command renders nothing — Illustrator leaves these behind
    if (!/[LlHhVvCcSsQqTtAaZz]/.test(d)) { degenerate++; continue; }

    const fill = a.fill ?? st.fill;                       // undefined => SVG default black
    const stroke = a.stroke ?? st.stroke;
    const open = tag === 'line' || tag === 'polyline';
    const filled = !open && fill !== 'none';
    const stroked = !!stroke && stroke !== 'none';
    const tfs = a.transform ? [...top.tf, a.transform] : top.tf;

    paths.push({
      d,
      filled,
      stroked,
      tone: filled && lum(fill) > 0.72 ? 'bg' : 'ink',
      rule: (a['fill-rule'] ?? st['fill-rule']) || 'nonzero',
      op: +(top.op * own).toFixed(3),
      tf: tfs.join(' '),
    });
  }
  return { vbox, paths, dropped, degenerate };
}

/* ---- strip defaults so the JSON stays readable ---- */
const slim = p => {
  const o = { d: p.d };
  if (p.filled) o.filled = 1;
  if (p.stroked) o.stroked = 1;
  if (p.tone !== 'ink') o.tone = p.tone;
  if (p.rule !== 'nonzero') o.rule = p.rule;
  if (p.op !== 1) o.op = p.op;
  if (p.tf) o.tf = p.tf;
  return o;
};

const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node tools/svg2sym.mjs <id>=<file.svg> ...'); process.exit(1); }

/* Merge into the existing library rather than replacing it — updating one
   symbol shouldn't require re-passing every other SVG. */
let lib = [];
if (fs.existsSync(LIB)) lib = JSON.parse(fs.readFileSync(LIB, 'utf8'));

for (const arg of args) {
  const i = arg.indexOf('=');
  const id = arg.slice(0, i), file = arg.slice(i + 1);
  const s = convert(file);
  const a = s.vbox.w / s.vbox.h;
  const role = a > 1.8 ? (s.paths.length > 24 ? 'panel' : 'mark')
             : a < 0.55 ? 'vert'
             : s.paths.length > 24 ? 'block' : 'icon';
  console.log(`${id.padEnd(14)} ${String(s.paths.length).padStart(4)} paths  aspect ${a.toFixed(2).padStart(5)}  -> ${role}` +
    (s.dropped ? `  (dropped ${s.dropped} artboard rect)` : '') +
    (s.degenerate ? `  (dropped ${s.degenerate} empty path)` : '') +
    (s.paths.some(p => p.op !== 1) ? `  [opacity layers]` : '') +
    (s.paths.some(p => p.tf) ? `  [transforms]` : ''));

  const entry = { id, name: id.replace(/-/g, ' '), vbox: s.vbox, paths: s.paths.map(slim) };
  const at = lib.findIndex(e => e.id === id);
  if (at >= 0) { lib[at] = entry; console.log(`${''.padEnd(14)} ↳ replaced existing`); }
  else lib.push(entry);
}

fs.writeFileSync(LIB, JSON.stringify(lib, null, 1) + '\n');
console.log(`\n${lib.length} symbols in ${path.basename(LIB)} (${(fs.statSync(LIB).size / 1024).toFixed(1)} KB)`);
