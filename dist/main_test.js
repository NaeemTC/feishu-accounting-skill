(() => {
  // src/main.ts
  var APP_ID = "***REMOVED***";
  var APP_SECRET = "***REMOVED***";
  var FEISHU_API = "https://open.feishu.cn/open-apis";
  var BASE_TOKEN = "***REMOVED***";
  var TABLE_ID = "tbl6Nr0zDhNEjjC7";
  var FIELD_IDX = { text: 0, month: 1, amount: 2, category: 3 };
  var CATEGORY_COLORS = {
    "\u9910\u996E": "#ff6b6b",
    "\u8D2D\u7269": "#4dabf7",
    "\u4EA4\u901A": "#ffa94d",
    "\u5A31\u4E50": "#9775fa",
    "\u901A\u8BAF": "#69db7c",
    "\u751F\u6D3B": "#ffd43b",
    "\u5176\u5B83": "#868e96",
    "\u6536\u5165": "#00c853"
  };
  var currentMonth = getCurrentMonth();
  var deviceCode = "";
  var pollTimer = null;
  function getCurrentMonth() {
    const now = /* @__PURE__ */ new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, opts);
    return res.json();
  }
  async function startDeviceAuth() {
    const tips = document.getElementById("login-tips");
    tips.textContent = "\u6B63\u5728\u8FDE\u63A5\u98DE\u4E66...";
    try {
      const deviceRes = await fetchJSON(`${FEISHU_API}/oauth/v4/device/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
      });
      if (deviceRes.code !== 0) {
        tips.textContent = `\u8BBE\u5907\u7801\u83B7\u53D6\u5931\u8D25: ${deviceRes.msg}`;
        return;
      }
      deviceCode = deviceRes.device_code;
      const userCode = deviceRes.user_code;
      const verifyUrl = deviceRes.verification_uri;
      const qrSection = document.getElementById("qr-section");
      const qrImg = document.getElementById("qr-code");
      const authUrlEl = document.getElementById("auth-url");
      const pollMsg = document.getElementById("poll-msg");
      const loginBtn = document.getElementById("login-btn");
      loginBtn.classList.add("hidden");
      qrSection.classList.remove("hidden");
      authUrlEl.href = verifyUrl;
      authUrlEl.textContent = verifyUrl;
      tips.textContent = `\u6388\u6743\u7801: ${userCode}`;
      pollMsg.textContent = "\u7B49\u5F85\u6388\u6743...";
      qrImg.src = `${FEISHU_API}/oauth/v4/device/qrcode?device_code=${encodeURIComponent(deviceCode)}`;
      pollForToken(pollMsg);
    } catch (e) {
      tips.textContent = "\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5";
      console.error(e);
    }
  }
  async function pollForToken(pollMsg) {
    pollTimer = setInterval(async () => {
      try {
        const tokenRes = await fetchJSON(`${FEISHU_API}/oauth/v4/device/access_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET, device_code: deviceCode })
        });
        if (tokenRes.code === 0) {
          clearInterval(pollTimer);
          const uat = tokenRes.access_token;
          localStorage.setItem("feishu_uat", uat);
          localStorage.setItem("feishu_uat_exp", String(Date.now() + (tokenRes.expires_in - 60) * 1e3));
          pollMsg.textContent = "\u6388\u6743\u6210\u529F\uFF01\u6B63\u5728\u52A0\u8F7D...";
          setTimeout(() => showDashboard(), 500);
          return;
        }
        if (tokenRes.code !== 400200) {
          clearInterval(pollTimer);
          pollMsg.textContent = `\u6388\u6743\u5931\u8D25: ${tokenRes.msg}`;
        }
      } catch (e) {
        console.error("poll error", e);
      }
    }, 2e3);
  }
  async function getTenantToken() {
    const res = await fetchJSON(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    return res.tenant_access_token || "";
  }
  async function getRecords(token, _month) {
    const allRecords = await getAllRecords(token);
    return allRecords;
  }
  async function getAllRecords(token) {
    let pageSize = 500;
    let allData = [];
    let lastRecordId = null;
    let hasMore = true;
    const seenRecordIds = /* @__PURE__ */ new Set();
    while (hasMore) {
      let url = `${FEISHU_API}/base/v3/bases/${BASE_TOKEN}/tables/${TABLE_ID}/records?page_size=${pageSize}&sort_type=ByCreatedTime&direction=Desc`;
      if (lastRecordId) {
        url += `&record_id=${lastRecordId}`;
      }
      const res = await fetchJSON(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.code !== 0) break;
      const batch = res.data?.data || [];
      if (batch.length === 0) break;
      const recordIdList = res.data?.record_id_list || [];
      const lastId = recordIdList.length > 0 ? recordIdList[recordIdList.length - 1] : null;
      if (seenRecordIds.has(lastId)) {
        break;
      }
      recordIdList.forEach((id) => seenRecordIds.add(id));
      allData = allData.concat(batch);
      lastRecordId = lastId;
      hasMore = batch.length === pageSize && lastRecordId !== null;
    }
    return allData;
  }
  function parseRecords(records) {
    let income = 0;
    let expense = 0;
    const catMap = {};
    for (const r of records) {
      const text = r[FIELD_IDX.text] || "";
      const amount = r[FIELD_IDX.amount] ?? 0;
      const catArr = r[FIELD_IDX.category] || [];
      const cat = catArr[0] || "\u5176\u5B83";
      if (text.includes("\u6536\u5165") || text.includes("\u5DE5\u8D44") || text.includes("\u6536\u6B3E")) {
        income += amount;
      } else if (cat === "\u6536\u5165") {
        income += amount;
      } else {
        expense += amount;
        catMap[cat] = (catMap[cat] || 0) + amount;
      }
    }
    const categories = Object.entries(catMap).map(([name, amount]) => ({ name, amount, color: CATEGORY_COLORS[name] || "#868e96" })).sort((a, b) => b.amount - a.amount);
    return { income, expense, categories };
  }
  function getMonthList(records) {
    const months = /* @__PURE__ */ new Set();
    for (const r of records) {
      const m = r[FIELD_IDX.month];
      if (m) months.add(m);
    }
    return Array.from(months).sort().reverse();
  }
  function renderPieChart(categories) {
    const el = document.getElementById("pie-chart");
    if (!el) return;
    const chart = (void 0).init(el, void 0, { renderer: "svg" });
    chart.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: "{b}: \xA5{c} ({d}%)",
        backgroundColor: "#1a1a2e",
        borderColor: "#2a2a4a",
        textStyle: { color: "#e0e0e0" }
      },
      series: [{
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: "#0f0f1a", borderWidth: 2 },
        label: { show: true, formatter: "{b}\n{d}%", fontSize: 11, color: "#888", lineHeight: 16 },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: "bold" } },
        data: categories.map((c) => ({ name: c.name, value: Math.round(c.amount * 100) / 100, itemStyle: { color: c.color } }))
      }]
    });
  }
  function renderBarChart(monthData) {
    const el = document.getElementById("bar-chart");
    if (!el) return;
    const chart = (void 0).init(el, void 0, { renderer: "svg" });
    const months = Object.keys(monthData).sort();
    chart.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          let s = params[0].name + "<br/>";
          for (const p of params) {
            s += `<span style="color:${p.color}">\u25CF</span> ${p.seriesName}: \xA5${p.value.toFixed(2)}<br/>`;
          }
          return s;
        },
        backgroundColor: "#1a1a2e",
        borderColor: "#2a2a4a",
        textStyle: { color: "#e0e0e0" }
      },
      grid: { left: 50, right: 16, top: 10, bottom: 24 },
      xAxis: { type: "category", data: months.map((m) => m.slice(5)), axisLabel: { color: "#888", fontSize: 11 }, axisLine: { lineStyle: { color: "#2a2a4a" } } },
      yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 11, formatter: (v) => `\xA5${v}` }, splitLine: { lineStyle: { color: "#1a1a2e" } }, axisLine: { show: false } },
      series: [
        { name: "\u6536\u5165", type: "bar", data: months.map((m) => monthData[m]?.income || 0), itemStyle: { color: "#00c853", borderRadius: [4, 4, 0, 0] } },
        { name: "\u652F\u51FA", type: "bar", data: months.map((m) => monthData[m]?.expense || 0), itemStyle: { color: "#ff5252", borderRadius: [4, 4, 0, 0] } }
      ]
    });
  }
  function renderCategoryList(categories, total) {
    const list = document.getElementById("category-list");
    list.innerHTML = categories.map((c) => {
      const pct = total > 0 ? Math.round(c.amount / total * 100) : 0;
      return `
        <div class="cat-item">
          <div class="cat-left">
            <div class="cat-dot" style="background:${c.color}"></div>
            <span class="cat-name">${c.name}</span>
          </div>
          <div>
            <span class="cat-amount" style="color:${c.color}">\xA5${c.amount.toFixed(2)}</span>
            <span class="cat-pct">${pct}%</span>
          </div>
        </div>
      `;
    }).join("");
  }
  function showLogin() {
    document.getElementById("login-page").classList.remove("hidden");
    document.getElementById("dashboard-page").classList.add("hidden");
  }
  function showDashboard() {
    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("dashboard-page").classList.remove("hidden");
    loadDashboard();
  }
  async function loadDashboard() {
    const token = await getTenantToken();
    if (!token) return;
    document.getElementById("current-month").textContent = currentMonth;
    await loadMonthData(token, currentMonth);
  }
  async function loadMonthData(token, month) {
    const records = await getRecords(token, month);
    const allRecords = await getAllRecords(token);
    const { income, expense, categories } = parseRecords(records);
    const net = income - expense;
    const fmt = (v) => `\xA5${v.toFixed(2)}`;
    const el = (id) => document.getElementById(id);
    el("total-income").textContent = fmt(income);
    el("total-expense").textContent = fmt(expense);
    el("total-expense").className = `card-amount ${expense > 0 ? "expense" : ""}`;
    el("total-net").textContent = (net >= 0 ? "+" : "") + fmt(net);
    el("total-net").className = `card-amount ${net >= 0 ? "income" : "expense"}`;
    renderPieChart(categories);
    renderCategoryList(categories, expense);
    const monthList = getMonthList(allRecords).slice(0, 6);
    const monthData = {};
    for (const m of monthList) {
      const recs = allRecords.filter((r) => r[FIELD_IDX.month] === m);
      const d = parseRecords(recs);
      monthData[m] = { income: d.income, expense: d.expense };
    }
    renderBarChart(monthData);
  }
  function changeMonth(delta) {
    const [y, m] = currentMonth.split("-").map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    document.getElementById("current-month").textContent = currentMonth;
    getTenantToken().then((token) => {
      if (token) loadMonthData(token, currentMonth);
    });
  }
  function logout() {
    localStorage.removeItem("feishu_uat");
    localStorage.removeItem("feishu_uat_exp");
    if (pollTimer) clearInterval(pollTimer);
    showLogin();
  }
  function init() {
    document.getElementById("login-btn").addEventListener("click", startDeviceAuth);
    document.getElementById("prev-month").addEventListener("click", () => changeMonth(-1));
    document.getElementById("next-month").addEventListener("click", () => changeMonth(1));
    document.getElementById("logout-btn").addEventListener("click", logout);
    const uatExp = parseInt(localStorage.getItem("feishu_uat_exp") || "0");
    if (localStorage.getItem("feishu_uat") && Date.now() < uatExp) {
      showDashboard();
    } else {
      showLogin();
    }
    window.addEventListener("resize", () => {
      const pieEl = document.getElementById("pie-chart");
      const barEl = document.getElementById("bar-chart");
      if (pieEl) {
        const c = (void 0).getInstanceByDom(pieEl);
        if (c) c.resize();
      }
      if (barEl) {
        const c = (void 0).getInstanceByDom(barEl);
        if (c) c.resize();
      }
    });
  }
  init();
})();
