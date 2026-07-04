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
  {id:'onsen',label:'温泉すき'},{id:'camp',label:'キャンプ'},{id:'umi',label:'海がすき'},{id:'live',label:'音楽ライブ'},
  {id:'sweets',label:'甘いものに目がない'},{id:'dokusho',label:'読書'},{id:'karaoke',label:'カラオケすき'},{id:'yuenchi',label:'遊園地・テーマパーク'},
];
/* 闇タグ（プロフ異変）: 趣味の文法に乗っているが、よく考えると常軌を逸している。
   危険ラン時にタグ1枠だけ差し替わる（写真異変と択一・同時発動なし） */
const DARK_TAGS=[
  {id:'d_haka',label:'墓地巡り'},{id:'d_hamono',label:'刃物あつめ'},{id:'d_biko',label:'深夜の尾行'},
  {id:'d_kanshi',label:'監視カメラ鑑賞'},{id:'d_kokkaku',label:'骨格標本'},{id:'d_rope',label:'ロープの結び方研究'},
  {id:'d_soshiki',label:'お葬式に参列すること'},{id:'d_otoshimono',label:'落とし物あつめ'},{id:'d_kagi',label:'鍵作り'},
];
/* 闇タグの図鑑記録用: 説明(d)＋難易度(s)。画像は assets/tags/<id>.png を流用 */
const TAG_DARKDESC={
  d_haka:{d:'興味・関心に「墓地巡り」。故人を悼むためではないらしい',s:2},
  d_hamono:{d:'興味・関心に「刃物あつめ」。飾るためではない',s:2},
  d_biko:{d:'興味・関心に「深夜の尾行」。誰かの後ろを、夜ごと歩いている',s:1},
  d_kanshi:{d:'興味・関心に「監視カメラ鑑賞」。映っているのは、知らない誰かの日常',s:1},
  d_kokkaku:{d:'興味・関心に「骨格標本」。部屋に、骨が並んでいる',s:2},
  d_rope:{d:'興味・関心に「ロープの結び方研究」。アウトドアの話ではないらしい',s:3},
  d_soshiki:{d:'興味・関心に「お葬式に参列すること」。知らない人の葬式にも、行く',s:2},
  d_otoshimono:{d:'興味・関心に「落とし物あつめ」。集めるだけで、届けはしない',s:3},
  d_kagi:{d:'興味・関心に「鍵作り」。作っているのは、他人の家の合鍵',s:1},
};
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
let run=[],idx=0,lives=START_LIVES,matched=0,runStartAt=0;
const fmtTime=ms=>{const s=Math.floor(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};

/* ---- Haptics: Capacitor環境でのみ動作。webや未対応環境では完全に無音でスキップ ---- */
function haptic(kind){
  try{
    const H=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics;
    if(!H||!H.impact)return;
    if(kind==='heavy'){
      H.impact({style:'HEAVY'}).catch(()=>{});
      setTimeout(()=>{try{H.impact({style:'HEAVY'}).catch(()=>{});}catch(_){}},130);
    }else{
      H.impact({style:'LIGHT'}).catch(()=>{});
    }
  }catch(_){}
}
/* ---- クロ側心拍ビネット: 左への傾きに応じて縁を暗くし、鼓動させる ---- */
const dreadEl=document.getElementById('dread');
function setDread(dx){
  if(!dreadEl)return;
  const k=dx<0?Math.min(-dx/240,1):0;
  dreadEl.style.opacity=(k*0.95).toFixed(3);
  dreadEl.classList.toggle('beat',k>0.12);
}

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
      // 【契約】候補は「単発1枚」「定義済みセット」「プロフ異変1つ」のどれか一つだけ。偶発的な同時出しは構造上不可能
      const candidates=[
        ...Object.keys(anomalies).map(slot=>({single:slot})),
        ...sets.map(m=>({combo:m})),
        ...(p.profTells||[]).map(t=>({prof:t})),
      ];
      if(p.anomalySets&&p.anomalySets.length){   // data.jsでの手動セット指定（単発素材の組み合わせ）も候補化
        for(const combo of p.anomalySets){
          const m={}; for(const s of combo){ if(anomalies[s]) m[s]=pick(anomalies[s]); }
          if(Object.keys(m).length) candidates.push({combo:m});
        }
      }
      if(candidates.length){
        const c=pick(candidates);
        if(c.prof){
          tell={kind:'prof',t:c.prof};
          // withPhoto: プロフ異変単体を禁止し、必ず写真異変を随伴させる（例: 女4の「たすけて」）
          if(c.prof.withPhoto){
            const ss=Object.keys(anomalies);
            if(ss.length){const s=pick(ss); tell.swaps={[s]:pick(anomalies[s])};}
            else tell=null;   // 随伴できないなら発動しない（単体NGの契約を守る）
          }
        }
        else if(c.single!==undefined) tell={kind:'photo',swaps:{[c.single]:pick(anomalies[c.single])}};
        else            tell={kind:'photo',swaps:{...c.combo}};
        if(!tell) danger=false;
      }else if(UI_TELLS.length){
        tell={kind:'ui',type:pick(UI_TELLS)};
      }else{
        danger=false;   // 異変を出せないなら安全側に倒す（理不尽死ゼロの原則）
      }
    }
    const ui=(t)=>danger&&tell.kind==='ui'&&tell.type===t;
    const entry={
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
    // プロフ異変の適用（tell確定後にエントリ側だけを書き換える。p本体は不変）
    if(tell&&tell.kind==='prof'){
      const t=tell.t;
      if(t.type==='tag'){
        const dark=pick(DARK_TAGS);
        const i=Math.floor(Math.random()*entry.tagList.length);
        entry.tagList=entry.tagList.slice(); entry.tagList[i]=dark;
        tell.darkTag=dark.id;                    // 図鑑記録用
        tell.desc=`タグ異変: ${dark.label}`;
      }else if(t.type==='bio'){
        entry.bioOverride=t.mode==='replace'?t.text:p.bio+t.text;
        tell.desc='bio異変';
      }
    }
    return entry;
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
  if(t&&t.swaps&&t.swaps[i]) return encodeURI(t.swaps[i]);   // 危険ラン＝該当スロットのみ異変verに差し替え（prof随伴のswapsも含む）
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
        <p class="c-bio">${entry.bioOverride||p.bio}</p>
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
  if(DEBUG&&entry.tell&&entry.tell.kind==='prof'){
    const d=document.createElement('div');
    d.style.cssText='position:sticky;top:0;z-index:9;background:#7a2bd6dd;color:#fff;font-size:11px;padding:6px 10px;border-radius:0 0 8px 8px';
    d.textContent='▲ PROF TELL: '+(entry.tell.desc||entry.tell.t.type);
    prof.prepend(d);
  }
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
  if(DEBUG&&t&&t.swaps&&t.swaps[i]){
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
  setJudgeBg(0); setDread(0);
}
function wireGestures(){
  const scroll=document.getElementById('scroll');
  const prof=()=>document.getElementById('profile');
  let sx=0,sy=0,axis=null,moved=0,startWrap=null,active=false;
  const inGame=()=>!committing&&((tutorial&&tutorial.entry)||run[idx])&&ov.classList.contains('hidden');

  scroll.addEventListener('pointerdown',e=>{
    if(!inGame())return;
    active=true; sx=e.clientX; sy=e.clientY; axis=null; moved=0;
    startWrap=e.target.closest&&e.target.closest('.photo-wrap');
    if(tutorial)tutNudge(false);        // 指追従を優先（ピクピクを一旦停止）
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
      setJudgeBg(dx);
      setDread(dx);
    }
  });
  scroll.addEventListener('pointerup',e=>{
    if(!active)return; active=false;
    if(!inGame()){axis=null;return;}
    const dx=e.clientX-sx;
    if(axis==='h'){
      axis=null;
      if(Math.abs(dx)>90)return commit(dx>0?'like':'nope');
      const p=prof();
      p.style.transition='transform .3s cubic-bezier(.2,.85,.25,1)'; p.style.transform='';
      setJudgeBg(0); setDread(0);
      if(tutorial){p.addEventListener('transitionend',()=>tutNudge(true),{once:true});}   // 戻り切ってからピクピク再開
    }else if(axis===null&&moved<8&&startWrap){
      // タップは写真送りのみ（左1/3=前、右1/3=次）。拡大は廃止＝スワイプと競合させない
      const r=startWrap.getBoundingClientRect(), rx=(sx-r.left)/r.width;
      if(rx<0.33){if(startWrap._pi>0){showPhoto(startWrap,startWrap._pi-1);flashEdge(startWrap,'l');haptic('light');}}
      else if(rx>0.67){if(startWrap._pi<photoCount(startWrap._entry)-1){showPhoto(startWrap,startWrap._pi+1);flashEdge(startWrap,'r');haptic('light');}}
      if(tutorial)tutNudge(true);
    }else if(tutorial&&!committing)tutNudge(true);
    axis=null;
  });
  scroll.addEventListener('pointercancel',()=>{
    active=false;
    if(!committing)resetProfileStyle();
    if(tutorial&&!committing)tutNudge(true);
    axis=null;
  });
  // 取りこぼし保険（capture失敗等でpointerupが#scroll外に落ちた場合の原状復帰。判定はしない）
  window.addEventListener('pointerup',()=>{
    if(!active)return;
    active=false;
    if(!committing){const p=prof();p.style.transition='transform .3s';p.style.transform='';}
    axis=null;
  });
}

/* ============ commit decision (both-sides death) ============ */
function commit(dir){
  if(committing)return;                                   // 連打・多重発火ガード
  if(!ov.classList.contains('hidden'))return;             // オーバーレイ表示中は無効
  if(tutorial)return tutCommit(dir);                      // チュートリアル中は専用処理（死なない）
  const entry=run[idx]; if(!entry)return;
  committing=true;
  haptic('light');   // 捺印の手応え
  const judgedSafe=dir==='like';
  const correct=entry.danger?!judgedSafe:judgedSafe;
  const prof=document.getElementById('profile');
  setJudgeBg(dir==='like'?1:-1);   // 飛んでいく間も判定色（と判定文字）を見せる
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
  stopOverlayFx();
  // 本物のマチアプのスプラッシュ流儀：ブランドカラー全面＋白ロゴ＋白の注意書きのみ
  ov.className='overlay title';
  ov.innerHTML=`
    <div class="t2-tap" id="t2Tap">
      <div class="t2-logo"><img class="t2-logo-img" src="assets/logo/yummy_white.webp?v=48" alt="Yummy"></div>
      <p class="t2-note">本作はフィクションです。登場する人物・団体・アプリはすべて架空のものであり、実在するサービス・団体・人物とは一切関係ありません。人物写真はすべてAIによって生成された、実在しない人物です。本作には犯罪・ストーカー行為等を示唆する表現が含まれます。</p>
    </div>`;
  paintIcons(ov);
  ov.querySelector('#t2Tap').addEventListener('click',startTutorial);
  ov.classList.remove('hidden');
}
/* ---- 結果画面の演出パーティクル（CSSアニメの個体差をJSで散らす） ---- */
function spawnFx(host,cls,n,fn){
  for(let i=0;i<n;i++){const el=document.createElement('i');el.className=cls;fn(el,i);host.appendChild(el);}
}
/* ---- DEAD END の血（Canvas）----
   血は直線では落ちない。1本ごとに: 横のランダムウォーク＋sin揺らぎ / 速度の脈動
   （たまに止まり、たまにツーッと走る）/ 太さの脈動 / 先端に明るい溜まり。
   軌跡は蓄積キャンバスに描き足し、先端だけ毎フレーム別キャンバスで描き直す */
function startBloodFX(host){
  const wrap=document.createElement('div'); wrap.className='fx-blood';
  const trail=document.createElement('canvas'), tips=document.createElement('canvas');
  wrap.appendChild(trail); wrap.appendChild(tips); host.prepend(wrap);
  const DPR=Math.min(window.devicePixelRatio||1,2);
  const W=host.clientWidth||390, H=host.clientHeight||780;
  [trail,tips].forEach(c=>{c.width=W*DPR; c.height=H*DPR;});
  const tc=trail.getContext('2d'), pc=tips.getContext('2d');
  tc.setTransform(DPR,0,0,DPR,0,0); pc.setTransform(DPR,0,0,DPR,0,0);
  // 上端の血溜まり（不均一なにじみ）
  tc.fillStyle='rgba(86,3,15,.95)';
  for(let x=0;x<W;x+=3){ tc.fillRect(x,0,3,3+Math.sin(x*.7)*1.5+Math.random()*3); }
  const drips=[];
  const N=8;
  for(let i=0;i<N;i++){
    const x=W*((i+0.15+Math.random()*0.7)/N);
    drips.push({x, w:2.4+Math.random()*3.2, speed:18+Math.random()*40,
      maxY:H*(0.34+Math.random()*0.52), phase:Math.random()*100,
      drift:0, stall:Math.random()*0.8, last:{x,y:2}, y:2});
  }
  let prev=performance.now(), raf=0, dead=false;
  function frame(now){
    if(dead)return;
    raf=requestAnimationFrame(frame);
    const dt=Math.min((now-prev)/1000,0.05); prev=now;
    pc.clearRect(0,0,W,H);
    for(const d of drips){
      if(d.y<d.maxY){
        if(d.stall>0){ d.stall-=dt; }
        else{
          if(Math.random()<0.006) d.stall=0.4+Math.random()*1.4;      // たまに止まる
          let v=d.speed*(0.45+0.55*Math.sin(now/900+d.phase*7));
          if(v<0)v=0;
          if(Math.random()<0.004) v+=d.speed*7;                        // たまにツーッと走る
          const ny=Math.min(d.y+v*dt, d.maxY);
          d.drift+=(Math.random()-0.5)*0.9;  d.drift*=0.96;            // 横のランダムウォーク
          const nx=d.x+Math.sin(ny/34+d.phase)*2.6+d.drift;
          tc.strokeStyle=`rgba(${104+(Math.random()*26|0)},5,19,.95)`;
          tc.lineWidth=Math.max(1,d.w*(0.75+0.5*Math.sin(ny/15+d.phase*3)));
          tc.lineCap='round';
          tc.beginPath(); tc.moveTo(d.last.x,d.last.y); tc.lineTo(nx,ny); tc.stroke();
          d.last={x:nx,y:ny}; d.y=ny;
        }
      }
      // 先端: 独立した「丸」は描かない。筋と同色の僅かな膨らみで線の終わりを湿らせるだけ
      const r=Math.max(1,d.w*0.5);
      pc.fillStyle='rgba(126,8,26,.55)';
      pc.beginPath(); pc.ellipse(d.last.x,d.last.y+r*0.4,r,r*1.5,0,0,7); pc.fill();
    }
  }
  raf=requestAnimationFrame(frame);
  return ()=>{dead=true; cancelAnimationFrame(raf); wrap.remove();};
}
function stopOverlayFx(){ if(ov._stopFx){ov._stopFx(); ov._stopFx=null;} }
function gameOver(entry,judgedSafe){
  lives--; updateHUD();
  haptic('heavy');   // GAME OVERの重い衝撃
  // 8番出口方式：答え合わせはしない。「異変があった/なかった」だけ。
  const dead=entry.danger;   // クロを見逃してシロ判定＝死 / 普通の人をクロ判定＝冤罪
  stopOverlayFx();
  ov.className=dead?'overlay dead':'overlay enzai';
  ov.innerHTML=`
    ${dead?'<div class="fx-goo"></div><div class="fx-vhs"></div>':'<div class="fx-orbs"></div>'}
    <div class="go-inner${dead?' vhs-shake':''}">
      <div class="ov-go" ${dead?'data-glitch="GAME OVER"':''}>GAME OVER</div>
      <p class="ov-sub">${dead?'闇にのまれてしまった…':'冤罪をかけてしまった…'}</p>
      <div class="dead-photo" id="deadPhoto"></div>
      <div class="dead-name">${entry.p.name} <span class="dead-age">${entry.p.age}</span></div>
      <p class="ov-progress">${idx} / ${run.length} 人</p>
      <button class="btn" id="retryBtn">もう一度さがす</button>
      <button class="btn sub" id="titleBtn">タイトルへ</button>
    </div>`;
  if(dead){
    ov._stopFx=startBloodFX(ov);   // Canvas血（不揃いな波線）。画面遷移時に必ず停止
  }
  if(!dead){
    // 黒いオーブ: 少数・大きめ・奥行き（ぼかしと透明度を連動）でゆっくり呼吸
    spawnFx(ov.querySelector('.fx-orbs'),'orb',5,el=>{
      const depth=Math.random();                 // 0=手前 1=奥
      const s=34+depth*54;
      el.style.width=el.style.height=s+'px';
      el.style.left=(6+Math.random()*84)+'%';
      el.style.top=(8+Math.random()*74)+'%';
      el.style.filter=`blur(${1+depth*5}px)`;
      el.style.opacity=(0.55-depth*0.3).toFixed(2);
      el.style.animationDuration=(14+Math.random()*10)+'s';
      el.style.animationDelay=(-Math.random()*20)+'s';
    });
  }
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
/* ============ 闇ファイル（図鑑）: クリアしたランのクロだけが記録される ============
   GAME OVER・冤罪のランは「なかったこと」（死ぬか捕まるかしているので）。 */
function getDark(){ try{return JSON.parse(localStorage.getItem('amaryDark')||'[]');}catch(_){return [];} }
function collectDarkRun(){
  const got=new Set(getDark());
  for(const e of run){
    if(!e.danger||!e.tell)continue;
    if(e.tell.swaps) Object.values(e.tell.swaps).forEach(p=>got.add(p));   // 写真異変
    if(e.tell.darkTag) got.add('tag:'+e.tell.darkTag);                     // タグ異変
  }
  localStorage.setItem('amaryDark',JSON.stringify([...got]));
}
/* 全異変エントリ（72件）。闇No.はシード固定のランダム採番＝人物順のネタバレなし */
function darkEntries(){
  const folders=new Set(PROFILES.map(p=>p.folder));
  const paths=[];
  for(const k of Object.keys(window.PHOTOS||{})){
    if(!folders.has(k))continue;
    const m=window.PHOTOS[k]; if(Array.isArray(m))continue;
    for(const vs of Object.values(m.anomalies||{})) paths.push(...vs);
    for(const s of (m.anomalySets||[])) paths.push(...Object.values(s));
  }
  paths.sort();
  const r=mulberry32(20260704);
  const order=paths.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){const j=(r()*(i+1))|0;[order[i],order[j]]=[order[j],order[i]];}
  const got=new Set(getDark());
  const photo=paths.map((p,i)=>{
    const meta=(window.DARKDESC||{})[p]||{};
    return {kind:'photo',key:p,img:p,no:order[i]+1,got:got.has(p),desc:meta.d||'',star:meta.s||3};
  });
  // タグ異変は別カテゴリ。No.は独自に1〜9（ネタバレ防止で別シードのランダム固定）
  const r2=mulberry32(20260705);
  const torder=DARK_TAGS.map((_,i)=>i);
  for(let i=torder.length-1;i>0;i--){const j=(r2()*(i+1))|0;[torder[i],torder[j]]=[torder[j],torder[i]];}
  const tags=DARK_TAGS.map((t,i)=>{
    const meta=TAG_DARKDESC[t.id]||{};
    return {kind:'tag',key:'tag:'+t.id,img:tagImg(t),label:t.label,no:torder[i]+1,
      got:got.has('tag:'+t.id),desc:meta.d||'',star:meta.s||2};
  });
  photo.sort((a,b)=>a.no-b.no); tags.sort((a,b)=>a.no-b.no);
  return photo.concat(tags);   // 写真(No.1〜72)→タグ(No.1〜9)の順。カテゴリはkindで判別
}
const starsHTML=n=>Array.from({length:5},(_,i)=>`<span class="st ${i<n?'on':''}">★</span>`).join('');
const df=document.getElementById('darkfile');
function openDarkFile(){
  const items=darkEntries();
  const gotCount=items.filter(e=>e.got).length;
  const cellHTML=e=>e.got?`
    <div class="df-cell${e.kind==='tag'?' tagcell':''}" data-key="${e.key}">
      <div class="df-thumb" style="background-image:url('${encodeURI(e.img)}')">${e.kind==='tag'?`<span class="df-tag">${e.label}</span>`:''}</div>
      <span class="df-no">闇No.${String(e.no).padStart(2,'0')}</span>
      <span class="df-stars">${starsHTML(e.star)}</span>
    </div>`:`
    <div class="df-cell df-unknown">
      <div class="df-thumb"><span class="df-q">?</span></div>
      <span class="df-no">闇No.${String(e.no).padStart(2,'0')}</span>
      <span class="df-unid">UNIDENTIFIED</span>
    </div>`;
  const section=(title,arr)=>`
    <div class="df-sec"><span>${title}</span><span class="df-sec-n">${arr.filter(e=>e.got).length} / ${arr.length}</span></div>
    <div class="df-grid">${arr.map(cellHTML).join('')}</div>`;
  df.className='';
  df.innerHTML=`
    <div class="df-head"><span class="df-title">闇ファイル</span>
      <span class="df-count">発見率 ${Math.round(gotCount/items.length*100)}%</span>
      <button class="df-close" id="dfClose" data-icon="x"></button></div>
    <div class="df-scroll">
      ${section('写真',items.filter(e=>e.kind==='photo'))}
      ${section('興味・関心',items.filter(e=>e.kind==='tag'))}
    </div>
    <div class="df-detail hidden" id="dfDetail"></div>`;
  paintIcons(df);
  df.querySelector('#dfClose').addEventListener('click',()=>{df.className='hidden';df.innerHTML='';});
  df.querySelectorAll('.df-cell:not(.df-unknown)').forEach(c=>c.addEventListener('click',()=>{
    const e=items.find(x=>x.key===c.dataset.key);
    const d=df.querySelector('#dfDetail');
    d.className='df-detail';
    d.innerHTML=`
      <div class="df-d-inner">
        <div class="df-d-img-wrap">
          <img src="${encodeURI(e.img)}" alt="">
          ${e.kind==='tag'?`<span class="df-d-tag">${e.label}</span>`:''}
        </div>
        <div class="df-d-no">闇No.${String(e.no).padStart(2,'0')}</div>
        <div class="df-d-stars">${starsHTML(e.star)}</div>
        <p class="df-d-desc">${e.desc}</p>
        <button class="df-d-close" id="dfDClose">閉じる</button>
      </div>`;
    d.querySelector('#dfDClose').addEventListener('click',()=>{d.className='df-detail hidden';d.innerHTML='';});
  }));
}
/* ============ 設定ドロワー（⚙・左からスライド） ============ */
const drawerWrap=document.getElementById('drawerWrap');
function openDrawer(){
  const times=(()=>{try{return JSON.parse(localStorage.getItem('amaryTimes')||'[]');}catch(_){return [];}})();
  const recs=times.length
    ? times.map((t,i)=>`<div class="dw-rec"><span class="rk">${i+1}位</span><span class="tv">${fmtTime(t)}</span></div>`).join('')
    : '<p class="dw-empty">まだ記録がありません</p>';
  const darkBtn=getDark().length
    ? `<div class="dw-sec">ファイル</div>
       <button class="dw-dark" id="dwDark">闇ファイル<small>闇発見率 ${Math.round(getDark().length/darkEntries().length*100)}%</small></button>`
    : '';
  document.getElementById('drawer').innerHTML=`
    <div class="dw-title">Menu<button class="dw-close" id="dwClose" data-icon="x"></button></div>
    <div class="dw-sec">記録（ベストタイム）</div>
    ${recs}
    ${darkBtn}`;
  paintIcons(drawerWrap);
  drawerWrap.classList.remove('hidden');
  document.getElementById('dwClose').addEventListener('click',closeDrawer);
  document.getElementById('drawerBack').addEventListener('click',closeDrawer);
  const dk=document.getElementById('dwDark');
  if(dk)dk.addEventListener('click',()=>{closeDrawer();openDarkFile();});
}
function closeDrawer(){drawerWrap.classList.add('hidden');document.getElementById('drawer').innerHTML='';}
document.querySelector('.appbar .icon-btn[aria-label="menu"]').addEventListener('click',openDrawer);

function win(){
  stopOverlayFx();
  collectDarkRun();                              // クリアしたランのクロを記録
  const firstTime=!localStorage.getItem('amaryDarkPopup');
  ov.className='overlay holy';
  const kuro=run.length-matched;
  const elapsed=Date.now()-runStartAt;
  try{
    const arr=JSON.parse(localStorage.getItem('amaryTimes')||'[]');
    arr.push(elapsed); arr.sort((a,b)=>a-b);
    localStorage.setItem('amaryTimes',JSON.stringify(arr.slice(0,5)));
  }catch(_){}
  const time=fmtTime(elapsed);                   // タイム表示はクリア時のみ
  ov.innerHTML=`
    <div class="fx-holy"></div>
    <div class="go-inner holy-enter">
      <div class="ov-logo clear"><span>CLEAR</span></div>
      <p class="ov-tag">あなたのおかげでマッチングアプリの秩序は保たれた</p>
      <div class="holy-time"><span class="ht-n">${time}</span><span class="ht-l">TIME</span></div>
      <div class="holy-stats">
        <div class="hs"><span class="hs-n">${matched}</span><span class="hs-l">シロ判定</span></div>
        <div class="hs" id="kuroCard"><span class="hs-n" id="kuroN">${kuro}</span><span class="hs-l">クロ判定</span></div>
      </div>
      <button class="btn" id="againBtn">もう一度さがす</button>
      <button class="btn sub" id="winTitleBtn">タイトルへ</button>
    </div>
    <div class="whiteout"></div>`;
  const fx=ov.querySelector('.fx-holy');
  // 大量の粒子（奥行きつき）が立ちのぼり続ける
  spawnFx(fx,'spark',44,el=>{
    const depth=Math.random();
    const s=2.5+(1-depth)*6.5;
    el.style.width=el.style.height=s+'px';
    el.style.left=(1+Math.random()*97)+'%';
    el.style.filter=`blur(${depth*2.5}px)`;
    el.style.animationDuration=(6+depth*8)+'s';
    el.style.animationDelay=(-Math.random()*14)+'s';
  });
  spawnFx(fx,'hlight',3,(el,i)=>{
    el.style.animationDuration=(9+i*2.5)+'s';
    el.style.animationDelay=(-i*4)+'s';
  });
  ov.querySelector('#againBtn').addEventListener('click',startRun);
  ov.querySelector('#winTitleBtn').addEventListener('click',showStart);
  ov.classList.remove('hidden');
  // ホワイトアウト明け＋3秒: クロ判定の数字だけが闇堕ち→粒子集束→爆発→消滅
  setTimeout(()=>kuroCorrupt(firstTime),4400);
}
/* クロ判定の闇堕ち演出 */
function kuroCorrupt(firstTime){
  const el=ov.querySelector('#kuroN'); if(!el)return;
  el.classList.add('corrupt');
  const card=ov.querySelector('#kuroCard'); if(card)card.classList.add('corrupt-card');
  const fx=ov.querySelector('.fx-holy'); if(!fx)return;
  const or=ov.getBoundingClientRect(), r=el.getBoundingClientRect();
  const cx=r.left-or.left+r.width/2, cy=r.top-or.top+r.height/2;
  // 粒子が数字に吸い込まれるように集まる
  for(let i=0;i<26;i++){
    const p=document.createElement('i'); p.className='kuro-p';
    const ang=Math.random()*Math.PI*2, dist=110+Math.random()*260;
    p.style.left=cx+'px'; p.style.top=cy+'px';
    p.style.setProperty('--dx',Math.cos(ang)*dist+'px');
    p.style.setProperty('--dy',Math.sin(ang)*dist+'px');
    p.style.animationDelay=(Math.random()*0.5)+'s';
    fx.appendChild(p);
  }
  setTimeout(()=>{
    fx.querySelectorAll('.kuro-p').forEach(p=>p.remove());
    const b=document.createElement('div'); b.className='kuro-burst';
    b.style.left=cx+'px'; b.style.top=cy+'px'; fx.appendChild(b);
    el.style.opacity='0';                          // 数字は消えてなくなる
    setTimeout(()=>b.remove(),1000);
    if(firstTime){
      localStorage.setItem('amaryDarkPopup','1');
      setTimeout(showDarkPopup,700);               // 爆発した粒子が図鑑になる
    }else{
      // 爆発した粒子が右上（⚙＝図鑑）へ吸収されていく
      for(let i=0;i<12;i++){
        const q=document.createElement('i'); q.className='kuro-absorb';
        q.style.left=cx+(Math.random()-0.5)*60+'px'; q.style.top=cy+(Math.random()-0.5)*40+'px';
        q.style.setProperty('--ax',(or.width-44-cx)+'px');
        q.style.setProperty('--ay',(40-cy)+'px');
        q.style.animationDelay=(Math.random()*0.35)+'s';
        fx.appendChild(q);
        setTimeout(()=>q.remove(),1700);
      }
    }
  },1500);
}
function showDarkPopup(){
  const pop=document.createElement('div'); pop.className='dark-popup';
  pop.innerHTML=`
    <div class="dp-card">
      <p class="dp-text">闇ファイルが解放されました</p>
      <button class="dp-btn" id="dpBtn">確認する</button>
    </div>`;
  ov.appendChild(pop);
  pop.querySelector('#dpBtn').addEventListener('click',()=>{pop.remove();openDarkFile();});
}

/* ============ tutorial ============ */
let tutorial=null;
const TUT_KURO='男2';   // 一番わかりやすい犯罪系（引き出しに隠し撮り写真の束）
const TUT_SHIRO='男9';  // 異変なし専用の釣り人物
function tutEntry(folder,danger){
  const p=window.PROFILES.find(x=>x.folder===folder);
  const set=(window.PHOTOS||{})[folder];
  let tell=null;
  if(danger&&set&&set.anomalies){
    const slots=Object.keys(set.anomalies).map(Number).sort((a,b)=>a-b);
    const s=slots[0];
    tell={kind:'photo',swaps:{[s]:set.anomalies[s][0]}};
  }
  return {p,danger,tell,
    tagList:(p.tagIds||[]).map(id=>TAGS.find(t=>t.id===id)).filter(Boolean),
    want:p.want,area:p.area||'東京都',qa:p.qa||[],
    dist:'3.4km先',online:'オンライン中',badge:true};
}
function startTutorial(){
  ov.classList.add('hidden');
  tutorial={step:0,entry:null,need:null};
  document.getElementById('progressText').textContent='チュートリアル';
  document.getElementById('progressFill').style.width='0%';
  document.getElementById('scroll').scrollTop=0;
  tutShow();
}
function tutSkipHTML(){return `<button class="tut-skip" id="tutSkip">スキップ</button>`;}
function tutShow(){
  const T=document.getElementById('tut');
  const s=tutorial.step;
  T.classList.remove('hidden');
  // 映画の字幕方式：黒場に明朝の素のテキストだけ。文言はディレクター指定の原文そのまま
  const inter=(text)=>`
    <div class="tut-scrim"></div>
    <div class="inter">${text}</div>
    <div class="inter-tap">タップでつづける</div>${tutSkipHTML()}`;
  if(s===0){
    T.className='tut inter-layer';
    T.innerHTML=inter('あなたはマッチングアプリに潜む闇を調査する捜査官です');
    T.addEventListener('click',tutNext,{once:true});
  }else if(s===1){
    tutorial.entry=tutEntry(TUT_KURO,true); tutorial.need='nope';
    document.getElementById('scroll').scrollTop=0;
    renderProfile(tutorial.entry);
    T.className='tut pass';
    T.innerHTML=`<div class="tut-cap">怪しいと思ったユーザーは<br>左にスワイプして<b class="kuro">「クロ」</b>に</div>${tutSkipHTML()}`;
    tutNudge(true);
  }else if(s===2){
    tutorial.entry=tutEntry(TUT_SHIRO,false); tutorial.need='like';
    document.getElementById('scroll').scrollTop=0;
    renderProfile(tutorial.entry);
    T.className='tut pass';
    T.innerHTML=`<div class="tut-cap">問題ないと思ったユーザは<br>右にスワイプして<b class="shiro">「シロ」</b>にしてください</div>${tutSkipHTML()}`;
    tutNudge(true);
  }else if(s===3){
    T.className='tut inter-layer';
    T.innerHTML=inter('マッチングアプリに潜む闇には<br>さまざまな種類があります');
    T.addEventListener('click',tutNext,{once:true});
  }else if(s===4){
    T.className='tut inter-layer';
    T.innerHTML=inter('判断を間違えないように<br>よーく観察してみましょう');
    T.addEventListener('click',tutNext,{once:true});
  }else{
    T.innerHTML=''; T.classList.add('hidden'); tutorial=null;
    startRun(); return;
  }
  paintIcons(T);
  const sk=T.querySelector('#tutSkip');
  if(sk)sk.addEventListener('click',()=>{T.innerHTML='';T.classList.add('hidden');tutorial=null;startRun();});
}
function tutNext(){if(!tutorial)return;tutorial.step++;tutShow();}
/* カード本体を「スワイプしかけ」でピクピク動かす（CSSアニメ）。ドラッグ中は外して指追従を優先 */
function tutNudge(on){
  const p=document.getElementById('profile');
  p.classList.remove('tut-nudge-left','tut-nudge-right');
  if(on&&tutorial&&tutorial.need){
    p.classList.add(tutorial.need==='nope'?'tut-nudge-left':'tut-nudge-right');
    setJudgeBg(tutorial.need==='nope'?-1:1);   // ズレた隙間に判定色（実際に動かしている時と同じ画面）
  }
}
function tutCommit(dir){
  if(committing||!tutorial.need)return;
  const prof=document.getElementById('profile');
  tutNudge(false);
  if(dir!==tutorial.need){   // 逆方向：戻して促す（死なない）
    prof.style.transition='transform .3s'; prof.style.transform=''; setJudgeBg(0);
    const cap=document.querySelector('.tut-cap');
    if(cap){cap.classList.remove('blink');void cap.offsetWidth;cap.classList.add('blink');}
    setTimeout(()=>tutNudge(true),320);
    return;
  }
  committing=true; setJudgeBg(dir==='like'?1:-1); haptic('light');
  prof.style.transition='transform .3s ease-out, opacity .3s ease-out';
  prof.style.transform=`translateX(${dir==='like'?600:-600}px) rotate(${dir==='like'?9:-9}deg)`;
  prof.style.opacity='0';
  setTimeout(()=>{resetProfileStyle();committing=false;tutorial.need=null;tutNext();},310);
}

/* ============ controls / boot ============ */
function startRun(){
  stopOverlayFx();
  run=buildRun(); idx=0; lives=START_LIVES; matched=0; runStartAt=Date.now();
  committing=false; resetProfileStyle();   // 前ランの残留transform/opacityを必ず掃除
  ov.classList.add('hidden');
  document.getElementById('scroll').scrollTop=0;
  updateHUD(); renderProfile(run[0]);
}
window.addEventListener('keydown',e=>{if(e.key==='ArrowRight')commit('like');if(e.key==='ArrowLeft')commit('nope');});
document.querySelectorAll('.float-actions .act').forEach(b=>b.addEventListener('click',()=>commit(b.dataset.act)));
/* UI操作全般に軽いコツン（押した瞬間＝pointerdown）。
   判定ボタン.actと写真送りはそれぞれ専用にhapticを鳴らすため二重防止で除外 */
document.getElementById('app').addEventListener('pointerdown',e=>{
  if(e.target.closest('.act,.photo-wrap'))return;
  if(e.target.closest('button,.df-cell,.dw-dark')) haptic('light');
},true);

paintIcons(document);
wireGestures();
DEBUG=new URLSearchParams(location.search).has('debug');
(async function(){
  try{const r=await fetch('manifest.json?b='+Date.now(),{cache:'no-store'});if(r.ok)window.PHOTOS=await r.json();}catch(_){}
  showStart();
})();
