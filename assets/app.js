(function () {
  "use strict";

  var state = {
    athletes: [],
    associations: [],
    view: "athletes",
    query: "",
    sportFilter: "",
    roleFilter: "",
  };

  var els = {
    athletesList: document.getElementById("athletesList"),
    associationsList: document.getElementById("associationsList"),
    athletesView: document.getElementById("athletesView"),
    associationsView: document.getElementById("associationsView"),
    searchInput: document.getElementById("searchInput"),
    sportFilter: document.getElementById("sportFilter"),
    roleFilter: document.getElementById("roleFilter"),
    roleFilterWrap: document.getElementById("roleFilterWrap"),
    resultCount: document.getElementById("resultCount"),
    statPeople: document.getElementById("statPeople"),
    statSports: document.getElementById("statSports"),
    statAssoc: document.getElementById("statAssoc"),
    tabs: Array.prototype.slice.call(document.querySelectorAll(".tab")),
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function norm(s) {
    return String(s == null ? "" : s).toLowerCase();
  }

  // ---------- Google search links ----------
  var SEARCH_ICON =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.2"/>' +
    '<path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function googleUrl(q) {
    return "https://www.google.com/search?q=" + encodeURIComponent(q);
  }

  // Opens Google results in a real popup browser window (not an iframe —
  // Google blocks framing its search pages), sized to feel like an
  // in-page preview without leaving the current tab.
  function openGooglePopup(url) {
    var w = Math.min(560, Math.round(window.screen.width * 0.9));
    var h = Math.min(760, Math.round(window.screen.height * 0.85));
    var left = window.screenX + (window.outerWidth - w) / 2;
    var top = window.screenY + (window.outerHeight - h) / 2;
    var features =
      "width=" + w + ",height=" + h + ",left=" + Math.max(0, left) + ",top=" + Math.max(0, top) +
      ",scrollbars=yes,resizable=yes,noopener";
    var win = window.open(url, "googlePreview", features);
    if (!win) {
      // popup blocked by the browser — fall back to a normal tab
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      win.focus();
    }
  }

  function athleteSearchLinks(athlete) {
    var name = athlete.name;
    var sport = (athlete.sport || "").replace(/แห่งประเทศไทย.*$/, "").replace(/^สมาคมกีฬา/, "").trim();
    var queries = [
      { label: "ประวัตินักกีฬา", q: name + " ประวัตินักกีฬา " + sport },
      { label: "ผลงาน/สถิติ", q: name + " ผลงาน " + sport + " เอเชี่ยนเกมส์" },
      { label: "ข่าวล่าสุด", q: name + " " + sport + " ข่าว" },
    ];
    return queries
      .map(function (item) {
        return (
          '<button type="button" class="search-popup-btn" data-q="' + esc(googleUrl(item.q)) +
          '" title="' + esc(item.q) + '">' + SEARCH_ICON + "<span>" + esc(item.label) + "</span></button>"
        );
      })
      .join("");
  }

  // delegated click handler: any element with data-q opens a Google popup
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-q]") : null;
    if (!btn) return;
    e.preventDefault();
    openGooglePopup(btn.getAttribute("data-q"));
  });

  // ---------- data loading ----------
  Promise.all([
    fetch("data/athletes.json").then(function (r) { return r.json(); }),
    fetch("data/associations.json").then(function (r) { return r.json(); }),
  ])
    .then(function (results) {
      state.athletes = results[0];
      state.associations = results[1];
      init();
    })
    .catch(function (err) {
      els.athletesList.innerHTML =
        '<p class="empty">ไม่สามารถโหลดข้อมูลได้: ' + esc(err.message) + "</p>";
    });

  function init() {
    var sportSet = {};
    var roleSet = {};
    state.athletes.forEach(function (a) {
      sportSet[a.sport] = (sportSet[a.sport] || 0) + 1;
      roleSet[a.role] = (roleSet[a.role] || 0) + 1;
    });
    var sports = Object.keys(sportSet).sort(function (a, b) { return a.localeCompare(b, "th"); });
    var roles = Object.keys(roleSet).sort(function (a, b) { return roleSet[b] - roleSet[a]; });

    sports.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s.replace(/แห่งประเทศไทย.*$/, "").trim() + " (" + sportSet[s] + ")";
      els.sportFilter.appendChild(opt);
    });
    roles.forEach(function (r) {
      var opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r + " (" + roleSet[r] + ")";
      els.roleFilter.appendChild(opt);
    });

    els.statPeople.textContent = state.athletes.length.toLocaleString("th-TH");
    els.statSports.textContent = sports.length.toLocaleString("th-TH");
    els.statAssoc.textContent = state.associations.length.toLocaleString("th-TH");

    els.searchInput.addEventListener("input", function () {
      state.query = norm(this.value);
      render();
    });
    els.sportFilter.addEventListener("change", function () {
      state.sportFilter = this.value;
      render();
    });
    els.roleFilter.addEventListener("change", function () {
      state.roleFilter = this.value;
      render();
    });
    els.tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        els.tabs.forEach(function (t) {
          t.classList.remove("is-active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        state.view = tab.getAttribute("data-view");
        var isAthletes = state.view === "athletes";
        els.athletesView.hidden = !isAthletes;
        els.associationsView.hidden = isAthletes;
        els.sportFilter.closest(".select-field").style.display = isAthletes ? "" : "none";
        els.roleFilterWrap.style.display = isAthletes ? "" : "none";
        els.searchInput.placeholder = isAthletes
          ? "ค้นหาชื่อนักกีฬา หรือชนิดกีฬา…"
          : "ค้นหาชื่อสมาคมกีฬา หรือนายกสมาคม…";
        render();
      });
    });

    render();
  }

  // ---------- render ----------
  function render() {
    if (state.view === "athletes") renderAthletes();
    else renderAssociations();
  }

  function renderAthletes() {
    var q = state.query;
    var filtered = state.athletes.filter(function (a) {
      if (state.sportFilter && a.sport !== state.sportFilter) return false;
      if (state.roleFilter && a.role !== state.roleFilter) return false;
      if (q && norm(a.name).indexOf(q) === -1 && norm(a.sport).indexOf(q) === -1) return false;
      return true;
    });

    els.resultCount.textContent = filtered.length.toLocaleString("th-TH") + " รายชื่อ";

    if (!filtered.length) {
      els.athletesList.innerHTML = '<p class="empty">ไม่พบข้อมูลที่ค้นหา</p>';
      return;
    }

    // group by sport, preserving sport_no order
    var groups = {};
    var order = [];
    filtered.forEach(function (a) {
      if (!groups[a.sport]) {
        groups[a.sport] = { items: [], no: a.sport_no };
        order.push(a.sport);
      }
      groups[a.sport].items.push(a);
    });
    order.sort(function (x, y) { return (+groups[x].no) - (+groups[y].no); });

    var openAll = !!(q || state.sportFilter || state.roleFilter);

    var html = order
      .map(function (sport) {
        var g = groups[sport];
        var shortName = sport.replace(/แห่งประเทศไทย.*$/, "แห่งประเทศไทย").trim();
        var rows = g.items
          .map(function (a) {
            var meta = a.subgroup ? esc(a.subgroup) : esc(shortName);
            return (
              '<div class="athlete-row">' +
                '<div class="athlete-name">' + esc(a.name) +
                  '<span class="athlete-meta">' + meta + "</span>" +
                "</div>" +
                '<span class="role-badge" data-role="' + esc(a.role) + '">' + esc(a.role) + "</span>" +
                '<div class="search-links">' + athleteSearchLinks(a) + "</div>" +
              "</div>"
            );
          })
          .join("");
        return (
          '<details class="sport-group"' + (openAll ? " open" : "") + '>' +
            "<summary>" +
              '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '<span class="sport-name">' + esc(shortName) + "</span>" +
              '<span class="sport-count">' + g.items.length + " คน</span>" +
            "</summary>" +
            '<div class="athlete-rows">' + rows + "</div>" +
          "</details>"
        );
      })
      .join("");

    els.athletesList.innerHTML = html;
  }

  function renderAssociations() {
    var q = state.query;
    var filtered = state.associations.filter(function (a) {
      if (!q) return true;
      return (
        norm(a.name).indexOf(q) !== -1 ||
        norm(a.president).indexOf(q) !== -1 ||
        norm(a.secretary).indexOf(q) !== -1
      );
    });

    els.resultCount.textContent = filtered.length.toLocaleString("th-TH") + " สมาคม";

    if (!filtered.length) {
      els.associationsList.innerHTML = '<p class="empty">ไม่พบข้อมูลที่ค้นหา</p>';
      return;
    }

    els.associationsList.innerHTML = filtered
      .map(function (a) {
        var searchQ = googleUrl(a.name + " สมาคมกีฬา");
        return (
          '<article class="assoc-card">' +
            '<div class="assoc-head">' +
              '<span class="assoc-no">' + String(a.no).padStart(2, "0") + "</span>" +
              '<h3 class="assoc-name">' + esc(a.name) + "</h3>" +
            "</div>" +
            '<dl class="assoc-grid">' +
              '<div><dt>นายกสมาคม</dt><dd>' + esc(a.president || "—") + "</dd></div>" +
              '<div><dt>เลขาธิการ</dt><dd>' + esc(a.secretary || "—") + "</dd></div>" +
              '<div><dt>โทรศัพท์</dt><dd>' + esc(a.phone || "—") + "</dd></div>" +
              '<div><dt>อีเมล</dt><dd>' + (a.email ? esc(a.email) : "—") + "</dd></div>" +
              '<div style="grid-column:1/-1"><dt>ที่ตั้ง/ติดต่อ</dt><dd>' + esc(a.contact_address || "—") + "</dd></div>" +
              '<div style="grid-column:1/-1"><dt>ค้นหาเพิ่มเติม</dt><dd><button type="button" class="search-popup-btn assoc-search-btn" data-q="' + esc(searchQ) + '">ค้นหาใน Google →</button></dd></div>' +
            "</dl>" +
          "</article>"
        );
      })
      .join("");
  }
})();
