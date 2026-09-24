/* ============================================================
   编辑器组件（投稿页 / 编辑页 共用）
   ============================================================
   用法：
     const editor = initEditor({
         // 可选：初始附件列表 [{url, name}, ...]
         initialAttachments: [],
         // 可选：初始正文
         initialContent: "",
         // 可选：初始类型（"post" | "note"）
         initialKind: "post",
     });

     editor.getData()  // { kind, title, author_name, category, tags, content, attachments }
     editor.setMessage(text, "success" | "error")
     editor.reset()
   ============================================================ */

function initEditor(options = {}) {
    const $ = (id) => document.getElementById(id);

    const form = $("postForm");
    const submitBtn = $("submitBtn");
    const messageBox = $("editorMessage") || $("message");
    const textarea = $("content");
    const preview = $("preview");
    const toolbar = $("toolbar");
    const imageInput = $("imageInput");

    const kindInput = $("kind");
    const kindSwitch = $("kindSwitch");

    const attachmentInput = $("attachmentInput");
    const dropZone = $("dropZone");
    const attachList = $("attachList");

    // ---------- 状态 ----------
    let uploadedFiles = Array.isArray(options.initialAttachments)
        ? [...options.initialAttachments]
        : [];
    const DRAFT_KEY = options.draftKey || null;

    // ---------- 类型 ----------
    function setKind(kind) {
        if (!kindInput || !kindSwitch) return;
        kindInput.value = kind;
        kindSwitch.querySelectorAll("button").forEach(b => {
            b.classList.toggle("active", b.dataset.kind === kind);
        });
    }

    if (kindSwitch) {
        kindSwitch.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-kind]");
            if (!btn) return;
            setKind(btn.dataset.kind);
            scheduleSaveDraft();
        });
    }

    // ---------- 附件 ----------
    function getIcon(name) {
        const ext = (name.split(".").pop() || "").toLowerCase();
        if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "🖼️";
        if (ext === "pdf") return "📄";
        return "📎";
    }

    function renderAttachList() {
        if (!attachList) return;
        if (!uploadedFiles.length) {
            attachList.innerHTML = "";
            return;
        }
        attachList.innerHTML = uploadedFiles.map((f, i) => `
            <li class="attach-item">
                <span class="attach-icon">${getIcon(f.name)}</span>
                <span class="attach-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
                <a class="attach-open" href="${f.url}" target="_blank" rel="noopener">预览</a>
                <button type="button" class="attach-remove" data-index="${i}">移除</button>
            </li>
        `).join("");
        attachList.querySelectorAll(".attach-remove").forEach(btn => {
            btn.addEventListener("click", () => {
                const i = parseInt(btn.dataset.index, 10);
                uploadedFiles.splice(i, 1);
                renderAttachList();
                saveDraft();
            });
        });
    }

    async function uploadOneFile(file) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/upload", { method: "POST", body: fd });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "上传失败");
        }
        const data = await res.json();
        return { url: data.url, name: data.name };
    }

    async function uploadMultiple(files) {
        dropZone.classList.add("uploading");
        const textEl = dropZone.querySelector(".drop-zone-text");
        const originalText = textEl.innerHTML;

        for (const file of files) {
            try {
                textEl.innerHTML =
                    `<div class="drop-zone-icon">⏳</div><div>正在上传 ${escapeHtml(file.name)}…</div>`;
                const info = await uploadOneFile(file);
                uploadedFiles.push(info);
                renderAttachList();
                saveDraft();
            } catch (err) {
                alert(`「${file.name}」上传失败：${err.message}`);
            }
        }

        dropZone.classList.remove("uploading");
        textEl.innerHTML = originalText;
    }

    if (dropZone && attachmentInput) {
        dropZone.addEventListener("click", () => attachmentInput.click());

        attachmentInput.addEventListener("change", async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            await uploadMultiple(files);
            attachmentInput.value = "";
        });

        ["dragenter", "dragover"].forEach(ev => {
            dropZone.addEventListener(ev, (e) => {
                e.preventDefault();
                dropZone.classList.add("dragover");
            });
        });
        ["dragleave", "drop"].forEach(ev => {
            dropZone.addEventListener(ev, (e) => {
                e.preventDefault();
                dropZone.classList.remove("dragover");
            });
        });
        dropZone.addEventListener("drop", async (e) => {
            const files = Array.from(e.dataTransfer.files);
            if (!files.length) return;
            await uploadMultiple(files);
        });
    }

    // ---------- 草稿 ----------
    function saveDraft() {
        if (!DRAFT_KEY) return;
        const draft = {
            kind: kindInput ? kindInput.value : "post",
            title: $("title").value,
            author_name: $("author_name").value,
            category: $("category").value,
            tags: $("tags").value,
            content: textarea.value,
            attachments: uploadedFiles,
            savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }

    function loadDraft() {
        if (!DRAFT_KEY) return null;
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    function clearDraft() {
        if (!DRAFT_KEY) return;
        localStorage.removeItem(DRAFT_KEY);
    }

    function restoreDraft() {
        if (!DRAFT_KEY) return;
        const draft = loadDraft();
        if (!draft) return;
        if (!draft.title && !draft.content && !draft.author_name) return;

        const when = new Date(draft.savedAt).toLocaleString();
        if (!confirm(`发现 ${when} 的未提交草稿，是否恢复？`)) {
            clearDraft();
            return;
        }
        setKind(draft.kind || "post");
        $("title").value = draft.title || "";
        $("author_name").value = draft.author_name || "";
        $("category").value = draft.category || "";
        $("tags").value = draft.tags || "";
        textarea.value = draft.content || "";
        uploadedFiles = Array.isArray(draft.attachments) ? draft.attachments : [];
        renderAttachList();
        updatePreview();
    }

    let draftTimer = null;
    function scheduleSaveDraft() {
        if (!DRAFT_KEY) return;
        clearTimeout(draftTimer);
        draftTimer = setTimeout(saveDraft, 500);
    }

    // ---------- 工具栏 ----------
    if (toolbar) {
        toolbar.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const action = btn.dataset.action;
            if (action === "image") { imageInput.click(); return; }

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selected = textarea.value.slice(start, end);
            let before = "", after = "", placeholder = "";
            switch (action) {
                case "h1": before = "# "; placeholder = selected || "一级标题"; break;
                case "h2": before = "## "; placeholder = selected || "二级标题"; break;
                case "h3": before = "### "; placeholder = selected || "三级标题"; break;
                case "bold": before = "**"; after = "**"; placeholder = selected || "加粗文字"; break;
                case "italic": before = "*"; after = "*"; placeholder = selected || "斜体文字"; break;
                case "strike": before = "~~"; after = "~~"; placeholder = selected || "删除线"; break;
                case "ul": before = "- "; placeholder = selected || "列表项"; break;
                case "ol": before = "1. "; placeholder = selected || "列表项"; break;
                case "quote": before = "> "; placeholder = selected || "引用文字"; break;
                case "code": before = "`"; after = "`"; placeholder = selected || "code"; break;
                case "codeblock": before = "```\n"; after = "\n```"; placeholder = selected || "代码"; break;
                case "link": before = "["; after = "](https://)"; placeholder = selected || "链接文字"; break;
            }
            const replacement = before + placeholder + after;
            textarea.setRangeText(replacement, start, end, "end");
            if (!selected) {
                const newStart = start + before.length;
                const newEnd = newStart + placeholder.length;
                textarea.setSelectionRange(newStart, newEnd);
            }
            textarea.focus();
            updatePreview();
            scheduleSaveDraft();
        });
    }

    // ---------- 图片上传 ----------
    if (imageInput) {
        imageInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const fd = new FormData();
            fd.append("file", file);
            const hint = `![${file.name}](上传中...)`;
            textarea.setRangeText(hint, start, end, "end");
            updatePreview();
            try {
                const res = await fetch("/upload", { method: "POST", body: fd });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.detail || "上传失败");
                }
                const data = await res.json();
                const success = `![${file.name}](${data.url})`;
                textarea.value = textarea.value.replace(hint, success);
                const cur = textarea.value.indexOf(success) + success.length;
                textarea.setSelectionRange(cur, cur);
                updatePreview();
                scheduleSaveDraft();
            } catch (err) {
                textarea.value = textarea.value.replace(hint, "");
                updatePreview();
                alert("图片上传失败：" + err.message);
            } finally {
                imageInput.value = "";
            }
        });
    }

    // ---------- 预览 ----------
    function updatePreview() {
        if (!preview) return;
        const text = textarea.value;
        if (!text.trim()) {
            preview.innerHTML = '<div class="placeholder">预览会显示在这里</div>';
            return;
        }
        preview.innerHTML = renderMarkdown(text);
    }

    if (textarea) {
        textarea.addEventListener("input", () => {
            updatePreview();
            scheduleSaveDraft();
        });
    }
    ["title", "author_name", "category", "tags"].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener("input", scheduleSaveDraft);
    });

    // ---------- 消息 ----------
    function setMessage(text, type) {
        if (!messageBox) return;
        messageBox.textContent = text;
        messageBox.className = "editor-message " + type;
    }
    function clearMessage() {
        if (!messageBox) return;
        messageBox.className = "editor-message";
        messageBox.textContent = "";
    }

    // ---------- 数据 ----------
    function getData() {
        return {
            kind: kindInput ? kindInput.value : "post",
            title: $("title").value.trim(),
            author_name: $("author_name").value.trim(),
            category: $("category").value.trim(),
            tags: $("tags").value.trim(),
            content: textarea.value.trim(),
            attachments: uploadedFiles,
        };
    }

    function reset() {
        form.reset();
        setKind("post");
        uploadedFiles = [];
        renderAttachList();
        clearDraft();
        updatePreview();
    }

    // ---------- 初始化 ----------
    if (options.initialContent) {
        textarea.value = options.initialContent;
    }
    if (options.initialKind) {
        setKind(options.initialKind);
    }
    renderAttachList();
    updatePreview();
    restoreDraft();

    return {
        getData,
        setMessage,
        clearMessage,
        reset,
        clearDraft,
        isDraft: () => !!DRAFT_KEY,
        // ★ 编辑页专用
        setAttachments: (list) => {
            uploadedFiles = Array.isArray(list) ? [...list] : [];
            renderAttachList();
        },
        setContent: (text) => {
            textarea.value = text || "";
            updatePreview();
        },
    };
}