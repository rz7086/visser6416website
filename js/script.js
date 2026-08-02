console.log("Hello World!");

document.documentElement.classList.add("js_ready");

document.addEventListener("DOMContentLoaded", () => {
    loadSharedComponents();
    initHeroParallax();
    initFeaturedCarousel();
    initLatestWork();
    initReveal();
    initBackToTop();
    initCopyrightModal();
});


/* ========================================
   共用元件
======================================== */

async function loadSharedComponents() {
    await loadComponent(
        "navbar",
        "./components/navbar.html"
    );

    await loadComponent(
        "media_link",
        "./components/media_link.html"
    );

    await loadComponent(
        "footer",
        "./components/footer.html"
    );

    initCopyrightModal();
}


async function loadComponent(id, file) {
    const container =
        document.getElementById(id);

    if (!container) {
        return;
    }

    try {
        const response = await fetch(file);

        if (!response.ok) {
            throw new Error(
                `${file} 載入失敗：${response.status}`
            );
        }

        container.innerHTML =
            await response.text();

        // Navbar 載入完成後設定目前頁面
        if (id === "navbar") {
            updateNavbarActive();
            initMobileNavbar();
        }

    } catch (error) {
        console.error(
            `元件 ${id} 載入失敗：`,
            error
        );
    }
}



/* ========================================
   Navbar更新
======================================== */

function updateNavbarActive() {
    const currentPage =
        window.location.pathname
            .split("/")
            .pop() || "index.html";

    const links =
        document.querySelectorAll(".menu a");

    links.forEach(link => {
        const href =
            link.getAttribute("href") || "";

        const linkPage =
            href
                .split("/")
                .pop()
                .split("?")[0]
                .split("#")[0] ||
            "index.html";

        link.classList.toggle(
            "is_active",
            linkPage === currentPage
        );
    });
}


/* ========================================
   Navbar手機版
======================================== */

function initMobileNavbar() {
    const toggle =
        document.getElementById("menu_toggle");

    const menu =
        document.getElementById("navbar_menu");

    if (!toggle || !menu) {
        return;
    }

    function openMenu() {
        toggle.classList.add("is_open");
        menu.classList.add("is_open");

        toggle.setAttribute(
            "aria-expanded",
            "true"
        );

        toggle.setAttribute(
            "aria-label",
            "關閉導覽選單"
        );
    }

    function closeMenu() {
        toggle.classList.remove("is_open");
        menu.classList.remove("is_open");

        toggle.setAttribute(
            "aria-expanded",
            "false"
        );

        toggle.setAttribute(
            "aria-label",
            "開啟導覽選單"
        );
    }

    function toggleMenu() {
        const isOpen =
            menu.classList.contains("is_open");

        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    toggle.addEventListener(
        "click",
        event => {
            event.stopPropagation();
            toggleMenu();
        }
    );

    menu.addEventListener(
        "click",
        event => {
            if (
                event.target.closest("a")
            ) {
                closeMenu();
            }
        }
    );

    document.addEventListener(
        "click",
        event => {
            const clickedInsideNavbar =
                event.target.closest(".navbar");

            if (!clickedInsideNavbar) {
                closeMenu();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                closeMenu();
                toggle.focus();
            }
        }
    );

    window.addEventListener(
        "resize",
        () => {
            if (window.innerWidth > 820) {
                closeMenu();
            }
        }
    );
}


/* ========================================
   首頁 Hero 捲動效果
======================================== */

function initHeroParallax() {
    const hero =
        document.querySelector(".hero_box");

    if (!hero) {
        return;
    }

    function updateHeroPosition() {
        const y = window.scrollY;

        hero.style.backgroundPosition =
            `center center, 70% ${y * 0.2}px`;
    }

    window.addEventListener(
        "scroll",
        updateHeroPosition,
        {
            passive: true
        }
    );

    updateHeroPosition();
}


/* ========================================
   首頁精選作品輪播
======================================== */

function initFeaturedCarousel() {
    const cards = [
        ...document.querySelectorAll(
            ".featured_card"
        )
    ];

    const previousButton =
        document.querySelector(
            ".featured_previous"
        );

    const nextButton =
        document.querySelector(
            ".featured_next"
        );

    const dotsContainer =
        document.querySelector(
            ".featured_dots"
        );

    /*
     * 不是首頁，或沒有輪播內容時，
     * 不執行輪播。
     */
    if (
        cards.length === 0 ||
        !previousButton ||
        !nextButton ||
        !dotsContainer
    ) {
        return;
    }

    if (
        window.YT &&
        typeof window.YT.Player === "function"
    ) {
        initFeaturedPlayers();
    }

    let currentIndex = 0;


    function updateCarousel() {
        const total = cards.length;

        if (total === 0) {
            return;
        }

        const previousIndex =
            (
                currentIndex -
                1 +
                total
            ) % total;

        const nextIndex =
            (
                currentIndex +
                1
            ) % total;

        cards.forEach((card, index) => {
            card.classList.remove(
                "is_active",
                "is_previous",
                "is_next"
            );

            if (index === currentIndex) {
                card.classList.add(
                    "is_active"
                );
            } else if (
                total > 1 &&
                index === previousIndex
            ) {
                card.classList.add(
                    "is_previous"
                );
            } else if (
                total > 1 &&
                index === nextIndex
            ) {
                card.classList.add(
                    "is_next"
                );
            }

            
        });

        const dots = [
            ...dotsContainer.children
        ];

        dots.forEach((dot, index) => {
            dot.classList.toggle(
                "is_active",
                index === currentIndex
            );
        });
        
        previousButton.disabled =
            total <= 1;

        nextButton.disabled =
            total <= 1;

        pauseInactiveFeaturedVideos();
    }


    function createDots() {
        dotsContainer.innerHTML = "";

        cards.forEach((card, index) => {
            const dot =
                document.createElement(
                    "button"
                );

            dot.className =
                "featured_dot";

            dot.type = "button";

            dot.setAttribute(
                "aria-label",
                `顯示第 ${index + 1} 首精選作品`
            );

            dot.addEventListener(
                "click",
                () => {
                    currentIndex = index;
                    updateCarousel();
                }
            );

            dotsContainer.appendChild(dot);
        });
    }


    previousButton.addEventListener(
        "click",
        () => {
            currentIndex =
                (
                    currentIndex -
                    1 +
                    cards.length
                ) % cards.length;

            updateCarousel();
        }
    );


    nextButton.addEventListener(
        "click",
        () => {
            currentIndex =
                (
                    currentIndex +
                    1
                ) % cards.length;

            updateCarousel();
        }
    );


    createDots();
    updateCarousel();
}


const featuredPlayers = new Map();

let youtubeIframeApiReady = false;


/*
 * YouTube IFrame API 載入完成後會自動呼叫這個函式。
 * 函式名稱必須保持不變。
 */
window.youtubeIframeApiReady = false;

window.onYouTubeIframeAPIReady = function () {
    window.youtubeIframeApiReady = true;

    /* 首頁播放器 */
    initFeaturedPlayers();

    /*
     * 通知其他頁面：
     * YouTube API 已經可以使用
     */
    window.dispatchEvent(
        new Event("youtube-iframe-api-ready")
    );
};


function initFeaturedPlayers() {
    const cards =
        document.querySelectorAll(".featured_card");

    cards.forEach(card => {
        const iframe =
            card.querySelector("iframe");

        if (!iframe || !iframe.id) {
            return;
        }

        if (featuredPlayers.has(card)) {
            return;
        }

        const player = new YT.Player(iframe.id, {
            events: {
                onReady: event => {
                    featuredPlayers.set(
                        card,
                        event.target
                    );
                }
            }
        });
    });
}

function pauseInactiveFeaturedVideos() {
    featuredPlayers.forEach((player, card) => {
        if (
            !card.classList.contains("is_active") &&
            typeof player.pauseVideo === "function"
        ) {
            player.pauseVideo();
        }
    });
}

/* ========================================
   最新作品：Google Sheet
======================================== */

const sheetId =
    "1w4oTViilqS47zAXDHR6TnDxlP-OSN7CxPO44GIozCUE";

const sheetName =
    "工作表2";

const sheetQuery =
    encodeURIComponent(
        "select A, D, E limit 1 offset 1"
    );

const sheetUrl =
    `https://docs.google.com/spreadsheets/d/${sheetId}` +
    `/gviz/tq?sheet=${encodeURIComponent(sheetName)}` +
    `&tq=${sheetQuery}`;


function initLatestWork() {
    const elements = getLatestWorkElements();

    /*
     * 只有首頁有最新作品區。
     * 其他頁面找不到元素時，不載入資料。
     */
    if (!elements) {
        return;
    }

    loadLatestWork(elements);
}


function getLatestWorkElements() {
    const title =
        document.getElementById(
            "latest_title"
        );

    const intro =
        document.getElementById(
            "latest_intro"
        );

    const link =
        document.getElementById(
            "latest_link"
        );

    const video =
        document.getElementById(
            "latest_video"
        );

    if (
        !title ||
        !intro ||
        !link ||
        !video
    ) {
        return null;
    }

    return {
        title,
        intro,
        link,
        video
    };
}


async function loadLatestWork(elements) {
    try {
        const response =
            await fetch(sheetUrl);

        if (!response.ok) {
            throw new Error(
                `讀取失敗：${response.status}`
            );
        }

        const text =
            await response.text();

        const data =
            parseGoogleVisualizationResponse(
                text
            );

        const row =
            data.table?.rows?.[0];

        if (!row) {
            throw new Error(
                "試算表沒有找到作品資料"
            );
        }

        const title =
            getCellValue(row, 0);

        const videoUrl =
            getCellValue(row, 1);

        const description =
            getCellValue(row, 2);

        const videoId =
            getYouTubeVideoId(videoUrl);

        const intro =
            getFirstTwoLines(description);

        elements.title.textContent =
            title || "最新作品";

        elements.intro.textContent =
            intro ||
            "尚未提供作品介紹。";

        elements.link.href =
            videoUrl || "#";

        if (!videoId) {
            throw new Error(
                "無法取得 YouTube 影片 ID"
            );
        }

        elements.video.src =
            `https://www.youtube.com/embed/${videoId}`;

        elements.video.title =
            title || "最新作品";

    } catch (error) {
        console.error(
            "載入最新作品失敗：",
            error
        );

        elements.title.textContent =
            "最新作品載入失敗";

        elements.intro.textContent =
            "請確認試算表權限、工作表名稱與欄位位置。";

        elements.link.removeAttribute(
            "href"
        );

        elements.video.removeAttribute(
            "src"
        );
    }
}


function parseGoogleVisualizationResponse(
    text
) {
    const start =
        text.indexOf("{");

    const end =
        text.lastIndexOf("}");

    if (
        start === -1 ||
        end === -1
    ) {
        throw new Error(
            "Google Sheet 回傳格式錯誤"
        );
    }

    return JSON.parse(
        text.slice(start, end + 1)
    );
}


function getCellValue(row, index) {
    return row.c?.[index]?.v ?? "";
}


function getYouTubeVideoId(url) {
    if (!url) {
        return null;
    }

    try {
        const parsedUrl =
            new URL(url);

        const hostname =
            parsedUrl.hostname
                .replace(/^www\./, "");

        if (
            hostname === "youtu.be"
        ) {
            return parsedUrl.pathname
                .slice(1)
                .split("/")[0];
        }

        if (
            parsedUrl.pathname.startsWith(
                "/shorts/"
            )
        ) {
            return parsedUrl.pathname
                .split("/")[2];
        }

        if (
            parsedUrl.pathname.startsWith(
                "/embed/"
            )
        ) {
            return parsedUrl.pathname
                .split("/")[2];
        }

        return (
            parsedUrl.searchParams.get("v") ||
            null
        );

    } catch (error) {
        console.error(
            "無法解析 YouTube 網址：",
            url
        );

        return null;
    }
}


function getFirstTwoLines(description) {
    if (!description) {
        return "";
    }

    return String(description)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join("\n");
}


/* ========================================
   全站 Reveal 動畫
======================================== */

function initReveal() {
    const revealElements =
        document.querySelectorAll(
            ".reveal"
        );

    if (!revealElements.length) {
        return;
    }

    const reduceMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

    if (reduceMotion) {
        revealElements.forEach(
            element => {
                element.classList.add(
                    "is_visible"
                );
            }
        );

        return;
    }

    const observer =
        new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (
                        !entry.isIntersecting
                    ) {
                        return;
                    }

                    entry.target.classList.add(
                        "is_visible"
                    );

                    observer.unobserve(
                        entry.target
                    );
                });
            },
            {
                threshold: 0.15,
                rootMargin:
                    "0px 0px -40px 0px"
            }
        );

    revealElements.forEach(element => {
        observer.observe(element);
    });
}



/* ========================================
   Back To Top
======================================== */

function initBackToTop() {
    const button =
        document.getElementById("back_to_top");

    if (!button) {
        return;
    }

    function updateButton() {
        button.classList.toggle(
            "is_visible",
            window.scrollY > 300
        );
    }

    window.addEventListener(
        "scroll",
        updateButton,
        {
            passive: true
        }
    );

    button.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    updateButton();
}




function initCopyrightModal() {
    const openButton =
        document.getElementById("copyright_button");

    const modal =
        document.getElementById("copyright_modal");

    const closeButton =
        document.getElementById("copyright_close");

    const confirmButton =
        document.getElementById("copyright_confirm");

    if (
        !openButton ||
        !modal ||
        !closeButton ||
        !confirmButton
    ) {
        return;
    }

    let previousActiveElement = null;


    function openModal() {
        previousActiveElement =
            document.activeElement;

        modal.classList.add("is_open");
        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal_open");

        closeButton.focus();
    }


    function closeModal() {
        modal.classList.remove("is_open");
        modal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("modal_open");

        previousActiveElement?.focus();
    }


    openButton.addEventListener(
        "click",
        openModal
    );

    closeButton.addEventListener(
        "click",
        closeModal
    );

    confirmButton.addEventListener(
        "click",
        closeModal
    );


    /* 點視窗外的黑色區域關閉 */

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });


    /* 按 Escape 關閉 */

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                modal.classList.contains("is_open")
            ) {
                closeModal();
            }
        }
    );
}