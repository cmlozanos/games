const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
for(const slug of ['burbujas','buscaminas','little-chef-academy']){
 for(const file of ['family.js','family.css','playwrite-es.ttf','OFL.txt'])assert(fs.readFileSync(path.join(root,slug,'family-v2',file)).equals(fs.readFileSync(path.join(root,'family-v2',file))),slug+' exact '+file);
 const html=fs.readFileSync(path.join(root,slug,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,slug,'sw.js'),'utf8');
 assert(html.includes('family-v2/family.js?v=2.0.0'));assert(sw.includes('./family-v2/playwrite-es.ttf'));assert(sw.includes('./family-v2/OFL.txt'));console.log(slug+':V2 local offline kit verified');
}
