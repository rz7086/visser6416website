// ========================================
// work_utils.js
// 作品頁共用工具
// ========================================


// ========================================
// 初始化水平捲動區域
// ========================================

export function initializeHorizontalScroll(
    selector = ".works_filters"
) {
    const scrollAreas =
        document.querySelectorAll(
            selector
        );

    if (scrollAreas.length === 0) {
        return;
    }

    scrollAreas.forEach(scrollArea => {
        initializeSingleScrollArea(
            scrollArea
        );
    });
}


// ========================================
// 初始化單一水平捲動區域
// ========================================

function initializeSingleScrollArea(
    scrollArea
) {
    /*
     * 避免同一個元素重複綁定事件。
     */
    if (
        scrollArea.dataset
            .horizontalScrollInitialized ===
        "true"
    ) {
        return;
    }

    scrollArea.dataset
        .horizontalScrollInitialized =
        "true";

    scrollArea.addEventListener(
        "wheel",
        handleHorizontalWheel,
        {
            passive: false
        }
    );
}


// ========================================
// 處理滑鼠滾輪
// ========================================

function handleHorizontalWheel(event) {
    const scrollArea =
        event.currentTarget;

    if (
        !(scrollArea instanceof HTMLElement)
    ) {
        return;
    }

    /*
     * 沒有水平溢出時，
     * 保留網頁原本的垂直捲動。
     */
    if (
        scrollArea.scrollWidth <=
        scrollArea.clientWidth
    ) {
        return;
    }

    /*
     * 若使用者主要正在使用水平滾輪、
     * 觸控板左右滑動或 Shift + 滾輪，
     * 優先採用 deltaX。
     *
     * 一般滑鼠滾輪則使用 deltaY
     * 轉換成水平位移。
     */
    const horizontalDelta =
        Math.abs(event.deltaX) >
        Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY;

    if (horizontalDelta === 0) {
        return;
    }

    const maxScrollLeft =
        scrollArea.scrollWidth -
        scrollArea.clientWidth;

    const currentScrollLeft =
        scrollArea.scrollLeft;

    const scrollingLeft =
        horizontalDelta < 0;

    const scrollingRight =
        horizontalDelta > 0;

    const atStart =
        currentScrollLeft <= 0;

    /*
     * 使用 1px 容錯，
     * 避免小數捲動值導致無法判定最右側。
     */
    const atEnd =
        currentScrollLeft >=
        maxScrollLeft - 1;


    // ====================================
    // 已到邊界時恢復頁面垂直捲動
    // ====================================

    if (
        (atStart && scrollingLeft) ||
        (atEnd && scrollingRight)
    ) {
        return;
    }

    event.preventDefault();

    scrollArea.scrollBy({
        left: horizontalDelta,
        behavior: "smooth"
    });
}