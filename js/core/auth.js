/* ============================================================
   管理端 Token 管理（统一入口）
   ============================================================ */

(function () {
    "use strict";

    const TK = CONFIG.STORAGE.token;
    const UK = CONFIG.STORAGE.user;

    window.Auth = {
        _handling: false,

        getToken() {
            return localStorage.getItem(TK);
        },

        getUser() {
            return localStorage.getItem(UK) || "admin";
        },

        set(token, user) {
            localStorage.setItem(TK, token);
            localStorage.setItem(UK, user || "admin");
            // ★ 重新登录后，允许下次 401 再弹
            this._handling = false;
        },

        clear() {
            localStorage.removeItem(TK);
            localStorage.removeItem(UK);
            // ★ 主动登出后，允许下次 401 再弹
            this._handling = false;
        },

        headers() {
            const t = this.getToken();
            return t ? { Authorization: "Bearer " + t } : {};
        },

        onUnauthorized() {
            if (this._handling) return;
            this._handling = true;

            localStorage.removeItem(TK);
            localStorage.removeItem(UK);
            alert("登录已失效，请重新登录");
            window.location.href = "/admin";
        },

        requireLogin() {
            if (!this.getToken()) {
                alert("未登录，请先登录管理后台");
                window.location.href = "/admin";
                return false;
            }
            return true;
        },
    };
})();