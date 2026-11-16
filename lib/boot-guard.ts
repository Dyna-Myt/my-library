/**
 * Inline boot guard.
 *
 * Runs before any Next.js bundle, so it also catches the failures an error
 * boundary can never see: a chunk that fails to parse, a module that throws
 * while being evaluated, or the built-in "Application error" fallback.
 *
 * It does two things:
 *   1. shows a readable panel over the page (so a phone never just goes blank);
 *   2. beacons the message to /api/client-error, which logs it server-side.
 *
 * Kept as plain ES5 on purpose: it has to run on old Android Chrome.
 */
export const BOOT_GUARD = String.raw`(function () {
  if (window.__mlBootGuard) return;
  window.__mlBootGuard = true;

  var sent = {};

  function chromeVersion() {
    var match = navigator.userAgent.match(/Chrome\/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function post(payload) {
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
        return;
      }
      fetch("/api/client-error", {
        method: "POST",
        body: body,
        headers: { "content-type": "application/json" },
        keepalive: true
      })["catch"](function () {});
    } catch (error) {}
  }

  function render(kind, message) {
    try {
      var host = document.getElementById("ml-boot-error");
      if (!host) {
        host = document.createElement("div");
        host.id = "ml-boot-error";
        host.setAttribute("role", "alert");
        host.style.cssText =
          "position:fixed;z-index:2147483647;left:0;right:0;bottom:0;max-height:72vh;overflow:auto;" +
          "padding:16px 18px;background:#101010;color:#F3EFE7;border-top:2px solid #FF6A4D;" +
          "font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;" +
          "word-break:break-word;-webkit-overflow-scrolling:touch;text-align:left";
        host.onclick = function () {
          if (host.parentNode) host.parentNode.removeChild(host);
        };
        (document.body || document.documentElement).appendChild(host);
      }
      host.textContent =
        "My Library - " + kind + "\n\n" + message +
        "\n\nChrome " + chromeVersion() + " | " + String(navigator.userAgent || "") +
        "\n(tap this panel to dismiss)";
    } catch (error) {}
  }

  function report(kind, message, extra) {
    message = String(message || "unknown").slice(0, 1200);
    var key = kind + "|" + message;
    if (sent[key]) return;
    sent[key] = true;
    post({
      kind: kind,
      message: message,
      extra: extra ? String(extra).slice(0, 600) : "",
      url: String(location.href).slice(0, 300),
      chrome: chromeVersion(),
      ua: String(navigator.userAgent || "").slice(0, 300),
      viewport: window.innerWidth + "x" + window.innerHeight + "@" + (window.devicePixelRatio || 1)
    });
    render(kind, message);
  }

  window.__mlBootReport = report;

  window.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target !== window && target.tagName) {
      if (target.tagName === "SCRIPT") report("script failed to load", target.src || "(inline)");
      return;
    }
    var error = event.error;
    var message = (error && (error.stack || error.message)) || event.message || "unknown";
    if (/ResizeObserver loop/.test(message)) return;
    report(
      "script error",
      message,
      event.filename ? event.filename + ":" + event.lineno : ""
    );
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var message = (reason && (reason.stack || reason.message)) || String(reason);
    if (/AbortError|operation was aborted|Load failed|Failed to fetch|NetworkError/i.test(message)) return;
    report("unhandled promise", message);
  });

  setTimeout(function () {
    var text = "";
    try {
      text = document.body ? document.body.innerText || "" : "";
    } catch (error) {}
    if (text.indexOf("Application error") !== -1) {
      report("next fallback", text.replace(/\s+/g, " ").slice(0, 300));
      return;
    }
    if (document.readyState === "complete" && text.replace(/\s+/g, "").length < 20) {
      report("page looks empty", "body text length " + text.length + " after 10s");
    }
  }, 10000);
})();`;
