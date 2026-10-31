/* ============================================================
   UI — HUD, menus, character sheet, phone, build, buy, creation
   ============================================================ */

const NEED_COLORS = v => v>62?'#73dfb4':v>34?'#ffd166':'#ff7163';
const ICON_FOR_CAT = c => CAT_MAP[c]?.icon||'📦';

class UI {
  constructor(game,renderer){
    this.game=game; this.renderer=renderer;
    this.modalRoot=$('#modalRoot'); this.creationRoot=$('#creationRoot');
    this.charTab='needs'; this.charPanelOpen=false;
    this.modalType=null;
    this.phoneApp='home'; this.buyCategory='sala'; this.buildTool='wall';
    this.buildColor='#d2b386'; this.buildFloor='wood';
    this.unread=0; this.lastNotifLen=0;
    this.creation=null; this.tutorialStep=0;
    this.partyEl=null; this.startVisible=true;
    this.bindStatic();
    this.createPartyBanner();
    this.refreshStart();
    this.attachGame(game);
  }
  attachGame(game){
    this.game=game;
    if(this.renderer) this.renderer.attachGame(game);
    this.refreshAll();
  }
  bindStatic(){
    $('#notifBtn').addEventListener('click',()=>this.showNotifications());
    $('#zoomIn').addEventListener('click',()=>this.renderer.zoom(1.16));
    $('#zoomOut').addEventListener('click',()=>this.renderer.zoom(0.86));
    $('#recenterBtn').addEventListener('click',()=>this.renderer.recenter());
    $('#portraitBtn').addEventListener('click',()=>this.openCharacterPanel('needs'));
    $('#charSummary').addEventListener('click',()=>this.openCharacterPanel('needs'));
    $('#needsToggle').addEventListener('click',()=>this.toggleNeeds());
    $$('#speedGroup button').forEach(btn=>btn.addEventListener('click',()=>{
      const s=Number(btn.dataset.speed);
      this.game.setSpeed(s);
      this.audioTick();
    }));
    $$('#modeBar button').forEach(btn=>btn.addEventListener('click',()=>{
      const mode=btn.dataset.mode;
      if(this.game.mode===mode) this.game.setMode('live');
      else this.game.setMode(mode);
      this.audioTick();
    }));
    $('#newGameBtn').addEventListener('click',()=>this.openCreation());
    $('#quickStartBtn').addEventListener('click',()=>{
      this.game.startQuickGame(); this.hideStart(); this.maybeTutorial();
    });
    $('#continueBtn').addEventListener('click',()=>{
      const latest=SaveSystem.latest();
      if(latest) this.loadSlot(latest.slot);
    });
    document.addEventListener('click',e=>{
      if(e.target?.closest('#startScreen .start-slot')) return;
    });
    $('#hud').addEventListener('touchstart',()=>{}, {passive:true});
  }
  audioTick(){ try{this.game.audio.resume(); this.game.audio.sfx('tap');}catch(e){} }
  createPartyBanner(){
    this.partyEl=document.createElement('div');
    this.partyEl.id='partyBanner'; this.partyEl.className='party-banner hidden';
    $('#app').appendChild(this.partyEl);
  }
  setStartChrome(show){
    this.startVisible=show;
    $('#topbar').classList.toggle('hidden',show);
    $('#hud').classList.toggle('hidden',show);
    $('#queueBar').classList.add('hidden');
    $('#zoomControls').classList.toggle('hidden',show);
    $('#startScreen').classList.toggle('hidden',!show);
  }
  hideStart(){ this.setStartChrome(false); }
  showStart(){ this.setStartChrome(true); this.refreshStart(); }
  refreshSaveSlots(){
    if(this.startVisible) this.refreshStart();
  }
  refreshStart(){
    const latest=SaveSystem.latest();    const cont=$('#continueBtn');
    if(latest){ cont.classList.remove('hidden'); cont.innerHTML=`▶ Continuar · ${escapeHtml(latest.meta?.name||'Sua família')}`; }
    else cont.classList.add('hidden');
    const list=$('#slotList');
    const slots=SaveSystem.list();
    list.innerHTML=slots.map(s=>{
      if(s.data){
        const meta=s.meta||{};
        return `<button class="start-slot" data-slot="${s.slot}"><span>💾</span><span><b>Espaço ${s.slot} · ${escapeHtml(meta.name||'Família')}</b><small>Dia ${meta.day||1} · ${formatMoney(meta.money||0)} · ${meta.family||1} morador(es)</small></span><span class="ss-play">Jogar</span></button>`;
      }
      return `<div class="start-slot empty"><span>▫️</span><span><b>Espaço ${s.slot}</b><small>Vazio — uma nova história cabe aqui.</small></span></div>`;
    }).join('');
    $$('.start-slot[data-slot]',list).forEach(btn=>btn.addEventListener('click',()=>this.loadSlot(Number(btn.dataset.slot))));
  }
  loadSlot(slot){
    const payload=SaveSystem.get(slot);
    if(!payload){ this.toast('Esse espaço está vazio.','error'); return; }
    if(this.game.loadPayload(payload)){
      this.hideStart(); this.closeAll(); this.game.setMode('live'); this.refreshAll();
      this.toast('Sua vida foi carregada. 💾','success');
    } else {
      this.toast('Não foi possível carregar esse save.','error');
    }
  }

  /* ---------- HUD ---------- */
  refreshAll(){
    this.refreshHUD(); this.refreshSpeed(); this.refreshQueue(); this.refreshNotifBadge(); this.refreshParty(); this.refreshModes();
    if(this.charPanelOpen) this.renderCharacterPanel(this.charTab,true);
    if(this.game.mode==='build') this.renderBuildPanel();
    if(this.game.mode==='buy') this.renderBuyPanel();
  }
  refreshHUD(){
    const g=this.game; if(!g?.started) return;
    const c=g.selected;
    $('#dayLabel').textContent=g.time.weekdayName;
    const w=WEATHERS[g.weather]||WEATHERS.sun;
    const hol=g.time.holiday?` · ${g.time.holiday.icon} ${g.time.holiday.name}`:'';
    $('#dateLabel').textContent=`Dia ${g.time.day} · ${g.time.season}${hol}`;
    $('#weatherIcon').textContent=w.icon; $('#weatherLabel').textContent=w.name;
    $('#moneyLabel').textContent=formatMoney(g.money);
    $('#clockLabel').textContent=g.time.clock;
    if(c){
      $('#hudName').textContent=c.name;
      const emo=c.getEmotionInfo();
      $('#hudEmotion').textContent=`${emo.icon} ${emo.label}`;
      $('#hudEmotion').style.background=emo.color;
      $('#lvlBadge').textContent=c.stageInfo.icon;
      this.drawPortraitIn($('#hudPortrait'),c);
      const needs=NEEDS.map(n=>{
        const v=Math.round(c.needs[n.id]);
        return `<span class="need-chip" title="${n.label}: ${v}"><i style="height:${v}%;background:${NEED_COLORS(v)}"></i><span>${n.icon}</span></span>`;
      }).join('');
      const mn=$('#miniNeeds');
      mn.innerHTML=needs;
      mn.style.display=g.settings.needsOpen?'flex':'none';
      $('#needsToggle').textContent=g.settings.needsOpen?'▾':'▸';
    }
    this.refreshQueue();
  }
  tickHUD(){
    if(!this.game?.started) return;
    this.refreshHUD(); this.refreshSpeed();
    if(this.partyEl&&this.game.party&&!this.partyEl.classList.contains('hidden')){
      const left=Math.max(0,Math.round(this.game.party.endsAt-this.game.absMinutes));
      $('#partyBannerTime').textContent=formatMinutes(left);
      $('#partyBannerProgress').textContent=`${this.game.party.progress}/${this.game.party.goal}`;
    }
  }
  toggleNeeds(){
    this.game.settings.needsOpen=!this.game.settings.needsOpen;
    this.refreshHUD();
  }
  drawPortraitIn(canvas,c){ drawPortrait(canvas,c,{time:performance.now()/1000}); }
  refreshSpeed(){
    const speed=this.game.time.paused?0:this.game.time.speed;
    $$('#speedGroup button').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===speed));
    if(this.game.settings.autoSkip&&this.game.allHouseholdSleeping()&&this.game.simRunning){
      $('#clockLabel').title='Avançando enquanto todos dormem';
    }
  }
  refreshModes(){
    $$('#modeBar button').forEach(b=>b.classList.toggle('active',b.dataset.mode===this.game.mode));
    const showHud=this.game.mode!=='buy'&&this.game.mode!=='build'&&this.startVisible===false;
    $('#hud').classList.toggle('hidden',!showHud);
    $('#zoomControls').classList.toggle('hidden',this.startVisible);
    $('#queueBar').classList.toggle('hidden',this.game.mode!=='live'||this.startVisible);
    document.body.classList.toggle('building',this.game.mode==='buy'||this.game.mode==='build');
  }
  refreshNotifBadge(){
    const n=this.game.notifications?.length||0;
    if(n>this.lastNotifLen) this.unread+=n-this.lastNotifLen;
    this.lastNotifLen=n;
    const badge=$('#notifBadge');
    badge.textContent=this.unread>9?'9+':String(this.unread);
    badge.classList.toggle('hidden',this.unread<=0);
  }
  refreshQueue(){
    const g=this.game, c=g?.selected;
    const bar=$('#queueBar');
    if(!g?.started||!c||g.mode!=='live'||!c.queue.length){ bar.classList.add('hidden'); bar.innerHTML=''; return; }
    bar.classList.remove('hidden');
    bar.innerHTML=c.queue.slice(0,6).map((a,i)=>{
      const pct=i===0&&a.phase==='doing'?Math.min(100,Math.round(a.elapsed/a.minutes*100)):0;
      return `<div class="q-item ${i===0?'active':''}" data-q="${i}"><span class="q-ico">${a.icon||'✨'}</span><span class="q-meta"><span class="q-name">${escapeHtml(a.name)}</span><span class="q-progress"><i style="width:${pct}%"></i></span></span><button class="q-cancel" data-cancel="${i}" aria-label="Cancelar">✕</button></div>`;
    }).join('');
    $$('.q-cancel',bar).forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation(); g.cancelAction(c,Number(btn.dataset.cancel)); this.refreshQueue();
    }));
  }
  refreshParty(){
    if(!this.partyEl) return;
    const p=this.game.party;
    if(!p||!this.game.started){ this.partyEl.classList.add('hidden'); return; }
    const left=Math.max(0,Math.round(p.endsAt-this.game.absMinutes));
    this.partyEl.classList.remove('hidden');
    this.partyEl.innerHTML=`<span class="pb-ico">${p.icon}</span><span class="pb-text"><b>${escapeHtml(p.name)}</b><small>Socialize! <span id="partyBannerProgress">${p.progress}/${p.goal}</span> · <span id="partyBannerTime">${formatMinutes(left)}</span></small></span><button id="partyClose" aria-label="Encerrar festa">✕</button>`;
    $('#partyClose').addEventListener('click',()=>{ this.game.endParty(); this.refreshParty(); });
  }
  toast(text,type='info'){
    const layer=$('#toastLayer');
    if(!layer) return;
    const el=document.createElement('div'); el.className='toast';
    const icons={success:'✅',error:'⚠️',info:'💬',levelup:'⭐',cash:'💵'};
    el.innerHTML=`<span class="t-ico">${icons[type]||'💬'}</span><span>${escapeHtml(text)}</span>`;
    layer.appendChild(el);
    while(layer.children.length>3) layer.firstChild.remove();
    setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),280); },3800);
  }

  /* ---------- Generic modal helpers ---------- */
  closeAll(){
    this.modalRoot.innerHTML='';
    this.charPanelOpen=false;
    this.modalType=null;
    document.body.classList.remove('building');
    this.renderer?.camera && (this.renderer.camera.follow=this.renderer.camera.follow);
  }
  closeModal(){
    this.modalRoot.innerHTML='';
    this.charPanelOpen=false; this.modalType=null;
  }
  scrim(close=true){
    const el=document.createElement('div'); el.className='scrim';
    if(close) el.addEventListener('click',e=>{if(e.target===el){ this.handleClose(); }});
    return el;
  }
  handleClose(){
    if(this.game.mode!=='live') this.game.setMode('live');
    else this.closeModal();
  }
  openSheet(title,subtitle,bodyHTML,opts={}){
    this.charPanelOpen=false;
    const frag=document.createDocumentFragment();
    frag.appendChild(this.scrim(true));
    const sheet=document.createElement('section'); sheet.className='sheet';
    sheet.innerHTML=`<div class="sheet-head"><div><h2>${title}</h2>${subtitle?`<small>${subtitle}</small>`:''}</div><button class="close-btn" aria-label="Fechar">✕</button></div><div class="sheet-body">${bodyHTML}</div>`;
    $('.close-btn',sheet).addEventListener('click',()=>this.handleClose());
    frag.appendChild(sheet);
    this.modalRoot.innerHTML=''; this.modalRoot.appendChild(frag);
    return sheet;
  }
  openFull(title,subtitle,bodyHTML){
    this.charPanelOpen=false;
    const frag=document.createDocumentFragment();
    frag.appendChild(this.scrim(true));
    const panel=document.createElement('section'); panel.className='full-modal';
    panel.innerHTML=`<div class="full-head"><div style="flex:1"><h2>${title}</h2>${subtitle?`<small style="font-size:9px;color:#a995c1">${subtitle}</small>`:''}</div><button class="close-btn" aria-label="Fechar">✕</button></div><div class="full-body">${bodyHTML}</div>`;
    $('.close-btn',panel).addEventListener('click',()=>this.handleClose());
    frag.appendChild(panel);
    this.modalRoot.innerHTML=''; this.modalRoot.appendChild(frag);
    return panel;
  }
  needBars(char,compact=false){
    return `<div class="${compact?'mini-needs':''}">${NEEDS.map(n=>{
      const v=Math.round(char.needs[n.id]);
      if(compact) return `<span class="need-chip" title="${n.label}"><i style="height:${v}%;background:${NEED_COLORS(v)}"></i><span>${n.icon}</span></span>`;
      return `<div class="need-row"><span class="n-ico">${n.icon}</span><span class="n-label">${n.label}</span><span class="need-bar"><i style="width:${v}%;background:${NEED_COLORS(v)}"></i></span><span class="n-val">${v}</span></div>`;
    }).join('')}</div>`;
  }

  /* ---------- Object action menu ---------- */
  actionAvailability(char,id,obj=null,recipe=null){
    const def=ACTIONS[id]; if(!def) return 'Indisponível';
    if(char.hidden) return 'Fora de casa';
    if(obj?.burning && id!=='extinguish') return 'Está pegando fogo';
    if(obj?.broken && !['repair','clean','extinguish','toggle_light','pay_bills'].includes(id)) return 'Precisa consertar';
    if(this.game.bills.utilitiesOff && ['shower','bath','laundry','program','browse','job_search','social_media','freelance','watch_tv','play_game','coffee','cook','wash_dishes'].includes(id)) return 'Luz/água cortada';
    if(id==='eat_meal'&&char.inventory.meals<1) return 'Sem refeição pronta';
    if(id==='cook'&&char.stageInfo.id==='crianca') return 'Crianças não cozinham';
    if(id==='go_work'&&!char.stageInfo.canWork) return 'Jovem demais';
    if(def.requires?.skill) for(const [sid,lvl] of Object.entries(def.requires.skill)) if(char.skillLevel(sid)<lvl) return `${SKILL_MAP[sid].name} ${lvl}+`;
    if(['workout','swim','paint','write_book','program'].includes(id)&&char.stageInfo.id==='bebe') return 'Bebê não consegue';
    if(recipe&&char.skillLevel('culinaria')<recipe.level) return `Culinária ${recipe.level}+`;
    if(recipe&&this.game.money<recipe.cost) return 'Pixels insuficientes';
    if(id==='upgrade'&&this.game.money<120) return 'Pixels insuficientes';
    return null;
  }
  showObjectMenu(obj){
    const g=this.game, c=g.selected; if(!c||!obj) return;
    const def=objDef(obj);
    let ids=def.actions.slice();
    if(obj.burning) ids=['extinguish'];
    else {
      if(obj.dirty>20&&!ids.includes('clean')) ids.push('clean');
      if((obj.broken||obj.condition<55)&&!ids.includes('repair')) ids.push('repair');
      if(def.upgradable&&(obj.upgraded||0)<3&&!ids.includes('upgrade')) ids.push('upgrade');
    }
    if(obj.garden?.planted&&obj.garden.growth>=100&&!ids.includes('harvest')) ids.push('harvest');
    if(obj.garden?.planted&&!obj.garden.watered&&!ids.includes('water')) ids.push('water');
    if(!obj.garden?.planted&&ids.includes('water')) ids=ids.filter(x=>x!=='water');
    const seen=new Set();
    const actions=ids.filter(id=>{ if(seen.has(id))return false;seen.add(id);return true;}).map(id=>{
      const a=ACTIONS[id]; if(!a) return null;
      let reason=this.actionAvailability(c,id,obj);
      if(id==='cook'&&!RECIPES.some(r=>r.level<=c.skillLevel('culinaria'))) reason='Culinária baixa';
      let cost=a.money?` · P$ ${a.money}`:'';
      if(id==='upgrade') cost=' · P$ 120';
      return {id,a,reason,cost};
    }).filter(Boolean);
    const status=[];
    if(obj.dirty>20) status.push('Sujo');
    if(obj.broken) status.push('Quebrado');
    if(obj.burning) status.push('Em chamas');
    if(obj.upgraded) status.push(`Melhorado x${obj.upgraded}`);
    status.push(`Ambiente +${def.ambience||0}`);
    const body=`<div class="panel-card" style="display:flex;gap:9px;align-items:center"><span style="font-size:28px">${def.icon||'📦'}</span><div><b style="font-size:12px">${escapeHtml(def.name)}</b><div style="font-size:9px;color:#bfaed8;margin-top:2px">${status.join(' · ')} · ${obj.condition}% conservação</div></div></div>
      <div class="action-grid">${actions.map(x=>`<button class="action-btn ${x.reason?'locked':''}" data-a="${x.id}" ${x.reason?'disabled':''}><span class="a-ico">${x.a.icon}</span><span class="a-text"><b>${x.a.name}</b><small>${x.reason||`${formatMinutes(x.a.minutes)}${x.cost}`}</small></span></button>`).join('')}</div>
      ${actions.length?'':'<p style="font-size:11px;color:#bca9d6">Nenhuma ação disponível agora.</p>'}
      <div class="btn-row" style="margin-top:9px"><button class="btn ghost small" id="goToObj">🚶 Ir até o objeto</button></div>`;
    const sheet=this.openSheet(`${def.icon||'📦'} ${escapeHtml(def.name)}`,`Toque em uma ação para ${c.name}`,body);
    $$('.action-btn[data-a]',sheet).forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.a;
      if(id==='cook') this.showRecipeMenu(obj);
      else if(id==='plant') this.showPlantMenu(obj);
      else { g.queueAction(c,id,{targetUid:obj.uid}); this.handleClose(); }
    }));
    $('#goToObj',sheet)?.addEventListener('click',()=>{ g.moveNearObject(obj); this.handleClose(); });
  }
  showRecipeMenu(obj){
    const c=this.game.selected; if(!c) return;
    const body=`<div style="display:grid;gap:6px">${RECIPES.map(r=>{
      const lock=this.actionAvailability(c,'cook',obj,r);
      return `<button class="action-btn ${lock?'locked':''}" data-r="${r.id}" ${lock?'disabled':''}><span class="a-ico">${r.icon}</span><span class="a-text"><b>${r.name}</b><small>${lock||`Culinária ${r.level}+ · P$ ${r.cost} · ${formatMinutes(r.minutes)}`}</small></span></button>`;
    }).join('')}</div><p style="font-size:9px;color:#a995c1;margin:8px 2px 0">Cozinhar gera refeições. Depois use a mesa para comer.</p>`;
    const sheet=this.openSheet('🍳 O que vamos cozinhar?',`Skill de Culinária: nível ${c.skillLevel('culinaria')} · ${c.inventory.meals} refeição(ões)`,body);
    $$('.action-btn[data-r]',sheet).forEach(btn=>btn.addEventListener('click',()=>{
      const rec=RECIPES.find(r=>r.id===btn.dataset.r);
      this.game.queueAction(c,'cook',{targetUid:obj.uid,recipe:rec});
      this.handleClose();
    }));
  }
  showPlantMenu(obj){
    const c=this.game.selected; if(!c) return;
    const body=`<div class="action-grid">${CROPS.map(crop=>`<button class="action-btn" data-crop="${crop.id}"><span class="a-ico">${crop.icon}</span><span class="a-text"><b>${crop.name}</b><small>Venda P$ ${crop.value} · cresce em ${crop.grow*8}h</small></span></button>`).join('')}</div>`;
    const sheet=this.openSheet('🌱 Escolha a semente','O canteiro aceita uma planta por vez.',body);
    $$('.action-btn[data-crop]',sheet).forEach(btn=>btn.addEventListener('click',()=>{
      this.game.queueAction(c,'plant',{targetUid:obj.uid,crop:btn.dataset.crop});
      this.handleClose();
    }));
  }

  /* ---------- Social menu ---------- */
  showSocialMenu(target){
    const g=this.game,c=g.selected;
    if(!c||!target||c.id===target.id) return;
    const rel=c.relationship(target.id);
    const socs=g.availableSocialActions(c,target);
    const cats=Object.entries(SOCIAL_CATS);
    const body=`<div class="panel-card"><div style="display:flex;align-items:center;gap:9px;margin-bottom:6px"><span style="font-size:26px">${target.stageInfo.icon}</span><div style="flex:1"><b style="font-size:13px">${escapeHtml(target.fullName)}</b><div style="font-size:9px;color:#bfaed8">${target.ageLabel} · ${target.isNPC?(target.npcJob||'Morador do bairro'):'Sua família'}</div></div><span class="chip mint">${escapeHtml(c.statusWith(target.id))}</span></div>
      <div class="rel-bars"><span class="rel-bar" title="Amizade"><i style="width:${rel.friend}%;background:var(--mint)"></i></span><span class="rel-bar" title="Romance"><i style="width:${rel.romance}%;background:var(--pink)"></i></span></div><div style="font-size:8px;color:#a995c1;margin-top:3px">Amizade ${Math.round(rel.friend)} · Romance ${Math.round(rel.romance)}</div></div>
      ${cats.map(([cat,info])=>{
        const list=socs.filter(s=>s.cat===cat);
        return `<h4 style="font-size:10px;color:var(--yellow);margin:10px 2px 5px">${info.icon} ${info.name}</h4><div class="action-grid">${list.map(s=>`<button class="action-btn social ${s.locked?'locked':''}" data-s="${s.id}" ${s.locked?'disabled':''}><span class="a-ico">${s.icon}</span><span class="a-text"><b>${s.name}</b><small>${s.locked?s.reason:formatMinutes(s.minutes)}</small></span></button>`).join('')}</div>`;
      }).join('')}`;
    const sheet=this.openSheet(`💬 ${escapeHtml(target.name)}`,`O que ${c.name} vai fazer?`,body);
    $$('.action-btn[data-s]',sheet).forEach(btn=>btn.addEventListener('click',()=>{
      g.queueSocial(c,target.id,btn.dataset.s);
      this.handleClose();
    }));
  }
  showTileMenu(tx,ty){
    const g=this.game;
    if(g.mode!=='live') return;
    const body=`<div class="action-grid"><button class="action-btn" data-t="move"><span class="a-ico">🚶</span><span class="a-text"><b>Ir até aqui</b><small>${tx}, ${ty}</small></span></button><button class="action-btn" data-t="center"><span class="a-ico">⌖</span><span class="a-text"><b>Centralizar câmera</b><small>Ver este cantinho</small></span></button><button class="action-btn" data-t="build"><span class="a-ico">🧱</span><span class="a-text"><b>Construir aqui</b><small>Abrir modo construir</small></span></button></div>`;
    const sheet=this.openSheet('📍 Neste ponto',g.currentLot.name,body);
    $$('.action-btn',sheet).forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.dataset.t==='move'){ g.moveToTile(tx,ty); this.handleClose(); }
      if(btn.dataset.t==='center'){ this.renderer.camera.focusWorld(tx+.5,ty+.5); this.renderer.camera.follow=false; this.handleClose(); }
      if(btn.dataset.t==='build'){ g.setMode('build'); }
    }));
  }
  showPetMenu(pet){
    const g=this.game,c=g.selected;
    const body=`<div class="panel-card"><b style="font-size:13px">${pet.icon} ${escapeHtml(pet.name)}</b><div style="font-size:9px;color:#bfaed8;margin-top:2px">${pet.species==='cat'?'Gato':'Cachorro'} · ${pet.personality} · Truques ${pet.training}%</div>${this.needBars({needs:pet.needs},true).replace('mini-needs','mini-needs" style="margin-top:8px')}</div><div class="action-grid">
      ${['pet_play','pet_feed','pet_train','pet_groom'].map(id=>{const a=ACTIONS[id];return `<button class="action-btn" data-pet="${id}"><span class="a-ico">${a.icon}</span><span class="a-text"><b>${a.name}</b><small>${formatMinutes(a.minutes)}</small></span></button>`;}).join('')}
    </div>`;
    const sheet=this.openSheet(`🐾 ${escapeHtml(pet.name)}`,'Mimos, treino e comida.',body);
    $$('.action-btn[data-pet]',sheet).forEach(btn=>btn.addEventListener('click',()=>{
      g.queueAction(c,btn.dataset.pet,{targetPetId:pet.id}); this.handleClose();
    }));
  }

  /* ---------- Character sheet ---------- */
  openCharacterPanel(tab='needs'){
    const c=this.game.selected; if(!c) return;
    this.charPanelOpen=true; this.charTab=tab;
    this.renderCharacterPanel(tab);
  }
  renderCharacterPanel(tab='needs',preserve=false){
    const g=this.game,c=g.selected; if(!c) return;
    this.charTab=tab;
    if(!this.charPanelOpen) return;
    const tabs=[
      ['needs','Necessidades','❤️'],['skills','Habilidades','⭐'],['relationships','Relações','💬'],
      ['career','Carreira','💼'],['aspiration','Aspiração','🌟'],['inventory','Inventário','🎒'],
    ];
    const hero=`<div class="char-hero"><canvas id="charHeroCanvas"></canvas><div style="flex:1;min-width:0"><h3>${escapeHtml(c.fullName)}</h3><p>${c.ageLabel} · ${c.stageInfo.icon}<br>${c.getEmotionInfo().icon} ${c.getEmotionInfo().label} · Humor ${Math.round(c.moodValue())}</p><div>${c.traitInfo.map(t=>`<span class="chip">${t.icon} ${t.name}</span>`).join('')}</div></div></div>`;
    const switcher=g.characters.length>1?`<div style="display:flex;gap:5px;overflow-x:auto;margin-bottom:9px">${g.characters.map(ch=>`<button class="chip ${ch.id===c.id?'mint':''}" data-switch="${ch.id}" style="min-height:30px">${ch.stageInfo.icon} ${escapeHtml(ch.name)}</button>`).join('')}</div>`:'';
    let content='';
    if(tab==='needs'){
      content=`${hero}${switcher}<div class="panel-card"><h4>❤️ Como está se sentindo</h4>${this.needBars(c)}
        <div class="moodlet"><span>${c.getEmotionInfo().icon}</span><b>${c.getEmotionInfo().label}</b><span class="tag good">${g.moodValueLabel?g.moodValueLabel(c):(c.moodValue()>=25?'Ótimo':c.moodValue()>=-10?'Estável':'Péssimo')}</span></div>
        ${c.moodlets.length?c.moodlets.map(m=>`<div class="moodlet ${m.weight<0?'neg':''}"><span>${m.icon}</span><b>${escapeHtml(m.label)}</b><small>${m.weight>0?'+':''}${m.weight}</small></div>`).join(''):'<p style="font-size:9px;color:#a995c1">Sem moodlets no momento.</p>'}
      </div><div class="panel-card"><h4>🧬 Traços</h4>${c.traitInfo.map(t=>`<span class="chip yellow">${t.icon} ${t.name}</span>`).join('')}<p style="margin-top:6px">${c.traitInfo.map(t=>t.desc).join(' ')}</p></div>`;
    } else if(tab==='skills'){
      content=`${hero}${switcher}<div class="panel-card"><h4>⭐ Habilidades</h4><div class="skill-grid">${SKILLS.map(s=>{
        const p=c.skillProgress(s.id);
        return `<div class="skill-item"><div class="skill-top"><span>${s.icon} ${s.name}</span><b>Nv ${p.level}</b></div><div class="level-dots">${Array.from({length:10},(_,i)=>`<i class="${i<p.level?'on':''}"></i>`).join('')}</div><small style="font-size:7px;color:#9e8ab7">${p.pct>99?'MÁX':`${Math.round(p.pct)}%`}</small></div>`;
      }).join('')}</div></div>`;
    } else if(tab==='relationships'){
      const ids=new Set();
      g.characters.forEach(x=>{if(x.id!==c.id)ids.add(x.id);});
      g.npcs.forEach(x=>{if(x.id!==c.id&&c.relationships[x.id]?.met)ids.add(x.id);});
      Object.entries(c.relationships).forEach(([id,r])=>{if(r.met&&id!==c.id)ids.add(id);});
      const rows=[...ids].map(id=>{
        const rec=g.personRecord(id); const rel=c.relationship(id);
        const present=g.findPerson(id);
        return `<div class="rel-item"><span class="rel-avatar">${present?.stageInfo?.icon||'🧑'}</span><div class="rel-mid"><div class="rel-name"><span style="color:var(--cream)">${escapeHtml(rec.name.split(' ')[0])}</span><span>${escapeHtml(c.statusWith(id))}</span></div><div class="rel-bars"><span class="rel-bar"><i style="width:${rel.friend}%;background:var(--mint)"></i></span><span class="rel-bar"><i style="width:${rel.romance}%;background:var(--pink)"></i></span></div></div><div class="rel-actions">${present?`<button data-talk="${id}" title="Interagir">💬</button>`:`<button data-invite="${id}" title="Convidar">🫖</button>`}</div></div>`;
      }).join('');
      content=`${hero}${switcher}<div class="panel-card"><h4>💬 Relações</h4><div class="rel-list">${rows||'<p style="font-size:10px;color:#a995c1">Ainda não conhece ninguém. Vá ao parque ou café!</p>'}</div></div>`;
    } else if(tab==='career'){
      const info=g.getCareerInfo(c);
      if(!info){
        content=`${hero}${switcher}<div class="panel-card"><h4>💼 Carreira</h4><p>${c.stageInfo.canWork?'Sem emprego no momento. Procure uma vaga pelo celular ou computador.':'Ainda não tem idade para trabalhar.'}</p><div class="btn-row" style="margin-top:8px"><button class="btn primary small" id="findJob">🔎 Procurar emprego</button></div></div>`;
      } else {
        const {job,level,next,canWorkNow}=info;
        const perf=Math.round(c.career.performance||0);
        content=`${hero}${switcher}<div class="panel-card"><div class="career-head"><span class="career-icon">${job.icon}</span><div style="flex:1"><h4 style="margin:0">${job.name}</h4><b style="font-size:12px">${escapeHtml(level.title)}</b><div style="font-size:9px;color:#bfaed8">${job.hours[0]}h–${job.hours[1]}h · ${job.days.map(d=>WEEKDAYS[d].slice(0,3)).join(', ')}</div></div></div>
          <div class="need-row"><span class="n-label">Desempenho</span><span class="need-bar"><i style="width:${perf}%;background:${NEED_COLORS(perf)}"></i></span><span class="n-val">${perf}%</span></div>
          <div style="font-size:10px;color:#e3d5f2;margin:6px 0">Salário de hoje: <b style="color:var(--yellow)">${formatMoney(level.pay)}</b> · Dias trabalhados: ${c.career.daysWorked}</div>
          <div class="btn-row"><button class="btn ${canWorkNow.ok?'primary':'ghost'} small" id="workBtn" ${canWorkNow.ok?'':'disabled'}>${canWorkNow.ok?'💼 Ir trabalhar':canWorkNow.reason}</button><button class="btn ghost small" id="quitBtn">👋 Demitir</button></div>
          ${next?`<p style="margin-top:7px;font-size:9px;color:#bba9d4">Próximo: <b>${next.title}</b> · ${formatMoney(next.pay)}/dia · ${SKILL_MAP[job.skill].name} ${next.req}+</p>`:'<p style="margin-top:7px;font-size:9px;color:var(--mint)">Nível máximo! Você é lenda.</p>'}
          <div class="career-levels">${job.levels.map((l,i)=>`<div class="career-step ${i===c.career.level?'current':''}"><span>${i+1}. ${l.title}</span><span>${formatMoney(l.pay)}</span></div>`).join('')}</div>
        </div>`;
      }
    } else if(tab==='aspiration'){
      const asp=c.aspirationInfo;
      const done=c.aspirationDone||{};
      content=`${hero}${switcher}<div class="aspiration-card"><h3>${asp.icon} ${asp.name}</h3><p>${asp.desc}</p>${asp.milestones.map(m=>`<div class="milestone ${done[m.id]?'done':''}"><span class="m-dot">${done[m.id]?'✓':''}</span><span>${m.label}</span><small>${done[m.id]?'feito':`${Math.min(100,Math.round(g.statValue(c,m.stat)/m.target*100))}%`}</small></div>`).join('')}</div><div class="panel-card"><h4>🪞 Pequenas vitórias</h4><p>Quadros: ${c.stats.paintings||0} · Livros: ${c.stats.books||0} · Peixes: ${c.stats.fish||0}<br>Treinos: ${c.stats.workouts||0} · Ações sociais: ${c.stats.socials||0} · Encontros: ${c.stats.dates||0}</p></div>`;
    } else {
      const items=c.inventory.items||[];
      const food=`<div class="inv-item">🍱 <span>Refeições prontas</span><b style="margin-left:auto">${c.inventory.meals}</b></div>`;
      const itemRows=items.map(it=>`<div class="inv-item"><span>${it.icon}</span><span style="flex:1;min-width:0">${escapeHtml(it.name)}<br><small style="color:var(--yellow)">P$ ${it.value}</small></span><button class="btn small yellow" data-sell="${it.uid}" style="min-height:28px;padding:2px 6px;font-size:8px">Vender</button></div>`).join('');
      content=`${hero}${switcher}<div class="panel-card"><h4>🎒 Inventário</h4><div class="inv-grid">${food}</div><div class="inv-grid" style="margin-top:5px">${itemRows||'<p style="font-size:10px;color:#a995c1">Mochila vazia. Crie arte, pesque ou colha algo!</p>'}</div></div>`;
    }
    const panel=this.openFull(`${c.stageInfo.icon} ${escapeHtml(c.fullName)}`,`${c.ageLabel} · ${c.aspirationInfo.icon} ${c.aspirationInfo.name}`,`
      <div class="tabs">${tabs.map(t=>`<button class="tab-btn ${t[0]===tab?'active':''}" data-tab="${t[0]}">${t[2]} ${t[1]}</button>`).join('')}</div>
      <div style="padding-top:10px">${content}</div>`);
    this.charPanelOpen=true; this.modalType='character';
    this.drawPortraitIn($('#charHeroCanvas'),c);
    $$('.tab-btn',panel).forEach(b=>b.addEventListener('click',()=>this.renderCharacterPanel(b.dataset.tab)));
    $$('[data-switch]',panel).forEach(b=>b.addEventListener('click',()=>{g.selectCharacter(b.dataset.switch);this.renderCharacterPanel(tab);}));
    $$('[data-talk]',panel).forEach(b=>b.addEventListener('click',()=>{const person=g.findPerson(b.dataset.talk);if(person){this.closeModal();this.showSocialMenu(person);}}));
    $$('[data-invite]',panel).forEach(b=>b.addEventListener('click',()=>{g.inviteFriend();this.closeModal();}));
    $$('[data-sell]',panel).forEach(b=>b.addEventListener('click',()=>{g.sellItem(c,b.dataset.sell);this.renderCharacterPanel('inventory');}));
    $('#findJob',panel)?.addEventListener('click',()=>this.openJobs(c));
    $('#workBtn',panel)?.addEventListener('click',()=>{g.startWork(c);this.closeModal();});
    $('#quitBtn',panel)?.addEventListener('click',()=>{ if(confirm('Pedir demissão agora?')){ g.quitJob(c); this.renderCharacterPanel('career'); } });
    if(tab==='relationships' && !panel) {}
  }
  openJobs(char){
    const jobs=this.game.jobListFor(char);
    const body=`<div class="panel-card"><p>${char.stageInfo.canWork?'Vagas abertas no bairro. O salário é por dia trabalhado.':'Ainda não tem idade para trabalhar.'}</p></div>
      <div style="display:flex;flex-direction:column;gap:6px">${jobs.map(j=>`<div class="panel-card" style="display:flex;gap:8px;align-items:center;margin:0"><span class="career-icon" style="width:36px;height:36px;font-size:19px">${j.icon}</span><div style="flex:1;min-width:0"><b style="font-size:11px">${j.name}</b><div style="font-size:8px;color:#bfaed8">${escapeHtml(j.levels[0].title)} · ${formatMoney(j.entryPay)}/dia · ${j.hoursText}</div><div style="font-size:7px;color:#9e8ab7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.dayText}</div></div><button class="btn ${char.career.jobId===j.id?'ghost':'primary'} small" data-job="${j.id}" ${char.career.jobId===j.id?'disabled':''}>${char.career.jobId===j.id?'Atual':'Candidatar'}</button></div>`).join('')}</div>`;
    const panel=this.openFull('🔎 Vagas no bairro','Escolha um caminho. Dá para mudar depois.',body);
    $$('[data-job]',panel).forEach(b=>b.addEventListener('click',()=>{this.game.applyJob(char,b.dataset.job);this.closeModal();}));
  }

  /* ---------- Notifications ---------- */
  showNotifications(){
    this.unread=0; this.refreshNotifBadge();
    const list=this.game.notifications||[];
    const body=`<div class="log-list">${list.length?list.map(n=>`<div class="log-item"><span class="li-ico">${n.icon||'✨'}</span><span style="flex:1">${escapeHtml(n.text)}</span><time>${n.time||''}</time></div>`).join(''):'<p style="font-size:11px;color:#bca9d6">Nada por aqui ainda. Viva um pouco!</p>'}</div><div class="btn-row" style="margin-top:9px"><button class="btn ghost small" id="clearLog">Limpar histórico</button></div>`;
    const sheet=this.openSheet('📜 Diário do bairro','Tudo o que aconteceu por aqui.',body);
    $('#clearLog',sheet)?.addEventListener('click',()=>{this.game.notifications=[];this.showNotifications();});
  }

  /* ---------- Mode overlay routing ---------- */
  onModeChange(mode){
    this.closeModal();
    this.refreshModes();
    if(mode==='map') this.renderMap();
    else if(mode==='phone') this.renderPhone();
    else if(mode==='menu') this.renderMenu();
    else if(mode==='build') this.renderBuildPanel();
    else if(mode==='buy') this.renderBuyPanel();
    else { this.closeModal(); this.refreshModes(); }
  }
  renderMap(){
    const g=this.game;
    const body=`<div class="map-scenery"><span class="map-cloud">☁️</span></div><p class="map-note">Escolha um lugar. Levar a família toda é grátis; a vida é que cobra.</p><div class="map-grid">${LOT_META.map(m=>`<button class="map-card ${m.id===g.currentLotId?'here':''}" data-lot="${m.id}"><span class="map-ico">${m.icon}</span><b>${m.name}</b><small>${m.blurb}</small><span class="map-tag">${m.id===g.currentLotId?'Aqui':m.type}</span></button>`).join('')}</div><p class="map-note">🏡 ${escapeHtml(g.homeLot?.name||'Casa Aurora')} é seu lar atual.</p>`;
    const panel=this.openFull('🗺 Mapa do bairro','Toque em um lugar para ir.',body);
    $$('.map-card[data-lot]',panel).forEach(b=>b.addEventListener('click',()=>{
      const id=b.dataset.lot;
      if(id===g.currentLotId){ this.handleClose(); return; }
      const lot=g.lots[id];
      if(lot?.forSale&&!lot.playerOwned){ this.closeModal(); g.travelTo(id); return; }
      g.travelTo(id);
    }));
  }
  renderPhone(){
    const g=this.game,c=g.selected;
    const body=this.phoneApp==='home'?this.phoneHome():this.phoneAppBody(this.phoneApp);
    const frag=document.createDocumentFragment();
    frag.appendChild(this.scrim(true));
    const shell=document.createElement('div'); shell.className='phone-shell';
    shell.innerHTML=`<div class="phone-notch">PIXEL·FONE 8</div><div class="phone-screen">${body}</div><div class="phone-home-btn"><i></i></div>`;
    frag.appendChild(shell);
    this.modalRoot.innerHTML='';this.modalRoot.appendChild(frag);
    $('.scrim',frag)?.addEventListener('click',()=>this.handleClose());
    $$('[data-app]',shell).forEach(b=>b.addEventListener('click',()=>{this.phoneApp=b.dataset.app;this.renderPhone();}));
    $('#phoneHome',shell)?.addEventListener('click',()=>this.handleClose());
    $$('[data-phone]',shell).forEach(b=>b.addEventListener('click',()=>this.phoneAction(b.dataset.phone,b.dataset.id)));
    $('#phoneBack',shell)?.addEventListener('click',()=>{this.phoneApp='home';this.renderPhone();});
  }
  phoneHome(){
    const g=this.game;
    return `<div class="phone-head"><div><b>Celular</b><br>${g.time.clock} · ${formatMoney(g.money)}</div><button class="close-btn" id="phoneHome" style="width:32px;height:32px">✕</button></div>
      <div class="apps">
        <button class="app" data-app="food"><i>🍕</i>Comida</button>
        <button class="app" data-app="contacts"><i>💬</i>Contatos</button>
        <button class="app" data-app="jobs"><i>💼</i>Vagas</button>
        <button class="app" data-app="party"><i>🎉</i>Festas</button>
        <button class="app" data-app="adopt"><i>👶</i>Adotar</button>
        <button class="app" data-app="sell"><i>💰</i>Vender</button>
        <button class="app" data-app="bills"><i>🧾</i>Contas</button>
        <button class="app" data-app="social"><i>📱</i>Rede</button>
      </div>
      <div class="phone-panel"><h4>🌤 Hoje</h4><p style="font-size:10px;margin:0;line-height:1.4">${WEATHERS[g.weather].icon} ${WEATHERS[g.weather].name} · ${g.time.weekdayName}, dia ${g.time.day}<br>${g.time.holiday?g.time.holiday.icon+' '+g.time.holiday.name+'!':'Sem feriado hoje.'}</p></div>
      <div class="phone-panel"><h4>💡 Dica do bairro</h4><p style="font-size:9px;line-height:1.4;margin:0">${pick(['Toque longo em qualquer lugar para abrir o menu de contexto.','Cozinhar refeições economiza Pixels e rende conversa.','Pintar e vender quadros é um ótimo plano B.','Crianças crescem. Aproveite os dentes de leite.','Plantar, regar e colher: paciência é uma habilidade.'])}</p></div>`;
  }
  phoneAppBody(app){
    const g=this.game,c=g.selected;
    const back=`<button class="btn ghost small" id="phoneBack" style="margin-bottom:9px">← Voltar</button>`;
    if(app==='food'){
      return `${back}<div class="phone-head"><b>Comida</b></div><div class="phone-panel"><h4>🍕 Pizza do Bairro</h4><p style="font-size:9px;color:#c9b8df;margin:0 0 7px">Entrega em 25 min. Rende 1 refeição.</p><button class="btn primary small" data-phone="pizza" style="width:100%">Pedir por P$ 55</button></div><div class="phone-panel"><h4>🍱 Sua despensa</h4><p style="font-size:10px;margin:0">${c.inventory.meals} refeição(ões) prontas.</p></div>`;
    }
    if(app==='contacts'){
      const ids=new Set();g.characters.forEach(x=>{if(x.id!==c.id)ids.add(x.id)});Object.entries(c.relationships).forEach(([id,r])=>{if(r.met)ids.add(id)});g.npcs.forEach(n=>ids.add(n.id));
      return `${back}<div class="phone-head"><b>Contatos</b><small>${ids.size} pessoa(s)</small></div><div class="phone-panel"><h4>🫖 Convidar alguém</h4><p style="font-size:9px;color:#c9b8df;margin:0 0 7px">Uma visita alegra o dia e enche a barra social.</p><button class="btn primary small" data-phone="invite" style="width:100%">Convidar um amigo</button></div><div class="phone-list">${[...ids].slice(0,12).map(id=>{const rec=g.personRecord(id);const rel=c.relationship(id);const present=g.findPerson(id);return `<div class="phone-row"><span class="pr-ico">${present?.stageInfo?.icon||'🧑'}</span><span style="flex:1"><b>${escapeHtml(rec.name)}</b><small>${escapeHtml(c.statusWith(id))} · Amizade ${Math.round(rel.friend)}</small></span><span class="pr-right">${rel.romance>20?'💗':''}</span></div>`}).join('')}</div>`;
    }
    if(app==='jobs'){
      const jobs=g.jobListFor(c);
      return `${back}<div class="phone-head"><b>Vagas</b><small>${c.fullName}</small></div><div class="phone-list">${jobs.map(j=>`<div class="phone-row"><span class="pr-ico">${j.icon}</span><span style="flex:1"><b>${j.name}</b><small>${j.levels[0].title} · ${formatMoney(j.entryPay)}/dia · ${j.hoursText}</small></span><button class="btn ${c.career.jobId===j.id?'ghost':'primary'} small" data-phone="apply" data-id="${j.id}" ${c.career.jobId===j.id?'disabled':''} style="min-height:32px;padding:3px 7px;font-size:9px">${c.career.jobId===j.id?'Atual':'Candidatar'}</button></div>`).join('')}</div>`;
    }
    if(app==='party'){
      return `${back}<div class="phone-head"><b>Festas</b></div><div class="phone-panel"><p style="font-size:9px;margin:0;color:#c9b8df">Convide o bairro, cumpra a meta de socialização e ganhe uma recompensa.</p></div><div class="phone-list">${PARTY_TYPES.map(p=>`<div class="phone-row"><span class="pr-ico">${p.icon}</span><span style="flex:1"><b>${p.name}</b><small>${p.desc}<br>${formatMoney(p.cost)} · meta ${p.goal}</small></span><button class="btn primary small" data-phone="party" data-id="${p.id}" style="min-height:32px;padding:3px 7px;font-size:9px">Começar</button></div>`).join('')}</div>`;
    }
    if(app==='adopt'){
      return `${back}<div class="phone-head"><b>Adotar</b></div><div class="phone-panel"><h4>👶 Ampliar a família</h4><p style="font-size:9px;color:#c9b8df;margin:0 0 7px">Uma criança precisa de carinho, comida e paciência. A casa aceita até 6 moradores.</p><button class="btn primary small" data-phone="adoptChild" style="width:100%">Adotar criança · P$ 1.200</button><div style="height:6px"></div><button class="btn ghost small" data-phone="adoptBaby" style="width:100%">Adotar bebê · P$ 1.200</button></div><div class="phone-panel"><h4>🐾 Adotar pet</h4><p style="font-size:9px;color:#c9b8df;margin:0 0 7px">Cachorro ou gato. Ambos julgam você.</p><div class="btn-row"><button class="btn yellow small" data-phone="adoptDog" style="flex:1">🐶 Cachorro</button><button class="btn yellow small" data-phone="adoptCat" style="flex:1">🐱 Gato</button></div></div>`;
    }
    if(app==='sell'){
      const items=c.inventory.items||[];
      return `${back}<div class="phone-head"><b>Vender</b><small>${formatMoney(g.money)}</small></div><div class="phone-list">${items.length?items.map(it=>`<div class="phone-row"><span class="pr-ico">${it.icon}</span><span style="flex:1"><b>${escapeHtml(it.name)}</b><small>${it.type} · qualidade ${it.quality||1}</small></span><button class="btn yellow small" data-phone="sell" data-id="${it.uid}" style="min-height:32px;padding:3px 7px;font-size:9px">P$ ${it.value}</button></div>`).join(''):'<p style="font-size:10px;color:#bca9d6">Nada para vender. Crie, pesque ou plante primeiro!</p>'}</div>`;
    }
    if(app==='bills'){
      const b=g.bills;const overdue=!b.paid&&g.time.day>b.dueDay;
      return `${back}<div class="phone-head"><b>Contas</b></div><div class="phone-panel"><h4>🧾 Conta da semana</h4><p style="font-size:10px;line-height:1.5;margin:0 0 8px">Valor: <b style="color:var(--yellow)">${formatMoney(b.amount)}</b><br>Vencimento: dia ${b.dueDay}<br>Status: <b style="color:${b.paid?'var(--mint)':'var(--coral)'}">${b.paid?'Paga':'Em aberto'}</b>${overdue?'<br><span style="color:var(--coral)">Atrasada! Risco de corte.</span>':''}</p><button class="btn ${b.paid?'ghost':'primary'} small" data-phone="payBills" style="width:100%" ${b.paid?'disabled':''}>${b.paid?'Tudo em dia':'Pagar contas'}</button></div>`;
    }
    if(app==='social'){
      return `${back}<div class="phone-head"><b>Rede Pixel</b></div><div class="phone-panel"><h4>📱 Seu perfil</h4><p style="font-size:9px;color:#c9b8df;line-height:1.4">Poste algo e ganhe um pouco de diversão — ou até patrocínio, se a sorte ajudar.</p><button class="btn primary small" data-phone="post" style="width:100%">Postar agora</button></div><div class="phone-panel"><h4>💡 Hobby do dia</h4><p style="font-size:9px;margin:0;color:#c9b8df">${c.aspirationInfo.icon} ${c.aspirationInfo.name}: ${c.aspirationInfo.desc}</p></div>`;
    }
    return this.phoneHome();
  }
  phoneAction(action,id){
    const g=this.game,c=g.selected;
    if(action==='pizza'){ g.orderPizza(c); this.phoneApp='home'; this.renderPhone(); }
    if(action==='invite'){ g.inviteFriend(); this.handleClose(); }
    if(action==='apply'){ g.applyJob(c,id); this.phoneApp='jobs'; this.renderPhone(); }
    if(action==='party'){ g.startParty(id,c); this.handleClose(); }
    if(action==='adoptChild'){ g.adoptChild(8); this.renderPhone(); }
    if(action==='adoptBaby'){ g.adoptChild(1); this.renderPhone(); }
    if(action==='adoptDog'){ g.adoptPet('dog'); this.renderPhone(); }
    if(action==='adoptCat'){ g.adoptPet('cat'); this.renderPhone(); }
    if(action==='sell'){ g.sellItem(c,id); this.renderPhone(); }
    if(action==='payBills'){ g.payBills(); this.renderPhone(); }
    if(action==='post'){ g.socialMediaPost(); this.renderPhone(); }
  }

  /* ---------- Buy mode ---------- */
  renderBuyPanel(){
    const g=this.game;
    const defs=CATALOG.filter(o=>o.cat===this.buyCategory);
    const body=`
      <div class="build-tabs">${CATEGORY_DATA.map(c=>`<button class="build-tab ${c.id===this.buyCategory?'active':''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`).join('')}</div>
      <div class="build-grid">${defs.map(d=>`<button class="buy-card ${g.buySelection===d.id?'selected':''}" data-buy="${d.id}" ${g.money<d.price?'disabled':''}><span class="bc-ico">${d.icon||'📦'}</span><b>${d.name}</b><span class="bc-sub">${d.w}x${d.h} · conforto ${d.comfort||0}</span><small>${formatMoney(d.price)}</small></button>`).join('')}</div>
      <div class="build-info"><span>${g.buySelection?`Colocando: <b>${CATALOG_MAP[g.buySelection]?.name||''}</b> — toque no lote`:'Escolha um móvel para colocar'}</span><span>${formatMoney(g.money)}</span></div>
      <div class="build-tabs" style="margin-top:5px"><button class="build-tab" data-tool="undo">↩ Desfazer</button><button class="build-tab" data-tool="live">✓ Pronto</button></div>`;
    const frag=document.createDocumentFragment();
    const panel=document.createElement('div'); panel.className='build-panel'; panel.innerHTML=body;
    frag.appendChild(panel); this.modalRoot.innerHTML='';this.modalRoot.appendChild(frag);
    $$('.build-tab[data-cat]',panel).forEach(b=>b.addEventListener('click',()=>{this.buyCategory=b.dataset.cat;this.renderBuyPanel();}));
    $$('[data-buy]',panel).forEach(b=>b.addEventListener('click',()=>{g.buySelection=b.dataset.buy;this.renderBuyPanel();this.audioTick();}));
    $$('.build-tab[data-tool]',panel).forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tool==='undo')g.undoLast();else g.setMode('live');}));
    this.refreshModes();
  }

  /* ---------- Build mode ---------- */
  renderBuildPanel(){
    const g=this.game;
    const tools=[['wall','🧱 Parede'],['door','🚪 Porta'],['window','🪟 Janela'],['floor','🟫 Piso'],['paint','🎨 Pintar'],['delete','⛏ Demolir']];
    const colors=['#d2b386','#e8d7b5','#9b7d67','#7f9d8e','#c87d7b','#b6a6c6','#6b6f7a'];
    const floors=[['wood','Madeira','#bd865a'],['tile','Ladrilho','#dce5da'],['kitchen','Cozinha','#d8c8a3'],['concrete','Concreto','#9da49f'],['grass','Grama','#6ea76a'],['dance','Pista','#392b4b'],['path','Pedra','#b3a17e']];
    const body=`
      <div class="build-tabs">${tools.map(t=>`<button class="build-tab ${g.buildTool===t[0]?'active':''}" data-btool="${t[0]}">${t[1]}</button>`).join('')}</div>
      ${['wall','door','window','paint'].includes(g.buildTool)?`<div class="build-tabs"><span style="font-size:9px;color:#bba9d4;align-self:center;padding:0 3px">Tinta:</span>${colors.map(c=>`<button class="swatch ${this.buildColor===c?'active':''}" data-bcolor="${c}" style="background:${c};width:30px;height:30px;min-height:30px"></button>`).join('')}</div>`:''}
      ${g.buildTool==='floor'?`<div class="build-tabs">${floors.map(f=>`<button class="build-tab ${this.buildFloor===f[0]?'active':''}" data-bfloor="${f[0]}"><span class="floor-swatch" style="background:${f[2]}"></span>${f[1]}</button>`).join('')}</div>`:''}
      <div class="build-info"><span>${g.buildTool==='delete'?'⛏ Toque em parede, piso ou móvel para demolir.':'Toque ou arraste no lote para construir.'}</span><span>${formatMoney(g.money)}</span></div>
      <div class="build-tabs" style="margin-top:5px"><button class="build-tab" data-btool="undo">↩ Desfazer ${g.getUndoLabel()?'· '+escapeHtml(g.getUndoLabel()):''}</button><button class="build-tab" data-btool="live">✓ Pronto</button></div>`;
    const frag=document.createDocumentFragment();
    const panel=document.createElement('div'); panel.className='build-panel'; panel.innerHTML=body;
    frag.appendChild(panel); this.modalRoot.innerHTML='';this.modalRoot.appendChild(frag);
    $$('[data-btool]',panel).forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.btool==='undo') g.undoLast();
      else if(b.dataset.btool==='live') g.setMode('live');
      else { g.setBuildTool(b.dataset.btool); this.renderBuildPanel(); }
    }));
    $$('[data-bcolor]',panel).forEach(b=>b.addEventListener('click',()=>{this.buildColor=b.dataset.bcolor;g.buildColor=this.buildColor;this.renderBuildPanel();}));
    $$('[data-bfloor]',panel).forEach(b=>b.addEventListener('click',()=>{this.buildFloor=b.dataset.bfloor;g.buildFloor=this.buildFloor;g.setBuildTool('floor');this.renderBuildPanel();}));
    g.buildColor=this.buildColor; g.buildFloor=this.buildFloor;
    this.refreshModes();
  }
  refreshBuildPanel(){ if(this.game.mode==='build') this.renderBuildPanel(); if(this.game.mode==='buy') this.renderBuyPanel(); }

  /* ---------- Menu / settings ---------- */
  renderMenu(){
    const g=this.game;
    const slots=SaveSystem.list();
    const body=`<div class="panel-card"><h4>💾 Salvar e carregar</h4>${slots.map(s=>`<div class="save-slot"><span>${s.data?'💾':'▫️'}</span><div class="ss-info"><b>Espaço ${s.slot}${s.slot===g.activeSlot?' · ativo':''}</b><small>${s.meta?`${escapeHtml(s.meta.name)} · dia ${s.meta.day} · ${formatMoney(s.meta.money)}`:'vazio'}</small></div><button class="btn small ${s.slot===g.activeSlot?'primary':'ghost'}" data-save="${s.slot}">Salvar</button><button class="btn small ghost" data-load="${s.slot}" ${s.data?'':'disabled'}>Carregar</button></div>`).join('')}</div>
      <div class="panel-card"><h4>⚙️ Configurações</h4>
        <div class="settings-row"><span>Música<small>Chiptune original</small></span><input type="range" id="musicVol" min="0" max="1" step="0.05" value="${g.settings.music}"></div>
        <div class="settings-row"><span>Efeitos<small>Bipes e delícias sonoras</small></span><input type="range" id="sfxVol" min="0" max="1" step="0.05" value="${g.settings.sfx}"></div>
        <div class="settings-row"><span>Envelhecer<small>Aniversários e gerações</small></span><button class="toggle ${g.settings.aging?'on':''}" data-toggle="aging"></button></div>
        <div class="settings-row"><span>Livre-arbítrio<small>Personagens tomam decisões sozinhos</small></span><button class="toggle ${g.settings.freeWill?'on':''}" data-toggle="freeWill"></button></div>
        <div class="settings-row"><span>Pular sono<small>Acelera quando todos dormem</small></span><button class="toggle ${g.settings.autoSkip?'on':''}" data-toggle="autoSkip"></button></div>
        <div class="settings-row"><span>Duração da vida<small>Curta, normal ou longa</small></span><div class="seg" style="width:170px">${['curta','normal','longa'].map(x=>`<button data-life="${x}" class="${g.settings.lifespan===x?'active':''}" style="min-height:30px">${x}</button>`).join('')}</div></div>
        <div class="settings-row"><span>Tutorial<small>Rever os primeiros passos</small></span><button class="btn small ghost" id="reTutorial">Abrir</button></div>
      </div>
      <div class="panel-card"><h4>🏡 Sua vida</h4><p>${escapeHtml(g.householdName)} · ${g.characters.length}/6 moradores · ${g.pets.length} pet(s)<br>Dia ${g.time.day} · ${g.time.weekdayName} · ${g.time.clock}<br>Patrimônio da casa: ${formatMoney(g.homeLot?.value()||0)}</p><div class="btn-row" style="margin-top:8px"><button class="btn ghost small" id="goStart">🏠 Voltar ao início</button><button class="btn ghost small" id="saveQuit">💾 Salvar e sair</button></div></div>`;
    const panel=this.openFull('☰ Menu','Pixels & Caos · pausa e configurações',body);
    $$('[data-save]',panel).forEach(b=>b.addEventListener('click',()=>{g.saveGame(Number(b.dataset.save));this.renderMenu();}));
    $$('[data-load]',panel).forEach(b=>b.addEventListener('click',()=>{this.loadSlot(Number(b.dataset.load));}));
    $$('[data-toggle]',panel).forEach(b=>b.addEventListener('click',()=>{
      const key=b.dataset.toggle;g.settings[key]=!g.settings[key];b.classList.toggle('on',!!g.settings[key]);
      if(key==='freeWill'&&!g.settings.freeWill) g.characters.forEach(c=>{c.lastAuto=g.absMinutes+999;});
    }));
    $$('[data-life]',panel).forEach(b=>b.addEventListener('click',()=>{g.settings.lifespan=b.dataset.life;this.renderMenu();}));
    $('#musicVol',panel)?.addEventListener('input',e=>{g.settings.music=Number(e.target.value);g.settings.musicOn=g.settings.music>0;g.audio.setVolumes(g.settings.music,g.settings.sfx);g.audio.setMusicOn(g.settings.musicOn);});
    $('#sfxVol',panel)?.addEventListener('input',e=>{g.settings.sfx=Number(e.target.value);g.settings.sfxOn=g.settings.sfx>0;g.audio.setVolumes(g.settings.music,g.settings.sfx);g.audio.setSfxOn(g.settings.sfxOn);});
    $('#reTutorial',panel)?.addEventListener('click',()=>{this.closeModal();this.tutorialStep=0;this.showTutorial();});
    $('#goStart',panel)?.addEventListener('click',()=>{g.saveGame(g.activeSlot,true);this.exitToStart();});
    $('#saveQuit',panel)?.addEventListener('click',()=>{g.saveGame(g.activeSlot,true);this.exitToStart();});
  }
  exitToStart(){
    this.game.started=false;
    this.game.setMode('live');
    this.closeModal(); this.closeAll();
    this.showStart();
    this.renderer && this.renderer.render();
  }

  /* ---------- Home purchase ---------- */
  showHomePurchase(lot){
    const g=this.game;
    const body=`<div class="panel-card"><p><b>${lot.name}</b> está à venda por <b style="color:var(--yellow)">${formatMoney(lot.price)}</b>. Móveis inclusos e vizinhança nova.</p><p style="margin-top:6px">Seu saldo: ${formatMoney(g.money)}</p></div><div class="btn-row"><button class="btn primary" id="buyHome" ${g.money<lot.price?'disabled':''}>Comprar e mudar</button><button class="btn ghost" id="rentView">Só visitar</button></div>`;
    const sheet=this.openSheet('🏡 Casa Ipê','Uma mudança de vida.',body);
    $('#buyHome',sheet)?.addEventListener('click',()=>{ g.purchaseHome(lot.id); this.closeModal(); });
    $('#rentView',sheet)?.addEventListener('click',()=>{ lot.forSale=false; g.travelTo(lot.id); lot.forSale=true; });
  }

  /* ---------- Tutorial ---------- */
  maybeTutorial(){ if(!this.game.settings.tutorialDone) setTimeout(()=>this.showTutorial(),550); }
  showTutorial(){
    const steps=[
      {icon:'🏡',title:'Bem-vindo ao seu caos',text:'Toque em objetos para ver ações. Toque no chão para andar. Arraste com um dedo para passear pela casa e use dois dedos para dar zoom.'},
      {icon:'❤️',title:'Necessidades e emoções',text:'As oito necessidades caem com o tempo. Comida, banho, banheiro e sono mantêm todos felizes. O humor muda o desempenho no trabalho e nas habilidades.'},
      {icon:'🧠',title:'Vida com livre-arbítrio',text:'Se ninguém mandar, cada personagem decide o que fazer — especialmente se algo estiver apertando. Desligue em Menu se preferir controle total.'},
      {icon:'🛠️',title:'Compre, construa, decore',text:'Em Comprar, escolha móveis e toque no lote. Em Construir, levante paredes, portas e pisos. Dá até para desfazer e demolir.'},
      {icon:'🌳',title:'O bairro é seu',text:'Use o Mapa para visitar o parque, café, academia, clube, praia e mais. Faça amigos, encontre um amor e invente histórias que ninguém escreveu.'},
    ];
    const s=steps[this.tutorialStep]||steps[0];
    const body=`<div class="tutorial-ico">${s.icon}</div><h2>${s.title}</h2><p>${s.text}</p><div class="tutorial-steps">${steps.map((_,i)=>`<i class="${i===this.tutorialStep?'on':''}"></i>`).join('')}</div><div class="btn-row"><button class="btn ghost small" id="skipTut">Pular</button><button class="btn primary small" id="nextTut">${this.tutorialStep>=steps.length-1?'Viver!':'Próximo →'}</button></div>`;
    const frag=document.createDocumentFragment();
    frag.appendChild(this.scrim(false));
    const card=document.createElement('div');card.className='tutorial-card';card.innerHTML=body;
    frag.appendChild(card);
    this.modalRoot.innerHTML='';this.modalRoot.appendChild(frag);
    $('#skipTut',card).addEventListener('click',()=>this.finishTutorial());
    $('#nextTut',card).addEventListener('click',()=>{
      if(this.tutorialStep>=steps.length-1) this.finishTutorial();
      else { this.tutorialStep++; this.showTutorial(); }
    });
  }
  finishTutorial(){
    this.game.settings.tutorialDone=true;
    this.closeModal();
    this.game.saveGame(this.game.activeSlot,true);
    this.toast('Tutorial concluído. Agora viva do seu jeito! ✨','success');
  }

  /* ---------- Character creation ---------- */
  openCreation(){
    const first=Character.random(null,{age:26});
    first.surname=pick(CREATOR_SURNAMES);
    this.creation={step:0,members:[],draft:first,emptyHouse:false};
    this.creationRoot.innerHTML='';
    this.renderCreation();
  }
  renderCreation(){
    const cr=this.creation; if(!cr) return;
    const d=cr.draft;
    const step=cr.step;
    const root=this.creationRoot;
    const stepsBar=`<div class="step-dots">${[0,1,2].map(i=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div>`;
    let content='';
    if(step===0){
      const stages=[['bebe',0,2],['crianca',7,9],['adolescente',15,17],['jovem',24,29],['adulto',35,45],['idoso',68,75]];
      content=`<div class="create-card"><h2>Quem chegou ao bairro?</h2><p class="sub">Escolha o nome, a idade e o visual. Tudo pode ser original — inclusive a cor do pijama.</p>
        <div class="creator-preview"><span class="preview-info">Prévia ao vivo</span><canvas id="createPreview"></canvas></div>
        <div class="field"><label>Nome</label><div style="display:flex;gap:5px"><input class="text-input" id="createName" value="${escapeHtml(d.name)}" maxlength="18" autocomplete="off"><button class="btn ghost small" id="randomName">🎲</button></div></div>
        <div class="field"><label>Sobrenome da família</label><input class="text-input" id="createSurname" value="${escapeHtml(d.surname)}" maxlength="18"></div>
        <div class="field"><label>Fase da vida</label><div class="seg four">${stages.map(s=>`<button data-stage="${s[0]}" class="${d.stageInfo.id===s[0]?'active':''}">${STAGE_MAP[s[0]].icon} ${STAGE_MAP[s[0]].name}</button>`).join('')}</div></div>
        <div class="field"><label>Apresentação de gênero</label><div class="seg">${[['feminino','Feminina'],['masculino','Masculina'],['neutro','Andrógina']].map(g=>`<button data-gender="${g[0]}" class="${d.gender===g[0]?'active':''}">${g[1]}</button>`).join('')}</div></div>
        <div class="field"><label>Tom de pele</label><div class="swatches">${SKIN_TONES.map(c=>`<button class="swatch ${d.appearance.skin===c?'active':''}" data-skin="${c}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="field"><label>Estilo de cabelo</label><div class="seg four">${HAIR_STYLES.map(h=>`<button data-hair="${h.id}" class="${d.appearance.hairStyle===h.id?'active':''}">${h.name}</button>`).join('')}</div></div>
        <div class="field"><label>Cor do cabelo</label><div class="swatches">${HAIR_COLORS.map(c=>`<button class="swatch ${d.appearance.hair===c?'active':''}" data-haircolor="${c}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="field"><label>Cor dos olhos</label><div class="swatches">${EYE_COLORS.map(c=>`<button class="swatch ${d.appearance.eyes===c?'active':''}" data-eyecolor="${c}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="field"><label>Roupas · toque nos potes de tinta</label><div class="seg four">${OUTFIT_TYPES.map(o=>`<div style="text-align:center"><span style="font-size:8px;color:#bfaed8">${o.icon} ${o.name}</span><br><input type="color" data-outfit="${o.id}" value="${d.appearance.outfits[o.id]}" style="width:50px;height:36px;border:2px solid #0d0a14;border-radius:6px;background:#1c1528;padding:2px"></div>`).join('')}</div></div>
      </div>`;
    } else if(step===1){
      content=`<div class="create-card"><h2>A essência de ${escapeHtml(d.name)}</h2><p class="sub">Escolha 3 traços e uma aspiração de vida. Eles mudam o humor, a autonomia e o jeito de encarar o bairro.</p>
        <div class="creator-preview" style="min-height:100px"><span class="preview-info">${d.name}, ${d.age} anos</span><canvas id="createPreview"></canvas></div>
        <h3>Traços <span class="trait-count">${d.traits.length}/3</span></h3>
        <div class="traits-grid">${TRAITS.map(t=>`<button class="trait-btn ${d.traits.includes(t.id)?'active':''}" data-trait="${t.id}"><b>${t.icon} ${t.name}</b><small>${t.desc}</small></button>`).join('')}</div>
        <h3 style="margin-top:12px">Aspiração de vida</h3>
        <div class="asp-grid">${ASPIRATIONS.map(a=>`<button class="asp-btn ${d.aspiration===a.id?'active':''}" data-asp="${a.id}"><i>${a.icon}</i><b>${a.name}</b><small>${a.desc}</small></button>`).join('')}</div>
      </div>`;
    } else {
      const totals=cr.members.length;
      content=`<div class="create-card"><h2>Sua família${totals?` · ${totals}`:''}</h2><p class="sub">Até 6 pessoas. Cada uma tem necessidades, sonhos e um jeito próprio de bagunçar a casa.</p>
        <div class="member-list">${cr.members.map((m,i)=>`<div class="member-row"><canvas data-member-preview="${i}"></canvas><div class="mi"><b>${escapeHtml(m.fullName)}</b><small>${m.ageLabel} · ${m.traitInfo.map(t=>t.name).join(', ')}<br>${m.aspirationInfo.icon} ${m.aspirationInfo.name}</small></div><button data-remove="${i}" title="Remover">✕</button></div>`).join('')||'<p style="font-size:10px;color:#bca9d6">Ainda não tem ninguém. Adicione o primeiro morador.</p>'}</div>
        <div class="btn-row" style="margin-top:9px">${totals<6?`<button class="btn ghost" id="addMember">＋ Adicionar morador</button>`:''}</div>
        <h3 style="margin-top:14px">Como começar?</h3>
        <div class="house-choice">
          <button class="house-option ${!cr.emptyHouse?'active':''}" data-house="furnished"><i>🏠</i><b>Casa mobiliada</b><small>Cama, fogão, sofá e jardim. P$ 2.500 no bolso.</small></button>
          <button class="house-option ${cr.emptyHouse?'active':''}" data-house="empty"><i>📐</i><b>Terreno vazio</b><small>Construa do zero com P$ 9.000 de orçamento.</small></button>
        </div>
        <p class="creation-hint">${cr.emptyHouse?'Modo Construir abre com paredes e piso esperando você.':'A casa começa pequena, mas cabe uma vida inteira.'}<br>Aspirações e traços podem ser vistos no painel do personagem.</p>
      </div>`;
    }
    root.innerHTML=`<div class="creation-screen"><div class="creation-inner"><div class="create-top"><span class="logo-mini">PIXELS &amp; CAOS · CRIAÇÃO</span><button class="close-btn" id="closeCreation">✕</button></div>${stepsBar}${content}<div class="creation-actions">${step>0?`<button class="btn ghost" id="createBack" style="flex:.65">← Voltar</button>`:''}<button class="btn ${step===2?'accent':'primary'}" id="createNext">${step===0?'Personalidade →':step===1?'Adicionar à família →':'Começar a vida ✨'}</button></div></div></div>`;
    const preview=$('#createPreview');
    if(preview) drawPortrait(preview,d,{time:performance.now()/1000});
    $$('[data-member-preview]',root).forEach(cv=>{ const m=cr.members[Number(cv.dataset.memberPreview)]; if(m) drawPortrait(cv,m,{time:1}); });
    $('#closeCreation').addEventListener('click',()=>this.closeCreation());
    $('#createNext').addEventListener('click',()=>this.creationNext());
    $('#createBack',root)?.addEventListener('click',()=>{cr.step=Math.max(0,cr.step-1);this.renderCreation();});
    if(step===0){
      $('#createName').addEventListener('input',e=>{d.name=e.target.value;});
      $('#createSurname').addEventListener('input',e=>{d.surname=e.target.value;});
      $('#randomName').addEventListener('click',()=>{d.name=pick(CREATOR_NAMES[d.gender]||CREATOR_NAMES.neutro);$('#createName').value=d.name;this.renderCreation();});
      $$('[data-stage]',root).forEach(b=>b.addEventListener('click',()=>{
        const s=b.dataset.stage; const ages={bebe:1,crianca:8,adolescente:15,jovem:25,adulto:38,idoso:70}; d.age=ages[s]; this.renderCreation();
      }));
      $$('[data-gender]',root).forEach(b=>b.addEventListener('click',()=>{d.gender=b.dataset.gender;d.name=(d.name||pick(CREATOR_NAMES[d.gender]));this.renderCreation();}));
      $$('[data-skin]',root).forEach(b=>b.addEventListener('click',()=>{d.appearance.skin=b.dataset.skin;this.renderCreation();}));
      $$('[data-hair]',root).forEach(b=>b.addEventListener('click',()=>{d.appearance.hairStyle=b.dataset.hair;this.renderCreation();}));
      $$('[data-haircolor]',root).forEach(b=>b.addEventListener('click',()=>{d.appearance.hair=b.dataset.haircolor;this.renderCreation();}));
      $$('[data-eyecolor]',root).forEach(b=>b.addEventListener('click',()=>{d.appearance.eyes=b.dataset.eyecolor;this.renderCreation();}));
      $$('[data-outfit]',root).forEach(inp=>inp.addEventListener('input',e=>{d.appearance.outfits[inp.dataset.outfit]=e.target.value;const cv=$('#createPreview');if(cv)drawPortrait(cv,d);}));
    }
    if(step===1){
      $$('[data-trait]',root).forEach(b=>b.addEventListener('click',()=>{
        const id=b.dataset.trait;
        if(d.traits.includes(id)) d.traits=d.traits.filter(t=>t!==id);
        else if(d.traits.length<3) d.traits.push(id);
        else this.toast('Máximo de 3 traços. Escolha com carinho.','info');
        this.renderCreation();
      }));
      $$('[data-asp]',root).forEach(b=>b.addEventListener('click',()=>{d.aspiration=b.dataset.asp;this.renderCreation();}));
    }
    if(step===2){
      $('#addMember')?.addEventListener('click',()=>{
        const nd=Character.random(null,{age:pick([8,15,24,32]),surname:d.surname});
        nd.surname=d.surname;
        cr.draft=nd; cr.step=0; this.renderCreation();
      });
      $$('[data-remove]',root).forEach(b=>b.addEventListener('click',()=>{cr.members.splice(Number(b.dataset.remove),1);this.renderCreation();}));
      $$('[data-house]',root).forEach(b=>b.addEventListener('click',()=>{cr.emptyHouse=b.dataset.house==='empty';this.renderCreation();}));
    }
  }
  creationNext(){
    const cr=this.creation; if(!cr) return;
    const d=cr.draft;
    if(cr.step===0){
      d.name=($('#createName')?.value||d.name).trim()||'Pixel';
      d.surname=($('#createSurname')?.value||d.surname).trim()||pick(CREATOR_SURNAMES);
      if(d.stageInfo.id==='bebe'){ d.age=1; }
      cr.step=1; this.renderCreation(); this.audioTick();
    } else if(cr.step===1){
      if(d.traits.length<3){ this.toast('Escolha exatamente 3 traços. A personalidade precisa de camadas!','error'); return; }
      cr.members.push(d); cr.step=2; this.renderCreation(); this.audioTick();
    } else {
      if(!cr.members.length){ this.toast('Adicione pelo menos um morador.','error'); return; }
      const householdName='Família '+(cr.members[0].surname||'Pixel');
      this.creationRoot.innerHTML='';
      this.creation=null;
      this.game.startNewGame({members:cr.members,empty:cr.emptyHouse,householdName,slot:1});
      this.hideStart(); this.maybeTutorial();
    }
  }
  closeCreation(){ this.creationRoot.innerHTML=''; this.creation=null; }
}
