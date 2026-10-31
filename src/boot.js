/* ============================================================
   BOOT — wires the systems together and starts the game loop
   ============================================================ */

(function bootPixelsCaos(){
  const canvas = document.getElementById('gameCanvas');
  if(!canvas) return;

  const game = new Game();
  const renderer = new Renderer(canvas);
  game.canvas = canvas;
  game.renderer = renderer;

  // Give the renderer a calm preview lot behind the start screen.
  game.lots.home = createHomeLot(false);
  game.currentLotId = 'home';
  game.homeLotId = 'home';
  game.lots.home.playerOwned = true;

  const ui = new UI(game, renderer);
  const input = new Input(canvas, renderer, game);
  game.ui = ui;
  game.input = input;

  // Discoverable subsystem facades (used by debug tools / future UI).
  game.buildMode = new BuildMode(game);
  game.buyMode = new BuyMode(game);
  game.neighborhood = new Neighborhood(game);
  game.events = new EventSystem(game);

  // Expose a small, stable debug surface for testing and tinkering.
  window.game = game;
  window.PixelsCaos = {
    game, renderer, ui, input,
    save: (slot=game.activeSlot)=>game.saveGame(slot),
    debug: {
      money: n=>{ game.money=n; game.refresh(); },
      needs: v=>game.debugSetNeeds(v),
      summary: ()=>game.householdSummary(),
      time: (minutes)=>{ game.time.minutes=clamp(minutes,0,1439); game.refresh(); },
      day: (d)=>{ game.time.day=Math.max(1,d); game.time.dayOfWeek=TimeSystem.weekdayFor(game.time.day); game.time.holiday=HOLIDAYS[game.time.day]||null; game.refresh(); },
      trigger: ()=>game.randomEvent(),
      mode: m=>game.setMode(m),
    }
  };

  // Audio can only start after a user gesture.
  const unlockAudio = () => {
    game.audio.resume();
    if(game.started && game.time.paused===false) game.audio.startMusic();
    document.removeEventListener('pointerdown', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  };
  document.addEventListener('pointerdown', unlockAudio, {passive:true});
  document.addEventListener('keydown', unlockAudio);

  // Keep the canvas crisp when the viewport changes.
  if(window.ResizeObserver){
    new ResizeObserver(()=>renderer.resize()).observe(canvas);
  }

  let last = performance.now();
  function frame(now){
    const dt = Math.min(0.05, Math.max(0, (now-last)/1000));
    last = now;
    game.update(dt);
    if(!game.started) renderer.update(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Pause on page hide is handled by Game; this covers bfcache restores.
  window.addEventListener('pageshow',()=>{ last=performance.now(); });
})();
