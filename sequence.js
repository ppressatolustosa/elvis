
(() => {
  "use strict";

  const TOTAL_FRAMES = 180;
  const FRAME_PATH = "./frames/frame-";
  const FRAME_EXTENSION = ".jpg";
  const MAX_CONCURRENT = 6;

  const canvas = document.getElementById("sequence-canvas");
  const section = document.querySelector(".scroll-scene");
  const visual = document.querySelector(".experience-visual");

  if (!canvas || !section || !visual) return;

  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true
  });

  const images = new Array(TOTAL_FRAMES);
  const loaded = new Array(TOTAL_FRAMES).fill(false);
  const loading = new Set();
  const failed = new Set();

  let activeLoads = 0;
  let targetFrame = 0;
  let lastDrawn = -1;
  let drawPending = false;
  let scrollPending = false;
  let canvasWidth = 0;
  let canvasHeight = 0;

  const pad = n => String(n).padStart(4, "0");

  function frameUrl(index) {
    return FRAME_PATH + pad(index + 1) + FRAME_EXTENSION;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (width === canvasWidth && height === canvasHeight) return;

    canvasWidth = width;
    canvasHeight = height;

    canvas.width = width;
    canvas.height = height;

    lastDrawn = -1;
    requestDraw();
  }

  function requestDraw() {
    if (drawPending) return;

    drawPending = true;

    requestAnimationFrame(() => {
      drawPending = false;
      drawFrame();
    });
  }

  function drawFrame() {
    if (!canvasWidth || !canvasHeight) return;

    let index = targetFrame;

    // Se o frame desejado ainda não carregou,
    // exibe o frame carregado mais próximo.
    if (!loaded[index]) {
      let closest = -1;
      let shortestDistance = Infinity;

      for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (
          loaded[i] &&
          Math.abs(i - targetFrame) < shortestDistance
        ) {
          closest = i;
          shortestDistance = Math.abs(i - targetFrame);
        }
      }

      if (closest === -1) return;
      index = closest;
    }

    if (index === lastDrawn) return;

    const img = images[index];
    if (!img || !img.naturalWidth) return;

    const scale = Math.max(
      canvasWidth / img.naturalWidth,
      canvasHeight / img.naturalHeight
    );

    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    const x = (canvasWidth - width) / 2;
    const y = (canvasHeight - height) / 2;

    ctx.fillStyle = "#e8e2da";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, x, y, width, height);

    lastDrawn = index;
  }

  // Fila de carregamento priorizada pela proximidade
  // do frame solicitado durante a rolagem.
  const queue = [];
  const queued = new Set();

  function enqueue(index) {
    if (index < 0 || index >= TOTAL_FRAMES) return;
    if (loaded[index] || loading.has(index) || failed.has(index)) return;
    if (queued.has(index)) return;

    queue.push(index);
    queued.add(index);
  }

  function loadFrame(index) {
    if (loaded[index] || loading.has(index) || failed.has(index)) return;
    if (activeLoads >= MAX_CONCURRENT) return;

    loading.add(index);
    activeLoads++;

    const img = new Image();
    images[index] = img;
    img.decoding = "async";

    img.onload = () => {
      loaded[index] = true;
      loading.delete(index);
      activeLoads--;

      requestDraw();
      pumpQueue();
    };

    img.onerror = () => {
      failed.add(index);
      loading.delete(index);
      activeLoads--;

      pumpQueue();
    };

    img.src = frameUrl(index);
  }

  function prioritizeFrame(center) {
    const pending = queue.splice(0);
    queued.clear();

    // Coloca primeiro os frames próximos ao atual.
    const candidates = [...pending];

    for (let distance = 0; distance < TOTAL_FRAMES; distance++) {
      const forward = center + distance;
      const backward = center - distance;

      if (forward < TOTAL_FRAMES) candidates.push(forward);
      if (distance > 0 && backward >= 0) candidates.push(backward);
    }

    const unique = [...new Set(candidates)];

    unique.sort(
      (a, b) => Math.abs(a - center) - Math.abs(b - center)
    );

    unique.forEach(index => enqueue(index));
    pumpQueue();
  }

  function pumpQueue() {
    while (activeLoads < MAX_CONCURRENT && queue.length) {
      const index = queue.shift();
      queued.delete(index);
      loadFrame(index);
    }
  }

  function updateFromScroll() {
    const rect = visual.getBoundingClientRect();
    const scrollDistance = Math.max(
      1,
      visual.offsetHeight - window.innerHeight
    );

    const progress = Math.min(
      1,
      Math.max(0, -rect.top / scrollDistance)
    );

    const nextFrame = Math.round(
      progress * (TOTAL_FRAMES - 1)
    );

    if (nextFrame === targetFrame) return;

    targetFrame = nextFrame;

    // Prioriza o frame atual e os próximos,
    // mantendo uma pequena margem de antecipação.
    prioritizeFrame(targetFrame);
    requestDraw();
  }

  window.addEventListener("scroll", () => {
    if (scrollPending) return;

    scrollPending = true;

    requestAnimationFrame(() => {
      scrollPending = false;
      updateFromScroll();
    });
  }, { passive: true });

  window.addEventListener("resize", () => {
    resizeCanvas();
    updateFromScroll();
  }, { passive: true });

  // Inicialização: carrega os primeiros frames.
  resizeCanvas();
  prioritizeFrame(0);
  updateFromScroll();
})();
