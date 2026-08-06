"use strict";


/* =====================================
設定
===================================== */

const WORKS = {

    dataUrl:
        "/data/works.json",

    selectors: {

        grid:
            "#works_grid",

        filters:
            "#works_filters",

        search:
            "#works_search",

        status:
            "#works_status",

    },

};

const worksState = {
    allWorks: [],
    visibleWorks: [],
    selectedSeries: "",
    searchText: "",
};




import {
    initializeHorizontalScroll
} from "./work_utils.js";


/* =====================================
初始化
===================================== */

document.addEventListener(
    "DOMContentLoaded",
    initWorksPage
);


async function initWorksPage() {

    const grid =
        document.querySelector(
            "#works_grid"
        );

    if (!grid) {
        console.warn(
            "找不到 #works_grid"
        );

        return;
    }

    bindSearch();

    await loadWorks();
}


/* =====================================
讀取 JSON
===================================== */

async function loadWorks() {

    showWorksStatus(
        "作品載入中……"
    );

    try {

        const response =
            await fetch(
                WORKS.dataUrl,
                {
                    cache: "no-cache",
                }
            );

        if (!response.ok) {
            throw new Error(
                `讀取失敗：${response.status}`
            );
        }

        const data =
            await response.json();

        if (!Array.isArray(data)) {
            throw new TypeError(
                "works.json 必須是陣列"
            );
        }

        worksState.allWorks =
            data
                .map(normalizeWork)
                .filter((work) => {
                    return (
                        work.slug &&
                        work.title
                    );
                });

        window.WorkViewer?.setWorks(
            worksState.allWorks
        );

        createSeriesFilters();
applyFilters();

        createSeriesFilters();
        initializeHorizontalScroll();
        applyFilters();

        applyFilters();

    } catch (error) {

        console.error(
            "載入作品失敗：",
            error
        );

        showWorksStatus(
            "作品資料載入失敗"
        );
    }
}


/* =====================================
整理作品資料
===================================== */

function normalizeWork(rawWork) {

    return {
        slug:
            String(
                rawWork.slug ?? ""
            ).trim(),

        title:
            String(
                rawWork.title ?? ""
            ).trim(),

        publishedAt:
            String(
                rawWork.publishedAt ?? ""
            ).trim(),

        url:
            String(
                rawWork.url ?? ""
            ).trim(),

        thumbnailUrl:
            String(
                rawWork.thumbnailUrl ?? ""
            ).trim(),

        videoId:
            String(
                rawWork.videoId ?? ""
            ).trim(),

        series:
            Array.isArray(
                rawWork.series
            )
                ? rawWork.series
                    .map((item) => {
                        return String(
                            item
                        ).trim();
                    })
                    .filter(Boolean)
                : [],

        featured:
            Boolean(
                rawWork.featured
            ),

        description:
            String(
                rawWork.description ?? ""
            ).trim(),
    };
}


/* =====================================
搜尋
===================================== */

function bindSearch() {

    const searchInput =
        document.querySelector(
            "#works_search"
        );

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener(
        "input",
        debounce(() => {

            worksState.searchText =
                searchInput.value
                    .trim()
                    .toLocaleLowerCase(
                        "zh-Hant"
                    );

            applyFilters();

        }, 120)
    );
}


/* =====================================
建立系列篩選
===================================== */

function createSeriesFilters() {

    const filterContainer =
        document.querySelector(
            "#works_filters"
        );

    if (!filterContainer) {
        return;
    }

    const seriesList =
        getUniqueSeries(
            worksState.allWorks
        );

    const fragment =
        document.createDocumentFragment();

    fragment.append(
        createFilterButton(
            "",
            "全部"
        )
    );

    for (const series of seriesList) {

        fragment.append(
            createFilterButton(
                series,
                series
            )
        );
    }

    filterContainer.replaceChildren(
        fragment
    );
}


function getUniqueSeries(works) {

    const seriesSet =
        new Set();

    for (const work of works) {

        for (const series of work.series) {

            seriesSet.add(
                series
            );
        }
    }

    return [
        ...seriesSet
    ].sort((a, b) => {

        return a.localeCompare(
            b,
            "zh-Hant"
        );
    });
}


function createFilterButton(
    series,
    label
) {

    const button =
        document.createElement(
            "button"
        );

    button.type = "button";

    button.className =
        "filter_button";

    button.textContent =
        label;

    button.dataset.series =
        series;

    const isActive =
        series ===
        worksState.selectedSeries;

    button.classList.toggle(
        "is_active",
        isActive
    );

    button.setAttribute(
        "aria-pressed",
        String(isActive)
    );

    button.addEventListener(
        "click",
        () => {

            worksState.selectedSeries =
                series;

            updateFilterButtons();

            applyFilters();
        }
    );

    return button;
}


function updateFilterButtons() {

    const buttons =
        document.querySelectorAll(
            "#works_filters [data-series]"
        );

    for (const button of buttons) {

        const isActive =
            button.dataset.series ===
            worksState.selectedSeries;

        button.classList.toggle(
            "is_active",
            isActive
        );

        button.setAttribute(
            "aria-pressed",
            String(isActive)
        );
    }
}


/* =====================================
搜尋與篩選
===================================== */

function applyFilters() {

    const selectedSeries =
        worksState.selectedSeries;

    const searchText =
        worksState.searchText;

    worksState.visibleWorks =
        worksState.allWorks.filter(
            (work) => {

                const matchesSeries =
                    !selectedSeries ||
                    work.series.includes(
                        selectedSeries
                    );

                if (!matchesSeries) {
                    return false;
                }

                if (!searchText) {
                    return true;
                }

                const searchableText = [
                    work.title,
                    work.description,
                    work.publishedAt,
                    ...work.series,
                ]
                    .join(" ")
                    .toLocaleLowerCase(
                        "zh-Hant"
                    );

                return searchableText.includes(
                    searchText
                );
            }
        );

    renderWorks(
        worksState.visibleWorks
    );

    updateResultCount(
        worksState.visibleWorks.length
    );
}


/* =====================================
建立作品列表
===================================== */

function renderWorks(works) {

    const grid =
        document.querySelector(
            "#works_grid"
        );

    if (!grid) {
        return;
    }

    if (works.length === 0) {

        const emptyMessage =
            document.createElement(
                "p"
            );

        emptyMessage.className =
            "works_empty_message";

        emptyMessage.textContent =
            "沒有找到符合條件的作品。";

        grid.replaceChildren(
            emptyMessage
        );

        hideWorksStatus();

        return;
    }

    const fragment =
        document.createDocumentFragment();

    for (const work of works) {

        fragment.append(
            createWorkCard(
                work
            )
        );
    }

    grid.replaceChildren(
        fragment
    );

    hideWorksStatus();
}


/* =====================================
建立作品卡片
===================================== */

function createWorkCard(work) {
    const card =
        document.createElement("article");

    card.className = "work_card";
    card.dataset.workSlug = work.slug;

    const link =
        document.createElement("a");

    link.href =
        `/works/${encodeURIComponent(work.slug)}.html`;

    link.setAttribute(
        "aria-label",
        `開啟作品：${work.title}`
    );

    link.addEventListener("click", (event) => {
        if (
            window.WorkViewer &&
            typeof window.WorkViewer.open === "function"
        ) {
            event.preventDefault();

            window.WorkViewer.open(
                work.slug
            );
        }
    });

    const thumbnail =
        document.createElement("div");

    thumbnail.className = "work_thumbnail";

    const image =
        document.createElement("img");

    image.src = work.thumbnailUrl;
    image.alt = `${work.title} 縮圖`;
    image.loading = "lazy";
    image.decoding = "async";

    thumbnail.append(image);

    const content =
        document.createElement("div");

    content.className = "work_content";

    const meta =
        document.createElement("div");

    meta.className = "work_meta";

    const tags =
        document.createElement("div");

    tags.className = "work_tags";
    tags.textContent =
        work.series.join("｜");

    const date =
        document.createElement("time");

    date.className = "work_date";
    date.textContent = work.publishedAt;

    meta.append(
        tags,
        date
    );

    const title =
        document.createElement("h3");

    title.className = "work_title";
    title.textContent = work.title;

    const intro =
        document.createElement("p");

    intro.className = "work_intro";
    intro.textContent = work.description;

    content.append(meta, title);

    if (work.description) {
        content.append(intro);
    }

    link.append(
        thumbnail,
        content
    );

    card.append(link);

    return card;
}



/* =====================================
呼叫播放器
===================================== */

function openWork(slug) {

    if (
        window.WorkViewer &&
        typeof window.WorkViewer.open ===
            "function"
    ) {

        window.WorkViewer.open(
            slug
        );

        return;
    }

    console.warn(
        "WorkViewer 尚未載入，改為前往獨立作品頁。"
    );

    window.location.href =
        `/works/${encodeURIComponent(
            slug
        )}.html`;
}


/* =====================================
狀態顯示
===================================== */

function showWorksStatus(message) {

    const status =
        document.querySelector(
            "#works_status"
        );

    if (!status) {
        return;
    }

    status.hidden =
        false;

    status.textContent =
        message;
}


function hideWorksStatus() {

    const status =
        document.querySelector(
            "#works_status"
        );

    if (!status) {
        return;
    }

    status.hidden =
        true;

    status.textContent =
        "";
}


function updateResultCount(count) {

    const resultCount =
        document.querySelector(
            "#works_result_count"
        );

    if (!resultCount) {
        return;
    }

    resultCount.textContent =
        `共 ${count} 部作品`;
}


/* =====================================
工具
===================================== */

function debounce(
    callback,
    delay = 150
) {

    let timerId =
        null;

    return (...args) => {

        window.clearTimeout(
            timerId
        );

        timerId =
            window.setTimeout(
                () => {
                    callback(
                        ...args
                    );
                },
                delay
            );
    };
}