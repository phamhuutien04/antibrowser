import fs from 'node:fs/promises';
const dir = 'src-tauri/presets';
const clean = s => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const pages = [['iPhone','108044'],['iPad','108043']];
let rows = [];
for (const [platform,id] of pages) {
  const html = await (await fetch(`https://support.apple.com/en-us/${id}`)).text();
  for (const section of html.split(/<h2\b/i).slice(1)) {
    const title = clean(section.slice(section.indexOf('>')+1,section.indexOf('</h2>')));
    if (!title.startsWith(platform)) continue;
    const links = [...section.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const link = links.find(m=>/tech specs/i.test(clean(m[2])));
    if (link) rows.push({name:title,platform,source:new URL(link[1],'https://support.apple.com').href});
  }
}
await fs.writeFile(`${dir}/apple-model-index.json`,JSON.stringify(rows,null,2)+'\n');
console.log(`Indexed ${rows.length} models`);
