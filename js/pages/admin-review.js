/* ============================================================
   审核详情页逻辑
   ============================================================ */

const POST_ID = getPostIdFromUrl();

Auth.requireLogin();

function isImage(name) {
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(name || "");
}

function isPdf(name) {
    return /\.pdf$/i.test(name || "");
}

function getFileIcon(name) {
    if (isImage(name)) return "🖼️";
    if (isPdf(name)) return "📄";
    return "📎";
}

function renderAttachmentCard(a) {
    let preview;
    if (isImage(a.name)) {
        preview = `<img src="${a.url}" alt="${escapeHtml(a.name)}">`;
    } else if (isPdf(a.name)) {
        preview = `<iframe src="${a.url}" title="${escapeHtml(a.name)}"></iframe>`;
    } else {
        preview = `<div class="att-icon">${getFileIcon(a.name)}</div>`;
    }
    return `
        <div class="att-card">
            <div class="att-preview">${preview}</div>
            <div class="att-footer">
                <span class="att-name" title="${escapeHtml(a.name)}">${getFileIcon(a.name)} ${escapeHtml(a.name)}</span>
                <div class="att-actions">
                    <a class="att-btn" href="${a.url}" target="_blank" rel="noopener">预览</a>
                    <a class="att-btn" href="${a.url}" download="${escapeHtml(a.name)}">下载</a>
                </div>
            </div>
        </div>
    `;
}

function renderReview(post) {
    const atts = Array.isArray(post.attachments) ? post.attachments : [];
    const rendered = renderMarkdown(post.content || "");

    const statusHtml = post.is_approved
        ? `<span class="status approved">已通过</span>`
        : `<span class="status pending">待审核</span>`;

    const categoryHtml = post.category
        ? `<span>${escapeHtml(post.category)}</span>`
        : "";

    const tagsHtml = post.tags
        ? `<span>标签：${escapeHtml(post.tags)}</span>`
        : "";

    const attHtml = atts.length ? `
        <div class="review-attachments">
            <h2>📎 附件 <span class="att-count">${atts.length} 个</span></h2>
            <div class="att-grid">
                ${atts.map(renderAttachmentCard).join("")}
            </div>
        </div>
    ` : "";

    const actionHtml = post.is_approved ? `
        <div class="review-actions">
            <a href="/post/${post.id}" class="btn-approve" target="_blank" rel="noopener">查看文章</a>
            <button class="btn-danger" id="deleteBtn">删除文章</button>
            <a href="/admin" class="btn-back">返回后台</a>
        </div>
    ` : `
        <div class="review-actions">
            <button class="btn-approve" id="approveBtn">✓ 通过审核</button>
            <button class="btn-danger" id="deleteBtn">删除文章</button>
            <a href="/admin/edit/${post.id}" class="btn-back">编辑</a>
            <a href="/admin" class="btn-back">返回后台</a>
        </div>
    `;

    document.title = `审核：${post.title} - 我的博客`;
    document.getElementById("reviewContent").innerHTML = `
        <div class="review-card">
            <h1>${escapeHtml(post.title)}</h1>
            <div class="review-meta">
                <span>👤 ${escapeHtml(post.author_name)}</span>
                <span class="sep">·</span>
                <span>#${post.id}</span>
                <span class="sep">·</span>
                <span>${formatDate(post.created_at)}</span>
                ${categoryHtml ? `<span class="sep">·</span>${categoryHtml}` : ""}
                ${tagsHtml ? `<span class="sep">·</span>${tagsHtml}` : ""}
                <span class="sep">·</span>
                ${statusHtml}
            </div>
            <div class="review-body markdown-body">${rendered}</div>
            ${attHtml}
            ${actionHtml}
            <div class="review-message" id="reviewMessage"></div>
        </div>
    `;

    // 绑定按钮
    const approveBtn = document.getElementById("approveBtn");
    const deleteBtn = document.getElementById("deleteBtn");
    const messageBox = document.getElementById("reviewMessage");

    if (approveBtn) {
        approveBtn.addEventListener("click", async () => {
            if (!confirm(`确定要通过《${post.title}》吗？`)) return;
            approveBtn.disabled = true;
            try {
                await API.post(CONFIG.API.adminApprove(post.id), null, { auth: true });
                showMessage(messageBox, "已通过，正在返回后台...", "success");
                setTimeout(() => window.location.href = "/admin", 1000);
            } catch (err) {
                showMessage(messageBox, "操作失败：" + err.message, "error");
                approveBtn.disabled = false;
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if (!confirm(`确定要删除《${post.title}》吗？此操作不可恢复。`)) return;
            deleteBtn.disabled = true;
            try {
                await API.del(CONFIG.API.adminDeletePost(post.id), { auth: true });
                showMessage(messageBox, "已删除，正在返回后台...", "success");
                setTimeout(() => window.location.href = "/admin", 1000);
            } catch (err) {
                showMessage(messageBox, "删除失败：" + err.message, "error");
                deleteBtn.disabled = false;
            }
        });
    }
}

async function loadReview() {
    if (POST_ID === null) {
        document.getElementById("reviewContent").innerHTML =
            `<div class="error">无效的文章 ID<br><br><a href="/admin">← 返回后台</a></div>`;
        return;
    }
    try {
        const post = await API.get(CONFIG.API.adminPost(POST_ID), { auth: true });
        renderReview(post);
    } catch (err) {
        document.getElementById("reviewContent").innerHTML =
            `<div class="error">加载失败：${escapeHtml(err.message)}<br><br><a href="/admin">← 返回后台</a></div>`;
    }
}

loadReview();