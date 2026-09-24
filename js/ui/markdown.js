/* ============================================================
   Markdown 渲染 + 标题自动编号 + 代码高亮 + 代码复制按钮
   被 blog.html / post.html / index.html 共用

   使用方式：
     renderMarkdown(mdText)  返回渲染后的 HTML 字符串
   ============================================================ */

/**
 * 把 Markdown 文本渲染成 HTML，并给标题加上自动编号、代码块高亮、代码复制按钮
 * h1 → 第一章
 * h2 → 1.1
 * h3 → 1.1.1
 */
function renderMarkdown(mdText) {
    const html = marked.parse(mdText);
    const withNumbers = addHeadingNumbers(html);

    // 用临时容器承载，让 hljs 处理每个 <pre><code>，并注入复制按钮
    const tmp = document.createElement("div");
    tmp.innerHTML = withNumbers;

    tmp.querySelectorAll("pre").forEach((pre) => {
        const code = pre.querySelector("code");
        if (!code) return;

        // 1. 代码高亮
        if (window.hljs && typeof window.hljs.highlightElement === "function") {
            window.hljs.highlightElement(code);
        }

        // 2. 生成行号
        const rawText = code.innerText.replace(/\n$/, "");   // 去尾部空行
        const lineCount = rawText.split("\n").length;
        const lineNumbers = document.createElement("span");
        lineNumbers.className = "code-line-numbers";
        lineNumbers.setAttribute("aria-hidden", "true");
        lineNumbers.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");
        pre.insertBefore(lineNumbers, code);

        // 3. 复制按钮
        const btn = document.createElement("button");
        btn.className = "code-copy-btn";
        btn.type = "button";
        btn.textContent = "复制";
        btn.setAttribute("aria-label", "复制代码");

        btn.addEventListener("click", async () => {
            const text = code.innerText;
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const ta = document.createElement("textarea");
                    ta.value = text;
                    ta.style.position = "fixed";
                    ta.style.opacity = "0";
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                }
                btn.textContent = "已复制 ✓";
                btn.classList.add("copied");
                setTimeout(() => {
                    btn.textContent = "复制";
                    btn.classList.remove("copied");
                }, 1500);
            } catch (err) {
                btn.textContent = "复制失败";
                setTimeout(() => { btn.textContent = "复制"; }, 1500);
            }
        });

        pre.appendChild(btn);
    });
    return tmp.innerHTML;
}

/**
 * 给 h1~h6 加编号
 */
function addHeadingNumbers(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const counters = [0, 0, 0, 0, 0, 0];

    doc.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(heading => {
        const level = parseInt(heading.tagName.substring(1));
        counters[level - 1] += 1;
        for (let i = level; i < 6; i++) counters[i] = 0;

        const numberText = level === 1
            ? "第" + toChineseNumber(counters[0]) + "章 "
            : counters.slice(0, level).join(".") + " ";

        const prefix = doc.createElement("span");
        prefix.className = "heading-number";
        prefix.textContent = numberText;
        heading.insertBefore(prefix, heading.firstChild);
    });

    return doc.body.innerHTML;
}

/**
 * 阿拉伯数字转中文，支持 1~99
 */
function toChineseNumber(n) {
    if (n <= 10) {
        return ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][n];
    }
    if (n < 20) {
        return "十" + ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][n - 10];
    }
    if (n < 100) {
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        return ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][tens] + "十" +
            (ones ? ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][ones] : "");
    }
    return String(n);
}