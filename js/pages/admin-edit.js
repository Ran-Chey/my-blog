/* ============================================================
   编辑页逻辑（编辑器由 editor.js 提供）
   ============================================================ */

const POST_ID = getPostIdFromUrl();

// 未登录直接跳走
Auth.requireLogin();

const editor = initEditor({
    // 编辑页不需要草稿（有后端数据为准）
    draftKey: null,
});

const form = document.getElementById("postForm");
const submitBtn = document.getElementById("submitBtn");


// ---------- 加载文章 ----------
async function loadPost() {
    if (POST_ID === null) {
        alert("无效的文章 ID");
        window.location.href = "/admin";
        return;
    }
    try {
        const post = await API.get(CONFIG.API.adminPost(POST_ID), { auth: true });
        fillPost(post);
    } catch (err) {
        alert("加载失败：" + err.message);
        window.location.href = "/admin";
    }
}

function fillPost(post) {
    $("#title").value = post.title || "";
    $("#author_name").value = post.author_name || "";
    $("#category").value = post.category || "";
    $("#tags").value = post.tags || "";
    $("#is_pinned").checked = post.is_pinned || false;

    // ★ 附件回填（把已有附件塞进编辑器）
    const existing = Array.isArray(post.attachments) ? post.attachments : [];
    editor.setAttachments(existing);

    // ★ 正文回填
    editor.setContent(post.content || "");
}


// ---------- 提交 ----------
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = editor.getData();

    if (!data.title || !data.author_name) {
        editor.setMessage("标题和作者不能为空", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "保存中...";

    try {
        await API.put(CONFIG.API.adminPostUpdate(POST_ID), {
            title: data.title,
            author_name: data.author_name,
            content: data.content,
            category: data.category,
            tags: data.tags,
            is_pinned: $("#is_pinned").checked,
            attachments: data.attachments,   // ★ 附件一起保存
        }, { auth: true });

        editor.setMessage("保存成功！3 秒后返回管理后台……", "success");
        setTimeout(() => {
            window.location.href = "/admin";
        }, 1500);
    } catch (err) {
        editor.setMessage("保存失败：" + err.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "保存修改";
    }
});

loadPost();