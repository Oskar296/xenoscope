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
  /* ---- CREATOR · one tool: drag on the creature to shape it ---- */
  let sculpting=false;
  const sculptPoint=(e)=>{ const D=XS.app.sculpt, fr=XS.creatureFrame; if(!D||!fr) return false;
    const r=cv.getBoundingClientRect();
    const x=(e.clientX-r.left)*(cv.width/r.width), y=(e.clientY-r.top)*(cv.height/r.height);
    const dx=x-fr.cx, dy=y-fr.cy, d=Math.hypot(dx,dy);
    if(d<fr.base*0.10) return false;                       // ignore the dead centre
    XS.sculptAt(D, Math.atan2(dy,dx), d/fr.base, 0.42);
    XS.applySculpt(D); return true; };            // live, in-place: no scenario rebuild
  cv.addEventListener('pointerdown',e=>{ if(!XS.app.sculpt) return;
    sculpting=sculptPoint(e); if(sculpting){ cv.setPointerCapture&&cv.setPointerCapture(e.pointerId); sfx('blip'); } });
  cv.addEventListener('pointermove',e=>{ if(sculpting && XS.app.sculpt) sculptPoint(e); });
  const endSculpt=()=>{ sculpting=false; };
  cv.addEventListener('pointerup',endSculpt);
  cv.addEventListener('pointercancel',endSculpt);
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
  if(app.sculpt) return;                       // in the creator the canvas is a sculpting surface
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
  if(app.run && app.run.active) UI.renderRunHud();
  if(app.toasts && app.toasts.length) UI.showToast(app.toasts.shift());
  if(app.tutorial){ const s=XS.tutorialStep(); if(s>app.tutorial.step){ app.tutorial.step=s; UI.updateCoach(); } }
};
/* interactive tutorial coach banner */
UI.startTutorial=function(){ XS.startTutorial(); UI.renderPhase(); UI.updateCoach(); };
UI.updateCoach=function(){ const T=XS.app.tutorial; if(!T){ UI.coach.style.display='none'; return; }
  const L=XS.TUT_LESSONS[T.lesson]||XS.TUT_LESSONS[0], n=XS.TUT_LESSONS.length, agentLabel=XS.agentName(L.agent), verb=L.obj==='preserve'?'Preserve':'Neutralize';
  const art='a'+(/^[AEIOU]/i.test(L.name)?'n':'');
  const idHint = L.obj==='preserve'
    ? 'Since something is <i>infecting</i> it, use <b>Particle morphology</b> and <b>Invader coat</b> to examine the invader.'
    : 'Use <b>Wall analysis</b>, <b>Gram stain</b> and <b>Nuclear stain</b> to work out what kind of cell it is.';
  const steps=[
    {t:`Lesson ${T.lesson+1} of ${n} · ${L.name}`, d:`<b>${verb} this organism.</b> Its tissues are the glowing rings — <b>click one</b> to zoom into a tissue.`},
    {t:`Analyse`, d:`Run a couple of <b>Lab assays</b> from the dock (① group). ${idHint} <span class="muted">${L.assayHint||''}</span> Each clue appears in the <b>Evidence</b> panel on the right.`},
    {t:`Diagnose`, d:`Open <b>⌖ Identify</b> (② group). Match your evidence to the options — each lists its give-away feature. This one is ${art} <b>${L.name}</b>; pick it.`},
    {t:`Treat`, d:`${art.charAt(0).toUpperCase()+art.slice(1)} <b>${L.name}</b> is beaten by <b>${agentLabel}</b>. ${L.why} Apply it (③ group).`},
    {t:`✓ Learned: ${L.name} → ${agentLabel}`, d:`${L.why}`},
  ];
  const m=steps[T.step]||steps[0], last=T.lesson>=n-1, done=T.step>=4;
  const dots=XS.TUT_LESSONS.map((_,i)=>`<span class="cp ${i<T.lesson?'done':''} ${i===T.lesson?'on':''}"></span>`).join('');
  let btns;
  if(done) btns=(last?'<button class="btn pri" id="coachDone">▶ Finish &amp; play</button>':'<button class="btn pri" id="coachNext">Next type ▶</button>')+'<button class="chipbtn" id="coachSkip">Skip</button>';
  else btns='<button class="chipbtn" id="coachSkip">Skip tutorial</button>';
  UI.coach.innerHTML=`<div class="coach-h">🎓 ${m.t}</div><div class="coach-d">${m.d}</div><div class="coach-prog">${dots}</div><div class="coach-btns">${btns}</div>`;
  UI.coach.style.display='block';
  const sk=$('coachSkip'); if(sk) sk.onclick=()=>{ XS.endTutorial(); UI.coach.style.display='none'; UI.showMenu(); };
  const dn=$('coachDone'); if(dn) dn.onclick=()=>{ XS.endTutorial(); UI.coach.style.display='none'; UI.showMenu(); };
  const nx=$('coachNext'); if(nx) nx.onclick=()=>{ sfx('click'); XS.loadLesson(T.lesson+1); UI.renderPhase(); UI.updateCoach(); };
};
UI.showToast=function(t){ sfx('rank');
  const d=el('div','toast',`<div class="t-ico">${t.icon}</div><div><div class="t-t">🏆 Achievement — ${t.title}</div><div class="t-d">${t.desc}</div></div>`);
  UI.toastWrap.appendChild(d); requestAnimationFrame(()=>d.classList.add('in'));
  setTimeout(()=>{ d.classList.remove('in'); setTimeout(()=>d.remove(),400); },4400);
};

/* ---------------- phase router ---------------- */
UI.renderPhase=function(){ UI.top.style.display='flex'; UI.renderTop(); UI.renderLeft(); UI.renderRight(); UI.renderDock(); if(!XS.app.tutorial && UI.coach) UI.coach.style.display='none'; UI.renderRunHud(); };

/* ---------------- top bar ---------------- */
UI.renderTop=function(){
  const app=XS.app, sc=app.sc; if(!sc){ UI.top.innerHTML=''; return; }
  const O=XS.OBJECTIVE_INFO[sc.objective], rank=XS.rankFor(XS.progress.xp);
  const loc = app.phase==='zoom'&&app.zoomRegion ? app.zoomRegion.name : `${sc.A.label} · ${sc.planet.name}`;
  UI.top.innerHTML=
    `<span class="chip ${O.tone}">${O.label}</span>`+
    (sc.intruder?`<span class="chip ultra">🧬 ${sc.intruder.name}</span>`:'')+
    (sc.alien?`<span class="chip alien">👽 XENO — non-Earth biology</span>`:'')+
    (sc.firstContact?`<span class="chip alien">🛸 FIRST CONTACT — unknown kingdom</span>`:'')+
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
        ? (preserve
            ? ((((r.tests&&r.tests.morph)
                  ?'<div class="th bad">⚠ An invader is multiplying in this tissue.</div>'
                  :'<div class="th bad">⚠ Something is multiplying in this tissue — but the particles are an <b>unresolved biosignature</b>. Run <b>Particle morphology</b> to resolve what they actually are.</div>'))
               + (sc.cures?'<div class="th sym">✚ Mixed infection — a SECOND invader is also present. You will need two cures.</div>':''))
            :'<div class="th bad">⚠ Exposed tissue — the organism can’t defend it here. A viable target.</div>')
                   + (sc.shielded?'<div class="th sym">🛡 A biofilm shields these cells — strip it with detergent before the real agent will land.</div>':'')
        : '<div class="th good">✓ This tissue is clear — the cause is elsewhere.</div>'; }
    else threat='<div class="th muted">Run a lab assay to survey this tissue.</div>';
    const ev = r.evidence.length? r.evidence.map(e=>`<div class="ev-row">• ${e}</div>`).join('')
      : '<div class="muted" style="font-size:11.5px;line-height:1.5">No findings yet. Run the lab assays below, and click the cell’s structures to inspect them.</div>';
    let concl='';
    if(r.diagnosed){ const why=preserve?XS.PATHOGENS[sc.pathType].why:XS.WEAKNESS_WHY[sc.agent];
      const mixed=!!sc.cures, title=mixed?'MIXED INFECTION · two invaders':sc.dxAnswer;
      const rx=mixed?`Apply the cure for <b>both</b> invaders — run <b>Particle morphology</b> to see both.`:'Now apply the matching treatment.';
      concl=`<div class="diag good"><div class="diag-t">✓ DIAGNOSIS · ${title}</div><div class="diag-why">${why}</div><div class="diag-rx">${rx}</div></div>`;
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
  if(canTreat && sc.craft){                     // ADVANCED · open the synthesis lab
    treatGroup=`<div class="dsep"></div><div class="dock-group ${active===3?'active':''}"><div class="dock-lab">③ Treat · ${r.name}</div>`+
      `<button class="abtn synthopen" id="synthOpen"><b>⚗ Open the bench</b><small>make the cure from raw materials</small></button></div>`;
  } else if(canTreat){ const opts=XS.treatmentOptions(sc);
    const tb=id=>{const t=XS.TREATMENTS.find(x=>x.id===id)||{label:id,desc:''};return `<button class="abtn treat" data-a="${id}"><b>${t.label}</b><small>${t.desc.split('.')[0]}</small></button>`;};
    treatGroup=`<div class="dsep"></div><div class="dock-group ${active===3?'active':''}"><div class="dock-lab">③ Treat · ${r.name}</div><div class="btn-row treat-row">${opts.map(tb).join('')}</div></div>`;
  }
  // STORY · the final chapter lets you refuse the order instead of firing
  const standDown = (sc.story&&sc.story.choice&&dxDone)
    ? `<div class="dsep"></div><div class="dock-group"><div class="dock-lab">◇ Or don’t</div>`+
      `<button class="abtn stand" id="standBtn"><b>◇ Stand down</b><small>log it as unclassified</small></button></div>` : '';
  UI.dock.innerHTML=stepBar(active)+
    `<button class="abtn back" id="backBtn"><b>← Organism</b><small>zoom out</small></button>`+
    `<div class="dsep"></div>`+
    `<div class="dock-group ${active===1?'active':''}"><div class="dock-lab">① ${assayLab}</div><div class="btn-row assay-row">${assays.map(abtn).join('')}</div></div>`+
    `<div class="dsep"></div>`+ idGroup + treatGroup + standDown;
  $('backBtn').onclick=()=>{ sfx('click'); XS.exitRegion(); UI.renderPhase(); };
  const sd=$('standBtn'); if(sd) sd.onclick=()=>{ sfx('ok'); if(XS.storyStandDown()) UI.showChapterOutro(); };
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
  const so=$('synthOpen'); if(so) so.onclick=()=>{ sfx('click'); UI.showSynthesis(); };
};

/* ADVANCED · the synthesis bench — MAKE a cure from raw materials (modal) */
function hexRGB(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join('');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function blendCols(cols){ if(!cols.length) return [70,120,120];
  const s=cols.reduce((a,c)=>{const r=hexRGB(c);return [a[0]+r[0],a[1]+r[1],a[2]+r[2]];},[0,0,0]);
  return s.map(v=>Math.round(v/cols.length)); }
/* would this made agent actually work on the diagnosed target? (preview only) */
function benchEffective(agent){ const sc=XS.app.sc, r=XS.app.zoomRegion; if(!sc||!r||!agent) return false;
  if(sc.objective==='neutralize') return XS.killAgentsFor(r.cell).includes(agent);
  if(sc.cures) return sc.cures.includes(agent);
  return agent===sc.agent; }

UI.showSynthesis=function(){ const sc=XS.app.sc, r=XS.app.zoomRegion; if(!sc||!r) return;
  let cr=XS.app.craft; if(!cr||!('items'in cr)) cr=XS.app.craft={items:[],step:null,made:null,tested:null};
  cr.items=cr.items||[]; cr.made=null; cr.tested=null;
  if(cr.temp==null) cr.temp=25;                       // bench dial, °C
  if(cr.ph==null) cr.ph=7;                            // bench dial, pH
  cr.stock=cr.stock||{};                              // intermediates you've synthesised
  const dxLine = sc.alien
    ? `👽 Diagnosis: <b>${sc.dxAnswer}</b> — non-Earth biology. ${(XS.PATHOGENS[sc.pathType]||{}).why||''}`
    : sc.intruder
    ? `🧬 Case: <b>${sc.intruder.name}</b> <span class="muted">(${sc.intruder.aka})</span> — a <b>${sc.dxAnswer}</b>. Its real cure is <b>${sc.intruder.drug}</b> — synthesise it.`
    : sc.objective==='neutralize'
    ? `Target organism: <b>${sc.dxAnswer}</b> — make something its biology cannot withstand.`
    : `Diagnosis: <b>${sc.dxAnswer}</b> — make the cure that destroys it, and nothing else.`;
  const ingTile = x=>{ const locked = x.made && !cr.stock[x.id];
    return `<button class="ingt${locked?' locked':''}" data-ing="${x.id}"><span class="ingsw" style="background:${x.col}"></span>`+
    `<span class="ingglyph">${x.glyph}</span><span class="ingtx"><b>${x.label}</b>`+
    (x.made?`<em>${locked?'🔒 must be synthesised':'✓ synthesised'}</em>`:'')+`</span></button>`; };
  const ingTiles = XS.INGREDIENTS.map(ingTile).join('');
  const stepTiles = XS.LAB_STEPS.map(s=>
    `<button class="stept" data-step="${s.id}"><span class="stepglyph">${s.glyph}</span>`+
    `<span class="steptx"><b>${s.label}</b><small>${s.desc}</small></span></button>`).join('');

  card(`<div class="sub">Synthesis bench · ${r.name}</div><h2>Develop a cure</h2>`+
    `<div class="bench-dx">${dxLine}</div>`+
    `<div class="benchwrap">`+
      `<div class="bench-col shelf"><div class="cap">① Raw material — tap to add</div><div class="ing-grid">${ingTiles}</div></div>`+
      `<div class="bench-col flaskcol"><canvas id="benchCv" width="240" height="272"></canvas>`+
        `<div class="flask-label" id="flaskLabel">Empty flask</div></div>`+
      `<div class="bench-col stepcol"><div class="cap">② Prepare it</div><div class="step-grid">${stepTiles}</div>`+
        `<div class="tempwrap"><div class="cap">③ Exact temperature <b class="tempval" id="tempVal">${cr.temp} °C</b></div>`+
          `<input type="range" id="tempDial" class="tempdial" min="0" max="150" step="1" value="${cr.temp}">`+
          `<div class="temphint" id="tempHint">Every process has one right temperature.</div>`+
          `<div class="cap" style="margin-top:11px">④ Exact pH <b class="tempval phval" id="phVal">${(+cr.ph).toFixed(1)}</b></div>`+
          `<input type="range" id="phDial" class="tempdial phdial" min="0" max="14" step="0.1" value="${cr.ph}">`+
          `<div class="temphint" id="phHint">Acid or alkali decides whether a reaction runs at all.</div></div>`+
        `<div class="bench-read" id="benchRead">Pick a raw material to begin.</div></div>`+
    `</div>`+
    `<div class="bench-test" id="benchTest" style="display:none"><canvas id="sampleCv" width="300" height="86"></canvas><div class="bench-testtx" id="benchTestTx"></div></div>`+
    `<div class="cta bench-cta"><button class="btn ghost" id="benchEmpty">🗑 Empty</button>`+
      `<button class="btn help" id="benchGuide">📖 Formulary</button>`+
      `<button class="btn pre" id="benchPre" style="display:none" disabled>⚗ Synthesise reagent</button>`+
      `<button class="btn" id="benchTestBtn" disabled>🧪 Test on a sample</button>`+
      `<button class="btn pri" id="benchAdmin" disabled>💉 Administer</button>`+
      `<button class="btn" id="benchCancel">Back</button></div>`);
  const cardEl=UI.overlay.querySelector('.card'); if(cardEl) cardEl.classList.add('bench-card');

  const st={fill:0, target:0, rgb:[70,120,120], glow:0, flash:0};
  const cv=$('benchCv'), ctx=cv.getContext('2d');
  const scv=$('sampleCv'), sctx=scv?scv.getContext('2d'):null;
  let sample=null;                                     // {parts, t0, eff}
  UI._benchLoop=(UI._benchLoop||0)+1; const myLoop=UI._benchLoop;

  const refresh=()=>{
    UI.overlay.querySelectorAll('[data-ing]').forEach(b=>{ b.classList.toggle('sel',cr.items.includes(b.dataset.ing));
      const x=XS.INGREDIENTS.find(i=>i.id===b.dataset.ing);
      if(x&&x.made){ const lk=!cr.stock[x.id]; b.classList.toggle('locked',lk);
        const em=b.querySelector('em'); if(em) em.textContent=lk?'🔒 must be synthesised':'✓ synthesised'; } });
    UI.overlay.querySelectorAll('[data-step]').forEach(b=>b.classList.toggle('sel',cr.step===b.dataset.step));
    // is this flask a PRECURSOR synthesis (building an intermediate) or a drug?
    const pre=XS.precursorResult(cr.items,cr.step,cr.temp,cr.ph);
    const madeExact=XS.benchResult(cr.items,cr.step,cr.temp,cr.ph);  // temperature AND pH enforced
    const madeLoose=XS.benchResult(cr.items,cr.step);                // right inputs, maybe wrong conditions
    const made=madeExact; cr.made=made; cr.pre=pre;
    const cols=cr.items.map(id=>{const x=XS.INGREDIENTS.find(i=>i.id===id);return x?x.col:'#888';});
    st.target = cr.items.length?Math.min(1,0.28+cr.items.length*0.22):0;
    st.rgb = blendCols(cols);
    st.hot = Math.max(0, Math.min(1,(cr.temp-40)/110));            // glow ramps with heat
    const lbl=$('flaskLabel'), read=$('benchRead'), hint=$('tempHint'), tv=$('tempVal');
    const phHint=$('phHint'), pv=$('phVal');
    if(tv) tv.textContent=cr.temp+' °C';
    if(pv) pv.textContent=(+cr.ph).toFixed(1);
    // guidance: only reveal the targets once the inputs+method are right
    const want = madeLoose||(pre&&pre.p);
    if(hint){ if(want){ const t=want.temp, d=cr.temp-t;
        hint.innerHTML = Math.abs(d)<=(want.tol||8) ? `<span class="ok">✓ on target — ${t} °C</span>`
          : `<span class="bad">${d<0?'🔻 too cold':'🔺 too hot'}</span> · this process needs <b>${t} °C</b>`;
      } else hint.innerHTML='Every process has one right temperature.'; }
    if(phHint){ if(want && want.ph!=null){ const q=want.ph, d=cr.ph-q;
        phHint.innerHTML = Math.abs(d)<=(want.phTol||1.5) ? `<span class="ok">✓ on target — pH ${q}</span>`
          : `<span class="bad">${d<0?'🔻 too acidic':'🔺 too alkaline'}</span> · this process needs <b>pH ${q}</b>`;
      } else if(want) phHint.innerHTML='<span class="ok">✓ pH is not critical here</span>';
      else phHint.innerHTML='Acid or alkali decides whether a reaction runs at all.'; }
    if(made||(pre&&pre.ok)){ lbl.textContent='✓ '+(made?made.name:pre.p.name); lbl.className='flask-label ok'; }
    else if(cr.items.length){ lbl.textContent=cr.items.map(id=>XS.INGREDIENTS.find(i=>i.id===id).label).join(' + '); lbl.className='flask-label'; }
    else { lbl.textContent='Empty flask'; lbl.className='flask-label muted'; }
    if(!cr.items.length) read.innerHTML='Pick a raw material to begin.';
    else if(!cr.step) read.innerHTML='Now choose how to <b>prepare</b> it — then dial in the exact temperature.';
    else if(pre){ read.innerHTML = pre.ok
        ? `⚗ <b>${pre.p.name}</b> synthesised — it’s on the shelf now. <div class="muted">${pre.p.how}</div>`
        : `Right precursors for <b>${pre.p.name}</b>, wrong heat. <div class="muted">${pre.p.how}</div>`; }
    else if(made){ const an=XS.agentName(made.agent).toLowerCase(), art=/^[aeiou]/.test(an)?'an':'a';
      read.innerHTML=`✔ You made <b>${made.name}</b> — ${art} <b>${an}</b>.<div class="muted">${made.source}</div>`+
        (made.why?`<div class="muted">🌡 ${made.why}</div>`:''); }
    else if(madeLoose){ const dT=Math.abs(cr.temp-madeLoose.temp)>(madeLoose.tol||8);
      const dP=madeLoose.ph!=null && Math.abs(cr.ph-madeLoose.ph)>(madeLoose.phTol||1.5);
      read.innerHTML=`Right ingredients and method for <b>${madeLoose.name}</b> — but the ${dT&&dP?'temperature <em>and</em> pH are':dP?'pH is':'temperature is'} wrong, so nothing usable forms.`+
        (madeLoose.why?`<div class="muted">🌡 ${madeLoose.why}</div>`:''); }
    else read.innerHTML='✗ Nothing usable forms this way. Try different materials, another method, or a different temperature.';
    read.className='bench-read '+((made||(pre&&pre.ok))?'ok':(cr.items.length&&cr.step?'bad':''));
    // precursor flasks produce a reagent, not a treatment
    const pb=$('benchPre'); if(pb){ pb.style.display=pre?'':'none'; pb.disabled=!(pre&&pre.ok); }
    $('benchTestBtn').disabled=!made; $('benchAdmin').disabled=!made;
    if(made||(pre&&pre.ok)) st.glow=1;
  };

  UI.overlay.querySelectorAll('[data-ing]').forEach(b=>b.onclick=()=>{ const id=b.dataset.ing;
    const x=XS.INGREDIENTS.find(i=>i.id===id);
    if(x&&x.made&&!cr.stock[id]&&!cr.items.includes(id)){    // locked intermediate — must be built first
      sfx('err'); const read=$('benchRead');
      read.className='bench-read bad';
      read.innerHTML=`🔒 <b>${x.label}</b> isn’t on the shelf — you have to <b>synthesise</b> it first.<div class="muted">${x.note}</div>`;
      return; }
    if(cr.items.includes(id)) cr.items=cr.items.filter(y=>y!==id);
    else if(cr.items.length<3) cr.items.push(id); else return;
    sfx('click');
    $('benchTest').style.display='none'; sample=null; refresh();
    const read=$('benchRead'); if(cr.items.includes(id)&&x&&!cr.step) read.innerHTML=`<b>${x.label}.</b> ${x.note}`; });
  const dial=$('tempDial'); if(dial){ dial.oninput=()=>{ cr.temp=+dial.value; $('benchTest').style.display='none'; sample=null; refresh(); };
    dial.onchange=()=>sfx('blip'); }
  const pd=$('phDial'); if(pd){ pd.oninput=()=>{ cr.ph=+pd.value; $('benchTest').style.display='none'; sample=null; refresh(); };
    pd.onchange=()=>sfx('blip'); }
  UI.overlay.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{ cr.step=(cr.step===b.dataset.step)?null:b.dataset.step;
    sfx('blip'); st.flash=1; $('benchTest').style.display='none'; sample=null; refresh(); });

  $('benchEmpty').onclick=()=>{ sfx('click'); cr.items=[]; cr.step=null; $('benchTest').style.display='none'; sample=null; refresh(); };
  $('benchGuide').onclick=()=>{ sfx('click'); UI.showFormulary({agent:sc.agent,objective:sc.objective}, true); };
  $('benchPre').onclick=()=>{ const pre=cr.pre; if(!pre||!pre.ok) return; sfx('ok');
    cr.stock[pre.p.makes]=true;                       // the intermediate is now on the shelf
    if(!XS.progress.reagents) XS.progress.reagents=[];
    if(!XS.progress.reagents.includes(pre.p.makes)){ XS.progress.reagents.push(pre.p.makes); XS.award(8,'Synthesised: '+pre.p.name); XS.saveProgress(); }
    cr.items=[]; cr.step=null; st.flash=1; refresh();
    const read=$('benchRead'); read.className='bench-read ok';
    read.innerHTML=`⚗ <b>${pre.p.name}</b> is on the shelf — now use it to build the drug.<div class="muted">${pre.p.how}</div>`; };
  $('benchCancel').onclick=()=>{ UI.hideOverlay(); };
  $('benchTestBtn').onclick=()=>{ if(!cr.made) return; const eff=benchEffective(cr.made.agent);
    sfx(eff?'ok':'err'); const tp=$('benchTest'); tp.style.display=''; const tx=$('benchTestTx');
    const nm=sc.objective==='neutralize'?sc.dxAnswer.toLowerCase():(XS.PATHOGENS[sc.pathType]?XS.PATHOGENS[sc.pathType].dx.toLowerCase():'invader');
    tx.innerHTML=eff
      ? `<b class="ok">✓ Effective.</b> On the cultured sample the ${nm} cells rupture and clear. This should work — administer it.`
      : `<b class="bad">✗ No effect.</b> The sample shrugs it off. <b>${cr.made.name}</b> is the wrong weapon here — rework the flask.`;
    // spawn sample particles for the little dish animation
    const parts=[]; for(let i=0;i<14;i++) parts.push({x:40+Math.random()*220,y:14+Math.random()*58,r:5+Math.random()*4,ph:Math.random()*6});
    sample={parts, t0:performance.now(), eff}; };
  $('benchAdmin').onclick=()=>{ const made=cr.made; if(!made) return;
    // ULTRA · did they build the exact textbook drug for this named pathogen?
    const textbook = XS.intruderRecipeMatches(sc, cr.items, cr.step);   // temp already enforced to make the drug
    let res=XS.treatRegion(made.agent);
    // a cure you synthesised yourself is administered as a full course — if it's
    // landing (and this isn't a co-infection, which needs a second, DIFFERENT
    // cure), finish the dosing so one correct build treats the patient
    if(res && res.ok && !sc.cures && !sc.cured){ let g=0; while(sc.P<100 && res.ok && g++<8){ const nx=XS.treatRegion(made.agent); if(!nx) break; res=nx; } }
    if(res && res.ok && textbook && !sc._tbAwarded){ sc._tbAwarded=true; sc.textbookMatch=true; XS.award(20,'Textbook drug: '+(sc.intruder?sc.intruder.name:made.name)); }
    UI.hideOverlay(); if(!res) return; sfx(res.ok?'ok':'err');
    const tbTag = res.ok&&textbook&&sc.intruder?` <span style="color:var(--aqua)">· ✓ textbook drug of choice</span>`:'';
    readoutHTML=`<div class="ro-name" style="color:${res.ok?'var(--mint)':'var(--coral)'}">${res.ok?'✓':'✗'} Administered <b>${made.name}</b> — ${res.msg}${tbTag}</div>`;
    UI.renderLeft(); UI.renderRight(); UI.renderDock(); UI.updateVitals();
    if(XS.app.result) UI.showResult(); };

  /* ---- flask + sample animation loop ---- */
  function drawFlask(now){
    const W=cv.width, H=cv.height; ctx.clearRect(0,0,W,H);
    st.fill += (st.target-st.fill)*0.12; st.glow += ((cr.made?1:0)-st.glow)*0.15; st.flash*=0.9;
    const nx1=103,nx2=137,ny=26, bx1=34,bx2=206,by=250, sh=84;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(nx1,ny); ctx.lineTo(nx1,sh); ctx.lineTo(bx1,by); ctx.lineTo(bx2,by); ctx.lineTo(nx2,sh); ctx.lineTo(nx2,ny);
    ctx.closePath();
    // glass
    ctx.save(); ctx.clip();
    const level = by - st.fill*(by-100);
    if(st.fill>0.01){
      const [r,g,b]=st.rgb;
      const grad=ctx.createLinearGradient(0,level,0,by);
      grad.addColorStop(0,`rgba(${r},${g},${b},0.92)`); grad.addColorStop(1,`rgba(${Math.round(r*0.7)},${Math.round(g*0.7)},${Math.round(b*0.7)},0.98)`);
      ctx.fillStyle=grad; ctx.fillRect(0,level,W,by-level);
      // surface shimmer
      ctx.fillStyle=`rgba(255,255,255,0.18)`; ctx.beginPath();
      ctx.ellipse(120,level+Math.sin(now/500)*1.5,72,6,0,0,Math.PI*2); ctx.fill();
      // bubbles — more and faster the hotter the dial is set
      const heat=st.hot||0;
      if(heat>0.05 || (cr.made&&cr.step==='ferment')){
        const n=Math.round(2+heat*10), spd=700-heat*420;
        ctx.fillStyle=`rgba(255,255,255,${0.35+heat*0.35})`;
        for(let i=0;i<n;i++){ const p=((now/spd)+i/n)%1; const bx=62+((i*47)%126); const byb=by-p*(by-level-8);
          ctx.beginPath(); ctx.arc(bx, byb, 1.5+(i%3)+heat*1.5, 0, Math.PI*2); ctx.fill(); }
      }
    }
    ctx.restore();
    // glass outline + highlight
    ctx.lineWidth=3.5; ctx.strokeStyle='rgba(200,236,245,0.9)'; ctx.stroke();
    ctx.lineWidth=1.5; ctx.strokeStyle='rgba(255,255,255,0.28)';                 // left-edge sheen
    ctx.beginPath(); ctx.moveTo(nx1+2,ny+4); ctx.lineTo(nx1+2,sh); ctx.lineTo(bx1+6,by-4); ctx.stroke();
    ctx.lineWidth=4; ctx.strokeStyle='rgba(210,240,248,0.95)';
    ctx.beginPath(); ctx.moveTo(nx1-9,ny); ctx.lineTo(nx2+9,ny); ctx.stroke();   // lip
    // heat halo under the flask — reads the dial even before a product forms
    if((st.hot||0)>0.05){ const h=st.hot; ctx.save(); ctx.globalAlpha=Math.min(0.75,h*0.9);
      const hg=ctx.createRadialGradient(120,by+6,2,120,by+6,70);
      hg.addColorStop(0,`rgba(255,${Math.round(190-h*120)},60,0.85)`); hg.addColorStop(1,'rgba(255,90,20,0)');
      ctx.fillStyle=hg; ctx.beginPath(); ctx.ellipse(120,by+6,72,20,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    if(st.glow>0.02){ ctx.save(); ctx.globalAlpha=st.glow*0.9; ctx.shadowColor='#5ff0c0'; ctx.shadowBlur=26;
      ctx.lineWidth=3; ctx.strokeStyle='rgba(95,240,192,0.9)'; ctx.stroke(); ctx.restore(); }
    if(st.flash>0.02){ ctx.save(); ctx.globalAlpha=st.flash*0.6; ctx.fillStyle='#fff';
      ctx.fillRect(0,0,W,H); ctx.restore(); }
    ctx.restore();
  }
  function drawSample(now){ if(!sctx||!sample) return; const W=scv.width,H=scv.height; sctx.clearRect(0,0,W,H);
    // culture dish
    sctx.fillStyle='rgba(10,20,26,0.6)'; sctx.strokeStyle='rgba(120,160,175,0.5)'; sctx.lineWidth=2;
    sctx.beginPath(); sctx.roundRect(4,4,W-8,H-8,10); sctx.fill(); sctx.stroke();
    const el=Math.min(1,(now-sample.t0)/1800);
    sample.parts.forEach(p=>{
      let r=p.r, a=1, x=p.x, y=p.y;
      if(sample.eff){ r=p.r*Math.max(0,1-el*1.1); a=Math.max(0,1-el); }        // dying: shrink + fade out
      else { x+=Math.sin(now/120+p.ph)*2.2; y+=Math.cos(now/140+p.ph)*2.2; }   // resisting: alive, jittering
      if(r<=0.3) return;
      sctx.fillStyle = sample.eff?`rgba(255,110,110,${a})`:'rgba(255,110,110,0.95)';
      sctx.beginPath(); sctx.arc(x,y,r,0,Math.PI*2); sctx.fill();
      sctx.fillStyle = sample.eff?`rgba(255,190,190,${a*0.7})`:'rgba(255,190,190,0.7)';   // nucleus dot
      sctx.beginPath(); sctx.arc(x-r*0.3,y-r*0.3,r*0.35,0,Math.PI*2); sctx.fill();
    });
    if(sample.eff && el>0.25){ sctx.fillStyle=`rgba(120,230,170,${Math.min(0.9,(el-0.25))})`;   // "cleared" tick
      sctx.font='600 13px system-ui'; sctx.fillText('✓ cleared', W-78, H-14); }
  }
  function frame(now){ if(myLoop!==UI._benchLoop || !document.getElementById('benchCv')) return;
    drawFlask(now); drawSample(now); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  refresh();
};

/* ADVANCED · in-game recipe guide (opened from the bench or the menu) ---------
   Built live from XS.FORMULATIONS / PATHOGENS / killAgentsFor so it can never
   drift from the actual recipes. `hi` = {agent,objective} highlights the cure
   for the current case; `back` returns to the bench on close. */
UI.showFormulary=function(hi,back){
  const recipeRow=f=>{ const st=(XS.LAB_STEPS||[]).find(s=>s.id===f.step)||{};
    const mats=f.items.map(id=>{const x=(XS.INGREDIENTS||[]).find(i=>i.id===id)||{label:id,col:'#888'};
      return `<span class="fm-chip mat"><span class="fm-d" style="background:${x.col}"></span>${x.label}</span>`;}).join('<span class="fm-op">+</span>');
    const tmp=(f.temp!=null)?`<span class="fm-op">@</span><span class="fm-chip temp">🌡 ${f.temp} °C</span>`:''
      +'';
    const phc=(f.ph!=null)?`<span class="fm-chip ph">⚗ pH ${f.ph}</span>`:'';
    return `${mats}<span class="fm-op">+</span><span class="fm-chip step">${st.glyph||''} ${st.label||f.step}</span>${tmp}${phc}`+
      `<span class="fm-op">→</span><span class="fm-chip drug">${XS.agentName(f.agent)}</span>`; };
  /* HINT MODE · say what the drug must DO and where such things come from —
     never the shopping list. You still have to work the bench out yourself. */
  const hintRow=f=>{
    const src=(f.source||'').replace(/<[^>]+>/g,'');
    const heat = f.temp<=10?'somewhere near freezing' : f.temp<30?'barely warm — body-cool at most'
      : f.temp<60?'gently warm' : f.temp<100?'hot, but never boiling' : f.temp<=110?'a rolling boil'
      : 'hotter than boiling water can go';
    const acid = f.ph==null?'' : f.ph<=2?', in something savagely acidic' : f.ph<5?', on the acid side'
      : f.ph<=7.8?', close to neutral' : f.ph<11?', on the alkaline side' : ', in something caustic';
    return `<div class="fm-hint"><b>${XS.agentName(f.agent)}</b> — ${src}`+
      `<div class="fm-hintcond">🌡 Prepared ${heat}${acid}.</div></div>`; };
  // intermediates you must build first, shown as their own sub-recipes
  const preRows=(XS.PRECURSORS||[]).map(p=>{ const st=(XS.LAB_STEPS||[]).find(s=>s.id===p.step)||{};
    const mats=p.items.map(id=>{const x=(XS.INGREDIENTS||[]).find(i=>i.id===id)||{label:id,col:'#888'};
      return `<span class="fm-chip mat"><span class="fm-d" style="background:${x.col}"></span>${x.label}</span>`;}).join('<span class="fm-op">+</span>');
    const out=(XS.INGREDIENTS||[]).find(i=>i.id===p.makes)||{label:p.makes,col:'#61c3ff'};
    return `<div class="fm-row"><div class="fm-target">${p.name}<span>intermediate</span></div><div class="fm-recipes">`+
      `<div class="fm-recipe">${mats}<span class="fm-op">+</span><span class="fm-chip step">${st.glyph||''} ${st.label||p.step}</span>`+
      `<span class="fm-op">@</span><span class="fm-chip temp">🌡 ${p.temp} °C</span>`+
      (p.ph!=null?`<span class="fm-chip ph">⚗ pH ${p.ph}</span>`:'')+`<span class="fm-op">→</span>`+
      `<span class="fm-chip mat"><span class="fm-d" style="background:${out.col}"></span>${out.label}</span></div>`+
      `<div class="fm-why">${p.how}</div></div></div>`; }).join('');
  const showAll = !!UI._fmReveal;         // hints by default; full recipes only on request
  const entry=(section,name,sub,agents)=>{ const fs=[]; agents.forEach(a=>(XS.recipesFor(a)||[]).forEach(f=>fs.push(f)));
    const match = hi && hi.objective===section && agents.some(a=>a===hi.agent);
    const rows=fs.map(f=>showAll?`<div class="fm-recipe">${recipeRow(f)}</div>`:hintRow(f)).join('');
    return `<div class="fm-row${section==='neutralize'?' kill':''}${match?' match':''}"><div class="fm-target">${name}`+
      `<span>${sub}</span>${match?'<em class="fm-tag">◀ your case</em>':''}</div><div class="fm-recipes">${rows}</div></div>`; };
  const pres=(XS.EARTH_PATHS?XS.EARTH_PATHS():Object.keys(XS.PATHOGENS))
    .map(k=>entry('preserve',XS.PATHOGENS[k].dx,'affliction',[XS.PATHOGENS[k].cure])).join('');
  const alienRows=(XS.ALIEN_PATHS?XS.ALIEN_PATHS():[]).map(k=>{const P=XS.PATHOGENS[k];
    return entry('preserve',P.dx,'xeno affliction',[P.cure]).replace('<div class="fm-recipes">',
      `<div class="fm-recipes"><div class="fm-why">👽 ${P.why}</div>`);}).join('');
  const kings=[['Monera','Bacterium'],['Archaea','Archaeon'],['Fungi','Fungus'],['Plantae','Plant'],['Animalia','Animal'],['Protista','Protist']];
  const neut=kings.map(([cell,name])=>entry('neutralize',name,'organism',XS.killAgentsFor(cell))).join('');
  const xk=[['Silicoid','Silicoid'],['Plasmoid','Plasmoid'],['Ammonoid','Ammonoid'],['Metallophyte','Metallophyte']];
  const xkRows=xk.map(([cell,name])=>{const why=(XS.WEAKNESS_WHY||{})[XS.killAgentsFor(cell)[0]]||'';
    return entry('neutralize',name,'alien kingdom',XS.killAgentsFor(cell))
      .replace('<div class="fm-recipes">',`<div class="fm-recipes"><div class="fm-why">🛸 ${why}</div>`);}).join('');
  const steps=(XS.LAB_STEPS||[]).map(s=>`<span class="fm-step">${s.glyph} <b>${s.label}</b> <small>${s.desc.split(' ').slice(0,6).join(' ')}…</small></span>`).join('');
  card(
    `<div class="sub">Field formulary · how to build any cure</div><h2>Make the right cure</h2>`+
    `<p class="muted">Pick a <b>raw material</b> + a <b>preparation step</b> + the <b>exact temperature and pH</b>. These are <b>clues, not answers</b> — each entry tells you what the drug must <em>do</em> and roughly what conditions it wants. Working out which jar on the shelf that means is your job.</p>`+
    `<div class="fm-steps">${steps}</div>`+
    (preRows?`<div class="fm-sec-h">Reagents you must build first <em class="pre">intermediates</em></div>`+
      `<p class="muted" style="margin:2px 0 0;font-size:12.5px">Some things aren’t on the shelf — you synthesise them from their own chemical precursors, then use them in a drug recipe.</p>${preRows}`:'')+
    `<div class="fm-sec-h">Saving a sick organism <em class="save">preserve · cure the affliction</em></div>${pres}`+
    (alienRows?`<div class="fm-sec-h">Non-Earth biology <em class="xeno">xeno · the rules don’t apply</em></div>`+
      `<p class="muted" style="margin:2px 0 0;font-size:12.5px">Each of these breaks an assumption every Earth cure depends on, so the normal shelf fails and you need chemistry aimed at the new rule.</p>${alienRows}`:'')+
    `<div class="fm-sec-h">Destroying an invader <em class="kill">neutralize · hit the cell’s weakness</em></div>${neut}`+
    (xkRows?`<div class="fm-sec-h">Alien kingdoms <em class="xeno">first contact · no Earth weakness applies</em></div>`+
      `<p class="muted" style="margin:2px 0 0;font-size:12.5px">Lifeforms with no Earth ancestry. Walls, membranes and metabolism all work differently, so the usual weaknesses simply do not exist.</p>${xkRows}`:'')+
    `<div class="cta"><button class="btn pri" id="fmClose">${back?'← Back to the bench':'Close'}</button>`+
      `<button class="btn ${showAll?'':'help'}" id="fmReveal">${showAll?'🙈 Hide exact recipes':'🔍 Reveal exact recipes'}</button></div>`
  );
  const c=UI.overlay.querySelector('.card'); if(c) c.classList.add('bench-card');
  $('fmClose').onclick=()=>{ sfx('click'); if(back){ UI.showSynthesis(); } else { UI.hideOverlay(); if(XS.app.phase==='menu') UI.showMenu(); } };
  $('fmReveal').onclick=()=>{ sfx('click'); UI._fmReveal=!UI._fmReveal; UI.showFormulary(hi,back); };
};

/* diagnosis (classify) overlay */
UI.showIdentify=function(){
  const sc=XS.app.sc, r=XS.app.zoomRegion; if(!sc||!r) return;
  const opt=XS.identifyOptions(sc), hall=XS.DX_HALLMARK||{};
  const btns=opt.options.map(o=>`<button class="idopt" data-o="${o}"><b>${o}</b><small>${hall[o]||''}</small></button>`).join('');
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
  const done=XS.storyProgress(), total=XS.STORY.length, fresh=!p.tutorialSeen&&!done;
  const storySub = done>=total ? 'Campaign complete — replay any chapter'
    : done ? `Chapter ${done+1} of ${total} · ${XS.STORY[done].title}` : `Begin the campaign · ${total} chapters`;
  card(
    `<h1><span class="x">XENO</span><span class="o">SCOPE</span></h1>`+
    `<div class="tagline">A deduction game about alien biology. <b>The answer is hidden.</b> Read the evidence, or the thing in front of you dies.</div>`+

    `<div class="m-main">`+
      `<button class="m-card hero" id="storyBtn"><span class="m-ico">📖</span>`+
        `<span class="m-tx"><b>${done?'Continue Story':'Play Story'}</b><small>${storySub}</small></span>`+
        `<span class="m-go">▶</span></button>`+
    `</div>`+

    `<div class="m-row">`+
      `<button class="m-card" id="startBtn"><span class="m-ico">🧬</span><span class="m-tx"><b>Free play</b><small>Any mode, any difficulty</small></span></button>`+
      `<button class="m-card" id="outbreakBtn"><span class="m-ico">🌊</span><span class="m-tx"><b>Outbreak</b><small>${p.outbreakBest?`Best ${p.outbreakBest}`:'Scored survival run'}</small></span></button>`+
      `<button class="m-card ${fresh?'pulse':''}" id="tutBtn"><span class="m-ico">🎓</span><span class="m-tx"><b>Tutorial</b><small>Learn the loop</small></span></button>`+
    `</div>`+
    `<button class="m-card creator" id="creatorBtn"><span class="m-ico">🧫</span>`+
      `<span class="m-tx"><b>Creator</b><small>${(p.custom||[]).length?`${p.custom.length} species designed — build another`:'Design your own organism, then play it'}</small></span>`+
      `<span class="m-go">＋</span></button>`+

    `<div class="m-rank"><div class="m-rk"><b>${rank.name}</b><span>${p.xp} XP${next?` · ${next.xp-p.xp} to ${next.name}`:''}</span></div>`+
      `<div class="xpbar"><i style="width:${pct}%"></i></div>`+
      `<div class="m-stats"><span>💚 ${p.saves}</span><span>☠️ ${p.kills}</span><span>🏆 ${p.badges.length}/${XS.ACHIEVEMENTS.length}</span></div></div>`+

    `<div class="m-tools">`+
      `<button class="m-tool" id="codexBtn2" title="Codex">📖<span>Codex</span></button>`+
      `<button class="m-tool" id="formularyBtn" title="Formulary">📋<span>Formulary</span></button>`+
      `<button class="m-tool" id="dailyBtn" title="Daily">🗓<span>Daily</span></button>`+
      `<button class="m-tool" id="achBtn" title="Achievements">🏆<span>Awards</span></button>`+
      `<button class="m-tool" id="setBtn" title="Settings">⚙<span>Settings</span></button>`+
    `</div>`+
    (fresh?`<div class="m-new">🆕 New here? Start with the <b>Tutorial</b>, then the Story.</div>`:'')
  );
  $('storyBtn').onclick=()=>{ sfx('click'); UI.showStory(); };
  $('startBtn').onclick=()=>{ sfx('click'); UI.showPlaySetup(); };
  $('outbreakBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startOutbreak(); UI.renderPhase(); };
  $('tutBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); UI.startTutorial(); };
  $('dailyBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startDaily(); UI.renderPhase(); };
  $('codexBtn2').onclick=()=>{ sfx('click'); UI.showCodex(); };
  $('formularyBtn').onclick=()=>{ sfx('click'); UI.showFormulary(null,false); };
  $('achBtn').onclick=()=>{ sfx('click'); UI.showAchievements(); };
  $('setBtn').onclick=()=>{ sfx('click'); UI.showSettings(); };
  $('creatorBtn').onclick=()=>{ sfx('click'); (XS.progress.custom||[]).length?UI.showMySpecies():UI.showCreator(XS.newCreatureDef()); };
};

/* free play · pick mode + difficulty here instead of cluttering the menu */
UI.MODES=[
  {id:'quick',    ico:'⚡', name:'Quick',        desc:'Pick a ready-made treatment. Fast, punchy runs.'},
  {id:'advanced', ico:'⚗',  name:'Advanced',     desc:'More time — and you synthesise the cure yourself at the bench.'},
  {id:'ultra',    ico:'🧬', name:'Ultra',        desc:'Named real diseases — COVID, malaria, MRSA. Make the actual drug.'},
  {id:'alien',    ico:'👽', name:'Xeno',         desc:'Afflictions that break Earth\u2019s rules. Your normal shelf fails.'},
  {id:'contact',  ico:'🛸', name:'First Contact',desc:'Alien species from kingdoms that never existed here.'},
];
UI.showPlaySetup=function(){
  const m=XS.app.mode, tier=XS.app.tier;
  const modes=UI.MODES.map(x=>`<button class="pk ${m===x.id?'sel':''}" data-mode="${x.id}">`+
    `<span class="pk-ico">${x.ico}</span><span class="pk-tx"><b>${x.name}</b><small>${x.desc}</small></span></button>`).join('');
  const tiers=Object.entries(XS.TIERS).map(([k,t])=>`<button class="pk tier ${k===tier?'sel':''}" data-tier="${k}">`+
    `<span class="pk-tx"><b>${t.label}</b><small>${t.blurb}</small></span></button>`).join('');
  card(`<div class="sub">Free play</div><h2>Set up an assignment</h2>`+
    `<div class="cap" style="margin:12px 0 7px">Mode</div><div class="pk-list">${modes}</div>`+
    `<div class="cap" style="margin:14px 0 7px">Difficulty</div><div class="pk-list tiers">${tiers}</div>`+
    `<div class="cta"><button class="btn pri" id="psGo">▶ Begin</button><button class="btn" id="psBack">← Menu</button></div>`);
  const re=()=>{ UI.overlay.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('sel',b.dataset.mode===XS.app.mode));
    UI.overlay.querySelectorAll('[data-tier]').forEach(b=>b.classList.toggle('sel',b.dataset.tier===XS.app.tier)); };
  UI.overlay.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ sfx('click'); XS.app.mode=b.dataset.mode; re(); });
  UI.overlay.querySelectorAll('[data-tier]').forEach(b=>b.onclick=()=>{ sfx('click'); XS.app.tier=b.dataset.tier; re(); });
  $('psGo').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startMission(null,XS.app.tier); UI.renderPhase(); };
  $('psBack').onclick=()=>{ sfx('click'); UI.showMenu(); };
};
UI.showSettings=function(){
  const on=XS.sfx&&XS.sfx.enabled, amb=XS.sfx&&XS.sfx.ambient;
  card(`<div class="sub">Settings</div><h2>Options</h2>`+
    `<div class="setrow"><span class="setlbl">🔊 Volume</span><input type="range" id="volSld" min="0" max="100" value="${Math.round((XS.sfx?XS.sfx.volume:.7)*100)}"></div>`+
    `<div class="setrow"><button class="chipbtn ${on?'on':''}" id="muteBtn2">${on?'Sound on':'Muted'}</button>`+
      `<button class="chipbtn ${amb?'on':''}" id="ambBtn">Ambient</button>`+
      (XS.progress.xp>0?`<button class="chipbtn" id="resetBtn">Reset progress</button>`:'')+`</div>`+
    `<div class="cta"><button class="btn pri" id="setBack">← Menu</button></div>`);
  $('volSld').oninput=e=>{ if(XS.sfx) XS.sfx.setVolume((+e.target.value)/100); };
  $('volSld').onchange=()=>sfx('blip');
  $('muteBtn2').onclick=()=>{ const v=XS.sfx.toggle(); const b=$('muteBtn2'); b.textContent=v?'Sound on':'Muted'; b.classList.toggle('on',v); };
  $('ambBtn').onclick=()=>{ const v=XS.sfx.toggleAmbient(); $('ambBtn').classList.toggle('on',v); };
  const rb=$('resetBtn'); if(rb) rb.onclick=()=>{ if(confirm('Reset all progress and Codex?')){ XS.resetProgress(); UI.showMenu(); } };
  $('setBack').onclick=()=>{ sfx('click'); UI.showMenu(); };
};

UI.showAchievements=function(){
  const list=XS.ACHIEVEMENTS.map(a=>{const got=XS.progress.badges.includes(a.id);
    return `<div class="ach ${got?'got':''}"><div class="ach-ico">${got?a.icon:'🔒'}</div><div><div class="ach-n">${got?a.name:'???'}</div><div class="ach-d">${a.desc}</div></div></div>`;}).join('');
  card(`<div class="sub">Achievements · ${XS.progress.badges.length}/${XS.ACHIEVEMENTS.length}</div><div class="ach-grid">${list}</div><div class="cta"><button class="btn pri" id="achClose">Close</button></div>`);
  $('achClose').onclick=()=>{ UI.hideOverlay(); UI.showMenu(); };
};

UI.showResult=function(){
  if(XS.app.tutorial){ XS.app.tutorial.step=4; UI.updateCoach(); return; }   // tutorial handles its own finish
  if(XS.app.run && XS.app.run.active) return UI.showOutbreakCase();           // outbreak run · scored interstitial
  if(XS.app.sc && XS.app.sc.story && XS.app.result && XS.app.result.win){ sfx('win'); return UI.showChapterOutro(); }
  const app=XS.app, sc=app.sc, O=XS.OBJECTIVE_INFO[sc.objective], win=app.result.win;
  sfx(win?'win':'lose'); if(app.rankUp) setTimeout(()=>sfx('rank'),650);
  const xpList=app.lastXP.slice(0,5).map(x=>`<div class="xp-row"><span>${x.reason}</span><b>+${x.n}</b></div>`).join('');
  const rankUp=app.rankUp?`<div class="rankup">⬆ Promoted to <b>${app.rankUp.name}</b>!</div>`:'';
  const flawless=win&&app.missionWrong===0?`<div class="streakline">🎯 Clean diagnosis — no wrong treatments</div>`:'';
  const ultraBlock=sc.intruder?`<div class="rev ultra">🧬 CASE · <span class="hl">${sc.intruder.name}</span> <span class="muted">(${sc.intruder.aka})</span> · REAL-WORLD DRUG · <span class="hl">${sc.intruder.drug}</span>${win?(sc.textbookMatch?` · <span class="hl" style="color:var(--aqua)">✓ you built the textbook drug</span>`:` <span class="muted">· a valid drug of the right class, though not the classic choice</span>`):''}</div>`:'';
  const shareStr=app.daily?`XENOSCOPE Daily ${XS.dailyKey()} — ${sc.name} ${win?'✅ '+O.label.toLowerCase():'❌ failed'}`:'';
  const dailyBlock=app.daily?`<div class="sharebox"><div class="share-h">🗓 Daily ${XS.dailyKey()}</div><div class="sharestr" id="shareStr">${shareStr}</div><button class="chipbtn" id="copyShare">📋 Copy result</button></div>`:'';
  card(
    `<div class="sub">Field report · ${sc.name}</div>`+
    `<div class="verdict ${win?'win':'lose'}">${win?'✦ '+O.winT:'ASSIGNMENT FAILED'}</div>`+
    `<p>${win?`You correctly ${sc.objective==='preserve'?'diagnosed and cured':'found the weakness of'} <b>${sc.name}</b>, ${sc.A.body}.`:`<b>${sc.name}</b> — ${app.result.why||'the objective was missed'}.`}</p>`+
    rankUp+flawless+ultraBlock+
    `<div class="rev">CAUSE · <span class="hl">${sc.objective==='preserve'?XS.PATHOGENS[sc.pathType].label:'structural weakness'}</span> · CORRECT TREATMENT · <span class="hl">${XS.agentName(sc.agent)}</span></div>`+
    `<div class="xp-list">${xpList}</div>`+ dailyBlock+
    `<div class="cta"><button class="btn pri" id="nextBtn">▶ Next assignment</button><button class="btn" id="menuBtn3">☰ Menu</button><button class="btn" id="codexBtn3">📖 Codex</button></div>`
  );
  $('nextBtn').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startMission(null,XS.app.tier); UI.renderPhase(); };
  $('menuBtn3').onclick=UI.showMenu; $('codexBtn3').onclick=UI.showCodex;
  const cs=$('copyShare'); if(cs) cs.onclick=()=>{ try{ navigator.clipboard.writeText(shareStr); cs.textContent='✓ Copied'; }catch(e){ cs.textContent='select ↑'; } };
};

/* ---------------- CREATOR · design your own organism ----------------
   The preview IS the game's own renderer: we build a throwaway scenario and
   let the normal loop draw it, so what you sculpt is exactly what you'll play.
   The panel sits at the edges and leaves the creature visible in the middle. */
UI.showCreator=function(def){
  const D = def || XS._creatorDef || (XS._creatorDef=XS.newCreatureDef());
  XS._creatorDef=D;
  UI.hideOverlay();
  XS.previewCreature(D);
  UI.top.style.display='flex'; UI.renderTop();
  if(UI.coach) UI.coach.style.display='none';
  const runHud=document.getElementById('runhud'); if(runHud) runHud.style.display='none';

  const K=XS.KINGDOMS[D.cell]||{}, weak=XS.killAgentsFor(D.cell)[0];
  UI.left.innerHTML=
    `<div class="cap">Design</div>`+
    `<label class="cr-lab">Name</label>`+
    `<input class="cr-name" id="crName" maxlength="22" placeholder="Name your organism" value="${(D.name||'').replace(/"/g,'&quot;')}">`+
    `<label class="cr-lab">Your kingdom <span class="muted">— what you call it</span></label>`+
    `<input class="cr-name" id="crKing" maxlength="18" placeholder="e.g. Vitreoform" value="${(D.kingdomName||'').replace(/"/g,'&quot;')}">`+
    `<label class="cr-lab">Based on <span class="muted">— sets its biology</span></label>`+
    `<select class="cr-sel" id="crCell">${XS.CREATOR_KINGDOMS.map(k=>`<option value="${k}"${k===D.cell?' selected':''}>${(XS.KINGDOMS[k]||{}).label||k}${(XS.KINGDOMS[k]||{}).alien?' · alien':''}</option>`).join('')}</select>`+
    `<div class="cr-bio"><b>${K.label||D.cell}</b><small>${K.blurb||''}</small>`+
      `<div class="cr-weak">Weakness · <b>${XS.agentName(weak)}</b></div></div>`;
  UI.right.innerHTML=
    `<div class="cap">Sculpt</div>`+
    `<div class="cr-tool"><div class="cr-toolh">✋ Shape it with the cursor</div>`+
      `<div class="cr-toolb">Drag <b>on the body</b> to push or pull its outline.<br>`+
      `Drag <b>past the edge</b> to draw a limb.<br>That is the whole tool — it is your hands, not settings.</div></div>`+
    `<label class="cr-lab">Colour</label>`+
    `<input type="range" class="cr-rng" id="crHue" min="0" max="1" step="0.01" value="${D.hue}">`+
    `<label class="cr-lab">Size <b class="cr-val" id="crSizev">${(+(D.size||1)).toFixed(2)}×</b></label>`+
    `<input type="range" class="cr-rng" id="crSize" min="0.6" max="1.6" step="0.01" value="${D.size||1}">`+
    `<div class="cr-acts">`+
      `<button class="btn" id="crSmooth">〜 Smooth</button>`+
      `<button class="btn" id="crReset">↺ Reset shape</button>`+
    `</div>`+
    `<div class="cr-note">Nothing here is generated for you. Every bump and limb on that creature is one you made.</div>`;

  // ORGANELLES — the kingdom forces some; you may add more
  const forced=(XS.KINGDOMS[D.cell]||{}).parts||[];
  const forcedIds=forced.map(x=>x[0]);
  const chips=(XS.OPTIONAL_ORGS||[]).filter(id=>XS.ORG[id]).map(id=>{
    const on=(D.orgs||[]).includes(id), lock=forcedIds.includes(id);
    const o=XS.ORG[id];
    return `<button class="cr-org ${on?'on':''} ${lock?'lock':''}" data-org="${id}" title="${o.fn.replace(/"/g,'')}">`+
      `<span class="cr-dot" style="background:${o.col}"></span>${o.name}${lock?' 🔒':''}</button>`;}).join('');
  UI.zlab.classList.remove('on');
  let orgPanel=document.getElementById('crOrg');
  if(!orgPanel){ orgPanel=document.createElement('div'); orgPanel.id='crOrg'; orgPanel.className='cr-orgwrap'; document.body.appendChild(orgPanel); }
  orgPanel.style.display='block';
  orgPanel.innerHTML=`<div class="cap">Organelles <span class="muted">— 🔒 required by ${(XS.KINGDOMS[D.cell]||{}).label||D.cell}</span></div>`+
    `<div class="cr-orgs">${chips}</div>`;
  orgPanel.querySelectorAll('[data-org]').forEach(bt=>bt.onclick=()=>{ const id=bt.dataset.org;
    if(forcedIds.includes(id)){ sfx('err'); return; }
    D.orgs=D.orgs||[]; const i=D.orgs.indexOf(id);
    if(i>=0) D.orgs.splice(i,1); else D.orgs.push(id);
    sfx('click'); UI.showCreator(D); });

  UI.dock.innerHTML=
    `<button class="abtn back" id="crBack"><b>← Menu</b><small>discard</small></button>`+
    `<div class="dsep"></div>`+
    `<button class="abtn" id="crSave"><b>💾 Save</b><small>add to your catalogue</small></button>`+
    `<button class="abtn treat" id="crPlayP"><b>💚 Play · Preserve</b><small>something is killing it</small></button>`+
    `<button class="abtn treat" id="crPlayN"><b>☠️ Play · Neutralize</b><small>it is the threat</small></button>`+
    `<div class="dsep"></div>`+
    `<button class="abtn" id="crCell"><b>🔬 Inspect cell</b><small>see the interior you built</small></button>`+
    `<button class="abtn" id="crList"><b>📚 My species</b><small>${(XS.progress.custom||[]).length} saved</small></button>`;

  const re=()=>{ XS.previewCreature(D); };
  $('crName').oninput=e=>{ D.name=e.target.value; };
  const kn=$('crKing'); if(kn) kn.oninput=e=>{ D.kingdomName=e.target.value; };
  $('crCell').onchange=e=>{ sfx('click'); D.cell=e.target.value; UI.showCreator(D); };
  $('crHue').oninput=e=>{ D.hue=+e.target.value; XS.applySculpt(D); };
  $('crSize').oninput=e=>{ D.size=+e.target.value; const l=$('crSizev'); if(l) l.textContent=D.size.toFixed(2)+'×'; XS.applySculpt(D); };
  $('crSmooth').onclick=()=>{ sfx('blip'); XS.smoothShape(D); re(); };
  $('crReset').onclick=()=>{ sfx('err'); XS.resetShape(D); re(); };
  XS.app.sculpt=D;                       // arms the pointer tool on the canvas
  $('crBack').onclick=()=>{ sfx('click'); XS.app.sculpt=null; const op=document.getElementById('crOrg'); if(op) op.style.display='none'; UI.showMenu(); };
  $('crSave').onclick=()=>{ if(!(D.name||'').trim()){ D.name='Unnamed'; $('crName').value='Unnamed'; }
    sfx('ok'); XS.saveCreature(D); UI.showCreator(D);
    UI.showToast({icon:'🧬', name:'Saved', desc:D.name+' added to your catalogue'}); };
  const closeOrg=()=>{ XS.app.sculpt=null; const op=document.getElementById('crOrg'); if(op) op.style.display='none'; };
  $('crPlayP').onclick=()=>{ sfx('click'); closeOrg(); XS.startCustomMission(D,'preserve'); UI.renderPhase(); };
  $('crPlayN').onclick=()=>{ sfx('click'); closeOrg(); XS.startCustomMission(D,'neutralize'); UI.renderPhase(); };
  $('crCell').onclick=()=>{ sfx('scan'); XS.app.sculpt=null;
    const sc=XS.app.sc; sc.regions.forEach(r=>r.cellSpec=null);
    XS.enterRegion(sc.regions[0]); UI.renderPhase();
    UI.dock.innerHTML=`<button class="abtn back" id="crCellBack"><b>← Back to sculpting</b><small>return to the creator</small></button>`;
    $('crCellBack').onclick=()=>{ sfx('click'); XS.exitRegion(); UI.showCreator(D); }; };
  $('crList').onclick=()=>{ sfx('click'); UI.showMySpecies(); };
};
UI.showMySpecies=function(){
  const list=XS.progress.custom||[];
  const rows=list.length? list.map(d=>{const K=XS.KINGDOMS[d.cell]||{};
    return `<div class="cr-row"><div class="cr-rowtx"><b>${d.name||'Unnamed'}</b>`+
      `<small>${K.label||d.cell} · ${d.plan}</small></div>`+
      `<button class="chipbtn" data-edit="${d.seed}">Edit</button>`+
      `<button class="chipbtn" data-play="${d.seed}">▶ Play</button>`+
      `<button class="chipbtn danger" data-del="${d.seed}">✕</button></div>`;}).join('')
    : `<div class="muted">Nothing saved yet. Design something and hit <b>Save</b>.</div>`;
  card(`<div class="sub">Your catalogue · ${list.length} species</div><h2>My species</h2>`+
    `<div class="cr-rows">${rows}</div>`+
    `<div class="cta"><button class="btn pri" id="msNew">＋ New organism</button><button class="btn" id="msBack">← Back</button></div>`);
  UI.overlay.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{ sfx('click');
    UI.showCreator(Object.assign({}, list.find(x=>x.seed==b.dataset.edit))); });
  UI.overlay.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>{ sfx('click'); UI.hideOverlay();
    XS.startCustomMission(list.find(x=>x.seed==b.dataset.play), null); UI.renderPhase(); });
  UI.overlay.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ sfx('err');
    XS.deleteCreature(+b.dataset.del); UI.showMySpecies(); });
  $('msNew').onclick=()=>{ sfx('click'); UI.showCreator(XS.newCreatureDef()); };
  $('msBack').onclick=()=>{ sfx('click'); if(XS.app.phase==='survey'&&XS.app.sc&&XS.app.sc.preview) UI.showCreator(); else UI.showMenu(); };
};

/* ---------------- STORY · The Long Survey ---------------- */
UI.showStory=function(){
  const done=XS.storyProgress();
  let act='';
  const rows=XS.STORY.map((ch,i)=>{
    const state = i<done?'done' : i===done?'next' : 'locked';
    const head = ch.act!==act ? (act=ch.act, `<div class="st-act">${ch.act}</div>`) : '';
    return head+`<button class="st-ch ${state}" data-ch="${i}"${state==='locked'?' disabled':''}>`+
      `<span class="st-n">${state==='done'?'✓':state==='next'?'▶':'🔒'}</span>`+
      `<span class="st-tx"><b>${state==='locked'?'— — —':ch.title}</b>`+
      `<small>${state==='locked'?'Locked':ch.teaches}</small></span></button>`;
  }).join('');
  card(`<div class="sub">The Long Survey · chapter ${Math.min(done+1,XS.STORY.length)} of ${XS.STORY.length}</div>`+
    `<h2>Story</h2>`+
    `<p class="muted">A campaign aboard the survey ship <b>Verity</b>. Each chapter teaches one idea and hands you the next — the whole game, in order, without the noise.</p>`+
    `<div class="st-list">${rows}</div>`+
    `<div class="cta"><button class="btn" id="stBack">☰ Menu</button></div>`);
  UI.overlay.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{ sfx('click'); UI.showChapterIntro(+b.dataset.ch); });
  $('stBack').onclick=()=>{ sfx('click'); UI.showMenu(); };
};
UI.showChapterIntro=function(i){
  const ch=XS.storyChapter(i); if(!ch) return;
  const prose=ch.log.split('\n\n').map(p=>`<p class="st-p">${p}</p>`).join('');
  card(`<div class="sub">${ch.act}</div><h2>${ch.title}</h2>`+
    `<div class="st-log">${prose}</div>`+
    `<div class="st-teach">This chapter is about: <b>${ch.teaches}</b></div>`+
    `<div class="cta"><button class="btn pri" id="stGo">▶ Begin</button><button class="btn" id="stCancel">← Chapters</button></div>`);
  $('stGo').onclick=()=>{ sfx('click'); UI.hideOverlay(); if(XS.startStory(i)) UI.renderPhase(); };
  $('stCancel').onclick=()=>{ sfx('click'); UI.showStory(); };
};
UI.showChapterOutro=function(){
  const sc=XS.app.sc, ch=sc.story, i=sc.storyIndex, last=i>=XS.STORY.length-1;
  const spared=XS.app.storyChoice==='spare';
  const body = spared
    ? `<p class="st-p">You log it as <b>unclassified</b> and do not fire.</p>`+
      `<p class="st-p">Command will want a reason. You do not have one that fits the form — only that a thing which changes its pattern when you speak to it has met you halfway, and you were not certain, and being uncertain seemed like the whole point of the job.</p>`+
      `<p class="st-p">The <b>Verity</b> moves on. Six days later, the field is still following.</p>`
    : `<p class="st-p">${ch.out}</p>`+ (last?`<p class="st-p">You carried out the order. It was lawful, it was quick, and it was probably correct.\n\nYou will not find out.</p>`:'');
  card(`<div class="sub">${ch.act} · ${ch.title}</div>`+
    `<div class="verdict win" style="font-size:22px;letter-spacing:2px">${spared?'◇ STOOD DOWN':'✦ CHAPTER CLEARED'}</div>`+
    `<div class="st-log">${body}</div>`+
    `<div class="cta">`+
      (last?`<button class="btn pri" id="stDone">☰ Menu</button>`
           :`<button class="btn pri" id="stNext">▶ Next chapter</button><button class="btn" id="stList">Chapters</button>`)+
    `</div>`);
  const n=$('stNext'); if(n) n.onclick=()=>{ sfx('click'); UI.showChapterIntro(i+1); };
  const l=$('stList'); if(l) l.onclick=()=>{ sfx('click'); UI.showStory(); };
  const d=$('stDone'); if(d) d.onclick=()=>{ sfx('click'); UI.showMenu(); };
};

/* ---------------- OUTBREAK · scored survival run ---------------- */
function colonyCol(v){ return v>50?'var(--mint)':v>25?'var(--warn)':'var(--coral)'; }
UI.showOutbreakCase=function(){ const run=XS.app.run; if(!run) return; const lg=run.lastGrade||{}, sc=XS.app.sc, win=lg.win;
  sfx(win?'win':'lose');
  if(run.over) return UI.showOutbreakSummary();
  const badge = win?`<div class="gradebadge g${lg.g}">${lg.g}</div>`:`<div class="gradebadge lost">✕</div>`;
  const scoreLine = win
    ? `<div class="ob-gain">+${lg.gained}<small>pts · solved in ${lg.el}s${run.mod==='double'?' · ⭐ high-value ×2':''}</small></div>`
    : `<div class="ob-gain lost">Patient lost<small>${(XS.app.result&&XS.app.result.why)||'the case slipped away'} · −34 colony</small></div>`;
  card(
    `<div class="sub">Outbreak · Case ${run.caseNum}</div>`+
    `<div class="ob-head">${badge}<div><div class="verdict ${win?'win':'lose'}" style="font-size:22px;letter-spacing:2px">${win?'CASE CLEARED':'PATIENT LOST'}</div>`+
      `<div class="muted">${sc?sc.name:''}${sc?' · '+(sc.objective==='preserve'?'preserved':'neutralised'):''}</div></div></div>`+
    scoreLine+
    `<div class="ob-stats"><div class="ob-stat"><span>🔥 Combo</span><b>${run.streak} <em>×${run.mult}</em></b></div>`+
      `<div class="ob-stat"><span>🏆 Score</span><b>${run.score}</b></div>`+
      `<div class="ob-stat"><span>⭐ Best</span><b>${Math.max(run.score,XS.progress.outbreakBest||0)}</b></div></div>`+
    `<div class="ob-colonywrap"><div class="cap">Colony vitality</div><div class="ob-track"><i style="width:${run.colony}%;background:${colonyCol(run.colony)}"></i></div></div>`+
    `<div class="cta"><button class="btn pri" id="obNext">▶ Next case</button><button class="btn" id="obEnd">✕ End run</button></div>`
  );
  $('obNext').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.outbreakNextCase(); UI.renderPhase(); };
  $('obEnd').onclick=()=>{ sfx('click'); UI.hideOverlay(); UI.showOutbreakSummary(); };
};
UI.showOutbreakSummary=function(){ const run=XS.app.run; if(!run){ UI.showMenu(); return; }
  const best=XS.progress.outbreakBest||0;
  const share=`XENOSCOPE Outbreak — ${run.cleared} case${run.cleared===1?'':'s'} cleared · ${run.score} pts${run.newBest?' 🏅 new best!':''}`;
  card(
    `<div class="sub">Outbreak · run over</div>`+
    `<div class="verdict ${run.newBest?'win':'lose'}">${run.newBest?'🏅 NEW HIGH SCORE':'OUTBREAK CONTAINED'}</div>`+
    `<div class="ob-final"><div class="ob-finalscore">${run.score}<small>points</small></div>`+
      `<div class="ob-finalgrid"><div><b>${run.cleared}</b><span>cases cleared</span></div><div><b>${run.caseNum}</b><span>cases faced</span></div><div><b>${best}</b><span>your best</span></div></div></div>`+
    `<div class="sharebox"><div class="sharestr" id="shareStr">${share}</div><button class="chipbtn" id="copyShare">📋 Copy result</button></div>`+
    `<div class="cta"><button class="btn pri" id="obAgain">↺ New run</button><button class="btn" id="obMenu">☰ Menu</button></div>`
  );
  $('obAgain').onclick=()=>{ sfx('click'); UI.hideOverlay(); XS.startOutbreak(); UI.renderPhase(); };
  $('obMenu').onclick=()=>{ sfx('click'); XS.endOutbreak(); UI.hideOverlay(); UI.showMenu(); };
  const cs=$('copyShare'); if(cs) cs.onclick=()=>{ try{ navigator.clipboard.writeText(share); cs.textContent='✓ Copied'; }catch(e){ cs.textContent='select ↑'; } };
};
/* live run HUD strip (re-rendered only when a value changes) */
UI.renderRunHud=function(){ const run=XS.app.run; let el=document.getElementById('runhud');
  if(!run||!run.active||XS.app.phase==='menu'||XS.app.phase==='result'){ if(el) el.style.display='none'; return; }
  if(!el){ el=document.createElement('div'); el.id='runhud'; document.body.appendChild(el); }
  el.style.display='flex';
  const t=run.caseStartT?Math.max(0,Math.floor((XS.app.time-run.caseStartT)/1000)):0;
  const sig=[run.caseNum,Math.round(run.colony),run.score,run.streak,run.mult,t,run.mod].join('|');
  if(el.dataset.sig===sig) return; el.dataset.sig=sig;
  const modTag = run.mod==='double'?'<span class="rh-mod dbl">⭐ ×2</span>' : run.mod==='rush'?'<span class="rh-mod rush">⚠ RUSH</span>' : '';
  el.innerHTML=`<div class="rh-case">CASE ${run.caseNum} ${modTag}</div>`+
    `<div class="rh-colony"><span>COLONY</span><div class="rh-bar"><i style="width:${run.colony}%;background:${colonyCol(run.colony)}"></i></div></div>`+
    `<div class="rh-score">🏆 <b>${run.score}</b></div>`+
    `<div class="rh-combo ${run.streak>=2?'hot':''}">🔥 ${run.streak}${run.streak>=1?` <em>×${run.mult}</em>`:''}</div>`+
    `<div class="rh-timer">⏱ ${t}s</div>`;
};

UI.showCodex=function(){
  const cx=XS.codex();
  const org=Object.entries(XS.ORG).map(([id,o])=>{const known=XS.progress.organelles.includes(id);const more=(XS.MORE||{})[id],wiki=(XS.WIKI||{})[id];
    return `<div class="cx ${known?'':'locked'}"><div class="cx-h"><span class="cx-dot" style="color:${o.col};background:${known?o.col:'#2a3a44'}"></span>${known?o.name:'???'}</div>`+
      (known?`<div class="cx-fn">${o.fn}</div>${more?`<div class="cx-fn">${more}</div>`:''}<div class="cx-fact">💡 ${o.fact}${learn(wiki)}</div>`:'<div class="cx-fn muted">Inspect this structure on a specimen to unlock.</div>')+`</div>`;}).join('');
  const orgz=XS.KLIST.map(k=>{const known=XS.progress.organisms.includes(k);const K=XS.KINGDOMS[k];
    return `<div class="cx ${known?'':'locked'}"><div class="cx-h"><span class="cx-dot" style="color:rgb(${K.col.join(',')});background:${known?`rgb(${K.col.join(',')})`:'#2a3a44'}"></span>${known?K.label:'???'}</div>`+
      (known?`<div class="cx-fn">${K.blurb}</div><div class="cx-fact">${learn((XS.KWIKI||{})[k])}</div>`:'<div class="cx-fn muted">Encounter these cells to unlock.</div>')+`</div>`;}).join('');
  // field-guide references (always visible)
  const ingL=id=>{const x=(XS.INGREDIENTS||[]).find(b=>b.id===id);return x?x.label:id;};
  const stepL=id=>{const x=(XS.LAB_STEPS||[]).find(b=>b.id===id);return x?x.label.toLowerCase():id;};
  const recipeOf=a=>{const rs=(XS.recipesFor?XS.recipesFor(a):[])||[];
    return rs.length?rs.map(f=>`${f.items.map(ingL).join(' + ')} → ${stepL(f.step)}`).join(' &nbsp;·&nbsp; '):null;};
  const affCol={virus:'#ff5ec7',bacterium:'#9fd0ff',fungus:'#ffd27a',parasite:'#b878ff',prion:'#e6e696',toxin_load:'#b4ff8c'};
  const aff=Object.keys(XS.PATHOGENS).map(k=>{const P=XS.PATHOGENS[k], rec=recipeOf(P.cure), c=affCol[k]||'#8fe9ff';
    return `<div class="cx"><div class="cx-h"><span class="cx-dot" style="color:${c};background:${c}"></span>${P.dx}</div>`+
      `<div class="cx-fn"><b>Spot it:</b> ${P.tell}</div>`+
      `<div class="cx-fact">💊 Cure: <b>${XS.agentName(P.cure)}</b>${rec?` <span class="muted">· make it: ${rec}</span>`:''}</div>`+
      `<div class="cx-fn muted">${P.why}</div></div>`;}).join('');
  const tx=XS.TREATMENTS.map(t=>{const rec=recipeOf(t.id);
    return `<div class="cx"><div class="cx-h"><span class="cx-dot" style="color:var(--aqua);background:var(--aqua)"></span>${t.label}</div>`+
      `<div class="cx-fn">${t.desc}</div>`+(rec?`<div class="cx-fact">⚗ Make it: <b>${rec}</b></div>`:'')+`</div>`;}).join('');
  const cmp=(XS.TRAITS||[]).map(tr=>`<div class="cx"><div class="cx-h"><span class="cx-dot" style="color:var(--warn);background:var(--warn)"></span>${tr.tag} · ${tr.label}</div><div class="cx-fn">${tr.hint}</div></div>`).join('');
  const tabs=[['org',`Organelles ${cx.organelles.length}/${cx.totalOrganelles}`,org],
    ['orgz',`Cell types ${cx.organisms.length}/${cx.totalOrganisms}`,orgz],
    ['aff','Afflictions',aff],['tx','Treatments',tx],['cmp','Complications',cmp]];
  card(`<div class="sub">Xeno-Codex · field guide</div>`+
    `<div class="cx-tabs">${tabs.map((t,i)=>`<button class="cx-tab ${i===0?'sel':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>`+
    tabs.map((t,i)=>`<div class="cx-list" id="cx_${t[0]}"${i===0?'':' style="display:none"'}>${t[2]}</div>`).join('')+
    `<div class="cta"><button class="btn pri" id="cxClose">Close</button></div>`);
  UI.overlay.querySelectorAll('.cx-tab').forEach(b=>b.onclick=()=>{ UI.overlay.querySelectorAll('.cx-tab').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
    tabs.forEach(t=>{ const el=$('cx_'+t[0]); if(el) el.style.display = t[0]===b.dataset.tab?'':'none'; }); });
  $('cxClose').onclick=()=>{ UI.hideOverlay(); if(XS.app.phase==='menu')UI.showMenu(); };
};

})(window.XS);
