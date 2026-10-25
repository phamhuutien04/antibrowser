import fs from 'node:fs/promises';
const rows=JSON.parse(await fs.readFile('src-tauri/presets/ios-devices.json','utf8'));
let next=0;
const results=[];
await Promise.all(Array.from({length:5},async()=>{
 while(next<rows.length){
  const d=rows[next++];
  const overrides={'iPad 2':'iPad_2_Wi-Fi_EMC_2415','iPad':'iPad_Wi-Fi','iPhone':'iPhone_1st_Generation','iPhone SE (1st generation)':'iPhone_SE','iPhone SE (2nd generation)':'iPhone_SE_2020','iPhone SE (3rd generation)':'iPhone_SE_2022'};
  const slug=overrides[d.name]??d.name.replace(/\((\d+)(?:st|nd|rd|th) generation\)/,'$1').replace(/[()]/g,'').replace(/ /g,'_');
  const source=`https://www.ifixit.com/Device/${slug}`;
  try{
   const r=await fetch(`https://www.ifixit.com/api/2.0/wikis/CATEGORY/${slug}`,{signal:AbortSignal.timeout(25000)});
   const json=await r.json();
   const text=(json.contents_raw??'').replace(/[*'\[\]]/g,'').replace(/\s+/g,' ');
   const matches=[...text.matchAll(/.{0,25}(?:RAM\s*:|Memory\s*:|GPU\s*:|CPU\s*:|Processor\s*:).{0,220}/gi)].map(m=>m[0]);
   const memory=[...text.matchAll(/.{0,50}(?:\bRAM\b|\bSDRAM\b|\bLPDDR\w*\b).{0,80}/gi)].map(m=>m[0]);
   results.push({name:d.name,source,status:r.status,matches,memory});
   console.log(d.name,r.status,JSON.stringify(matches));
  }catch(e){results.push({name:d.name,source,error:String(e)});}
 }
}));
await fs.writeFile('src-tauri/presets/ifixit-spec-evidence.json',JSON.stringify(results,null,2)+'\n');
