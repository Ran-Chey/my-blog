/* ============================================================
   全站通用顶部导航条
   使用方式：<div id="siteNavbar"></div>
   然后页面加载 navbar.js
   ============================================================ */

(function () {
    "use strict";

    // ★ 唯一真相源：在这里定义所有入口，改这一处，全站生效
    const NAV_ITEMS = [
        { href: "/", label: "首页" },
        { href: "/posts", label: "文稿" },
        { href: "/notes", label: "手记" },
        { href: "/timeline", label: "时间线" },
        { href: "/thinking", label: "思考" },
        { href: "/friends", label: "友链" },
        { href: "/submit", label: "投稿" },
        { href: "/admin", label: "管理" },
    ];

    function renderNavbar() {
        const mount = document.getElementById("siteNavbar");
        if (!mount) return;

        // 当前路径：/posts/3 → /posts，/ 保持 /
        let path = window.location.pathname;
        if (path.length > 1 && path.endsWith("/")) {
            path = path.slice(0, -1);
        }
        const isActive = (href) => {
            if (href === "/") return path === "/";
            return path === href || path.startsWith(href + "/");
        };

        mount.className = "navbar";
        mount.innerHTML = `
            <a href="/" class="navbar-logo">📖 我的博客</a>
            <div class="navbar-links">
                ${NAV_ITEMS.map(item => `
                    <a href="${item.href}"
                       class="${isActive(item.href) ? "active" : ""}">
                        ${item.label}
                    </a>
                `).join("")}
            </div>
        `;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderNavbar);
    } else {
        renderNavbar();
    }
})();