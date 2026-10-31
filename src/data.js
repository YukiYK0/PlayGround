/* ============================================================
   PIXELS & CAOS — CONTENT / DATA
   Every object, action, career, trait and event lives here.
   Add data, not code, to expand the game.
   ============================================================ */

const GAME_TITLE = 'Pixels & Caos';
const SAVE_VERSION = 3;
const TILE = 32;

const NEEDS = [
  { id:'fome',     label:'Fome',       icon:'🍗', color:'#ff9c65', decay:0.072 },
  { id:'energia',  label:'Energia',    icon:'⚡', color:'#ffd166', decay:0.047 },
  { id:'higiene',  label:'Higiene',    icon:'🧼', color:'#7ed6e8', decay:0.034 },
  { id:'banheiro', label:'Banheiro',   icon:'🚽', color:'#b7a4ef', decay:0.085 },
  { id:'diversao', label:'Diversão',   icon:'🎮', color:'#ff87b7', decay:0.039 },
  { id:'social',   label:'Social',     icon:'💬', color:'#9be27a', decay:0.028 },
  { id:'conforto', label:'Conforto',   icon:'🛋', color:'#ffbd7a', decay:0.024 },
  { id:'ambiente', label:'Ambiente',   icon:'🌿', color:'#6fd9ba', decay:0.018 },
];

const EMOTIONS = {
  feliz:       { label:'Feliz',       icon:'😄', color:'#ffe36e' },
  triste:      { label:'Triste',      icon:'😢', color:'#75a9e8' },
  irritado:    { label:'Irritado',    icon:'😠', color:'#ff7768' },
  inspirado:   { label:'Inspirado',   icon:'💡', color:'#ffd166' },
  envergonhado:{ label:'Envergonhado',icon:'😳', color:'#ff9ab0' },
  entediado:   { label:'Entediado',   icon:'🥱', color:'#b8a8ce' },
  apaixonado:  { label:'Apaixonado',  icon:'💖', color:'#ff8cbf' },
  concentrado: { label:'Concentrado', icon:'🎯', color:'#78dfc0' },
  neutro:      { label:'Tranquilo',   icon:'🙂', color:'#cbbdd9' },
};
const EMOTION_MULT = {
  inspirado:{creative:1.6, music:1.35, writing:1.35},
  concentrado:{logic:1.4, programming:1.45, mechanic:1.3, gardening:1.25},
  feliz:{social:1.25, comedy:1.25},
  apaixonado:{social:1.3, romance:1.4},
  triste:{work:0.7, social:0.8},
  irritado:{work:0.75, social:0.65},
  envergonhado:{social:0.55},
  entediado:{work:0.85},
  neutro:{},
};

const SKILLS = [
  { id:'culinaria',     name:'Culinária',     icon:'🍳', color:'#ffad66' },
  { id:'logica',        name:'Lógica',        icon:'🧩', color:'#79b9ec' },
  { id:'carisma',       name:'Carisma',       icon:'💬', color:'#ff93c4' },
  { id:'condicionamento',name:'Condicionamento',icon:'💪',color:'#f1746c' },
  { id:'criatividade',  name:'Criatividade',  icon:'🎨', color:'#f6d15e' },
  { id:'musica',        name:'Música',        icon:'🎵', color:'#c594ec' },
  { id:'escrita',       name:'Escrita',       icon:'✒️', color:'#b8e0a1' },
  { id:'jardinagem',    name:'Jardinagem',    icon:'🌱', color:'#76cf7f' },
  { id:'programacao',   name:'Programação',   icon:'💻', color:'#75d5ca' },
  { id:'mecanica',      name:'Mecânica',      icon:'🔧', color:'#d3a46b' },
  { id:'pesca',         name:'Pesca',         icon:'🎣', color:'#70b8df' },
  { id:'comedia',       name:'Comédia',       icon:'🤡', color:'#f6a05c' },
];
const SKILL_MAP = Object.fromEntries(SKILLS.map(s => [s.id, s]));

const TRAITS = [
  { id:'preguicoso', name:'Preguiçoso', icon:'🦥', desc:'Ama o sofá. A energia acaba mais rápido.', effects:{energyDecay:1.25, chore:0.4} },
  { id:'sociavel', name:'Sociável', icon:'🎉', desc:'Ganha carisma mais rápido e adora gente.', effects:{socialDecay:0.65, socialSkill:1.3} },
  { id:'criativo', name:'Criativo', icon:'🎨', desc:'Ideias fervilham. Às vezes do nada.', effects:{creativeSkill:1.3, inspired:1.25} },
  { id:'organizado', name:'Organizado', icon:'🗂️', desc:'Tudo no lugar. Menos bagunça na vida.', effects:{chore:1.4, work:1.15, hygieneDecay:0.8} },
  { id:'glutao', name:'Glutão', icon:'🍰', desc:'A fome nunca dorme. Comida é amor.', effects:{hungerDecay:1.3, cookingSkill:1.2} },
  { id:'romantico', name:'Romântico', icon:'💘', desc:'Chuva, violão e olhares. Romantismo em dobro.', effects:{romance:1.4, socialDecay:0.8} },
  { id:'aventureiro', name:'Aventureiro', icon:'🧭', desc:'Quer ver o mundo, nem que seja o quintal.', effects:{funDecay:0.75, outdoor:1.3} },
  { id:'timido', name:'Tímido', icon:'🫣', desc:'Prefere Poucas pessoas e muito carinho.', effects:{socialSkill:0.7, socialDecay:0.8} },
  { id:'engracado', name:'Engraçado', icon:'😂', desc:'O primo do meme. Faz piada até do boleto.', effects:{comedySkill:1.4, social:1.15} },
  { id:'genio', name:'Gênio', icon:'🧠', desc:'Aprende rápido e reclama de Wi-Fi lento.', effects:{logicSkill:1.35, programmingSkill:1.2} },
  { id:'esportista', name:'Esportista', icon:'🏃', desc:'Endorfina é o combustível secreto.', effects:{fitnessSkill:1.4, energyDecay:0.9} },
  { id:'bagunceiro', name:'Bagunceiro', icon:'🌪️', desc:'Criatividade em forma de desordem.', effects:{chore:0.55, funDecay:0.8} },
  { id:'amante_animais', name:'Amante dos animais', icon:'🐾', desc:'Bichos entendem o que você sente.', effects:{pet:1.5, social:1.1} },
  { id:'ambicioso', name:'Ambicioso', icon:'📈', desc:'Trabalha duro e sonha com escritório próprio.', effects:{work:1.2, promotion:1.15} },
  { id:'caseiro', name:'Caseiro', icon:'🏡', desc:'Nada melhor que o próprio sofá.', effects:{comfort:1.2, socialDecay:0.85} },
  { id:'malhumorado', name:'Mal-humorado', icon:'😾', desc:'Acordou de mau humor. De novo.', effects:{mood:-0.5, socialSkill:0.9} },
  { id:'vaidoso', name:'Vaidoso', icon:'🪞', desc:'Um espelho é um convite à parada.', effects:{hygieneDecay:1.2, inspired:1.15} },
  { id:'alma_livre', name:'Alma livre', icon:'🌈', desc:'Não caber em caixinha é seu esporte.', effects:{funDecay:0.7, romance:1.15} },
  { id:'festeiro', name:'Festeiro', icon:'🪩', desc:'Se tem música, o corpo já foi.', effects:{funDecay:0.65, social:1.2} },
  { id:'cafeinado', name:'Cafeinado', icon:'☕', desc:'Sangue com 30% de café e 70% de planos.', effects:{energyDecay:0.8, logicSkill:1.1} },
];
const TRAIT_MAP = Object.fromEntries(TRAITS.map(t => [t.id,t]));

const ASPIRATIONS = [
  { id:'fortuna', name:'Fortuna', icon:'💰', desc:'Acumular Pixels, investir e viver no capricho.',
    milestones:[
      {id:'f1', label:'Junte P$ 3.000', stat:'money', target:3000, reward:{money:250}},
      {id:'f2', label:'Bata meta de P$ 8.000', stat:'money', target:8000, reward:{money:500}},
      {id:'f3', label:'Tenha P$ 15.000', stat:'money', target:15000, reward:{money:1000}},
    ]},
  { id:'familia', name:'Família', icon:'🏡', desc:'Construir um lar cheio de histórias e risadas.',
    milestones:[
      {id:'m1', label:'Faça 2 boas amizades', stat:'friends', target:2, reward:{mood:15}},
      {id:'m2', label:'Tenha uma criança na casa', stat:'children', target:1, reward:{money:300}},
      {id:'m3', label:'Celebre 3 ocasiões em família', stat:'familyEvents', target:3, reward:{mood:25}},
    ]},
  { id:'conhecimento', name:'Conhecimento', icon:'📚', desc:'Descobrir, entender e dominar o mundo.',
    milestones:[
      {id:'c1', label:'Chegue ao nível 4 em Lógica', stat:'logic4', target:1, reward:{money:200}},
      {id:'c2', label:'Leia 3 livros', stat:'booksRead', target:3, reward:{mood:20}},
      {id:'c3', label:'Domine 2 habilidades nível 6', stat:'skills6', target:2, reward:{money:600}},
    ]},
  { id:'popularidade', name:'Popularidade', icon:'🌟', desc:'Ser conhecido, convidado e lembrado.',
    milestones:[
      {id:'p1', label:'Conheça 5 pessoas', stat:'met', target:5, reward:{mood:15}},
      {id:'p2', label:'Tenha 3 amigos', stat:'friends', target:3, reward:{money:300}},
      {id:'p3', label:'Faça 10 ações sociais', stat:'socials', target:10, reward:{mood:25}},
    ]},
  { id:'criatividade', name:'Criatividade', icon:'🎨', desc:'Transformar sentimentos em arte para o mundo.',
    milestones:[
      {id:'a1', label:'Pinte 2 quadros', stat:'paintings', target:2, reward:{money:200}},
      {id:'a2', label:'Venda uma obra por P$ 250+', stat:'artSale', target:250, reward:{mood:25}},
      {id:'a3', label:'Chegue ao nível 6 em Criatividade', stat:'creative6', target:1, reward:{money:500}},
    ]},
  { id:'esporte', name:'Esporte', icon:'🏆', desc:'Suor, foco e a sensação de superação.',
    milestones:[
      {id:'s1', label:'Treine 5 vezes', stat:'workouts', target:5, reward:{money:150}},
      {id:'s2', label:'Chegue ao nível 5 em Condicionamento', stat:'fitness5', target:1, reward:{money:300}},
      {id:'s3', label:'Vença um campeonato amador', stat:'contest', target:1, reward:{money:800}},
    ]},
  { id:'amor', name:'Amor', icon:'💞', desc:'Encontrar alguém e construir algo juntos.',
    milestones:[
      {id:'l1', label:'Faça um date especial', stat:'dates', target:1, reward:{mood:20}},
      {id:'l2', label:'Fique noivo(a)', stat:'engaged', target:1, reward:{mood:25}},
      {id:'l3', label:'Case-se', stat:'married', target:1, reward:{money:500}},
    ]},
];
const ASPIRATION_MAP = Object.fromEntries(ASPIRATIONS.map(a => [a.id,a]));

const CAREERS = [
  { id:'tech', name:'Tecnologia', icon:'💻', skill:'programacao', hours:[9,17], days:[1,2,3,4,5],
    levels:[
      {title:'Estagiário de Código', pay:95, req:0}, {title:'Dev Júnior', pay:170, req:2},
      {title:'Engenheiro de Software', pay:280, req:4}, {title:'Arquiteto de Nuvem', pay:440, req:6},
      {title:'Diretor de Inovação', pay:720, req:8},
    ]},
  { id:'culinaria', name:'Culinária', icon:'🍳', skill:'culinaria', hours:[10,18], days:[2,3,4,5,6],
    levels:[
      {title:'Ajudante de Cozinha', pay:85, req:0}, {title:'Cozinheiro de Bairro', pay:155, req:2},
      {title:'Chef de Partida', pay:260, req:4}, {title:'Chef Executivo', pay:420, req:6},
      {title:'Chef Estrelado', pay:700, req:8},
    ]},
  { id:'medicina', name:'Medicina', icon:'🩺', skill:'logica', hours:[7,15], days:[1,2,3,4,5],
    levels:[
      {title:'Recepcionista da Clínica', pay:110, req:0}, {title:'Auxiliar de Enfermagem', pay:200, req:3},
      {title:'Médico Residente', pay:340, req:5}, {title:'Cirurgião(a)', pay:560, req:7},
      {title:'Chefe do Hospital', pay:900, req:9},
    ]},
  { id:'artes', name:'Artes', icon:'🎨', skill:'criatividade', hours:[11,18], days:[1,3,5,6],
    levels:[
      {title:'Artista de Rua', pay:70, req:0}, {title:'Designer de Capas', pay:150, req:2},
      {title:'Artista Galerístico', pay:260, req:4}, {title:'Curador Visionário', pay:410, req:6},
      {title:'Lenda Viva da Arte', pay:760, req:8},
    ]},
  { id:'esportes', name:'Esportes', icon:'🏅', skill:'condicionamento', hours:[8,14], days:[1,2,3,4,5,6],
    levels:[
      {title:'Monitor de Academia', pay:90, req:0}, {title:'Personal Trainer', pay:160, req:2},
      {title:'Atleta Profissional', pay:300, req:4}, {title:'Capitão do Time', pay:500, req:6},
      {title:'Ídolo do Estádio', pay:850, req:8},
    ]},
  { id:'musica', name:'Música', icon:'🎸', skill:'musica', hours:[16,23], days:[3,4,5,6,7],
    levels:[
      {title:'Roadie do Bar', pay:65, req:0}, {title:'Músico de Bar', pay:145, req:2},
      {title:'Abertura de Turnê', pay:270, req:4}, {title:'Headliner', pay:480, req:6},
      {title:'Superstar Pixel', pay:820, req:8},
    ]},
  { id:'negocios', name:'Negócios', icon:'💼', skill:'carisma', hours:[9,18], days:[1,2,3,4,5],
    levels:[
      {title:'Auxiliar Administrativo', pay:100, req:0}, {title:'Analista de Planilhas', pay:190, req:2},
      {title:'Gerente de Projetos', pay:330, req:4}, {title:'Diretor Comercial', pay:560, req:6},
      {title:'CEO da Pixel Corp', pay:950, req:9},
    ]},
  { id:'ciencia', name:'Ciência', icon:'🔬', skill:'logica', hours:[8,16], days:[1,2,4,5],
    levels:[
      {title:'Assistente de Laboratório', pay:115, req:0}, {title:'Pesquisador(a) Júnior', pay:210, req:3},
      {title:'Cientista de Campo', pay:360, req:5}, {title:'Inventor(a) Chefe', pay:590, req:7},
      {title:'Gênio do Instituto', pay:980, req:9},
    ]},
  { id:'detetive', name:'Detetive', icon:'🕵️', skill:'logica', hours:[13,21], days:[2,3,4,5,6],
    levels:[
      {title:'Cadete Curioso', pay:105, req:0}, {title:'Investigador(a) de Bairro', pay:185, req:2},
      {title:'Detetive de Casos', pay:310, req:4}, {title:'Agente Especial', pay:520, req:6},
      {title:'Lenda da Delegacia', pay:870, req:8},
    ]},
  { id:'educacao', name:'Educação', icon:'📖', skill:'carisma', hours:[7,13], days:[1,2,3,4,5],
    levels:[
      {title:'Monitor de Recreio', pay:80, req:0}, {title:'Professor(a) Auxiliar', pay:150, req:2},
      {title:'Professor(a) Titular', pay:250, req:4}, {title:'Coordenador(a) Pedagógico', pay:400, req:6},
      {title:'Diretor(a) da Escola', pay:690, req:8},
    ]},
];
const CAREER_MAP = Object.fromEntries(CAREERS.map(c => [c.id,c]));

const PART_TIME_JOBS = [
  {id:'pizza', name:'Entregador(a) de Pizza', icon:'🍕', pay:45, skill:'condicionamento', hours:[18,22], days:[5,6,7], levels:[{title:'Entregador(a)',pay:45,req:0}]},
  {id:'cafe', name:'Atendente de Café', icon:'☕', pay:38, skill:'carisma', hours:[14,19], days:[1,2,3,4], levels:[{title:'Barista Jr.',pay:38,req:0}]},
  {id:'loja', name:'Vendedor(a) de Loja', icon:'🛍️', pay:42, skill:'carisma', hours:[10,15], days:[2,4,6], levels:[{title:'Vendedor(a)',pay:42,req:0}]},
];

const CROPS = [
  {id:'tomate', name:'Tomate', icon:'🍅', value:20, grow:2.5},
  {id:'cenoura', name:'Cenoura', icon:'🥕', value:16, grow:2},
  {id:'morango', name:'Morango', icon:'🍓', value:24, grow:3},
  {id:'girassol', name:'Girassol', icon:'🌻', value:35, grow:4},
  {id:'abobora', name:'Abóbora', icon:'🎃', value:45, grow:5},
  {id:'rosa', name:'Rosa', icon:'🌹', value:30, grow:3.5},
];

const RECIPES = [
  {id:'torrada', name:'Torrada da Madrugada', icon:'🍞', level:0, cost:8, minutes:20, hunger:32, skillXp:8, desc:'Pão, manteiga e coragem.'},
  {id:'omelete', name:'Omelete Solar', icon:'🍳', level:1, cost:18, minutes:30, hunger:48, skillXp:14, desc:'Ovos que viram um pequeno sol.'},
  {id:'massa', name:'Macarrão do Caos', icon:'🍝', level:2, cost:28, minutes:45, hunger:64, skillXp:22, desc:'Massa al dente e molho dramático.'},
  {id:'sopa', name:'Sopa do Abraço', icon:'🍲', level:3, cost:35, minutes:50, hunger:70, skillXp:28, desc:'Esquenta o estômago e a alma.'},
  {id:'feijoada', name:'Feijoada de Boteco', icon:'🫘', level:4, cost:55, minutes:80, hunger:88, skillXp:38, desc:'Servida com farofa e fofoca.'},
  {id:'curry', name:'Curry do Além', icon:'🍛', level:5, cost:62, minutes:70, hunger:82, skillXp:44, desc:'Picância de outro plano.'},
  {id:'pizza', name:'Pizza Caseira', icon:'🍕', level:4, cost:58, minutes:75, hunger:90, skillXp:42, desc:'Massa no ar, queijo no chão.'},
  {id:'sushi', name:'Sushi de Dormir', icon:'🍣', level:6, cost:78, minutes:85, hunger:86, skillXp:55, desc:'Arroz, salmão e muita concentração.'},
  {id:'bolo', name:'Bolo Arco-Íris', icon:'🎂', level:6, cost:80, minutes:90, hunger:60, skillXp:60, desc:'Festa em forma de fatia.'},
  {id:'risoto', name:'Risoto Estelar', icon:'🍚', level:8, cost:110, minutes:100, hunger:100, skillXp:80, desc:'Cinco estrelas no prato.'},
];

const SOCIAL_ACTIONS = [
  {id:'conversar', name:'Conversar', icon:'💬', cat:'amigavel', minutes:20, friend:8, romance:0, chance:0.95, skill:'carisma', minRel:-100},
  {id:'elogiar', name:'Elogiar', icon:'✨', cat:'amigavel', minutes:10, friend:10, romance:2, chance:0.82, skill:'carisma'},
  {id:'contar_pirada', name:'Contar piada', icon:'😂', cat:'engracado', minutes:15, friend:9, romance:1, chance:0.7, skill:'comedia'},
  {id:'abraco', name:'Abraçar', icon:'🤗', cat:'amigavel', minutes:5, friend:12, romance:3, chance:0.9, minRel:12},
  {id:'desabafar', name:'Desabafar', icon:'🫂', cat:'profundo', minutes:35, friend:16, romance:2, chance:0.72, minRel:25},
  {id:'segredo', name:'Contar segredo', icon:'🤫', cat:'profundo', minutes:30, friend:18, romance:0, chance:0.65, minRel:40},
  {id:'paquerar', name:'Paquerar', icon:'😉', cat:'romantico', minutes:15, friend:3, romance:8, chance:0.62, minRel:8, ageAdult:true},
  {id:'flertar', name:'Flertar descaradamente', icon:'💘', cat:'romantico', minutes:20, friend:2, romance:13, chance:0.55, minRel:20, ageAdult:true},
  {id:'beijar', name:'Beijar', icon:'💋', cat:'romantico', minutes:10, friend:4, romance:18, chance:0.65, minRel:40, romanceRel:20, ageAdult:true},
  {id:'dancar_juntos', name:'Dançar juntos', icon:'🕺', cat:'engracado', minutes:30, friend:12, romance:7, chance:0.75, minRel:15},
  {id:'propor', name:'Pedir em namoro', icon:'💍', cat:'romantico', minutes:20, friend:6, romance:15, chance:0.65, minRel:35, romanceRel:45, ageAdult:true, special:'propose'},
  {id:'noivar', name:'Pedir em noivado', icon:'💎', cat:'romantico', minutes:25, friend:5, romance:12, chance:0.6, minRel:50, romanceRel:70, ageAdult:true, special:'engage'},
  {id:'casar', name:'Organizar casamento', icon:'👰', cat:'romantico', minutes:30, friend:8, romance:10, chance:0.8, minRel:60, romanceRel:80, ageAdult:true, special:'marry'},
  {id:'morar_junto', name:'Convidar para morar junto', icon:'🏠', cat:'romantico', minutes:30, friend:10, romance:5, chance:0.65, minRel:45, romanceRel:55, ageAdult:true, special:'move_in'},
  {id:'provocar', name:'Provocar', icon:'😈', cat:'malvado', minutes:10, friend:-8, romance:-2, chance:0.85, minRel:0},
  {id:'insultar', name:'Insultar', icon:'🤬', cat:'malvado', minutes:8, friend:-17, romance:-8, chance:0.9, minRel:0},
  {id:'romper', name:'Terminar relacionamento', icon:'💔', cat:'malvado', minutes:15, friend:-15, romance:-60, chance:1, romanceRel:25, ageAdult:true, special:'breakup'},
];
const SOCIAL_CATS = {
  amigavel:{name:'Amigável', icon:'💚'}, engracado:{name:'Engraçado', icon:'😂'},
  romantico:{name:'Romântico', icon:'💗'}, malvado:{name:'Malvado', icon:'😈'}, profundo:{name:'Profundo', icon:'🌊'},
};

const WEATHERS = {
  sun:{name:'Ensolarado', icon:'☀️', mood:1.2, outdoor:true},
  cloud:{name:'Nublado', icon:'⛅', mood:0.7, outdoor:true},
  rain:{name:'Chuva', icon:'🌧️', mood:-0.8, outdoor:false},
  heat:{name:'Calorão', icon:'🥵', mood:-0.6, outdoor:true},
  cold:{name:'Frio', icon:'🥶', mood:-0.4, outdoor:false},
  storm:{name:'Tempestade', icon:'⛈️', mood:-1.2, outdoor:false},
};
const SEASONS = ['Verão','Outono','Inverno','Primavera'];
const WEEKDAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const HOLIDAYS = {
  7:{name:'Carnaval', icon:'🎭'}, 14:{name:'Festa Junina', icon:'🌽'},
  21:{name:'Dia do Pixel', icon:'🟪'}, 28:{name:'Natal', icon:'🎄'},
};

const PETS = [
  {id:'dog', name:'Cachorro', icon:'🐶', species:'dog'},
  {id:'cat', name:'Gato', icon:'🐱', species:'cat'},
];
const PET_NAMES = ['Biscoito','Pipoca','Farofa','Mingau','Tofu','Jujuba','Pudim','Amora','Cebolinha','Paçoca','Nuggets','Serelepe'];

/* ---------- BUY CATALOG (80+ objects) ---------- */
const CATEGORY_DATA = [
  {id:'cozinha', name:'Cozinha', icon:'🍳'}, {id:'banheiro', name:'Banheiro', icon:'🛁'},
  {id:'quarto', name:'Quarto', icon:'🛏️'}, {id:'sala', name:'Sala', icon:'🛋️'},
  {id:'decoracao', name:'Decoração', icon:'🖼️'}, {id:'iluminacao', name:'Iluminação', icon:'💡'},
  {id:'eletronicos', name:'Eletrônicos', icon:'📺'}, {id:'hobbies', name:'Hobbies', icon:'🎨'},
  {id:'exterior', name:'Exterior', icon:'🌳'}, {id:'criancas', name:'Crianças', icon:'🧸'},
  {id:'pets', name:'Pets', icon:'🐾'},
];
const CAT_MAP = Object.fromEntries(CATEGORY_DATA.map(c => [c.id,c]));

function O(id,name,cat,price,w,h,kind,actions,opt={}){
  return Object.assign({id,name,cat,price,w,h,kind,actions:actions||[],ambience:0,comfort:0,upgradable:false,color:'#b58c68',icon:'📦'},opt);
}
const CATALOG = [
  // Cozinha
  O('geladeira','Geladeira Prisma','cozinha',520,1,1,'fridge',['quick_snack','clean','repair'],{icon:'🧊',ambience:2,comfort:3,upgradable:true,color:'#d9e8e2'}),
  O('fogao','Fogão Faísca','cozinha',460,1,1,'stove',['cook','clean','repair'],{icon:'🔥',ambience:1,upgradable:true,color:'#d9dbd4'}),
  O('pia_cozinha','Pia Inox','cozinha',240,1,1,'sink',['wash_hands','wash_dishes','clean','repair'],{icon:'🚰',ambience:1,color:'#c3d0cf'}),
  O('bancada','Bancada Limão','cozinha',210,1,1,'counter',['cook','clean','repair'],{icon:'🍋',ambience:2,color:'#e6b95d'}),
  O('mesa_jantar','Mesa de Jantar','cozinha',280,2,1,'table',['eat_meal','sit','clean'],{icon:'🍽️',comfort:7,ambience:3,color:'#a66d4b'}),
  O('cadeira','Cadeira Conforto','cozinha',80,1,1,'chair',['sit'],{icon:'🪑',comfort:4,color:'#7d9a78'}),
  O('microondas','Micro-ondas Turbo','cozinha',190,1,1,'microwave',['quick_snack','clean','repair'],{icon:'🍲',ambience:1,upgradable:true,color:'#b9c6cc'}),
  O('cafeteira','Cafeteira da Alma','cozinha',150,1,1,'coffee',['coffee','clean','repair'],{icon:'☕',ambience:3,color:'#5d4337'}),
  O('lixeira','Lixeira Esperta','cozinha',60,1,1,'trash',['trash','clean'],{icon:'🗑️',ambience:-1,color:'#6c8b7b'}),
  O('fruteira','Fruteira Tropical','cozinha',55,1,1,'decor',['clean'],{icon:'🍊',ambience:4,comfort:1,color:'#dd9a45'}),
  O('maquina_cafe','Máquina de Cappuccino','cozinha',380,1,1,'coffee',['coffee','clean','repair'],{icon:'🥛',ambience:3,comfort:2,color:'#8a6d58'}),
  // Banheiro
  O('vaso_sanitario','Vaso Nuvem','banheiro',180,1,1,'toilet',['toilet','clean','repair'],{icon:'🚽',ambience:-1,color:'#eef0eb'}),
  O('chuveiro','Chuveiro Cascata','banheiro',310,1,1,'shower',['shower','clean','repair'],{icon:'🚿',ambience:2,upgradable:true,color:'#a9d9df'}),
  O('pia_banheiro','Pia Espelho','banheiro',230,1,1,'sink',['wash_hands','clean','repair'],{icon:'🪞',ambience:2,color:'#d9e3df'}),
  O('banheira','Banheira Bolha','banheiro',650,2,1,'bathtub',['bath','clean','repair'],{icon:'🛁',ambience:5,comfort:8,upgradable:true,color:'#e8f0ec'}),
  O('toalheiro','Toalheiro Fofinho','banheiro',75,1,1,'decor',['clean'],{icon:'🧻',ambience:1,color:'#e9b6c2'}),
  O('tapete_banho','Tapete Nuvem','banheiro',45,1,1,'rug',[],{icon:'🧶',ambience:1,comfort:1,walkable:true,color:'#b6d4d1'}),
  O('lavadora','Lavadora Bolha','banheiro',480,1,1,'washer',['laundry','clean','repair'],{icon:'🧺',ambience:0,upgradable:true,color:'#d7e3e4'}),
  // Quarto
  O('cama','Cama Sol','quarto',620,2,2,'bed',['sleep','nap','relax','clean'],{icon:'🛏️',comfort:12,ambience:4,upgradable:true,color:'#8cb9a7'}),
  O('cama_beliche','Cama Beliche','quarto',780,2,2,'bunkbed',['sleep','nap','clean'],{icon:'🛌',comfort:9,ambience:2,color:'#b37b63'}),
  O('criado','Criado-mudo','quarto',120,1,1,'nightstand',['clean'],{icon:'🕯️',comfort:2,ambience:2,color:'#a97354'}),
  O('guarda_roupa','Guarda-roupa Cósmico','quarto',380,2,1,'wardrobe',['clean','repair'],{icon:'🚪',ambience:3,color:'#7e6b9c'}),
  O('comoda','Cômoda Retrô','quarto',210,1,1,'dresser',['clean'],{icon:'🗄️',ambience:2,color:'#bf8b66'}),
  O('abajur','Abajur Estrela','quarto',95,1,1,'lamp',['toggle_light','clean'],{icon:'🛋️',ambience:3,light:true,color:'#f2c674'}),
  O('espelho','Espelho Vaidoso','quarto',160,1,1,'mirror',['clean'],{icon:'🪞',ambience:3,color:'#b9d9da'}),
  O('cama_infantil','Cama Foguete','quarto',450,2,1,'kidbed',['sleep','nap','clean'],{icon:'🚀',comfort:8,ambience:3,color:'#7a9bcd'}),
  O('berco','Berço Nuvem','quarto',300,2,1,'crib',['sleep','clean'],{icon:'👶',comfort:8,ambience:3,color:'#e8d8bb'}),
  // Sala
  O('sofa','Sofá Nuvem','sala',520,2,1,'sofa',['relax','nap','sit','clean'],{icon:'🛋️',comfort:9,ambience:4,upgradable:true,color:'#92b7a1'}),
  O('poltrona','Poltrona Abraço','sala',270,1,1,'sofa',['relax','sit','clean'],{icon:'🪑',comfort:6,ambience:2,color:'#d38d74'}),
  O('mesa_centro','Mesa de Centro','sala',150,2,1,'coffeetable',['clean'],{icon:'🫖',comfort:2,ambience:3,color:'#a1714d'}),
  O('tv','TV Janela','sala',480,2,1,'tv',['watch_tv','repair','clean'],{icon:'📺',comfort:3,ambience:3,upgradable:true,color:'#37424c'}),
  O('tv_grande','Telona Cine','sala',980,2,1,'tv',['watch_tv','repair','clean'],{icon:'🎬',comfort:6,ambience:7,upgradable:true,color:'#242d36'}),
  O('estante','Estante da Sabedoria','sala',430,2,1,'bookshelf',['read','clean','repair'],{icon:'📚',ambience:5,comfort:2,color:'#9b6d4d'}),
  O('tapete','Tapete Boas Vibes','sala',90,2,1,'rug',[],{icon:'🟫',ambience:2,comfort:2,walkable:true,color:'#ad8c6f'}),
  O('lareira','Lareira Aconchego','sala',720,2,1,'fireplace',['relax','clean','repair'],{icon:'🔥',comfort:10,ambience:7,color:'#8b6b5c'}),
  O('estante_baixa','Rack Madeira Viva','sala',190,2,1,'shelf',['clean'],{icon:'🪵',ambience:2,color:'#a97e5f'}),
  O('planta_sala','Costela-de-Adão','decoracao',110,1,1,'plant',['clean'],{icon:'🪴',ambience:5,comfort:1,color:'#5da86d'}),
  // Decoração
  O('quadro','Quadro Abstrato','decoracao',130,1,1,'painting_decor',['clean'],{icon:'🖼️',ambience:5,color:'#d7a759'}),
  O('planta','Samambaia Feliz','decoracao',75,1,1,'plant',['clean'],{icon:'🪴',ambience:4,color:'#62a871'}),
  O('vaso','Vaso de Cerâmica','decoracao',60,1,1,'decor',['clean'],{icon:'🏺',ambience:3,color:'#d48e5c'}),
  O('relogio','Relógio de Parede','decoracao',85,1,1,'decor',['clean'],{icon:'🕰️',ambience:2,color:'#a46d4a'}),
  O('escultura','Escultura Dobrada','decoracao',240,1,1,'sculpture',['clean'],{icon:'🗿',ambience:6,color:'#b5a79a'}),
  O('poster','Pôster Vocé Sabia?','decoracao',55,1,1,'painting_decor',['clean'],{icon:'📰',ambience:3,color:'#e7b54e'}),
  O('velas','Velas Perfumadas','decoracao',40,1,1,'candles',['toggle_light','clean'],{icon:'🕯️',ambience:4,light:true,color:'#f1d08a'}),
  O('flor_vazo','Arranjo de Flores','decoracao',65,1,1,'decor',['clean'],{icon:'💐',ambience:4,color:'#e88aa2'}),
  // Iluminação
  O('luminaria_pe','Luminária de Pé','iluminacao',140,1,1,'lamp',['toggle_light','clean','repair'],{icon:'💡',ambience:3,light:true,color:'#f0cd7c'}),
  O('lustre','Lustre Pixel','iluminacao',300,1,1,'chandelier',['toggle_light','clean','repair'],{icon:'💡',ambience:6,light:true,color:'#f4d88e'}),
  O('pisca','Pisca-pisca Festivo','iluminacao',70,1,1,'stringlights',['toggle_light','clean'],{icon:'✨',ambience:5,light:true,color:'#ffd166'}),
  O('lampada','Luminária de Mesa','iluminacao',85,1,1,'lamp',['toggle_light','clean'],{icon:'🛋️',ambience:2,light:true,color:'#e8bc73'}),
  // Eletrônicos
  O('computador','Computador Borbulha','eletronicos',690,1,1,'computer',['program','freelance','browse','job_search','social_media','clean','repair'],{icon:'🖥️',ambience:3,comfort:2,upgradable:true,color:'#5d6d78'}),
  O('notebook','Notebook Viajante','eletronicos',520,1,1,'computer',['program','freelance','browse','write_book','job_search','social_media','clean','repair'],{icon:'💻',ambience:2,color:'#76838b'}),
  O('videogame','Videogame Bit-Bit','eletronicos',420,1,1,'gameconsole',['play_game','clean','repair'],{icon:'🎮',ambience:3,comfort:2,upgradable:true,color:'#4e5b73'}),
  O('som','Caixa de Som Trovão','eletronicos',340,1,1,'stereo',['dance','clean','repair'],{icon:'🔊',ambience:5,upgradable:true,color:'#454351'}),
  O('telefone','Telefone Retro','eletronicos',90,1,1,'telephone',['call_friend','clean','repair'],{icon:'☎️',ambience:1,color:'#d46d62'}),
  O('camera','Câmera Analógica','eletronicos',260,1,1,'camera',['take_photo','clean'],{icon:'📷',ambience:2,color:'#4c4a4d'}),
  // Hobbies
  O('cavalete','Cavalete Sonhador','hobbies',280,1,1,'easel',['paint','clean'],{icon:'🎨',ambience:3,color:'#b48758'}),
  O('violao','Violão Lunar','hobbies',350,1,1,'guitar',['play_guitar','clean','repair'],{icon:'🎸',ambience:4,color:'#b5794d'}),
  O('piano','Piano de Bolso','hobbies',1200,2,1,'piano',['play_piano','clean','repair'],{icon:'🎹',ambience:7,color:'#3b3037'}),
  O('bancada_trabalho','Bancada Faça-Você','hobbies',390,2,1,'workbench',['tinker','clean','repair'],{icon:'🔧',ambience:2,color:'#8b7158'}),
  O('barra','Barra de Exercícios','hobbies',320,1,1,'gym',['workout','clean'],{icon:'🏋️',ambience:1,color:'#68757d'}),
  O('esteira','Esteira Voa-Baixo','hobbies',580,1,1,'treadmill',['workout','clean','repair'],{icon:'🏃',ambience:1,color:'#555d68'}),
  O('kit_pesca','Kit de Pesca','hobbies',130,1,1,'fishingkit',['fish','clean'],{icon:'🎣',ambience:2,color:'#5f8a7d'}),
  O('telescopio','Telescópio Curioso','hobbies',460,1,1,'telescope',['stargaze','clean','repair'],{icon:'🔭',ambience:5,color:'#4d596f'}),
  O('maquina_costura','Máquina de Costura','hobbies',380,1,1,'sewing',['sew','clean','repair'],{icon:'🧵',ambience:2,color:'#8e6780'}),
  O('prateleira_hobby','Prateleira de Achados','hobbies',180,2,1,'shelf',['clean'],{icon:'🧩',ambience:4,color:'#9a745b'}),
  // Exterior
  O('canteiro','Canteiro de Sonhos','exterior',80,1,1,'garden',['plant','water','harvest','clean'],{icon:'🌱',ambience:3,color:'#6b4d36'}),
  O('arvore','Árvore Falante','exterior',220,1,1,'tree',['relax','clean'],{icon:'🌳',ambience:7,comfort:1,color:'#4b8d5f'}),
  O('banco_jardim','Banco do Pôr do Sol','exterior',160,1,1,'bench',['sit','relax'],{icon:'🪑',comfort:5,ambience:4,color:'#9b6c4a'}),
  O('churrasqueira','Churrasqueira Fumaça','exterior',420,1,1,'bbq',['bbq','clean','repair'],{icon:'🍖',ambience:4,color:'#5f6267'}),
  O('fogueira','Fogueira de Histórias','exterior',180,1,1,'firepit',['relax','clean'],{icon:'🔥',ambience:6,comfort:4,light:true,color:'#8f6144'}),
  O('piscina','Piscina Pixel','exterior',2500,3,2,'pool',['swim','clean'],{icon:'🏊',ambience:8,comfort:5,color:'#6ec6d9'}),
  O('cerca','Cerca Charmosa','exterior',35,1,1,'fence',[],{icon:'🪵',ambience:1,color:'#b58a62'}),
  O('caixa_correio','Caixa de Correio','exterior',80,1,1,'mailbox',['pay_bills'],{icon:'📬',ambience:1,color:'#70a3a1'}),
  O('lixeira_ext','Lixeira Externa','exterior',70,1,1,'trash',['trash','clean'],{icon:'🗑️',ambience:-2,color:'#547364'}),
  O('espreguicadeira','Espreguiçadeira Sol','exterior',210,1,1,'lounger',['relax','sunbathe'],{icon:'🏖️',comfort:8,ambience:3,color:'#e9b968'}),
  O('flor_exterior','Jardim de Margaridas','exterior',60,1,1,'flowerbed',['water','clean'],{icon:'🌼',ambience:5,color:'#72a965'}),
  O('fonte','Fonte dos Desejos','exterior',900,2,2,'fountain',['relax','clean'],{icon:'⛲',ambience:8,comfort:3,color:'#88a9b3'}),
  // Crianças
  O('brinquedo','Brinquedo Rabisco','criancas',75,1,1,'toy',['play','clean'],{icon:'🧸',ambience:3,comfort:2,color:'#cf8c72'}),
  O('blocos','Blocos do Futuro','criancas',90,1,1,'toy',['play','clean'],{icon:'🧱',ambience:3,comfort:1,color:'#e0b45e'}),
  O('balanco','Balanço Voa-Voa','criancas',280,1,1,'swing',['play','clean'],{icon:'🛝',ambience:4,comfort:2,color:'#d58b63'}),
  O('mesa_desenho','Ateliê Pequeno','criancas',220,1,1,'desk',['paint','write_book','clean'],{icon:'✏️',ambience:3,comfort:2,color:'#d4a75e'}),
  O('casinha','Casinha da Infância','criancas',520,2,2,'playhouse',['play','clean'],{icon:'🏠',ambience:6,comfort:3,color:'#d67e6e'}),
  O('tapete_play','Tapete da Imaginação','criancas',80,2,1,'rug',[],{icon:'🌈',ambience:3,walkable:true,color:'#b88ac3'}),
  // Pets
  O('cama_pet','Caminha Fofinha','pets',140,1,1,'petbed',['pet_play','clean'],{icon:'🛏️',ambience:2,color:'#b88496'}),
  O('comedouro','Comedouro Duplo','pets',85,1,1,'petbowl',['pet_feed','clean'],{icon:'🥣',ambience:1,color:'#8498a1'}),
  O('brinquedo_pet','Bolinha Serelepe','pets',55,1,1,'pettoy',['pet_play','clean'],{icon:'🎾',ambience:1,color:'#d2b561'}),
  O('arranhador','Arranhador Torre','pets',250,1,1,'scratchingpost',['pet_play','clean'],{icon:'🐈',ambience:2,color:'#b69879'}),
  O('casinha_pet','Casinha do Pet','pets',330,2,1,'pethouse',['pet_play','clean'],{icon:'🏠',ambience:3,comfort:2,color:'#a87c67'}),
];
const CATALOG_MAP = Object.fromEntries(CATALOG.map(o => [o.id,o]));

/* ---------- ACTIONS ---------- */
const ACTIONS = {
  sleep:{name:'Dormir',icon:'😴',minutes:480,needs:{energia:100,conforto:20},anim:'sleep',moodlet:{id:'sono_bom',label:'Dormiu como uma pedra',icon:'😴',emotion:'feliz',weight:2,minutes:300},skill:null},
  nap:{name:'Cochilar',icon:'💤',minutes:120,needs:{energia:45,conforto:8},anim:'sleep',moodlet:{id:'cochilo',label:'Cochilo revigorante',icon:'💤',emotion:'feliz',weight:1,minutes:120}},
  relax:{name:'Relaxar',icon:'🛋',minutes:50,needs:{energia:12,diversao:18,conforto:15},anim:'sit',moodlet:{id:'relax',label:'Relaxou um pouco',icon:'😌',emotion:'feliz',weight:1,minutes:90}},
  sit:{name:'Sentar',icon:'🪑',minutes:20,needs:{conforto:8},anim:'sit'},
  toilet:{name:'Usar o banheiro',icon:'🚽',minutes:8,needs:{banheiro:100},anim:'toilet',moodlet:{id:'alivio',label:'Alívio imenso',icon:'😮‍💨',emotion:'feliz',weight:1,minutes:60}},
  shower:{name:'Tomar banho',icon:'🚿',minutes:20,needs:{higiene:100,energia:4},anim:'shower',moodlet:{id:'limpo',label:'Cheiro de sabonete',icon:'🫧',emotion:'feliz',weight:1,minutes:120}},
  bath:{name:'Banho de espuma',icon:'🛁',minutes:40,needs:{higiene:100,diversao:20,conforto:20},anim:'shower',moodlet:{id:'banho_bom',label:'Banho de rainha/rei',icon:'🫧',emotion:'feliz',weight:2,minutes:180}},
  wash_hands:{name:'Lavar as mãos',icon:'🧼',minutes:4,needs:{higiene:10},anim:'wash'},
  wash_dishes:{name:'Lavar a louça',icon:'🍽',minutes:25,needs:{ambiente:15},anim:'wash',skill:{id:'mecanica',xp:3},moodlet:{id:'casa_limpa',label:'Pia brilhando',icon:'✨',emotion:'feliz',weight:1,minutes:90}},
  clean:{name:'Limpar',icon:'🧽',minutes:20,needs:{ambiente:15,energia:-4},anim:'clean',skill:{id:'mecanica',xp:2},special:'clean'},
  repair:{name:'Consertar',icon:'🔧',minutes:40,needs:{energia:-8,ambiente:10},anim:'repair',skill:{id:'mecanica',xp:18},special:'repair',requires:{skill:{mecanica:1}}},
  upgrade:{name:'Melhorar',icon:'⬆️',minutes:50,money:120,needs:{ambiente:10},anim:'repair',skill:{id:'mecanica',xp:25},special:'upgrade',requires:{skill:{mecanica:2}}},
  quick_snack:{name:'Beliscar algo',icon:'🍎',minutes:8,needs:{fome:28},anim:'eat',moodlet:{id:'lanche',label:'Lanche rapidinho',icon:'🍎',emotion:'feliz',weight:1,minutes:70}},
  eat_meal:{name:'Comer refeição',icon:'🍽',minutes:25,needs:{fome:78,diversao:5},anim:'eat',moodlet:{id:'refeicao',label:'Comeu uma refeição deliciosa',icon:'😋',emotion:'feliz',weight:2,minutes:180},requires:{meal:true}},
  cook:{name:'Cozinhar',icon:'🍳',minutes:35,needs:{fome:12,diversao:8},anim:'cook',special:'cook'},
  coffee:{name:'Tomar café',icon:'☕',minutes:8,needs:{energia:18,fome:6},anim:'eat',moodlet:{id:'cafe',label:'Cafeína nas veias',icon:'☕',emotion:'concentrado',weight:1,minutes:120}},
  laundry:{name:'Lavar roupa',icon:'🧺',minutes:35,needs:{ambiente:14,energia:-5},anim:'clean',skill:{id:'mecanica',xp:4},moodlet:{id:'roupa_limpa',label:'Roupa cheirosa',icon:'🧺',emotion:'feliz',weight:1,minutes:180}},
  trash:{name:'Levar o lixo',icon:'🗑',minutes:10,needs:{ambiente:12},anim:'carry',moodlet:{id:'lixo_fora',label:'Lixo lá fora',icon:'🌿',emotion:'feliz',weight:1,minutes:100}},
  watch_tv:{name:'Assistir TV',icon:'📺',minutes:60,needs:{diversao:38,conforto:8,energia:-2},anim:'sit',moodlet:{id:'tv',label:'Maratonou a série',icon:'📺',emotion:'entediado',weight:-1,minutes:60}},
  read:{name:'Ler um livro',icon:'📖',minutes:70,needs:{diversao:26,conforto:5},anim:'read',skill:{id:'logica',xp:12},moodlet:{id:'leitura',label:'Mergulhou na leitura',icon:'📚',emotion:'concentrado',weight:2,minutes:150}},
  paint:{name:'Pintar',icon:'🎨',minutes:100,needs:{diversao:28,energia:-6},anim:'paint',skill:{id:'criatividade',xp:24},special:'paint'},
  play_guitar:{name:'Tocar violão',icon:'🎸',minutes:60,needs:{diversao:35,energia:-3},anim:'guitar',skill:{id:'musica',xp:22},moodlet:{id:'musica',label:'Música boa no ar',icon:'🎶',emotion:'inspirado',weight:2,minutes:90}},
  play_piano:{name:'Tocar piano',icon:'🎹',minutes:60,needs:{diversao:40,energia:-4},anim:'piano',skill:{id:'musica',xp:28},moodlet:{id:'musica',label:'Música boa no ar',icon:'🎶',emotion:'inspirado',weight:2,minutes:90}},
  write_book:{name:'Escrever livro',icon:'✒️',minutes:150,needs:{diversao:20,energia:-10},anim:'write',skill:{id:'escrita',xp:35},special:'write'},
  program:{name:'Programar',icon:'💻',minutes:120,needs:{diversao:18,energia:-8},anim:'type',skill:{id:'programacao',xp:30},special:'program'},
  browse:{name:'Navegar na internet',icon:'🌐',minutes:45,needs:{diversao:24},anim:'type',moodlet:{id:'internet',label:'Caiu no buraco do coelho',icon:'🌀',emotion:'entediado',weight:1,minutes:70}},
  job_search:{name:'Procurar emprego',icon:'💼',minutes:25,needs:{diversao:-3},anim:'type',special:'job_search'},
  social_media:{name:'Postar nas redes',icon:'📱',minutes:30,needs:{diversao:18,social:8},anim:'type',skill:{id:'comedia',xp:5},special:'social_media'},
  play_game:{name:'Jogar videogame',icon:'🎮',minutes:65,needs:{diversao:45,energia:-4},anim:'play',moodlet:{id:'game',label:'Fase difícil, vitória doce',icon:'🎮',emotion:'feliz',weight:2,minutes:100}},
  workout:{name:'Treinar',icon:'💪',minutes:60,needs:{energia:-18,higiene:-16,conforto:-5,diversao:12},anim:'workout',skill:{id:'condicionamento',xp:30},moodlet:{id:'treino',label:'Endorfina a mil',icon:'💪',emotion:'feliz',weight:2,minutes:120}},
  dance:{name:'Dançar',icon:'🕺',minutes:40,needs:{diversao:38,energia:-8,higiene:-8,social:5},anim:'dance',skill:{id:'musica',xp:8},moodlet:{id:'danca',label:'Dançou até o chão',icon:'🪩',emotion:'feliz',weight:2,minutes:90}},
  fish:{name:'Pescar',icon:'🎣',minutes:120,needs:{diversao:24,energia:-10,higiene:-4},anim:'fish',skill:{id:'pesca',xp:28},special:'fish'},
  stargaze:{name:'Observar estrelas',icon:'🔭',minutes:55,needs:{diversao:30,conforto:-2},anim:'look',skill:{id:'logica',xp:8},moodlet:{id:'estrelas',label:'As estrelas estavam lindas',icon:'🌌',emotion:'inspirado',weight:2,minutes:150}},
  sew:{name:'Costurar',icon:'🧵',minutes:90,needs:{diversao:20,energia:-5},anim:'sew',skill:{id:'criatividade',xp:20},special:'sew'},
  tinker:{name:'Inventar engenhoca',icon:'🔧',minutes:100,needs:{diversao:18,energia:-8},anim:'repair',skill:{id:'mecanica',xp:26},special:'tinker'},
  bbq:{name:'Fazer churrasco',icon:'🍖',minutes:90,needs:{fome:65,diversao:20,social:8},anim:'cook',skill:{id:'culinaria',xp:22},money:25,moodlet:{id:'churras',label:'Churrasco no ponto',icon:'🍖',emotion:'feliz',weight:2,minutes:180}},
  swim:{name:'Nadar',icon:'🏊',minutes:60,needs:{energia:-11,higiene:20,diversao:35,conforto:5},anim:'swim',skill:{id:'condicionamento',xp:15},moodlet:{id:'piscina',label:'Refrescante demais',icon:'💦',emotion:'feliz',weight:2,minutes:100}},
  sunbathe:{name:'Pegar sol',icon:'🏖',minutes:50,needs:{diversao:15,conforto:10,energia:5},anim:'sit',moodlet:{id:'sol',label:'Sol na pele',icon:'☀️',emotion:'feliz',weight:1,minutes:100}},
  play:{name:'Brincar',icon:'🧸',minutes:50,needs:{diversao:42,energia:-5},anim:'play',skill:{id:'criatividade',xp:8},moodlet:{id:'brincou',label:'Brincou sem hora pra parar',icon:'🧸',emotion:'feliz',weight:2,minutes:80}},
  toggle_light:{name:'Acender/apagar',icon:'💡',minutes:1,needs:{ambiente:3},anim:'use',special:'light'},
  pay_bills:{name:'Pagar contas',icon:'🧾',minutes:3,needs:{},anim:'use',special:'bills'},
  call_friend:{name:'Ligar para alguém',icon:'📞',minutes:15,needs:{social:14},anim:'use',special:'call_friend'},
  take_photo:{name:'Tirar foto',icon:'📷',minutes:20,needs:{diversao:22},anim:'look',skill:{id:'criatividade',xp:10},special:'photo'},
  plant:{name:'Plantar',icon:'🌱',minutes:15,needs:{diversao:8},anim:'garden',skill:{id:'jardinagem',xp:10},special:'plant'},
  water:{name:'Regar',icon:'💧',minutes:5,needs:{diversao:3},anim:'garden',skill:{id:'jardinagem',xp:3},special:'water'},
  harvest:{name:'Colher',icon:'🧺',minutes:10,needs:{diversao:8},anim:'garden',skill:{id:'jardinagem',xp:8},special:'harvest'},
  pet_play:{name:'Brincar com pet',icon:'🐾',minutes:30,needs:{diversao:20,social:6},anim:'play',special:'pet_play'},
  pet_feed:{name:'Alimentar pet',icon:'🥣',minutes:8,needs:{social:3},anim:'use',special:'pet_feed'},
  pet_train:{name:'Treinar pet',icon:'🦴',minutes:40,needs:{diversao:6},anim:'play',special:'pet_train'},
  pet_groom:{name:'Escovar pet',icon:'🧽',minutes:20,needs:{higiene:5},anim:'clean',special:'pet_groom'},
  go_work:{name:'Ir trabalhar',icon:'💼',minutes:480,needs:{energia:-25,fome:-25},anim:'work',special:'work'},
  freelance:{name:'Projeto freelancer',icon:'🧑‍💻',minutes:90,needs:{energia:-8,diversao:5},anim:'type',skill:{id:'programacao',xp:20},special:'freelance',moodlet:{id:'freela',label:'Projeto entregue no prazo',icon:'💸',emotion:'feliz',weight:2,minutes:120}},
  extinguish:{name:'Apagar o fogo',icon:'🧯',minutes:8,needs:{energia:-6,ambiente:5},anim:'clean',special:'extinguish'},
};

/* ---------- NPC TOWNIES ---------- */
const TOWNIES = [
  {id:'t_clara', name:'Clara Pimenta', age:28, stage:'jovem', gender:'feminino', traits:['sociavel','engracado','festeiro'], aspiration:'popularidade', looks:{skin:'#8d5a3f',hair:'#2d1b2e',style:'cacheado',eye:'#3d2418',shirt:'#e26d6d'}, job:'Atendente do Café Lua', bio:'Conhece todo mundo pelo nome — e pelo pedido.'},
  {id:'t_tonho', name:'Tonho Maracujá', age:31, stage:'adulto', gender:'masculino', traits:['engracado','glutao','alma_livre'], aspiration:'criatividade', looks:{skin:'#b97e57',hair:'#3b251c',style:'curto',eye:'#2e2119',shirt:'#e0a44f'}, job:'Músico de rua', bio:'Carrega um violão e três piadas ruins.'},
  {id:'t_iris', name:'Íris Ventania', age:26, stage:'jovem', gender:'neutro', traits:['criativo','aventureiro','timido'], aspiration:'conhecimento', looks:{skin:'#e0ad88',hair:'#9b5b64',style:'chanel',eye:'#5eb59b',shirt:'#8e6bc4'}, job:'Fotógrafa freelancer', bio:'Sempre com uma câmera e uma teoria sobre nuvens.'},
  {id:'t_beto', name:'Beto Serrote', age:35, stage:'adulto', gender:'masculino', traits:['esportista','organizado','caseiro'], aspiration:'esporte', looks:{skin:'#6f4a34',hair:'#17161c',style:'moicano',eye:'#241a21',shirt:'#5d9b72'}, job:'Personal trainer', bio:'Acredita que todo problema se resolve com agachamento.'},
  {id:'t_lulu', name:'Lulu Farofa', age:42, stage:'adulto', gender:'feminino', traits:['amante_animais','sociavel','malhumorado'], aspiration:'familia', looks:{skin:'#caa077',hair:'#763b2e',style:'coque',eye:'#453020',shirt:'#cc7e9d'}, job:'Veterinária', bio:'Tem cinco gatos e opiniões fortes sobre ração.'},
  {id:'t_zeca', name:'Zeca Nuvem', age:22, stage:'jovem', gender:'masculino', traits:['preguicoso','genio','engracado'], aspiration:'fortuna', looks:{skin:'#d6a37f',hair:'#5b3d2c',style:'franja',eye:'#30211d',shirt:'#5f88c4'}, job:'Programador freelancer', bio:'Faz sites incríveis às 3 da manhã.'},
  {id:'t_neide', name:'Dona Neide', age:67, stage:'idoso', gender:'feminino', traits:['caseiro','organizado','romantico'], aspiration:'familia', looks:{skin:'#a76f4d',hair:'#cfd0cf',style:'coque',eye:'#39241d',shirt:'#c482a6'}, job:'Aposentada', bio:'Sabe tudo o que acontece na vizinhança antes de acontecer.'},
  {id:'t_caua', name:'Cauã Raio', age:19, stage:'adolescente', gender:'masculino', traits:['festeiro','esportista','aventureiro'], aspiration:'esporte', looks:{skin:'#7a4a32',hair:'#2f1d1a',style:'cacheado',eye:'#231714',shirt:'#d56a52'}, job:'Estudante', bio:'Vive em cima de um skate e abaixo de notas boas.'},
  {id:'t_maya', name:'Maya Jerimum', age:29, stage:'jovem', gender:'feminino', traits:['ambicioso','sociavel','vaidoso'], aspiration:'fortuna', looks:{skin:'#5f3c2d',hair:'#151417',style:'longo',eye:'#2b1b17',shirt:'#e7be4f'}, job:'Consultora de vendas', bio:'Já vendeu um espelho para uma parede.'},
  {id:'t_rui', name:'Rui Pipoca', age:33, stage:'adulto', gender:'masculino', traits:['romantico','timido','criativo'], aspiration:'amor', looks:{skin:'#e3b291',hair:'#8d5d3d',style:'curto',eye:'#3f67a1',shirt:'#a4715e'}, job:'Livreiros', bio:'Escreve cartas de amor que nunca envia.'},
  {id:'t_duda', name:'Duda Miúda', age:10, stage:'crianca', gender:'feminino', traits:['engracado','criativo','bagunceiro'], aspiration:'popularidade', looks:{skin:'#c58b65',hair:'#5a3324',style:'maria',eye:'#3a241c',shirt:'#75b9a6'}, job:'Estudante', bio:'Especialista em desenhos e em fugir da lição.'},
  {id:'t_bento', name:'Bento Bagunça', age:8, stage:'crianca', gender:'masculino', traits:['aventureiro','amante_animais','glutao'], aspiration:'esporte', looks:{skin:'#9c6447',hair:'#3a261e',style:'franja',eye:'#2b1d1b',shirt:'#df9753'}, job:'Estudante', bio:'Acredita que debaixo da cama mora um dragão legal.'},
];
const TOWNIE_MAP = Object.fromEntries(TOWNIES.map(t => [t.id,t]));

const CREATOR_NAMES = {
  feminino:['Lia','Bia','Nina','Sol','Iara','Malu','Jade','Cora','Tess','Vivi','Luna','Rita'],
  masculino:['Davi','Theo','Caio','Bento','Ravi','Nilo','Tom','Zeca','Ivo','Léo','Nico','Gael'],
  neutro:['Ariel','Vic','Noa','Sasha','Alex','Lu','Cris','Yuki','Dani','Kai','Mel','Sam'],
};
const CREATOR_SURNAMES = ['Moreira','Aurora','Pimenta','Nuvem','Solaris','do Vale','Maré','Prado','Mistério','Formiga','Luz','Poeira'];

const START_FURNITURE = [
  ['geladeira',4,8],['bancada',5,8],['fogao',6,8],['pia_cozinha',7,8],
  ['cama',4,3],['criado',6,3],['guarda_roupa',4,5],['cavaleiro',0,0],
  ['vaso_sanitario',12,3],['chuveiro',15,3],['pia_banheiro',12,5],['lavadora',15,5],
  ['mesa_jantar',5,10],['cadeira',6,9],['cadeira',7,10],
  ['sofa',12,9],['tv',12,8],['mesa_centro',12,10],['estante',16,9],
  ['violao',15,11],['planta',16,11],['abajur',11,9],
  ['canteiro',4,15],['canteiro',6,15],['canteiro',8,15],['canteiro',4,17],
  ['arvore',13,16],['churrasqueira',15,15],['caixa_correio',11,14],['lixeira_ext',17,14],
  ['tapete',13,10]
].filter(([id])=>CATALOG_MAP[id]);
