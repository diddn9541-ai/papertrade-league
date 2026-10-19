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
function hms(iso,tz){try{return new Date(iso).toLocaleTimeString('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}catch(_){return '';}}
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
function etNow(){var p={};new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour12:false,weekday:'short',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value;});
  return {wd:p.weekday,min:(+p.hour%24)*60+(+p.minute)};}
function clockSession(){ // 시계 기준(휴장일은 모름): 데이터가 늦을 때만 보조로 사용
  var n=etNow(); if(n.wd==='Sat'||n.wd==='Sun') return 'weekend';
  return n.min>=240&&n.min<570?'pre':(n.min>=570&&n.min<960?'regular':(n.min>=960&&n.min<1200?'post':'night'));
}
var SESS={pre:'프리장',regular:'정규장',post:'애프터장',night:'장외',weekend:'주말 휴장',holiday:'휴장일',closed:'장외',unknown:'장 상태 확인 중'};
function mktSession(m){
  if(m.tradable||m.open) return m.session||'regular';
  var r=m.reason||''; if(/주말/.test(r)) return 'weekend'; if(/휴장/.test(r)) return 'holiday'; if(/실패/.test(r)) return 'unknown';
  return 'night';
}
function mktPill(){
  var m=D.market||{}, chk=m.checked_at||D.generated_at, age=(Date.now()-new Date(chk).getTime())/6e4;
  var s=mktSession(m), stale=age>15;
  if(stale){var c2=clockSession(); if(c2!==s&&!(s==='holiday'&&c2!=='weekend')) s=c2;}
  var live=s==='pre'||s==='regular'||s==='post';
  var c=live?(stale?'mkt stale':'mkt on'):'mkt', t=SESS[s]||'장외';
  if(stale) t+=' · 갱신 지연';
  return '<span class="'+c+'" id="mkt"><i></i>'+t+'</span>';
}
function quoteLine(){
  var p=D.prices||{};
  if(p.as_of) return '시세 '+hms(p.as_of,ET)+' ET 기준'+(p.live?' · 실시간':'');
  if(p.close_date) return '시세 '+p.close_date.slice(5).replace('-','/')+' 종가 기준';
  return '';
}
function updLine(){var q=quoteLine();return '갱신 '+hm(D.generated_at,ET)+' ET · '+hm(D.generated_at,KST)+' KST'+(q?' · '+q:'');}
function liveBar(){var a=document.getElementById('mkt');if(a)a.outerHTML=mktPill();var b=document.getElementById('upd');if(b)b.textContent=updLine();var c=document.getElementById('updq');if(c)c.textContent=quoteLine()||updLine();}

/* ---------- 앱(APK) 새 버전 안내: 화면은 항상 원격이라 앱 자체를 바꿀 때만 뜸 ---------- */
function appVer(){var m=/PapertradeLeagueApp\/([\d.]+)(?:.*?vc\/(\d+))?/.exec(navigator.userAgent);if(!m)return null;return {name:m[1],code:m[2]?+m[2]:1};}
function appBanner(){
  var v=appVer(), a=D.app; if(!v||!a||!(a.version_code>v.code)) return '';
  return '<a class="appnew" href="'+esc(a.url)+'" target="_blank" rel="noopener"><b>앱 새 버전 '+esc(a.version_name)+' 있음</b><span>눌러서 받기 · 지금 앱 위에 덮어 설치(데이터 삭제 불필요)</span></a>';
}

/* ---------- 실시간 시세: live 브랜치의 30초 버킷 (빌드 없이 수십 초) ---------- */
var LIVE={q:null,ts:null,last:0,lag:0,timer:null};
function liveApply(){
  if(!D||!LIVE.q) return;
  if(D.prices&&D.prices.as_of&&LIVE.ts&&new Date(D.prices.as_of)>=new Date(LIVE.ts)&&!D.prices.live) return;
  var q=LIVE.q, latest=null;
  (D.players||[]).forEach(function(p){
    var dv=0;
    (p.holdings||[]).forEach(function(h){
      var x=q[h.symbol]; if(!x||!h.shares||!h.last) return;
      var fx=h.value_krw/(h.shares*h.last), nv=h.shares*x.p*fx;
      dv+=nv-h.value_krw; h.value_krw=nv; h.last=x.p; h.quote_time=x.t;
      if(h.avg_cost) h.pl_pct=(x.p/h.avg_cost-1)*100;
      if(x.pc) {h.prev_close=x.pc; h.day_pct=(x.p/x.pc-1)*100;}
      if(!latest||x.t>latest) latest=x.t;
    });
    if(dv){var base=p.equity_krw-p.pl_krw; p.equity_krw+=dv; p.pl_krw+=dv; if(base) p.return_krw_pct=p.pl_krw/base*100;}
  });
  D.prices=D.prices||{}; D.prices.as_of=LIVE.ts||latest; D.prices.live=true;  // 기준 시각 = 시세를 조회한 시각
}
function livePoll(){
  var f=D&&D.live_feed, m=D&&D.market||{};
  if(!f||!f.base) return;
  var s=mktSession(m); if(s!=='pre'&&s!=='regular'&&s!=='post') return;
  var b=f.bucket||30, want=Math.floor((Date.now()/1000-(f.ready_after_s||20)-LIVE.lag)/b)*b;
  if(want<LIVE.last||(want===LIVE.last&&!LIVE.retry)) return;
  var url=f.base+want+'.json'+(want===LIVE.last&&LIVE.retry?'?r='+LIVE.retry:'');
  LIVE.last=want;
  fetch(url,{cache:'default'}).then(function(r){
    if(!r.ok){ // 404가 CDN에 캐시됐을 수 있음 → 같은 버킷을 다른 키로 한 번 더, 그다음엔 여유를 늘림
      if(!LIVE.retry){LIVE.retry=1;} else {LIVE.retry=0;LIVE.lag=Math.min(LIVE.lag+b,2*b);}
      throw 0;}
    LIVE.retry=0;
    return r.json();
  }).then(function(x){
    if(!x||!x.q) return; LIVE.lag=Math.max(0,LIVE.lag-5);
    LIVE.q=x.q; LIVE.ts=x.ts; var y=window.scrollY; liveApply(); render(true); window.scrollTo(0,y);
  }).catch(function(){});
}

/* ---------- 홈 ---------- */
function kwon(x,sign){ // 큰 금액은 억/만 단위로 축약(말줄임 없이)
  x=Math.round(Number(x)||0); var s=sign?(x>0?'+':x<0?'-':''):(x<0?'-':''), v=Math.abs(x);
  if(v>=1e8) return s+(v/1e8).toFixed(2).replace(/\.?0+$/,'')+'억원';
  if(v>=1e7&&sign) return s+(v/1e4).toLocaleString('ko-KR',{maximumFractionDigits:1})+'만원';
  return s+n0(v)+'원';
}
function dayBase(p){ // 오늘 변동의 기준: 오늘 이전 마지막 자산(없으면 시작금 1천만원)
  var t=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}), hs=p.equity_hist||[], b=null;
  for(var i=hs.length-1;i>=0;i--){if(hs[i].date<t){b=hs[i].krw;break;}}
  return b||(p.equity_krw-p.pl_krw);
}
function holdLine(p){
  var hs=(p.holdings||[]).filter(function(h){return h.shares>0;}), eq=p.equity_krw||1, c=Math.round((p.cash_krw||0)/eq*100);
  var a=hs.slice().sort(function(x,y){return (y.value_krw||0)-(x.value_krw||0);});
  var t=a.slice(0,2).map(function(h){return esc(h.symbol)+' '+n0(h.shares)+'주';}).join(' · ');
  if(a.length>2) t+=' 외 '+(a.length-2)+'종목';
  return (t?t+' · ':'')+'현금 '+c+'%';
}
function chg(lb,v,base){
  var r=base?v/base*100:0;
  return '<div class="pc-c"><span class="pc-l">'+lb+'</span><span class="num '+cls(v)+'">'+kwon(v,true)+' <span class="pc-p">'+pct(r)+'</span></span></div>';
}
function pcard(p){
  var base=dayBase(p), d=(p.equity_krw||0)-base, eqs=kwon(p.equity_krw);
  return '<a class="pc" href="#/p/'+esc(p.id)+'"><div class="pc-h">'+mono(p,'s')+'<span class="pc-n">'+esc(p.name)+'</span>'+
    '<span class="pc-pf num">PF '+pfTxt(p.profit_factor)+'</span></div>'+
    '<div class="pc-eq num'+(eqs.length>11?' sm':'')+'">'+eqs+'</div>'+
    '<div class="pc-cs">'+chg('오늘',d,base)+chg('누적',p.pl_krw||0,p.equity_krw-p.pl_krw)+'</div>'+
    '<div class="pc-f num">'+holdLine(p)+'</div>'+
    '<div class="pc-f num">총이익 <span class="'+cls(p.gross_gain_krw)+'">'+kwon(p.gross_gain_krw||0,true)+'</span> · 총손실 <span class="'+cls(p.gross_loss_krw)+'">'+kwon(p.gross_loss_krw||0,true)+'</span></div></a>';
}
function home(){
  var h='<div class="view"><div class="top"><h1>모의투자 리그</h1>'+mktPill()+'</div>'+
    '<div class="meta num">가상 1천만원 · <span id="updq">'+(quoteLine()||updLine())+'</span></div>';
  h+=appBanner();
  h+='<section class="sec sec-first">';
  (D.players||[]).forEach(function(p){h+=pcard(p);});
  h+='</section>';
  // 오늘의 거래: 오늘(ET) 체결·판정만 최신순 3줄, 없으면 섹션 숨김
  var etd=function(t){try{return new Date(t).toLocaleDateString('en-CA',{timeZone:ET});}catch(_){return '';}};
  var today=etd(new Date().toISOString());
  var evs=(D.events||[]).filter(function(e){return (e.kind==='FILL'||(e.kind==='VERDICT'&&VD[e.verdict]))&&etd(e.time)===today;})
    .map(function(e,i){return [e,i];}).sort(function(x,y){return x[0].time<y[0].time?1:x[0].time>y[0].time?-1:y[1]-x[1];})
    .slice(0,3).map(function(x){return x[0];});
  if(evs.length){
    h+='<section class="sec"><div class="sec-h"><h2>오늘 체결·판정</h2><a class="t3" href="#/feed">전체 보기</a></div>';
    h+=evs.map(txRow).join('')+'</section>';
  }
  h+='</div>';
  return h;
}
var VD={confirmed:'입증',refuted:'반증',expired:'기한 만료'};
function txRow(e){
  var p=player(e.player), nm=esc(p.name), t=hm(e.time,ET)+' ET';
  if(e.kind==='VERDICT'){
    var c=e.verdict==='confirmed'?'up':e.verdict==='refuted'?'down':'flat';
    return '<div class="tx">'+mono(p,'s')+'<div class="tx-b"><div class="tx-t">'+nm+' · '+esc(e.hypothesis_id||'')+' <span class="'+c+'">'+VD[e.verdict]+'</span></div></div><div class="tx-r"><div class="tx-s num">'+t+'</div></div></div>';
  }
  var buy=e.side==='BUY', r;
  if(buy) r='<div class="tx-v num">'+won((e.shares||0)*(e.price||0)*fx())+'</div>';
  else r=e.realized_pl_krw!=null?'<div class="tx-v num '+cls(e.realized_pl_krw)+'">'+swon(e.realized_pl_krw)+'</div>':'';
  return '<div class="tx">'+mono(p,'s')+'<div class="tx-b"><div class="tx-t">'+nm+' · '+esc(e.symbol)+' '+(buy?'매수':'매도')+'</div>'+
    '<div class="tx-s num">'+n0(e.shares)+'주 · $'+Number(e.price||0).toFixed(2)+' · '+t+'</div></div><div class="tx-r">'+r+'</div></div>';
}

/* ---------- 이벤트 행 (홈·중계 공용) ---------- */
function evRow(e,showWho){
  var p=player(e.player), H=e.hypothesis_id?hyp(e.hypothesis_id):null, title=H?H.scenario:'';
  var who=showWho?mono(p,'s')+'<span class="who">'+esc(p.name)+'</span>':'';
  var tm='<div class="tm num">'+hm(e.time,KST)+'</div>';
  if(e.kind==='FILL'){
    var amt=(e.shares||0)*(e.price||0)*fx(), buy=e.side==='BUY';
    var src={intraday:'정규장 최신가',premarket:'프리장 최신가',afterhours:'애프터장 최신가',open:'시가'}[e.fill_source]||'체결';
    return '<div class="ev">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+esc(e.symbol)+' '+n0(e.shares)+'주 '+(buy?'매수':'매도')+'</span>'+
      '<span class="amt num">'+won(amt)+'</span></div>'+
      '<div class="l2 num">'+src+' $'+Number(e.price||0).toFixed(2)+((e.fill_source==='intraday'||e.fill_source==='premarket'||e.fill_source==='afterhours')?' · 최대 15분 지연 시세':'')+' · 비용 '+won(e.cost_krw)+'</div>'+
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
      '<div class="l2">프리·정규·애프터장(04:00~20:00 ET)이면 바로 체결, 그 밖엔 다음 프리장</div>'+(title?'<div class="hq">'+esc(title)+'</div>':'')+'</div></div>';
  }
  if(e.kind==='AMEND'){
    var ch=Object.keys(e.changes||{}).map(function(k){return {check_by:'확인 시점',confirm_if:'맞으면',refute_if:'틀리면',market_view:'시장 예상',my_edge:'나의 괴리',if_right:'적중 시',edge_test:'괴리 검증'}[k]||k;}).join(', ');
    return '<div class="ev">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+esc(e.symbol)+' 가설 수정</span></div>'+
      '<div class="l2">'+esc(ch)+' 변경 · '+esc(e.reason||'')+'</div>'+(title?'<div class="hq">'+esc(title)+'</div>':'')+'</div></div>';
  }
  if(e.kind==='REJECT'){
    var foul=e['class']?e['class']==='foul':/^(규칙 2 위반|복기 필요)/.test(e.why||'');
    var what={FILE:'주문 파일',VERDICT:'판정',AMEND:'가설 수정',BUY:'매수',SELL:'매도',CANCEL:'주문 취소',RESIZE:'주문 축소',LESSON:'교훈',RETIRE:'교훈 폐기'}[e.side]||'주문';
    return '<div class="ev'+(foul?' foul':'')+'">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+(e.symbol?esc(e.symbol)+' ':'')+what+(foul?' 반칙':' 반려')+'</span>'+
      (foul?'<span class="amt"><span class="chip warn">반칙</span></span>':'')+'</div>'+
      '<div class="l2">'+esc(e.why||'')+(foul?'':' · 고쳐서 다시 제출하면 됩니다')+'</div></div></div>';
  }
  if(e.kind==='CANCEL'||e.kind==='RESIZE'){
    var sd=(e.side==='BUY'?'매수':'매도'), unit=function(v){return e.field==='shares_req'?esc(v)+'주':won(v);};
    var l2=e.kind==='CANCEL'?'체결 전 취소':'체결 전 축소 '+unit(e.from)+' → '+unit(e.to);
    return '<div class="ev">'+tm+'<div class="bd"><div class="l1">'+who+'<span>'+esc(e.symbol)+' '+sd+' 주문 '+(e.kind==='CANCEL'?'취소':'축소')+'</span></div>'+
      '<div class="l2">'+l2+' · '+esc(e.reason||'')+'</div>'+(title?'<div class="hq">'+esc(title)+'</div>':'')+'</div></div>';
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
  var x='<article class="hyp"><div class="hd"><span class="sym">'+esc(h.symbol)+' · '+esc(h.id)+'</span><span class="chips">'+dchip+(h.no_position?'<span class="chip no">포지션 없음</span>':(h.status==='open'&&h.remaining_shares===0?'<span class="chip no">전량 매도</span>':(h.status==='open'&&h.remaining_shares>0?'<span class="chip">보유 '+h.remaining_shares+'주</span>':'')))+
    (h.edge_result?'<span class="chip'+(h.edge_result==='edge'?' ok':'')+'">'+({edge:'괴리 적중',consensus:'컨센서스 적중',refuted:'반증'}[h.edge_result]||'')+'</span>':'')+(h.record_only?'<span class="chip warn">기록용 판정 대기</span>':stChip(h.status))+'</span></div>'+
    '<h3>'+esc(h.scenario||'')+'</h3>'+
    '<div class="ln"><b>맞으면</b><span>'+esc(h.confirm_if||'')+'</span></div>'+
    '<div class="ln"><b>틀리면</b><span>'+esc(h.refute_if||'')+'</span></div>'+
    '<div class="ln"><b>확인</b><span class="num">'+esc(h.check_by||'')+'</span></div>'+
    (h.market_view?'<div class="ln"><b>시장 예상</b><span>'+esc(h.market_view)+'</span></div>':'')+
    (h.my_edge?'<div class="ln"><b>나의 괴리</b><span>'+esc(h.my_edge)+'</span></div>':'')+
    (h.edge_test?'<div class="ln"><b>괴리 검증</b><span>'+esc(h.edge_test)+'</span></div>':'')+
    (h.if_right?'<div class="ln"><b>적중 시</b><span>'+esc(h.if_right)+'</span></div>':'')+
    ((live&&!h.my_edge)?'<div class="ln"><b>괴리</b><span class="t3">아직 안 적음 (기존 가설 · 수정으로 추가 가능)</span></div>':'');
  if(h.why) x+='<details><summary>근거 보기</summary><div class="body">'+esc(h.why)+'</div></details>';
  var oc=h.order_changes||[];
  if(oc.length) x+='<div class="ln"><b>주문</b><span>'+oc.map(function(c){return c.action==='cancel'?'취소 · '+esc(c.reason||''):'축소 '+(c.field==='shares_req'?esc(c.from)+'주 → '+esc(c.to)+'주':won(c.from)+' → '+won(c.to))+' · '+esc(c.reason||'');}).join('<br>')+'</span></div>';
  var am=h.amendments||[];
  if(am.length){
    x+='<details><summary>수정 이력 '+am.length+'회 · 원문 보존</summary><div class="body">';
    am.forEach(function(a){
      x+='<div class="amend"><div class="t3 num">'+kday(a.time)+' '+hm(a.time,KST)+' KST · '+esc(a.reason||'')+'</div>';
      Object.keys(a.changes||{}).forEach(function(k){var c=a.changes[k];
        x+='<div>'+({check_by:'확인',confirm_if:'맞으면',refute_if:'틀리면',market_view:'시장 예상',my_edge:'나의 괴리',if_right:'적중 시',edge_test:'괴리 검증'}[k]||k)+': <span class="old">'+esc(c.from)+'</span> → '+esc(c.to)+'</div>';});
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

function concBox(c){
  if(!c||!c.exposure_krw) return '';
  var hi=function(v){return v!=null&&v>50?' hi':'';}, P=function(v){return v==null?'—':Math.round(v)+'%';};
  var rows=(c.by_symbol||[]).slice(0,4).map(function(x){return '<span class="cv'+hi(x.pct)+'">'+esc(x.symbol)+' '+P(x.pct)+'</span>';}).join('');
  var dts=(c.by_check_date||[]).slice(0,3).map(function(x){return '<span class="cv'+hi(x.pct)+'">'+esc(x.dates.map(function(d){return d.slice(5).replace('-','/');}).join('·'))+' '+P(x.pct)+'</span>';}).join('');
  var ov=c.overlap||[];
  var ovt=ov.length?ov.map(function(o){return esc(o.symbol)+' '+esc(o.check_by.slice(5).replace('-','/'))+' · '+esc(o.with.join(', '));}).join('<br>'):'없음';
  return '<section class="sec conc"><div class="sec-h"><h2>쏠림</h2><span class="t3">보유+대기 매수 · 총자산 대비 · 막지 않음</span></div>'+
    '<div class="kv2"><span class="t3">한 종목</span><span class="cvs">'+rows+'</span></div>'+
    '<div class="kv2"><span class="t3">같은 확인 시점</span><span class="cvs">'+(dts||'—')+'</span></div>'+
    '<div class="kv2"><span class="t3">다른 선수와 겹침</span><span class="cvs"><span class="cv'+hi(c.overlap_pct_of_equity)+'">'+P(c.overlap_pct_of_equity)+'</span></span></div>'+
    (ov.length?'<div class="kv2"><span class="t3"></span><span class="t2 sm">'+ovt+'</span></div>':'')+'</section>';
}
/* ---------- 선수 페이지 ---------- */
function pPage(id,tab){
  var p=player(id); if(!p||!p.equity_hist) return '<div class="view"><div class="empty">선수를 찾을 수 없어요</div></div>';
  tab=tab||'open';
  var h='<div class="view"><div class="top"><a class="back" href="#/" aria-label="뒤로">'+ICON.back+'</a>'+mktPill()+'</div>';
  h+='<div class="ph"><div class="who">'+mono(p,'s')+'<span>'+esc(p.name)+'</span>'+((D.events||[]).some(function(e){return e.kind==='FILL';})?'<span class="t3">· '+p.rank+'위</span>':'')+'</div>'+
     '<div class="eq num">'+won(p.equity_krw)+'</div>'+
     '<div class="pl num '+cls(p.pl_krw)+'">'+swon(p.pl_krw)+' ('+pct(p.return_krw_pct)+')</div>'+
     '<div class="vs num">QQQ 대비 '+(p.vs_qqq_pct==null?'—':pct(p.vs_qqq_pct))+' · 현금 '+won(p.cash_krw)+'</div>'+(quoteLine()?'<div class="vs num t3">'+quoteLine()+'</div>':'')+'</div>';
  h+=chart(p);
  h+='<div class="stats num">'+
     '<div><div class="lb">Profit Factor</div><div class="v">'+pfTxt(p.profit_factor)+'</div></div>'+
     '<div><div class="lb">총이익</div><div class="v '+cls(p.gross_gain_krw)+'">'+swon(p.gross_gain_krw||0)+'</div></div>'+
     '<div><div class="lb">총손실</div><div class="v '+cls(p.gross_loss_krw)+'">'+swon(p.gross_loss_krw||0)+'</div></div>'+
     '<div><div class="lb">평균이익÷평균손실</div><div class="v">'+(p.payoff_ratio==null?'—':Number(p.payoff_ratio).toFixed(2))+'</div></div>'+
     '<div><div class="lb">평균 이익</div><div class="v '+cls(p.avg_win_krw)+'">'+(p.avg_win_krw==null?'—':swon(p.avg_win_krw))+'</div></div>'+
     '<div><div class="lb">평균 손실</div><div class="v '+cls(p.avg_loss_krw)+'">'+(p.avg_loss_krw==null?'—':swon(p.avg_loss_krw))+'</div></div></div>'+
     '<p class="meta sub num">최대 수익 '+swon(p.biggest_win_krw)+' · 최대 손실 '+swon(p.biggest_loss_krw)+' · 최대 낙폭 '+pct(p.max_drawdown_pct)+
     ' · 적중률 '+(p.hit_rate_pct==null?'—':Math.round(p.hit_rate_pct)+'%')+' · 괴리 적중률 '+(p.edge_hit_rate_pct==null?'—':Math.round(p.edge_hit_rate_pct)+'%')+
     (p.n_edge_judged?' (괴리 '+p.n_edge_hit+' · 컨센서스 '+p.n_consensus_hit+')':'')+'</p>'+concBox(p.concentration);
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
  var ro=mine.filter(function(x){return x.record_only;});
  var op=mine.filter(function(x){return (x.status==='open'||x.status==='pending_fill')&&!x.record_only;}), cl=mine.filter(function(x){return op.indexOf(x)<0&&ro.indexOf(x)<0;});
  var list=tab==='closed'?cl:op;
  h+='<section class="sec"><div class="sec-h"><h2>가설</h2><span class="t3 num">맞음 '+(p.n_confirmed||0)+' · 틀림 '+(p.n_refuted||0)+'</span></div>'+
     '<div class="seg"><a href="#/p/'+esc(p.id)+'/open" class="'+(tab!=='closed'?'on':'')+'">진행중 '+op.length+'</a><a href="#/p/'+esc(p.id)+'/closed" class="'+(tab==='closed'?'on':'')+'">종료 '+cl.length+'</a></div>';
  h+=list.length?list.slice().reverse().map(hypCard).join(''):'<div class="empty">'+(tab==='closed'?'종료된 가설이 없어요':'진행 중인 가설이 없어요')+'</div>';
  if(tab!=='closed'&&ro.length) h+='<details class="ro"><summary>기록용 판정 대기 '+ro.length+' <span class="t3">포지션 없음 · check_by에 판정만 기록 · PF·손익과 무관</span></summary>'+ro.slice().reverse().map(hypCard).join('')+'</details>';
  h+='</section>';
  // 교훈
  var ls=(D.lessons||[]).filter(function(l){return l.player===p.id;}).slice().reverse();
  h+='<section class="sec"><div class="sec-h"><h2>교훈</h2><a class="t3" href="#/notes/'+esc(p.id)+'">오답노트</a></div>';
  h+=ls.length?ls.slice(0,3).map(function(l){return lessonRow(l,true);}).join(''):'<div class="empty">아직 교훈이 없어요</div>';
  return h+'</section></div>';
}

/* ---------- 오답노트 ---------- */
function scLine(g,nm){
  if(!g||!g.n) return '';
  var pf=g.pf==null?'—':(g.pf==='inf'?'∞':Number(g.pf).toFixed(2));
  return '<div class="scr"><span class="t3">'+nm+'</span><span class="num">'+g.n+'건'+(g.n_eval<g.n?' · 평가 '+g.n_eval:'')+'</span>'+
    (g.n_eval?'<span class="num '+cls(g.pl_krw)+'">'+swon(g.pl_krw)+'</span><span class="num t2">PF '+pf+'</span>'+(g.hit_rate_pct!=null?'<span class="num t2">적중 '+g.hit_rate_pct+'%</span>':''):'<span class="t3">결과 대기</span>')+'</div>';
}
function lessonRow(l,noWho){
  var p=player(l.player), H=l.hypothesis_id?hyp(l.hypothesis_id):null;
  var v=l.verdict?stChip(l.verdict):'<span class="chip">메모</span>';
  var CN=(D.lesson_causes||{}), sv=l.status_view||l.status||'active';
  var cz=l.cause?'<span class="chip cause-'+esc(l.cause)+'">'+esc(CN[l.cause]||l.cause)+'</span>':'';
  var stc=sv==='retired'?'<span class="chip no">폐기</span>':(sv==='review'?'<span class="chip warn">재검토</span>':'');
  var ref=l.cause==='luck'?'<div class="sc">참고용 · 행동 규칙이 아니에요</div>':'';
  var cond=(l.applies_when?'<div class="kv"><span class="t3">유효 조건</span><span>'+esc(l.applies_when)+'</span></div>':'')+
    (l.expires_if?'<div class="kv"><span class="t3">무효 조건</span><span>'+esc(l.expires_if)+'</span></div>':'')+
    (l.n_cases!=null&&l.n_cases!==''?'<div class="kv"><span class="t3">근거 사례</span><span class="num">'+esc(l.n_cases)+'건</span></div>':'');
  var sc=l.scorecard||{}, scr=scLine(sc.follow,'따름')+scLine(sc.override,'거스름');
  var rv=(sv==='review'&&sc.review_why&&sc.review_why.length)?'<div class="note-warn"><i></i>재검토 · '+esc(sc.review_why.join(' · '))+'</div>':'';
  var rt=sv==='retired'&&l.retired?'<div class="sc">폐기 '+esc(l.retired.date||'')+' · '+esc(l.retired.reason||'')+'</div>':'';
  return '<div class="lsn'+(sv==='retired'?' retired':'')+'"><div class="hd">'+(noWho?'':mono(p,'s')+'<span>'+esc(p.name)+'</span><span>·</span>')+'<span class="num">'+esc(l.date)+'</span>'+
    '<span style="margin-left:auto" class="chips">'+v+'</span></div>'+
    ((l.symbol||cz||stc)?'<div class="chips tags">'+(l.symbol?'<span class="chip">'+esc(l.symbol)+'</span>':'')+cz+stc+'</div>':'')+
    '<p>'+esc(l.text)+'</p>'+ref+(cond?'<div class="kvs">'+cond+'</div>':'')+(scr?'<div class="scs">'+scr+'</div>':'')+rv+rt+
    (l.scenario?'<div class="sc">가설 · '+esc(l.scenario)+'</div>':'')+
    (H&&H.linked_pl_krw!=null?'<div class="sc num">연결 손익 <span class="'+cls(H.linked_pl_krw)+'">'+swon(H.linked_pl_krw)+'</span></div>':'')+'</div>';
}
function crowd(){
  return (D.lesson_crowding||[]).map(function(c){return '<div class="note-warn"><i></i>참고 · 세 선수 모두 교훈 '+esc(c.lesson_id)+'을 따라 '+esc(c.symbol)+'에 몰려 있어요</div>';}).join('');
}
function notes(pid){
  pid=pid||'all';
  var ls=(D.lessons||[]).filter(function(l){return pid==='all'||l.player===pid;}).slice().reverse();
  return '<div class="view"><div class="top"><h1>오답노트</h1></div><p class="meta">교훈도 검증 대상이에요. 따른 판단과 거스른 판단의 성과를 함께 봅니다. 다른 선수의 교훈은 참고만 하고 자기 증거로 다시 판단하세요.</p>'+
    crowd()+filters('#/notes/',pid)+(ls.length?ls.map(function(l){return lessonRow(l,pid!=='all');}).join(''):'<div class="empty">아직 교훈이 없어요</div>')+'</div>';
}

/* ---------- 규칙 ---------- */
function rules(){
  var r=D.rules||[], ec=D.engine_conditions||[], er=D.earnings_confirmed||[];
  var h='<div class="view"><div class="top"><h1>규칙</h1></div>';
  h+='<section class="sec" style="margin-top:16px"><div class="lb t3" style="font-size:12px">규칙 1</div><p class="big-rule">'+esc((r[0]||'').replace(/^1\.\s*/,''))+'</p>'+
     '<div class="lb t3" style="font-size:12px;margin-top:16px">규칙 2</div><p class="big-rule" style="font-size:17px">'+esc((r[1]||'').replace(/^2\.\s*/,''))+'</p>'+
     (r[2]?'<div class="lb t3" style="font-size:12px;margin-top:16px">규칙 3</div><p class="big-rule" style="font-size:17px">'+esc(r[2].replace(/^3\.\s*/,''))+'</p><p class="t3" style="font-size:12.5px;margin-top:6px">엔진 장치: 새 매수 가설은 시장 예상(market_view)·내 판단(my_edge)·맞을 때 계획(if_right)·괴리 검증법(edge_test)이 없으면 반려</p><p class="t3" style="font-size:12.5px;margin-top:6px">갈아타기: 보유 종목보다 손익비가 더 좋은 자리를 찾으면 보유분을 팔고 갈아타도 된다. 왕복 비용(약 0.9%)을 빼고도 새 자리의 기대 손익비가 확실히 높을 때만 하고, 매도 사유에 \u2018갈아타기: &lt;새 가설 id&gt;\u2019를 남긴다. 판 가설은 기록용 판정 대기로 간다.</p>':'')+'</section>';
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
if('serviceWorker' in navigator && !window.__LEAGUE_DATA__ && location.protocol.indexOf('http')===0){
  var hadCtl=!!navigator.serviceWorker.controller, reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){if(hadCtl&&!reloaded){reloaded=true;location.reload();}});
  navigator.serviceWorker.register('sw.js').then(function(r){r.update();setInterval(function(){r.update();},30*6e4);}).catch(function(){});
}
if(window.__LEAGUE_DATA__){D=window.__LEAGUE_DATA__;render();}
else{
  var q=new URLSearchParams(location.search), src=q.get('data')||'data.json';
  if(!/^[\w.\-]+\.json$/.test(src)) src='data.json';
  var load=function(first){
    return fetch(src+'?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
      if(first) BUILD0=d.web_build;
      else if(d.web_build&&BUILD0&&d.web_build!==BUILD0){location.reload();return;}
      if(first||!D||d.generated_at!==D.generated_at){var y=window.scrollY;D=d;liveApply();render(!first);if(!first)window.scrollTo(0,y);}else liveBar();
    });
  };
  load(true).catch(function(){app.innerHTML='<div class="view"><div class="empty">데이터를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</div></div>';});
  var BUILD0=null;
  setInterval(function(){load(false).catch(liveBar);},60000);
  setInterval(livePoll,5000); setTimeout(livePoll,1500);
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&D){load(false).catch(function(){});livePoll();}});
}
})();
