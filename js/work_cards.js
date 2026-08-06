// ========================================
// work_cards.js
// 建立與顯示作品圖卡
// ========================================



// ========================================
// 顯示全部作品圖卡
// ========================================

export function renderWorkCards({
    container,
    works
}) {
    
    if (!container) {
        return;
    }

    container.replaceChildren();

    const fragment =
        document.createDocumentFragment();

    works.forEach((work, index) => {
        const card =
            createWorkCard(
                work,
                index
            );

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}


// ========================================
// 建立單張作品圖卡
// ========================================

function createWorkCard(
    work,
    index
) {
    const article =
        document.createElement("article");

    article.className = "work_card";

    /*
     * 讓 work.js 可以知道
     * 使用者點擊的是篩選結果中的第幾部作品。
     */
    article.dataset.workIndex =
        String(index);

    if (work.featured) {
        article.classList.add(
            "is_featured"
        );
    }

    /*
     * 保留你原本的 <a> 結構，
     * 讓現有 CSS 不需要大幅修改。
     *
     * 點擊跳轉會由 work.js 攔截，
     * 改成開啟播放器彈窗。
     */
    const link =
        document.createElement("a");

    link.className =
        "work_card_link";

    link.href =
        work.url || "#";

    /*
     * 不使用 target="_blank"，
     * 因為現在預設行為是開啟播放器。
     */
    if (!work.url) {
        link.classList.add(
            "is_disabled"
        );

        article.classList.add(
            "is_disabled"
        );

        article.setAttribute(
            "aria-disabled",
            "true"
        );
    }

    /*
     * 讓圖卡可以被鍵盤選取。
     */
    link.setAttribute(
        "aria-label",
        `開啟作品：${work.title}`
    );


    // ====================================
    // 縮圖區域
    // ====================================

    const thumbnailBox =
        document.createElement("div");

    thumbnailBox.className =
        "work_thumbnail";

    if (work.thumbnail) {
        const image =
            document.createElement("img");

        image.src =
            work.thumbnail;

        image.alt =
            `${work.title}作品縮圖`;

        image.loading =
            "lazy";

        image.decoding =
            "async";

        thumbnailBox.appendChild(
            image
        );
    } else {
        /*
         * 沒有縮圖時顯示替代內容。
         */
        const placeholder =
            document.createElement("div");

        placeholder.className =
            "work_thumbnail_placeholder";

        placeholder.textContent =
            work.title;

        thumbnailBox.appendChild(
            placeholder
        );
    }

    /*
     * 播放圖示。
     * 可以透過 CSS 或 Font Awesome 顯示。
     */
    if (work.url) {
        const playIcon =
            document.createElement("span");

        playIcon.className =
            "work_play_icon";

        playIcon.setAttribute(
            "aria-hidden",
            "true"
        );

        playIcon.innerHTML =
            `<i class="fa-regular fa-circle-play"></i>`;

        thumbnailBox.appendChild(
            playIcon
        );
    }

    if (work.featured) {
        const featuredLabel =
            document.createElement("span");

        featuredLabel.className =
            "work_featured";

        featuredLabel.textContent =
            "精選";

        thumbnailBox.appendChild(
            featuredLabel
        );
    }


    // ====================================
    // 圖卡文字內容
    // ====================================

    const cardBody =
        document.createElement("div");

    cardBody.className =
        "work_card_body";


    // ====================================
    // 系列標籤
    // ====================================

    if (
        Array.isArray(work.series) &&
        work.series.length > 0
    ) {
        const tagsBox =
            document.createElement("div");

        tagsBox.className =
            "work_tags";

        tagsBox.textContent =
            work.series.join("｜");

        cardBody.appendChild(
            tagsBox
        );
    }


    // ====================================
    // 標題
    // ====================================

    const title =
        document.createElement("h3");

    title.className =
        "work_title";

    title.textContent =
        work.title ||
        "未命名作品";

    cardBody.appendChild(
        title
    );


    // ====================================
    // 日期
    // ====================================

    if (work.date) {
        const date =
            document.createElement("time");

        date.className =
            "work_date";

        date.textContent =
            work.date;

        if (work.dateObject) {
            date.dateTime =
                work.dateObject
                    .toISOString()
                    .split("T")[0];
        }

        cardBody.appendChild(
            date
        );
    }


    // ====================================
    // 導言
    // ====================================

    if (work.description) {
        const description =
            document.createElement("p");

        description.className =
            "work_description";

        description.textContent =
            work.description;

        cardBody.appendChild(
            description
        );
    }


    // ====================================
    // 組合圖卡
    // ====================================

    link.appendChild(
        thumbnailBox
    );

    link.appendChild(
        cardBody
    );

    article.appendChild(
        link
    );

    return article;
}