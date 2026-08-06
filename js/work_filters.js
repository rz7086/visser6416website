// ========================================
// work_filters.js
// 作品系列篩選與文字搜尋
// ========================================


// ========================================
// 建立系列篩選按鈕
// ========================================

export function createSeriesButtons({
    container,
    works,
    activeSeries = "全部"
}) {
    if (!container) {
        console.error(
            "createSeriesButtons：找不到篩選按鈕容器"
        );

        return;
    }

    const safeWorks =
        Array.isArray(works)
            ? works
            : [];

    const seriesList =
        getSeriesList(
            safeWorks
        );

    const fragment =
        document.createDocumentFragment();

    /*
     * 清除 HTML 裡原本的預設按鈕，
     * 改由 JavaScript 統一產生。
     */
    container.replaceChildren();


    // ====================================
    // 全部
    // ====================================

    const allButton =
        createFilterButton({
            label: "全部",
            filter: "全部",
            isActive:
                activeSeries === "全部"
        });

    fragment.appendChild(
        allButton
    );


    // ====================================
    // 各個作品系列
    // ====================================

    seriesList.forEach(seriesName => {
        const button =
            createFilterButton({
                label: seriesName,
                filter: seriesName,
                isActive:
                    activeSeries ===
                    seriesName
            });

        fragment.appendChild(
            button
        );
    });

    container.appendChild(
        fragment
    );
}


// ========================================
// 取得篩選後的作品
// ========================================

export function getFilteredWorks({
    works,
    activeSeries = "全部",
    searchKeyword = ""
}) {
    if (!Array.isArray(works)) {
        return [];
    }

    const normalizedSeries =
        normalizeText(
            activeSeries
        ) || "全部";

    const normalizedKeyword =
        normalizeText(
            searchKeyword
        );

    return works.filter(work => {
        const matchesSeries =
            matchWorkSeries(
                work,
                normalizedSeries
            );

        if (!matchesSeries) {
            return false;
        }

        const matchesSearch =
            matchWorkSearch(
                work,
                normalizedKeyword
            );

        return matchesSearch;
    });
}


// ========================================
// 更新目前選取的篩選按鈕
// ========================================

export function updateActiveFilterButton({
    container,
    activeSeries
}) {
    if (!container) {
        return;
    }

    const normalizedActiveSeries =
        String(
            activeSeries || "全部"
        ).trim();

    const buttons =
        container.querySelectorAll(
            ".filter_button"
        );

    buttons.forEach(button => {
        const buttonFilter =
            button.dataset.filter || "";

        const isActive =
            buttonFilter ===
            normalizedActiveSeries;

        button.classList.toggle(
            "is_active",
            isActive
        );

        /*
         * aria-pressed 可讓輔助工具知道
         * 哪一個篩選按鈕目前被選取。
         */
        button.setAttribute(
            "aria-pressed",
            String(isActive)
        );
    });
}


// ========================================
// 收集所有不重複的系列
// ========================================

function getSeriesList(works) {
    const seriesSet =
        new Set();

    works.forEach(work => {
        if (
            !Array.isArray(
                work?.series
            )
        ) {
            return;
        }

        work.series.forEach(
            seriesName => {
                const normalizedName =
                    String(
                        seriesName || ""
                    ).trim();

                if (normalizedName) {
                    seriesSet.add(
                        normalizedName
                    );
                }
            }
        );
    });

    return [
        ...seriesSet
    ].sort(compareSeriesNames);
}


// ========================================
// 建立單一篩選按鈕
// ========================================

function createFilterButton({
    label,
    filter,
    isActive = false
}) {
    const button =
        document.createElement(
            "button"
        );

    button.type = "button";

    button.className =
        "filter_button";

    button.dataset.filter =
        filter;

    button.textContent =
        label;

    button.setAttribute(
        "aria-pressed",
        String(isActive)
    );

    if (isActive) {
        button.classList.add(
            "is_active"
        );
    }

    return button;
}


// ========================================
// 判斷作品是否符合系列
// ========================================

function matchWorkSeries(
    work,
    activeSeries
) {
    if (
        activeSeries === "全部"
    ) {
        return true;
    }

    if (
        !Array.isArray(
            work?.series
        )
    ) {
        return false;
    }

    return work.series.some(
        seriesName => {
            return normalizeText(
                seriesName
            ) === activeSeries;
        }
    );
}


// ========================================
// 判斷作品是否符合搜尋
// ========================================

function matchWorkSearch(
    work,
    searchKeyword
) {
    /*
     * 沒有搜尋字詞時，
     * 所有作品都符合。
     */
    if (!searchKeyword) {
        return true;
    }

    const searchableText =
        createSearchableText(
            work
        );

    return searchableText.includes(
        searchKeyword
    );
}


// ========================================
// 建立作品搜尋文字
// ========================================

function createSearchableText(work) {
    const series =
        Array.isArray(work?.series)
            ? work.series.join(" ")
            : "";

    const tags =
        Array.isArray(work?.tags)
            ? work.tags.join(" ")
            : "";

    /*
     * 歌詞目前也納入搜尋。
     *
     * 若你未來覺得搜尋歌詞太容易出現
     * 不相關結果，可以把 work?.lyrics 移除。
     */
    const values = [
        work?.id,
        work?.title,
        work?.description,
        work?.fullDescription,
        series,
        tags,
        work?.lyrics
    ];

    return normalizeText(
        values
            .filter(Boolean)
            .join(" ")
    );
}


// ========================================
// 統一搜尋文字格式
// ========================================

function normalizeText(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .trim()
        .toLocaleLowerCase(
            "zh-Hant"
        );
}


// ========================================
// 系列名稱排序
// ========================================

function compareSeriesNames(
    seriesA,
    seriesB
) {
    return seriesA.localeCompare(
        seriesB,
        "zh-Hant",
        {
            numeric: true,
            sensitivity: "base"
        }
    );
}