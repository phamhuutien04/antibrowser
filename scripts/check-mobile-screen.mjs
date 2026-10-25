import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {ws:WebSocket}=require(path.join(path.dirname(require.resolve('playwright-core/package.json')),'lib/utilsBundle.js'));
const executablePath = process.env.SHARDX_TEST_BINARY;
if (!executablePath) throw Error('Set SHARDX_TEST_BINARY to the installed engine executable');
const root = path.resolve('src-tauri/target/mobile-screen-check');
await fs.mkdir(root, {recursive:true});
for (const platform of ['Android', 'iOS']) {
 const dir = await fs.mkdtemp(path.join(root, 'profile-'));
 const fingerprint = path.join(dir, 'fingerprint.json');
 const source=JSON.parse(await fs.readFile(path.join(process.env.APPDATA,'shardx-launcher/fingerprints/android-anyreal-note56-x.json'),'utf8'));
 const base=source.payload??source;
 const overrides={
  navigator:{platform,platform_value:platform==='iOS'?'iPad':'Linux armv8l',
   user_agent:platform==='iOS'?'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/156.0.8078.48 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/156.0.8078.48 Mobile Safari/537.36',max_touch_points:5},
  client_hints:{platform,mobile:true},
  screen:{width:1024,height:1366,avail_width:1024,avail_height:1366,device_pixel_ratio:2,color_depth:24,pixel_depth:24},
  window:{outer_width:1024,outer_height:1366,inner_width:1024,inner_height:1366}
 };
 for(const [key,value] of Object.entries(overrides))base[key]={...(base[key]??{}),...value};
 base.timezone='UTC';base.navigator.language='en-US';
 if(platform==='iOS'){
  for(const key of Object.keys(base))if(!['name','notes','timezone','navigator','client_hints','screen','window','motion','tls','noise'].includes(key))delete base[key];
  base.navigator={...overrides.navigator,platform_version:'18.0.0',vendor:'Apple Computer, Inc.',hardware_concurrency:8,device_memory:8,language:'en-US'};
  base.client_hints={platform:'iOS',platform_version:'18.0.0',mobile:true,model:'iPad',brand:'Google Chrome',brand_version:'156',brand_full_version:'156.0.8078.48',architecture:'arm',bitness:'64'};
 }
 await fs.writeFile(fingerprint, JSON.stringify(base));
 let child,socket;
 try {
  const data=path.join(dir,'data');
  child=spawn(executablePath,[`--user-data-dir=${data}`,`--fingerprint-profile=${fingerprint}`,'--headless=new','--remote-debugging-port=0','--no-first-run','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
  let endpoint;
  for(let i=0;i<100;i++){
   try{const [port,route]=(await fs.readFile(path.join(data,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);endpoint=`ws://127.0.0.1:${port}${route}`;break;}catch{}
   await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(endpoint,'Debugging endpoint must become ready');
  socket=new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});
  let seq=0;
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
   const id=++seq;
   const timeout=setTimeout(()=>{socket.off('message',handler);reject(Error(`Timeout: ${method}`))},5000);
   const handler=data=>{const m=JSON.parse(data);if(m.id!==id)return;clearTimeout(timeout);socket.off('message',handler);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)};
   socket.on('message',handler);socket.send(JSON.stringify({id,method,params,sessionId}));
  });
  const {targetInfos}=await call('Target.getTargets');
  const target=targetInfos.find(t=>t.type==='page');
  const {sessionId}=await call('Target.attachToTarget',{targetId:target.targetId,flatten:true});
  await call('Page.navigate',{url:'data:text/html,<meta name="viewport" content="width=device-width,initial-scale=1"><body>Mobile screen check</body>'},sessionId);
  await new Promise(r=>setTimeout(r,300));
  const {result}=await call('Runtime.evaluate',{expression:'JSON.stringify({width:screen.width,height:screen.height,dpr:devicePixelRatio,inner:innerWidth,touch:navigator.maxTouchPoints,platform:navigator.platform})',returnByValue:true},sessionId);
  const metrics=JSON.parse(result.value);
  console.log(platform, metrics);
  assert.equal(metrics.width,1024);
  assert.equal(metrics.height,1366);
  assert.equal(metrics.dpr,2);
  assert.ok(metrics.inner > 0 && metrics.inner <= 1024);
 } finally {
  socket?.close();
  if(child && child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}
  const target=path.resolve(dir);
  assert.ok(target.startsWith(root+path.sep));
  await fs.rm(target,{recursive:true,force:true,maxRetries:3});
 }
}
