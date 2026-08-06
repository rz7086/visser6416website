// ========================================
// work_data.js
// Google Sheet CSV 與作品資料整理
// ========================================


// ========================================
// 解析 CSV
// ========================================

export function parseCSV(csvText) {
    if (
        typeof csvText !== "string" ||
        csvText.trim() === ""
    ) {
        return [];
    }

    const table = [];

    let currentRow = [];
    let currentValue = "";
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


        // =================================
        // CSV 引號內的雙引號
        // "" 代表真正的 "
        // =================================

        if (
            character === '"' &&
            insideQuotes &&
            nextCharacter === '"'
        ) {
            currentValue += '"';

            index++;

            continue;
        }


        // =================================
        // 進入或離開引號區域
        // =================================

        if (character === '"') {
            insideQuotes =
                !insideQuotes;

            continue;
        }


        // =================================
        // 欄位分隔
        // =================================

        if (
            character === "," &&
            !insideQuotes
        ) {
            currentRow.push(
                currentValue
            );

            currentValue = "";

            continue;
        }


        // =================================
        // 資料列換行
        // =================================

        if (
            (
                character === "\n" ||
                character === "\r"
            ) &&
            !insideQuotes
        ) {
            /*
             * Windows 換行格式為 \r\n，
             * 避免被當成兩次換行。
             */
            if (
                character === "\r" &&
                nextCharacter === "\n"
            ) {
                index++;
            }

            currentRow.push(
                currentValue
            );

            if (
                hasNonEmptyCell(
                    currentRow
                )
            ) {
                table.push(
                    currentRow
                );
            }

            currentRow = [];
            currentValue = "";

            continue;
        }


        // =================================
        // 一般文字
        // =================================

        currentValue += character;
    }


    // =====================================
    // 收入最後一列資料
    // =====================================

    if (
        currentValue !== "" ||
        currentRow.length > 0
    ) {
        currentRow.push(
            currentValue
        );

        if (
            hasNonEmptyCell(
                currentRow
            )
        ) {
            table.push(
                currentRow
            );
        }
    }


    // =====================================
    // 沒有任何資料
    // =====================================

    if (table.length === 0) {
        return [];
    }


    // =====================================
    // 第一列作為欄位名稱
    // =====================================

    const headers = table
        .shift()
        .map(header => {
            return String(header)
                .replace(/^\uFEFF/, "")
                .trim();
        });


    // =====================================
    // 每列轉成物件
    // =====================================

    return table.map(rowData => {
        const item = {};

        headers.forEach(
            (header, index) => {
                /*
                 * 沒有欄位名稱的欄位忽略。
                 */
                if (!header) {
                    return;
                }

                item[header] =
                    String(
                        rowData[index] ?? ""
                    ).trim();
            }
        );

        return item;
    });
}


// ========================================
// 整理單筆作品資料
// ========================================

export function normalizeWork(row) {
    const source =
        row &&
        typeof row === "object"
            ? row
            : {};


    // =====================================
    // 作品 ID
    // =====================================

    const workId = getFirstValue(
        source,
        [
            "作品ID",
            "作品 ID",
            "ID",
            "id"
        ]
    );


    // =====================================
    // 作品名稱
    // =====================================

    const title = getFirstValue(
        source,
        [
            "作品名稱",
            "標題",
            "名稱",
            "title"
        ],
        "未命名作品"
    );


    // =====================================
    // 發佈時間
    // =====================================

    const date = getFirstValue(
        source,
        [
            "發佈時間",
            "發布時間",
            "發佈日期",
            "發布日期",
            "日期",
            "date"
        ]
    );


    // =====================================
    // 作品網址
    // =====================================

    const url = getFirstValue(
        source,
        [
            "作品網址",
            "影片網址",
            "YouTube網址",
            "YouTube 網址",
            "網址",
            "連結",
            "url"
        ]
    );


    // =====================================
    // 資訊欄與完整作品介紹
    // =====================================

    const fullDescription =
        normalizeMultilineText(
            getFirstValue(
                source,
                [
                    "資訊欄",
                    "完整資訊欄",
                    "作品介紹",
                    "說明",
                    "description"
                ]
            )
        );



    // =====================================
    // 圖卡導言
    // 固定取資訊欄前兩個非空白行
    // =====================================

    const description =
        getIntroduction(
            fullDescription
        );

    // =====================================
    // 縮圖網址
    // =====================================

    const thumbnail =
        getFirstValue(
            source,
            [
                "縮圖網址",
                "縮圖",
                "圖片網址",
                "圖片",
                "thumbnail"
            ]
        );


    // =====================================
    // 作品系列
    // =====================================

    const seriesText =
        getFirstValue(
            source,
            [
                "作品系列",
                "系列",
                "分類",
                "series"
            ]
        );


    // =====================================
    // 搜尋標籤
    // =====================================

    const tagsText =
        getFirstValue(
            source,
            [
                "標籤",
                "關鍵字",
                "搜尋標籤",
                "tags"
            ]
        );


    // =====================================
    // 歌詞
    // =====================================

    const lyricsText =
        getFirstValue(
            source,
            [
                "歌詞",
                "完整歌詞",
                "lyrics"
            ]
        );

    const lyrics =
        normalizeMultilineText(
            lyricsText
        ) || "（無歌詞）";


    // =====================================
    // 精選
    //
    // 目前可不在 Google Sheet 建立此欄。
    // 沒有欄位或空白時會是 false。
    // =====================================

    const featuredText =
        getFirstValue(
            source,
            [
                "精選",
                "featured"
            ]
        );


    // =====================================
    // 隱藏
    // =====================================

    const hiddenText =
        getFirstValue(
            source,
            [
                "隱藏",
                "hidden"
            ]
        );


    // =====================================
    // YouTube 影片 ID
    // =====================================

    const videoId =
        getYoutubeVideoId(
            url
        );


    // =====================================
    // 最終作品 ID
    //
    // 優先順序：
    // 1. Google Sheet 的作品ID
    // 2. YouTube 影片 ID
    // 3. 標題與日期產生的備用 ID
    // =====================================

    const id =
        workId ||
        videoId ||
        createWorkId(
            title,
            date
        );


    // =====================================
    // 統一作品資料格式
    // =====================================

    return {
        id,

        title:
            title.trim(),

        date:
            date.trim(),

        dateObject:
            parseDate(
                date
            ),

        url:
            url.trim(),

        videoId,

        /*
         * 玩家或未來詳細頁使用。
         */
        fullDescription,

        /*
         * 作品圖卡使用。
         */
        description,

        thumbnail:
            thumbnail.trim(),

        series:
            splitListValue(
                seriesText
            ),

        tags:
            splitListValue(
                tagsText
            ),

        lyrics,

        /*
         * Sheet 沒有精選欄時為 false。
         */
        featured:
            parseBoolean(
                featuredText
            ),

        hidden:
            parseBoolean(
                hiddenText
            )
    };
}


// ========================================
// 作品日期排序
// 最新作品排在最前面
// ========================================

export function sortWorksByDate(
    workA,
    workB
) {
    const dateA =
        workA?.dateObject instanceof Date
            ? workA.dateObject.getTime()
            : 0;

    const dateB =
        workB?.dateObject instanceof Date
            ? workB.dateObject.getTime()
            : 0;

    return dateB - dateA;
}


// ========================================
// 檢查一列是否存在非空白欄位
// ========================================

function hasNonEmptyCell(row) {
    return row.some(cell => {
        return String(cell)
            .trim() !== "";
    });
}


// ========================================
// 取得第一個有內容的欄位
// ========================================

function getFirstValue(
    source,
    possibleKeys,
    fallback = ""
) {
    for (const key of possibleKeys) {
        const value =
            source[key];

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            return String(value);
        }
    }

    return fallback;
}


// ========================================
// 整理多行文字
// ========================================

function normalizeMultilineText(text) {
    if (!text) {
        return "";
    }

    return String(text)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();
}


// ========================================
// 取得圖卡導言
// 取資訊欄前兩個非空白行
// ========================================

function getIntroduction(text) {
    if (!text) {
        return "";
    }

    return normalizeMultilineText(text)
        .split("\n")
        .map(line => {
            return line.trim();
        })
        .filter(Boolean)
        .slice(0, 2)
        .join("\n");
}


// ========================================
// 分隔系列與標籤
// ========================================

function splitListValue(value) {
    if (!value) {
        return [];
    }

    /*
     * 支援以下格式：
     *
     * 純音樂|體驗系列
     * 純音樂｜體驗系列
     * 純音樂,體驗系列
     * 純音樂，體驗系列
     * 純音樂、體驗系列
     */
    const list =
        String(value)
            .split(/[|｜,，、]/)
            .map(item => {
                return item.trim();
            })
            .filter(Boolean);

    /*
     * Set 移除重複項目。
     */
    return [
        ...new Set(list)
    ];
}


// ========================================
// TRUE / FALSE 解析
// ========================================

function parseBoolean(value) {
    const normalized =
        String(value ?? "")
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


// ========================================
// 日期解析
// ========================================

function parseDate(dateText) {
    if (!dateText) {
        return null;
    }

    const normalizedDate =
        String(dateText)
            .replace(/[年月]/g, "/")
            .replace(/日/g, "")
            .replace(/\./g, "/")
            .replace(/-/g, "/")
            .trim();

    const date =
        new Date(
            normalizedDate
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}


// ========================================
// 取得 YouTube 影片 ID
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


        // =================================
        // youtu.be/VIDEO_ID
        // =================================

        if (
            hostname === "youtu.be"
        ) {
            return parsedUrl.pathname
                .split("/")
                .filter(Boolean)[0] || "";
        }


        // =================================
        // youtube.com
        // =================================

        if (
            hostname === "youtube.com" ||
            hostname.endsWith(
                ".youtube.com"
            )
        ) {
            /*
             * youtube.com/watch?v=VIDEO_ID
             */
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

            /*
             * youtube.com/shorts/VIDEO_ID
             * youtube.com/embed/VIDEO_ID
             * youtube.com/live/VIDEO_ID
             */
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
        /*
         * 網址格式錯誤時，
         * 再嘗試用正規表示式擷取。
         */
        const match =
            String(url).match(
                /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/
            );

        return match?.[1] || "";
    }
}


// ========================================
// 建立備用作品 ID
// ========================================

function createWorkId(
    title,
    date
) {
    const source =
        `${title}-${date}`
            .trim()
            .toLowerCase();

    const normalized =
        source
            .normalize("NFKC")
            .replace(/\s+/g, "-")
            .replace(
                /[^\p{L}\p{N}-]/gu,
                ""
            )
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

    if (normalized) {
        return normalized;
    }

    /*
     * 通常不會走到這裡。
     * 避免使用 Date.now()，
     * 否則同一作品每次載入的 ID 都不同。
     */
    return "untitled-work";
}