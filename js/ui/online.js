/* ============================================================
   在线人数（轮询）
   ============================================================ */

(function () {
    "use strict";

    const HEARTBEAT_INTERVAL = 30000;  // 每 30 秒打一次心跳
    const POLL_INTERVAL = 30000;       // 每 30 秒拉一次人数

    async function sendHeartbeat() {
        try {
            await fetch("/heartbeat", { method: "POST" });
        } catch (e) {
            // 静默失败，不打扰用户
        }
    }

    async function fetchOnlineCount() {
        try {
            const res = await fetch("/online-count");
            if (!res.ok) return;
            const data = await res.json();
            const el = document.getElementById("onlineCount");
            if (el) el.textContent = data.online;
        } catch (e) {
            // 静默失败
        }
    }

    function start() {
        if (!document.getElementById("onlineCount")) return;  // 页面没有这个元素就跳过

        sendHeartbeat();
        fetchOnlineCount();

        setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        setInterval(fetchOnlineCount, POLL_INTERVAL);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();