import fs from 'node:fs';
const dir='src-tauri/presets';
const rows=JSON.parse(fs.readFileSync(`${dir}/apple-spec-evidence.json`));
const old=JSON.parse(fs.readFileSync(`${dir}/ios-devices.json`));
const slug=s=>s.toLowerCase().replace(/[‑–]/g,'-').replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
const devices=rows.map(r=>{
 const text=r.text.replace(/[‑–−]/g,'-');
 const chipSection=text.match(/\b(?:Chips?|Processor)\s+(.{0,400})/i)?.[1]??'';
 const extra={
  'iPhone 5':['A6','https://www.apple.com/newsroom/2012/09/12Apple-Introduces-iPhone-5/'],
  'iPhone 4s':['A5','https://www.apple.com/newsroom/2011/10/04Apple-Launches-iPhone-4S-iOS-5-iCloud/'],
  'iPhone 4':['A4','https://www.apple.com/newsroom/2010/06/07Apple-Presents-iPhone-4/']
 }[r.name];
 const chip=extra?.[0]??chipSection.match(/(?:Apple )?(?:A\d+(?:X|Z)?(?: Bionic| Fusion| Pro)?|M\d+(?: Pro| Max)?)/)?.[0]??null;
 const res=[...text.matchAll(/(\d{3,4})\s*-by-\s*(\d{3,4})(?:-pixel| pixel)?\s+resolution/gi)];
 if(!res.length)throw Error(`Missing screen: ${r.name}`);
 const px=res[0].slice(1).map(Number).sort((a,b)=>a-b);
 const dpr=r.platform==='iPad' ? (/^(iPad|iPad 2|iPad mini)$/.test(r.name)?1:2) : (/^(iPhone|iPhone 3G|iPhone 3GS)$/.test(r.name)?1:/iPhone (?:1[12345678]|Air|Duo|X)/.test(r.name)?(/iPhone (?:XR|11)$/.test(r.name)?2:3):/Plus/.test(r.name)?3:2);
 const cpu=[...chipSection.matchAll(/(\d+)-core CPU/g)].map(m=>+m[1]);
 const gpu=[...chipSection.matchAll(/(\d+)-core (?:GPU|graphics)/g)].map(m=>+m[1]);
 const memory=[...text.matchAll(/(\d+)\s*GB\s+(?:RAM|unified memory)/gi)].map(m=>+m[1]);
 const previous=old.find(o=>o.name===r.name);
 return {id:previous?.id??`ios-${slug(r.name)}`,name:r.name.replace(/‑/g,'-'),platform:r.platform,
 width:Math.round(px[0]/dpr),height:Math.round(px[1]/dpr),dpr,
 physical_width:px[0],physical_height:px[1],
 chip:chip??'Không được Apple công bố trên trang thông số',
 cpu_core_variants:[...new Set(cpu)],gpu_core_variants:[...new Set(gpu)],
 memory_gb_variants:[...new Set(memory)],
 simulation_defaults:{hardware_concurrency:cpu[0]??4,device_memory:memory[0]??4,
 cpu_basis:cpu.length?'hardware_specs':'editable_default',memory_basis:memory.length?'hardware_specs':'editable_default'},
 refresh_rate:/ProMotion/.test(text)?120:60,
 color_gamut:/Wide colou?r \(P3\)|Wide colou?r display \(P3\)/i.test(text)?'p3':'srgb',
 source:r.source,chip_source:extra?.[1]??r.source,verified_at:'2026-10-24',fingerprint_status:'hardware_specs_only',
 display_note:r.name==='iPhone Duo'?'Màn hình trong; chưa có phép đo viewport khi gập/mở':/iPhone (?:6|6s|7|8) Plus/.test(r.name)?'Viewport quy ước 414 × 736; màn hình có bước downsampling':null,
 ...(/iPhone (?:6|6s|7|8) Plus/.test(r.name)?{width:414,height:736}:{}),
 evidence:{chip:chipSection.slice(0,220),display:res[0][0]}};
});
fs.writeFileSync(`${dir}/ios-devices.json`,JSON.stringify(devices,null,2)+'\n');
console.log(devices.map(d=>`${d.name} | ${d.chip} | ${d.width}x${d.height} @${d.dpr} | CPU ${d.cpu_core_variants} GPU ${d.gpu_core_variants}`).join('\n'));
