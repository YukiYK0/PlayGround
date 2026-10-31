/* ============================================================
   UTILITIES, AUDIO, SAVE SYSTEM, TIME
   ============================================================ */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const clamp = (v,min,max) => Math.max(min, Math.min(max, v));
const lerp = (a,b,t) => a + (b-a)*t;
const rand = (a=0,b=1) => a + Math.random()*(b-a);
const randInt = (a,b) => Math.floor(rand(a,b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const chance = p => Math.random() < p;
const round1 = n => Math.round(n*10)/10;
const uid = (prefix='id') => prefix+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
const formatMoney = v => 'P$ '+Math.max(0,Math.round(v)).toLocaleString('pt-BR');
const formatClock = min => {
  min = ((min%1440)+1440)%1440;
  const h = Math.floor(min/60), m = Math.floor(min%60);
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
};
const formatMinutes = m => m >= 60 ? Math.round(m/60*10)/10+'h' : Math.round(m)+'min';
const hash2 = (x,y) => { let h = x*374761393 + y*668265263; h = (h^(h>>13))*1274126177; return ((h^(h>>16))>>>0)/4294967295; };
const deepClone = obj => JSON.parse(JSON.stringify(obj));
const escapeHtml = str => String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hexToRgba = (hex,a=1) => {
  const h = hex.replace('#','');
  const v = h.length===3 ? h.split('').map(c=>c+c).join('') : h;
  const n = parseInt(v,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
};
const esc = document.createElement.bind(document);

class Emitter {
  constructor(){ this.events = new Map(); }
  on(name,fn){ if(!this.events.has(name)) this.events.set(name,[]); this.events.get(name).push(fn); return this; }
  emit(name,data){ (this.events.get(name)||[]).forEach(fn=>{ try{fn(data);}catch(e){console.error(e);} }); }
}

/* ---------- Sound: tiny 8-bit synth, no external assets ---------- */
class AudioManager {
  constructor(){
    this.ctx = null; this.master = null; this.musicGain = null; this.sfxGain = null;
    this.musicVolume = 0.23; this.sfxVolume = 0.38; this.musicOn = true; this.sfxOn = true;
    this.timer = null; this.step = 0; this.started = false;
    this.melody = [523,0,659,784,659,0,587,523, 440,0,523,659,587,523,440,0];
    this.bass = [131,0,0,0,165,0,0,0, 147,0,0,0,196,0,0,0];
  }
  ensure(){
    if(this.ctx) return this.ctx;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxVolume; this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVolume; this.musicGain.connect(this.master);
    }catch(e){ console.warn('Audio unavailable', e); this.ctx = null; }
    return this.ctx;
  }
  resume(){ this.ensure(); if(this.ctx && this.ctx.state==='suspended') this.ctx.resume().catch(()=>{}); }
  setVolumes(music,sfx){
    this.musicVolume = music; this.sfxVolume = sfx;
    if(this.musicGain) this.musicGain.gain.value = this.musicOn ? music : 0;
    if(this.sfxGain) this.sfxGain.gain.value = this.sfxOn ? sfx : 0;
  }
  setMusicOn(on){ this.musicOn = on; if(this.musicGain) this.musicGain.gain.value = on ? this.musicVolume : 0; if(on) this.startMusic(); }
  setSfxOn(on){ this.sfxOn = on; if(this.sfxGain) this.sfxGain.gain.value = on ? this.sfxVolume : 0; }
  tone(freq, dur=0.08, type='square', vol=0.16, slide=0, delay=0){
    if(!this.sfxOn) return;
    const ctx = this.ensure(); if(!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq,t0);
    if(slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide), t0+dur);
    g.gain.setValueAtTime(0.001,t0); g.gain.exponentialRampToValueAtTime(vol,t0+0.008);
    g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
    osc.connect(g); g.connect(this.sfxGain); osc.start(t0); osc.stop(t0+dur+0.02);
  }
  sfx(name){
    this.resume();
    const map = {
      click:[[540,0.04,'square',0.07]],
      tap:[[420,0.05,'triangle',0.08]],
      success:[[523,0.08,'square',0.1,0],[659,0.08,'square',0.1,0,0.07],[784,0.15,'square',0.1,0,0.14]],
      cash:[[880,0.06,'square',0.08],[1175,0.1,'square',0.07,0,0.06],[1568,0.14,'triangle',0.06,0,0.12]],
      levelup:[[523,0.1,'square',0.11],[659,0.1,'square',0.11,0,0.08],[784,0.1,'square',0.11,0,0.16],[1047,0.25,'square',0.1,0,0.24]],
      error:[[180,0.15,'sawtooth',0.08,-50]],
      door:[[330,0.06,'triangle',0.08],[220,0.1,'triangle',0.07,0,0.05]],
      pop:[[660,0.06,'sine',0.1,120]],
      water:[[740,0.08,'sine',0.05,-200],[980,0.08,'sine',0.04,-120,0.08]],
      fire:[[140,0.18,'sawtooth',0.07],[110,0.18,'sawtooth',0.05,-20,0.12]],
      kiss:[[880,0.06,'sine',0.1,300],[1320,0.12,'sine',0.08,100,0.06]],
      snore:[[95,0.3,'triangle',0.05,20],[80,0.3,'triangle',0.04,-10,0.35]],
      party:[[523,0.1,'square',0.08],[659,0.1,'square',0.08,0,0.1],[784,0.1,'square',0.08,0,0.2],[1047,0.16,'square',0.08,0,0.3]],
      rain:[[300,0.06,'sine',0.02,-100]],
      ding:[[1046,0.12,'sine',0.09],[1318,0.2,'sine',0.07,0,0.1]],
    };
    (map[name]||map.click).forEach(n=>this.tone(n[0],n[1],n[2],n[3],n[4]||0,n[5]||0));
  }
  startMusic(){
    if(!this.musicOn || this.started) return;
    const ctx = this.ensure(); if(!ctx) return;
    this.started = true; this.step = 0;
    const tick = () => {
      if(!this.musicOn){ this.started=false; return; }
      if(this.ctx && this.musicGain){
        const i = this.step % 16;
        const mel = this.melody[i];
        const bas = this.bass[i];
        const t = this.ctx.currentTime + 0.02;
        if(mel){
          const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
          o.type='square'; o.frequency.value=mel;
          g.gain.setValueAtTime(0.001,t); g.gain.linearRampToValueAtTime(0.075,t+0.015);
          g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
          o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t+0.2);
        }
        if(bas){
          const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
          o.type='triangle'; o.frequency.value=bas;
          g.gain.setValueAtTime(0.001,t); g.gain.linearRampToValueAtTime(0.06,t+0.02);
          g.gain.exponentialRampToValueAtTime(0.001,t+0.3);
          o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t+0.32);
        }
        this.step++;
      }
      this.timer = setTimeout(tick, 215);
    };
    tick();
  }
  stopMusic(){ this.musicOn = false; clearTimeout(this.timer); this.started=false; }
}

/* ---------- Save system ---------- */
class SaveSystem {
  static prefix = 'pixelsCaos_save_v3_';
  static metaKey = 'pixelsCaos_meta_v3';
  static keys(){ return [1,2,3].map(i=>this.prefix+i); }
  static get(slot){
    try{
      const raw = localStorage.getItem(this.prefix+slot);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      if(!parsed || parsed.version !== SAVE_VERSION) return null;
      return parsed;
    }catch(e){ console.warn('Save read failed', e); return null; }
  }
  static write(slot,state){
    try{
      const payload = {version:SAVE_VERSION, savedAt:Date.now(), state};
      localStorage.setItem(this.prefix+slot, JSON.stringify(payload));
      this.setMeta(slot,{savedAt:Date.now(), name:state.householdName || 'Família', money:state.money, day:state.day, family:state.characters?.filter(c=>!c.isNPC).length || 0});
      return true;
    }catch(e){ console.warn('Save failed', e); return false; }
  }
  static setMeta(slot,meta){
    try{
      let all = {};
      try{ all = JSON.parse(localStorage.getItem(this.metaKey)||'{}'); }catch(e){}
      all[slot] = meta; localStorage.setItem(this.metaKey, JSON.stringify(all));
    }catch(e){}
  }
  static meta(){
    try{ return JSON.parse(localStorage.getItem(this.metaKey)||'{}'); }catch(e){ return {}; }
  }
  static list(){
    return [1,2,3].map(slot=>{
      const data = this.get(slot);
      const meta = this.meta()[slot] || null;
      return {slot, data, meta, empty:!data};
    });
  }
  static latest(){
    const list = this.list().filter(s=>s.data);
    list.sort((a,b)=>(b.meta?.savedAt||0)-(a.meta?.savedAt||0));
    return list[0] || null;
  }
  static remove(slot){ try{ localStorage.removeItem(this.prefix+slot); }catch(e){} }
}

/* ---------- Time ---------- */
class TimeSystem {
  constructor(){
    this.day = 1; this.minutes = 8*60; this.speed = 1; this.paused = false;
    this.dayOfWeek = 1; this.seasonIndex = 0; this.weather = 'sun'; this.holiday = null;
  }
  static weekdayFor(day){ return (day-1)%7; }
  get weekday(){ return TimeSystem.weekdayFor(this.day); }
  get weekdayName(){ return WEEKDAYS[this.weekday]; }
  get season(){ return SEASONS[this.seasonIndex]; }
  get clock(){ return formatClock(this.minutes); }
  get hour(){ return Math.floor(this.minutes/60); }
  get isNight(){ return this.hour < 6 || this.hour >= 21; }
  get isWeekend(){ return this.weekday===0 || this.weekday===6; }
  syncFrom(day,minutes,speed,paused,seasonIndex,weather){
    this.day=day||1; this.minutes=minutes??480; this.speed=speed??1; this.paused=!!paused;
    this.seasonIndex=seasonIndex||0; this.weather=weather||'sun';
    this.dayOfWeek=TimeSystem.weekdayFor(this.day);
    this.holiday=HOLIDAYS[this.day]||null;
  }
}
