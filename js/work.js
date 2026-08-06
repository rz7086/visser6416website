// ========================================
// work.js
// 作品頁主要控制器
// ========================================
console.log("work.js");


import {
    parseCSV,
    normalizeWork,
    sortWorksByDate
} from "./work_data.js";

import {
    createSeriesButtons,
    getFilteredWorks,
    updateActiveFilterButton
} from "./work_filters.js";

import {
    renderWorkCards
} from "./work_cards.js";
console.log(
    "work.js 載入成功",
    renderWorkCards
);

import {
    initializeWorkModal,
    openWorkModal,
    closeWorkModal
} from "./work_modal.js";

import {
    initializeHorizontalScroll
} from "./work_utils.js";


// ========================================
// Google Sheet 設定
// ========================================

const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1w4oTViilqS47zAXDHR6TnDxlP-OSN7CxPO44GIozCUE/gviz/tq?tqx=out:csv&sheet=工作表2";


// ========================================
// 頁面元素
// ========================================

const worksGrid =
    document.querySelector("#works_grid");

const worksFilters =
    document.querySelector("#works_filters");

const worksSearchInput =
    document.querySelector("#works_search_input");

const worksLoading =
    document.querySelector("#works_loading");

const worksError =
    document.querySelector("#works_error");

const worksEmpty =
    document.querySelector("#works_empty");


// ========================================
// 作品頁狀態
// ========================================

const workState = {
    allWorks: [],
    filteredWorks: [],

    activeSeries: "全部",
    searchKeyword: "",

    isLoading: false,
    hasError: false
};


// ========================================
// 初始化作品頁
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    initializeWorksPage
);

async function initializeWorksPage() {
    /*
     * 若不是作品頁，
     * 就不要繼續執行。
     */
    if (
        !worksGrid ||
        !worksFilters
    ) {
        return;
    }
    
    initializeHorizontalScroll(
        ".works_filters"
    );
    
    initializeWorkModal({
        getWorks: () => {
            return workState.filteredWorks;
        },

        onClose: () => {
            /*
             * 目前沒有額外處理，
             * 先保留這個接口。
             */
        }
    });
    
    bindWorksEvents();

    await loadWorks();
}


// ========================================
// 綁定頁面事件
// ========================================

function bindWorksEvents() {
    if (worksSearchInput) {
        worksSearchInput.addEventListener(
            "input",
            handleSearchInput
        );
    }

    worksFilters.addEventListener(
        "click",
        handleFilterClick
    );

    /*
     * 使用事件委派處理作品圖卡。
     * 圖卡由 work_cards.js 產生。
     */
    worksGrid.addEventListener(
        "click",
        handleWorkCardClick
    );

    worksGrid.addEventListener(
        "keydown",
        handleWorkCardKeydown
    );
}


// ========================================
// 載入 Google Sheet
// ========================================

async function loadWorks() {
        
    workState.isLoading = true;
    workState.hasError = false;

    showStatus("loading");

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(() => {
            controller.abort();
        }, 10000);

    try {
        console.log(
            "載入 Google Sheet：",
            SHEET_CSV_URL
        );

        const response =
            await fetch(
                SHEET_CSV_URL,
                {
                    signal:
                        controller.signal
                }
            );

        clearTimeout(timeoutId);

        console.log(
            "Google Sheet 載入完成：",
            response.status,
            response.statusText
        );

        if (!response.ok) {
            throw new Error(
                `Google Sheet 載入失敗：${response.status}`
            );
        }

        const csvText =
            await response.text();

        console.log(
            "CSV 文字長度：",
            csvText.length
        );

        const rows =
            parseCSV(csvText);

        workState.allWorks = rows
            .map(normalizeWork)
            .filter(work => !work.hidden)
            .sort(sortWorksByDate);

        workState.isLoading = false;

        renderSeriesFilters();
        updateWorks();

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === "AbortError") {
            console.error(
                "Google Sheet 載入超過 10 秒，已取消請求"
            );
        } else {
            console.error(
                "作品載入失敗：",
                error
            );
        }

        workState.isLoading = false;
        workState.hasError = true;

        showStatus("error");
    }
}


// ========================================
// 建立系列篩選按鈕
// ========================================

function renderSeriesFilters() {
    createSeriesButtons({
        container: worksFilters,
        works: workState.allWorks,
        activeSeries: workState.activeSeries
    });
}


// ========================================
// 更新篩選結果與畫面
// ========================================

function updateWorks() {
    workState.filteredWorks =
        getFilteredWorks({
            works: workState.allWorks,

            activeSeries:
                workState.activeSeries,

            searchKeyword:
                workState.searchKeyword
        });

    renderWorks();
}


// ========================================
// 顯示作品卡片
// ========================================

function renderWorks() {
    if (
        workState.filteredWorks.length === 0
    ) {
        worksGrid.replaceChildren();

        showStatus("empty");
        return;
    }

    renderWorkCards({
        container: worksGrid,
        works: workState.filteredWorks
    });

    showStatus("ready");
}


// ========================================
// 處理搜尋
// ========================================

function handleSearchInput(event) {
    workState.searchKeyword =
        event.target.value
            .trim()
            .toLowerCase();

    /*
     * 搜尋或篩選變更時，
     * 關閉目前播放器，
     * 避免播放器索引與新列表不一致。
     */
    closeWorkModal();

    updateWorks();
}


// ========================================
// 處理系列篩選
// ========================================

function handleFilterClick(event) {
    const button =
        event.target.closest(
            ".filter_button"
        );

    if (!button) {
        return;
    }

    const selectedSeries =
        button.dataset.filter;

    if (!selectedSeries) {
        return;
    }

    workState.activeSeries =
        selectedSeries;

    updateActiveFilterButton({
        container: worksFilters,
        activeSeries:
            workState.activeSeries
    });

    closeWorkModal();

    updateWorks();
}


// ========================================
// 處理圖卡點擊
// ========================================

function handleWorkCardClick(event) {
    const card =
        event.target.closest(
            "[data-work-index]"
        );

    if (!card) {
        return;
    }

    /*
     * 阻止原本的超連結跳轉。
     */
    event.preventDefault();

    const workIndex =
        Number(card.dataset.workIndex);

    if (
        !Number.isInteger(workIndex) ||
        workIndex < 0 ||
        workIndex >=
            workState.filteredWorks.length
    ) {
        return;
    }

    const work =
        workState.filteredWorks[workIndex];

    /*
     * 沒有影片網址時不開播放器。
     */
    if (!work?.url) {
        return;
    }

    openWorkModal(workIndex);
}


// ========================================
// 圖卡鍵盤操作
// ========================================

function handleWorkCardKeydown(event) {
    if (
        event.key !== "Enter" &&
        event.key !== " "
    ) {
        return;
    }

    const card =
        event.target.closest(
            "[data-work-index]"
        );

    if (!card) {
        return;
    }

    event.preventDefault();

    const workIndex =
        Number(card.dataset.workIndex);

    if (
        !Number.isInteger(workIndex) ||
        workIndex < 0 ||
        workIndex >=
            workState.filteredWorks.length
    ) {
        return;
    }

    const work =
        workState.filteredWorks[workIndex];

    if (!work?.url) {
        return;
    }

    openWorkModal(workIndex);
}


// ========================================
// 頁面狀態
// ========================================

function showStatus(status) {
    if (worksLoading) {
        worksLoading.hidden =
            status !== "loading";
    }

    if (worksError) {
        worksError.hidden =
            status !== "error";
    }

    if (worksEmpty) {
        worksEmpty.hidden =
            status !== "empty";
    }

    if (worksGrid) {
        worksGrid.hidden =
            status === "loading" ||
            status === "error";
    }
}