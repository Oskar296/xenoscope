/* =====================================================================
   XENOSCOPE · draw.js
   Canvas renderer. Cells (membrane/wall + individually-shaped organelles),
   viruses (capsid + spikes + genome), and plant vascular tissue.
   Each drawn part records its screen position for hit-testing.
===================================================================== */
(function(XS){
"use strict";
const cl=XS.cl, rnd=XS.rnd;
let ctx,cv,W,H,DPR,cx,cy,R;
let bokeh=[];

XS.initCanvas=function(canvas){
  cv=canvas; ctx=cv.getContext('2d'); resize();
  window.addEventListener('resize',resize);
  bokeh=[]; for(let i=0;i<46;i++) bokeh.push({x:Math.random()*W,y:Math.random()*H,r:rnd(20,110),vx:rnd(-6,6),vy:rnd(-6,6),a:rnd(.015,.05),hue:Math.random()});
};
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1); W=window.innerWidth; H=window.innerHeight;
  cv.width=W*DPR; cv.height=H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0);
  cx=W/2; cy=H/2; R=Math.max(120,Math.min(W,H)*0.23);
}
XS.geom=()=>({cx,cy,R,W,H});

function bg(t){
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*.75);
  g.addColorStop(0,'#08181f'); g.addColorStop(1,'#03080b'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='lighter';
  for(const b of bokeh){ b.x+=b.vx*.016;b.y+=b.vy*.016;
    if(b.x<-120)b.x=W+120; if(b.x>W+120)b.x=-120; if(b.y<-120)b.y=H+120; if(b.y>H+120)b.y=-120;
    const col=b.hue<.5?'94,242,214':'120,180,255';
    const bg=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
    bg.addColorStop(0,`rgba(${col},${b.a})`); bg.addColorStop(1,`rgba(${col},0)`);
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,6.3); ctx.fill(); }
  ctx.globalCompositeOperation='source-over';
}

function blob(rr,amp,asp,seed,t,pts){ ctx.beginPath(); const n=pts||110;
  for(let i=0;i<=n;i++){ const a=i/n*6.283;
    const w=1+amp*(0.5*Math.sin(a*3+seed+t*.6)+0.3*Math.sin(a*5-seed*1.7+t*.9)+0.2*Math.sin(a*2+t*.4));
    const x=cx+Math.cos(a)*rr*w*asp, y=cy+Math.sin(a)*rr*w; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); }

const ease=x=>x*x*(3-2*x);
XS.render=function(app){
  const t=app.time/1000;
  const ph=app.phase;
  if(ph==='survey'||ph==='treat'){ if(app.sc){ drawWorld(app,t); return; } }
  bg(t);
  if(ph==='menu'){ if(app.demo) drawMenuDemo(app,t); return; }
  if(ph==='zoom'){ drawZoom(app,t); return; }
  if(app.sc){ drawWorld(app,t); }
};
function drawMenuDemo(app,t){ const spec=app.demo; if(!spec)return;
  ctx.save(); ctx.globalAlpha=0.6; ctx.translate(cx,cy); ctx.rotate(Math.sin(t*0.16)*0.09); ctx.translate(-cx,-cy);
  const da={spec,S:null,phase:'menu',time:app.time};
  if(spec.tissue)drawTissue(da,t); else if(spec.isVirus)drawVirus(da,t); else drawCell(da,t);
  ctx.restore(); }
function drawZoom(app,t){ const spec=app.spec; if(!spec) return;
  const zt = app.zoomAt? cl((app.time-app.zoomAt)/430,0,1):1;
  ctx.save();
  if(zt<1){ const s=0.5+0.5*ease(zt); ctx.globalAlpha=ease(zt); ctx.translate(cx,cy); ctx.scale(s,s); ctx.translate(-cx,-cy); }
  const da=app;
  if(spec.tissue)drawTissue(da,t); else if(spec.isVirus)drawVirus(da,t); else drawCell(da,t);
  if(app.zoomPathogen) drawPathogens(app.zoomPathogen,t);
  ctx.restore();
  drawScan(app);
}
/* rounded-rect path (for the boxy plant cell) */
function roundRectPath(x,y,hw,hh,r){ ctx.beginPath();
  ctx.moveTo(x-hw+r,y-hh); ctx.lineTo(x+hw-r,y-hh); ctx.quadraticCurveTo(x+hw,y-hh,x+hw,y-hh+r);
  ctx.lineTo(x+hw,y+hh-r); ctx.quadraticCurveTo(x+hw,y+hh,x+hw-r,y+hh);
  ctx.lineTo(x-hw+r,y+hh); ctx.quadraticCurveTo(x-hw,y+hh,x-hw,y+hh-r);
  ctx.lineTo(x-hw,y-hh+r); ctx.quadraticCurveTo(x-hw,y-hh,x-hw+r,y-hh); ctx.closePath(); }
/* plant cells are rigid rectangular boxes; everything else is an organic blob */
function cellPath(spec,rad,wob,asp,seed,t){
  if(spec && spec.kingdomKey==='Plantae'){ const s=rad; roundRectPath(cx,cy, s*1.12, s*0.9, s*0.16); }
  else blob(rad,wob,asp,seed,t);
}

/* ---------------- CELL ---------------- */
function drawCell(app,t){
  const spec=app.spec,S=app.S,kc=spec.K.col;
  const health=(S?S.vitality:70)/100, wob=spec.K.wobble+0.05*(1-health), asp=spec.K.aspect, rad=R*(0.86+0.16*health), seed=spec.optPH;
  // aura
  ctx.save();ctx.globalCompositeOperation='lighter';
  const a=ctx.createRadialGradient(cx,cy,rad*.3,cx,cy,rad*2.1);
  a.addColorStop(0,`rgba(${kc.join(',')},${0.09+0.12*health})`);a.addColorStop(1,`rgba(${kc.join(',')},0)`);
  ctx.fillStyle=a;ctx.beginPath();ctx.arc(cx,cy,rad*2.1,0,6.3);ctx.fill();ctx.restore();
  // cytoplasm
  cellPath(spec,rad,wob,asp,seed,t);
  const body=ctx.createRadialGradient(cx-rad*.25,cy-rad*.25,rad*.1,cx,cy,rad*1.05);
  body.addColorStop(0,`rgba(${kc.join(',')},.20)`);
  body.addColorStop(.6,`rgba(${Math.round(kc[0]*.5)},${Math.round(kc[1]*.6)},${Math.round(kc[2]*.7)},.15)`);
  body.addColorStop(1,'rgba(10,26,30,.08)'); ctx.fillStyle=body; ctx.fill();
  // wall/membrane
  const mI=(S?S.integrity:100)/100;
  ctx.save();
  const wall=spec.K.wall;
  if(mI>0.35){
    if(wall==='cellulose'||wall==='chitin'){
      ctx.lineWidth=cl(rad*.05,3,8);ctx.strokeStyle=`rgba(${kc.join(',')},${0.4+0.4*mI})`;cellPath(spec,rad,wob,asp,seed,t);ctx.stroke();
      ctx.lineWidth=cl(rad*.018,1.5,4);ctx.strokeStyle=`rgba(${kc.join(',')},${0.7*mI})`;cellPath(spec,rad*0.9,wob,asp,seed,t);ctx.stroke();
    } else if(wall==='pepti'){
      ctx.lineWidth=cl(rad*.03,2,5);ctx.strokeStyle=`rgba(${kc.join(',')},${0.55*mI+.3})`;ctx.shadowColor=`rgba(${kc.join(',')},.7)`;ctx.shadowBlur=12;cellPath(spec,rad,wob,asp,seed,t);ctx.stroke();
      ctx.shadowBlur=0;ctx.lineWidth=1.4;ctx.strokeStyle=`rgba(${kc.join(',')},${0.5*mI})`;cellPath(spec,rad*0.88,wob,asp,seed,t);ctx.stroke();
    } else {
      ctx.lineWidth=cl(rad*.028,2,6);ctx.strokeStyle=`rgba(${kc.join(',')},${0.5+0.4*mI})`;ctx.shadowColor=`rgba(${kc.join(',')},.8)`;ctx.shadowBlur=cl(18*mI+4,4,22);cellPath(spec,rad,wob,asp,seed,t);ctx.stroke();
    }
  } else { ctx.lineWidth=cl(rad*.03,2,6);ctx.strokeStyle=`rgba(${kc.join(',')},${0.4+0.4*mI})`;ctx.setLineDash([rad*.18*mI+4,rad*.10]);cellPath(spec,rad,wob,asp,seed,t);ctx.stroke();ctx.setLineDash([]); }
  ctx.restore();
  // appendages behind organelles
  for(const p of spec.parts){ if(p.shape==='flagellum') drawFlagellum(p,rad,asp,t); if(p.shape==='cilia') drawCilia(rad,asp,wob,seed,t,p); if(p.shape==='pili') drawPili(rad,asp,t,p); }
  // clip and draw organelles
  ctx.save(); cellPath(spec,rad,wob,asp,seed,t); ctx.clip();
  for(const p of spec.parts){ if(['flagellum','cilia','pili','spike','tail'].includes(p.shape)) {markPos(p,rad,asp);continue;} drawPart(app,p,rad,asp,t); }
  ctx.restore();
  inspectRings(app,rad);
}

/* ---------------- VIRUS ---------------- */
function drawVirus(app,t){
  const spec=app.spec,S=app.S,kc=spec.K.col, rad=R*0.62*(0.8+0.3*((S?S.vitality:60)/100));
  ctx.save();ctx.globalCompositeOperation='lighter';
  const a=ctx.createRadialGradient(cx,cy,0,cx,cy,rad*2);
  a.addColorStop(0,`rgba(${kc.join(',')},.16)`);a.addColorStop(1,`rgba(${kc.join(',')},0)`);
  ctx.fillStyle=a;ctx.beginPath();ctx.arc(cx,cy,rad*2,0,6.3);ctx.fill();ctx.restore();
  // envelope (if present)
  const env=spec.parts.find(p=>p.id==='envelope');
  if(env){ ctx.save();ctx.strokeStyle=`rgba(${kc.join(',')},.4)`;ctx.lineWidth=cl(rad*.04,2,6);ctx.beginPath();ctx.arc(cx,cy,rad*1.12,0,6.3);ctx.stroke();ctx.restore(); env._x=cx;env._y=cy-rad*1.12;env._r=rad*.2; }
  // spikes
  for(const p of spec.parts){ if(p.shape==='spike') drawSpike(p,rad,t); }
  // capsid (icosahedral outline)
  ctx.save();
  const cap=spec.parts.find(p=>p.shape==='capsid');
  ctx.strokeStyle=`rgba(${kc.join(',')},.9)`; ctx.lineWidth=cl(rad*.03,2,5); ctx.shadowColor=`rgba(${kc.join(',')},.7)`;ctx.shadowBlur=14;
  ctx.beginPath(); for(let k=0;k<6;k++){const a=k/6*6.283+Math.PI/6+t*.05; const x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad;k?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); ctx.stroke();
  // internal facets
  ctx.lineWidth=1; ctx.shadowBlur=0; ctx.strokeStyle=`rgba(${kc.join(',')},.4)`;
  for(let k=0;k<6;k++){const a=k/6*6.283+Math.PI/6+t*.05; ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);ctx.stroke();}
  ctx.restore();
  if(cap){cap._x=cx;cap._y=cy;cap._r=rad*.7;}
  // genome coil inside
  const gen=spec.parts.find(p=>p.shape==='coil');
  if(gen){ ctx.save();ctx.strokeStyle='rgba(255,150,220,.9)';ctx.lineWidth=2;ctx.beginPath();
    for(let j=0;j<=50;j++){const a=j/50*6.283*2.5;const rr=rad*.45*(j/50);ctx.lineTo(cx+Math.cos(a+t)*rr,cy+Math.sin(a+t)*rr*.7);}ctx.stroke();ctx.restore();
    gen._x=cx;gen._y=cy;gen._r=rad*.4; }
  // tail fibres (phage)
  for(const p of spec.parts){ if(p.shape==='tail') drawTail(p,rad,t); }
  inspectRings(app,rad);
}

/* ---------------- PLANT TISSUE ---------------- */
function drawTissue(app,t){
  const spec=app.spec, halfW=R*1.5, halfH=R*1.1;
  // field
  ctx.save();ctx.globalCompositeOperation='lighter';
  const a=ctx.createRadialGradient(cx,cy,0,cx,cy,R*2);a.addColorStop(0,'rgba(150,230,200,.10)');a.addColorStop(1,'rgba(150,230,200,0)');
  ctx.fillStyle=a;ctx.fillRect(cx-halfW,cy-halfH,halfW*2,halfH*2);ctx.restore();
  const cols=Math.max(1,spec.parts.filter(p=>p.id==='xylem'||p.id==='phloem').length);
  let i=0;
  for(const p of spec.parts){
    if(p.id!=='xylem'&&p.id!=='phloem'&&p.id!=='wall_cellulose') { markPos(p,R,1); continue; }
    if(p.id==='wall_cellulose'){ ctx.strokeStyle='rgba(126,255,192,.25)';ctx.lineWidth=2;ctx.strokeRect(cx-halfW,cy-halfH,halfW*2,halfH*2); p._x=cx-halfW;p._y=cy;p._r=20; continue; }
    const n=spec.parts.filter(q=>q.id==='xylem'||q.id==='phloem').length;
    const x=cx-halfW + halfW*2*((i+0.5)/n); i++;
    const tubeW=halfW*2/n*0.6;
    if(p.id==='xylem') drawXylem(x,tubeW,halfH,t,p); else drawPhloem(x,tubeW,halfH,t,p);
  }
  inspectRings(app,R);
}
function drawXylem(x,w,h,t,p){
  ctx.save();ctx.strokeStyle='rgba(160,215,255,.85)';ctx.lineWidth=2.5;ctx.fillStyle='rgba(120,180,255,.10)';
  ctx.fillRect(x-w/2,cy-h,w,h*2); ctx.strokeRect(x-w/2,cy-h,w,h*2);
  // lignin rings + rising water bubbles
  ctx.strokeStyle='rgba(160,215,255,.5)';for(let y=cy-h+10;y<cy+h;y+=16){ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x+w/2,y);ctx.stroke();}
  ctx.fillStyle='rgba(200,235,255,.7)';for(let k=0;k<4;k++){const yy=cy+h-((t*40+k*80)%(h*2));ctx.beginPath();ctx.arc(x,yy,3,0,6.3);ctx.fill();}
  ctx.restore(); p._x=x;p._y=cy;p._r=w/2+6;
}
function drawPhloem(x,w,h,t,p){
  ctx.save();ctx.strokeStyle='rgba(150,255,190,.85)';ctx.lineWidth=2.5;ctx.fillStyle='rgba(120,255,180,.08)';
  ctx.fillRect(x-w/2,cy-h,w,h*2); ctx.strokeRect(x-w/2,cy-h,w,h*2);
  // sieve plates + sugar flowing (either direction)
  ctx.strokeStyle='rgba(150,255,190,.6)';for(let y=cy-h+22;y<cy+h;y+=44){ctx.beginPath();for(let sx=x-w/2;sx<x+w/2;sx+=5){ctx.moveTo(sx,y);ctx.lineTo(sx+2,y);}ctx.stroke();}
  ctx.fillStyle='rgba(200,255,220,.8)';for(let k=0;k<5;k++){const yy=cy-h+((t*30+k*60)%(h*2));ctx.beginPath();ctx.arc(x+Math.sin(t+k)*w*.2,yy,2.5,0,6.3);ctx.fill();}
  ctx.restore(); p._x=x;p._y=cy;p._r=w/2+6;
}

/* ---------------- organelle dispatch ---------------- */
function markPos(p,rad,asp){ p._x=cx+Math.cos(p.ang)*rad*p.rad*(asp||1); p._y=cy+Math.sin(p.ang)*rad*p.rad; p._r=rad*(p.sz||.05); }
function drawPart(app,p,rad,asp,t){
  const x=cx+Math.cos(p.ang)*rad*p.rad*asp, y=cy+Math.sin(p.ang)*rad*p.rad, s=rad*p.sz;
  p._x=x;p._y=y;p._r=Math.max(s,rad*.05);
  ctx.save();
  switch(p.shape){
    case 'nucleus': drawNucleus(x,y,s,t,p); break;
    case 'dot': ctx.fillStyle='rgba(216,201,255,.9)';ctx.beginPath();ctx.arc(x,y,s,0,6.3);ctx.fill(); break;
    case 'nucleoid': drawNucleoid(s,t); break;
    case 'ring': ell(x,y,s,s*.8,p.ang);ctx.strokeStyle='rgba(150,200,255,.9)';ctx.lineWidth=1.6;ctx.stroke(); break;
    case 'mito': drawMito(x,y,s,p.ang); break;
    case 'chloroplast': drawChloro(x,y,s,p.ang); break;
    case 'thylakoid': drawThylakoid(x,y,s,p.ang); break;
    case 'bigvac': ell(cx,cy,rad*p.sz,rad*p.sz*.9,0);ctx.fillStyle='rgba(120,200,255,.06)';ctx.fill();ctx.strokeStyle='rgba(150,210,255,.22)';ctx.lineWidth=1.5;ctx.stroke(); p._x=cx;p._y=cy;p._r=rad*p.sz*.7; break;
    case 'vac': ell(x,y,s,s*.92,p.ang);ctx.fillStyle='rgba(180,220,255,.07)';ctx.fill();ctx.strokeStyle='rgba(190,225,255,.28)';ctx.lineWidth=1.4;ctx.stroke(); break;
    case 'contractile': drawContractile(x,y,s,t,p); break;
    case 'foodvac': ell(x,y,s,s,0);ctx.fillStyle='rgba(255,220,160,.10)';ctx.fill();ctx.strokeStyle='rgba(255,225,170,.3)';ctx.lineWidth=1.1;ctx.stroke();ctx.fillStyle='rgba(255,205,120,.5)';ctx.beginPath();ctx.arc(x-s*.2,y-s*.2,s*.35,0,6.3);ctx.fill(); break;
    case 'lyso': drawLyso(x,y,s); break;
    case 'er': drawER(x,y,s,p.ang); break;
    case 'golgi': drawGolgi(x,y,s,p.ang); break;
    case 'centriole': drawCentriole(x,y,s); break;
    case 'spore': ell(x,y,s,s*1.3,p.ang);ctx.fillStyle='rgba(255,210,140,.8)';ctx.fill();ctx.strokeStyle='rgba(140,90,30,.8)';ctx.lineWidth=1.6;ctx.stroke();ctx.fillStyle='rgba(120,70,20,.5)';ctx.beginPath();ctx.arc(x,y,s*.3,0,6.3);ctx.fill(); break;
    case 'eyespot': ctx.globalCompositeOperation='lighter';ctx.fillStyle='#ff9a5c';ctx.shadowColor='#ff9a5c';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(x,y,s,0,6.3);ctx.fill(); break;
    case 'halo': ctx.strokeStyle='rgba(191,224,255,.35)';ctx.lineWidth=cl(rad*.03,2,5);ctx.beginPath();ctx.arc(cx,cy,rad*1.02,0,6.3);ctx.stroke(); p._x=cx;p._y=cy-rad;p._r=rad*.2; break;
    case 'wall': p._x=cx;p._y=cy-rad;p._r=rad*.25; break;   // handled by membrane stroke; hotspot at rim
    case 'membrane': p._x=cx+rad*asp;p._y=cy;p._r=rad*.22; break;
    default: ctx.fillStyle='rgba(220,240,255,.55)';ctx.beginPath();ctx.arc(x,y,Math.max(1,s),0,6.3);ctx.fill();
  }
  ctx.restore();
}

/* ---- organelle shapes ---- */
function ell(x,y,rx,ry,rot){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,6.29);}
function glow(x,y,r,col,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(.5,col+a);g.addColorStop(1,col+'00');ctx.fillStyle=g;}
function drawNucleus(x,y,s,t,p){const nr=s*(0.97+0.05*Math.sin(t*1.6+p.ph));
  ctx.globalCompositeOperation='lighter';glow(x,y,nr*1.5,'#b79bff','55');ctx.beginPath();ctx.arc(x,y,nr*1.2,0,6.3);ctx.fill();
  ctx.globalCompositeOperation='source-over';const ng=ctx.createRadialGradient(x-nr*.3,y-nr*.3,0,x,y,nr*1.15);
  ng.addColorStop(0,'#d9c9ff');ng.addColorStop(.5,'rgba(183,155,255,.6)');ng.addColorStop(1,'rgba(120,90,200,.2)');ctx.fillStyle=ng;ctx.beginPath();ctx.arc(x,y,nr,0,6.3);ctx.fill();
  ctx.fillStyle='rgba(150,110,220,.8)';ctx.beginPath();ctx.arc(x+nr*.2,y-nr*.15,nr*.28,0,6.3);ctx.fill(); // nucleolus hint
  ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1.1;for(let i=0;i<3;i++){ctx.beginPath();for(let j=0;j<=18;j++){const a=j/18*6.28+t*.3+i*2;const rr=nr*(.3+.4*Math.abs(Math.sin(a*2+i)));ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.stroke();}}
function drawNucleoid(s,t){ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(180,220,255,.7)';ctx.lineWidth=2;
  ctx.beginPath();for(let j=0;j<=60;j++){const a=j/60*6.28*2;const rr=s*(0.4+0.5*Math.abs(Math.sin(a*1.5+t*.2)));ctx.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.7);}ctx.stroke();}
function drawMito(x,y,s,ang){ctx.globalCompositeOperation='lighter';glow(x,y,s*1.7,'#ffb26a','44');ell(x,y,s*1.5,s*.62,ang);ctx.fill();
  ctx.globalCompositeOperation='source-over';ell(x,y,s*1.5,s*.62,ang);ctx.fillStyle='rgba(210,120,50,.8)';ctx.fill();
  ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle='rgba(255,225,190,.85)';ctx.lineWidth=1.1;ctx.beginPath();for(let j=-3;j<=3;j++){const px=j*s*.34;ctx.moveTo(px,-s*.5);ctx.quadraticCurveTo(px+s*.18,0,px,s*.5);}ctx.stroke();ctx.restore();}
function drawChloro(x,y,s,ang){ctx.globalCompositeOperation='lighter';glow(x,y,s*1.8,'#7effc0','55');ell(x,y,s*1.25,s*.7,ang);ctx.fill();
  ctx.globalCompositeOperation='source-over';ell(x,y,s*1.25,s*.7,ang);ctx.fillStyle='rgba(40,150,90,.85)';ctx.fill();
  ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle='rgba(180,255,210,.9)';for(let g=-1;g<=1;g++)for(let d=0;d<3;d++)ctx.fillRect(g*s*.55-s*.16,-s*.34+d*s*.24,s*.32,s*.12);ctx.restore();}
function drawThylakoid(x,y,s,ang){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle='rgba(140,255,176,.8)';ctx.lineWidth=2;
  for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(-s,k*s*.35);ctx.bezierCurveTo(-s*.3,k*s*.35-s*.3,s*.3,k*s*.35+s*.3,s,k*s*.35);ctx.stroke();}ctx.restore();}
function drawContractile(x,y,s,t,p){const pu=0.7+0.3*Math.sin(t*2.2+p.ph);ell(x,y,s*pu,s*pu,0);ctx.fillStyle='rgba(120,235,255,.10)';ctx.fill();
  ctx.strokeStyle='rgba(150,240,255,.5)';ctx.lineWidth=1.6;ctx.stroke();ctx.strokeStyle='rgba(150,240,255,.25)';for(let k=0;k<6;k++){const a=k/6*6.28;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*s*pu,y+Math.sin(a)*s*pu);ctx.stroke();}}
function drawLyso(x,y,s){ctx.globalCompositeOperation='lighter';glow(x,y,s*1.8,'#ff7d92','55');ctx.beginPath();ctx.arc(x,y,s,0,6.3);ctx.fill();
  ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(255,125,146,.85)';ctx.beginPath();ctx.arc(x,y,s,0,6.3);ctx.fill();
  ctx.fillStyle='rgba(60,10,20,.5)';for(let k=0;k<4;k++){const a=rnd(0,6.28);ctx.beginPath();ctx.arc(x+Math.cos(a)*s*.4,y+Math.sin(a)*s*.4,s*.18,0,6.3);ctx.fill();}}
function drawER(x,y,s,ang){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle='rgba(199,176,255,.8)';ctx.lineWidth=2.4;
  ctx.beginPath();for(let j=0;j<=40;j++){const px=-s+2*s*(j/40);const py=Math.sin(j/40*10)*s*.4;j?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();
  ctx.fillStyle='rgba(230,220,255,.7)';for(let j=0;j<8;j++){const px=-s+2*s*(j/8);const py=Math.sin(j/8*10)*s*.4;ctx.beginPath();ctx.arc(px,py,1.4,0,6.3);ctx.fill();}ctx.restore();}
function drawGolgi(x,y,s,ang){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle='rgba(255,201,230,.85)';ctx.lineWidth=2;
  for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(-s*.8+Math.abs(k)*s*.12,k*s*.28);ctx.quadraticCurveTo(0,k*s*.28-s*.18,s*.8-Math.abs(k)*s*.12,k*s*.28);ctx.stroke();}
  ctx.fillStyle='rgba(255,180,220,.7)';ctx.beginPath();ctx.arc(s*.9,-s*.4,s*.14,0,6.3);ctx.fill();ctx.restore();}
function drawCentriole(x,y,s){ctx.save();ctx.translate(x,y);ctx.strokeStyle='rgba(200,220,255,.85)';ctx.lineWidth=1.5;
  for(let c=0;c<2;c++){ctx.save();ctx.rotate(c*Math.PI/2);ctx.strokeRect(-s*.5,-s*.22,s,s*.44);ctx.restore();}ctx.restore();}
function drawFlagellum(p,rad,asp,t){const a=p.ang;const bx=cx+Math.cos(a)*rad*asp,by=cy+Math.sin(a)*rad;
  ctx.save();ctx.strokeStyle='rgba(159,232,255,.7)';ctx.lineWidth=cl(rad*.02,2,4);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(bx,by);
  for(let j=1;j<=24;j++){const tt=j/24;const w=Math.sin(tt*10-t*6)*rad*.14*tt;ctx.lineTo(bx+Math.cos(a)*rad*.9*tt-Math.sin(a)*w,by+Math.sin(a)*rad*.9*tt+Math.cos(a)*w);}ctx.stroke();ctx.restore();
  p._x=bx+Math.cos(a)*rad*.5;p._y=by+Math.sin(a)*rad*.5;p._r=rad*.2;}
function drawCilia(rad,asp,wob,seed,t,p){ctx.save();ctx.strokeStyle='rgba(168,240,224,.5)';ctx.lineWidth=cl(rad*.012,1.5,3);ctx.lineCap='round';
  const n=42;for(let i=0;i<n;i++){const a=i/n*6.283;const beat=Math.sin(i*1.3+t*5)*.28;const w=1+wob*Math.sin(a*3+seed);const ex=cx+Math.cos(a)*rad*w*asp,ey=cy+Math.sin(a)*rad*w;ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex+Math.cos(a+beat)*rad*.09,ey+Math.sin(a+beat)*rad*.09);ctx.stroke();}ctx.restore();
  p._x=cx;p._y=cy-rad;p._r=rad*.3;}
function drawPili(rad,asp,t,p){ctx.save();ctx.strokeStyle='rgba(188,208,255,.45)';ctx.lineWidth=1.4;const n=16;
  for(let i=0;i<n;i++){const a=i/n*6.283;const ex=cx+Math.cos(a)*rad*asp,ey=cy+Math.sin(a)*rad;ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex+Math.cos(a)*rad*.14,ey+Math.sin(a)*rad*.14);ctx.stroke();}ctx.restore();
  p._x=cx+rad*asp*.7;p._y=cy-rad*.7;p._r=rad*.2;}
function drawSpike(p,rad,t){const a=p.ang;const bx=cx+Math.cos(a)*rad,by=cy+Math.sin(a)*rad;const ex=cx+Math.cos(a)*rad*1.28,ey=cy+Math.sin(a)*rad*1.28;
  ctx.save();ctx.strokeStyle='rgba(255,154,216,.85)';ctx.lineWidth=cl(rad*.03,2,5);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(ex,ey);ctx.stroke();
  ctx.fillStyle='#ff9ad8';ctx.beginPath();ctx.arc(ex,ey,cl(rad*.05,3,7),0,6.3);ctx.fill();ctx.restore(); p._x=ex;p._y=ey;p._r=rad*.12;}
function drawTail(p,rad,t){ctx.save();ctx.strokeStyle='rgba(255,154,216,.8)';ctx.lineWidth=cl(rad*.03,2,5);ctx.lineCap='round';
  const bx=cx,by=cy+rad; for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+k*rad*.4,by+rad*.6);ctx.stroke();}ctx.restore();p._x=cx;p._y=cy+rad*1.3;p._r=rad*.2;}

/* inspection rings for scanned parts */
function inspectRings(app,rad){
  if(!app.spec.inspected) return;
  ctx.save();
  for(const p of app.spec.parts){ if(!p._x) continue;
    const on=app.spec.inspected.has(p.id);
    const hov=app.hoverPart===p;
    if(on){ ctx.strokeStyle='rgba(94,242,214,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p._x,p._y,p._r+4,0,6.3);ctx.stroke(); }
    if(hov&&app.phase==='zoom'){
      ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(p._x,p._y,p._r+6,0,6.3);ctx.stroke();ctx.setLineDash([]);
      const pr=p._r+8+(Math.sin((app.time||0)/170)*3+3);
      ctx.strokeStyle='rgba(94,242,214,.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p._x,p._y,pr,0,6.3);ctx.stroke();
    }
  }
  ctx.restore();
}
function drawScan(app){ if(!app.scan||!app.scan.active) return; const p=cl((app.time-app.scan.start)/app.scan.dur,0,1);
  ctx.save();ctx.strokeStyle='rgba(94,242,214,.9)';ctx.lineWidth=2;ctx.shadowColor='rgba(94,242,214,.8)';ctx.shadowBlur=12;
  ctx.beginPath();ctx.arc(app.scan.x,app.scan.y,8+p*46,0,6.3);ctx.stroke();ctx.restore(); }
function envTint(S){ if(!S)return; const acid=cl((6-S.ph)/6,0,1),alk=cl((S.ph-8)/6,0,1),hot=cl((S.temp-55)/40,0,1),cold=cl((12-S.temp)/40,0,1);
  ctx.save();ctx.globalCompositeOperation='lighter';
  if(hot>0){const g=ctx.createRadialGradient(cx,cy,R,cx,cy,Math.max(W,H));g.addColorStop(0,'rgba(255,80,40,0)');g.addColorStop(1,`rgba(255,70,40,${hot*.14})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  if(cold>0){const g=ctx.createRadialGradient(cx,cy,R,cx,cy,Math.max(W,H));g.addColorStop(0,'rgba(80,150,255,0)');g.addColorStop(1,`rgba(80,150,255,${cold*.14})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  ctx.restore();ctx.save();ctx.globalCompositeOperation='overlay';
  if(acid>0){ctx.fillStyle=`rgba(255,190,90,${acid*.05})`;ctx.fillRect(0,0,W,H);}
  if(alk>0){ctx.fillStyle=`rgba(90,230,255,${alk*.05})`;ctx.fillRect(0,0,W,H);}ctx.restore(); }

/* hit-test a part at screen (px,py) */
XS.partAt=function(app,px,py){ let best=null,bd=1e9;
  for(const p of (app.spec?app.spec.parts:[])){ if(p._x==null)continue; const d=Math.hypot(px-p._x,py-p._y);
    if(d<Math.max(p._r+8,16)&&d<bd){bd=d;best=p;} } return best; };

/* ==================================================================
   MACRO WORLD — exoplanet + whole organism + zoomable region hotspots
================================================================== */
function skyBg(sc,t){
  const P=sc.planet, a=P.accent.join(','), gy=H*0.72, mn=Math.min(W,H);
  // deep sky gradient (space at top → planet sky → glow toward the horizon)
  const g=ctx.createLinearGradient(0,0,0,gy+H*0.05);
  g.addColorStop(0,P.sky[1]); g.addColorStop(0.5,P.sky[0]); g.addColorStop(1,P.sky[0]);
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // soft drifting nebulae
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const neb=(x,y,r,col,al)=>{ const ng=ctx.createRadialGradient(x,y,0,x,y,r); ng.addColorStop(0,`rgba(${col},${al})`); ng.addColorStop(1,`rgba(${col},0)`); ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(x,y,r,0,6.3); ctx.fill(); };
  neb(W*0.28+Math.sin(t*0.05)*20, H*0.32, mn*0.55, a, 0.055);
  neb(W*0.74, H*0.46+Math.cos(t*0.04)*16, mn*0.6, a, 0.04);
  ctx.restore();
  // stars — varied sizes, gentle twinkle
  ctx.save();
  for(let i=0;i<bokeh.length;i++){ const b=bokeh[i], x=(b.x*1.7)%W, y=(b.y*0.9)%(H*0.68), tw=0.45+0.55*Math.sin(t*1.4+i*1.3), s=(i%7===0)?1.9:1.0;
    ctx.fillStyle=`rgba(255,255,255,${(0.22+b.a*4)*tw})`; ctx.fillRect(x,y,s,s); }
  ctx.restore();
  // sun with corona
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const sx=W*0.8, sy=H*0.2, sr=mn*0.08;
  const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,sr*4.2);
  sg.addColorStop(0,P.sun); sg.addColorStop(0.16,P.sun+'aa'); sg.addColorStop(0.5,P.sun+'2e'); sg.addColorStop(1,P.sun+'00');
  ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sx,sy,sr*4.2,0,6.3); ctx.fill();
  ctx.globalAlpha=0.92; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx,sy,sr*0.5,0,6.3); ctx.fill(); ctx.globalAlpha=1;
  ctx.restore();
  // a crescent moon
  ctx.save(); const mx=W*0.17, my=H*0.19, mr=mn*0.055;
  ctx.fillStyle=`rgba(${a},0.10)`; ctx.beginPath(); ctx.arc(mx,my,mr,0,6.3); ctx.fill();
  ctx.fillStyle=P.sky[1]; ctx.beginPath(); ctx.arc(mx-mr*0.35,my-mr*0.3,mr*0.95,0,6.3); ctx.fill();
  ctx.restore();
  // horizon atmosphere
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const hz=ctx.createLinearGradient(0,gy-H*0.24,0,gy+H*0.04); hz.addColorStop(0,`rgba(${a},0)`); hz.addColorStop(1,`rgba(${a},0.18)`);
  ctx.fillStyle=hz; ctx.fillRect(0,gy-H*0.24,W,H*0.28); ctx.restore();
  // parallax terrain ridges (far → near)
  const ridge=(baseY,amp,fill,seed)=>{ ctx.fillStyle=fill; ctx.beginPath(); ctx.moveTo(0,baseY);
    for(let x=0;x<=W;x+=22){ ctx.lineTo(x, baseY - Math.abs(Math.sin(x*0.0055+seed))*amp - Math.sin(x*0.019+seed)*amp*0.28); }
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill(); };
  ridge(gy+H*0.02, H*0.11, `rgba(${a},0.07)`, 1.4);
  ridge(gy+H*0.05, H*0.08, 'rgba(8,11,17,0.6)', 3.1);
  // main ground
  const gg=ctx.createLinearGradient(0,gy+H*0.08,0,H); gg.addColorStop(0,P.ground); gg.addColorStop(1,'#05070c'); ctx.fillStyle=gg;
  ctx.beginPath(); ctx.moveTo(0,gy+H*0.08);
  for(let x=0;x<=W;x+=40){ ctx.lineTo(x, gy+H*0.08 + Math.sin(x*0.01+2)*10 + Math.sin(x*0.023)*6); }
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
  // vignette to focus the specimen
  ctx.save(); const vg=ctx.createRadialGradient(cx,cy,mn*0.34,cx,cy,Math.max(W,H)*0.72);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(2,4,8,0.5)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H); ctx.restore();
}
function drawWorld(app,t){
  const sc=app.sc; skyBg(sc,t);
  const ccx=cx, ccy=cy*0.98, S=Math.min(W,H)*0.30;
  app._creature={ccx,ccy,S};
  const sway=Math.sin(t*0.6+sc.sway)*0.03;
  const health = sc.objective==='preserve' ? sc.host/100 : 1-(sc.P/100);
  ctx.save(); ctx.translate(ccx,ccy); ctx.rotate(sway); ctx.translate(-ccx,-ccy);
  const plan=(XS.PLANS&&XS.PLANS[sc.A.plan])||XS.PLANS.beast;
  plan(ccx,ccy,S*(sc.A.size||1),t,sc,health);
  ctx.restore();
  // hotspots
  for(const r of sc.regions){
    const p=regionScreen(app,r); r._x=p.x; r._y=p.y;
    const key=r.id===sc.keyId && r.scanned;
    drawHotspot(app,r,p.x,p.y,t,key);
  }
}
function regionScreen(app,r){ const c=app._creature||{ccx:cx,ccy:cy,S:Math.min(W,H)*0.3};
  return {x:c.ccx + r.x*c.S*1.15, y:c.ccy + r.y*c.S*1.15}; }
XS.regionScreen=regionScreen;
function drawHotspot(app,r,x,y,t,key){
  const pulse=1+0.18*Math.sin(t*2.4+x*0.05);
  const hov=app.hoverRegion===r;
  const target=((r.id===app.sc.keyId)||r.decoy) && r.recon;   // key tissue (and any necrotic decoy) look like targets once analysed
  const col=target?'255,120,90':(r.recon?'94,242,214':(r.scanned?'150,200,220':'200,220,255'));
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.strokeStyle=`rgba(${col},${hov?0.95:0.6})`; ctx.lineWidth=hov?2.5:1.8;
  ctx.beginPath(); ctx.arc(x,y,14*pulse,0,6.3); ctx.stroke();
  ctx.strokeStyle=`rgba(${col},0.28)`; ctx.beginPath(); ctx.arc(x,y,22*pulse,0,6.3); ctx.stroke();
  ctx.fillStyle=`rgba(${col},0.9)`; ctx.beginPath(); ctx.arc(x,y,3,0,6.3); ctx.fill();
  ctx.restore();
  if(r.recon){ ctx.save(); ctx.fillStyle=target?'#ff9a6a':'#8effc0'; ctx.font='12px system-ui'; ctx.textAlign='center';
    ctx.fillText(target?'⚠':'✓', x, y-20); ctx.restore(); }
}
XS.regionAt=function(app,px,py){ if(!app.sc) return null; let best=null,bd=30;
  for(const r of app.sc.regions){ if(r._x==null)continue; const d=Math.hypot(px-r._x,py-r._y); if(d<bd){bd=d;best=r;} }
  return best; };

/* ---- creatures: a small toolkit for cohesive, planet-tinted aliens ---- */
function mix(a,b,f){return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];}
function rC(c,a){return `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;}
function auraGlow(x,y,r,col,a){ ctx.save(); ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(x,y,r*0.12,x,y,r);
  g.addColorStop(0,rC(col,a)); g.addColorStop(1,rC(col,0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,6.3); ctx.fill(); ctx.restore(); }
function softShadow(x,y,rx,ry){ ctx.save();
  const g=ctx.createRadialGradient(x,y,0,x,y,rx);
  g.addColorStop(0,'rgba(0,0,0,.34)'); g.addColorStop(0.7,'rgba(0,0,0,.16)'); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,6.3); ctx.fill(); ctx.restore(); }
/* smooth closed silhouette through control points (quadratic midpoints) */
function smoothClosed(pts){ const n=pts.length; ctx.beginPath();
  ctx.moveTo((pts[n-1][0]+pts[0][0])/2,(pts[n-1][1]+pts[0][1])/2);
  for(let i=0;i<n;i++){ const c=pts[i], nx=pts[(i+1)%n];
    ctx.quadraticCurveTo(c[0],c[1],(c[0]+nx[0])/2,(c[1]+nx[1])/2); } ctx.closePath(); }
/* two-tone flesh: lit crown -> creature colour -> planet-accent shadow */
function bodyGrad(lx,ly,r,col,acc,health){
  const lit=mix(col,[255,255,255],0.5), mid=mix(col,acc,0.34*(0.6+0.4*health)), deep=mix(mix(col,acc,0.5),[4,8,14],0.74);
  const g=ctx.createRadialGradient(lx,ly,r*0.05,lx,ly,r*1.28);
  g.addColorStop(0,rC(lit,0.95)); g.addColorStop(0.34,rC(col,0.96));
  g.addColorStop(0.72,rC(mid,0.96)); g.addColorStop(1,rC(deep,0.97)); return g; }
/* a tapered, curved, rooted limb (tentacle / stalk / root); returns the tip */
function limb(x0,y0,ang,len,w0,col,acc,t,ph){
  const seg=12, pts=[]; let x=x0,y=y0,a=ang;
  for(let i=0;i<=seg;i++){ const f=i/seg;
    a=ang+Math.sin(t*1.4+ph+f*2.6)*0.32*(0.4+f);
    x+=Math.cos(a)*(len/seg); y+=Math.sin(a)*(len/seg); pts.push([x,y]); }
  const L=[],Rr=[];
  for(let i=0;i<=seg;i++){ const f=i/seg, ww=w0*(1-0.86*f);
    const j=Math.min(i+1,seg), k=Math.max(i-1,0);
    const tx=pts[j][0]-pts[k][0], ty=pts[j][1]-pts[k][1], tl=Math.hypot(tx,ty)||1;
    const nx=-ty/tl, ny=tx/tl;
    L.push([pts[i][0]+nx*ww,pts[i][1]+ny*ww]); Rr.push([pts[i][0]-nx*ww,pts[i][1]-ny*ww]); }
  ctx.beginPath(); ctx.moveTo(L[0][0],L[0][1]);
  for(let i=1;i<=seg;i++)ctx.lineTo(L[i][0],L[i][1]);
  for(let i=seg;i>=0;i--)ctx.lineTo(Rr[i][0],Rr[i][1]); ctx.closePath();
  const g=ctx.createLinearGradient(x0,y0,pts[seg][0],pts[seg][1]);
  g.addColorStop(0,rC(col,0.96)); g.addColorStop(1,rC(mix(col,acc,0.6),0.85));
  ctx.fillStyle=g; ctx.fill();
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(acc,0.45);
  ctx.beginPath(); ctx.arc(pts[seg][0],pts[seg][1],w0*0.5+1.5,0,6.3); ctx.fill(); ctx.restore();
  return pts[seg]; }
/* drifting bioluminescent motes around a creature */
function floaters(cxp,cyp,S,t,acc){ ctx.save(); ctx.globalCompositeOperation='lighter';
  for(let i=0;i<11;i++){ const a=i*2.1+t*0.25; const rr=S*(0.75+0.5*((i*0.27)%1));
    const x=cxp+Math.cos(a)*rr, y=cyp+Math.sin(a*0.8+i)*rr*0.55;
    ctx.fillStyle=rC(acc,0.32*(0.4+0.6*Math.sin(t*1.3+i))); ctx.beginPath(); ctx.arc(x,y,1.6,0,6.3); ctx.fill(); }
  ctx.restore(); }
/* shared bits used by several plans */
function fillGlow(pts,fillStyle,gcol,lw){ smoothClosed(pts); ctx.fillStyle=fillStyle; ctx.fill();
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth=lw||2; ctx.strokeStyle=rC(gcol,0.42);
  ctx.shadowColor=rC(gcol,0.5); ctx.shadowBlur=14; smoothClosed(pts); ctx.stroke(); ctx.restore(); }
function orb(x,y,r,col,acc,health){ ctx.beginPath(); ctx.arc(x,y,r,0,6.3);
  ctx.fillStyle=bodyGrad(x-r*0.3,y-r*0.36,r,col,acc,health); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth=1.6; ctx.strokeStyle=rC(mix(col,acc,0.5),0.4);
  ctx.shadowColor=rC(mix(col,acc,0.5),0.5); ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(x,y,r,0,6.3); ctx.stroke(); ctx.restore(); }
function ribbon(pts,wfn,fillStyle,gcol){ const L=[],Rr=[];
  for(let i=0;i<pts.length;i++){ const p=pts[i], j=Math.min(i+1,pts.length-1), k=Math.max(i-1,0);
    const tx=pts[j][0]-pts[k][0], ty=pts[j][1]-pts[k][1], tl=Math.hypot(tx,ty)||1, nx=-ty/tl, ny=tx/tl, ww=wfn(p[2]);
    L.push([p[0]+nx*ww,p[1]+ny*ww]); Rr.push([p[0]-nx*ww,p[1]-ny*ww]); }
  ctx.beginPath(); ctx.moveTo(L[0][0],L[0][1]);
  for(let i=1;i<L.length;i++)ctx.lineTo(L[i][0],L[i][1]);
  for(let i=Rr.length-1;i>=0;i--)ctx.lineTo(Rr[i][0],Rr[i][1]); ctx.closePath();
  ctx.fillStyle=fillStyle; ctx.fill();
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth=1.8; ctx.strokeStyle=rC(gcol,0.4);
  ctx.shadowColor=rC(gcol,0.5); ctx.shadowBlur=12; ctx.stroke(); ctx.restore(); }
function eyeAt(ex,ey,r,gcol){ ctx.save(); ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=rC(gcol,0.9); ctx.shadowColor=rC(gcol,0.9); ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(ex,ey,r,0,6.3); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(ex-r*0.2,ey-r*0.22,r*0.42,0,6.3); ctx.fill(); ctx.restore(); }
function frond(x,y,side,len,t,i,col,acc,gcol){
  const droop=Math.sin(t*0.9+i)*len*0.06, tipx=x+side*len, tipy=y-len*0.42+droop, midx=x+side*len*0.5, midy=y-len*0.34;
  ctx.save(); ctx.beginPath(); ctx.moveTo(x,y);
  ctx.quadraticCurveTo(midx,midy-len*0.24,tipx,tipy); ctx.quadraticCurveTo(midx,midy+len*0.14,x,y+len*0.06); ctx.closePath();
  const g=ctx.createLinearGradient(x,y,tipx,tipy);
  g.addColorStop(0,rC(mix(col,[6,10,10],0.35),0.92)); g.addColorStop(1,rC(mix(col,acc,0.5),0.7)); ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle=rC(gcol,0.5); ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(midx,midy,tipx,tipy); ctx.stroke();
  ctx.strokeStyle=rC(acc,0.32); ctx.lineWidth=1;
  for(let k=1;k<=3;k++){ const f=k/4, bx=x+(tipx-x)*f, by=y+(midy-y)*f; ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx,by-len*0.14); ctx.stroke(); }
  ctx.restore(); }
function nucleusGlow(x,y,r,acc){ ctx.save(); ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,rC(mix(acc,[255,255,255],0.4),0.55)); g.addColorStop(0.5,rC(acc,0.3)); g.addColorStop(1,rC(acc,0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,6.3); ctx.fill(); ctx.restore(); }
/* per-individual skin pattern, drawn inside a clipped body */
function paintPattern(sc,x,y,S,col,acc){ const m=sc.morph; if(!m||m.pattern==='none')return; ctx.save();
  if(m.pattern==='spots'){ ctx.fillStyle=rC(mix(acc,[255,255,255],0.25),0.14);
    for(let i=0;i<20;i++){ const a=i*2.399+m.seed, rr=S*0.72*Math.sqrt((i+1)/20); ctx.beginPath(); ctx.arc(x+Math.cos(a)*rr,y+Math.sin(a)*rr,S*0.05,0,6.3); ctx.fill(); } }
  else if(m.pattern==='stripes'){ ctx.strokeStyle=rC(mix(col,[0,0,0],0.5),0.16); ctx.lineWidth=S*0.05;
    for(let i=-7;i<=7;i++){ ctx.beginPath(); ctx.moveTo(x+i*S*0.13,y-S); ctx.lineTo(x+i*S*0.13+S*0.22,y+S); ctx.stroke(); } }
  else { ctx.strokeStyle=rC(mix(col,[0,0,0],0.5),0.15); ctx.lineWidth=S*0.06;
    for(let i=-5;i<=5;i++){ ctx.beginPath(); ctx.moveTo(x-S,y+i*S*0.18); ctx.quadraticCurveTo(x,y+i*S*0.18+S*0.05,x+S,y+i*S*0.18); ctx.stroke(); } }
  ctx.restore(); }

/* ================= BODY-PLAN RENDERERS ================= */
XS.PLANS={
  /* --- Animalia --- */
  beast(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const breath=1+0.015*Math.sin(t*1.3), nleg=F.legs||4;
    softShadow(ccx,ccy+S*0.82,S*0.95,S*0.15); auraGlow(ccx,ccy-S*0.05,S*1.6,gcol,0.09+0.10*health);
    for(let i=0;i<nleg;i++){ const f=nleg>1?i/(nleg-1):0.5, bx=-0.34+f*0.74;
      limb(ccx+bx*S,ccy+(0.12+0.12*Math.sin(f*3.14))*S, 2.6-f*1.5, S*(0.56+0.08*(i%2)),S*0.10,mix(col,[8,10,16],0.45),acc,t,i*1.9); }
    const u=(px,py)=>[ccx+px*S*breath, ccy+py*S*breath+Math.sin(t*1.1+px*3)*S*0.008];
    const body=[u(-0.92,0.04),u(-0.72,-0.20),u(-0.44,-0.36),u(-0.10,-0.45),u(0.24,-0.46),u(0.50,-0.40),u(0.72,-0.42),u(0.90,-0.33),
      u(0.99,-0.16),u(0.93,-0.02),u(0.74,-0.02),u(0.54,0.05),u(0.30,0.22),u(0.02,0.30),u(-0.28,0.28),u(-0.58,0.20),u(-0.82,0.12)];
    fillGlow(body,bodyGrad(ccx-S*0.15,ccy-S*0.22,S*1.2,col,acc,health),gcol,2.2);
    ctx.save(); smoothClosed(body); ctx.clip(); paintPattern(sc,ccx,ccy,S,col,acc); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<7;i++){ const f=i/6, p=u(-0.68+f*1.5,-0.30-Math.sin(f*3.14)*0.12), pu=0.55+0.45*Math.sin(t*2+i);
      ctx.fillStyle=rC(acc,0.5*pu); ctx.beginPath(); ctx.arc(p[0],p[1],S*0.035,0,6.3); ctx.fill();
      ctx.fillStyle=rC(mix(acc,[255,255,255],0.5),0.85*pu); ctx.beginPath(); ctx.arc(p[0],p[1],S*0.014,0,6.3); ctx.fill(); }
    ctx.restore();
    const e1=u(0.80,-0.24), e2=u(0.87,-0.10); eyeAt(e1[0],e1[1],S*0.055,gcol); eyeAt(e2[0],e2[1],S*0.04,gcol);
    floaters(ccx,ccy-S*0.1,S,t,acc); },

  medusa(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const pulse=1+0.06*Math.sin(t*2.0), by=ccy-S*0.28, bw=S*0.62*pulse, bh=S*0.5*pulse, n=F.arms||7;
    softShadow(ccx,ccy+S*0.7,S*0.7,S*0.1);
    // trailing tentacles behind
    for(let i=0;i<n;i++){ const f=n>1?i/(n-1):0.5, x=ccx+(f-0.5)*bw*1.4;
      limb(x, by+bh*0.7, Math.PI*0.5+(f-0.5)*0.5, S*(0.7+0.25*Math.sin(i)), S*0.035, mix(col,[10,10,20],0.35),acc,t,i*1.5); }
    auraGlow(ccx,by,S*1.3,gcol,0.12+0.10*health);
    // bell (dome)
    const bell=[]; for(let a=Math.PI; a<=2*Math.PI+0.001; a+=Math.PI/12) bell.push([ccx+Math.cos(a)*bw, by+Math.sin(a)*bh]);
    bell.push([ccx+bw*0.86,by+bh*0.35]); bell.push([ccx,by+bh*0.5]); bell.push([ccx-bw*0.86,by+bh*0.35]);
    fillGlow(bell,bodyGrad(ccx-S*0.1,by-S*0.28,S*0.9,col,acc,health),gcol,2);
    ctx.save(); smoothClosed(bell); ctx.clip(); paintPattern(sc,ccx,by,S*0.8,col,acc); ctx.globalCompositeOperation='lighter';
    nucleusGlow(ccx,by-bh*0.1,bw*0.7,acc);
    ctx.strokeStyle=rC(mix(acc,[255,255,255],0.4),0.4); ctx.lineWidth=1.4;
    for(let i=0;i<5;i++){ const a=Math.PI+ (i+1)/6*Math.PI; ctx.beginPath(); ctx.moveTo(ccx,by-bh*0.1);
      ctx.lineTo(ccx+Math.cos(a)*bw*0.95,by+Math.sin(a)*bh*0.95); ctx.stroke(); }
    ctx.restore();
    // oral arms
    for(let i=-1;i<=1;i++) limb(ccx+i*S*0.12,by+bh*0.45,Math.PI*0.5+i*0.2,S*0.5,S*0.05,mix(col,acc,0.4),acc,t,i*2+5);
    floaters(ccx,by,S,t,acc); },

  arthropod(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const segs=F.segs||5, legs=F.legs||4;
    softShadow(ccx,ccy+S*0.5,S*0.95,S*0.13); auraGlow(ccx,ccy,S*1.4,gcol,0.07+0.08*health);
    const cl0=f=>[ccx+(-0.8+1.6*f)*S, ccy+Math.sin(f*3.14)*S*0.12-S*0.05]; // gentle arch, head at right
    // jointed legs from each segment
    for(let s=1;s<segs;s++){ const c=cl0(s/segs); for(const side of [-1,1]){
      const kx=c[0]+side*S*0.06, ky=c[1]+S*0.12; const foot=[kx+side*S*0.16, ky+S*0.34+Math.sin(t*3+s)*S*0.03];
      ctx.save(); ctx.strokeStyle=rC(mix(col,[10,10,16],0.4),0.9); ctx.lineWidth=S*0.05; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(kx,ky); ctx.lineTo(kx+side*S*0.14,ky+S*0.16); ctx.lineTo(foot[0],foot[1]); ctx.stroke(); ctx.restore(); } }
    // carapace: overlapping plates
    for(let s=0;s<segs;s++){ const f=(s+0.5)/segs, c=cl0(f), rw=S*(0.26-0.14*f), rh=S*(0.22-0.05*f);
      ctx.beginPath(); ctx.ellipse(c[0],c[1],rw,rh,0,0,6.3);
      ctx.fillStyle=bodyGrad(c[0]-rw*0.3,c[1]-rh*0.5,rw*1.4,col,acc,health); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=rC(gcol,0.4); ctx.lineWidth=1.6; ctx.stroke(); ctx.restore(); }
    // head + antennae + eyes
    const h=cl0(0.94);
    ctx.save(); ctx.strokeStyle=rC(acc,0.6); ctx.lineWidth=S*0.02; ctx.lineCap='round';
    for(const side of [-1,1]){ ctx.beginPath(); ctx.moveTo(h[0],h[1]-S*0.06);
      ctx.quadraticCurveTo(h[0]+side*S*0.2,h[1]-S*0.3,h[0]+side*S*0.34,h[1]-S*0.42+Math.sin(t*2+side)*S*0.03); ctx.stroke(); } ctx.restore();
    eyeAt(h[0]+S*0.06,h[1]-S*0.04,S*0.045,gcol); eyeAt(h[0]-S*0.02,h[1]-S*0.05,S*0.035,gcol);
    floaters(ccx,ccy,S,t,acc); },

  tentacled(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const n=F.arms||6, my=ccy-S*0.34;
    softShadow(ccx,ccy+S*0.7,S*0.7,S*0.1); auraGlow(ccx,my,S*1.4,gcol,0.09+0.10*health);
    // curling arms hanging from the mantle
    for(let i=0;i<n;i++){ const f=n>1?i/(n-1):0.5, x=ccx+(f-0.5)*S*0.7;
      limb(x,my+S*0.28, Math.PI*0.5+(f-0.5)*0.9, S*(0.75+0.2*Math.sin(i*1.7)), S*0.06, mix(col,[10,8,16],0.4),acc,t,i*1.3); }
    // mantle / head bulb
    const mant=[[ccx-S*0.42,my+S*0.28],[ccx-S*0.5,my-S*0.05],[ccx-S*0.34,my-S*0.42],[ccx,my-S*0.56],
      [ccx+S*0.34,my-S*0.42],[ccx+S*0.5,my-S*0.05],[ccx+S*0.42,my+S*0.28],[ccx,my+S*0.4]];
    fillGlow(mant,bodyGrad(ccx-S*0.12,my-S*0.3,S*0.8,col,acc,health),gcol,2);
    ctx.save(); smoothClosed(mant); ctx.clip(); paintPattern(sc,ccx,my,S*0.7,col,acc); nucleusGlow(ccx,my-S*0.1,S*0.5,acc); ctx.restore();
    eyeAt(ccx-S*0.18,my-S*0.02,S*0.075,gcol); eyeAt(ccx+S*0.18,my-S*0.02,S*0.075,gcol);
    floaters(ccx,my,S,t,acc); },

  worm(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const segs=F.segs||9; softShadow(ccx,ccy+S*0.5,S*0.95,S*0.12); auraGlow(ccx,ccy,S*1.4,gcol,0.07+0.08*health);
    const pts=[]; const N=44;
    for(let i=0;i<=N;i++){ const f=i/N, x=ccx+(-0.86+1.72*f)*S, y=ccy+Math.sin(f*6.0+t*0.9)*S*0.30-S*0.02; pts.push([x,y,f]); }
    ribbon(pts,f=>S*0.15*(1-0.55*f), bodyGrad(ccx,ccy-S*0.2,S*1.1,col,acc,health), gcol);
    // segmentation rings
    ctx.save(); ctx.strokeStyle=rC(mix(col,[8,8,14],0.5),0.5); ctx.lineWidth=1.4;
    for(let s=1;s<segs;s++){ const f=s/segs, i=Math.round(f*N), p=pts[i], j=Math.min(i+1,N), tx=pts[j][0]-p[0], ty=pts[j][1]-p[1], tl=Math.hypot(tx,ty)||1;
      const nx=-ty/tl*S*0.15*(1-0.55*f), ny=tx/tl*S*0.15*(1-0.55*f);
      ctx.beginPath(); ctx.moveTo(p[0]+nx,p[1]+ny); ctx.lineTo(p[0]-nx,p[1]-ny); ctx.stroke(); } ctx.restore();
    // head mouth (left end)
    const h=pts[0]; ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=rC(acc,0.7); ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(h[0],h[1],S*0.11,0,6.3); ctx.stroke(); ctx.restore();
    eyeAt(h[0]+S*0.03,h[1]-S*0.05,S*0.03,gcol); floaters(ccx,ccy,S,t,acc); },

  /* --- Protista --- */
  amoeba(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const n=F.lobes||5; softShadow(ccx,ccy+S*0.5,S*0.8,S*0.12); auraGlow(ccx,ccy,S*1.5,gcol,0.09+0.09*health);
    const pts=[]; const M=n*4;
    for(let i=0;i<M;i++){ const a=i/M*6.283, lobe=1+0.42*Math.sin(a*n+t*0.8)+0.12*Math.sin(a*2-t);
      pts.push([ccx+Math.cos(a)*S*0.6*lobe, ccy+Math.sin(a)*S*0.52*lobe]); }
    fillGlow(pts,bodyGrad(ccx-S*0.1,ccy-S*0.12,S*0.9,col,acc,health),gcol,2);
    ctx.save(); smoothClosed(pts); ctx.clip(); paintPattern(sc,ccx,ccy,S*0.6,col,acc); ctx.globalCompositeOperation='lighter';
    nucleusGlow(ccx+S*0.08,ccy+S*0.02,S*0.34,acc);
    ctx.fillStyle=rC(mix(acc,[255,255,255],0.3),0.5);
    for(let i=0;i<6;i++){ const a=i*1.6+t*0.4; ctx.beginPath(); ctx.arc(ccx+Math.cos(a)*S*0.3,ccy+Math.sin(a)*S*0.25,S*0.05,0,6.3); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.fillStyle=rC(mix(col,[255,255,255],0.5),0.85); ctx.beginPath(); ctx.arc(ccx+S*0.1,ccy,S*0.05,0,6.3); ctx.fill(); ctx.restore();
    floaters(ccx,ccy,S,t,acc); },

  ciliate(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5);
    softShadow(ccx,ccy+S*0.5,S*0.7,S*0.11); auraGlow(ccx,ccy,S*1.4,gcol,0.08+0.08*health);
    const rot=0.35; const pts=[]; for(let a=0;a<6.283;a+=6.283/28){ const r=1+0.06*Math.sin(a*3);
      let x=Math.cos(a)*S*0.62*r, y=Math.sin(a)*S*0.4*r; const rx=x*Math.cos(rot)-y*Math.sin(rot), ry=x*Math.sin(rot)+y*Math.cos(rot);
      pts.push([ccx+rx,ccy+ry]); }
    // cilia fringe
    ctx.save(); ctx.strokeStyle=rC(mix(acc,[255,255,255],0.3),0.5); ctx.lineWidth=1.4; ctx.lineCap='round';
    for(let k=0;k<pts.length;k++){ const p=pts[k], q=pts[(k+1)%pts.length], mx=(p[0]+q[0])/2, my=(p[1]+q[1])/2;
      const ox=mx-ccx, oy=my-ccy, ol=Math.hypot(ox,oy)||1, beat=Math.sin(k*0.8+t*6)*0.3;
      ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(mx+ox/ol*S*0.1+(-oy/ol)*S*0.05*beat, my+oy/ol*S*0.1+(ox/ol)*S*0.05*beat); ctx.stroke(); } ctx.restore();
    fillGlow(pts,bodyGrad(ccx-S*0.12,ccy-S*0.14,S*0.8,col,acc,health),gcol,2);
    ctx.save(); smoothClosed(pts); ctx.clip();
    // oral groove
    ctx.strokeStyle=rC(mix(col,[8,10,16],0.5),0.6); ctx.lineWidth=S*0.05;
    ctx.beginPath(); ctx.moveTo(ccx-S*0.35,ccy-S*0.16); ctx.quadraticCurveTo(ccx,ccy+S*0.02,ccx+S*0.05,ccy-S*0.02); ctx.stroke();
    nucleusGlow(ccx+S*0.14,ccy+S*0.06,S*0.24,acc);
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(mix(acc,[255,255,255],0.4),0.6*(0.6+0.4*Math.sin(t*2)));
    ctx.beginPath(); ctx.arc(ccx-S*0.2,ccy+S*0.1,S*0.06,0,6.3); ctx.fill();
    ctx.restore(); floaters(ccx,ccy,S,t,acc); },

  diatom(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    softShadow(ccx,ccy+S*0.5,S*0.6,S*0.1); auraGlow(ccx,ccy,S*1.3,mix(gcol,[255,255,255],0.3),0.1+0.08*health);
    const centric=(F.shape||'centric')==='centric', k=centric?10:2, pts=[];
    for(let i=0;i<(centric?k:24);i++){ if(centric){ const a=i/k*6.283-Math.PI/2; pts.push([ccx+Math.cos(a)*S*0.56,ccy+Math.sin(a)*S*0.56]); }
      else { const a=i/24*6.283; pts.push([ccx+Math.cos(a)*S*0.72,ccy+Math.sin(a)*S*0.30]); } }
    // glassy translucent shell
    smoothClosed(pts); const g=ctx.createRadialGradient(ccx-S*0.2,ccy-S*0.2,0,ccx,ccy,S*0.7);
    g.addColorStop(0,rC(mix(col,[255,255,255],0.5),0.5)); g.addColorStop(0.7,rC(col,0.32)); g.addColorStop(1,rC(mix(col,acc,0.5),0.4));
    ctx.fillStyle=g; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth=2; ctx.strokeStyle=rC(mix(acc,[255,255,255],0.4),0.55); ctx.shadowColor=rC(acc,0.5); ctx.shadowBlur=12; smoothClosed(pts); ctx.stroke(); ctx.restore();
    // fine silica striae
    ctx.save(); smoothClosed(pts); ctx.clip(); ctx.strokeStyle=rC(mix(acc,[255,255,255],0.5),0.28); ctx.lineWidth=1;
    if(centric){ for(let r=0.14;r<0.56;r+=0.1){ ctx.beginPath(); ctx.arc(ccx,ccy,S*r,0,6.3); ctx.stroke(); }
      for(let a=0;a<6.283;a+=6.283/k){ ctx.beginPath(); ctx.moveTo(ccx,ccy); ctx.lineTo(ccx+Math.cos(a)*S*0.56,ccy+Math.sin(a)*S*0.56); ctx.stroke(); } }
    else { for(let x=-0.66;x<=0.66;x+=0.09){ ctx.beginPath(); ctx.moveTo(ccx+x*S,ccy-S*0.28); ctx.lineTo(ccx+x*S,ccy+S*0.28); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(ccx-S*0.72,ccy); ctx.lineTo(ccx+S*0.72,ccy); ctx.stroke(); }
    ctx.restore(); floaters(ccx,ccy,S,t,acc); },

  radiolarian(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const spikes=F.spikes==null?14:F.spikes, r=S*0.44; softShadow(ccx,ccy+S*0.5,S*0.55,S*0.1); auraGlow(ccx,ccy,S*1.4,gcol,0.1+0.08*health);
    // radiating spines
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=rC(mix(acc,[255,255,255],0.3),0.5); ctx.lineWidth=1.6; ctx.lineCap='round';
    for(let i=0;i<spikes;i++){ const a=i/spikes*6.283+t*0.05; ctx.beginPath(); ctx.moveTo(ccx+Math.cos(a)*r*0.9,ccy+Math.sin(a)*r*0.9);
      ctx.lineTo(ccx+Math.cos(a)*r*1.7,ccy+Math.sin(a)*r*1.7); ctx.stroke(); } ctx.restore();
    orb(ccx,ccy,r,col,acc,health);
    // inner lattice / cells
    ctx.save(); ctx.beginPath(); ctx.arc(ccx,ccy,r,0,6.3); ctx.clip(); ctx.globalCompositeOperation='lighter';
    nucleusGlow(ccx,ccy,r*0.8,acc);
    if(F.cells){ ctx.fillStyle=rC(mix(acc,[255,255,255],0.4),0.7);
      for(let i=0;i<12;i++){ const a=i/12*6.283, rr=r*0.82; ctx.beginPath(); ctx.arc(ccx+Math.cos(a)*rr,ccy+Math.sin(a)*rr,S*0.04,0,6.3); ctx.fill(); } }
    else { ctx.strokeStyle=rC(mix(acc,[255,255,255],0.4),0.35); ctx.lineWidth=1;
      for(let rr=0.3;rr<1;rr+=0.3){ ctx.beginPath(); ctx.arc(ccx,ccy,r*rr,0,6.3); ctx.stroke(); }
      for(let a=0;a<6.283;a+=6.283/8){ ctx.beginPath(); ctx.moveTo(ccx,ccy); ctx.lineTo(ccx+Math.cos(a)*r,ccy+Math.sin(a)*r); ctx.stroke(); } }
    ctx.restore(); floaters(ccx,ccy,S,t,acc); },

  /* --- Plantae --- */
  tree(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const gy=ccy+S*0.92, sway=Math.sin(t*0.7)*0.06, nf=F.fronds||5;
    softShadow(ccx,gy,S*0.72,S*0.12); auraGlow(ccx,ccy-S*0.35,S*1.4,gcol,0.08+0.08*health);
    for(let i=-2;i<=2;i++){ if(i===0)continue; limb(ccx+i*S*0.03,gy-S*0.02,Math.PI*0.5+i*0.42,S*0.42,S*0.05,mix(col,[8,12,10],0.5),acc,t,i*3); }
    const apex=[ccx+Math.sin(sway)*S*0.5, ccy-S*0.62], cline=f=>[ccx+(apex[0]-ccx)*(f*f), gy+(apex[1]-gy)*f];
    const left=[],right=[]; for(let i=0;i<=10;i++){ const f=i/10, c0=cline(f), w=S*(0.16*(1-f)+0.028); left.push([c0[0]-w,c0[1]]); right.push([c0[0]+w,c0[1]]); }
    ctx.beginPath(); ctx.moveTo(left[0][0],left[0][1]); for(const p of left)ctx.lineTo(p[0],p[1]);
    for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i][0],right[i][1]); ctx.closePath();
    ctx.fillStyle=bodyGrad(ccx-S*0.1,ccy,S*0.9,col,acc,health); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth=1.6; ctx.strokeStyle=rC(gcol,0.4); ctx.shadowColor=rC(gcol,0.5); ctx.shadowBlur=12; ctx.stroke(); ctx.restore();
    for(let i=0;i<nf;i++){ const f=0.30+i*(0.62/nf), n=cline(f), side=i%2?1:-1; frond(n[0],n[1],side,S*(0.5-0.04*i),t,i,col,acc,gcol); }
    const a0=cline(1); auraGlow(a0[0],a0[1]-S*0.06,S*0.5,gcol,0.45+0.4*health);
    fillGlow([[a0[0]-S*0.14,a0[1]],[a0[0]-S*0.1,a0[1]-S*0.22],[a0[0],a0[1]-S*0.32],[a0[0]+S*0.1,a0[1]-S*0.22],[a0[0]+S*0.14,a0[1]],[a0[0],a0[1]+S*0.07]],
      bodyGrad(a0[0]-S*0.05,a0[1]-S*0.2,S*0.36,mix(col,acc,0.3),acc,health),gcol,1.6);
    floaters(ccx,ccy-S*0.2,S,t,acc); },

  fern(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const gy=ccy+S*0.7, n=F.fronds||6; softShadow(ccx,gy,S*0.7,S*0.12); auraGlow(ccx,ccy,S*1.3,gcol,0.07+0.08*health);
    // arcing fronds from a central crown
    for(let i=0;i<n;i++){ const f=n>1?i/(n-1):0.5, ang=-Math.PI*0.5 + (f-0.5)*Math.PI*1.05, sway=Math.sin(t*0.8+i)*0.06;
      const len=S*(0.85-0.15*Math.abs(f-0.5)); const dir=Math.cos(ang+sway), diry=Math.sin(ang+sway);
      const pts=[]; for(let k=0;k<=10;k++){ const g=k/10; pts.push([ccx+dir*len*g + (-diry)*Math.sin(g*3.14)*S*0.05, gy+diry*len*g, g]); }
      ribbon(pts,g=>S*0.05*(1-0.7*g)+S*0.006, bodyGrad(ccx,ccy-S*0.2,S*0.8,col,acc,health), gcol);
      // pinnae
      ctx.save(); ctx.strokeStyle=rC(mix(col,acc,0.5),0.55); ctx.lineWidth=1.2;
      for(let k=2;k<10;k+=1){ const p=pts[k], nrm=k<10?[-(pts[k+1][1]-p[1]),(pts[k+1][0]-p[0])]:[0,0], nl=Math.hypot(nrm[0],nrm[1])||1;
        for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(p[0]+s*nrm[0]/nl*S*0.09, p[1]+s*nrm[1]/nl*S*0.09); ctx.stroke(); } } ctx.restore(); }
    // crown
    orb(ccx,gy-S*0.02,S*0.12,mix(col,acc,0.3),acc,health);
    floaters(ccx,ccy,S,t,acc); },

  vine(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5);
    const gy=ccy+S*0.6; softShadow(ccx,gy+S*0.1,S*0.9,S*0.12); auraGlow(ccx,ccy,S*1.4,gcol,0.07+0.07*health);
    // several coiling tendrils spreading from a base
    const shoots=[[-0.7,-0.2],[-0.2,-0.55],[0.25,-0.4],[0.7,-0.1]];
    for(let s=0;s<shoots.length;s++){ const tx=shoots[s][0], ty=shoots[s][1], pts=[];
      for(let k=0;k<=16;k++){ const g=k/16; const x=ccx+ (tx*g)*S + Math.sin(g*7+s+t*0.6)*S*0.08;
        const y=gy + (ty*g)*S - Math.sin(g*3.14)*S*0.12; pts.push([x,y,g]); }
      ribbon(pts,g=>S*0.045*(1-0.6*g)+S*0.006, bodyGrad(ccx,ccy,S*0.8,col,acc,health), gcol);
      for(let k=3;k<16;k+=3){ const p=pts[k], side=k%2?1:-1; // leaves
        ctx.save(); ctx.beginPath(); ctx.moveTo(p[0],p[1]);
        ctx.quadraticCurveTo(p[0]+side*S*0.12,p[1]-S*0.12,p[0]+side*S*0.18,p[1]);
        ctx.quadraticCurveTo(p[0]+side*S*0.1,p[1]+S*0.06,p[0],p[1]); ctx.closePath();
        ctx.fillStyle=rC(mix(col,acc,0.35),0.8); ctx.fill(); ctx.strokeStyle=rC(gcol,0.4); ctx.lineWidth=1; ctx.stroke(); ctx.restore(); }
      // curl tip
      const tip=pts[16]; ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=rC(acc,0.6); ctx.lineWidth=S*0.03;
      ctx.beginPath(); ctx.arc(tip[0],tip[1],S*0.05,0,4.5); ctx.stroke(); ctx.restore(); }
    orb(ccx,gy,S*0.13,mix(col,acc,0.3),acc,health);
    floaters(ccx,ccy,S,t,acc); },

  bulb(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const n=F.lobes||5, gy=ccy+S*0.5; softShadow(ccx,gy+S*0.12,S*0.7,S*0.12);
    for(let i=-1;i<=1;i++) limb(ccx+i*S*0.06,gy+S*0.1,Math.PI*0.5+i*0.4,S*0.28,S*0.04,mix(col,[8,12,10],0.5),acc,t,i*3);
    auraGlow(ccx,ccy,S*1.3,gcol,0.08+0.08*health);
    // cluster of plump lobes
    for(let i=0;i<n;i++){ const a=-Math.PI*0.5 + (i-(n-1)/2)*0.5, R=S*0.28, x=ccx+Math.cos(a)*R, y=gy+Math.sin(a)*R-S*0.05;
      const w=S*(0.2-0.02*Math.abs(i-(n-1)/2)); orb(x,y,w,col,acc,health);
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(mix(col,[255,255,255],0.6),0.4); ctx.beginPath(); ctx.arc(x-w*0.3,y-w*0.35,w*0.3,0,6.3); ctx.fill(); ctx.restore(); }
    // little bloom
    const bx=ccx, byy=gy-S*0.32; auraGlow(bx,byy,S*0.24,gcol,0.5+0.3*health);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(mix(acc,[255,255,255],0.4),0.8);
    for(let i=0;i<6;i++){ const a=i/6*6.283+t*0.4; ctx.beginPath(); ctx.ellipse(bx+Math.cos(a)*S*0.09,byy+Math.sin(a)*S*0.09,S*0.05,S*0.02,a,0,6.3); ctx.fill(); } ctx.restore();
    floaters(ccx,ccy,S,t,acc); },

  reed(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const n=F.blades||5, gy=ccy+S*0.72; softShadow(ccx,gy,S*0.5,S*0.1); auraGlow(ccx,ccy,S*1.2,gcol,0.06+0.07*health);
    for(let i=0;i<n;i++){ const f=n>1?i/(n-1):0.5, lean=(f-0.5)*0.7, sway=Math.sin(t*0.9+i)*0.05;
      const len=S*(1.0-0.12*Math.abs(f-0.5)), pts=[];
      for(let k=0;k<=12;k++){ const g=k/12; const x=ccx + (lean+sway)*g*S*0.5 + (f-0.5)*S*0.18; const y=gy-len*g; pts.push([x,y,g]); }
      ribbon(pts,g=>S*0.035*(1-0.85*g)+S*0.004, bodyGrad(ccx,ccy,S*0.7,col,acc,health), gcol);
      if(i===Math.floor(n/2)){ const tip=pts[12]; // seed head on the tallest
        ctx.save(); ctx.fillStyle=rC(mix(col,acc,0.4),0.85);
        for(let k=0;k<7;k++){ ctx.beginPath(); ctx.ellipse(tip[0]+Math.sin(k)*S*0.02,tip[1]+k*S*0.03,S*0.03,S*0.012,0.3,0,6.3); ctx.fill(); } ctx.restore(); } }
    floaters(ccx,ccy-S*0.2,S,t,acc); },

  /* --- Fungi --- */
  mushroom(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5);
    const gy=ccy+S*0.86, breath=1+0.02*Math.sin(t*1.1), capY=ccy-S*0.42*breath;
    softShadow(ccx,gy,S*0.82,S*0.14);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth=1.4;
    for(let i=0;i<12;i++){ const a=Math.PI*(0.14+0.72*(i/11)), len=S*(0.4+0.42*((i*0.37)%1));
      ctx.strokeStyle=rC(mix(col,acc,0.5),0.28); ctx.beginPath(); ctx.moveTo(ccx,gy-S*0.05);
      ctx.quadraticCurveTo(ccx+Math.cos(a)*len*0.6,gy+S*0.02,ccx+Math.cos(a)*len,gy+Math.sin(a)*S*0.12+S*0.05); ctx.stroke(); } ctx.restore();
    auraGlow(ccx,capY,S*1.3,gcol,0.09+0.10*health);
    const P=(px,py)=>[ccx+px*S,ccy+py*S];
    const sil=[P(-0.06,0.42),P(-0.20,0.30),P(-0.17,0.02),P(-0.15,-0.28),P(-0.46,-0.30),P(-0.72,-0.34),P(-0.58,-0.52),P(-0.28,-0.64),P(0,-0.68),
      P(0.28,-0.64),P(0.58,-0.52),P(0.72,-0.34),P(0.46,-0.30),P(0.15,-0.28),P(0.17,0.02),P(0.20,0.30),P(0.06,0.42)];
    fillGlow(sil,bodyGrad(ccx-S*0.12,capY-S*0.05,S*1.0,col,acc,health),gcol,2);
    ctx.save(); smoothClosed(sil); ctx.clip(); paintPattern(sc,ccx,capY,S*0.7,col,acc);
    const hl=ctx.createRadialGradient(ccx-S*0.15,capY-S*0.2,0,ccx-S*0.15,capY-S*0.2,S*0.95);
    hl.addColorStop(0,rC(mix(col,[255,255,255],0.6),0.32)); hl.addColorStop(0.6,'rgba(0,0,0,0)'); ctx.fillStyle=hl; ctx.fillRect(ccx-S,capY-S,S*2,S*2);
    ctx.strokeStyle=rC(mix(col,[10,8,14],0.6),0.5); ctx.lineWidth=1.4;
    for(let i=-8;i<=8;i++){ const ex=ccx+i*S*0.075; ctx.beginPath(); ctx.moveTo(ccx+i*S*0.02,capY+S*0.05); ctx.lineTo(ex,capY+S*0.15); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<7;i++){ const a=-2.55+i*0.42, rr=S*0.5, sx=ccx+Math.cos(a)*rr*0.9, sy=capY+Math.sin(a)*S*0.22-S*0.05, pu=0.55+0.45*Math.sin(t*2+i*1.3);
      ctx.fillStyle=rC(mix(acc,[255,255,255],0.3),0.5*pu); ctx.beginPath(); ctx.arc(sx,sy,S*0.045,0,6.3); ctx.fill(); } ctx.restore();
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(acc,0.5);
    for(let i=0;i<10;i++){ const yy=capY+S*0.2-((t*22+i*26)%(S*1.2)); ctx.beginPath(); ctx.arc(ccx-S*0.32+i*S*0.07,yy,1.6,0,6.3); ctx.fill(); } ctx.restore(); },

  bracket(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const n=F.shelves||4, gy=ccy+S*0.7; softShadow(ccx+S*0.1,gy,S*0.6,S*0.12); auraGlow(ccx,ccy,S*1.2,gcol,0.06+0.07*health);
    // host trunk on the left
    ctx.save(); ctx.fillStyle=bodyGrad(ccx-S*0.5,ccy,S*0.5,mix(col,[30,26,20],0.5),acc,health);
    ctx.beginPath(); ctx.moveTo(ccx-S*0.5,gy); ctx.lineTo(ccx-S*0.62,ccy-S*0.7); ctx.lineTo(ccx-S*0.3,ccy-S*0.7); ctx.lineTo(ccx-S*0.28,gy); ctx.closePath(); ctx.fill(); ctx.restore();
    // stacked shelves jutting right
    for(let i=0;i<n;i++){ const yy=ccy-S*0.5+i*(S*1.1/n), w=S*(0.55-0.05*i), x0=ccx-S*0.32;
      const pts=[[x0,yy+S*0.02],[x0+w*0.5,yy-S*0.12],[x0+w,yy-S*0.02],[x0+w*0.96,yy+S*0.1],[x0+w*0.4,yy+S*0.14],[x0,yy+S*0.12]];
      fillGlow(pts,bodyGrad(x0,yy-S*0.1,w,col,acc,health),gcol,1.6);
      ctx.save(); smoothClosed(pts); ctx.clip(); ctx.strokeStyle=rC(mix(col,[255,255,255],0.4),0.35); ctx.lineWidth=1.2;
      for(let r=0.2;r<1;r+=0.22){ ctx.beginPath(); ctx.ellipse(x0,yy,w*r,S*0.13*r,0,-1.3,1.3); ctx.stroke(); } ctx.restore(); }
    floaters(ccx+S*0.1,ccy,S,t,acc); },

  coral(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5);
    const gy=ccy+S*0.7; softShadow(ccx,gy,S*0.55,S*0.1); auraGlow(ccx,ccy,S*1.3,gcol,0.07+0.08*health);
    function branch(x,y,ang,len,depth){ if(depth<=0||len<S*0.06){ // glowing tip
        ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(mix(acc,[255,255,255],0.4),0.7); ctx.beginPath(); ctx.arc(x,y,S*0.03,0,6.3); ctx.fill(); ctx.restore(); return; }
      const nx=x+Math.cos(ang)*len, ny=y+Math.sin(ang)*len;
      ctx.strokeStyle=rC(mix(col,acc,0.35),0.92); ctx.lineWidth=Math.max(1.5,len*0.12); ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(nx,ny); ctx.stroke();
      const wob=Math.sin(t*0.8+depth)*0.12;
      branch(nx,ny,ang-0.5+wob,len*0.72,depth-1); branch(nx,ny,ang+0.5+wob,len*0.72,depth-1); }
    ctx.save(); branch(ccx,gy,-Math.PI*0.5,S*0.5,4); ctx.restore();
    // base
    orb(ccx,gy,S*0.1,mix(col,[40,30,20],0.4),acc,health);
    floaters(ccx,ccy,S,t,acc); },

  puffball(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5);
    const gy=ccy+S*0.6, r=S*0.5, cyy=ccy; softShadow(ccx,gy,S*0.55,S*0.11); auraGlow(ccx,cyy,S*1.3,gcol,0.08+0.08*health);
    // short base
    ctx.save(); ctx.fillStyle=bodyGrad(ccx,gy,S*0.4,mix(col,[20,20,16],0.4),acc,health);
    ctx.beginPath(); ctx.moveTo(ccx-S*0.22,gy); ctx.quadraticCurveTo(ccx-S*0.18,cyy+r*0.6,ccx-S*0.34,cyy+r*0.3);
    ctx.lineTo(ccx+S*0.34,cyy+r*0.3); ctx.quadraticCurveTo(ccx+S*0.18,cyy+r*0.6,ccx+S*0.22,gy); ctx.closePath(); ctx.fill(); ctx.restore();
    orb(ccx,cyy,r,col,acc,health);
    // surface warts
    ctx.save(); ctx.beginPath(); ctx.arc(ccx,cyy,r,0,6.3); ctx.clip(); ctx.fillStyle=rC(mix(col,[255,255,255],0.4),0.35);
    for(let i=0;i<14;i++){ const a=i*2.4, rr=r*(0.3+0.6*((i*0.29)%1)); ctx.beginPath(); ctx.arc(ccx+Math.cos(a)*rr,cyy+Math.sin(a)*rr,S*0.03,0,6.3); ctx.fill(); }
    // apical pore
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(acc,0.6); ctx.beginPath(); ctx.arc(ccx,cyy-r*0.85,S*0.06,0,6.3); ctx.fill(); ctx.restore();
    // spore puff from the pore
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(acc,0.4);
    for(let i=0;i<12;i++){ const yy=cyy-r-((t*26+i*20)%(S*0.9)), xx=ccx+Math.sin(t+i)*S*0.12; ctx.beginPath(); ctx.arc(xx,yy,1.6,0,6.3); ctx.fill(); } ctx.restore(); },

  mold(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5);
    const gy=ccy+S*0.5; softShadow(ccx,gy+S*0.06,S*1.0,S*0.1); auraGlow(ccx,gy-S*0.1,S*1.3,gcol,0.06+0.06*health);
    // spreading fuzzy sheet
    const pts=[]; for(let i=0;i<=24;i++){ const f=i/24, x=ccx+(-0.9+1.8*f)*S; const y=gy - Math.max(0,Math.sin(f*3.14))*S*0.24 - Math.sin(f*20+t)*S*0.02; pts.push([x,y]); }
    pts.push([ccx+S*0.9,gy+S*0.16]); pts.push([ccx-S*0.9,gy+S*0.16]);
    fillGlow(pts,bodyGrad(ccx,gy-S*0.1,S*0.9,col,acc,health),gcol,1.6);
    // fuzzy hyphae along the top
    ctx.save(); ctx.strokeStyle=rC(mix(col,acc,0.4),0.4); ctx.lineWidth=1;
    for(let i=0;i<40;i++){ const f=i/40, x=ccx+(-0.85+1.7*f)*S, y=gy-Math.max(0,Math.sin(f*3.14))*S*0.24;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.sin(i)*S*0.02,y-S*0.06-Math.abs(Math.sin(i*1.3))*S*0.03); ctx.stroke(); } ctx.restore();
    // fruiting heads on stalks
    for(let i=0;i<7;i++){ const f=(i+0.5)/7, x=ccx+(-0.8+1.6*f)*S, base=gy-Math.max(0.1,Math.sin(f*3.14))*S*0.22, hy=base-S*0.2-Math.sin(i)*S*0.03;
      ctx.save(); ctx.strokeStyle=rC(mix(col,[20,20,14],0.4),0.7); ctx.lineWidth=S*0.02; ctx.beginPath(); ctx.moveTo(x,base); ctx.lineTo(x,hy); ctx.stroke(); ctx.restore();
      orb(x,hy,S*0.06,mix(col,[30,26,18],0.5),acc,health); }
    floaters(ccx,gy-S*0.2,S,t,acc); },

  /* --- Monera & Archaea colonies (one plan, several styles) --- */
  colony(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), style=(sc.A.form||{}).style||'filament';
    const gy=ccy+S*0.62; softShadow(ccx,gy+S*0.06,S*0.95,S*0.12); auraGlow(ccx,ccy,S*1.4,gcol,0.08+0.08*health);
    if(style==='filament'){ // chains of cells rising as wavy strands
      for(let s=0;s<9;s++){ const bx=ccx+(s-4)*S*0.15, lean=Math.sin(t*0.8+s)*S*0.05;
        for(let k=0;k<8;k++){ const y=gy-k*S*0.15, x=bx+Math.sin(k*0.7+s)*S*0.05+lean*(k/8);
          orb(x,y,S*0.055,col,acc,health); } } }
    else if(style==='dome'){ // translucent slime dome with embedded cells
      const dome=[]; for(let a=Math.PI;a<=2*Math.PI;a+=Math.PI/14) dome.push([ccx+Math.cos(a)*S*0.7,gy+Math.sin(a)*S*0.55]);
      dome.push([ccx+S*0.7,gy]); dome.push([ccx-S*0.7,gy]);
      smoothClosed(dome); const g=ctx.createRadialGradient(ccx-S*0.2,gy-S*0.35,0,ccx,gy,S*0.8);
      g.addColorStop(0,rC(mix(col,[255,255,255],0.5),0.45)); g.addColorStop(0.7,rC(col,0.28)); g.addColorStop(1,rC(mix(col,acc,0.5),0.35));
      ctx.fillStyle=g; ctx.fill();
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth=2; ctx.strokeStyle=rC(gcol,0.4); ctx.shadowColor=rC(gcol,0.5); ctx.shadowBlur=12; smoothClosed(dome); ctx.stroke(); ctx.restore();
      ctx.save(); smoothClosed(dome); ctx.clip();
      for(let i=0;i<24;i++){ const a=i*2.39, rr=S*0.6*Math.sqrt((i+1)/24), x=ccx+Math.cos(a)*rr, y=gy-Math.abs(Math.sin(a))*S*0.5*((i%5)/5+0.3);
        orb(x,y,S*0.04,mix(col,acc,0.3),acc,health); } ctx.restore(); }
    else if(style==='strom'){ // layered mound
      for(let l=0;l<6;l++){ const yy=gy-l*S*0.16, w=S*(0.75-l*0.1);
        const pts=[[ccx-w,yy+S*0.06],[ccx-w*0.6,yy-S*0.05],[ccx,yy-S*0.08],[ccx+w*0.6,yy-S*0.05],[ccx+w,yy+S*0.06],[ccx,yy+S*0.1]];
        fillGlow(pts,bodyGrad(ccx,yy-S*0.05,w,mix(col,[20,24,30],l*0.06),acc,health),gcol,1.3); } }
    else if(style==='crystal'){ // angular halophile crystals
      for(let i=0;i<7;i++){ const a=-Math.PI*0.5+(i-3)*0.4, R=S*0.3, x=ccx+Math.cos(a)*R, base=gy, h=S*(0.35+0.25*Math.abs(Math.sin(i*1.7))), w=S*0.1;
        const pts=[[x-w,base],[x-w*0.7,base-h*0.7],[x,base-h],[x+w*0.7,base-h*0.7],[x+w,base]];
        smoothClosed(pts); const g=ctx.createLinearGradient(x,base,x,base-h);
        g.addColorStop(0,rC(mix(col,acc,0.4),0.9)); g.addColorStop(1,rC(mix(col,[255,255,255],0.5),0.85)); ctx.fillStyle=g; ctx.fill();
        ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=rC(mix(acc,[255,255,255],0.4),0.5); ctx.lineWidth=1.4; smoothClosed(pts); ctx.stroke(); ctx.restore(); } }
    else if(style==='vent'){ // chimney spire
      const pts=[[ccx-S*0.22,gy],[ccx-S*0.16,ccy-S*0.1],[ccx-S*0.2,ccy-S*0.5],[ccx-S*0.06,ccy-S*0.62],
        [ccx+S*0.08,ccy-S*0.6],[ccx+S*0.16,ccy-S*0.45],[ccx+S*0.14,ccy-S*0.05],[ccx+S*0.22,gy]];
      fillGlow(pts,bodyGrad(ccx,ccy-S*0.2,S*0.6,col,acc,health),gcol,2);
      // encrusting cells + shimmer
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(acc,0.5);
      for(let i=0;i<10;i++){ const yy=ccy-S*0.62-((t*30+i*22)%(S*0.7)); ctx.beginPath(); ctx.arc(ccx-S*0.02+Math.sin(t+i)*S*0.06,yy,2,0,6.3); ctx.fill(); }
      ctx.fillStyle=rC(mix(acc,[255,255,255],0.3),0.6);
      for(let i=0;i<14;i++){ const a=i*2.2, x=ccx+Math.cos(a)*S*0.14, y=gy-((i*S*0.09)%(S*0.55)); ctx.beginPath(); ctx.arc(x,y,S*0.03,0,6.3); ctx.fill(); } ctx.restore(); }
    else { // 'crust' — flat crust with nodules + acid haze
      const pts=[]; for(let i=0;i<=20;i++){ const f=i/20, x=ccx+(-0.9+1.8*f)*S, y=gy-Math.max(0,Math.sin(f*3.14))*S*0.14; pts.push([x,y]); }
      pts.push([ccx+S*0.9,gy+S*0.14]); pts.push([ccx-S*0.9,gy+S*0.14]);
      fillGlow(pts,bodyGrad(ccx,gy-S*0.08,S*0.9,col,acc,health),gcol,1.4);
      for(let i=0;i<10;i++){ const f=(i+0.5)/10, x=ccx+(-0.8+1.6*f)*S, y=gy-Math.max(0.05,Math.sin(f*3.14))*S*0.14-S*0.02; orb(x,y,S*0.05,mix(col,acc,0.3),acc,health); } }
    floaters(ccx,ccy,S,t,acc); },

  /* --- more Animalia / Protista body-plans --- */
  anemone(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const gy=ccy+S*0.72, top=ccy-S*0.12, n=(F.arms||8)+4;
    softShadow(ccx,gy,S*0.6,S*0.12); auraGlow(ccx,ccy-S*0.15,S*1.4,gcol,0.09+0.09*health);
    // waving crown tentacles fanning up & out
    for(let i=0;i<n;i++){ const f=n>1?i/(n-1):0.5, ang=-Math.PI*0.5+(f-0.5)*Math.PI*1.35;
      limb(ccx+(f-0.5)*S*0.34, top, ang+Math.sin(t*1.6+i)*0.22, S*(0.5+0.22*Math.sin(i*1.3)), S*0.04, mix(col,acc,0.4),acc,t,i*0.9); }
    // stout column
    const colm=[[ccx-S*0.24,gy],[ccx-S*0.3,ccy+S*0.1],[ccx-S*0.24,top+S*0.04],[ccx,top-S*0.02],
      [ccx+S*0.24,top+S*0.04],[ccx+S*0.3,ccy+S*0.1],[ccx+S*0.24,gy]];
    fillGlow(colm,bodyGrad(ccx-S*0.1,ccy,S*0.7,col,acc,health),gcol,2);
    ctx.save(); smoothClosed(colm); ctx.clip(); paintPattern(sc,ccx,ccy+S*0.2,S*0.5,col,acc); ctx.restore();
    auraGlow(ccx,top,S*0.26,mix(acc,[255,255,255],0.3),0.5+0.3*health);
    floaters(ccx,ccy-S*0.1,S,t,acc); },

  urchin(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const r=S*0.4, n=(F.spikes||16); softShadow(ccx,ccy+S*0.46,S*0.6,S*0.12); auraGlow(ccx,ccy,S*1.3,gcol,0.08+0.08*health);
    // thick tapering spines all around
    ctx.save();
    for(let i=0;i<n;i++){ const a=i/n*6.283+Math.sin(t*0.6)*0.03, bx=ccx+Math.cos(a)*r*0.92, by=ccy+Math.sin(a)*r*0.92, ex=ccx+Math.cos(a)*r*1.75, ey=ccy+Math.sin(a)*r*1.75;
      const nx=-Math.sin(a), ny=Math.cos(a), w=S*0.03;
      ctx.beginPath(); ctx.moveTo(bx+nx*w,by+ny*w); ctx.lineTo(ex,ey); ctx.lineTo(bx-nx*w,by-ny*w); ctx.closePath();
      const g=ctx.createLinearGradient(bx,by,ex,ey); g.addColorStop(0,rC(mix(col,acc,0.3),0.9)); g.addColorStop(1,rC(mix(col,acc,0.6),0.5)); ctx.fillStyle=g; ctx.fill(); }
    ctx.restore();
    orb(ccx,ccy,r,col,acc,health);
    ctx.save(); ctx.beginPath(); ctx.arc(ccx,ccy,r,0,6.3); ctx.clip(); paintPattern(sc,ccx,ccy,r,col,acc);
    nucleusGlow(ccx,ccy,r*0.7,acc); ctx.restore();
    floaters(ccx,ccy,S,t,acc); },

  crinoid(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const gy=ccy+S*0.8, cup=ccy-S*0.05, n=(F.arms||6); softShadow(ccx,gy,S*0.4,S*0.1); auraGlow(ccx,ccy-S*0.2,S*1.3,gcol,0.07+0.08*health);
    // stalk
    const sway=Math.sin(t*0.7)*0.05, stalk=[]; for(let i=0;i<=10;i++){ const f=i/10; stalk.push([ccx+Math.sin(sway)*f*S*0.2, gy+(cup-gy)*f, f]); }
    ribbon(stalk,f=>S*0.05*(1-0.4*f), bodyGrad(ccx,ccy,S*0.7,col,acc,health), gcol);
    // feathery arms fanning up from the cup
    for(let i=0;i<n;i++){ const f=n>1?i/(n-1):0.5, ang=-Math.PI*0.5+(f-0.5)*Math.PI*1.1, wob=Math.sin(t*0.9+i)*0.06;
      const len=S*(0.7-0.1*Math.abs(f-0.5)), dir=Math.cos(ang+wob), diry=Math.sin(ang+wob), pts=[];
      for(let k=0;k<=10;k++){ const g=k/10; pts.push([ccx+dir*len*g+(-diry)*Math.sin(g*3.14)*S*0.04, cup+diry*len*g, g]); }
      ribbon(pts,g=>S*0.028*(1-0.7*g)+S*0.004, bodyGrad(ccx,ccy,S*0.7,col,acc,health), gcol);
      ctx.save(); ctx.strokeStyle=rC(mix(col,acc,0.5),0.5); ctx.lineWidth=1.1;
      for(let k=2;k<10;k++){ const p=pts[k], nn=[-(pts[k+1][1]-p[1]),(pts[k+1][0]-p[0])], nl=Math.hypot(nn[0],nn[1])||1;
        for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(p[0]+s*nn[0]/nl*S*0.07,p[1]+s*nn[1]/nl*S*0.07); ctx.stroke(); } } ctx.restore(); }
    orb(ccx,cup,S*0.12,mix(col,acc,0.3),acc,health);
    floaters(ccx,ccy-S*0.1,S,t,acc); },

  /* --- more Plantae --- */
  canopy(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), F=sc.A.form||{};
    const gy=ccy+S*0.92, sway=Math.sin(t*0.6)*0.04, top=ccy-S*0.34, n=(F.fronds||5)+2;
    softShadow(ccx,gy,S*0.7,S*0.12); auraGlow(ccx,top,S*1.4,gcol,0.08+0.08*health);
    for(let i=-2;i<=2;i++){ if(i===0)continue; limb(ccx+i*S*0.03,gy-S*0.02,Math.PI*0.5+i*0.4,S*0.4,S*0.05,mix(col,[8,12,10],0.5),acc,t,i*3); }
    // trunk
    const left=[],right=[]; for(let i=0;i<=8;i++){ const f=i/8, x=ccx+Math.sin(sway)*f*S*0.3, y=gy+(top-gy)*f, w=S*(0.12*(1-f)+0.03); left.push([x-w,y]); right.push([x+w,y]); }
    ctx.beginPath(); ctx.moveTo(left[0][0],left[0][1]); for(const p of left)ctx.lineTo(p[0],p[1]); for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i][0],right[i][1]); ctx.closePath();
    ctx.fillStyle=bodyGrad(ccx,ccy,S*0.9,col,acc,health); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineWidth=1.6; ctx.strokeStyle=rC(gcol,0.4); ctx.shadowColor=rC(gcol,0.5); ctx.shadowBlur=12; ctx.stroke(); ctx.restore();
    const tx=ccx+Math.sin(sway)*S*0.3;
    // broad umbrella of leaf-blades fanning out horizontally at the top
    for(let i=0;i<n;i++){ const f=n>1?i/(n-1):0.5, side=f<0.5?-1:1, ang=-Math.PI*0.5+(f-0.5)*Math.PI*1.15+Math.sin(t*0.8+i)*0.04;
      const len=S*(0.62-0.12*Math.abs(f-0.5)), ex=tx+Math.cos(ang)*len, ey=top+Math.sin(ang)*len*0.7;
      ctx.save(); ctx.beginPath(); ctx.moveTo(tx,top);
      ctx.quadraticCurveTo((tx+ex)/2+ -Math.sin(ang)*S*0.1,(top+ey)/2,ex,ey);
      ctx.quadraticCurveTo((tx+ex)/2+Math.sin(ang)*S*0.1,(top+ey)/2+S*0.06,tx,top+S*0.06); ctx.closePath();
      const g=ctx.createLinearGradient(tx,top,ex,ey); g.addColorStop(0,rC(mix(col,[6,10,10],0.35),0.9)); g.addColorStop(1,rC(mix(col,acc,0.5),0.72)); ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle=rC(gcol,0.45); ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(tx,top); ctx.lineTo(ex,ey); ctx.stroke(); ctx.restore(); }
    auraGlow(tx,top,S*0.2,gcol,0.4+0.3*health);
    floaters(ccx,ccy-S*0.2,S,t,acc); },

  /* --- more distinct forms: sponge, starfish, pitcher, slime mould, lichen --- */
  sponge(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5);
    softShadow(ccx,ccy+S*0.6,S*0.55,S*0.11); auraGlow(ccx,ccy,S*1.25,gcol,0.07+0.08*health);
    const P=(x,y)=>[ccx+x*S,ccy+y*S];
    const sil=[P(-0.28,0.6),P(-0.4,0.15),P(-0.42,-0.36),P(-0.32,-0.54),P(-0.14,-0.44),P(0,-0.5),P(0.14,-0.44),P(0.32,-0.54),P(0.42,-0.36),P(0.4,0.15),P(0.28,0.6)];
    fillGlow(sil,bodyGrad(ccx-S*0.1,ccy-S*0.2,S*0.9,col,acc,health),gcol,2);
    ctx.save(); smoothClosed(sil); ctx.clip(); paintPattern(sc,ccx,ccy,S*0.5,col,acc);
    ctx.fillStyle=rC(mix(col,[8,8,14],0.5),0.4);
    for(let i=0;i<22;i++){ const a=i*2.4, rr=S*0.5*Math.sqrt((i+1)/22); ctx.beginPath(); ctx.arc(ccx+Math.cos(a)*rr,ccy+Math.sin(a)*rr*1.1,S*0.03,0,6.3); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.fillStyle=rC(mix(col,[6,8,12],0.65),0.75); ctx.beginPath(); ctx.ellipse(ccx,ccy-S*0.46,S*0.13,S*0.055,0,0,6.3); ctx.fill();
    ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=rC(acc,0.4); ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(ccx,ccy-S*0.46,S*0.13,S*0.055,0,0,6.3); ctx.stroke(); ctx.restore();
    floaters(ccx,ccy,S,t,acc); },

  starfish(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), n=5;
    softShadow(ccx,ccy+S*0.5,S*0.6,S*0.1); auraGlow(ccx,ccy,S*1.3,gcol,0.08+0.08*health);
    const pts=[]; for(let i=0;i<n*2;i++){ const a=i/(n*2)*6.283-Math.PI/2, r=(i%2?S*0.3:S*0.66)*(1+0.03*Math.sin(t+i)); pts.push([ccx+Math.cos(a)*r,ccy+Math.sin(a)*r]); }
    fillGlow(pts,bodyGrad(ccx-S*0.1,ccy-S*0.1,S*0.9,col,acc,health),gcol,2);
    ctx.save(); smoothClosed(pts); ctx.clip(); paintPattern(sc,ccx,ccy,S*0.5,col,acc); ctx.globalCompositeOperation='lighter';
    nucleusGlow(ccx,ccy,S*0.24,acc); ctx.fillStyle=rC(mix(acc,[255,255,255],0.3),0.5);
    for(let k=0;k<n;k++){ const a=k/n*6.283-Math.PI/2; for(let j=1;j<=4;j++){ const rr=S*0.14*j; ctx.beginPath(); ctx.arc(ccx+Math.cos(a)*rr,ccy+Math.sin(a)*rr,S*0.02,0,6.3); ctx.fill(); } }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(mix(acc,[255,255,255],0.4),0.7); ctx.beginPath(); ctx.arc(ccx+S*0.1,ccy-S*0.1,S*0.03,0,6.3); ctx.fill(); ctx.restore();
    floaters(ccx,ccy,S,t,acc); },

  pitcher(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5);
    const gy=ccy+S*0.9; softShadow(ccx,gy,S*0.6,S*0.12); auraGlow(ccx,ccy,S*1.3,gcol,0.07+0.07*health);
    for(let i=-1;i<=1;i++) limb(ccx+i*S*0.04,gy-S*0.02,Math.PI*0.5+i*0.4,S*0.35,S*0.045,mix(col,[8,12,10],0.5),acc,t,i*3);
    const stem=[]; for(let k=0;k<=8;k++){ const f=k/8; stem.push([ccx+Math.sin(t*0.5)*f*S*0.08, gy+(ccy-S*0.5-gy)*f, f]); }
    ribbon(stem,f=>S*0.05*(1-0.4*f), bodyGrad(ccx,ccy,S*0.7,col,acc,health), gcol);
    const traps=[[-0.34,-0.05,0.9],[0.32,-0.2,1.0],[0.02,0.12,0.8]];
    for(let i=0;i<traps.length;i++){ const tx=ccx+traps[i][0]*S, ty=ccy+traps[i][1]*S, z=traps[i][2];
      const jug=[[tx-S*0.12*z,ty],[tx-S*0.14*z,ty+S*0.22*z],[tx-S*0.05*z,ty+S*0.34*z],[tx+S*0.05*z,ty+S*0.34*z],[tx+S*0.14*z,ty+S*0.22*z],[tx+S*0.12*z,ty]];
      fillGlow(jug,bodyGrad(tx,ty,S*0.3,col,acc,health),gcol,1.5);
      ctx.save(); ctx.strokeStyle=rC(mix(acc,[255,255,255],0.3),0.6); ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(tx,ty,S*0.12*z,S*0.04*z,0,0,6.3); ctx.stroke();
      ctx.fillStyle=rC(mix(col,acc,0.4),0.85); ctx.beginPath(); ctx.ellipse(tx,ty-S*0.08*z,S*0.1*z,S*0.05*z,-0.3,0,6.3); ctx.fill();
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(acc,0.35); ctx.beginPath(); ctx.ellipse(tx,ty+S*0.02,S*0.08*z,S*0.03*z,0,0,6.3); ctx.fill(); ctx.restore(); }
    floaters(ccx,ccy-S*0.1,S,t,acc); },

  slimemold(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5);
    const gy=ccy+S*0.4; softShadow(ccx,gy+S*0.05,S*0.9,S*0.1); auraGlow(ccx,ccy,S*1.3,gcol,0.06+0.07*health);
    ctx.save(); ctx.strokeStyle=rC(mix(col,acc,0.4),0.6); ctx.lineCap='round';
    (function(){ const stack=[]; function vein(x,y,ang,len,w,d){ if(d<=0||len<S*0.05)return; const nx=x+Math.cos(ang)*len, ny=y+Math.sin(ang)*len;
      ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(nx,ny); ctx.stroke();
      const wob=Math.sin(t*0.8+d)*0.2; vein(nx,ny,ang-0.5+wob,len*0.7,w*0.7,d-1); vein(nx,ny,ang+0.4+wob,len*0.7,w*0.7,d-1); }
      for(let k=0;k<5;k++){ const a=Math.PI*(0.15+0.7*(k/4)); vein(ccx,gy,a-Math.PI,S*0.32,S*0.055,3); } })();
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<10;i++){ const a=i*2.4, rr=S*(0.2+0.4*((i*0.31)%1)); orb(ccx+Math.cos(a)*rr, gy-Math.abs(Math.sin(a))*S*0.2, S*0.04, mix(col,acc,0.3),acc,health); }
    ctx.restore();
    orb(ccx,gy,S*0.1,col,acc,health);
    floaters(ccx,ccy,S,t,acc); },

  lichen(ccx,ccy,S,t,sc,health){ const col=sc.A.col, acc=sc.planet.accent, gcol=mix(col,acc,0.5), n=9;
    softShadow(ccx,ccy+S*0.5,S*0.7,S*0.12); auraGlow(ccx,ccy,S*1.2,gcol,0.06+0.06*health);
    for(let k=0;k<n;k++){ const a=k/n*6.283, x=ccx+Math.cos(a)*S*0.24, y=ccy+Math.sin(a)*S*0.16;
      const lobe=[]; for(let i=0;i<8;i++){ const aa=i/8*6.283, rr=S*0.22*(1+0.2*Math.sin(aa*3+k)); lobe.push([x+Math.cos(a)*S*0.14+Math.cos(aa)*rr, y+Math.sin(a)*S*0.1+Math.sin(aa)*rr*0.7]); }
      fillGlow(lobe,bodyGrad(x,y-S*0.1,S*0.3,mix(col,[20,30,20],(k%2)*0.15),acc,health),gcol,1.2); }
    orb(ccx,ccy-S*0.02,S*0.18,mix(col,acc,0.2),acc,health);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rC(mix(acc,[255,255,255],0.3),0.5);
    for(let i=0;i<12;i++){ const a=i*2.1, rr=S*(0.15+0.3*((i*0.27)%1)); ctx.beginPath(); ctx.arc(ccx+Math.cos(a)*rr,ccy+Math.sin(a)*rr*0.7,S*0.03,0,6.3); ctx.fill(); } ctx.restore();
    floaters(ccx,ccy,S,t,acc); },
};

/* ---- pathogen particles overlaid on a zoomed infected cell ---- */
function drawPathogens(kind,t){ ctx.save(); ctx.globalCompositeOperation='lighter';
  const n=10;
  for(let i=0;i<n;i++){ const a=i/n*6.283+t*0.6+i; const rr=R*(0.4+0.55*((i*0.37)%1));
    const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr, s=R*0.05;
    if(kind==='virus'){ ctx.fillStyle='#ff5ec7'; ctx.shadowColor='#ff5ec7'; ctx.shadowBlur=10;
      ctx.beginPath(); for(let k=0;k<6;k++){const aa=k/6*6.283;const px=x+Math.cos(aa)*s,py=y+Math.sin(aa)*s;k?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath(); ctx.fill(); }
    else if(kind==='bacterium'){ ctx.fillStyle='#9fd0ff'; ctx.shadowColor='#9fd0ff'; ctx.shadowBlur=8;
      ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0,0,s*1.6,s*0.7,0,0,6.3); ctx.fill(); ctx.restore(); }
    else if(kind==='parasite'){ // motile nucleated eukaryotic cell
      ctx.save(); ctx.translate(x,y); ctx.rotate(a*0.5);
      ctx.fillStyle='rgba(180,120,255,.55)'; ctx.shadowColor='#b878ff'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.ellipse(0,0,s*1.4,s*0.9,0,0,6.3); ctx.fill();
      ctx.fillStyle='#d8b0ff'; ctx.beginPath(); ctx.arc(s*0.3,0,s*0.4,0,6.3); ctx.fill();
      ctx.strokeStyle='rgba(200,160,255,.6)'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(-s*1.3,0); ctx.quadraticCurveTo(-s*1.9,Math.sin(t*6+i)*s*0.6,-s*2.4,0); ctx.stroke(); ctx.restore(); }
    else if(kind==='prion'){ // angular clump of misfolded protein
      ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.fillStyle='rgba(230,230,150,.6)'; ctx.shadowColor='#e6e696'; ctx.shadowBlur=8;
      ctx.beginPath(); for(let k=0;k<7;k++){ const aa=k/7*6.283, rr=s*(0.7+0.6*((k*0.41)%1)); const px=Math.cos(aa)*rr, py=Math.sin(aa)*rr; k?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath(); ctx.fill(); ctx.restore(); }
    else if(kind==='toxin_load'){ // diffuse toxin molecules, no organism
      ctx.fillStyle='rgba(180,255,140,.5)'; ctx.shadowColor='#b4ff8c'; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(x,y,s*0.5,0,6.3); ctx.fill();
      ctx.fillStyle='rgba(180,255,140,.25)'; ctx.beginPath(); ctx.arc(x+Math.sin(t+i)*s,y+Math.cos(t*1.3+i)*s,s*0.3,0,6.3); ctx.fill(); }
    else { ctx.strokeStyle='#ffd27a'; ctx.shadowColor='#ffd27a'; ctx.shadowBlur=8; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x-s,y); ctx.quadraticCurveTo(x,y-s*1.5,x+s,y); ctx.quadraticCurveTo(x,y+s*1.5,x-s,y); ctx.stroke(); }
  }
  ctx.restore();
}

})(window.XS);
