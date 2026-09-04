#!/usr/bin/env node
// Bundles the game into one self-contained HTML file (no build tooling, no deps).
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
const order = [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)].map(m => m[1]);
if (!order.length) { console.error('no scripts found in index.html'); process.exit(1); }
const js = order.map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'CHOMPERS';
const favicon = (html.match(/<link rel="icon" href="([^"]*)"/) || [])[1] || '';
const head = `<title>${title}</title>
${favicon ? `<link rel="icon" href="${favicon}">\n` : ''}<style>
${css}</style>`;
const bodyContent = `<div id="wrap"><canvas id="game" width="640" height="360"></canvas></div>
<script>
${js}
</script>
`;
const dest = path.join(ROOT, 'dist');
fs.mkdirSync(dest, { recursive: true });

// 1. standalone page: a complete document you can open from the filesystem
const standalone = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="description" content="Chompers: a pixel-art Everglades crocodile eater roguelike.">
<meta name="theme-color" content="#05090a">
${head}
</head>
<body>
${bodyContent}</body>
</html>
`;
fs.writeFileSync(path.join(dest, 'chompers.html'), standalone);

// 2. artifact fragment: the host supplies doctype/head/body and its own favicon
const artifactHead = `<title>${title}</title>\n<style>\n${css}</style>`;
fs.writeFileSync(path.join(dest, 'chompers.artifact.html'), artifactHead + '\n' + bodyContent);

console.log(`built dist/chompers.html (${(standalone.length / 1024).toFixed(0)} KB) and dist/chompers.artifact.html from ${order.length} modules`);
