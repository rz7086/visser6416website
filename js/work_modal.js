// ========================================
// work_modal.js
// 作品播放器彈出視窗
// ========================================


// ========================================
// 模組狀態
// ========================================

let modalElements = null;

let getWorksCallback = () => [];

let onCloseCallback = null;

let currentWorkIndex = -1;

let previousFocusedElement = null;

let isInitialized = false;


// ========================================
// 初始化播放器彈窗
// ========================================

export function initializeWorkModal({
    getWorks,
    onClose
} = {}) {
    /*
     * 避免重複初始化與重複綁定事件。
     */
    if (isInitialized) {
        if (typeof getWorks === "function") {
            getWorksCallback = getWorks;
        }

        if (typeof onClose === "function") {
            onCloseCallback = onClose;
        }

        return;
    }

    modalElements =
        getModalElements();

    /*
     * 若播放器 HTML 尚未加入，
     * 不讓整個作品頁因此報錯。
     */
    if (!modalElements) {
        console.warn(
            "work_modal.js：找不到完整的播放器彈窗 HTML"
        );

        return;
    }

    if (typeof getWorks === "function") {
        getWorksCallback = getWorks;
    }

    if (typeof onClose === "function") {
        onCloseCallback = onClose;
    }

    bindModalEvents();

    isInitialized = true;
}


// ========================================
// 開啟指定作品
// ========================================

export function openWorkModal(index) {
    if (!isInitialized || !modalElements) {
        console.warn(
            "openWorkModal：播放器尚未初始化"
        );

        return;
    }

    const works =
        getCurrentWorks();

    if (works.length === 0) {
        return;
    }

    const normalizedIndex =
        Number(index);

    if (
        !Number.isInteger(
            normalizedIndex
        ) ||
        normalizedIndex < 0 ||
        normalizedIndex >= works.length
    ) {
        console.warn(
            "openWorkModal：作品索引無效",
            index
        );

        return;
    }

    const work =
        works[normalizedIndex];

    if (!work) {
        return;
    }

    /*
     * 第一次開啟時，
     * 記住使用者原本聚焦的元素。
     *
     * 關閉後會回到原本點擊的作品卡。
     */
    if (!isModalOpen()) {
        previousFocusedElement =
            document.activeElement;
    }

    currentWorkIndex =
        normalizedIndex;

    updateModalContent(
        work,
        normalizedIndex,
        works.length
    );

    modalElements.modal.classList.add(
        "is_open"
    );

    modalElements.modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal_open"
    );

    /*
     * 將焦點移到關閉按鈕。
     */
    modalElements.closeButton.focus();
}


// ========================================
// 關閉播放器
// ========================================

export function closeWorkModal() {
    if (!modalElements) {
        return;
    }

    const wasOpen =
        isModalOpen();

    modalElements.modal.classList.remove(
        "is_open"
    );

    modalElements.modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal_open"
    );

    /*
     * 清空 iframe，
     * 讓 YouTube 停止播放。
     */
    modalElements.iframe.src = "";

    currentWorkIndex = -1;

    /*
     * 如果原本彈窗有開啟，
     * 將焦點還給先前點擊的元素。
     */
    if (
        wasOpen &&
        previousFocusedElement instanceof HTMLElement
    ) {
        previousFocusedElement.focus();
    }

    previousFocusedElement = null;

    if (
        wasOpen &&
        typeof onCloseCallback === "function"
    ) {
        onCloseCallback();
    }
}


// ========================================
// 顯示上一部作品
// ========================================

function showPreviousWork() {
    if (currentWorkIndex <= 0) {
        return;
    }

    openWorkModal(
        currentWorkIndex - 1
    );
}


// ========================================
// 顯示下一部作品
// ========================================

function showNextWork() {
    const works =
        getCurrentWorks();

    if (
        currentWorkIndex < 0 ||
        currentWorkIndex >=
            works.length - 1
    ) {
        return;
    }

    openWorkModal(
        currentWorkIndex + 1
    );
}


// ========================================
// 更新播放器內容
// ========================================

function updateModalContent(
    work,
    index,
    total
) {
    updatePlayer(work);

    modalElements.title.textContent =
        work.title ||
        "未命名作品";

    modalElements.description.textContent = 
        work.fullDescription ||
        work.description ||
        "";

    modalElements.lyrics.textContent =
        work.lyrics ||
        "（無歌詞）";

    modalElements.position.textContent =
        `${index + 1} / ${total}`;

    updateModalTags(
        work.series
    );

    updateNavigationButtons(
        index,
        total
    );
}


// ========================================
// 更新 YouTube 播放器
// ========================================

function updatePlayer(work) {
    const videoId =
        work.videoId ||
        getYoutubeVideoId(
            work.url
        );

    if (!videoId) {
        /*
         * 沒有 YouTube ID 時不載入播放器。
         */
        modalElements.iframe.src = "";

        modalElements.iframe.title =
            `${work.title || "作品"}：沒有可播放的 YouTube 影片`;

        return;
    }

    const parameters =
        new URLSearchParams({
            rel: "0",
            modestbranding: "1"
        });

    modalElements.iframe.src =
        `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${parameters.toString()}`;

    modalElements.iframe.title =
        `${work.title || "作品"} YouTube 播放器`;
}


// ========================================
// 更新系列標籤
// ========================================

function updateModalTags(series) {
    modalElements.tags.replaceChildren();

    if (
        !Array.isArray(series) ||
        series.length === 0
    ) {
        return;
    }

    const fragment =
        document.createDocumentFragment();

    series.forEach(seriesName => {
        const normalizedName =
            String(
                seriesName || ""
            ).trim();

        if (!normalizedName) {
            return;
        }

        const tag =
            document.createElement(
                "span"
            );

        tag.className =
            "work_modal_tag";

        tag.textContent =
            normalizedName;

        fragment.appendChild(tag);
    });

    modalElements.tags.appendChild(
        fragment
    );
}


// ========================================
// 更新上一部與下一部按鈕
// ========================================

function updateNavigationButtons(
    index,
    total
) {
    const hasPrevious =
        index > 0;

    const hasNext =
        index < total - 1;

    modalElements.previousButton.disabled =
        !hasPrevious;

    modalElements.nextButton.disabled =
        !hasNext;

    modalElements.previousButton.setAttribute(
        "aria-disabled",
        String(!hasPrevious)
    );

    modalElements.nextButton.setAttribute(
        "aria-disabled",
        String(!hasNext)
    );
}


// ========================================
// 取得目前篩選後的作品列表
// ========================================

function getCurrentWorks() {
    try {
        const works =
            getWorksCallback();

        return Array.isArray(works)
            ? works
            : [];
    } catch (error) {
        console.error(
            "work_modal.js：取得作品列表失敗",
            error
        );

        return [];
    }
}


// ========================================
// 取得播放器 HTML 元素
// ========================================

function getModalElements() {
    const elements = {
        modal:
            document.querySelector(
                "#workModal"
            ),

        iframe:
            document.querySelector(
                "#workModalIframe"
            ),

        title:
            document.querySelector(
                "#workModalTitle"
            ),

        tags:
            document.querySelector(
                "#workModalTags"
            ),

        description:
            document.querySelector(
                "#workModalDescription"
            ),

        lyrics:
            document.querySelector(
                "#workModalLyrics"
            ),

        position:
            document.querySelector(
                "#workModalPosition"
            ),

        previousButton:
            document.querySelector(
                "#previousWorkButton"
            ),

        nextButton:
            document.querySelector(
                "#nextWorkButton"
            ),

        closeButton:
            document.querySelector(
                "#workModalClose"
            ),

        backdrop:
            document.querySelector(
                "[data-close-work-modal]"
            )
    };

    const requiredElements = [
        elements.modal,
        elements.iframe,
        elements.title,
        elements.tags,
        elements.description,
        elements.lyrics,
        elements.position,
        elements.previousButton,
        elements.nextButton,
        elements.closeButton,
        elements.backdrop
    ];

    const hasAllElements =
        requiredElements.every(Boolean);

    if (!hasAllElements) {
        logMissingElements(elements);

        return null;
    }

    return elements;
}


// ========================================
// 顯示缺少哪些 HTML 元素
// ========================================

function logMissingElements(elements) {
    const selectors = {
        modal:
            "#workModal",

        iframe:
            "#workModalIframe",

        title:
            "#workModalTitle",

        tags:
            "#workModalTags",

        description:
            "#workModalDescription",

        lyrics:
            "#workModalLyrics",

        position:
            "#workModalPosition",

        previousButton:
            "#previousWorkButton",

        nextButton:
            "#nextWorkButton",

        closeButton:
            "#workModalClose",

        backdrop:
            "[data-close-work-modal]"
    };

    const missingSelectors =
        Object.entries(elements)
            .filter(([, element]) => {
                return !element;
            })
            .map(([key]) => {
                return selectors[key];
            });

    console.warn(
        "播放器 HTML 缺少以下元素：",
        missingSelectors
    );
}


// ========================================
// 綁定播放器事件
// ========================================

function bindModalEvents() {
    modalElements.closeButton.addEventListener(
        "click",
        closeWorkModal
    );

    modalElements.backdrop.addEventListener(
        "click",
        closeWorkModal
    );

    modalElements.previousButton.addEventListener(
        "click",
        showPreviousWork
    );

    modalElements.nextButton.addEventListener(
        "click",
        showNextWork
    );

    document.addEventListener(
        "keydown",
        handleDocumentKeydown
    );
}


// ========================================
// 鍵盤操作
// ========================================

function handleDocumentKeydown(event) {
    if (!isModalOpen()) {
        return;
    }

    /*
     * 使用者正在表單欄位輸入時，
     * 不攔截左右方向鍵。
     */
    const activeElement =
        document.activeElement;

    const isTyping =
        activeElement instanceof
            HTMLInputElement ||
        activeElement instanceof
            HTMLTextAreaElement ||
        activeElement instanceof
            HTMLSelectElement ||
        activeElement?.isContentEditable;

    if (event.key === "Escape") {
        event.preventDefault();

        closeWorkModal();

        return;
    }

    if (isTyping) {
        return;
    }

    if (event.key === "ArrowLeft") {
        event.preventDefault();

        showPreviousWork();

        return;
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();

        showNextWork();

        return;
    }

    /*
     * 簡單限制 Tab 焦點留在彈窗內。
     */
    if (event.key === "Tab") {
        trapModalFocus(event);
    }
}


// ========================================
// 限制焦點留在彈窗內
// ========================================

function trapModalFocus(event) {
    const focusableElements =
        modalElements.modal.querySelectorAll(
            [
                "button:not([disabled])",
                "a[href]",
                "input:not([disabled])",
                "select:not([disabled])",
                "textarea:not([disabled])",
                "iframe",
                '[tabindex]:not([tabindex="-1"])'
            ].join(",")
        );

    const focusableList =
        [...focusableElements].filter(
            element => {
                return element instanceof
                    HTMLElement &&
                    !element.hidden;
            }
        );

    if (focusableList.length === 0) {
        return;
    }

    const firstElement =
        focusableList[0];

    const lastElement =
        focusableList[
            focusableList.length - 1
        ];

    if (
        event.shiftKey &&
        document.activeElement ===
            firstElement
    ) {
        event.preventDefault();

        lastElement.focus();

        return;
    }

    if (
        !event.shiftKey &&
        document.activeElement ===
            lastElement
    ) {
        event.preventDefault();

        firstElement.focus();
    }
}


// ========================================
// 判斷播放器是否開啟
// ========================================

function isModalOpen() {
    return Boolean(
        modalElements?.modal.classList.contains(
            "is_open"
        )
    );
}


// ========================================
// YouTube ID 備用解析
//
// 正常情況下，work_data.js 已經會產生
// work.videoId。
// 這裡保留解析功能避免舊資料失效。
// ========================================

function getYoutubeVideoId(url) {
    if (!url) {
        return "";
    }

    try {
        const parsedUrl =
            new URL(url);

        const hostname =
            parsedUrl.hostname
                .replace(/^www\./, "")
                .toLowerCase();

        if (hostname === "youtu.be") {
            return parsedUrl.pathname
                .split("/")
                .filter(Boolean)[0] || "";
        }

        if (
            hostname === "youtube.com" ||
            hostname.endsWith(
                ".youtube.com"
            )
        ) {
            const videoParameter =
                parsedUrl.searchParams.get(
                    "v"
                );

            if (videoParameter) {
                return videoParameter;
            }

            const pathParts =
                parsedUrl.pathname
                    .split("/")
                    .filter(Boolean);

            if (
                [
                    "shorts",
                    "embed",
                    "live"
                ].includes(
                    pathParts[0]
                )
            ) {
                return pathParts[1] || "";
            }
        }

        return "";
    } catch {
        return "";
    }
}