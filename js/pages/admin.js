/* ============================================================
   管理后台逻辑
   ============================================================ */

let pendingPosts = [];
let allPosts = [];
let pendingFriends = [];
let allFriends = [];

const loginView = $("#loginView");
const adminView = $("#adminView");
const whoText = $("#whoText");
const loginBtn = $("#loginBtn");
const logoutBtn = $("#logoutBtn");
const loginMsg = $("#loginMsg");
const pendingList = $("#pendingList");
const pendingCount = $("#pendingCount");
const publishedList = $("#publishedList");
const publishedCount = $("#publishedCount");
const pendingFriendsList = $("#pendingFriendsList");
const pendingFriendsCount = $("#pendingFriendsCount");
const approvedFriendsList = $("#approvedFriendsList");
const approvedFriendsCount = $("#approvedFriendsCount");


// ---------- 登录 ----------
document.getElementById("password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
});

async function doLogin() {
    const username = $("#username").value.trim();
    const password = $("#password").value;
    if (!username || !password) {
        showMessage(loginMsg, "请填写用户名和密码", "error");
        return;
    }
    loginBtn.disabled = true;
    loginBtn.textContent = "登录中...";
    try {
        const data = await API.form(CONFIG.API.login, { username, password });
        Auth.set(data.access_token, username);
        whoText.textContent = username;
        showAdminView();
        await Promise.all([loadPendingPosts(), loadAllPosts(), loadFriends()]);
    } catch (err) {
        showMessage(loginMsg, err.message || "用户名或密码错误", "error");
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "登 录";
    }
}

loginBtn.addEventListener("click", doLogin);

logoutBtn.addEventListener("click", () => {
    if (!confirm("确定要退出登录吗？")) return;
    Auth.clear();
    showLoginView();
    $("#password").value = "";
});


// ---------- 数据加载 ----------
async function loadPendingPosts() {
    try {
        const data = await API.get(CONFIG.API.adminPending, { auth: true });
        renderPendingList(data);
    } catch (err) {
        pendingList.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    }
}

async function loadAllPosts() {
    try {
        allPosts = await API.get(CONFIG.API.adminPosts, { auth: true });
        renderPublishedList(allPosts.filter(p => p.is_approved));
    } catch (err) {
        publishedList.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    }
}

async function loadFriends() {
    try {
        const [pending, all] = await Promise.all([
            API.get(CONFIG.API.adminFriendsPending, { auth: true }),
            API.get(CONFIG.API.adminFriends, { auth: true }),
        ]);
        pendingFriends = pending;
        allFriends = all;
        renderPendingFriends(pendingFriends);
        renderApprovedFriends(allFriends.filter(f => f.is_approved));
    } catch (err) {
        pendingFriendsList.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    }
}


// ---------- 渲染：待审核文章 ----------
function renderPendingList(posts) {
    pendingPosts = posts;
    pendingCount.textContent = posts.length;
    if (!posts.length) {
        pendingList.innerHTML = `<div class="empty">🎉 暂时没有待审核的文章</div>`;
        return;
    }
    pendingList.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="meta">
                <span>👤 ${escapeHtml(post.author_name)}</span>
                <span>#${post.id}</span>
            </div>
            <h3>${escapeHtml(post.title)}</h3>
            <div class="preview">${escapeHtml(post.content).slice(0, 200)}</div>
            <div class="actions">
                <button class="btn-approve" data-id="${post.id}" data-action="approve">通过审核</button>
                <button class="btn-detail"  data-id="${post.id}" data-action="review">审核详情</button>
                <button class="btn-edit"    data-id="${post.id}" data-action="edit">编辑</button>
                <button class="btn-danger"  data-id="${post.id}" data-action="delete">删除</button>
            </div>
        </div>
    `).join("");

    bindActions(pendingList, {
        approve: approvePost,
        review: (id) => window.location.href = `/admin/review/${id}`,
        edit: (id) => window.location.href = `/admin/edit/${id}`,
        delete: deletePost,
    });
}


// ---------- 渲染：已发布文章 ----------
function renderPublishedList(posts) {
    publishedCount.textContent = posts.length;
    if (!posts.length) {
        publishedList.innerHTML = `<div class="empty">还没有已发布的文章</div>`;
        return;
    }
    publishedList.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="meta">
                <span>👤 ${escapeHtml(post.author_name)}</span>
                <span>#${post.id} · ${formatDate(post.created_at)}</span>
            </div>
            <h3>${escapeHtml(post.title)}</h3>
            <div class="actions">
                <button class="btn-detail" data-id="${post.id}" data-action="view">查看</button>
                <button class="btn-edit"   data-id="${post.id}" data-action="edit">编辑</button>
                <button class="btn-danger" data-id="${post.id}" data-action="delete">删除</button>
            </div>
        </div>
    `).join("");

    bindActions(publishedList, {
        view: (id) => window.location.href = `/post/${id}`,
        edit: (id) => window.location.href = `/admin/edit/${id}`,
        delete: deletePost,
    });
}


// ---------- 渲染：待审核友链 ----------
function renderPendingFriends(links) {
    pendingFriendsCount.textContent = links.length;
    if (!links.length) {
        pendingFriendsList.innerHTML = `<div class="empty">🎉 暂时没有待审核的友链</div>`;
        return;
    }
    pendingFriendsList.innerHTML = links.map(link => `
        <div class="post-card">
            <div class="meta">
                <span>🔗 ${escapeHtml(link.name)}</span>
                <span>#${link.id}</span>
            </div>
            <h3>${escapeHtml(link.name)}</h3>
            <div class="preview">
                ${escapeHtml(link.url)}
                ${link.description ? ` · ${escapeHtml(link.description)}` : ""}
            </div>
            <div class="actions">
                <button class="btn-approve" data-id="${link.id}" data-action="approve">通过</button>
                <button class="btn-danger"  data-id="${link.id}" data-action="delete">删除</button>
            </div>
        </div>
    `).join("");

    bindActions(pendingFriendsList, {
        approve: approveFriend,
        delete: deleteFriend,
    });
}


// ---------- 渲染：已通过友链 ----------
function renderApprovedFriends(links) {
    approvedFriendsCount.textContent = links.length;
    if (!links.length) {
        approvedFriendsList.innerHTML = `<div class="empty">还没有已通过的友链</div>`;
        return;
    }
    approvedFriendsList.innerHTML = links.map(link => `
        <div class="post-card">
            <div class="meta">
                <span>🔗 ${escapeHtml(link.name)}</span>
                <span>#${link.id} · ${formatDate(link.created_at)}</span>
            </div>
            <h3>${escapeHtml(link.name)}</h3>
            <div class="preview">${escapeHtml(link.url)}</div>
            <div class="actions">
                <button class="btn-danger" data-id="${link.id}" data-action="delete">删除</button>
            </div>
        </div>
    `).join("");

    bindActions(approvedFriendsList, {
        delete: deleteFriend,
    });
}


// ---------- 操作：文章 ----------
async function approvePost(postId) {
    const post = pendingPosts.find(p => p.id === postId);
    if (!post) return;
    if (!confirm(`确定要通过《${post.title}》吗？`)) return;
    try {
        await API.post(CONFIG.API.adminApprove(postId), null, { auth: true });
        pendingPosts = pendingPosts.filter(p => p.id !== postId);
        renderPendingList(pendingPosts);
        await loadAllPosts();
    } catch (err) {
        alert("操作失败：" + err.message);
    }
}

async function deletePost(postId) {
    const post = allPosts.find(p => p.id === postId) || pendingPosts.find(p => p.id === postId);
    if (!post) return;
    if (!confirm(`确定要删除《${post.title}》吗？此操作不可恢复。`)) return;
    try {
        await API.del(CONFIG.API.adminDeletePost(postId), { auth: true });
        allPosts = allPosts.filter(p => p.id !== postId);
        pendingPosts = pendingPosts.filter(p => p.id !== postId);
        renderPendingList(pendingPosts);
        renderPublishedList(allPosts.filter(p => p.is_approved));
    } catch (err) {
        alert("删除失败：" + err.message);
    }
}


// ---------- 操作：友链 ----------
async function approveFriend(linkId) {
    const link = pendingFriends.find(f => f.id === linkId);
    if (!link) return;
    if (!confirm(`确定要通过友链「${link.name}」吗？`)) return;
    try {
        await API.post(CONFIG.API.adminFriendApprove(linkId), null, { auth: true });
        await loadFriends();
    } catch (err) {
        alert("操作失败：" + err.message);
    }
}

async function deleteFriend(linkId) {
    const link = allFriends.find(f => f.id === linkId) || pendingFriends.find(f => f.id === linkId);
    if (!link) return;
    if (!confirm(`确定要删除友链「${link.name}」吗？`)) return;
    try {
        await API.del(CONFIG.API.adminFriendDelete(linkId), { auth: true });
        await loadFriends();
    } catch (err) {
        alert("删除失败：" + err.message);
    }
}


// ---------- 视图切换 ----------
function showLoginView() {
    loginView.classList.remove("hidden");
    adminView.classList.add("hidden");
}
function showAdminView() {
    loginView.classList.add("hidden");
    adminView.classList.remove("hidden");
}

// ---------- 自动登录（有 token 直接进后台） ----------
// ★ 401 的重复弹窗由 Auth.onUnauthorized 内部去重，这里不用管
function autoLogin() {
    if (!Auth.getToken()) { showLoginView(); return; }
    whoText.textContent = Auth.getUser();
    showAdminView();
    // 并行加载（401 由 API 内部处理）
    loadPendingPosts();
    loadAllPosts();
    loadFriends();
}

autoLogin();