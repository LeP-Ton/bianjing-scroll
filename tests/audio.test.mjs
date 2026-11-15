import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../dist/audio.js', import.meta.url), 'utf8');
const uiSource = await fs.readFile(new URL('../dist/audio-ui.js', import.meta.url), 'utf8');
const catalogue = [
  { id: 'a', title: '曲甲', src: '甲.mp3', chapter: 0 },
  { id: 'b', title: '曲乙', src: '乙.mp3', chapter: 0 },
  { id: 'c', title: '曲丙', src: '丙.mp3', chapter: 1 }
];

function harness({ saved, deferredPlay = false, deferredFetch = false, manualTimers = false } = {}) {
  let clock = 1000;
  const events = new Map();
  const states = [];
  const players = [];
  const contexts = [];
  const requests = [];
  const fetches = [];
  const timers = new Set();
  const storage = new Map(saved ? [['ruhua-audio-v1', JSON.stringify(saved)]] : []);
  const document = {
    hidden: false,
    addEventListener(name, callback) { events.set(name, callback); },
    removeEventListener(name) { events.delete(name); }
  };
  class FakeAudio {
    constructor() {
      this.listeners = new Map();
      this.paused = true;
      this.ended = false;
      this.currentTime = 0;
      this.src = '';
      this.playCalls = 0;
      players.push(this);
    }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    emit(name) { this.listeners.get(name)?.(); }
    play() {
      this.playCalls++;
      this.paused = false;
      const finish = () => { this.ended = false; this.emit('playing'); };
      if (!deferredPlay) { finish(); return Promise.resolve(); }
      return new Promise((resolve, reject) => requests.push({
        src: this.src,
        resolve: () => { finish(); resolve(); }, reject
      }));
    }
    pause() { if (!this.paused) { this.paused = true; this.emit('pause'); } }
    load() { this.ended = false; }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  const parameter = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ connect(next) { return next; }, disconnect() {} });
  class FakeContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.sources = []; contexts.push(this); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createGain() { return { ...node(), gain: parameter() }; }
    createBufferSource() {
      const bufferSource = { ...node(), start() {}, stop() { this.onended?.(); } };
      this.sources.push(bufferSource);
      return bufferSource;
    }
    decodeAudioData() { return Promise.resolve({ duration: 0.7 }); }
  }
  class ClockDate extends Date { static now() { return clock; } }
  const scope = vm.createContext({
    window: { AudioContext: FakeContext }, Audio: FakeAudio, document,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    Date: ClockDate, AbortController,
    setTimeout(callback, delay) {
      if (!manualTimers) return setTimeout(callback, delay);
      const timer = { callback, at: clock + delay };
      timers.add(timer);
      return timer;
    },
    clearTimeout(timer) { if (manualTimers) timers.delete(timer); else clearTimeout(timer); },
    requestAnimationFrame(callback) { return setImmediate(() => { clock += 20; callback(clock); }); },
    fetch(url, { signal } = {}) {
      const response = { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
      if (!deferredFetch) { fetches.push({ url, signal }); return Promise.resolve(response); }
      return new Promise((resolve, reject) => {
        const abort = () => reject(Object.assign(new Error('请求已取消'), { name: 'AbortError' }));
        fetches.push({
          url, signal,
          resolve() { signal?.removeEventListener('abort', abort); resolve(response); }
        });
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
      });
    }
  });
  vm.runInContext(source, scope);
  const audio = scope.window.createGameAudio({ onChange: state => states.push(state) });
  return {
    audio, players, contexts, requests, fetches, states, timers,
    mountUI({ effects = {} } = {}) {
      // 只模拟声音面板需要的节点，真实执行界面处理器和音频控制器。
      const makeNode = () => ({
        dataset: {}, children: [], classList: { toggle() {} },
        setAttribute() {}, append(...children) { this.children.push(...children); },
        replaceChildren() { this.children = []; },
        querySelectorAll() { return this.children; },
        showModal() { this.open = true; }
      });
      const nodes = new Map();
      document.getElementById = id => {
        if (!nodes.has(id)) nodes.set(id, makeNode());
        return nodes.get(id);
      };
      document.createElement = makeNode;
      scope.window.RUHUA_AUDIO_CATALOG = { tracks: catalogue, effects };
      scope.window.createGameAudio = ({ onChange }) => ({
        ...audio,
        configure(value) { audio.configure(value); onChange(audio.getState()); }
      });
      vm.runInContext(uiSource, scope);
      return nodes;
    },
    advance(ms) {
      clock += ms;
      if (manualTimers) {
        for (const timer of [...timers]) {
          if (timer.at <= clock && timers.delete(timer)) timer.callback();
        }
      }
    },
    async visibility(hidden) { document.hidden = hidden; events.get('visibilitychange')?.(); await settle(); }
  };
}
async function settle() {
  for (let index = 0; index < 80; index++) await new Promise(resolve => setImmediate(resolve));
}

test('空清单不产生虚构音乐或请求；恢复已开启偏好也须先解锁', async () => {
  const h = harness({ saved: { musicEnabled: true } });
  h.audio.configure({ tracks: [] });
  await h.audio.enable();
  assert.equal(h.players[0].src, '');
  assert.equal(h.players[0].playCalls, 0);
  assert.equal(h.audio.getState().trackCount, 0);
  h.audio.destroy();
  const restored = harness({ saved: { musicEnabled: true } });
  restored.audio.configure({ tracks: catalogue });
  assert.equal(restored.players[0].playCalls, 0);
  assert.equal(restored.audio.getState().unlocked, false);
  restored.audio.destroy();
});

test('音乐和音效独立控制，关闭音乐后仍可播放已解锁的音效', async () => {
  const h = harness();
  h.audio.configure({ tracks: catalogue, effects: { select: '点选.wav' } });
  await h.audio.enable();
  assert.equal(h.players[0].src, '甲.mp3');
  await h.audio.setMusicEnabled(false);
  assert.equal(h.players[0].paused, true);
  assert.equal(await h.audio.playEffect('select'), true);
  assert.equal(h.audio.getState().effectsEnabled, true);
  h.audio.destroy();
});

test('快速切歌只保留单个音乐元素，迟到的旧播放请求不会替换新曲', async () => {
  const h = harness({ deferredPlay: true });
  h.audio.configure({ tracks: catalogue });
  const first = h.audio.enable();
  assert.equal(h.requests[0].src, '甲.mp3');
  const latest = h.audio.playTrack('b');
  await settle();
  assert.equal(h.requests[1].src, '乙.mp3');
  h.requests[1].resolve();
  await latest;
  h.requests[0].reject(Object.assign(new Error('旧请求已中止'), { name: 'AbortError' }));
  await first;
  assert.equal(h.players.length, 1);
  assert.equal(h.players[0].src, '乙.mp3');
  assert.equal(h.audio.getState().trackId, 'b');
  assert.equal(h.audio.getState().error, '');
  h.audio.destroy();
});

test('选曲过渡中立即暂停，界面迟到回调不会重新开启音乐', async () => {
  const h = harness();
  const nodes = h.mountUI();
  await h.audio.enable();
  nodes.get('trackList').children[1].onclick();
  nodes.get('musicPlayBtn').onclick();
  await settle();
  assert.equal(h.audio.getState().trackId, 'b');
  assert.equal(h.audio.getState().musicEnabled, false);
  assert.equal(h.players[0].paused, true);
  h.audio.destroy();
});

test('音乐尚未加载时，声音设置立即打开且试音独立响应', async () => {
  const h = harness({ deferredPlay: true });
  const nodes = h.mountUI({ effects: { found: '寻得.wav' } });
  try {
    void h.audio.enable();
    nodes.get('soundBtn').onclick();
    assert.equal(nodes.get('soundDialog').open, true);
    void nodes.get('testEffect').onclick();
    await settle();
    assert.equal(h.contexts[0].sources.length, 1);
    assert.equal(nodes.get('testEffect').textContent, '再听');
  } finally {
    h.audio.destroy();
    h.requests.forEach(request => request.resolve());
    await settle();
  }
});

test('切到后台立即暂停；后台手动关闭后回前台不自行重播', async () => {
  const h = harness();
  h.audio.configure({ tracks: catalogue });
  await h.audio.enable();
  await h.visibility(true);
  assert.equal(h.players[0].paused, true);
  await h.audio.setMusicEnabled(false);
  const calls = h.players[0].playCalls;
  await h.visibility(false);
  assert.equal(h.players[0].playCalls, calls);
  assert.equal(h.audio.getState().isPlaying, false);
  h.audio.destroy();
});

test('音效懒加载、缓存解码、节流并限制并发；静音取消迟到音效', async () => {
  const h = harness();
  h.audio.configure({ effects: { found: '寻得.wav' } });
  assert.equal(await h.audio.playEffect('found'), false);
  assert.equal(h.fetches.length, 0);
  await h.audio.resume();
  assert.equal(await h.audio.playEffect('found'), true);
  assert.equal(await h.audio.playEffect('found'), false);
  for (let index = 0; index < 3; index++) {
    h.advance(200);
    assert.equal(await h.audio.playEffect('found'), true);
  }
  h.advance(200);
  assert.equal(await h.audio.playEffect('found'), false);
  assert.equal(h.fetches.length, 1);
  assert.equal(h.contexts[0].sources.length, 4);
  h.audio.destroy();

  const pending = harness({ deferredFetch: true });
  pending.audio.configure({ effects: { select: '点选.wav' } });
  await pending.audio.resume();
  const playing = pending.audio.playEffect('select');
  pending.audio.setEffectsEnabled(false);
  pending.fetches[0].resolve();
  assert.equal(await playing, false);
  assert.equal(pending.contexts[0].sources.length, 0);
  pending.audio.destroy();
});

test('音效下载八秒超时释放名额并允许重试，销毁取消剩余请求', async () => {
  const h = harness({ deferredFetch: true, manualTimers: true });
  h.audio.configure({ effects: { select: '点选.wav', hint: '提示.wav' } });
  await h.audio.resume();
  const stalled = Array.from({ length: 4 }, () => h.audio.playEffect('select', { cooldown: 0 }));
  assert.equal(h.fetches.length, 1);
  h.advance(7999);
  assert.equal(h.fetches[0].signal.aborted, false);
  h.advance(1);
  assert.equal(h.fetches[0].signal.aborted, true);
  assert.deepEqual(await Promise.all(stalled), [false, false, false, false]);
  assert.equal(h.timers.size, 0);

  const retry = h.audio.playEffect('select');
  assert.equal(h.fetches.length, 2);
  h.fetches[1].resolve();
  assert.equal(await retry, true);
  assert.equal(h.timers.size, 0);

  const pending = h.audio.playEffect('hint');
  assert.equal(h.fetches[2].signal.aborted, false);
  h.audio.destroy();
  assert.equal(h.fetches[2].signal.aborted, true);
  assert.equal(await pending, false);
  assert.equal(h.timers.size, 0);
  assert.equal(h.contexts[0].sources.length, 1);
});

test('曲目结束轮播，按画卷选择对应分组，音量和损坏偏好受限', async () => {
  const h = harness({ saved: { musicVolume: null, effectsVolume: 7 } });
  h.audio.configure({ tracks: catalogue });
  assert.equal(h.audio.getState().musicVolume, 0.38);
  assert.equal(h.audio.getState().effectsVolume, 1);
  await h.audio.enable();
  h.players[0].ended = true;
  h.players[0].emit('ended');
  await settle();
  assert.equal(h.audio.getState().trackId, 'b');
  await h.audio.setChapter(1);
  assert.equal(h.audio.getState().trackId, 'c');
  h.audio.setMusicVolume(-5);
  assert.equal(h.audio.getState().musicVolume, 0);
  h.audio.destroy();
});

test('已被关闭动作替代的开页声、过迟反馈和后台前遗留音效不再补响', async () => {
  const h = harness({ deferredFetch: true });
  h.audio.configure({ effects: { 'page-open': '开页.wav', 'page-close': '关页.wav', hint: '提示.wav' } });
  await h.audio.resume();
  const opening = h.audio.playEffect('page-open');
  const closing = h.audio.playEffect('page-close');
  h.fetches[0].resolve();
  h.fetches[1].resolve();
  assert.equal(await opening, false);
  assert.equal(await closing, true);
  h.advance(200);
  const late = h.audio.playEffect('hint');
  h.advance(1000);
  h.fetches[2].resolve();
  assert.equal(await late, false);
  h.audio.destroy();

  const hidden = harness({ deferredFetch: true });
  hidden.audio.configure({ effects: { select: '点选.wav' } });
  await hidden.audio.resume();
  const pending = hidden.audio.playEffect('select');
  await hidden.visibility(true);
  await hidden.visibility(false);
  hidden.fetches[0].resolve();
  assert.equal(await pending, false);
  hidden.audio.destroy();
});
