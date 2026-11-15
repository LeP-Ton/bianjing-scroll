import fs from 'node:fs/promises';

// 所有主题与变奏逐小节创作。微时值只模拟演奏呼吸，不随机选择音高。
const output = new URL('./scores/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const round = value => +value.toFixed(4);

function score(id, title, chapter, duration, bpm, meter, description, sections) {
  return { id, title, chapter, duration, sampleRate: 48000, bpm, meter, description, sections, notes: [] };
}

function note(piece, t, d, m, v, instrument, pan = 0) {
  const end = Math.min(piece.duration - 3, t + d);
  if (t < 0 || end <= t) throw new Error(`无效音符时间：${piece.id} ${t}`);
  piece.notes.push({ t: round(t), d: round(end - t), m, v: round(v), instrument, pan });
}

function bars(piece, start, unit, beatsPerBar, material, instrument, velocity, pan = 0) {
  const touches = [1, .92, .96, .90, 1.025, .94, .89, .98];
  const breaths = [0, .009, -.006, .014, -.008, .011, -.004, .007];
  const resonance = { qin: 1, zheng: .80, pipa: .48, xiao: 0, sheng: 0, wood: 0 };
  material.forEach((bar, barIndex) => {
    const contour = [1, 1.025, .96, .87, 1.015, 1.04, .94, .86][barIndex % 8];
    bar.forEach(([offset, midi, held], index) => {
      const t = start + (barIndex * beatsPerBar + offset) * unit + breaths[(index + barIndex) % breaths.length];
      const d = instrument === 'xiao' ? held * unit * .91 : held * unit + resonance[instrument];
      note(piece, t, d, midi, velocity * contour * touches[(index + 2 * barIndex) % touches.length], instrument, pan);
    });
  });
}

function lowGesture(piece, time, root, open, velocity, length = 6, pan = -.27) {
  // 两次落音之间留白，开放音程只承担支点，不铺连续和弦。
  note(piece, time, Math.min(4.5, length), root, velocity, 'qin', pan);
  note(piece, time + length * .56, Math.min(2.8, length * .42), open, velocity * .72, 'qin', pan + .07);
}

function airDyad(piece, t, d, low, high, velocity) {
  note(piece, t, d, low, velocity, 'sheng', .06);
  note(piece, t + .045, d - .045, high, velocity * .79, 'sheng', .10);
}

const bridge = score('bridge-dawn', '虹桥春晓', 0, 150, 64, '4/4',
  'D宫五声。八小节问答主题由箫展开，古琴在中段接过下降动机；再现放轻并移开伴奏落点。十六个两小节主句，细疏的开放音程与留白。完整原创器乐，不是宋代古曲复原。', [
    { name: '引子 · 晨光入卷', start: 0, end: 8 },
    { name: 'A · 虹桥初见', start: 8, end: 38 },
    { name: 'A′ · 行人渐近', start: 38, end: 68 },
    { name: 'B · 桥下琴答', start: 68, end: 98 },
    { name: '再现 · 晴光回望', start: 98, end: 128 },
    { name: '尾声 · 一线春水', start: 128, end: 147 },
    { name: '余韵', start: 147, end: 150 }
  ]);
const bridgeA = [
  [[0,62,1.5],[2,64,.75],[3,66,.85]],
  [[0,69,2],[2,71,1],[3,69,.75]],
  [[0,66,1.4],[1.5,64,.9],[3,62,.8]],
  [[0,64,2.5],[3,57,.8]],
  [[0,62,.9],[1,66,.7],[2,69,1.5]],
  [[0,71,1.5],[2,69,.7],[3,66,.8]],
  [[0,64,1.2],[1.5,66,.8],[3,64,.7]],
  [[0,62,2.6]]
];
const bridgeVariation = [
  [[0,62,1],[1.25,66,.5],[2,64,.5],[3,66,.7]],
  [[0,69,1.4],[1.75,71,.6],[2.75,74,1]],
  [[0,71,1],[1.5,69,.65],[2.75,66,.8]],
  [[0,64,.8],[1.5,66,.7],[2.75,64,.7]],
  [[0,62,.8],[1,64,.4],[1.75,66,.8],[3,69,.8]],
  [[0,71,2],[2.5,69,.9]],
  [[0,66,1],[1.5,64,.75],[3,62,.8]],
  [[0,64,1.2],[2,62,1.25]]
];
const bridgeB = [
  [[0,57,1.1],[1.5,64,.8],[3,62,.65]],
  [[0,66,1.1],[1.5,69,.7],[2.75,66,.7]],
  [[0,64,1.1],[1.5,62,.8],[3,59,.65]],
  [[0,57,2.3],[3,64,.6]],
  [[0,59,.8],[1.25,62,.8],[2.75,64,.9]],
  [[0,66,1.25],[1.75,64,.7],[3,62,.6]],
  [[0,57,1],[1.5,59,.7],[2.75,64,.75]],
  [[0,62,2.4]]
];
const bridgeReturn = [
  ...bridgeA.slice(0, 4),
  [[0,62,1.2],[1.75,66,.65],[2.75,69,.9]],
  [[0,71,1.7],[2.25,69,1.15]],
  [[0,66,1.2],[1.75,64,.8],[3,66,.65]],
  [[0,64,1.15],[1.75,62,1.65]]
];
const bridgeBeat = 60 / 64;
[[.8,50,4.7,.31],[2.4,57,3.3,.25],[3.7,62,2.8,.29],[5.3,64,1.7,.24],[6.7,66,1,.25],[7.55,69,.6,.19]]
  .forEach(([t,m,d,v]) => note(bridge,t,d,m,v,'qin',-.21));
airDyad(bridge,5.2,3.3,50,57,.065);
bars(bridge,8,bridgeBeat,4,bridgeA,'xiao',.39,.05);
bars(bridge,38,bridgeBeat,4,bridgeVariation,'xiao',.405,.05);
bars(bridge,68,bridgeBeat,4,bridgeB,'qin',.37,-.16);
bars(bridge,98,bridgeBeat,4,bridgeReturn,'xiao',.355,.035);
[
  [8.2,50,57,.22,6],[16.4,45,52,.19,5.8],[23.5,52,57,.21,5.5],[31.8,50,57,.20,5.6],
  [38.3,50,57,.23,5.5],[45.8,52,57,.20,5.8],[54.1,45,52,.22,5.2],[61.2,50,57,.20,5.5],
  [68.3,38,45,.18,5.7],[80.0,45,52,.15,5.2],[91.8,50,57,.15,5.2],
  [98.4,50,57,.19,6.6],[109.9,45,52,.17,6.5],[121.0,50,57,.17,5.6]
].forEach(([t,root,open,v,length]) => lowGesture(bridge,t,root,open,v,length));
[[50,4.5,50,57,.073],[61.5,3.8,52,57,.066],[100,4.8,50,57,.065],[115,4.3,45,52,.058]]
  .forEach(args => airDyad(bridge,...args));
[[18.6,74,1.2],[36.1,69,1.2],[56.7,74,1.4],[66,66,1.3],[111.5,74,1.8],[126.2,69,1.6]]
  .forEach(([t,m,d],i) => note(bridge,t,d,m,.13 + (i % 2) * .015,'zheng',.27));
[[74.15,64,1.35],[82.4,62,1.6],[89.6,57,1.3],[95.0,66,.8],[96.1,62,1.2]]
  .forEach(([t,m,d]) => note(bridge,t,d,m,.225,'xiao',.06));
[[128.5,62,3,.28],[131,64,2,.23],[132.3,66,2.2,.25],[134.8,69,3,.26],[138,66,2.5,.24],
  [140.4,64,2.4,.22],[144,62,3,.27],[145,74,2,.12]]
  .forEach(([t,m,d,v]) => note(bridge,t,d,m,v,'qin',-.18));
[[129,57,2.7],[135,62,3.1],[140,57,2],[143,62,3.3]]
  .forEach(([t,m,d],i) => note(bridge,t,d,m,.26-i*.02,'xiao',.05));
airDyad(bridge,128.2,5.8,50,57,.059);
airDyad(bridge,139,4.5,50,57,.045);

const marketBeat = 60 / 76;
const marketBar = marketBeat * 2;
const marketStarts = { a: marketBar * 4, av: marketBar * 20, b: marketBar * 36,
  bridge: marketBar * 52, reprise: marketBar * 60, coda: marketBar * 76 };
const market = score('market-walk', '市井行歌', 0, 144, 76, '2/4',
  'G宫五声。琵琶以轻快但不催促的十六小节主题描摹街市，筝在变奏中舒展同一轮廓；中段落入中低音区，八小节过门轮流应答，再现缩减伴奏。十六个四小节主句，无现代鼓组。完整原创器乐。', [
    { name: '引子 · 巷口开市', start: 0, end: round(marketStarts.a) },
    { name: 'A · 人间行歌', start: round(marketStarts.a), end: round(marketStarts.av) },
    { name: 'A′ · 檐下应答', start: round(marketStarts.av), end: round(marketStarts.b) },
    { name: 'B · 街角闲步', start: round(marketStarts.b), end: round(marketStarts.bridge) },
    { name: '过门 · 两厢相和', start: round(marketStarts.bridge), end: round(marketStarts.reprise) },
    { name: '再现 · 晴街回响', start: round(marketStarts.reprise), end: 120 },
    { name: '尾声 · 灯影渐远', start: 120, end: 141 },
    { name: '余韵', start: 141, end: 144 }
  ]);
const marketA = [
  [[0,67,.5],[.75,69,.4],[1.25,71,.5]],
  [[0,74,.75],[1,76,.35],[1.5,74,.4]],
  [[0,71,.7],[1.2,69,.45]],
  [[0,67,1.3]],
  [[0,69,.5],[.75,71,.4],[1.25,74,.5]],
  [[0,76,1],[1.25,74,.5]],
  [[0,71,.55],[.8,69,.45],[1.5,67,.4]],
  [[0,69,1.3]],
  [[0,67,.4],[.65,71,.5],[1.3,74,.5]],
  [[0,76,.45],[.75,79,.55],[1.45,76,.45]],
  [[0,74,.75],[1.1,71,.5]],
  [[0,69,1.4]],
  [[0,71,.4],[.65,74,.5],[1.35,76,.45]],
  [[0,74,.7],[1,71,.5]],
  [[0,69,.5],[.75,71,.4],[1.35,69,.4]],
  [[0,67,1.3]]
];
const marketVariation = [
  [[0,67,.7],[1,71,.5]],
  [[0,74,.5],[.75,76,.4],[1.3,79,.4]],
  [[0,76,.5],[.75,74,.55],[1.5,71,.35]],
  [[0,69,1.3]],
  [[0,71,.5],[.75,69,.4],[1.3,67,.45]],
  [[0,69,.7],[1.1,74,.5]],
  [[0,71,.7],[1,67,.55]],
  [[0,69,1.35]],
  [[0,67,.4],[.65,71,.45],[1.3,74,.5]],
  [[0,76,.8],[1.1,74,.55]],
  [[0,71,.4],[.65,74,.5],[1.35,71,.4]],
  [[0,69,1.3]],
  [[0,67,.5],[.75,69,.4],[1.3,71,.5]],
  [[0,74,.6],[1,76,.55]],
  [[0,74,.5],[.75,71,.4],[1.35,69,.4]],
  [[0,67,1.4]]
];
const marketB = [
  [[0,64,.7],[1,67,.6]],
  [[0,69,.5],[.9,71,.6]],
  [[0,69,.7],[1.1,67,.55]],
  [[0,64,1.5]],
  [[0,62,.7],[1,64,.55]],
  [[0,67,.5],[1,69,.55]],
  [[0,71,.6],[1,69,.55]],
  [[0,67,1.4]],
  [[0,64,.5],[.75,67,.4],[1.3,71,.45]],
  [[0,74,.8],[1,71,.55]],
  [[0,69,.75],[1.1,67,.5]],
  [[0,64,1.4]],
  [[0,62,.5],[.75,64,.4],[1.3,67,.45]],
  [[0,69,.6],[1,67,.55]],
  [[0,64,.5],[.9,62,.5]],
  [[0,67,1.5]]
];
[[.45,55,2.6,.24],[1.45,62,2.2,.19],[2.6,67,1.8,.26],[3.65,69,1.5,.22],[4.65,71,1.3,.23],[5.6,74,1,.19]]
  .forEach(([t,m,d,v]) => note(market,t,d,m,v,'zheng',.23));
note(market,1.9,1.7,67,.21,'pipa',-.17);
note(market,4.8,1.0,62,.16,'pipa',-.17);
bars(market,marketStarts.a,marketBeat,2,marketA,'pipa',.39,-.17);
bars(market,marketStarts.av,marketBeat,2,marketVariation,'zheng',.345,.22);
bars(market,marketStarts.b,marketBeat,2,marketB,'pipa',.345,-.14);
bars(market,marketStarts.reprise,marketBeat,2,marketA.slice(0,8),'pipa',.355,-.17);
const marketLast = [
  ...marketVariation.slice(8, 13),
  [[0,74,.8],[1.25,71,.5]],
  [[0,69,.65],[1.1,71,.45]],
  [[0,67,1.55]]
];
bars(market,marketStarts.reprise + 8 * marketBar,marketBeat,2,marketLast,'zheng',.315,.22);
[
  [marketStarts.a,[[0,55,62],[5,50,57],[10,52,59],[14,55,62]],.20],
  [marketStarts.av,[[0,52,59],[4,55,62],[9,50,57],[14,55,62]],.19],
  [marketStarts.b,[[0,52,59],[6,43,50],[10,50,57],[15,55,62]],.18],
  [marketStarts.reprise,[[0,43,50],[6,50,57],[12,55,62]],.18]
].forEach(([start,gestures,v]) => gestures.forEach(([bar,root,open]) => {
  lowGesture(market,start + bar * marketBar + .12,root,open,v,4.2);
}));
// 只在长句收束处添一笔拨弦或箫音，不将街市写成密集伴奏。
[[marketStarts.a+3*marketBar+.5,74,1.7],[marketStarts.a+11*marketBar+.4,76,1.5],
  [marketStarts.b+7*marketBar+.3,74,1.6],[marketStarts.b+15*marketBar+.4,71,1.5]]
  .forEach(([t,m,d]) => note(market,t,d,m,.15,'zheng',.26));
[[marketStarts.av+3*marketBar+.8,67,1.2],[marketStarts.av+7*marketBar+.65,62,1.2],
  [marketStarts.av+11*marketBar+.65,67,1.1],[marketStarts.av+15*marketBar+.7,62,1.2]]
  .forEach(([t,m,d]) => note(market,t,d,m,.15,'pipa',-.18));
const marketLink = [
  [[0,67,.45],[.75,69,.4],[1.4,71,.35]],
  [[0,74,.9]],
  [[0,76,.5],[.85,74,.6]],
  [[0,71,1.2]],
  [[0,71,.45],[.75,69,.4],[1.4,67,.35]],
  [[0,64,.9]],
  [[0,76,.5],[.85,74,.5]],
  [[0,71,.55],[1,69,.6]]
];
for (let i = 0; i < 4; i++) {
  bars(market,marketStarts.bridge+i*2*marketBar,marketBeat,2,marketLink.slice(i*2,i*2+2),i%2?'zheng':'pipa',.30,i%2?.23:-.17);
}
lowGesture(market,marketStarts.bridge+.2,55,62,.16,6);
lowGesture(market,marketStarts.bridge+7,50,57,.14,4.3);
[[marketStarts.a+.1,55],[marketStarts.a+8*marketBar+.1,62],
  [marketStarts.reprise+.1,55],[marketStarts.reprise+8*marketBar+.1,62]]
  .forEach(([t,m]) => note(market,t,.17,m,.052,'wood',.34));
[[marketStarts.av+5.2,55,62],[marketStarts.reprise+14,55,62]]
  .forEach(([t,low,high]) => airDyad(market,t,3.4,low,high,.055));
[[marketStarts.b+4.8,64,1.7],[marketStarts.reprise+11,62,1.65],[marketStarts.reprise+23,67,1.45]]
  .forEach(([t,m,d]) => note(market,t,d,m,.205,'xiao',.05));
[[120.35,67,2.3],[122.1,71,2.1],[124.4,74,2.2],[126.6,76,2.4],
  [129.25,74,2.3],[131.6,71,2.5],[134.2,69,2.3],[136.75,67,3.1]]
  .forEach(([t,m,d],i) => note(market,t,d,m,.27-i*.012,'zheng',.23));
[[121,43,3.5,.20],[126.9,50,3.2,.16],[133.3,55,3,.17],[139.25,55,1.75,.20]]
  .forEach(([t,m,d,v]) => note(market,t,d,m,v,'qin',-.24));
[[123.2,62,1.5],[130.4,67,1.5],[137.7,62,1.6]]
  .forEach(([t,m,d]) => note(market,t,d,m,.14,'pipa',-.16));
note(market,139.55,1.3,79,.11,'zheng',.26);

const river = score('river-boat', '汴水轻舟', 1, 156, 48, '6/8',
  'A羽五声，BPM按附点四分音符计算。十二小节箫主题以六八拍摆动，第二段向高处打开，中段由古琴下降应答，再现移开落音并拉长收束。十二个四小节主句；水意由音乐暗示，不使用水声或鸟声采样。完整原创器乐。', [
    { name: '引子 · 离岸', start: 0, end: 7.5 },
    { name: 'A · 舟行汴水', start: 7.5, end: 37.5 },
    { name: 'A′ · 水面晴光', start: 37.5, end: 67.5 },
    { name: 'B · 篷下琴语', start: 67.5, end: 97.5 },
    { name: '再现 · 两岸渐远', start: 97.5, end: 127.5 },
    { name: '尾声 · 舟入留白', start: 127.5, end: 153 },
    { name: '余韵', start: 153, end: 156 }
  ]);
const riverUnit = (60 / 48) / 3;
const riverBar = riverUnit * 6;
const riverA = [
  [[0,57,4.5],[5,64,1]],
  [[0,67,3.5],[4,64,1.5]],
  [[0,62,3.5],[4.5,60,1]],
  [[0,57,4.5]],
  [[0,57,2.5],[3,60,2]],
  [[0,62,2.5],[3,64,2.5]],
  [[0,67,3],[4,69,1.5]],
  [[0,64,4.5]],
  [[0,67,2.5],[3,64,2.5]],
  [[0,62,3],[4,60,1.5]],
  [[0,64,2],[3,62,2]],
  [[0,57,4.8]]
];
const riverVariation = [
  [[0,57,2],[3,60,2]],
  [[0,64,3],[4,67,1.5]],
  [[0,69,3],[4,67,1.5]],
  [[0,64,4.5]],
  [[0,62,2.5],[3.5,64,2]],
  [[0,67,2.5],[3.5,69,2]],
  [[0,72,2.5],[3.5,69,2]],
  [[0,67,4.8]],
  [[0,64,2.5],[3.5,62,2]],
  [[0,60,2.5],[3.5,62,2]],
  [[0,64,2.5],[3.5,60,2]],
  [[0,57,4.8]]
];
const riverB = [
  [[0,64,2],[3,62,1.2],[4.5,60,1.1]],
  [[0,57,2.8],[4,55,1.2]],
  [[0,57,1.5],[2.5,60,1.1],[4,62,1.5]],
  [[0,64,3.8]],
  [[0,67,2.4],[3.5,64,1.8]],
  [[0,62,1.7],[2.5,60,1.3],[4.3,57,1.2]],
  [[0,55,2.5],[3.5,57,1.8]],
  [[0,60,3.6]],
  [[0,62,1.6],[2.4,64,1.2],[4,67,1.3]],
  [[0,64,2.7],[4,62,1.2]],
  [[0,60,2.5],[3.5,55,1.6]],
  [[0,57,4.2]]
];
const riverReturn = [
  ...riverA.slice(0,4),
  [[0,57,3],[4,60,1.4]],
  [[0,62,2.3],[3.5,64,1.8]],
  [[0,67,2.5],[3.5,69,2]],
  [[0,64,4.9]],
  [[0,67,3],[4,64,1.6]],
  [[0,62,3],[4,60,1.5]],
  [[0,64,2.5],[3.5,62,1.7]],
  [[0,57,5.2]]
];
[[.7,45,3.8,.27],[2.2,52,3.2,.22],[3.8,57,2.7,.28],[5.2,60,2,.23],[6.35,64,1.7,.21]]
  .forEach(([t,m,d,v]) => note(river,t,d,m,v,'qin',-.22));
bars(river,7.5,riverUnit,6,riverA,'xiao',.365,.04);
bars(river,37.5,riverUnit,6,riverVariation,'xiao',.39,.05);
bars(river,67.5,riverUnit,6,riverB,'qin',.35,-.13);
bars(river,97.5,riverUnit,6,riverReturn,'xiao',.335,.04);
const riverRoots = [45,45,50,45,48,50,55,52,50,48,52,45];
const riverOpen = { 45:52, 48:55, 50:57, 52:57, 55:62 };
riverRoots.forEach((root,bar) => {
  const off = [.10,.03,.18,.08][bar%4];
  note(river,7.5+bar*riverBar+off,2.9,root,.17+(bar%4===0?.025:0),'qin',-.28);
  if (bar % 4 !== 3) note(river,7.5+bar*riverBar+1.45,2.15,riverOpen[root],.115,'qin',-.21);
  // 变奏中删去两个小节的伴奏，箫升高时让声音真正展开。
  if (![3,7].includes(bar)) {
    note(river,37.5+bar*riverBar+.15,2.8,root,.165,'qin',-.28);
    if (bar%3!==1) note(river,37.5+bar*riverBar+1.55,2.05,riverOpen[root],.105,'qin',-.21);
  }
  if (bar%3!==2) {
    note(river,97.5+bar*riverBar+.16,2.65,root,.15,'qin',-.27);
    if (bar%4===0) note(river,97.5+bar*riverBar+1.6,2.0,riverOpen[root],.10,'qin',-.20);
  }
});
[[67.7,45,52,.14],[77.8,50,57,.13],[88.0,48,55,.13]]
  .forEach(([t,root,open,v])=>lowGesture(river,t,root,open,v,6));
[[47.7,69,1.4],[53.0,72,1.8],[63.0,67,1.6],[105.0,69,1.8],[122.7,64,1.8]]
  .forEach(([t,m,d])=>note(river,t,d,m,.13,'zheng',.27));
[[75.2,64,1.4],[85.5,67,1.5],[94.3,62,1.7]]
  .forEach(([t,m,d])=>note(river,t,d,m,.22,'xiao',.05));
[[38.1,5.5,45,52,.06],[57.8,4.9,50,57,.062],[69,5.8,45,52,.055],[109.7,5.5,48,55,.049]]
  .forEach(args=>airDyad(river,...args));
[[128.1,57,2.3],[131,64,2.5],[134,67,2.4],[137,64,2.45],
  [140,62,2.4],[143,60,2.6],[147.5,57,1.95],[150.1,57,2.9]]
  .forEach(([t,m,d],i)=>note(river,t,d,m,.275-i*.013,'xiao',.04));
[[128,45,3.8,.21],[130.5,52,3,.16],[133,57,2.9,.18],[136,60,2.8,.17],
  [139,57,3.3,.17],[142,52,3.2,.16],[145.5,45,3.4,.17],[149,57,2.5,.15],[151.7,69,1.3,.095]]
  .forEach(([t,m,d,v])=>note(river,t,d,m,v,'qin',-.22));
airDyad(river,128.4,5.7,45,52,.046);

const pieces = [bridge, market, river];
const scales = { 'bridge-dawn': [2,4,6,9,11], 'market-walk': [7,9,11,2,4], 'river-boat': [9,0,2,4,7] };
for (const piece of pieces) {
  piece.notes.sort((a,b)=>a.t-b.t||a.m-b.m);
  for (const n of piece.notes) {
    if (n.t < 0 || n.d <= 0 || n.t+n.d > piece.duration-3+.001 || n.v <= 0 || n.v > 1 || Math.abs(n.pan)>1) {
      throw new Error(`音符范围校验失败：${piece.id} ${JSON.stringify(n)}`);
    }
    if (n.instrument !== 'wood' && !scales[piece.id].includes(n.m % 12)) throw new Error(`音高离开五声调式：${piece.id} ${n.m}`);
  }
  await fs.writeFile(new URL(`${piece.id}.json`,output),`${JSON.stringify(piece,null,2)}\n`);
  const pitches = piece.notes.map(n=>n.m);
  console.log(`${piece.title}：${piece.duration}秒，${piece.notes.length}音符，MIDI ${Math.min(...pitches)}–${Math.max(...pitches)}，末音结束 ${round(Math.max(...piece.notes.map(n=>n.t+n.d)))}秒`);
}
