/* 모의투자 리그 — data.json 하나만 읽는 정적 앱 */
(function(){
'use strict';
var D=null, app=document.getElementById('app');
var ET='America/New_York', KST='Asia/Seoul';

/* ---------- 포맷 ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function n0(x){return Math.round(Number(x)||0).toLocaleString('ko-KR');}
function won(x){return n0(x)+'원';}
function swon(x){x=Math.round(Number(x)||0);return (x>0?'+':x<0?'-':'')+n0(Math.abs(x))+'원';}
function pct(x,d){if(x==null||isNaN(x))return '—';d=d==null?2:d;var v=Number(x);return (v>0?'+':'')+v.toFixed(d)+'%';}
function cls(x){x=Number(x)||0;return Math.abs(x)<1e-9?'flat':x>0?'up':'down';}
function pfTxt(pf){return pf==null?'—':pf==='inf'?'∞':Number(pf).toFixed(2);}
function hm(iso,tz){try{return new Date(iso).toLocaleTimeString('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false});}catch(_){return '';}}
function kday(iso){try{return new Date(iso).toLocaleDateString('en-CA',{timeZone:KST});}catch(_){return '';}}
function dayLabel(d){var t=kday(new Date().toISOString()), y=kday(new Date(Date.now()-864e5).toISOString());
  if(d===t)return '오늘'; if(d===y)return '어제'; var p=d.split('-'); return (+p[1])+'월 '+(+p[2])+'일';}
function player(id){return (D.players||[]).filter(function(p){return p.id===id;})[0]||{id:id,name:id,color:'#8A909B'};}
function initials(name){name=String(name||'');return name.length>=3?name.slice(-2):name.slice(0,2);}
function mono(p,size){return '<span class="mono'+(size?' '+size:'')+'" style="background:'+esc(p.color||'#8A909B')+'" aria-hidden="true">'+esc(initials(p.name))+'</span>';}
function hyp(id){return (D.hypotheses||[]).filter(function(h){return h.id===id;})[0];}
function fx(){return (D.league&&D.league.fx)||1330;}
function dday(s){var m=/(\d{4}-\d{2}-\d{2})/.exec(s||'');if(!m)return null;
  var t=new Date(kday(new Date().toISOString())+'T00:00:00Z'), d=new Date(m[1]+'T00:00:00Z');return Math.round((d-t)/864e5);}
var ST={open:['진행중','wait'],pending_fill:['체결 대기',''],confirmed:['맞음','ok'],refuted:['틀림','no'],expired:['기한 만료','warn'],cancelled:['취소','']};
function stChip(s){var x=ST[s]||[s,''];return '<span class="chip '+x[1]+'">'+esc(x[0])+'</span>';}
var ICON={back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>'};

/* ---------- 상단 ---------- */
function mktPill(){
  var m=D.market||{}, g=D.generated_at, age=(Date.now()-new Date(g).getTime())/6e4;
  var c=m.open?(age>10?'mkt stale':'mkt on'):'mkt', t=m.open?(age>10?'장중 · 갱신 지연':'장중'):'장 마감';
  return '<span class="'+c+'" id="mkt"><i></i>'+t+'</span>';
}
function updLine(){return '갱신 '+hm(D.generated_at,ET)+' ET · '+hm(D.generated_at,KST)+' KST';}
function liveBar(){var a=document.getElementById('mkt');if(a)a.outerHTML=mktPill();var b=document.getElementById('upd');if(b)b.textContent=updLine();}

/* ---------- 홈 ---------- */
function home(){
  var L=D.league||{}, rules=D.rules||[], q=(L.bench_return_pct||{}).QQQ;
  var h='<div class="view"><div class="top"><h1>모의투자 리그</h1>'+mktPill()+'</div>'+
    '<div class="meta"><span>가상 1천만원 · 실제 돈 아님</span> · <span id="upd">'+updLine()+'</span></div>';
  h+='<div class="season num">시즌 '+(L.days_elapsed||0)+' / '+(L.evaluation_days||90)+'일<span class="dot">·</span>같은 기간 QQQ <span class="'+cls(q)+'">'+pct(q)+'</span></div>';
  // 순위
  h+='<section class="sec sec-first"><div class="sec-h"><h2>순위</h2><span class="t3">Profit Factor 기준</span></div>';
  var started=(D.events||[]).some(function(e){return e.kind==='FILL';});
  (D.players||[]).forEach(function(p){
    h+='<a class="row" href="#/p/'+esc(p.id)+'"><span class="rank num">'+(started?p.rank:'–')+'</span>'+mono(p)+
      '<div class="main"><div class="nm">'+esc(p.name)+'</div><div class="sub num">총자산 '+won(p.equity_krw)+'</div></div>'+
      '<div class="rt"><div class="big num"><span class="pfl">PF</span>'+pfTxt(p.profit_factor)+'</div>'+
      '<div class="sm num '+cls(p.pl_krw)+'">'+swon(p.pl_krw)+' · '+pct(p.return_krw_pct)+'</div></div></a>';
  });
  if(!started) h+='<p class="meta" style="margin-top:4px">첫 체결이 나오면 순위가 매겨집니다.</p>';
  h+='</section>';
  // 오늘의 변화
  var today=kday(new Date().toISOString());
  var evs=(D.events||[]).filter(function(e){return (e.kind==='FILL'||e.kind==='VERDICT')&&kday(e.time)===today;}).slice(-6).reverse();
  h+='<section class="sec"><div class="sec-h"><h2>오늘의 변화</h2><a class="t3" href="#/feed">전체 보기</a></div>';
  h+=evs.length?evs.map(function(e){return evRow(e,true);}).join(''):'<div class="empty">오늘은 아직 체결이나 판정이 없어요</div>';
  var pend=0;(D.players||[]).forEach(function(p){pend+=(p.pending||[]).length;});
  if(pend) h+='<p class="meta">체결 대기 주문 '+pend+'건 · 장이 열리면 체결됩니다</p>';
  h+='</section></div>';
  return h;
}

/* ---------- 이벤트 행 (홈·중계 공용) ---------- */
function evRow(e,showWho){
  var p=player(e.player), H=e.hypothesis_id?hyp(e.hypothesis_id):null, title=H?H.scenario:'';
  var who=showWho?mono(p,'s')+'<span class="who">'+esc(p.name)+'</span>':'';
  var tm='<div class="tm num">'+hm(e.time,KST)+'</div>';
  if(e.kind==='FILL'){
    var amt=(e.shares||0)*(e.price||0)*fx(), buy=e.side==='BUY';
    var src=e.fill_source==='intraday'?'장중가':(e.fill_source==='open'?'시가':'체결');
    return '<div class="ev">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+esc(e.symbol)+' '+n0(e.shares)+'주 '+(buy?'매수':'매도')+'</span>'+
      '<span class="amt num">'+won(amt)+'</span></div>'+
      '<div class="l2 num">'+src+' $'+Number(e.price||0).toFixed(2)+(e.fill_source==='intraday'?' · 최대 15분 지연 시세':'')+' · 비용 '+won(e.cost_krw)+'</div>'+
      (title?'<div class="hq">'+esc(title)+'</div>':'')+'</div></div>';
  }
  if(e.kind==='VERDICT'){
    var v=ST[e.verdict]||[e.verdict,''], ok=e.verdict==='confirmed'?' ok':e.verdict==='refuted'?' no':'';
    return '<div class="ev vd'+ok+'">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+esc(e.symbol)+' 가설 판정</span><span class="amt">'+stChip(e.verdict)+'</span></div>'+
      (title?'<div class="hq">'+esc(title)+'</div>':'')+
      (e.lesson?'<div class="lesson"><span class="lb">교훈</span>'+esc(e.lesson)+'</div>':'')+
      (H&&H.linked_pl_krw!=null?'<div class="l2 num">연결 손익 <span class="'+cls(H.linked_pl_krw)+'">'+swon(H.linked_pl_krw)+'</span></div>':'')+'</div></div>';
  }
  if(e.kind==='SUBMIT'){
    return '<div class="ev">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+esc(e.symbol)+' '+(e.side==='BUY'?'매수':'매도')+' 주문 접수</span></div>'+
      '<div class="l2">장중이면 바로 체결, 장외면 다음 정규장 시가</div>'+(title?'<div class="hq">'+esc(title)+'</div>':'')+'</div></div>';
  }
  if(e.kind==='AMEND'){
    var ch=Object.keys(e.changes||{}).map(function(k){return {check_by:'확인 시점',confirm_if:'맞으면',refute_if:'틀리면'}[k]||k;}).join(', ');
    return '<div class="ev">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+esc(e.symbol)+' 가설 수정</span></div>'+
      '<div class="l2">'+esc(ch)+' 변경 · '+esc(e.reason||'')+'</div>'+(title?'<div class="hq">'+esc(title)+'</div>':'')+'</div></div>';
  }
  if(e.kind==='REJECT'){
    var foul=e['class']?e['class']==='foul':/^(규칙 2 위반|복기 필요)/.test(e.why||'');
    var what={FILE:'주문 파일',VERDICT:'판정',AMEND:'가설 수정',BUY:'매수',SELL:'매도'}[e.side]||'주문';
    return '<div class="ev'+(foul?' foul':'')+'">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+(e.symbol?esc(e.symbol)+' ':'')+what+(foul?' 반칙':' 반려')+'</span>'+
      (foul?'<span class="amt"><span class="chip warn">반칙</span></span>':'')+'</div>'+
      '<div class="l2">'+esc(e.why||'')+(foul?'':' · 고쳐서 다시 제출하면 됩니다')+'</div></div></div>';
  }
  if(e.kind==='LESSON'){
    return '<div class="ev">'+tm+'<div class="bd"><div class="l1">'+who+'<span>교훈 기록</span></div><div class="lesson">'+esc(e.lesson||'')+'</div></div></div>';
  }
  if(e.kind==='EXPIRE'){
    return '<div class="ev">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+esc(e.symbol)+' 가설 기한 만료</span></div>'+(title?'<div class="hq">'+esc(title)+'</div>':'')+'</div></div>';
  }
  return '';
}

/* ---------- 중계 ---------- */
function filters(base,cur){
  var h='<div class="filters" role="tablist"><a href="'+base+'all" class="'+(cur==='all'?'on':'')+'"><span>전체</span></a>';
  (D.players||[]).forEach(function(p){h+='<a href="'+base+esc(p.id)+'" class="'+(cur===p.id?'on':'')+'"><span>'+esc(p.name)+'</span></a>';});
  return h+'</div>';
}
function feed(pid){
  pid=pid||'all';
  var evs=(D.events||[]).filter(function(e){return pid==='all'||e.player===pid;}).slice().reverse();
  var h='<div class="view"><div class="top"><h1>중계</h1>'+mktPill()+'</div>'+filters('#/feed/',pid);
  if(!evs.length) return h+'<div class="empty">아직 기록이 없어요</div></div>';
  var last='';
  evs.slice(0,200).forEach(function(e){var d=kday(e.time);if(d!==last){h+='<div class="day">'+dayLabel(d)+'</div>';last=d;}h+=evRow(e,true);});
  var ec=D.earnings_confirmed||[];
  return h+'</div>';
}

/* ---------- 차트 ---------- */
function smooth(pts){
  if(pts.length<2) return pts.length?'M'+pts[0][0]+','+pts[0][1]:'';
  var d='M'+pts[0][0].toFixed(1)+','+pts[0][1].toFixed(1);
  for(var i=0;i<pts.length-1;i++){
    var p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2, t=.18;
    var c1x=p1[0]+(p2[0]-p0[0])*t, c1y=p1[1]+(p2[1]-p0[1])*t, c2x=p2[0]-(p3[0]-p1[0])*t, c2y=p2[1]-(p3[1]-p1[1])*t;
    var lo=Math.min(p1[1],p2[1]), hi=Math.max(p1[1],p2[1]); c1y=Math.max(lo,Math.min(hi,c1y)); c2y=Math.max(lo,Math.min(hi,c2y));
    d+='C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+p2[0].toFixed(1)+','+p2[1].toFixed(1);
  }
  return d;
}
function chart(p){
  var hist=(p.equity_hist||[]).filter(function(x){return x.krw;});
  var start=(D.league&&D.league.start_krw)||1e7;
  if(hist.length<2) return '<div class="card empty" style="margin-top:16px">첫 거래일이 지나면 자산 그래프가 그려져요</div>';
  var q=(D.bench_hist&&D.bench_hist.QQQ)||[], q0=q.length?q[0].close:null, qmap={};
  q.forEach(function(x){qmap[x.date]=x.close;});
  var ser=hist.map(function(x){var qc=qmap[x.date];return {d:x.date,v:x.krw,q:(q0&&qc)?start*qc/q0:null};});
  var W=390,H=200,padT=28,padB=12, all=[];
  ser.forEach(function(s){all.push(s.v);if(s.q)all.push(s.q);});
  var lo=Math.min.apply(null,all), hi=Math.max.apply(null,all), r=(hi-lo)||hi*0.01; lo-=r*.08; hi+=r*.08;
  var X=function(i){return 20+i*(W-40)/(ser.length-1);}, Y=function(v){return padT+(hi-v)/(hi-lo)*(H-padT-padB);};
  var pts=ser.map(function(s,i){return [X(i),Y(s.v)];}), qp=ser.filter(function(s){return s.q;}).map(function(s){return [X(ser.indexOf(s)),Y(s.q)];});
  var col=esc(p.color||'#8A909B'), last=pts[pts.length-1], up=ser[ser.length-1].v>=start;
  var line=up?'var(--up)':'var(--down)';
  var svg='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="자산 추이 그래프">'+
    '<line x1="20" x2="'+(W-20)+'" y1="'+Y(start).toFixed(1)+'" y2="'+Y(start).toFixed(1)+'" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 4" vector-effect="non-scaling-stroke"/>'+
    (qp.length>1?'<path d="'+smooth(qp)+'" fill="none" stroke="var(--t3)" stroke-opacity=".7" stroke-width="1.25" vector-effect="non-scaling-stroke"/>':'')+
    '<path d="'+smooth(pts)+'" fill="none" stroke="'+line+'" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'+
    '<circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="3.5" fill="'+line+'"/>'+
    '<g class="cur" style="display:none"><line y1="'+padT+'" y2="'+(H-padB)+'" stroke="var(--t3)" stroke-width="1" vector-effect="non-scaling-stroke"/><circle r="4" fill="'+line+'" stroke="var(--bg)" stroke-width="2"/></g></svg>';
  window.__chart={ser:ser,X:X,Y:Y,W:W};
  return '<div class="chart" id="chart">'+svg+'<div class="tip num" id="tip"></div></div>'+
    '<div class="legend"><span><i style="background:'+line+'"></i>총자산</span>'+(qp.length>1?'<span><i style="background:var(--t3)"></i>QQQ 같은 기간 (1천만원 기준)</span>':'')+'</div>';
}
function bindChart(){
  var el=document.getElementById('chart'); if(!el||!window.__chart) return;
  var C=window.__chart, svg=el.querySelector('svg'), cur=svg.querySelector('.cur'), tip=document.getElementById('tip');
  function at(clientX){
    var r=svg.getBoundingClientRect(), x=(clientX-r.left)/r.width*C.W, n=C.ser.length;
    var i=Math.max(0,Math.min(n-1,Math.round((x-20)/((C.W-40)/(n-1))))), s=C.ser[i];
    cur.style.display=''; cur.querySelector('line').setAttribute('x1',C.X(i)); cur.querySelector('line').setAttribute('x2',C.X(i));
    var c=cur.querySelector('circle'); c.setAttribute('cx',C.X(i)); c.setAttribute('cy',C.Y(s.v));
    var px=C.X(i)/C.W*r.width; tip.style.left=Math.max(70,Math.min(r.width-70,px))+'px';
    var dd=s.d.split('-');
    tip.innerHTML=(+dd[1])+'/'+(+dd[2])+' · '+won(s.v)+(s.q?' <span class="t3">QQQ '+won(s.q)+'</span>':'');
    el.classList.add('scrub');
  }
  function end(){cur.style.display='none';el.classList.remove('scrub');}
  el.addEventListener('pointerdown',function(e){at(e.clientX);});
  el.addEventListener('pointermove',function(e){if(e.pointerType==='mouse'||e.buttons||e.pressure)at(e.clientX);});
  el.addEventListener('pointerup',end);el.addEventListener('pointerleave',end);el.addEventListener('pointercancel',end);
}

/* ---------- 가설 카드 ---------- */
function hypCard(h){
  var dd=dday(h.check_by), live=h.status==='open'||h.status==='pending_fill';
  var dchip=live&&dd!=null?'<span class="chip'+(dd<0?' warn':'')+'">'+(dd>0?'D-'+dd:dd===0?'D-day':'기한 지남')+'</span>':'';
  var x='<article class="hyp"><div class="hd"><span class="sym">'+esc(h.symbol)+' · '+esc(h.id)+'</span><span class="chips">'+dchip+stChip(h.status)+'</span></div>'+
    '<h3>'+esc(h.scenario||'')+'</h3>'+
    '<div class="ln"><b>맞으면</b><span>'+esc(h.confirm_if||'')+'</span></div>'+
    '<div class="ln"><b>틀리면</b><span>'+esc(h.refute_if||'')+'</span></div>'+
    '<div class="ln"><b>확인</b><span class="num">'+esc(h.check_by||'')+'</span></div>';
  if(h.why) x+='<details><summary>근거 보기</summary><div class="body">'+esc(h.why)+'</div></details>';
  var am=h.amendments||[];
  if(am.length){
    x+='<details><summary>수정 이력 '+am.length+'회 · 원문 보존</summary><div class="body">';
    am.forEach(function(a){
      x+='<div class="amend"><div class="t3 num">'+kday(a.time)+' '+hm(a.time,KST)+' KST · '+esc(a.reason||'')+'</div>';
      Object.keys(a.changes||{}).forEach(function(k){var c=a.changes[k];
        x+='<div>'+({check_by:'확인',confirm_if:'맞으면',refute_if:'틀리면'}[k]||k)+': <span class="old">'+esc(c.from)+'</span> → '+esc(c.to)+'</div>';});
      x+='</div>';
    });
    x+='</div></details>';
  }
  var closed=h.status==='confirmed'||h.status==='refuted'||h.status==='expired';
  if(closed&&(h.evidence||h.lesson)){
    x+='<div class="res">'+(h.evidence?'<div class="lb">판정 근거</div><div>'+esc(h.evidence)+'</div>':'')+
      (h.lesson?'<div class="lb" style="margin-top:8px">교훈</div><div>'+esc(h.lesson)+'</div>':'')+'</div>';
  }
  if(h.status==='expired'&&!h.lesson_id) x+='<div class="note-warn"><i></i>교훈을 쓰기 전까지 새 매수가 막혀요</div>';
  x+='<div class="ft num"><span>시작 '+esc(h.open_date||'')+(h.learned_from&&h.learned_from.length?' · 참고 교훈 '+esc(h.learned_from.join(', ')):'')+'</span>'+
     (h.linked_pl_krw!=null&&h.status!=='pending_fill'?'<span class="'+cls(h.linked_pl_krw)+'">'+swon(h.linked_pl_krw)+'</span>':'')+'</div></article>';
  return x;
}

/* ---------- 선수 페이지 ---------- */
function pPage(id,tab){
  var p=player(id); if(!p||!p.equity_hist) return '<div class="view"><div class="empty">선수를 찾을 수 없어요</div></div>';
  tab=tab||'open';
  var h='<div class="view"><div class="top"><a class="back" href="#/" aria-label="뒤로">'+ICON.back+'</a>'+mktPill()+'</div>';
  h+='<div class="ph"><div class="who">'+mono(p,'s')+'<span>'+esc(p.name)+'</span>'+((D.events||[]).some(function(e){return e.kind==='FILL';})?'<span class="t3">· '+p.rank+'위</span>':'')+'</div>'+
     '<div class="eq num">'+won(p.equity_krw)+'</div>'+
     '<div class="pl num '+cls(p.pl_krw)+'">'+swon(p.pl_krw)+' ('+pct(p.return_krw_pct)+')</div>'+
     '<div class="vs num">QQQ 대비 '+(p.vs_qqq_pct==null?'—':pct(p.vs_qqq_pct))+' · 현금 '+won(p.cash_krw)+'</div></div>';
  h+=chart(p);
  h+='<div class="stats num">'+
     '<div><div class="lb">Profit Factor</div><div class="v">'+pfTxt(p.profit_factor)+'</div></div>'+
     '<div><div class="lb">적중률</div><div class="v">'+(p.hit_rate_pct==null?'—':Math.round(p.hit_rate_pct)+'%')+'</div></div>'+
     '<div><div class="lb">손익비</div><div class="v">'+(p.payoff_ratio==null?'—':Number(p.payoff_ratio).toFixed(2))+'</div></div>'+
     '<div><div class="lb">최대 낙폭</div><div class="v">'+pct(p.max_drawdown_pct)+'</div></div>'+
     '<div><div class="lb">최대 수익</div><div class="v '+cls(p.biggest_win_krw)+'">'+swon(p.biggest_win_krw)+'</div></div>'+
     '<div><div class="lb">최대 손실</div><div class="v '+cls(p.biggest_loss_krw)+'">'+swon(p.biggest_loss_krw)+'</div></div></div>';
  if((p.needs_review||[]).length) h+='<div class="note-warn"><i></i>기한이 지난 가설 '+p.needs_review.length+'개('+esc(p.needs_review.join(', '))+')에 교훈을 쓰기 전까지 새 매수가 막혀요</div>';
  // 보유
  h+='<section class="sec"><div class="sec-h"><h2>보유 종목</h2><span class="t3 num">'+(p.holdings||[]).length+'개</span></div>';
  if(!(p.holdings||[]).length) h+='<div class="empty">보유 종목이 없어요</div>';
  (p.holdings||[]).forEach(function(x){
    var pl=x.value_krw*(x.pl_pct/(100+x.pl_pct));
    h+='<div class="row"><span class="tick">'+esc(String(x.symbol).slice(0,4))+'</span><div class="main"><div class="nm">'+esc(x.name||x.symbol)+'</div>'+
       '<div class="sub num">'+esc(x.symbol)+' · '+n0(x.shares)+'주 · 평균 $'+Number(x.avg_cost||0).toFixed(2)+'</div></div>'+
       '<div class="rt"><div class="nm num" style="font-size:15px">'+won(x.value_krw)+'</div><div class="sm num '+cls(x.pl_pct)+'">'+swon(pl)+' ('+pct(x.pl_pct)+')</div></div></div>';
  });
  if((p.pending||[]).length){
    h+='<div class="sec-h" style="margin-top:16px"><h2 style="font-size:15px">체결 대기</h2></div>';
    p.pending.forEach(function(o){h+='<div class="row" style="min-height:52px"><span class="tick">'+esc(String(o.symbol).slice(0,4))+'</span><div class="main"><div class="nm" style="font-size:15px">'+esc(o.symbol)+' '+(o.side==='BUY'?'매수':'매도')+'</div><div class="sub">'+esc(o.submit_date)+' 접수 · 장이 열리면 체결</div></div></div>';});
  }
  h+='</section>';
  // 가설
  var mine=(D.hypotheses||[]).filter(function(x){return x.player===p.id&&x.status!=='cancelled';});
  var op=mine.filter(function(x){return x.status==='open'||x.status==='pending_fill';}), cl=mine.filter(function(x){return op.indexOf(x)<0;});
  var list=tab==='closed'?cl:op;
  h+='<section class="sec"><div class="sec-h"><h2>가설</h2><span class="t3 num">맞음 '+(p.n_confirmed||0)+' · 틀림 '+(p.n_refuted||0)+'</span></div>'+
     '<div class="seg"><a href="#/p/'+esc(p.id)+'/open" class="'+(tab!=='closed'?'on':'')+'">진행중 '+op.length+'</a><a href="#/p/'+esc(p.id)+'/closed" class="'+(tab==='closed'?'on':'')+'">종료 '+cl.length+'</a></div>';
  h+=list.length?list.slice().reverse().map(hypCard).join(''):'<div class="empty">'+(tab==='closed'?'종료된 가설이 없어요':'진행 중인 가설이 없어요')+'</div>';
  h+='</section>';
  // 교훈
  var ls=(D.lessons||[]).filter(function(l){return l.player===p.id;}).slice().reverse();
  h+='<section class="sec"><div class="sec-h"><h2>교훈</h2><a class="t3" href="#/notes/'+esc(p.id)+'">오답노트</a></div>';
  h+=ls.length?ls.slice(0,3).map(function(l){return lessonRow(l,true);}).join(''):'<div class="empty">아직 교훈이 없어요</div>';
  return h+'</section></div>';
}

/* ---------- 오답노트 ---------- */
function lessonRow(l,noWho){
  var p=player(l.player), H=l.hypothesis_id?hyp(l.hypothesis_id):null;
  var v=l.verdict?stChip(l.verdict):'<span class="chip">메모</span>';
  return '<div class="lsn"><div class="hd">'+(noWho?'':mono(p,'s')+'<span>'+esc(p.name)+'</span><span>·</span>')+'<span class="num">'+esc(l.date)+'</span>'+
    '<span style="margin-left:auto" class="chips">'+(l.symbol?'<span class="chip">'+esc(l.symbol)+'</span>':'')+v+'</span></div>'+
    '<p>'+esc(l.text)+'</p>'+(l.scenario?'<div class="sc">가설 · '+esc(l.scenario)+'</div>':'')+
    (H&&H.linked_pl_krw!=null?'<div class="sc num">연결 손익 <span class="'+cls(H.linked_pl_krw)+'">'+swon(H.linked_pl_krw)+'</span></div>':'')+'</div>';
}
function notes(pid){
  pid=pid||'all';
  var ls=(D.lessons||[]).filter(function(l){return pid==='all'||l.player===pid;}).slice().reverse();
  return '<div class="view"><div class="top"><h1>오답노트</h1></div><p class="meta">가설을 닫을 때 남긴 교훈입니다. 다른 선수의 교훈도 함께 봅니다.</p>'+
    filters('#/notes/',pid)+(ls.length?ls.map(function(l){return lessonRow(l,pid!=='all');}).join(''):'<div class="empty">아직 교훈이 없어요</div>')+'</div>';
}

/* ---------- 규칙 ---------- */
function rules(){
  var r=D.rules||[], ec=D.engine_conditions||[], er=D.earnings_confirmed||[];
  var h='<div class="view"><div class="top"><h1>규칙</h1></div>';
  h+='<section class="sec" style="margin-top:16px"><div class="lb t3" style="font-size:12px">규칙 1</div><p class="big-rule">'+esc((r[0]||'').replace(/^1\.\s*/,''))+'</p>'+
     '<div class="lb t3" style="font-size:12px;margin-top:16px">규칙 2</div><p class="big-rule" style="font-size:17px">'+esc((r[1]||'').replace(/^2\.\s*/,''))+'</p></section>';
  if(er.length){
    h+='<section class="sec"><div class="sec-h"><h2>확정 실적일</h2><span class="t3">심판 확인 · 회사 공지 기준</span></div>';
    er.forEach(function(e){var d=e.date.split('-');
      h+='<a class="erow" href="'+esc(e.source)+'" target="_blank" rel="noopener"><span><b>'+esc(e.symbol)+'</b> <span class="sub">'+esc(e.period)+'</span></span>'+
         '<span class="num">'+(+d[1])+'월 '+(+d[2])+'일 '+esc(e.when)+' <span class="sub">'+esc(e.session)+'</span></span></a>';});
    h+='</section>';
  }
  h+='<section class="sec"><div class="sec-h"><h2>엔진 조건</h2></div><ul class="rl">'+ec.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></section>';
  h+='<section class="sec"><div class="sec-h"><h2>점수</h2></div><ul class="rl">'+
     '<li>순위는 Profit Factor(총이익 ÷ 총손실)로 정합니다.</li>'+
     '<li>모든 매수에는 가설(시나리오, 근거, 확인 시점, 맞으면, 틀리면)이 있어야 합니다. 판정은 가격이 아니라 시나리오가 실제로 일어났는지로 합니다.</li>'+
     '<li>가설을 닫을 때는 교훈을 남깁니다. 기한이 지난 가설에 교훈이 없으면 새 매수가 막힙니다.</li>'+
     '<li>진행 중인 가설은 이유를 적고 수정할 수 있습니다. 원문과 수정 이력은 그대로 남습니다.</li></ul></section>';
  h+='<p class="disc">모의투자 · 가상 1천만원 · 실제 돈 아님. 투자 권유가 아닙니다. 시세는 Yahoo 기준이며 늦거나 바뀔 수 있습니다.<br>'+updLine()+'</p></div>';
  return h;
}

/* ---------- 라우터 ---------- */
function render(keep){
  var r=(location.hash||'#/').slice(2).split('/'), h, tab='home';
  if(r[0]==='p'){h=pPage(decodeURIComponent(r[1]||''),r[2]);tab='';}
  else if(r[0]==='feed'){h=feed(r[1]);tab='feed';}
  else if(r[0]==='rules'){h=rules();tab='rules';}
  else if(r[0]==='notes'){h=notes(r[1]);tab='notes';}
  else h=home();
  window.__chart=null;
  app.innerHTML=h;
  if(keep){var v=app.querySelector('.view');if(v)v.style.animation='none';}
  bindChart();
  [].forEach.call(document.querySelectorAll('.tabbar a'),function(a){var on=a.getAttribute('data-tab')===tab;a.className=on?'on':'';if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(!keep) window.scrollTo(0,0);
}
window.addEventListener('hashchange',function(){if(D)render();});
if('serviceWorker' in navigator && !window.__LEAGUE_DATA__ && location.protocol.indexOf('http')===0){navigator.serviceWorker.register('sw.js').catch(function(){});}
if(window.__LEAGUE_DATA__){D=window.__LEAGUE_DATA__;render();}
else{
  var q=new URLSearchParams(location.search), src=q.get('data')||'data.json';
  if(!/^[\w.\-]+\.json$/.test(src)) src='data.json';
  var load=function(first){
    return fetch(src+'?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
      if(first||!D||d.generated_at!==D.generated_at){var y=window.scrollY;D=d;render(!first);if(!first)window.scrollTo(0,y);}else liveBar();
    });
  };
  load(true).catch(function(){app.innerHTML='<div class="view"><div class="empty">데이터를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</div></div>';});
  setInterval(function(){load(false).catch(liveBar);},60000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&D)load(false).catch(function(){});});
}
})();
