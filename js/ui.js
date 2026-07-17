/* =====================================================================
   XENOSCOPE · ui.js
   Builds & updates the DOM for each phase; wires all input.
===================================================================== */
(function(XS){
"use strict";
const $=id=>document.getElementById(id);
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
const UI={};
XS.ui=UI;

let readoutHTML='';
function learn(url){ return url?` <a class="learn" href="${url}" target="_blank" rel="noopener">Learn more ↗</a>`:''; }
function nutText(s){ return s.isVirus?'requires a host cell':s.chemo?'chemoautotroph — chemical energy':s.autotroph?'autotroph — photosynthesis':'heterotroph — consumes organics'; }
function sfx(n){ if(XS.sfx) XS.sfx.play(n); }
/* persistent "Notes" readout shown top-left across all phases */
function readoutBlock(){
  return `<div class="cap notes-cap">🔎 Notes</div>`+
    `<div class="readout" id="roLeft">${readoutHTML||'<span class="muted">Inspect a structure or run an assay — what you learn is kept here.</span>'}</div>`+
    `<div class="rl-sep"></div>`;
}

UI.init=function(){
  UI.top=$('top'); UI.left=$('left'); UI.right=$('right'); UI.dock=$('dock');
  UI.overlay=$('overlay'); UI.zlab=$('zlab');
  const cv=$('c');
  cv.addEventListener('pointermove',onMove);
  cv.addEventListener('pointerdown',onDown);
  cv.addEventListener('pointerdown',()=>{UI.left.classList.remove('open');UI.right.classList.remove('open');});
  cv.addEventListener('pointerleave',()=>{XS.app.hoverPart=null;UI.zlab.classList.remove('on');});
  window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&UI.overlay.classList.contains('on')&&XS.app.phase!=='menu'&&XS.app.phase!=='result') UI.hideOverlay(); });
  UI.showMenu();
};

/* ---------------- input on canvas ---------------- */
function onMove(e){
  const app=XS.app;
  if(app.phase!=='investigate'){ app.hoverPart=null; UI.zlab.classList.remove('on'); return; }
  const p=XS.partAt(app,e.clientX,e.clientY); app.hoverPart=p;
  if(p){ const o=XS.ORG[p.id]; const known=app.spec.inspected.has(p.id);
    UI.zlab.innerHTML= known? `<b>${o.name}</b>` : `unidentified structure <span class="s">· click to inspect</span>`;
    UI.zlab.style.left=e.clientX+'px'; UI.zlab.style.top=e.clientY+'px'; UI.zlab.classList.add('on'); }
  else UI.zlab.classList.remove('on');
}
function onDown(e){
  const app=XS.app; if(app.phase!=='investigate'||app.scan) return;
  const p=XS.partAt(app,e.clientX,e.clientY); if(!p) return;
  sfx('scan');
  app.scan={active:true,x:e.clientX,y:e.clientY,start:app.time,dur:900,part:p};
}

/* ---------------- per-frame tick ---------------- */
UI.tick=function(dt){
  const app=XS.app;
  // resolve inspection scan
  if(app.scan && app.scan.active && app.time-app.scan.start>=app.scan.dur){
    const info=XS.inspect(app.scan.part); app.scan=null;
    if(info){ sfx('blip'); readoutHTML=`<div class="ro-name">${info.name}</div><div class="ro-fn">${info.fn}</div>`+
      (info.more?`<div class="ro-more">${info.more}</div>`:'')+
      `<div class="ro-fact">💡 ${info.fact}${learn(info.wiki)}</div>`; }
    UI.renderTop(); UI.renderInvestigate(); UI.renderRight(); // refresh worksheet, readout & dossier
  }
  if(app.phase==='investigate') UI.updateInvestigate();
  if(app.phase==='assignment') UI.updateAssignment();
};

/* ---------------- phase router ---------------- */
UI.renderPhase=function(){
  const ph=XS.app.phase;
  UI.top.style.display='flex';
  if(ph==='investigate'){ UI.renderTop(); UI.renderInvestigate(); UI.renderRight(); UI.renderInvestigateDock(); }
  else if(ph==='assignment'){ UI.renderTop(); UI.renderVitals(); UI.renderRight(); UI.renderAssignmentDock(); }
};

/* ---------------- top bar ---------------- */
UI.renderTop=function(){
  const app=XS.app, spec=app.spec; if(!spec){UI.top.innerHTML='';return;}
  const rank=XS.rankFor(XS.progress.xp);
  const named = app.phase!=='investigate';
  const kchip = named? `<span class="kchip">${XS.KINGDOM_ANSWER[spec.kingdomKey]}</span>`:'';
  const earthTag = (named&&spec.earth)? `<span class="earthtag">🌍 Earth</span>`:'';
  let objHTML='';
  if(app.phase==='assignment'){ const T=XS.TASKS[spec.task];
    objHTML=`<span class="sep"></span><span class="chip ${T.tone}">${T.name}</span><span class="obj2">${T.obj(spec)}</span>`; }
  else objHTML=`<span class="sep"></span><span class="chip neutral">INVESTIGATE</span><span class="obj2">Identify the specimen</span>`;
  UI.top.innerHTML=
    `<span class="sid">${spec.id}</span>`+
    `<span class="name ${named?'':'unk'}">${named?spec.name:'UNIDENTIFIED SPECIMEN'}</span>${kchip}${earthTag}`+
    objHTML+
    `<span class="sep"></span><span class="rankwrap"><span class="rk">${rank.name}</span><span class="xp">${XS.progress.xp} XP</span></span>`+
    `<button class="ibtn only-mobile" id="tgLeft" title="Panel">📋</button>`+
    `<button class="ibtn only-mobile" id="tgRight" title="Notes">📄</button>`+
    `<button class="ibtn" id="muteBtn" title="Sound">${XS.sfx&&XS.sfx.enabled?'🔊':'🔇'}</button>`+
    `<button class="ibtn" id="codexBtn" title="Codex">📖</button>`+
    `<button class="ibtn" id="menuBtn" title="Menu">☰</button>`;
  $('codexBtn').onclick=()=>{sfx('click');UI.showCodex();}; $('menuBtn').onclick=()=>{sfx('click');UI.showMenu();};
  $('muteBtn').onclick=()=>{ const on=XS.sfx.toggle(); $('muteBtn').textContent=on?'🔊':'🔇'; };
  const tl=$('tgLeft'), tr=$('tgRight');
  if(tl) tl.onclick=()=>{sfx('click');UI.right.classList.remove('open');UI.left.classList.toggle('open');};
  if(tr) tr.onclick=()=>{sfx('click');UI.left.classList.remove('open');UI.right.classList.toggle('open');};
};

/* ---------------- investigation: left worksheet ---------------- */
UI.renderInvestigate=function(){
  const app=XS.app, spec=app.spec;
  const found=spec.inspected.size, total=spec.organelleIds.length;
  const tests=Object.keys(app.tests).length;
  const totalTests=Object.values(XS.SUBS).filter(s=>s.type==='test').length;
  const T=XS.TIERS[app.tier];
  UI.left.innerHTML=
    readoutBlock()+
    `<div class="cap">Investigation</div>`+
    `<div class="prog"><span>Structures identified</span><b>${found}/${total}</b></div>`+
    `<div class="track"><i style="width:${found/total*100}%;background:linear-gradient(90deg,#2f8f7f,var(--aqua))"></i></div>`+
    `<div class="prog" style="margin-top:10px"><span>Assays run</span><b>${tests}/${totalTests}</b></div>`+
    `<div class="track"><i style="width:${tests/totalTests*100}%;background:linear-gradient(90deg,#7a6a2f,var(--warn))"></i></div>`+
    `<div class="hintbox">${T.hint?'💡 Click every structure to identify it, and run assays for hidden clues (a lipid assay tells archaea from bacteria!). Then classify.':'Identify structures &amp; run assays, then classify.'}</div>`+
    `<button class="btn pri wide" id="toClassify">Submit classification →</button>`;
  $('toClassify').onclick=UI.showClassify;
};
UI.updateInvestigate=function(){ /* worksheet static; refreshed on inspect */ };

/* investigation dock: stains */
UI.renderInvestigateDock=function(){
  UI.dock.className='panel dock-tests';
  const tests=Object.keys(XS.SUBS).filter(id=>XS.SUBS[id].type==='test');
  UI.dock.innerHTML=`<div class="dock-lab">ASSAYS &amp; STAINS</div><div class="btn-row tests-row">`+
    tests.map(id=>{const s=XS.SUBS[id];return `<button class="abtn test" data-t="${id}"><b>${s.name}</b><small>${s.short}</small></button>`;}).join('')+
    `</div>`;
  UI.dock.querySelectorAll('[data-t]').forEach(b=>{
    b.onmouseenter=()=>showInfo(XS.SUBS[b.dataset.t].info);
    b.onclick=()=>{ sfx('blip'); const r=XS.runTest(b.dataset.t); readoutHTML=`<div class="ro-name">${XS.SUBS[b.dataset.t].name}</div><div class="ro-fn">${r}</div>`; UI.renderInvestigate(); UI.renderRight(); b.classList.add('used'); };
  });
};

/* ---------------- right readout / dossier ---------------- */
UI.renderRight=function(){
  const app=XS.app, spec=app.spec;
  if(app.phase==='investigate'){
    UI.right.innerHTML=`<div class="cap">Dossier</div>`+dossierHTML(spec);
  } else {
    UI.right.innerHTML=`<div class="cap">Dossier</div>`+dossierHTML(spec)+
      `<div class="hintbox" style="margin-top:10px">${XS.TIERS[app.tier].hint?'💡 '+XS.TASKS[spec.task].hint(spec):'Apply what you learned in the investigation.'}</div>`;
  }
};
function dossierHTML(spec){
  const items=[];
  items.push(`<div class="dl-row"><span>Kingdom</span><b>${spec.inspected.size>0||XS.app.phase!=='investigate'?XS.KINGDOM_ANSWER[spec.kingdomKey]:'?'}</b></div>`);
  items.push(`<div class="dl-row"><span>Structures</span><b>${spec.inspected.size}/${spec.organelleIds.length}</b></div>`);
  const st=XS.app.tests;
  if(st.iodine) items.push(`<div class="dl-row"><span>Starch</span><b>${spec.hasStarch?'yes':'no'}</b></div>`);
  if(st.gram&&spec.gram) items.push(`<div class="dl-row"><span>Gram</span><b>${spec.gram}</b></div>`);
  if(st.lipid&&spec.kingdomKey==='Archaea') items.push(`<div class="dl-row"><span>Lipids</span><b>ether</b></div>`);
  if(XS.app.phase!=='investigate'){
    if(spec.earth) items.push(`<div class="dl-row"><span>Reference</span><b>🌍 ${spec.species}</b></div>`);
    items.push(`<div class="dl-row"><span>Nutrition</span><b>${spec.isVirus?'needs host':spec.chemo?'chemoautotroph':spec.autotroph?'autotroph (light)':'heterotroph (glucose)'}</b></div>`);
    items.push(`<div class="dl-row"><span>Optimum</span><b>pH ${spec.optPH}, ${spec.optT}°C</b></div>`);
    items.push(`<div class="dl-row"><span>Vulnerable to</span><b>${XS.SUBS[spec.kill[0]]?XS.SUBS[spec.kill[0]].name:spec.kill[0]}</b></div>`);
  }
  return `<div class="dossier">${items.join('')}</div>`;
}
function showInfo(txt){ readoutHTML=`<div class="ro-fn">${txt}</div>`; const ro=$('roLeft'); if(ro)ro.innerHTML=readoutHTML; }

/* ---------------- vitals (assignment) ---------------- */
UI.renderVitals=function(){
  const spec=XS.app.spec, T=XS.TASKS[spec.task];
  UI.left.innerHTML=
    `<div class="cap">Vital Signs</div>`+
    `<div class="ring"><svg width="120" height="120"><circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="8"/>`+
    `<circle id="vring" cx="60" cy="60" r="48" fill="none" stroke="var(--mint)" stroke-width="8" stroke-linecap="round" stroke-dasharray="301.6" stroke-dashoffset="301.6" style="transition:stroke-dashoffset .3s,stroke .3s;filter:drop-shadow(0 0 6px rgba(126,255,192,.6))"/></svg>`+
    `<div class="rval"><div class="num" id="vnum">0</div><div class="rlab">${spec.isVirus?'TITRE':'VITALITY'}</div></div></div>`+
    `<div class="bar"><div class="bl"><span>${spec.isVirus?'STABILITY':'INTEGRITY'}</span><b id="intv">100%</b></div><div class="track"><i id="intb" style="width:100%;background:linear-gradient(90deg,#2f8f7f,var(--aqua))"></i></div></div>`+
    `<div class="bar"><div class="bl"><span>HOMEOSTASIS</span><b id="homv">—</b></div><div class="homeo"><span class="mid"></span><i id="homb"></i></div></div>`+
    (T.need>0?`<div class="bar"><div class="bl"><span>OBJECTIVE HOLD · ${T.need}s</span><b id="holdv">0.0s</b></div><div class="track"><i id="holdb" style="width:0;background:linear-gradient(90deg,#8f7a1c,var(--warn))"></i></div></div>`:'')+
    `<div style="height:12px"></div>`+readoutBlock();
  $('vring').style.stroke = T.tone==='good'?'var(--mint)':T.tone==='bad'?'var(--coral)':'var(--warn)';
};
UI.updateAssignment=function(){
  const S=XS.app.S, spec=XS.app.spec, T=XS.TASKS[spec.task]; if(!S)return;
  const C=301.6; const vr=$('vring'); if(!vr)return;
  $('vnum').textContent=Math.round(S.vitality); vr.style.strokeDashoffset=C*(1-S.vitality/100);
  $('intv').textContent=Math.round(S.integrity)+'%'; $('intb').style.width=S.integrity+'%';
  const c=XS.cl(S.comfort/1.1,-1,1), homb=$('homb');
  if(c>=0){homb.style.left='50%';homb.style.width=(c*50)+'%';homb.style.background='linear-gradient(90deg,#2f8f6f,var(--good))';}
  else{homb.style.width=(-c*50)+'%';homb.style.left=(50+c*50)+'%';homb.style.background='linear-gradient(90deg,var(--bad),#8f2f2f)';}
  $('homv').textContent=c>0.2?'stable':c<-0.2?'stressed':'marginal';
  if(T.need>0){ $('holdv').textContent=S.hold.toFixed(1)+'s'; $('holdb').style.width=(S.hold/T.need*100)+'%'; }
  // reagent fill levels
  UI.dock.querySelectorAll('[data-a]').forEach(b=>{const v=S[b.dataset.a]||0;const f=b.querySelector('.lvl');if(f)f.style.width=XS.cl(v,0,100)+'%';});
};

/* ---------------- assignment dock ---------------- */
UI.renderAssignmentDock=function(){
  const spec=XS.app.spec;
  UI.dock.className='panel dock-treat';
  const nutrition=['glucose','light','minerals'].concat(spec.isVirus?['host']:[]);
  const agents=['antibiotic','antifungal','antiviral','lysozyme','detergent','hypotonic','hypertonic','toxin'];
  const btn=id=>{const s=XS.SUBS[id];return `<button class="abtn treat" data-a="${id}"><b>${s.name}</b><small>${s.short}</small><span class="lvl"></span></button>`;};
  UI.dock.innerHTML=
    `<div class="dock-col"><div class="sldwrap"><div class="sh"><span>pH</span><b id="phv">${spec.optPH}</b></div>`+
      `<div class="sldtrack"><div class="optzone" id="phopt"></div><input type="range" id="ph" min="0" max="14" step="0.1" value="${spec.optPH}"></div></div>`+
      `<div class="sldwrap"><div class="sh"><span>TEMP °C</span><b id="tpv">${spec.optT}</b></div>`+
      `<div class="sldtrack"><div class="optzone" id="tpopt"></div><input type="range" id="tp" min="-10" max="110" step="1" value="${spec.optT}"></div></div></div>`+
    `<div class="dsep"></div>`+
    `<div class="dock-group"><div class="dock-lab">NUTRITION</div><div class="btn-row">${nutrition.map(btn).join('')}</div></div>`+
    `<div class="dock-group"><div class="dock-lab">AGENTS</div><div class="btn-row agents">${agents.map(btn).join('')}</div></div>`;
  $('ph').oninput=e=>{XS.setEnv(+e.target.value,null);$('phv').textContent=(+e.target.value).toFixed(1);};
  $('tp').oninput=e=>{XS.setEnv(null,+e.target.value);$('tpv').textContent=Math.round(+e.target.value);};
  UI.dock.querySelectorAll('[data-a]').forEach(b=>{
    b.onmouseenter=()=>showInfo(XS.SUBS[b.dataset.a].info);
    b.onclick=()=>{ sfx('drop'); XS.treat(b.dataset.a); const ro=$('roLeft'); if(ro){readoutHTML=`<div class="ro-fn">${XS.SUBS[b.dataset.a].info}</div>`;ro.innerHTML=readoutHTML;} b.animate([{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:150}); };
  });
  // optimum band markers
  setOpt(spec);
};
function setOpt(spec){
  const pl=(spec.optPH-spec.phBand)/14*100, pw=2*spec.phBand/14*100;
  const po=$('phopt'); if(po){po.style.left=XS.cl(pl,0,100)+'%';po.style.width=XS.cl(pw,0,100)+'%';po.style.display='block';}
  const tl=(spec.optT-spec.tBand+10)/120*100, tw=2*spec.tBand/120*100;
  const to=$('tpopt'); if(to){to.style.left=XS.cl(tl,0,100)+'%';to.style.width=XS.cl(tw,0,100)+'%';to.style.display='block';}
}

/* ---------------- overlays ---------------- */
UI.hideOverlay=function(){ UI.overlay.classList.remove('on'); UI.overlay.innerHTML=''; };
function card(html){ UI.overlay.innerHTML=`<div class="card">${html}</div>`; UI.overlay.classList.add('on'); }

UI.showMenu=function(){
  XS.app.phase='menu';
  // a live specimen drifts behind the menu so the home screen matches the game
  XS.app.demo=XS.genSpecimen(XS.pick(['Plantae','Animalia','Protista','Monera','Fungi']), 'field');
  const rank=XS.rankFor(XS.progress.xp), next=XS.nextRank(XS.progress.xp);
  const cx=XS.codex();
  const pct=next? Math.round((XS.progress.xp - rank.xp)/(next.xp-rank.xp)*100):100;
  const tiers=Object.entries(XS.TIERS).map(([k,t])=>`<button class="tierbtn ${k===XS.app.tier?'sel':''}" data-tier="${k}"><b>${t.label}</b><small>${t.blurb}</small></button>`).join('');
  card(
    `<div class="sub">Xenobiology Division · Live Specimen Bench</div>`+
    `<h1><span class="x">XENO</span><span class="o">SCOPE</span></h1>`+
    `<div class="tagline">Put one alien or Earth cell under the scope — <b>read its biology</b>, then keep it alive or take it down.</div>`+
    `<div class="how">`+
      `<div class="how-step"><div class="how-ico">🔬</div><div><b>Probe</b><small>Click every structure &amp; run assays to identify it</small></div></div>`+
      `<div class="how-step"><div class="how-ico">🧫</div><div><b>Classify</b><small>Name its kingdom — animal to archaeon to virus</small></div></div>`+
      `<div class="how-step"><div class="how-ico">⚗️</div><div><b>Act</b><small>Use the right food, agent or shock for the job</small></div></div>`+
    `</div>`+
    `<div class="rankcard"><div class="rk-left"><div class="rk-big">${rank.name}</div><div class="muted">${XS.progress.xp} XP${next?` · ${next.xp-XS.progress.xp} to ${next.name}`:' · max rank'}</div>`+
      `<div class="xpbar"><i style="width:${pct}%"></i></div></div>`+
      `<div class="rk-stats"><span>🧬 ${cx.organelles.length}/${cx.totalOrganelles} organelles</span><span>🔬 ${cx.organisms.length}/${cx.totalOrganisms} types</span><span>🌍 ${XS.progress.species.length}/${(XS.EARTH||[]).length} Earth life</span><span>✓ ${XS.progress.wins} wins</span></div></div>`+
    `<div class="muted lbl">DIFFICULTY</div>`+
    `<div class="tiers">${tiers}</div>`+
    `<div class="cta"><button class="btn pri" id="startBtn">▶ Receive Specimen</button>`+
      `<button class="btn" id="codexBtn2">📖 Codex</button>`+
      `<button class="btn ghost" id="muteBtn2">${XS.sfx&&XS.sfx.enabled?'🔊 Sound on':'🔇 Sound off'}</button>`+
      (XS.progress.xp>0?`<button class="btn ghost" id="resetBtn">Reset</button>`:'')+`</div>`
  );
  UI.overlay.querySelectorAll('.tierbtn').forEach(b=>b.onclick=()=>{sfx('click');XS.app.tier=b.dataset.tier;UI.overlay.querySelectorAll('.tierbtn').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');});
  $('startBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startRun(XS.app.tier); UI.renderPhase(); };
  $('codexBtn2').onclick=()=>{sfx('click');UI.showCodex();};
  $('muteBtn2').onclick=()=>{ const on=XS.sfx.toggle(); $('muteBtn2').textContent=on?'🔊 Sound on':'🔇 Sound off'; };
  const rb=$('resetBtn'); if(rb) rb.onclick=()=>{ if(confirm('Reset all progress and Codex?')){XS.resetProgress();UI.showMenu();} };
};

UI.showClassify=function(){
  const spec=XS.app.spec;
  const opts=XS.CLASSIFY.map(k=>`<button class="classbtn" data-k="${k}">${k}</button>`).join('');
  card(
    `<div class="sub">Classification</div><h2>Which kingdom is this specimen?</h2>`+
    `<p class="muted">Based on the structures you found${Object.keys(XS.app.tests).length?' and your stain results':''}. ${XS.app.classifyTries?`<span class="rk">Not quite — try again (${XS.app.classifyTries} wrong).</span>`:''}</p>`+
    `<div class="classgrid">${opts}</div>`+
    `<div class="cta"><button class="btn ghost" id="backInv">← keep investigating</button></div>`
  );
  UI.overlay.querySelectorAll('.classbtn').forEach(b=>b.onclick=()=>{
    const r=XS.classify(b.dataset.k);
    if(r.ok){ sfx('ok'); UI.hideOverlay(); UI.showBriefing(); }
    else { sfx('err'); b.classList.add('wrong'); UI.showClassify(); }
  });
  $('backInv').onclick=UI.hideOverlay;
};

UI.showBriefing=function(){
  const spec=XS.app.spec, T=XS.TASKS[spec.task];
  UI.renderTop();
  card(
    `<div class="sub">Specimen identified · ${spec.id}</div>`+
    `<h2>${spec.name} <span class="kchip">${XS.KINGDOM_ANSWER[spec.kingdomKey]}</span>${spec.earth?' <span class="earthtag">🌍 Earth reference</span>':''}</h2>`+
    `<p>${spec.blurb}</p>`+
    (spec.earth&&spec.fact?`<div class="factbox">💡 ${spec.fact}${learn('https://en.wikipedia.org/wiki/'+spec.wiki)}</div>`:'')+
    `<div class="brief-row"><span>Nutrition</span><b>${nutText(spec)}</b></div>`+
    `<div class="brief-row"><span>Comfort</span><b>pH ${spec.optPH} · ${spec.optT}°C</b></div>`+
    `<div class="assign"><div class="chip ${T.tone}">${T.name}</div><div class="assign-obj">${T.obj(spec)}</div></div>`+
    (XS.TIERS[XS.app.tier].hint?`<div class="hintbox">💡 ${T.hint(spec)}</div>`:'')+
    `<div class="cta"><button class="btn pri" id="beginBtn">▶ Begin assignment</button></div>`
  );
  $('beginBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.beginAssignment(); UI.renderPhase(); };
};

UI.showResult=function(){
  const app=XS.app, spec=app.spec, T=XS.TASKS[spec.task], win=app.result.win;
  sfx(win?'win':'lose'); if(app.rankUp) setTimeout(()=>sfx('rank'),650);
  const xpList=app.lastXP.slice(0,5).map(x=>`<div class="xp-row"><span>${x.reason}</span><b>+${x.n}</b></div>`).join('');
  const rankUp=app.rankUp?`<div class="rankup">⬆ Promoted to <b>${app.rankUp.name}</b>! ${app.rankUp.unlock.length?'Unlocked: '+app.rankUp.unlock.map(k=>XS.KINGDOMS[k].label).join(', '):''}</div>`:'';
  card(
    `<div class="sub">Assignment report · ${spec.id}</div>`+
    `<div class="verdict ${win?'win':'lose'}">${win?'✦ '+T.winT:'ASSIGNMENT FAILED'}</div>`+
    `<p>${win?`You correctly handled <b>${spec.name}</b> (${XS.KINGDOM_ANSWER[spec.kingdomKey]}).`:`<b>${spec.name}</b> — ${app.S&&app.S.integrity<=0?'the membrane ruptured':app.S&&app.S.vitality>=100?'it slipped from your control':'the objective was missed'}. Review the biology and try again.`}</p>`+
    rankUp+
    (spec.earth&&spec.fact?`<div class="factbox">💡 ${spec.fact}${learn('https://en.wikipedia.org/wiki/'+spec.wiki)}</div>`:'')+
    `<div class="xp-list">${xpList}</div>`+
    `<div class="rev">FEEDS ON <span class="hl">${spec.isVirus?'host cells':spec.chemo?'minerals (chemoautotroph)':spec.autotroph?'light (photosynthesis)':'glucose'}</span> · VULNERABLE TO <span class="hl">${XS.SUBS[spec.kill[0]]?XS.SUBS[spec.kill[0]].name:spec.kill[0]}</span></div>`+
    `<div class="cta"><button class="btn pri" id="nextBtn">▶ Next specimen</button><button class="btn" id="menuBtn3">☰ Menu</button><button class="btn" id="codexBtn3">📖 Codex</button></div>`
  );
  $('nextBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startRun(XS.app.tier); UI.renderPhase(); };
  $('menuBtn3').onclick=UI.showMenu; $('codexBtn3').onclick=UI.showCodex;
};

UI.showCodex=function(){
  const cx=XS.codex();
  const org=Object.entries(XS.ORG).map(([id,o])=>{const known=XS.progress.organelles.includes(id);
    const more=(XS.MORE||{})[id], wiki=(XS.WIKI||{})[id];
    return `<div class="cx ${known?'':'locked'}"><div class="cx-h"><span class="cx-dot" style="color:${o.col};background:${known?o.col:'#2a3a44'}"></span>${known?o.name:'???'}</div>`+
      (known?`<div class="cx-fn">${o.fn}</div>${more?`<div class="cx-fn">${more}</div>`:''}<div class="cx-fact">💡 ${o.fact}${learn(wiki)}</div>`
            :'<div class="cx-fn muted">Inspect this structure on a specimen to unlock.</div>')+`</div>`;}).join('');
  const orgz=XS.KLIST.map(k=>{const known=XS.progress.organisms.includes(k);const K=XS.KINGDOMS[k];
    return `<div class="cx ${known?'':'locked'}"><div class="cx-h"><span class="cx-dot" style="color:rgb(${K.col.join(',')});background:${known?`rgb(${K.col.join(',')})`:'#2a3a44'}"></span>${known?K.label:'???'}</div>`+
      (known?`<div class="cx-fn">${K.blurb}</div><div class="cx-fact">${learn((XS.KWIKI||{})[k])}</div>`:'<div class="cx-fn muted">Encounter one to unlock.</div>')+`</div>`;}).join('');
  const spx=(XS.EARTH||[]).map(e=>{const known=XS.progress.species.includes(e.species);
    return `<div class="cx ${known?'':'locked'}"><div class="cx-h"><span class="cx-dot" style="color:rgb(${XS.KINGDOMS[e.kind].col.join(',')});background:${known?`rgb(${XS.KINGDOMS[e.kind].col.join(',')})`:'#2a3a44'}"></span>${known?e.species:'??? '+'('+XS.KINGDOMS[e.kind].label+')'}</div>`+
      (known?`<div class="cx-fn">${e.blurb}</div><div class="cx-fact">💡 ${e.fact}${learn('https://en.wikipedia.org/wiki/'+e.wiki)}</div>`:'<div class="cx-fn muted">Encounter this real organism to unlock.</div>')+`</div>`;}).join('');
  card(
    `<div class="sub">Xeno-Codex · ${cx.organelles.length+cx.organisms.length+XS.progress.species.length} entries</div>`+
    `<div class="cx-tabs"><button class="cx-tab sel" data-tab="org">Organelles ${cx.organelles.length}/${cx.totalOrganelles}</button>`+
    `<button class="cx-tab" data-tab="orgz">Types ${cx.organisms.length}/${cx.totalOrganisms}</button>`+
    `<button class="cx-tab" data-tab="spx">Earth life ${XS.progress.species.length}/${(XS.EARTH||[]).length}</button></div>`+
    `<div class="cx-list" id="cxOrg">${org}</div>`+
    `<div class="cx-list" id="cxOrgz" style="display:none">${orgz}</div>`+
    `<div class="cx-list" id="cxSpx" style="display:none">${spx}</div>`+
    `<div class="cta"><button class="btn pri" id="cxClose">Close</button></div>`
  );
  UI.overlay.querySelectorAll('.cx-tab').forEach(b=>b.onclick=()=>{
    UI.overlay.querySelectorAll('.cx-tab').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
    $('cxOrg').style.display=b.dataset.tab==='org'?'':'none'; $('cxOrgz').style.display=b.dataset.tab==='orgz'?'':'none'; $('cxSpx').style.display=b.dataset.tab==='spx'?'':'none';
  });
  $('cxClose').onclick=()=>{ UI.hideOverlay(); if(XS.app.phase==='menu')UI.showMenu(); };
};

})(window.XS);
