// 分片仅改变文件组织，不改变原图分辨率；视野外的图片按需释放。
window.createArtworkLayer = function createArtworkLayer(host, manifest, onStateChange) {
  const resident = new Map();
  let visible = [];
  let nearby = [];
  let lastState = '';
  let tick = 0;

  host.style.width = `${manifest.width}px`;
  host.style.height = `${manifest.height}px`;

  function reportState() {
    const failed = visible.some(tile => resident.get(tile.src)?.failed);
    const ready = visible.length > 0 && visible.every(tile => resident.get(tile.src)?.loaded);
    if (ready) nearby.forEach(requestTile);
    trimCache();
    const signature = `${ready}:${failed}`;
    host.dataset.visibleTiles = String(visible.length);
    host.dataset.loadedVisibleTiles = String(visible.filter(tile => resident.get(tile.src)?.loaded).length);
    host.dataset.residentTiles = String(resident.size);
    if (signature !== lastState) {
      lastState = signature;
      onStateChange({ ready, failed });
    }
  }

  function requestTile(tile) {
    const existing = resident.get(tile.src);
    if (existing) {
      existing.lastUsed = tick;
      return;
    }
    const image = new Image();
    const record = { image, loaded: false, failed: false, lastUsed: tick };
    resident.set(tile.src, record);
    image.className = 'painting-tile';
    image.alt = '';
    image.draggable = false;
    image.decoding = 'async';
    image.fetchPriority = visible.includes(tile) ? 'high' : 'low';
    image.setAttribute('aria-hidden', 'true');
    image.style.left = `${tile.x}px`;
    image.style.top = `${tile.y || 0}px`;
    image.style.width = `${tile.width}px`;
    image.style.height = `${tile.height}px`;
    image.onload = () => {
      if (resident.get(tile.src) !== record) return;
      record.loaded = image.naturalWidth === tile.width && image.naturalHeight === tile.height;
      record.failed = !record.loaded;
      image.classList.toggle('loaded', record.loaded);
      reportState();
    };
    image.onerror = () => {
      if (resident.get(tile.src) !== record) return;
      record.failed = true;
      reportState();
    };
    host.append(image);
    image.src = tile.src;
  }

  function removeTile(source) {
    const record = resident.get(source);
    if (!record) return;
    record.image.onload = null;
    record.image.onerror = null;
    record.image.removeAttribute('src');
    record.image.remove();
    resident.delete(source);
  }

  function trimCache() {
    const wanted = new Set([...visible, ...nearby].map(tile => tile.src));
    const limit = Math.max(6, wanted.size);
    const removable = [...resident.entries()]
      .filter(([source]) => !wanted.has(source))
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    while (resident.size > limit && removable.length) removeTile(removable.shift()[0]);
  }

  return {
    update(left, right) {
      tick++;
      const center = (left + right) / 2;
      visible = manifest.tiles
        .filter(tile => tile.x < right && tile.x + tile.width > left)
        .sort((a, b) => Math.abs(a.x + a.width / 2 - center) - Math.abs(b.x + b.width / 2 - center));
      const margin = manifest.tileWidth;
      nearby = manifest.tiles.filter(tile => !visible.includes(tile)
        && tile.x < right + margin && tile.x + tile.width > left - margin);
      visible.forEach(requestTile);
      reportState();
    },
    retry() {
      visible.filter(tile => resident.get(tile.src)?.failed).forEach(tile => removeTile(tile.src));
      visible.forEach(requestTile);
      reportState();
    }
  };
};
