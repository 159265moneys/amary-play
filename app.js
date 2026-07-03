'use strict';
/* ============ Amary — Pairs-style scrollable profile / swipe-horror ============ */

const PHOTO_BASE = '写真素材';
const PHOTOS_PER = 5;
const START_LIVES = 3;
const DANGER_RATE = 0.5;
let DEBUG = false;

const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const paintIcons=root=>root.querySelectorAll('[data-icon]').forEach(el=>{if(ICON[el.dataset.icon])el.innerHTML=ICON[el.dataset.icon];});

/* ---- interest tags (Pairs風コミュニティ). order = 4x4 grid split order ---- */
const TAGS=[
  {id:'izakaya',label:'居酒屋がすき'},{id:'senbero',label:'せんべろすき'},{id:'game',label:'ゲームしたい'},{id:'cafe',label:'カフェ巡り'},
  {id:'movie',label:'映画好き'},{id:'travel',label:'旅行したい'},{id:'sauna',label:'サウナー'},{id:'ramen',label:'ラーメン好き'},
  {id:'cooking',label:'料理がすき'},{id:'sake',label:'お酒好き'},{id:'festival',label:'フェス好き'},{id:'cat',label:'猫と暮らす'},
  {id:'dog',label:'犬すき'},{id:'gym',label:'筋トレ'},{id:'drive',label:'ドライブ'},{id:'camera',label:'カメラ・写真'},
];
const tagImg=t=>encodeURI(`assets/tags/${t.id}.png`);

const WANT_POOL=['まずは友達から','恋人募集','気軽に話したい','結婚を視野に','価値観の合う人'];
const AREA_POOL=['東京都','神奈川県','埼玉県','千葉県'];

/* ---- 基本情報ジェネレータ（人物ごとに固定＝seed付きPRNG） ----
   項目セットは国内マチアプの業界共通項目（複数社共通のものだけ採用） */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const OCC_KEYWORDS=[['看護師','看護師'],['営業','営業'],['自営業','自営業（経営者）'],['保育士','保育士'],['美容','美容関係'],['アパレル','アパレル・服飾'],['エンジニア','ITエンジニア'],['公務員','公務員'],['事務','事務職'],['医療','医療関係'],['カフェ','飲食・カフェ'],['デザイナー','デザイナー'],['フリーランス','フリーランス'],['教師','教育関係'],['金融','金融関係'],['不動産','不動産']];
function occupationFromBio(bio,r,gender){
  for(const [k,v] of OCC_KEYWORDS){ if(bio.includes(k)) return v; }
  const M=['営業','ITエンジニア','メーカー勤務','公務員','金融関係','不動産','クリエイター','医療関係'];
  const F=['事務職','看護師','保育士','アパレル・服飾','美容関係','受付','ITエンジニア','医療関係'];
  const pool=gender==='M'?M:F; return pool[(r()*pool.length)|0];
}
const HITOKOTO=['気軽にメッセージください！','週末飲みに行ける人探してます🍺','おいしいお店開拓したい人〜','まずは気軽に話しましょう','休日はだいたいカフェにいます','最近ジム通い始めました💪','聞き上手ってよく言われます','グルメな人と気が合います','インドアもアウトドアもいけます','日本酒に詳しくなりたい'];
function buildBasic(p){
  const r=mulberry32(p.id*7919+13);
  const g=p.gender, pk=pool=>pool[(r()*pool.length)|0];
  const height=g==='M'?165+((r()*21)|0):149+((r()*19)|0);
  const income=g==='F'&&r()<0.5?'非公開':pk(g==='M'?['400万〜600万','600万〜800万','800万〜1000万','400万〜600万','1000万〜1500万']:['200万〜400万','400万〜600万','非公開']);
  return {
    hitokoto:pk(HITOKOTO),
    rows:[
      ['身長',`${height}cm`],
      ['体型',pk(g==='M'?['スリム','普通','がっちり','ぽっちゃり']:['スリム','普通','グラマー','ぽっちゃり'])],
      ['血液型',pk(['A型','B型','O型','AB型'])],
      ['出身地',pk(['東京都','神奈川県','大阪府','福岡県','北海道','愛知県','埼玉県','千葉県','静岡県','広島県','宮城県','新潟県'])],
      ['兄弟姉妹',pk(g==='M'?['長男','次男','三男以上','一人っ子']:['長女','次女','三女以上','一人っ子'])],
      ['学歴',pk(['大学卒','大学卒','短大／専門卒','大学院卒','高校卒'])],
      ['職種',occupationFromBio(p.bio,r,g)],
      ['年収',income],
      ['休日',pk(['土日','土日','平日','不定期'])],
      ['お酒',pk(['飲む','ときどき飲む','飲まない'])],
      ['タバコ',pk(['吸わない','吸わない','吸わない','ときどき吸う','吸う（電子タバコ）'])],
      ['結婚歴',pk(['独身（未婚）','独身（未婚）','独身（未婚）','独身（離婚）'])],
      ['子どもの有無',pk(['なし','なし','なし','あり（別居）'])],
      ['結婚に対する意思',pk(['いい人がいればしたい','2〜3年のうちに','すぐにでもしたい','今のところ考えていない'])],
      ['初回デート費用',pk(g==='M'?['全て払う','多めに払う','割り勘']:['割り勘','相手と相談して決める'])],
      ['性格・タイプ',(()=>{const t=['明るい','マイペース','誠実','話し上手','聞き上手','インドア','アウトドア','面倒見が良い','楽観的','慎重'];const a=t[(r()*t.length)|0];let b=t[(r()*t.length)|0];while(b===a)b=t[(r()*t.length)|0];return a+'、'+b;})()],
      ['話せる言語',pk(['日本語','日本語','日本語','日本語・英語'])],
      ['同居人',pk(['一人暮らし','一人暮らし','家族と同居','ペットと暮らしています'])],
    ],
  };
}
/* 整合性ルール：乱数とキャラ上書きの合成結果に最後に強制する。
   プロフの矛盾は「偽の手がかり」になって冤罪死を生むため、ここで機械的に潰す */
function enforceConsistency(rows,p){
  const get=k=>{const r=rows.find(r=>r[0]===k);return r?r[1]:'';};
  const set=(k,v)=>{const r=rows.find(r=>r[0]===k);if(r)r[1]=v;};
  // 未婚なら子どもは「なし」（子持ち設定は結婚歴「独身（離婚）」等を明示した人物のみ）
  if(get('結婚歴').includes('未婚')) set('子どもの有無','なし');
  // 年齢と学歴の物理的整合（21歳以下で大卒は不可能、23歳以下で院卒は不自然）
  const edu=get('学歴');
  if(p.age<=21&&(edu==='大学卒'||edu==='大学院卒')) set('学歴', p.age>=20?'短大／専門卒':'高校卒');
  else if(p.age<=23&&edu==='大学院卒') set('学歴','大学卒');
  return rows;
}

/* キャラ個別データ(data.js)が持つ値で自動生成を上書きする */
function buildBasicFor(p){
  const b=buildBasic(p);
  if(p.hitokoto)b.hitokoto=p.hitokoto;
  if(p.basic){
    b.rows=b.rows.map(([k,v])=>[k, p.basic[k]!==undefined?p.basic[k]:v]);
    for(const k of Object.keys(p.basic)) if(!b.rows.some(row=>row[0]===k)) b.rows.push([k,p.basic[k]]);
  }
  b.rows=enforceConsistency(b.rows,p);
  return b;
}
const QA=[['理想の休日は？','家でのんびり派、たまに遠出'],['好きな食べ物','無限に食べられるお寿司'],['最近ハマってること','近所のカフェ開拓'],['一緒に行きたい場所','夜景の見えるところ'],['性格を一言で','マイペースってよく言われます']];
/* UI異変・プロフ異変は当面停止（プロフは全員まとも表記）。後で人物指定で個別に有効化する */
const UI_TELLS=[];

/* ============ run state ============ */
let run=[],idx=0,lives=START_LIVES,matched=0;
const stampLike=document.getElementById('stampLike');
const stampNope=document.getElementById('stampNope');

/* 実画像があるプロフィールだけ出す（画像未実装の人物はプレースホルダで出さない） */
function roster(){
  return PROFILES.filter(p=>{
    const m=(window.PHOTOS||{})[p.folder];
    return m && (Array.isArray(m)?m.length:(m.photos||[]).length);
  });
}
function buildRun(){
  return shuffle(roster()).map(p=>{
    let danger=Math.random()<DANGER_RATE;
    let tell=null;
    if(danger){
      // 異変は「写真の異変バリエーション（N-K-V.png）」のみ。無い人物は危険にならない
      const set=(window.PHOTOS||{})[p.folder];
      const anomalies=(set&&!Array.isArray(set)&&set.anomalies)||{};
      const sets=(set&&!Array.isArray(set)&&set.anomalySets)||[];   // N-K-2以降＝同時セット（manifest由来）
      // 【契約】候補は「単発1枚」または「定義済みセット」のどちらか一つだけ。偶発的な同時出しは構造上不可能
      const candidates=[
        ...Object.keys(anomalies).map(slot=>({single:slot})),
        ...sets.map(m=>({combo:m})),
      ];
      if(p.anomalySets&&p.anomalySets.length){   // data.jsでの手動セット指定（単発素材の組み合わせ）も候補化
        for(const combo of p.anomalySets){
          const m={}; for(const s of combo){ if(anomalies[s]) m[s]=pick(anomalies[s]); }
          if(Object.keys(m).length) candidates.push({combo:m});
        }
      }
      if(candidates.length){
        const c=pick(candidates);
        const swaps=c.single!==undefined ? {[c.single]:pick(anomalies[c.single])} : {...c.combo};
        tell={kind:'photo',swaps};
      }else if(UI_TELLS.length){
        tell={kind:'ui',type:pick(UI_TELLS)};
      }else{
        danger=false;   // 異変を出せないなら安全側に倒す（理不尽死ゼロの原則）
      }
    }
    const ui=(t)=>danger&&tell.kind==='ui'&&tell.type===t;
    return {
      p,danger,tell,
      tagList: p.tagIds ? p.tagIds.map(id=>TAGS.find(t=>t.id===id)).filter(Boolean)
                        : shuffle(TAGS.slice()).slice(0,4+(Math.random()*3|0)),
      want: p.want||pick(WANT_POOL),
      qa: p.qa||shuffle(QA.slice()).slice(0,2),
      // 居住地はキャラ指定 > bioの「都内」表記 > ランダム（矛盾＝偽tellで冤罪死を生むため）
      area: p.area||(/都内|東京/.test(p.bio)?'東京都':pick(AREA_POOL)),
      dist: ui('distance') ? '2m先' : `${rand(1,9).toFixed(1)}km先`,
      online: pick(['12分前にオンライン','3時間前にオンライン','1時間前にオンライン','オンライン中']),
      badge: true,
    };
  });
}

/* ============ image loading ============ */
function photoSet(entry){
  const m=(window.PHOTOS||{})[entry.p.folder];
  if(!m)return null;
  return Array.isArray(m)?{photos:m,anomalies:{}}:m;   // 旧形式(配列)も許容
}
function photoURL(entry,i){
  const t=entry.tell;
  if(t&&t.kind==='photo'&&t.swaps&&t.swaps[i]) return encodeURI(t.swaps[i]);   // 危険ラン＝該当スロットのみ異変verに差し替え
  const s=photoSet(entry);
  const path=(s&&s.photos[i])?s.photos[i]:`${PHOTO_BASE}/${entry.p.folder}/${i+1}.png`;
  return encodeURI(path);
}
const photoCount=entry=>{const s=photoSet(entry);return s&&s.photos.length?s.photos.length:PHOTOS_PER;};

function setPhoto(el,entry,i){
  // ロード中/失敗時は共通の汎用ローディング表示のみ（内部情報・ファイル名等は絶対に出さない）
  el.innerHTML=''; el.style.backgroundImage='none';
  el.classList.add('loading');
  const url=photoURL(entry,i), img=new Image();
  if('fetchPriority' in img) img.fetchPriority='high';   // 表示中の1枚を最優先
  img.onload=()=>{el.style.backgroundImage=`url("${url}")`;el.classList.remove('loading');};
  img.onerror=()=>{el.classList.remove('loading');};      // 失敗＝無地のまま（テキストなし）
  img.src=url; el.dataset.zoomsrc=url;
}

/* ============ render profile ============ */
function renderProfile(entry){
  const p=entry.p;
  const near=entry.dist.includes('m先')&&!entry.dist.includes('km');
  const isOn=entry.online.includes('オンライン')&&!entry.online.includes('前');
  const basic=buildBasicFor(p);
  const prof=document.getElementById('profile');
  prof.innerHTML=`
    <div class="photo-wrap">
      <div class="photo"></div>
      <div class="segs"></div>
      <div class="edge l"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></div>
      <div class="edge r"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></div>
      <div class="ph-grad"></div>
      <div class="ph-name"><span class="pn">${p.name}</span><span class="pa">${p.age}</span>
        ${entry.badge?`<span class="ci-badge">${ICON.check} 本人確認済</span>`:`<span class="ci-badge warn">${ICON.warn} 未確認</span>`}</div>
    </div>

    <div class="content">
      <div class="tsu"><span class="tsu-label">ひとこと</span>${basic.hitokoto}</div>

      <section class="c-sec">
        <h3 class="c-h">興味・関心</h3>
        <div class="tag-list">${entry.tagList.map(t=>`<div class="tagrow" style="background-image:url('${tagImg(t)}')"><span>${t.label}</span></div>`).join('')}</div>
      </section>

      <section class="c-sec">
        <h3 class="c-h">自己紹介</h3>
        <p class="c-bio">${p.bio}</p>
      </section>

      <section class="c-sec">
        <h3 class="c-h">基本情報</h3>
        <div class="c-info">
          <div class="irow"><span class="ik">年齢</span><span class="iv">${p.age}歳</span></div>
          <div class="irow"><span class="ik">居住地</span><span class="iv ${near?'danger':''}">${near?'すぐ近く・'+entry.dist:entry.area+'・'+entry.dist}</span></div>
          ${basic.rows.map(([k,v])=>`<div class="irow"><span class="ik">${k}</span><span class="iv">${v}</span></div>`).join('')}
          <div class="irow"><span class="ik">出会うまでの希望</span><span class="iv">${entry.want}</span></div>
          <div class="irow"><span class="ik">最終ログイン</span><span class="iv ${isOn?'on':''}">${entry.online}</span></div>
          <div class="irow"><span class="ik">本人確認</span><span class="iv ${entry.badge?'ok':'danger'}">${entry.badge?'提出済み':'未提出'}</span></div>
        </div>
      </section>

      <section class="c-sec">
        <h3 class="c-h">Q&A</h3>
        ${entry.qa.map(q=>`<div class="qa"><div class="q">${q[0]}</div><div class="a">${q[1]}</div></div>`).join('')}
      </section>
    </div>`;

  paintIcons(prof);
  const wrap=prof.querySelector('.photo-wrap'); wrap._entry=entry; wrap._pi=0;
  wrap.querySelector('.segs').innerHTML=Array.from({length:photoCount(entry)},(_,i)=>`<span class="seg ${i===0?'on':''}"></span>`).join('');
  showPhoto(wrap,0);
  preloadEntry(entry);          // 残り写真（異変ver含む）を先読み
  preloadEntry(run[idx+1]);     // 次の人も先読み
}

function preloadEntry(entry){
  if(!entry)return;
  for(let i=0;i<photoCount(entry);i++){ const im=new Image(); im.src=photoURL(entry,i); }
}

function showPhoto(wrap,i){
  const changed=wrap._pi!==i; wrap._pi=i;
  const photo=wrap.querySelector('.photo');
  setPhoto(photo,wrap._entry,i);
  if(changed){photo.classList.remove('anim');void photo.offsetWidth;photo.classList.add('anim');}
  wrap.querySelectorAll('.seg').forEach((s,k)=>s.classList.toggle('on',k===i));
  const t=wrap._entry.tell, old=wrap.querySelector('.dbg'); if(old)old.remove();
  if(DEBUG&&t&&t.kind==='photo'&&t.swaps&&t.swaps[i]){
    const d=document.createElement('div');d.className='dbg';
    d.style.cssText='position:absolute;top:44px;left:12px;right:12px;z-index:6;background:#ff2d55dd;color:#fff;font-size:11px;padding:6px 9px;border-radius:8px';
    d.textContent='▲ TELL: '+t.swaps[i].split('/').pop(); wrap.appendChild(d);
  }
}

function flashEdge(wrap,side){const e=wrap.querySelector('.edge.'+side);if(e){e.classList.add('flash');setTimeout(()=>e.classList.remove('flash'),160);}}

/* ============ gestures: swipe anywhere / vertical scroll / photo taps ============ */
let committing=false;
/* スワイプでズレて見える背景を判定色に染める（右=シロ:神々しい水色 / 左=クロ:禍々しい赤黒） */
function setJudgeBg(s){
  const sc=document.getElementById('scroll');
  sc.classList.toggle('judge-shiro',s>0);
  sc.classList.toggle('judge-kuro',s<0);
}
function resetProfileStyle(){
  const prof=document.getElementById('profile');
  prof.style.transition='none'; prof.style.transform=''; prof.style.opacity='';
  stampLike.style.opacity=0; stampNope.style.opacity=0;
  setJudgeBg(0);
}
function wireGestures(){
  const scroll=document.getElementById('scroll');
  const prof=()=>document.getElementById('profile');
  let sx=0,sy=0,axis=null,moved=0,startWrap=null,active=false;
  const inGame=()=>!committing&&run[idx]&&ov.classList.contains('hidden');

  scroll.addEventListener('pointerdown',e=>{
    if(!inGame())return;
    active=true; sx=e.clientX; sy=e.clientY; axis=null; moved=0;
    startWrap=e.target.closest&&e.target.closest('.photo-wrap');
    prof().style.transition='none';
  });
  // iOS対策の本丸：横ジェスチャと判った瞬間に touchmove を preventDefault して
  // ブラウザのスクロール判定に指を奪わせない（これが無いと即 pointercancel されスワイプ不能）
  scroll.addEventListener('touchmove',e=>{
    if(!active)return;
    if(axis==='h'){e.preventDefault();return;}
    if(axis===null&&e.touches.length===1){
      const t=e.touches[0], dx=Math.abs(t.clientX-sx), dy=Math.abs(t.clientY-sy);
      if(dx>6&&dx>dy)e.preventDefault();
    }
  },{passive:false});
  scroll.addEventListener('pointermove',e=>{
    if(!active||!inGame())return;
    const dx=e.clientX-sx,dy=e.clientY-sy; moved=Math.abs(dx)+Math.abs(dy);
    if(axis===null&&moved>6){
      axis=Math.abs(dx)>Math.abs(dy)?'h':'v';
      if(axis==='h'){try{scroll.setPointerCapture(e.pointerId);}catch(_){}}
    }
    if(axis==='h'){
      prof().style.transform=`translateX(${dx}px) rotate(${dx/24}deg)`;
      const k=Math.min(Math.abs(dx)/120,1);
      stampLike.style.opacity=dx>0?k:0; stampNope.style.opacity=dx<0?k:0;
      setJudgeBg(dx);
    }
  });
  scroll.addEventListener('pointerup',e=>{
    if(!active)return; active=false;
    if(!inGame()){axis=null;return;}
    const dx=e.clientX-sx;
    if(axis==='h'){
      stampLike.style.opacity=0; stampNope.style.opacity=0;
      axis=null;
      if(Math.abs(dx)>90)return commit(dx>0?'like':'nope');
      const p=prof();
      p.style.transition='transform .3s cubic-bezier(.2,.85,.25,1)'; p.style.transform='';
      setJudgeBg(0);
    }else if(axis===null&&moved<8&&startWrap){
      // タップは写真送りのみ（左1/3=前、右1/3=次）。拡大は廃止＝スワイプと競合させない
      const r=startWrap.getBoundingClientRect(), rx=(sx-r.left)/r.width;
      if(rx<0.33){if(startWrap._pi>0){showPhoto(startWrap,startWrap._pi-1);flashEdge(startWrap,'l');}}
      else if(rx>0.67){if(startWrap._pi<photoCount(startWrap._entry)-1){showPhoto(startWrap,startWrap._pi+1);flashEdge(startWrap,'r');}}
    }
    axis=null;
  });
  scroll.addEventListener('pointercancel',()=>{
    active=false;
    if(!committing)resetProfileStyle();
    axis=null;
  });
  // 取りこぼし保険（capture失敗等でpointerupが#scroll外に落ちた場合の原状復帰。判定はしない）
  window.addEventListener('pointerup',()=>{
    if(!active)return;
    active=false;
    if(!committing){const p=prof();p.style.transition='transform .3s';p.style.transform='';}
    stampLike.style.opacity=0; stampNope.style.opacity=0; axis=null;
  });
}

/* ============ commit decision (both-sides death) ============ */
function commit(dir){
  if(committing)return;                                   // 連打・多重発火ガード
  if(!ov.classList.contains('hidden'))return;             // オーバーレイ表示中は無効
  const entry=run[idx]; if(!entry)return;
  committing=true;
  const judgedSafe=dir==='like';
  const correct=entry.danger?!judgedSafe:judgedSafe;
  const prof=document.getElementById('profile');
  stampLike.style.opacity=0; stampNope.style.opacity=0;
  setJudgeBg(dir==='like'?1:-1);   // 飛んでいく間も判定色を見せる
  prof.style.transition='transform .3s ease-out, opacity .3s ease-out';
  prof.style.transform=`translateX(${dir==='like'?600:-600}px) rotate(${dir==='like'?9:-9}deg)`;
  prof.style.opacity='0';
  setTimeout(()=>{
    resetProfileStyle();                                  // どの分岐でも必ず原状復帰（残留transform＝崩壊バグの根治）
    committing=false;
    if(!correct)return gameOver(entry,judgedSafe);
    if(judgedSafe)matched++;
    idx++; updateHUD();
    if(idx>=run.length)return win();
    document.getElementById('scroll').scrollTop=0;
    renderProfile(run[idx]);
    prof.classList.remove('enter'); void prof.offsetWidth; prof.classList.add('enter');
  },310);
}

function updateHUD(){
  document.getElementById('progressText').textContent=`${idx} / ${run.length}`;
  document.getElementById('progressFill').style.width=`${idx/run.length*100}%`;
  document.getElementById('livesText').innerHTML=ICON.heart.repeat(lives)+`<span style="opacity:.26">${ICON.heartLine.repeat(START_LIVES-lives)}</span>`;
}

/* ============ zoom viewer ============ */
let zt={s:1,x:0,y:0};
function openZoom(src,entry,i){
  const z=document.getElementById('zoom'),img=document.getElementById('zoomImg');
  img.src=src; img.onerror=()=>{img.alt='(画像なし: '+(entry?entry.p.folder+'/'+(i+1)+'.png':'')+')';};
  zt={s:1,x:0,y:0}; applyZoom(); z.classList.remove('hidden');
}
function applyZoom(){document.querySelector('.zoom-inner').style.transform=`translate(${zt.x}px,${zt.y}px) scale(${zt.s})`;}
(function initZoom(){
  const z=document.getElementById('zoom');
  document.getElementById('zoomClose').addEventListener('click',()=>z.classList.add('hidden'));
  z.addEventListener('wheel',e=>{e.preventDefault();zt.s=Math.min(6,Math.max(1,zt.s-e.deltaY*0.002));if(zt.s===1){zt.x=zt.y=0;}applyZoom();},{passive:false});
  let pan=null,pts=new Map(),pd0=0,s0=1;
  z.addEventListener('pointerdown',e=>{pts.set(e.pointerId,e);if(pts.size===1){pan={x:e.clientX-zt.x,y:e.clientY-zt.y};}else if(pts.size===2){const a=[...pts.values()];pd0=Math.hypot(a[0].clientX-a[1].clientX,a[0].clientY-a[1].clientY);s0=zt.s;}});
  z.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,e);const a=[...pts.values()];
    if(pts.size===2){const d=Math.hypot(a[0].clientX-a[1].clientX,a[0].clientY-a[1].clientY);zt.s=Math.min(6,Math.max(1,s0*d/pd0));applyZoom();}
    else if(pan&&zt.s>1){zt.x=e.clientX-pan.x;zt.y=e.clientY-pan.y;applyZoom();}});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pd0=0;if(pts.size===0)pan=null;};
  z.addEventListener('pointerup',up);z.addEventListener('pointercancel',up);
})();

/* ============ overlays ============ */
const ov=document.getElementById('overlay');
function showStart(){
  ov.className='overlay';
  ov.innerHTML=`
    <div class="ov-logo">${ICON.spark}<span>Amary</span></div>
    <p class="ov-tag">${roster().length}人の中から、大丈夫な人を見極めよう。</p>
    <div class="ov-card">
      <p class="ov-rule"><b class="rule-like">右スワイプ＝シロ</b><span>この人は大丈夫</span></p>
      <p class="ov-rule"><b class="rule-nope">左スワイプ＝クロ</b><span>この人は…異変あり</span></p>
      <div class="ov-divider"></div>
      <p class="ov-hint">危険な相手の写真には、必ずどこかに"見れば分かる異変"がある。写真は左右タップで切替、下にスクロールでプロフィールを確認。</p>
      <p class="ov-hint warn">クロを見逃してシロ判定しても、普通の人をクロ判定しても、そこで終了。</p>
    </div>
    <button class="btn" id="startBtn">さがす</button>
    <p class="ov-note">本作はフィクションです。登場する人物・アプリ・団体は全て架空のものであり、実在のサービス・団体・人物とは一切関係ありません。</p>`;
  paintIcons(ov);
  ov.querySelector('#startBtn').addEventListener('click',startRun);
  ov.classList.remove('hidden');
}
function gameOver(entry,judgedSafe){
  lives--; updateHUD();
  // 8番出口方式：答え合わせはしない。「異変があった/なかった」だけ。
  const dead=entry.danger;   // クロを見逃してシロ判定＝死 / 普通の人をクロ判定＝冤罪
  ov.className=dead?'overlay dead':'overlay';
  ov.innerHTML=`
    <div class="ov-go">${dead?'DEAD END':'冤罪'}</div>
    <p class="ov-sub">${dead?'死んでしまった':'この人は、普通の人だった'}</p>
    <div class="dead-photo" id="deadPhoto"></div>
    <div class="dead-name">${entry.p.name} <span class="dead-age">${entry.p.age}</span></div>
    <div class="verdict ${dead?'was':'wasnt'}">${dead?'異変があった':'異変はなかった'}</div>
    <p class="ov-progress">${idx} / ${run.length} 人</p>
    <button class="btn" id="retryBtn">もう一度さがす</button>
    <button class="btn sub" id="titleBtn">タイトルへ</button>`;
  const dp=ov.querySelector('#deadPhoto');
  const s=photoSet(entry);
  const u=encodeURI(s&&s.photos[0]?s.photos[0]:`${PHOTO_BASE}/${entry.p.folder}/1.png`);
  const im=new Image();
  im.onload=()=>dp.style.backgroundImage=`url("${u}")`;
  im.onerror=()=>{dp.style.background='linear-gradient(135deg,#cbb8d6,#b8a0c9)';};
  im.src=u;
  ov.querySelector('#retryBtn').addEventListener('click',startRun);
  ov.querySelector('#titleBtn').addEventListener('click',showStart);
  ov.classList.remove('hidden');
}
function win(){
  ov.className='overlay holy';
  const kuro=run.length-matched;
  ov.innerHTML=`
    <div class="ov-logo clear"><span>CLEAR</span></div>
    <p class="ov-tag">${run.length}人すべてを見極めた。</p>
    <div class="holy-stats">
      <div class="hs"><span class="hs-n">${matched}</span><span class="hs-l">シロ判定</span></div>
      <div class="hs"><span class="hs-n">${kuro}</span><span class="hs-l">クロ判定</span></div>
      <div class="hs"><span class="hs-n">0</span><span class="hs-l">ミス</span></div>
    </div>
    <button class="btn" id="againBtn">もう一度さがす</button>
    <button class="btn sub" id="winTitleBtn">タイトルへ</button>`;
  ov.querySelector('#againBtn').addEventListener('click',startRun);
  ov.querySelector('#winTitleBtn').addEventListener('click',showStart);
  ov.classList.remove('hidden');
}

/* ============ controls / boot ============ */
function startRun(){
  run=buildRun(); idx=0; lives=START_LIVES; matched=0;
  committing=false; resetProfileStyle();   // 前ランの残留transform/opacityを必ず掃除
  ov.classList.add('hidden');
  document.getElementById('scroll').scrollTop=0;
  updateHUD(); renderProfile(run[0]);
}
window.addEventListener('keydown',e=>{if(e.key==='ArrowRight')commit('like');if(e.key==='ArrowLeft')commit('nope');});
document.querySelectorAll('.float-actions .act').forEach(b=>b.addEventListener('click',()=>commit(b.dataset.act)));

paintIcons(document);
wireGestures();
DEBUG=new URLSearchParams(location.search).has('debug');
(async function(){
  try{const r=await fetch('manifest.json?b='+Date.now(),{cache:'no-store'});if(r.ok)window.PHOTOS=await r.json();}catch(_){}
  showStart();
})();
