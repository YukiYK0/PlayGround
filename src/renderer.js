/* ============================================================
   CAMERA, PIXEL ART RENDERER
   ============================================================ */

class Camera {
  constructor(){
    this.x=10; this.y=8; this.zoom=1; this.targetZoom=1;
    this.follow=true; this.shake=0; this.viewW=360; this.viewH=700;
  }
  worldToScreen(wx,wy){
    return {x:(wx-this.x)*this.zoom*TILE + this.viewW/2, y:(wy-this.y)*this.zoom*TILE + this.viewH/2};
  }
  screenToWorld(sx,sy){
    return {x:(sx-this.viewW/2)/(this.zoom*TILE)+this.x, y:(sy-this.viewH/2)/(this.zoom*TILE)+this.y};
  }
  panBy(dx,dy){ this.x-=dx/(this.zoom*TILE); this.y-=dy/(this.zoom*TILE); this.follow=false; }
  zoomBy(factor, centerX=null, centerY=null){
    const before=centerX!=null?this.screenToWorld(centerX,centerY):null;
    this.zoom=clamp(this.zoom*factor,0.55,1.7); this.targetZoom=this.zoom;
    if(before && centerX!=null){
      const after=this.screenToWorld(centerX,centerY);
      this.x+=before.x-after.x; this.y+=before.y-after.y;
    }
  }
  update(dt,char,lot){
    this.zoom=lerp(this.zoom,this.targetZoom,1-Math.pow(0.001,dt));
    if(this.shake>0) this.shake=Math.max(0,this.shake-dt*3);
    if(this.follow && char && !char.hidden){
      const k=1-Math.pow(0.002,dt);
      this.x=lerp(this.x,char.x,k); this.y=lerp(this.y,char.y-0.25,k);
    }
    this.clamp(lot);
  }
  clamp(lot){
    if(!lot) return;
    const halfW=(this.viewW/this.zoom)/TILE/2;
    const halfH=(this.viewH/this.zoom)/TILE/2;
    const minX=halfW-1.2, maxX=lot.w-halfW+1.2;
    const minY=halfH-1.8, maxY=lot.h-halfH+1.2;
    if(minX>maxX) this.x=lot.w/2; else this.x=clamp(this.x,minX,maxX);
    if(minY>maxY) this.y=lot.h/2; else this.y=clamp(this.y,minY,maxY);
  }
  focusWorld(x,y){ this.x=x; this.y=y; }
}

/* ---------- Pixel drawing helpers ---------- */
function px(ctx,x,y,w,h,color){ ctx.fillStyle=color; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function shadeColor(hex,amt){
  try{
    let h=hex.replace('#',''); if(h.length===3)h=h.split('').map(c=>c+c).join('');
    let n=parseInt(h,16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    r=clamp(r+amt,0,255);g=clamp(g+amt,0,255);b=clamp(b+amt,0,255);
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }catch(e){return hex;}
}
function darken(hex,amt){ return shadeColor(hex,-amt); }
function lighten(hex,amt){ return shadeColor(hex,amt); }

/* ---------- Character art ---------- */
function drawPersonArt(ctx, footX, footY, char, opts={}){
  const scale = opts.scale ?? (char.stageInfo.id==='bebe'?0.66:char.stageInfo.id==='crianca'?0.82:char.stageInfo.id==='adolescente'?0.92:char.stageInfo.id==='idoso'?0.92:1);
  const S = scale;
  const walk = opts.walk || 0;
  const state = opts.state || 'idle';
  const t = opts.time || 0;
  const outfit = char.outfitColor || char.appearance?.outfits?.casual || '#5f9f92';
  const skin = char.appearance?.skin || '#d79b73';
  const hair = char.appearance?.hair || '#4a2c20';
  const eye = char.appearance?.eyes || '#38251c';
  const style = char.appearance?.hairStyle || 'curto';
  const outline = '#2a1d2d';
  const moving = !!opts.walking;
  const bob = moving ? Math.sin(walk*8)*1.2 : Math.sin(t*2.2+char.avatarSeed)*0.45;
  const baseX = footX, baseY = footY + bob;
  const legSwing = moving ? Math.sin(walk*8)*4 : 0;
  const standing = !['sleep'].includes(state);
  const sitting = ['sit','eat','read','paint','write','type','guitar','piano','toilet'].includes(state);
  const dancing = state==='dance';
  const armsUp = state==='workout' || dancing;
  const lie = state==='sleep';

  if(opts.shadow !== false && !lie){
    ctx.fillStyle='rgba(24,16,28,0.24)';
    ctx.beginPath(); ctx.ellipse(baseX,baseY+1,9*S,3.5*S,0,0,Math.PI*2); ctx.fill();
  }
  if(lie){
    // side-lying pose on bed/couch
    px(ctx,baseX-18*S,baseY-8*S,32*S,10*S,outline);
    px(ctx,baseX-17*S,baseY-7*S,30*S,8*S,outfit);
    px(ctx,baseX-24*S,baseY-10*S,10*S,10*S,skin);
    px(ctx,baseX-25*S,baseY-12*S,12*S,5*S,hair);
    px(ctx,baseX-11*S,baseY-6*S,10*S,3*S,darken(outfit,18));
    return;
  }

  if(sitting){
    // legs folded
    px(ctx,baseX-7*S,baseY-9*S,5*S,9*S,outline);
    px(ctx,baseX+2*S,baseY-9*S,5*S,9*S,outline);
    px(ctx,baseX-6*S,baseY-10*S,4*S,8*S,darken(outfit,45));
    px(ctx,baseX+2*S,baseY-10*S,4*S,8*S,darken(outfit,35));
  } else {
    px(ctx,baseX-6*S,baseY-10*S,5*S,10*S,outline);
    px(ctx,baseX+1*S,baseY-10*S,5*S,10*S,outline);
    px(ctx,baseX-5*S,baseY-9*S,4*S,9*S,darken(outfit,40));
    px(ctx,baseX+1*S,baseY-9*S,4*S,9*S,darken(outfit,40));
    // shoes
    px(ctx,baseX-6*S+legSwing*0.25,baseY-3*S,5*S,3*S,'#3b2d34');
    px(ctx,baseX+1*S-legSwing*0.25,baseY-3*S,5*S,3*S,'#3b2d34');
  }
  // torso
  const torsoY=baseY-(sitting?21:25)*S;
  px(ctx,baseX-7.5*S,torsoY,15*S,(sitting?12:14)*S,outline);
  px(ctx,baseX-6.5*S,torsoY+1,13*S,(sitting?10:12)*S,outfit);
  if(char.gender==='feminino' && char.age>=18 && char.appearance?.hairStyle!=='careca'){
    // subtle pixel highlight
    px(ctx,baseX-5*S,torsoY+2,2*S,8*S,lighten(outfit,18));
  }
  // arms
  const armY=torsoY+2;
  if(armsUp){
    px(ctx,baseX-12*S,armY-5*S,4*S,9*S,outline);
    px(ctx,baseX+8*S,armY-5*S,4*S,9*S,outline);
    px(ctx,baseX-11*S,armY-5*S,3*S,8*S,skin);
    px(ctx,baseX+8*S,armY-5*S,3*S,8*S,skin);
  } else if(dancing){
    px(ctx,baseX-13*S,armY+Math.sin(t*8)*2,4*S,9*S,skin);
    px(ctx,baseX+9*S,armY-Math.sin(t*8)*2,4*S,9*S,skin);
  } else {
    px(ctx,baseX-10.5*S,armY+(moving?legSwing*0.5:0),4*S,9*S,outline);
    px(ctx,baseX+6.5*S,armY-(moving?legSwing*0.5:0),4*S,9*S,outline);
    px(ctx,baseX-10*S,armY+(moving?legSwing*0.5:0)+1,2.5*S,7*S,skin);
    px(ctx,baseX+7*S,armY-(moving?legSwing*0.5:0)+1,2.5*S,7*S,skin);
  }
  // neck + head
  const headY=torsoY-14*S;
  px(ctx,baseX-2*S,headY+12*S,4*S,4*S,skin);
  px(ctx,baseX-7*S,headY,14*S,14*S,outline);
  px(ctx,baseX-6*S,headY+1,12*S,12*S,skin);
  // ears
  px(ctx,baseX-8*S,headY+6*S,2*S,3*S,skin);
  px(ctx,baseX+6*S,headY+6*S,2*S,3*S,skin);
  // eyes
  const blink = (Math.floor(t*0.7+char.avatarSeed)%19)===0;
  if(blink){ px(ctx,baseX-4*S,headY+6*S,2*S,1*S,eye); px(ctx,baseX+2*S,headY+6*S,2*S,1*S,eye); }
  else { px(ctx,baseX-4.5*S,headY+5*S,2*S,2*S,eye); px(ctx,baseX+2.5*S,headY+5*S,2*S,2*S,eye); }
  px(ctx,baseX-4*S,headY+5*S,0.8*S,0.8*S,'#fffaf0'); px(ctx,baseX+3*S,headY+5*S,0.8*S,0.8*S,'#fffaf0');
  // nose/mouth
  px(ctx,baseX-0.5*S,headY+8*S,1*S,1*S,darken(skin,30));
  const emo=char.getEmotion?char.getEmotion():'feliz';
  if(['triste','irritado'].includes(emo)) px(ctx,baseX-2*S,headY+10*S,4*S,1*S,darken(skin,60));
  else px(ctx,baseX-2*S,headY+10*S,4*S,1*S,'#8d3c3c');
  // hair styles
  switch(style){
    case 'careca': break;
    case 'curto':
      px(ctx,baseX-7*S,headY-1,14*S,4*S,hair);
      px(ctx,baseX-7*S,headY+2*S,3*S,5*S,hair);
      px(ctx,baseX+4*S,headY+2*S,3*S,5*S,hair);
      break;
    case 'franja':
      px(ctx,baseX-7.5*S,headY-1,15*S,5*S,hair);
      px(ctx,baseX-6*S,headY+3*S,12*S,2*S,hair);
      break;
    case 'cacheado':
      px(ctx,baseX-8*S,headY-2,16*S,5*S,hair);
      for(let i=0;i<4;i++){ px(ctx,baseX-8*S+i*4.2*S,headY+1,4*S,3*S,hair); px(ctx,baseX-8*S+i*4.2*S,headY+2*S,3*S,4*S,hair); }
      break;
    case 'longo':
      px(ctx,baseX-8*S,headY-2,16*S,5*S,hair);
      px(ctx,baseX-9*S,headY+2*S,3*S,14*S,hair);
      px(ctx,baseX+6*S,headY+2*S,3*S,14*S,hair);
      break;
    case 'coque':
      px(ctx,baseX-7*S,headY-2,14*S,5*S,hair);
      px(ctx,baseX-3*S,headY-7*S,7*S,5*S,hair);
      px(ctx,baseX-7*S,headY+2*S,2*S,4*S,hair);
      break;
    case 'moicano':
      px(ctx,baseX-2*S,headY-6*S,5*S,7*S,hair);
      px(ctx,baseX-7*S,headY+1*S,14*S,2*S,hair);
      break;
    case 'chanel':
      px(ctx,baseX-8*S,headY-1,16*S,5*S,hair);
      px(ctx,baseX-9*S,headY+2*S,4*S,8*S,hair);
      px(ctx,baseX+5*S,headY+2*S,4*S,8*S,hair);
      px(ctx,baseX-6*S,headY+1*S,12*S,2*S,hair);
      break;
    case 'maria':
      px(ctx,baseX-7*S,headY-1,14*S,4*S,hair);
      px(ctx,baseX-11*S,headY+4*S,4*S,6*S,hair);
      px(ctx,baseX+7*S,headY+4*S,4*S,6*S,hair);
      break;
    default:
      px(ctx,baseX-7*S,headY-1,14*S,4*S,hair);
  }
  if(state==='workout'){
    // tiny dumbbell
    px(ctx,baseX+11*S,armY-3*S,8*S,2*S,'#3d3d46'); px(ctx,baseX+12*S,armY-5*S,2*S,6*S,'#666677');
  }
  if(state==='eat'){
    px(ctx,baseX+8*S,armY+2*S,4*S,3*S,'#f0bf62');
  }
  if(state==='paint'){
    px(ctx,baseX+8*S,armY-1*S,3*S,8*S,'#a77a4e'); px(ctx,baseX+10*S,armY-2*S,2*S,2*S,'#d85959');
  }
}

/* ---------- Portrait helper for UI / creator ---------- */
function drawPortrait(canvas,char,opts={}){
  if(!canvas) return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=canvas.clientWidth||canvas.width, h=canvas.clientHeight||canvas.height;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){ canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr); }
  const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
  const S=Math.min(w/52,h/62);
  ctx.save(); ctx.translate(w/2,h-3); ctx.scale(S,S);
  drawPersonArt(ctx,0,0,char,{scale:opts.hideBody?1.6:1.85,state:opts.state||'idle',time:opts.time||1.1,shadow:false});
  ctx.restore();
}
class Renderer {
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.camera=new Camera();
    this.game=null;
    this.dpr=1; this.width=0; this.height=0;
    this.time=0;
    this.gestureDirty=true;
    this.rain=[]; this.lightning=0; this.lastHour=-1;
    this.resize();
    window.addEventListener('resize',()=>this.resize());
    window.addEventListener('orientationchange',()=>setTimeout(()=>this.resize(),200));
  }
  attachGame(game){
    this.game=game; this.camera.viewW=this.width; this.camera.viewH=this.height;
    this.camera.zoom=clamp(this.width/390*1.05,0.72,1.3); this.camera.targetZoom=this.camera.zoom;
    this.focusCharacter(game.selected,true);
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect();
    this.dpr=Math.min(2,window.devicePixelRatio||1);
    this.width=Math.max(200,rect.width); this.height=Math.max(300,rect.height);
    this.canvas.width=Math.round(this.width*this.dpr); this.canvas.height=Math.round(this.height*this.dpr);
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.ctx.imageSmoothingEnabled=false;
    this.camera.viewW=this.width; this.camera.viewH=this.height;
    if(this.game?.selected) this.camera.clamp(this.game.currentLot);
  }
  focusCharacter(char,instant=false){
    if(!char) return;
    this.camera.follow=true;
    this.camera.x=char.x; this.camera.y=char.y-0.2;
    if(instant) this.camera.clamp(this.game?.currentLot);
  }
  zoom(factor){ this.camera.zoomBy(factor,this.width/2,this.height/2); this.camera.follow=false; this.gestureDirty=true; }
  recenter(){ this.focusCharacter(this.game?.selected,true); this.gestureDirty=true; }
  update(dt){
    this.time+=dt;
    if(this.game?.selected) this.camera.update(dt,this.game.selected,this.game.currentLot);
    else this.camera.update(dt,null,this.game?.currentLot);
    this.updateWeather(dt);
    this.render();
  }
  updateWeather(dt){
    const weather=this.game?.weather||'sun';
    const want=weather==='rain'||weather==='storm'?90:weather==='cold'?34:0;
    while(this.rain.length<want) this.rain.push({x:rand(0,this.width),y:rand(-this.height,this.height),speed:rand(280,520),size:rand(7,16),drift:rand(-1,1)});
    if(this.rain.length>want) this.rain.length=want;
    this.rain.forEach(r=>{ r.y+=r.speed*dt; r.x+=r.drift*60*dt+(weather==='storm'?80*dt:0); if(r.y>this.height+20){r.y=-20;r.x=rand(0,this.width);} if(r.x>this.width+20)r.x=-20; });
    if(weather==='storm' && chance(dt*0.08)) this.lightning=0.25;
    if(this.lightning>0) this.lightning=Math.max(0,this.lightning-dt*2.5);
  }

  render(){
    const ctx=this.ctx, g=this.game;
    if(!g) return;
    const lot=g.currentLot;
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    ctx.fillStyle='#15131d'; ctx.fillRect(0,0,this.width,this.height);
    const shake=this.camera.shake?rand(-1,1)*this.camera.shake:0;
    ctx.save();
    ctx.translate(this.width/2+shake,this.height/2+shake);
    ctx.scale(this.camera.zoom,this.camera.zoom);
    ctx.translate(-this.camera.x*TILE,-this.camera.y*TILE);
    this.drawGround(lot);
    this.drawFloors(lot);
    if(g.mode==='build'||g.mode==='buy') this.drawGridOverlay(lot);
    this.drawFloorObjects(lot);
    this.drawScene(lot,g);
    this.drawBuildGhost(g);
    this.drawOverlayBubbles(g);
    ctx.restore();
    this.drawLighting(lot,g);
    this.drawWeather();
    this.drawScreenVignette(g);
  }

  drawGround(lot){
    const ctx=this.ctx;
    const zoom=this.camera.zoom;
    const startX=Math.floor(this.camera.x-this.width/2/(TILE*zoom))-2;
    const endX=Math.ceil(this.camera.x+this.width/2/(TILE*zoom))+2;
    const startY=Math.floor(this.camera.y-this.height/2/(TILE*zoom))-2;
    const endY=Math.ceil(this.camera.y+this.height/2/(TILE*zoom))+2;
    for(let y=startY;y<=endY;y++)for(let x=startX;x<=endX;x++){
      if(x>=0&&y>=0&&x<lot.w&&y<lot.h) continue;
      const tx=x*TILE,ty=y*TILE;
      const h=hash2(x+99,y+33);
      ctx.fillStyle=h>0.5?'#243f31':'#203a2d';
      ctx.fillRect(tx,ty,TILE,TILE);
      if(h>0.82){ px(ctx,tx+7,ty+20,3,7,'#315c40'); px(ctx,tx+12,ty+15,2,6,'#2a5038'); }
      if(h<0.08){ px(ctx,tx+14,ty+10,5,5,'#385d45'); px(ctx,tx+10,ty+16,3,3,'#385d45'); }
    }
    // lot border
    ctx.strokeStyle='rgba(17,28,22,.55)'; ctx.lineWidth=3;
    ctx.strokeRect(1.5,1.5,lot.w*TILE-3,lot.h*TILE-3);
    ctx.strokeStyle='rgba(255,244,216,.08)'; ctx.lineWidth=1;
    ctx.strokeRect(4.5,4.5,lot.w*TILE-9,lot.h*TILE-9);
  }
  drawFloors(lot){
    for(let y=0;y<lot.h;y++)for(let x=0;x<lot.w;x++) this.drawFloorTile(x,y,lot.floorTypeAt(x,y));
  }
  drawFloorTile(x,y,type){
    const ctx=this.ctx, tx=x*TILE, ty=y*TILE, h=hash2(x,y);
    switch(type){
      case 'wood':{
        ctx.fillStyle=h>0.5?'#bd865a':'#b77f55'; ctx.fillRect(tx,ty,TILE,TILE);
        px(ctx,tx,ty+7,TILE,1,'rgba(83,49,31,.24)'); px(ctx,tx,ty+17,TILE,1,'rgba(83,49,31,.2)'); px(ctx,tx,ty+27,TILE,1,'rgba(83,49,31,.18)');
        px(ctx,tx+6+(h*18|0),ty+10,10,1,'rgba(255,220,170,.16)');
        px(ctx,tx,ty,TILE,1,'rgba(255,220,170,.06)');
        break;
      }
      case 'kitchen':{
        const alt=(x+y)%2===0; ctx.fillStyle=alt?'#d8c8a3':'#b9c9a9'; ctx.fillRect(tx,ty,TILE,TILE);
        px(ctx,tx+1,ty+1,TILE-2,1,'rgba(255,255,255,.2)'); px(ctx,tx,ty+31,TILE,1,'rgba(75,72,55,.15)');
        if(alt) px(ctx,tx+6,ty+6,2,2,'#c3b48f');
        break;
      }
      case 'tile':{
        ctx.fillStyle='#dce5da'; ctx.fillRect(tx,ty,TILE,TILE);
        px(ctx,tx+1,ty+1,TILE-2,TILE-2,'#e6ede4');
        ctx.strokeStyle='#c3cfc6'; ctx.lineWidth=1; ctx.strokeRect(tx+1.5,ty+1.5,TILE-3,TILE-3);
        if(h>0.7) px(ctx,tx+22,ty+22,2,2,'#bac8bf');
        break;
      }
      case 'concrete':{
        ctx.fillStyle=h>0.5?'#9da49f':'#989f9a'; ctx.fillRect(tx,ty,TILE,TILE);
        if(h>0.8) px(ctx,tx+8,ty+12,7,1,'#7f8781');
        break;
      }
      case 'sand':{
        ctx.fillStyle=h>0.5?'#e5ca88':'#ddc07b'; ctx.fillRect(tx,ty,TILE,TILE);
        if(h>0.6) px(ctx,tx+7+h*16,ty+9+h*12,2,2,'#b99c60');
        if(h<0.18) px(ctx,tx+20,ty+23,5,2,'#f1dca1');
        break;
      }
      case 'dark':{
        ctx.fillStyle=h>0.5?'#251d33':'#2a2139'; ctx.fillRect(tx,ty,TILE,TILE);
        px(ctx,tx,ty,TILE,1,'rgba(128,94,160,.08)');
        break;
      }
      case 'dance':{
        const alt=(x+y)%2===0;
        ctx.fillStyle=alt?'#392b4b':'#2d233d'; ctx.fillRect(tx,ty,TILE,TILE);
        if(alt){ px(ctx,tx+3,ty+3,TILE-6,1,'rgba(255,111,161,.28)'); px(ctx,tx+3,ty+28,TILE-6,1,'rgba(115,223,180,.18)'); }
        break;
      }
      case 'water':{
        const wave=Math.sin(this.time*1.8+x*.8+y*.6)*3;
        ctx.fillStyle='#4f9cae'; ctx.fillRect(tx,ty,TILE,TILE);
        px(ctx,tx+4,ty+8+wave,12,2,'rgba(203,246,245,.4)');
        px(ctx,tx+17,ty+21-wave,10,2,'rgba(203,246,245,.28)');
        px(ctx,tx,ty,TILE,2,'rgba(30,80,100,.22)');
        break;
      }
      case 'path':{
        ctx.fillStyle=h>0.5?'#b3a17e':'#a99876'; ctx.fillRect(tx,ty,TILE,TILE);
        ctx.strokeStyle='rgba(80,65,50,.3)'; ctx.lineWidth=1; ctx.strokeRect(tx+2.5,ty+2.5,TILE-5,TILE-5);
        break;
      }
      default:{
        ctx.fillStyle=h>0.55?'#6ea76a':'#69a065'; ctx.fillRect(tx,ty,TILE,TILE);
        const n=k=>hash2(x*7+k,y*11+k);
        if(n(1)>0.58){ px(ctx,tx+5+n(2)*18,ty+8+n(3)*15,2,5,'#4f8d56'); px(ctx,tx+7+n(2)*18,ty+7+n(3)*15,2,3,'#58995e'); }
        if(n(4)>0.78){ px(ctx,tx+22,ty+24,3,2,'#8fc078'); }
        if(n(5)>0.86){ px(ctx,tx+10,ty+14,3,3,'#e8d16c'); px(ctx,tx+11,ty+13,1,1,'#fff0a5'); }
        px(ctx,tx,ty+31,TILE,1,'rgba(47,96,52,.13)');
      }
    }
  }
  drawFloorObjects(lot){
    const walkables=lot.objects.filter(o=>objDef(o).walkable).sort((a,b)=>(a.y+0.01)-(b.y+0.01));
    walkables.forEach(o=>this.drawFurniture(o,true));
  }
  drawScene(lot,game){
    const drawables=[];
    lot.walls.forEach(w=>drawables.push({type:'wall',d:(w.y+1)*TILE-2,o:w}));
    lot.objects.filter(o=>!objDef(o).walkable).forEach(o=>drawables.push({type:'obj',d:(o.y+o.h)*TILE-2,o}));
    game.characters.forEach(c=>{
      if(c.hidden) return;
      let d=c.y*TILE+15, o={char:c};
      if(c.action && c.action.anim==='sleep'){
        const target=lot.objects.find(x=>x.uid===c.action.targetUid);
        if(target){ o.sleepTarget=target; d=(target.y+target.h)*TILE-1; }
      }
      drawables.push({type:'char',d,o});
    });
    (game.npcs||[]).forEach(c=>{ if(!c.hidden) drawables.push({type:'char',d:c.y*TILE+15,o:{char:c}}); });
    (game.pets||[]).forEach(p=>{ if(!p.hidden) drawables.push({type:'pet',d:p.y*TILE+13,o:p}); });
    drawables.sort((a,b)=>a.d-b.d || (a.type==='wall'?-1:1));
    drawables.forEach(item=>{
      if(item.type==='wall') this.drawWall(item.o);
      else if(item.type==='obj') this.drawFurniture(item.o,false);
      else if(item.type==='pet') this.drawPet(item.o);
      else {
        const c=item.o.char;
        if(item.o.sleepTarget){
          const t=item.o.sleepTarget;
          const sx=(t.x+t.w/2)*TILE, sy=(t.y+t.h*0.58)*TILE;
          drawPersonArt(this.ctx,sx,sy,c,{state:'sleep',scale:c.stageInfo.id==='bebe'?0.9:1.08,time:this.time,shadow:false});
          this.drawZzz(sx+18,sy-18);
        } else {
          const state=c.moving?'walk':(c.action?.anim||'idle');
          drawPersonArt(this.ctx,c.x*TILE,c.y*TILE+12,c,{state,walking:c.moving,walk:c.walkPhase,time:this.time});
          if(c.action && state==='shower'){
            for(let i=0;i<3;i++) px(this.ctx,c.x*TILE-8+i*7,c.y*TILE-34+Math.sin(this.time*4+i)*5,3,3,'rgba(210,245,250,.5)');
          }
        }
      }
    });
    this.drawCharacterLabels(game);
  }
  drawCharacterLabels(game){
    const ctx=this.ctx;
    [...game.characters,...(game.npcs||[])].forEach(c=>{
      if(c.hidden) return;
      const isSel=c.id===game.selectedId;
      const isNpc=c.isNPC;
      if(!isSel && !isNpc) return;
      const x=c.x*TILE, y=c.y*TILE-39;
      const label=c.name;
      ctx.font='bold 8px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      const tw=Math.max(28,ctx.measureText(label).width+10);
      ctx.fillStyle=isSel?'rgba(35,123,126,.9)':'rgba(40,31,52,.72)';
      ctx.fillRect(x-tw/2,y-7,tw,13);
      ctx.fillStyle=isSel?'#fff4d8':'#d5c6e4'; ctx.fillText(label,x,y);
      if(isSel){
        ctx.strokeStyle='rgba(255,209,102,.8)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.ellipse(x,c.y*TILE+12,13,5,0,0,Math.PI*2); ctx.stroke();
      }
    });
  }
  drawOverlayBubbles(game){
    [...game.characters,...(game.npcs||[])].forEach(c=>{
      if(c.hidden) return;
      if(c.speech){
        this.drawSpeech(c.x*TILE,c.y*TILE-48,c.speech,c.id===game.selectedId);
      } else if(c.thought && (c.id===game.selectedId || c.isNPC)){
        this.drawThought(c.x*TILE,c.y*TILE-45,c.thought);
      }
    });
  }
  roundedRect(ctx,x,y,w,h,r,fill,stroke){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  }
  drawSpeech(x,y,text,selected){
    const ctx=this.ctx;
    ctx.font='bold 9px "Trebuchet MS",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top';
    const max=135;
    const words=String(text).split(' '); const lines=[]; let line='';
    words.forEach(w=>{ const test=line?line+' '+w:w; if(ctx.measureText(test).width>max-14&&line){lines.push(line);line=w;} else line=test; });
    if(line)lines.push(line);
    const w=Math.max(42,Math.min(max,Math.max(...lines.map(l=>ctx.measureText(l).width))+14));
    const h=lines.length*11+10;
    ctx.fillStyle='rgba(15,11,22,.2)'; ctx.fillRect(x-w/2+2,y+2,w,h);
    this.roundedRect(ctx,x-w/2,y,w,h,6,selected?'#fff4d8':'#fff7e5','#33253f');
    px(ctx,x-3,y+h,6,5,selected?'#fff4d8':'#fff7e5');
    ctx.fillStyle='#2c213a';
    lines.forEach((l,i)=>ctx.fillText(l,x,y+5+i*11));
  }
  drawThought(x,y,icon){
    const ctx=this.ctx;
    ctx.fillStyle='rgba(255,244,216,.94)';
    ctx.beginPath(); ctx.ellipse(x,y,12,10,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(43,32,54,.55)'; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x+1,y+13,6,4.5,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x-8,y+18,2.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#2b2038'; ctx.fillText(icon,x,y+1);
  }
  drawZzz(x,y){
    const ctx=this.ctx; ctx.font='bold 10px monospace'; ctx.fillStyle='rgba(255,244,216,.8)';
    const bob=Math.sin(this.time*2)*3;
    ctx.fillText('z',x+Math.sin(this.time)*2,y+bob); ctx.font='bold 7px monospace';ctx.fillText('z',x+8,y+10+bob);
  }
  drawPet(pet){
    const ctx=this.ctx,x=pet.x*TILE,y=pet.y*TILE+10;
    ctx.fillStyle='rgba(20,15,25,.22)'; ctx.beginPath(); ctx.ellipse(x,y,9,3.5,0,0,Math.PI*2); ctx.fill();
    const color=pet.species==='cat'?'#c08a5a':'#c18c57';
    if(pet.species==='cat'){
      px(ctx,x-7,y-8,14,9,'#3a2830'); px(ctx,x-6,y-7,12,7,color);
      px(ctx,x-7,y-14,7,7,'#3a2830'); px(ctx,x-6,y-13,6,6,color);
      px(ctx,x-6,y-16,2,4,color); px(ctx,x-1,y-16,2,4,color);
      px(ctx,x+5,y-4,3,8,color); px(ctx,x+6,y-10,2,7,color);
      px(ctx,x-4,y-11,1,1,'#2a1d25'); px(ctx,x-1,y-11,1,1,'#2a1d25');
    } else {
      px(ctx,x-8,y-9,16,10,'#3a2830'); px(ctx,x-7,y-8,14,8,color);
      px(ctx,x+1,y-16,7,8,'#3a2830'); px(ctx,x+2,y-15,6,6,color);
      px(ctx,x+2,y-18,2,4,'#6b4831'); px(ctx,x+6,y-18,2,4,'#6b4831');
      px(ctx,x-9,y-12,3,7,color); px(ctx,x+7,y-12,2,5,color);
      px(ctx,x+2,y-12,1,1,'#24181d'); px(ctx,x+5,y-12,1,1,'#24181d');
      px(ctx,x+4,y-10,2,1,'#24181d');
    }
    const mood=pet.mood;
    if(mood==='triste') { ctx.font='8px sans-serif'; ctx.textAlign='center'; ctx.fillText('💧',x,y-22); }
  }

  /* ---------- Walls ---------- */
  drawWall(w){
    const ctx=this.ctx,x=w.x*TILE,y=w.y*TILE;
    const base=w.color||'#d2b386';
    if(w.type==='door'){
      px(ctx,x+4,y+28,TILE-8,3,'rgba(32,22,35,.22)');
      px(ctx,x+3,y+4,TILE-6,TILE-4,'#6d523b');
      px(ctx,x+6,y+6,TILE-12,TILE-6,'#463525');
      px(ctx,x+8,y+8,TILE-16,TILE-9,'#2b211c');
      px(ctx,x+9,y+29,TILE-18,3,'#b98b5c');
      px(ctx,x+TILE-8,y+12,2,4,'#d7b273');
      return;
    }
    px(ctx,x+2,y+10,TILE-4,TILE-8,'rgba(26,18,29,.22)');
    px(ctx,x,y+6,TILE,TILE-12,darken(base,26));
    px(ctx,x+2,y+7,TILE-4,TILE-14,base);
    px(ctx,x+2,y+7,TILE-4,7,lighten(base,22));
    px(ctx,x+2,y+14,TILE-4,2,darken(base,12));
    // brick texture
    px(ctx,x+7,y+18,12,1,darken(base,30)); px(ctx,x+22,y+25,8,1,darken(base,24));
    if(w.type==='window'){
      px(ctx,x+5,y+10,TILE-10,17,'#5c7278');
      px(ctx,x+7,y+12,TILE-14,13,'#8cccd8');
      px(ctx,x+7,y+12,TILE-14,5,'#b9e8ec');
      px(ctx,x+TILE/2-1,y+12,2,13,'#e7f7f0');
      px(ctx,x+8,y+18,TILE-16,1,'#e7f7f0');
      px(ctx,x+7,y+12,5,3,'rgba(255,255,255,.45)');
    }
    // wall top trim
    px(ctx,x+1,y+5,TILE-2,3,lighten(base,42));
    px(ctx,x+1,y+8,TILE-2,1,darken(base,20));
  }

  /* ---------- Furniture ---------- */
  drawFurniture(o,flat=false){
    const ctx=this.ctx, def=objDef(o), x=o.x*TILE, y=o.y*TILE, w=o.w*TILE, h=o.h*TILE;
    const col=o.color||def.color||'#b58c68';
    if(def.walkable){
      if(def.kind==='rug') this.drawRug(o);
      else if(def.kind==='tapete') this.drawRug(o);
      return;
    }
    if(!flat){
      ctx.fillStyle='rgba(25,17,27,.2)';
      ctx.beginPath(); ctx.ellipse(x+w/2,y+h-4,w*0.42,5,0,0,Math.PI*2); ctx.fill();
    }
    if(o.broken){
      px(ctx,x+5,y+5,3,3,'#5d4c4d');
      px(ctx,x+w-9,y+h*0.35,4,2,'#5d4c4d'); px(ctx,x+w-6,y+h*0.35-3,2,7,'#5d4c4d');
    }
    switch(def.kind){
      case 'fridge':
        px(ctx,x+5,y+3,w-10,h-6,'#56636a'); px(ctx,x+6,y+4,w-12,h-8,col);
        px(ctx,x+6,y+4,w-12,2,'#f1f6f2'); px(ctx,x+w/2,y+24,1,h-29,'#9cb1ae');
        px(ctx,x+w-12,y+17,3,12,'#7d8f8d'); px(ctx,x+w-12,y+34,3,9,'#7d8f8d');
        break;
      case 'stove':
        px(ctx,x+4,y+4,w-8,h-8,'#57565a'); px(ctx,x+5,y+5,w-10,h-10,col);
        px(ctx,x+7,y+8,w-14,12,'#282a2d');
        for(let i=0;i<4;i++){ ctx.strokeStyle='#6a6a6d';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x+12+(i%2)*10,y+12+Math.floor(i/2)*6,3,0,Math.PI*2);ctx.stroke(); }
        px(ctx,x+8,y+23,w-16,8,'#8b8d88'); px(ctx,x+10,y+25,w-20,4,'#3a3739');
        px(ctx,x+8,y+35,2,2,'#e2d6a8'); px(ctx,x+12,y+35,2,2,'#e2d6a8'); px(ctx,x+16,y+35,2,2,'#e2d6a8');
        break;
      case 'microwave':
        px(ctx,x+5,y+7,w-10,h-15,'#5d5f63'); px(ctx,x+6,y+8,w-12,h-17,col);
        px(ctx,x+8,y+10,w-20,10,'#3e4b51'); px(ctx,x+w-10,y+9,3,3,'#d8e4df');
        px(ctx,x+8,y+24,w-16,1,'#777');
        break;
      case 'counter':
      case 'desk':
        px(ctx,x+3,y+9,w-6,h-13,'#73513c'); px(ctx,x+4,y+8,w-8,6,lighten(col,12));
        px(ctx,x+5,y+14,w-10,h-19,darken(col,45));
        px(ctx,x+8,y+16,w/2-10,1,'#e7d1a4'); px(ctx,x+w-11,y+16,3,7,'#d6bf91');
        if(def.kind==='desk') px(ctx,x+w-8,y+10,3,6,'#e7d1a4');
        break;
      case 'sink':
        px(ctx,x+3,y+10,w-6,h-14,'#6e513d'); px(ctx,x+4,y+9,w-8,6,'#d8dece');
        px(ctx,x+8,y+12,w-16,10,'#7f9c9a'); px(ctx,x+10,y+13,w-20,7,'#a8c7c3');
        px(ctx,x+w/2,y+8,2,8,'#b6c6c4'); px(ctx,x+w/2+2,y+8,5,2,'#b6c6c4');
        break;
      case 'table':
      case 'coffeetable':
        px(ctx,x+3,y+9,w-6,5,lighten(col,20)); px(ctx,x+3,y+13,w-6,h-18,darken(col,26));
        px(ctx,x+6,y+13,4,h-19,darken(col,55)); px(ctx,x+w-10,y+13,4,h-19,darken(col,55));
        px(ctx,x+8,y+10,w/3,1,lighten(col,45));
        if(def.kind==='table'){
          px(ctx,x+w/2-5,y+11,10,7,'#f0e5c7'); px(ctx,x+w/2-3,y+12,6,5,'#d8bd84');
          px(ctx,x+w/2+7,y+11,3,3,'#7ea37d');
        }
        break;
      case 'chair':
        px(ctx,x+8,y+5,w-16,h-9,darken(col,20));
        px(ctx,x+7,y+4,w-14,6,lighten(col,12)); px(ctx,x+8,y+14,w-16,h-20,lighten(col,4));
        px(ctx,x+9,y+h-10,3,8,darken(col,55)); px(ctx,x+w-12,y+h-10,3,8,darken(col,55));
        break;
      case 'bed':
      case 'kidbed':
      case 'bunkbed':{
        px(ctx,x+3,y+4,w-6,h-10,'#4c383c');
        px(ctx,x+4,y+5,w-8,h-12,'#e9d7bb');
        px(ctx,x+4,y+9,w-8,h*.42,lighten(col,10));
        px(ctx,x+6,y+6,w-12,9,'#f7ecd3');
        px(ctx,x+7,y+8,w/2-12,5,'#fff8e7');
        px(ctx,x+w/2+5,y+8,w/2-12,5,'#fff8e7');
        px(ctx,x+5,y+23,w-10,h-30,darken(col,12));
        px(ctx,x+5,y+23,w-10,3,lighten(col,16));
        px(ctx,x+8,y+27,w-16,2,'rgba(255,255,255,.18)');
        if(def.kind==='bunkbed'){ px(ctx,x+4,y+h/2-3,w-8,4,'#5c403a'); }
        break;
      }
      case 'crib':
        px(ctx,x+4,y+7,w-8,h-13,'#72605a'); px(ctx,x+5,y+8,w-10,h-15,'#f3e8d5');
        for(let i=0;i<7;i++) px(ctx,x+6+i*5,y+3,2,7,'#b89671');
        px(ctx,x+8,y+11,w-16,9,'#fff7e4'); px(ctx,x+7,y+20,w-14,3,'#ddc8a8');
        break;
      case 'sofa':
        px(ctx,x+3,y+8,w-6,h-13,darken(col,30));
        px(ctx,x+2,y+9,w-4,8,lighten(col,16));
        px(ctx,x+4,y+17,w-8,8,lighten(col,5));
        px(ctx,x+3,y+14,7,12,darken(col,10)); px(ctx,x+w-10,y+14,7,12,darken(col,10));
        px(ctx,x+w/2-13,y+18,10,2,'rgba(255,255,255,.16)'); px(ctx,x+w/2+3,y+18,10,2,'rgba(255,255,255,.12)');
        break;
      case 'tv':
      case 'tv_grande':
        px(ctx,x+4,y+13,w-8,10,'#3d3133'); px(ctx,x+w/2-7,y+20,14,3,'#2b2228');
        px(ctx,x+6,y+8,w-12,13,'#22252b'); px(ctx,x+7,y+9,w-14,10,o.broken?'#474c54':o.lit===false?'#353a41':'#7cb4bd');
        if(!o.broken){ px(ctx,x+9,y+11,10,2,'rgba(255,255,255,.25)'); }
        break;
      case 'bookshelf':
        px(ctx,x+3,y+3,w-6,h-6,'#5d4030'); px(ctx,x+4,y+4,w-8,h-8,darken(col,22));
        for(let sy=0;sy<3;sy++){
          px(ctx,x+6,y+7+sy*10,w-12,1,'#3f2b22');
          for(let i=0;i<6;i++){const bc=['#d46b62','#e2b45e','#6e9d88','#7b85c4','#c884b5'][(i+sy+o.x+o.y)%5];px(ctx,x+7+i*4.2,y+3+sy*10,3,5,bc);}
        }
        px(ctx,x+4,y+4,3,14,'rgba(255,220,160,.1)');
        break;
      case 'shelf':
        px(ctx,x+3,y+14,w-6,4,'#6b4b35'); px(ctx,x+3,y+16,3,10,'#5b3e2b'); px(ctx,x+w-6,y+16,3,10,'#5b3e2b');
        px(ctx,x+7,y+10,5,4,'#d6b878'); px(ctx,x+14,y+11,4,3,'#7baa8e');
        break;
      case 'wardrobe':
        px(ctx,x+3,y+2,w-6,h-5,'#4b3743'); px(ctx,x+4,y+3,w-8,h-7,col);
        px(ctx,x+w/2,y+5,1,h-10,darken(col,35));
        px(ctx,x+w/2-5,y+15,2,7,'#e2c77e'); px(ctx,x+w/2+3,y+15,2,7,'#e2c77e');
        break;
      case 'dresser':
      case 'nightstand':
        px(ctx,x+4,y+9,w-8,h-13,'#5e4435'); px(ctx,x+5,y+10,w-10,h-15,col);
        px(ctx,x+w/2,y+13,1,h-20,darken(col,40));
        px(ctx,x+7,y+16,w/2-8,2,'#e5ce9d'); px(ctx,x+w/2+4,y+16,w/2-9,2,'#e5ce9d');
        break;
      case 'toilet':
        px(ctx,x+8,y+7,w-16,10,'#d9e2dd'); px(ctx,x+9,y+8,w-18,4,'#edf4ee');
        px(ctx,x+7,y+17,w-14,10,'#eff4ed'); ctx.strokeStyle='#b5c5bd';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x+w/2,y+21,7,4,0,0,Math.PI*2);ctx.stroke();
        px(ctx,x+9,y+26,w-18,3,'#c8d4ce');
        break;
      case 'shower':
        px(ctx,x+4,y+4,w-8,h-8,'#c4d8d5');
        px(ctx,x+6,y+6,w-12,h-12,'#a6c9c8');
        px(ctx,x+8,y+7,w-16,h-14,'rgba(156,210,216,.45)');
        px(ctx,x+w-10,y+8,2,8,'#d9e7e1'); px(ctx,x+w-15,y+15,7,2,'#d9e7e1');
        for(let i=0;i<4;i++) px(ctx,x+10+i*4,y+16+Math.sin(this.time*6+i)*2,2,3,'rgba(230,250,250,.5)');
        break;
      case 'bathtub':
        px(ctx,x+3,y+7,w-6,h-13,'#c7d8d3'); px(ctx,x+4,y+6,w-8,5,'#edf2eb');
        px(ctx,x+5,y+10,w-10,h-18,'#a4cdd2');
        for(let i=0;i<5;i++){ ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x+10+i*12,y+16+Math.sin(this.time*3+i)*2,4,0,Math.PI*2);ctx.stroke(); }
        break;
      case 'washer':
        px(ctx,x+4,y+5,w-8,h-9,'#5e676a'); px(ctx,x+5,y+6,w-10,h-11,col);
        px(ctx,x+w/2,y+18,10,10,'#4c5a5d'); ctx.strokeStyle='#bcd4d1';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+w/2,y+23,6,0,Math.PI*2);ctx.stroke();
        px(ctx,x+7,y+8,3,2,'#c9e2df');
        break;
      case 'plant':
        px(ctx,x+12,y+20,8,9,'#8a5a43'); px(ctx,x+13,y+21,6,3,'#a87355');
        px(ctx,x+7,y+8,7,13,'#4b8f58'); px(ctx,x+14,y+5,7,15,'#5da969'); px(ctx,x+18,y+12,6,11,'#437f50');
        px(ctx,x+10,y+3,6,12,'#68af6d'); px(ctx,x+11,y+4,2,7,'#91d18e');
        break;
      case 'tree':
        px(ctx,x+13,y+21,7,8,'#6c4931');
        px(ctx,x+4,y+4,24,19,'#3d774d'); px(ctx,x+7,y+2,17,18,'#4a8c57'); px(ctx,x+9,y+5,12,8,'#62a768');
        px(ctx,x+8,y+10,5,4,'#75b76e');
        break;
      case 'flowerbed':
        px(ctx,x+4,y+16,w-8,10,'#74523a'); px(ctx,x+5,y+17,w-10,8,'#65462f');
        for(let i=0;i<5;i++){ const fx=x+8+i*4.5, fy=y+13+Math.sin(this.time*1.5+i)*1; px(ctx,fx,fy,3,3,i%2?'#ff9ab7':'#ffe066'); px(ctx,fx+1,fy-4,1,4,'#5f9e5d'); }
        break;
      case 'garden':{
        px(ctx,x+3,y+4,w-6,h-7,'#6b4b34'); px(ctx,x+4,y+5,w-8,h-9,'#593e2b');
        for(let i=0;i<3;i++) px(ctx,x+5,y+9+i*6,w-10,1,'#4a3223');
        const gd=o.garden;
        if(gd?.planted){
          const crop=CROPS.find(c=>c.id===gd.planted)||CROPS[0];
          const stages=Math.min(4,Math.floor(gd.growth/25));
          for(let i=0;i<3;i++){
            const bx=x+8+i*8,by=y+21;
            if(stages===0) px(ctx,bx,by,2,3,'#74a95a');
            else if(stages<3){ px(ctx,bx,by-4,2,7,'#62994f'); px(ctx,bx-2,by-4,2,3,'#78ab5a'); }
            else { px(ctx,bx,by-7,2,10,'#4f8c45'); px(ctx,bx-3,by-7,3,3,crop.icon==='🌻'?'#f0d153':'#78b85e'); px(ctx,bx+2,by-9,2,3,'#d56e7c'); }
          }
          if(gd.growth>=100){ ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('✨',x+w/2,y+7); }
          if(gd.watered) px(ctx,x+w-8,y+h-7,3,3,'#6cc5dc');
        } else {
          px(ctx,x+5,y+8,4,1,'#8a6547'); px(ctx,x+10,y+15,4,1,'#8a6547');
        }
        break;
      }
      case 'bench':
        px(ctx,x+3,y+12,w-6,5,lighten(col,12)); px(ctx,x+3,y+8,w-6,4,lighten(col,18));
        px(ctx,x+5,y+17,3,11,darken(col,45)); px(ctx,x+w-8,y+17,3,11,darken(col,45));
        break;
      case 'bbq':
        px(ctx,x+5,y+13,w-10,h-18,'#494d4d'); px(ctx,x+7,y+15,w-14,h-21,'#5d6260');
        ctx.strokeStyle='#34393a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+w/2,y+22,6,0,Math.PI*2);ctx.stroke();
        px(ctx,x+6,y+9,w-12,5,'#787b78');
        if(o.lit!==false){ for(let i=0;i<3;i++){ px(ctx,x+8+i*5,y+5+Math.sin(this.time*3+i)*2,2,4,'#e8704e'); px(ctx,x+9+i*5,y+3,2,2,'#ffd166'); } }
        break;
      case 'pool':
        px(ctx,x+2,y+2,w-4,h-4,'#7ca9ae');
        px(ctx,x+4,y+4,w-8,h-8,'#6bc4d4');
        for(let i=0;i<5;i++){ px(ctx,x+10+((i*23+Math.sin(this.time+i)*4)%(w-20)),y+13+i*9,w/4,2,'rgba(214,250,249,.35)'); }
        px(ctx,x+2,y+2,w-4,2,'#d3e3d9'); px(ctx,x+2,y+h-5,w-4,3,'#bdd1c9');
        break;
      case 'mailbox':
        px(ctx,x+14,y+18,4,10,'#6b5744'); px(ctx,x+7,y+8,18,12,'#5e8277'); px(ctx,x+8,y+9,16,6,'#7ca99b');
        px(ctx,x+21,y+5,2,7,'#d14d4d'); px(ctx,x+20,y+4,4,3,'#d14d4d');
        break;
      case 'trash':
      case 'lixeira':
        px(ctx,x+7,y+10,w-14,h-15,'#486254'); px(ctx,x+6,y+8,w-12,4,'#6b8271'); px(ctx,x+12,y+12,2,4,'#90a894');
        if(def.kind==='lixeira') px(ctx,x+10,y+15,10,1,'#2f4138');
        break;
      case 'lamp':
        if(def.id==='luminaria_pe'){
          px(ctx,x+15,y+14,2,18,'#5b4b43'); px(ctx,x+8,y+4,16,10,'#f2d58a'); px(ctx,x+10,y+6,12,4,'#ffeab1');
          if(o.lit) { px(ctx,x+13,y+15,6,3,'#fff0a0'); }
        } else {
          px(ctx,x+9,y+10,14,10,'#d9aa61'); px(ctx,x+10,y+11,12,7,'#f5d88c'); px(ctx,x+14,y+20,4,8,'#755d49');
          if(o.lit) px(ctx,x+14,y+8,4,4,'#fff3b0');
        }
        break;
      case 'chandelier':
        px(ctx,x+14,y+2,3,8,'#6b5a48');
        px(ctx,x+5,y+9,w-10,3,'#c7a45f');
        for(let i=0;i<4;i++){ px(ctx,x+7+i*5,y+12,3,3,o.lit?'#ffe082':'#8a7b63'); if(o.lit) px(ctx,x+8+i*5,y+15,1,2,'#fff4b0'); }
        break;
      case 'stringlights':
        ctx.strokeStyle='#615044';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+2,y+8);ctx.quadraticCurveTo(x+w/2,y+16,x+w-2,y+8);ctx.stroke();
        for(let i=0;i<6;i++) px(ctx,x+5+i*(w-10)/5,y+10+Math.sin(i)*2,3,3,i%2?(o.lit?'#ff8f9f':'#6e5a63'):(o.lit?'#ffe082':'#6d6650'));
        break;
      case 'candles':
        px(ctx,x+11,y+17,5,9,'#d9b3a0'); px(ctx,x+18,y+13,4,13,'#b9d1c1');
        if(o.lit){ px(ctx,x+12,y+13,3,4,'#ffd166'); px(ctx,x+19,y+9,2,4,'#ffb85c'); }
        break;
      case 'fireplace':
        px(ctx,x+4,y+8,w-8,h-12,'#614c46'); px(ctx,x+6,y+10,w-12,h-18,'#3d302f');
        px(ctx,x+10,y+17,w-20,12,'#6b392d');
        for(let i=0;i<4;i++){ px(ctx,x+12+i*6,y+20+Math.sin(this.time*4+i)*3,4,6,'#e8704e'); px(ctx,x+13+i*6,y+18,2,3,'#ffd166'); }
        px(ctx,x+8,y+6,w-16,4,'#8b6b5c');
        break;
      case 'computer':
        px(ctx,x+3,y+14,w-6,4,'#5b4437'); px(ctx,x+6,y+17,3,10,'#4d3a2e'); px(ctx,x+w-9,y+17,3,10,'#4d3a2e');
        px(ctx,x+9,y+5,16,11,'#353c46'); px(ctx,x+10,y+6,14,8,'#6fb5be'); px(ctx,x+11,y+7,5,2,'rgba(255,255,255,.3)');
        px(ctx,x+16,y+16,2,3,'#3c3739'); px(ctx,x+8,y+19,16,2,'#d8d3c3'); px(ctx,x+9,y+17,14,1,'#b9b4a5');
        break;
      case 'gameconsole':
        px(ctx,x+6,y+12,20,11,'#444552'); px(ctx,x+8,y+13,16,8,'#2f303b'); px(ctx,x+14,y+7,4,5,'#676b78');
        px(ctx,x+9,y+15,3,2,'#7b8d7c'); px(ctx,x+15,y+15,2,2,'#d96a6a');
        break;
      case 'stereo':
        px(ctx,x+5,y+11,w-10,h-14,'#3e3b44'); px(ctx,x+7,y+13,w-14,7,'#292a31');
        ctx.strokeStyle='#8e8a96';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x+11,y+16,3,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x+21,y+16,3,0,Math.PI*2);ctx.stroke();
        px(ctx,x+8,y+22,w-16,3,'#b6a65d');
        break;
      case 'easel':
        px(ctx,x+8,y+3,17,19,'#d8c7a2'); px(ctx,x+9,y+4,15,17,'#f0e7d2');
        px(ctx,x+11,y+7,10,9,['#e68c78','#7fb7a2','#d5b45e'][(o.x+o.y)%3]);
        px(ctx,x+10,y+22,3,3,'#60463a'); px(ctx,x+20,y+22,3,3,'#60463a');
        px(ctx,x+16,y+22,2,8,'#60463a'); px(ctx,x+7,y+31,20,2,'#60463a');
        break;
      case 'guitar':
        ctx.fillStyle='#a26b42'; ctx.beginPath(); ctx.ellipse(x+14,y+22,8,10,-0.3,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#c1895e'; ctx.beginPath(); ctx.ellipse(x+14,y+21,5,7,-0.3,0,Math.PI*2); ctx.fill();
        px(ctx,x+19,y+8,3,13,'#5f4031'); px(ctx,x+20,y+5,4,5,'#3f2e2a');
        ctx.strokeStyle='#e2d3b0';ctx.lineWidth=0.7;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x+20+i,y+9);ctx.lineTo(x+13+i,y+28);ctx.stroke();}
        break;
      case 'piano':
        px(ctx,x+3,y+8,w-6,h-13,'#3d3339'); px(ctx,x+4,y+9,w-8,7,'#56474e');
        for(let i=0;i<11;i++){ px(ctx,x+6+i*(w-12)/11,y+15,Math.max(2,(w-14)/11-1),6,'#eee6d3'); }
        px(ctx,x+5,y+23,w-10,3,'#251f25'); px(ctx,x+8,y+27,w-16,2,'#7d6a63');
        break;
      case 'workbench':
        px(ctx,x+3,y+9,w-6,h-12,'#6c513c'); px(ctx,x+4,y+8,w-8,4,'#a57b54');
        px(ctx,x+7,y+11,4,5,'#b6aa91'); px(ctx,x+13,y+12,6,3,'#57707a'); px(ctx,x+21,y+10,3,8,'#8b8b78');
        px(ctx,x+4,y+17,3,h-22,'#4e3a2e'); px(ctx,x+w-7,y+17,3,h-22,'#4e3a2e');
        break;
      case 'gym':
        px(ctx,x+9,y+19,w-18,3,'#464b52'); px(ctx,x+8,y+17,3,7,'#2f3136'); px(ctx,x+w-11,y+17,3,7,'#2f3136');
        px(ctx,x+6,y+9,w-12,2,'#7b8088'); px(ctx,x+7,y+9,2,h-14,'#5e636b'); px(ctx,x+w-9,y+9,2,h-14,'#5e636b');
        break;
      case 'treadmill':
        px(ctx,x+5,y+12,w-10,h-17,'#3c4148'); px(ctx,x+7,y+14,w-20,8,'#282b31');
        px(ctx,x+8,y+23,w-16,3,'#626a72'); px(ctx,x+w-12,y+7,2,9,'#7f858c'); px(ctx,x+w-20,y+6,9,2,'#9aa0a6');
        break;
      case 'telescope':
        px(ctx,x+15,y+18,2,12,'#4e4a55'); px(ctx,x+9,y+29,14,2,'#5f5a64');
        ctx.save();ctx.translate(x+15,y+15);ctx.rotate(-0.55);px(ctx,-4,-4,16,7,'#52616f');px(ctx,10,-5,4,9,'#7f97a5');ctx.restore();
        break;
      case 'sewing':
        px(ctx,x+5,y+13,w-10,h-17,'#5b4455'); px(ctx,x+7,y+14,w-14,5,'#8c6a80'); px(ctx,x+10,y+5,5,10,'#c9b8c9'); px(ctx,x+18,y+8,10,3,'#d8cfdb');
        px(ctx,x+11,y+19,2,5,'#4b3646'); px(ctx,x+w-12,y+19,2,5,'#4b3646');
        break;
      case 'mirror':
        px(ctx,x+8,y+3,w-16,h-5,'#8c6a47'); px(ctx,x+9,y+4,w-18,h-7,'#a8d4d5'); px(ctx,x+11,y+6,4,14,'rgba(255,255,255,.35)');
        break;
      case 'painting_decor':
        px(ctx,x+6,y+5,w-12,h-10,'#6b4b36'); px(ctx,x+8,y+7,w-16,h-14,['#d78c6d','#7baf9a','#dcbf65'][(o.x+o.y)%3]);
        px(ctx,x+11,y+9,6,4,'#f0d18a'); px(ctx,x+20,y+14,5,5,'#587d86');
        break;
      case 'sculpture':
        px(ctx,x+12,y+17,8,8,'#8e7c6d'); px(ctx,x+10,y+9,7,9,'#b0a18e'); px(ctx,x+17,y+12,6,6,'#998978'); px(ctx,x+18,y+5,4,7,'#c4b4a0');
        break;
      case 'decor':
        px(ctx,x+9,y+13,w-18,12,'#8b6049'); px(ctx,x+11,y+10,w-22,4,'#c58f65');
        px(ctx,x+11,y+5,2,7,'#5c8c5a'); px(ctx,x+14,y+4,4,4,'#d87b8e');
        break;
      case 'fountain':
        ctx.fillStyle='#8ba6a8';ctx.beginPath();ctx.ellipse(x+w/2,y+h/2+10,w/2-4,h/2-4,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#6fc1cb';ctx.beginPath();ctx.ellipse(x+w/2,y+h/2+10,w/2-10,h/2-10,0,0,Math.PI*2);ctx.fill();
        px(ctx,x+w/2-3,y+23,6,19,'#a7b7b2');
        ctx.fillStyle='#9dcfd2';ctx.beginPath();ctx.ellipse(x+w/2,y+20,12,4,0,0,Math.PI*2);ctx.fill();
        for(let i=0;i<5;i++) px(ctx,x+w/2-4+i*2,y+4+Math.sin(this.time*3+i)*3,1,11,'rgba(194,244,247,.6)');
        break;
      case 'swing':
        px(ctx,x+5,y+4,3,h-5,'#76533e'); px(ctx,x+w-8,y+4,3,h-5,'#76533e'); px(ctx,x+5,y+4,w-10,3,'#8d664a');
        px(ctx,x+w/2-6,y+10,12,3,'#c98c66'); px(ctx,x+w/2-5,y+13,1,10,'#7b5a44'); px(ctx,x+w/2+4,y+13,1,10,'#7b5a44');
        break;
      case 'playhouse':
        px(ctx,x+5,y+9,w-10,h-12,'#b97762'); px(ctx,x+3,y+9,w-6,5,'#8f4f4b');
        px(ctx,x+10,y+17,8,h-20,'#5d4939'); px(ctx,x+w-20,y+14,8,8,'#ffe08a');
        px(ctx,x+w/2-4,y+3,8,7,'#8f4f4b');
        break;
      case 'toy':
        px(ctx,x+12,y+18,8,8,'#d98f6f'); px(ctx,x+10,y+15,4,5,'#b7745c'); px(ctx,x+19,y+15,4,5,'#b7745c');
        px(ctx,x+14,y+20,2,2,'#33262e'); px(ctx,x+18,y+20,2,2,'#33262e');
        break;
      case 'petbed':
        ctx.fillStyle='#8b6472';ctx.beginPath();ctx.ellipse(x+w/2,y+22,12,7,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#d5a4ad';ctx.beginPath();ctx.ellipse(x+w/2,y+21,9,5,0,0,Math.PI*2);ctx.fill();
        break;
      case 'petbowl':
        px(ctx,x+7,y+19,8,6,'#7a99a1'); px(ctx,x+18,y+19,7,6,'#b18c69'); px(ctx,x+9,y+20,4,1,'#d4d0a1'); px(ctx,x+20,y+20,3,1,'#a46048');
        break;
      case 'pettoy':
        ctx.fillStyle='#d9b85e';ctx.beginPath();ctx.arc(x+w/2,y+22,5,0,Math.PI*2);ctx.fill(); px(ctx,x+15,y+18,2,2,'#fff0a0');
        break;
      case 'scratchingpost':
        px(ctx,x+14,y+21,4,9,'#b19272'); px(ctx,x+12,y+5,8,17,'#c0a07b'); px(ctx,x+10,y+13,12,3,'#8f7258');
        break;
      case 'pethouse':
        px(ctx,x+4,y+11,w-8,h-14,'#a8795d'); px(ctx,x+2,y+11,w-4,4,'#7c5141'); px(ctx,x+9,y+18,10,h-21,'#4a3833');
        px(ctx,x+w/2-7,y+7,14,5,'#7c5141');
        break;
      case 'lounger':
        px(ctx,x+4,y+15,w-8,3,'#e5b85d'); px(ctx,x+5,y+17,3,11,'#bf8e47'); px(ctx,x+w-8,y+17,3,11,'#bf8e47');
        px(ctx,x+5,y+9,w-10,7,'#f0cb79'); px(ctx,x+6,y+10,w-12,2,'#ffe5a7');
        break;
      default:{
        // generic furniture crate with category color and tiny emblem
        const catCol=col;
        px(ctx,x+4,y+7,w-8,h-11,darken(catCol,28));
        px(ctx,x+5,y+8,w-10,h-13,catCol);
        px(ctx,x+7,y+10,w-14,3,lighten(catCol,25));
        px(ctx,x+w/2-2,y+h/2-2,4,4,darken(catCol,55));
        break;
      }
    }
    this.drawObjectState(o,x,y,w,h,def);
  }
  drawRug(o){
    const ctx=this.ctx,def=objDef(o),x=o.x*TILE+3,y=o.y*TILE+5,w=o.w*TILE-6,h=o.h*TILE-8;
    const col=o.color||def.color||'#aa896d';
    ctx.fillStyle=darken(col,25);ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2-4,h/2-4,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=lighten(col,30);ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2-9,h/2-7,0,0,Math.PI*2);ctx.stroke();
    px(ctx,x+w/2-3,y+h/2-2,6,4,lighten(col,18));
  }
  drawObjectState(o,x,y,w,h,def){
    if(o.dirty>55){
      for(let i=0;i<3;i++){ const t=this.time*2+i*2; px(this.ctx,x+8+Math.sin(t)*5+i*5,y+8+Math.cos(t)*3,2,2,'#c9c46f'); }
      px(this.ctx,x+5,y+h-6,3,1,'rgba(111,129,67,.4)');
    }
    if(o.burning){
      for(let i=0;i<5;i++){
        const fx=x+8+i*(w-16)/5, fy=y+3+Math.sin(this.time*5+i)*4;
        px(this.ctx,fx,fy,5,10,'#e35e3d'); px(this.ctx,fx+1,fy+3,3,7,'#ff9b4a'); px(this.ctx,fx+2,fy,1,3,'#ffe57a');
        this.ctx.fillStyle='rgba(255,190,90,.12)';this.ctx.beginPath();this.ctx.arc(fx+2,fy,16,0,Math.PI*2);this.ctx.fill();
      }
    }
    if(o.upgraded>0){
      for(let i=0;i<o.upgraded;i++) px(this.ctx,x+w-7-i*3,y+3,2,2,'#ffe082');
    }
    if(o.lit && ['lamp','chandelier','candles','stringlights','fireplace'].includes(def.kind)){
      this.ctx.fillStyle='rgba(255,210,110,.10)';this.ctx.beginPath();this.ctx.arc(x+w/2,y+h/2,24,0,Math.PI*2);this.ctx.fill();
    }
  }

  /* ---------- Build overlays ---------- */
  drawGridOverlay(lot){
    const ctx=this.ctx;
    ctx.strokeStyle='rgba(255,244,216,.11)'; ctx.lineWidth=1;
    ctx.beginPath();
    for(let x=0;x<=lot.w;x++){ctx.moveTo(x*TILE,0);ctx.lineTo(x*TILE,lot.h*TILE);}
    for(let y=0;y<=lot.h;y++){ctx.moveTo(0,y*TILE);ctx.lineTo(lot.w*TILE,y*TILE);}
    ctx.stroke();
    ctx.fillStyle='rgba(115,223,180,.018)';ctx.fillRect(0,0,lot.w*TILE,lot.h*TILE);
  }
  drawBuildGhost(game){
    const ctx=this.ctx,ghost=game.ghost;
    if(game.mode==='buy'&&game.buySelection){
      const def=CATALOG_MAP[game.buySelection];
      if(def&&ghost){
        const check=game.canPlaceObject(def,ghost.x,ghost.y);
        ctx.fillStyle=check.ok?'rgba(115,223,180,.32)':'rgba(235,94,85,.35)';
        ctx.fillRect(ghost.x*TILE,ghost.y*TILE,def.w*TILE,def.h*TILE);
        ctx.strokeStyle=check.ok?'#73dfb4':'#ff7163';ctx.lineWidth=2;
        ctx.strokeRect(ghost.x*TILE+1,ghost.y*TILE+1,def.w*TILE-2,def.h*TILE-2);
      }
    } else if(game.mode==='build'&&ghost){
      const tool=game.buildTool;
      if(['wall','door','window'].includes(tool)){
        ctx.fillStyle='rgba(255,209,102,.3)';ctx.fillRect(ghost.x*TILE,ghost.y*TILE,TILE,TILE);
        ctx.strokeStyle='#ffd166';ctx.lineWidth=2;ctx.strokeRect(ghost.x*TILE+1,ghost.y*TILE+1,TILE-2,TILE-2);
      } else {
        ctx.fillStyle='rgba(115,223,180,.24)';ctx.fillRect(ghost.x*TILE,ghost.y*TILE,TILE,TILE);
        ctx.strokeStyle='#73dfb4';ctx.lineWidth=2;ctx.strokeRect(ghost.x*TILE+1,ghost.y*TILE+1,TILE-2,TILE-2);
      }
    }
  }

  /* ---------- Lighting / weather ---------- */
  drawLighting(lot,game){
    const ctx=this.ctx; const hour=game.time.minutes/60;
    let dark=0;
    if(hour<5) dark=.58; else if(hour<7) dark=lerp(.58,.05,(hour-5)/2); else if(hour<17.5) dark=.02;
    else if(hour<20) dark=lerp(.03,.55,(hour-17.5)/2.5); else dark=.58;
    if(game.weather==='storm') dark=Math.max(dark,.3);
    if(game.weather==='rain') dark=Math.max(dark,.16);
    if(dark<=0.025) return;
    ctx.save();
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    const grd=ctx.createLinearGradient(0,0,0,this.height);
    grd.addColorStop(0,`rgba(20,25,62,${dark})`); grd.addColorStop(1,`rgba(8,10,32,${dark*0.82})`);
    ctx.fillStyle=grd; ctx.fillRect(0,0,this.width,this.height);
    // warm light pools
    ctx.globalCompositeOperation='lighter';
    lot.objects.filter(o=>o.lit && ['lamp','chandelier','candles','stringlights','fireplace','fogao','churrasqueira','fogueira'].includes(objDef(o).kind)||o.burning).forEach(o=>{
      const p=this.camera.worldToScreen((o.x+o.w/2)*TILE,(o.y+o.h/2)*TILE);
      const radius=(o.burning?90:68)*this.camera.zoom;
      const g=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,radius);
      g.addColorStop(0,o.burning?'rgba(255,135,70,.34)':'rgba(255,205,115,.22)');
      g.addColorStop(1,'rgba(255,190,90,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
    });
    if(game.worldWindowLight!==false){
      lot.walls.filter(w=>w.type==='window').forEach(w=>{
        const p=this.camera.worldToScreen((w.x+.5)*TILE,(w.y+.5)*TILE);
        const g=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,45*this.camera.zoom);
        g.addColorStop(0,'rgba(120,170,210,.06)');g.addColorStop(1,'rgba(80,120,180,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,45*this.camera.zoom,0,Math.PI*2);ctx.fill();
      });
    }
    ctx.restore();
  }
  drawWeather(){
    const ctx=this.ctx, weather=this.game?.weather;
    if(weather==='rain'||weather==='storm'){
      ctx.save();ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      ctx.strokeStyle=weather==='storm'?'rgba(175,205,235,.42)':'rgba(180,215,235,.3)'; ctx.lineWidth=1;
      this.rain.forEach(r=>{ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-3,r.y+r.size);ctx.stroke();});
      if(this.lightning>0){ ctx.fillStyle=`rgba(220,235,255,${this.lightning*0.45})`;ctx.fillRect(0,0,this.width,this.height); }
      ctx.restore();
    }
    if(weather==='cold'){
      ctx.save();ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.rain.forEach((r,i)=>{ctx.fillStyle='rgba(235,245,255,.42)';ctx.fillRect((r.x+Math.sin(this.time+i)*20)%this.width,(r.y+this.time*20+i*30)%this.height,2,2);});
      ctx.restore();
    }
  }
  drawScreenVignette(game){
    const ctx=this.ctx;
    ctx.save();ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    const g=ctx.createRadialGradient(this.width/2,this.height*.42,Math.min(this.width,this.height)*.35,this.width/2,this.height*.42,Math.max(this.width,this.height)*.75);
    g.addColorStop(0,'rgba(12,9,18,0)');g.addColorStop(1,'rgba(12,9,18,.34)');
    ctx.fillStyle=g;ctx.fillRect(0,0,this.width,this.height);
    ctx.restore();
  }
}
