/* ============================================================
   主题切换动画引擎
   ============================================================
   支持三种风格，由 window.THEME_ANIMATION_STYLE 决定：
     "soft"  —— 缓慢柔光（0.7s 平滑过渡 + 按钮先动）
     "flash" —— 瞬间切换 + 闪光（0.25s + 中央光晕）
     "ink"   —— 墨水扩散（从点击点向外扩散遮罩，0.8s）

   对外 API：
     ThemeAnim.play(nextTheme, clickX, clickY)
   ============================================================ */

(function () {
    "use strict";

    const STYLE = window.THEME_ANIMATION_STYLE || "soft";
    const html = document.documentElement;

    // ============================================================
    // 注入 CSS（不用改 8 个 HTML）
    // ============================================================
    function injectStyles() {
        if (document.getElementById("theme-anim-styles")) return;

        const css = `
/* ---------- soft：缓慢柔光 ---------- */
html.ta-soft,
html.ta-soft *,
html.ta-soft *::before,
html.ta-soft *::after {
    transition:
        background-color 0.7s cubic-bezier(0.4, 0, 0.2, 1),
        border-color     0.7s cubic-bezier(0.4, 0, 0.2, 1),
        color            0.7s cubic-bezier(0.4, 0, 0.2, 1),
        fill             0.7s cubic-bezier(0.4, 0, 0.2, 1),
        stroke           0.7s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow       0.7s cubic-bezier(0.4, 0, 0.2, 1) !important;
    transition-delay: 0s !important;
}

/* ---------- flash：瞬间 + 闪光 ---------- */
html.ta-flash,
html.ta-flash *,
html.ta-flash *::before,
html.ta-flash *::after {
    transition:
        background-color 0.25s ease-out,
        border-color     0.25s ease-out,
        color            0.25s ease-out,
        fill             0.25s ease-out,
        stroke           0.25s ease-out,
        box-shadow       0.25s ease-out !important;
    transition-delay: 0s !important;
}

.ta-flash-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9998;
    background: radial-gradient(
        circle at var(--ta-x, 50%) var(--ta-y, 50%),
        rgba(255, 255, 255, 0.55) 0%,
        rgba(255, 255, 255, 0.25) 18%,
        rgba(255, 255, 255, 0.08) 38%,
        transparent 65%
    );
    opacity: 0;
    animation: ta-flash-pulse 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes ta-flash-pulse {
    0%   { opacity: 0; transform: scale(0.65); }
    18%  { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(2.4); }
}

/* ---------- ink：墨水扩散 ---------- */
.ta-ink-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    border-radius: 50%;
    /* 尺寸由 JS 动态设置：宽高 = 2 * 最远距离，定位到点击点 */
    transform: scale(0);
    transform-origin: center center;
    animation: ta-ink-spread 0.85s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}

@keyframes ta-ink-spread {
    0%   { transform: scale(0); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
}

/* 主题切换期间，禁止按钮自身的位移动画拖后腿 */
html.ta-soft  theme-toggle,
html.ta-flash theme-toggle,
html.ta-ink   theme-toggle {
    transition: none !important;
}
`;
        const style = document.createElement("style");
        style.id = "theme-anim-styles";
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ============================================================
    // 清理：把上一次的 overlay 和 class 都清掉
    // ============================================================
    function cleanup(className) {
        document.querySelectorAll(".ta-flash-overlay, .ta-ink-overlay").forEach(el => el.remove());
        html.classList.remove("ta-soft", "ta-flash", "ta-ink");
        if (className) html.classList.add(className);
    }

    // ============================================================
    // 核心：执行切换
    // ============================================================
    function play(nextTheme, clickX, clickY) {
        const prevTheme = html.getAttribute("data-theme") || "dark";
        if (prevTheme === nextTheme) return;

        if (STYLE === "soft") playSoft(nextTheme, clickX, clickY);
        else if (STYLE === "flash") playFlash(nextTheme, clickX, clickY);
        else if (STYLE === "ink") playInk(nextTheme, clickX, clickY);
        else html.setAttribute("data-theme", nextTheme);

        localStorage.setItem("blog-theme", nextTheme);
    }

    // ---------- 风格 1：缓慢柔光 ----------
    function playSoft(nextTheme, clickX, clickY) {
        cleanup("ta-soft");

        // 先加过渡类，下一帧再改主题
        requestAnimationFrame(() => {
            html.setAttribute("data-theme", nextTheme);

            // 通知 fluid.js 同步过渡
            document.dispatchEvent(new CustomEvent("theme-change", {
                detail: { theme: nextTheme, duration: 700 }
            }));

            // 过渡结束清理
            setTimeout(() => {
                html.classList.remove("ta-soft");
            }, 720);
        });
    }

    // ---------- 风格 2：瞬间 + 闪光 ----------
    function playFlash(nextTheme, clickX, clickY) {
        cleanup("ta-flash");

        // 立刻切主题（让颜色瞬间变），0.25s 内收尾
        html.setAttribute("data-theme", nextTheme);

        // 通知 fluid.js 用 250ms 快速过渡
        document.dispatchEvent(new CustomEvent("theme-change", {
            detail: { theme: nextTheme, duration: 250 }
        }));

        // 光晕：定位于点击坐标
        const overlay = document.createElement("div");
        overlay.className = "ta-flash-overlay";
        overlay.style.setProperty("--ta-x", clickX + "px");
        overlay.style.setProperty("--ta-y", clickY + "px");
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.remove();
            html.classList.remove("ta-flash");
        }, 680);
    }

    // ---------- 风格 3：墨水扩散 ----------
    function playInk(nextTheme, clickX, clickY) {
        cleanup("ta-ink");

        // 1. 计算扩散半径：从点击点到最远角的距离
        const w = window.innerWidth;
        const h = window.innerHeight;
        const dx = Math.max(clickX, w - clickX);
        const dy = Math.max(clickY, h - clickY);
        const radius = Math.sqrt(dx * dx + dy * dy);
        const size = radius * 2;

        // 2. 创建遮罩：颜色 = 即将切换到的"新主题"的底色
        const overlay = document.createElement("div");
        overlay.className = "ta-ink-overlay";
        const targetTheme = nextTheme === "dark" ? "#161616" : "#efeefe";
        overlay.style.background = targetTheme;
        overlay.style.width = size + "px";
        overlay.style.height = size + "px";
        overlay.style.left = (clickX - radius) + "px";
        overlay.style.top = (clickY - radius) + "px";
        document.body.appendChild(overlay);

        // 3. 在扩散的"中途"（约 250ms 后）切换真正的主题
        //    这样用户看到的是"新色扩散完毕，底层已经是新主题"
        setTimeout(() => {
            html.setAttribute("data-theme", nextTheme);
            document.dispatchEvent(new CustomEvent("theme-change", {
                detail: { theme: nextTheme, duration: 400 }
            }));
        }, 240);

        // 4. 扩散结束清理
        setTimeout(() => {
            overlay.remove();
            html.classList.remove("ta-ink");
        }, 880);
    }

    // ============================================================
    // 启动：注入样式
    // ============================================================
    injectStyles();

    // 暴露 API
    window.ThemeAnim = { play, style: STYLE };
})();