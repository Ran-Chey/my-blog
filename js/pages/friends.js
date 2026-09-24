/* ============================================================
   友链页逻辑
   ============================================================ */

const linkGrid = $("#linkGrid");
const applyForm = $("#applyForm");
const applyBtn = $("#applyBtn");
const msg = $("#msg");

async function loadLinks() {
    try {
        const links = await API.get(CONFIG.API.friendList);
        if (!links.length) {
            linkGrid.innerHTML = `<div class="empty">还没有友链，欢迎成为第一个。</div>`;
            return;
        }
        linkGrid.innerHTML = links.map(link => `
            <a class="link-card" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">
                <div class="head">
                    <div class="avatar">
                        ${link.avatar
                ? `<img src="${escapeHtml(link.avatar)}" alt="" onerror="this.style.display='none';this.parentNode.textContent='🔗'">`
                : "🔗"}
                    </div>
                    <span class="name">${escapeHtml(link.name)}</span>
                </div>
                ${link.description ? `<div class="desc">${escapeHtml(link.description)}</div>` : ""}
            </a>
        `).join("");
    } catch (err) {
        linkGrid.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    }
}

applyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#name").value.trim();
    const url = $("#url").value.trim();
    const description = $("#description").value.trim();
    const avatar = $("#avatar").value.trim();

    if (!name || !url) {
        showMessage(msg, "站点名和链接不能为空", "error");
        return;
    }

    applyBtn.disabled = true;
    applyBtn.textContent = "提交中...";
    try {
        await API.post(CONFIG.API.friendApply, { name, url, description, avatar });
        showMessage(msg, "申请已提交，等待管理员审核。", "success");
        applyForm.reset();
    } catch (err) {
        showMessage(msg, "提交失败：" + err.message, "error");
    } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = "提交申请";
    }
});

loadLinks();