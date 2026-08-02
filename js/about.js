document.addEventListener("DOMContentLoaded", () => {

    const revealElements =
        document.querySelectorAll(".reveal");

    const observer =
        new IntersectionObserver(entries => {

            entries.forEach(entry => {

                if (!entry.isIntersecting) return;

                entry.target.classList.add("is_visible");

                observer.unobserve(entry.target);

            });

        }, {
            threshold: 0.15
        });

    revealElements.forEach(element => {
        observer.observe(element);
    });

});


const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1w4oTViilqS47zAXDHR6TnDxlP-OSN7CxPO44GIozCUE/gviz/tq?tqx=out:csv&sheet=工作表2";

document.addEventListener("DOMContentLoaded", () => {
    updateAboutNumbers();
});


async function updateAboutNumbers() {
    updateCreativeYears();

    try {
        const response = await fetch(SHEET_CSV_URL);

        if (!response.ok) {
            throw new Error(
                `Google Sheet 載入失敗：${response.status}`
            );
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        const visibleWorks = rows.filter(row => {
            const title =
                row["作品名稱"] ||
                row["標題"] ||
                row["title"] ||
                "";

            const hidden =
                row["隱藏"] ||
                row["hidden"] ||
                "";

            return (
                title.trim() !== "" &&
                !parseBoolean(hidden)
            );
        });

        animateNumberById(
            "works_count",
            visibleWorks.length
        );

    } catch (error) {
        console.error("原創作品數量讀取失敗：", error);

        const worksCount =
            document.querySelector("#works_count");

        if (worksCount) {
            worksCount.textContent = "90+";
        }
    }
}


function updateCreativeYears() {
    const currentYear =
        new Date().getFullYear();

    const startYear = 2017;

    const creativeYears =
        currentYear - startYear;

    animateNumberById(
        "creative_years",
        creativeYears,
        "+"
    );
}


function animateNumberById(
    elementId,
    target,
    suffix = ""
) {
    const element =
        document.querySelector(`#${elementId}`);

    if (!element) {
        return;
    }

    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const progress = Math.min(
            (currentTime - startTime) / duration,
            1
        );

        const easedProgress =
            1 - Math.pow(1 - progress, 3);

        const currentValue =
            Math.round(target * easedProgress);

        element.textContent =
            `${currentValue}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}


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

    const headers = table
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


function parseBoolean(value) {
    const normalized =
        String(value)
            .trim()
            .toLowerCase();

    return [
        "true",
        "1",
        "yes",
        "y",
        "是",
        "隱藏"
    ].includes(normalized);
}