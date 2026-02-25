#!/usr/bin/env node
/** Harness Lint — Plugin consistency checker. Built-in modules only. */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const D=d=>path.join(ROOT,d),C=(n,s)=>`\x1b[${n}m${s}\x1b[0m`;
function rf(p){try{return fs.readFileSync(p,'utf-8')}catch{return null}}
function fm(c){if(!c)return{};const m=c.match(/^---\n([\s\S]*?)\n---/);if(!m)return{};const o={};m[1].split('\n').forEach(l=>{const i=l.indexOf(':');if(i>0)o[l.slice(0,i).trim()]=l.slice(i+1).trim()});return o}
function lsmd(d){try{return fs.readdirSync(d).filter(f=>f.endsWith('.md'))}catch{return[]}}
function lsdir(d){try{return fs.readdirSync(d).filter(f=>{try{return fs.statSync(path.join(d,f)).isDirectory()}catch{return false}})}catch{return[]}}
const ck=(c,p,d)=>({check:c,pass:p,details:d}),EX=['bo','aichan','bunta','masao','kazama'];

function checkAgents(){
  const cks=[],files=lsmd(D('agents')).filter(f=>f!=='_shared');
  for(const f of files){const t=rf(path.join(D('agents'),f)),p=fm(t),n=f.replace('.md','');
    const ms=['name','description','model','tools'].filter(k=>!p[k]);
    cks.push(ck(n+': frontmatter',!ms.length,ms.length?'miss: '+ms:'ok'));
    const cp=t&&t.includes('coding-principles');cks.push(ck(n+': coding-principles',cp,cp?'ok':'miss'));
    if(EX.includes(n)||p.maxTurns)cks.push(ck(n+': maxTurns',!!p.maxTurns,p.maxTurns||'miss'));
    cks.push(ck(n+': permissionMode',!!p.permissionMode,p.permissionMode||'miss'));
  }
  return{category:'agents',label:'Agent Consistency',checks:cks};
}

function checkStructure(){
  const cks=[],sk=lsdir(D('skills')),cm=lsmd(D('commands')).map(f=>f.replace('.md',''));
  for(const s of sk)cks.push(ck('parity: '+s,cm.includes(s),cm.includes(s)?'ok':'no cmd'));
  const hj=rf(path.join(D('hooks'),'hooks.json'))||'';
  const hf=fs.readdirSync(D('hooks')).filter(f=>(f.endsWith('.md')||f.endsWith('.sh'))&&f!=='hooks.json');
  for(const h of hf)cks.push(ck('hook: '+h,hj.includes(h),hj.includes(h)?'ok':'unreg'));
  const ag=lsmd(D('agents')).filter(f=>f!=='_shared'),nm=ag.map(f=>f.replace('.md',''));
  const re=/team-shinchan:([\w-]+)/g;
  for(const f of ag){const t=rf(path.join(D('agents'),f));if(!t)continue;let m;while((m=re.exec(t))){const r=m[1],v=nm.includes(r)||sk.includes(r);cks.push(ck('xref '+f+': '+r,v,v?'ok':'unknown'))}}
  const lp=path.join(ROOT,'layer-map.json');
  if(fs.existsSync(lp)){const lm=JSON.parse(rf(lp));for(const a of Object.values(lm).flat())cks.push(ck('layer: '+a,nm.includes(a),nm.includes(a)?'ok':'miss'))}
  return{category:'structure',label:'Structural Integrity',checks:cks};
}

function checkDrift(){
  const cks=[],files=lsmd(D('agents')).filter(f=>f!=='_shared');
  for(const f of files){const t=rf(path.join(D('agents'),f)),h=t&&t.includes('output-formats');cks.push(ck('outfmt: '+f,h,h?'ok':'miss'))}
  for(const n of EX){const t=rf(path.join(D('agents'),n+'.md')),h=t&&t.includes('self-check');cks.push(ck('selfchk: '+n,h,h?'ok':'miss'))}
  const pj=rf(D('plugin.json')),rm=rf(D('README.md')),cl=rf(D('CHANGELOG.md'));
  let pv;if(pj)try{pv=JSON.parse(pj).version}catch{}
  if(pv){const rv=rm&&rm.match(/version[- ]([\d.]+)/i);if(rv)cks.push(ck('ver: README',rv[1]===pv,rv[1]===pv?pv:pv+' vs '+rv[1]));
    const cv=cl&&cl.match(/## \[([\d.]+)\]/);if(cv)cks.push(ck('ver: CHANGELOG',cv[1]===pv,cv[1]===pv?pv:pv+' vs '+cv[1]))}
  return{category:'drift',label:'Drift Detection',checks:cks};
}

function outJ(res){const s={total:0,passed:0,failed:0,categories:res.map(r=>{const p=r.checks.filter(x=>x.pass).length,f=r.checks.length-p;return{...r,total:r.checks.length,passed:p,failed:f}})};s.categories.forEach(x=>{s.total+=x.total;s.passed+=x.passed;s.failed+=x.failed});console.log(JSON.stringify(s,null,2));return s.failed}
function outT(res){let tp=0,tf=0;for(const r of res){const p=r.checks.filter(x=>x.pass).length,f=r.checks.length-p;tp+=p;tf+=f;console.log('\n'+C(1,'=== '+r.label+' ===')+' ('+C(32,p+' pass')+', '+(f?C(31,f+' fail'):'0 fail')+')');for(const x of r.checks)console.log('  '+(x.pass?C(32,'PASS'):C(31,'FAIL'))+'  '+x.check+'  '+C(36,x.details))}console.log('\n'+C(1,'Total:')+' '+C(32,tp+' pass')+', '+(tf?C(31,tf+' fail'):'0 fail')+' / '+(tp+tf)+' checks');return tf}

const a=process.argv.slice(2),ci=a.indexOf('--category'),cat=ci>=0?a[ci+1]:null;
const fmt=a.includes('--format')?a[a.indexOf('--format')+1]:'json';
const R={agents:checkAgents,structure:checkStructure,drift:checkDrift};
const res=cat&&R[cat]?[R[cat]()]:[checkAgents(),checkStructure(),checkDrift()];
try{const d=path.join(process.cwd(),'.shinchan-docs');if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,'.last-lint'),new Date().toISOString())}catch{}
process.exit((fmt==='table'?outT(res):outJ(res))>0?1:0);
