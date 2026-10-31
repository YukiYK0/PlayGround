#!/usr/bin/env node
/* Build the single-file game: inline CSS and ordered JS sources. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.resolve(root, 'src');
const order = ['data.js','util.js','world.js','character.js','engine.js','renderer.js','input.js','ui.js','boot.js'];

const template = fs.readFileSync(path.join(src,'template.html'),'utf8');
const css = fs.readFileSync(path.join(src,'style.css'),'utf8');
const js = order.map(file=>{
  const code = fs.readFileSync(path.join(src,file),'utf8');
  return `\n/* ===== ${file} ===== */\n${code}`;
}).join('\n');

if(/<\/script/i.test(js)) throw new Error('A source file contains a literal closing script tag.');
const out = template.replace('/*__CSS__*/', ()=>css).replace('/*__JS__*/', ()=>js);
const target = path.join(root,'index.html');
fs.writeFileSync(target,out);
console.log(`Built ${target} (${(out.length/1024).toFixed(1)} KiB)`);
