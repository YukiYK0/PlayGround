/* ============================================================
   WORLD, LOTS, GRID, PATHFINDING
   ============================================================ */

function makeObject(defId, x, y, extra={}){
  const def = CATALOG_MAP[defId];
  if(!def) return null;
  const obj = {
    uid: extra.uid || uid('obj'), defId, x, y, w: def.w, h: def.h,
    condition: 100, dirty: 0, broken: false,
    lit: !!def.light, upgraded: 0, rotation: 0,
    garden: null, customName: null, ...extra
  };
  if(def.kind === 'garden') obj.garden = extra.garden || { planted:null, growth:0, watered:false, quality:1 };
  return obj;
}
const objDef = o => CATALOG_MAP[o.defId] || CATALOG[0];
const objName = o => o.customName || objDef(o).name.replace(/\s+[A-ZÀ-Ú][^\s]*$/,'');

class Lot {
  constructor(def){
    Object.assign(this, {
      id:'home', name:'Casa Aurora', type:'home', icon:'🏠', w:30, h:20,
      baseFloor:'grass', floors:{}, walls:[], objects:[], spawn:[{x:10,y:13},{x:9,y:13},{x:11,y:13}],
      desc:'Um cantinho no bairro.', outdoors:false, publicLot:false, npcIds:[],
      price:0, forSale:false
    }, def);
    this.characters = [];
    this.resetTransient();
  }
  resetTransient(){ this.characters = []; this.lotPets = []; }
  key(x,y){ return x+','+y; }
  inBounds(x,y){ return x>=0 && y>=0 && x<this.w && y<this.h; }
  floorTypeAt(x,y){ return this.floors[this.key(x,y)] || this.baseFloor; }
  floorBlocked(x,y){ return ['water','void'].includes(this.floorTypeAt(x,y)); }
  wallAt(x,y){ return this.walls.find(w=>w.x===x && w.y===y) || null; }
  objectsAt(x,y,includeWalkable=true){
    return this.objects.filter(o=> x>=o.x && y>=o.y && x<o.x+o.w && y<o.y+o.h &&
      (includeWalkable || !objDef(o).walkable));
  }
  objectAt(x,y,includeWalkable=false){ return this.objectsAt(x,y,includeWalkable).slice(-1)[0] || null; }
  wallBlocks(x,y){ const w=this.wallAt(x,y); return !!w && w.type!=='door'; }
  objectBlocks(x,y){
    return this.objectsAt(x,y,false).some(o=>{
      const def = objDef(o);
      return !def.walkable && def.kind !== 'fence' || (def.kind==='fence');
    });
  }
  walkable(x,y,ignoreUid=null){
    if(!this.inBounds(x,y)) return false;
    if(this.floorBlocked(x,y)) return false;
    if(this.wallBlocks(x,y)) return false;
    if(this.objectsAt(x,y,false).some(o=>o.uid!==ignoreUid && !objDef(o).walkable)) return false;
    return true;
  }
  addObject(defId,x,y,extra={}){
    const obj = makeObject(defId,x,y,extra);
    if(!obj) return null;
    this.objects.push(obj); return obj;
  }
  removeObject(uidOrObj){
    const id = typeof uidOrObj==='string' ? uidOrObj : uidOrObj.uid;
    const i = this.objects.findIndex(o=>o.uid===id);
    if(i>=0) return this.objects.splice(i,1)[0];
    return null;
  }
  removeWallAt(x,y){
    const i=this.walls.findIndex(w=>w.x===x&&w.y===y);
    if(i>=0) return this.walls.splice(i,1)[0];
    return null;
  }
  setWall(x,y,type='wall',color='#c7a57b'){
    if(!this.inBounds(x,y)) return false;
    const existing=this.wallAt(x,y);
    if(existing){ existing.type=type; existing.color=color; }
    else this.walls.push({x,y,type,color});
    return true;
  }
  setFloor(x,y,type){
    if(!this.inBounds(x,y)) return false;
    if(type===this.baseFloor) delete this.floors[this.key(x,y)];
    else this.floors[this.key(x,y)] = type;
    return true;
  }
  adjacentTiles(obj){
    const out=[]; const seen=new Set();
    const add=(x,y)=>{ if(this.walkable(x,y) && !seen.has(this.key(x,y))){seen.add(this.key(x,y));out.push({x,y});} };
    for(let x=obj.x;x<obj.x+obj.w;x++){ add(x,obj.y-1); add(x,obj.y+obj.h); }
    for(let y=obj.y;y<obj.y+obj.h;y++){ add(obj.x-1,y); add(obj.x+obj.w,y); }
    if(!out.length && objDef(obj).walkable) add(obj.x,obj.y);
    return out;
  }
  interactionSpot(obj, char){
    const candidates = this.adjacentTiles(obj);
    if(!candidates.length) return null;
    candidates.sort((a,b)=>{
      const da=Math.abs(a.x-char.x)+Math.abs(a.y-char.y), db=Math.abs(b.x-char.x)+Math.abs(b.y-char.y);
      return da-db;
    });
    return candidates[0];
  }
  ambience(){
    let a=0;
    this.objects.forEach(o=>{
      const d=objDef(o); let v=(d.ambience||0);
      if(o.broken) v-=2; if(o.dirty>60) v-=2;
      if(d.light && !o.lit) v*=0.4;
      a+=v;
    });
    return clamp(45 + a*1.4, 0, 100);
  }
  value(){ return this.objects.reduce((s,o)=>s+Math.round(objDef(o).price*0.55),0) + this.walls.length*18 + Object.keys(this.floors).length*10; }
  sellValue(o){ const d=objDef(o); return Math.round(d.price * (0.4 + (o.upgraded||0)*0.08) * (o.condition/100)); }
  serialize(){
    return {
      id:this.id,name:this.name,type:this.type,w:this.w,h:this.h,baseFloor:this.baseFloor,
      floors:this.floors, walls:this.walls, objects:this.objects,
      playerOwned:this.playerOwned, forSale:this.forSale, price:this.price,
    };
  }
  static hydrate(data){
    if(!data) return null;
    const lot = new Lot(data);
    lot.objects = (data.objects||[]).map(o=>{
      const d=CATALOG_MAP[o.defId]; if(!d) return null;
      return {...o,w:o.w||d.w,h:o.h||d.h};
    }).filter(Boolean);
    lot.walls = data.walls||[];
    lot.floors = data.floors||{};
    return lot;
  }
}

/* ---------- Home layouts ---------- */
function buildHomeWalls(lot, empty=false){
  if(empty) return;
  const win = (x,y)=>lot.setWall(x,y,'window','#d7e7e8');
  const wall = (x,y)=>lot.setWall(x,y,'wall','#d2b386');
  // perimeter
  for(let x=3;x<=17;x++){ if(x===10) lot.setWall(x,12,'door','#9b6f4d'); else wall(x,12); wall(x,2); }
  for(let y=2;y<=12;y++){ if(y===6){win(3,y);win(17,y);} else {wall(3,y);wall(17,y);} }
  win(5,2); win(14,2);
  // interior walls
  for(let x=4;x<=16;x++){ if(x===9) lot.setWall(x,7,'door','#a97b56'); else wall(x,7); }
  for(let y=3;y<=6;y++){ if(y===4) lot.setWall(11,y,'door','#a97b56'); else wall(11,y); }
  // floor
  for(let x=4;x<=16;x++) for(let y=3;y<=11;y++) lot.setFloor(x,y,'wood');
  for(let x=12;x<=16;x++) for(let y=3;y<=6;y++) lot.setFloor(x,y,'tile');
  for(let x=4;x<=8;x++) for(let y=8;y<=11;y++) lot.setFloor(x,y,'kitchen');
}
function buildFurnishedHome(lot){
  START_FURNITURE.forEach(([id,x,y])=>{
    if(CATALOG_MAP[id] && lot.inBounds(x,y)) lot.addObject(id,x,y);
  });
  // extra starter details, avoiding duplicates
  if(!lot.objects.some(o=>o.defId==='cavalete')) lot.addObject('cavalete',8,3);
  if(!lot.objects.some(o=>o.defId==='cama_infantil')) lot.addObject('cama_infantil',8,5);
  // keep starter rug out of the coffee table footprint
  lot.objects = lot.objects.filter(o=>!(o.defId==='tapete' && o.x===13 && o.y===10));
  lot.addObject('tapete',9,10);
  lot.addObject('canteiro',8,17);
  lot.addObject('planta',17,13);
}
function createHomeLot(empty=false){
  const lot=new Lot({id:'home',name:'Casa Aurora',type:'home',icon:'🏠',w:30,h:20,
    baseFloor:'grass',desc:'A casinha que virou o centro do seu caos.',playerOwned:true,price:0});
  buildHomeWalls(lot,empty);
  if(!empty) buildFurnishedHome(lot);
  else {
    lot.addObject('caixa_correio',11,14);
    lot.addObject('lixeira_ext',17,14);
  }
  lot.spawn=[{x:10,y:13},{x:9,y:14},{x:12,y:14},{x:8,y:14},{x:13,y:14},{x:7,y:14}];
  return lot;
}
function createIpeLot(){
  const lot=new Lot({id:'casa_ipe',name:'Casa Ipê',type:'home',icon:'🏡',w:28,h:19,
    baseFloor:'grass',desc:'Uma casa maior com quintal e cheiro de novo.',price:4200,forSale:true});
  for(let x=2;x<=15;x++){ if(x===8) lot.setWall(x,11,'door','#9b6f4d'); else lot.setWall(x,11,'wall','#d8bd93'); lot.setWall(x,1,'wall','#d8bd93'); }
  for(let y=1;y<=11;y++){ lot.setWall(2,y,'wall','#d8bd93'); lot.setWall(15,y, y===5?'window':'wall','#d8bd93'); }
  for(let x=3;x<=14;x++) for(let y=2;y<=10;y++) lot.setFloor(x,y,'wood');
  for(let x=11;x<=14;x++) for(let y=2;y<=6;y++) lot.setFloor(x,y,'tile');
  lot.addObject('cama',4,3); lot.addObject('criado',6,3); lot.addObject('guarda_roupa',4,5);
  lot.addObject('vaso_sanitario',12,3); lot.addObject('chuveiro',14,3); lot.addObject('pia_banheiro',12,5);
  lot.addObject('geladeira',3,8); lot.addObject('fogao',4,8); lot.addObject('bancada',5,8);
  lot.addObject('mesa_jantar',6,9); lot.addObject('cadeira',6,8); lot.addObject('cadeira',8,9);
  lot.addObject('sofa',9,7); lot.addObject('tv',9,6); lot.addObject('estante',14,8);
  lot.addObject('arvore',18,14); lot.addObject('canteiro',4,15); lot.addObject('canteiro',6,15);
  lot.addObject('caixa_correio',9,12);
  lot.spawn=[{x:8,y:12},{x:9,y:12},{x:7,y:12},{x:10,y:12}];
  return lot;
}

function basePublic(id,name,icon,w,h,floor,desc,extra={}){
  return new Lot({id,name,type:'public',icon,w,h,baseFloor:floor,desc,outdoors:floor==='grass'||floor==='sand',...extra});
}
function createPark(){
  const lot=basePublic('park','Parque Girassol','🌳',24,18,'grass','Pipas, piqueniques e patos julgando você.');
  lot.setFloor(4,3,'water'); lot.setFloor(5,3,'water'); lot.setFloor(6,3,'water'); lot.setFloor(4,4,'water'); lot.setFloor(5,4,'water'); lot.setFloor(6,4,'water');
  lot.addObject('arvore',2,2); lot.addObject('arvore',20,2); lot.addObject('arvore',2,14); lot.addObject('arvore',21,14);
  lot.addObject('banco_jardim',8,7); lot.addObject('banco_jardim',15,7);
  lot.addObject('churrasqueira',11,10); lot.addObject('fogueira',18,11);
  lot.addObject('canteiro',10,14); lot.addObject('canteiro',12,14); lot.addObject('flor_exterior',8,12);
  lot.addObject('balanco',16,14); lot.addObject('lixeira_ext',22,9); lot.addObject('kit_pesca',7,4);
  lot.addObject('fonte',12,5);
  lot.spawn=[{x:12,y:8},{x:11,y:8},{x:13,y:8},{x:10,y:8},{x:14,y:8}];
  lot.npcIds=['t_tonho','t_duda','t_bento','t_iris']; return lot;
}
function createCafe(){
  const lot=basePublic('cafe','Café Lua Cheia','☕',18,13,'wood','Café forte, bolo e fofoca de qualidade.');
  for(let x=1;x<=16;x++){ lot.setWall(x,1,'wall','#896a54'); }
  for(let y=1;y<=7;y++){ lot.setWall(1,y,'window','#d7e7e8'); lot.setWall(16,y,'wall','#896a54'); }
  lot.setFloor(2,2,'kitchen'); lot.setFloor(3,2,'kitchen'); lot.setFloor(2,3,'kitchen');
  lot.addObject('bancada',2,2); lot.addObject('maquina_cafe',3,2); lot.addObject('cafeteira',4,2);
  lot.addObject('mesa_jantar',7,5); lot.addObject('cadeira',7,4); lot.addObject('cadeira',8,6);
  lot.addObject('mesa_jantar',11,7); lot.addObject('cadeira',11,6); lot.addObject('cadeira',12,8);
  lot.addObject('sofa',13,3); lot.addObject('estante',7,2); lot.addObject('planta',15,5);
  lot.npcIds=['t_clara','t_rui','t_maya'];
  lot.spawn=[{x:8,y:8},{x:9,y:8},{x:10,y:8}]; return lot;
}
function createGym(){
  const lot=basePublic('gym','Academia Força Bruta','🏋️',20,14,'concrete','O lugar onde o suor tem playlist própria.');
  for(let x=1;x<=18;x++) lot.setWall(x,1,'wall','#64747b');
  lot.setWall(1,1,'wall'); lot.setWall(19,1,'wall');
  for(let y=2;y<=6;y++){ lot.setWall(1,y,'wall'); lot.setWall(19,y,'wall'); }
  lot.addObject('esteira',4,3); lot.addObject('esteira',6,3); lot.addObject('barra',9,3);
  lot.addObject('barra',11,3); lot.addObject('espelho',8,2); lot.addObject('espelho',12,2);
  lot.addObject('chuveiro',16,4); lot.addObject('vaso_sanitario',17,3); lot.addObject('pia_banheiro',17,5);
  lot.addObject('sofa',4,9); lot.addObject('planta',18,9); lot.addObject('maquina_cafe',8,9);
  lot.addObject('som',14,8);
  lot.npcIds=['t_beto','t_caua','t_maya'];
  lot.spawn=[{x:9,y:7},{x:10,y:7},{x:8,y:7}]; return lot;
}
function createLibrary(){
  const lot=basePublic('library','Biblioteca Sussurro','📚',20,15,'wood','Silêncio, livros e um Wi-Fi surpreendente.');
  for(let y=2;y<=10;y++){ lot.setWall(1,y,'wall','#806747'); lot.setWall(18,y,'wall','#806747'); }
  lot.setWall(1,1,'wall'); lot.setWall(18,1,'wall');
  for(let x=1;x<=18;x++) lot.setWall(x,1,'wall','#806747');
  for(let x=3;x<=16;x+=2) lot.addObject('estante',x,3);
  lot.addObject('estante',4,7); lot.addObject('estante',14,7);
  lot.addObject('computador',8,9); lot.addObject('computador',11,9);
  lot.addObject('mesa_jantar',8,6); lot.addObject('cadeira',7,6); lot.addObject('cadeira',10,6);
  lot.addObject('poltrona',16,10); lot.addObject('planta',17,8); lot.addObject('abajur',16,11);
  lot.npcIds=['t_iris','t_rui','t_neide'];
  lot.spawn=[{x:9,y:10},{x:10,y:10},{x:8,y:10}]; return lot;
}
function createClub(){
  const lot=basePublic('club','Clube Neon','🪩',20,15,'dark','Luzes, graves e decisões duvidosas.');
  for(let x=1;x<=18;x++) lot.setWall(x,1,'wall','#423357');
  for(let y=2;y<=11;y++){ lot.setWall(1,y,'wall','#423357'); lot.setWall(18,y,'wall','#423357'); }
  lot.addObject('som',4,3); lot.addObject('som',15,3); lot.addObject('lustre',9,4); lot.addObject('pisca',14,2);
  for(let y=8;y<=11;y++) for(let x=7;x<=13;x++) lot.setFloor(x,y,'dance');
  lot.addObject('sofa',4,10); lot.addObject('sofa',15,10); lot.addObject('mesa_centro',3,12);
  lot.addObject('maquina_cafe',17,7); lot.addObject('planta',2,7);
  lot.npcIds=['t_clara','t_tonho','t_caua','t_maya','t_zeca'];
  lot.spawn=[{x:10,y:9},{x:9,y:9},{x:11,y:9}]; return lot;
}
function createBeach(){
  const lot=basePublic('beach','Praia do Coral','🏖️',26,17,'sand','Água salgada, sol e um guarda-sol que voa.');
  for(let x=0;x<26;x++) for(let y=0;y<4;y++) lot.setFloor(x,y,'water');
  for(let x=2;x<24;x+=6) lot.addObject('arvore',x,5);
  lot.addObject('espreguicadeira',5,9); lot.addObject('espreguicadeira',8,9);
  lot.addObject('espreguicadeira',17,9); lot.addObject('kit_pesca',12,4);
  lot.addObject('churrasqueira',20,11); lot.addObject('fogueira',14,13);
  lot.addObject('banco_jardim',23,13); lot.addObject('lixeira_ext',2,13);
  lot.npcIds=['t_beto','t_lulu','t_iris'];
  lot.spawn=[{x:12,y:10},{x:11,y:10},{x:13,y:10}]; return lot;
}
function createShop(){
  const lot=basePublic('shop','Mercado Pitanga','🛍️',19,13,'tile','Tudo que você não sabia que precisava.');
  for(let x=1;x<=17;x++) lot.setWall(x,1,'wall','#7c6b59');
  for(let y=2;y<=8;y++){ lot.setWall(1,y,'wall','#7c6b59'); lot.setWall(17,y,'wall','#7c6b59'); }
  for(let x=3;x<=14;x+=3){ lot.addObject('prateleira_hobby',x,3); lot.addObject('prateleira_hobby',x,5); }
  lot.addObject('bancada',14,8); lot.addObject('cafeteira',15,8); lot.addObject('lixeira',16,9);
  lot.addObject('planta',2,9); lot.addObject('quadro',8,2);
  lot.npcIds=['t_clara','t_duda','t_neide'];
  lot.spawn=[{x:9,y:9},{x:10,y:9},{x:8,y:9}]; return lot;
}
function createSchool(){
  const lot=basePublic('school','Escola Arco-Íris','🏫',21,14,'tile','Onde o futuro faz lição de casa.');
  for(let x=1;x<=19;x++) lot.setWall(x,1,'wall','#9d8b63');
  for(let y=2;y<=9;y++){ lot.setWall(1,y,'wall','#9d8b63'); lot.setWall(19,y,'wall','#9d8b63'); }
  for(let x=4;x<=16;x+=4) for(let y=4;y<=7;y+=3) lot.addObject('mesa_desenho',x,y);
  lot.addObject('estante',17,3); lot.addObject('quadro',10,2); lot.addObject('lixeira',17,8);
  lot.addObject('balanco',4,11); lot.addObject('balanco',7,11);
  lot.npcIds=['t_duda','t_bento','t_caua'];
  lot.spawn=[{x:9,y:9},{x:10,y:9},{x:8,y:9}]; return lot;
}
function createClinic(){
  const lot=basePublic('clinic','Clínica Bem-Estar','🩺',18,13,'tile','Cheiro de álcool, esperança e revista velha.');
  for(let x=1;x<=16;x++) lot.setWall(x,1,'wall','#b8c8c4');
  for(let y=2;y<=8;y++){ lot.setWall(1,y,'wall','#b8c8c4'); lot.setWall(16,y,'wall','#b8c8c4'); }
  lot.addObject('sofa',5,6); lot.addObject('poltrona',10,6); lot.addObject('planta',14,6);
  lot.addObject('computador',3,3); lot.addObject('computador',7,3); lot.addObject('estante',12,3);
  lot.addObject('maquina_cafe',15,8); lot.addObject('vaso_sanitario',8,8);
  lot.npcIds=['t_lulu','t_neide'];
  lot.spawn=[{x:8,y:9},{x:9,y:9}]; return lot;
}
const LOT_FACTORY = {
  home:()=>createHomeLot(false), casa_ipe:createIpeLot, park:createPark, cafe:createCafe,
  gym:createGym, library:createLibrary, club:createClub, beach:createBeach, shop:createShop,
  school:createSchool, clinic:createClinic,
};
const LOT_META = [
  {id:'home', name:'Casa Aurora', icon:'🏠', type:'home', blurb:'Seu cantinho. Cama, café e caos.'},
  {id:'park', name:'Parque Girassol', icon:'🌳', type:'lazer', blurb:'Pesca, churrasco e ar livre.'},
  {id:'cafe', name:'Café Lua Cheia', icon:'☕', type:'lazer', blurb:'Café, doces e conversas.'},
  {id:'gym', name:'Academia Força Bruta', icon:'🏋️', type:'lazer', blurb:'Treino, suor e espelhos.'},
  {id:'library', name:'Biblioteca Sussurro', icon:'📚', type:'lazer', blurb:'Leitura e concentração.'},
  {id:'club', name:'Clube Neon', icon:'🪩', type:'lazer', blurb:'Dança até de manhã.'},
  {id:'beach', name:'Praia do Coral', icon:'🏖️', type:'lazer', blurb:'Mar, sol e pescaria.'},
  {id:'shop', name:'Mercado Pitanga', icon:'🛍️', type:'servico', blurb:'Compras e achados.'},
  {id:'school', name:'Escola Arco-Íris', icon:'🏫', type:'servico', blurb:'Aulas e amizades.'},
  {id:'clinic', name:'Clínica Bem-Estar', icon:'🩺', type:'servico', blurb:'Cuidar de si.'},
  {id:'casa_ipe', name:'Casa Ipê', icon:'🏡', type:'imovel', blurb:'Casa maior à venda por P$ 4.200.', price:4200},
];

/* ---------- A* pathfinding ---------- */
class Pathfinder {
  static find(lot,start,goal,char=null,others=[]){
    if(!lot || !start || !goal) return null;
    if(!lot.walkable(goal.x,goal.y)){
      const adj=[]; for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){
        const x=goal.x+dx,y=goal.y+dy; if(lot.walkable(x,y)) adj.push({x,y});
      }
      if(!adj.length) return null;
      adj.sort((a,b)=>(Math.abs(a.x-start.x)+Math.abs(a.y-start.y))-(Math.abs(b.x-start.x)+Math.abs(b.y-start.y)));
      goal=adj[0];
    }
    const sx=Math.round(start.x), sy=Math.round(start.y), gx=goal.x, gy=goal.y;
    if(sx===gx && sy===gy) return [];
    if(!lot.walkable(sx,sy)) {
      // snap out if character is somehow inside furniture
      let best=null,bestD=999;
      for(let y=0;y<lot.h;y++)for(let x=0;x<lot.w;x++) if(lot.walkable(x,y)){
        const d=Math.abs(x-sx)+Math.abs(y-sy); if(d<bestD){bestD=d;best={x,y};}
      }
      if(!best) return null;
      return this.find(lot,best,goal,char,others);
    }
    const key=(x,y)=>y*lot.w+x;
    const open=[]; const openMap=new Map(); const closed=new Set(); const from=new Map(); const gScore=new Map();
    const h=(x,y)=>Math.abs(x-gx)+Math.abs(y-gy);
    const startKey=key(sx,sy);
    open.push({x:sx,y:sy,g:0,f:h(sx,sy)}); openMap.set(startKey,{x:sx,y:sy,g:0,f:h(sx,sy)}); gScore.set(startKey,0);
    const otherTiles=new Set((others||[]).filter(c=>c!==char&&!c.hidden).map(c=>key(Math.round(c.x),Math.round(c.y))));
    let iter=0;
    while(open.length && iter++<2200){
      open.sort((a,b)=>a.f-b.f);
      const cur=open.shift(); const ck=key(cur.x,cur.y); openMap.delete(ck);
      if(cur.x===gx&&cur.y===gy){
        const path=[]; let k=ck;
        while(from.has(k)){ const p=from.get(k); path.push({x:p.x,y:p.y}); k=key(p.x,p.y); }
        path.reverse();
        return path.length?path:[];
      }
      closed.add(ck);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cur.x+dx, ny=cur.y+dy;
        if(!lot.walkable(nx,ny)) continue;
        const nk=key(nx,ny); if(closed.has(nk)) continue;
        let step=1;
        if(otherTiles.has(nk)) step+=4;
        const ng=cur.g+step;
        if(gScore.has(nk) && ng>=gScore.get(nk)) continue;
        gScore.set(nk,ng); from.set(nk,{x:cur.x,y:cur.y});
        const node={x:nx,y:ny,g:ng,f:ng+h(nx,ny)};
        const ex=openMap.get(nk);
        if(ex){ ex.g=ng; ex.f=node.f; }
        else { open.push(node); openMap.set(nk,node); }
      }
    }
    return null;
  }
  static pathToObject(lot,char,obj,others=[]){
    if(!obj) return null;
    const spots=lot.adjacentTiles(obj);
    if(!spots.length) return null;
    spots.sort((a,b)=>(Math.abs(a.x-char.x)+Math.abs(a.y-char.y))-(Math.abs(b.x-char.x)+Math.abs(b.y-char.y)));
    for(const spot of spots.slice(0,8)){
      const path=this.find(lot,{x:char.x,y:char.y},spot,char,others);
      if(path) return {path,spot};
    }
    return null;
  }
}
