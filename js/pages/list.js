/* ============================================================
   文稿 / 手记 / 时间线 / 思考 共用逻辑
   依赖：utils.js（escapeHtml / formatDate / extractText）
   ============================================================ */

(function () {
    "use strict";

    const PAGE = document.body.dataset.page;   // posts / notes / timeline / thinking

    // ---------- 本页专用：MM-DD 短日期 ----------
    function fmtDay(iso) {
        const d = new Date(iso);
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${m}-${day}`;
    }

    // ---------- 文稿 / 手记 ----------
    async function loadPostList(kind) {
        const wrap = document.getElementById("listWrap");
        const params = new URLSearchParams(location.search);
        const viewMode = params.get("view_mode") === "loose" ? "loose" : "tight";

        // 视图切换按钮高亮
        document.querySelectorAll(".view-switch a").forEach(a => {
            const v = new URL(a.href).searchParams.get("view_mode") || "tight";
            a.classList.toggle("active", v === viewMode);
        });

        try {
            const posts = await API.get(`${CONFIG.API.list}?kind=${kind}`);

            if (!posts.length) {
                wrap.innerHTML = `<div class="empty">还没有内容。</div>`;
                return;
            }

            const cls = viewMode === "loose" ? "post-list loose" : "post-list";
            wrap.innerHTML = `<div class="${cls}">` + posts.map(p => {
                const date = formatDate(p.created_at);
                const cat = p.category ? `<span class="cat">${escapeHtml(p.category)}</span>` : "";
                if (viewMode === "loose") {
                    const excerpt = p.summary
                        ? escapeHtml(p.summary)
                        : escapeHtml(extractText(p.content)).slice(0, 160);
                    return `
                        <a class="row" href="/post/${p.id}">
                            <span class="date">${date}</span>
                            <span class="title">${escapeHtml(p.title)}</span>
                            <div class="excerpt">${excerpt}</div>
                        </a>`;
                }
                return `
                    <a class="row" href="/post/${p.id}">
                        <span class="date">${date}</span>
                        <span class="title">${escapeHtml(p.title)}</span>
                        ${cat}
                    </a>`;
            }).join("") + `</div>`;
        } catch (err) {
            wrap.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
        }
    }

    // ---------- 时间线 ----------
    async function loadTimeline() {
        const wrap = document.getElementById("timelineWrap");
        try {
            const groups = await API.get(CONFIG.API.timeline);

            if (!groups.length) {
                wrap.innerHTML = `<div class="empty">还没有内容。</div>`;
                return;
            }

            wrap.innerHTML = groups.map(g => {
                const [y, m] = g.ym.split("-");
                const label = `${y} 年 ${Number(m)} 月`;
                return `
                    <div class="timeline-month">
                        <h2>${label}</h2>
                        <ul>
                            ${g.items.map(it => `
                                <li>
                                    <span class="day">${fmtDay(it.created_at)}</span>
                                    <a href="/post/${it.id}">${escapeHtml(it.title)}</a>
                                </li>
                            `).join("")}
                        </ul>
                    </div>`;
            }).join("");
        } catch (err) {
            wrap.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
        }
    }

    // ---------- 思考 ----------
    async function loadThinkings() {
        const wrap = document.getElementById("thinkWrap");
        try {
            const items = await API.get(CONFIG.API.thinkings);

            if (!items.length) {
                wrap.innerHTML = `<div class="empty">还没有想法。</div>`;
                return;
            }
            wrap.innerHTML = items.map(t => `
                <div class="think-card">
                    <div class="meta">${escapeHtml(t.author_name)} · ${formatDate(t.created_at)}</div>
                    <div class="content">${escapeHtml(t.content)}</div>
                </div>
            `).join("");
        } catch (err) {
            wrap.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
        }
    }

    function bindThinkForm() {
        const form = document.getElementById("thinkForm");
        if (!form) return;
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const content = form.querySelector("textarea").value.trim();
            const author = form.querySelector('input[name="author_name"]').value.trim() || "匿名";
            if (!content) return;
            const btn = form.querySelector("button");
            btn.disabled = true;
            try {
                await API.post(CONFIG.API.thinkings, { content, author_name: author });
                form.reset();
                await loadThinkings();
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
            }
        });
    }

    // ---------- 启动 ----------
    document.addEventListener("DOMContentLoaded", () => {
        if (PAGE === "posts") loadPostList("post");
        else if (PAGE === "notes") loadPostList("note");
        else if (PAGE === "timeline") loadTimeline();
        else if (PAGE === "thinking") { loadThinkings(); bindThinkForm(); }
    });
})();