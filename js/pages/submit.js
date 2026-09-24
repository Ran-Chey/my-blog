/* ============================================================
   投稿页逻辑（编辑器由 editor.js 提供）
   ============================================================ */

const editor = initEditor({
    draftKey: CONFIG.STORAGE.draft,
});

const form = document.getElementById("postForm");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = editor.getData();

    if (!data.title || !data.author_name) {
        editor.setMessage("标题和作者不能为空", "error");
        return;
    }

    const summary = data.content ? extractText(data.content).slice(0, 120) : "";

    submitBtn.disabled = true;
    submitBtn.textContent = "提交中...";
    try {
        await API.post(CONFIG.API.submitPost, {
            kind: data.kind,
            title: data.title,
            author_name: data.author_name,
            content: data.content,
            category: data.category,
            tags: data.tags,
            summary,
            attachments: data.attachments,
        });
        const kindLabel = data.kind === "note" ? "手记" : "文稿";
        editor.setMessage(`${kindLabel}投稿成功！等待管理员审核后会出现在对应页面。`, "success");
        editor.reset();
    } catch (err) {
        editor.setMessage("提交失败：" + err.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "提交投稿";
    }
});