import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../dist/artwork.js', import.meta.url), 'utf8');

function createHarness(tileCount = 24, tailWidth = 100) {
  const manifest = {
    width: (tileCount - 1) * 100 + tailWidth,
    height: 40,
    tileWidth: 100,
    tiles: Array.from({ length: tileCount }, (_, index) => ({
      x: index * 100,
      width: index === tileCount - 1 ? tailWidth : 100,
      height: 40,
      src: `片-${index}.png`
    }))
  };
  const requests = [];
  const states = [];
  const host = {
    style: {},
    dataset: {},
    children: [],
    append(image) {
      image.parent = this;
      this.children.push(image);
    }
  };

  class FakeImage {
    constructor() {
      this.style = {};
      this.attributes = {};
      this.classes = new Set();
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.removed = false;
      this.classList = {
        toggle: (name, enabled) => {
          if (enabled) this.classes.add(name);
          else this.classes.delete(name);
        }
      };
    }

    set src(value) {
      this.source = value;
      requests.push(this);
    }

    setAttribute(name, value) {
      this.attributes[name] = value;
    }

    removeAttribute(name) {
      delete this.attributes[name];
      if (name === 'src') this.sourceRemoved = true;
    }

    remove() {
      this.removed = true;
      const index = this.parent.children.indexOf(this);
      if (index !== -1) this.parent.children.splice(index, 1);
    }

    load(width = 100, height = 40) {
      this.naturalWidth = width;
      this.naturalHeight = height;
      this.onload?.();
    }

    fail() {
      this.onerror?.();
    }
  }

  const window = {};
  vm.runInNewContext(source, { window, Image: FakeImage }, { filename: 'artwork.js' });
  const layer = window.createArtworkLayer(host, manifest, state => states.push({ ...state }));
  const latestImage = index => [...requests].reverse().find(image => image.source === `片-${index}.png`);
  const sources = () => requests.map(image => image.source);
  const state = () => states.at(-1);
  return { layer, host, manifest, requests, states, latestImage, sources, state };
}

test('当前可见片全部完成后才预取邻片', () => {
  const { layer, host, latestImage, sources, state } = createHarness();
  layer.update(25, 175);
  assert.deepEqual([...sources()].sort(), ['片-0.png', '片-1.png']);
  assert.equal(host.dataset.visibleTiles, '2');
  assert.deepEqual(state(), { ready: false, failed: false });

  latestImage(0).load();
  assert.equal(sources().length, 2);
  assert.equal(host.dataset.loadedVisibleTiles, '1');

  latestImage(1).load();
  assert.deepEqual(state(), { ready: true, failed: false });
  assert.equal(host.dataset.loadedVisibleTiles, '2');
  assert.deepEqual([...sources()].sort(), ['片-0.png', '片-1.png', '片-2.png']);
  assert.equal(latestImage(2).fetchPriority, 'low');
});

test('切换视野后旧片迟到不能解除当前加载状态', () => {
  const { layer, host, latestImage, sources, state } = createHarness();
  layer.update(0, 100);
  const previousImage = latestImage(0);
  layer.update(500, 600);

  previousImage.load();
  assert.deepEqual(state(), { ready: false, failed: false });
  assert.equal(host.dataset.loadedVisibleTiles, '0');
  assert.deepEqual(sources(), ['片-0.png', '片-5.png']);

  latestImage(5).load();
  assert.deepEqual(state(), { ready: true, failed: false });
  assert.equal(host.dataset.loadedVisibleTiles, '1');
});

test('当前片失败可重试，替换失败节点后恢复显示', () => {
  const { layer, host, latestImage, requests, state } = createHarness();
  layer.update(200, 300);
  const failedImage = latestImage(2);
  failedImage.fail();
  assert.deepEqual(state(), { ready: false, failed: true });

  layer.retry();
  const replacement = latestImage(2);
  assert.notEqual(replacement, failedImage);
  assert.equal(failedImage.removed, true);
  assert.equal(failedImage.sourceRemoved, true);
  assert.equal(requests.filter(image => image.source === '片-2.png').length, 2);
  assert.deepEqual(state(), { ready: false, failed: false });

  replacement.load();
  assert.deepEqual(state(), { ready: true, failed: false });
  assert.equal(host.dataset.loadedVisibleTiles, '1');
});

test('自然像素宽高不符时不判定就绪，并允许重新获取正确图片', () => {
  for (const [width, height] of [[99, 40], [100, 39]]) {
    const { layer, host, latestImage, state } = createHarness();
    layer.update(0, 100);
    const incorrectImage = latestImage(0);
    incorrectImage.load(width, height);
    assert.deepEqual(state(), { ready: false, failed: true });
    assert.equal(host.dataset.loadedVisibleTiles, '0');
    assert.equal(incorrectImage.classes.has('loaded'), false);

    layer.retry();
    latestImage(0).load();
    assert.deepEqual(state(), { ready: true, failed: false });
  }
});

test('连续浏览时缓存节点有界，宽视野保留全部当前与邻近必要片', () => {
  const { layer, host, latestImage } = createHarness();
  for (let index = 0; index < 24; index++) {
    layer.update(index * 100, (index + 1) * 100);
    latestImage(index).load();
    assert.ok(host.children.length <= 6, `窄视野缓存不应持续增长，当前 ${host.children.length}`);
    assert.equal(Number(host.dataset.residentTiles), host.children.length);
  }

  layer.update(500, 1500);
  for (let index = 5; index < 15; index++) latestImage(index).load();
  assert.equal(host.dataset.visibleTiles, '10');
  assert.equal(host.dataset.loadedVisibleTiles, '10');
  assert.equal(host.children.length, 12);
  for (let index = 4; index < 16; index++) assert.equal(latestImage(index).removed, false);
  assert.equal(host.style.width, '2400px');
  assert.equal(host.style.height, '40px');
});

test('淘汰后同源新请求不受旧请求迟到回调影响', () => {
  const { layer, host, latestImage, state } = createHarness();
  layer.update(0, 100);
  const staleImage = latestImage(0);
  const staleLoad = staleImage.onload;
  for (const index of [5, 10, 15, 20, 23, 14]) layer.update(index * 100, (index + 1) * 100);
  assert.equal(staleImage.removed, true);

  layer.update(0, 100);
  const currentImage = latestImage(0);
  assert.notEqual(currentImage, staleImage);
  staleImage.naturalWidth = 100;
  staleImage.naturalHeight = 40;
  staleLoad();
  assert.deepEqual(state(), { ready: false, failed: false });
  assert.equal(host.dataset.loadedVisibleTiles, '0');

  currentImage.load();
  assert.deepEqual(state(), { ready: true, failed: false });
});

test('非整片宽度的卷尾按真实尺寸加载，接缝与最后一像素不会漏片', () => {
  const { layer, host, latestImage, sources, state } = createHarness(21, 14);
  layer.update(1990, 2014);
  assert.deepEqual([...sources()].sort(), ['片-19.png', '片-20.png']);
  latestImage(19).load();
  latestImage(20).load(14, 40);
  assert.deepEqual(state(), { ready: true, failed: false });
  assert.equal(host.style.width, '2014px');
  assert.equal(latestImage(20).style.left, '2000px');
  assert.equal(latestImage(20).style.width, '14px');

  layer.update(2000, 2014);
  assert.equal(host.dataset.visibleTiles, '1');
  assert.equal(host.dataset.loadedVisibleTiles, '1');
  assert.deepEqual(state(), { ready: true, failed: false });
});
