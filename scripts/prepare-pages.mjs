import {cpSync,mkdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const housing=JSON.parse(readFileSync(new URL('data/housing-market-2026-10.json',root),'utf8'));
writeFileSync(new URL('dist/housing-data.js',root),'// 公开住房数据快照；来源与月份见下方元数据，非实时成交报价。\nexport const housingMarket = '+JSON.stringify(housing,null,2)+';\n');
const docs=fileURLToPath(new URL('docs/',root));
rmSync(docs,{recursive:true,force:true});
mkdirSync(docs,{recursive:true});
cpSync(fileURLToPath(new URL('dist/',root)),docs,{recursive:true});
