// ================================
// Google Sheet 設定
// ================================

// 把「試算表ID」換成你的 Google Sheet ID。
// 把「作品」換成你的工作表分頁名稱。
const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1w4oTViilqS47zAXDHR6TnDxlP-OSN7CxPO44GIozCUE/gviz/tq?tqx=out:csv&sheet=工作表2";


// ================================
// 頁面元素
// ================================

const worksGrid = document.querySelector("#works_grid");
const worksFilters = document.querySelector("#works_filters");
const worksSearchInput = document.querySelector("#works_search_input");

const worksLoading = document.querySelector("#works_loading");
const worksError = document.querySelector("#works_error");
const worksEmpty = document.querySelector("#works_empty");


// ================================
// 捲動軸
// ================================

const horizontalScrollAreas = document.querySelectorAll(
    ".works_filters"
);

horizontalScrollAreas.forEach(scrollArea => {
    scrollArea.addEventListener(
        "wheel",
        event => {
            if (
                scrollArea.scrollWidth <=
                scrollArea.clientWidth
            ) {
                return;
            }

            const atStart =
                scrollArea.scrollLeft <= 0;

            const atEnd =
                Math.ceil(
                    scrollArea.scrollLeft +
                    scrollArea.clientWidth
                ) >= scrollArea.scrollWidth;

            const scrollingLeft =
                event.deltaY < 0;

            const scrollingRight =
                event.deltaY > 0;

            /*
             * 已經到最左或最右時，
             * 恢復頁面的上下捲動。
             */
            if (
                (atStart && scrollingLeft) ||
                (atEnd && scrollingRight)
            ) {
                return;
            }

            event.preventDefault();

            scrollArea.scrollBy({
                left: event.deltaY,
                behavior: "smooth"
            });
        },
        {
            passive: false
        }
    );
});


// ================================
// 作品狀態
// ================================

let allWorks = [];
let activeSeries = "全部";
let searchKeyword = "";


// ================================
// 初始化
// ================================

document.addEventListener("DOMContentLoaded", () => {
    loadWorks();

    worksSearchInput.addEventListener("input", event => {
        searchKeyword = event.target.value
            .trim()
            .toLowerCase();

        renderWorks();
    });

    worksFilters.addEventListener("click", event => {
        const button = event.target.closest(".filter_button");

        if (!button) {
            return;
        }

        activeSeries = button.dataset.filter;

        document
            .querySelectorAll(".filter_button")
            .forEach(item => {
                item.classList.remove("is_active");
            });

        button.classList.add("is_active");

        renderWorks();
    });
});


// ================================
// 載入 Google Sheet
// ================================

async function loadWorks() {
    showStatus("loading");

    try {
        const response = await fetch(SHEET_CSV_URL);

        if (!response.ok) {
            throw new Error(
                `Google Sheet 載入失敗：${response.status}`
            );
        }

        const csvText = await response.text();

        const rows = parseCSV(csvText);

        allWorks = rows
            .map(normalizeWork)
            .filter(work => !work.hidden)
            .sort(sortWorksByDate);

        createSeriesButtons();

        renderWorks();
    } catch (error) {
        console.error("作品載入失敗：", error);

        showStatus("error");
    }
}


// ================================
// CSV 解析
// ================================

function parseCSV(csvText) {
    const table = [];

    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let index = 0; index < csvText.length; index++) {
        const character = csvText[index];
        const nextCharacter = csvText[index + 1];

        if (
            character === '"' &&
            insideQuotes &&
            nextCharacter === '"'
        ) {
            value += '"';
            index++;
            continue;
        }

        if (character === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (character === "," && !insideQuotes) {
            row.push(value);
            value = "";
            continue;
        }

        if (
            (character === "\n" || character === "\r") &&
            !insideQuotes
        ) {
            if (
                character === "\r" &&
                nextCharacter === "\n"
            ) {
                index++;
            }

            row.push(value);

            if (
                row.some(cell => cell.trim() !== "")
            ) {
                table.push(row);
            }

            row = [];
            value = "";

            continue;
        }

        value += character;
    }

    if (
        value !== "" ||
        row.length > 0
    ) {
        row.push(value);

        if (
            row.some(cell => cell.trim() !== "")
        ) {
            table.push(row);
        }
    }

    if (table.length === 0) {
        return [];
    }

    const headers = table
        .shift()
        .map(header => header.trim());

    return table.map(rowData => {
        const item = {};

        headers.forEach((header, index) => {
            item[header] =
                rowData[index]?.trim() || "";
        });

        return item;
    });
}


// ================================
// 整理作品資料
// ================================

function normalizeWork(row) {
    const title =
        row["作品名稱"] ||
        row["標題"] ||
        row["title"] ||
        "未命名作品";

    const date =
        row["發佈時間"] ||
        row["發布時間"] ||
        row["日期"] ||
        row["date"] ||
        "";

    const url =
        row["作品網址"] ||
        row["網址"] ||
        row["連結"] ||
        row["url"] ||
        "";

    const description =
        row["導言"] ||
        row["資訊欄"] ||
        row["作品介紹"] ||
        row["說明"] ||
        row["description"] ||
        "";

    const thumbnail =
        row["縮圖網址"] ||
        row["縮圖"] ||
        row["圖片"] ||
        row["thumbnail"] ||
        "";

    const seriesText =
        row["作品系列"] ||
        row["系列"] ||
        row["分類"] ||
        row["series"] ||
        "";

    const tagsText =
        row["標籤"] ||
        row["關鍵字"] ||
        row["tags"] ||
        "";

    const featuredText =
        row["精選"] ||
        row["featured"] ||
        "";

    const hiddenText =
        row["隱藏"] ||
        row["hidden"] ||
        "";

    return {
        title: title.trim(),

        date: date.trim(),

        dateObject: parseDate(date),

        url: url.trim(),

        description: getIntroduction(description),

        thumbnail: thumbnail.trim(),

        series: splitPipeValue(seriesText),

        tags: splitPipeValue(tagsText),

        featured: parseBoolean(featuredText),

        hidden: parseBoolean(hiddenText)
    };
}

function getIntroduction(text) {
    if (!text) {
        return "";
    }

    return String(text)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join("\n");
}

// ================================
// 使用 | 分隔系列和標籤
// ================================

function splitPipeValue(value) {
    if (!value) {
        return [];
    }

    return value
        .split("|")
        .map(item => item.trim())
        .filter(Boolean);
}


// ================================
// TRUE / FALSE 解析
// ================================

function parseBoolean(value) {
    const normalized = String(value)
        .trim()
        .toLowerCase();

    return [
        "true",
        "1",
        "yes",
        "y",
        "是",
        "精選",
        "隱藏"
    ].includes(normalized);
}


// ================================
// 日期解析
// ================================

function parseDate(dateText) {
    if (!dateText) {
        return null;
    }

    const normalizedDate = dateText
        .replace(/[年月]/g, "/")
        .replace(/日/g, "")
        .replace(/\./g, "/")
        .trim();

    const date = new Date(normalizedDate);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}


// ================================
// 日期排序
// ================================

function sortWorksByDate(workA, workB) {
    const dateA =
        workA.dateObject?.getTime() || 0;

    const dateB =
        workB.dateObject?.getTime() || 0;

    return dateB - dateA;
}


// ================================
// 建立系列篩選按鈕
// ================================

function createSeriesButtons() {
    const seriesList = [
        ...new Set(
            allWorks.flatMap(work => work.series)
        )
    ];

    seriesList.sort((seriesA, seriesB) => {
        return seriesA.localeCompare(
            seriesB,
            "zh-Hant"
        );
    });

    worksFilters.innerHTML = "";

    const allButton = createFilterButton(
        "全部",
        "全部",
        true
    );

    worksFilters.appendChild(allButton);

    seriesList.forEach(series => {
        const button = createFilterButton(
            series,
            series,
            false
        );

        worksFilters.appendChild(button);
    });
}


// ================================
// 建立單個篩選按鈕
// ================================

function createFilterButton(
    label,
    filter,
    isActive
) {
    const button =
        document.createElement("button");

    button.type = "button";
    button.className = "filter_button";
    button.dataset.filter = filter;
    button.textContent = label;

    if (isActive) {
        button.classList.add("is_active");
    }

    return button;
}


// ================================
// 過濾作品
// ================================

function getFilteredWorks() {
    return allWorks.filter(work => {
        const matchesSeries =
            activeSeries === "全部" ||
            work.series.includes(activeSeries);

        const searchableText = [
            work.title,
            work.description,
            work.series.join(" "),
            work.tags.join(" ")
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            searchKeyword === "" ||
            searchableText.includes(searchKeyword);

        return matchesSeries && matchesSearch;
    });
}


// ================================
// 顯示作品
// ================================

function renderWorks() {
    const filteredWorks = getFilteredWorks();

    worksGrid.innerHTML = "";

    if (filteredWorks.length === 0) {
        showStatus("empty");
        return;
    }

    filteredWorks.forEach(work => {
        const card = createWorkCard(work);

        worksGrid.appendChild(card);
    });

    showStatus("ready");
}


// ================================
// 建立作品卡片
// ================================

function createWorkCard(work) {
    const article =
        document.createElement("article");

    article.className = "work_card";

    if (work.featured) {
        article.classList.add("is_featured");
    }

    const link =
        document.createElement("a");

    link.className = "work_card_link";

    if (work.url) {
        link.href = work.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    } else {
        link.href = "#";
        link.classList.add("is_disabled");

        link.addEventListener("click", event => {
            event.preventDefault();
        });
    }

    const thumbnailBox =
        document.createElement("div");

    thumbnailBox.className = "work_thumbnail";

    if (work.thumbnail) {
        const image =
            document.createElement("img");

        image.src = work.thumbnail;
        image.alt = work.title;
        image.loading = "lazy";
        image.decoding = "async";

        thumbnailBox.appendChild(image);
    }

    if (work.featured) {
        const featuredLabel =
            document.createElement("span");

        featuredLabel.className =
            "work_featured";

        featuredLabel.textContent = "精選";

        thumbnailBox.appendChild(
            featuredLabel
        );
    }

    const cardBody =
        document.createElement("div");

    cardBody.className = "work_card_body";

    if (work.series.length > 0) {
        const tagsBox = document.createElement("div");

        tagsBox.className = "work_tags";
        tagsBox.textContent = work.series.join("｜");

        cardBody.appendChild(tagsBox);
    }

    const title =
        document.createElement("h3");

    title.className = "work_title";
    title.textContent = work.title;

    cardBody.appendChild(title);

    if (work.date) {
        const date =
            document.createElement("time");

        date.className = "work_date";
        date.textContent = work.date;

        if (work.dateObject) {
            date.dateTime =
                work.dateObject
                    .toISOString()
                    .split("T")[0];
        }

        cardBody.appendChild(date);
    }

    if (work.description) {
        const description =
            document.createElement("p");

        description.className =
            "work_description";

        description.textContent =
            work.description;

        cardBody.appendChild(description);
    }

    if (work.url) {
        const more =
            document.createElement("span");

        more.className = "work_more";

        more.innerHTML = ``;

        cardBody.appendChild(more);
    }

    link.appendChild(thumbnailBox);
    link.appendChild(cardBody);

    article.appendChild(link);

    return article;
}


// ================================
// 頁面狀態
// ================================

function showStatus(status) {
    worksLoading.hidden =
        status !== "loading";

    worksError.hidden =
        status !== "error";

    worksEmpty.hidden =
        status !== "empty";

    worksGrid.hidden =
        status === "loading" ||
        status === "error";
}