const $ = (id) => document.getElementById(id);
const svg = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const SOURCE = 'https://www.dpm.org.cn/collection/paint/228226.html';
const ARTWORK = { width: 38414, height: 1800, original: { src: 'assets/qingming-original.jpg' } };
const objects = {
  hat: {name:'斗笠',icon:'hat',category:'服饰',subtitle:'一顶清风，半日行路',use:'宽檐遮日，也替赶路人挡住风雨。轻便的斗笠，陪着行人穿过田野与街市。',craft:'传统斗笠以竹篾编骨，辅以叶片等材料。画中可见行人头上的宽檐笠，细部材质无法仅凭笔墨确定。',scene:'酒楼近旁，留意行人的头顶。',source:'https://www.museumschina.cn/collection/details?id=a88c1df80b1364d859f9db099a5d2ece5',sourceName:'宋竹编斗笠 · 馆藏参照'},
  umbrella: {name:'纸伞',icon:'umbrella',category:'器具',subtitle:'一方荫凉，市井片刻',use:'一柄伞，撑开街边的一方荫凉。商贩与行旅在伞下停驻，买卖之间，日子缓缓流过。',craft:'伞骨与伞面共同撑起弧形轮廓。画中的圆伞清晰可见；伞面材质以传统纸伞作理解参照，并非画面鉴定。',scene:'虹桥一端，有一面圆圆的伞。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  cart: {name:'独轮车',icon:'cart',category:'交通',subtitle:'一轮载物，往来城郭',use:'一只车轮，承起行李与货物。车夫推着小车穿行街市，把城里城外的日常连在一起。',craft:'车轮置于车架中部，便于在窄路转向。画中独轮车是汴京运输的一个缩影，木架与货载都落在细密笔墨间。',scene:'沿街往桥头走，看看运货人的身旁。',source:'https://www.dpm.org.cn/forum_detail/99722.html',sourceName:'清明上河图讲座 · 故宫博物院'},
  wine: {name:'酒器',icon:'jar',category:'饮食',subtitle:'街头一盏，满城酒香',use:'盛酒、斟酒、共饮，大小器皿各司其职。街边的一席杯壶，留住了汴京人的片刻闲暇。',craft:'宋人的日常酒器常见陶瓷制品。此处桌上可见成组器皿，酒器用途结合酒肆场景推断，无法据画面确认每件器形。',scene:'酒楼外的一方桌面，藏着杯壶。',source:'https://www.dpm.org.cn/collection/ceramic/226833.html',sourceName:'宋代陶瓷酒器 · 馆藏参照'},
  boat: {name:'货船',icon:'boat',category:'交通',subtitle:'一河舟楫，满载人间',use:'粮食与百货沿汴河而来，维系着京城的日常。船工与岸上的人一同忙碌，河道上满是生活。',craft:'船体、篷屋与绳索，把水运的繁忙凝在这一瞬。再看虹桥下的漕船，船工正放倒桅杆，准备穿桥。',scene:'汴河水面，寻一艘满载的大船。',source:SOURCE,sourceName:'张择端清明上河图卷 · 故宫博物院'},
  bowl: {name:'瓷碗',icon:'bowl',category:'器具',subtitle:'一器烟火，千年青色',use:'从饭碗到酒器，陶瓷融入宋人的日常。摊上的浅碗，为画中的市井添了一笔寻常。',craft:'延伸鉴赏：南宋龙泉窑青瓷莲瓣纹碗。粉青釉覆着层层莲瓣，瓣棱宛如初绽的花。此藏品并非画中同一器物，画内窑口亦无从确认。',scene:'桥边摊位，细看摊主面前的器皿。',source:'https://digitalarchive.npm.gov.tw/Collection/Detail/23?dep=U',sourceName:'南宋龙泉窑莲瓣碗 · 台北故宫'},
  bridge: {name:'虹桥',icon:'bridge',category:'建筑',subtitle:'飞虹一道，水陆相逢',use:'桥上行人车马交织，桥下船只顺流往来。一道飞虹，连起繁华街市与悠悠汴水。',craft:'成排巨木交错架起无柱木拱，使船只从桥下通过。虹桥的结构与舟车往来，是画卷最生动的段落之一。',scene:'横跨汴河的那道木拱桥。',source:'https://www.dpm.org.cn/study_detail/100191.html',sourceName:'虹桥专题研究 · 故宫博物院'},
  willow: {name:'柳树',icon:'tree',category:'风物',subtitle:'柳色沿河，春到汴京',use:'枝条临水，行人在树下歇脚。河岸与屋舍之间的树木，让繁忙的街市也有了舒展的空隙。',craft:'画家用细密线条勾写枝干，以疏密变化表现树形。此处“柳树”为画中树形辨识，不作植物学鉴定。',scene:'在河岸边，寻找垂下的枝条。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  shop: {name:'街铺',icon:'shop',category:'商业',subtitle:'门前买卖，屋里烟火',use:'一间间临街铺面，装着汴京的日常。招牌、柜台与往来顾客，让无声的画卷有了市声。',craft:'画家用界画技法描绘屋宇，以清晰的屋顶、梁柱与门窗组织街巷。铺面的具体营生须结合招牌辨认。',scene:'沿着城里街道，寻找敞开的铺面。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  gate: {name:'城楼',icon:'gate',category:'建筑',subtitle:'一道城门，内外人间',use:'行旅与货物由此进出。高大的城楼，将郊野的路与城里的街连接在一起。',craft:'城台之上立门楼，屋顶、梁柱与砖石层层分明。画中细致的建筑描绘，为理解宋代城市提供了线索。',scene:'画卷城郭一段，寻找最高的门楼。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  mast: {name:'桅杆',icon:'mast',category:'交通',subtitle:'一杆立起，借风远行',use:'桅杆支起风帆，舟船借风前行。靠岸或过桥时，船工还要留意桅杆与桥面的高低。',craft:'留意船上的长木杆，以及牵拉支撑的绳索。画卷把船体与岸边人群一同细绘，留下了水运生活的片段。',scene:'泊船之上，一根长木杆直指天空。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  rope: {name:'缆绳',icon:'rope',category:'器具',subtitle:'一绳系岸，舟泊人安',use:'舟行时牵引，停泊时系岸。盘起的缆绳，是船工手边少不了的日常。',craft:'纤维搓合成绳，使用后盘绕收拢。画中可见一大盘绳索垂挂在篷下，具体纤维材质无法凭画面确认。',scene:'船篷旁，找一大盘垂挂的绳索。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  canopy: {name:'舟篷',icon:'canopy',category:'交通',subtitle:'一篷风雨，半舱日常',use:'弧形的船篷为人货遮蔽日晒风雨。行船靠岸，一方小小的篷下空间，也承载着生活。',craft:'画中舟篷层叠拱起，轮廓随船身延展。可看见结构分节，覆盖材料则不宜仅凭画面断定。',scene:'后排泊船上，寻找弧形的篷顶。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  camel: {name:'骆驼',icon:'camel',category:'交通',subtitle:'驼铃入城，远路来客',use:'驮着货物的骆驼缓缓穿行。水路之外，陆路的行旅也把远方带到繁忙城门。',craft:'画中双峰骆驼负重而行，轮廓与周围马匹不同。它提示我们：汴京的生活，也与更远的商路相连。',scene:'城门左侧，留意负重而行的双峰身影。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  pole: {name:'货担',icon:'pole',category:'商业',subtitle:'一肩挑起，市井生计',use:'扁担挑着两端货物，随商贩穿行。窄街与人流之间，一肩挑起的便是生计。',craft:'两端悬挂篮筐，将重量分置肩头两侧。留意人物的肩、长杆与篮筐，便能辨认这件街头运输器具。',scene:'城门右侧街头，找肩挑两筐的行人。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  flatbridge: {name:'平桥',icon:'flatbridge',category:'建筑',subtitle:'桥过流水，路接人间',use:'一座低平的小桥，让街巷越过水道。桥上行人往来，桥下流水自去。',craft:'笔直的桥面与两侧栏杆构成清晰轮廓。它与虹桥的木拱形态不同，也是画中水陆相接的一处细节。',scene:'城郭画段下方，寻找带栏杆的平直小桥。',source:SOURCE,sourceName:'清明上河图 · 故宫博物院'},
  basket: {name:'编篮',icon:'basket',category:'器具',subtitle:'纵横细篾，盛起日常',use:'一只编篮，可以盛货，也可以盛花。轻便的器具随着小贩与行人，把生活带进街市。',craft:'编织器以细条材料交错成形。南宋李嵩《花篮图》细绘编织纹理，可作宋代生活器物的延伸欣赏。',scene:'留意商贩身边的篮筐。',source:'https://www.dpm.org.cn/collection/paint/230007.html',sourceName:'李嵩花篮图 · 故宫博物院'}
};
// 点位和画卷世界均使用原始图像像素，避免在显示与点击之间混入缩图比例。
let chapters = [
  {name:'虹桥春市',ordinal:'第一卷',numeral:'壹',subtitle:'人来船往，皆是生活',center:.487,items:[
    {id:'hat',x:17380,y:1376,r:47}, {id:'umbrella',x:18790,y:941,r:95},
    {id:'cart',x:18175,y:1390,r:90}, {id:'wine',x:17660,y:1195,r:70},
    {id:'boat',x:19920,y:535,r:260}, {id:'bowl',x:18532,y:654,r:54}
  ]},
  {name:'汴河舟楫',ordinal:'第二卷',numeral:'贰',subtitle:'一河碧水，千帆日常',center:.645,items:[
    {id:'boat',x:24410,y:1048,r:150},{id:'mast',x:24183,y:611,r:90},
    {id:'rope',x:24937,y:925,r:65},{id:'canopy',x:25772,y:698,r:140}
  ]},
  {name:'城郭烟火',ordinal:'第三卷',numeral:'叁',subtitle:'街巷深处，烟火寻常',center:.195,items:[
    {id:'gate',x:6949,y:428,r:240},{id:'camel',x:6015,y:1135,r:130},
    {id:'pole',x:8337,y:1362,r:85},{id:'flatbridge',x:8765,y:1545,r:220}
  ]}
];
const state = {chapter:0,found:{},selected:'hat',zoom:1,centerX:.487,centerY:.5,listOpen:true,hint:null};
try {
  const saved=JSON.parse(localStorage.getItem('ruhua-v1'));
  if(saved && typeof saved==='object') {
    const validKeys=new Set(chapters.flatMap((chapter,i)=>chapter.items.map(item=>`${i}:${item.id}`)));
    // 仅恢复当前任务的布尔状态，防止损坏或旧版存档阻断寻物。
    if(saved.found && Object.getPrototypeOf(saved.found)===Object.prototype) {
      state.found=Object.fromEntries(Object.entries(saved.found).filter(([key,value])=>validKeys.has(key)&&value===true));
    }
    state.chapter=Number.isInteger(saved.chapter)&&saved.chapter>=0&&saved.chapter<3?saved.chapter:0;
  }
} catch {/* 存储不可用时仍可正常游玩。 */}
const scene=$('scene'),world=$('paintingWorld');
const gameAudio = window.ruhuaAudio;
void gameAudio.setChapter(state.chapter);
let scale=1,tx=0,ty=0,toastTimer,hintTimer,discoveryTimer,moveAnimation,completePending=false;
world.style.width = `${ARTWORK.width}px`;
world.style.height = `${ARTWORK.height}px`;
const maxZoom = () => Math.max(2.75, ARTWORK.height / Math.max(1, scene.clientHeight));
const activeChapter=()=>chapters[state.chapter];
const isFound=(id,chapter=state.chapter)=>Boolean(state.found[`${chapter}:${id}`]);
const save=()=>{try{localStorage.setItem('ruhua-v1',JSON.stringify({found:state.found,chapter:state.chapter}));}catch{}};
function renderQuest(){
  const chapter=activeChapter();
  $('sceneTitle').textContent=chapter.name;$('sceneSubtitle').textContent=chapter.subtitle;
  document.querySelector('.chapter-number').textContent=chapter.numeral;
  $('chapterOrdinal').textContent=chapter.ordinal;$('chapterName').textContent=chapter.name;
  $('totalCount').textContent=chapter.items.length;
  const count=chapter.items.filter(item=>isFound(item.id)).length;
  $('foundCount').textContent=count;
  document.querySelector('.quest-instruction').textContent=`${['〇','一','二','三','四','五','六'][chapter.items.length]}件小物，藏在这一卷烟火里。`;
  $('itemGrid').innerHTML=chapter.items.map(({id})=>{const item=objects[id],found=isFound(id);return `<button class="quest-item ${state.selected===id?'selected':''} ${found?'found':''}" data-item="${id}" aria-label="${item.name}，${found?'已发现，查看百科':'待寻找'}" aria-pressed="${state.selected===id}">${svg(item.icon)}<span>${item.name}</span>${found?'<b class="found-stamp">已<br>寻得</b>':''}</button>`;}).join('');
  $('itemGrid').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.item;
    if(isFound(id)){openDetail(id);return;}
    state.selected=id;state.hint=null;updateHint();renderQuest();
    void gameAudio.playEffect('select');
    $('questStatus').textContent=objects[id].scene;
  }));
  $('questStatus').innerHTML=count===chapter.items.length?'此卷小物，皆已寻得':'<i></i>静心观画，慢慢寻找';
  $('hintBtn').innerHTML=svg('search')+(count===chapter.items.length?'此卷已收齐':'借一缕灵光');
  $('hintBtn').disabled=count===chapter.items.length;
  $('allProgress').textContent=Object.values(state.found).filter(Boolean).length||'〇';
  renderHotspots();
}
function renderHotspots(){
  $('hotspots').innerHTML=activeChapter().items.map(item=>{
    const radius=Math.max(item.r,44),found=isFound(item.id);
    return `<button class="hotspot ${found?'discovered':''}" data-hotspot="${item.id}" aria-label="画中${objects[item.id].name}${found?'，已发现':''}" style="left:${item.x-radius}px;top:${item.y-radius}px;width:${radius*2}px;height:${radius*2}px"></button>`;
  }).join('');
  $('hotspots').querySelectorAll('button').forEach(button=>{
    button.addEventListener('click',event=>{if(event.detail===0)discover(button.dataset.hotspot);});
    button.addEventListener('focus',()=>{
      if(!button.matches(':focus-visible'))return;
      const item=activeChapter().items.find(item=>item.id===button.dataset.hotspot);
      panTo(item.x/ARTWORK.width,item.y/ARTWORK.height,state.zoom,state.listOpen?Math.min(120,scene.clientWidth*.2):0);
    });
  });
}
function updateView(){
  const width=scene.clientWidth,height=scene.clientHeight;
  state.zoom = Math.min(state.zoom, maxZoom());
  scale=height/ARTWORK.height*state.zoom;
  const fullWidth=ARTWORK.width*scale,fullHeight=ARTWORK.height*scale;
  state.centerX=Math.max(width/fullWidth/2,Math.min(1-width/fullWidth/2,state.centerX));
  state.centerY=Math.max(height/fullHeight/2,Math.min(1-height/fullHeight/2,state.centerY));
  tx=width/2-state.centerX*fullWidth;ty=height/2-state.centerY*fullHeight;
  world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
  $('zoomLabel').innerHTML=`${Math.round(state.zoom*100)}<small>%</small>`;
  $('minimapWindow').style.left=`${Math.max(0,-tx/fullWidth)*100}%`;
  $('minimapWindow').style.width=`${Math.min(1,width/fullWidth)*100}%`;
  $('minimap').setAttribute('aria-valuenow',Math.round(state.centerX*100));
  updateHint();
}
function updateHint(){
  const ring=$('hintRing');ring.classList.toggle('show',Boolean(state.hint));
  if(!state.hint)return;
  ring.style.left=`${state.hint.x*scale+tx}px`;ring.style.top=`${state.hint.y*scale+ty}px`;
  const size=Math.max(90,Math.min(180,state.hint.r*scale*3));ring.style.width=ring.style.height=`${size}px`;
}
function panTo(x,y=.5,zoom=state.zoom,offset=0){
  cancelAnimationFrame(moveAnimation);const startX=state.centerX,startY=state.centerY,startZoom=state.zoom;
  const targetX=x-offset/(ARTWORK.width*(scene.clientHeight/ARTWORK.height)*zoom),start=performance.now();
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:650;
  function animate(time){const p=duration?Math.min(1,(time-start)/duration):1,t=1-Math.pow(1-p,3);state.centerX=startX+(targetX-startX)*t;state.centerY=startY+(y-startY)*t;state.zoom=startZoom+(zoom-startZoom)*t;updateView();if(p<1)moveAnimation=requestAnimationFrame(animate);}
  moveAnimation=requestAnimationFrame(animate);
}
function changeZoom(delta,anchor){
  cancelAnimationFrame(moveAnimation);
  const oldScale=scale,next=Math.min(maxZoom(),Math.max(1,state.zoom+delta));
  if(anchor){const px=(anchor.x-tx)/oldScale,py=(anchor.y-ty)/oldScale;const nextScale=scene.clientHeight/ARTWORK.height*next;state.centerX=(px-(anchor.x-scene.clientWidth/2)/nextScale)/ARTWORK.width;state.centerY=(py-(anchor.y-scene.clientHeight/2)/nextScale)/ARTWORK.height;}
  state.zoom=next;updateView();
}
function showToast(text){clearTimeout(toastTimer);$('sceneToast').textContent=text;$('sceneToast').classList.add('show');toastTimer=setTimeout(()=>$('sceneToast').classList.remove('show'),3000);}
function hint(){
  let item=activeChapter().items.find(item=>item.id===state.selected&&!isFound(item.id));
  item ||= activeChapter().items.find(item=>!isFound(item.id));
  if(!item)return;
  void gameAudio.playEffect('hint');
  state.selected=item.id;state.hint=item;renderQuest();updateHint();
  const offset=state.listOpen?Math.min(120,scene.clientWidth*.2):0;
  panTo(item.x/ARTWORK.width,item.y/ARTWORK.height,Math.max(1.25,state.zoom),offset);
  $('questStatus').textContent=objects[item.id].scene;
  showToast(`留意微光处 · ${objects[item.id].name}`);
  clearTimeout(hintTimer);hintTimer=setTimeout(()=>{state.hint=null;updateHint();},16000);
}
function discover(id){
  if(isFound(id)){openDetail(id);return;}
  state.found[`${state.chapter}:${id}`]=true;state.hint=null;clearTimeout(hintTimer);save();renderQuest();updateHint();
  void gameAudio.playEffect('found');showToast(`寻得 · ${objects[id].name}`);
  completePending=activeChapter().items.every(item=>isFound(item.id));
  const discoveredChapter=state.chapter;
  clearTimeout(discoveryTimer);
  discoveryTimer=setTimeout(()=>{if(state.chapter===discoveredChapter)openDetail(id,true);},350);
}
function inspectPoint(x,y){
  const artX=(x-tx)/scale,artY=(y-ty)/scale;
  let closest=null,score=Infinity;
  for(const item of activeChapter().items){const distance=Math.hypot(artX-item.x,artY-item.y),radius=Math.max(item.r,32/scale);if(distance<radius&&distance/radius<score){score=distance/radius;closest=item;}}
  if(closest){discover(closest.id);return;}
  const flash=document.createElement('span');flash.className='flash-dot';flash.style.left=`${x}px`;flash.style.top=`${y}px`;scene.append(flash);setTimeout(()=>flash.remove(),750);
}
const pointers=new Map();let gesture=null;
scene.addEventListener('pointerdown',event=>{
  if(event.target.closest('.quest-sheet,.view-tools,.scene-bottom,.loading-note'))return;
  cancelAnimationFrame(moveAnimation);scene.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===1)gesture={startX:event.clientX,startY:event.clientY,prevX:event.clientX,prevY:event.clientY,moved:false};
  else if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={pinch:Math.hypot(a.x-b.x,a.y-b.y),zoom:state.zoom,moved:true};}
});
scene.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId)||!gesture)return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===2){const[a,b]=[...pointers.values()];state.zoom=Math.max(1,Math.min(maxZoom(),gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.pinch));updateView();return;}
  if(gesture.pinch)return;
  const dx=event.clientX-gesture.prevX,dy=event.clientY-gesture.prevY;
  if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>5){gesture.moved=true;scene.classList.add('dragging');}
  if(gesture.moved){state.centerX-=dx/(ARTWORK.width*scale);state.centerY-=dy/(ARTWORK.height*scale);updateView();}
  gesture.prevX=event.clientX;gesture.prevY=event.clientY;
});
function endPointer(event){
  if(!pointers.has(event.pointerId))return;
  if(gesture&&!gesture.moved&&event.type==='pointerup'){const rect=scene.getBoundingClientRect();inspectPoint(event.clientX-rect.left,event.clientY-rect.top);}
  pointers.delete(event.pointerId);if(!pointers.size){gesture=null;scene.classList.remove('dragging');}
}
scene.addEventListener('pointerup',endPointer);scene.addEventListener('pointercancel',endPointer);
scene.addEventListener('wheel',event=>{if(event.target.closest('.quest-sheet,.loading-note'))return;event.preventDefault();const rect=scene.getBoundingClientRect();changeZoom(-Math.sign(event.deltaY)*.12,{x:event.clientX-rect.left,y:event.clientY-rect.top});},{passive:false});
scene.addEventListener('keydown',event=>{
  if(event.target!==scene)return;
  const shifts={ArrowLeft:-1,ArrowRight:1};
  if(event.key in shifts){event.preventDefault();state.centerX+=shifts[event.key]*scene.clientWidth/(ARTWORK.width*scale)*.22;updateView();}
  if(event.key==='+'||event.key==='='){event.preventDefault();changeZoom(.25);}
  if(event.key==='-'){event.preventDefault();changeZoom(-.25);}
  if(event.key==='0')panTo(activeChapter().center,.5,1);
});
$('zoomIn').onclick=()=>changeZoom(.25);$('zoomOut').onclick=()=>changeZoom(-.25);
$('nativeView').onclick=()=>panTo(state.centerX,state.centerY,Math.max(1,ARTWORK.height/scene.clientHeight));
$('resetView').onclick=()=>{state.hint=null;panTo(activeChapter().center,.5,1);};
$('hintBtn').onclick=hint;
$('collapseBtn').onclick=()=>{state.listOpen=!state.listOpen;scene.classList.toggle('list-hidden',!state.listOpen);$('collapseBtn').textContent=state.listOpen?'收起寻物笺':'展开寻物笺';$('collapseBtn').setAttribute('aria-expanded',state.listOpen);};
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('gameFrame').requestFullscreen();}catch{showToast('当前窗口暂不支持全屏');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreenBtn').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏观画');updateView();});
function switchChapter(index){
  clearTimeout(discoveryTimer);clearTimeout(hintTimer);
  const previousChapter = state.chapter;
  state.chapter=(index+chapters.length)%chapters.length;
  state.selected=activeChapter().items.find(item=>!isFound(item.id))?.id||activeChapter().items[0].id;
  state.hint=null;completePending=false;save();renderQuest();panTo(activeChapter().center,.5,1);
  if (state.chapter !== previousChapter) {
    void gameAudio.playEffect('chapter');
    void gameAudio.setChapter(state.chapter);
  }
}
$('prevChapter').onclick=()=>switchChapter(state.chapter-1);$('nextChapter').onclick=()=>switchChapter(state.chapter+1);
function moveMap(event){const rect=$('minimap').getBoundingClientRect();state.centerX=(event.clientX-rect.left)/rect.width;updateView();}
$('minimap').addEventListener('pointerdown',event=>{$('minimap').setPointerCapture(event.pointerId);moveMap(event);});
$('minimap').addEventListener('pointermove',event=>{if(event.buttons)moveMap(event);});
$('minimap').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();state.centerX+=event.key==='ArrowLeft'?-.025:.025;updateView();}});
function showDialog(dialog,{silent=false}={}){
  if(dialog.open)return;
  dialog.showModal();
  if(!silent)void gameAudio.playEffect('page-open');
}
function closeDialog(dialog){
  dialog.close();void gameAudio.playEffect('page-close');
  if(dialog.id==='detailDialog'&&completePending){completePending=false;showComplete();}
}
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.addEventListener('click',event=>{if(event.target.closest('[data-close]'))closeDialog(dialog);else if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog(dialog);}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});
});
function openDetail(id,fresh=false){
  const item=objects[id];const found=Object.keys(state.found).some(key=>key.endsWith(`:${id}`)&&state.found[key]);
  const artwork=id==='bowl'
    ? '<img class="museum-image" src="assets/celadon.jpg" alt="南宋龙泉窑青瓷莲瓣纹碗，器物参照"><span class="image-credit">龍泉窯 青瓷蓮瓣紋碗<br>國立故宮博物院，臺北 · CC BY 4.0</span>'
    : `${svg(item.icon,'object-art')}<span class="object-caption">器 物 意 象</span>`;
  $('detailContent').innerHTML=`<div class="detail-layout"><div class="detail-art"><span class="detail-category">${id==='bowl'?'南宋藏品 · 延伸鉴赏':`宋人百物 · ${item.category}`}</span>${artwork}</div><div class="detail-copy"><span class="found-label">${found?'已收录':'宋人百物'}</span><h2>${item.name==='瓷碗'?'宋代瓷器':item.name}</h2><div class="detail-subtitle">${item.subtitle}</div><section class="detail-section"><h3>日常之间</h3><p>${item.use}</p></section><section class="detail-section"><h3>${id==='bowl'?'延伸鉴赏':'笔墨之外'}</h3><p>${item.craft}</p></section><a class="detail-source" href="${item.source}" target="_blank" rel="noopener noreferrer">${item.sourceName} ↗</a><button class="primary-btn" id="backToScroll">${fresh?'收好这一遇':'回到画中'}<span>→</span></button></div></div>`;
  $('backToScroll').onclick=()=>closeDialog($('detailDialog'));showDialog($('detailDialog'),{silent:fresh});
}
let category='全部',onlyFound=false;
function openCollection(foundOnly=false){onlyFound=foundOnly;category='全部';renderCollection();showDialog($('collectionDialog'));}
function renderCollection(){
  const categories=['全部','服饰','饮食','交通','建筑','商业','器具','风物'];
  $('categoryTabs').innerHTML=categories.map(name=>`<button class="${category===name?'active':''}" data-category="${name}">${name}</button>`).join('')+`<button class="${onlyFound?'active':''}" id="foundFilter">已收录</button>`;
  $('categoryTabs').querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>{category=button.dataset.category;renderCollection();});
  $('foundFilter').onclick=()=>{onlyFound=!onlyFound;renderCollection();};
  const entries=Object.entries(objects).filter(([id,item])=>(category==='全部'||item.category===category)&&(!onlyFound||Object.keys(state.found).some(key=>key.endsWith(`:${id}`)&&state.found[key])));
  $('collectionGrid').innerHTML=entries.length?entries.map(([id,item])=>{const found=Object.keys(state.found).some(key=>key.endsWith(`:${id}`)&&state.found[key]);return `<button class="collection-object" data-object="${id}">${svg(item.icon)}<h3>${item.name}</h3><span>${item.category} · ${item.subtitle.split('，')[0]}</span>${found?'<b class="collection-found">已收录</b>':''}</button>`;}).join(''):'<p class="empty-collection">画里相逢，便会在这里留下足迹。</p>';
  $('collectionGrid').querySelectorAll('button').forEach(button=>button.onclick=()=>openDetail(button.dataset.object));
}
function openOverview(){
  $('overviewChapters').innerHTML=chapters.map((chapter,i)=>`<button data-chapter="${i}"><span class="numeral">${chapter.numeral}</span><div><strong>${chapter.name}</strong><small>${chapter.subtitle}</small></div></button>`).join('');
  $('overviewChapters').querySelectorAll('button').forEach(button=>button.onclick=()=>{$('overviewDialog').close();switchChapter(Number(button.dataset.chapter));});showDialog($('overviewDialog'));
}
$('fullScroll').onclick=event=>{const rect=$('fullScroll').getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width;$('overviewDialog').close();panTo(x,.5,1);};
$('collectionNav').onclick=()=>openCollection();$('progressBtn').onclick=()=>openCollection(true);
$('mobileCollectionBtn').onclick=()=>openCollection();
$('mapExpand').setAttribute('aria-label','长卷全览');
const originalLink=document.createElement('a');
originalLink.href=ARTWORK.original.src;
originalLink.download='清明上河图-原图.jpg';
originalLink.textContent='原图下载 ↗';
document.querySelector('.artwork-credit').append(originalLink);
$('overviewNav').onclick=openOverview;$('mapExpand').onclick=openOverview;$('helpBtn').onclick=()=>showDialog($('helpDialog'));
$('journeyNav').onclick=()=>{$('gameFrame').scrollIntoView({behavior:'smooth',block:'center'});scene.focus({preventScroll:true});};
document.querySelector('.brand').onclick=event=>{event.preventDefault();switchChapter(0);};
function showComplete(){
  void gameAudio.playEffect('complete');
  $('completeObjects').innerHTML=activeChapter().items.map(({id})=>svg(objects[id].icon)).join('');
  $('completeDialog').querySelector('p').textContent=`${['〇','一','二','三','四','五','六'][activeChapter().items.length]}次相逢，记住一日汴京。`;
  const allDone=chapters.every((chapter,i)=>chapter.items.every(item=>isFound(item.id,i)));
  $('continueBtn').innerHTML=allDone?'重游这一卷 <span>→</span>':'再入下一卷 <span>→</span>';
  $('continueBtn').onclick=()=>{$('completeDialog').close();if(allDone)panTo(activeChapter().center,.5,1);else{let next=(state.chapter+1)%chapters.length;for(let i=0;i<3;i++){if(chapters[next].items.some(item=>!isFound(item.id,next)))break;next=(next+1)%3;}switchChapter(next);}};
  showDialog($('completeDialog'),{silent:true});
}
$('reviewBtn').onclick=()=>{$('completeDialog').close();openCollection(true);};
const painting = $('painting');
function showPaintingError() {
  $('loadingNote').classList.remove('loaded');
  $('loadingNote').innerHTML = '<span>画卷未能完整展开</span><button id="retryPainting">重新展卷</button>';
  $('retryPainting').onclick = () => {
    $('loadingNote').innerHTML = '<span>展卷中</span><i></i>';
    painting.src = ARTWORK.original.src;
  };
}
function finishPaintingLoad() {
  // 检查浏览器实际解码尺寸，避免将不完整或被缩小的资源当作原图。
  if (painting.naturalWidth !== ARTWORK.width || painting.naturalHeight !== ARTWORK.height) {
    showPaintingError();
    return;
  }
  $('loadingNote').classList.add('loaded');
}
painting.addEventListener('load', finishPaintingLoad);
painting.addEventListener('error', showPaintingError);
if (painting.complete) {
  if (painting.naturalWidth) finishPaintingLoad();
  else showPaintingError();
}
const resizeObserver=new ResizeObserver(updateView);resizeObserver.observe(scene);
state.centerX=activeChapter().center;state.selected=activeChapter().items.find(item=>!isFound(item.id))?.id||activeChapter().items[0].id;
renderQuest();updateView();
