/* ============================================================
   首页：加载文章列表 + 分类筛选
   ============================================================ */

const postList = $("#postList");
const filterBar = $("#filterBar");

let allCategories = [];
let currentCategory = "";   // "" 表示"全部"

async function loadCategories() {
    try {
        allCategories = await API.get(CONFIG.API.categories);
        renderFilterBar();
    } catch (err) {
        console.error("加载分类失败：", err);
    }
}

function renderFilterBar() {
    if (!filterBar) return;

    const items = [""].concat(allCategories);
    filterBar.innerHTML = items.map(cat => {
        const label = cat === "" ? "全部" : escapeHtml(cat);
        const active = cat === currentCategory ? " active" : "";
        return `<button class="filter-btn${active}" data-category="${escapeHtml(cat)}">${label}</button>`;
    }).join("");

    // 事件委托：只绑一次
    filterBar.onclick = (e) => {
        const btn = e.target.closest(".filter-btn");
        if (!btn) return;
        currentCategory = btn.dataset.category;
        renderFilterBar();
        loadPosts();
    };
}

async function loadPosts() {
    try {
        const url = currentCategory
            ? `${CONFIG.API.posts}?category=${encodeURIComponent(currentCategory)}`
            : CONFIG.API.posts;
        const posts = await API.get(url);
        renderPosts(posts);
    } catch (err) {
        postList.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    }
}

function renderPosts(posts) {
    if (!posts.length) {
        const hint = currentCategory
            ? `「${escapeHtml(currentCategory)}」下还没有文章。`
            : `还没有文章，去 <a href="/submit">投稿</a> 吧。`;
        postList.innerHTML = `<div class="empty">${hint}</div>`;
        return;
    }
    postList.innerHTML = posts.map(post => {
        const tagsHtml = (post.tags || "")
            .split(",")
            .map(t => t.trim())
            .filter(Boolean)
            .map(t => `<span class="post-tag">${escapeHtml(t)}</span>`)
            .join("");

        const categoryHtml = post.category
            ? `<span class="post-category">${escapeHtml(post.category)}</span>`
            : "";

        const pinnedHtml = post.is_pinned
            ? `<span class="post-pinned">置顶</span>`
            : "";

        const summary = post.summary
            ? escapeHtml(post.summary)
            : escapeHtml(extractText(post.content)).slice(0, 160);

        return `
        <a class="post-item" href="/post/${post.id}">
            <h2>${pinnedHtml}${escapeHtml(post.title)}</h2>
            <div class="meta">
                ${escapeHtml(post.author_name)}
                <span class="sep">·</span>
                ${formatDate(post.created_at)}
                ${categoryHtml ? `<span class="sep">·</span>${categoryHtml}` : ""}
                <span class="post-stats">
                    <span class="stat">阅读 ${post.read_count || 0}</span>
                    <span class="stat">赞 ${post.like_count || 0}</span>
                </span>
            </div>
            <div class="excerpt">${summary}</div>
            ${tagsHtml ? `<div class="post-tags">${tagsHtml}</div>` : ""}
        </a>
        `;
    }).join("");
}

// 并行拉取分类和文章
Promise.all([loadCategories(), loadPosts()]);