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
/* inspecting these structures adds a diagnostic clue to the region's evidence */
const STRUCT_CLUE={
  wall_cellulose:'Rigid cellulose cell wall seen.', wall_chitin:'Chitin cell wall seen.',
  wall_pepti:'Peptidoglycan cell wall seen.', wall_slayer:'Protein S-layer wall — no peptidoglycan.',
  nucleus:'A true nucleus is present (eukaryote).', nucleoid:'DNA loose as a nucleoid (prokaryote).',
  chloroplast:'Chloroplasts present (photo-autotroph).', thylakoid:'Photosynthetic membranes present.',
  flagellum:'A flagellum for swimming.', cilia:'Cilia for movement.', pseudopod:'Pseudopodia — crawls & engulfs.',
  contractile:'A contractile vacuole — a wall-less freshwater cell.', capsid:'A viral capsid — not a cell at all.', envelope:'A lipid envelope (soap-sensitive).',
};
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
  UI.coach=el('div','coach'); UI.coach.id='coach'; UI.coach.style.display='none'; document.body.appendChild(UI.coach);
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
    const part=app.scan.part, info=XS.inspect(part); app.scan=null;
    if(info){ sfx('blip'); readoutHTML=`<div class="ro-name">${info.name}</div><div class="ro-fn">${info.fn}</div>`+
      (info.more?`<div class="ro-more">${info.more}</div>`:'')+`<div class="ro-fact">💡 ${info.fact}${learn(info.wiki)}</div>`;
      const clue=STRUCT_CLUE[part.id], reg=app.zoomRegion;
      if(clue && reg && reg.evidence.indexOf(clue)<0){ reg.evidence.push(clue); reg.recon=true; } }
    UI.renderTop(); UI.renderLeft(); if(app.phase==='zoom'){ UI.renderRight(); UI.renderDock(); }
  }
  if(app.phase==='survey'||app.phase==='zoom') UI.updateVitals();
  if(app.toasts && app.toasts.length) UI.showToast(app.toasts.shift());
  if(app.tutorial){ const s=XS.tutorialStep(); if(s>app.tutorial.step){ app.tutorial.step=s; UI.updateCoach(); } }
};
/* interactive tutorial coach banner */
UI.startTutorial=function(){ XS.startTutorial(); UI.renderPhase(); UI.updateCoach(); };
UI.updateCoach=function(){ const T=XS.app.tutorial; if(!T){ UI.coach.style.display='none'; return; }
  const msgs=[
    {t:'Step 1 · Survey', d:'This is a whole alien organism on its exoplanet. Its tissues are marked with glowing rings. <b>Click a ring</b> on the organism to zoom into that tissue.'},
    {t:'Step 2 · Analyse', d:'In the dock below, run a couple of <b>Lab assays</b>. Since something is <i>infecting</i> this tissue, the <b>Particle morphology</b> and <b>Invader coat assay</b> examine the invader itself. Each result lands in the <b>Evidence</b> panel on the right.'},
    {t:'Step 3 · Diagnose', d:'Read the Evidence: the invader is <b>rod-shaped with a peptidoglycan wall</b> and its own ribosomes — that means a <b>Bacterium</b>. Hit <b>⌖ Identify</b> and pick it.'},
    {t:'Step 4 · Treat', d:'Treatments just unlocked. A bacterium is destroyed by an <b>Antibiotic</b> — click it, and keep applying until the infection clears.'},
    {t:'✓ You’ve got it!', d:'That’s the whole loop: <b>Survey → Analyse → Diagnose → Treat</b>. Match the right treatment to the evidence and you win. On harder tiers you’ll juggle more clues and complications — but it’s always these four steps.'},
  ];
  const m=msgs[T.step]||msgs[0], done=T.step>=4;
  UI.coach.innerHTML=`<div class="coach-h">🎓 ${m.t}</div><div class="coach-d">${m.d}</div>`+
    `<div class="coach-btns">${done?'<button class="btn pri" id="coachDone">▶ Start playing</button>':'<button class="chipbtn" id="coachSkip">Skip tutorial</button>'}</div>`;
  UI.coach.style.display='block';
  const sk=$('coachSkip'); if(sk) sk.onclick=()=>{ XS.endTutorial(); UI.coach.style.display='none'; UI.showMenu(); };
  const dn=$('coachDone'); if(dn) dn.onclick=()=>{ XS.endTutorial(); UI.coach.style.display='none'; UI.showMenu(); };
};
UI.showToast=function(t){ sfx('rank');
  const d=el('div','toast',`<div class="t-ico">${t.icon}</div><div><div class="t-t">🏆 Achievement — ${t.title}</div><div class="t-d">${t.desc}</div></div>`);
  UI.toastWrap.appendChild(d); requestAnimationFrame(()=>d.classList.add('in'));
  setTimeout(()=>{ d.classList.remove('in'); setTimeout(()=>d.remove(),400); },4400);
};

/* ---------------- phase router ---------------- */
UI.renderPhase=function(){ UI.top.style.display='flex'; UI.renderTop(); UI.renderLeft(); UI.renderRight(); UI.renderDock(); if(!XS.app.tutorial && UI.coach) UI.coach.style.display='none'; };

/* ---------------- top bar ---------------- */
UI.renderTop=function(){
  const app=XS.app, sc=app.sc; if(!sc){ UI.top.innerHTML=''; return; }
  const O=XS.OBJECTIVE_INFO[sc.objective], rank=XS.rankFor(XS.progress.xp);
  const loc = app.phase==='zoom'&&app.zoomRegion ? app.zoomRegion.name : `${sc.A.label} · ${sc.planet.name}`;
  UI.top.innerHTML=
    `<span class="chip ${O.tone}">${O.label}</span>`+
    `<span class="titlewrap"><span class="name">${sc.name}</span><span class="obj2">${loc}</span></span>`+
    `<span class="topgap"></span>`+
    `<span class="rankpill"><span class="rk">${rank.name}</span><span class="xp">${XS.progress.xp}</span></span>`+
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
    const regions=sc.regions.map(r=>{ const st=r.recon?(r.id===sc.keyId?'target':'clear'):(r.scanned?'seen':'—');
      const ico=r.recon?(r.id===sc.keyId?'⚠':'✓'):'◦';
      return `<div class="dl-row"><span>${ico} ${r.name}</span><b>${st}</b></div>`; }).join('');
    const cmp=(sc.traits&&sc.traits.length)?`<div class="cap" style="margin-top:12px">⚠ Complications</div>`+
      sc.traits.map(tr=>`<div class="cmp"><b>${tr.tag} ${tr.label}</b><small>${tr.hint}</small></div>`).join(''):'';
    UI.right.innerHTML=`<div class="cap">Briefing</div>`+
      `<div class="brief">${sc.brief}</div>`+
      `<div class="brief-sub">${sc.A.blurb}</div>`+ cmp +
      `<div class="cap" style="margin-top:12px">Tissues analysed ${sc.regions.filter(r=>r.recon).length}/${sc.regions.length}</div>`+
      `<div class="dossier">${regions}</div>`+
      `<div class="hintbox">💡 Click the glowing markers to zoom into each tissue, then run <b>lab assays</b> to work out what you’re dealing with.</div>`;
  } else { // zoom — Field Analysis (deduction, no free answer)
    const r=app.zoomRegion, isKey=r.id===sc.keyId, preserve=sc.objective==='preserve';
    const internHint=(XS.TIERS[app.tier]||{}).hint && app.tier==='intern';
    let threat;
    if(r.symbiont && r.recon){ threat='<div class="th sym">🤝 A beneficial symbiont lives here — treating this tissue would harm the host. Leave it alone.</div>'; }
    else if(r.decoy && r.recon){ threat='<div class="th sym">✖ Necrotic decoy — already-dead debris that only looks infected. This is NOT the active focus.</div>'; }
    else if(r.recon){ threat = isKey
        ? (preserve?('<div class="th bad">⚠ An invader is multiplying in this tissue.</div>'
                    + (sc.cures?'<div class="th sym">✚ Mixed infection — a SECOND invader is also present. You will need two cures.</div>':''))
                   :'<div class="th bad">⚠ Exposed tissue — the organism can’t defend it here. A viable target.</div>')
                   + (sc.shielded?'<div class="th sym">🛡 A biofilm shields these cells — strip it with detergent before the real agent will land.</div>':'')
        : '<div class="th good">✓ This tissue is clear — the cause is elsewhere.</div>'; }
    else threat='<div class="th muted">Run a lab assay to survey this tissue.</div>';
    const ev = r.evidence.length? r.evidence.map(e=>`<div class="ev-row">• ${e}</div>`).join('')
      : '<div class="muted" style="font-size:11.5px;line-height:1.5">No findings yet. Run the lab assays below, and click the cell’s structures to inspect them.</div>';
    let concl='';
    if(r.diagnosed){ const why=preserve?XS.PATHOGENS[sc.pathType].why:XS.WEAKNESS_WHY[sc.agent];
      concl=`<div class="diag good"><div class="diag-t">✓ DIAGNOSIS · ${sc.dxAnswer}</div><div class="diag-why">${why}</div><div class="diag-rx">Now apply the matching treatment.</div></div>`;
    } else if(internHint && r.recon && isKey){
      concl=`<div class="diag bad"><div class="diag-t">Intern hint</div><div class="diag-b">${preserve?XS.PATHOGENS[sc.pathType].tell:'Its wall material and metabolism point to a single weakness — read the evidence.'}</div></div>`;
    }
    const tagRow=(sc.traits&&sc.traits.length)?`<div class="cmp-tags">${sc.traits.map(tr=>`<span class="cmp-tag">${tr.tag}</span>`).join('')}</div>`:'';
    UI.right.innerHTML=`<div class="cap">Field Analysis · ${r.name}</div>`+ tagRow + threat +
      `<div class="cap" style="margin-top:12px">Evidence · ${r.evidence.length}</div>`+
      `<div class="ev-list">${ev}</div>`+ concl +
      `<div class="hintbox" style="margin-top:10px">${sc.diagnosed?'Apply the one agent its biology can’t withstand. Wrong agents are punished.':'Gather evidence, then <b>⌖ Identify</b> the cause to unlock treatments.'}</div>`;
  }
};

/* ---------------- dock ---------------- */
/* a 4-step progress tracker so it's always clear what to do next */
function stepBar(active){ const steps=['Survey','Analyse','Diagnose','Treat'];
  return `<div class="stepbar">`+steps.map((s,i)=>`<span class="stepchip ${i===active?'on':''} ${i<active?'done':''}">${i<active?'✓':(i+1)} ${s}</span>`).join('<span class="steparr">→</span>')+`</div>`; }
UI.renderDock=function(){
  const app=XS.app, sc=app.sc; if(!sc) return;
  if(app.phase==='survey'){
    UI.dock.className='panel dock-survey';
    const O=XS.OBJECTIVE_INFO[sc.objective];
    UI.dock.innerHTML=stepBar(0)+
      `<div class="survey-hint">🛰 <b>${O.verb} this organism.</b> ${O.goal}<br>`+
      `<span class="muted">👉 Click a glowing marker on the organism to zoom into a tissue and start investigating.</span></div>`;
    return;
  }
  // zoom: assays → identify → (gated) treatments
  const r=app.zoomRegion;
  UI.dock.className='panel dock-treat';
  const assays=XS.zoomAssays(sc,r);
  const out0=sc.assayBudget!=null && sc.assayBudget<=0;
  const abtn=a=>{ const used=r.tests[a.id], dis=out0&&!used;
    return `<button class="abtn assay ${used?'used':''} ${dis?'dis':''}" data-assay="${a.id}"><b>${a.label}</b><small>${a.short}</small></button>`; };
  const assayLab=`Lab assays${sc.assayBudget!=null?' · <b>'+sc.assayBudget+'</b> charges left':''}`;
  const dxDone=r.diagnosed, canTreat=XS.canTreat(sc,r);
  const active = dxDone?3:(r.recon?2:1);
  const idGroup = dxDone
    ? `<div class="dock-group idgroup"><div class="dock-lab">② Diagnose</div><div class="dx-done">✓ ${sc.dxAnswer}</div></div>`
    : `<div class="dock-group idgroup ${active===2?'active':''}"><div class="dock-lab">② Diagnose</div><button class="abtn identify" id="idBtn"><b>⌖ Identify</b><small>${active===2?'ready — name the cause':'gather evidence first'}</small></button></div>`;
  let treatGroup='';
  if(canTreat){ const opts=XS.treatmentOptions(sc);
    const tb=id=>{const t=XS.TREATMENTS.find(x=>x.id===id)||{label:id,desc:''};return `<button class="abtn treat" data-a="${id}"><b>${t.label}</b><small>${t.desc.split('.')[0]}</small></button>`;};
    treatGroup=`<div class="dsep"></div><div class="dock-group ${active===3?'active':''}"><div class="dock-lab">③ Treat · ${r.name}</div><div class="btn-row treat-row">${opts.map(tb).join('')}</div></div>`;
  }
  UI.dock.innerHTML=stepBar(active)+
    `<button class="abtn back" id="backBtn"><b>← Organism</b><small>zoom out</small></button>`+
    `<div class="dsep"></div>`+
    `<div class="dock-group ${active===1?'active':''}"><div class="dock-lab">① ${assayLab}</div><div class="btn-row assay-row">${assays.map(abtn).join('')}</div></div>`+
    `<div class="dsep"></div>`+ idGroup + treatGroup;
  $('backBtn').onclick=()=>{ sfx('click'); XS.exitRegion(); UI.renderPhase(); };
  const idb=$('idBtn'); if(idb) idb.onclick=()=>{ sfx('click'); UI.showIdentify(); };
  UI.dock.querySelectorAll('[data-assay]').forEach(b=>{
    b.onclick=()=>{ const out=XS.doAssay(b.dataset.assay); if(!out)return; sfx('blip');
      readoutHTML=`<div class="ro-name">${out.label}</div><div class="ro-fn">${out.text}</div>`;
      b.animate([{transform:'scale(.95)'},{transform:'scale(1)'}],{duration:150});
      UI.renderRight(); UI.renderLeft(); UI.renderDock(); };
  });
  UI.dock.querySelectorAll('[data-a]').forEach(b=>{
    b.onmouseenter=()=>{ const t=XS.TREATMENTS.find(x=>x.id===b.dataset.a); readoutHTML=`<div class="ro-fn">${t?t.desc:''}</div>`; const ro=$('roLeft'); if(ro)ro.innerHTML=readoutHTML; };
    b.onclick=()=>{ const res=XS.treatRegion(b.dataset.a); if(!res)return;
      sfx(res.ok?'ok':'err');
      readoutHTML=`<div class="ro-name" style="color:${res.ok?'var(--mint)':'var(--coral)'}">${res.ok?'✓ '+res.msg:'✗ '+res.msg}</div>`;
      const ro=$('roLeft'); if(ro)ro.innerHTML=readoutHTML;
      b.animate([{transform:'scale(.95)'},{transform:'scale(1)'}],{duration:150});
      UI.renderRight(); UI.updateVitals();
      if(XS.app.result) UI.showResult();
    };
  });
};

/* diagnosis (classify) overlay */
UI.showIdentify=function(){
  const sc=XS.app.sc, r=XS.app.zoomRegion; if(!sc||!r) return;
  const opt=XS.identifyOptions(sc);
  const btns=opt.options.map(o=>`<button class="idopt" data-o="${o}">${o}</button>`).join('');
  const evList=r.evidence.length?r.evidence.map(e=>`<div class="ev-row">• ${e}</div>`).join(''):'<div class="muted">You have gathered no evidence yet — this is a guess.</div>';
  card(`<div class="sub">Diagnosis · ${r.name}</div><h2>${opt.prompt}</h2>`+
    `<div class="cap" style="margin:8px 0 6px">Your evidence</div><div class="ev-list">${evList}</div>`+
    `<p class="muted" style="margin-top:8px">A wrong call raises the ${sc.objective==='preserve'?'host’s risk':'organism’s adaptation'} — so read the evidence before you commit.</p>`+
    `<div class="idgrid">${btns}</div><div class="idnote" id="idNote"></div>`+
    `<div class="cta"><button class="btn" id="idCancel">Back to analysis</button></div>`);
  UI.overlay.querySelectorAll('.idopt').forEach(b=>b.onclick=()=>{
    const res=XS.doDiagnose(b.dataset.o); if(!res)return; sfx(res.ok?'ok':'err');
    if(res.ok){ UI.hideOverlay(); readoutHTML=`<div class="ro-name" style="color:var(--mint)">✓ ${res.msg}</div>`;
      UI.renderLeft(); UI.renderRight(); UI.renderDock(); UI.updateVitals();
      if(XS.app.result) UI.showResult();
    } else { b.classList.add('wrong'); const n=$('idNote'); if(n) n.textContent='✗ '+res.msg; UI.updateVitals();
      if(XS.app.result){ UI.showResult(); } }
  });
  $('idCancel').onclick=()=>{ UI.hideOverlay(); };
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
    `<div class="tagline">Study a whole alien organism on its exoplanet. <b>Zoom into its tissues</b>, run lab assays to work out what it is, then <span class="gd">preserve</span> it or <span class="rk">neutralise</span> it.</div>`+
    `<div class="how">`+
      `<div class="how-step"><div class="how-ico">🪐</div><div><b>Survey</b><small>Meet the creature on its world &amp; read your orders</small></div></div>`+
      `<div class="how-step"><div class="how-ico">🔬</div><div><b>Analyse</b><small>Zoom in, run assays, inspect cells, gather evidence</small></div></div>`+
      `<div class="how-step"><div class="how-ico">⚗️</div><div><b>Diagnose &amp; treat</b><small>Identify the cause, then apply the one right agent</small></div></div>`+
    `</div>`+
    `<div class="rankcard"><div class="rk-left"><div class="rk-big">${rank.name}</div><div class="muted">${p.xp} XP${next?` · ${next.xp-p.xp} to ${next.name}`:' · max rank'}</div><div class="xpbar"><i style="width:${pct}%"></i></div></div>`+
      `<div class="rk-stats"><span>💚 ${p.saves} saved</span><span>☠️ ${p.kills} neutralised</span><span>🧬 ${cx.organelles.length}/${cx.totalOrganelles} organelles</span></div></div>`+
    `<div class="muted lbl">DIFFICULTY</div><div class="tiers">${tiers}</div>`+
    `<div class="cta"><button class="btn pri" id="startBtn">▶ Receive Assignment</button>`+
      `<button class="btn ${!p.tutorialSeen?'pulse':''}" id="tutBtn">🎓 Tutorial</button>`+
      `<button class="btn" id="dailyBtn">🗓 Daily</button><button class="btn" id="codexBtn2">📖 Codex</button>`+
      `<button class="btn" id="achBtn">🏆 ${p.badges.length}/${XS.ACHIEVEMENTS.length}</button></div>`+
      (!p.tutorialSeen?`<div class="muted" style="margin-top:8px;font-size:12px">🆕 New here? Start with the <b>🎓 Tutorial</b> — it walks you through a case step by step.</div>`:'')+
    `<div class="setrow"><span class="setlbl">🔊</span><input type="range" id="volSld" min="0" max="100" value="${Math.round((XS.sfx?XS.sfx.volume:.7)*100)}">`+
      `<button class="chipbtn ${XS.sfx&&XS.sfx.enabled?'on':''}" id="muteBtn2">${XS.sfx&&XS.sfx.enabled?'Sound on':'Muted'}</button>`+
      `<button class="chipbtn ${XS.sfx&&XS.sfx.ambient?'on':''}" id="ambBtn">Ambient</button>`+
      (p.xp>0?`<button class="chipbtn" id="resetBtn">Reset</button>`:'')+`</div>`
  );
  UI.overlay.querySelectorAll('.tierbtn').forEach(b=>b.onclick=()=>{sfx('click');XS.app.tier=b.dataset.tier;UI.overlay.querySelectorAll('.tierbtn').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');});
  $('startBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startMission(null,XS.app.tier); UI.renderPhase(); };
  $('tutBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); UI.startTutorial(); };
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
  if(XS.app.tutorial){ XS.app.tutorial.step=4; UI.updateCoach(); return; }   // tutorial handles its own finish
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
