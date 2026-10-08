
(() => {
  "use strict";

  /* =====================================
     CONFIGURAÇÕES DO SITE
  ===================================== */

  const TOTAL_FRAMES = 180;
  const FRAME_PATH = "./frames/frame-";
  const FRAME_EXTENSION = ".jpg";
  const MAX_CONCURRENT = 6;

  // IMPORTANTE: substitua pelos dados reais do salão.
  const WHATSAPP_NUMBER = "5511999999999";
  const INSTAGRAM_URL = "https://www.instagram.com/";
  const SALON_ADDRESS = "Tucuruvi, São Paulo - SP";

  /* =====================================
     MENU MOBILE
  ===================================== */

  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("is-open");

      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute(
        "aria-label",
        isOpen ? "Fechar menu" : "Abrir menu"
      );
    });

    navigation.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navigation.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Abrir menu");
      });
    });
  }

  /* =====================================
     DADOS DE CONTATO
  ===================================== */

  const whatsappLink = document.getElementById("contact-whatsapp-link");
  const instagramLink = document.getElementById("instagram-link");
  const addressText = document.getElementById("address-text");
  const map = document.getElementById("google-map");

  if (whatsappLink) {
    whatsappLink.href =
      "https://wa.me/" + WHATSAPP_NUMBER;
  }

  if (instagramLink) {
    instagramLink.href = INSTAGRAM_URL;
  }

  if (addressText) {
    addressText.textContent = SALON_ADDRESS;
  }

  if (map) {
    map.src =
      "https://www.google.com/maps?q=" +
      encodeURIComponent(SALON_ADDRESS) +
      "&output=embed";
  }

  const year = document.getElementById("current-year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  /* =====================================
     FORMULÁRIO PARA WHATSAPP
  ===================================== */

  const contactForm = document.getElementById("contact-form");

  if (contactForm) {
    contactForm.addEventListener("submit", event => {
      event.preventDefault();

      const name = document.getElementById("nome")?.value.trim() || "";
      const service = document.getElementById("servico")?.value || "";
      const message =
        document.getElementById("mensagem")?.value.trim() || "";

      if (!name || !service) {
        contactForm.reportValidity();
        return;
      }

      const text = [
        "Olá! Vim pelo site do Elvis Lustosa.",
        "",
        "Nome: " + name,
        "Serviço desejado: " + service,
        message ? "Mensagem: " + message : ""
      ].filter(Boolean).join("\n");

      const url =
        "https://wa.me/" +
        WHATSAPP_NUMBER +
        "?text=" +
        encodeURIComponent(text);

      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  /* =====================================
     ANIMAÇÃO DOS 180 FRAMES
  ===================================== */

  const canvas = document.getElementById("sequence-canvas");
  const section = document.querySelector(".scroll-scene");
  const visual = document.querySelector(".experience-visual");
  const frameCounter = document.getElementById("frame-number");

  if (!canvas || !section || !visual) return;

  const ctx = canvas.getContext("2d", {
    alpha: false
  });

  if (!ctx) return;

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

  // Fila de carregamento de frames.
  let queue = [];
  const queued = new Set();

  function pad(number) {
    return String(number).padStart(4, "0");
  }

  function frameUrl(index) {
    return FRAME_PATH + pad(index + 1) + FRAME_EXTENSION;
  }

  function updateCounter(index) {
    if (!frameCounter) return;

    frameCounter.textContent =
      pad(index + 1) + " / " + pad(TOTAL_FRAMES);
  }

  /* Ajusta o canvas ao tamanho da coluna da direita. */

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

  /* Desenha o frame mantendo a proporção da imagem. */

  function drawFrame() {
    if (!canvasWidth || !canvasHeight) return;

    let index = targetFrame;

    // Se o frame desejado ainda não carregou,
    // mostra o frame carregado mais próximo.
    if (!loaded[index]) {
      let closest = -1;
      let distance = Infinity;

      for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (
          loaded[i] &&
          Math.abs(i - targetFrame) < distance
        ) {
          closest = i;
          distance = Math.abs(i - targetFrame);
        }
      }

      if (closest === -1) return;

      index = closest;
    }

    if (index === lastDrawn) return;

    const image = images[index];

    if (!image || !image.naturalWidth) return;

    const scale = Math.max(
      canvasWidth / image.naturalWidth,
      canvasHeight / image.naturalHeight
    );

    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = (canvasWidth - width) / 2;
    const y = (canvasHeight - height) / 2;

    ctx.fillStyle = "#e8e2da";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.drawImage(image, x, y, width, height);

    lastDrawn = index;
    updateCounter(index);
  }

  /* Adiciona um frame à fila. */

  function enqueue(index) {
    if (index < 0 || index >= TOTAL_FRAMES) return;

    if (
      loaded[index] ||
      loading.has(index) ||
      failed.has(index) ||
      queued.has(index)
    ) {
      return;
    }

    queue.push(index);
    queued.add(index);
  }

  /* Carrega uma imagem individualmente. */

  function loadFrame(index) {
    if (
      loaded[index] ||
      loading.has(index) ||
      failed.has(index) ||
      activeLoads >= MAX_CONCURRENT
    ) {
      return;
    }

    loading.add(index);
    activeLoads++;

    const image = new Image();
    images[index] = image;
    image.decoding = "async";

    image.onload = () => {
      loaded[index] = true;
      loading.delete(index);
      activeLoads--;

      requestDraw();
      pumpQueue();
    };

    image.onerror = () => {
      failed.add(index);
      loading.delete(index);
      activeLoads--;

      console.warn("Não foi possível carregar:", frameUrl(index));

      pumpQueue();
    };

    image.src = frameUrl(index);
  }

  /* Mantém no máximo seis imagens carregando ao mesmo tempo. */

  function pumpQueue() {
    while (
      activeLoads < MAX_CONCURRENT &&
      queue.length > 0
    ) {
      const index = queue.shift();

      queued.delete(index);
      loadFrame(index);
    }
  }

  /* Prioriza os frames próximos da posição atual. */

  function prioritizeFrame(center) {
    const pending = queue.splice(0);

    queued.clear();

    const candidates = [...pending];

    for (let distance = 0; distance < TOTAL_FRAMES; distance++) {
      const forward = center + distance;
      const backward = center - distance;

      if (forward < TOTAL_FRAMES) {
        candidates.push(forward);
      }

      if (distance > 0 && backward >= 0) {
        candidates.push(backward);
      }
    }

    const unique = [...new Set(candidates)];

    unique.sort(
      (a, b) =>
        Math.abs(a - center) - Math.abs(b - center)
    );

    unique.forEach(enqueue);

    pumpQueue();
  }

  /* Relaciona a rolagem da seção com os 180 frames. */

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

    prioritizeFrame(targetFrame);
    requestDraw();
  }

  /* Evita processar dezenas de eventos de scroll por segundo. */

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

  /* Inicia a animação. */

  resizeCanvas();
  prioritizeFrame(0);
  updateFromScroll();

})();
