/* ============================================================
   全站共用 DOM 工具（在 utils.js 之后引入）
   ============================================================
   提供：
     $                document.querySelector 简写
     $$               querySelectorAll 简写（返回真数组）
     getPostIdFromUrl 从 /post/3 提取 3
     showMessage      在元素上显示消息（success / error）
     bindActions      事件委托（按 data-action 分发）
     debounce         防抖
   ============================================================ */

/* ---------- 选择器简写 ---------- */
function $(sel, root = document) {
    return root.querySelector(sel);
}

function $$(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
}

/* ---------- 从 URL 取文章 ID ---------- */
function getPostIdFromUrl() {
    const parts = window.location.pathname.split("/");
    const last = parts[parts.length - 1];
    const id = parseInt(last, 10);
    return isNaN(id) ? null : id;
}

/* ---------- 消息提示 ---------- */
/**
 * 在指定元素上显示消息（success / error）
 * @param {HTMLElement} box - 消息容器
 * @param {string} text - 消息内容
 * @param {string} type - "success" | "error"
 */
function showMessage(box, text, type) {
    if (!box) return;
    box.textContent = text;
    const base = box.classList.contains("msg") ? "msg" : "message";
    box.className = base + " " + type;
}

/* ---------- 事件委托 ---------- */
/**
 * 给一个容器绑定"按钮点击 → 根据 data-action 分发"的委托
 * ★ 用 onclick 赋值，重复调用会覆盖，不会叠加监听器
 * @param {HTMLElement} container
 * @param {Object} actionMap - { actionName: (id) => void }
 */
function bindActions(container, actionMap) {
    if (!container) return;
    container.onclick = (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn || !container.contains(btn)) return;
        const handler = actionMap[btn.dataset.action];
        if (handler) {
            const id = parseInt(btn.dataset.id, 10);
            handler(isNaN(id) ? undefined : id);
        }
    };
}

/* ---------- 防抖 ---------- */
function debounce(fn, wait = 300) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

/* ---------- 挂到 window ---------- */
window.$ = $;
window.$$ = $$;
window.getPostIdFromUrl = getPostIdFromUrl;
window.showMessage = showMessage;
window.bindActions = bindActions;
window.debounce = debounce;
window.DOM = { $, $$, getPostIdFromUrl, showMessage, bindActions, debounce };