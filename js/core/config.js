/* ============================================================
   全站配置：API 路径、localStorage Key、常量
   ============================================================
   使用方式：
     CONFIG.API.post(3)          // "/api/posts/3"
     CONFIG.API.adminApprove(3)  // "/admin/approve/3"
     CONFIG.STORAGE.token        // "blog_admin_token"
     CONFIG.LIKED_KEY(3)         // "blog_liked_3"
   ============================================================ */

(function () {
    "use strict";

    window.CONFIG = {
        // ---------- API 路径 ----------
        API: {
            // 公开
            posts: "/api/posts",
            post: (id) => `/api/posts/${id}`,
            postRead: (id) => `/api/posts/${id}/read`,
            postLike: (id) => `/api/posts/${id}/like`,

            categories: "/categories",
            list: "/api/list",
            timeline: "/api/timeline",
            thinkings: "/api/thinkings",

            friendList: "/friends/list",
            friendApply: "/friends/apply",

            upload: "/upload",
            heartbeat: "/heartbeat",
            onlineCount: "/online-count",

            // 提交文章（与 admin 无关）
            submitPost: "/posts",

            // 管理
            login: "/admin/login",
            adminPending: "/admin/pending",
            adminPosts: "/admin/posts",
            adminPost: (id) => `/admin/post/${id}`,
            adminPostUpdate: (id) => `/admin/posts/${id}`,
            adminApprove: (id) => `/admin/approve/${id}`,
            adminDeletePost: (id) => `/admin/posts/${id}`,
            adminAttachmentDelete: (id) => `/admin/attachments/${id}`,
            adminFriendsPending: "/admin/friends/pending",
            adminFriends: "/admin/friends",
            adminFriendApprove: (id) => `/admin/friends/${id}/approve`,
            adminFriendDelete: (id) => `/admin/friends/${id}`,
        },

        // ---------- localStorage Key ----------
        STORAGE: {
            token: "blog_admin_token",
            user: "blog_admin_user",
            theme: "blog-theme",
            draft: "blog_post_draft",
            liked: (id) => `blog_liked_${id}`,
        },

        // ---------- 常量 ----------
        ONLINE_INTERVAL: 30000,   // 在线人数轮询间隔（毫秒）
        HEARTBEAT_INTERVAL: 30000,
    };
})();