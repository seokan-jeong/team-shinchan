#!/usr/bin/env node
// Ontology Scanner — Team-Shinchan
// CLI: node src/ontology-scanner.js <project-root> [--dry-run] [--incremental <since>] [--format json|summary]
'use strict';
const fs=require('fs'),P=require('path'),{execSync}=require('child_process');
const S=s=>new Set(s.split(' '));
const EXTS=S('.js .jsx .ts .tsx .py .go .java .rb .rs .mjs .cjs .md');
const MODS=S('src lib app pages api components services models controllers routes hooks utils helpers middleware config test tests __tests__ agents skills commands');
const SKIP=S('node_modules dist build .git .shinchan-docs coverage .next __pycache__');
const FW=S('React Component PureComponent Fragment Suspense StrictMode Express Router Next Nuxt Vue Angular Module Injectable Controller Service Middleware Guard Pipe Exception FastAPI Flask Django Spring Nest Koa Hapi Promise Error TypeError RangeError Map Set Array Object String Number Boolean Date RegExp Buffer EventEmitter Stream Transform Readable Writable');
const CFG=[/^\.env/,/\.config\.[jt]s$/,/^tsconfig/,/^package\.json$/,/^\.eslint/,/^\.prettier/,/^jest\./,/^[wvr]\w+\.config/,/^babel/,/^[dD]ocker/,/^Makefile$/,/^\.(editorconfig|npmrc|nvmrc)$/];

function parseGI(r){const f=P.join(r,'.gitignore');if(!fs.existsSync(f))return{p:[],n:[]};const p=[],n=[];
for(const l of fs.readFileSync(f,'utf-8').split('\n')){const t=l.trim();if(!t||t[0]==='#')continue;(t[0]==='!'?n:p).push(t.replace(/^!/,''))}return{p,n}}
function mP(r,p){const c=p.replace(/\/$/,''),s=r.split('/');if(!c.includes('/')&&!c.includes('*'))return s.includes(c);if(c[0]==='*'&&c[1]==='.')return r.endsWith(c.slice(1));return r.startsWith(c)||s.includes(c)}
function ign(r,g){let h=false;for(const p of g.p)if(mP(r,p))h=true;if(h)for(const n of g.n)if(mP(r,n))h=false;return h}

function walk(root,gi){const F=[];let sk=0;
(function w(d,dp){if(dp>5)return;let es;try{es=fs.readdirSync(d,{withFileTypes:true})}catch(_){return}
for(const e of es){const fp=P.join(d,e.name),rp=P.relative(root,fp);
if(SKIP.has(e.name)||ign(rp,gi)){sk++;continue}if(e.isDirectory()){w(fp,dp+1);continue}
if(!e.isFile())continue;const ext=P.extname(e.name).toLowerCase();if(!EXTS.has(ext)){sk++;continue}
try{if(fs.statSync(fp).size>512e3){sk++;continue}}catch(_){sk++;continue}
try{const fd=fs.openSync(fp,'r'),b=Buffer.alloc(512),n=fs.readSync(fd,b,0,512,0);fs.closeSync(fd);
let bin=false;for(let i=0;i<n;i++)if(b[i]===0){bin=true;break};if(bin){sk++;continue}}catch(_){sk++;continue}
F.push({fp,rp,nm:e.name,ext})}})(root,0);return{F,sk}}

function dom(p){const l=p.toLowerCase();return/test|__tests__|spec/.test(l)?'testing':/api|routes|controllers/.test(l)?'api':/models|entities|schemas/.test(l)?'data':/components|pages|views|ui/.test(l)?'frontend':/services|lib|utils|helpers/.test(l)?'core':/middleware|hooks/.test(l)?'middleware':/config/.test(l)?'configuration':/agents|skills|commands/.test(l)?'plugin':'general'}

function scanMods(root){const out=[];
function chk(d,dp){if(dp>1)return;let es;try{es=fs.readdirSync(d,{withFileTypes:true})}catch(_){return}
for(const e of es){if(!e.isDirectory()||SKIP.has(e.name)||(dp===0&&!MODS.has(e.name)))continue;
const fp=P.join(d,e.name),rp=P.relative(root,fp);let desc='';
try{const rm=P.join(fp,'README.md');if(fs.existsSync(rm)){const l=fs.readFileSync(rm,'utf-8').split('\n').find(x=>x.trim()&&!x.startsWith('#'));if(l)desc=l.trim().slice(0,120)}}catch(_){}
if(!desc)for(const i of['index.js','index.ts','__init__.py']){const ip=P.join(fp,i);
if(fs.existsSync(ip)){try{const m=fs.readFileSync(ip,'utf-8').slice(0,500).match(/\/\*\*\s*\n?\s*\*?\s*(.+?)[\n*]/);if(m)desc=m[1].trim().slice(0,120)}catch(_){}break}}
out.push({name:e.name,path:rp,description:desc,domain:dom(rp)});if(dp===0)chk(fp,1)}}
chk(root,0);return out}

const CRE=[[/export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g,'export','export'],
[/^class\s+([A-Z]\w+)/gm,'class','internal'],[/^def\s+([a-zA-Z_]\w+)\s*\(/gm,'py','export'],
[/^class\s+([A-Z]\w+)\s*[:(]/gm,'pycls','export'],[/module\.exports\.(\w+)\s*=/g,'cjs','export'],
[/^func\s+([A-Za-z]\w+)/gm,'gofn','export']];
function scanComps(files){const out=[],seen=new Set();
for(const f of files){let c;try{c=fs.readFileSync(f.fp,'utf-8')}catch(_){continue}
for(const[re,td,vis]of CRE){if(f.ext==='.py'&&(td==='export'||td==='cjs'))continue;
if(f.ext!=='.py'&&(td==='py'||td==='pycls'))continue;if(f.ext!=='.go'&&td==='gofn')continue;
re.lastIndex=0;let m;while((m=re.exec(c))!==null){const n=m[1];if(!n||n.length<2)continue;
const k=n+':'+f.rp;if(seen.has(k))continue;seen.add(k);
let v=vis,t=td;if(td==='class'&&/export\s+/.test(c.slice(Math.max(0,m.index-20),m.index)))v='export';
if(td==='export'){const s=c.slice(m.index,m.index+60);t=/class\b/.test(s)?'class':/function\b/.test(s)?'function':/const\b/.test(s)?'const':'variable'}
if(td==='py')t='function';if(td==='pycls')t='class';if(td==='gofn')t='func';if(td==='cjs')t='commonjs';
out.push({name:n,type_detail:t,file_path:f.rp,visibility:v})}}}return out}

function scanDC(files){const map=new Map(),re=/\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g;
for(const f of files){if(f.ext==='.md')continue;let c;try{c=fs.readFileSync(f.fp,'utf-8')}catch(_){continue}
re.lastIndex=0;let m;while((m=re.exec(c))!==null){const n=m[1];if(!FW.has(n)&&n.length>=4&&n.length<=40&&!map.has(n))map.set(n,f.rp)}}
return[...map].map(([n,fp])=>({name:n,definition:`Domain concept inferred from ${fp}`}))}

const ARE=[/(?:app|router)\.(get|post|put|delete|patch|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/g,
/@(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g];
function scanAPIs(files){const out=[];for(const f of files){
if(/(?:pages|app)\/api\//.test(f.rp)){out.push({method:'ALL',path:'/'+f.rp.replace(/^(?:pages|app)\//,'').replace(/\.[jt]sx?$/,'').replace(/\/index$/,'').replace(/\[([^\]]+)\]/g,':$1'),handler:f.rp});continue}
let c;try{c=fs.readFileSync(f.fp,'utf-8')}catch(_){continue}
for(const re of ARE){re.lastIndex=0;let m;while((m=re.exec(c))!==null)out.push({method:m[1].toUpperCase(),path:m[2],handler:f.rp})}}return out}

const MRE=[/model\s+([A-Z]\w+)\s*\{/g,/mongoose\.model\s*\(\s*['"`](\w+)['"`]/g,
/@Entity\s*\(\)\s*\n?\s*(?:export\s+)?class\s+([A-Z]\w+)/g,
/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?/gi,/\.define\s*\(\s*['"`](\w+)['"`]/g];
function scanModels(files){const out=[],seen=new Set();
for(const f of files){let c;try{c=fs.readFileSync(f.fp,'utf-8')}catch(_){continue}
for(const re of MRE){re.lastIndex=0;let m;while((m=re.exec(c))!==null){
const n=m[1]||P.basename(f.nm,f.ext),k=n+':'+f.rp;if(!seen.has(k)){seen.add(k);out.push({name:n,file_path:f.rp})}}}}return out}

function scanCfg(root,gi){const out=[];
try{for(const e of fs.readdirSync(root,{withFileTypes:true}))if(e.isFile()&&!ign(e.name,gi)&&CFG.some(r=>r.test(e.name)))out.push({name:e.name,file_path:e.name})}catch(_){}
const cd=P.join(root,'config');if(fs.existsSync(cd))try{for(const e of fs.readdirSync(cd,{withFileTypes:true}))if(e.isFile())out.push({name:e.name,file_path:'config/'+e.name})}catch(_){}
return out}

function scanTests(files){return files.filter(f=>/\.(test|spec)\.[jt]sx?$|^test_\w+\.py$|\w+_test\.go$/.test(f.nm)).map(f=>{
const p=f.rp.toLowerCase();return{name:f.nm,test_type:/e2e|cypress|playwright/.test(p)?'e2e':/integration/.test(p)?'integration':'unit',file_path:f.rp}})}

const IRE=[[/import\s+[\s\S]*?\s+from\s+['"`]([^'"`]+)['"`]/g,'import'],[/import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,'import'],
[/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,'require'],[/from\s+(\.[\w.]+)\s+import/g,'import']];
function scanDeps(files){const out=[];for(const f of files){let c;try{c=fs.readFileSync(f.fp,'utf-8')}catch(_){continue}
for(const[re,dt]of IRE){re.lastIndex=0;let m;while((m=re.exec(c))!==null)if(m[1][0]==='.'||m[1][0]==='/')out.push({from:f.rp,to:m[1],dt})}}return out}

function scan(projectRoot,opts={}){
const root=P.resolve(projectRoot);if(!fs.existsSync(root))throw new Error('Not found: '+root);
const gi=parseGI(root);let changed=null;
if(opts.incremental){try{const o=execSync(`git diff --name-only ${opts.incremental} HEAD`,{cwd:root,encoding:'utf-8',timeout:1e4});
changed=new Set(o.trim().split('\n').filter(Boolean))}catch(_){throw new Error('git diff failed for: '+opts.incremental)}}
const{F:all,sk}=walk(root,gi),files=changed?all.filter(f=>changed.has(f.rp)):all;
const mods=scanMods(root),comps=scanComps(files),dcs=scanDC(files),apis=scanAPIs(files);
const models=scanModels(files),cfgs=scanCfg(root,gi),tests=scanTests(files);
const E=[];let ix=0;const mM=new Map(),cM=new Map(),tM=new Map();
for(const m of mods){const id=`tmp-mod-${ix++}`;mM.set(m.path,id);E.push({id,type:'Module',name:m.name,path:m.path,description:m.description,domain:m.domain})}
for(const c of comps){const id=`tmp-comp-${ix++}`;cM.set(c.file_path+':'+c.name,id);E.push({id,type:'Component',name:c.name,type_detail:c.type_detail,file_path:c.file_path,visibility:c.visibility})}
for(const d of dcs)E.push({id:`tmp-dc-${ix++}`,type:'DomainConcept',name:d.name,definition:d.definition});
for(const a of apis)E.push({id:`tmp-api-${ix++}`,type:'API',method:a.method,path:a.path,handler:a.handler});
for(const d of models)E.push({id:`tmp-dm-${ix++}`,type:'DataModel',name:d.name,file_path:d.file_path});
for(const c of cfgs)E.push({id:`tmp-cfg-${ix++}`,type:'Configuration',name:c.name,file_path:c.file_path});
for(const t of tests){const id=`tmp-test-${ix++}`;tM.set(t.file_path,id);E.push({id,type:'TestSuite',name:t.name,test_type:t.test_type,file_path:t.file_path})}
const R=[];let ri=0;
for(const c of comps){let d=P.dirname(c.file_path);while(d&&d!=='.'){if(mM.has(d)){R.push({id:`tmp-rel-${ri++}`,from:cM.get(c.file_path+':'+c.name),relation:'PART_OF',to:mM.get(d)});break}d=P.dirname(d)}}
const f2c=new Map();for(const c of comps){const k=c.file_path,l=f2c.get(k)||[];l.push(cM.get(k+':'+c.name));f2c.set(k,l)}
for(const dep of scanDeps(files)){const fi=f2c.get(dep.from)||[];if(!fi.length)continue;
const tr=P.normalize(P.join(P.dirname(dep.from),dep.to));let ti=f2c.get(tr)||[];
if(!ti.length)for(const x of['.js','.ts','.jsx','.tsx','.mjs','/index.js','/index.ts']){ti=f2c.get(tr+x)||[];if(ti.length)break}
if(ti.length)R.push({id:`tmp-rel-${ri++}`,from:fi[0],relation:'DEPENDS_ON',to:ti[0],dep_type:dep.dt})}
const fset=new Set(files.map(f=>f.rp));
for(const t of tests){let src=t.file_path.replace(/\.(test|spec)\.([jt]sx?|mjs|cjs)$/,'.$2');
const py=t.name.match(/^test_(.+\.py)$/);if(py)src=t.file_path.replace(t.name,py[1]);
const go=t.name.match(/^(.+)_test\.go$/);if(go)src=t.file_path.replace(t.name,go[1]+'.go');
if(fset.has(src)){const si=(f2c.get(src)||[])[0],tid=tM.get(t.file_path);if(si&&tid)R.push({id:`tmp-rel-${ri++}`,from:si,relation:'TESTED_BY',to:tid})}}
return{entities:E,relations:R,meta:{scanned_at:new Date().toISOString(),project_root:root,files_scanned:files.length,files_skipped:sk,incremental:!!opts.incremental}}}

function formatSummary(r){const ec={},rc={};
for(const e of r.entities)ec[e.type]=(ec[e.type]||0)+1;for(const x of r.relations)rc[x.relation]=(rc[x.relation]||0)+1;
const L=['='.repeat(56),'  Ontology Scan Summary','='.repeat(56),'',`  Project: ${r.meta.project_root}`,
`  Time:    ${r.meta.scanned_at}`,`  Files:   ${r.meta.files_scanned} scanned, ${r.meta.files_skipped} skipped`,
`  Mode:    ${r.meta.incremental?'incremental':'full'}`,'','  Entities:'];
for(const[t,c]of Object.entries(ec).sort())L.push(`    ${t.padEnd(18)} ${c}`);
L.push(`    ${'TOTAL'.padEnd(18)} ${r.entities.length}`,'','  Relations:');
for(const[t,c]of Object.entries(rc).sort())L.push(`    ${t.padEnd(18)} ${c}`);
L.push(`    ${'TOTAL'.padEnd(18)} ${r.relations.length}`,'','='.repeat(56));return L.join('\n')+'\n'}

function main(){const a=process.argv.slice(2);
if(!a.length||a.includes('-h')||a.includes('--help')){process.stdout.write(
'Usage: node src/ontology-scanner.js <project-root> [options]\n\n  --dry-run              Print stats only\n  --incremental <since>  Scan changed files only\n  --format json|summary  Output format (default: json)\n');return}
let dry=false,inc=null,fmt='json';
for(let i=1;i<a.length;i++){if(a[i]==='--dry-run')dry=true;else if(a[i]==='--incremental'&&a[i+1])inc=a[++i];else if(a[i]==='--format'&&a[i+1])fmt=a[++i]}
const opts={};if(inc)opts.incremental=inc;const res=scan(a[0],opts);
process.stdout.write(dry||fmt==='summary'?formatSummary(res):JSON.stringify(res,null,2)+'\n')}

if(require.main===module){try{main()}catch(e){process.stderr.write('Error: '+e.message+'\n');process.exit(1)}}
module.exports={scan,formatSummary};
