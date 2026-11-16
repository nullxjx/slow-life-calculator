import {cpSync,mkdirSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const docs=fileURLToPath(new URL('docs/',root));
rmSync(docs,{recursive:true,force:true});
mkdirSync(docs,{recursive:true});
cpSync(fileURLToPath(new URL('dist/',root)),docs,{recursive:true});
