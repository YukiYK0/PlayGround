/* ============================================================
   CHARACTERS, NEEDS, EMOTIONS, SKILLS, RELATIONSHIPS
   ============================================================ */

const AGE_STAGES = [
  {id:'bebe', name:'Bebê', icon:'👶', min:0, max:2, canWork:false, canCook:false},
  {id:'crianca', name:'Criança', icon:'🧒', min:3, max:9, canWork:false, canCook:false},
  {id:'adolescente', name:'Adolescente', icon:'🧑‍🎤', min:10, max:17, canWork:false, canCook:true},
  {id:'jovem', name:'Jovem Adulto', icon:'🧑', min:18, max:29, canWork:true, canCook:true},
  {id:'adulto', name:'Adulto', icon:'🧔', min:30, max:59, canWork:true, canCook:true},
  {id:'idoso', name:'Idoso', icon:'🧓', min:60, max:200, canWork:true, canCook:true},
];
const STAGE_MAP = Object.fromEntries(AGE_STAGES.map(s=>[s.id,s]));
function stageForAge(age){ return AGE_STAGES.find(s=>age>=s.min&&age<=s.max) || AGE_STAGES[4]; }

const SKIN_TONES = ['#f6d7bb','#e8b894','#d79b73','#b97a52','#925b3d','#6e422d','#4d2e22','#efc9a5'];
const HAIR_COLORS = ['#241c1c','#4a2c20','#7a3f2a','#b15a37','#d9a441','#e7d7ba','#8c6fb4','#6f8f99','#d96b80'];
const EYE_COLORS = ['#38251c','#5b3a21','#3f6d58','#477fa3','#7761a8','#7b4b38','#3b3b45'];
const HAIR_STYLES = [
  {id:'curto', name:'Curto'}, {id:'franja', name:'Franja'}, {id:'cacheado', name:'Cacheado'},
  {id:'longo', name:'Longo'}, {id:'coque', name:'Coque'}, {id:'moicano', name:'Moicano'},
  {id:'chanel', name:'Chanel'}, {id:'maria', name:'Maria-chiquinha'}, {id:'careca', name:'Careca'},
];
const OUTFIT_TYPES = [
  {id:'casual',name:'Casual',icon:'👕'}, {id:'work',name:'Trabalho',icon:'💼'},
  {id:'sleep',name:'Pijama',icon:'🌙'}, {id:'party',name:'Festa',icon:'✨'},
];

class Character {
  constructor(data={}){
    this.id = data.id || uid('char');
    this.name = data.name || 'Pixel';
    this.surname = data.surname || '';
    this.isNPC = !!data.isNPC;
    this.isBaby = false;
    this.age = data.age ?? 25;
    this.gender = data.gender || 'neutro';
    this.traits = data.traits ? data.traits.slice(0,3) : [];
    this.aspiration = data.aspiration || 'fortuna';
    this.appearance = Object.assign({
      skin: pick(SKIN_TONES), hair: pick(HAIR_COLORS), hairStyle:'curto', eyes: pick(EYE_COLORS),
      outfits:{casual:'#5f9f92',work:'#54708d',sleep:'#9b7bb5',party:'#d56b80'}
    }, deepClone(data.appearance||{}));
    this.needs = Object.assign({}, Object.fromEntries(NEEDS.map(n=>[n.id,75])), data.needs||{});
    this.moodlets = data.moodlets||[];
    this.skills = {};
    SKILLS.forEach(s=>{ this.skills[s.id] = { xp:0 }; });
    if(data.skills){ Object.entries(data.skills).forEach(([id,v])=>{ if(this.skills[id]) this.skills[id]={...this.skills[id],...v}; }); }
    this.career = Object.assign({jobId:null,partTime:false,level:0,performance:50,daysWorked:0,missed:0,lastWorkDay:-1,totalEarned:0}, data.career||{});
    this.relationships = data.relationships || {};
    this.inventory = Object.assign({meals:0,lastRecipe:null,items:[]}, data.inventory||{});
    this.x = data.x ?? 10; this.y = data.y ?? 13;
    this.path = []; this.queue = []; this.action = null; this.groundAction = null;
    this.hidden = false; this.moving = false; this.facing = 'down'; this.walkPhase = 0;
    this.selected = !!data.selected;
    this.level = this.xpLevel || 1;
    this.thought = null; this.thoughtTimer = rand(2,8); this.lastAuto = 0;
    this.stats = Object.assign({
      meals:0, paintings:0, books:0, fish:0, harvest:0, workouts:0, socials:0, dates:0,
      booksRead:0, artSales:0, artSale:0, moneyEarned:0, promotions:0, met:0, friends:0,
      children:0, familyEvents:0, contest:0, engaged:0, married:0, talentShow:0,
    }, data.stats||{});
    this.genderPresentation = data.genderPresentation || this.gender;
    this.birthdayPending = false;
    this.currentOutfit = 'casual';
    this.sick = !!data.sick;
    this.spouseId = data.spouseId || null;
    this.createdByPlayer = data.createdByPlayer !== false;
    this.avatarSeed = data.avatarSeed || randInt(0,9999);
    this.aspirationDone = data.aspirationDone || {};
  }
  get fullName(){ return (this.name+' '+(this.surname||'')).trim(); }
  get stageInfo(){ return stageForAge(this.age); }
  get stageLabel(){ return this.stageInfo.name; }
  get ageLabel(){ return `${this.age} anos · ${this.stageLabel}`; }
  get aspirationInfo(){ return ASPIRATION_MAP[this.aspiration] || ASPIRATIONS[0]; }
  get traitInfo(){ return this.traits.map(t=>TRAIT_MAP[t]).filter(Boolean); }
  hasTrait(id){ return this.traits.includes(id); }
  traitEffect(key){ return this.traitInfo.reduce((v,t)=>v*(t.effects?.[key]??1),1); }
  get outfitColor(){
    const key = this.currentOutfit || 'casual';
    return this.appearance.outfits?.[key] || '#5f9f92';
  }
  avgNeeds(){ return NEEDS.reduce((s,n)=>s+this.needs[n.id],0)/NEEDS.length; }
  lowestNeed(){ return NEEDS.slice().sort((a,b)=>this.needs[a.id]-this.needs[b.id])[0]; }
  addNeed(id,value){ this.needs[id] = clamp((this.needs[id]||0)+value,0,100); }
  addMoodlet(game, moodlet){
    if(!moodlet) return;
    const abs = game.absMinutes + (moodlet.minutes||60);
    const existing = this.moodlets.find(m=>m.id===moodlet.id);
    if(existing){ existing.expires=Math.max(existing.expires,abs); existing.weight=moodlet.weight||existing.weight; }
    else this.moodlets.push({...moodlet, expires:abs});
    if(this.moodlets.length>12) this.moodlets.sort((a,b)=>b.expires-a.expires), this.moodlets.length=12;
  }
  cleanMoodlets(game){
    this.moodlets = this.moodlets.filter(m=>m.expires > game.absMinutes);
  }
  getEmotion(){
    const scores = { feliz:0, triste:0, irritado:0, inspirado:0, envergonhado:0, entediado:0, apaixonado:0, concentrado:0, neutro:0.15 };
    const avg=this.avgNeeds();
    if(avg>=76) scores.feliz += 2.5;
    if(avg<=32) scores.triste += 2.4;
    if(this.needs.fome<22) scores.irritado += 2;
    if(this.needs.banheiro<20) scores.irritado += 3.1;
    if(this.needs.higiene<22) scores.envergonhado += 2.6;
    if(this.needs.diversao<20) scores.entediado += 2.2;
    if(this.needs.social<20) scores.triste += 1.5;
    if(this.needs.energia<18) scores.irritado += 1.4;
    if(this.needs.conforto<22) scores.irritado += 1.1;
    if(this.needs.ambiente<25) scores.irritado += 0.8;
    if(this.needs.fome>70 && this.needs.diversao>70) scores.feliz += 0.4;
    if(this.hasTrait('criativo')) scores.inspirado += 0.25;
    if(this.hasTrait('genio')) scores.concentrado += 0.18;
    if(this.hasTrait('malhumorado')) scores.irritado += 0.4;
    if(this.sick) scores.triste += 1.6;
    this.moodlets.forEach(m=>{
      if(!m.emotion) return;
      scores[m.emotion] = (scores[m.emotion]||0) + (m.weight||1);
    });
    let best='neutro', bestScore=-99;
    for(const [id,score] of Object.entries(scores)) if(score>bestScore){best=id;bestScore=score;}
    if(bestScore<=0.3) best='neutro';
    return best;
  }
  getEmotionInfo(){ return EMOTIONS[this.getEmotion()] || EMOTIONS.neutro; }
  moodValue(){
    const base = (this.avgNeeds()-50)*0.6;
    const mods = this.moodlets.reduce((s,m)=>s+(m.weight||0)*8,0);
    return clamp(base+mods,-100,100);
  }
  skillLevel(id){ return this.skills[id]?.level || 1; }
  skillXp(id){ return this.skills[id]?.xp || 0; }
  skillProgress(id){
    const level=this.skillLevel(id), xp=this.skillXp(id);
    const need = level*100;
    return {level,xp,need,pct:clamp(xp/need*100,0,100)};
  }
  addSkill(game,id,amount,emotion=null){
    if(!this.skills[id]) this.skills[id]={xp:0};
    const traitMap={criatividade:'creativeSkill',logica:'logicSkill',programacao:'programmingSkill',musica:'musicSkill',escrita:'writingSkill',jardinagem:'gardenSkill',mecanica:'mechanicSkill',pesca:'fishingSkill',comedia:'comedySkill',culinaria:'cookingSkill',condicionamento:'fitnessSkill',carisma:'socialSkill'};
    let mult=this.traitEffect(traitMap[id]);
    const emo=emotion||this.getEmotion();
    const emoMap={inspirado:{criatividade:1.6,musica:1.35,escrita:1.35},concentrado:{logica:1.4,programacao:1.45,mecanica:1.3,jardinagem:1.25},feliz:{carisma:1.2,comedia:1.2}};
    mult*=emoMap[emo]?.[id]||1;
    const final=Math.max(1,Math.round(amount*mult));
    const prevLevel=this.skillLevel(id);
    this.skills[id].xp += final;
    let leveled=false;
    while(this.skillLevel(id)<10 && this.skills[id].xp >= this.skillLevel(id)*100){
      this.skills[id].xp -= this.skillLevel(id)*100;
      this.skills[id].level = (this.skills[id].level||1)+1;
      leveled=true;
    }
    if(leveled){
      this.addMoodlet(game,{id:'skill_up_'+id,label:`Nível ${this.skillLevel(id)} em ${SKILL_MAP[id].name}!`,icon:'⭐',emotion:'feliz',weight:2,minutes:180});
      game?.toast(`${this.name} subiu para o nível ${this.skillLevel(id)} em ${SKILL_MAP[id].name}! ⭐`,'levelup');
      game?.audio.sfx('levelup');
      game?.checkAspiration(this);
    }
    return final;
  }
  relationship(id){
    if(!this.relationships[id]){
      this.relationships[id]={friend:0,romance:0,met:false,dating:false,engaged:false,married:false,family:false,lastTalk:0};
    }
    return this.relationships[id];
  }
  statusWith(id){
    const r=this.relationships[id];
    if(!r || !r.met) return 'Não conhecido';
    if(r.married) return 'Casado(a)';
    if(r.engaged) return 'Noivo(a)';
    if(r.dating) return 'Namorado(a)';
    if(r.friend <= 12) return 'Inimigo';
    if(r.friend >= 78) return 'Melhor amigo';
    if(r.friend >= 38) return 'Amigo';
    return 'Conhecido';
  }
  meetsAgeForRomance(other){
    return this.age>=18 && other.age>=18;
  }
  addItem(item){
    const it={uid:uid('item'),...item};
    this.inventory.items.push(it);
    if(this.inventory.items.length>30) this.inventory.items.shift();
    return it;
  }
  tickNeeds(mins,game,lot){
    const e=(key)=>this.traitEffect(key);
    for(const n of NEEDS){
      let d=n.decay*mins;
      if(n.id==='fome') d*=e('hungerDecay');
      if(n.id==='energia') d*=e('energyDecay');
      if(n.id==='higiene') d*=e('hygieneDecay');
      if(n.id==='social') d*=e('socialDecay');
      if(n.id==='diversao') d*=e('funDecay');
      if(n.id==='conforto') d*=e('comfort');
      if(n.id==='ambiente'){
        const target=lot?.ambience?.()??55;
        this.needs.ambiente = lerp(this.needs.ambiente,target,clamp(mins/180,0,1));
        continue;
      }
      this.needs[n.id]=clamp(this.needs[n.id]-d,0,100);
    }
    if(this.needs.banheiro<=0 && !this.pendingAccident){
      this.pendingAccident=true;
      this.needs.banheiro=20; this.addNeed('higiene',-22);
      this.addMoodlet(game,{id:'accident',label:'Aconteceu um acidente...',icon:'💦',emotion:'envergonhado',weight:3,minutes:240});
      game.toast(`${this.name} não chegou ao banheiro a tempo. 😳`,'error');
      game.audio.sfx('error');
    }
    if(this.needs.banheiro>30) this.pendingAccident=false;
    if(this.needs.energia<=0 && !this.fainted){
      this.fainted=true;
      this.addMoodlet(game,{id:'fainted',label:'Desmaiou de exaustão',icon:'💫',emotion:'triste',weight:3,minutes:240});
      this.needs.energia=28; this.queue=[]; this.action=null; this.path=[];
      game.toast(`${this.name} desmaiou de exaustão! 💫`,'error');
      game.audio.sfx('error');
    }
    if(this.needs.energia>35) this.fainted=false;
    if(this.needs.fome<=0 && !this.starving){
      this.starving=true;
      this.addMoodlet(game,{id:'starving',label:'Estômago roncando',icon:'🍽',emotion:'irritado',weight:3,minutes:120});
    }
    if(this.needs.fome>20) this.starving=false;
  }
  get isSleeping(){ return this.action && (this.action.anim==='sleep'||this.action.id==='sleep'||this.action.id==='nap'); }
  serialize(){
    return {
      id:this.id,name:this.name,surname:this.surname,isNPC:this.isNPC,age:this.age,gender:this.gender,
      genderPresentation:this.genderPresentation,traits:this.traits,aspiration:this.aspiration,appearance:this.appearance,
      needs:this.needs,moodlets:this.moodlets,skills:this.skills,career:this.career,relationships:this.relationships,
      inventory:this.inventory,x:this.x,y:this.y,selected:this.selected,sick:this.sick,stats:this.stats,
      spouseId:this.spouseId,createdByPlayer:this.createdByPlayer,avatarSeed:this.avatarSeed,aspirationDone:this.aspirationDone,
    };
  }
  static fromSave(data){ return new Character(data); }
  static random(game=null, opts={}){
    const genders=['feminino','masculino','neutro'];
    const gender=opts.gender||pick(genders);
    const names=CREATOR_NAMES[gender]||CREATOR_NAMES.neutro;
    const surname=opts.surname||pick(CREATOR_SURNAMES);
    const age=opts.age??randInt(18,35);
    const stage=stageForAge(age);
    const traits=[...TRAITS].sort(()=>Math.random()-0.5).slice(0,3).map(t=>t.id);
    return new Character({
      name:opts.name||pick(names),surname,age,gender,traits,
      aspiration:opts.aspiration||pick(ASPIRATIONS).id,
      appearance:{
        skin:pick(SKIN_TONES),hair:pick(HAIR_COLORS),hairStyle:pick(HAIR_STYLES).id,eyes:pick(EYE_COLORS),
        outfits:{casual:pick(['#5f9f92','#cc7182','#d6a34a','#7c74c9','#d27857']),work:pick(['#4e7189','#6d5d91','#596d5d']),sleep:pick(['#9b7bb5','#6f89bc','#d69aae']),party:pick(['#d56b80','#d6b848','#8c6ac4'])}
      }
    });
  }
}

/* ---------- Pets ---------- */
class Pet {
  constructor(data={}){
    this.id=data.id||uid('pet');
    this.name=data.name||pick(PET_NAMES);
    this.species=data.species||'dog';
    this.personality=data.personality||pick(['brincalhão','calmo','curioso','dramático','comilão']);
    this.needs={fome:75,energia:80,diversao:70,higiene:75};
    this.training=data.training||0;
    this.x=data.x??8;this.y=data.y??13;this.hidden=false;this.path=[];this.wanderTimer=rand(2,5);
    this.icon=this.species==='cat'?'🐱':'🐶';
    this.lost=false;
  }
  get mood(){ return this.needs.fome<25||this.needs.diversao<25?'triste':(this.needs.diversao>75?'feliz':'neutro'); }
  tick(mins,game,lot){
    for(const [k,decay] of Object.entries({fome:0.075,energia:0.04,diversao:0.05,higiene:0.02})) this.needs[k]=clamp(this.needs[k]-decay*mins,0,100);
  }
  serialize(){ return {id:this.id,name:this.name,species:this.species,personality:this.personality,needs:this.needs,training:this.training,x:this.x,y:this.y,lost:this.lost}; }
}
