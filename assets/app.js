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
    controls: document.querySelector(".controls"),
    searchInput: document.getElementById("searchInput"),
    sportFilter: document.getElementById("sportFilter"),
    roleFilter: document.getElementById("roleFilter"),
    roleFilterWrap: document.getElementById("roleFilterWrap"),
    resultCount: document.getElementById("resultCount"),
    statPeople: document.getElementById("statPeople"),
    statSports: document.getElementById("statSports"),
    statAssoc: document.getElementById("statAssoc"),
    tabs: Array.prototype.slice.call(document.querySelectorAll(".tab")),
    globalIntro: document.getElementById("globalIntro"),
    globalControlsWrap: document.getElementById("globalControlsWrap"),
    globalView: document.getElementById("globalView"),
    globalList: document.getElementById("globalList"),
    globalNameInput: document.getElementById("globalNameInput"),
    globalSportInput: document.getElementById("globalSportInput"),
    globalCountryInput: document.getElementById("globalCountryInput"),
    globalSearchBtn: document.getElementById("globalSearchBtn"),
    globalNameSuggest: document.getElementById("globalNameSuggest"),
    globalSportSuggest: document.getElementById("globalSportSuggest"),
    globalCountrySuggest: document.getElementById("globalCountrySuggest"),
  };

  // picked suggestion ids (cleared whenever the matching input is edited by hand)
  var picked = { name: null, sport: null, country: null };

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
          '<a href="' + googleUrl(item.q) + '" target="_blank" rel="noopener noreferrer" title="' +
          esc(item.q) + '">' + SEARCH_ICON + "<span>" + esc(item.label) + "</span></a>"
        );
      })
      .join("");
  }

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
        var isAssociations = state.view === "associations";
        var isGlobal = state.view === "global";

        els.athletesView.hidden = !isAthletes;
        els.associationsView.hidden = !isAssociations;
        els.globalIntro.hidden = !isGlobal;
        els.globalControlsWrap.hidden = !isGlobal;
        els.globalView.hidden = !isGlobal;
        els.controls.style.display = isGlobal ? "none" : "";

        els.sportFilter.closest(".select-field").style.display = isAthletes ? "" : "none";
        els.roleFilterWrap.style.display = isAthletes ? "" : "none";
        els.searchInput.placeholder = isAthletes
          ? "ค้นหาชื่อนักกีฬา หรือชนิดกีฬา…"
          : "ค้นหาชื่อสมาคมกีฬา หรือนายกสมาคม…";

        if (!isGlobal) render();
      });
    });

    initGlobalSearch();
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
              '<div style="grid-column:1/-1"><dt>ค้นหาเพิ่มเติม</dt><dd><a href="' + searchQ + '" target="_blank" rel="noopener noreferrer">ค้นหาใน Google →</a></dd></div>' +
            "</dl>" +
          "</article>"
        );
      })
      .join("");
  }

  // ---------- global athlete search (live, via Wikidata) ----------
  var WD_API = "https://www.wikidata.org/w/api.php";
  var WDQS = "https://query.wikidata.org/sparql";
  var ATHLETE_CLASS = "Q2066131"; // sportsperson

  function fetchJson(url, opts) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
    var fetchOpts = Object.assign({}, opts || {});
    if (controller) fetchOpts.signal = controller.signal;
    return fetch(url, fetchOpts)
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) throw new Error("เครือข่ายขัดข้อง (" + res.status + ")");
        return res.json();
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        throw err;
      });
  }

  function wbSearchEntities(text, lang) {
    if (!text) return Promise.resolve([]);
    var url =
      WD_API + "?action=wbsearchentities&search=" + encodeURIComponent(text) +
      "&language=" + lang + "&uselang=" + lang + "&type=item&limit=10&format=json&origin=*";
    return fetchJson(url)
      .then(function (data) { return (data.search || []).map(function (s) { return s.id; }); })
      .catch(function () { return []; });
  }

  function resolveIds(text) {
    if (!text) return Promise.resolve([]);
    return Promise.all([wbSearchEntities(text, "th"), wbSearchEntities(text, "en")]).then(function (pair) {
      var out = [];
      pair[0].concat(pair[1]).forEach(function (id) { if (out.indexOf(id) === -1) out.push(id); });
      return out.slice(0, 10);
    });
  }

  function sparqlPersonIds(sportIds, countryIds) {
    var vals = function (ids) { return ids.map(function (id) { return "wd:" + id; }).join(" "); };
    var lines = [];
    lines.push("SELECT DISTINCT ?person WHERE {");
    lines.push("{ ?person wdt:P106/wdt:P279* wd:" + ATHLETE_CLASS + " . } UNION { ?person wdt:P641 [] . }");
    if (sportIds.length) {
      lines.push("?person wdt:P641 ?s0 .");
      lines.push("VALUES ?s0 { " + vals(sportIds) + " }");
    }
    if (countryIds.length) {
      lines.push("?person wdt:P27 ?c0 .");
      lines.push("VALUES ?c0 { " + vals(countryIds) + " }");
    }
    lines.push("} LIMIT 30");
    var url = WDQS + "?query=" + encodeURIComponent(lines.join("\n"));
    return fetchJson(url, { headers: { Accept: "application/sparql-results+json" } }).then(function (data) {
      return (data.results && data.results.bindings || []).map(function (b) {
        return b.person.value.split("/").pop();
      });
    });
  }

  function wbGetEntities(ids) {
    if (!ids.length) return Promise.resolve({});
    var calls = [];
    for (var i = 0; i < ids.length; i += 50) {
      var batch = ids.slice(i, i + 50);
      var url =
        WD_API + "?action=wbgetentities&ids=" + batch.join("|") +
        "&props=labels|claims|sitelinks&languages=th|en&sitefilter=thwiki|enwiki&format=json&origin=*";
      calls.push(fetchJson(url).then(function (data) { return data.entities || {}; }));
    }
    return Promise.all(calls).then(function (parts) {
      var merged = {};
      parts.forEach(function (p) { Object.assign(merged, p); });
      return merged;
    });
  }

  function pickLabel(entity, fallback) {
    if (!entity || !entity.labels) return fallback;
    return (entity.labels.th && entity.labels.th.value) || (entity.labels.en && entity.labels.en.value) || fallback;
  }

  function claimIds(entity, prop) {
    var claims = entity && entity.claims && entity.claims[prop];
    if (!claims) return [];
    return claims
      .map(function (c) {
        var dv = c.mainsnak && c.mainsnak.datavalue;
        return dv && dv.value && dv.value.id;
      })
      .filter(Boolean);
  }

  function claimYear(entity, prop) {
    var claims = entity && entity.claims && entity.claims[prop];
    if (!claims || !claims.length) return null;
    var dv = claims[0].mainsnak && claims[0].mainsnak.datavalue;
    var t = dv && dv.value && dv.value.time;
    var m = t && /([+-]\d{4,})-/.exec(t);
    return m ? String(parseInt(m[1], 10)) : null;
  }

  function globalArticleLink(entity) {
    var sl = entity.sitelinks || {};
    if (sl.thwiki) return "https://th.wikipedia.org/wiki/" + encodeURIComponent(sl.thwiki.title);
    if (sl.enwiki) return "https://en.wikipedia.org/wiki/" + encodeURIComponent(sl.enwiki.title);
    return "https://www.wikidata.org/wiki/" + entity.id;
  }

  function setGlobalMessage(html) {
    els.globalList.innerHTML = '<p class="empty">' + html + "</p>";
  }

  function renderGlobalResults(people, refEntities) {
    var cards = people
      .map(function (e) {
        var name = esc(pickLabel(e, e.id));
        var sportNames = claimIds(e, "P641").map(function (id) { return pickLabel(refEntities[id], id); });
        var countryNames = claimIds(e, "P27").map(function (id) { return pickLabel(refEntities[id], id); });
        var birth = claimYear(e, "P569");
        var death = claimYear(e, "P570");
        var years = birth ? "เกิด " + birth + (death ? " – เสียชีวิต " + death : "") : "";
        return (
          '<article class="global-card">' +
            '<h3 class="global-name">' + name + "</h3>" +
            (sportNames.length ? '<p class="global-meta"><strong>ชนิดกีฬา:</strong> ' + esc(sportNames.join(", ")) + "</p>" : "") +
            (countryNames.length ? '<p class="global-meta"><strong>ประเทศ:</strong> ' + esc(countryNames.join(", ")) + "</p>" : "") +
            (years ? '<p class="global-meta">' + esc(years) + "</p>" : "") +
            '<a class="global-link" href="' + globalArticleLink(e) + '" target="_blank" rel="noopener noreferrer">ดูข้อมูลเพิ่มเติม →</a>' +
          "</article>"
        );
      })
      .join("");
    els.globalList.innerHTML =
      '<p class="global-source-note">พบ ' + people.length.toLocaleString("th-TH") + " รายการ · ข้อมูลจาก Wikidata (อาจไม่ครบถ้วนสมบูรณ์)</p>" +
      '<div class="global-grid">' + cards + "</div>";
  }

  // use the exact picked suggestion when the field still matches it; otherwise fall back to a text search
  function resolveField(inputEl, pickKey) {
    var text = inputEl.value.trim();
    if (!text) return Promise.resolve([]);
    var p = picked[pickKey];
    if (p && p.label === text) return Promise.resolve([p.id]);
    return resolveIds(text);
  }

  function runGlobalSearch() {
    var name = els.globalNameInput.value.trim();
    var sportText = els.globalSportInput.value.trim();
    var countryText = els.globalCountryInput.value.trim();

    if (!name && !sportText && !countryText) {
      setGlobalMessage("กรุณากรอกชื่อ ชนิดกีฬา หรือประเทศ อย่างน้อย 1 ช่อง แล้วกดค้นหา");
      return;
    }

    els.globalSearchBtn.disabled = true;
    els.globalSearchBtn.textContent = "กำลังค้นหา…";
    els.globalList.innerHTML = '<p class="loading">กำลังค้นหาจาก Wikidata…</p>';

    Promise.all([resolveField(els.globalSportInput, "sport"), resolveField(els.globalCountryInput, "country")])
      .then(function (pair) {
        var sportIds = pair[0];
        var countryIds = pair[1];
        var personIdsPromise = name ? resolveField(els.globalNameInput, "name") : sparqlPersonIds(sportIds, countryIds);

        return personIdsPromise.then(function (personIds) {
          personIds = personIds.slice(0, 30);
          if (!personIds.length) return { people: [], refEntities: {} };

          return wbGetEntities(personIds).then(function (entities) {
            var people = personIds.map(function (id) { return entities[id]; }).filter(function (e) { return e && !e.missing; });

            // when searching by name, verify "is athlete" and apply sport/country filters client-side
            if (name) {
              people = people.filter(function (e) { return claimIds(e, "P641").length > 0 || claimIds(e, "P106").length > 0; });
              if (sportIds.length) {
                people = people.filter(function (e) {
                  return claimIds(e, "P641").some(function (id) { return sportIds.indexOf(id) !== -1; });
                });
              }
              if (countryIds.length) {
                people = people.filter(function (e) {
                  return claimIds(e, "P27").some(function (id) { return countryIds.indexOf(id) !== -1; });
                });
              }
            }

            var refIds = [];
            people.forEach(function (e) {
              claimIds(e, "P641").concat(claimIds(e, "P27")).forEach(function (id) {
                if (refIds.indexOf(id) === -1) refIds.push(id);
              });
            });

            return wbGetEntities(refIds).then(function (refEntities) {
              return { people: people, refEntities: refEntities };
            });
          });
        });
      })
      .then(function (result) {
        if (!result.people.length) {
          setGlobalMessage("ไม่พบนักกีฬาที่ตรงกับคำค้นหา ลองปรับคำค้นหาหรือสะกดเป็นภาษาอังกฤษดู");
          return;
        }
        renderGlobalResults(result.people, result.refEntities);
      })
      .catch(function (err) {
        setGlobalMessage("ค้นหาไม่สำเร็จ (" + esc(err.message || "เครือข่ายขัดข้อง") + ") กรุณาลองใหม่อีกครั้ง");
      })
      .then(function () {
        els.globalSearchBtn.disabled = false;
        els.globalSearchBtn.textContent = "ค้นหา";
      });
  }

  // ---------- autocomplete suggestions ----------
  function wbSearchSuggestions(text) {
    // merge Thai + English suggestions, de-duplicated by id, each kept with its label/description
    return Promise.all([
      fetchJson(
        WD_API + "?action=wbsearchentities&search=" + encodeURIComponent(text) +
        "&language=th&uselang=th&type=item&limit=6&format=json&origin=*"
      ).catch(function () { return { search: [] }; }),
      fetchJson(
        WD_API + "?action=wbsearchentities&search=" + encodeURIComponent(text) +
        "&language=en&uselang=en&type=item&limit=6&format=json&origin=*"
      ).catch(function () { return { search: [] }; }),
    ]).then(function (pair) {
      var seen = {};
      var out = [];
      pair[0].search.concat(pair[1].search).forEach(function (s) {
        if (seen[s.id]) return;
        seen[s.id] = true;
        out.push({ id: s.id, label: s.label || s.id, description: s.description || "" });
      });
      return out.slice(0, 8);
    });
  }

  function highlightMatch(label, query) {
    var i = label.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return esc(label);
    return esc(label.slice(0, i)) + "<mark>" + esc(label.slice(i, i + query.length)) + "</mark>" + esc(label.slice(i + query.length));
  }

  function setupAutocomplete(inputEl, listEl, pickKey) {
    var debounceTimer = null;
    var requestSeq = 0;
    var items = [];
    var activeIndex = -1;

    function close() {
      listEl.hidden = true;
      listEl.innerHTML = "";
      activeIndex = -1;
      inputEl.setAttribute("aria-expanded", "false");
    }

    function renderItems(text) {
      if (!items.length) {
        listEl.innerHTML = '<li class="suggest-item-empty">ไม่พบคำแนะนำ — พิมพ์ค้นหาแบบคำที่ต้องการได้เลย</li>';
        listEl.hidden = false;
        inputEl.setAttribute("aria-expanded", "true");
        return;
      }
      listEl.innerHTML = items
        .map(function (it, idx) {
          return (
            '<li class="suggest-item" role="option" data-idx="' + idx + '">' +
              '<span class="suggest-item-label">' + highlightMatch(it.label, text) + "</span>" +
              (it.description ? '<span class="suggest-item-desc">' + esc(it.description) + "</span>" : "") +
            "</li>"
          );
        })
        .join("");
      listEl.hidden = false;
      inputEl.setAttribute("aria-expanded", "true");
    }

    function pick(idx) {
      var it = items[idx];
      if (!it) return;
      inputEl.value = it.label;
      picked[pickKey] = { id: it.id, label: it.label };
      close();
    }

    listEl.addEventListener("mousedown", function (ev) {
      var li = ev.target.closest(".suggest-item");
      if (!li) return;
      ev.preventDefault();
      pick(parseInt(li.getAttribute("data-idx"), 10));
    });

    inputEl.addEventListener("input", function () {
      picked[pickKey] = null; // typing by hand invalidates any earlier pick
      var text = inputEl.value.trim();
      clearTimeout(debounceTimer);
      if (text.length < 2) {
        close();
        return;
      }
      listEl.innerHTML = '<li class="suggest-item-loading">กำลังค้นหาคำแนะนำ…</li>';
      listEl.hidden = false;
      debounceTimer = setTimeout(function () {
        var seq = ++requestSeq;
        wbSearchSuggestions(text).then(function (results) {
          if (seq !== requestSeq) return; // a newer keystroke superseded this request
          items = results;
          activeIndex = -1;
          renderItems(text);
        });
      }, 300);
    });

    inputEl.addEventListener("keydown", function (ev) {
      if (listEl.hidden || !items.length) return;
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
      } else if (ev.key === "Enter") {
        if (activeIndex >= 0) {
          ev.preventDefault();
          pick(activeIndex);
        }
        return;
      } else if (ev.key === "Escape") {
        close();
        return;
      } else {
        return;
      }
      Array.prototype.forEach.call(listEl.querySelectorAll(".suggest-item"), function (li, idx) {
        li.classList.toggle("is-active", idx === activeIndex);
      });
      var activeLi = listEl.querySelector(".suggest-item.is-active");
      if (activeLi) activeLi.scrollIntoView({ block: "nearest" });
    });

    inputEl.addEventListener("blur", function () {
      // let a mousedown-triggered pick run first
      setTimeout(close, 120);
    });
  }

  function initGlobalSearch() {
    setupAutocomplete(els.globalNameInput, els.globalNameSuggest, "name");
    setupAutocomplete(els.globalSportInput, els.globalSportSuggest, "sport");
    setupAutocomplete(els.globalCountryInput, els.globalCountrySuggest, "country");

    els.globalControlsWrap.addEventListener("submit", function (ev) {
      ev.preventDefault();
      runGlobalSearch();
    });
  }
})();
