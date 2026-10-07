(() => {

    "use strict";

    const canvas =
        document.getElementById("sequence-canvas");

    const status =
        document.getElementById("loading-status");

    const progress =
        document.getElementById("progress-bar");

    if (!canvas) {
        return;
    }


    const ctx =
        canvas.getContext("2d", {
            alpha: false
        });


    const TOTAL_FRAMES = 117;

    const FRAME_PATH =
        "frames/frame-";


    const images =
        new Array(TOTAL_FRAMES);

    let loadedFrames = 0;

    let currentFrame = 0;

    let targetFrame = 0;

    let animationRunning = false;


    /* =========================================================
       DEVICE PIXEL RATIO
    ========================================================= */

    function resizeCanvas() {

        const rect =
            canvas.getBoundingClientRect();

        const dpr =
            Math.min(
                window.devicePixelRatio || 1,
                2
            );

        canvas.width =
            Math.round(rect.width * dpr);

        canvas.height =
            Math.round(rect.height * dpr);

        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        drawFrame(
            Math.round(currentFrame)
        );

    }


    /* =========================================================
       LOAD FRAME
    ========================================================= */

    function loadFrame(index) {

        return new Promise(resolve => {

            const img =
                new Image();

            const frameNumber =
                String(index + 1)
                    .padStart(4, "0");


            img.src =
                `${FRAME_PATH}${frameNumber}.jpg`;


            img.onload = () => {

                images[index] = img;

                loadedFrames++;

                if (status) {

                    status.textContent =
                        `Carregando experiência... ${loadedFrames}/${TOTAL_FRAMES}`;

                }

                resolve(img);

            };


            img.onerror = () => {

                console.warn(
                    `Não foi possível carregar: ${img.src}`
                );

                resolve(null);

            };

        });

    }


    /* =========================================================
       COVER DRAW
    ========================================================= */

    function drawCover(
        image,
        width,
        height
    ) {

        if (!image) {
            return;
        }

        const imageRatio =
            image.naturalWidth /
            image.naturalHeight;

        const canvasRatio =
            width / height;


        let drawWidth;
        let drawHeight;

        let offsetX;
        let offsetY;


        if (imageRatio > canvasRatio) {

            drawHeight =
                height;

            drawWidth =
                height * imageRatio;

            offsetX =
                (width - drawWidth) / 2;

            offsetY = 0;

        } else {

            drawWidth =
                width;

            drawHeight =
                width / imageRatio;

            offsetX = 0;

            offsetY =
                (height - drawHeight) / 2;

        }


        ctx.drawImage(
            image,
            offsetX,
            offsetY,
            drawWidth,
            drawHeight
        );

    }


    /* =========================================================
       DRAW FRAME
    ========================================================= */

    function drawFrame(index) {

        if (!images[index]) {

            let fallback =
                index;

            while (
                fallback > 0 &&
                !images[fallback]
            ) {
                fallback--;
            }

            if (!images[fallback]) {
                return;
            }

            index = fallback;

        }


        const width =
            canvas.clientWidth;

        const height =
            canvas.clientHeight;


        ctx.fillStyle =
            "#151515";

        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        drawCover(
            images[index],
            width,
            height
        );

    }


    /* =========================================================
       UPDATE TARGET FROM SCROLL
    ========================================================= */

    function updateScroll() {

        const scene =
            canvas.closest(
                ".scroll-scene"
            );

        if (!scene) {
            return;
        }


        const rect =
            scene.getBoundingClientRect();

        const scrollable =
            scene.offsetHeight -
            window.innerHeight;


        let progressValue =
            -rect.top / scrollable;


        progressValue =
            Math.max(
                0,
                Math.min(
                    1,
                    progressValue
                )
            );


        targetFrame =
            progressValue *
            (TOTAL_FRAMES - 1);


        if (progress) {

            progress.style.height =
                `${progressValue * 100}%`;

        }


        if (!animationRunning) {

            animationRunning = true;

            requestAnimationFrame(
                animate
            );

        }

    }


    /* =========================================================
       SMOOTH FRAME ANIMATION
    ========================================================= */

    function animate() {

        const difference =
            targetFrame -
            currentFrame;


        if (
            Math.abs(difference) >
            0.05
        ) {

            currentFrame +=
                difference * 0.18;

        } else {

            currentFrame =
                targetFrame;

        }


        drawFrame(
            Math.round(currentFrame)
        );


        if (
            Math.abs(
                targetFrame -
                currentFrame
            ) > 0.05
        ) {

            requestAnimationFrame(
                animate
            );

        } else {

            animationRunning = false;

        }

    }


    /* =========================================================
       LOAD ALL FRAMES
    ========================================================= */

    async function preload() {

        if (status) {

            status.textContent =
                "Preparando a experiência...";

        }


        /*
         * Carrega primeiro o frame inicial
         * para mostrar algo imediatamente.
         */

        await loadFrame(0);

        drawFrame(0);


        /*
         * Depois carrega os demais.
         */

        const promises = [];

        for (
            let i = 1;
            i < TOTAL_FRAMES;
            i++
        ) {

            promises.push(
                loadFrame(i)
            );

        }


        await Promise.all(
            promises
        );


        if (status) {

            status.textContent =
                "Role para explorar a experiência.";

        }

    }


    /* =========================================================
       EVENTS
    ========================================================= */

    window.addEventListener(
        "scroll",
        updateScroll,
        {
            passive: true
        }
    );


    window.addEventListener(
        "resize",
        resizeCanvas
    );


    /* =========================================================
       REDUCED MOTION
    ========================================================= */

    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );


    if (reducedMotion.matches) {

        if (status) {

            status.textContent =
                "Experiência visual simplificada.";

        }

    }


    /* =========================================================
       START
    ========================================================= */

    resizeCanvas();

    preload();

})();