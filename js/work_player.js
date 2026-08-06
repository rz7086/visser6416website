"use strict";


/* =====================================
設定
===================================== */

const WORK_VIEWER = {
    workPageBaseUrl: "/works/",

    selectors: {
        modal: "#work_modal",
        mount: "#work_modal_mount",
        player: ".work_modal_content",
        navigation: ".work_modal_navigation",
    },
};


/* =====================================
播放器狀態
===================================== */

const workViewerState = {
    works: [],
    currentSlug: "",
    currentIndex: -1,
    isLoading: false,
    lastFocusedElement: null,
};


/* =====================================
初始化
===================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeWorkViewer
);


function initializeWorkViewer() {
    const modal =
        document.querySelector(
            WORK_VIEWER.selectors.modal
        );

    if (!modal) {
        console.warn(
            "找不到 #work_modal，播放器功能不會啟用。"
        );

        return;
    }

    modal.addEventListener(
        "click",
        handleModalClick
    );

    document.addEventListener(
        "keydown",
        handleViewerKeydown
    );
}


/* =====================================
公開介面
===================================== */

const WorkViewer = {
    open,
    close,
    setWorks,
};


window.WorkViewer =
    WorkViewer;


/* =====================================
接收作品順序
===================================== */

function setWorks(works) {
    if (!Array.isArray(works)) {
        workViewerState.works = [];
        return;
    }

    workViewerState.works =
        works.filter((work) => {
            return Boolean(
                work &&
                typeof work.slug === "string" &&
                work.slug.trim()
            );
        });
}


/* =====================================
開啟作品
===================================== */

async function open(slug) {
    const cleanSlug =
        String(slug ?? "").trim();

    if (
        !cleanSlug ||
        workViewerState.isLoading
    ) {
        return;
    }

    const modal =
        getModal();

    const mount =
        getMount();

    if (!modal || !mount) {
        goToStandalonePage(cleanSlug);
        return;
    }

    workViewerState.isLoading = true;

    workViewerState.lastFocusedElement =
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

    showLoadingState(mount);
    openModal(modal);

    try {
        const player =
            await loadWorkPlayer(cleanSlug);

        workViewerState.currentSlug =
            cleanSlug;

        workViewerState.currentIndex =
            findWorkIndex(cleanSlug);

        convertNavigationForModal(
            player
        );

        mount.replaceChildren(
            player
        );

        focusCloseButton(player);

        updateAddressBar(cleanSlug);

    } catch (error) {
        console.error(
            "載入作品播放器失敗：",
            error
        );

        showErrorState(
            mount,
            cleanSlug
        );
    } finally {
        workViewerState.isLoading =
            false;
    }
}


/* =====================================
讀取作品 HTML
===================================== */

async function loadWorkPlayer(slug) {
    const url =
        createWorkPageUrl(slug);

    const response =
        await fetch(
            url,
            {
                cache: "no-cache",
            }
        );

    if (!response.ok) {
        throw new Error(
            `讀取作品頁失敗：HTTP ${response.status}`
        );
    }

    const htmlText =
        await response.text();

    const parser =
        new DOMParser();

    const workDocument =
        parser.parseFromString(
            htmlText,
            "text/html"
        );

    const sourcePlayer =
        workDocument.querySelector(
            WORK_VIEWER.selectors.player
        );

    if (!sourcePlayer) {
        throw new Error(
            "作品頁中找不到 .work_modal_content"
        );
    }

    const importedPlayer =
        document.importNode(
            sourcePlayer,
            true
        );

    importedPlayer.classList.add(
        "is_modal_player"
    );

    return importedPlayer;
}


/* =====================================
將獨立頁導覽改成 Modal 導覽
===================================== */

function convertNavigationForModal(player) {
    let navigation =
        player.querySelector(
            WORK_VIEWER.selectors.navigation
        );

    if (!navigation) {
        navigation =
            document.createElement("nav");

        navigation.className =
            "work_modal_navigation";

        const main =
            player.querySelector(
                ".work_modal_main"
            );

        if (main) {
            main.append(navigation);
        }
    }

    navigation.setAttribute(
        "aria-label",
        "作品切換"
    );

    const previousButton =
        document.createElement("button");

    previousButton.type = "button";
    previousButton.dataset.workPrevious = "";
    previousButton.textContent =
        "← 上一部";

    const position =
        document.createElement("span");

    position.className =
        "work_modal_position";

    const nextButton =
        document.createElement("button");

    nextButton.type = "button";
    nextButton.dataset.workNext = "";
    nextButton.textContent =
        "下一部 →";

    navigation.replaceChildren(
        previousButton,
        position,
        nextButton
    );

    updateNavigationState(
        previousButton,
        position,
        nextButton
    );

    previousButton.addEventListener(
        "click",
        openPreviousWork
    );

    nextButton.addEventListener(
        "click",
        openNextWork
    );

    addCloseButton(player);
}


/* =====================================
加入關閉按鈕
===================================== */

function addCloseButton(player) {
    const existingButton =
        player.querySelector(
            ".work_modal_close"
        );

    if (existingButton) {
        existingButton.remove();
    }

    const closeButton =
        document.createElement("button");

    closeButton.type = "button";
    closeButton.className =
        "work_modal_close";

    closeButton.dataset.workModalClose =
        "";

    closeButton.setAttribute(
        "aria-label",
        "關閉作品播放器"
    );

    closeButton.textContent =
        "×";

    player.prepend(
        closeButton
    );
}


/* =====================================
更新上一部／下一部
===================================== */

function updateNavigationState(
    previousButton,
    position,
    nextButton
) {
    const total =
        workViewerState.works.length;

    const index =
        workViewerState.currentIndex;

    if (
        total === 0 ||
        index < 0
    ) {
        previousButton.disabled = true;
        nextButton.disabled = true;
        position.textContent = "";

        return;
    }

    previousButton.disabled =
        index <= 0;

    nextButton.disabled =
        index >= total - 1;

    position.textContent =
        `${index + 1} / ${total}`;
}


function openPreviousWork() {
    const previousIndex =
        workViewerState.currentIndex - 1;

    const previousWork =
        workViewerState.works[
            previousIndex
        ];

    if (!previousWork) {
        return;
    }

    open(previousWork.slug);
}


function openNextWork() {
    const nextIndex =
        workViewerState.currentIndex + 1;

    const nextWork =
        workViewerState.works[
            nextIndex
        ];

    if (!nextWork) {
        return;
    }

    open(nextWork.slug);
}


/* =====================================
關閉播放器
===================================== */

function close() {
    const modal =
        getModal();

    const mount =
        getMount();

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "is_open"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal_open"
    );

    /*
     * 等淡出動畫結束後清空 iframe，
     * 讓 YouTube 停止播放。
     */
    window.setTimeout(
        () => {
            if (
                !modal.classList.contains(
                    "is_open"
                )
            ) {
                mount?.replaceChildren();
            }
        },
        220
    );

    removeWorkFromAddressBar();

    workViewerState.currentSlug = "";
    workViewerState.currentIndex = -1;

    workViewerState.lastFocusedElement
        ?.focus();

    workViewerState.lastFocusedElement =
        null;
}


/* =====================================
Modal 開關
===================================== */

function openModal(modal) {
    modal.classList.add(
        "is_open"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal_open"
    );
}


/* =====================================
點擊事件
===================================== */

function handleModalClick(event) {
    const closeTarget =
        event.target.closest(
            "[data-work-modal-close]"
        );

    if (!closeTarget) {
        return;
    }

    close();
}


/* =====================================
鍵盤操作
===================================== */

function handleViewerKeydown(event) {
    const modal =
        getModal();

    if (
        !modal ||
        !modal.classList.contains(
            "is_open"
        )
    ) {
        return;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
    }

    if (
        event.key === "ArrowLeft" &&
        !isTypingElement(event.target)
    ) {
        openPreviousWork();
        return;
    }

    if (
        event.key === "ArrowRight" &&
        !isTypingElement(event.target)
    ) {
        openNextWork();
    }
}


function isTypingElement(element) {
    return (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement ||
        element?.isContentEditable
    );
}


/* =====================================
載入與錯誤畫面
===================================== */

function showLoadingState(mount) {
    const message =
        document.createElement("p");

    message.className =
        "work_modal_status";

    message.textContent =
        "正在載入作品……";

    mount.replaceChildren(
        message
    );
}


function showErrorState(
    mount,
    slug
) {
    const container =
        document.createElement("div");

    container.className =
        "work_modal_status";

    const message =
        document.createElement("p");

    message.textContent =
        "作品載入失敗。";

    const link =
        document.createElement("a");

    link.href =
        createWorkPageUrl(slug);

    link.textContent =
        "開啟獨立作品頁";

    container.append(
        message,
        link
    );

    mount.replaceChildren(
        container
    );
}


/* =====================================
URL 處理
===================================== */

function updateAddressBar(slug) {
    const url =
        new URL(
            window.location.href
        );

    url.searchParams.set(
        "work",
        slug
    );

    history.replaceState(
        {
            work: slug,
        },
        "",
        url
    );
}


function removeWorkFromAddressBar() {
    const url =
        new URL(
            window.location.href
        );

    url.searchParams.delete(
        "work"
    );

    history.replaceState(
        {},
        "",
        url
    );
}


/* =====================================
工具
===================================== */

function getModal() {
    return document.querySelector(
        WORK_VIEWER.selectors.modal
    );
}


function getMount() {
    return document.querySelector(
        WORK_VIEWER.selectors.mount
    );
}


function createWorkPageUrl(slug) {
    return (
        WORK_VIEWER.workPageBaseUrl +
        encodeURIComponent(slug) +
        ".html"
    );
}


function findWorkIndex(slug) {
    return workViewerState.works
        .findIndex((work) => {
            return work.slug === slug;
        });
}


function focusCloseButton(player) {
    window.requestAnimationFrame(
        () => {
            player
                .querySelector(
                    ".work_modal_close"
                )
                ?.focus();
        }
    );
}


function goToStandalonePage(slug) {
    window.location.href =
        createWorkPageUrl(slug);
}