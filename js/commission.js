
console.log("Commission.js 已載入");

const COMMISSION_SHEET_ID =
    "1w4oTViilqS47zAXDHR6TnDxlP-OSN7CxPO44GIozCUE";

const COMMISSION_SHEET_NAME =
    "委託列表";

const COMMISSION_SHEET_URL =
    `https://docs.google.com/spreadsheets/d/${COMMISSION_SHEET_ID}` +
    `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(COMMISSION_SHEET_NAME)}`;


document.addEventListener("DOMContentLoaded", () => {
    loadCommissionExamples();
});


/* ========================================
   讀取 Google Sheet
======================================== */

async function loadCommissionExamples() {
    const track =
        document.querySelector("#commission_examples_track");

    const dots =
        document.querySelector("#commission_examples_dots");

    const status =
        document.querySelector("#commission_examples_status");

    if (!track) {
        return;
    }

    try {
        const response = await fetch(COMMISSION_SHEET_URL);

        if (!response.ok) {
            throw new Error(
                `Google Sheet 載入失敗：${response.status}`
            );
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        const examples = rows
            .map(normalizeCommissionExample)
            .filter(example => {
                return (
                    example.title &&
                    example.videoId
                );
            });

        if (!examples.length) {
            if (status) {
                status.textContent = "目前沒有委託範例。";
            }

            return;
        }

        if (status) {
            status.hidden = true;
        }

        createCommissionCarousel(
            examples,
            track,
            dots
        );

    } catch (error) {
        console.error(
            "委託範例載入失敗：",
            error
        );

        if (status) {
            status.textContent =
                "委託範例載入失敗，請稍後再試。";
        }
    }
}


/* ========================================
   整理資料
======================================== */

function normalizeCommissionExample(row) {
    const title =
        row["作品名稱"] ||
        row["標題"] ||
        row["title"] ||
        "";

    const url =
        row["作品網址"] ||
        row["網址"] ||
        row["url"] ||
        "";

    const client =
        row["委託人"] ||
        row["client"] ||
        "";

    return {
        title: title.trim(),
        url: url.trim(),
        videoId: getYouTubeVideoId(url),
        client: client.trim()
    };
}


/* ========================================
   建立輪播
======================================== */

function createCommissionCarousel(
    examples,
    track,
    dotsContainer
) {
    let currentIndex = 0;

    track.innerHTML = "";

    if (dotsContainer) {
        dotsContainer.innerHTML = "";
    }

    const cards = examples.map(example => {
        const card =
            createCommissionExampleCard(example);

        track.appendChild(card);

        return card;
    });

    const dots = examples.map((example, index) => {
        if (!dotsContainer) {
            return null;
        }

        const dot =
            document.createElement("button");

        dot.type = "button";
        dot.className = "featured_dot";

        dot.setAttribute(
            "aria-label",
            `前往第 ${index + 1} 個作品`
        );

        dot.addEventListener("click", () => {
            currentIndex = index;
            updateCarousel();
        });

        dotsContainer.appendChild(dot);

        return dot;
    });

    const carousel =
        track.closest(".commission_examples");

    const previousButton =
        carousel?.querySelector(
            ".featured_previous"
        );

    const nextButton =
        carousel?.querySelector(
            ".featured_next"
        );

    previousButton?.addEventListener(
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

    nextButton?.addEventListener(
        "click",
        () => {
            currentIndex =
                (
                    currentIndex + 1
                ) % cards.length;

            updateCarousel();
        }
    );

    function updateCarousel() {
        const previousIndex =
            (
                currentIndex -
                1 +
                cards.length
            ) % cards.length;

        const nextIndex =
            (
                currentIndex + 1
            ) % cards.length;

        cards.forEach((card, index) => {
            card.classList.remove(
                "is_active",
                "is_previous",
                "is_next"
            );

            if (index === currentIndex) {
                card.classList.add("is_active");
            } else if (
                cards.length > 1 &&
                index === previousIndex
            ) {
                card.classList.add("is_previous");
            } else if (
                cards.length > 1 &&
                index === nextIndex
            ) {
                card.classList.add("is_next");
            }
        });

        dots.forEach((dot, index) => {
            dot?.classList.toggle(
                "is_active",
                index === currentIndex
            );
        });
    }

    updateCarousel();
}


/* ========================================
   建立作品卡片
======================================== */

function createCommissionExampleCard(example) {
    const article =
        document.createElement("article");

    article.className = "featured_card";

    const videoBox =
        document.createElement("div");

    videoBox.className = "featured_video";

    const iframe =
        document.createElement("iframe");

    iframe.src =
        `https://www.youtube.com/embed/${example.videoId}`;

    iframe.title = example.title;
    iframe.loading = "lazy";

    iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    iframe.referrerPolicy =
        "strict-origin-when-cross-origin";

    iframe.allowFullscreen = true;

    videoBox.appendChild(iframe);

    const title =
        document.createElement("h3");

    title.textContent = example.title;

    const client =
        document.createElement("p");

    client.className = "featured_client";

    client.textContent =
        example.client
            ? `委託人：${example.client}`
            : "委託人：未公開";

    article.appendChild(videoBox);
    article.appendChild(title);
    article.appendChild(client);

    return article;
}


/* ========================================
   YouTube 網址轉影片 ID
======================================== */

function getYouTubeVideoId(url) {
    if (!url) {
        return "";
    }

    try {
        const parsedUrl = new URL(url);

        if (
            parsedUrl.hostname.includes("youtu.be")
        ) {
            return parsedUrl.pathname
                .slice(1)
                .split("?")[0];
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
            ""
        );

    } catch {
        return "";
    }
}

/* ========================================
   CSV 解析
======================================== */

function parseCSV(csvText) {
    const table = [];

    let row = [];
    let value = "";
    let insideQuotes = false;

    for (
        let index = 0;
        index < csvText.length;
        index++
    ) {
        const character =
            csvText[index];

        const nextCharacter =
            csvText[index + 1];

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

        if (
            character === "," &&
            !insideQuotes
        ) {
            row.push(value);
            value = "";
            continue;
        }

        if (
            (
                character === "\n" ||
                character === "\r"
            ) &&
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
                row.some(
                    cell =>
                        cell.trim() !== ""
                )
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
            row.some(
                cell =>
                    cell.trim() !== ""
            )
        ) {
            table.push(row);
        }
    }

    if (!table.length) {
        return [];
    }

    const headers =
        table
            .shift()
            .map(header =>
                header.trim()
            );

    return table.map(rowData => {
        const item = {};

        headers.forEach(
            (header, index) => {
                item[header] =
                    rowData[index]?.trim() ||
                    "";
            }
        );

        return item;
    });
}


/* ========================================
   Reveal
======================================== */
