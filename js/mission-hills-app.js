(function () {
  "use strict";

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function updateClock() {
    var clock = document.querySelector("[data-member-clock]");
    if (!clock) return;

    var now = new Date();
    clock.textContent = [pad(now.getMonth() + 1), pad(now.getDate())].join("-") +
      " " + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(":");
    clock.setAttribute("datetime", now.toISOString());
  }

  function currentTimeSlot() {
    return Math.floor(Date.now() / (5 * 60 * 1000));
  }

  function buildLocalPayload(memberNumber, slot, force) {
    var payload = ["MH", memberNumber, slot.toString(36)];
    if (force) payload.push(Date.now().toString(36).slice(-5));
    return payload.join("|");
  }

  function requestPayload(shell, force) {
    var endpoint = shell.getAttribute("data-code-endpoint");
    var memberNumber = shell.getAttribute("data-member-number") || "";
    var slot = currentTimeSlot();

    if (!endpoint) {
      return Promise.resolve(buildLocalPayload(memberNumber, slot, force));
    }

    var separator = endpoint.indexOf("?") === -1 ? "?" : "&";
    var url = endpoint + separator + "memberNo=" + encodeURIComponent(memberNumber) +
      "&timestamp=" + Date.now();

    return fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { "Accept": "application/json" }
    }).then(function (response) {
      if (!response.ok) throw new Error("动态码接口返回 " + response.status);
      return response.json();
    }).then(function (result) {
      var payload = result.code || result.payload ||
        (result.data && (result.data.code || result.data.payload));
      if (!payload) throw new Error("动态码接口未返回 code");
      return String(payload);
    });
  }

  function renderQr(target, payload) {
    if (typeof window.qrcode !== "function") {
      throw new Error("二维码组件加载失败");
    }

    // 短码优先使用 Version 3，模块大小接近小程序；正式接口返回长码时自动扩容。
    var versions = [3, 4, 5, 6, 0];
    var qr = null;
    var lastError = null;
    for (var i = 0; i < versions.length; i += 1) {
      try {
        qr = window.qrcode(versions[i], "M");
        qr.addData(payload, "Byte");
        qr.make();
        break;
      } catch (error) {
        qr = null;
        lastError = error;
      }
    }
    if (!qr) throw lastError || new Error("动态码内容过长");

    target.innerHTML = qr.createSvgTag(6, 2);
    target.setAttribute("data-code-value", payload);
  }

  function bindDynamicCode() {
    var shell = document.querySelector("[data-member-number]");
    var button = document.querySelector("[data-refresh-code]");
    var target = document.querySelector("[data-member-qr]");
    if (!shell || !button || !target) return;

    var renderedSlot = -1;

    function refresh(force) {
      var nextSlot = currentTimeSlot();
      if (!force && renderedSlot === nextSlot) return Promise.resolve();

      button.disabled = true;
      button.classList.remove("is-refreshing");
      void button.offsetWidth;
      button.classList.add("is-refreshing");

      return requestPayload(shell, force).then(function (payload) {
        renderQr(target, payload);
        renderedSlot = nextSlot;
        target.classList.remove("member-qr-error");
        target.setAttribute("aria-label", "E-Card 动态码，更新时间 " +
          new Date().toLocaleTimeString("zh-CN", { hour12: false }));
      }).catch(function (error) {
        target.classList.add("member-qr-error");
        target.textContent = error.message + "，请点击刷新";
      }).then(function () {
        button.disabled = false;
        updateClock();
      });
    }

    button.addEventListener("click", function () {
      refresh(true);
    });

    refresh(false);
    window.setInterval(function () { refresh(false); }, 1000);
  }

  updateClock();
  bindDynamicCode();
  window.setInterval(updateClock, 1000);
}());
