/* ============================================================
   GAME SYSTEMS — time, actions, autonomy, careers, events, economy
   ============================================================ */

const PARTY_TYPES = [
  {id:'aniversario',name:'Festa de Aniversário',icon:'🎂',cost:180,duration:300,goal:2,desc:'Bolo, velas e gente cantando desafinado.',reward:300},
  {id:'churrasco',name:'Churrasco da Firma',icon:'🍖',cost:220,duration:360,goal:3,desc:'Carne na brasa e conversa mole.',reward:250},
  {id:'pijama',name:'Festa do Pijama',icon:'🌙',cost:120,duration:420,goal:3,desc:'Pipoca, filme e segredos depois da meia-noite.',reward:200},
  {id:'casamento',name:'Casamento Pixel',icon:'💒',cost:650,duration:480,goal:4,desc:'O grande dia, com bolo e lágrimas.',reward:900},
];

class Game {
  constructor(){
    this.version = SAVE_VERSION;
    this.audio = new AudioManager();
    this.canvas = null; this.renderer = null; this.ui = null; this.input = null;
    this.time = new TimeSystem();
    this.settings = {
      music:.2, sfx:.36, musicOn:true, sfxOn:true, aging:true, freeWill:true, autoSkip:true,
      lifespan:'normal', tutorialDone:false, needsOpen:true,
    };
    this.mode = 'live';
    this.characters = [];
    this.npcs = [];
    this.pets = [];
    this.lots = {};
    this.currentLotId = 'home';
    this.homeLotId = 'home';
    this.householdName = 'Família Pixel';
    this.selectedId = null;
    this.money = 2500;
    this.notifications = [];
    this.toasts = [];
    this.activeSlot = 1;
    this.started = false;
    this.pausedByFocus = false;
    this.autoSaveReal = 0;
    this.minuteFraction = 0;
    this.selectedObjectUid = null;
    this.undoStack = [];
    this.ghost = null;
    this.pendingDeliveries = [];
    this.party = null;
    this.partyGuests = [];
    this.eventCooldown = 0;
    this.bills = {amount:0,dueDay:8,paid:true,utilitiesOff:false,overdue:0};
    this.weather = 'sun';
    this.seasonIndex = 0;
    this.clock = 0;
    this.simTimer = 0;
    this.uiTimer = 0;
    this.creation = null;
    this.firstRun = true;
    this.lastEventAbs = 0;
    this.houseValue = 0;
    this.debug = false;
    this._bindFocus();
  }

  get currentLot(){ return this.lots[this.currentLotId] || this.lots[this.homeLotId] || createHomeLot(); }
  get homeLot(){ return this.lots[this.homeLotId]; }
  get selected(){ return this.characters.find(c=>c.id===this.selectedId) || this.characters[0] || null; }
  get absMinutes(){ return (this.time.day-1)*1440 + this.time.minutes; }
  get isNight(){ return this.time.hour<6 || this.time.hour>=21; }
  get householdNameLabel(){ return this.householdName; }
  get currentBills(){ return this.bills; }
  get simRunning(){ return this.started && !this.time.paused && (this.mode==='live'); }
  allPeople(){ return [...this.characters, ...this.npcs]; }
  findPerson(id){ return this.allPeople().find(c=>c.id===id) || null; }
  findPersonAnywhere(id){
    return this.findPerson(id) || (TOWNIE_MAP[id] ? this.npcFromTownie(id,false) : null);
  }
  findObject(uid){ return this.currentLot.objects.find(o=>o.uid===uid) || null; }
  findPet(id){ return this.pets.find(p=>p.id===id) || null; }
  randomTownie(exclude=[]){
    return pick(TOWNIES.filter(t=>!exclude.includes(t.id)));
  }
  npcFromTownie(id,spawn=true){
    const base=TOWNIE_MAP[id] || TOWNIES[0];
    if(this.npcs.find(n=>n.id===base.id)) return this.npcs.find(n=>n.id===base.id);
    const c = new Character({
      id:base.id, name:base.name.split(' ')[0], surname:base.name.split(' ').slice(1).join(' '),
      isNPC:true, age:base.age, gender:base.gender, traits:base.traits, aspiration:base.aspiration,
      appearance:{...base.looks, outfits:{casual:base.looks?.shirt||'#8d6e63',work:'#59697c',sleep:'#9d83b5',party:'#cd6f8d'}},
      needs:{fome:rand(50,90),energia:rand(50,90),higiene:rand(50,90),banheiro:rand(50,90),diversao:rand(50,90),social:rand(50,90),conforto:rand(50,90),ambiente:rand(50,90)},
    });
    c.npcJob = base.job; c.npcBio = base.bio;
    if(spawn){
      const lot=this.currentLot;
      const spawn=lot.spawn[(this.npcs.length+1)%lot.spawn.length]||{x:10,y:10};
      const spot=this.findFreeSpotNear(spawn.x+randInt(-2,2),spawn.y+randInt(-1,2))||spawn;
      c.x=spot.x;c.y=spot.y;
      this.npcs.push(c);
    }
    return c;
  }
  findFreeSpotNear(x,y){
    const lot=this.currentLot;
    x=clamp(Math.round(x),0,lot.w-1); y=clamp(Math.round(y),0,lot.h-1);
    for(let r=0;r<8;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
      const nx=x+dx, ny=y+dy;
      if(lot.walkable(nx,ny) && !this.allPeople().some(c=>Math.round(c.x)===nx&&Math.round(c.y)===ny)) return {x:nx,y:ny};
    }
    return null;
  }

  /* ---------- New game / loading ---------- */
  startNewGame(config={}){
    const members = config.members?.length ? config.members : [Character.random()];
    this.started = true;
    this.firstRun = false;
    this.settings = Object.assign(this.settings, config.settings||{});
    this.homeLotId = 'home';
    this.currentLotId = 'home';
    this.lots = {};
    Object.entries(LOT_FACTORY).forEach(([id,fn])=>{ try{ this.lots[id]=fn(); }catch(e){ console.warn('lot factory',id,e); } });
    this.lots.home = createHomeLot(!!config.empty);
    this.money = config.empty ? 9000 : 2500;
    this.lots.home.playerOwned = true;
    const spawnedSoFar=[];
    this.characters = members.map((c,i)=>{
      const ch = c instanceof Character ? c : new Character(c);
      ch.isNPC=false; ch.createdByPlayer=true;
      const used=new Set(spawnedSoFar.map(o=>`${Math.round(o.x)},${Math.round(o.y)}`));
      let spot=null;
      for(const candidate of this.lots.home.spawn){
        const key=`${candidate.x},${candidate.y}`;
        if(!used.has(key) && this.lots.home.walkable(candidate.x,candidate.y)){ spot=candidate; break; }
      }
      if(!spot){
        const base=this.lots.home.spawn[i%this.lots.home.spawn.length]||{x:10,y:13};
        spot=this.findFreeSpotNear(base.x,base.y)||this.findWalkableInLot(this.lots.home,base.x,base.y);
      }
      ch.x=spot.x; ch.y=spot.y; ch.queue=[]; ch.action=null; ch.path=[];
      spawnedSoFar.push(ch);
      return ch;
    }).slice(0,6);
    this.characters.forEach((c,i)=>{
      c.selected = i===0;
      this.characters.forEach(other=>{
        if(other.id!==c.id){
          const r=c.relationship(other.id);
          r.friend=70;r.met=true;r.family=true;
        }
      });
    });
    this.selectedId=this.characters[0]?.id||null;
    this.lots.home.characters=this.characters;
    this.householdName = config.householdName || ('Família '+(this.characters[0]?.surname||'Pixel'));
    this.time = new TimeSystem(); this.time.paused=false; this.time.speed=1;
    this.time.seasonIndex=0; this.time.weather='sun'; this.weather='sun';
    this.mode='live';
    this.activeSlot=config.slot||1;
    this.notifications=[]; this.pets=[]; this.npcs=[];
    this.pendingDeliveries=[]; this.party=null; this.undoStack=[];
    this.bills={amount:180,dueDay:5,paid:false,utilitiesOff:false,overdue:0};
    this.minuteFraction=0;
    this.simTimer=0; this.autoSaveReal=0;
    this.settings.tutorialDone = !!config.skipTutorial || !!this.settings.tutorialDone;
    this.notify('Bem-vindo(a) a Pixels & Caos! Sua história começa agora.','🏡');
    if(config.empty) this.notify('Terreno vazio: use o modo Construir para erguer seu lar.','🧱');
    else this.notify('Sua casa já tem o básico. Explore, cozinhe e viva!','✨');
    this.addNotification('Dica: toque em objetos para descobrir ações.','💡');
    if(this.ui){ this.ui.attachGame(this); }
    if(this.renderer){ this.renderer.attachGame(this); this.renderer.focusCharacter(this.selected,true); }
    this.refresh();
    this.audio.resume();
    this.audio.startMusic();
    return this;
  }
  startQuickGame(){
    const surname=pick(CREATOR_SURNAMES);
    const a=new Character({name:pick(CREATOR_NAMES.feminino),surname,age:26,gender:'feminino',traits:['sociavel','criativo','ambicioso'],aspiration:'criatividade',
      appearance:{skin:'#d79b73',hair:'#4a2c20',hairStyle:'longo',eyes:'#477fa3',outfits:{casual:'#5f9f92',work:'#54708d',sleep:'#9b7bb5',party:'#d56b80'}}});
    const b=new Character({name:pick(CREATOR_NAMES.masculino),surname,age:30,gender:'masculino',traits:['genio','organizado','caseiro'],aspiration:'conhecimento',
      appearance:{skin:'#b97a52',hair:'#241c1c',hairStyle:'curto',eyes:'#3f6d58',outfits:{casual:'#7c74c9',work:'#596d5d',sleep:'#6f89bc',party:'#d6b848'}}});
    const c=new Character({name:pick(CREATOR_NAMES.feminino),surname,age:9,gender:'feminino',traits:['engracado','aventureiro','amante_animais'],aspiration:'popularidade',
      appearance:{skin:'#e8b894',hair:'#7a3f2a',hairStyle:'maria',eyes:'#38251c',outfits:{casual:'#d6a34a',work:'#6d5d91',sleep:'#d69aae',party:'#8c6ac4'}}});
    return this.startNewGame({members:[a,b,c],slot:1,skipTutorial:false});
  }
  findWalkableInLot(lot,x,y){
    for(let r=0;r<10;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(lot.walkable(x+dx,y+dy)) return {x:x+dx,y:y+dy};
    }
    return {x:1,y:1};
  }
  loadPayload(payload){
    if(!payload || !payload.state) return false;
    const s=payload.state;
    try{
      this.started=true; this.firstRun=false;
      this.settings=Object.assign(this.settings,s.settings||{});
      this.activeSlot=s.activeSlot||1;
      this.homeLotId=s.homeLotId||'home';
      this.currentLotId=s.currentLotId||this.homeLotId;
      this.money=s.money??2500;
      this.householdName=s.householdName||'Família Pixel';
      this.time=new TimeSystem();
      this.time.syncFrom(s.day,s.minutes,s.speed,s.paused,s.seasonIndex,s.weather);
      this.weather=s.weather||'sun';
      this.bills=s.bills||{amount:0,dueDay:8,paid:true,utilitiesOff:false,overdue:0};
      this.notifications=s.notifications||[];
      this.party=s.party||null; this.partyGuests=s.partyGuests||[];
      this.pendingDeliveries=s.pendingDeliveries||[];
      this.lots={};
      Object.entries(LOT_FACTORY).forEach(([id,fn])=>{ if(!s.lots?.[id]){ try{this.lots[id]=fn();}catch(e){} } });
      Object.entries(s.lots||{}).forEach(([id,data])=>{ const lot=Lot.hydrate(data); if(lot) this.lots[id]=lot; });
      if(!this.lots.home) this.lots.home=createHomeLot(false);
      this.characters=(s.characters||[]).map(d=>Character.fromSave(d));
      this.characters.forEach(c=>{
        c.queue=[];c.action=null;c.path=[];c.hidden=false;c.moving=false;
        c.selected=c.id===s.selectedId;
      });
      if(!this.characters.length) this.characters=[Character.random()];
      this.selectedId=s.selectedId||this.characters[0].id;
      if(!this.characters.find(c=>c.id===this.selectedId)) this.selectedId=this.characters[0].id;
      this.pets=(s.pets||[]).map(p=>Object.assign(new Pet(p),p));
      this.npcs=[]; this.minuteFraction=0; this.autoSaveReal=0;
      if(this.currentLot && this.currentLot.type==='public') this.spawnLotNPCs();
      if(this.ui){ this.ui.attachGame(this); }
      if(this.renderer){ this.renderer.attachGame(this); this.renderer.focusCharacter(this.selected,true); }
      this.refresh();
      this.notify('Vida carregada. De onde paramos?','💾');
      this.audio.resume();
      this.audio.startMusic();
      return true;
    }catch(e){ console.error('Load failed',e); return false; }
  }
  serialize(){
    this.houseValue=this.homeLot?.value()||0;
    return {
      day:this.time.day, minutes:this.time.minutes, speed:this.time.speed, paused:this.time.paused,
      seasonIndex:this.time.seasonIndex, weather:this.weather,
      money:this.money, homeLotId:this.homeLotId, currentLotId:this.currentLotId,
      householdName:this.householdName, selectedId:this.selectedId,
      characters:this.characters.map(c=>c.serialize()),
      pets:this.pets.map(p=>p.serialize()),
      lots:Object.fromEntries(Object.entries(this.lots).map(([id,l])=>[id,l.serialize()])),
      settings:this.settings, activeSlot:this.activeSlot, bills:this.bills,
      notifications:this.notifications.slice(0,40), party:this.party, partyGuests:this.partyGuests,
      pendingDeliveries:this.pendingDeliveries,
    };
  }
  saveGame(slot=this.activeSlot,silent=false){
    this.activeSlot=slot;
    const ok=SaveSystem.write(slot,this.serialize());
    if(!silent) this.toast(ok?'Jogo salvo no espaço '+slot+'. 💾':'Não foi possível salvar. 😢',ok?'success':'error');
    if(ok && this.ui) this.ui.refreshSaveSlots();
    return ok;
  }
  _bindFocus(){
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){
        if(this.started && !this.time.paused){ this.pausedByFocus=true; this.time.paused=true; this.saveGame(this.activeSlot,true); }
      } else if(this.pausedByFocus){
        this.pausedByFocus=false;
        this.toast('Jogo pausado enquanto você esteve fora. Toque em ▶ para voltar.','⏸');
      }
    });
  }

  /* ---------- Notifications / UI bridge ---------- */
  notify(text,icon='✨'){
    this.toast(text);
    this.addNotification(text,icon);
  }
  toast(text,type='info'){
    if(this.ui) this.ui.toast(text,type);
    else this.toasts.push({text,type});
  }
  addNotification(text,icon='✨'){
    this.notifications.unshift({text,icon,day:this.time.day,time:formatClock(this.time.minutes),stamp:Date.now()});
    if(this.notifications.length>50) this.notifications.length=50;
    if(this.ui) this.ui.refreshNotifBadge();
  }
  refresh(){
    if(this.ui) this.ui.refreshAll();
    if(this.renderer) this.renderer.gestureDirty=true;
  }
  setSpeed(speed){
    speed=Number(speed);
    if(speed===0){ this.time.paused=true; }
    else { this.time.paused=false; this.time.speed=clamp(speed,1,3); }
    this.audio.resume();
    if(this.ui) this.ui.refreshSpeed();
    if(this.simRunning && this.mode==='live') this.audio.startMusic();
  }
  toggleSpeedPause(){ if(this.time.paused) this.setSpeed(this.time.speed||1); else this.setSpeed(0); }

  /* ---------- Selection / travel ---------- */
  selectCharacter(id){
    const ch=this.characters.find(c=>c.id===id); if(!ch) return;
    this.characters.forEach(c=>c.selected=false); ch.selected=true; this.selectedId=id;
    if(this.renderer) this.renderer.focusCharacter(ch,true);
    this.refresh();
    this.audio.sfx('click');
  }
  cycleCharacter(){
    if(!this.characters.length) return;
    const i=this.characters.findIndex(c=>c.id===this.selectedId);
    this.selectCharacter(this.characters[(i+1)%this.characters.length].id);
  }
  travelTo(lotId){
    if(!this.lots[lotId]){ if(LOT_FACTORY[lotId]) this.lots[lotId]=LOT_FACTORY[lotId](); else return; }
    const dest=this.lots[lotId];
    if(dest.forSale && !dest.playerOwned){
      if(this.ui) this.ui.showHomePurchase(dest);
      return;
    }
    this.currentLotId=lotId;
    this.npcs=[]; this.currentLot.resetTransient();
    this.spawnHouseholdAtLot(dest);
    if(dest.type==='public') this.spawnLotNPCs();
    if(this.audio) this.audio.sfx('door');
    this.notify(`${this.householdName} chegou em ${dest.name}.`,'🚪');
    this.mode='live';
    if(this.renderer) this.renderer.focusCharacter(this.selected,true);
    if(this.ui){ this.ui.closeAll(); this.ui.onModeChange('live'); }
    this.refresh();
    this.checkArrival(dest);
  }
  purchaseHome(lotId){
    const lot=this.lots[lotId]; if(!lot) return;
    if(this.money<lot.price){ this.toast('Pixels insuficientes para comprar esta casa.','error'); return; }
    this.money-=lot.price; lot.playerOwned=true; lot.forSale=false; this.homeLotId=lotId;
    this.notify(`${lot.name} agora é o seu novo lar! Parabéns!`,'🔑');
    this.audio.sfx('cash');
    this.travelTo(lotId);
    this.checkAspiration(this.selected);
  }
  spawnHouseholdAtLot(lot){
    const used=new Set();
    this.characters.forEach((c,i)=>{
      c.path=[]; c.moving=false; c.queue=[]; c.action=null; c.hidden=false;
      let spot=null;
      for(const candidate of lot.spawn){
        const key=`${candidate.x},${candidate.y}`;
        if(!used.has(key) && lot.walkable(candidate.x,candidate.y)){ spot=candidate; break; }
      }
      if(!spot){
        const sp=lot.spawn[i%lot.spawn.length]||{x:2,y:2};
        spot=this.findWalkableInLot(lot,sp.x,sp.y);
      }
      used.add(`${spot.x},${spot.y}`);
      c.x=spot.x;c.y=spot.y;
    });
    lot.characters=this.characters;
  }
  spawnLotNPCs(){
    this.npcs=[];
    const ids=(this.currentLot.npcIds||[]).slice(0,4);
    ids.forEach(id=>this.npcFromTownie(id,true));
    // always a couple of extra neighbors at public hotspots
    if(['park','beach','club','cafe'].includes(this.currentLotId) && this.npcs.length<3){
      const extras=TOWNIES.filter(t=>!ids.includes(t.id)).sort(()=>Math.random()-.5).slice(0,2);
      extras.forEach(t=>this.npcFromTownie(t.id,true));
    }
    this.currentLot.characters=[...this.characters,...this.npcs];
  }
  checkArrival(lot){
    if(lot.id==='school' && this.characters.some(c=>c.age<18)){
      this.addNotification('As crianças já têm escola. Que tal uma festa de aniversário?','🏫');
    }
    if(lot.id==='club') this.addNotification('O Clube Neon está bombando. Toque na pista para dançar.','🪩');
  }

  /* ---------- Action queue ---------- */
  makeAction(id, opts={}){
    const def=ACTIONS[id]; if(!def) return null;
    const a={
      id, name:opts.name||def.name, icon:opts.icon||def.icon, minutes:opts.minutes||def.minutes,
      anim:opts.anim||def.anim, needs:def.needs||{}, skill:def.skill||null, moodlet:def.moodlet||null,
      requires:def.requires||{}, special:def.special||null, targetUid:opts.targetUid||null,
      targetCharId:opts.targetCharId||null, targetPetId:opts.targetPetId||null,
      recipe:opts.recipe||null, crop:opts.crop||null, social:opts.social||null,
      socialId:opts.socialId||null, data:opts.data||{}, playerIssued:!!opts.playerIssued,
      source:opts.source||'player', phase:'queued', elapsed:0,
    };
    return a;
  }
  queueAction(char,id,opts={}){
    if(!char || !ACTIONS[id]) return false;
    if(char.hidden){ this.toast(`${char.name} não está aqui agora.`,'error'); return false; }
    if(char.queue.length>=6){ this.toast('A fila de ações está cheia.','error'); return false; }
    const def=ACTIONS[id];
    if(def.requires?.meal && char.inventory.meals<1){ this.toast('Não tem refeição pronta. Cozinhe primeiro!','error'); return false; }
    if(def.requires?.skill){
      for(const [sid,lvl] of Object.entries(def.requires.skill)) if(char.skillLevel(sid)<lvl){
        this.toast(`Precisa de ${SKILL_MAP[sid].name} nível ${lvl}.`,'error'); return false;
      }
    }
    if(!this.canDoAction(char,id,opts)) return false;
    const a=this.makeAction(id,{...opts,playerIssued:true,source:'player'});
    char.queue.push(a);
    if(!char.action) this.startAction(char);
    this.refresh();
    return true;
  }
  canDoAction(char,id,opts={}){
    if(char.stageInfo.id==='bebe' && ['workout','paint','write_book','program','cook','fish','swim','garden'].includes(id)){
      this.toast(`${char.name} ainda é bebê e não consegue fazer isso.`,'error'); return false;
    }
    if(['go_work','freelance'].includes(id) && !char.stageInfo.canWork){
      this.toast('Só jovens adultos, adultos e idosos podem trabalhar.','error'); return false;
    }
    if(this.bills.utilitiesOff && ['shower','bath','laundry','program','browse','job_search','social_media','freelance','watch_tv','play_game','coffee','cook'].includes(id)){
      this.toast('A energia ou a água está cortada. Pague as contas!','error'); return false;
    }
    if(id==='cook' && char.stageInfo.id==='crianca'){ this.toast('Crianças ainda não cozinham sozinhas.','error'); return false; }
    if(id==='eat_meal' && char.inventory.meals<1){ this.toast('Não há refeições prontas.','error'); return false; }
    return true;
  }
  startAction(char){
    const a=char.queue[0]; if(!a) { char.action=null; return; }
    char.action=a; a.phase='walking'; a.elapsed=0;
    const obj=a.targetUid?this.findObject(a.targetUid):null;
    if(a.targetUid && !obj){ this.failAction(char,'O objeto não está mais aí.'); return; }
    if(a.targetCharId){
      const target=this.findPerson(a.targetCharId);
      if(!target || target.hidden){ this.failAction(char,`${a.name}: a pessoa não está por perto.`); return; }
      const dist=Math.hypot(target.x-char.x,target.y-char.y);
      if(dist<=2.3){ this.beginDoing(char); return; }
      const adjacent=this.findSpotNearTarget(char,target);
      if(!adjacent){ this.failAction(char,'Não consigo chegar até essa pessoa.'); return; }
      const path=Pathfinder.find(this.currentLot,{x:char.x,y:char.y},adjacent,char,this.allPeople());
      if(path===null){ this.failAction(char,'O caminho está bloqueado.'); return; }
      char.path=path; char.moving=path.length>0;
      if(!path.length) this.beginDoing(char);
      return;
    }
    if(obj){
      const res=Pathfinder.pathToObject(this.currentLot,char,obj,this.allPeople());
      if(!res){ this.failAction(char,'Não consigo chegar até aí.'); return; }
      char.path=res.path; char.moving=res.path.length>0;
      if(!res.path.length) this.beginDoing(char);
      return;
    }
    // Global / rabbit-hole actions
    this.beginDoing(char);
  }
  findSpotNearTarget(char,target){
    const lot=this.currentLot;
    const base={x:Math.round(target.x),y:Math.round(target.y)};
    const spots=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]].map(([dx,dy])=>({x:base.x+dx,y:base.y+dy})).filter(p=>lot.walkable(p.x,p.y));
    spots.sort((a,b)=>(Math.abs(a.x-char.x)+Math.abs(a.y-char.y))-(Math.abs(b.x-char.x)+Math.abs(b.y-char.y)));
    return spots[0]||null;
  }
  beginDoing(char){
    const a=char.action; if(!a) return;
    a.phase='doing'; a.elapsed=0; char.path=[]; char.moving=false;
    const targetObj=a.targetUid?this.findObject(a.targetUid):null;
    if(targetObj){
      char.facing = targetObj.y < char.y ? 'up' : targetObj.y > char.y ? 'down' : (targetObj.x<char.x?'left':'right');
    }
    if(a.id==='go_work'){
      char.currentOutfit='work';
      char.hidden=true;
      this.toast(`${char.name} saiu para o trabalho. 💼`,'info');
    } else if(a.anim==='sleep'){
      char.currentOutfit='sleep';
      this.audio.sfx('snore');
    } else if(a.anim==='dance' || a.anim==='guitar' || a.anim==='piano'){
      char.currentOutfit='party';
    } else if(a.anim==='shower' || a.anim==='bath'){
      char.currentOutfit='sleep';
    }
    if(a.playerIssued) this.addNotification(`${char.name}: ${a.name}.`,a.icon);
    this.refreshQueue();
  }
  failAction(char,msg){
    this.toast(msg,'error');
    char.queue.shift(); char.action=null; char.path=[]; char.moving=false;
    if(char.queue.length) this.startAction(char);
    this.refreshQueue();
  }
  cancelAction(char,index=0){
    if(!char || !char.queue.length) return;
    const removed=char.queue.splice(index,1)[0];
    if(index===0){
      if(removed?.id==='go_work' && char.hidden){ char.hidden=false; char.currentOutfit='casual'; this.respawnCharAtLot(char); }
      char.action=null; char.path=[]; char.moving=false;
      if(char.queue.length) this.startAction(char); else this.autoDecideSoon(char);
    }
    this.toast(`Ação cancelada: ${removed?.name||''}.`,'info');
    this.refreshQueue();
  }
  refreshQueue(){ if(this.ui) this.ui.refreshQueue(); }
  respawnCharAtLot(char){
    const lot=this.currentLot;
    const sp=lot.spawn[0]||{x:2,y:2};
    const spot=lot.walkable(sp.x,sp.y)?sp:this.findWalkableInLot(lot,sp.x,sp.y);
    char.x=spot.x;char.y=spot.y;
  }

  /* ---------- Action completion ---------- */
  completeAction(char){
    const a=char.action; if(!a) return;
    const obj=a.targetUid?this.findObject(a.targetUid):null;
    const target=a.targetCharId?this.findPerson(a.targetCharId):null;
    if(a.requires?.meal && a.id==='eat_meal'){
      if(char.inventory.meals<1){ this.toast(`${char.name} não encontrou a refeição.`,'error'); }
      else char.inventory.meals--;
    }
    if(a.social){
      this.applySocialCompletion(char,a,target);
    } else {
      for(const [need,val] of Object.entries(a.needs||{})) char.addNeed(need,val);
      if(a.skill) char.addSkill(this,a.skill.id,a.skill.xp);
      if(a.moodlet) char.addMoodlet(this,a.moodlet);
      this.applySpecialAction(char,a,obj,target);
    }
    char.stats.meals += a.id==='eat_meal'||a.id==='quick_snack'?1:0;
    if(a.id==='workout') char.stats.workouts++;
    if(a.id==='read') char.stats.booksRead++;
    if(a.id==='play_guitar'||a.id==='play_piano') char.stats.talentShow=(char.stats.talentShow||0)+1;
    char.queue.shift(); char.action=null; char.path=[]; char.moving=false;
    char.currentOutfit='casual';
    if(char.id===this.selectedId && a.playerIssued) this.audio.sfx('success');
    this.checkAspiration(char);
    this.refresh();
    if(char.queue.length) this.startAction(char);
    else this.autoDecideSoon(char);
  }
  applySpecialAction(char,a,obj,target){
    const abs=this.absMinutes;
    const say=(text)=>this.say(char,text);
    switch(a.special){
      case 'cook':{
        const rec=a.recipe||RECIPES[0];
        if(this.money < rec.cost){ this.toast('Sem Pixels para os ingredientes.','error'); return; }
        this.money-=rec.cost;
        const lvl=char.skillLevel('culinaria');
        const burnChance=Math.max(0.04,0.26-lvl*0.022-char.moodValue()*0.001);
        if(chance(burnChance)){
          char.addMoodlet(this,{id:'queimou',label:'Queimou a comida',icon:'🔥',emotion:'irritado',weight:2,minutes:100});
          this.toast(`${char.name} queimou o ${rec.name}. Fumaça por todo lado!`,'error');
          if(chance(0.18)) this.igniteObject(obj||pick(this.currentLot.objects.filter(o=>objDef(o).kind==='stove'))||null);
        } else {
          char.inventory.meals++; char.inventory.lastRecipe=rec;
          this.toast(`${char.name} preparou ${rec.name}! Restam ${char.inventory.meals} refeição(ões).`,'success');
          say('Cheirinho de coisa boa!');
          char.addMoodlet(this,{id:'cozinhou',label:'Cozinhou algo gostoso',icon:'🍳',emotion:'inspirado',weight:2,minutes:150});
        }
        char.addSkill(this,'culinaria',rec.skillXp);
        break;
      }
      case 'paint':{
        const lvl=char.skillLevel('criatividade');
        const emo=char.getEmotion();
        const quality=lvl+randInt(0,5)+(emo==='inspirado'?3:0);
        const value=45+lvl*22+quality*8+randInt(0,35);
        const titles=['Sonho em Camadas','O Gato que Sabia Demais','Pixels ao Vento','Domingo Infinito','Retrato de um Café Frio','Caos em Tons Pastel','A Última Fatia'];
        char.addItem({name:pick(titles),type:'painting',value,icon:'🖼️',quality});
        char.stats.paintings++;
        this.toast(`${char.name} pintou "${char.inventory.items[char.inventory.items.length-1].name}" (P$ ${value}).`,'success');
        say(pick(['Ficou... interessante.','A arte imita a vida.','Preciso de mais tinta roxa.']));
        break;
      }
      case 'write':{
        const lvl=char.skillLevel('escrita');
        const value=60+lvl*30+randInt(0,50);
        const titles=['Crônicas da Rua Pixel','O Último Wi-Fi','Amor em 8 Bits','Receitas para Dias Cinzas','A Casa que Sonhava'];
        char.addItem({name:pick(titles),type:'book',value,icon:'📕',quality:lvl});
        char.stats.books++;
        this.toast(`${char.name} escreveu um livro! (valor P$ ${value})`,'success');
        break;
      }
      case 'program':{
        const lvl=char.skillLevel('programacao');
        const value=55+lvl*32+randInt(0,60);
        char.addItem({name:pick(['App Calma-Gato','PixelPonto','RangoJá','Sonho Sync','Casa em Ordem']),type:'app',value,icon:'📱',quality:lvl});
        this.toast(`${char.name} programou um app! (valor P$ ${value})`,'success');
        break;
      }
      case 'fish':{
        const lvl=char.skillLevel('pesca');
        if(chance(0.45+lvl*0.045)){
          const fish=Math.round(25+lvl*13+rand(0,40));
          char.addItem({name:pick(['Peixe-Lua','Sardinha Filosófica','Baiacu Tímido','Robalo de Botas','Piaba Poética']),type:'fish',value:fish,icon:'🐟',quality:lvl});
          char.stats.fish++;
          this.toast(`${char.name} fisgou algo! (valor P$ ${fish})`,'success');
          say('Pega, pega, pega!');
        } else {
          char.addMoodlet(this,{id:'fish_none',label:'O peixe levou a isca',icon:'🎣',emotion:'entediado',weight:1,minutes:90});
          this.toast(`${char.name} voltou de mãos vazias. O peixe riu.`,'info');
        }
        break;
      }
      case 'photo':{
        const value=40+char.skillLevel('criatividade')*15+randInt(0,30);
        char.addItem({name:pick(['Luz de Sete Horas','Sombra Urbana','Nuvem Disfarçada','Retrato Sem Pressa']),type:'photo',value,icon:'📷',quality:char.skillLevel('criatividade')});
        this.toast(`${char.name} tirou uma foto digna de exposição.`,'success');
        break;
      }
      case 'sew':{
        const value=50+char.skillLevel('criatividade')*18+randInt(0,30);
        char.addItem({name:pick(['Jaqueta Remendo Chic','Bolsa Nuvem','Vestido Jardim Digital']),type:'clothing',value,icon:'👗',quality:char.skillLevel('criatividade')});
        this.toast(`${char.name} costurou uma peça exclusiva!`,'success');
        break;
      }
      case 'tinker':{
        const value=70+char.skillLevel('mecanica')*25+randInt(0,50);
        char.addItem({name:pick(['Robô Regador','Luminária Pisca-Pisca','Aspirador Confuso','Relógio que Atrasa']),type:'gadget',value,icon:'🤖',quality:char.skillLevel('mecanica')});
        this.toast(`${char.name} inventou uma engenhoca. Funciona? Quase.`,'success');
        break;
      }
      case 'clean':{
        if(obj){ obj.dirty=0; obj.condition=Math.min(100,obj.condition+2); }
        char.addMoodlet(this,{id:'clean_thrill',label:'A casa está brilhando',icon:'✨',emotion:'feliz',weight:1,minutes:90});
        break;
      }
      case 'repair':{
        if(obj){
          const success=chance(0.55+char.skillLevel('mecanica')*0.045);
          if(success){ obj.broken=false; obj.condition=100; this.toast(`${objDef(obj).name} consertado!`,'success'); }
          else { obj.condition=Math.max(20,obj.condition-5); this.toast('Não funcionou. Talvez mais fita adesiva?','info'); }
        }
        break;
      }
      case 'upgrade':{
        if(obj){
          if(this.money<120){ this.toast('Sem Pixels para a melhoria.','error'); return; }
          this.money-=120; obj.upgraded=(obj.upgraded||0)+1; obj.condition=100;
          this.toast(`${objDef(obj).name} melhorado! Nível ${obj.upgraded}.`,'success');
        }
        break;
      }
      case 'light':{
        if(obj){ obj.lit=!obj.lit; }
        break;
      }
      case 'bills':{
        this.payBills();
        break;
      }
      case 'call_friend':{
        const rels=Object.entries(char.relationships).filter(([id,r])=>r.met&&r.friend>=20);
        if(!rels.length){ this.toast('Ninguém atende. Talvez seja hora de fazer amigos.','info'); }
        else {
          const [id,r]=pick(rels);
          r.friend=clamp(r.friend+4,0,100);
          char.addMoodlet(this,{id:'call',label:'Uma boa conversa por telefone',icon:'📞',emotion:'feliz',weight:1,minutes:120});
          this.toast(`${char.name} ligou para ${this.personName(id)} e colocou a conversa em dia.`,'success');
        }
        break;
      }
      case 'job_search':{
        if(char.id===this.selectedId && this.ui) this.ui.openJobs(char);
        break;
      }
      case 'social_media':{
        char.addNeed('social',6);
        if(chance(0.16) && char.skillLevel('comedia')>=2){
          const cash=randInt(30,110); this.money+=cash;
          this.toast(`Um post viralizou! +P$ ${cash} de patrocínio.`,'success'); this.audio.sfx('cash');
        } else {
          char.addMoodlet(this,{id:'posted',label:'Postou e recebeu corações',icon:'❤️',emotion:'feliz',weight:1,minutes:80});
        }
        break;
      }
      case 'freelance':{
        const lvl=Math.max(char.skillLevel('programacao'),char.skillLevel('criatividade'),char.skillLevel('escrita'));
        const pay=Math.round(55+lvl*24+rand(0,45));
        this.money+=pay; char.stats.moneyEarned+=pay;
        this.toast(`${char.name} entregou o projeto e recebeu P$ ${pay}.`,'success');
        this.audio.sfx('cash');
        break;
      }
      case 'plant':{
        if(obj){
          const crop=a.crop?CROPS.find(c=>c.id===a.crop):pick(CROPS);
          obj.garden={planted:crop.id,growth:5,watered:false,quality:1};
          this.toast(`${char.name} plantou ${crop.name}. Agora é água e paciência.`,'success');
          this.audio.sfx('water');
        }
        break;
      }
      case 'water':{
        if(obj?.garden){
          if(!obj.garden.planted){ this.toast('Não há nada plantado aqui.','info'); break; }
          obj.garden.watered=true; obj.garden.growth=Math.min(100,obj.garden.growth+10);
          this.audio.sfx('water');
          char.addMoodlet(this,{id:'garden_water',label:'Regou as plantinhas',icon:'💧',emotion:'feliz',weight:1,minutes:90});
        }
        break;
      }
      case 'harvest':{
        if(obj?.garden?.planted && obj.garden.growth>=100){
          const crop=CROPS.find(c=>c.id===obj.garden.planted)||CROPS[0];
          const qty=randInt(2,4);
          for(let i=0;i<qty;i++) char.addItem({name:crop.name,type:'crop',value:crop.value,icon:crop.icon,quality:1});
          char.stats.harvest+=qty;
          this.toast(`${char.name} colheu ${qty}x ${crop.name}! 🌱`,'success');
          obj.garden={planted:null,growth:0,watered:false,quality:1};
          char.addSkill(this,'jardinagem',12);
          this.audio.sfx('success');
        } else {
          this.toast('Ainda não está pronto para colher.','info');
        }
        break;
      }
      case 'pet_play':{
        const pet=a.targetPetId?this.findPet(a.targetPetId):pick(this.pets);
        if(pet){ pet.needs.diversao=clamp(pet.needs.diversao+35,0,100); pet.needs.energia=clamp(pet.needs.energia-10,0,100); char.addNeed('social',8); pet.training+=2; }
        this.audio.sfx('pop');
        break;
      }
      case 'pet_feed':{
        const pet=a.targetPetId?this.findPet(a.targetPetId):pick(this.pets);
        if(pet){ pet.needs.fome=clamp(pet.needs.fome+45,0,100); this.toast(`${pet.name} devorou a ração. 🐾`,'info'); }
        break;
      }
      case 'pet_train':{
        const pet=a.targetPetId?this.findPet(a.targetPetId):pick(this.pets);
        if(pet){ pet.training=clamp(pet.training+12,0,100); pet.needs.diversao=clamp(pet.needs.diversao+10,0,100); this.toast(`${pet.name} aprendeu um truque novo!`,'success'); }
        break;
      }
      case 'pet_groom':{
        const pet=a.targetPetId?this.findPet(a.targetPetId):pick(this.pets);
        if(pet){ pet.needs.higiene=clamp(pet.needs.higiene+45,0,100); this.toast(`${pet.name} está cheiroso(a)!`,'success'); }
        break;
      }
      case 'extinguish':{
        if(obj){ obj.burning=false; obj.condition=Math.max(15,obj.condition-20); obj.dirty=70;
          this.toast('Fogo apagado! Sobrou fumaça e uma história.', 'success'); this.audio.sfx('water'); }
        break;
      }
      case 'work': this.completeWork(char); break;
    }
  }

  /* ---------- Movement update ---------- */
  update(dt){
    if(!this.started) return;
    dt=Math.min(dt,0.08);
    const running=this.simRunning;
    if(running){
      let speed=this.time.speed;
      if(this.settings.autoSkip && this.allHouseholdSleeping() && (this.isNight || this.time.hour<8)) speed=Math.max(speed,3);
      this.minuteFraction += dt*2*speed;
      let guard=0;
      while(this.minuteFraction>=1 && guard++<30){ this.minuteFraction-=1; this.tickMinute(); }
      this.updateMovement(dt);
      this.updateNPCs(dt);
      this.updateThoughts(dt);
      this.autoSaveReal+=dt;
      if(this.autoSaveReal>42){ this.autoSaveReal=0; this.saveGame(this.activeSlot,true); }
    } else {
      this.updateThoughts(dt*0.3);
    }
    if(this.renderer) this.renderer.update(dt);
    this.uiTimer+=dt;
    if(this.uiTimer>0.42){ this.uiTimer=0; if(this.ui && this.mode==='live') this.ui.tickHUD(); }
  }
  allHouseholdSleeping(){
    return this.characters.length>0 && this.characters.every(c=>c.hidden||c.isSleeping);
  }
  tickMinute(){
    this.time.minutes++;
    if(this.time.minutes>=1440){ this.time.minutes-=1440; this.onNewDay(); }
    const lot=this.currentLot;
    this.characters.forEach(c=>{
      if(c.hidden && !c.action) c.hidden=false;
      c.tickNeeds(1,this,lot);
      c.cleanMoodlets(this);
      const a=c.action;
      if(a && a.phase==='doing'){
        if(a.special==='work'){ /* needs already applied at end */ }
        a.elapsed++;
        if(a.elapsed>=a.minutes) this.completeAction(c);
      }
    });
    this.npcs.forEach(c=>{
      c.tickNeeds(0.7,this,lot); c.cleanMoodlets(this);
    });
    this.pets.forEach(p=>p.tick(1,this,lot));
    this.updateGarden();
    this.checkDeliveries();
    this.checkUtilities();
    this.checkParty();
    this.checkFires();
    this.checkCriticalNeeds();
    if(this.time.minutes%60===0) this.onHour();
    if(this.time.minutes%20===0) this.autonomyTick();
  }
  updateMovement(dt){
    [...this.characters,...this.npcs].forEach(c=>{
      if(c.hidden || c.isSleeping){ c.moving=false; return; }
      if(!c.path || !c.path.length) { c.moving=false; return; }
      const speedTiles=(c.isNPC?1.55:2.2)*dt;
      let budget=speedTiles;
      while(budget>0 && c.path.length){
        const next=c.path[0];
        const dx=next.x-c.x, dy=next.y-c.y;
        const dist=Math.hypot(dx,dy);
        if(dist<=budget){ c.x=next.x;c.y=next.y; budget-=dist; c.path.shift(); c.walkPhase+=0.45; }
        else { c.x+=dx/dist*budget; c.y+=dy/dist*budget; c.walkPhase+=0.45; budget=0; }
        if(Math.abs(dx)>Math.abs(dy)) c.facing=dx>0?'right':'left'; else if(dy) c.facing=dy>0?'down':'up';
      }
      c.moving=c.path.length>0;
      if(!c.moving){
        c.x=Math.round(c.x*4)/4; c.y=Math.round(c.y*4)/4;
        if(c.action && c.action.phase==='walking') this.beginDoing(c);
      }
    });
  }
  updateNPCs(dt){
    this.npcs.forEach(n=>{
      n.wanderTimer=(n.wanderTimer||rand(1,4))-dt;
      if(n.wanderTimer<=0 && !n.path.length){
        n.wanderTimer=rand(4,10);
        const lot=this.currentLot;
        const tx=clamp(Math.round(n.x)+randInt(-4,4),0,lot.w-1), ty=clamp(Math.round(n.y)+randInt(-3,3),0,lot.h-1);
        if(lot.walkable(tx,ty)){
          const path=Pathfinder.find(lot,{x:n.x,y:n.y},{x:tx,y:ty},n,this.allPeople());
          if(path) n.path=path;
        }
      }
    });
  }
  updateThoughts(dt){
    [...this.characters,...this.npcs].forEach(c=>{
      c.thoughtTimer=(c.thoughtTimer||5)-dt;
      if(c.thoughtTimer<=0){
        c.thoughtTimer=rand(6,15);
        if(Math.random()<0.55){
          const low=c.lowestNeed();
          const emotion=c.getEmotion();
          const icons=emotion==='irritado'?'😠':emotion==='triste'?'😢':emotion==='inspirado'?'💡':emotion==='apaixonado'?'💗':emotion==='envergonhado'?'😳':low.icon;
          c.thought=icons; c.thoughtAge=0;
        }
      }
      if(c.thought) { c.thoughtAge=(c.thoughtAge||0)+dt; if(c.thoughtAge>4.5) c.thought=null; }
      if(c.speech) { c.speechAge=(c.speechAge||0)+dt; if(c.speechAge>4) c.speech=null; }
    });
  }
  say(char,text){ char.speech=text; char.speechAge=0; }
  tickHUD(){ if(this.ui) this.ui.tickHUD(); }

  /* ---------- Automated living ---------- */
  autoDecideSoon(char){
    char.lastAuto=-999;
    setTimeout(()=>{ if(this.started && !char.action && !char.queue.length) this.autonomyTick(true,char); }, 900);
  }
  autonomyTick(force=false,onlyChar=null){
    if(!this.settings.freeWill && !force) return;
    const chars=onlyChar?[onlyChar]:this.characters;
    chars.forEach(c=>{
      if(c.hidden || c.action || c.queue.length || c.isSleeping) return;
      if(c.stageInfo.id==='bebe' && !force) return;
      if(!force && this.absMinutes-(c.lastAuto||-99)<12) return;
      c.lastAuto=this.absMinutes;
      const chosen=this.chooseAutonomousAction(c,force);
      if(chosen){
        if(chosen.social){
          this.queueSocial(c,chosen.opts.targetCharId,chosen.opts.socialId,{playerIssued:false,source:'auto'});
          return;
        }
        const a=this.makeAction(chosen.id,{...chosen.opts,playerIssued:false,source:'auto'});
        if(a){ c.queue.push(a); this.startAction(c); }
      }
    });
  }
  chooseAutonomousAction(c,force=false){
    const lot=this.currentLot;
    const findAction=(ids)=>{
      const objs=lot.objects.filter(o=>!o.broken || true);
      for(const id of ids){
        const obj=objs.find(o=>objDef(o).actions.includes(id) && (id!=='eat_meal'||c.inventory.meals>0));
        if(obj) return {obj,id};
      }
      return null;
    };
    const low=(id)=>c.needs[id];
    if(low('banheiro')<28){ const f=findAction(['toilet']); if(f) return {id:'toilet',opts:{targetUid:f.obj.uid}}; }
    if(low('fome')<32){
      if(c.inventory.meals>0 && c.stageInfo.id!=='crianca'){ const f=findAction(['eat_meal']); return {id:'eat_meal',opts:{targetUid:f?.obj.uid||findAction(['sit'])?.obj.uid}}; }
      if(c.stageInfo.id!=='crianca'){
        if(chance(0.35)&&c.skillLevel('culinaria')>=1){ const f=findAction(['cook']); if(f) return {id:'cook',opts:{targetUid:f.obj.uid,recipe:pick(RECIPES.filter(r=>r.level<=c.skillLevel('culinaria')))}}; }
        const f=findAction(['quick_snack']); if(f) return {id:'quick_snack',opts:{targetUid:f.obj.uid}};
      }
    }
    if(low('energia')<27){ const f=findAction(['sleep','nap']); if(f) return {id:this.isNight?'sleep':'nap',opts:{targetUid:f.obj.uid}}; }
    if(low('higiene')<30){ const f=findAction(['shower','bath']); if(f) return {id:'shower',opts:{targetUid:f.obj.uid}}; }
    if(low('diversao')<32){
      const opts=['watch_tv','read','play_game','play_guitar','paint','dance','play'];
      for(const id of opts){ const f=findAction([id]); if(f) return {id,opts:{targetUid:f.obj.uid,recipe:null}}; }
    }
    if(low('social')<30 && lot.characters.length>1){
      const others=[...this.characters,...this.npcs].filter(o=>o!==c&&!o.hidden);
      if(others.length){ const t=pick(others); return {id:'conversar',social:true,opts:{targetCharId:t.id,socialId:'conversar'}}; }
    }
    if(low('conforto')<27){ const f=findAction(['relax','sit']); if(f) return {id:'relax',opts:{targetUid:f.obj.uid}}; }
    const dirty=lot.objects.find(o=>o.dirty>55||o.broken);
    if(dirty && c.hasTrait('organizado') && chance(0.45)) return {id:'clean',opts:{targetUid:dirty.uid}};
    if(force || chance(0.55)){
      const playful=this.isNight
        ? ['read','play_guitar','paint','play_game','watch_tv','relax']
        : ['read','watch_tv','play_game','paint','play_guitar','dance','relax','coffee','browse','play'];
      const pool=playful.slice().sort(()=>Math.random()-.5);
      for(const id of pool){
        const f=findAction([id]);
        if(f) return {id,opts:{targetUid:f.obj.uid}};
      }
    }
    if(force && chance(0.35)){
      if(c.hasTrait('criativo')){ const f=findAction(['paint']); if(f) return {id:'paint',opts:{targetUid:f.obj.uid}}; }
      if(c.hasTrait('esportista')){ const f=findAction(['workout']); if(f) return {id:'workout',opts:{targetUid:f.obj.uid}}; }
      const f=findAction(['relax','watch_tv','read']); if(f) return {id:pick(['relax','watch_tv','read']),opts:{targetUid:f.obj.uid}};
    }
    return null;
  }
  checkCriticalNeeds(){
    // moodlets for sustained low needs, without spamming
    this.characters.forEach(c=>{
      if(c.needs.fome<15 && !c.moodlets.find(m=>m.id==='hungry_grumpy'))
        c.addMoodlet(this,{id:'hungry_grumpy',label:'Faminta(o) e sem paciência',icon:'😤',emotion:'irritado',weight:2,minutes:45});
      if(c.needs.higiene<15 && !c.moodlets.find(m=>m.id==='stinky'))
        c.addMoodlet(this,{id:'stinky',label:'Precisa de um banho urgente',icon:'🤢',emotion:'envergonhado',weight:2,minutes:45});
      if(c.needs.diversao<12 && !c.moodlets.find(m=>m.id==='bored_bad'))
        c.addMoodlet(this,{id:'bored_bad',label:'Tedio absoluto',icon:'😑',emotion:'entediado',weight:2,minutes:50});
    });
  }
  updateGarden(){
    if(this.time.minutes%60!==0) return;
    this.currentLot.objects.forEach(o=>{
      if(!o.garden?.planted) return;
      const crop=CROPS.find(c=>c.id===o.garden.planted); if(!crop) return;
      if(o.garden.watered){
        o.garden.growth=Math.min(100,o.garden.growth+crop.grow*1.2);
        if(chance(0.2)) o.garden.watered=false;
        if(o.garden.growth>=100) o.garden.quality=1+chance(0.25)?1:0;
      } else {
        o.garden.growth=Math.max(0,o.garden.growth-crop.grow*0.15);
      }
    });
  }
  checkFires(){
    this.currentLot.objects.filter(o=>o.burning).forEach(o=>{
      if(this.time.minutes%30===0){
        o.condition=Math.max(0,o.condition-4);
        if(o.condition<=0){ o.broken=true; o.burning=false; this.toast(`${objDef(o).name} virou carvão.`,'error'); }
        const others=this.currentLot.objects.filter(x=>x!==o&&!x.burning&&x.condition>20);
        if(chance(0.14)&&others.length) { pick(others).burning=true; this.toast('O fogo se espalhou! 🧯','error'); }
      }
    });
  }
  igniteObject(obj){
    if(!obj||obj.burning) return;
    obj.burning=true;
    this.notify(`Fogo em ${objDef(obj).name}! Use "Apagar o fogo" antes que espalhe.`,'🔥');
    this.audio.sfx('fire');
    if(this.selected) this.selected.addMoodlet(this,{id:'fire_fear',label:'Viu fogo dentro de casa',icon:'🔥',emotion:'irritado',weight:2,minutes:180});
  }
  canTryUse(obj){ return !obj.broken; }

  /* ---------- Social life ---------- */
  personName(id){
    const p=this.findPerson(id);
    if(p) return p.name;
    return TOWNIE_MAP[id]?.name || 'Alguém';
  }
  personRecord(id){
    if(this.findPerson(id)) {
      const c=this.findPerson(id);
      return {id:c.id,name:c.fullName,age:c.age,traits:c.traits,appearance:c.appearance,isHousehold:this.characters.includes(c),npc:!!c.isNPC};
    }
    const t=TOWNIE_MAP[id];
    if(t) return {id:t.id,name:t.name,age:t.age,traits:t.traits,appearance:t.looks,isHousehold:false,npc:true,bio:t.bio,job:t.job};
    return {id,name:'Alguém',age:25,traits:[],appearance:null};
  }
  availableSocialActions(char,target){
    return SOCIAL_ACTIONS.map(a=>{
      let reason=null;
      if(a.ageAdult && (char.age<18 || target.age<18)) reason='Só para adultos';
      if(a.minRel!=null && (char.relationship(target.id).friend||0)<a.minRel) reason=`Amizade ${a.minRel}+`;
      if(a.romanceRel!=null && (char.relationship(target.id).romance||0)<a.romanceRel) reason=`Romance ${a.romanceRel}+`;
      if(['romantico'].includes(a.cat) && this.areFamily(char.id,target.id)) reason='Família';
      if(['romantico'].includes(a.cat) && (char.age<18||target.age<18)) reason='Só para adultos';
      if(a.special==='breakup' && !(char.relationship(target.id).dating||char.relationship(target.id).engaged||char.relationship(target.id).married)) reason='Não estão juntos';
      if(a.special==='engage' && !char.relationship(target.id).dating) reason='Precisa namorar primeiro';
      if(a.special==='marry' && !char.relationship(target.id).engaged) reason='Precisa estar noivo(a)';
      if(a.special==='move_in' && this.characters.length>=6) reason='Casa cheia';
      return {...a,locked:!!reason,reason};
    });
  }
  areFamily(aId,bId){
    const a=this.findPersonAnywhere(aId);
    return !!(a && a.relationships?.[bId]?.family);
  }
  queueSocial(char,targetId,socialId,opts={}){
    if(!char || char.hidden) return false;
    if(char.queue.length>=6){ this.toast('A fila está cheia.','error'); return false; }
    const soc=SOCIAL_ACTIONS.find(a=>a.id===socialId); if(!soc) return false;
    const target=this.findPerson(targetId) || this.npcFromTownie(targetId,true);
    if(!target){ this.toast('Essa pessoa não está aqui.','error'); return false; }
    const av=this.availableSocialActions(char,target).find(a=>a.id===socialId);
    if(!av || av.locked){ this.toast(av?.reason||'Ação indisponível.','error'); return false; }
    const a={
      id:'social_'+socialId, socialId, social:soc, name:soc.name, icon:soc.icon,
      minutes:soc.minutes, anim:'talk', targetCharId:target.id, needs:{}, skill:null, moodlet:null,
      special:null, phase:'queued', elapsed:0, playerIssued:opts.playerIssued!==false, source:opts.source||'player',
    };
    char.queue.push(a);
    if(!char.action) this.startAction(char);
    this.refresh();
    return true;
  }
  applySocialCompletion(char,a,target){
    const soc=a.social;
    if(!target){ this.toast(`${a.name}: a pessoa foi embora.`,'info'); return; }
    const rel=char.relationship(target.id);
    const tr=target.relationship(char.id);
    rel.met=true; tr.met=true;
    let accept=chance(soc.chance);
    accept = chance(clamp(soc.chance + char.skillLevel('carisma')*0.012 + rel.friend/500 + char.moodValue()/600 + (char.hasTrait('timido')?-0.06:0) + (target.hasTrait('timido')?-0.04:0) + (soc.cat==='romantico'&&rel.romance>50?0.18:0),0.08,0.98));
    if(accept){
      const friendDelta=Math.round((soc.friend||0)*(1+char.skillLevel('carisma')*0.015));
      const romanceDelta=Math.round((soc.romance||0)*(1+(char.hasTrait('romantico')?0.35:0)));
      rel.friend=clamp(rel.friend+friendDelta,0,100);
      rel.romance=clamp(rel.romance+romanceDelta,0,100);
      tr.friend=clamp(tr.friend+Math.round(friendDelta*0.7),0,100);
      tr.romance=clamp(tr.romance+Math.round(romanceDelta*0.7),0,100);
      rel.lastTalk=this.absMinutes;
      char.stats.socials++;
      if(char.skillLevel('carisma')<10) char.addSkill(this,'carisma',soc.cat==='romantico'?8:6);
      const goodEmotion=soc.cat==='romantico'?'apaixonado':soc.cat==='engracado'?'feliz':'feliz';
      char.addMoodlet(this,{id:'social_'+soc.id,label:`${soc.name} com ${target.name}`,icon:soc.icon,emotion:goodEmotion,weight:soc.cat==='profundo'?2:1.5,minutes:150});
      const lines={
        amigavel:['Adorei te ver!','Você é gente boa demais.','Essa conversa fez meu dia.','Vamos repetir isso!'],
        engracado:['Hahaha, para! Eu quase caí.','Você é uma piada ambulante.','Meu estômago dói de rir.'],
        romantico:['Fica mais um pouco...','Você deixa o dia mais bonito.','Acho que estou corando.'],
        profundo:['Obrigado(a) por me ouvir.','Isso ficou entre nós.','Ninguém nunca me perguntou isso.'],
        malvado:['Nossa, que desnecessário.','Ainda estou te ouvindo... infelizmente.'],
      };
      const targetLines={
        amigavel:['Também gosto de você!','Você sempre tem uma história boa.','Vem cá mais vezes.'],
        engracado:['Kkkk essa foi boa.','Eu rio do nada lembrando.','Você não bate bem, mas combina comigo.'],
        romantico:['Seu bobo...','Fica mais um pouco.','Meu coração fez um loop.'],
        profundo:['Eu confio em você.','Isso significa muito.','Obrigado(a) por ser assim.'],
        malvado:['Tá, já chega.','Nossa, hein.'],
      };
      this.say(char,pick(lines[soc.cat]||lines.amigavel));
      this.say(target,pick(targetLines[soc.cat]||targetLines.amigavel));
      if(soc.cat==='romantico' && rel.romance>=40 && !rel.hadDate){
        rel.hadDate=true; tr.hadDate=true; char.stats.dates++;
        char.addMoodlet(this,{id:'date',label:'Um encontro especial',icon:'💕',emotion:'apaixonado',weight:3,minutes:300});
        this.notify(`${char.name} e ${target.name} tiveram um momento especial. 💕`,'💗');
      }
      this.applySocialSpecial(char,target,soc,rel,tr);
      if(this.party) this.party.progress++;
      this.audio.sfx(soc.cat==='romantico'?'kiss':'success');
    } else {
      rel.friend=clamp(rel.friend-2,0,100);
      tr.friend=clamp(tr.friend-1,0,100);
      char.addMoodlet(this,{id:'rejected',label:'Tomou um fora',icon:'💔',emotion:'envergonhado',weight:2,minutes:130});
      this.say(char,pick(['Eita. Foi mal.','Acho que foi cedo demais...','O clima esfriou.']));
      this.say(target,pick(['Acho melhor não.','Hoje não, tá?','Vamos devagar.']));
      this.toast(`${target.name} não curtiu muito: ${soc.name}.`,'info');
      this.audio.sfx('error');
    }
    this.checkAspiration(char);
    if(target.isNPC) this.checkAspiration(target);
    this.refresh();
  }
  applySocialSpecial(char,target,soc,rel,tr){
    switch(soc.special){
      case 'propose':
        if(rel.romance>=45){
          rel.dating=true; tr.dating=true;
          this.notify(`${char.name} e ${target.name} agora estão namorando! 💞`,'💘');
          char.addMoodlet(this,{id:'dating',label:'Começou um namoro',icon:'💞',emotion:'apaixonado',weight:4,minutes:1440});
          target.addMoodlet(this,{id:'dating',label:'Começou um namoro',icon:'💞',emotion:'apaixonado',weight:4,minutes:1440});
          this.audio.sfx('levelup');
        } else this.toast('Ainda é cedo para namorar.','info');
        break;
      case 'engage':
        if(rel.dating){
          rel.engaged=true; tr.engaged=true;
          this.notify(`${char.name} e ${target.name} estão noivos! 💎`,'💍');
          char.addMoodlet(this,{id:'engaged',label:'Ficou noivo(a)!',icon:'💎',emotion:'apaixonado',weight:5,minutes:1440});
          target.addMoodlet(this,{id:'engaged',label:'Ficou noivo(a)!',icon:'💎',emotion:'apaixonado',weight:5,minutes:1440});
          this.audio.sfx('levelup');
        }
        break;
      case 'marry':
        if(rel.engaged){
          rel.married=true; tr.married=true; rel.dating=true; tr.dating=true;
          char.spouseId=target.id; target.spouseId=char.id;
          this.notify(`${char.name} e ${target.name} se casaram! Que festa! 💒`,'💒');
          char.addMoodlet(this,{id:'married',label:'Casou-se!',icon:'💒',emotion:'apaixonado',weight:5,minutes:2880});
          target.addMoodlet(this,{id:'married',label:'Casou-se!',icon:'💒',emotion:'apaixonado',weight:5,minutes:2880});
          char.stats.married=1; this.money+=500;
          this.audio.sfx('party');
          if(target.isNPC && this.characters.length<6) this.addHouseholdMember(target);
        }
        break;
      case 'breakup':
        rel.dating=false;rel.engaged=false;rel.married=false;rel.romance=5;rel.friend=Math.max(0,rel.friend-20);
        tr.dating=false;tr.engaged=false;tr.married=false;tr.romance=5;tr.friend=Math.max(0,tr.friend-20);
        char.spouseId=null; target.spouseId=null;
        char.addMoodlet(this,{id:'breakup',label:'Coração partido',icon:'💔',emotion:'triste',weight:4,minutes:1440});
        this.notify(`${char.name} e ${target.name} terminaram. 💔`,'💔');
        break;
      case 'move_in':
        if(this.characters.length<6){
          if(this.addHouseholdMember(target)) this.notify(`${target.name} se mudou para a casa! 🏠`,'🏠');
        }
        break;
    }
    this.checkAspiration(char);
  }

  /* ---------- Careers ---------- */
  getJobDef(char){
    if(!char?.career?.jobId) return null;
    return CAREER_MAP[char.career.jobId] || PART_TIME_JOBS.find(j=>j.id===char.career.jobId) || null;
  }
  getJobLevel(char){
    const job=this.getJobDef(char); if(!job) return null;
    return job.levels[Math.min(char.career.level||0,job.levels.length-1)] || job.levels[0];
  }
  getCareerInfo(char){
    const job=this.getJobDef(char);
    if(!job) return null;
    const level=this.getJobLevel(char);
    const next=job.levels[(char.career.level||0)+1]||null;
    const canWorkNow=this.canWorkNow(char);
    return {job,level,next,canWorkNow,...canWorkNow};
  }
  canWorkNow(char){
    const job=this.getJobDef(char); if(!job) return {ok:false,reason:'Sem emprego'};
    if(!char.stageInfo.canWork) return {ok:false,reason:'Jovem demais'};
    const day=this.time.weekday;
    if(!job.days.includes(day)) return {ok:false,reason:'Folga hoje'};
    if(char.career.lastWorkDay===this.time.day) return {ok:false,reason:'Já trabalhou hoje'};
    const h=this.time.minutes/60;
    if(h<job.hours[0]-1) return {ok:false,reason:`Começa às ${job.hours[0]}h`};
    if(h>job.hours[1]) return {ok:false,reason:'Expediente encerrado'};
    return {ok:true,reason:'Pode trabalhar'};
  }
  jobListFor(char){
    if(!char.stageInfo.canWork) return [];
    const careerJobs=CAREERS.map(j=>({...j,type:'career',entryPay:j.levels[0].pay,hoursText:`${j.hours[0]}h–${j.hours[1]}h`,dayText:j.days.map(d=>WEEKDAYS[d]).join(', ')}));
    const parts=PART_TIME_JOBS.map(j=>({...j,type:'part',entryPay:j.levels[0].pay,hoursText:`${j.hours[0]}h–${j.hours[1]}h`,dayText:j.days.map(d=>WEEKDAYS[d]).join(', ')}));
    return [...parts,...careerJobs];
  }
  applyJob(char,jobId){
    if(!char.stageInfo.canWork){ this.toast('Ainda não é idade para trabalhar.','error'); return false; }
    const job=CAREER_MAP[jobId]||PART_TIME_JOBS.find(j=>j.id===jobId);
    if(!job){ this.toast('Vaga não encontrada.','error'); return false; }
    if(char.career.jobId && char.career.jobId!==jobId){
      this.toast(`${char.name} pediu demissão do emprego anterior.`,'info');
    }
    char.career={jobId,partTime:!CAREER_MAP[jobId],level:0,performance:50,daysWorked:0,missed:0,lastWorkDay:-1,totalEarned:char.career.totalEarned||0};
    this.notify(`${char.name} conseguiu o emprego: ${job.levels[0].title}! 🎉`,'💼');
    this.audio.sfx('levelup');
    this.refresh();
    return true;
  }
  quitJob(char){
    const job=this.getJobDef(char);
    char.career={jobId:null,partTime:false,level:0,performance:50,daysWorked:0,missed:0,lastWorkDay:-1,totalEarned:char.career.totalEarned||0};
    this.notify(`${char.name} pediu demissão${job?' de '+job.name:''}.`,'👋');
    this.refresh();
  }
  startWork(char){
    if(Number.isInteger(char) && char<this.characters.length) char=this.characters[char];
    if(typeof char==='string') char=this.characters.find(c=>c.id===char);
    if(!char) char=this.selected;
    const info=this.canWorkNow(char);
    if(!info.ok){ this.toast(info.reason,'error'); return; }
    const job=this.getJobDef(char);
    const mins=Math.max(120,(job.hours[1]-job.hours[0])*60);
    this.queueAction(char,'go_work',{minutes:mins,name:`Trabalhar: ${this.getJobLevel(char).title}`,icon:job.icon});
  }
  completeWork(char){
    const job=this.getJobDef(char);
    if(!job){char.hidden=false;return;}
    char.hidden=false;
    const lot=this.currentLot;
    const sp=lot.spawn[(this.characters.indexOf(char)+1)%lot.spawn.length]||{x:2,y:2};
    const spot=lot.walkable(sp.x,sp.y)?sp:this.findWalkableInLot(lot,sp.x,sp.y);
    char.x=spot.x;char.y=spot.y;
    const level=this.getJobLevel(char);
    const mood=char.moodValue();
    const skill=char.skillLevel(job.skill);
    const perfDelta=6+mood*0.11+skill*1.7+(char.hasTrait('ambicioso')?9:0)-rand(0,10);
    char.career.performance=clamp(char.career.performance+perfDelta,0,100);
    const pay=Math.round(level.pay*(0.82+char.career.performance/300));
    this.money+=pay;
    char.career.totalEarned+=pay; char.career.lastWorkDay=this.time.day;
    char.career.daysWorked++; char.career.missed=0;
    char.stats.moneyEarned+=pay;
    char.addNeed('energia',-22); char.addNeed('fome',-20);
    char.addMoodlet(this,{id:'work_day',label:'Dia de trabalho concluído',icon:perfDelta>10?'💪':'😮‍💨',emotion:perfDelta>10?'feliz':'entediado',weight:1,minutes:180});
    this.toast(`${char.name} trabalhou e recebeu P$ ${pay}. Desempenho: ${Math.round(char.career.performance)}%.`,'cash');
    this.audio.sfx('cash');
    if(char.career.performance>=76 && char.career.daysWorked>=2 && job.levels[(char.career.level||0)+1]){
      const next=job.levels[(char.career.level||0)+1];
      if(skill>=next.req){
        char.career.level++; char.career.daysWorked=0; char.career.performance=70;
        char.stats.promotions++;
        this.notify(`PROMOÇÃO! ${char.name} agora é ${next.title}. 🎉`,'🎉');
        char.addMoodlet(this,{id:'promoted',label:'Foi promovido(a)!',icon:'🎉',emotion:'feliz',weight:4,minutes:720});
        this.audio.sfx('levelup');
      } else {
        this.toast(`Quase uma promoção! Precisa de ${SKILL_MAP[job.skill].name} nível ${next.req}.`,'info');
      }
    }
    this.checkAspiration(char);
    this.refresh();
  }
  checkMissedWork(){
    const prevDay=this.time.day-1;
    if(prevDay<1) return;
    const weekday=TimeSystem.weekdayFor(prevDay);
    this.characters.forEach(char=>{
      const job=this.getJobDef(char); if(!job) return;
      if(!job.days.includes(weekday)) return;
      if(char.career.lastWorkDay===prevDay) return;
      char.career.missed=(char.career.missed||0)+1;
      char.career.performance=clamp((char.career.performance||50)-16,0,100);
      this.logNotification(`${char.name} faltou ao trabalho. Desempenho: ${Math.round(char.career.performance)}%.`,'⚠️');
      if(char.career.missed>=2 && chance(0.75)){
        const old=job.name;
        char.career={jobId:null,partTime:false,level:0,performance:50,daysWorked:0,missed:0,lastWorkDay:-1,totalEarned:char.career.totalEarned||0};
        this.notify(`${char.name} foi demitido(a) de ${old} por faltas. 😬`,'❌');
        char.addMoodlet(this,{id:'fired',label:'Foi demitido(a)',icon:'📉',emotion:'triste',weight:4,minutes:1440});
      }
    });
  }
  logNotification(text,icon='ℹ️'){ this.addNotification(text,icon); }

  /* ---------- Economy / bills ---------- */
  createWeeklyBill(){
    const home=this.homeLot;
    const value=home?.value()||0;
    const amount=Math.round(95+value*0.006+this.characters.length*22);
    this.bills={amount,dueDay:this.time.day+2,paid:false,utilitiesOff:false,overdue:0};
    this.notify(`As contas da semana chegaram: ${formatMoney(amount)}. Vencem no dia ${this.bills.dueDay}.`,'🧾');
  }
  payBills(){
    const b=this.bills;
    if(b.paid){ this.toast('As contas já estão pagas. Ufa!','info'); return; }
    if(b.amount<=0){ b.paid=true; return; }
    if(this.money<b.amount){ this.toast(`Faltam ${formatMoney(b.amount-this.money)} para pagar as contas.`,'error'); this.audio.sfx('error'); return; }
    this.money-=b.amount; b.paid=true; b.utilitiesOff=false; b.overdue=0;
    if(this.selected) this.selected.addMoodlet(this,{id:'bills_paid',label:'Contas em dia',icon:'🧾',emotion:'feliz',weight:2,minutes:300});
    this.notify('Contas pagas! A luz e a água continuam funcionando.','💡');
    this.audio.sfx('cash'); this.refresh();
  }
  checkUtilities(){
    if(this.bills.paid && this.bills.outageUntil && this.absMinutes>=this.bills.outageUntil){
      this.bills.outageUntil=null; this.bills.utilitiesOff=false;
      this.notify('A energia voltou. A geladeira suspirou de alívio.','💡');
    }
    if(!this.bills.paid && this.time.day>this.bills.dueDay+1 && !this.bills.utilitiesOff && !this.bills.outageUntil){
      this.bills.utilitiesOff=true;
      this.notify('Contas atrasadas: luz e água foram cortadas! Pague pela caixa de correio.','🔌');
      this.audio.sfx('error');
    }
  }
  orderPizza(byChar=null){
    if(this.money<55){ this.toast('Sem Pixels para pizza. A vida é dura.','error'); return; }
    this.money-=55;
    const id=uid('delivery');
    this.pendingDeliveries.push({id,type:'pizza',dueAbs:this.absMinutes+25});
    this.notify('Pizza pedida! Chega em uns 25 minutos. 🍕','📞');
    this.audio.sfx('tap');
  }
  checkDeliveries(){
    if(!this.pendingDeliveries.length) return;
    const due=this.pendingDeliveries.filter(d=>this.absMinutes>=d.dueAbs);
    if(!due.length) return;
    this.pendingDeliveries=this.pendingDeliveries.filter(d=>this.absMinutes<d.dueAbs);
    due.forEach(d=>{
      if(d.type==='pizza'){
        const target=this.selected||this.characters[0];
        if(target) target.inventory.meals++;
        this.notify('Pizza entregue! Uma refeição quentinha na sua porta. 🍕','🍕');
        this.audio.sfx('ding');
      }
    });
  }
  sellItem(char,itemUid){
    const idx=char.inventory.items.findIndex(i=>i.uid===itemUid);
    if(idx<0) return;
    const item=char.inventory.items.splice(idx,1)[0];
    this.money+=item.value; char.stats.moneyEarned+=item.value;
    if(item.type==='painting'){ char.stats.artSales=(char.stats.artSales||0)+1; char.stats.artSale=Math.max(char.stats.artSale||0,item.value); }
    this.toast(`${item.icon} ${item.name} vendido por P$ ${item.value}.`,'cash');
    this.audio.sfx('cash');
    this.checkAspiration(char); this.refresh();
  }

  /* ---------- Aspirations ---------- */
  statValue(char,stat){
    const countFriends=()=>Object.values(char.relationships).filter(r=>r.met&&r.friend>=38).length;
    const countMet=()=>Object.values(char.relationships).filter(r=>r.met).length;
    switch(stat){
      case 'money': return this.money;
      case 'friends': return countFriends();
      case 'children': return this.characters.filter(c=>c.age<=9).length;
      case 'familyEvents': return char.stats.familyEvents||0;
      case 'logic4': return char.skillLevel('logica')>=4?1:0;
      case 'booksRead': return char.stats.booksRead||0;
      case 'skills6': return SKILLS.filter(s=>char.skillLevel(s.id)>=6).length;
      case 'met': return countMet();
      case 'socials': return char.stats.socials||0;
      case 'paintings': return char.stats.paintings||0;
      case 'artSale': return char.stats.artSale||0;
      case 'creative6': return char.skillLevel('criatividade')>=6?1:0;
      case 'workouts': return char.stats.workouts||0;
      case 'fitness5': return char.skillLevel('condicionamento')>=5?1:0;
      case 'contest': return char.stats.contest||0;
      case 'dates': return char.stats.dates||0;
      case 'engaged': return Object.values(char.relationships).some(r=>r.engaged)?1:0;
      case 'married': return Object.values(char.relationships).some(r=>r.married)?1:0;
      default:return 0;
    }
  }
  checkAspiration(char){
    if(!char || char.isNPC) return;
    const asp=char.aspirationInfo;
    if(!asp) return;
    char.aspirationDone=char.aspirationDone||{};
    let changed=false;
    asp.milestones.forEach(m=>{
      if(char.aspirationDone[m.id]) return;
      if(this.statValue(char,m.stat)>=m.target){
        char.aspirationDone[m.id]=true; changed=true;
        if(m.reward?.money){ this.money+=m.reward.money; }
        if(m.reward?.mood){ char.addNeed('diversao',m.reward.mood); char.addMoodlet(this,{id:'asp_'+m.id,label:`Meta cumprida: ${m.label}`,icon:'🌟',emotion:'feliz',weight:3,minutes:720}); }
        this.notify(`🌟 ${char.name} cumpriu a meta "${m.label}"! ${m.reward?.money?`+P$ ${m.reward.money}`:''}`,'🌟');
        this.audio.sfx('levelup');
      }
    });
    if(changed){
      if(asp.milestones.every(m=>char.aspirationDone[m.id])){
        char.stats.aspirationComplete=true;
        char.addMoodlet(this,{id:'asp_complete',label:`Aspiração realizada: ${asp.name}`,icon:asp.icon,emotion:'feliz',weight:5,minutes:2880});
        this.notify(`🎆 ${char.name} realizou a aspiração de vida "${asp.name}"! Que jornada.`,'🏆');
      }
      this.refresh();
    }
  }
  awardMoney(amount,reason=''){
    this.money+=amount;
    if(this.selected) this.selected.stats.moneyEarned+=amount;
    if(reason) this.toast(`${reason} +${formatMoney(amount)}`,'cash');
    this.checkAspiration(this.selected);
    this.refresh();
  }

  /* ---------- Time milestones ---------- */
  rollWeather(){
    const tables=[
      ['sun','sun','sun','cloud','heat'],
      ['cloud','sun','rain','cloud','cold'],
      ['cold','rain','cloud','storm','cold'],
      ['sun','cloud','rain','sun','heat'],
    ];
    this.weather=pick(tables[this.time.seasonIndex]||tables[0]);
    this.time.weather=this.weather;
  }
  onNewDay(){
    this.time.day++;
    this.time.dayOfWeek=TimeSystem.weekdayFor(this.time.day);
    this.time.seasonIndex=Math.floor((this.time.day-1)/7)%4;
    this.time.holiday=HOLIDAYS[this.time.day]||null;
    this.rollWeather();
    this.checkMissedWork();
    const w=WEATHERS[this.weather]||WEATHERS.sun;
    this.addNotification(`${WEEKDAYS[this.time.weekday]}, dia ${this.time.day}. ${w.icon} ${w.name}.`,'🌅');
    this.characters.forEach(c=>{
      const emo=this.weather==='rain'||this.weather==='storm'?'entediado':this.weather==='heat'?'irritado':this.weather==='cold'?'triste':'feliz';
      c.addMoodlet(this,{id:'weather_'+this.weather,label:`Clima: ${w.name}`,icon:w.icon,emotion:emo,weight:1,minutes:300});
    });
    if(this.time.holiday){
      this.notify(`${this.time.holiday.icon} Hoje é ${this.time.holiday.name}! O bairro está em clima de festa.`,'🎉');
      this.characters.forEach(c=>c.addMoodlet(this,{id:'holiday_'+this.time.day,label:this.time.holiday.name,icon:this.time.holiday.icon,emotion:'feliz',weight:3,minutes:500}));
    }
    if(this.time.weekday===0){
      if(this.bills.paid || this.bills.amount===0) this.createWeeklyBill();
      else if(!this.bills.paid) this.notify('A conta antiga continua em aberto. Não deixe cortarem a luz!','⚠️');
    }
    if(!this.bills.paid && this.time.day===this.bills.dueDay) this.notify(`As contas vencem hoje: ${formatMoney(this.bills.amount)}.`,'🧾');
    if(this.settings.aging) this.ageHousehold();
    this.pets.forEach(p=>{
      if(p.lost && p.lostUntil && this.absMinutes>=p.lostUntil){ p.lost=false;p.hidden=false; this.notify(`${p.name} voltou para casa! Estava na casa da Dona Neide.`,'🐾'); }
    });
    this.checkAspiration(this.selected);
    this.saveGame(this.activeSlot,true);
    this.refresh();
  }
  ageHousehold(){
    const interval={curta:1,normal:3,longa:6}[this.settings.lifespan]||3;
    if(this.time.day%interval!==0) return;
    const maxAge={curta:68,normal:88,longa:112}[this.settings.lifespan]||88;
    [...this.characters].forEach(c=>{
      const before=c.stageInfo.id;
      c.age++;
      const after=c.stageInfo.id;
      if(before!==after){
        this.notify(`🎂 ${c.name} fez aniversário e agora é ${c.stageLabel}!`,'🎂');
        c.addMoodlet(this,{id:'birthday_'+c.age,label:'Aniversário!',icon:'🎂',emotion:'feliz',weight:3,minutes:720});
        if(after==='idoso') this.notify(`${c.name} entrou na melhor idade. Histórias para contar!`,'🧓');
      }
      if(c.age>maxAge && this.characters.length>1 && chance(0.16)){
        this.passAway(c);
      }
    });
  }
  passAway(char){
    this.notify(`🕊️ ${char.name} partiu aos ${char.age} anos. A família guarda as melhores lembranças.`,'🕊️');
    this.characters=this.characters.filter(c=>c!==char);
    if(this.selectedId===char.id) this.selectedId=this.characters[0]?.id||null;
    this.characters.forEach(c=>c.selected=c.id===this.selectedId);
    if(this.ui) this.ui.refreshAll();
  }
  onHour(){
    const hour=this.time.hour;
    this.characters.forEach(c=>{
      const job=this.getJobDef(c); if(!job) return;
      if(job.hours[0]-hour===1 && c.career.lastWorkDay!==this.time.day && job.days.includes(this.time.weekday)){
        this.logNotification(`O trabalho de ${c.name} começa às ${job.hours[0]}h. Não se atrase!`,'⏰');
      }
    });
    const info=this.canWorkNow(this.selected);
    if(info.ok && Math.random()<0.04) this.toast('É hora do trabalho! Abra a ficha do personagem.','💼');
    if(this.time.day>1 && this.absMinutes-this.lastEventAbs>180 && chance(0.085)){
      this.lastEventAbs=this.absMinutes;
      this.randomEvent();
    }
    if(this.party && this.absMinutes>=this.party.endsAt) this.endParty();
    this.pets.forEach(p=>{
      if(p.lost){ p.hidden=true; return; }
      if(chance(0.0015) && this.pets.length) this.petGetsLost(p);
    });
  }
  petGetsLost(pet){
    pet.lost=true; pet.hidden=true; pet.lostUntil=this.absMinutes+480;
    this.notify(`${pet.name} sumiu! Talvez esteja passeando pelo bairro. 🐾`,'😿');
  }

  /* ---------- Random events ---------- */
  randomEvent(){
    const atHome=this.currentLotId===this.homeLotId;
    const pool=[
      {id:'visitor', weight:22, run:()=>this.eventVisitor()},
      {id:'leak', weight:14, run:()=>this.eventLeak()},
      {id:'found', weight:14, run:()=>this.eventFoundMoney()},
      {id:'call', weight:12, run:()=>this.eventPhoneCall()},
      {id:'gift', weight:10, run:()=>this.eventNeighborGift()},
      {id:'outage', weight:8, run:()=>this.eventOutage()},
      {id:'burglar', weight:atHome?8:0, run:()=>this.eventBurglar()},
      {id:'celebrity', weight:!atHome?12:0, run:()=>this.eventCelebrity()},
      {id:'contest', weight:6, run:()=>this.eventContest()},
      {id:'petlost', weight:this.pets.length?5:0, run:()=>this.pets[0]&&this.petGetsLost(this.pets[0])},
      {id:'fire', weight:atHome?3:0, run:()=>this.eventSmallFire()},
    ].filter(e=>e.weight>0);
    const total=pool.reduce((s,e)=>s+e.weight,0); let roll=rand(0,total);
    for(const e of pool){ roll-=e.weight; if(roll<=0){ e.run(); return; } }
  }
  eventVisitor(){
    const existing=this.npcs.map(n=>n.id);
    const t=this.randomTownie([...existing,...this.characters.map(c=>c.id)]);
    if(!t) return;
    this.npcFromTownie(t.id,true);
    this.notify(`${t.name} apareceu na porta e quer entrar. Diga oi! 👋`,'🚪');
    this.audio.sfx('door');
    if(this.selected) this.selected.addNeed('social',6);
  }
  eventLeak(){
    const candidates=this.currentLot.objects.filter(o=>['sink','shower','bathtub','washer','toilet'].includes(objDef(o).kind));
    const obj=candidates.length?pick(candidates):null;
    if(!obj){ this.eventFoundMoney(); return; }
    obj.broken=true; obj.dirty=85;
    this.notify(`Vazamento em ${objDef(obj).name}! Repare antes que o piso sofra.`,'💧');
    this.audio.sfx('water');
  }
  eventFoundMoney(){
    const money=randInt(50,180); this.money+=money;
    this.notify(`Você encontrou ${formatMoney(money)} no bolso de uma jaqueta esquecida!`,'💵');
    this.audio.sfx('cash'); this.refresh();
  }
  eventPhoneCall(){
    const char=this.selected; if(!char) return;
    const known=Object.entries(char.relationships).filter(([,r])=>r.met);
    if(!known.length){ this.eventVisitor(); return; }
    const [id,r]=pick(known); r.friend=clamp(r.friend+3,0,100);
    char.addNeed('social',8);
    this.notify(`Ligação surpresa de ${this.personName(id)}! Vocês conversaram um pouco.`,'📞');
    this.audio.sfx('ding');
  }
  eventNeighborGift(){
    const char=this.selected; if(!char) return;
    char.inventory.meals++;
    this.notify('A vizinha mandou um bolo de cenoura. Gente boa existe! 🍰','🍰');
    char.addMoodlet(this,{id:'neighbor_cake',label:'Ganhou bolo da vizinha',icon:'🍰',emotion:'feliz',weight:2,minutes:240});
  }
  eventOutage(){
    if(this.bills.utilitiesOff) return;
    this.bills.utilitiesOff=true; this.bills.outageUntil=this.absMinutes+540;
    this.notify('Queda de energia! Os aparelhos pararam por uns minutos. ⚡','🔌');
    this.audio.sfx('error');
  }
  eventBurglar(){
    if(this.time.hour<21 && this.time.hour>6) return;
    const stolen=Math.min(this.money,randInt(120,480));
    if(stolen<=0) return;
    this.money-=stolen;
    this.notify(`Um vulto levou ${formatMoney(stolen)} enquanto vocês dormiam. Tranquem as portas!`,'🦹');
    this.characters.forEach(c=>c.addMoodlet(this,{id:'robbed',label:'Casa assaltada',icon:'😨',emotion:'triste',weight:3,minutes:720}));
    this.audio.sfx('fire');
    this.refresh();
  }
  eventCelebrity(){
    const char=this.selected; if(!char) return;
    char.addMoodlet(this,{id:'celebrity',label:'Viu uma celebridade!',icon:'🌟',emotion:'feliz',weight:2,minutes:180});
    this.notify('Uma celebridade pixelada passou por aqui! Todo mundo fingiu que não olhou.','🌟');
  }
  eventContest(){
    const char=this.selected; if(!char) return;
    if(char.skillLevel('criatividade')<3){ this.eventFoundMoney(); return; }
    const prize=randInt(250,600);
    this.money+=prize; char.stats.contest++;
    char.addMoodlet(this,{id:'contest_win',label:'Venceu um concurso de arte!',icon:'🏆',emotion:'feliz',weight:4,minutes:700});
    this.notify(`🏆 ${char.name} venceu um concurso de arte e levou ${formatMoney(prize)}!`,'🏆');
    this.audio.sfx('levelup');
  }
  eventSmallFire(){
    const candidates=this.currentLot.objects.filter(o=>['stove','microwave','tv','lamp'].includes(objDef(o).kind));
    if(!candidates.length) return;
    this.igniteObject(pick(candidates));
  }

  /* ---------- Parties ---------- */
  startParty(typeId,host=null){
    typeId=typeId||'pijama';
    const def=PARTY_TYPES.find(p=>p.id===typeId); if(!def) return;
    if(this.party){ this.toast('Já tem uma festa rolando!','error'); return; }
    if(this.money<def.cost){ this.toast('Sem Pixels para essa festa.','error'); return; }
    host=host||this.selected;
    this.money-=def.cost;
    this.party={type:typeId,name:def.name,icon:def.icon,goal:def.goal,progress:0,endsAt:this.absMinutes+def.duration,reward:def.reward,hostId:host?.id};
    // convidados
    const candidates=TOWNIES.filter(t=>!this.characters.find(c=>c.id===t.id)).sort(()=>Math.random()-.5).slice(0,3);
    this.partyGuests=[];
    candidates.forEach(t=>{ const n=this.npcFromTownie(t.id,true); if(n){ this.partyGuests.push(n.id); n.partyGuest=true; } });
    host?.addMoodlet(this,{id:'party_host',label:`Organizou: ${def.name}`,icon:def.icon,emotion:'feliz',weight:3,minutes:def.duration+120});
    this.notify(`${def.name} começou! Receba os convidados e socialize. 🎉`,'🎉');
    this.audio.sfx('party');
    if(this.ui) this.ui.refreshParty();
    this.refresh();
  }
  endParty(){
    if(!this.party) return;
    const p=this.party;
    const success=p.progress>=p.goal;
    if(success){
      this.money+=p.reward;
      this.notify(`A festa foi um sucesso! +${formatMoney(p.reward)} de generosidade dos convidados.`,'🎊');
      this.characters.forEach(c=>c.addMoodlet(this,{id:'party_success',label:'Festa inesquecível',icon:'🎊',emotion:'feliz',weight:3,minutes:600}));
    } else {
      this.notify('A festa terminou morna. Pelo menos sobrou bolo. 🍰','🎈');
      this.characters.forEach(c=>c.addMoodlet(this,{id:'party_meh',label:'Festa meio sem graça',icon:'🎈',emotion:'entediado',weight:1,minutes:240}));
    }
    const host=this.findPerson(p.hostId); if(host) host.stats.familyEvents++;
    this.party=null; this.partyGuests=[];
    this.npcs.forEach(n=>{if(n.partyGuest){n.partyGuest=false;}});
    if(this.ui) this.ui.refreshParty();
    this.refresh();
  }
  checkParty(){
    if(!this.party) return;
    if(this.absMinutes>=this.party.endsAt) this.endParty();
  }

  /* ---------- Family ---------- */
  addHouseholdMember(member){
    if(!member) return false;
    if(this.characters.length>=6){ this.toast('A casa já está cheia (6 moradores).','error'); return false; }
    if(this.characters.find(c=>c.id===member.id)) return false;
    member.isNPC=false; member.hidden=false; member.queue=[]; member.action=null; member.path=[];
    this.npcs=this.npcs.filter(n=>n.id!==member.id);
    this.characters.push(member);
    this.characters.forEach(c=>{
      if(c.id!==member.id){
        const r=c.relationship(member.id); r.met=true;r.friend=Math.max(r.friend,55);r.family=true;
        const rr=member.relationship(c.id); rr.met=true;rr.friend=Math.max(rr.friend,55);rr.family=true;
      }
    });
    this.respawnCharAtLot(member);
    this.notify(`${member.name} agora mora com a família! 🏡`,'🏡');
    this.refresh();
    return true;
  }
  adoptChild(age=2){
    if(this.characters.length>=6){ this.toast('A casa está cheia.','error'); return; }
    if(this.money<1200){ this.toast('A adoção custa P$ 1.200. Faltam Pixels.','error'); return; }
    this.money-=1200;
    const surname=this.characters[0]?.surname||'Pixel';
    const gender=pick(['feminino','masculino','neutro']);
    const name=pick(CREATOR_NAMES[gender]||CREATOR_NAMES.neutro);
    const child=new Character({name,surname,age,gender,traits:[pick(TRAITS).id,pick(TRAITS).id],aspiration:pick(['familia','popularidade','conhecimento']),
      appearance:{skin:pick(SKIN_TONES),hair:pick(HAIR_COLORS),hairStyle:pick(HAIR_STYLES).id,eyes:pick(EYE_COLORS),outfits:{casual:pick(['#d6a34a','#5f9f92','#cc7182']),work:'#6d5d91',sleep:'#d69aae',party:'#8c6ac4'}}});
    this.characters.push(child);
    this.characters.forEach(c=>{
      if(c.id!==child.id){
        const r=c.relationship(child.id); r.met=true;r.friend=70;r.family=true;
        const rr=child.relationship(c.id); rr.met=true;rr.friend=70;rr.family=true;
      }
    });
    this.respawnCharAtLot(child);
    child.addMoodlet(this,{id:'adopted',label:'Encontrou uma família',icon:'🏡',emotion:'feliz',weight:4,minutes:1440});
    this.notify(`${child.name} foi adotado(a)! A família cresceu. 💛`,'👶');
    this.audio.sfx('levelup'); this.checkAspiration(this.selected); this.refresh();
  }
  adoptPet(species='dog'){
    if(this.pets.length>=3){ this.toast('Já tem bichos demais por aqui.','error'); return; }
    if(this.money<280){ this.toast('A adoção de pet custa P$ 280.','error'); return; }
    this.money-=280;
    const pet=new Pet({species,name:pick(PET_NAMES)});
    const spot=this.findFreeSpotNear(this.selected?.x||10,(this.selected?.y||10)+1)||{x:5,y:5};
    pet.x=spot.x;pet.y=spot.y; this.pets.push(pet);
    this.notify(`${pet.name}, o ${species==='cat'?'gato':'cachorro'}, chegou em casa! 🐾`,'🐾');
    this.audio.sfx('pop'); this.checkAspiration(this.selected); this.refresh();
    return pet;
  }
  inviteFriend(){
    const char=this.selected; if(!char) return;
    const known=Object.entries(char.relationships).filter(([id,r])=>r.met&&r.friend>=20&&!this.npcs.find(n=>n.id===id)&&!this.characters.find(c=>c.id===id));
    if(!known.length){ this.toast('Ninguém disponível. Faça amigos no parque ou no café!','info'); return; }
    const [id]=pick(known);
    const npc=this.npcFromTownie(id,true);
    if(npc){
      npc.x=clamp((this.selected?.x||10)+randInt(-1,1),1,this.currentLot.w-2);
      npc.y=clamp((this.selected?.y||10)+randInt(1,2),1,this.currentLot.h-2);
      this.say(npc,'Oi! Vim te visitar!');
      char.addNeed('social',15);
      char.addMoodlet(this,{id:'invited',label:'Recebeu uma visita',icon:'🫖',emotion:'feliz',weight:2,minutes:180});
      this.notify(`${this.personName(id)} aceitou o convite e está aqui!`,'🫖');
    }
  }
  socialMediaPost(){
    const char=this.selected; if(!char) return;
    char.addNeed('diversao',12); char.addNeed('social',5);
    if(chance(0.2)){
      const cash=randInt(25,95); this.money+=cash;
      this.notify(`Seu post viralizou! +${formatMoney(cash)} em patrocínio.`,'📱');
      this.audio.sfx('cash');
    } else {
      char.addMoodlet(this,{id:'posted_direct',label:'Postou e recebeu corações',icon:'❤️',emotion:'feliz',weight:1,minutes:90});
      this.notify('Post publicado. 12 corações e um comentário estranho. ❤️','📱');
    }
    this.refresh();
  }

  /* ---------- Modes / build / buy ---------- */
  setMode(mode){
    if(!['live','buy','build','map','phone','menu'].includes(mode)) mode='live';
    this.mode=mode; this.ghost=null;
    if(this.ui) this.ui.onModeChange(mode);
    if(this.renderer) this.renderer.gestureDirty=true;
  }
  exitBuild(){
    this.ghost=null; this.selectedObjectUid=null; this.mode='live';
    if(this.ui) this.ui.onModeChange('live');
    this.refresh();
  }
  pushUndo(label){
    const lot=this.currentLot;
    this.undoStack.push({
      label, objects:deepClone(lot.objects), walls:deepClone(lot.walls), floors:deepClone(lot.floors), money:this.money
    });
    if(this.undoStack.length>25) this.undoStack.shift();
  }
  undoLast(){
    const st=this.undoStack.pop();
    if(!st){ this.toast('Nada para desfazer.','info'); return; }
    const lot=this.currentLot;
    lot.objects=st.objects; lot.walls=st.walls; lot.floors=st.floors; this.money=st.money;
    this.toast(`Desfeito: ${st.label||'última alteração'}.`,'info');
    this.audio.sfx('pop'); this.refresh();
  }
  canPlaceObject(def,x,y){
    const lot=this.currentLot;
    if(!def||!lot.inBounds(x,y)||!lot.inBounds(x+def.w-1,y+def.h-1)) return {ok:false,reason:'Fora do lote'};
    for(let dx=0;dx<def.w;dx++)for(let dy=0;dy<def.h;dy++){
      const tx=x+dx,ty=y+dy;
      if(lot.wallAt(tx,ty)) return {ok:false,reason:'Tem parede aqui'};
      const objs=lot.objectsAt(tx,ty,true);
      if(def.walkable){
        if(objs.some(o=>objDef(o).walkable)) return {ok:false,reason:'Já tem tapete aqui'};
      } else {
        if(objs.length) return {ok:false,reason:'Espaço ocupado'};
      }
    }
    if(this.money<def.price) return {ok:false,reason:'Pixels insuficientes'};
    return {ok:true};
  }
  placeObject(defId,x,y){
    const def=CATALOG_MAP[defId]; if(!def) return false;
    const check=this.canPlaceObject(def,x,y);
    if(!check.ok){ this.toast(check.reason,'error'); this.audio.sfx('error'); return false; }
    this.pushUndo(`comprar ${def.name}`);
    this.money-=def.price;
    this.currentLot.addObject(defId,x,y);
    this.toast(`${def.name} colocado! -${formatMoney(def.price)}`,'success');
    this.audio.sfx('cash');
    this.checkAspiration(this.selected); this.refresh();
    return true;
  }
  applyBuildTool(x,y){
    const lot=this.currentLot;
    if(!lot.inBounds(x,y)) return;
    const tool=this.buildTool||'wall';
    if(tool==='delete'){
      const obj=lot.objectsAt(x,y,true).slice(-1)[0];
      if(obj){ this.pushUndo('demolir objeto'); const refund=Math.round(lot.sellValue(obj)*0.6); lot.removeObject(obj); this.money+=refund;
        this.toast(`${objDef(obj).name} demolido. +${formatMoney(refund)}`,'info'); this.audio.sfx('tap'); this.refresh(); return; }
      const wall=lot.wallAt(x,y);
      if(wall){ this.pushUndo('demolir parede'); lot.removeWallAt(x,y); this.audio.sfx('tap'); this.refresh(); return; }
      if(lot.floors[lot.key(x,y)]){ this.pushUndo('remover piso'); lot.setFloor(x,y,lot.baseFloor); this.refresh(); return; }
      this.toast('Nada para demolir aqui.','info'); return;
    }
    if(['wall','door','window'].includes(tool)){
      if(lot.objectsAt(x,y,true).length){ this.toast('Tire o móvel antes de construir aqui.','error'); return; }
      if(tool==='wall' && lot.wallAt(x,y)?.type==='wall'){ this.toast('Já tem parede.','info'); return; }
      this.pushUndo(tool==='wall'?'construir parede':tool==='door'?'instalar porta':'instalar janela');
      lot.setWall(x,y,tool,this.buildColor||'#d2b386');
      this.toast(tool==='wall'?'Parede construída.':tool==='door'?'Porta instalada.':'Janela instalada.','success');
      this.audio.sfx('tap'); this.refresh(); if(this.ui) this.ui.refreshBuildPanel(); return;
    }
    if(tool==='floor'){
      if(lot.wallAt(x,y)){ this.toast('Não dá para pintar embaixo da parede.','info'); return; }
      this.pushUndo('pintar piso');
      lot.setFloor(x,y,this.buildFloor||'wood');
      this.audio.sfx('tap'); this.refresh(); if(this.ui) this.ui.refreshBuildPanel(); return;
    }
    if(tool==='paint'){
      const wall=lot.wallAt(x,y);
      if(!wall){ this.toast('Toque em uma parede para pintar.','info'); return; }
      this.pushUndo('pintar parede'); wall.color=this.buildColor||'#d2b386';
      this.audio.sfx('tap'); this.refresh(); return;
    }
  }
  setBuildTool(tool){ this.buildTool=tool; this.ghost=null; if(this.ui) this.ui.refreshBuildPanel(); }
  getUndoLabel(){ return this.undoStack[this.undoStack.length-1]?.label||''; }

  /* ---------- Debug / utility ---------- */
  householdSummary(){
    return this.characters.map(c=>({name:c.name,stage:c.ageLabel,emotion:c.getEmotionInfo().label,mood:Math.round(c.moodValue()),needs:Object.fromEntries(NEEDS.map(n=>[n.id,Math.round(c.needs[n.id])]))}));
  }
  giveMoney(amount){ this.money+=amount; this.refresh(); }
  debugSetNeeds(value){ this.characters.forEach(c=>NEEDS.forEach(n=>c.needs[n.id]=value)); this.refresh(); }
}

/* ---------- Lightweight facades to keep systems discoverable ---------- */
class BuildMode {
  constructor(game){ this.game=game; this.tool='wall'; this.color='#d2b386'; this.floor='wood'; this.undo=[]; }
  select(tool){ this.tool=tool; this.game.setBuildTool(tool); }
  apply(x,y){ return this.game.applyBuildTool(x,y); }
  undo(){ return this.game.undoLast(); }
}
class BuyMode {
  constructor(game){ this.game=game; this.category='sala'; this.selection=null; this.rotation=0; }
  choose(defId){ this.selection=defId; this.game.buySelection=defId; }
  place(x,y){ return this.game.placeObject(this.selection,x,y); }
}
class Neighborhood {
  constructor(game){ this.game=game; }
  lots(){ return LOT_META; }
  travel(id){ this.game.travelTo(id); }
}
class EventSystem {
  constructor(game){ this.game=game; this.log=[]; }
  trigger(){ this.game.randomEvent(); }
}
Object.assign(Game.prototype,{
  moveToTile(x,y){
    const char=this.selected;
    if(!char||char.hidden) return false;
    if(this.mode!=='live') return false;
    const lot=this.currentLot;
    const goal={x:Math.round(x),y:Math.round(y)};
    if(!lot.inBounds(goal.x,goal.y)) return false;
    char.queue=[]; char.action=null; char.currentOutfit='casual';
    const path=Pathfinder.find(lot,{x:char.x,y:char.y},goal,char,this.allPeople());
    if(path===null){ this.toast('Não consigo ir até aí.','error'); return false; }
    char.path=path; char.moving=path.length>0;
    if(path.length){ this.audio.sfx('tap'); this.camera?.follow; }
    this.refreshQueue();
    return true;
  },
  moveNearObject(obj){
    const char=this.selected; if(!char||!obj) return;
    const lot=this.currentLot;
    const spot=lot.interactionSpot(obj,char); if(!spot) { this.toast('Sem espaço para chegar.','error'); return; }
    const path=Pathfinder.find(lot,{x:char.x,y:char.y},spot,char,this.allPeople());
    if(path===null){this.toast('Caminho bloqueado.','error');return;}
    char.queue=[];char.action=null;char.path=path;char.moving=path.length>0;
    this.audio.sfx('tap'); this.refreshQueue();
  },
  nearestObjectAt(tx,ty,includeWalkable=false){
    const objs=this.currentLot.objectsAt(Math.floor(tx),Math.floor(ty),includeWalkable);
    return objs.length?objs[objs.length-1]:null;
  },
  nearestCharacter(tx,ty,maxDist=0.85){
    const all=[...this.characters,...this.npcs].filter(c=>!c.hidden);
    let best=null,bestD=maxDist;
    all.forEach(c=>{ const d=Math.hypot(c.x-tx,c.y-ty); if(d<bestD){best=c;bestD=d;} });
    return best;
  },
  nearestPet(tx,ty,maxDist=0.9){
    let best=null,bestD=maxDist;
    this.pets.filter(p=>!p.hidden).forEach(p=>{const d=Math.hypot(p.x-tx,p.y-ty);if(d<bestD){best=p;bestD=d;}});
    return best;
  }
});
