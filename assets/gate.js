(function () {
  "use strict";

  var gate = document.getElementById("gate");
  var content = document.getElementById("siteContent");
  var form = document.getElementById("gateForm");
  var input = document.getElementById("gateInput");
  var errorEl = document.getElementById("gateError");

  function todayCode() {
    // DD + MM, based on Asia/Bangkok time regardless of visitor's local clock
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "2-digit",
    }).formatToParts(new Date());
    var day = parts.find(function (p) { return p.type === "day"; }).value;
    var month = parts.find(function (p) { return p.type === "month"; }).value;
    return day + month;
  }

  function unlock(remember) {
    gate.hidden = true;
    content.removeAttribute("aria-hidden");
    if (remember) {
      try {
        sessionStorage.setItem("gateOK", todayCode());
      } catch (e) {}
    }
  }

  // already unlocked earlier today, in this browser tab session
  var stored = null;
  try {
    stored = sessionStorage.getItem("gateOK");
  } catch (e) {}

  if (stored && stored === todayCode()) {
    unlock(false);
  } else {
    content.setAttribute("aria-hidden", "true");
    setTimeout(function () {
      input.focus();
    }, 50);
  }

  input.addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "").slice(0, 4);
    errorEl.textContent = "";
    input.classList.remove("is-shake");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (input.value.length !== 4) {
      errorEl.textContent = "กรุณากรอกรหัส 4 หลัก";
      return;
    }
    if (input.value === todayCode()) {
      unlock(true);
    } else {
      errorEl.textContent = "รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง";
      input.classList.add("is-shake");
      input.value = "";
      setTimeout(function () { input.focus(); }, 50);
    }
  });
})();
