import fs from 'node:fs';
const path='src-tauri/presets/ios-devices.json';
const rows=JSON.parse(fs.readFileSync(path));
const evidence=JSON.parse(fs.readFileSync('src-tauri/presets/ifixit-spec-evidence.json'));
const teardown=(id)=>`https://www.ifixit.com/Guide/${id}`;
// Model-specific RAM, including older sub-GB devices. Never infer RAM from a
// chip name: the same SoC ships with different memory in different products.
const ram={
 'iPhone 17e':[8,'https://techinsights.com/blog/apple-iphone-17e-teardown-a19-processor-sk-hynix-memory-bom-analysis'],
 'iPhone 17 Pro Max':[12,'https://www.ifixit.com/Teardown/iPhone+17+Pro+Chip+ID/196117'],
 'iPhone 17':[8,'https://arstechnica.com/gadgets/2025/09/review-apples-injects-just-the-right-amount-of-pro-into-the-regular-iphone-17/'],
 'iPhone Air':[12,'https://arstechnica.com/gadgets/2025/09/review-apples-injects-just-the-right-amount-of-pro-into-the-regular-iphone-17/'],
 'iPhone 12 Pro':[6,'https://www.ifixit.com/Device/iPhone_12_Pro'],
 'iPhone SE (2nd generation)':[3,teardown(133066)],
 'iPhone 11 Pro':[4,'https://www.ifixit.com/Device/iPhone_11_Pro'],
 'iPhone 11 Pro Max':[4,'https://www.ifixit.com/Device/iPhone_11_Pro_Max'],
 'iPhone XS':[4,teardown(113021)],'iPhone XS Max':[4,teardown(113021)],
 'iPhone XR':[3,teardown(114123)],'iPhone 8':[2,teardown(97481)],
 'iPhone 8 Plus':[3,'https://www.ifixit.com/Device/iPhone_8_Plus'],
 'iPhone 7':[2,teardown(67382)],'iPhone 7 Plus':[3,teardown(67384)],
 'iPhone SE (1st generation)':[2,'https://www.ifixit.com/Device/iPhone_SE'],
 'iPad Pro 12.9-inch (4th generation)':[6,'https://www.ifixit.com/Device/iPad_Pro_12.9%22_4th_Gen'],
 'iPad Pro 11-inch (2nd generation)':[6,'https://www.ifixit.com/Device/iPad_Pro_11%22_2nd_Gen'],
 'iPad Pro 12.9-inch (3rd generation)':[4,'https://www.ifixit.com/Device/iPad_Pro_12.9%22_3rd_Gen'],
 'iPad Pro 11-inch':[4,teardown(115457)],
 'iPad Pro 12.9-inch (2nd generation)':[4,'https://www.ifixit.com/Device/iPad_Pro_12.9%22_2nd_Gen'],
 'iPad Pro (10.5-inch)':[4,teardown(92534)],
 'iPad Pro (9.7-inch)':[2,teardown(60939)],
 'iPad Pro (12.9-inch)':[4,'https://www.ifixit.com/Device/iPad_Pro_12.9%22'],
 'iPad Air (4th generation)':[4,'https://www.ifixit.com/Device/iPad_Air_4'],
 'iPad Air (3rd generation)':[3,teardown(121759)],
 'iPad Air':[1,'https://www.ifixit.com/Device/iPad_Air'],
 'iPad mini (A17 Pro)':[8,'https://www.ifixit.com/Device/iPad_Mini_7'],
 'iPad mini (5th generation)':[3,teardown(121589)],
 'iPad mini 4':[2,'https://www.ifixit.com/Device/iPad_Mini_4'],
 'iPad mini 3':[1,teardown(30628)],'iPad mini 2':[1,'https://www.ifixit.com/Device/iPad_Mini_2'],
 'iPad (A16)':[6,'https://www.ifixit.com/Device/iPad_11'],
 'iPad (8th generation)':[3,'https://www.ifixit.com/Device/iPad_8'],
 'iPad (7th generation)':[3,teardown(126291)],
 'iPad (6th generation)':[2,'https://www.ifixit.com/Device/iPad_6'],
 'iPad (5th generation)':[2,'https://www.ifixit.com/News/8955/2017-ipad-teardown'],
};
const gpuReference='https://www.anandtech.com/show/8716/apple-a8xs-gpu-gxa6850-even-better-than-i-thought';
const chips={
 A4:[1,1,'PowerVR SGX535'],A5:[2,2,'PowerVR SGX543MP2'],A5X:[2,4,'PowerVR SGX543MP4'],
 A6:[2,3,'PowerVR SGX543MP3'],A6X:[2,4,'PowerVR SGX554MP4'],
 A7:[2,4,'PowerVR G6430'],A8:[2,4,'PowerVR GX6450'],A8X:[3,8,'PowerVR GXA6850'],
 A9:[2,6,'PowerVR GT7600'],A9X:[2,12,'PowerVR Series7XT (12 clusters)'],
 A10:[4,6,'PowerVR Series7XT (6 clusters)'],A10X:[6,12,'PowerVR Series7XT (12 clusters)'],
 A11:[6,3,'Apple GPU'],A12:[6,4,'Apple GPU'],A12X:[8,7,'Apple GPU'],A12Z:[8,8,'Apple GPU'],
 A13:[6,4,'Apple GPU'],A14:[6,4,'Apple GPU'],
};
for(const d of rows){
 const e=evidence.find(e=>e.name===d.name);
 const text=[...(e?.matches??[]),...(e?.memory??[])].join(' ');
 const match=text.match(/\bRAM\s*:\s*(\d+(?:\.\d+)?)\s*(GB|MB)/i)??text.match(/(\d+(?:\.\d+)?)\s*(GB|MB)\s+(?:LPDDR\w*\s+)?(?:SDRAM|RAM)/i);
 if(!d.memory_gb_variants.length && match){
  d.memory_gb_variants=[Number(match[1])/(match[2].toLowerCase()==='mb'?1024:1)];
  d.memory_source=e.source;
 }
 if(!d.memory_gb_variants.length && ram[d.name]){
  d.memory_gb_variants=[ram[d.name][0]];d.memory_source=ram[d.name][1];
 }
 if(/A12X/.test(d.chip))d.memory_gb_variants=[4,6];
 const key=d.chip.match(/A\d+[XZ]?/)?.[0];
 const spec=chips[key];
 if(spec){
  if(!d.cpu_core_variants.length)d.cpu_core_variants=[spec[0]];
  if(!d.gpu_core_variants.length)d.gpu_core_variants=[spec[1]];
  d.hardware_gpu=spec[2];
 }else if(['iPhone','iPhone 3G','iPhone 3GS'].includes(d.name)){
  d.chip=d.name==='iPhone 3GS'?'Samsung ARM Cortex-A8':'Samsung ARM11';
  d.cpu_core_variants=[1];d.gpu_core_variants=[1];
  d.hardware_gpu=d.name==='iPhone 3GS'?'PowerVR SGX535':'PowerVR MBX Lite';
 }else d.hardware_gpu=`${d.chip} GPU`;
 const chipSources={A4:'https://www.ifixit.com/Device/iPad_Wi-Fi',
  A5:'https://www.anandtech.com/Show/Index/4225?all=False&page=5&slug=the-ipad-2-review',
  A5X:'https://www.apple.com/newsroom/2012/03/07Apple-Launches-New-iPad/',
  A6:'https://www.eetimes.com/apple-processors-designed-differently-but-here-to-stay/',
  A6X:'https://www.eetimes.com/apple-processors-designed-differently-but-here-to-stay/',
  A9:'https://www.anandtech.com/show/9766/the-apple-ipad-pro-review/2',
  A9X:'https://www.anandtech.com/show/9766/the-apple-ipad-pro-review/2',
  A10X:'https://www.apple.com/sa/newsroom/2017/06/ipad-pro-10-5-and-12-9-inch-models-introduces-worlds-most-advanced-display-breakthrough-performance/',
  A11:'https://www.apple.com/iphone/compare/',A12:'https://www.apple.com/iphone/compare/',
  A12X:'https://www.techinsights.com/blog/looking-apple-a12z-bionic-system-chip',
  A12Z:'https://www.techinsights.com/blog/looking-apple-a12z-bionic-system-chip'};
 d.hardware_sources=[...new Set([d.source,d.memory_source??d.source,e?.status===200?e.source:d.source,
  spec?(chipSources[key]??gpuReference):d.source])];
 if(!d.cpu_core_variants.length||!d.gpu_core_variants.length||!d.memory_gb_variants.length)throw Error(`Incomplete ${d.name}`);
 d.simulation_defaults={hardware_concurrency:d.cpu_core_variants[0],device_memory:d.memory_gb_variants[0],
  cpu_basis:'hardware_reference',memory_basis:'hardware_reference'};
}
fs.writeFileSync(path,JSON.stringify(rows,null,2)+'\n');
console.log('Missing RAM:',rows.filter(d=>!d.memory_gb_variants.length).map(d=>d.name));
