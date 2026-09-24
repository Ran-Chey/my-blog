/* ============================================================
   API 封装：统一 fetch、JSON、错误处理、鉴权、401 跳转
   ============================================================
   依赖：CONFIG（config.js）、Auth（auth.js，可选）

   用法：
     await API.get(CONFIG.API.post(3))
     await API.post(CONFIG.API.postLike(3))
     await API.put(url, body, { auth: true })
     await API.del(url, { auth: true })
     await API.form(CONFIG.API.login, { username, password })
     await API.upload(CONFIG.API.upload, file)
   ============================================================ */

(function () {
    "use strict";

    async function request(url, options = {}) {
        const {
            method = "GET",
            body,
            auth = false,
            form = false,
            headers: extraHeaders = {},
            raw = false,
        } = options;

        const headers = { ...extraHeaders };
        let payload = body;

        if (
            body !== undefined &&
            !form &&
            !(body instanceof FormData) &&
            !(body instanceof URLSearchParams)
        ) {
            headers["Content-Type"] = "application/json";
            payload = JSON.stringify(body);
        }

        if (auth && window.Auth) {
            Object.assign(headers, window.Auth.headers());
        }

        let res;
        try {
            res = await fetch(url, { method, headers, body: payload });
        } catch (err) {
            throw new Error("网络错误：" + err.message);
        }

        if (res.status === 401 && auth && window.Auth) {
            window.Auth.onUnauthorized();
            throw new Error("登录已失效");
        }

        if (raw) return res;
        if (res.status === 204) return null;

        let data = null;
        const text = await res.text();
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }

        if (!res.ok) {
            const msg =
                (data && typeof data === "object" && data.detail) ||
                `请求失败（${res.status}）`;
            throw new Error(msg);
        }

        return data;
    }

    window.API = {
        get: (url, opts) => request(url, { ...opts, method: "GET" }),
        post: (url, body, opts) => request(url, { ...opts, method: "POST", body }),
        put: (url, body, opts) => request(url, { ...opts, method: "PUT", body }),
        del: (url, opts) => request(url, { ...opts, method: "DELETE" }),

        upload: (url, file) => {
            const fd = new FormData();
            fd.append("file", file);
            return request(url, { method: "POST", body: fd, form: true });
        },

        form: (url, obj) => {
            const fd = new URLSearchParams();
            Object.entries(obj).forEach(([k, v]) => fd.append(k, v));
            return request(url, {
                method: "POST",
                body: fd,
                form: true,
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });
        },

        raw: (url, opts) => request(url, { ...opts, raw: true }),
    };
})();