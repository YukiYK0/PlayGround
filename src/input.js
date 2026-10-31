/* ============================================================
   INPUT — touch, mouse, long-press, pinch, drag, build placement
   ============================================================ */

class Input {
  constructor(canvas,renderer,game){
    this.canvas=canvas; this.renderer=renderer; this.game=game;
    this.pointers=new Map();
    this.dragStart=null; this.dragLast=null; this.dragging=false;
    this.longTimer=null; this.longFired=false;
    this.pinchDist=0; this.pinchCenter=null;
    this.hover=null; this.paintTile=null; this.appliedDown=false;
    this.bind();
  }
  bind(){
    const c=this.canvas;
    c.addEventListener('pointerdown',e=>this.down(e),{passive:false});
    c.addEventListener('pointermove',e=>this.move(e),{passive:false});
    c.addEventListener('pointerup',e=>this.up(e),{passive:false});
    c.addEventListener('pointercancel',e=>this.up(e),{passive:false});
    c.addEventListener('contextmenu',e=>e.preventDefault());
    c.addEventListener('wheel',e=>{
      if(!this.game?.started) return;
      e.preventDefault();
      this.renderer.zoom(e.deltaY<0?1.12:0.89);
    },{passive:false});
    window.addEventListener('keydown',e=>{
      if(!this.game?.started) return;
      if(e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if(e.code==='Space'){ e.preventDefault(); this.game.toggleSpeedPause(); }
      if(e.code==='Digit1') this.game.setSpeed(1);
      if(e.code==='Digit2') this.game.setSpeed(2);
      if(e.code==='Digit3') this.game.setSpeed(3);
      if(e.code==='KeyC'){ if(this.game.ui) this.game.ui.openCharacterPanel('needs'); }
      if(e.code==='KeyB') this.game.setMode('buy');
      if(e.code==='KeyU') this.game.setMode('build');
      if(e.code==='KeyM') this.game.setMode('map');
      if(e.code==='KeyP') this.game.setMode('phone');
      if(e.code==='Escape'){ if(this.game.mode!=='live') this.game.exitBuild(); }
      if(e.code==='KeyZ'&&(e.ctrlKey||e.metaKey)) this.game.undoLast();
      if(e.code==='ArrowLeft'){this.renderer.camera.panBy(40,0);}
      if(e.code==='ArrowRight'){this.renderer.camera.panBy(-40,0);}
      if(e.code==='ArrowUp'){this.renderer.camera.panBy(0,40);}
      if(e.code==='ArrowDown'){this.renderer.camera.panBy(0,-40);}
    });
  }
  local(e){ const r=this.canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  world(e){ const p=this.local(e); return this.renderer.camera.screenToWorld(p.x,p.y); }
  tile(e){ const w=this.world(e); return {x:Math.floor(w.x),y:Math.floor(w.y)}; }
  down(e){
    if(!this.game?.started) return;
    e.preventDefault();
    this.game.audio.resume();
    try{ this.canvas.setPointerCapture(e.pointerId); }catch(err){}
    const p=this.local(e);
    this.pointers.set(e.pointerId,{...p,startX:p.x,startY:p.y,startTime:performance.now()});
    if(this.pointers.size===2){
      this.cancelLong();
      const pts=[...this.pointers.values()];
      this.pinchDist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      this.pinchCenter={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
      return;
    }
    if(this.pointers.size>2) return;
    this.dragStart={...p}; this.dragLast={...p}; this.dragging=false; this.longFired=false;
    this.appliedDown=false;
    const t=this.tile(e); this.hover=t; this.updateGhost(t);
    this.cancelLong();
    this.longTimer=setTimeout(()=>{
      if(!this.dragging && this.pointers.size===1 && !this.longFired){
        this.longFired=true; this.handleLongPress(t.x,t.y);
        if(navigator.vibrate) try{navigator.vibrate(18);}catch(err){}
      }
    },470);
    if(this.game.mode==='build' && this.game.buildTool!=='paint'){
      this.paintTile=t; this.applyBuildAt(t); this.appliedDown=true;
    }
  }
  move(e){
    if(!this.game?.started) return;
    // Desktop: track the tile under the mouse even without a held button.
    if(e.pointerType==='mouse' && this.pointers.size===0){
      const t=this.tile(e); this.hover=t; this.updateGhost(t);
      return;
    }
    if(this.pointers.has(e.pointerId)){
      const p=this.local(e); const rec=this.pointers.get(e.pointerId);
      rec.x=p.x; rec.y=p.y;
    }
    if(this.pointers.size===2){
      e.preventDefault();
      const pts=[...this.pointers.values()];
      const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const center={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
      if(this.pinchDist>0){
        const factor=clamp(dist/this.pinchDist,0.7,1.4);
        this.renderer.camera.zoomBy(factor,center.x,center.y);
      }
      this.pinchDist=dist; this.pinchCenter=center;
      return;
    }
    if(this.pointers.size!==1 || !this.dragStart) return;
    e.preventDefault();
    const p=this.local(e);
    const dx=p.x-this.dragLast.x, dy=p.y-this.dragLast.y;
    const total=Math.hypot(p.x-this.dragStart.x,p.y-this.dragStart.y);
    if(total>8){ this.dragging=true; this.renderer.camera.panBy(dx,dy); this.cancelLong(); }
    this.dragLast={...p};
    const t=this.tile(e); this.hover=t; this.updateGhost(t);
    if(this.game.mode==='build' && this.game.buildTool!=='paint' && this.appliedDown && total>5 &&
       (!this.paintTile || this.paintTile.x!==t.x || this.paintTile.y!==t.y)){
      this.paintTile=t; this.applyBuildAt(t);
    }
  }
  up(e){
    if(!this.game?.started) return;
    const rec=this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    this.cancelLong();
    if(this.pointers.size===1){
      const rem=[...this.pointers.values()][0];
      this.dragStart={x:rem.x,y:rem.y}; this.dragLast={x:rem.x,y:rem.y}; this.dragging=false;
    }
    if(this.pointers.size===0){
      this.pinchDist=0; this.pinchCenter=null;
      if(!rec) return;
      const p=this.local(e);
      const dist=Math.hypot(p.x-(rec.startX??rec.x),p.y-(rec.startY??rec.y));
      if(!this.dragging && !this.longFired && dist<12){
        if(this.game.mode==='build'){
          if(this.game.buildTool==='paint'){ this.applyBuildAt(this.tile(e)); }
          else if(!this.appliedDown){ this.applyBuildAt(this.tile(e)); }
        } else {
          this.tap(p.x,p.y);
        }
      }
      this.dragStart=null; this.dragLast=null; this.dragging=false; this.longFired=false; this.appliedDown=false;
    }
  }
  cancelLong(){ if(this.longTimer){clearTimeout(this.longTimer);this.longTimer=null;} }
  updateGhost(t){
    this.game.ghost={x:t.x,y:t.y};
    if(this.game.mode==='buy'||this.game.mode==='build') this.renderer.gestureDirty=true;
  }
  applyBuildAt(t){
    if(!this.game.currentLot.inBounds(t.x,t.y)) return;
    this.game.applyBuildTool(t.x,t.y);
  }
  tap(sx,sy){
    const w=this.renderer.camera.screenToWorld(sx,sy);
    const g=this.game, lot=g.currentLot;
    if(g.mode==='buy'){
      const defId=g.buySelection;
      if(!defId){ if(g.ui) g.ui.toast('Escolha um móvel no catálogo.','info'); return; }
      const def=CATALOG_MAP[defId];
      if(!def) return;
      g.placeObject(defId,Math.floor(w.x),Math.floor(w.y));
      return;
    }
    if(g.mode==='build'){ this.applyBuildAt({x:Math.floor(w.x),y:Math.floor(w.y)}); return; }
    if(g.mode!=='live') return;
    const pet=g.nearestPet(w.x,w.y,0.85);
    if(pet){ if(g.ui) g.ui.showPetMenu(pet); return; }
    const person=g.nearestCharacter(w.x,w.y,0.85);
    if(person){
      if(person.isNPC){ if(g.ui) g.ui.showSocialMenu(person); }
      else if(person.id!==g.selectedId){ g.selectCharacter(person.id); if(g.ui)g.ui.toast(`Controlando ${person.name}.`,'👤'); }
      else if(g.ui) g.ui.openCharacterPanel('needs');
      return;
    }
    const obj=g.nearestObjectAt(w.x,w.y,true);
    if(obj){
      g.selectedObjectUid=obj.uid;
      if(g.ui) g.ui.showObjectMenu(obj);
      return;
    }
    const tx=Math.floor(w.x),ty=Math.floor(w.y);
    if(lot.inBounds(tx,ty)) g.moveToTile(tx,ty);
  }
  handleLongPress(tx,ty){
    const g=this.game, lot=g.currentLot;
    if(g.mode==='buy'||g.mode==='build') return;
    const w={x:tx+0.5,y:ty+0.5};
    const pet=g.nearestPet(w.x,w.y,0.9);
    if(pet){ if(g.ui) g.ui.showPetMenu(pet); return; }
    const person=g.nearestCharacter(w.x,w.y,0.9);
    if(person){ if(g.ui) g.ui.showSocialMenu(person); return; }
    const obj=g.nearestObjectAt(tx,ty,true);
    if(obj){ if(g.ui) g.ui.showObjectMenu(obj); return; }
    if(lot.inBounds(tx,ty) && g.ui) g.ui.showTileMenu(tx,ty);
  }
}