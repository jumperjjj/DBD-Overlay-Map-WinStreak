(function(){
  function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0))}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function elapsed(s,p,now){
    if(s?.running && Number(s.runningPlayer)===p) return Math.max(0,(now||Date.now())-(Number(s.startedAt)||Date.now()));
    return Math.max(0,Number(p===1?s?.time1:s?.time2)||0);
  }
  function format(ms){
    ms=Math.max(0,Number(ms)||0);
    const total=Math.floor(ms/1000);
    const min=Math.floor(total/60);
    const sec=total%60;
    return String(min).padStart(2,'0')+':'+String(sec).padStart(2,'0');
  }
  function rgba(hex,a){
    const m=/^#([0-9a-f]{6})$/i.exec(hex||'');
    if(!m)return `rgba(255,255,255,${a})`;
    const n=parseInt(m[1],16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }
  function ensure(root){
    if(root.dataset.built==='1')return;
    root.dataset.built='1';
    root.innerHTML=`<div class="timer-shell">
      <div class="timer-player p1"><i class="active-mark"></i><div class="timer-name" data-name="1"></div><div class="timer-time" data-time="1">00:00</div></div>
      <div class="score-wrap"><div class="timer-score-label">SCORE</div><div class="timer-score-box"><div class="timer-score"><span data-score="1">0</span><span class="dash">–</span><span data-score="2">0</span></div></div></div>
      <div class="timer-player p2"><i class="active-mark"></i><div class="timer-name" data-name="2"></div><div class="timer-time" data-time="2">00:00</div></div>
    </div>`;
  }
  function apply(root,s,now){
    if(!root||!s)return;
    ensure(root);
    const style=clamp(s.style,0,2)|0;
    const opacity=clamp(s.opacity,0,1);
    const accent=/^#[0-9a-f]{6}$/i.test(s.accent||'')?s.accent:'#f4ecec';
    root.className=`timer-widget style-${style}${opacity<=0.001?' zero-opacity':''}${s.lastWinner===1?' winner-1':s.lastWinner===2?' winner-2':''}`;
    root.style.setProperty('--accent',accent);
    root.style.setProperty('--panel',`rgba(13,14,19,${(opacity*.94).toFixed(3)})`);
    root.style.setProperty('--panel2',`rgba(58,58,65,${(opacity*.66).toFixed(3)})`);
    root.style.setProperty('--border',`rgba(255,255,255,${(opacity*.24).toFixed(3)})`);
    root.style.setProperty('--shadow',opacity<=.001?'none':`0 10px 30px rgba(0,0,0,${(.18+.24*opacity).toFixed(3)})`);
    root.querySelector('[data-name="1"]').innerHTML=esc(s.player1||'PLAYER 1');
    root.querySelector('[data-name="2"]').innerHTML=esc(s.player2||'PLAYER 2');
    root.querySelector('[data-score="1"]').textContent=Math.max(0,Number(s.score1)||0);
    root.querySelector('[data-score="2"]').textContent=Math.max(0,Number(s.score2)||0);
    root.querySelector('[data-time="1"]').textContent=format(elapsed(s,1,now));
    root.querySelector('[data-time="2"]').textContent=format(elapsed(s,2,now));
    const p1=root.querySelector('.p1'),p2=root.querySelector('.p2');
    p1.classList.toggle('active',Number(s.active)!==2);
    p2.classList.toggle('active',Number(s.active)===2);
    p1.classList.toggle('running',!!s.running&&Number(s.runningPlayer)===1);
    p2.classList.toggle('running',!!s.running&&Number(s.runningPlayer)===2);
  }
  window.TimerRenderer={apply,format,elapsed};
})();
