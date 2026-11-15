// 登记已完成渲染、解码与时长核验的六首原创合成配乐。
window.RUHUA_AUDIO_CATALOG = {
  tracks: [
    {
      "id": "bridge-dawn",
      "title": "虹桥春晓",
      "src": "assets/audio/music/bridge-dawn.mp3",
      "chapter": 0,
      "duration": 150
    },
    {
      "id": "market-walk",
      "title": "市井行歌",
      "src": "assets/audio/music/market-walk.mp3",
      "chapter": 0,
      "duration": 144
    },
    {
      "id": "river-boat",
      "title": "汴水轻舟",
      "src": "assets/audio/music/river-boat.mp3",
      "chapter": 1,
      "duration": 156
    },
    {
      "id": "willow-breeze",
      "title": "柳风过岸",
      "src": "assets/audio/music/willow-breeze.mp3",
      "chapter": 1,
      "duration": 148
    },
    {
      "id": "tea-lane",
      "title": "茶巷小晴",
      "src": "assets/audio/music/tea-lane.mp3",
      "chapter": 2,
      "duration": 152
    },
    {
      "id": "scroll-home",
      "title": "卷归人静",
      "src": "assets/audio/music/scroll-home.mp3",
      "chapter": 2,
      "duration": 162
    }
  ],
  effects: {
    select: { src: 'assets/audio/sfx/select.wav', cooldown: 120 },
    found: { src: 'assets/audio/sfx/found.wav', cooldown: 240 },
    hint: { src: 'assets/audio/sfx/hint.wav', cooldown: 450 },
    'page-open': { src: 'assets/audio/sfx/page-open.wav', cooldown: 220 },
    'page-close': { src: 'assets/audio/sfx/page-close.wav', cooldown: 220 },
    chapter: { src: 'assets/audio/sfx/chapter.wav', cooldown: 600 },
    complete: { src: 'assets/audio/sfx/complete.wav', cooldown: 1800 }
  }
};
