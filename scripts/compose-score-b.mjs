import fs from 'node:fs/promises';

// 以下主题逐句编写；时间微调只用于演奏呼吸，不随机生成音高或拼接短循环。
const output = new URL('./scores/', import.meta.url);
await fs.mkdir(output, { recursive: true });

function score(id, title, chapter, duration, bpm, description, sections) {
  return { id, title, chapter, duration, sampleRate: 48000, bpm, meter: '4/4', description, sections, notes: [] };
}
function note(piece, t, d, m, v, instrument, pan = 0) {
  const end = Math.min(piece.duration - 3, t + d);
  if (t < 0 || end <= t) throw new Error(`无效音符时间：${piece.id} ${t}`);
  piece.notes.push({ t: +t.toFixed(4), d: +(end - t).toFixed(4), m,
    v: +Math.max(0.04, Math.min(0.9, v)).toFixed(4), instrument, pan: +pan.toFixed(3) });
}
function phrase(piece, start, length, beats, pattern, instrument, velocity, pan = 0) {
  const unit = length / beats;
  const touch = [1, 0.91, 0.96, 1.025, 0.89, 0.97, 0.94, 0.9];
  const timing = [0, 0.009, -0.013, 0.015, -0.006, 0.012, -0.008, 0.004];
  pattern.forEach(([beat, midi, held], index) => {
    note(piece, start + beat * unit + timing[index % timing.length], held * unit,
      midi, velocity * touch[index % touch.length], instrument, pan);
  });
}
function qinSupport(piece, start, length, root, variant) {
  // 单音与空五度间留出空隙，不以持续和弦铺满琴箫的呼吸。
  const gestures = [
    [[0, 0, 2.9], [3.9, 7, 1.7]],
    [[0.3, 0, 2.5], [4.9, 12, 1.4]],
    [[0, 7, 2.2], [3.4, 0, 2.8], [6.3, 7, 1.0]],
    [[0.2, 0, 2.6], [5.6, 7, 1.6]]
  ][variant % 4];
  phrase(piece, start, length, 8, gestures.map(([b, n, d]) => [b, root + n, d]), 'qin', 0.24, -0.23);
}

const willow = score('willow-breeze', '柳风过岸', 1, 148, 58,
  'E羽五声。古琴与箫交替问答，疏朗自由速度，河岸风声般的轻柔起伏。完整新作，非宋代传世曲复原。', [
    { name: '引子 · 水岸初息', start: 0, end: 11 },
    { name: 'A · 柳影问水', start: 11, end: 43.4 },
    { name: 'A′ · 风过回声', start: 43.4, end: 75.5 },
    { name: 'B · 远岸箫语', start: 75.5, end: 109 },
    { name: '再现 · 柳下归来', start: 109, end: 135 },
    { name: '尾声 · 一线水光', start: 135, end: 148 }
  ]);
const willowLines = [
  [[0,64,1.0],[1.4,67,.7],[2.35,69,.7],[3.25,71,1.35],[5.1,69,.6],[6.05,67,.7],[7.1,64,.65]],
  [[0,64,.9],[1.25,62,.7],[2.4,64,1.1],[4,67,.9],[5.4,69,.65],[6.35,67,.65],[7.3,64,.5]],
  [[0,67,.85],[1.15,71,1.15],[2.7,74,1.15],[4.2,71,.8],[5.35,69,.7],[6.55,67,.9]],
  [[0,69,1.15],[1.65,67,.8],[2.8,64,1.5],[4.75,62,.7],[6,64,1.2]],
  [[0,64,.8],[1.15,67,.55],[1.95,69,.5],[2.75,71,1.2],[4.35,74,.7],[5.5,71,.65],[6.5,67,1]],
  [[0,67,1.1],[1.6,64,.8],[2.9,62,.65],[4.1,64,1.1],[5.7,67,.6],[6.7,69,.8]],
  [[0,71,1.3],[1.8,74,.8],[3,76,.85],[4.35,74,.8],[5.5,71,.65],[6.6,69,.9]],
  [[0,67,1.3],[1.8,69,.65],[2.85,67,.75],[4.1,64,1.2],[5.8,62,.65],[6.95,64,.7]],
  [[0,71,1.7],[2.25,74,1.3],[4.15,76,.8],[5.5,74,.8],[6.8,71,.8]],
  [[0,69,1.4],[1.95,71,.75],[3.15,74,1.1],[4.8,71,.75],[6.1,67,1.1]],
  [[0,67,1.15],[1.65,64,1.1],[3.3,62,1],[4.85,64,.85],[6.2,67,1.15]],
  [[0,69,1.5],[2,67,1.1],[3.65,64,1.4],[5.6,62,.8],[6.85,64,.7]],
  [[0,64,1.25],[1.8,67,.75],[2.95,69,.7],[4.1,71,1.35],[6.1,67,1.1]],
  [[0,67,.9],[1.4,71,1.25],[3.15,74,.9],[4.6,71,.7],[5.7,69,.65],[6.75,67,.8]],
  [[0,69,1.4],[1.95,67,.85],[3.3,64,1.5],[5.35,62,.75],[6.6,64,1.0]]
];
[[.8,52,3.2,.32],[3.3,59,2.7,.24],[6.1,64,2.7,.34],[8.3,55,2.4,.21]]
  .forEach(([t,m,d,v]) => note(willow,t,d,m,v,'qin',-.18));
const willowStarts = [11,19.3,27.3,35.4,43.4,51.4,59.5,67.5,75.5,83.9,92.2,100.6,109,117.6,126.2];
const willowEnds = [...willowStarts.slice(1),135];
willowStarts.forEach((start,index) => {
  const length = willowEnds[index] - start;
  const flute = [1,3,5,6,8,9,11,13].includes(index);
  phrase(willow,start,length,8,willowLines[index],flute?'xiao':'qin',flute?.34:.53,flute?.15:-.12);
  qinSupport(willow,start,length,index>=8&&index<=9?55:52,index);
  if (!flute && [0,4,10,12].includes(index)) {
    phrase(willow,start+length*.70,length*.28,4,[[0,71,.9],[1.5,69,.8],[3,67,.75]],'xiao',.18,.23);
  }
});
[[75.8,52,6.7],[84.3,59,5.8],[101.0,52,6.5],[126.7,59,5.7]]
  .forEach(([t,m,d])=>note(willow,t,d,m,.105,'sheng',.03));
phrase(willow,135,8.5,8,[[0,71,1.2],[1.8,69,1.05],[3.5,67,1.25],[5.5,64,2]],'xiao',.23,.12);
note(willow,135.5,3.1,52,.25,'qin',-.17);
note(willow,139.8,2.2,59,.19,'qin',-.12);
note(willow,142,3,52,.28,'qin',-.10);
note(willow,142.7,2.3,64,.15,'qin',.05);

const tea = score('tea-lane', '茶巷小晴', 2, 152, 72,
  'C宫五声，72拍。筝与琵琶在四小节乐句间轮流领奏，温暖、有轻微步行脉动，保留买卖声之外的安宁。完整原创器乐。', [
    { name: '引子 · 茶盏初温', start: 0, end: 8 },
    { name: 'A · 巷口晴光', start: 8, end: 48 },
    { name: 'A′ · 檐下应答', start: 48, end: 74.6667 },
    { name: 'B · 一席闲谈', start: 74.6667, end: 114.6667 },
    { name: '再现 · 人归小巷', start: 114.6667, end: 141.3333 },
    { name: '尾声 · 茶香未散', start: 141.3333, end: 152 }
  ]);
const teaLines = [
  [[0,60,.8],[1.2,62,.65],[2.4,64,1.3],[4.3,67,.8],[5.5,69,.7],[6.7,67,1],[8.4,64,1.3],[10.4,62,.7],[11.55,64,.7],[12.8,60,1.65]],
  [[0,67,1],[1.5,69,.7],[2.7,72,1.25],[4.6,69,.8],[6,67,1.15],[8,64,1.45],[10.1,62,.75],[11.4,64,.65],[12.7,60,1.8]],
  [[0,60,.7],[1,62,.7],[2.1,64,.85],[3.4,67,1.15],[5.2,72,1.2],[7,69,.75],[8.3,67,1],[10,64,.75],[11.3,62,.75],[12.7,60,1.9]],
  [[0,60,.75],[1.1,62,.55],[2,64,.7],[3.1,67,1.15],[4.85,69,.6],[5.8,72,1.0],[7.4,69,.85],[9,67,.8],[10.4,64,.7],[11.6,62,.7],[13,60,1.5]],
  [[0,64,1.05],[1.5,67,.75],[2.7,69,1.25],[4.6,67,.85],[6,64,1],[7.7,62,.8],[9.1,64,1.2],[11,67,.8],[12.4,60,1.9]],
  [[0,67,.9],[1.4,69,.7],[2.6,72,1.35],[4.5,74,.85],[6,76,1.1],[7.7,74,.75],[9,72,1.1],[10.7,69,.8],[12.2,67,1.8]],
  [[0,69,1.05],[1.65,72,1],[3.25,74,1.4],[5.35,72,.8],[6.7,69,1.1],[8.45,67,1.1],[10.2,64,.8],[11.6,62,.7],[12.8,64,1.6]],
  [[0,67,1.15],[1.8,64,.8],[3.15,62,1.1],[4.9,64,.85],[6.3,67,1.1],[8.1,69,.75],[9.4,67,1.2],[11.3,64,.75],[12.7,60,1.7]],
  [[0,60,1.1],[1.65,62,.75],[2.9,64,1.3],[4.85,67,.85],[6.2,69,.8],[7.6,67,1.15],[9.4,64,.95],[11,62,.8],[12.4,60,2]],
  [[0,67,1.15],[1.8,69,.9],[3.3,72,1.3],[5.3,69,.8],[6.7,67,1.2],[8.55,64,1.15],[10.4,62,.75],[11.7,64,.65],[13,60,1.5]]
];
phrase(tea,.9,6.5,8,[[0,48,2.4],[1.7,55,1.4],[3,60,1.5],[5,64,1.5],[6.8,67,.8]],'zheng',.31,.05);
note(tea,4.9,1.1,60,.19,'pipa',-.15);
const teaRoots = [48,48,55,48,50,55,57,55,48,48];
const teaLength = 40/3;
for (let index=0;index<10;index++) {
  const start = 8 + index*teaLength;
  const pipaLead = [1,4,6,9].includes(index);
  phrase(tea,start,teaLength,16,teaLines[index],pipaLead?'pipa':'zheng',pipaLead?.46:.49,pipaLead?-.16:.1);
  const root = teaRoots[index];
  const accompaniment = pipaLead
    ? [[.2,root,2.7],[3.8,root+7,2],[7,root+12,1.8],[10.7,root+7,2],[14,root,1.4]]
    : [[.3,root,1.5],[3.8,root+7,1.2],[7.5,root,1.6],[10.8,root+7,1.25],[14.4,root+12,.7]];
  phrase(tea,start,teaLength,16,accompaniment,pipaLead?'zheng':'pipa',.235,pipaLead?.14:-.21);
  if ([0,2,3,5,8].includes(index)) {
    phrase(tea,start+teaLength*.81,teaLength*.17,4,
      [[0,67,.7],[1.1,64,.65],[2.4,62,.65],[3.3,60,.6]],'pipa',.16,-.18);
  }
  if ([1,4,6,9].includes(index)) {
    note(tea,start+3.8,1.1,72,.16,'zheng',.26);
    note(tea,start+9.1,1.2,67,.14,'zheng',.22);
  }
  if ([0,3,5,7,9].includes(index)) {
    note(tea,start+.02,.11,60,.085,'wood',-.04);
    note(tea,start+6.7,.09,60,.06,'wood',.04);
  }
}
// 中段只在一处加入极轻的箫线，形成与前后拨弦织体的距离感。
phrase(tea,94.5,6.7,8,[[0,76,1.3],[2,74,1],[3.7,72,1.4],[6,69,1.5]],'xiao',.15,.21);
phrase(tea,141.5,7.5,8,[[0,72,.8],[1.25,69,.8],[2.55,67,1],[4.1,64,.8],[5.4,62,.7],[6.55,60,1.45]],'zheng',.37,.07);
note(tea,142.2,1.6,55,.20,'pipa',-.19);
note(tea,145,4,48,.26,'zheng',-.06);
note(tea,146.5,2.5,60,.22,'zheng',.10);

const home = score('scroll-home', '卷归人静', 2, 162, 56,
  'F宫五声，56拍。琴为近景、箫为远景，笙只以疏落长音托住留白；中段短暂抬高后逐层退去，平静收束。完整原创器乐。', [
    { name: '引子 · 卷边余光', start: 0, end: 12 },
    { name: 'A · 归路缓行', start: 12, end: 50.5714 },
    { name: 'A′ · 灯下回望', start: 50.5714, end: 76.2857 },
    { name: 'B · 远声渐近', start: 76.2857, end: 114.8571 },
    { name: '再现 · 万籁归心', start: 114.8571, end: 140.5714 },
    { name: '尾声 · 纸上余韵', start: 140.5714, end: 162 }
  ]);
const homeLines = [
  [[0,65,1.5],[2.15,69,1.15],[3.95,72,1.65],[6.3,69,1.1],[8.15,67,1.15],[10,65,1.4]],
  [[0,67,1.35],[2,69,1.05],[3.65,67,1.2],[5.6,65,1.5],[7.85,62,1.1],[9.75,60,1.6]],
  [[0,60,1.2],[1.85,62,1],[3.55,65,1.6],[5.95,67,1.15],[7.8,69,1.2],[9.8,65,1.6]],
  [[0,65,1.15],[1.85,67,.85],[3.25,69,1.15],[5,72,1.6],[7.3,69,1.1],[9.2,67,1.6]],
  [[0,69,1.35],[2.1,67,1.1],[3.85,65,1.65],[6.2,62,1.1],[8.1,60,1.15],[10,65,1.4]],
  [[0,72,1.7],[2.45,74,1.1],[4.25,77,1.45],[6.45,74,1.1],[8.3,72,1.15],[10.2,69,1.3]],
  [[0,74,1.4],[2.15,72,1.3],[4.25,69,1.5],[6.5,67,1.1],[8.3,69,1],[10,72,1.5]],
  [[0,69,1.5],[2.2,67,1.15],[4.05,65,1.65],[6.45,62,1.1],[8.3,60,1.15],[10.1,62,1.3]],
  [[0,65,1.65],[2.4,69,1.15],[4.3,72,1.7],[6.8,69,1.15],[8.7,67,1],[10.35,65,1.3]],
  [[0,67,1.55],[2.3,65,1.35],[4.45,62,1.2],[6.4,60,1.5],[8.7,62,1.1],[10.5,65,1.15]]
];
[[.7,53,3.8,.30],[4,60,3.2,.24],[7,65,2.9,.31],[9.3,57,2.3,.20]]
  .forEach(([t,m,d,v])=>note(home,t,d,m,v,'qin',-.12));
note(home,5.2,5.9,53,.095,'sheng',.01);
const homeLength = 90/7;
for(let index=0;index<10;index++) {
  const start=12+index*homeLength;
  const flute=[1,3,5,6,9].includes(index);
  phrase(home,start,homeLength,12,homeLines[index],flute?'xiao':'qin',flute?.285:.455,flute?.17:-.13);
  phrase(home,start+.25,homeLength-.6,12,
    [[0,53,3.3],[4.3,60,2.5],[8.2,index===6?57:53,2.4]],'qin',.205,-.22);
  if([0,2,4,5,7,8].includes(index)) {
    note(home,start+.6,5.4,index===5?60:53,.12,'sheng',.015);
    if(index<8)note(home,start+7.6,3.9,index===4?57:60,.10,'sheng',-.025);
  }
  if(!flute&&[0,4,8].includes(index)) {
    phrase(home,start+8.8,3.5,4,[[0,72,1.1],[1.6,69,.85],[3,67,.8]],'xiao',.14,.24);
  }
}
phrase(home,140.7,9.1,8,[[0,72,1.4],[2.1,69,1.3],[4.15,67,1.25],[6.1,65,1.6]],'xiao',.22,.15);
note(home,141,3.7,53,.23,'qin',-.14);
note(home,145.5,3.0,60,.19,'qin',-.12);
phrase(home,150.1,7.7,8,[[0,69,1.2],[2.2,67,1.3],[4.5,65,2.7]],'qin',.32,-.08);
note(home,153,6,53,.11,'sheng',0);
note(home,155.6,3.4,53,.24,'qin',-.10);
note(home,157,2,60,.12,'qin',.11);

for(const piece of [willow,tea,home]) {
  piece.notes.sort((a,b)=>a.t-b.t||a.m-b.m);
  for(const event of piece.notes) {
    if(event.t+event.d>piece.duration-3+.0002||event.d<=0||event.m<0||event.m>127) {
      throw new Error(`曲目音符校验失败：${piece.id}`);
    }
  }
  const end=Math.max(...piece.notes.map(event=>event.t+event.d));
  if(end<piece.duration-3-.01)throw new Error(`尾声长度不足：${piece.id}`);
  await fs.writeFile(new URL(`${piece.id}.json`,output),JSON.stringify(piece,null,2)+'\n');
  const pitched=piece.notes.filter(event=>event.instrument!=='wood');
  console.log(JSON.stringify({id:piece.id,title:piece.title,duration:piece.duration,notes:piece.notes.length,
    range:[Math.min(...pitched.map(event=>event.m)),Math.max(...pitched.map(event=>event.m))],lastNoteEnd:end,
    instruments:[...new Set(piece.notes.map(event=>event.instrument))]}));
}
