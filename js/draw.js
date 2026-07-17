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

XS.render=function(app){
  const t=app.time/1000; bg(t);
  const spec=app.spec, S=app.S; if(!spec){ return; }
  if(spec.tissue) drawTissue(app,t);
  else if(spec.isVirus) drawVirus(app,t);
  else drawCell(app,t);
  drawScan(app);
  envTint(S);
};

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
  blob(rad,wob,asp,seed,t);
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
      ctx.lineWidth=cl(rad*.05,3,8);ctx.strokeStyle=`rgba(${kc.join(',')},${0.4+0.4*mI})`;blob(rad,wob,asp,seed,t);ctx.stroke();
      ctx.lineWidth=cl(rad*.018,1.5,4);ctx.strokeStyle=`rgba(${kc.join(',')},${0.7*mI})`;blob(rad*0.9,wob,asp,seed,t);ctx.stroke();
    } else if(wall==='pepti'){
      ctx.lineWidth=cl(rad*.03,2,5);ctx.strokeStyle=`rgba(${kc.join(',')},${0.55*mI+.3})`;ctx.shadowColor=`rgba(${kc.join(',')},.7)`;ctx.shadowBlur=12;blob(rad,wob,asp,seed,t);ctx.stroke();
      ctx.shadowBlur=0;ctx.lineWidth=1.4;ctx.strokeStyle=`rgba(${kc.join(',')},${0.5*mI})`;blob(rad*0.88,wob,asp,seed,t);ctx.stroke();
    } else {
      ctx.lineWidth=cl(rad*.028,2,6);ctx.strokeStyle=`rgba(${kc.join(',')},${0.5+0.4*mI})`;ctx.shadowColor=`rgba(${kc.join(',')},.8)`;ctx.shadowBlur=cl(18*mI+4,4,22);blob(rad,wob,asp,seed,t);ctx.stroke();
    }
  } else { ctx.lineWidth=cl(rad*.03,2,6);ctx.strokeStyle=`rgba(${kc.join(',')},${0.4+0.4*mI})`;ctx.setLineDash([rad*.18*mI+4,rad*.10]);blob(rad,wob,asp,seed,t);ctx.stroke();ctx.setLineDash([]); }
  ctx.restore();
  // appendages behind organelles
  for(const p of spec.parts){ if(p.shape==='flagellum') drawFlagellum(p,rad,asp,t); if(p.shape==='cilia') drawCilia(rad,asp,wob,seed,t,p); if(p.shape==='pili') drawPili(rad,asp,t,p); }
  // clip and draw organelles
  ctx.save(); blob(rad,wob,asp,seed,t); ctx.clip();
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
    if(hov&&app.phase==='investigate'){ ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(p._x,p._y,p._r+6,0,6.3);ctx.stroke();ctx.setLineDash([]); }
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

})(window.XS);
