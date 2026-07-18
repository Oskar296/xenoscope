/* =====================================================================
   XENOSCOPE · ui.js
   DOM + input for the macro→micro flow.
   Phases: menu · survey (organism) · zoom (tissue cells) · result
===================================================================== */
(function(XS){
"use strict";
const $=id=>document.getElementById(id);
const $$=s=>Array.from(document.querySelectorAll(s));
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
const UI={}; XS.ui=UI;
let readoutHTML='';
function learn(url){ return url?` <a class="learn" href="${url}" target="_blank" rel="noopener">Learn more ↗</a>`:''; }
function sfx(n){ if(XS.sfx) XS.sfx.play(n); }
function readoutBlock(){
  return `<div class="cap notes-cap">🔎 Notes</div>`+
    `<div class="readout" id="roLeft">${readoutHTML||'<span class="muted">Zoom into a tissue and inspect its structures — what you learn is kept here.</span>'}</div>`+
    `<div class="rl-sep"></div>`;
}

UI.init=function(){
  UI.top=$('top'); UI.left=$('left'); UI.right=$('right'); UI.dock=$('dock');
  UI.overlay=$('overlay'); UI.zlab=$('zlab');
  UI.toastWrap=el('div','toastwrap'); UI.toastWrap.id='toasts'; document.body.appendChild(UI.toastWrap);
  const cv=$('c');
  cv.addEventListener('pointermove',onMove);
  cv.addEventListener('pointerdown',onDown);
  cv.addEventListener('pointerdown',()=>{UI.left.classList.remove('open');UI.right.classList.remove('open');});
  cv.addEventListener('pointerleave',()=>{XS.app.hoverPart=null;XS.app.hoverRegion=null;UI.zlab.classList.remove('on');});
  window.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if(XS.app.phase==='zoom'){ XS.exitRegion(); UI.renderPhase(); } else if(UI.overlay.classList.contains('on')&&XS.app.phase!=='menu'&&XS.app.phase!=='result') UI.hideOverlay(); } });
  UI.showMenu();
};

/* ---------------- canvas input ---------------- */
function onMove(e){
  const app=XS.app;
  if(app.phase==='survey'){ const r=XS.regionAt(app,e.clientX,e.clientY); app.hoverRegion=r;
    if(r){ UI.zlab.innerHTML=`<b>${r.name}</b> <span class="s">· ${r.scanned?'scanned':'click to zoom in'}</span>`; UI.zlab.style.left=e.clientX+'px'; UI.zlab.style.top=e.clientY+'px'; UI.zlab.classList.add('on'); }
    else UI.zlab.classList.remove('on'); return; }
  if(app.phase==='zoom'){ const p=XS.partAt(app,e.clientX,e.clientY); app.hoverPart=p;
    if(p){ const o=XS.ORG[p.id]; const known=app.spec.inspected.has(p.id);
      UI.zlab.innerHTML= known?`<b>${o.name}</b>`:`unidentified structure <span class="s">· click to inspect</span>`;
      UI.zlab.style.left=e.clientX+'px'; UI.zlab.style.top=e.clientY+'px'; UI.zlab.classList.add('on'); }
    else UI.zlab.classList.remove('on'); return; }
  app.hoverPart=null; app.hoverRegion=null; UI.zlab.classList.remove('on');
}
function onDown(e){
  const app=XS.app;
  if(app.phase==='survey'){ const r=XS.regionAt(app,e.clientX,e.clientY); if(r){ sfx('scan'); XS.enterRegion(r); UI.renderPhase(); } return; }
  if(app.phase==='zoom'){ if(app.scan) return; const p=XS.partAt(app,e.clientX,e.clientY); if(!p) return;
    sfx('scan'); app.scan={active:true,x:e.clientX,y:e.clientY,start:app.time,dur:850,part:p}; return; }
}

/* ---------------- per-frame ---------------- */
UI.tick=function(dt){
  const app=XS.app;
  if(app.scan && app.scan.active && app.time-app.scan.start>=app.scan.dur){
    const info=XS.inspect(app.scan.part); app.scan=null;
    if(info){ sfx('blip'); readoutHTML=`<div class="ro-name">${info.name}</div><div class="ro-fn">${info.fn}</div>`+
      (info.more?`<div class="ro-more">${info.more}</div>`:'')+`<div class="ro-fact">💡 ${info.fact}${learn(info.wiki)}</div>`; }
    UI.renderTop(); UI.renderLeft();
  }
  if(app.phase==='survey'||app.phase==='zoom') UI.updateVitals();
  if(app.toasts && app.toasts.length) UI.showToast(app.toasts.shift());
};
UI.showToast=function(t){ sfx('rank');
  const d=el('div','toast',`<div class="t-ico">${t.icon}</div><div><div class="t-t">🏆 Achievement — ${t.title}</div><div class="t-d">${t.desc}</div></div>`);
  UI.toastWrap.appendChild(d); requestAnimationFrame(()=>d.classList.add('in'));
  setTimeout(()=>{ d.classList.remove('in'); setTimeout(()=>d.remove(),400); },4400);
};

/* ---------------- phase router ---------------- */
UI.renderPhase=function(){ UI.top.style.display='flex'; UI.renderTop(); UI.renderLeft(); UI.renderRight(); UI.renderDock(); };

/* ---------------- top bar ---------------- */
UI.renderTop=function(){
  const app=XS.app, sc=app.sc; if(!sc){ UI.top.innerHTML=''; return; }
  const O=XS.OBJECTIVE_INFO[sc.objective], rank=XS.rankFor(XS.progress.xp);
  const where = app.phase==='zoom'&&app.zoomRegion ? `<span class="obj2">${app.zoomRegion.name}</span>` : `<span class="obj2">${sc.A.label} · ${sc.planet.name}</span>`;
  UI.top.innerHTML=
    `<span class="sid">${sc.objective==='preserve'?'RES':'NTR'}-${(sc.name.length*7)%900+100}</span>`+
    `<span class="name">${sc.name}</span>`+
    `<span class="sep"></span><span class="chip ${O.tone}">${O.label}</span>${where}`+
    `<span class="sep"></span><span class="rankwrap"><span class="rk">${rank.name}</span><span class="xp">${XS.progress.xp} XP</span></span>`+
    `<button class="ibtn only-mobile" id="tgLeft">📋</button><button class="ibtn only-mobile" id="tgRight">📄</button>`+
    `<button class="ibtn" id="muteBtn">${XS.sfx&&XS.sfx.enabled?'🔊':'🔇'}</button>`+
    `<button class="ibtn" id="codexBtn">📖</button><button class="ibtn" id="menuBtn">☰</button>`;
  $('codexBtn').onclick=()=>{sfx('click');UI.showCodex();}; $('menuBtn').onclick=()=>{sfx('click');UI.showMenu();};
  $('muteBtn').onclick=()=>{ const on=XS.sfx.toggle(); $('muteBtn').textContent=on?'🔊':'🔇'; };
  const tl=$('tgLeft'),tr=$('tgRight');
  if(tl) tl.onclick=()=>{sfx('click');UI.right.classList.remove('open');UI.left.classList.toggle('open');};
  if(tr) tr.onclick=()=>{sfx('click');UI.left.classList.remove('open');UI.right.classList.toggle('open');};
};

/* ---------------- left: vitals (+ notes when zoomed) ---------------- */
UI.renderLeft=function(){
  const app=XS.app, sc=app.sc; if(!sc) return;
  const preserve=sc.objective==='preserve';
  const ringCol=preserve?'var(--mint)':'var(--coral)';
  UI.left.innerHTML=
    `<div class="cap">${preserve?'Host Vitals':'Threat Status'}</div>`+
    `<div class="ring"><svg width="120" height="120"><circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="8"/>`+
    `<circle id="vring" cx="60" cy="60" r="48" fill="none" stroke="${ringCol}" stroke-width="8" stroke-linecap="round" stroke-dasharray="301.6" stroke-dashoffset="301.6" style="transition:stroke-dashoffset .3s"/></svg>`+
    `<div class="rval"><div class="num" id="vnum">0</div><div class="rlab">${preserve?'VITALITY':'RESILIENCE'}</div></div></div>`+
    `<div class="bar"><div class="bl"><span>${preserve?'CURE PROGRESS':'TAKEDOWN'}</span><b id="pv">0%</b></div><div class="track"><i id="pb" style="width:0;background:linear-gradient(90deg,#2f8f7f,var(--aqua))"></i></div></div>`+
    `<div class="bar"><div class="bl"><span>${preserve?'HOST STRESS':'ADAPTATION'}</span><b id="sv">0%</b></div><div class="track"><i id="sb" style="width:0;background:linear-gradient(90deg,#8f2f2f,var(--coral))"></i></div></div>`+
    (app.phase==='zoom'?`<div style="height:12px"></div>`+readoutBlock():'');
};
UI.updateVitals=function(){
  const sc=XS.app.sc; if(!sc) return; const C=301.6, vr=$('vring'); if(!vr) return;
  const preserve=sc.objective==='preserve';
  const main = preserve? sc.host : (100-sc.P);
  $('vnum').textContent=Math.round(main); vr.style.strokeDashoffset=C*(1-main/100);
  const pb=$('pb'); if(pb){ pb.style.width=sc.P+'%'; $('pv').textContent=Math.round(sc.P)+'%'; }
  const sb=$('sb'); if(sb){ sb.style.width=sc.resist+'%'; $('sv').textContent=Math.round(sc.resist)+'%'; }
};

/* ---------------- right ---------------- */
UI.renderRight=function(){
  const app=XS.app, sc=app.sc; if(!sc) return;
  if(app.phase==='survey'){
    const O=XS.OBJECTIVE_INFO[sc.objective];
    const regions=sc.regions.map(r=>`<div class="dl-row"><span>${r.scanned?(r.id===sc.keyId?'⚠':'✓'):'◦'} ${r.name}</span><b>${r.scanned?(r.id===sc.keyId?(sc.objective==='preserve'?'afflicted':'target'):'clear'):'—'}</b></div>`).join('');
    UI.right.innerHTML=`<div class="cap">Briefing</div>`+
      `<div class="brief">${sc.brief}</div>`+
      `<div class="brief-sub">${sc.A.blurb}</div>`+
      `<div class="cap" style="margin-top:12px">Regions ${sc.regions.filter(r=>r.scanned).length}/${sc.regions.length}</div>`+
      `<div class="dossier">${regions}</div>`+
      `<div class="hintbox">💡 Click the glowing markers on the organism to zoom into each tissue and diagnose it.</div>`;
  } else { // zoom
    const d=XS.diagnosis(); const hint=(XS.TIERS[app.tier]||{}).hint;
    UI.right.innerHTML=`<div class="cap">Diagnosis · ${app.zoomRegion.name}</div>`+
      `<div class="diag ${d.bad?'bad':'good'}"><div class="diag-t">${d.title}</div><div class="diag-b">${d.body}</div>`+
      (d.why?`<div class="diag-why">${d.why}</div>`:'')+
      (d.bad&&hint&&d.agentLabel?`<div class="diag-rx">→ Treat with <b>${d.agentLabel}</b></div>`:'')+`</div>`+
      `<div class="hintbox" style="margin-top:10px">Inspect the cells to learn their biology, then apply a treatment below. ${app.zoomRegion.tissue?'<span class="muted">Tissue: '+app.zoomRegion.tissue+'</span>':''}</div>`;
  }
};

/* ---------------- dock ---------------- */
UI.renderDock=function(){
  const app=XS.app, sc=app.sc; if(!sc) return;
  if(app.phase==='survey'){
    UI.dock.className='panel dock-survey';
    UI.dock.innerHTML=`<div class="survey-hint">🛰 <b>${XS.OBJECTIVE_INFO[sc.objective].verb} this organism.</b> ${XS.OBJECTIVE_INFO[sc.objective].goal} — click the markers to investigate its tissues.</div>`;
    return;
  }
  // zoom: treatment dock
  UI.dock.className='panel dock-treat';
  const opts=XS.treatmentOptions(sc);
  const btn=id=>{const t=XS.TREATMENTS.find(x=>x.id===id)||{label:id,desc:''};return `<button class="abtn treat" data-a="${id}"><b>${t.label}</b><small>${t.desc.split('.')[0]}</small></button>`;};
  UI.dock.innerHTML=`<button class="abtn back" id="backBtn"><b>← Organism</b><small>zoom out</small></button>`+
    `<div class="dsep"></div>`+
    `<div class="dock-group"><div class="dock-lab">APPLY TREATMENT to ${app.zoomRegion.name}</div><div class="btn-row treat-row">${opts.map(btn).join('')}</div></div>`;
  $('backBtn').onclick=()=>{ sfx('click'); XS.exitRegion(); UI.renderPhase(); };
  UI.dock.querySelectorAll('[data-a]').forEach(b=>{
    b.onmouseenter=()=>{ const t=XS.TREATMENTS.find(x=>x.id===b.dataset.a); readoutHTML=`<div class="ro-fn">${t?t.desc:''}</div>`; const ro=$('roLeft'); if(ro)ro.innerHTML=readoutHTML; };
    b.onclick=()=>{ const res=XS.treatRegion(b.dataset.a); if(!res)return;
      sfx(res.ok?'ok':'err');
      readoutHTML=`<div class="ro-name" style="color:${res.ok?'var(--mint)':'var(--coral)'}">${res.ok?'✓ '+res.msg:'✗ '+res.msg}</div>`;
      const ro=$('roLeft'); if(ro)ro.innerHTML=readoutHTML;
      b.animate([{transform:'scale(.95)'},{transform:'scale(1)'}],{duration:150});
      UI.updateVitals();
      if(XS.app.result) UI.showResult();
    };
  });
};

/* ---------------- overlays ---------------- */
UI.hideOverlay=function(){ UI.overlay.classList.remove('on'); UI.overlay.innerHTML=''; };
function card(html){ UI.overlay.innerHTML=`<div class="card">${html}</div>`; UI.overlay.classList.add('on'); }

UI.showMenu=function(){
  XS.app.phase='menu'; XS.app.sc=null;
  XS.app.demo=XS.genSpecimen(XS.pick(['Plantae','Animalia','Fungi']),'field');
  const rank=XS.rankFor(XS.progress.xp), next=XS.nextRank(XS.progress.xp), p=XS.progress;
  const pct=next?Math.round((p.xp-rank.xp)/(next.xp-rank.xp)*100):100;
  const cx=XS.codex();
  const tiers=Object.entries(XS.TIERS).map(([k,t])=>`<button class="tierbtn ${k===XS.app.tier?'sel':''}" data-tier="${k}"><b>${t.label}</b><small>${t.blurb}</small></button>`).join('');
  card(
    `<div class="sub">Xenobiology Division · Field Expedition</div>`+
    `<h1><span class="x">XENO</span><span class="o">SCOPE</span></h1>`+
    `<div class="tagline">Study a whole alien organism on its exoplanet. <b>Zoom into its tissues</b>, diagnose the problem, then <span class="gd">preserve</span> it or <span class="rk">neutralise</span> it.</div>`+
    `<div class="how">`+
      `<div class="how-step"><div class="how-ico">🪐</div><div><b>Survey</b><small>See the creature on its world &amp; read your orders</small></div></div>`+
      `<div class="how-step"><div class="how-ico">🔬</div><div><b>Zoom in</b><small>Enter a tissue, inspect cells, find the cause</small></div></div>`+
      `<div class="how-step"><div class="how-ico">⚗️</div><div><b>Treat</b><small>Cure the infection, or exploit the weakness</small></div></div>`+
    `</div>`+
    `<div class="rankcard"><div class="rk-left"><div class="rk-big">${rank.name}</div><div class="muted">${p.xp} XP${next?` · ${next.xp-p.xp} to ${next.name}`:' · max rank'}</div><div class="xpbar"><i style="width:${pct}%"></i></div></div>`+
      `<div class="rk-stats"><span>💚 ${p.saves} saved</span><span>☠️ ${p.kills} neutralised</span><span>🧬 ${cx.organelles.length}/${cx.totalOrganelles} organelles</span></div></div>`+
    `<div class="muted lbl">DIFFICULTY</div><div class="tiers">${tiers}</div>`+
    `<div class="cta"><button class="btn pri" id="startBtn">▶ Receive Assignment</button>`+
      `<button class="btn" id="dailyBtn">🗓 Daily</button><button class="btn" id="codexBtn2">📖 Codex</button>`+
      `<button class="btn" id="achBtn">🏆 ${p.badges.length}/${XS.ACHIEVEMENTS.length}</button></div>`+
    `<div class="setrow"><span class="setlbl">🔊</span><input type="range" id="volSld" min="0" max="100" value="${Math.round((XS.sfx?XS.sfx.volume:.7)*100)}">`+
      `<button class="chipbtn ${XS.sfx&&XS.sfx.enabled?'on':''}" id="muteBtn2">${XS.sfx&&XS.sfx.enabled?'Sound on':'Muted'}</button>`+
      `<button class="chipbtn ${XS.sfx&&XS.sfx.ambient?'on':''}" id="ambBtn">Ambient</button>`+
      (p.xp>0?`<button class="chipbtn" id="resetBtn">Reset</button>`:'')+`</div>`
  );
  UI.overlay.querySelectorAll('.tierbtn').forEach(b=>b.onclick=()=>{sfx('click');XS.app.tier=b.dataset.tier;UI.overlay.querySelectorAll('.tierbtn').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');});
  $('startBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startMission(null,XS.app.tier); UI.renderPhase(); };
  $('dailyBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startDaily(); UI.renderPhase(); };
  $('codexBtn2').onclick=()=>{sfx('click');UI.showCodex();};
  $('achBtn').onclick=()=>{ sfx('click'); UI.showAchievements(); };
  $('volSld').oninput=e=>{ if(XS.sfx) XS.sfx.setVolume((+e.target.value)/100); };
  $('volSld').onchange=()=>sfx('blip');
  $('muteBtn2').onclick=()=>{ const on=XS.sfx.toggle(); const b=$('muteBtn2'); b.textContent=on?'Sound on':'Muted'; b.classList.toggle('on',on); };
  $('ambBtn').onclick=()=>{ const on=XS.sfx.toggleAmbient(); $('ambBtn').classList.toggle('on',on); };
  const rb=$('resetBtn'); if(rb) rb.onclick=()=>{ if(confirm('Reset all progress and Codex?')){XS.resetProgress();UI.showMenu();} };
};

UI.showAchievements=function(){
  const list=XS.ACHIEVEMENTS.map(a=>{const got=XS.progress.badges.includes(a.id);
    return `<div class="ach ${got?'got':''}"><div class="ach-ico">${got?a.icon:'🔒'}</div><div><div class="ach-n">${got?a.name:'???'}</div><div class="ach-d">${a.desc}</div></div></div>`;}).join('');
  card(`<div class="sub">Achievements · ${XS.progress.badges.length}/${XS.ACHIEVEMENTS.length}</div><div class="ach-grid">${list}</div><div class="cta"><button class="btn pri" id="achClose">Close</button></div>`);
  $('achClose').onclick=()=>{ UI.hideOverlay(); UI.showMenu(); };
};

UI.showResult=function(){
  const app=XS.app, sc=app.sc, O=XS.OBJECTIVE_INFO[sc.objective], win=app.result.win;
  sfx(win?'win':'lose'); if(app.rankUp) setTimeout(()=>sfx('rank'),650);
  const xpList=app.lastXP.slice(0,5).map(x=>`<div class="xp-row"><span>${x.reason}</span><b>+${x.n}</b></div>`).join('');
  const rankUp=app.rankUp?`<div class="rankup">⬆ Promoted to <b>${app.rankUp.name}</b>!</div>`:'';
  const flawless=win&&app.missionWrong===0?`<div class="streakline">🎯 Clean diagnosis — no wrong treatments</div>`:'';
  const shareStr=app.daily?`XENOSCOPE Daily ${XS.dailyKey()} — ${sc.name} ${win?'✅ '+O.label.toLowerCase():'❌ failed'}`:'';
  const dailyBlock=app.daily?`<div class="sharebox"><div class="share-h">🗓 Daily ${XS.dailyKey()}</div><div class="sharestr" id="shareStr">${shareStr}</div><button class="chipbtn" id="copyShare">📋 Copy result</button></div>`:'';
  card(
    `<div class="sub">Field report · ${sc.name}</div>`+
    `<div class="verdict ${win?'win':'lose'}">${win?'✦ '+O.winT:'ASSIGNMENT FAILED'}</div>`+
    `<p>${win?`You correctly ${sc.objective==='preserve'?'diagnosed and cured':'found the weakness of'} <b>${sc.name}</b>, ${sc.A.body}.`:`<b>${sc.name}</b> — ${app.result.why||'the objective was missed'}.`}</p>`+
    rankUp+flawless+
    `<div class="rev">CAUSE · <span class="hl">${sc.objective==='preserve'?XS.PATHOGENS[sc.pathType].label:'structural weakness'}</span> · CORRECT TREATMENT · <span class="hl">${XS.agentName(sc.agent)}</span></div>`+
    `<div class="xp-list">${xpList}</div>`+ dailyBlock+
    `<div class="cta"><button class="btn pri" id="nextBtn">▶ Next assignment</button><button class="btn" id="menuBtn3">☰ Menu</button><button class="btn" id="codexBtn3">📖 Codex</button></div>`
  );
  $('nextBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startMission(null,XS.app.tier); UI.renderPhase(); };
  $('menuBtn3').onclick=UI.showMenu; $('codexBtn3').onclick=UI.showCodex;
  const cs=$('copyShare'); if(cs) cs.onclick=()=>{ try{ navigator.clipboard.writeText(shareStr); cs.textContent='✓ Copied'; }catch(e){ cs.textContent='select ↑'; } };
};

UI.showCodex=function(){
  const cx=XS.codex();
  const org=Object.entries(XS.ORG).map(([id,o])=>{const known=XS.progress.organelles.includes(id);const more=(XS.MORE||{})[id],wiki=(XS.WIKI||{})[id];
    return `<div class="cx ${known?'':'locked'}"><div class="cx-h"><span class="cx-dot" style="color:${o.col};background:${known?o.col:'#2a3a44'}"></span>${known?o.name:'???'}</div>`+
      (known?`<div class="cx-fn">${o.fn}</div>${more?`<div class="cx-fn">${more}</div>`:''}<div class="cx-fact">💡 ${o.fact}${learn(wiki)}</div>`:'<div class="cx-fn muted">Inspect this structure on a specimen to unlock.</div>')+`</div>`;}).join('');
  const orgz=XS.KLIST.map(k=>{const known=XS.progress.organisms.includes(k);const K=XS.KINGDOMS[k];
    return `<div class="cx ${known?'':'locked'}"><div class="cx-h"><span class="cx-dot" style="color:rgb(${K.col.join(',')});background:${known?`rgb(${K.col.join(',')})`:'#2a3a44'}"></span>${known?K.label:'???'}</div>`+
      (known?`<div class="cx-fn">${K.blurb}</div><div class="cx-fact">${learn((XS.KWIKI||{})[k])}</div>`:'<div class="cx-fn muted">Encounter these cells to unlock.</div>')+`</div>`;}).join('');
  card(`<div class="sub">Xeno-Codex · ${cx.organelles.length+cx.organisms.length} entries</div>`+
    `<div class="cx-tabs"><button class="cx-tab sel" data-tab="org">Organelles ${cx.organelles.length}/${cx.totalOrganelles}</button>`+
    `<button class="cx-tab" data-tab="orgz">Cell types ${cx.organisms.length}/${cx.totalOrganisms}</button></div>`+
    `<div class="cx-list" id="cxOrg">${org}</div><div class="cx-list" id="cxOrgz" style="display:none">${orgz}</div>`+
    `<div class="cta"><button class="btn pri" id="cxClose">Close</button></div>`);
  UI.overlay.querySelectorAll('.cx-tab').forEach(b=>b.onclick=()=>{ UI.overlay.querySelectorAll('.cx-tab').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
    $('cxOrg').style.display=b.dataset.tab==='org'?'':'none'; $('cxOrgz').style.display=b.dataset.tab==='orgz'?'':'none'; });
  $('cxClose').onclick=()=>{ UI.hideOverlay(); if(XS.app.phase==='menu')UI.showMenu(); };
};

})(window.XS);
