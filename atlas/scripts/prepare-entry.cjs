// Keep GitHub Pages at /atlas/ while sharing the same dist assets as Sites.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace('<head>','<head><base href="./dist/">').replace('class="brand" href="./"','class="brand" href="../"');
fs.writeFileSync(path.join(root,'index.html'),html);
if(fs.existsSync(path.join(root,'dist/sitemap.xml')))fs.copyFileSync(path.join(root,'dist/sitemap.xml'),path.join(root,'sitemap.xml'));
console.log('Prepared /atlas/ entry point.');
