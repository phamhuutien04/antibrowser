import fs from 'node:fs/promises';
const dir='src-tauri/presets';
const rows=JSON.parse(await fs.readFile(`${dir}/apple-model-index.json`,'utf8'));
const clean=s=>s.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
let next=0;
await Promise.all(Array.from({length:5},async()=>{
 while(next<rows.length){
  const row=rows[next++];
  try {
   const r=await fetch(row.source,{signal:AbortSignal.timeout(60000)});
   if(!r.ok)throw Error(r.status);
   const html=await r.text();
   row.source=r.url;
   const start=html.search(/<h1\b/i);
   row.text=clean(html.slice(start));
   console.log(row.name,row.text.length);
  }catch(e){row.error=String(e);console.log(row.name,row.error)}
 }
}));
await fs.writeFile(`${dir}/apple-spec-evidence.json`,JSON.stringify(rows,null,2)+'\n');
