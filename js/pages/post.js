/* ============================================================
   文章页逻辑
   ============================================================ */

// ======================
// 点赞
// ======================
function likedKey(postId) { return CONFIG.STORAGE.liked(postId); }
function isLiked(postId) { return localStorage.getItem(likedKey(postId)) === "1"; }
function setLiked(postId, liked) {
    if (liked) localStorage.setItem(likedKey(postId), "1");
    else localStorage.removeItem(likedKey(postId));
}
function likeButtonHtml(count, liked) {
    return liked
        ? `♥ 已赞 · <span id="likeCount">${count}</span>（再点取消）`
        : `♥ 点赞 · <span id="likeCount">${count}</span>`;
}


// ======================
// 附件工具
// ======================
function isImage(name) {
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(name || "");
}
function isPdf(name) {
    return /\.pdf$/i.test(name || "");
}

// 友好提示：文件已被移动或删除
function missingFileHtml(item) {
    return `
        <div class="attach-preview-missing">
            <div class="attach-preview-missing-icon">⚠️</div>
            <div class="attach-preview-missing-title">该附件已被移动或删除</div>
            <div class="attach-preview-missing-name">${escapeHtml(item.name || "未知文件")}</div>
            <div class="attach-preview-missing-hint">可能因服务器 Bug 或文件损坏，请联系管理员</div>
        </div>
    `;
}

// 渲染预览区内容
function renderAttachmentPreview(item) {
    if (!item) {
        return `<div class="attach-preview-empty">点击左侧附件预览</div>`;
    }
    if (isPdf(item.name)) {
        return `
            <iframe class="attach-preview-frame"
                    src="${item.url}"
                    title="${escapeHtml(item.name)}"></iframe>
        `;
    }
    if (isImage(item.name)) {
        return `
            <div class="attach-preview-image-wrap">
                <img class="attach-preview-image"
                     src="${item.url}"
                     alt="${escapeHtml(item.name)}">
            </div>
        `;
    }
    // 其他类型：只给下载
    return `
        <div class="attach-preview-other">
            <div class="attach-preview-other-icon">📎</div>
            <div class="attach-preview-other-name">${escapeHtml(item.name)}</div>
            <a class="attach-download-btn" href="${item.url}" download="${escapeHtml(item.name)}">下载</a>
        </div>
    `;
}

// 给预览区挂 onerror（PDF iframe、图片 img），失败时替换成提示
function attachPreviewErrorHandler(container, item) {
    if (!container || !item) return;

    if (isPdf(item.name)) {
        const iframe = container.querySelector(".attach-preview-frame");
        if (iframe) {
            // HEAD 探测文件是否存在
            API.raw(item.url, { method: "HEAD" })
                .then(res => {
                    if (!res.ok) {
                        container.innerHTML = missingFileHtml(item);
                    }
                })
                .catch(() => {
                    container.innerHTML = missingFileHtml(item);
                });
        }
    } else if (isImage(item.name)) {
        const img = container.querySelector(".attach-preview-image");
        if (img) {
            img.addEventListener("error", () => {
                container.innerHTML = missingFileHtml(item);
            });
            API.raw(item.url, { method: "HEAD" })
                .then(res => {
                    if (!res.ok) {
                        container.innerHTML = missingFileHtml(item);
                    }
                })
                .catch(() => { });
        }
    }
}


// ======================
// 加载文章
// ======================
async function loadPost() {
    const postId = getPostIdFromUrl();
    if (postId === null) {
        showError("无效的文章地址");
        return;
    }
    try {
        let post;
        try {
            post = await API.get(CONFIG.API.post(postId));
        } catch (err) {
            // 404 会走到这里，err.message 是 detail
            if (err.message && err.message.includes("不存在")) {
                showError("文章不存在，或尚未通过审核");
                return;
            }
            throw err;
        }
        renderPost(post);

        // 阅读数 +1（静默）
        API.post(CONFIG.API.postRead(postId))
            .then(data => {
                if (data && data.counted) {
                    const el = document.querySelector(".read-count");
                    if (el) el.textContent = `阅读 ${data.read_count}`;
                }
            })
            .catch(() => { });
    } catch (err) {
        showError("加载失败：" + err.message);
    }
}


// ======================
// 渲染文章
// ======================
function renderPost(post) {
    document.title = post.title + " - 我的博客";
    const rendered = renderMarkdown(post.content || "");
    const liked = isLiked(post.id);

    // ★ 只用新表 attachments 的数据，不再读 posts.attachment_url 旧字段
    const attachments = Array.isArray(post.attachments) ? [...post.attachments] : [];

    const categoryHtml = post.category
        ? `<span class="sep">·</span><span class="category">${escapeHtml(post.category)}</span>`
        : "";

    const hasAttach = attachments.length > 0;
    // 初始状态：有附件且默认选中第一个 → 两栏
    const initialActive = hasAttach ? 0 : -1;
    const initialClass = hasAttach ? "with-attach" : "";

    document.getElementById("page").innerHTML = `
        <article class="article ${initialClass}">
            <div class="article-main">
                <h1 class="title">${escapeHtml(post.title)}</h1>
                <div class="meta">
                    作者：<span class="author">${escapeHtml(post.author_name)}</span>
                    <span style="margin: 0 8px;">·</span>
                    ${formatDate(post.created_at)}
                    ${categoryHtml}
                    <span style="margin: 0 8px;">·</span>
                    <span class="read-count">阅读 ${post.read_count || 0}</span>
                </div>
                <div class="markdown-body">${rendered}</div>
                <div class="like-bar">
                    <button class="btn-like ${liked ? 'liked' : ''}" id="likeBtn">
                        ${likeButtonHtml(post.like_count || 0, liked)}
                    </button>
                </div>
            </div>

            ${hasAttach ? `
                <aside class="article-attach">
                    <div class="attach-header">附件 (${attachments.length})</div>
                    <ul class="attach-list" id="attachList">
                        ${attachments.map((a, i) => `
                            <li class="attach-item ${i === initialActive ? 'active' : ''}" data-index="${i}">
                                <span class="attach-icon">${isPdf(a.name) ? '📄' : isImage(a.name) ? '🖼️' : '📎'}</span>
                                <span class="attach-name" title="${escapeHtml(a.name)}">${escapeHtml(a.name)}</span>
                            </li>
                        `).join("")}
                    </ul>
                    <div class="attach-preview" id="attachPreview">
                        ${renderAttachmentPreview(attachments[initialActive])}
                    </div>
                    <a class="attach-download-btn full" id="attachDownload"
                       href="${attachments[initialActive].url}"
                       download="${escapeHtml(attachments[initialActive].name)}">
                        ⬇ 下载当前附件
                    </a>
                </aside>
            ` : ''}
        </article>
    `;

    // 初始预览的 onerror
    if (hasAttach) {
        const previewEl = document.getElementById("attachPreview");
        attachPreviewErrorHandler(previewEl, attachments[initialActive]);
    }

    // ============ 附件点击交互 ============
    // 规则：
    //   - 点击"未选中"的附件 → 选中它，显示预览，两栏布局
    //   - 点击"已选中"的附件 → 取消选中，隐藏预览，正文 100%（附件列表保留在右侧）
    if (hasAttach) {
        const articleEl = document.querySelector(".article");
        const listEl = document.getElementById("attachList");
        const previewEl = document.getElementById("attachPreview");
        const downloadEl = document.getElementById("attachDownload");
        const asideEl = document.querySelector(".article-attach");

        listEl.querySelectorAll(".attach-item").forEach(li => {
            li.addEventListener("click", () => {
                const idx = parseInt(li.dataset.index, 10);
                const item = attachments[idx];
                if (!item) return;

                const wasActive = li.classList.contains("active");

                if (wasActive) {
                    // ★ 取消选中
                    li.classList.remove("active");
                    previewEl.style.display = "none";
                    downloadEl.style.display = "none";
                    articleEl.classList.remove("with-attach");
                    articleEl.classList.add("no-attach-view");
                } else {
                    // ★ 选中新附件
                    listEl.querySelectorAll(".attach-item").forEach(x => x.classList.remove("active"));
                    li.classList.add("active");
                    asideEl.classList.remove("collapsed");
                    previewEl.style.display = "";
                    downloadEl.style.display = "";
                    previewEl.innerHTML = renderAttachmentPreview(item);
                    downloadEl.href = item.url;
                    downloadEl.setAttribute("download", item.name);
                    articleEl.classList.remove("no-attach-view");
                    articleEl.classList.add("with-attach");
                    attachPreviewErrorHandler(previewEl, item);
                }
            });
        });
    }

    buildTOC();
}


// ======================
// 点赞交互
// ======================
document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#likeBtn");
    if (!btn) return;

    const postId = getPostIdFromUrl();
    if (!postId || btn.disabled) return;

    const liked = isLiked(postId);
    btn.disabled = true;

    try {
        let data;
        if (liked) {
            data = await API.del(CONFIG.API.postLike(postId));
        } else {
            data = await API.post(CONFIG.API.postLike(postId));
        }
        setLiked(postId, !liked);

        const nowLiked = isLiked(postId);
        btn.classList.toggle("liked", nowLiked);
        btn.innerHTML = likeButtonHtml(data.like_count, nowLiked);
    } catch (err) {
        console.error(err);
    } finally {
        btn.disabled = false;
    }
});


// ======================
// 目录
// ======================
function buildTOC() {
    const tocEl = document.getElementById("toc");
    const listEl = document.getElementById("tocList");
    const article = document.querySelector(".markdown-body");
    if (!tocEl || !listEl || !article) return;

    const headings = article.querySelectorAll("h1, h2, h3");
    if (headings.length === 0) {
        tocEl.classList.remove("visible");
        return;
    }

    const items = [];
    headings.forEach((h, idx) => {
        const level = parseInt(h.tagName.substring(1));
        let id = h.id;
        if (!id) {
            id = `toc-${idx}`;
            h.id = id;
        }
        items.push({ id, text: h.textContent.trim(), level });
    });

    listEl.innerHTML = items.map(it => `
        <li>
            <a href="#${it.id}" class="lv-${it.level}" data-target="${it.id}">
                ${escapeHtml(it.text)}
            </a>
        </li>
    `).join("");

    tocEl.classList.add("visible");

    listEl.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", (e) => {
            e.preventDefault();
            const target = document.getElementById(a.dataset.target);
            if (!target) return;
            const top = target.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top, behavior: "smooth" });
        });
    });

    const links = Array.from(listEl.querySelectorAll("a"));
    const headingEls = items.map(it => document.getElementById(it.id));

    function onScroll() {
        const fromTop = window.scrollY + 120;
        let activeIdx = 0;
        for (let i = 0; i < headingEls.length; i++) {
            if (headingEls[i].offsetTop <= fromTop) activeIdx = i;
        }
        links.forEach((a, i) => a.classList.toggle("active", i === activeIdx));
    }

    window.removeEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
}


// ======================
// 错误
// ======================
function showError(msg) {
    document.getElementById("page").innerHTML =
        `<div class="error">${escapeHtml(msg)}<br><br><a href="/">← 返回首页</a></div>`;
    const toc = document.getElementById("toc");
    if (toc) toc.classList.remove("visible");
}

loadPost();