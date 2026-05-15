// echarts 通过 CDN 全局加载
declare const echarts: typeof import('echarts');

// ─── 常量配置 ───
const APP_ID = '***REMOVED***';
const APP_SECRET = '***REMOVED***';
const FEISHU_API = 'https://open.feishu.cn/open-apis';
const BASE_TOKEN = '***REMOVED***';
const TABLE_ID = 'tbl6Nr0zDhNEjjC7';
// 字段顺序: [文本, 月份, 金额, 分类]
const FIELD_IDX = { text: 0, month: 1, amount: 2, category: 3 };

// 分类颜色
const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': '#ff6b6b',
  '购物': '#4dabf7',
  '交通': '#ffa94d',
  '娱乐': '#9775fa',
  '通讯': '#69db7c',
  '生活': '#ffd43b',
  '其它': '#868e96',
  '收入': '#00c853',
};

// ─── 状态 ───
let currentMonth = getCurrentMonth();
let deviceCode = '';
let pollTimer: ReturnType<typeof setInterval> | null = null;

// ─── 工具函数 ───
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function fetchJSON(url: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(url, opts);
  return res.json();
}

// ─── 飞书 OAuth 设备码流程 ───
async function startDeviceAuth() {
  const tips = document.getElementById('login-tips')!;
  tips.textContent = '正在连接飞书...';

  try {
    // Step1: 请求设备码
    const deviceRes = await fetchJSON(`${FEISHU_API}/oauth/v4/device/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });

    if (deviceRes.code !== 0) {
      tips.textContent = `设备码获取失败: ${deviceRes.msg}`;
      return;
    }

    deviceCode = deviceRes.device_code;
    const userCode = deviceRes.user_code;
    const verifyUrl = deviceRes.verification_uri;

    // 显示授权信息
    const qrSection = document.getElementById('qr-section')!;
    const qrImg = document.getElementById('qr-code') as HTMLImageElement;
    const authUrlEl = document.getElementById('auth-url') as HTMLAnchorElement;
    const pollMsg = document.getElementById('poll-msg')!;
    const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;

    loginBtn.classList.add('hidden');
    qrSection.classList.remove('hidden');
    authUrlEl.href = verifyUrl;
    authUrlEl.textContent = verifyUrl;
    tips.textContent = `授权码: ${userCode}`;
    pollMsg.textContent = '等待授权...';

    // 生成二维码
    qrImg.src = `${FEISHU_API}/oauth/v4/device/qrcode?device_code=${encodeURIComponent(deviceCode)}`;

    // 开始轮询
    pollForToken(pollMsg);
  } catch (e) {
    tips.textContent = '网络错误，请重试';
    console.error(e);
  }
}

async function pollForToken(pollMsg: HTMLElement) {
  pollTimer = setInterval(async () => {
    try {
      const tokenRes = await fetchJSON(`${FEISHU_API}/oauth/v4/device/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET, device_code: deviceCode }),
      });

      if (tokenRes.code === 0) {
        clearInterval(pollTimer!);
        const uat = tokenRes.access_token;
        localStorage.setItem('feishu_uat', uat);
        localStorage.setItem('feishu_uat_exp', String(Date.now() + (tokenRes.expires_in - 60) * 1000));
        pollMsg.textContent = '授权成功！正在加载...';
        setTimeout(() => showDashboard(), 500);
        return;
      }

      if (tokenRes.code !== 400200) {
        clearInterval(pollTimer!);
        pollMsg.textContent = `授权失败: ${tokenRes.msg}`;
      }
    } catch (e) {
      console.error('poll error', e);
    }
  }, 2000);
}

// ─── 飞书 API ───
async function getTenantToken(): Promise<string> {
  const res = await fetchJSON(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  return res.tenant_access_token || '';
}

async function getRecords(token: string, _month: string): Promise<any[]> {
  // 飞书 API 不支持按月份过滤，返回全部后在客户端过滤
  // 分页 bug：has_more=true 但 page_token=null，用 record_id 做游标翻页
  const allRecords = await getAllRecords(token);
  return allRecords;
}

async function getAllRecords(token: string): Promise<any[]> {
  let pageSize = 500;
  let allData: any[] = [];
  let lastRecordId: string | null = null;
  let hasMore = true;

  const seenRecordIds = new Set<string>();
  while (hasMore) {
    let url = `${FEISHU_API}/base/v3/bases/${BASE_TOKEN}/tables/${TABLE_ID}/records?page_size=${pageSize}&sort_type=ByCreatedTime&direction=Desc`;
    if (lastRecordId) {
      url += `&record_id=${lastRecordId}`;
    }

    const res = await fetchJSON(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.code !== 0) break;

    const batch: any[] = res.data?.data || [];
    if (batch.length === 0) break;

    // 检测 record_id_list 是否重复（飞书 record_id 游标在某些 offset 下会失效，导致循环）
    const recordIdList: string[] = res.data?.record_id_list || [];
    const lastId = recordIdList.length > 0 ? recordIdList[recordIdList.length - 1] : null;
    if (seenRecordIds.has(lastId)) {
      // 游标重复，退出防止死循环
      break;
    }
    recordIdList.forEach(id => seenRecordIds.add(id));

    allData = allData.concat(batch);
    lastRecordId = lastId;
    hasMore = batch.length === pageSize && lastRecordId !== null;
  }

  return allData;
}

// ─── 数据处理 ───
interface MonthData {
  income: number;
  expense: number;
  categories: { name: string; amount: number; color: string }[];
}

function parseRecords(records: any[]): MonthData {
  let income = 0;
  let expense = 0;
  const catMap: Record<string, number> = {};

  for (const r of records) {
    const text = r[FIELD_IDX.text] || '';
    const amount: number = r[FIELD_IDX.amount] ?? 0;
    const catArr: string[] = r[FIELD_IDX.category] || [];
    const cat = catArr[0] || '其它';

    if (text.includes('收入') || text.includes('工资') || text.includes('收款')) {
      income += amount;
    } else if (cat === '收入') {
      income += amount;
    } else {
      expense += amount;
      catMap[cat] = (catMap[cat] || 0) + amount;
    }
  }

  const categories = Object.entries(catMap)
    .map(([name, amount]) => ({ name, amount, color: CATEGORY_COLORS[name] || '#868e96' }))
    .sort((a, b) => b.amount - a.amount);

  return { income, expense, categories };
}

function getMonthList(records: any[]): string[] {
  const months = new Set<string>();
  for (const r of records) {
    const m = r[FIELD_IDX.month];
    if (m) months.add(m);
  }
  return Array.from(months).sort().reverse();
}

// ─── 图表渲染 ───
function renderPieChart(categories: { name: string; amount: number; color: string }[]) {
  const el = document.getElementById('pie-chart');
  if (!el) return;
  const chart = echarts.init(el, undefined, { renderer: 'svg' });
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)',
      backgroundColor: '#1a1a2e',
      borderColor: '#2a2a4a',
      textStyle: { color: '#e0e0e0' },
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#0f0f1a', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, color: '#888', lineHeight: 16 },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' as const } },
      data: categories.map(c => ({ name: c.name, value: Math.round(c.amount * 100) / 100, itemStyle: { color: c.color } })),
    }],
  });
}

function renderBarChart(monthData: Record<string, { income: number; expense: number }>) {
  const el = document.getElementById('bar-chart');
  if (!el) return;
  const chart = echarts.init(el, undefined, { renderer: 'svg' });
  const months = Object.keys(monthData).sort();

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let s = params[0].name + '<br/>';
        for (const p of params) {
          s += `<span style="color:${p.color}">●</span> ${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`;
        }
        return s;
      },
      backgroundColor: '#1a1a2e',
      borderColor: '#2a2a4a',
      textStyle: { color: '#e0e0e0' },
    },
    grid: { left: 50, right: 16, top: 10, bottom: 24 },
    xAxis: { type: 'category', data: months.map(m => m.slice(5)), axisLabel: { color: '#888', fontSize: 11 }, axisLine: { lineStyle: { color: '#2a2a4a' } } },
    yAxis: { type: 'value', axisLabel: { color: '#888', fontSize: 11, formatter: (v: number) => `¥${v}` }, splitLine: { lineStyle: { color: '#1a1a2e' } }, axisLine: { show: false } },
    series: [
      { name: '收入', type: 'bar', data: months.map(m => monthData[m]?.income || 0), itemStyle: { color: '#00c853', borderRadius: [4, 4, 0, 0] } },
      { name: '支出', type: 'bar', data: months.map(m => monthData[m]?.expense || 0), itemStyle: { color: '#ff5252', borderRadius: [4, 4, 0, 0] } },
    ],
  });
}

function renderCategoryList(categories: { name: string; amount: number; color: string }[], total: number) {
  const list = document.getElementById('category-list')!;
  list.innerHTML = categories
    .map(c => {
      const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
      return `
        <div class="cat-item">
          <div class="cat-left">
            <div class="cat-dot" style="background:${c.color}"></div>
            <span class="cat-name">${c.name}</span>
          </div>
          <div>
            <span class="cat-amount" style="color:${c.color}">¥${c.amount.toFixed(2)}</span>
            <span class="cat-pct">${pct}%</span>
          </div>
        </div>
      `;
    })
    .join('');
}

// ─── 页面切换 ───
function showLogin() {
  document.getElementById('login-page')!.classList.remove('hidden');
  document.getElementById('dashboard-page')!.classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-page')!.classList.add('hidden');
  document.getElementById('dashboard-page')!.classList.remove('hidden');
  loadDashboard();
}

// ─── 仪表盘加载 ───
async function loadDashboard() {
  const token = await getTenantToken();
  if (!token) return;
  document.getElementById('current-month')!.textContent = currentMonth;
  await loadMonthData(token, currentMonth);
}

async function loadMonthData(token: string, month: string) {
  const records = await getRecords(token, month);
  const allRecords = await getAllRecords(token);

  const { income, expense, categories } = parseRecords(records);
  const net = income - expense;

  const fmt = (v: number) => `¥${v.toFixed(2)}`;
  const el = (id: string) => document.getElementById(id)!;
  el('total-income').textContent = fmt(income);
  el('total-expense').textContent = fmt(expense);
  el('total-expense').className = `card-amount ${expense > 0 ? 'expense' : ''}`;
  el('total-net').textContent = (net >= 0 ? '+' : '') + fmt(net);
  el('total-net').className = `card-amount ${net >= 0 ? 'income' : 'expense'}`;

  renderPieChart(categories);
  renderCategoryList(categories, expense);

  // 月度对比柱状图
  const monthList = getMonthList(allRecords).slice(0, 6);
  const monthData: Record<string, { income: number; expense: number }> = {};
  for (const m of monthList) {
    const recs = allRecords.filter((r: any[]) => r[FIELD_IDX.month] === m);
    const d = parseRecords(recs);
    monthData[m] = { income: d.income, expense: d.expense };
  }
  renderBarChart(monthData);
}

// ─── 月份切换 ───
function changeMonth(delta: number) {
  const [y, m] = currentMonth.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('current-month')!.textContent = currentMonth;
  getTenantToken().then(token => { if (token) loadMonthData(token, currentMonth); });
}

// ─── 退出登录 ───
function logout() {
  localStorage.removeItem('feishu_uat');
  localStorage.removeItem('feishu_uat_exp');
  if (pollTimer) clearInterval(pollTimer);
  showLogin();
}

// ─── 初始化 ───
function init() {
  document.getElementById('login-btn')!.addEventListener('click', startDeviceAuth);
  document.getElementById('prev-month')!.addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month')!.addEventListener('click', () => changeMonth(1));
  document.getElementById('logout-btn')!.addEventListener('click', logout);

  const uatExp = parseInt(localStorage.getItem('feishu_uat_exp') || '0');
  if (localStorage.getItem('feishu_uat') && Date.now() < uatExp) {
    showDashboard();
  } else {
    showLogin();
  }

  window.addEventListener('resize', () => {
    const pieEl = document.getElementById('pie-chart');
    const barEl = document.getElementById('bar-chart');
    if (pieEl) { const c = echarts.getInstanceByDom(pieEl); if (c) c.resize(); }
    if (barEl) { const c = echarts.getInstanceByDom(barEl); if (c) c.resize(); }
  });
}

init();
