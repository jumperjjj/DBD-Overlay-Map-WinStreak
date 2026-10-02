(()=>{
  'use strict';
  const PALETTE=['#ff4f6d','#25c6da','#27b58a','#b85bd4','#ffc857'];
  let T=null;
  let editing=false;
  let lang='pt';
  let capture=null;

  const TX={
    pt:{tab:'1V1 TIMER',show:'Mostrar overlay',hide:'Ocultar overlay',move:'Editar posição',savePos:'Salvar posição',players:'Players',score:'Placar',preset:'Preset',hotkeys:'Hotkeys do 1v1 Timer',appearance:'Aparência',p1:'P1',p2:'P2',reset:'RESETAR PARTIDA',active:'Selecionado',startStop:'Start / Stop / Pontuar',swap:'Trocar player',opacity:'OPACIDADE DO FUNDO',scale:'ESCALA',accent:'Cor de destaque',accentHint:'Uma única cor controla o destaque do timer. O restante continua branco/cinza.',custom:'Personalizada',workflow:'Como funciona',workflowText:'Selecione um player e inicie. Pare o tempo, troque o player e repita. Quando os dois tempos estiverem salvos, o próximo comando compara os tempos exatos e adiciona 1 ponto automaticamente ao menor tempo.',ms:'Os milissegundos ficam ocultos no overlay, mas continuam sendo usados para desempatar.',start:'Iniciar timer',stop:'Parar timer',resolve:'Comparar + pontuar',needSwap:'Troque o player',ready:'Pronto para',timing:'Cronometrando',saved:'Tempo salvo. Troque para',both:'Os dois tempos estão salvos. Pressione o comando para comparar e pontuar.',winner:'Ponto para',tie:'Empate exato — nenhum ponto.',confirmReset:'Resetar placar e tempos do 1v1 Timer?',setKey:'Clique e pressione uma tecla…',keyFail:'Não foi possível registrar esse atalho. Ele pode estar sendo usado por outro programa ou função.',vertical:'VERTICAL',horizontal:'HORIZONTAL',glass:'GLASS',verticalDesc:'Compacto e empilhado',horizontalDesc:'Largo e direto',glassDesc:'HUD translúcida',time:'Tempo'},
    en:{tab:'1V1 TIMER',show:'Show overlay',hide:'Hide overlay',move:'Edit position',savePos:'Save position',players:'Players',score:'Score',preset:'Preset',hotkeys:'1v1 Timer Hotkeys',appearance:'Appearance',p1:'P1',p2:'P2',reset:'RESET MATCH',active:'Selected',startStop:'Start / Stop / Score',swap:'Swap player',opacity:'BACKGROUND OPACITY',scale:'SCALE',accent:'Accent color',accentHint:'One color controls the timer highlight. Everything else stays white/gray.',custom:'Custom',workflow:'How it works',workflowText:'Select a player and start. Stop the time, swap player and repeat. After both times are stored, the next command compares the exact times and automatically adds 1 point to the faster player.',ms:'Milliseconds stay hidden on the overlay, but are still used as the tiebreaker.',start:'Start timer',stop:'Stop timer',resolve:'Compare + score',needSwap:'Swap player',ready:'Ready for',timing:'Timing',saved:'Time saved. Swap to',both:'Both times are stored. Press the command to compare and score.',winner:'Point for',tie:'Exact tie — no point.',confirmReset:'Reset 1v1 Timer score and times?',setKey:'Click and press a key…',keyFail:'Could not register that hotkey. It may already be used by another program or feature.',vertical:'VERTICAL',horizontal:'HORIZONTAL',glass:'GLASS',verticalDesc:'Compact stacked layout',horizontalDesc:'Wide direct layout',glassDesc:'Translucent HUD',time:'Time'},
    es:{tab:'1V1 TIMER',show:'Mostrar overlay',hide:'Ocultar overlay',move:'Editar posición',savePos:'Guardar posición',players:'Jugadores',score:'Marcador',preset:'Preset',hotkeys:'Atajos del 1v1 Timer',appearance:'Apariencia',p1:'P1',p2:'P2',reset:'REINICIAR PARTIDA',active:'Seleccionado',startStop:'Start / Stop / Puntuar',swap:'Cambiar jugador',opacity:'OPACIDAD DEL FONDO',scale:'ESCALA',accent:'Color de destaque',accentHint:'Un solo color controla el destaque del timer. El resto permanece blanco/gris.',custom:'Personalizado',workflow:'Cómo funciona',workflowText:'Selecciona un jugador e inicia. Detén el tiempo, cambia de jugador y repite. Cuando ambos tiempos estén guardados, el siguiente comando compara los tiempos exactos y suma 1 punto automáticamente al menor tiempo.',ms:'Los milisegundos quedan ocultos en el overlay, pero se usan para desempatar.',start:'Iniciar timer',stop:'Parar timer',resolve:'Comparar + puntuar',needSwap:'Cambia el jugador',ready:'Listo para',timing:'Cronometrando',saved:'Tiempo guardado. Cambia a',both:'Los dos tiempos están guardados. Presiona el comando para comparar y puntuar.',winner:'Punto para',tie:'Empate exacto — sin punto.',confirmReset:'¿Reiniciar marcador y tiempos del 1v1 Timer?',setKey:'Haz clic y presiona una tecla…',keyFail:'No fue posible registrar ese atajo. Puede estar siendo usado por otro programa o función.',vertical:'VERTICAL',horizontal:'HORIZONTAL',glass:'GLASS',verticalDesc:'Compacto y apilado',horizontalDesc:'Largo y directo',glassDesc:'HUD translúcido',time:'Tiempo'}
  };
  const t=()=>TX[lang]||TX.pt;
  const $=id=>document.getElementById(id);
  const fmt=ms=>{const total=Math.floor(Math.max(0,Number(ms)||0)/1000),m=Math.floor(total/60),s=total%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
  const currentMs=(p)=>T?.running&&Number(T.runningPlayer)===p?Math.max(0,Date.now()-(Number(T.startedAt)||Date.now())):Math.max(0,Number(p===1?T?.time1:T?.time2)||0);
  const playerName=p=>p===1?(T?.player1||'PLAYER 1'):(T?.player2||'PLAYER 2');

  const style=document.createElement('style');
  style.textContent=`
  .timerPage{--tAccent:#f4ecec}.timerPage .timerHero{display:flex;align-items:center;gap:8px}.timerPage .timerHero .timerStatus{margin-left:auto;color:#aeb7c4;font-size:11px;text-align:right;max-width:430px}
  .timerPanel{background:#11151b;border:1px solid #2d333d;border-radius:13px;padding:14px;margin-bottom:10px;box-shadow:inset 0 1px rgba(255,255,255,.025)}
  .timerPanel h3{font-size:13px;margin:0 0 12px}.timerPlayerGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.timerPlayer{display:grid;grid-template-columns:42px 1fr 88px;gap:8px;align-items:center;padding:8px;border:1px solid #2d333d;border-radius:9px;background:#0e1116;cursor:pointer;position:relative;overflow:hidden}.timerPlayer.active{border-color:var(--tAccent);box-shadow:0 0 0 1px color-mix(in srgb,var(--tAccent) 55%,transparent) inset}.timerPlayer.active:before{content:'';position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:0 3px 3px 0;background:var(--tAccent)}
  .timerPill{display:flex;align-items:center;justify-content:center;height:30px;border-radius:6px;background:#33343a;color:#fff;font-size:11px;font-weight:800}.timerPlayer input{width:100%;font-weight:700}.timerPlayerTime{text-align:right;font:800 18px/1 Consolas,monospace;color:#8d9099}.timerPlayer.active .timerPlayerTime{color:var(--tAccent)}
  .timerScoreRow{display:flex;align-items:center;justify-content:center;gap:12px;padding:4px 0 8px}.timerScoreSide{display:flex;align-items:center;gap:7px}.timerScoreSide button{width:32px;min-width:32px;padding:0;font-size:17px}.timerScoreNum{width:42px;text-align:center;font-size:26px;font-weight:900}.timerDash{color:#777b84;font-weight:900}.timerResetRow{border-top:1px solid #252b34;padding-top:12px;margin-top:6px;display:flex;align-items:center;gap:10px}
  .timerPresetGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.timerPreset{min-height:160px;text-align:center;background:#0e1116;border:1px solid #2c323c;border-radius:9px;padding:12px 9px;cursor:pointer;color:#eef2f7}.timerPreset.active{border-color:var(--tAccent);box-shadow:0 0 0 1px color-mix(in srgb,var(--tAccent) 55%,transparent) inset}.timerPresetMini{height:76px;display:flex;align-items:center;justify-content:center}.timerPresetMini i{display:block;background:#55575f;border:1px solid #7a7d86;box-shadow:0 0 9px #0008}.timerPreset:nth-child(1) .timerPresetMini i{width:46px;height:64px;border-radius:6px}.timerPreset:nth-child(2) .timerPresetMini i{width:112px;height:28px;border-radius:8px}.timerPreset:nth-child(3) .timerPresetMini i{width:116px;height:32px;border-radius:16px;border-color:#d7d7dc}.timerPreset b{display:block;font-size:12px;margin-top:4px}.timerPreset small{display:block;color:#8f98a6;margin-top:5px;font-size:10px}
  .timerHotkeyGrid{display:grid;grid-template-columns:1fr 92px;gap:9px;align-items:center}.timerHotkeyGrid+.timerHotkeyGrid{margin-top:9px}.timerHotkeyLabel{border:1px solid #2c323c;background:#0e1116;border-radius:8px;padding:10px 12px;font-weight:600}.timerKeyBtn{font-weight:900;min-height:38px}
  .timerRangeRow{display:grid;grid-template-columns:150px 1fr 62px;align-items:center;gap:10px;margin:8px 0}.timerRangeRow label{font-size:10px;font-weight:800;color:#858d9a;letter-spacing:.4px}.timerRangeRow output{text-align:center;border:1px solid #2e343e;border-radius:7px;padding:5px;background:#0e1116;font-weight:800}.timerRangeRow input[type=range]{width:100%}
  .timerColors{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}.timerSwatch{width:28px!important;height:28px!important;min-height:28px!important;padding:0!important;border-radius:50%!important;border:2px solid transparent!important}.timerSwatch.active{outline:2px solid #fff;outline-offset:2px}.timerCustom{display:inline-flex;align-items:center;gap:7px;margin-left:4px}.timerCustom input[type=color]{width:42px;height:32px;padding:2px}.timerHint{color:#929ba8;font-size:11px;margin-top:8px}.timerWorkflow{line-height:1.55}.timerActionRow{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.timerPrimary{border-color:var(--tAccent)!important}.timerPrimary.on{background:color-mix(in srgb,var(--tAccent) 18%,#161b22)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--tAccent) 50%,transparent) inset}.timerActionBtn{min-width:150px}.timerMuted{color:#8f98a6}.timerGrid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  body[data-ui-theme="light"] .timerPanel{background:#fff;border-color:#d7dee8;box-shadow:none}body[data-ui-theme="light"] .timerPlayer,body[data-ui-theme="light"] .timerPreset,body[data-ui-theme="light"] .timerHotkeyLabel,body[data-ui-theme="light"] .timerRangeRow output{background:#f7f9fb;border-color:#d7dee8}body[data-ui-theme="light"] .timerPlayerTime{color:#737d8a}
  @media(max-width:900px){.timerPlayerGrid,.timerGrid2{grid-template-columns:1fr}.timerRangeRow{grid-template-columns:120px 1fr 58px}}
  `;
  document.head.appendChild(style);

  const nav=document.querySelector('.tabs');
  if(!nav)return;
  const tab=document.createElement('button');
  tab.dataset.tab='timer';tab.textContent='1V1 TIMER';
  nav.insertBefore(tab,nav.firstChild);

  const page=document.createElement('section');
  page.id='timer';page.className='page timerPage';
  page.innerHTML=`
    <div class="card timerHero"><button id="tm_enabledBtn" class="timerPrimary"></button><button id="tm_editBtn"></button><button id="tm_actionBtn" class="timerActionBtn timerPrimary"></button><button id="tm_swapBtn"></button><span id="tm_status" class="timerStatus"></span></div>
    <div class="timerGrid2">
      <div class="timerPanel"><h3 id="tm_playersTitle"></h3><div class="timerPlayerGrid">
        <div id="tm_p1Card" class="timerPlayer"><span class="timerPill">P1</span><input id="tm_player1" type="text" maxlength="36"><span id="tm_time1" class="timerPlayerTime">00:00</span></div>
        <div id="tm_p2Card" class="timerPlayer"><span class="timerPill">P2</span><input id="tm_player2" type="text" maxlength="36"><span id="tm_time2" class="timerPlayerTime">00:00</span></div>
      </div></div>
      <div class="timerPanel"><h3 id="tm_scoreTitle"></h3><div class="timerScoreRow">
        <div class="timerScoreSide"><button id="tm_s1m">−</button><span id="tm_score1" class="timerScoreNum">0</span><button id="tm_s1p">+</button></div><span class="timerDash">–</span>
        <div class="timerScoreSide"><button id="tm_s2m">−</button><span id="tm_score2" class="timerScoreNum">0</span><button id="tm_s2p">+</button></div>
      </div><div class="timerResetRow"><button id="tm_reset" class="danger"></button><span id="tm_msHint" class="small"></span></div></div>
    </div>
    <div class="timerPanel"><h3 id="tm_presetTitle"></h3><div class="timerPresetGrid">
      <button class="timerPreset" data-tm-style="0"><span class="timerPresetMini"><i></i></span><b id="tm_style0Name"></b><small id="tm_style0Desc"></small></button>
      <button class="timerPreset" data-tm-style="1"><span class="timerPresetMini"><i></i></span><b id="tm_style1Name"></b><small id="tm_style1Desc"></small></button>
      <button class="timerPreset" data-tm-style="2"><span class="timerPresetMini"><i></i></span><b id="tm_style2Name"></b><small id="tm_style2Desc"></small></button>
    </div></div>
    <div class="timerGrid2">
      <div class="timerPanel"><h3 id="tm_hotkeysTitle"></h3>
        <div class="timerHotkeyGrid"><div id="tm_actionLabel" class="timerHotkeyLabel"></div><button id="tm_actionKey" class="timerKeyBtn">F1</button></div>
        <div class="timerHotkeyGrid"><div id="tm_swapLabel" class="timerHotkeyLabel"></div><button id="tm_swapKey" class="timerKeyBtn">F2</button></div>
      </div>
      <div class="timerPanel"><h3 id="tm_appearanceTitle"></h3>
        <div class="timerRangeRow"><label id="tm_opacityLabel"></label><input id="tm_opacity" type="range" min="0" max="100" step="1"><output id="tm_opacityV"></output></div>
        <div class="timerRangeRow"><label id="tm_scaleLabel"></label><input id="tm_scale" type="range" min="50" max="200" step="1"><output id="tm_scaleV"></output></div>
        <div class="timerHint"><b id="tm_accentLabel"></b><div id="tm_accentHint"></div></div>
        <div id="tm_colors" class="timerColors"></div>
      </div>
    </div>
    <div class="timerPanel timerWorkflow"><h3 id="tm_workflowTitle"></h3><div id="tm_workflowText"></div><div id="tm_workflowMs" class="timerHint"></div></div>
  `;
  const firstPage=document.querySelector('.page');
  firstPage.parentNode.insertBefore(page,firstPage);

  function openTimerTab(){
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b===tab));
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p===page));
  }
  tab.addEventListener('click',openTimerTab);

  // Timer is the first thing shown in this test build.
  openTimerTab();
  const version=document.querySelector('.brandVersion');if(version)version.textContent='Beta 2.0.0';

  function translate(){
    const d=t();tab.textContent=d.tab;
    $('tm_playersTitle').textContent=d.players;$('tm_scoreTitle').textContent=d.score;$('tm_presetTitle').textContent=d.preset;$('tm_hotkeysTitle').textContent=d.hotkeys;$('tm_appearanceTitle').textContent=d.appearance;
    $('tm_reset').textContent=d.reset;$('tm_actionLabel').textContent=d.startStop;$('tm_swapLabel').textContent=d.swap;
    $('tm_opacityLabel').textContent=d.opacity;$('tm_scaleLabel').textContent=d.scale;$('tm_accentLabel').textContent=d.accent;$('tm_accentHint').textContent=d.accentHint;
    $('tm_style0Name').textContent=d.vertical;$('tm_style1Name').textContent=d.horizontal;$('tm_style2Name').textContent=d.glass;$('tm_style0Desc').textContent=d.verticalDesc;$('tm_style1Desc').textContent=d.horizontalDesc;$('tm_style2Desc').textContent=d.glassDesc;
    $('tm_workflowTitle').textContent=d.workflow;$('tm_workflowText').textContent=d.workflowText;$('tm_workflowMs').textContent=d.ms;$('tm_msHint').textContent=d.ms;$('tm_swapBtn').textContent=d.swap;
    buildColors();sync(T);
  }

  function buildColors(){
    if(!$('tm_colors'))return;
    $('tm_colors').innerHTML=PALETTE.map(c=>`<button class="timerSwatch" data-tm-color="${c}" style="background:${c}" title="${c}"></button>`).join('')+`<label class="timerCustom"><span>${t().custom}</span><input id="tm_customColor" type="color"></label>`;
    $('tm_colors').querySelectorAll('[data-tm-color]').forEach(b=>b.onclick=()=>api.timerPatch({accent:b.dataset.tmColor}));
    $('tm_customColor').addEventListener('input',e=>api.timerPatch({accent:e.target.value}));
  }

  function statusText(){
    if(!T)return'';const d=t();
    if(T.running)return `${d.timing} ${playerName(T.runningPlayer)}…`;
    if(T.done1&&T.done2)return d.both;
    if(T.lastWinner===1||T.lastWinner===2)return `${d.winner} ${playerName(T.lastWinner)}.`;
    if(T.lastWinner===3)return d.tie;
    const activeDone=T.active===1?T.done1:T.done2;
    if(activeDone){const other=T.active===1?2:1;return `${d.saved} ${playerName(other)}.`}
    return `${d.ready} ${playerName(T.active)}.`;
  }

  function sync(s){
    if(!s)return;T=s;page.style.setProperty('--tAccent',T.accent||'#f4ecec');
    if(document.activeElement!==$('tm_player1'))$('tm_player1').value=T.player1||'';
    if(document.activeElement!==$('tm_player2'))$('tm_player2').value=T.player2||'';
    $('tm_score1').textContent=T.score1||0;$('tm_score2').textContent=T.score2||0;
    $('tm_p1Card').classList.toggle('active',Number(T.active)!==2);$('tm_p2Card').classList.toggle('active',Number(T.active)===2);
    document.querySelectorAll('[data-tm-style]').forEach(b=>b.classList.toggle('active',Number(b.dataset.tmStyle)===Number(T.style)));
    $('tm_opacity').value=Math.round((Number(T.opacity)||0)*100);$('tm_opacityV').textContent=$('tm_opacity').value+'%';
    $('tm_scale').value=Math.round((Number(T.scale)||1)*100);$('tm_scaleV').textContent=$('tm_scale').value+'%';
    $('tm_actionKey').textContent=capture==='action'?t().setKey:(T.hotkeyAction||'—');$('tm_swapKey').textContent=capture==='swap'?t().setKey:(T.hotkeySwap||'—');
    $('tm_enabledBtn').textContent=T.enabled?t().hide:t().show;$('tm_enabledBtn').classList.toggle('on',!!T.enabled);
    $('tm_editBtn').textContent=editing?t().savePos:t().move;$('tm_editBtn').classList.toggle('ok',editing);
    const activeDone=T.active===1?T.done1:T.done2;
    $('tm_actionBtn').textContent=T.running?t().stop:(T.done1&&T.done2?t().resolve:(activeDone?t().needSwap:t().start));
    $('tm_actionBtn').disabled=!T.running&&!(T.done1&&T.done2)&&activeDone;
    $('tm_status').textContent=statusText();
    const cc=$('tm_customColor');if(cc&&document.activeElement!==cc)cc.value=T.accent||'#f4ecec';
    document.querySelectorAll('[data-tm-color]').forEach(b=>b.classList.toggle('active',(b.dataset.tmColor||'').toLowerCase()===(T.accent||'').toLowerCase()));
  }

  function redrawTimes(){if(T){$('tm_time1').textContent=fmt(currentMs(1));$('tm_time2').textContent=fmt(currentMs(2))}requestAnimationFrame(redrawTimes)}

  $('tm_player1').addEventListener('input',e=>api.timerPatch({player1:e.target.value}));
  $('tm_player2').addEventListener('input',e=>api.timerPatch({player2:e.target.value}));
  $('tm_p1Card').addEventListener('click',e=>{if(e.target.tagName!=='INPUT')api.timerPatch({active:1})});
  $('tm_p2Card').addEventListener('click',e=>{if(e.target.tagName!=='INPUT')api.timerPatch({active:2})});
  $('tm_s1m').onclick=()=>api.timerScore(1,-1);$('tm_s1p').onclick=()=>api.timerScore(1,1);$('tm_s2m').onclick=()=>api.timerScore(2,-1);$('tm_s2p').onclick=()=>api.timerScore(2,1);
  $('tm_reset').onclick=async()=>{if(confirm(t().confirmReset))sync(await api.timerReset())};
  document.querySelectorAll('[data-tm-style]').forEach(b=>b.onclick=()=>api.timerPatch({style:+b.dataset.tmStyle}));
  $('tm_opacity').addEventListener('input',e=>{$('tm_opacityV').textContent=e.target.value+'%';api.timerPatch({opacity:+e.target.value/100})});
  $('tm_scale').addEventListener('input',e=>{$('tm_scaleV').textContent=e.target.value+'%';api.timerPatch({scale:+e.target.value/100})});
  $('tm_enabledBtn').onclick=()=>api.timerPatch({enabled:!T.enabled});
  $('tm_actionBtn').onclick=async()=>sync(await api.timerAction());
  $('tm_swapBtn').onclick=async()=>sync(await api.timerSwap());
  $('tm_swapBtn').textContent=t().swap;
  $('tm_editBtn').onclick=async()=>{editing=!editing;await api.timerEdit(editing);sync(T)};

  function accelerator(e){
    const mods=[];if(e.ctrlKey)mods.push('Control');if(e.altKey)mods.push('Alt');if(e.shiftKey)mods.push('Shift');if(e.metaKey)mods.push('Super');
    let k=e.key;if(['Control','Alt','Shift','Meta'].includes(k))return'';if(k===' ')k='Space';if(k.length===1)k=k.toUpperCase();return [...mods,k].join('+');
  }
  $('tm_actionKey').onclick=()=>{capture='action';sync(T)};
  $('tm_swapKey').onclick=()=>{capture='swap';sync(T)};
  addEventListener('keydown',async e=>{
    if(!capture)return;e.preventDefault();e.stopImmediatePropagation();
    if(e.key==='Escape'){capture=null;sync(T);return}
    const key=accelerator(e);if(!key)return;const which=capture;capture=null;
    const r=await api.timerHotkey(which,key);T=r.state;if(!r.ok)alert(t().keyFail);sync(T);
  },true);

  api.onTimerState(sync);
  api.onTimerEdit(v=>{editing=!!v;sync(T)});
  api.onState?.(s=>{if(s?.language&&s.language!==lang){lang=s.language;translate()}});

  (async()=>{
    const root=await api.get();lang=root?.state?.language||'pt';
    const x=await api.timerGet();T=x.state;editing=!!x.editing;
    buildColors();translate();sync(T);redrawTimes();
  })();
})();
