(()=>{
  'use strict';
  function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0))}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function elapsed(s,p,now){if(s?.running&&Number(s.runningPlayer)===p)return Math.max(0,(now||Date.now())-(Number(s.startedAt)||Date.now()));return Math.max(0,Number(p===1?s?.time1:s?.time2)||0)}
  function format(ms){ms=Math.max(0,Number(ms)||0);const totalSec=Math.floor(ms/1000),min=Math.floor(totalSec/60),sec=totalSec%60,centi=Math.floor((ms%1000)/10);return min>0?`${min}:${String(sec).padStart(2,'0')}.${String(centi).padStart(2,'0')}`:`${sec}.${String(centi).padStart(2,'0')}`}
  function victoryWord(lang){return lang==='en'?'WIN':lang==='es'?'VICTORIA':'VITÓRIA'}
  function rgb(hex){const m=/^#([0-9a-f]{6})$/i.exec(String(hex||''));if(!m)return[13,14,19];const n=parseInt(m[1],16);return[(n>>16)&255,(n>>8)&255,n&255]}
  function ensure(root){
    if(root.dataset.built==='1')return;
    root.dataset.built='1';
    root.innerHTML=`<div class="timer-shell"><div class="timer-player p1"><i class="active-mark"></i><div class="timer-name" data-name="1"></div><div class="timer-time" data-time="1">0.00</div></div><div class="score-wrap"><div class="timer-score"><span data-score="1">0</span><span class="dash">–</span><span data-score="2">0</span></div></div><div class="timer-player p2"><i class="active-mark"></i><div class="timer-name" data-name="2"></div><div class="timer-time" data-time="2">0.00</div></div></div>`
  }
  function phaseInfo(s,now){
    const current=Number(now||Date.now()),until=Number(s?.celebrationUntil)||0,winner=Number(s?.celebrationWinner)||0;
    const active=s?.victoryEffectEnabled!==false&&until>current&&(winner===1||winner===2);
    if(!active)return{active:false,winner:0,showVictory:false,phase:-1};
    const introUntil=Number(s?.celebrationIntroUntil)||0;
    const showVictory=introUntil>current;
    return{active:true,winner,showVictory,phase:showVictory?0:1};
  }
  function tick(root,s,now){
    if(!root||!s||!s.running)return;
    const p=Number(s.runningPlayer)===2?2:1;
    const el=root.querySelector(`[data-time="${p}"]`);
    if(el)el.textContent=format(elapsed(s,p,now));
  }
  function apply(root,s,now){
    if(!root||!s)return;ensure(root);
    const style=clamp(s.style,0,5)|0,opacity=clamp(s.opacity,0,1),accent=/^#[0-9a-f]{6}$/i.test(s.accent||'')?s.accent:'#3b82f6',shadowStrength=clamp(s.textShadow??20,0,100)/100;
    const [br,bg,bb]=rgb(s.backgroundColor||'#0d0e13'),sr=Math.min(255,br+28),sg=Math.min(255,bg+29),sb=Math.min(255,bb+32);
    const current=Number(now||Date.now()),fx=phaseInfo(s,current),winner=fx.winner;
    root.className=`timer-widget style-${style}${opacity<=.001?' zero-opacity':''}${fx.active?' celebrating':''}${fx.showVictory?' victory-label-phase':' victory-timer-phase'} victory-phase-${fx.phase}`;
    root.style.setProperty('--accent',accent);
    root.style.setProperty('--panel',`rgba(${br},${bg},${bb},${(opacity*.94).toFixed(3)})`);
    root.style.setProperty('--panel-soft',`rgba(${sr},${sg},${sb},${(opacity*.54).toFixed(3)})`);
    root.style.setProperty('--border',`rgba(255,255,255,${(opacity*.18).toFixed(3)})`);
    root.style.setProperty('--shadow',opacity<=.001?'none':`0 10px 28px rgba(0,0,0,${(.12+.22*opacity).toFixed(3)})`);
    const shadowBlur=(0.8+2.2*shadowStrength)*1.44;
    const shadowAlpha=Math.min(.72,(0.12+0.38*shadowStrength)*1.44);
    root.style.setProperty('--text-shadow-filter',shadowStrength<=0?'none':`drop-shadow(0 1px ${shadowBlur.toFixed(2)}px rgba(0,0,0,${shadowAlpha.toFixed(3)}))`);
    root.querySelector('[data-name="1"]').innerHTML=esc(s.player1??'PLAYER 1');
    root.querySelector('[data-name="2"]').innerHTML=esc(s.player2??'PLAYER 2');
    root.querySelector('[data-score="1"]').textContent=Math.max(0,Number(s.score1)||0);
    root.querySelector('[data-score="2"]').textContent=Math.max(0,Number(s.score2)||0);
    const name1=root.querySelector('[data-name="1"]'),name2=root.querySelector('[data-name="2"]');
    const time1=root.querySelector('[data-time="1"]'),time2=root.querySelector('[data-time="2"]');
    time1.textContent=format(elapsed(s,1,current));time2.textContent=format(elapsed(s,2,current));
    name1.dataset.victoryLabel=victoryWord(s.language);name2.dataset.victoryLabel=victoryWord(s.language);
    time1.classList.toggle('victory-target',winner===1);time2.classList.toggle('victory-target',winner===2);
    const p1=root.querySelector('.p1'),p2=root.querySelector('.p2'),active=Number(s.active)===2?2:1;
    p1.classList.toggle('active',active===1);p2.classList.toggle('active',active===2);
    p1.classList.toggle('running',!!s.running&&Number(s.runningPlayer)===1);p2.classList.toggle('running',!!s.running&&Number(s.runningPlayer)===2);
    p1.classList.toggle('winner',winner===1);p2.classList.toggle('winner',winner===2);
    p1.classList.toggle('loser',!!winner&&winner!==1);p2.classList.toggle('loser',!!winner&&winner!==2);
  }
  window.TimerRenderer={apply,tick,format,elapsed};
})();
