"use strict";

/*
 * 取得本檔案所在資料夾。
 * 因此圖片路徑會自動以 csstuber-component.js 為基準。
 */
const CSSTUBER_BASE_URL = (() => {
    const script =
        document.currentScript;

    if (!script || !script.src) {
        return new URL(
            "./csstuber/",
            document.baseURI
        );
    }

    return new URL(
        "./",
        script.src
    );
})();


class CSSTuber extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({
            mode: "open"
        });

        this.state = {
            targetX: 0,
            targetY: 0,

            currentX: 0,
            currentY: 0
        };

        this.clickAnimationTimer = null;
        this.eyeResetTimer = null;
        this.animationFrame = null;

        /*
         * 所有可調參數集中在這裡。
         */
        this.params = {
            smoothing: 0.08,

            /*
             * 角色尺寸與位置
             */
            characterWidth: 320,
            left: -120,
            bottom: -70,
            scale: 1.2,

            /*
             * 臉部中心在角色畫布中的位置
             */
            faceCenterX: 0.5,
            faceCenterY: 0.32,

            /*
             * 滑鼠距離多遠時達到最大動作幅度
             */
            pointerRangeX: 500,
            pointerRangeY: 350,

            /*
             * 整體角色
             */
            characterMoveX: 5,
            characterMoveY: 2,
            characterRotate: 1.5,

            /*
             * 頭
             */
            headMoveX: 4,
            headMoveY: 1,
            headRotate: 1.2,

            /*
             * 頭髮
             */
            hairMoveX: 3.5,
            hairMoveY: 0.5,
            hairRotate: 1.2,

            /*
             * 眼睛
             */
            eyesMoveX: 8,
            eyesMoveY: 6,

            /*
             * 眼鏡  
             */
            glassesMoveX: 4.5,
            glassesMoveY: 1.5,
            glassesRotate: 0.7,

            /*
             * 點擊動畫
             */
            clickDuration: 480,
            clickEyesDuration: 350,

            /*
             * hitbox位置
             */

            headHitboxLeft:40,
            headHitboxBottom:55,
            headHitboxWidth:20,
            headHitboxHeight:20

        };

        this.paths = {
            body: new URL(
                "./images/body.png",
                CSSTUBER_BASE_URL
            ).href,

            head: new URL(
                "./images/head.png",
                CSSTUBER_BASE_URL
            ).href,

            hair: new URL(
                "./images/hair.png",
                CSSTUBER_BASE_URL
            ).href,

            glasses: new URL(
                "./images/glasses.png",
                CSSTUBER_BASE_URL
            ).href,

            eyes: new URL(
                "./images/eyes.png",
                CSSTUBER_BASE_URL
            ).href,

            clickEyes: new URL(
                "./images/eyes-clicked.png",
                CSSTUBER_BASE_URL
            ).href
        };

        /*
         * 綁定 this，避免事件監聽器中 this 改變。
         */
        this.handlePointerMove =
            this.handlePointerMove.bind(this);

        this.resetPointer =
            this.resetPointer.bind(this);

        this.animate =
            this.animate.bind(this);

        this.playClickAnimation =
            this.playClickAnimation.bind(this);
    }


    connectedCallback() {
        if (this.hasAttribute("data-ready")) {
            return;
        }

        this.setAttribute(
            "data-ready",
            ""
        );

        this.render();
        this.collectElements();
        this.applyAttributes();
        this.preloadImages();
        this.connectEvents();

        this.animate();
    }


    disconnectedCallback() {
        window.removeEventListener(
            "pointermove",
            this.handlePointerMove
        );

        window.removeEventListener(
            "pointerleave",
            this.resetPointer
        );

        window.removeEventListener(
            "blur",
            this.resetPointer
        );

        if (this.headHitbox) {
            this.headHitbox.removeEventListener(
                "click",
                this.playClickAnimation
            );
        }

        window.clearTimeout(
            this.clickAnimationTimer
        );

        window.clearTimeout(
            this.eyeResetTimer
        );

        window.cancelAnimationFrame(
            this.animationFrame
        );
    }


    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --csstuber-width:
                        ${this.params.characterWidth}px;

                    --csstuber-left:
                        ${this.params.left}px;

                    --csstuber-bottom:
                        ${this.params.bottom}px;

                    --csstuber-scale:
                        ${this.params.scale};

                    position: fixed;

                    left: var(--csstuber-left);
                    bottom: var(--csstuber-bottom);

                    display: block;

                    width: var(--csstuber-width);
                    aspect-ratio: 1 / 1;

                    z-index: 9999;

                    /*
                     * 元件透明區域不攔截主網站點擊。
                     */
                    pointer-events: none;

                    user-select: none;
                    -webkit-user-select: none;
                }


                *,
                *::before,
                *::after {
                    box-sizing: border-box;
                }


                .anchor {
                    position: absolute;
                    inset: 0;

                    pointer-events: none;
                }


                .scaler {
                    position: absolute;
                    inset: 0;

                    transform:
                        scale(var(--csstuber-scale));

                    transform-origin:
                        left bottom;

                    pointer-events: none;
                }


                .character {
                    position: absolute;
                    inset: 0;

                    pointer-events: none;

                    transform-origin:
                        center bottom;

                    will-change:
                        transform;
                }


                .character.is-clicked {
                    animation:
                        csstuber-click-bounce
                        ${this.params.clickDuration}ms
                        ease-out;
                }


                .mouse-layer {
                    position: absolute;
                    inset: 0;

                    pointer-events: none;

                    transform-origin:
                        center bottom;

                    will-change:
                        transform;
                }


                .breathing-layer {
                    position: absolute;
                    inset: 0;

                    pointer-events: none;

                    transform-origin:
                        center bottom;

                    animation:
                        csstuber-breathing
                        4.2s
                        ease-in-out
                        infinite;

                    will-change:
                        transform;
                }


                .layer {
                    position: absolute;
                    inset: 0;

                    display: block;

                    width: 100%;
                    height: 100%;

                    object-fit: contain;
                    object-position:
                        left bottom;

                    pointer-events: none;

                    -webkit-user-drag: none;

                    transform-origin:
                        center center;

                    will-change:
                        transform;
                }


                .body {
                    z-index: 1;

                    transform-origin:
                        center bottom;
                }


                .head {
                    z-index: 2;

                    transform-origin:
                        center 70%;
                }


                .hair {
                    z-index: 3;

                    transform-origin:
                        center 70%;
                }


                .glasses {
                    z-index: 4;

                    transform-origin:
                        center center;
                }


                .eyes {
                    z-index: 5;

                    transform-origin:
                        center center;
                }


                /*
                 * 頭部點擊範圍
                 *
                 * 使用百分比，因此角色大小改變時
                 * 仍然會等比例縮放。
                 *
                 * 開發時可以打開 background，
                 * 看見 hitbox 實際位置。
                 */
                .head-hitbox {
                    position: absolute;

                    left: ${this.params.headHitboxLeft}%;
                    top: ${this.params.headHitboxBottom}%;

                    width: ${this.params.headHitboxWidth}%;
                    height: ${this.params.headHitboxHeight}%;

                    z-index: 100;

                    pointer-events: auto;
                    cursor: pointer;

                    border: 0;
                    outline: 0;
                    box-shadow: none;

                    background: transparent;

                    /*
                    測試位置時改成：
                    background: rgba(255, 0, 0, 0.25);
                    */

                    transform-origin:
                        center center;

                    -webkit-tap-highlight-color:
                        transparent;
                }


                @keyframes csstuber-breathing {
                    0%,
                    100% {
                        transform:
                            translateY(0)
                            scaleX(1)
                            scaleY(1);
                    }

                    50% {
                        transform:
                            translateY(-2px)
                            scaleX(1.012)
                            scaleY(1.008);
                    }
                }


                @keyframes csstuber-click-bounce {
                    0% {
                        transform:
                            translateY(0)
                            scale(1);
                    }

                    30% {
                        transform:
                            translateY(-22px)
                            scaleX(0.96)
                            scaleY(1.06);
                    }

                    55% {
                        transform:
                            translateY(3px)
                            scaleX(1.04)
                            scaleY(0.97);
                    }

                    75% {
                        transform:
                            translateY(-6px)
                            scale(1);
                    }

                    100% {
                        transform:
                            translateY(0)
                            scale(1);
                    }
                }




                @media (prefers-reduced-motion: reduce) {
                    .breathing-layer {
                        animation: none;
                    }

                    .character.is-clicked {
                        animation: none;
                    }
                }
            </style>


            <div class="anchor">
                <div class="scaler">
                    <div
                        class="character"
                        id="character"
                    >
                        <div
                            class="mouse-layer"
                            id="mouseLayer"
                        >
                            <div class="breathing-layer">

                                <img
                                    class="layer body"
                                    id="body"
                                    src="${this.paths.body}"
                                    alt=""
                                    draggable="false"
                                >

                                <img
                                    class="layer head"
                                    id="head"
                                    src="${this.paths.head}"
                                    alt=""
                                    draggable="false"
                                >

                                <img
                                    class="layer hair"
                                    id="hair"
                                    src="${this.paths.hair}"
                                    alt=""
                                    draggable="false"
                                >

                                <img
                                    class="layer glasses"
                                    id="glasses"
                                    src="${this.paths.glasses}"
                                    alt=""
                                    draggable="false"
                                >

                                <img
                                    class="layer eyes"
                                    id="eyes"
                                    src="${this.paths.eyes}"
                                    alt=""
                                    draggable="false"
                                >

                                <div
                                    class="head-hitbox"
                                    id="headHitbox"
                                    aria-label="摸摸角色的頭"
                                    role="button"
                                ></div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }


    collectElements() {
        this.character =
            this.shadowRoot.getElementById(
                "character"
            );

        this.mouseLayer =
            this.shadowRoot.getElementById(
                "mouseLayer"
            );

        this.head =
            this.shadowRoot.getElementById(
                "head"
            );

        this.hair =
            this.shadowRoot.getElementById(
                "hair"
            );

        this.eyes =
            this.shadowRoot.getElementById(
                "eyes"
            );

        this.glasses =
            this.shadowRoot.getElementById(
                "glasses"
            );

        this.headHitbox =
            this.shadowRoot.getElementById(
                "headHitbox"
            );
    }


    /*
     * 支援在 HTML 標籤上調整大小與位置。
     *
     * 例如：
     * <css-tuber
     *     width="360"
     *     scale="0.8"
     *     left="20"
     *     bottom="-10"
     * ></css-tuber>
     */
    applyAttributes() {
        if (this.hasAttribute("width")) {
            const width =
                Number(this.getAttribute("width"));

            if (
                Number.isFinite(width) &&
                width > 0
            ) {
                this.style.setProperty(
                    "--csstuber-width",
                    `${width}px`
                );
            }
        }

        if (this.hasAttribute("scale")) {
            const scale =
                Number(this.getAttribute("scale"));

            if (
                Number.isFinite(scale) &&
                scale > 0
            ) {
                this.style.setProperty(
                    "--csstuber-scale",
                    String(scale)
                );
            }
        }

        if (this.hasAttribute("left")) {
            const left =
                Number(this.getAttribute("left"));

            if (Number.isFinite(left)) {
                this.style.setProperty(
                    "--csstuber-left",
                    `${left}px`
                );
            }
        }

        if (this.hasAttribute("bottom")) {
            const bottom =
                Number(this.getAttribute("bottom"));

            if (Number.isFinite(bottom)) {
                this.style.setProperty(
                    "--csstuber-bottom",
                    `${bottom}px`
                );
            }
        }
    }


    preloadImages() {
        const clickEyesPreload =
            new Image();

        clickEyesPreload.src =
            this.paths.clickEyes;

        clickEyesPreload.addEventListener(
            "error",
            () => {
                console.error(
                    "CSS Tuber：點擊眼睛圖片載入失敗：",
                    this.paths.clickEyes
                );
            }
        );

        this.eyes.addEventListener(
            "error",
            () => {
                console.error(
                    "CSS Tuber：眼睛圖片載入失敗：",
                    this.eyes.src
                );

                if (
                    this.eyes.src !==
                    this.paths.eyes
                ) {
                    this.eyes.src =
                        this.paths.eyes;
                }
            }
        );
    }


    connectEvents() {
        window.addEventListener(
            "pointermove",
            this.handlePointerMove,
            {
                passive: true
            }
        );

        window.addEventListener(
            "pointerleave",
            this.resetPointer,
            {
                passive: true
            }
        );

        window.addEventListener(
            "blur",
            this.resetPointer
        );

        this.headHitbox.addEventListener(
            "click",
            this.playClickAnimation
        );
    }


    clamp(value, min, max) {
        return Math.min(
            Math.max(value, min),
            max
        );
    }


    handlePointerMove(event) {
        const rect =
            this.getBoundingClientRect();

        const faceCenterX =
            rect.left +
            rect.width *
            this.params.faceCenterX;

        const faceCenterY =
            rect.top +
            rect.height *
            this.params.faceCenterY;

        const distanceX =
            event.clientX -
            faceCenterX;

        const distanceY =
            event.clientY -
            faceCenterY;

        this.state.targetX =
            this.clamp(
                distanceX /
                this.params.pointerRangeX,
                -1,
                1
            );

        this.state.targetY =
            this.clamp(
                distanceY /
                this.params.pointerRangeY,
                -1,
                1
            );
    }


    resetPointer() {
        this.state.targetX = 0;
        this.state.targetY = 0;
    }


    playClickAnimation(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        window.clearTimeout(
            this.clickAnimationTimer
        );

        window.clearTimeout(
            this.eyeResetTimer
        );

        this.character.classList.remove(
            "is-clicked"
        );

        /*
         * 強制重新排版，
         * 讓連續點擊也能重新播放。
         */
        void this.character.offsetWidth;

        this.character.classList.add(
            "is-clicked"
        );

        this.eyes.src =
            this.paths.clickEyes;

        this.eyeResetTimer =
            window.setTimeout(() => {
                this.eyes.src =
                    this.paths.eyes;
            }, this.params.clickEyesDuration);

        this.clickAnimationTimer =
            window.setTimeout(() => {
                this.character.classList.remove(
                    "is-clicked"
                );
            }, this.params.clickDuration);
    }


    animate() {
        const {
            smoothing
        } = this.params;

        this.state.currentX +=
            (
                this.state.targetX -
                this.state.currentX
            ) * smoothing;

        this.state.currentY +=
            (
                this.state.targetY -
                this.state.currentY
            ) * smoothing;

        const x =
            this.state.currentX;

        const y =
            this.state.currentY;


        /*
         * 整體角色追蹤
         */
        this.mouseLayer.style.transform = `
            translate(
                ${x * this.params.characterMoveX}px,
                ${y * this.params.characterMoveY}px
            )
            rotate(
                ${x * this.params.characterRotate}deg
            )
        `;


        /*
         * 頭部
         */
        const headTransform = `
            translate(
                ${x * this.params.headMoveX}px,
                ${y * this.params.headMoveY}px
            )
            rotate(
                ${x * this.params.headRotate}deg
            )
        `;

        this.head.style.transform =
            headTransform;

        /*
         * Hitbox 和頭使用相同 transform，
         * 因此會跟著頭移動。
         */
        this.headHitbox.style.transform =
            headTransform;


        /*
         * 頭髮
         */
        this.hair.style.transform = `
            translate(
                ${x * this.params.hairMoveX}px,
                ${y * this.params.hairMoveY}px
            )
            rotate(
                ${x * this.params.hairRotate}deg
            )
        `;


        /*
         * 眼睛
         */
        this.eyes.style.transform = `
            translate(
                ${x * this.params.eyesMoveX}px,
                ${y * this.params.eyesMoveY}px
            )
        `;


        /*
         * 眼鏡
         */
        this.glasses.style.transform = `
            translate(
                ${x * this.params.glassesMoveX}px,
                ${y * this.params.glassesMoveY}px
            )
            rotate(
                ${x * this.params.glassesRotate}deg
            )
        `;


        this.animationFrame =
            window.requestAnimationFrame(
                this.animate
            );
    }
}


/*
 * 註冊自訂元件。
 */
if (
    !customElements.get("css-tuber")
) {
    customElements.define(
        "css-tuber",
        CSSTuber
    );
}


/*
 * 如果主頁沒有手動放入 <css-tuber>，
 * 就自動建立一個。
 *
 * 因此主網站只載入 script 也能使用。
 */
function mountCSSTuber() {
    if (
        document.querySelector("css-tuber")
    ) {
        return;
    }

    const component =
        document.createElement(
            "css-tuber"
        );

    document.body.appendChild(
        component
    );
}


if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        mountCSSTuber,
        {
            once: true
        }
    );
} else {
    mountCSSTuber();
}