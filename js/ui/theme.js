/* ============================================================
   全局主题应用 + 动画风格配置
   ============================================================ */

// ★ 三个风格：改这里切换
//   "soft"  缓慢柔光（0.7s）
//   "flash" 瞬间 + 闪光（0.25s）
//   "ink"   墨水扩散（0.8s）
window.THEME_ANIMATION_STYLE = "ink";

(function () {
    "use strict";

    const STORAGE_KEY = "blog-theme";
    const html = document.documentElement;

    function getInitialTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark") return saved;
        if (window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: light)").matches) {
            return "light";
        }
        return "dark";
    }

    // 首屏应用主题：不加动画
    html.setAttribute("data-theme", getInitialTheme());

    // 跟随系统主题：走动画
    if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
            if (!localStorage.getItem(STORAGE_KEY)) {
                const next = e.matches ? "light" : "dark";
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                if (window.ThemeAnim) {
                    window.ThemeAnim.play(next, cx, cy);
                } else {
                    html.setAttribute("data-theme", next);
                }
            }
        });
    }
})();