/* ============================================================
   全站共用工具函数
   ============================================================ */

/**
 * HTML 转义，防止 XSS
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * 把 ISO 时间字符串格式化为 YYYY-MM-DD
 */
function formatDate(isoString) {
    const d = new Date(isoString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/**
 * 从 Markdown 中提取纯文本，用于列表摘要
 */
function extractText(md) {
    return md
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[#>*_`\-]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\n+/g, " ")
        .trim();
}