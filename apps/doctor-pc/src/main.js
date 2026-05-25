import { loadState, nowText, resetState, saveState } from "./store.js";

let state = sanitizeStateText(loadState());
let currentView = "patients";
let selectedPatientId = state.patients[0]?.id;
let patientFilter = "all";
let detailTab = "overview";
let searchQuery = "";
let filtersCollapsed = true;
let planMode = "list";
let selectedPlanId = state.plans[0]?.id;
let planStatusFilter = "全部";
let planTagFilter = "全部";
let planSourceFilter = "全部";
let planDiseaseFilter = "全部";
let planSearchQuery = "";
let sleepTimeWindow = "7";
let sleepTrendMetric = "ODI";
let selectedSleepReportIds = {};
let metricDictSearchQuery = "";
let metricDictCategoryFilter = "全部";
let twinSelectedOrgan = null;
let twinSelectedSource = null;
let twinDemoMode = false;
let twinDemoTemplate = "normal";
let twinPlayingChain = null;
let goalSearchQuery = "";
let goalCategoryFilter = "全部";
let goalStatusFilter = "全部";
let paginationState = {
  patients: { page: 1, pageSize: 20, jump: "" },
  alerts: { page: 1, pageSize: 20, jump: "" },
  plans: { page: 1, pageSize: 20, jump: "" },
  followups: { page: 1, pageSize: 20, jump: "" },
  metricDictionary: { page: 1, pageSize: 20, jump: "" },
  goalManagement: { page: 1, pageSize: 20, jump: "" }
};
let patientFilters = {
  important: "全部",
  risk: "全部",
  diseaseRisk: "全部",
  disease: "全部",
  todo: "全部",
  plan: "全部",
  followup: "全部",
  data: "全部",
  relation: "全部",
  device: "全部"
};

const app = document.querySelector("#app");
const pageTitle = document.querySelector("#pageTitle");
const pageSubTitle = document.querySelector("#pageSubTitle");
const toast = document.querySelector("#toast");
const modalRoot = document.querySelector("#modalRoot");

function sanitizeStateText(value) {
  if (typeof value === "string") {
    return value
      .replaceAll("睡���时长", "睡眠时长")
      .replaceAll("���录症状", "记录症状")
      .replaceAll("血氧监���连续性", "血氧监测连续性")
      .replaceAll("手动补���", "手动补录")
      .replaceAll("���", "");
  }
  if (Array.isArray(value)) return value.map(sanitizeStateText);
  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      value[key] = sanitizeStateText(value[key]);
    });
  }
  return value;
}

const viewMeta = {
  patients: ["患者管理", "查看患者状态，处理预警、方案与随访事项"],
  alerts: ["预警中心", "按异常事件集中处理预警，并形成随访或方案调整闭环"],
  plans: ["方案管理", "审核待确认方案，维护执行中方案和患者知晓状态"],
  followups: ["随访计划", "按时间任务管理待随访、逾期随访和随访结论"],
  detail: ["患者详情", "查看患者档案、筛查、数据分析和管理记录"],
  metricDictionary: ["指标字典", "系统全量预置慢病基础指标，统一平台指标规范"],
  goalManagement: ["目标管理", "配置全局慢病目标阈值与启停状态，为患者目标初始化提供默认标准"]
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = (prefix) => `${prefix}${Date.now().toString(36).toUpperCase().slice(-6)}`;
const patientById = (id) => state.patients.find((item) => item.id === id);
const patientName = (id) => patientById(id)?.name || "-";
const alertsOf = (patientId) => state.alerts.filter((item) => item.patientId === patientId);
const plansOf = (patientId) => state.plans.filter((item) => item.patientId === patientId);
const followupsOf = (patientId) => state.followups.filter((item) => item.patientId === patientId);
const adviceOf = (patientId) => state.advice?.filter((item) => item.patientId === patientId) || [];
const sleepReportsOf = (patientId) => (state.sleepReports || []).filter((item) => item.patientId === patientId);
const oxygenReportsOf = (patientId) => (state.oxygenReports || []).filter((item) => item.patientId === patientId).sort((a, b) => b.monitorDate.localeCompare(a.monitorDate));
const copdSymptomsOf = (patientId) => (state.copdSymptoms || []).find((item) => item.patientId === patientId)?.symptoms || [];
const oxygenTrendOf = (patientId) => (state.oxygenTrend || []).find((item) => item.patientId === patientId)?.trend || [];
const scaleRecordsOf = (patientId, code) => (state.scaleRecords || []).filter((item) => item.patientId === patientId && item.scaleCode === code).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
const hasCOPD = (patient) => patient.diseases.some((d) => ["慢阻肺", "COPD", "慢性阻塞性肺疾病"].includes(d));

const PLAN_STATUSES = ["全部", "草稿", "已下发待患者确认", "执行中", "已驳回", "已停用", "已完成"];
const PLAN_REMINDER_TAGS = ["全部", "患者未确认", "患者有疑问", "患者无法执行", "即将到期", "待复盘"];
const PLAN_SOURCE_FILTERS = ["全部", "系统草稿", "医生创建", "模板创建", "历史复制", "随访调整", "预警调整"];
const PLAN_DISEASE_FILTERS = ["全部", "糖尿病", "慢阻肺", "睡眠呼吸障碍", "高血压", "多病共管"];
const PLAN_STATUS_CODE = { "草稿": "draft", "已下发待患者确认": "pending_patient", "执行中": "active", "已驳回": "rejected", "已停用": "stopped", "已完成": "completed" };
const PLAN_ACTION_RULES = {
  draft: { primary: { label: "审核/继续编辑", action: "edit-plan" }, secondary: [{ label: "驳回推荐", action: "reject-plan" }, { label: "删除草稿", action: "delete-plan" }] },
  pending_patient: { primary: { label: "提醒患者确认", action: "remind-patient" }, secondary: [{ label: "标记已知晓", action: "mark-patient-known" }, { label: "撤回下发", action: "withdraw-plan" }] },
  active: { primary: { label: "查看方案", action: "edit-plan" }, secondary: [{ label: "调整方案", action: "adjust-plan" }, { label: "停用方案", action: "stop-plan" }, { label: "创建随访", action: "open-followup-drawer" }, { label: "结束本阶段", action: "complete-plan" }] },
  rejected: { primary: { label: "查看详情", action: "edit-plan" }, secondary: [{ label: "复制为新方案", action: "copy-as-new-plan" }] },
  stopped: { primary: { label: "查看历史", action: "edit-plan" }, secondary: [{ label: "复制为新方案", action: "copy-as-new-plan" }] },
  completed: { primary: { label: "查看复盘", action: "edit-plan" }, secondary: [{ label: "复制为新方案", action: "copy-as-new-plan" }] }
};
const RISK_LEVEL_TONE = { "高风险": "red", "中风险": "orange", "低风险": "green", "稳定": "green", "需关注": "orange", "需干预": "red" };
const MODULE_DEPENDENCY_RULES = {
  medication: { affectedTargets: ["用药执行率"], affectedAlerts: [], affectedPatientFeatures: ["用药提醒", "用药打卡"], closable: true, closableReason: "" },
  device: { affectedTargets: ["AHI", "最低血氧", "CPAP使用时长", "睡眠报告完成率"], affectedAlerts: ["最低血氧<90%预警", "AHI>=30预警", "CPAP使用不足预警"], affectedPatientFeatures: ["设备同步", "睡眠报告查看", "添加设备入口"], closable: false, closableReason: "当前方案启用设备依赖目标，不可关闭设备监测方案" },
  symptoms: { affectedTargets: [], affectedAlerts: [], affectedPatientFeatures: ["症状记录"], closable: true, closableReason: "" },
  lifestyle: { affectedTargets: [], affectedAlerts: [], affectedPatientFeatures: ["健康建议待办"], closable: true, closableReason: "" }
};
const MEDICATION_FREQUENCIES = ["每日 1 次", "每日 2 次", "每日 3 次", "每日 4 次", "每 8 小时 1 次", "每 12 小时 1 次", "隔日 1 次", "每 3 日 1 次", "必要时", "紧急时"];
const PLAN_PERIOD_DAYS = [7, 14, 30, 90, 180];
const PLAN_DISEASE_OPTIONS = ["糖尿病", "高血压", "睡眠呼吸障碍", "慢阻肺"];
const METRIC_NAME_OPTIONS = ["血糖", "血压", "SpO2", "呼吸频率", "体重", "睡眠报告"];
const METRIC_SCENE_PLACEHOLDER = "血糖：凌晨/空腹/早餐后2h/午餐前/午餐后2h/晚餐前/睡前/随机；血压：晨起/睡前/随机；血氧/呼吸频率：静息后/活动后/睡前";
const METRIC_FREQUENCIES = ["每日", "每周 1 天", "每周 2 天", "每周 3 天", "每周 4 天", "每周 5 天", "每周 6 天", "每周 7 天"];
const METRIC_SCENE_OPTIONS = {
  血糖: ["凌晨", "空腹", "早餐后2h", "午餐前", "午餐后2h", "晚餐前", "睡前", "随机"],
  血压: ["晨起", "睡前", "随机"],
  SpO2: ["静息后", "活动后", "睡前"],
  呼吸频率: ["静息后", "活动后", "睡前"],
  体重: ["晨起", "随机"],
  睡眠报告: ["每次睡眠报告后", "夜间", "起床后"]
};
const REMOVED_PLAN_MODULES = ["guidance"];
const REQUIRED_PLAN_MODULES = ["basic", "goals", "metrics", "followup"];
const PLAN_MODULE_META = {
  basic: { name: "方案基础信息", type: "required", visible: true },
  goals: { name: "管理目标", type: "required", visible: true },
  metrics: { name: "指标测量方案", type: "required", visible: true },
  symptoms: { name: "症状记录方案", type: "conditional", visible: true },
  medication: { name: "用药方案", type: "conditional", visible: true },
  device: { name: "设备监测方案", type: "conditional", visible: false },
  lifestyle: { name: "生活方式方案", type: "conditional", visible: true },
  alerts: { name: "预警规则", type: "conditional", visible: false },
  followup: { name: "随访计划", type: "required", visible: true }
};

function persist(message) {
  saveState(state);
  render();
  if (message) showToast(message);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function addTimeline(patientId, type, text) {
  state.timeline.unshift({ id: uid("T"), patientId, type, text, time: nowText() });
}

function tag(text, tone = "gray") {
  return `<span class="tag ${tone}">${text}</span>`;
}

function toneOf(value) {
  const map = {
    紧急: "red",
    重要: "orange",
    提醒: "blue",
    异常: "red",
    偏高: "orange",
    待复核: "orange",
    待报告: "gray",
    观察: "blue",
    待处理: "red",
    已处理: "green",
    稳定: "green",
    需关注: "orange",
    需干预: "red",
    草稿: "gray",
    系统推荐: "orange",
    已下发待患者确认: "blue",
    执行中: "green",
    待复盘: "blue",
    患者未确认: "blue",
    患者有疑问: "orange",
    患者无法执行: "red",
    即将到期: "orange",
    已驳回: "gray",
    已停用: "gray",
    已完成: "green",
    待随访: "blue",
    待患者准备: "orange",
    逾期: "red",
    已取消: "gray",
    达标: "green",
    未达标: "red",
    高风险: "red",
    中风险: "orange",
    低风险: "green",
    未读: "orange",
    已读: "green"
  };
  return map[value] || "gray";
}

function hasSleepBreathingDisorder(patient) {
  return [...(patient.diseases || []), ...(patient.screening?.confirmed || [])].some((item) => /睡眠呼吸(障碍|暂停)|OSA/i.test(item));
}
function hasDiabetes(patient) {
  return [...(patient.diseases || []), ...(patient.screening?.confirmed || [])].some((item) => /糖尿病|diabetes/i.test(item));
}
function hasTwinSupportedDisease(patient) {
  return hasDiabetes(patient) || hasSleepBreathingDisorder(patient) || hasCOPD(patient);
}

// Chart.js CDN loader — loads once, resolves immediately on subsequent calls
let _chartJsReady = null;
function loadChartJs() {
  if (_chartJsReady) return _chartJsReady;
  _chartJsReady = new Promise((resolve) => {
    if (window.Chart) { resolve(window.Chart); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js";
    s.onload = () => resolve(window.Chart);
    document.head.appendChild(s);
  });
  return _chartJsReady;
}

function initGlucoseCharts(patientId) {
  const agpCanvas = document.getElementById("g-agp-chart");
  if (!agpCanvas) return;

  loadChartJs().then((Chart) => {
    if (window._gAgpChart) { window._gAgpChart.destroy(); window._gAgpChart = null; }

    const period = window._gAgpPeriod || 14;

    // Synthetic AGP data with dawn phenomenon
    const labels = Array.from({length:24},(_,h) => String(h).padStart(2,"0")+":00");
    const median = [7.2,6.8,6.4,6.2,6.0,5.9,5.8,6.5,8.2,9.1,8.8,8.3,7.9,8.5,9.2,9.8,9.0,8.4,7.9,8.8,10.2,9.6,8.4,7.6];
    const scale  = period===7 ? 1.05 : period===30 ? 0.96 : 1;
    const scaled = median.map(v => +(v*scale).toFixed(1));
    const p25    = scaled.map(v => +(v - 1.2).toFixed(1));
    const p75    = scaled.map(v => +(v + 1.5).toFixed(1));
    const today  = scaled.map(v => +(v + (Math.random()-.5)*1.5).toFixed(1));

    if (patientId === "P001") {
      // Boost values for P001 (poor control)
      for (let i=0;i<scaled.length;i++) { scaled[i]=+(scaled[i]+1.2).toFixed(1); p25[i]=+(p25[i]+1.2).toFixed(1); p75[i]=+(p75[i]+1.2).toFixed(1); }
    }

    const bgBands = {
      id:"bgBands",
      beforeDraw(chart) {
        const { ctx, chartArea: ca, scales: { y } } = chart;
        if (!ca) return;
        const toY = v => y.getPixelForValue(v);
        ctx.save();
        ctx.fillStyle = "rgba(255,77,79,.06)";
        ctx.fillRect(ca.left, toY(3.9), ca.width, toY(2.5)-toY(3.9));
        ctx.fillStyle = "rgba(82,196,26,.06)";
        ctx.fillRect(ca.left, toY(10.0), ca.width, toY(3.9)-toY(10.0));
        ctx.fillStyle = "rgba(250,140,22,.06)";
        ctx.fillRect(ca.left, toY(18), ca.width, toY(10.0)-toY(18));
        // Green dashed ref lines
        ctx.strokeStyle = "rgba(82,196,26,.4)"; ctx.lineWidth=1;
        ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.moveTo(ca.left,toY(3.9));  ctx.lineTo(ca.right,toY(3.9));  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ca.left,toY(10.0)); ctx.lineTo(ca.right,toY(10.0)); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      }
    };

    window._gAgpChart = new Chart(agpCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label:"P75", data:p75, borderColor:"transparent", backgroundColor:"rgba(22,119,255,.12)", fill:"+1", pointRadius:0, tension:.4, order:3 },
          { label:"P25", data:p25, borderColor:"transparent", backgroundColor:"rgba(22,119,255,.12)", fill:false, pointRadius:0, tension:.4, order:4 },
          { label:"中位数", data:scaled, borderColor:"#1677FF", backgroundColor:"transparent", borderWidth:2.5, fill:false, pointRadius:0, tension:.4, order:1 },
          { label:"当日曲线", data:today, borderColor:"#86909C", backgroundColor:"transparent", borderWidth:1.5, borderDash:[5,4], fill:false, pointRadius:0, tension:.4, order:2 }
        ]
      },
      options: {
        maintainAspectRatio: false, responsive: true,
        interaction: { mode:"index", intersect:false },
        plugins: {
          legend: { display:false },
          tooltip: {
            backgroundColor:"rgba(29,33,41,.85)",
            titleFont:{size:11}, bodyFont:{size:11},
            padding:8, borderColor:"#E5E6EB", borderWidth:1,
            callbacks: { label: ctx => { if (ctx.dataset.label==="P75"||ctx.dataset.label==="P25") return null; return ctx.dataset.label+": "+ctx.parsed.y+" mmol/L"; } }
          }
        },
        scales: {
          x: { grid:{color:"#F0F0F0"}, ticks:{font:{size:10},color:"#86909C",maxTicksLimit:8}, border:{display:false} },
          y: { min:2.5, max:18, grid:{color:"#F0F0F0"}, ticks:{font:{size:10},color:"#86909C"}, border:{display:false} }
        }
      },
      plugins: [bgBands]
    });
  });
}

function initCOPDCharts(patientId) {
  loadChartJs().then((Chart) => {
    const reports = oxygenReportsOf(patientId);
    const latestReport = reports[0];
    const trend = oxygenTrendOf(patientId);
    const catRecords = scaleRecordsOf(patientId, "cat");

    // SpO2 time-series
    const spo2Canvas = document.getElementById("copdSpo2Chart");
    if (spo2Canvas) {
      if (window._copdSpo2Chart) window._copdSpo2Chart.destroy();
      const labels = latestReport.timeLabels || [];
      const spo2Data = latestReport.spo2Series || [];
      const prData = latestReport.pulseRateSeries || [];
      const colors = spo2Data.map(v => v < 85 ? "#EF4444" : v < 90 ? "#F59E0B" : "#10B981");
      window._copdSpo2Chart = new Chart(spo2Canvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "SpO₂ (%)", data: spo2Data, borderColor: "#5299ff", backgroundColor: "#5299ff20", borderWidth: 2, pointBackgroundColor: colors, pointRadius: 4, tension: 0.3, fill: false },
            { label: "脉率 (bpm)", data: prData, borderColor: "#94A3B8", borderWidth: 1, pointRadius: 0, tension: 0.3, fill: false, yAxisID: "y2" }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { grid: { color: "#F0F0F0" }, ticks: { font: { size: 10 }, color: "#86909C", maxTicksLimit: 8 } },
            y: { min: 80, max: 100, grid: { color: "#F0F0F0" }, ticks: { font: { size: 10 }, color: "#86909C" } },
            y2: { position: "right", min: 50, max: 110, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 }, color: "#94A3B8" } }
          },
          plugins: {
            annotation: {
              annotations: { threshold90: { type: "line", yMin: 90, yMax: 90, borderColor: "#F59E0B", borderWidth: 1, borderDash: [4, 4], label: { display: true, content: "90%低氧参考线", font: { size: 10 }, position: "start" } } }
            }
          }
        }
      });
    }

    // Hypoxia trend + Ts90% overlay
    const trendCanvas = document.getElementById("copdTrendChart");
    if (trendCanvas && trend.length) {
      if (window._copdTrendChart) window._copdTrendChart.destroy();
      window._copdTrendChart = new Chart(trendCanvas, {
        type: "line",
        data: {
          labels: trend.map(t => t.periodDate),
          datasets: [
            { label: "最低血氧 (%)", data: trend.map(t => t.minSpo2), borderColor: "#5299ff", borderWidth: 2, pointRadius: 3, tension: 0.3, spanGaps: false },
            { label: "ODI (次/小时)", data: trend.map(t => t.odi), borderColor: "#F59E0B", borderWidth: 2, pointRadius: 3, tension: 0.3, fill: false, yAxisID: "y2", spanGaps: false },
            { label: "Ts90% (%)", data: trend.map(t => t.ts90), borderColor: "#EF4444", borderWidth: 2, pointRadius: 3, tension: 0.3, fill: false, spanGaps: false }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { grid: { color: "#F0F0F0" }, ticks: { font: { size: 10 }, color: "#86909C" } },
            y: { min: 80, max: 100, grid: { color: "#F0F0F0" }, ticks: { font: { size: 10 }, color: "#86909C" } },
            y2: { position: "right", min: 0, max: 20, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 }, color: "#86909C" } }
          },
          plugins: { legend: { labels: { font: { size: 11 } } } }
        }
      });
    }

    // CAT trend
    const catCanvas = document.getElementById("copdCatTrend");
    if (catCanvas && catRecords.length >= 2) {
      if (window._copdCatChart) window._copdCatChart.destroy();
      window._copdCatChart = new Chart(catCanvas, {
        type: "line",
        data: {
          labels: catRecords.map(r => r.completedAt.slice(0, 10)),
          datasets: [{ label: "CAT评分", data: catRecords.map(r => r.totalScore), borderColor: "#7C3AED", borderWidth: 2, pointRadius: 4, tension: 0.3, fill: false }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { grid: { color: "#F0F0F0" } },
            y: { min: 0, max: 40, grid: { color: "#F0F0F0" } }
          }
        }
      });
    }
  });
}

function workbenchStat(label, value, note, tone = "") {
  return `<article class="workbench-stat ${tone}">
    <span>${label}</span>
    <strong>${value}</strong>
    <small>${note}</small>
  </article>`;
}

function followupStatusLabel(status) {
  const map = {
    pending_patient_prepare: "待患者准备",
    pending_doctor_followup: "待随访",
    overdue: "逾期"
  };
  return map[status] || status;
}

function render() {
  normalizePlanData();
  const [title, subTitle] = viewMeta[currentView];
  pageTitle.textContent = title;
  pageSubTitle.textContent = subTitle;
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === currentView));
  // Highlight parent nav-group when a sub-view is active
  document.querySelectorAll(".nav-group").forEach((group) => {
    const parentBtn = group.querySelector(".nav-parent");
    const subActive = group.querySelector(`.sub-item[data-view="${currentView}"]`);
    parentBtn.classList.toggle("active", !!subActive);
    if (subActive) group.classList.add("open");
    group.querySelectorAll(".sub-item").forEach((item) => item.classList.toggle("active", item.dataset.view === currentView));
  });
  const renderers = {
    patients: renderPatients,
    alerts: renderAlerts,
    plans: renderPlans,
    followups: renderFollowups,
    detail: renderPatientDetail,
    metricDictionary: renderMetricDictionary,
    goalManagement: renderGoalManagement
  };
  renderers[currentView]();
  // Initialise Chart.js charts after glucose tab renders
  if (currentView === "detail" && detailTab === "glucose") {
    setTimeout(() => initGlucoseCharts(selectedPatientId), 50);
  }
  if (currentView === "detail" && detailTab === "copd") {
    setTimeout(() => initCOPDCharts(selectedPatientId), 50);
  }
}

function patientStats() {
  return [
    ["all", "全部患者", state.patients.length, "当前医生授权管理的患者总数。点击后清空快捷筛选。"],
    ["important", "重点关注", state.patients.filter((p) => p.important).length, "医生手动标记为重点关注的患者。"],
    ["riskPending", "疾病风险待确认", state.patients.filter(hasPendingDiseaseRisk).length, "筛查提示疾病风险，但医生尚未确认或驳回。"],
    ["alerts", "待处理预警", state.patients.filter((p) => alertsOf(p.id).some((a) => a.status === "待处理")).length, "存在待医生处理预警的患者。"],
    ["plans", "待确认方案", state.patients.filter((p) => plansOf(p.id).some((plan) => plan.status === "草稿")).length, "存在待医生审核确认方案的患者。"],
    ["followups", "今日待随访", state.patients.filter((p) => followupsOf(p.id).some((f) => ["待随访", "逾期"].includes(f.status))).length, "今天计划随访或已经逾期的患者。"],
    ["missing", "数据缺失", state.patients.filter(hasDataIssue).length, "关键指标缺失或设备同步异常的患者。"]
  ];
}

function hasPendingDiseaseRisk(patient) {
  return Boolean(patient.screening?.pending?.length);
}

function hasDataIssue(patient) {
  return patient.dataStatus.includes("异常") || patient.dataStatus.includes("未同步");
}

function completionValue(patient) {
  return Number(String(patient.analysis?.completeness || "100").replace("%", "")) || 0;
}

function matchesDiseaseRisk(patient, value) {
  if (value === "全部") return true;
  if (value === "草稿") return hasPendingDiseaseRisk(patient);
  const disease = value.replace("风险", "");
  return patient.screening?.risks?.some((risk) => risk.disease === disease);
}

function matchesDisease(patient, value) {
  if (value === "全部") return true;
  if (value === "多病共管") return patient.diseases.length > 1;
  return patient.diseases.includes(value);
}

function matchesTodo(patient, value) {
  if (value === "全部") return true;
  const hasAlert = alertsOf(patient.id).some((a) => a.status === "待处理");
  const hasPlan = plansOf(patient.id).some((plan) => plan.status === "草稿");
  const hasFollowup = followupsOf(patient.id).some((f) => ["待随访", "逾期"].includes(f.status));
  if (value === "有预警") return hasAlert;
  if (value === "待确认方案") return hasPlan;
  if (value === "今日待随访") return hasFollowup;
  if (value === "数据缺失") return hasDataIssue(patient);
  return true;
}

function matchesPlan(patient, value) {
  if (value === "全部") return true;
  const plans = plansOf(patient.id);
  if (value === "无方案") return plans.length === 0;
  if (value === "已下发待患者确认") return plans.some((plan) => plan.status === "已下发待患者确认");
  if (value === "草稿") return plans.some((plan) => plan.status === "草稿");
  return plans.some((plan) => plan.status === value);
}

function matchesFollowup(patient, value) {
  if (value === "全部") return true;
  const followups = followupsOf(patient.id);
  if (value === "无随访") return followups.length === 0;
  if (value === "今日待随访") return followups.some((followup) => ["待随访", "逾期"].includes(followup.status));
  if (value === "逾期随访") return followups.some((followup) => followup.status === "逾期");
  if (value === "近期已随访") return followups.some((followup) => followup.status === "已完成");
  return true;
}

function matchesDataStatus(patient, value) {
  if (value === "全部") return true;
  if (value === "正常") return !hasDataIssue(patient) && completionValue(patient) >= 80;
  if (value === "关键指标缺失") return patient.dataStatus.includes("缺失") || completionValue(patient) < 80;
  if (value === "设备未同步") return patient.dataStatus.includes("未同步");
  if (value === "记录完整率低") return completionValue(patient) < 80;
  return true;
}

function matchesRelation(patient, value) {
  if (value === "全部") return true;
  return patient.relation === value.replace("患者", "");
}

function matchesDeviceStatus(patient, value) {
  if (value === "全部") return true;
  const devices = patient.profile?.devices || [];
  if (value === "关键设备已绑定") return devices.length > 0 && !patient.dataStatus.includes("未同步") && !patient.dataStatus.includes("异常");
  if (value === "关键设备未绑定") return devices.length === 0;
  if (value === "设备同步异常") return patient.dataStatus.includes("未同步") || patient.dataStatus.includes("异常");
  return true;
}

function filteredPatients() {
  const matchers = {
    all: () => true,
    important: (p) => p.important,
    riskPending: (p) => hasPendingDiseaseRisk(p),
    alerts: (p) => alertsOf(p.id).some((a) => a.status === "待处理"),
    plans: (p) => plansOf(p.id).some((plan) => plan.status === "草稿"),
    followups: (p) => followupsOf(p.id).some((f) => ["待随访", "逾期"].includes(f.status)),
    missing: (p) => hasDataIssue(p)
  };
  const query = searchQuery.trim().toLowerCase();
  return state.patients
    .filter(matchers[patientFilter] || matchers.all)
    .filter((patient) => {
      if (!query) return true;
      return [patient.name, patient.id, patient.phone].some((value) => String(value).toLowerCase().includes(query));
    })
    .filter((patient) => {
      if (patientFilters.important === "仅看重点关注" && !patient.important) return false;
      if (patientFilters.risk !== "全部" && patient.riskLevel !== patientFilters.risk) return false;
      if (!matchesDiseaseRisk(patient, patientFilters.diseaseRisk)) return false;
      if (!matchesDisease(patient, patientFilters.disease)) return false;
      if (!matchesTodo(patient, patientFilters.todo)) return false;
      if (!matchesPlan(patient, patientFilters.plan)) return false;
      if (!matchesFollowup(patient, patientFilters.followup)) return false;
      if (!matchesDataStatus(patient, patientFilters.data)) return false;
      if (!matchesRelation(patient, patientFilters.relation)) return false;
      if (!matchesDeviceStatus(patient, patientFilters.device)) return false;
      return true;
    });
}

function resetPage(scope) {
  if (paginationState[scope]) paginationState[scope].page = 1;
}

function getPager(scope, total) {
  const pager = paginationState[scope];
  const pageSize = Number(pager.pageSize) || 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (pager.page > totalPages) pager.page = totalPages;
  if (pager.page < 1) pager.page = 1;
  const start = total ? (pager.page - 1) * pageSize + 1 : 0;
  const end = Math.min(total, pager.page * pageSize);
  return { ...pager, pageSize, totalPages, start, end };
}

function paginateItems(scope, items) {
  const pager = getPager(scope, items.length);
  const startIndex = (pager.page - 1) * pager.pageSize;
  return {
    pager,
    pageItems: items.slice(startIndex, startIndex + pager.pageSize)
  };
}

function pageNumbers(current, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}

function renderPagination(scope, total) {
  const pager = getPager(scope, total);
  return `<div class="pagination" data-pagination="${scope}">
    <span class="page-total">第 ${pager.start}-${pager.end} 条/总共 ${total} 条</span>
    <button class="page-arrow" data-action="page-prev" data-page-scope="${scope}" ${pager.page <= 1 ? "disabled" : ""}>‹</button>
    <div class="page-numbers">
      ${pageNumbers(pager.page, pager.totalPages).map((page) => page === "..."
        ? `<span class="page-ellipsis">...</span>`
        : `<button class="page-number ${pager.page === page ? "active" : ""}" data-action="page-go" data-page-scope="${scope}" data-page="${page}">${page}</button>`).join("")}
    </div>
    <button class="page-arrow" data-action="page-next" data-page-scope="${scope}" ${pager.page >= pager.totalPages ? "disabled" : ""}>›</button>
    <select class="page-size" data-action="page-size" data-page-scope="${scope}">
      ${[10, 20, 50, 100].map((size) => `<option value="${size}" ${pager.pageSize === size ? "selected" : ""}>${size} 条/页</option>`).join("")}
    </select>
    <label class="page-jump">跳至 <input value="${escapeAttr(pager.jump)}" data-action="page-jump-input" data-page-scope="${scope}" inputmode="numeric"> 页</label>
  </div>`;
}

function listTotal(scope) {
  const totals = {
    patients: () => filteredPatients().length,
    alerts: () => state.alerts.length,
    plans: () => filteredPlans().length,
    followups: () => state.followups.length
  };
  return totals[scope]?.() || 0;
}

function renderPatients() {
  const allPatients = filteredPatients();
  const { pageItems: patients } = paginateItems("patients", allPatients);
  const appliedFilters = currentAppliedFilters();
  app.innerHTML = `
    <section class="page-stack">
      <div class="toolbar compact-toolbar">
        <div class="global-search">
          <span>⌕</span>
          <input value="${escapeAttr(searchQuery)}" data-action="patient-search" placeholder="搜索患者姓名 / 患者ID / 手机号">
          ${searchQuery ? `<button data-action="clear-search">清空</button>` : ""}
        </div>
        <div class="toolbar-actions">
          <span class="sync-time">数据更新 16:30</span>
          <button class="btn primary" data-action="add-patient">添加患者</button>
        </div>
      </div>
      <div class="stat-grid with-more">
        ${patientStats().map(([key, label, value, note]) => `
          <button class="stat-card ${patientFilter === key ? "active" : ""}" data-action="filter-patients" data-filter="${key}">
            <span>${label}<i class="help-icon" title="${escapeAttr(note)}">?</i></span><strong>${value}</strong>
          </button>`).join("")}
        <button class="stat-card more-filter-card ${filtersCollapsed ? "" : "active"}" data-action="toggle-filters">
          <span>更多筛选<i class="help-icon" title="展开完整筛选条件，支持疾病、方案、随访、数据和设备状态组合筛选。">?</i></span>
          <strong>${advancedFilterCount()}</strong>
          <small>${filtersCollapsed ? "展开筛选" : "收起筛选"}</small>
        </button>
      </div>
      ${filtersCollapsed ? "" : renderAdvancedFilters()}
      <div class="filter-summary">
        <strong>当前结果：${allPatients.length} 位患者</strong>
        ${appliedFilters.map((item) => `<button class="filter-token" data-action="remove-filter" data-filter-key="${item.key}">${item.label} ×</button>`).join("")}
        ${appliedFilters.length || searchQuery || patientFilter !== "all" ? `<button class="link" data-action="clear-all-filters">清空筛选</button>` : ""}
      </div>
      <section class="layout-list no-side">
        <div class="panel table-panel">
          ${patients.length ? `<table class="table patient-table">
            <thead>
              <tr>
                <th>患者</th>
                <th>疾病标签</th>
                <th>孪生健康分</th>
                <th>待处理事项</th>
                <th>最新动态</th>
                <th>方案/随访</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>${patients.map(patientRow).join("")}</tbody>
          </table>${renderPagination("patients", allPatients.length)}` : `<div class="empty"><strong>暂无匹配患者</strong><p>请调整搜索关键词或清空筛选条件。</p><button class="btn" data-action="clear-all-filters">清空筛选</button></div>`}
        </div>
      </section>
    </section>`;
}

function renderAdvancedFilters() {
  return `<section class="advanced-filter-panel panel">
    <div class="panel-hd">
      <strong>更多筛选</strong>
      <button class="link" data-action="clear-all-filters">清空全部条件</button>
    </div>
    <div class="advanced-filter-grid">
      ${filterBlock("重点关注", "important", ["全部", "仅看重点关注"])}
      ${filterBlock("风险状态", "risk", ["全部", "稳定", "需关注", "需干预"])}
      ${filterBlock("疾病风险", "diseaseRisk", ["全部", "糖尿病风险", "慢阻肺风险", "睡眠呼吸暂停风险", "高血压风险", "待确认"])}
      ${filterBlock("确诊疾病", "disease", ["全部", "糖尿病", "慢阻肺", "睡眠呼吸暂停", "高血压", "多病共管"])}
      ${filterBlock("待处理事项", "todo", ["全部", "有预警", "待确认方案", "今日待随访", "数据缺失"])}
      ${filterBlock("方案状态", "plan", ["全部", "无方案", "草稿", "已下发待患者确认", "执行中", "已驳回", "已停用", "已完成"])}
      ${filterBlock("随访状态", "followup", ["全部", "无随访", "今日待随访", "逾期随访", "近期已随访"])}
      ${filterBlock("数据状态", "data", ["全部", "正常", "关键指标缺失", "设备未同步", "记录完整率低"])}
      ${filterBlock("医患关系", "relation", ["全部", "主责医生患者", "协作医生患者"])}
      ${filterBlock("设备状态", "device", ["全部", "关键设备已绑定", "关键设备未绑定", "设备同步异常"])}
    </div>
  </section>`;
}

function filterBlock(title, key, options) {
  return `<div class="filter-block"><span>${title}</span><div>${options.map((item) => `<button class="chip ${patientFilters[key] === item ? "active" : ""}" data-action="set-filter" data-filter-key="${key}" data-filter-value="${item}">${item}</button>`).join("")}</div></div>`;
}

function advancedFilterCount() {
  return Object.values(patientFilters).filter((value) => value !== "全部").length;
}

function currentAppliedFilters() {
  const filters = [];
  if (patientFilter !== "all") {
    const label = patientStats().find(([key]) => key === patientFilter)?.[1];
    filters.push({ key: "quick", label });
  }
  Object.entries(patientFilters).forEach(([key, value]) => {
    if (value !== "全部") filters.push({ key, label: value });
  });
  if (searchQuery) filters.push({ key: "search", label: `搜索：${searchQuery}` });
  return filters;
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function normalizePlanData() {
  state.plans.forEach((plan) => ensurePlanShape(plan));
  if (!selectedPlanId || !state.plans.some((plan) => plan.id === selectedPlanId)) selectedPlanId = state.plans[0]?.id;
}

function ensurePlanShape(plan) {
  if (plan.status === "需调整") plan.status = "草稿";
  plan.title = plan.title || `${plan.disease || "慢病"}管理方案`;
  plan.source = plan.source || "医生创建";
  plan.version = plan.version || "V1.0";
  plan.period = plan.period || (plan.disease === "睡眠呼吸暂停" ? "14 天" : "30 天");
  plan.targets = plan.targets || [];
  plan.tasks = plan.tasks || [];
  plan.objective = plan.objective || "阶段管理目标待完善";
  plan.updatedAt = plan.updatedAt || nowText();
  plan.modules = plan.modules?.length ? plan.modules : defaultPlanModules(plan);
  plan.modules = plan.modules.filter((module) => !REMOVED_PLAN_MODULES.includes(module.key));
  plan.modules.forEach((module) => {
    const meta = PLAN_MODULE_META[module.key] || {};
    module.name = module.name || meta.name || module.key;
    module.type = meta.type || module.type || "conditional";
    module.patientVisible = module.patientVisible ?? Boolean(meta.visible);
    module.included = module.included ?? module.type === "required";
    module.status = module.status || (module.included ? "completed" : "excluded");
    const defaults = defaultModuleFields(plan, module.key, module.summary);
    module.fields = module.fields?.seedDisease && module.fields.seedDisease !== plan.disease
      ? { ...defaults, patientInstruction: module.fields.patientInstruction || defaults.patientInstruction }
      : { ...defaults, ...(module.fields || {}), seedDisease: plan.disease };
    if (module.key === "metrics" && (module.fields.rows || []).some((row) => ["<", ">", "<=", ">=", "="].includes(String(row).split("|")[1]))) {
      module.fields.rows = defaults.rows;
    }
    normalizeModuleConfig(plan, module);
    if (module.patientVisible) module.fields.patientInstruction = compilePatientInstruction(module);
  });
  plan.taskRules = generatePlanTaskRules(plan);
  plan.patientPreview = plan.patientPreview || buildPatientPreview(plan);
  plan.changeLogs = plan.changeLogs || [{ time: plan.updatedAt, text: `${plan.source}创建方案` }];
  return plan;
}

function normalizeModuleConfig(plan, module) {
  if (module.key === "basic") {
    module.fields.diseases = normalizeDiseases(module.fields.diseases || plan.diseases || [plan.disease]);
    module.fields.planName = module.fields.planName || plan.title;
    module.fields.periodDays = Number(module.fields.periodDays || String(plan.period || "").match(/\d+/)?.[0] || 30);
    module.fields.startDate = module.fields.startDate || "";
  }
  if (module.key === "metrics" && !module.fields.metricItems) {
    module.fields.metricItems = (module.fields.rows || []).map(metricRowToConfig);
  }
  if (module.key === "alerts" && !module.fields.alertRules) {
    module.fields.alertRules = (module.fields.rows || []).map(alertRowToConfig);
  }
  if (module.key === "followup" && !module.fields.followupRule) {
    module.fields.followupRule = followupRowsToRule(module.fields.rows || [], plan);
  }
  if (module.key === "device" && !module.fields.deviceItems) {
    module.fields.deviceItems = (module.fields.rows || []).map(deviceRowToConfig);
  }
  if (module.key === "device" && module.fields.deviceItems) {
    module.fields.deviceItems.forEach((item) => {
      item.deviceType = Array.isArray(item.deviceType) ? item.deviceType : splitList(item.deviceType);
      item.recommendBind = item.recommendBind !== false;
      item.patientInstruction = item.patientInstruction || "";
    });
  }
}

function metricRowToConfig(row) {
  const [metricName = "核心指标", targetRange = "按医嘱目标", frequency = "每日", dataSource = "手动记录", taskTitle = "患者按方案记录"] = String(row).split("|");
  return {
    metricCode: metricCodeOf(metricName),
    metricName,
    scenes: metricScenes(metricName),
    frequency,
    timeWindow: defaultTimeWindow(metricName, frequency),
    dataSources: dataSource.split("/"),
    targetRange,
    generateTodo: true,
    allowBackfill: true,
    allowUnableFeedback: true,
    taskGroup: taskGroupOf(metricName, frequency),
    priority: "普通",
    patientInstruction: taskTitle
  };
}

function normalizeDiseases(value) {
  const raw = Array.isArray(value) ? value : splitList(value);
  const normalized = raw.map((item) => item === "睡眠呼吸暂停" ? "睡眠呼吸障碍" : item).filter(Boolean);
  return normalized.length ? [...new Set(normalized)] : [...PLAN_DISEASE_OPTIONS];
}

function alertRowToConfig(row) {
  const [metricName = "核心指标", condition = "连续异常", patientAction = "提醒复测", level = "重要预警"] = String(row).split("|");
  const parsed = parseCondition(condition);
  return {
    metricCode: metricCodeOf(metricName),
    metricName,
    operator: parsed.operator,
    threshold: parsed.threshold,
    duration: parsed.duration,
    alertLevel: level.includes("紧急") ? "紧急" : level.includes("重要") ? "重要" : "一般",
    patientActions: patientAction.includes("症状") ? ["复测", "记录症状"] : ["复测"],
    doctorActions: ["查看详情", patientAction.includes("随访") ? "创建随访" : "关闭预警"],
    generateFollowupSuggestion: level.includes("重要") || level.includes("紧急"),
    enabled: true
  };
}

function deviceRowToConfig(row) {
  const [deviceType = "", bindText = "推荐绑定", patientInstruction = ""] = String(row).split("|");
  return {
    deviceType: splitList(deviceType),
    recommendBind: bindText !== "可选",
    patientInstruction
  };
}

function deviceTypeText(deviceType) {
  if (Array.isArray(deviceType)) return deviceType.join("、");
  return String(deviceType || "");
}

function followupRowsToRule(rows, plan) {
  const first = rows[0]?.split("|") || [];
  return {
    firstFollowupAfterDays: Number(String(first[1] || "").match(/\d+/)?.[0] || 7),
    frequencyRule: plan?.period === "14 天" ? "每 2 周" : "每月",
    methods: ["小程序问卷", "电话"],
    focusItems: ["指标达标", "症状变化", "用药依从性", "设备同步"],
    prepareItems: ["近 7 天记录", "症状反馈", plan?.disease?.includes("睡眠") ? "睡眠报告" : "用药记录"].filter(Boolean),
    scheduleFollowup: true,
    patientInstruction: "请在随访前补齐近期记录和症状反馈。"
  };
}

function defaultPlanModules(plan) {
  const patient = patientById(plan.patientId);
  const disease = plan.disease || patient?.diseases?.[0] || "慢病";
  const hasSleep = disease.includes("睡眠") || plan.targets.some((item) => /AHI|ODI|CPAP|最低血氧|睡眠/.test(item));
  const hasMedication = Boolean(patient?.profile?.medication?.length);
  const hasDevice = Boolean(patient?.profile?.devices?.length) || hasSleep;
  const symptoms = disease.includes("慢阻肺") ? "咳嗽、痰量、气促、胸闷等症状变化需及时记录。" : disease.includes("睡眠") ? "憋醒、晨起头痛、白天嗜睡、鼾声明显加重时记录症状。" : "出现头晕、心悸、乏力、低血糖疑似症状时记录症状。";
  return [
    moduleTemplate("basic", true, `${patientName(plan.patientId)} / ${disease} / ${plan.period}，来源：${plan.source}。`, plan),
    moduleTemplate("goals", true, plan.objective, plan),
    moduleTemplate("metrics", true, (plan.targets || []).join("；") || `${disease}核心指标按医嘱记录。`, plan),
    moduleTemplate("symptoms", true, symptoms, plan),
    moduleTemplate("medication", hasMedication, hasMedication ? `${patient.profile.medication.join("；")}。患者端仅作为用药提醒和执行记录，不涉及处方开具。` : "未启用用药方案。", plan),
    moduleTemplate("device", hasDevice, hasDevice ? `${patient?.profile?.devices?.join("；") || "关键设备"}保持绑定和同步，设备异常时提醒患者重新同步。` : "未启用设备监测。", plan),
    moduleTemplate("lifestyle", true, disease.includes("糖尿病") ? "控制晚餐主食与含糖饮料，记录饮食备注。" : disease.includes("慢阻肺") ? "避免烟尘刺激，按耐受程度进行低强度活动。" : "规律作息，睡前避免饮酒和镇静类用药。", plan),
    moduleTemplate("alerts", true, "使用全局预警规则，必要时可启用个体化预警。", plan),
    moduleTemplate("followup", true, `${plan.period}内至少 1 次计划随访；出现预警后可发起临时随访。`, plan)
  ];
}

function moduleTemplate(key, included, summary, plan = null) {
  const meta = PLAN_MODULE_META[key];
  return {
    key,
    name: meta.name,
    type: meta.type,
    included,
    status: included ? "completed" : "excluded",
    patientVisible: meta.visible,
    summary,
    recommendationReason: included ? "" : "本次方案未启用该模块。",
    fields: { ...defaultModuleFields(plan, key, summary), patientInstruction: summary }
  };
}

function defaultModuleFields(plan, key, summary = "") {
  const disease = plan?.disease || "慢病";
  const patient = plan ? patientById(plan.patientId) : null;
  const targetRows = (plan?.targets || defaultTargets(disease)).map((item) => {
    const [name, range] = parseTargetText(item);
    return `${name || item}|${range}|${metricFrequency(disease, item)}|${metricSource(disease, item)}|患者按方案记录或设备自动同步`;
  });
  const medicationRows = (patient?.profile?.medication || ["二甲双胍 0.5g bid"]).map((item) => `${item}|按原方案提醒|患者记录已用/未用|不涉及处方开具`);
  const deviceRows = (patient?.profile?.devices || (disease.includes("睡眠") ? ["睡眠监测仪", "CPAP"] : ["血氧仪"])).map((item) => `${item}|推荐绑定|`);
  const defaults = {
    basic: {
      seedDisease: disease,
      rows: [`方案名称|${plan?.title || "慢病管理方案草稿"}`, `适用疾病|${disease}`, `管理周期|${plan?.period || "30 天"}`, `生成来源|${plan?.source || "医生创建"}`, `复盘方式|到期自动进入待复盘`],
      patientInstruction: summary
    },
    goals: {
      seedDisease: disease,
      stageGoal: plan?.objective || summary,
      targets: plan?.targets || defaultTargets(disease),
      patientInstruction: summary
    },
    metrics: {
      seedDisease: disease,
      rows: targetRows,
      note: "设备可采集的数据优先自动同步，无法采集或需要场景备注的数据支持患者手动记录。",
      patientInstruction: "请按医生设置的时间和场景完成指标记录，设备数据会自动同步。"
    },
    symptoms: {
      seedDisease: disease,
      rows: symptomOptions(disease).map((item) => `${item}|出现时记录|严重程度、持续时间、诱因/备注|支持关联当次指标`),
      patientInstruction: "出现不适时记录症状、持续时间和备注，便于医生判断指标异常原因。"
    },
    medication: {
      seedDisease: disease,
      rows: medicationRows,
      patientInstruction: "请按提醒记录用药执行情况，如漏服或不适请备注。"
    },
    device: {
      seedDisease: disease,
      rows: deviceRows,
      patientInstruction: ""
    },
    lifestyle: {
      seedDisease: disease,
      rows: lifestyleAdvice(disease).map((item) => `${item}|每日/每周执行|患者备注完成情况|医生随访时复盘`),
      patientInstruction: "请按生活方式建议执行，并在异常或未完成时备注原因。"
    },
    alerts: {
      seedDisease: disease,
      rows: alertRuleConfigs(disease),
      useGlobalRules: true,
      patientInstruction: "指标或设备数据异常时，系统会提示复测、补充症状或等待医生处理。"
    },
    followup: {
      seedDisease: disease,
      rows: [`计划随访|${plan?.period || "30 天"}内至少 1 次|方案执行情况、指标完整性、患者反馈|系统生成待随访`, "临时随访|预警处理后|异常原因、症状变化、是否调整方案|医生主动发起"],
      patientInstruction: "请按随访提醒配合医生完成反馈。"
    }
  };
  return defaults[key] || { patientInstruction: summary };
}

function parseTargetText(item) {
  const operatorMatch = String(item).match(/^(.+?)\s+([<>]=?|=|>=|<=).+$/);
  if (operatorMatch) return [operatorMatch[1], String(item).slice(operatorMatch[1].length).trim()];
  const numberMatch = String(item).match(/^(.+?)\s+(\d.*)$/);
  if (numberMatch) return [numberMatch[1], numberMatch[2]];
  return [item, "按医嘱目标"];
}

function metricCodeOf(name) {
  if (/血糖/.test(name)) return "blood_glucose";
  if (/血压/.test(name)) return "blood_pressure";
  if (/SpO2|血氧|最低血氧/.test(name)) return "spo2";
  if (/呼吸/.test(name)) return "respiratory_rate";
  if (/AHI/.test(name)) return "ahi";
  if (/CPAP/.test(name)) return "cpap_usage";
  if (/体重|BMI/.test(name)) return "weight";
  return "custom_metric";
}

function normalizeMetricName(name) {
  if (/血糖/.test(name)) return "血糖";
  if (/血压/.test(name)) return "血压";
  if (/SpO2|血氧/.test(name)) return "SpO2";
  if (/呼吸/.test(name)) return "呼吸频率";
  if (/体重|BMI/.test(name)) return "体重";
  if (/睡眠|AHI|CPAP/.test(name)) return "睡眠报告";
  return name || "血糖";
}

function metricScenes(name) {
  const normalized = normalizeMetricName(name);
  if (METRIC_SCENE_OPTIONS[normalized]) return METRIC_SCENE_OPTIONS[normalized];
  return ["默认"];
}

function defaultTimeWindow(name, frequency) {
  if (/空腹|晨起|血压/.test(name)) return "06:00-09:00";
  if (/睡前/.test(name)) return "21:00-23:00";
  if (/睡眠|AHI|CPAP/.test(name) || frequency.includes("夜间")) return "睡眠后自动同步";
  return "";
}

function planMetricConfig(disease) {
  if (disease.includes("糖尿病")) {
    return [metricRowToConfig("血糖|4.4-7.0 mmol/L|每日|手动记录/设备采集|按时完成血糖记录")];
  }
  if (disease.includes("高血压")) {
    return [metricRowToConfig("血压|< 135/85 mmHg|每日|手动记录/设备采集|按时完成血压记录")];
  }
  if (disease.includes("慢阻肺")) {
    return [metricRowToConfig("SpO2|>= 92%|每日|手动记录/设备采集|按时完成血氧记录"), metricRowToConfig("呼吸频率|12-20 次/分|每日|手动记录|按时记录呼吸频率")];
  }
  if (disease.includes("睡眠")) {
    return [metricRowToConfig("睡眠报告|按设备报告|每日|设备采集|起床后同步睡眠报告")];
  }
  return [metricRowToConfig("体重|按医嘱目标|每日|手动记录|按时记录体重")];
}

function taskGroupOf(name, frequency) {
  if (/空腹|晨起|血压/.test(name)) return "晨间测量";
  if (/睡前/.test(name)) return "睡前测量";
  if (/睡眠|AHI|CPAP|夜间/.test(name) || frequency.includes("夜间")) return "睡眠监测";
  return "日常记录";
}

function parseCondition(condition) {
  const text = String(condition);
  const operator = text.includes("<=") ? "<=" : text.includes(">=") ? ">=" : text.includes("<") ? "<" : text.includes(">") ? ">" : "连续异常";
  return {
    operator,
    threshold: text.match(/[<>]=?\s*([^，； ]+)/)?.[1] || text.match(/\d+(\.\d+)?%?/)?.[0] || "",
    duration: text.includes("连续") ? text.match(/连续\s*(\d+)/)?.[1] || "2" : text.includes("持续") ? text.match(/持续\s*(\d+)/)?.[1] || "10" : ""
  };
}

function planVersionNumber(plan) {
  const matched = String(plan.version || "V1.0").match(/V?(\d+(?:\.\d+)?)/i);
  return matched ? Number(matched[1]) : 1;
}

function nextPlanVersion(plan) {
  return `V${Math.floor(planVersionNumber(plan)) + 1}.0`;
}

function generatePlanTaskRules(plan) {
  const rules = [];
  const version = planVersionNumber(plan);
  const pushRule = (rule) => rules.push({
    id: rule.id || uid("TR"),
    sourceType: "management_plan",
    sourceModule: rule.sourceModule,
    relatedPlanId: plan.id,
    planVersion: version,
    diseaseCodes: [plan.disease],
    allowUnableFeedback: rule.allowUnableFeedback ?? true,
    allowBackfill: rule.allowBackfill ?? true,
    status: "active",
    ...rule
  });
  plan.modules.forEach((module) => {
    if (!module.included) return;
    if (module.key === "metrics") {
      (module.fields.metricItems || []).forEach((item) => pushRule({
        sourceModule: "指标测量方案",
        taskType: metricCodeOf(item.metricName) === "cpap_usage" ? "CPAP 任务" : "指标记录",
        title: `${item.taskGroup || "记录"}：${item.metricName}`,
        patientInstruction: item.patientInstruction,
        scheduleRule: { frequency: item.frequency, timeWindow: item.timeWindow },
        taskPayload: { metricCode: item.metricCode, metricName: item.metricName, scenes: item.scenes, targetRange: item.targetRange, dataSources: item.dataSources },
        taskGroup: item.taskGroup,
        mergeKey: `${item.taskGroup || "metric"}_${item.timeWindow || "any"}`,
        priority: item.priority
      }));
    }
    if (module.key === "symptoms") {
      (module.fields.rows || []).slice(0, 3).forEach((row) => {
        const [symptom, frequency, fields, action] = row.split("|");
        pushRule({
          sourceModule: "症状记录方案",
          taskType: "症状评估",
          title: `记录症状：${symptom}`,
          patientInstruction: module.fields.patientInstruction,
          scheduleRule: { frequency },
          taskPayload: { symptom, requiredFields: fields, triggerAction: action },
          taskGroup: "症状反馈",
          mergeKey: "symptom_record",
          priority: "普通"
        });
      });
    }
    if (module.key === "medication") {
      (module.fields.rows || []).forEach((row) => {
        const [drug, reminder, patientRecord, note] = row.split("|");
        pushRule({
          sourceModule: "用药方案",
          taskType: "用药/治疗执行",
          title: `用药提醒：${drug}`,
          patientInstruction: module.fields.patientInstruction,
          scheduleRule: { frequency: reminder, timeWindow: "按用药时间" },
          taskPayload: { drugName: drug, patientRecord, note, isKeyMedication: true },
          taskGroup: "用药提醒",
          mergeKey: "medication",
          priority: "重要"
        });
      });
    }
    if (module.key === "device") {
      (module.fields.deviceItems || []).forEach((item) => {
        const deviceType = deviceTypeText(item.deviceType) || "设备";
        pushRule({
          sourceModule: "设备监测方案",
          taskType: /CPAP|睡眠/.test(deviceType) ? "睡眠报告" : "设备任务",
          title: `设备同步：${deviceType}`,
          patientInstruction: item.patientInstruction || module.fields.patientInstruction,
          scheduleRule: { frequency: "按设备要求" },
          taskPayload: { deviceType, recommendBind: item.recommendBind },
          taskGroup: "设备同步",
          mergeKey: "device_sync",
          priority: "重要"
        });
      });
    }
    if (module.key === "lifestyle") {
      (module.fields.rows || []).forEach((row) => {
        const [content, frequency, feedback, review] = row.split("|");
        pushRule({
          sourceModule: "生活方式方案",
          taskType: "生活方式",
          title: content,
          patientInstruction: module.fields.patientInstruction,
          scheduleRule: { frequency },
          taskPayload: { content, feedback, review },
          taskGroup: "生活方式",
          mergeKey: "lifestyle",
          priority: "普通"
        });
      });
    }
    if (module.key === "followup") {
      const rule = module.fields.followupRule;
      if (rule?.scheduleFollowup !== false) pushRule({
        sourceModule: "随访计划",
        taskType: "随访准备",
        title: `随访准备：${rule.firstFollowupAfterDays} 天后首次随访`,
        patientInstruction: module.fields.patientInstruction,
        scheduleRule: { frequency: rule.frequencyRule, firstAfterDays: rule.firstFollowupAfterDays },
        taskPayload: { methods: rule.methods, focusItems: rule.focusItems, prepareItems: rule.prepareItems },
        taskGroup: "随访准备",
        mergeKey: "followup_prepare",
        priority: "重要"
      });
    }
  });
  return rules;
}

function metricFrequency(disease, item) {
  if (disease.includes("糖尿病") && item.includes("餐后")) return "每周 2 天";
  return "每日";
}

function metricSource(disease, item) {
  if (/CPAP|AHI|最低血氧|睡眠/.test(item)) return "设备采集";
  if (/SpO2|血氧/.test(item)) return "设备采集/手动录入";
  return disease.includes("糖尿病") || disease.includes("高血压") ? "手动录入/设备采集" : "手动录入";
}

function symptomOptions(disease) {
  if (disease.includes("睡眠")) return ["憋醒", "晨起头痛", "白天嗜睡", "鼾声加重"];
  if (disease.includes("慢阻肺")) return ["咳嗽加重", "痰量/痰色变化", "气促", "胸闷"];
  if (disease.includes("糖尿病")) return ["心慌", "出汗", "乏力", "头晕"];
  if (disease.includes("高血压")) return ["头痛", "头晕", "胸闷", "心悸"];
  return ["不适症状", "疼痛", "乏力"];
}

function lifestyleAdvice(disease) {
  if (disease.includes("糖尿病")) return ["控制晚餐主食", "记录饮食备注", "保持规律活动"];
  if (disease.includes("慢阻肺")) return ["避免烟尘刺激", "低强度呼吸训练", "观察活动后气促"];
  if (disease.includes("睡眠")) return ["规律作息", "侧卧睡眠", "睡前避免饮酒"];
  if (disease.includes("高血压")) return ["低盐饮食", "规律测压", "保持适度运动"];
  return ["规律作息", "合理饮食", "适度活动"];
}

function alertRuleConfigs(disease) {
  if (disease.includes("睡眠")) return ["最低血氧|< 90% 或连续下降|提醒复测并补充症状|重要预警", "AHI|>= 15 次/小时|建议医生复核睡眠报告|重要预警", "CPAP 使用|< 4 小时/晚|提醒依从性并纳入随访|提醒"];
  if (disease.includes("糖尿病")) return ["空腹血糖|连续 2 次高于目标|提醒复测并记录饮食/用药|重要预警", "餐后 2h 血糖|> 10.0 mmol/L|提醒记录饮食备注|提醒", "疑似低血糖症状|患者主动记录|提示及时处理并通知医生|重要预警"];
  if (disease.includes("慢阻肺")) return ["SpO2|低于目标或连续下降|提醒复测并补充气促症状|重要预警", "呼吸频率|< 12 或 > 20 次/分|提示复测并关注急性加重|提醒", "症状加重|咳痰气促加重|进入待随访队列|重要预警"];
  if (disease.includes("高血压")) return ["血压|连续高于目标|提醒复测并记录症状|重要预警", "症状|头痛/胸闷/心悸|提示线下就医风险提醒|重要预警"];
  return ["核心指标|连续异常|提醒复测并进入医生待处理|提醒"];
}

function planAlertRules(disease) {
  if (disease.includes("睡眠")) return ["最低血氧 < 90% 或 AHI 升高触发预警", "CPAP 使用 < 4 小时/晚触发依从性提醒"];
  if (disease.includes("糖尿病")) return ["空腹血糖连续高于目标触发预警", "疑似低血糖症状需提醒患者复测"];
  if (disease.includes("慢阻肺")) return ["SpO2 低于目标或呼吸频率异常触发预警", "咳嗽痰量气促加重触发急性加重风险提醒"];
  if (disease.includes("高血压")) return ["血压连续高于目标触发预警", "头晕胸闷等症状需提醒复测"];
  return ["核心指标连续异常触发预警"];
}

function planModule(plan, key) {
  return ensurePlanShape(plan).modules.find((module) => module.key === key);
}

function validatePlan(plan) {
  ensurePlanShape(plan);
  const warnings = [];
  const required = plan.modules.filter((module) => module.type === "required");
  required.forEach((module) => {
    if (!module.included) warnings.push({ level: "error", moduleKey: module.key, message: `${module.name}为必填模块，不能关闭。` });
    if (!String(module.summary || "").trim()) warnings.push({ level: "error", moduleKey: module.key, message: `请补充${module.name}。` });
  });
  plan.modules.filter((module) => module.type === "conditional" && module.included).forEach((module) => {
    if (!String(module.summary || "").trim()) warnings.push({ level: "error", moduleKey: module.key, message: `已启用${module.name}，请补充执行内容。` });
  });
  // Rule 1: Basic info completeness
  const basicModule = planModule(plan, "basic");
  if (basicModule?.included) {
    const f = basicModule.fields || {};
    if (!f.planName && !plan.title?.trim()) warnings.push({ level: "error", moduleKey: "basic", message: "方案名称不能为空。" });
    if (!(f.diseases?.length || plan.disease?.trim())) warnings.push({ level: "error", moduleKey: "basic", message: "请选择适用疾病。" });
    if (!f.startDate) warnings.push({ level: "warning", moduleKey: "basic", message: "建议设置方案开始日期。" });
  }
  // Rule 2: Management goals
  const goalsModule = planModule(plan, "goals");
  if (goalsModule?.included && (!goalsModule.fields?.stageGoal?.trim() && !goalsModule.fields?.targets?.length)) {
    warnings.push({ level: "error", moduleKey: "goals", message: "管理目标需填写阶段目标或量化目标。" });
  }
  // Rule 3: At least 1 key metric measurement
  const metricModule = planModule(plan, "metrics");
  if (!metricModule?.fields?.metricItems?.length) warnings.push({ level: "error", moduleKey: "metrics", message: "请至少配置 1 个关键指标测量规则。" });
  // Rule 4: Followup plan completeness
  const followRule = planModule(plan, "followup")?.fields?.followupRule;
  if (followRule?.scheduleFollowup !== false && !followRule?.firstFollowupAfterDays) warnings.push({ level: "error", moduleKey: "followup", message: "请设置首次随访时间，或关闭随访安排。" });
  // Rule 5: Conditional modules internal field completeness
  plan.modules.filter((module) => module.type === "conditional" && module.included).forEach((module) => {
    if (module.key === "medication" && !module.fields?.medicationItems?.length) warnings.push({ level: "warning", moduleKey: module.key, message: `${module.name}已启用但未添加药品，建议配置。` });
    if (module.key === "device" && !module.fields?.deviceItems?.length) warnings.push({ level: "warning", moduleKey: module.key, message: `${module.name}已启用但未添加设备，建议配置。` });
  });
  // Rule 6: Device/medication dependency check
  const deviceDependent = plan.targets.some((item) => /AHI|ODI|CPAP|最低血氧|睡眠报告/.test(item));
  if (deviceDependent && !planModule(plan, "device")?.included) {
    warnings.push({ level: "warning", moduleKey: "device", message: "方案包含睡眠/低氧设备指标，建议启用设备监测方案。" });
  }
  const hasCriticalMed = planModule(plan, "medication")?.fields?.medicationItems?.some((m) => m.isCritical);
  if (hasCriticalMed && !planModule(plan, "medication")?.fields?.medicationItems?.some((m) => m.timing?.length)) {
    warnings.push({ level: "warning", moduleKey: "medication", message: "关键用药建议配置服用时间提醒。" });
  }
  const completed = required.filter((module) => module.included && String(module.summary || "").trim()).length;
  return {
    canPublish: warnings.every((item) => item.level !== "error"),
    requiredCompleted: completed,
    requiredTotal: required.length,
    warnings
  };
}

function filteredPlans() {
  const query = planSearchQuery.trim().toLowerCase();
  return state.plans
    .map((plan) => ensurePlanShape(plan))
    .filter((plan) => planStatusFilter === "全部" || plan.status === planStatusFilter)
    .filter((plan) => planTagFilter === "全部" || planReminderTags(plan).includes(planTagFilter))
    .filter((plan) => planSourceMatches(plan, planSourceFilter))
    .filter((plan) => {
      if (planDiseaseFilter === "全部") return true;
      const diseases = plan.diseases || [plan.disease];
      if (planDiseaseFilter === "多病共管") return diseases.length > 1;
      return diseases.includes(planDiseaseFilter) || (planDiseaseFilter === "睡眠呼吸障碍" && diseases.some((item) => /睡眠/.test(item)));
    })
    .filter((plan) => {
      if (!query) return true;
      const patient = patientById(plan.patientId);
      return [plan.title, plan.id, plan.disease, patient?.name, patient?.id, patient?.phone]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
}

function planSourceMatches(plan, filter) {
  if (filter === "全部") return true;
  const source = String(plan.source || "");
  const map = {
    系统草稿: /系统.*草稿|系统推荐/,
    医生创建: /医生创建|空白创建/,
    模板创建: /模板/,
    历史复制: /复制|历史/,
    随访调整: /随访.*调整/,
    预警调整: /预警.*调整/
  };
  return map[filter]?.test(source) || source.includes(filter);
}

function planReminderTags(plan) {
  const tags = [...(plan.statusTags || [])];
  if (plan.status === "已下发待患者确认") tags.push("患者未确认");
  return [...new Set(tags)];
}

function buildPatientPreview(plan) {
  const followup = plan.modules.find((module) => module.key === "followup");
  const alerts = plan.modules.find((module) => module.key === "alerts");
  return {
    title: plan.title,
    objective: plan.objective,
    visibleModules: plan.modules.filter((module) => module.included && module.patientVisible).map((module) => module.name),
    dailyTasks: (plan.taskRules || []).filter((rule) => rule.taskType !== "确认阅读").slice(0, 6).map((rule) => `${rule.title}（${rule.scheduleRule?.frequency || "按方案"}）`),
    followup: followup?.summary || "按医生设置时间完成随访",
    abnormalTips: alerts?.summary || "异常情况请按页面提示处理"
  };
}

function patientRow(patient) {
  const pendingAlerts = alertsOf(patient.id).filter((item) => item.status === "待处理");
  const pendingPlans = plansOf(patient.id).filter((item) => item.status === "草稿");
  const pendingFollowups = followupsOf(patient.id).filter((item) => ["待随访", "逾期"].includes(item.status));
  const currentPlan = plansOf(patient.id).find((item) => item.id === patient.activePlanId);
  const nextFollow = followupsOf(patient.id).find((item) => item.id === patient.nextFollowupId);
  const hasMore = pendingAlerts.length || pendingPlans.length || pendingFollowups.length || hasPendingDiseaseRisk(patient) || hasDataIssue(patient);
  const trendArrow = patient.riskChange > 0 ? `<span class="trend-up">↑</span>` : patient.riskChange < 0 ? `<span class="trend-down">↓</span>` : `<span class="trend-flat">—</span>`;
  return `<tr>
    <td>
      <div class="patient-cell">
        <button class="star ${patient.important ? "on" : ""}" data-action="toggle-important" data-patient="${patient.id}">${patient.important ? "★" : "☆"}</button>
        <div><strong>${patient.name}</strong><small>${patient.sex} ${patient.age}岁 | ${patient.phone}<br>${patient.relation} | ${patient.bindAt}</small></div>
      </div>
    </td>
    <td>
      ${patient.screening.confirmed.map((item) => tag(item, "muted")).join("")}
      ${patient.screening.pending.map((item) => tag(`${item}待确认`, "orange")).join("")}
    </td>
    <td><div class="score-line"><b>${patient.riskScore}</b>${trendArrow}${tag(patient.riskLevel, toneOf(patient.riskLevel))}</div></td>
    <td>
      ${pendingAlerts.length ? tag(`${pendingAlerts.length} 个预警`, "red") : ""}
      ${hasPendingDiseaseRisk(patient) ? tag("疾病待确认", "orange") : ""}
      ${pendingPlans.length ? tag("待确认方案", "orange") : ""}
      ${pendingFollowups.length ? tag("待随访", "blue") : ""}
      ${patient.dataStatus !== "正常" ? tag(patient.dataStatus, "orange") : tag("无待办", "green")}
    </td>
    <td>${patient.latest}</td>
    <td><small>${currentPlan?.status || "无方案"}<br>${nextFollow ? `${nextFollow.dueAt} ${nextFollow.status}` : "暂无随访"}</small></td>
    <td>
      <div class="row-actions">
        <button class="btn primary" data-action="view-patient" data-patient="${patient.id}">查看详情</button>
        ${hasMore ? `<button class="btn" data-action="open-more" data-patient="${patient.id}">更多</button>` : ""}
      </div>
    </td>
  </tr>`;
}

function renderPatientDetail() {
  const patient = patientById(selectedPatientId) || state.patients[0];
  const tabs = [
    ["overview", "总览"],
    ["profile", "健康档案"],
    ["screening", "健康筛查"],
    ...(hasTwinSupportedDisease(patient) ? [["digital-twin", "数字孪生融合分析"]] : []),
    ...(hasDiabetes(patient) ? [["glucose", "血糖深度分析"]] : []),
    ...(hasSleepBreathingDisorder(patient) ? [["analysis", "睡眠深度分析"]] : []),
    ...(hasCOPD(patient) ? [["copd", "慢阻肺深度分析"]] : []),
    ["alerts", "预警记录"],
    ["plans", "管理方案"],
    ["followups", "随访记录"],
    ["timeline", "时间轴"],
    ["advice", "医生建议"]
  ];
  app.innerHTML = `
    <section class="patient-detail">
      <button class="back-link" data-view-link="patients">返回患者管理</button>
      <div class="patient-hero">
        <div>
          <h2>${patient.name}</h2>
          <p>${patient.sex} ${patient.age}岁 | ${patient.phone} | ${patient.relation} | 绑定 ${patient.bindAt}</p>
          <div class="tag-row">${patient.diseases.map((item) => tag(item, "muted")).join("")}${tag(patient.riskLevel, toneOf(patient.riskLevel))}${patient.important ? tag("重点关注", "orange") : ""}</div>
        </div>
        <div class="hero-score"><strong>${patient.riskScore}</strong><span>孪生健康分</span></div>
        <div class="hero-actions">
          <button class="btn primary" data-action="quick-primary" data-patient="${patient.id}">优先处理</button>
          <button class="btn" data-action="send-advice" data-patient="${patient.id}">发送医生建议</button>
          <button class="btn" data-action="open-recheck-drawer" data-patient="${patient.id}">复测指标</button>
          <button class="btn" data-action="open-followup-drawer" data-patient="${patient.id}">创建随访</button>
        </div>
      </div>
      <nav class="detail-tabs">
        ${tabs.map(([key, label]) => `<button class="${detailTab === key ? "active" : ""}" data-action="detail-tab" data-tab="${key}">${label}</button>`).join("")}
      </nav>
      <div class="detail-content">${renderDetailTab(patient)}</div>
    </section>`;
}

function renderDetailTab(patient) {
  const map = {
    overview: renderOverview,
    profile: renderProfile,
    screening: renderScreening,
    "digital-twin": renderDigitalTwin,
    glucose: renderGlucoseAnalysis,
    analysis: renderAnalysis,
    copd: renderCOPDAnalysis,
    alerts: renderPatientAlerts,
    plans: renderPatientPlans,
    followups: renderPatientFollowups,
    timeline: renderTimeline,
    advice: renderAdvice
  };
  return map[detailTab](patient);
}


/* ============================================================
   血糖深度分析 — 数据 & 渲染（设计稿高保真还原）
   ============================================================ */

function getGlucoseData(patient) {
  if (patient.id === "P001") {
    return {
      hasCGM: true, hasFingertip: true,
      deviceBrand: "雅培 FreeStyle Libre 3",
      deviceUpdated: "2026-05-22 08:32",
      cgm: {
        tir:        { value: 68,    unit: "%",       state: "orange", label: "轻度不达标", tip: "近14天监测",  goal: "≥ 70%" },
        avgGlucose: { value: "8.2", unit: "mmol/L",  state: "orange", label: "偏高",       tip: "近14天均值", goal: "< 7.8 mmol/L" },
        cv:         { value: 38,    unit: "%",        state: "orange", label: "波动偏大",   tip: "近14天稳定性", goal: "< 36%" },
        tar:        { value: 6,     tarTbr: { tar1: 6, tar2: 3, tir: 68, tbr1: 20, tbr2: 3 }, state: "red", label: "重度高糖超标", tip: "近14天监测" },
        eA1c:       { value: "7.5", unit: "%",        state: "red",    label: "控制不佳",   tip: "14天算法估算", goal: "< 7.0%" }
      },
      fingertip: {
        fasting:  { value: "6.8",  unit: "mmol/L", state: "orange", label: "偏高",   tip: "近14天均值",   goal: "< 6.1 mmol/L" },
        pp2h:     { value: "10.2", unit: "mmol/L", state: "red",    label: "超标",   tip: "近14天均值",   goal: "< 7.8 mmol/L" },
        reach:    { value: 65,     unit: "%",       state: "orange", label: "不达标", tip: "近14天达标率", goal: "≥ 70%" },
        maxHigh:  { value: "15.6", unit: "mmol/L", state: "red",    label: "危险高值", tip: "记录于 01-12 20:30", goal: "晚餐后2h" },
        hypo:     { value: 3,      unit: "次/周",   state: "orange", label: "偏高",   tip: "近14天共 9 次",goal: "< 1次/周" }
      },
      aiCards: [
        { seq:"01", ico:"orange", title:"血糖波动性分析",
          body:'患者近14天血糖波动明显，<span class="g-tag g-tag-orange" style="display:inline;padding:1px 6px;font-size:12px;">CV偏高</span> 38%（目标&lt;36%），夜间02:00–04:00频繁出现<span class="g-tag g-tag-red" style="display:inline;padding:1px 6px;font-size:12px;">黎明现象</span>，晨起血糖普遍高于目标范围，提示需关注基础胰岛素时效覆盖。',
          tags: [["orange","CV偏高"],["red","黎明现象"],["orange","夜间波动大"]]
        },
        { seq:"02", ico:"red", title:"低血糖风险评估", badge:["orange","中等风险"],
          body:'过去14天出现低血糖（&lt;3.9 mmol/L）事件 <strong>23次</strong>，其中夜间（00:00–06:00）占 <strong>61%</strong>。TBR达23%，高于安全阈值4%。建议晚餐后调整基础胰岛素用量，设置夜间低血糖警报。',
          riskMeter: ["#52C41A","#FA8C16","#F0F0F0"]
        },
        { seq:"03", ico:"purple", title:"餐后血糖反应分析",
          body:'三餐后血糖反应差异显著。早餐及晚餐后血糖峰值偏高（分别为 12.3 和 13.1 mmol/L），午餐后控制相对理想。建议关注早餐碳水摄入及晚餐时间节律。',
          tags: [["orange","早餐后偏高"],["green","午餐后正常"],["red","晚餐后偏高"]]
        },
        { seq:"04", ico:"blue", title:"整体控糖趋势",
          body:'综合TIR、CV、eA1c三项核心指标，本周控糖较上周有所改善，整体呈<strong>缓慢向好</strong>趋势。TIR由上周65%提升至本周68%，黎明现象发生频率有所下降。',
          trend: [["#52C41A","▲ 3%","TIR较上周"],["#52C41A","▼ 0.3%","eA1c较上周"],["#FA8C16","→ 持平","CV较上周"]]
        }
      ],
      cgmRows: [
        { ts:"2026-05-22 08:30", val:9.2,  trend:"↗", tags:["餐后"],       status:"正常",   note:"早餐后2h" },
        { ts:"2026-05-22 06:00", val:7.8,  trend:"→", tags:["校准"],       status:"正常",   note:"" },
        { ts:"2026-05-22 03:15", val:3.5,  trend:"↓", tags:["低血糖警报"], status:"警报",   note:"夜间低血糖" },
        { ts:"2026-05-22 00:00", val:5.9,  trend:"↘", tags:["睡前"],       status:"正常",   note:"" },
        { ts:"2026-05-21 20:30", val:13.1, trend:"↑", tags:["餐后"],       status:"正常",   note:"晚餐后" },
        { ts:"2026-05-21 18:00", val:7.2,  trend:"→", tags:["餐前"],       status:"正常",   note:"" },
        { ts:"2026-05-21 12:30", val:10.8, trend:"↗", tags:["餐后"],       status:"正常",   note:"午餐后2h" },
        { ts:"2026-05-21 08:00", val:6.5,  trend:"↑", tags:["餐前"],       status:"正常",   note:"空腹" },
        { ts:"2026-05-21 02:30", val:3.2,  trend:"↓", tags:["低血糖警报"], status:"警报",   note:"夜间低血糖" },
        { ts:"2026-05-20 20:00", val:14.8, trend:"↑", tags:["餐后"],       status:"正常",   note:"晚餐后偏高" }
      ],
      fpRows: [
        { ts:"2026-05-22 07:30", val:7.2,  timing:"空腹",  status:"达标", doctor:"护士小李", note:"晨起" },
        { ts:"2026-05-22 09:30", val:10.5, timing:"餐后2h",status:"超标", doctor:"护士小李", note:"早餐后" },
        { ts:"2026-05-21 22:00", val:8.1,  timing:"睡前",  status:"达标", doctor:"护士小王", note:"" },
        { ts:"2026-05-21 11:30", val:9.8,  timing:"餐后2h",status:"超标", doctor:"王医生",   note:"午餐后" },
        { ts:"2026-05-21 07:15", val:6.9,  timing:"空腹",  status:"偏高", doctor:"护士小李", note:"" },
        { ts:"2026-05-20 20:30", val:15.6, timing:"餐后2h",status:"危险", doctor:"王医生",   note:"晚餐后峰值" }
      ],
      symptoms: {
        low:    ["多汗 ×5","心悸 ×3","颤抖 ×2","头晕 ×2","饥饿感 ×1"],
        high:   ["多尿 ×8","口渴 ×6","疲乏 ×4","视物模糊 ×3","体重下降 ×1"],
        compl:  ["视物模糊 ×2","手足麻木 ×1","下肢浮肿 ×1"]
      },
      meds: [
        { name:"二甲双胍",   tags:[["blue","500mg"],["gray","每日2次"],["gray","口服"]],     meta:"起始：2023-06-01 · 持续用药 229天" },
        { name:"格列美脲",   tags:[["blue","2mg"],  ["gray","每日1次"],["gray","口服"]],     meta:"起始：2023-09-15 · 持续用药 122天" },
        { name:"甘精胰岛素", tags:[["orange","10U"],["gray","每晚1次"],["purple","皮下注射"]],meta:"起始：2023-12-01 · 持续用药 45天" }
      ],
      adviceTl: [
        { date:"2026-05-22", doctor:"王医生", active:true,  full:"建议患者加强餐后运动，每餐后步行30分钟以改善餐后血糖控制。同时注意夜间低血糖风险，建议睡前监测血糖，如低于6.0 mmol/L可适量补充碳水。" },
        { date:"2026-05-15", doctor:"李医生", active:false, preview:"调整胰岛素剂量至12U，观察一周后评估...", full:"调整胰岛素剂量至12U，观察一周后评估血糖控制效果。如夜间低血糖频率未改善，考虑更换为德谷胰岛素。" },
        { date:"2026-05-10", doctor:"王医生", active:false, preview:"建议患者记录三餐饮食日记，重点关注...", full:"建议患者记录三餐饮食日记，重点关注早餐碳水化合物摄入量，目标控制在30–45g以内，并减少精制糖摄入。" },
        { date:"2026-04-28", doctor:"赵医生", active:false, preview:"增加甘精胰岛素，起始剂量10U，每晚睡前注射..." },
        { date:"2026-04-15", doctor:"王医生", active:false, preview:"复查HbA1c 7.8%，较3个月前8.2%有所改善..." }
      ]
    };
  }
  if (patient.id === "P002") {
    return {
      hasCGM: false, hasFingertip: true,
      deviceBrand: null, deviceUpdated: null,
      cgm: null,
      fingertip: {
        fasting:  { value: "8.7",  unit: "mmol/L", state: "red",    label: "显著偏高", tip: "近7天均值",   goal: "4.4–7.0 mmol/L" },
        pp2h:     { value: "10.4", unit: "mmol/L", state: "orange", label: "偏高",     tip: "近7天均值",   goal: "< 10.0 mmol/L" },
        reach:    { value: 58,     unit: "%",       state: "orange", label: "轻度不达标", tip: "近30天达标率", goal: "≥ 70%" },
        maxHigh:  { value: "11.1", unit: "mmol/L", state: "orange", label: "偏高",     tip: "近7天最高记录", goal: "< 10.0 mmol/L" },
        hypo:     { value: 0,      unit: "次",      state: "green",  label: "正常",     tip: "近7天低血糖频次", goal: "0次" }
      },
      aiCards: [
        { seq:"01", ico:"orange", title:"整体血糖评估",
          body:'近期血糖基本可控，但存在部分指标临界不达标情况，空腹血糖持续偏高是主要问题。胰腺代谢负荷略有升高，无急性血糖损伤风险，建议优化基础降糖方案。',
          tags: [["orange","空腹偏高"],["orange","达标率不足"]]
        },
        { seq:"02", ico:"blue", title:"隐匿异常识别",
          body:'深度数据拆解发现轻度黎明现象，晨起空腹血糖偏高与夜间基础胰岛素分泌偏弱有关。多为间歇性出现，无持续性损伤，需针对性优化夜间管控策略。',
          tags: [["orange","轻度黎明现象"],["gray","间歇性发作"]]
        },
        { seq:"03", ico:"purple", title:"并发症风险评估",
          body:'患者当前血糖波动幅度基本可控，变异系数在临界范围内。无明显并发症风险信号，但长期管控不规范会缓慢累积慢性糖损伤，需持续监测。',
          tags: [["green","波动基本可控"],["orange","长期风险待关注"]]
        },
        { seq:"04", ico:"blue", title:"多病种融合分析",
          body:'患者无合并睡眠呼吸障碍等共病，血糖异常为单纯糖尿病自身代谢问题，管控逻辑简单可控。当前以优化生活方式和口服药为主策略。',
          trend: [["#52C41A","正常","睡眠状态"],["#52C41A","正常","多病联动风险"]]
        }
      ],
      cgmRows: [],
      fpRows: [
        { ts:"2026-05-22 07:05", val:8.7,  timing:"空腹",  status:"偏高", doctor:"护士小李", note:"晨起" },
        { ts:"2026-05-22 09:10", val:10.4, timing:"餐后2h",status:"超标", doctor:"护士小李", note:"早餐后" },
        { ts:"2026-05-21 07:20", val:8.2,  timing:"空腹",  status:"偏高", doctor:"护士小王", note:"" },
        { ts:"2026-05-21 09:25", val:11.1, timing:"餐后2h",status:"超标", doctor:"王医生",   note:"午餐后" },
        { ts:"2026-05-20 12:50", val:7.4,  timing:"随机",  status:"达标", doctor:"护士小李", note:"" }
      ],
      symptoms: {
        low:   [],
        high:  ["口干 ×3","轻度乏力 ×2"],
        compl: []
      },
      meds: [
        { name:"二甲双胍", tags:[["blue","500mg"],["gray","每日两次"],["gray","口服"]], meta:"起始：2024-01-01 · 持续用药" }
      ],
      adviceTl: [
        { date:"2026-05-20", doctor:"王医生", active:true, full:"建议患者控制晚餐碳水摄入，睡前适当补充蛋白质，改善晨起空腹血糖偏高情况。同时加强餐后步行运动。" },
        { date:"2026-05-10", doctor:"李医生", active:false, preview:"调整二甲双胍至每日三次...", full:"调整二甲双胍至每日三次，观察血糖变化，2周后复查。" }
      ]
    };
  }
  return null;
}

function gStateClass(state) {
  if (state === "green") return "green";
  if (state === "orange") return "orange";
  return "red";
}

function gTagClass(state) {
  if (state === "green")  return "g-tag-green";
  if (state === "orange") return "g-tag-orange";
  return "g-tag-red";
}

function glucoseValColor(val) {
  if (val < 3.9)  return "#FF4D4F";
  if (val > 10.0) return "#FA8C16";
  return "#52C41A";
}

/* ---------- 指标卡片 ---------- */
function cgmMetricCards(cgm) {
  const tarTbr = cgm.tar.tarTbr;
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="g-section-title">CGM 核心指标</span>
        <span class="g-tag g-tag-blue">近14天</span>
      </div>
      <span class="g-section-sub">数据来源：${document._gDevBrand || "雅培 FreeStyle Libre 3"} · 有效监测率 94.2%</span>
    </div>
    <div class="g-metric-grid">
      <!-- TIR -->
      <div class="g-mcard s-${gStateClass(cgm.tir.state)} linked" data-action="enter-twin">
        <span class="g-link-icon">↗</span>
        <div class="g-mcard-label">🎯 TIR 目标范围时间</div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span class="g-mcard-val" style="color:${cgm.tir.state==="green"?"#52C41A":cgm.tir.state==="orange"?"#FA8C16":"#FF4D4F"};">${cgm.tir.value}</span>
          <span class="g-mcard-unit">%</span>
        </div>
        <span class="g-tag ${gTagClass(cgm.tir.state)}">${cgm.tir.label}</span>
        <div class="g-progress"><div class="g-progress-fill" style="width:${cgm.tir.value}%;background:linear-gradient(90deg,#52C41A,#95DE64);"></div></div>
        <div style="font-size:11px;color:#86909C;">${cgm.tir.tip}</div>
        <div style="font-size:11px;color:#86909C;">控制目标：<strong style="color:#1D2129;">${cgm.tir.goal}</strong></div>
      </div>
      <!-- 平均血糖 -->
      <div class="g-mcard s-${gStateClass(cgm.avgGlucose.state)} linked" data-action="enter-twin">
        <span class="g-link-icon">↗</span>
        <div class="g-mcard-label">📈 平均血糖 GMI</div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span class="g-mcard-val" style="color:${cgm.avgGlucose.state==="orange"?"#FA8C16":"#FF4D4F"};">${cgm.avgGlucose.value}</span>
          <span class="g-mcard-unit">${cgm.avgGlucose.unit}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="g-tag ${gTagClass(cgm.avgGlucose.state)}">${cgm.avgGlucose.label}</span>
          <span style="color:${cgm.avgGlucose.state==="orange"?"#FA8C16":"#FF4D4F"};font-size:16px;font-weight:700;">↑</span>
        </div>
        <div style="font-size:11px;color:#86909C;margin-top:4px;">${cgm.avgGlucose.tip}</div>
        <div style="font-size:11px;color:#86909C;">控制目标：<strong style="color:#1D2129;">${cgm.avgGlucose.goal}</strong></div>
      </div>
      <!-- CV -->
      <div class="g-mcard s-${gStateClass(cgm.cv.state)}">
        <div class="g-mcard-label">〰️ 血糖变异系数 CV</div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span class="g-mcard-val" style="color:#FA8C16;">${cgm.cv.value}</span>
          <span class="g-mcard-unit">%</span>
        </div>
        <span class="g-tag ${gTagClass(cgm.cv.state)}">${cgm.cv.label}</span>
        <div style="font-size:11px;color:#86909C;margin-top:4px;">${cgm.cv.tip}</div>
        <div style="font-size:11px;color:#86909C;">控制目标：<strong style="color:#1D2129;">${cgm.cv.goal}</strong></div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
          <div style="flex:1;height:4px;background:#F0F0F0;border-radius:2px;overflow:hidden;">
            <div style="width:${cgm.cv.value}%;height:100%;background:#FA8C16;border-radius:2px;"></div>
          </div>
          <span style="font-size:10px;color:#FA8C16;">警戒线36%</span>
        </div>
      </div>
      <!-- TAR/TBR -->
      <div class="g-mcard s-${gStateClass(cgm.tar.state)}">
        <div class="g-mcard-label">📊 TAR / TBR 占比</div>
        <div style="display:flex;gap:12px;align-items:center;">
          <div>
            <div style="font-size:10px;color:#FA8C16;font-weight:600;">TAR 高血糖</div>
            <div class="g-mcard-val-sm" style="color:#FA8C16;">${tarTbr.tar1}<span class="g-mcard-unit">%</span></div>
          </div>
          <div style="width:1px;height:36px;background:#E5E6EB;"></div>
          <div>
            <div style="font-size:10px;color:#FF4D4F;font-weight:600;">TBR 低血糖</div>
            <div class="g-mcard-val-sm" style="color:#FF4D4F;">${tarTbr.tbr1+tarTbr.tbr2}<span class="g-mcard-unit">%</span></div>
          </div>
        </div>
        <span class="g-tag ${gTagClass(cgm.tar.state)}">${cgm.tar.label}</span>
        <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin-top:4px;gap:1px;">
          <div style="width:${tarTbr.tbr2}%;background:#FF4D4F;"></div>
          <div style="width:${tarTbr.tbr1}%;background:#FF7875;"></div>
          <div style="width:${tarTbr.tir}%;background:#52C41A;opacity:.5;"></div>
          <div style="width:${tarTbr.tar1}%;background:#FA8C16;"></div>
          <div style="width:${tarTbr.tar2}%;background:#FF4D4F;"></div>
        </div>
        <div style="font-size:11px;color:#86909C;margin-top:2px;">${cgm.tar.tip} · 严控高低血糖</div>
      </div>
      <!-- eA1c -->
      <div class="g-mcard s-${gStateClass(cgm.eA1c.state)} linked" data-action="enter-twin">
        <span class="g-link-icon">↗</span>
        <div class="g-mcard-label">🧪 eA1c 估算糖化</div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span class="g-mcard-val" style="color:#FF4D4F;">${cgm.eA1c.value}</span>
          <span class="g-mcard-unit">%</span>
        </div>
        <span class="g-tag ${gTagClass(cgm.eA1c.state)}">${cgm.eA1c.label}</span>
        <div style="font-size:11px;color:#86909C;margin-top:4px;">${cgm.eA1c.tip}</div>
        <div style="font-size:11px;color:#86909C;">控制目标：<strong style="color:#1D2129;">${cgm.eA1c.goal}</strong></div>
      </div>
    </div>`;
}

function ftMetricCards(ft) {
  function ftCard(label, icon, val, unit, state, tip, goal, extra) {
    return `
      <div class="g-mcard s-${gStateClass(state)}">
        <div class="g-mcard-label">${icon} ${label}</div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span class="g-mcard-val" style="color:${state==="green"?"#52C41A":state==="orange"?"#FA8C16":"#FF4D4F"};">${val}</span>
          <span class="g-mcard-unit">${unit}</span>
        </div>
        <span class="g-tag ${gTagClass(state)}">${tip.label||"—"}</span>
        <div style="font-size:11px;color:#86909C;margin-top:4px;">${tip.tip}</div>
        <div style="font-size:11px;color:#86909C;">控制目标：<strong style="color:#1D2129;">${goal}</strong></div>
        ${extra || ""}
      </div>`;
  }
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="g-section-title">指尖血糖核心指标</span>
        <span class="g-tag g-tag-gray">近14天</span>
      </div>
      <span class="g-section-sub">共记录 <strong style="color:#1D2129;">142</strong> 次测量</span>
    </div>
    <div class="g-metric-grid">
      ${ftCard("空腹血糖均值","🌙",ft.fasting.value,ft.fasting.unit,ft.fasting.state,{tip:ft.fasting.tip,label:ft.fasting.label},ft.fasting.goal)}
      ${ftCard("餐后2h血糖均值","🍽️",ft.pp2h.value,ft.pp2h.unit,ft.pp2h.state,{tip:ft.pp2h.tip,label:ft.pp2h.label},ft.pp2h.goal)}
      <div class="g-mcard s-${gStateClass(ft.reach.state)}">
        <div class="g-mcard-label">% 血糖达标率</div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span class="g-mcard-val" style="color:${ft.reach.state==="green"?"#52C41A":ft.reach.state==="orange"?"#FA8C16":"#FF4D4F"};">${ft.reach.value}</span>
          <span class="g-mcard-unit">%</span>
        </div>
        <span class="g-tag ${gTagClass(ft.reach.state)}">${ft.reach.label}</span>
        <div class="g-progress" style="margin-top:4px;">
          <div class="g-progress-fill" style="width:${ft.reach.value}%;background:linear-gradient(90deg,#FA8C16,#FFC069);"></div>
        </div>
        <div style="font-size:11px;color:#86909C;margin-top:2px;">控制目标：<strong style="color:#1D2129;">${ft.reach.goal}</strong></div>
      </div>
      ${ftCard("最高血糖记录","⬆️",ft.maxHigh.value,ft.maxHigh.unit,ft.maxHigh.state,{tip:ft.maxHigh.tip,label:ft.maxHigh.label||""},ft.maxHigh.goal)}
      ${ftCard("低血糖发生次数","⚠️",ft.hypo.value,ft.hypo.unit,ft.hypo.state,{tip:ft.hypo.tip,label:ft.hypo.label},ft.hypo.goal,
        `<div style="font-size:11px;color:#86909C;">近14天共 <strong style="color:#FF4D4F;">${ft.hypo.value*2}</strong> 次</div>`)}
    </div>`;
}

function buildTIRDistribution(tarTbr) {
  const rows = [
    { label:"TAR2 &gt;13.9", color:"#FF4D4F", pct:tarTbr.tar2, hrs:(tarTbr.tar2*24/100).toFixed(1) },
    { label:"TAR1 10.0–13.9",color:"#FA8C16", pct:tarTbr.tar1, hrs:(tarTbr.tar1*24/100).toFixed(1) },
    { label:"TIR 3.9–10.0",  color:"#52C41A", pct:tarTbr.tir,  hrs:(tarTbr.tir*24/100).toFixed(1), main:true },
    { label:"TBR1 3.0–3.9",  color:"#FF7875", pct:tarTbr.tbr1, hrs:(tarTbr.tbr1*24/100).toFixed(1) },
    { label:"TBR2 &lt;3.0",  color:"#FF4D4F", pct:tarTbr.tbr2, hrs:(tarTbr.tbr2*24/100).toFixed(1) }
  ];
  return `
    <div class="g-tir-bars">
      ${rows.map((r,i) => `
        <div class="g-tir-row" style="margin-bottom:${i<rows.length-1?"6px":"0"};">
          <div class="g-tir-label" style="color:${r.color};">${r.label}</div>
          <div class="g-tir-track" style="${r.main?"height:28px;":""}">
            <div class="${r.main?"g-tir-fill-main":"g-tir-fill"}" style="width:${r.pct}%;background:${r.main?"linear-gradient(90deg,#52C41A,#95DE64)":r.color};">
              ${r.main?`<span style="font-size:12px;font-weight:700;color:#fff;">${r.pct}%</span>`:""}
            </div>
          </div>
          <span class="g-tir-pct" style="color:${r.color};">${r.pct}%</span>
          <span class="g-tir-hrs">${r.hrs}h/天</span>
        </div>`).join("")}
    </div>
    <div class="g-tir-summary">
      <div class="g-tir-summary-label">综合分布示意</div>
      <div class="g-tir-full-bar">
        <div style="width:${tarTbr.tbr2}%;background:#FF4D4F;" title="TBR2"></div>
        <div style="width:${tarTbr.tbr1}%;background:#FF7875;" title="TBR1"></div>
        <div style="width:${tarTbr.tir}%;background:#52C41A;"  title="TIR"></div>
        <div style="width:${tarTbr.tar1}%;background:#FA8C16;" title="TAR1"></div>
        <div style="width:${tarTbr.tar2}%;background:#FF4D4F;" title="TAR2"></div>
      </div>
    </div>
    <div class="g-tir-tip">
      <span style="color:#FA8C16;flex-shrink:0;margin-top:1px;">⚠️</span>
      <span>低血糖时间（TBR）占比 <strong>${tarTbr.tbr1+tarTbr.tbr2}%</strong>，显著超出推荐值 &lt;4%，建议调整夜间胰岛素剂量。</span>
    </div>`;
}

function buildAICards(aiCards) {
  const icoColors = { orange:"#FFF7E6", red:"#FFF1F0", purple:"#F9F0FF", blue:"#E6F4FF" };
  const icoTexts  = { orange:"🔥", red:"⚠️", purple:"🍽️", blue:"📈" };
  return aiCards.map((c, i) => `
    <div class="g-ai-card">
      <div class="g-ai-seq">${c.seq}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0;">
        <div class="g-ai-card-head">
          <div class="g-ai-card-ico ${c.ico}" style="background:${icoColors[c.ico]||"#F2F3F5"};">${icoTexts[c.ico]||"🔬"}</div>
          <span class="g-ai-card-title">${c.title}</span>
        </div>
        ${c.badge ? `<span class="g-badge g-badge-${c.badge[0]}">${c.badge[1]}</span>` : ""}
      </div>
      <p class="g-ai-body">${c.body}</p>
      ${c.tags ? `<div class="g-ai-tag-row">${c.tags.map(t=>`<span class="g-tag g-tag-${t[0]}">${t[1]}</span>`).join("")}</div>` : ""}
      ${c.riskMeter ? `<div class="g-risk-meter">${c.riskMeter.map(col=>`<div class="g-risk-bar" style="background:${col};"></div>`).join("")}</div>` : ""}
      ${c.trend ? `<div style="display:flex;gap:16px;flex-wrap:wrap;">${c.trend.map(t=>`<div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:${t[0]};">${t[1]}</div><div style="font-size:11px;color:#86909C;">${t[2]}</div></div>`).join("")}</div>` : ""}
      <div class="g-ai-footer">AI生成内容，仅供参考</div>
    </div>`).join("");
}

function buildCGMTable(rows) {
  if (!rows.length) return `<tr><td colspan="6" style="text-align:center;color:#86909C;padding:24px;">暂无CGM明细记录</td></tr>`;
  return rows.map(r => {
    const isLow = r.val < 3.9, isHigh = r.val > 10.0;
    const rowCls = isLow ? "row-low" : isHigh ? "row-high" : "";
    const color = glucoseValColor(r.val);
    const tagHtml = r.tags.map(t => {
      const cls = t==="低血糖警报"?"g-tag-red":t==="餐后"?"g-tag-orange":t==="校准"?"g-tag-blue":"g-tag-gray";
      return `<span class="g-tag ${cls}" style="font-size:11px;">${t}</span>`;
    }).join(" ");
    const statusTag = r.status==="警报"?`<span class="g-tag g-tag-red" style="font-size:11px;">警报</span>`:`<span class="g-tag g-tag-green" style="font-size:11px;">正常</span>`;
    const trendColor = r.trend==="↑"||r.trend==="↗"?"#FA8C16":r.trend==="↓"||r.trend==="↘"?"#FF4D4F":"#86909C";
    return `<tr class="${rowCls}">
      <td style="font-size:13px;color:#4E5969;font-family:monospace;">${r.ts}</td>
      <td><span style="font-size:15px;font-weight:700;color:${color};">${r.val}</span><span style="font-size:12px;color:#86909C;margin-left:3px;">mmol/L</span></td>
      <td style="font-size:18px;font-weight:700;color:${trendColor};">${r.trend}</td>
      <td>${tagHtml}</td>
      <td>${statusTag}</td>
      <td style="font-size:13px;color:#86909C;">${r.note||"—"}</td>
    </tr>`;
  }).join("");
}

function buildFPTable(rows) {
  if (!rows.length) return `<tr><td colspan="6" style="text-align:center;color:#86909C;padding:24px;">暂无指尖血糖记录</td></tr>`;
  const statusMap = { "达标":"g-tag-green","偏高":"g-tag-orange","超标":"g-tag-orange","危险":"g-tag-red" };
  return rows.map(r => {
    const isLow = r.val < 3.9, isHigh = r.val > 10.0;
    const rowCls = isLow ? "row-low" : isHigh ? "row-high" : "";
    const color = glucoseValColor(r.val);
    const statusTag = `<span class="g-tag ${statusMap[r.status]||"g-tag-gray"}" style="font-size:11px;">${r.status}</span>`;
    const timingCls = r.timing==="空腹"?"g-tag-blue":r.timing==="餐后2h"?"g-tag-orange":"g-tag-gray";
    return `<tr class="${rowCls}">
      <td style="font-size:13px;color:#4E5969;font-family:monospace;">${r.ts}</td>
      <td><span style="font-size:15px;font-weight:700;color:${color};">${r.val}</span><span style="font-size:12px;color:#86909C;margin-left:3px;">mmol/L</span></td>
      <td><span class="g-tag ${timingCls}" style="font-size:11px;">${r.timing}</span></td>
      <td>${statusTag}</td>
      <td style="font-size:13px;color:#1D2129;">${r.doctor}</td>
      <td style="font-size:13px;color:#86909C;">${r.note||"—"}</td>
    </tr>`;
  }).join("");
}

function buildHeatmapHTML() {
  const symptomData = [[0,2,1,3,0,5,2],[1,0,4,2,1,3,0],[0,3,2,1,5,2,1],[2,1,0,3,2,4,1],[0,1,2,0,3,1,0]];
  const symptomDetails = [
    [[],["多尿","心悸"],["多汗"],["多尿","口渴","疲乏"],[],["多汗×2","心悸×2","多尿"],["口渴","多尿"]],
    [["多汗"],[],["多尿×2","口渴×2"],["多汗","心悸"],["多尿"],["多尿×2","视物模糊"],[]],
    [[],["多汗","心悸","口渴"],["多尿","疲乏"],["多汗"],["多汗×2","口渴×2","疲乏"],["多尿","心悸"],["疲乏"]],
    [["多尿","口渴"],["多汗"],[],["多汗","心悸","疲乏"],["多尿","口渴"],["多汗×2","心悸","多尿"],["视物模糊"]],
    [[],["多汗"],["多尿","心悸"],[],["多汗","心悸","多尿"],["疲乏"],[]],
  ];
  const colors = ["#F0F0F0","#FFD591","#FFA940","#FA8C16","#D46B08","#AD4E00"];
  const weeks  = ["第1周","第2周","第3周","第4周","第5周"];
  return symptomData.map((week, wi) => `
    <div class="g-hm-row">
      <div class="g-hm-week">${weeks[wi]}</div>
      ${week.map((count, di) => {
        const cidx = Math.min(count, colors.length-1);
        const tip = count===0 ? "无症状记录" : `<strong>${count}次症状</strong><br>${symptomDetails[wi][di].join("<br>")}`;
        return `<div class="g-hm-cell" style="background:${colors[cidx]};"><div class="g-hm-tooltip">${tip}</div></div>`;
      }).join("")}
    </div>`).join("");
}

function buildMedsHTML(meds) {
  const tagCls = { blue:"g-tag-blue", orange:"g-tag-orange", gray:"g-tag-gray", purple:"g-tag-purple" };
  return meds.map(m => `
    <div class="g-desc-row">
      <div class="g-med-detail">
        <div class="g-med-tags">
          <span class="g-med-name">${m.name}</span>
          ${m.tags.map(t=>`<span class="g-tag ${tagCls[t[0]]||"g-tag-gray"}">${t[1]}</span>`).join("")}
        </div>
        <span class="g-med-meta">${m.meta}</span>
      </div>
    </div>`).join("");
}

function buildAdviceTimeline(tl) {
  return tl.map((item, i) => `
    <div class="g-tl-item">
      <div class="g-tl-line"></div>
      <div class="g-tl-dot ${item.active?"active":"past"}"></div>
      <div class="g-tl-body">
        <div class="g-tl-meta">
          <span class="g-tl-date">${item.date}</span>
          <span class="g-tl-doctor">${item.doctor}</span>
          ${item.active?`<span class="g-tag g-tag-blue" style="padding:1px 6px;font-size:11px;">最新</span>`:""}
        </div>
        ${item.active
          ? `<p class="g-tl-content">${item.full}</p>`
          : item.full
            ? `<div class="g-tl-expand-row">
                <p class="g-tl-preview" id="g-tl-prev-${i}">${item.preview}</p>
                <button class="g-btn g-btn-text" style="font-size:12px;padding:2px 8px;flex-shrink:0;" data-action="tl-expand" data-idx="${i}">展开</button>
               </div>
               <p id="g-tl-full-${i}" class="g-tl-content" style="display:none;margin-top:6px;">${item.full}</p>`
            : `<p class="g-tl-preview">${item.preview||""}</p>`
        }
      </div>
    </div>`).join("");
}

/* ============================================================
   主渲染函数
   ============================================================ */
function renderGlucoseAnalysis(patient) {
  const gd = getGlucoseData(patient);
  if (!gd) return `<div style="padding:48px;text-align:center;color:#86909C;">暂无血糖监测数据</div>`;

  const subTab = (window._glucoseSubTab && window._glucoseSubTab[patient.id]) || (gd.hasCGM ? "cgm" : "fingertip");

  // ── Module 1: 孪生速览横幅 ──
  const twinBanner = `
    <div class="g-twin-banner">
      <div class="g-twin-inner">
        <div class="g-twin-stats">
          <div class="g-twin-title">
            数字孪生融合速览
            <span class="g-tag g-tag-ai" style="display:inline-flex;align-items:center;gap:3px;"><span style="font-size:10px;">🔬</span>AI孪生</span>
          </div>
          <div class="g-twin-stat-row">
            <div class="g-twin-stat">
              <div class="g-twin-stat-label">孪生血糖预测偏差</div>
              <div class="g-twin-stat-value" style="color:#1677FF;">±3.2<span style="font-size:14px;font-weight:500;color:#86909C;">%</span></div>
              <div class="g-twin-stat-sub" style="color:#52C41A;">✓ 高精准</div>
            </div>
            <div class="g-twin-stat">
              <div class="g-twin-stat-label">综合风险等级</div>
              <div class="g-twin-stat-value" style="color:#FA8C16;">中危<span style="font-size:13px;font-weight:500;color:#86909C;margin-left:2px;">风险</span></div>
              <div class="g-twin-stat-sub" style="color:#FA8C16;">⚠️ 需关注</div>
            </div>
            <div class="g-twin-stat">
              <div class="g-twin-stat-label">胰岛素敏感指数</div>
              <div class="g-twin-stat-value" style="color:#1D2129;">0.68<span style="font-size:13px;font-weight:500;color:#86909C;margin-left:2px;">ISI</span></div>
              <div class="g-twin-stat-sub" style="color:#FA8C16;">📉 偏低</div>
            </div>
            <div class="g-twin-stat">
              <div class="g-twin-stat-label">β细胞功能指数</div>
              <div class="g-twin-stat-value" style="color:#1D2129;">41<span style="font-size:13px;font-weight:500;color:#86909C;margin-left:2px;">%</span></div>
              <div class="g-twin-stat-sub" style="color:#FF4D4F;">↓ 功能减退</div>
            </div>
          </div>
        </div>
        <div class="g-twin-wave">
          <svg width="260" height="72" viewBox="0 0 280 72" fill="none">
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="280" y2="0">
                <stop offset="0%" stop-color="#1677FF" stop-opacity=".3"/>
                <stop offset="50%" stop-color="#1677FF" stop-opacity=".8"/>
                <stop offset="100%" stop-color="#1677FF" stop-opacity=".3"/>
              </linearGradient>
            </defs>
            <path d="M0,50 C20,50 25,20 40,22 C55,24 60,55 75,52 C90,49 95,15 115,18 C135,21 140,60 155,58 C170,56 175,25 195,22 C215,19 220,55 240,50 C260,45 265,28 280,30" stroke="url(#wg)" stroke-width="2.5" fill="none"/>
            <path d="M0,52 C20,52 25,22 40,20 C55,18 60,58 75,54 C90,50 95,13 115,16 C135,19 140,58 155,56 C170,54 175,22 195,20 C215,18 220,52 240,48 C260,44 265,26 280,28" stroke="#52C41A" stroke-width="1.5" fill="none" stroke-dasharray="5,3" opacity=".6"/>
            <circle cx="115" cy="16" r="3.5" fill="#FF4D4F" opacity=".8"/>
            <circle cx="75"  cy="54" r="3"   fill="#FA8C16" opacity=".8"/>
            <circle cx="195" cy="20" r="3"   fill="#FF4D4F" opacity=".8"/>
            <path d="M0,42 C20,42 25,12 40,14 C55,16 60,48 75,46 C90,44 95,8 115,11 C135,14 140,52 155,50 C170,48 175,18 195,15 C215,12 220,46 240,42 C260,38 265,22 280,24 L280,36 C265,34 260,50 240,54 C220,58 215,26 195,29 C175,32 170,60 155,62 C140,64 135,28 115,25 C95,22 90,56 75,58 C60,60 55,28 40,30 C25,32 20,60 0,58Z" fill="#1677FF" opacity=".08"/>
          </svg>
        </div>
        <div class="g-twin-actions">
          <button class="g-btn g-btn-primary" style="font-size:14px;padding:10px 20px;font-weight:600;" data-action="enter-twin">
            🔬 进入数字孪生分析 →
          </button>
          <div style="font-size:12px;color:#86909C;">已同步 <strong style="color:#1677FF;">${subTab==="cgm"?"287":"142"}</strong> 条血糖监测数据</div>
        </div>
      </div>
      <div class="g-twin-footer">
        <span style="display:flex;align-items:center;gap:4px;"><span style="font-size:11px;">ℹ️</span> AI孪生模型 v2.1 · 更新于今日 06:00 · 基于近14天数据训练</span>
        <div class="g-twin-footer-legend">
          <span class="g-twin-legend-item"><span style="width:12px;height:2px;background:#1677FF;border-radius:2px;display:inline-block;"></span> 预测曲线</span>
          <span class="g-twin-legend-item"><span style="width:12px;height:2px;background:#52C41A;border-radius:2px;display:inline-block;opacity:.6;"></span> 实测曲线</span>
        </div>
      </div>
    </div>`;

  // ── Module 2/3: 指标卡 ──
  const metricSection = subTab === "cgm" && gd.cgm
    ? cgmMetricCards(gd.cgm)
    : (gd.fingertip ? ftMetricCards(gd.fingertip) : `<div style="padding:24px;text-align:center;color:#86909C;">暂无指尖血糖数据</div>`);

  // ── Module 4: 图表（CGM only） ──
  const chartSection = subTab === "cgm" && gd.cgm ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;" class="g-charts-2col">
      <!-- AGP -->
      <div class="g-card g-chart-section">
        <div class="g-chart-header">
          <div>
            <div class="g-chart-title">动态血糖概率分布（AGP）</div>
            <div class="g-chart-sub">P25–P75区间 · 中位数 · 当日曲线</div>
          </div>
          <div class="g-segmented" id="g-agp-period">
            <button class="g-seg-item" data-period="7" data-action="agp-period">近7天</button>
            <button class="g-seg-item active" data-period="14" data-action="agp-period">近14天</button>
            <button class="g-seg-item" data-period="30" data-action="agp-period">近30天</button>
          </div>
        </div>
        <div class="g-chart-legend">
          <span class="g-legend-item"><span class="g-legend-line"></span>中位数</span>
          <span class="g-legend-item"><span class="g-legend-band"></span>P25–P75</span>
          <span class="g-legend-item"><span class="g-legend-dashed"></span>当日曲线</span>
        </div>
        <div class="g-chart-wrap" style="height:240px;">
          <canvas id="g-agp-chart"></canvas>
        </div>
      </div>
      <!-- TIR Distribution -->
      <div class="g-card g-chart-section">
        <div class="g-chart-header">
          <div>
            <div class="g-chart-title">血糖时间分布（TIR/TAR/TBR）</div>
            <div class="g-chart-sub">近14天 · 每日平均分布</div>
          </div>
        </div>
        ${buildTIRDistribution(gd.cgm.tar.tarTbr)}
      </div>
    </div>` : "";

  // ── Module 5: AI分析 ──
  const aiSection = `
    <div class="g-card" style="padding:20px;">
      <div class="g-ai-header">
        <div class="g-ai-title-row">
          <div class="g-ai-icon">🧠</div>
          <span class="g-section-title">AI 智能分析报告</span>
          <span class="g-tag g-tag-ai">GPT-Med v3.2</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:12px;color:#86909C;">生成于 2026-05-22 07:00</span>
          <button class="g-btn g-btn-ghost" style="font-size:13px;padding:5px 12px;">🔄 刷新分析</button>
        </div>
      </div>
      <div class="g-ai-grid">
        ${buildAICards(gd.aiCards)}
      </div>
    </div>`;

  // ── Module 6: 明细表 ──
  const isCGM = subTab === "cgm";
  const tableSection = `
    <div class="g-card" style="padding:20px;">
      <div class="g-table-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="g-section-title">血糖明细记录</span>
          <span class="g-tag g-tag-blue">${isCGM ? `共 287 条 CGM 记录` : `共 142 条指尖血糖记录`}</span>
        </div>
      </div>
      <div class="g-toolbar">
        <div class="g-toolbar-left">
          <div class="g-mock-input">📅 2026-05-08 ~ 2026-05-22 ▾</div>
          <div class="g-mock-input">🔽 测量时机：全部 ▾</div>
          ${isCGM ? `<div class="g-mock-input">🔌 设备：雅培 Libre 3 ▾</div>` : ""}
        </div>
        <button class="g-btn g-btn-ghost" style="font-size:13px;">⬇️ 导出 Excel</button>
      </div>
      <div style="overflow-x:auto;">
        ${isCGM ? `
          <table class="g-data-table">
            <thead><tr><th>时间戳</th><th>葡萄糖值 (mmol/L)</th><th>趋势方向</th><th>数据标记</th><th>设备状态</th><th>备注</th></tr></thead>
            <tbody>${buildCGMTable(gd.cgmRows)}</tbody>
          </table>` : `
          <table class="g-data-table">
            <thead><tr><th>测量时间</th><th>血糖值 (mmol/L)</th><th>测量时机</th><th>达标状态</th><th>操作医生</th><th>备注</th></tr></thead>
            <tbody>${buildFPTable(gd.fpRows)}</tbody>
          </table>`}
      </div>
      <div class="g-pagination">
        <span style="font-size:13px;color:#86909C;margin-right:8px;">共 ${isCGM?"287":"142"} 条</span>
        <div class="g-page-btn">‹</div>
        <div class="g-page-btn active">1</div>
        <div class="g-page-btn">2</div>
        <div class="g-page-btn">3</div>
        <div class="g-page-btn">…</div>
        <div class="g-page-btn">${isCGM?15:8}</div>
        <div class="g-page-btn">›</div>
      </div>
    </div>`;

  // ── Module 7: 症状区 ──
  const hasSym = gd.symptoms.low.length || gd.symptoms.high.length || gd.symptoms.compl.length;
  const symptomSection = `
    <div class="g-card" style="padding:20px;">
      <div class="g-table-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="g-section-title">症状记录</span>
          <span class="g-tag g-tag-gray">近30天</span>
        </div>
        <button class="g-btn g-btn-dashed" style="font-size:13px;">＋ 录入症状</button>
      </div>
      ${hasSym ? `
        <div class="g-sym-groups">
          <div class="g-sym-group red">
            <div class="g-sym-group-title" style="color:#FF4D4F;">🌡️ 低血糖症状组</div>
            <div style="display:flex;flex-wrap:wrap;">
              ${gd.symptoms.low.length ? gd.symptoms.low.map((s,i)=>{
                const bg=["#FF4D4F","#FF7875","#FFA39E","#FFCCC7","#FFF1F0"][Math.min(i,4)];
                const fc=i<3?"#fff":"#CF1322";
                return `<span class="g-sym-tag" style="background:${bg};color:${fc};${i>=3?"border:1px solid #FFA39E;":""}">${s}</span>`;
              }).join("") : "<span style='font-size:12px;color:#86909C;'>暂无</span>"}
            </div>
          </div>
          <div class="g-sym-group orange">
            <div class="g-sym-group-title" style="color:#FA8C16;">☀️ 高血糖症状组</div>
            <div style="display:flex;flex-wrap:wrap;">
              ${gd.symptoms.high.length ? gd.symptoms.high.map((s,i)=>{
                const bg=["#FA8C16","#FFA940","#FFC069","#FFD591","#FFF7E6"][Math.min(i,4)];
                const fc=i<3?"#fff":"#874D00";
                return `<span class="g-sym-tag" style="background:${bg};color:${fc};${i>=3?"border:1px solid #FFD591;":""}">${s}</span>`;
              }).join("") : "<span style='font-size:12px;color:#86909C;'>暂无</span>"}
            </div>
          </div>
          <div class="g-sym-group purple">
            <div class="g-sym-group-title" style="color:#722ED1;">🩺 并发症相关</div>
            <div style="display:flex;flex-wrap:wrap;">
              ${gd.symptoms.compl.length ? gd.symptoms.compl.map((s,i)=>{
                const bg=["#722ED1","#B37FEB","#F9F0FF"][Math.min(i,2)];
                const fc=i<2?"#fff":"#722ED1";
                return `<span class="g-sym-tag" style="background:${bg};color:${fc};${i>=2?"border:1px solid #D3ADF7;":""}">${s}</span>`;
              }).join("") : "<span style='font-size:12px;color:#86909C;'>暂无</span>"}
            </div>
          </div>
        </div>
        <div>
          <div class="g-heatmap-header">
            <span style="font-size:13px;font-weight:500;color:#1D2129;">症状热力日历</span>
            <div class="g-heatmap-legend">
              <span>少</span>
              <div class="g-heatmap-legend-cells">
                ${["#F0F0F0","#FFD591","#FFA940","#FA8C16","#D46B08"].map(c=>`<div class="g-heatmap-legend-cell" style="background:${c};"></div>`).join("")}
              </div>
              <span>多</span>
            </div>
          </div>
          <div class="g-heatmap-dow">
            ${["一","二","三","四","五","六","日"].map(d=>`<div class="g-heatmap-dow-item">${d}</div>`).join("")}
          </div>
          <div id="g-heatmap-grid">${buildHeatmapHTML()}</div>
        </div>` : `<div style="padding:20px;text-align:center;color:#86909C;font-size:13px;">患者暂无录入糖尿病相关症状</div>`}
    </div>`;

  // ── Module 8: 治疗 & 医生建议 ──
  const treatmentSection = `
    <div class="g-treatment-grid">
      <!-- 当前治疗方案 -->
      <div class="g-card" style="padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <span class="g-section-title">当前治疗方案</span>
          <span style="font-size:12px;color:#86909C;">最近更新：2026-05-10</span>
        </div>
        ${gd.meds.length ? buildMedsHTML(gd.meds) : `<div style="color:#86909C;font-size:13px;">暂无录入降糖治疗方案</div>`}
        <div class="g-info-box blue">
          <span class="g-info-icon">💡</span>
          <span>AI建议：根据近期夜间低血糖频率，考虑将甘精胰岛素剂量由10U调整至8U</span>
        </div>
        <button class="g-btn g-btn-primary" style="width:100%;justify-content:center;">✏️ 调整治疗方案</button>
      </div>
      <!-- 医生建议 -->
      <div class="g-card" style="padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="g-section-title">医生建议</span>
            <span class="g-tag g-tag-gray">共${gd.adviceTl.length}条</span>
          </div>
        </div>
        <div class="g-timeline">${buildAdviceTimeline(gd.adviceTl)}</div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #F0F0F0;">
          <button class="g-btn g-btn-primary" style="width:100%;justify-content:center;">＋ 新增建议</button>
        </div>
      </div>
    </div>`;

  // ── Sub-tab bar ──
  const deviceInfo = subTab === "cgm" && gd.hasCGM ? `
    <div class="g-device-info">
      <span class="g-device-tag">🔵 ${gd.deviceBrand}</span>
      <span class="g-device-sync"><span class="g-sync-dot"></span> 最近同步：${gd.deviceUpdated}</span>
    </div>` : "";

  const subTabBar = `
    <div class="g-subtab-bar">
      <div class="g-tabs">
        ${gd.hasCGM ? `<button class="g-tab-item ${subTab==="cgm"?"active":""}" data-action="glucose-subtab" data-patient="${patient.id}" data-tab="cgm">📈 CGM 动态血糖</button>` : ""}
        ${gd.hasFingertip ? `<button class="g-tab-item ${subTab==="fingertip"?"active":""}" data-action="glucose-subtab" data-patient="${patient.id}" data-tab="fingertip">💧 指尖血糖</button>` : ""}
      </div>
      ${deviceInfo}
    </div>`;

  return `
    <div class="g-page">
      ${subTabBar}
      <div class="g-content">
        ${twinBanner}
        ${metricSection}
        ${chartSection}
        ${aiSection}
        ${tableSection}
        ${symptomSection}
        ${treatmentSection}
      </div>
    </div>`;
}

/* ============================================================
   数字孪生融合分析 — V1.7 左侧 2D 画布（P0 + P2）
   ============================================================ */

const TWIN_VIEWBOX = { w: 1024, h: 1536 };
const TWIN_BASE_IMAGE = "/apps/doctor-pc/assets/models/digital-twin-base.png";

function twinPoint(x, y) {
  return { x: Math.round(x * TWIN_VIEWBOX.w), y: Math.round(y * TWIN_VIEWBOX.h) };
}

function twinPolygon(points) {
  return points.map(([x, y]) => {
    const p = twinPoint(x, y);
    return `${p.x},${p.y}`;
  }).join(" ");
}

function twinBox([x1, y1, x2, y2]) {
  return {
    x: Math.round(x1 * TWIN_VIEWBOX.w),
    y: Math.round(y1 * TWIN_VIEWBOX.h),
    w: Math.round((x2 - x1) * TWIN_VIEWBOX.w),
    h: Math.round((y2 - y1) * TWIN_VIEWBOX.h)
  };
}

// 器官定义：坐标基于 1024×1536 高清 2D 底图，polygon 来自 organ-hotspots.json 首轮校准。
const TWIN_ORGANS = {
  airway:   { label:"气道", image:"/apps/doctor-pc/assets/models/digital-twin-airway.png",
              shape:{ type:"rect", bbox:[0.482, 0.135, 0.528, 0.292], rx:18 },
              linkedMetrics:["AHI","呼吸事件","平均血氧"], anatomic:false },
  lung:     { label:"肺部", image:"/apps/doctor-pc/assets/models/digital-twin-lung.png",
              shape:{ type:"polygon", points:[[0.397,0.188],[0.475,0.181],[0.501,0.254],[0.527,0.181],[0.605,0.188],[0.638,0.355],[0.552,0.375],[0.5,0.325],[0.448,0.375],[0.362,0.355]] },
              linkedMetrics:["最低血氧","平均血氧","ODI","CAT","Ts90"], anatomic:false },
  heart:    { label:"心脏", image:"/apps/doctor-pc/assets/models/digital-twin-heart.png",
              shape:{ type:"polygon", points:[[0.486,0.237],[0.56,0.248],[0.603,0.306],[0.573,0.366],[0.508,0.378],[0.451,0.346],[0.431,0.291]] },
              linkedMetrics:["低氧负担","心血管风险"], anatomic:false },
  liver:    { label:"肝脏", image:"/apps/doctor-pc/assets/models/digital-twin-liver.png",
              shape:{ type:"polygon", points:[[0.334,0.341],[0.506,0.323],[0.611,0.352],[0.592,0.399],[0.505,0.442],[0.373,0.458],[0.325,0.421]] },
              linkedMetrics:["平均血糖","脂肪肝风险"], anatomic:false },
  stomach:  { label:"胃", image:"/apps/doctor-pc/assets/models/digital-twin-stomach.png",
              shape:{ type:"polygon", points:[[0.513,0.303],[0.601,0.322],[0.643,0.374],[0.61,0.438],[0.526,0.456],[0.481,0.415],[0.489,0.35]] },
              linkedMetrics:["餐后2h血糖","胃排空","饮食结构"], anatomic:false },
  intestine:{ label:"肠道", image:"/apps/doctor-pc/assets/models/digital-twin-intestine.png",
              shape:{ type:"polygon", points:[[0.414,0.303],[0.578,0.306],[0.607,0.37],[0.596,0.465],[0.523,0.514],[0.431,0.492],[0.397,0.407]] },
              linkedMetrics:["餐后血糖","药物吸收","代谢负担"], anatomic:false },
  pancreas: { label:"胰腺",  shape:{ type:"polygon", points:[[0.475,0.353],[0.56,0.356],[0.598,0.375],[0.56,0.395],[0.482,0.389],[0.447,0.371]] },
              linkedMetrics:["TIR","平均血糖","eA1c"], anatomic:true },
  kidney:   { label:"肾脏", image:"/apps/doctor-pc/assets/models/digital-twin-kidney.png",
              shape:{ type:"multi", parts:[
                { type:"ellipse", cx:0.405, cy:0.445, rx:0.035, ry:0.048 },
                { type:"ellipse", cx:0.595, cy:0.445, rx:0.035, ry:0.048 } ]},
              linkedMetrics:["TIR","并发症风险"], anatomic:true },
  vessel:   { label:"血管",  shape:{ type:"rect", bbox:[0.492, 0.295, 0.51, 0.58], rx:10 },
              linkedMetrics:["CV","TAR/TBR","低血糖次数","平均血糖"], anatomic:false }
};

// 病种组合 → 场景（PRD §6）
function detectTwinScenario(patient) {
  const osa = hasSleepBreathingDisorder(patient);
  const copd = hasCOPD(patient);
  const dm = hasDiabetes(patient);
  if (osa && copd && dm) return { id:"triple", label:"三重共病（OSA + COPD + 糖尿病）",
    organs:["lung","airway","heart","pancreas","vessel","kidney"], default:"lung" };
  if (osa && dm)   return { id:"osa-dm",  label:"缺氧代谢共病（OSA + 糖尿病）",
    organs:["airway","lung","pancreas","vessel","heart"], default:"lung" };
  if (osa && copd) return { id:"osa-copd",label:"重叠综合征（OSA + COPD）",
    organs:["airway","lung","heart"], default:"lung" };
  if (copd && dm)  return { id:"copd-dm",label:"炎症代谢共病（COPD + 糖尿病）",
    organs:["lung","pancreas","vessel","heart"], default:"lung" };
  if (osa)  return { id:"osa", label:"睡眠呼吸暂停（OSA）",
    organs:["airway","lung","heart"], default:"airway" };
  if (copd) return { id:"copd", label:"慢阻肺（COPD）",
    organs:["airway","lung","heart"], default:"lung" };
  if (dm)   return { id:"dm", label:"2 型糖尿病",
    organs:["pancreas","liver","kidney","vessel"], default:"pancreas" };
  return { id:"none", label:"无支持病种", organs:[], default:null };
}

// 病种 → 默认共病链路（PRD §9.4 + §13）
const TWIN_CHAINS = {
  osa:      [{ id:"osa-main",  label:"夜间低氧 → 心肺负荷",
                path:["airway","lung","heart"], severity:"medium" }],
  copd:     [{ id:"copd-main", label:"气流受限 → 低氧 → 心脏",
                path:["airway","lung","heart"], severity:"medium" }],
  dm:       [{ id:"dm-main",   label:"胰腺功能下降 → 血管损伤",
                path:["pancreas","vessel","kidney"], severity:"medium" }],
  "osa-dm": [{ id:"hypoxia-metab", label:"夜间低氧 → 胰岛素抵抗 → 血糖波动",
                path:["lung","pancreas","vessel"], severity:"severe" },
              { id:"metab-vessel", label:"高血糖 → 血管内皮损伤",
                path:["pancreas","vessel"], severity:"medium" }],
  "osa-copd":[{ id:"overlap",  label:"上气道阻塞 + 气流受限 → 双重低氧 → 心肺负荷",
                path:["airway","lung","heart"], severity:"severe" }],
  "copd-dm":[{ id:"inflam-metab", label:"慢性炎症 → 胰岛素抵抗 → 血糖波动",
                path:["lung","pancreas","vessel"], severity:"severe" }],
  triple:   [{ id:"hypoxia",   label:"双重低氧 → 心肺负荷",
                path:["airway","lung","heart"], severity:"severe" },
              { id:"hypoxia-metab", label:"低氧 → 胰岛素抵抗 → 血糖波动",
                path:["lung","pancreas","vessel"], severity:"severe" },
              { id:"complications", label:"高血糖 → 血管 → 肾脏并发",
                path:["pancreas","vessel","kidney"], severity:"medium" }]
};

// 演示模板（PRD §14.1）
const TWIN_DEMO_TEMPLATES = {
  normal:    { label:"正常",       scenarioId:"dm",    organs:{} },
  "osa-light":{ label:"轻度 OSA",  scenarioId:"osa",   organs:{ airway:"light", lung:"light" } },
  "copd-mid":{ label:"中度 COPD",  scenarioId:"copd",  organs:{ airway:"medium", lung:"medium", heart:"light" } },
  "dm-mid":  { label:"中度糖尿病", scenarioId:"dm",    organs:{ pancreas:"medium", vessel:"medium", liver:"light" } },
  "osa-dm":  { label:"OSA+糖尿病", scenarioId:"osa-dm",organs:{ airway:"medium", lung:"medium", pancreas:"medium", vessel:"medium" } },
  "osa-copd":{ label:"OSA+COPD",  scenarioId:"osa-copd",organs:{ airway:"severe", lung:"severe", heart:"medium" } },
  "copd-dm": { label:"COPD+糖尿病",scenarioId:"copd-dm",organs:{ lung:"medium", pancreas:"medium", vessel:"medium" } },
  triple:    { label:"三重共病",   scenarioId:"triple",organs:{ airway:"severe", lung:"severe", heart:"medium",
                                                                pancreas:"severe", vessel:"medium", kidney:"medium" } }
};

// 计算每个器官的状态（normal/light/medium/severe）
// 一期：基于患者疾病等级和指标 mock 数据做粗判断；后续可接 PRD §8 分级算法
function computeTwinOrganStatuses(patient, scenario) {
  if (twinDemoMode) {
    const tpl = TWIN_DEMO_TEMPLATES[twinDemoTemplate];
    const out = {};
    Object.keys(TWIN_ORGANS).forEach(k => { out[k] = tpl?.organs?.[k] || "normal"; });
    return out;
  }
  const out = {};
  Object.keys(TWIN_ORGANS).forEach(k => { out[k] = "normal"; });
  const score = patient.riskScore ?? patient.screening?.score ?? 100;
  const severityFromScore = score < 50 ? "severe" : score < 70 ? "medium" : score < 85 ? "light" : "normal";
  // 简单映射：场景默认高亮的器官按健康分严重度着色
  scenario.organs.forEach(k => { out[k] = severityFromScore === "normal" ? "light" : severityFromScore; });
  // 三重共病的主链路器官提升一级
  if (scenario.id === "triple") {
    ["lung","airway"].forEach(k => { if (out[k] !== "severe") out[k] = "severe"; });
  }
  return out;
}

// 器官热区 SVG 生成
function renderOrganShape(organId, status, selected) {
  const o = TWIN_ORGANS[organId];
  const cls = `dt-organ dt-organ-${status}${selected ? " is-selected" : ""}${o.anatomic ? " is-anatomic" : ""}${o.image ? " is-image-backed" : ""}`;
  const attrs = `class="${cls}" data-action="dt-organ-click" data-organ="${organId}" role="button" tabindex="0" aria-label="${o.label}"`;
  const renderOne = (s) => {
    if (s.type === "ellipse") {
      const p = twinPoint(s.cx, s.cy);
      return `<ellipse cx="${p.x}" cy="${p.y}" rx="${Math.round(s.rx * TWIN_VIEWBOX.w)}" ry="${Math.round(s.ry * TWIN_VIEWBOX.h)}" ${attrs}/>`;
    }
    if (s.type === "rect") {
      const b = twinBox(s.bbox);
      return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${s.rx||0}" ry="${s.rx||0}" ${attrs}/>`;
    }
    if (s.type === "polygon") return `<polygon points="${twinPolygon(s.points)}" ${attrs}/>`;
    return "";
  };
  if (o.shape.type === "multi") {
    return `<g class="dt-organ-group" data-organ-group="${organId}">${o.shape.parts.map(renderOne).join("")}</g>`;
  }
  return renderOne(o.shape);
}

// 器官中心点（用于链路起止）
function organCenter(organId) {
  const o = TWIN_ORGANS[organId];
  if (o.shape.type === "multi") {
    const ps = o.shape.parts;
    const cx = ps.reduce((s,p)=>s+p.cx,0)/ps.length;
    const cy = ps.reduce((s,p)=>s+p.cy,0)/ps.length;
    return twinPoint(cx, cy);
  }
  if (o.shape.type === "rect") {
    const [x1, y1, x2, y2] = o.shape.bbox;
    return twinPoint((x1 + x2) / 2, (y1 + y2) / 2);
  }
  if (o.shape.type === "polygon") {
    const xs = o.shape.points.map(p => p[0]);
    const ys = o.shape.points.map(p => p[1]);
    return twinPoint((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  }
  return twinPoint(o.shape.cx, o.shape.cy);
}

// 链路 SVG 路径（二次贝塞尔曲线）
function renderChainPath(chain, isPlaying) {
  const availablePath = chain.path.filter((organId) => TWIN_ORGANS[organId]);
  if (availablePath.length < 2) return "";
  const pts = availablePath.map(organCenter);
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i-1], cur = pts[i];
    const mx = (prev.x + cur.x) / 2;
    const my = (prev.y + cur.y) / 2;
    const offset = (cur.x - prev.x) * 0.15;
    d += ` Q ${mx + offset} ${my - 40} ${cur.x} ${cur.y}`;
  }
  const sevCls = `dt-chain dt-chain-${chain.severity}${isPlaying ? " is-playing" : ""}`;
  const pathId = `dt-chain-${chain.id}`;
  return `
    <g class="${sevCls}" data-action="dt-chain-click" data-chain="${chain.id}">
      <path id="${pathId}" d="${d}" class="dt-chain-line"/>
      ${isPlaying ? `<circle r="6" class="dt-chain-dot">
        <animateMotion dur="${1.6 + chain.path.length * 0.3}s" repeatCount="indefinite">
          <mpath href="#${pathId}"/>
        </animateMotion>
      </circle>` : ""}
    </g>`;
}

function renderTwinCanvas(patient, scenario, statuses, chains) {
  if (scenario.id === "none") {
    return `<div class="dt-canvas-wrap dt-canvas-empty">
      <div class="dt-empty-inner">
        <div class="dt-empty-icon">🧬</div>
        <div class="dt-empty-title">暂无可用于数字孪生融合分析的支持病种</div>
        <div class="dt-empty-desc">该患者当前未确认 OSA、慢阻肺或 2 型糖尿病任一支持病种，<br>请在健康筛查 Tab 完成疾病确认后再回到本页查看孪生分析。</div>
      </div>
    </div>`;
  }

  const focusedOrgan = twinSelectedOrgan || scenario.default;
  // 排序：anatomic 器官（胰腺、肾脏）放最上层，其他按 z-index 默认；selected 单独放最后
  const organOrder = Object.keys(TWIN_ORGANS).sort((a, b) => {
    if (a === focusedOrgan) return 1;
    if (b === focusedOrgan) return -1;
    return (TWIN_ORGANS[a].anatomic ? 1 : 0) - (TWIN_ORGANS[b].anatomic ? 1 : 0);
  });
  const playingChainId = twinPlayingChain || chains[0]?.id;
  const twinScore = computeTwinHealthScore(patient, statuses);
  const credibility = computeTwinCredibility(patient);
  const focusedImage = focusedOrgan && TWIN_ORGANS[focusedOrgan]?.image
    ? TWIN_ORGANS[focusedOrgan].image
    : TWIN_BASE_IMAGE;
  const hasFocusedImage = focusedImage !== TWIN_BASE_IMAGE;

  return `
    <div class="dt-canvas-wrap" data-focus="${focusedOrgan || ""}" data-image-mode="${hasFocusedImage ? "organ" : "base"}">
      <div class="dt-canvas-toolbar">
        <span class="dt-scenario-pill">${scenario.label}</span>
        <div class="dt-canvas-toolbar-right">
          <button class="dt-mini-btn ${twinDemoMode ? "is-on" : ""}" data-action="dt-toggle-demo">
            ${twinDemoMode ? "演示中" : "演示模式"}
          </button>
        </div>
      </div>
      ${twinDemoMode ? renderTwinDemoSwitcher() : ""}
      <div class="dt-canvas-stage">
        <div class="dt-stage-grid"></div>
        <div class="dt-stage-scan"></div>
        <svg class="dt-svg" viewBox="0 0 ${TWIN_VIEWBOX.w} ${TWIN_VIEWBOX.h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="数字孪生人体画布">
          <defs>
            <radialGradient id="dt-glow-light" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FADB14" stop-opacity="0.55"/>
              <stop offset="100%" stop-color="#FADB14" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="dt-glow-medium" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FA8C16" stop-opacity="0.65"/>
              <stop offset="100%" stop-color="#FA8C16" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="dt-glow-severe" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FF4D4F" stop-opacity="0.75"/>
              <stop offset="100%" stop-color="#FF4D4F" stop-opacity="0"/>
            </radialGradient>
            <filter id="dt-blur-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6"/>
            </filter>
          </defs>
          <image href="${focusedImage}"
                 x="0" y="0" width="${TWIN_VIEWBOX.w}" height="${TWIN_VIEWBOX.h}"
                 preserveAspectRatio="xMidYMid meet" class="dt-bodyimg ${hasFocusedImage ? "is-organ-image" : ""}"/>
          <g class="dt-chains-layer">
            ${chains.map(c => renderChainPath(c, c.id === playingChainId)).join("")}
          </g>
          <g class="dt-organs-layer">
            ${organOrder.map(k => renderOrganShape(k, statuses[k], k === focusedOrgan)).join("")}
          </g>
        </svg>
        <div class="dt-canvas-legend">
          <span><i class="dt-dot dt-dot-normal"></i>正常</span>
          <span><i class="dt-dot dt-dot-light"></i>轻度</span>
          <span><i class="dt-dot dt-dot-medium"></i>中度</span>
          <span><i class="dt-dot dt-dot-severe"></i>重度</span>
        </div>
        <div class="dt-vitals-ribbon">
          <div><span>孪生分</span><strong>${twinScore.score}</strong></div>
          <div><span>可信度</span><strong>${credibility.level}</strong></div>
          <div><span>主链路</span><strong>${chains.length || 0}</strong></div>
        </div>
      </div>
      <div class="dt-canvas-tip">
        <span>当前聚焦：<strong>${focusedOrgan ? TWIN_ORGANS[focusedOrgan].label : "未选中"}</strong></span>
        <span class="dt-canvas-hint">点击器官查看详情 · 再次点击复位</span>
      </div>
    </div>`;
}

function renderTwinDemoSwitcher() {
  return `<div class="dt-demo-switcher">
    ${Object.entries(TWIN_DEMO_TEMPLATES).map(([k, v]) =>
      `<button class="dt-demo-pill ${twinDemoTemplate === k ? "is-active" : ""}"
        data-action="dt-demo-template" data-template="${k}">${v.label}</button>`
    ).join("")}
  </div>`;
}

function computeTwinHealthScore(patient, statuses) {
  const baseScore = patient.riskScore ?? patient.screening?.score ?? 100;
  const burdenMap = { normal: 0, light: 2, medium: 5, severe: 8 };
  const burden = Object.values(statuses).reduce((sum, status) => sum + (burdenMap[status] || 0), 0);
  const score = Math.max(0, Math.min(100, baseScore - burden));
  const tone = score < 55 ? "severe" : score < 72 ? "medium" : score < 86 ? "light" : "normal";
  const label = score < 55 ? "高危" : score < 72 ? "需干预" : score < 86 ? "需关注" : "稳定";
  return { score, baseScore, burden, tone, label };
}

function computeTwinCredibility(patient) {
  const completeness = completionValue(patient);
  const sourceCount = [
    sleepReportsOf(patient.id).length,
    oxygenReportsOf(patient.id).length,
    getGlucoseData(patient)?.hasCGM ? 1 : 0,
    getGlucoseData(patient)?.hasFingertip ? 1 : 0,
    scaleRecordsOf(patient.id, "cat").length
  ].filter(Boolean).length;
  const level = completeness >= 90 && sourceCount >= 3 ? "高" : completeness >= 75 && sourceCount >= 2 ? "中" : "低";
  return { completeness, sourceCount, level };
}

function twinMetricTone(value, target, highBad = true) {
  if (value === null || value === undefined || value === "--") return "missing";
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return "missing";
  const offTarget = highBad ? n > target : n < target;
  if (!offTarget) return "normal";
  const severe = highBad ? n >= target * 1.35 : n <= target * .94;
  return severe ? "severe" : "medium";
}

function twinCoreMetricPool(patient) {
  const sleep = sleepReportsOf(patient.id)[0] || {};
  const oxygen = oxygenReportsOf(patient.id)[0] || {};
  const cat = scaleRecordsOf(patient.id, "cat")[0];
  const gd = getGlucoseData(patient);
  const cgm = gd?.cgm;
  const fp = gd?.fingertip;
  const metric = (key, label, value, unit, target, tone, source) => {
    const raw = value ?? "--";
    const text = String(raw);
    const displayValue = unit && text.includes(unit) ? text.replace(unit, "").trim() : raw;
    return { key, label, value: displayValue || "--", unit, target, tone, source };
  };
  return {
    ahi: metric("ahi", "AHI", sleep.ahi, "次/小时", "< 15", twinMetricTone(sleep.ahi, 15, true), "睡眠报告"),
    minSpo2: metric("minSpo2", "最低血氧", sleep.minSpo2 || oxygen.minSpo2, "%", "≥ 90", twinMetricTone(sleep.minSpo2 || oxygen.minSpo2, 90, false), "睡眠/血氧"),
    odi: metric("odi", "ODI", sleep.odi || oxygen.odi, "次/小时", "< 10", twinMetricTone(sleep.odi || oxygen.odi, 10, true), "睡眠/血氧"),
    cpap: metric("cpap", "CPAP 使用", sleep.cpapUsage || sleep.cpapHours, "小时", "≥ 4h", twinMetricTone(sleep.cpapUsage || sleep.cpapHours, 4, false), "设备同步"),
    cat: metric("cat", "CAT", cat?.totalScore, "分", "< 10", twinMetricTone(cat?.totalScore, 10, true), "CAT 量表"),
    avgSpo2: metric("avgSpo2", "平均血氧", oxygen.avgSpo2 || sleep.avgSpo2, "%", "≥ 92", twinMetricTone(oxygen.avgSpo2 || sleep.avgSpo2, 92, false), "血氧监测"),
    ts90: metric("ts90", "Ts90", oxygen.ts90, "%", "< 10", twinMetricTone(oxygen.ts90, 10, true), "血氧监测"),
    hypox: metric("hypox", "低氧时长", oxygen.hypoxDuration, "min", "< 30", twinMetricTone(oxygen.hypoxDuration, 30, true), "血氧监测"),
    avgGlucose: metric("avgGlucose", "平均血糖", cgm?.avgGlucose?.value || fp?.fasting?.value, "mmol/L", "< 7.8", twinMetricTone(cgm?.avgGlucose?.value || fp?.fasting?.value, 7.8, true), gd?.hasCGM ? "CGM" : "指尖血糖"),
    tir: metric("tir", "TIR", cgm?.tir?.value || fp?.reach?.value, "%", "≥ 70", twinMetricTone(cgm?.tir?.value || fp?.reach?.value, 70, false), gd?.hasCGM ? "CGM" : "指尖血糖"),
    ea1c: metric("ea1c", "糖化估算", cgm?.eA1c?.value, "%", "< 7.0", twinMetricTone(cgm?.eA1c?.value, 7.0, true), "CGM 估算"),
    reach: metric("reach", "血糖达标率", fp?.reach?.value || cgm?.tir?.value, "%", "≥ 70", twinMetricTone(fp?.reach?.value || cgm?.tir?.value, 70, false), "血糖记录")
  };
}

function twinCoreMetricKeys(scenarioId) {
  const map = {
    osa: ["ahi", "minSpo2", "odi", "cpap"],
    copd: ["cat", "avgSpo2", "minSpo2", "ts90"],
    dm: ["avgGlucose", "tir", "ea1c", "reach"],
    "osa-dm": ["ahi", "minSpo2", "tir", "avgGlucose"],
    "osa-copd": ["ahi", "minSpo2", "cat", "ts90"],
    "copd-dm": ["cat", "avgSpo2", "tir", "avgGlucose"],
    triple: ["minSpo2", "ahi", "cat", "tir"]
  };
  return map[scenarioId] || ["avgGlucose", "tir", "minSpo2", "ahi"];
}

function renderTwinMetricCard(metric) {
  return `<article class="dt-core-card dt-core-${metric.tone}">
    <div class="dt-core-top"><span>${metric.label}</span><i>${metric.source}</i></div>
    <div class="dt-core-value"><strong>${metric.value}</strong><em>${metric.unit || ""}</em></div>
    <div class="dt-core-target">目标 ${metric.target}</div>
  </article>`;
}

function renderTwinCredibility(credibility, patient) {
  return `<div class="dt-cred-grid">
    <div class="dt-cred-main"><strong>${credibility.level}</strong><span>数据可信度</span></div>
    <div class="dt-cred-bars">
      <div><span>完整率</span><b>${credibility.completeness}%</b></div>
      <div class="dt-bar"><i style="width:${Math.min(100, credibility.completeness)}%"></i></div>
      <div><span>来源数</span><b>${credibility.sourceCount} 类</b></div>
      <div><span>数据状态</span><b>${patient.dataStatus || "正常"}</b></div>
    </div>
  </div>`;
}

function renderTwinInterventions(patient, scenario, statuses) {
  const priority = scenario.organs
    .map((organId) => ({ organId, status: statuses[organId], organ: TWIN_ORGANS[organId] }))
    .filter((item) => item.organ && item.status !== "normal")
    .slice(0, 3);
  const fallback = [{ organId: scenario.default, status: "light", organ: TWIN_ORGANS[scenario.default] }].filter((item) => item.organ);
  return (priority.length ? priority : fallback).map((item, index) => {
    const copy = index === 0
      ? `优先复核 ${item.organ.linkedMetrics.slice(0, 2).join("、")}，确认是否需要调整当前管理方案。`
      : `持续观察 ${item.organ.linkedMetrics.slice(0, 2).join("、")}，纳入下次随访解释。`;
    return `<div class="dt-action-row dt-action-${item.status}">
      <span>${index + 1}</span>
      <div><strong>${item.organ.label}</strong><p>${copy}</p></div>
    </div>`;
  }).join("");
}

function renderTwinRightPanelPlaceholder(patient, scenario, statuses, chains) {
  const focusedOrgan = twinSelectedOrgan || scenario.default;
  const focusedLabel = focusedOrgan ? TWIN_ORGANS[focusedOrgan].label : "—";
  const score = computeTwinHealthScore(patient, statuses);
  const credibility = computeTwinCredibility(patient);
  const metricPool = twinCoreMetricPool(patient);
  const coreMetrics = twinCoreMetricKeys(twinDemoMode ? (TWIN_DEMO_TEMPLATES[twinDemoTemplate]?.scenarioId || scenario.id) : scenario.id)
    .map((key) => metricPool[key])
    .filter(Boolean);
  return `
    <aside class="dt-panel">
      <div class="dt-panel-section">
        <div class="dt-panel-sec-title">数字孪生健康分</div>
        <div class="dt-score-hero dt-score-${score.tone}">
          <div class="dt-score-ring"><span>${score.score}</span></div>
          <div class="dt-score-meta">
            <div class="dt-score-label">${score.label}</div>
            <div>基础分 ${score.baseScore} · 器官负荷扣 ${score.burden}</div>
            <div class="dt-score-sub">基于健康筛查基础分叠加器官状态、共病链路和数据可信度生成</div>
          </div>
        </div>
      </div>
      <div class="dt-panel-section">
        <div class="dt-panel-sec-title">数据可信度</div>
        ${renderTwinCredibility(credibility, patient)}
      </div>
      <div class="dt-panel-section">
        <div class="dt-panel-sec-title">核心指标 4 项</div>
        <div class="dt-core-grid">
          ${coreMetrics.map(renderTwinMetricCard).join("")}
        </div>
      </div>
      <div class="dt-panel-section">
        <div class="dt-panel-sec-title">器官影响 / 共病链路</div>
        <div class="dt-focus-card">
          <div class="dt-focus-label">当前聚焦器官</div>
          <div class="dt-focus-name">${focusedLabel}</div>
          <div class="dt-focus-metrics">
            ${focusedOrgan ? TWIN_ORGANS[focusedOrgan].linkedMetrics
              .map(m => `<span class="dt-metric-chip">${m}</span>`).join("") : ""}
          </div>
        </div>
        <div class="dt-chains-list">
          ${chains.map(c => `
            <div class="dt-chain-card dt-chain-card-${c.severity} ${c.id === twinPlayingChain ? "is-playing" : ""}"
                 data-action="dt-chain-click" data-chain="${c.id}">
              <div class="dt-chain-card-label">${c.label}</div>
              <div class="dt-chain-card-path">
                ${c.path.map(o => TWIN_ORGANS[o].label).join(" → ")}
              </div>
            </div>`).join("")}
        </div>
      </div>
      <div class="dt-panel-section">
        <div class="dt-panel-sec-title">干预优先级建议</div>
        <div class="dt-action-list">
          ${renderTwinInterventions(patient, scenario, statuses)}
        </div>
      </div>
    </aside>`;
}

function renderDigitalTwin(patient) {
  const scenario = detectTwinScenario(patient);
  const statuses = computeTwinOrganStatuses(patient, scenario);
  // 演示模式下用模板对应场景的链路
  const chainScenarioId = twinDemoMode ? (TWIN_DEMO_TEMPLATES[twinDemoTemplate]?.scenarioId || scenario.id) : scenario.id;
  const chains = TWIN_CHAINS[chainScenarioId] || [];

  return `
    <div class="dt-page">
      <div class="dt-layout">
        ${renderTwinCanvas(patient, scenario, statuses, chains)}
        ${renderTwinRightPanelPlaceholder(patient, scenario, statuses, chains)}
      </div>
      <div class="dt-footer-note">
        数字孪生分析基于患者授权数据生成，仅用于慢病管理辅助解释和风险提示，
        不作为诊断、处方或治疗设备参数调整依据。具体诊疗决策需由医生结合线下检查和临床判断完成。
      </div>
    </div>`;
}


function renderOverview(patient) {
  const activePlan = plansOf(patient.id).find((item) => item.id === patient.activePlanId);
  const nextFollow = followupsOf(patient.id).find((item) => item.id === patient.nextFollowupId);
  return `
    <div class="overview-grid">
      <section class="panel clinical-summary">
        <div class="panel-hd"><strong>当前临床摘要</strong><span>${patient.analysis.completeness} 数据完整率</span></div>
        <div class="summary-list">${patient.analysis.summary.map((item) => `<p>${item}</p>`).join("")}</div>
      </section>
      <section class="panel">
        <div class="panel-hd"><strong>当前执行方案</strong><button class="link" data-action="detail-tab" data-tab="plans">查看</button></div>
        <div class="info-block"><h3>${activePlan?.title || "暂无方案"}</h3><p>${activePlan?.objective || "暂无当前执行方案"}</p>${activePlan ? tag(activePlan.status, toneOf(activePlan.status)) : ""}</div>
      </section>
    </div>
    <div class="metric-grid">${patient.analysis.metrics.map((item) => metricCard(item.label, item.value, item.state)).join("")}</div>
    <div class="content-grid">
      <section class="panel">
        <div class="panel-hd"><strong>最近异常</strong><button class="link" data-action="detail-tab" data-tab="alerts">查看全部</button></div>
        <div class="card-list compact">${alertsOf(patient.id).map(alertCard).join("") || empty("暂无预警")}</div>
      </section>
      <section class="panel">
        <div class="panel-hd"><strong>下次随访</strong><button class="link" data-action="detail-tab" data-tab="followups">查看</button></div>
        <div class="info-block"><h3>${nextFollow?.title || "暂无随访"}</h3><p>${nextFollow ? `${nextFollow.dueAt} | ${nextFollow.focus.join("、")}` : "可创建计划内或预警后随访"}</p>${nextFollow ? tag(nextFollow.status, toneOf(nextFollow.status)) : ""}</div>
      </section>
    </div>`;
}

function metricCard(label, value, state) {
  return `<article class="metric-card"><span>${label}</span><strong>${value}</strong>${tag(state, toneOf(state))}</article>`;
}

function renderProfile(patient) {
  const p = patient.profile;
  return `<div class="section-grid">
    ${profileSection("基础信息", [["身高", `${p.height} cm`], ["体重", `${p.weight} kg`], ["BMI", p.bmi], ["居住地", p.address], ["紧急联系人", p.emergency]])}
    ${profileSection("疾病信息", [["首次确诊", p.firstDiagnosis], ["并发症", p.complications.join("、")]])}
    ${profileSection("用药/治疗史", [["当前用药", p.medication.join("；")], ["过敏史", p.allergy]])}
    ${profileSection("生活方式与家族史", [["生活方式", p.lifestyle.join("；")], ["家族史", p.familyHistory.join("；")]])}
    ${profileSection("设备信息", p.devices.map((item) => ["设备", item]))}
  </div>`;
}

function profileSection(title, rows) {
  return `<section class="panel detail-section"><div class="panel-hd"><strong>${title}</strong></div><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl></section>`;
}

function renderScreening(patient) {
  const screening = patient.screening;
  return `<section class="panel">
    <div class="panel-hd"><strong>健康筛查</strong><span>${screening.completedAt} | ${screening.source}</span></div>
    <div class="screening-head"><div><strong>${screening.score}</strong><span>孪生健康分</span></div><p>确认疾病：${screening.confirmed.join("、") || "暂无"}；待确认：${screening.pending.join("、") || "无"}</p></div>
    <div class="disease-grid">${screening.risks.map((risk) => `
      <article class="disease-card">
        <div><h3>${risk.disease}</h3>${tag(risk.level, risk.level === "高风险" ? "red" : "orange")}</div>
        <strong>${risk.score}</strong>
        <p>关键触发项：${risk.factors.join("、")}</p>
        ${screening.pending.includes(risk.disease) ? `<button class="btn primary" data-action="confirm-disease" data-patient="${patient.id}" data-disease="${risk.disease}">确认疾病</button>` : ""}
      </article>`).join("")}</div>
  </section>`;
}

function renderAnalysis(patient) {
  if (!hasSleepBreathingDisorder(patient)) return renderOverview(patient);
  const allReports = sleepReportsOf(patient.id).sort((a, b) => b.monitorDate.localeCompare(a.monitorDate));
  const reports = filterSleepReportsByWindow(allReports, sleepTimeWindow);
  if (!reports.length) return `<section class="panel sleep-empty">
    <div class="panel-hd"><strong>睡眠呼吸深度分析</strong><span>暂无睡眠报告</span></div>
    <div class="empty">当前暂无睡眠相关报告，可建议患者完成睡眠监测后再查看趋势。</div>
  </section>`;
  const selectedId = selectedSleepReportIds[patient.id];
  const latest = reports.find((item) => item.id === selectedId) || reports[0];
  selectedSleepReportIds[patient.id] = latest.id;
  const hasAhi = allReports.some((item) => item.ahi);
  const trendMetric = normalizeSleepTrendMetric(sleepTrendMetric, reports);
  const eventAlert = alertsOf(patient.id).find((item) => /睡眠|低氧/.test(`${item.type}${item.title}`));
  const metrics = [
    hasAhi ? sleepMetric("呼吸事件负担", `${latest.ahi || "--"} 次/小时`, "AHI", "breath", latest.ahi ? "偏高" : "待报告") : sleepMetric("睡眠呼吸事件", latest.respiratoryEvents || "--", "设备报告", "breath", "观察"),
    sleepMetric("氧减负担", `${latest.odi || "--"} 次/小时`, "ODI", "oxygen", latest.odi ? "需关注" : "待报告"),
    sleepMetric("最低血氧", latest.minSpo2 || "--", "夜间 SpO2", "spo2", latest.minSpo2 ? "异常" : "待报告"),
    sleepMetric("体动/鼾声", sleepMotionSnoreHeadline(latest), latest.snoreSummary || latest.movementSummary || "睡眠证据", "activity", sleepMotionSnoreTone(latest)),
    sleepMetric("报告有效性", latest.effectiveHours || "--", `${reports.length}/${sleepWindowDays(sleepTimeWindow)} 晚有报告`, "quality", latest.status)
  ];
  return `<section class="sleep-analysis-page">
    <section class="panel sleep-analysis-head">
      <div>
        <div class="sleep-kicker"><span class="sleep-mark breath"></span>睡眠呼吸深度分析</div>
        <h3>${patient.name} 最近睡眠风险观察</h3>
        <p>${patient.sex} ${patient.age}岁 | 睡眠呼吸障碍 | 当前报告 ${latest.reportTime} | 数据来源 ${latest.deviceModel}</p>
      </div>
      <div class="sleep-actions">
        <div class="sleep-window">${sleepWindowOptions().map((item) => `<button class="chip ${sleepTimeWindow === item.value ? "active" : ""}" data-action="set-sleep-window" data-window="${item.value}" data-patient="${patient.id}">${item.label}</button>`).join("")}</div>
        <div class="actions">
          <button class="btn" data-action="open-sleep-reports" data-patient="${patient.id}">历史报告列表</button>
          <button class="btn" data-action="open-recheck-drawer" data-patient="${patient.id}">复测指标</button>
          <button class="btn primary" data-action="open-followup-drawer" data-patient="${patient.id}">创建随访</button>
        </div>
      </div>
    </section>
    <section class="sleep-risk-banner">
      <div>
        <strong>当前睡眠风险摘要</strong>
        <p>${latest.riskSummary}</p>
      </div>
      <div class="sleep-risk-evidence">
        ${tag(latest.status, latest.status === "异常" ? "red" : "orange")}
        ${eventAlert ? `<span>关联预警 ${eventAlert.id}</span>` : "<span>暂无关联预警</span>"}
        <span>${latest.reportType}</span>
      </div>
    </section>
    <div class="sleep-metric-grid extended">${metrics.join("")}</div>
    <div class="sleep-analysis-grid">
      <section class="panel sleep-trend-panel">
        <div class="panel-hd"><strong>多晚趋势分析</strong><span>${reports.length}/${sleepWindowDays(sleepTimeWindow)} 晚有效</span></div>
        <div class="sleep-trend-switch">${sleepTrendOptions(reports).map((item) => `<button class="chip ${trendMetric === item.value ? "active" : ""}" data-action="set-sleep-trend" data-metric="${item.value}">${item.label}</button>`).join("")}</div>
        ${sleepTrendChart(reports, trendMetric, latest.id)}
        <div class="sleep-chart-legend"><span>当前选择夜</span><span>异常阈值</span><span>缺失夜按断点处理</span></div>
      </section>
      <section class="panel sleep-report-summary">
        <div class="panel-hd"><strong>当前报告摘要</strong><span>${latest.reportType}</span></div>
        ${sleepSummaryGroup("呼吸事件", [
          ["AHI", latest.ahi ? `${latest.ahi} 次/小时` : "当前报告未输出"],
          ["呼吸暂停", latest.apneaCount || "当前报告未输出"],
          ["低通气", latest.hypopneaCount || "当前报告未输出"],
          ["睡眠呼吸事件", latest.respiratoryEvents || "待报告"]
        ])}
        ${sleepSummaryGroup("夜间血氧", [
          ["最低血氧", latest.minSpo2 || "--"],
          ["平均血氧", latest.avgSpo2 || "--"],
          ["ODI", latest.odi ? `${latest.odi} 次/小时` : "--"]
        ])}
        ${sleepSummaryGroup("体动与鼾声", [
          ["体动", latest.movementSummary || "当前设备未输出"],
          ["体动指数", latest.movementIndex || "当前设备未输出"],
          ["鼾声", latest.snoreSummary || "当前设备未输出"],
          ["鼾声占比", latest.snoreIndex || "当前设备未输出"]
        ])}
      </section>
    </div>
    <div class="sleep-analysis-grid detail">
      <section class="panel sleep-single-night">
        <div class="panel-hd"><strong>单夜多轨分析</strong><span>${latest.monitorDate}</span></div>
        ${sleepNightEvidenceChart(latest)}
      </section>
      <section class="panel sleep-structure-panel">
        <div class="panel-hd"><strong>睡眠结构与证据</strong><span>${latest.deviceModel}</span></div>
        ${sleepStageBand(latest.sleepStageSegments)}
        <div class="sleep-structure-list">
          <div><span>有效监测</span><strong>${latest.effectiveHours || "--"}</strong></div>
          <div><span>睡眠分期</span><strong>${latest.sleepStageSummary || "当前设备未输出"}</strong></div>
          <div><span>体动</span><strong>${latest.movementSummary || "当前设备未输出"}</strong></div>
          <div><span>鼾声</span><strong>${latest.snoreSummary || "当前设备未输出"}</strong></div>
          <div><span>${latest.heartRate ? "心率" : "脉率"}</span><strong>${latest.heartRate || latest.pulseRate || "--"}</strong></div>
        </div>
      </section>
    </div>
    <div class="sleep-analysis-grid detail">
      <section class="panel">
        <div class="panel-hd"><strong>异常与临床关联</strong><button class="btn" data-action="send-advice" data-patient="${patient.id}">发送医生建议</button></div>
        <div class="sleep-association-list">
          ${patient.analysis.summary.filter((item) => /睡眠|血氧|CPAP|设备/.test(item)).map((item) => `<article><span class="sleep-mark report"></span><p>${item}</p></article>`).join("")}
          ${patient.analysis.correlations.filter((item) => /睡眠|血氧|CPAP/.test(item)).map((item) => `<article><span class="sleep-mark followup"></span><p>${item}</p></article>`).join("")}
        </div>
      </section>
      <section class="panel sleep-history">
        <div class="panel-hd"><strong>历史报告列表</strong><button class="btn" data-action="open-sleep-reports" data-patient="${patient.id}">查看全部</button></div>
        <div class="sleep-report-list">
          ${allReports.slice(0, 6).map((item) => sleepReportRow(item, latest.id)).join("")}
        </div>
      </section>
    </div>
  </section>`;
}

function sleepWindowOptions() {
  return [
    { label: "最近 1 晚", value: "1" },
    { label: "最近 7 晚", value: "7" },
    { label: "最近 14 晚", value: "14" },
    { label: "最近 30 晚", value: "30" }
  ];
}

function sleepWindowDays(value) {
  return Number(value) || 7;
}

function filterSleepReportsByWindow(reports, windowValue) {
  const count = sleepWindowDays(windowValue);
  if (count === 1) return reports.slice(0, 1);
  const latestDate = new Date(`${reports[0]?.monitorDate || ""}T00:00:00`);
  if (Number.isNaN(latestDate.getTime())) return reports.slice(0, count);
  const minDate = new Date(latestDate);
  minDate.setDate(latestDate.getDate() - count + 1);
  return reports.filter((item) => new Date(`${item.monitorDate}T00:00:00`) >= minDate);
}

function sleepTrendOptions(reports) {
  const options = [];
  if (reports.some((item) => item.ahi)) options.push({ label: "AHI", value: "ahi" });
  if (reports.some((item) => item.odi)) options.push({ label: "ODI", value: "odi" });
  if (reports.some((item) => item.minSpo2)) options.push({ label: "最低血氧", value: "minSpo2" });
  if (reports.some((item) => item.movementSeries?.length || item.movementIndex)) options.push({ label: "体动", value: "movement" });
  if (reports.some((item) => item.snoreSeries?.length || item.snoreIndex)) options.push({ label: "鼾声", value: "snore" });
  return options.length ? options : [{ label: "ODI", value: "odi" }];
}

function normalizeSleepTrendMetric(metric, reports) {
  const options = sleepTrendOptions(reports).map((item) => item.value);
  if (options.includes(metric)) return metric;
  sleepTrendMetric = options[0] || "odi";
  return sleepTrendMetric;
}

function numberValue(value) {
  const match = String(value || "").match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

function sleepTrendValue(report, metric) {
  if (metric === "minSpo2") return numberValue(report.minSpo2);
  if (metric === "movement") return numberValue(report.movementIndex) ?? (report.movementSeries || []).reduce((sum, item) => sum + Number(item || 0), 0);
  if (metric === "snore") return numberValue(report.snoreIndex) ?? maxSeries(report.snoreSeries || []);
  return numberValue(report[metric]);
}

function sleepTrendMeta(metric) {
  const map = {
    ahi: { label: "AHI", unit: "次/小时", threshold: 15, highBad: true },
    odi: { label: "ODI", unit: "次/小时", threshold: 15, highBad: true },
    minSpo2: { label: "最低血氧", unit: "%", threshold: 90, highBad: false },
    movement: { label: "体动指数", unit: "次/小时", threshold: 2, highBad: true },
    snore: { label: "鼾声占比", unit: "%", threshold: 30, highBad: true }
  };
  return map[metric] || map.odi;
}

function sleepTrendChart(reports, metric, selectedId) {
  const chronological = reports.slice().reverse();
  const values = chronological.map((item) => sleepTrendValue(item, metric));
  const validValues = values.filter((item) => item !== null);
  const meta = sleepTrendMeta(metric);
  const max = Math.max(meta.threshold, ...validValues, 1);
  const min = metric === "minSpo2" ? Math.min(80, ...validValues) : 0;
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    if (value === null) return null;
    const x = chronological.length === 1 ? 50 : 8 + (index / (chronological.length - 1)) * 84;
    const y = 88 - ((value - min) / range) * 68;
    return { x, y, value, report: chronological[index] };
  });
  const polyline = points.filter(Boolean).map((point) => `${point.x},${point.y}`).join(" ");
  const thresholdY = 88 - ((meta.threshold - min) / range) * 68;
  return `<div class="sleep-trend-chart">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="${meta.label}趋势">
      <line class="threshold-line" x1="6" y1="${thresholdY}" x2="94" y2="${thresholdY}"></line>
      <polyline class="trend-line" points="${polyline}"></polyline>
      ${points.filter(Boolean).map((point) => {
        const abnormal = meta.highBad ? point.value >= meta.threshold : point.value < meta.threshold;
        return `<circle class="${abnormal ? "abnormal" : ""} ${point.report.id === selectedId ? "selected" : ""}" cx="${point.x}" cy="${point.y}" r="${point.report.id === selectedId ? "2.8" : "2.2"}"><title>${point.report.monitorDate} ${meta.label} ${point.value}${meta.unit}</title></circle>`;
      }).join("")}
    </svg>
    <div class="sleep-trend-points">
      ${chronological.map((report) => {
        const value = sleepTrendValue(report, metric);
        return `<button class="${report.id === selectedId ? "active" : ""}" data-action="select-sleep-report" data-patient="${report.patientId}" data-report="${report.id}" title="${escapeAttr(report.riskSummary)}">
          <strong>${report.monitorDate.slice(5)}</strong>
          <span>${value === null ? "--" : `${value}${meta.unit}`}</span>
        </button>`;
      }).join("")}
    </div>
  </div>`;
}

function sleepMetric(label, value, meta, icon, state) {
  return `<article class="sleep-metric-card">
    <span class="sleep-mark ${icon}"></span>
    <div><small>${label}</small><strong>${value}</strong><em>${meta}</em></div>
    ${tag(state, toneOf(state))}
  </article>`;
}

function sleepSummaryGroup(title, rows) {
  return `<div class="sleep-summary-group"><h4>${title}</h4>${rows.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>`;
}

function maxSeries(series) {
  return Math.max(0, ...series.map((item) => Number(item || 0)));
}

function sleepMotionSnoreHeadline(report) {
  if (report.movementIndex || report.snoreIndex) return [report.movementIndex, report.snoreIndex].filter(Boolean).join(" / ");
  if (report.movementSummary || report.snoreSummary) return "有摘要";
  return "未输出";
}

function sleepMotionSnoreTone(report) {
  const movement = numberValue(report.movementIndex);
  const snore = numberValue(report.snoreIndex);
  if ((movement !== null && movement >= 2) || (snore !== null && snore >= 30)) return "需关注";
  if (movement !== null || snore !== null) return "观察";
  return "待报告";
}

function sleepNightEvidenceChart(report) {
  return `<div class="sleep-evidence-chart">
    <div class="sleep-track-labels"><span>22:00</span><span>01:00</span><span>04:00</span><span>07:00</span></div>
    ${sleepLineTrack("SpO2", report.spo2Series || [], 84, 98, "%", "oxygen")}
    ${sleepBarTrack("呼吸事件", report.eventSeries || [], "event")}
    ${sleepBarTrack("体动", report.movementSeries || [], "movement")}
    ${sleepBarTrack("鼾声", report.snoreSeries || [], "snore")}
  </div>`;
}

function sleepLineTrack(label, series, min, max, unit, type) {
  if (!series.length) return `<div class="sleep-track-row empty"><span>${label}</span><strong>当前报告未输出连续${label}曲线</strong></div>`;
  const range = Math.max(max - min, 1);
  const points = series.map((value, index) => {
    const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
    const y = 88 - ((Number(value) - min) / range) * 76;
    return `${x},${Math.max(8, Math.min(92, y))}`;
  }).join(" ");
  return `<div class="sleep-track-row ${type}">
    <span>${label}</span>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <line class="danger-line" x1="0" y1="${88 - ((90 - min) / range) * 76}" x2="100" y2="${88 - ((90 - min) / range) * 76}"></line>
      <polyline points="${points}"></polyline>
    </svg>
    <strong>${Math.min(...series)}-${Math.max(...series)}${unit}</strong>
  </div>`;
}

function sleepBarTrack(label, series, type) {
  if (!series.length) return `<div class="sleep-track-row empty"><span>${label}</span><strong>当前设备未输出</strong></div>`;
  const max = Math.max(1, ...series.map((item) => Number(item || 0)));
  return `<div class="sleep-track-row ${type}">
    <span>${label}</span>
    <div class="sleep-track-bars">${series.map((value) => `<i style="height:${Math.max(8, (Number(value || 0) / max) * 78)}%"></i>`).join("")}</div>
    <strong>${label === "鼾声" ? `${max}%峰值` : `${series.reduce((sum, item) => sum + Number(item || 0), 0)}段`}</strong>
  </div>`;
}

function sleepStageBand(segments = []) {
  if (!segments.length) return `<div class="sleep-stage-band empty">当前设备未输出睡眠分期</div>`;
  const total = segments.reduce((sum, [, value]) => sum + Number(value || 0), 0) || 1;
  return `<div class="sleep-stage-band">
    ${segments.map(([stage, value]) => `<span class="${sleepStageClass(stage)}" style="flex:${Number(value || 0) / total}" title="${escapeAttr(`${stage} ${value}%`)}">${stage}</span>`).join("")}
  </div>`;
}

function sleepStageClass(stage) {
  if (stage.includes("深")) return "deep";
  if (stage.includes("REM")) return "rem";
  if (stage.includes("清醒")) return "awake";
  return "light";
}

function sleepReportRow(report, selectedId) {
  return `<button class="sleep-report-row ${report.id === selectedId ? "active" : ""}" data-action="select-sleep-report" data-patient="${report.patientId}" data-report="${report.id}">
    <span><strong>${report.monitorDate}</strong><small>${report.reportTime} | ${report.reportType}</small></span>
    <span>${report.deviceModel}</span>
    <span>AHI ${report.ahi || "-"}</span>
    <span>ODI ${report.odi || "-"}</span>
    <span>最低 ${report.minSpo2 || "-"}</span>
    ${tag(report.status, toneOf(report.status))}
  </button>`;
}

function openSleepReportsModal(patientId) {
  const patient = patientById(patientId);
  const reports = sleepReportsOf(patientId).sort((a, b) => b.monitorDate.localeCompare(a.monitorDate));
  openModal(
    `${patient.name} 的历史睡眠报告`,
    `<div class="sleep-report-modal">
      <div class="sleep-report-modal-head">
        <strong>报告列表</strong>
        <span>点击某晚报告后，患者详情会切换为该晚的完整睡眠数据。</span>
      </div>
      <div class="sleep-report-list full">${reports.map((report) => sleepReportRow(report, selectedSleepReportIds[patientId])).join("")}</div>
    </div>`,
    `<button class="btn" data-action="close-modal">关闭</button>`
  );
}

function selectSleepReport(patientId, reportId) {
  selectedPatientId = patientId;
  selectedSleepReportIds[patientId] = reportId;
  detailTab = "analysis";
  currentView = "detail";
  closeModal();
  render();
  showToast("已切换到该晚报告详情");
}

function setSleepWindow(patientId, value) {
  sleepTimeWindow = value;
  const reports = filterSleepReportsByWindow(sleepReportsOf(patientId).sort((a, b) => b.monitorDate.localeCompare(a.monitorDate)), sleepTimeWindow);
  if (!reports.some((item) => item.id === selectedSleepReportIds[patientId])) selectedSleepReportIds[patientId] = reports[0]?.id;
  render();
}

function setSleepTrend(metric) {
  sleepTrendMetric = metric;
  render();
}

/* ============================================================
   慢阻肺深度分析 Tab
   ============================================================ */

const COPD_THRESHOLD = {
  avgSpo2: { green: 95, orange: 93, unit: "%" },
  minSpo2: { green: 90, orange: 85, unit: "%" },
  odi: { green: 5, orange: 10, unit: "次/小时" },
  hypoxEventCount: { green: 0, orange: 10, unit: "次" },
  hypoxDuration: { green: 0, orange: 30, unit: "分钟" },
  ts90: { green: 5, orange: 10, unit: "%" }
};

function copdRiskLevel(key, value) {
  const t = COPD_THRESHOLD[key];
  if (!t) return "green";
  if (key === "avgSpo2" || key === "minSpo2") {
    if (value >= t.green) return "green";
    if (value >= t.orange) return "orange";
    return "red";
  }
  if (value <= t.green) return "green";
  if (value <= t.orange) return "orange";
  return "red";
}

function copdRiskColor(level) {
  return { green: "#10B981", orange: "#F59E0B", red: "#EF4444" }[level] || "#10B981";
}

function copdRiskLabel(level) {
  return { green: "正常", orange: "轻度异常", red: "重度异常" }[level] || "正常";
}

const CAT_LEVEL_MAP = { mild: "轻微影响", moderate: "中度影响", severe: "重度影响", verySevere: "极重度影响" };
const MMRC_DESC_MAP = { none: "无呼吸困难", mild: "轻度气短", moderate: "中度呼吸困难", severe: "重度呼吸困难", verySevere: "极重度呼吸困难" };
const MMRC_GOLD_MAP = { 0: "低症状组(A/C)", 1: "低症状组(A/C)", 2: "高症状组(B/E)", 3: "高症状组(B/E)", 4: "高症状组(B/E)" };
const CAT_LEVEL_COLOR = { mild: "#10B981", moderate: "#F59E0B", severe: "#EF4444", verySevere: "#7C3AED" };

function copdMetricCard(title, value, target, unit, key) {
  const level = copdRiskLevel(key, value);
  const color = copdRiskColor(level);
  const label = copdRiskLabel(level);
  const isUpper = key === "avgSpo2" || key === "minSpo2";
  const targetDisplay = isUpper ? `≥${target}` : `<${target}`;
  const valueDisplay = typeof value === "number" ? `${value}${unit}` : "-";
  const sourceTag = key === "avgSpo2" || key === "minSpo2" ? "采集" : "衍生";
  return `<div class="copd-m-card" style="border-color:${color}">
    <span class="copd-m-tag ${sourceTag === "衍生" ? "d" : ""}">${sourceTag}</span>
    <span class="copd-m-val" style="color:${color}">${valueDisplay}</span>
    <span class="copd-m-lbl" style="background:${color}">${label}</span>
    <span class="copd-m-tt">${title} · 目标${targetDisplay}</span>
  </div>`;
}

function copdAISection(patient, latestReport) {
  if (!latestReport) {
    const catLatest = scaleRecordsOf(patient.id, "cat")[0];
    if (catLatest) {
      return `<div class="copd-ai">
        <div class="copd-ai-hd">AI 智能分析</div>
        <div class="copd-ai-blk">当前血氧有效监测数据不足，暂不输出缺氧风险和氧减负担结论。CAT评分${catLatest.totalScore}分（${CAT_LEVEL_MAP[catLatest.levelName]}），建议确保血氧设备正常同步并补齐监测记录。</div>
      </div>`;
    }
    return `<div class="copd-ai"><div class="copd-ai-hd">AI 智能分析</div><div class="copd-ai-blk">当前血氧有效监测数据不足，暂无呼吸测评问卷数据，建议提醒患者完成CAT评估并确保血氧设备正常同步。</div></div>`;
  }

  const avgSpo2 = latestReport.avgSpo2;
  const minSpo2 = latestReport.minSpo2;
  const ts90 = latestReport.ts90;
  const odi = latestReport.odi;
  const hypoxCount = latestReport.hypoxEventCount;
  const hypoxDur = latestReport.hypoxDuration;
  const catLatest = scaleRecordsOf(patient.id, "cat")[0];
  const mmrcLatest = scaleRecordsOf(patient.id, "mmrc")[0];

  // 6.4.1 整体缺氧风险评估
  let hypoxRisk;
  if (avgSpo2 >= 95 && minSpo2 >= 90 && ts90 < 5) hypoxRisk = "正常";
  else if (avgSpo2 < 93 || minSpo2 < 85 || ts90 >= 10) hypoxRisk = "重度";
  else hypoxRisk = "轻度";

  // 6.4.2 氧减负担评估
  let burdenLevel;
  if (odi < 5 && hypoxDur === 0) burdenLevel = "轻微";
  else if (odi >= 10 || hypoxDur >= 30) burdenLevel = "重度";
  else burdenLevel = "中度";

  // 6.4.3 急性加重风险预警
  let exacerbationRisk;
  const catPrev = scaleRecordsOf(patient.id, "cat")[1];
  const mmrcPrev = scaleRecordsOf(patient.id, "mmrc")[1];
  const catMcid = catLatest && catPrev ? catLatest.totalScore - catPrev.totalScore : 0;
  const mmrcChange = mmrcLatest && mmrcPrev ? mmrcLatest.grade - mmrcPrev.grade : 0;

  if ((ts90 < 5 && hypoxDur < 10) && catMcid < 2 && mmrcChange <= 0) exacerbationRisk = "低";
  else if (ts90 >= 10 || minSpo2 < 85 || mmrcChange >= 1) exacerbationRisk = "高";
  else exacerbationRisk = "中";

  // 6.4.4 主观症状+干预建议
  const catScore = catLatest ? catLatest.totalScore : null;
  const catImpact = catLatest ? CAT_LEVEL_MAP[catLatest.levelName] : "无数据";
  const mmrcGrade = mmrcLatest ? mmrcLatest.grade : null;
  const mmrcDesc = mmrcLatest ? MMRC_DESC_MAP[mmrcLatest.levelName] : "无数据";

  let interventionAdvice;
  if (exacerbationRisk === "高") interventionAdvice = "建议低流量吸氧干预，每日完成血氧监测与CAT问卷，严格遵医嘱用药，出现胸闷气促立即就医";
  else if (exacerbationRisk === "中") interventionAdvice = "建议关注低氧趋势，必要时增加低流量吸氧时长，每日完成血氧监测与CAT问卷，出现气促加重及时复测";
  else interventionAdvice = "建议维持当前氧疗方案，每日完成血氧监测与CAT问卷，遵医嘱用药";

  const catMcidDisplay = catMcid >= 2 ? `+${catMcid}↑` : catMcid <= -2 ? `${catMcid}↓` : catMcid !== 0 ? `${catMcid > 0 ? "+" : ""}${catMcid}` : "不变";
  const mmrcChangeDisplay = mmrcChange >= 1 ? `+${mmrcChange}↑` : mmrcChange <= -1 ? `${mmrcChange}↓` : "不变";

  return `<div class="copd-ai">
    <div class="copd-ai-hd">慢阻肺AI智能分析</div>
    <div class="copd-ai-blk">
      <div class="copd-ai-st">① 缺氧风险</div>
      <p>均值${avgSpo2}%、最低${minSpo2}%、Ts90%=${ts90}%、ODI=${odi} → <strong style="color:${copdRiskColor(hypoxRisk === "正常" ? "green" : hypoxRisk === "重度" ? "red" : "orange")}">${hypoxRisk}</strong></p>
    </div>
    <div class="copd-ai-blk">
      <div class="copd-ai-st">② 氧减负担</div>
      <p>ODI=${odi}/h，低氧${hypoxCount}次/${hypoxDur}min → <strong style="color:${copdRiskColor(burdenLevel === "轻微" ? "green" : burdenLevel === "重度" ? "red" : "orange")}">${burdenLevel}</strong></p>
    </div>
    <div class="copd-ai-blk">
      <div class="copd-ai-st">③ 急性加重预警</div>
      <p>低氧${hypoxDur}min，Ts90%=${ts90}%，CAT${catMcidDisplay}，mMRC${mmrcChangeDisplay} → <strong style="color:${copdRiskColor(exacerbationRisk === "低" ? "green" : exacerbationRisk === "高" ? "red" : "orange")}">${exacerbationRisk}</strong></p>
    </div>
    <div class="copd-ai-blk">
      <div class="copd-ai-st">④ 干预建议</div>
      <p>CAT ${catScore ?? "无"}分(${catImpact})，mMRC ${mmrcGrade ?? "无"}级(${mmrcDesc}); ${interventionAdvice}</p>
    </div>
  </div>`;
}

function copdScaleCard(type, record, prevRecord) {
  if (!record) return `<div class="copd-scl-empty">暂无${type === "cat" ? "CAT" : "mMRC"}评估数据</div>`;
  if (type === "cat") {
    const mcid = prevRecord ? record.totalScore - prevRecord.totalScore : null;
    const mcidDisplay = mcid !== null ? (mcid >= 2 ? `+${mcid}分（有临床意义变化↑）` : mcid <= -2 ? `${mcid}分（有改善↓）` : `${mcid > 0 ? "+" : ""}${mcid}分`) : "-";
    const goldGroup = record.totalScore >= 10 ? "更多症状组(GOLD B/E)" : "较少症状组(GOLD A/C)";
    const color = CAT_LEVEL_COLOR[record.levelName] || "#10B981";
    return `<div class="copd-scl-card" style="border-top:3px solid ${color}">
      <div class="copd-scl-hd"><span>CAT慢阻肺评估测试</span><span class="copd-scl-badge" style="background:${color};color:#fff">${CAT_LEVEL_MAP[record.levelName]}</span></div>
      <div class="copd-scl-score" style="color:${color}">${record.totalScore}分</div>
      <div class="copd-scl-meta">GOLD分组：${goldGroup} | MCID变化：${mcidDisplay}</div>
      <div class="copd-scl-time">填报时间：${record.completedAt.replace("T", " ").slice(0, 16)}</div>
    </div>`;
  }
  // mMRC
  const goldGroup = record.grade >= 2 ? "高症状组(GOLD B/E)" : "低症状组(GOLD A/C)";
  const color = record.levelColor || "#EF4444";
  const mmrcChange = prevRecord ? record.grade - prevRecord.grade : null;
  const changeDisplay = mmrcChange !== null ? (mmrcChange >= 1 ? `+${mmrcChange}级（加重↑）` : mmrcChange <= -1 ? `${mmrcChange}级（改善↓）` : "无变化") : "-";
  return `<div class="copd-scl-card" style="border-top:3px solid ${color}">
    <div class="copd-scl-hd"><span>mMRC呼吸困难指数</span><span class="copd-scl-badge" style="background:${color};color:#fff">${MMRC_DESC_MAP[record.levelName]}</span></div>
    <div class="copd-scl-score" style="color:${color}">${record.grade}级</div>
    <div class="copd-scl-meta">GOLD分组：${goldGroup} | 近期变化：${changeDisplay}</div>
    <div class="copd-scl-time">填报时间：${record.completedAt.replace("T", " ").slice(0, 16)}</div>
  </div>`;
}

function renderCOPDAnalysis(patient) {
  if (!hasCOPD(patient)) return renderOverview(patient);

  const reports = oxygenReportsOf(patient.id);
  const latestReport = reports[0];
  const trend = oxygenTrendOf(patient.id);
  const symptoms = copdSymptomsOf(patient.id);
  const catRecords = scaleRecordsOf(patient.id, "cat");
  const mmrcRecords = scaleRecordsOf(patient.id, "mmrc");
  const catLatest = catRecords[0];
  const mmrcLatest = mmrcRecords[0];
  const catPrev = catRecords[1];

  const aiSummary = latestReport
    ? `均值${latestReport.avgSpo2}%，低氧${latestReport.hypoxDuration}min，ODI=${latestReport.odi}，Ts90%=${latestReport.ts90}%；${catLatest ? `CAT${catLatest.totalScore}分` : "无CAT"}${mmrcLatest ? `、mMRC${mmrcLatest.grade}级` : ""}，急性加重风险${latestReport.ts90 >= 10 || latestReport.minSpo2 < 85 ? "偏高" : "需关注"}。`
    : "血氧有效监测数据不足，建议确保设备正常同步。";

  const metricCards = latestReport ? [
    copdMetricCard("平均血氧", latestReport.avgSpo2, 95, "%", "avgSpo2"),
    copdMetricCard("最低血氧", latestReport.minSpo2, 90, "%", "minSpo2"),
    copdMetricCard("ODI", latestReport.odi, 5, "次/h", "odi"),
    copdMetricCard("低氧次数", latestReport.hypoxEventCount, 0, "次", "hypoxEventCount"),
    copdMetricCard("低氧时长", latestReport.hypoxDuration, 0, "min", "hypoxDuration"),
    copdMetricCard("Ts90%", latestReport.ts90, 5, "%", "ts90")
  ] : [`<div class="copd-empty">暂无血氧监测数据</div>`];

  let overallRisk = "green";
  if (latestReport) {
    for (const [key, t] of Object.entries(COPD_THRESHOLD)) {
      const val = latestReport[key];
      const level = copdRiskLevel(key, val);
      if (level === "red") { overallRisk = "red"; break; }
      if (level === "orange") overallRisk = "orange";
    }
  }

  const detailRows = reports.slice(0, 5).map((r) => `<tr>
    <td>${r.monitorDate}</td>
    <td>${r.monitorPeriod || "-"}</td>
    <td style="color:${copdRiskColor(copdRiskLevel("avgSpo2", r.avgSpo2))}">${r.avgSpo2}%</td>
    <td style="color:${copdRiskColor(copdRiskLevel("minSpo2", r.minSpo2))}">${r.minSpo2}%</td>
    <td style="color:${copdRiskColor(copdRiskLevel("odi", r.odi))}">${r.odi}</td>
    <td style="color:${copdRiskColor(copdRiskLevel("ts90", r.ts90))}">${r.ts90}%</td>
    <td>${r.hypoxEventCount}/${r.hypoxDuration}min</td>
  </tr>`);

  const symptomTags = symptoms.length ? symptoms.map((s) => `<span class="copd-sym-tag">${s.name}<span class="copd-sym-freq">${s.frequency}</span></span>`).join("") : `<div class="copd-empty">暂无症状记录</div>`;

  const activePlan = state.plans.find((p) => p.patientId === patient.id && p.statusCode === "active");
  const treatmentSection = activePlan ? (() => {
    const meds = activePlan.modules.find((m) => m.key === "medication")?.fields?.medicationItems || [];
    const lifestyleItems = activePlan.modules.find((m) => m.key === "lifestyle")?.fields?.guidanceItems || [];
    const abnormalHandling = activePlan.modules.find((m) => m.key === "guidance")?.fields?.abnormalHandling || activePlan.modules.find((m) => m.key === "alerts")?.fields?.alertRules?.map((r) => `${r.metricName}${r.operator}${r.threshold}`).join("、") || "-";
    return `<div class="copd-treat-row">
      <div><span class="copd-treat-lbl">用药+氧疗</span>${meds.length ? meds.map((m) => `${m.drugName}${m.dose}${m.frequency}`).join("、") : "暂无"}</div>
      <div><span class="copd-treat-lbl">生活指导</span>${lifestyleItems.length ? lifestyleItems.map((l) => `${l.type}:${l.instruction}`).join("；") : "避免受凉，坚持肺康复训练"}</div>
      <div><span class="copd-treat-lbl">异常处理</span>${abnormalHandling}</div>
    </div>`;
  })() : `<div class="copd-empty">暂无慢阻肺管理方案</div>`;

  const hasOSA = hasSleepBreathingDisorder(patient);
  const overlapCard = hasOSA && latestReport ? `<div class="copd-overlap">
    <div class="copd-overlap-hd">重叠综合征(COPD+OSA)提示</div>
    <div class="copd-overlap-sm">ODI=${latestReport.odi}/h，最低血氧=${latestReport.minSpo2}%，睡眠呼吸事件叠加低氧负担</div>
    <div class="copd-overlap-desc">建议在睡眠深度分析查看完整AHI详情，综合评估氧疗方案</div>
    <button class="btn-sm" data-action="enter-sleep-tab" data-patient="${patient.id}">进入睡眠分析 ›</button>
  </div>` : "";

  return `<section class="copd-page">
    <div class="copd-banner" style="background:${copdRiskColor(overallRisk)}12;border-left:3px solid ${copdRiskColor(overallRisk)}">
      <div class="copd-banner-text">${aiSummary}</div>
      <button class="btn primary" data-action="enter-twin" data-patient="${patient.id}" style="font-size:13px;padding:6px 14px">进入孪生分析</button>
    </div>

    <div class="copd-m-strip">${metricCards.join("")}</div>

    <div class="copd-charts-2col">
      ${latestReport ? `<div class="copd-chart-box">
        <div class="copd-chart-hd">血氧时序（${latestReport.monitorDate} ${latestReport.monitorPeriod || ""}）</div>
        <div class="copd-chart-canvas"><canvas id="copdSpo2Chart"></canvas></div>
      </div>` : `<div class="copd-empty">暂无血氧监测数据</div>`}
      ${trend.length ? `<div class="copd-chart-box">
        <div class="copd-chart-hd">低氧趋势 + Ts90%</div>
        <div class="copd-chart-canvas"><canvas id="copdTrendChart"></canvas></div>
      </div>` : ""}
    </div>

    ${copdAISection(patient, latestReport)}

    <div class="copd-panel">
      <div class="copd-panel-hd">监测明细</div>
      ${reports.length ? `<table class="copd-tbl">
        <thead><tr><th>日期</th><th>时段</th><th>平均SpO2</th><th>最低SpO2</th><th>ODI</th><th>Ts90%</th><th>低氧次数/时长</th></tr></thead>
        <tbody>${detailRows.join("")}</tbody>
      </table>` : `<div class="copd-empty">暂无监测明细</div>`}
    </div>

    <div class="copd-panel">
      <div class="copd-panel-hd">呼吸测评问卷</div>
      <div class="copd-scl-grid">
        ${copdScaleCard("cat", catLatest, catPrev)}
        ${copdScaleCard("mmrc", mmrcLatest, mmrcLatest ? mmrcRecords[1] : null)}
      </div>
      ${catRecords.length >= 2 ? `<div class="copd-chart-box compact"><div class="copd-chart-hd">CAT趋势</div><div class="copd-chart-canvas small"><canvas id="copdCatTrend"></canvas></div></div>` : ""}
      ${(catRecords.length + mmrcRecords.length) > 0 ? `<table class="copd-tbl">
        <thead><tr><th>时间</th><th>类型</th><th>得分</th><th>MCID变化</th><th>操作</th></tr></thead>
        <tbody>${[...catRecords.slice(0, 5), ...mmrcRecords.slice(0, 5)].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).map((r) => {
          const isCat = r.scaleCode === "cat";
          const prev = isCat ? catRecords[catRecords.indexOf(r) + 1] : mmrcRecords[mmrcRecords.indexOf(r) + 1];
          const mcid = prev ? (isCat ? r.totalScore - prev.totalScore : r.grade - prev.grade) : null;
          const mcidLabel = mcid !== null ? (isCat ? (mcid >= 2 ? `+${mcid}↑` : mcid <= -2 ? `${mcid}↓` : `${mcid > 0 ? "+" : ""}${mcid}`) : (mcid >= 1 ? `+${mcid}↑` : mcid <= -1 ? `${mcid}↓` : "无变化")) : "-";
          return `<tr>
            <td>${r.completedAt.replace("T"," ").slice(0,16)}</td>
            <td>${isCat ? "CAT" : "mMRC"}</td>
            <td>${isCat ? r.totalScore + "分" : r.grade + "级"}</td>
            <td>${mcidLabel}</td>
            <td><button class="btn-sm" data-action="copd-scale-detail" data-scale-id="${r.id}" data-scale-code="${r.scaleCode}">详情</button></td>
          </tr>`;
        }).join("")}</tbody>
      </table>` : `<div class="copd-empty">暂无问卷数据</div>`}
    </div>

    <div class="copd-panel">
      <div class="copd-panel-hd">症状</div>
      <div class="copd-sym-row">${symptomTags}</div>
    </div>

    <div class="copd-panel">
      <div class="copd-panel-hd">治疗管理</div>
      ${treatmentSection}
    </div>

    ${overlapCard}
  </section>`;
}

function renderPatientAlerts(patient) {
  return `<section class="panel"><div class="panel-hd"><strong>预警记录</strong></div><div class="card-list">${alertsOf(patient.id).map(alertCard).join("") || empty("暂无预警")}</div></section>`;
}

function renderPatientPlans(patient) {
  return `<section class="panel"><div class="panel-hd"><strong>管理方案</strong><button class="btn primary" data-action="create-plan" data-patient="${patient.id}">新建方案草稿</button></div><div class="card-list">${plansOf(patient.id).map(planCard).join("") || empty("暂无方案")}</div></section>`;
}

function renderPatientFollowups(patient) {
  return `<section class="panel"><div class="panel-hd"><strong>随访记录</strong><button class="btn primary" data-action="open-followup-drawer" data-patient="${patient.id}">创建随访</button></div><div class="card-list">${followupsOf(patient.id).map(followupCard).join("") || empty("暂无随访")}</div></section>`;
}

function renderTimeline(patient) {
  const events = state.timeline.filter((item) => item.patientId === patient.id);
  return `<section class="panel"><div class="panel-hd"><strong>患者管理时间轴</strong></div><div class="timeline-full">${events.map((item) => `<article><time>${item.time}</time>${tag(item.type, "blue")}<strong>${item.text}</strong><p>操作者：${item.type === "预警" ? "系统" : "林医生"}，来源对象已关联，可进入详情查看。</p></article>`).join("") || empty("暂无时间轴")}</div></section>`;
}

function renderAdvice(patient) {
  const adviceCard = (item) => {
    const title = item.title || item.type || "医生建议";
    const content = item.content || item.text || "";
    const source = item.sourceType === "alert" ? "预警后" : item.sourceType === "followup" ? "随访后" : item.source || "手动发起";
    return `<article class="flow-card"><div class="card-top"><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(source)} | ${item.sentAt || item.createdAt}</p></div>${tag(item.status, toneOf(item.status))}</div><p>${escapeHtml(content)}</p></article>`;
  };
  return `<section class="panel"><div class="panel-hd"><strong>医生建议</strong><button class="btn primary" data-action="send-advice" data-patient="${patient.id}">发送医生建议</button></div><div class="card-list">${adviceOf(patient.id).map(adviceCard).join("") || empty("暂无医生建议")}</div></section>`;
}

function renderAlerts() {
  const { pageItems } = paginateItems("alerts", state.alerts);
  const pendingCount = state.alerts.filter((item) => item.status === "待处理").length;
  const urgentCount = state.alerts.filter((item) => item.status === "待处理" && item.level === "紧急").length;
  const importantCount = state.alerts.filter((item) => item.status === "待处理" && item.level === "重要").length;
  const closedLoopCount = state.alerts.filter((item) => item._actionSummary).length;
  app.innerHTML = `<section class="page-stack operations-page alert-workbench">
    <div class="workbench-summary">
      ${workbenchStat("待处理预警", pendingCount, "先处理紧急与重要事件", "danger")}
      ${workbenchStat("紧急", urgentCount, "存在安全边界风险", "urgent")}
      ${workbenchStat("重要", importantCount, "需要医生判断处置", "warning")}
      ${workbenchStat("已形成动作", closedLoopCount, "已关联复测、建议或随访", "success")}
    </div>
    <section class="panel operations-panel">
      <div class="panel-hd"><strong>预警任务流</strong><span>${pendingCount} 条待处理，按优先级推进闭环</span></div>
      <div class="card-list">${pageItems.map(alertCard).join("")}</div>
      ${renderPagination("alerts", state.alerts.length)}
    </section>
  </section>`;
}

function alertCard(alert) {
  const disabled = alert.status !== "待处理" ? "disabled" : "";
  const actionSummary = alert._actionSummary ? `<div class="alert-action-summary">${alert._actionSummary}</div>` : "";
  return `<article class="flow-card alert-card ${alert.level === "紧急" ? "urgent" : alert.level === "重要" ? "important" : ""}">
    <div class="card-top"><div><h3>${alert.title}</h3><p>${patientName(alert.patientId)} | ${alert.type} | ${alert.createdAt}</p></div><div>${tag(alert.level, toneOf(alert.level))}${tag(alert.status, toneOf(alert.status))}</div></div>
    <div class="evidence"><strong>触发规则</strong><span>${alert.rule}</span>${alert.evidence.map((item) => `<strong>证据</strong><span>${item}</span>`).join("")}</div>
    ${actionSummary}
    <div class="actions">
      <button class="btn primary" data-action="open-recheck-drawer" data-patient="${alert.patientId}" data-alert="${alert.id}" ${disabled}>复测指标</button>
      <button class="btn" data-action="open-followup-drawer" data-patient="${alert.patientId}" data-alert="${alert.id}" ${disabled}>创建随访</button>
      <button class="btn" data-action="send-advice" data-patient="${alert.patientId}" data-alert="${alert.id}" ${disabled}>发送医生建议</button>
      <button class="btn" data-action="handle-alert" data-id="${alert.id}" ${disabled}>处理预警</button>
      <button class="btn" data-action="view-patient" data-patient="${alert.patientId}">患者详情</button>
    </div>
  </article>`;
}

function renderPlans() {
  if (planMode === "detail" && selectedPlanId) {
    renderPlanDetail();
    return;
  }
  const plans = filteredPlans();
  const { pageItems } = paginateItems("plans", plans);
  app.innerHTML = `<section class="page-stack plan-detail-page">
    <div class="toolbar compact-toolbar">
      <div class="global-search">
        <span>⌕</span>
        <input value="${escapeAttr(planSearchQuery)}" data-action="plan-search" placeholder="搜索方案名称 / 患者姓名 / 患者ID">
        ${planSearchQuery ? `<button data-action="clear-plan-search">清空</button>` : ""}
      </div>
      <div class="toolbar-actions">
        <span class="sync-time">数据更新 16:30</span>
        <button class="btn primary" data-action="open-create-plan">新建管理方案</button>
      </div>
    </div>
    <div class="plan-filter-panel">
      <div class="plan-status-bar">${PLAN_STATUSES.map((status) => {
        const count = status === "全部" ? state.plans.length : state.plans.filter((plan) => ensurePlanShape(plan).status === status).length;
        return `<button class="plan-status-tab ${planStatusFilter === status ? "active" : ""}" data-action="set-plan-status" data-status="${status}">${status}<span class="pst-count">${count}</span></button>`;
      }).join("")}</div>
      <div class="plan-secondary-filters">
        <div class="plan-sec-group">
          <span class="plan-sec-label">提醒</span>
          ${PLAN_REMINDER_TAGS.filter(t => t !== "全部").map((tagName) => {
            const count = state.plans.filter((plan) => planReminderTags(ensurePlanShape(plan)).includes(tagName)).length;
            return `<button class="chip sm ${planTagFilter === tagName ? "active" : ""}" data-action="set-plan-tag" data-tag="${tagName}">${tagName}${count > 0 ? `<small>${count}</small>` : ""}</button>`;
          }).join("")}
          ${planTagFilter !== "全部" ? `<button class="chip sm clear-chip" data-action="set-plan-tag" data-tag="全部">×</button>` : ""}
        </div>
        <div class="plan-sec-divider"></div>
        <div class="plan-sec-group">
          <span class="plan-sec-label">来源</span>
          ${PLAN_SOURCE_FILTERS.filter(s => s !== "全部").map((source) => `<button class="chip sm ${planSourceFilter === source ? "active" : ""}" data-action="set-plan-source" data-source="${source}">${source}</button>`).join("")}
          ${planSourceFilter !== "全部" ? `<button class="chip sm clear-chip" data-action="set-plan-source" data-source="全部">×</button>` : ""}
        </div>
        <div class="plan-sec-divider"></div>
        <div class="plan-sec-group">
          <span class="plan-sec-label">疾病</span>
          ${PLAN_DISEASE_FILTERS.filter(d => d !== "全部").map((disease) => `<button class="chip sm ${planDiseaseFilter === disease ? "active" : ""}" data-action="set-plan-disease" data-disease="${disease}">${disease}</button>`).join("")}
          ${planDiseaseFilter !== "全部" ? `<button class="chip sm clear-chip" data-action="set-plan-disease" data-disease="全部">×</button>` : ""}
        </div>
      </div>
    </div>
    <div class="plan-result-meta">
      <strong>当前结果：${plans.length} 个方案</strong>
      <span>优先处理草稿、待患者确认与执行中调整。</span>
    </div>
    <section class="panel table-panel">
      ${pageItems.length ? `<table class="table plan-table">
        <thead><tr><th>方案</th><th>患者</th><th>疾病/风险</th><th>状态</th><th>完整度/负担</th><th>最近更新</th><th>操作</th></tr></thead>
        <tbody>${pageItems.map(planRow).join("")}</tbody>
      </table>${renderPagination("plans", plans.length)}` : `<div class="empty"><strong>暂无匹配方案</strong><p>请调整搜索关键词或状态筛选。</p></div>`}
    </section>
  </section>`;
}

function planCard(plan) {
  ensurePlanShape(plan);
  const validation = validatePlan(plan);
  const statusCode = PLAN_STATUS_CODE[plan.status] || "draft";
  const rules = PLAN_ACTION_RULES[statusCode];
  const primaryBtn = rules?.primary ? `<button class="btn primary" data-action="${rules.primary.action}" data-id="${plan.id}" ${rules.primary.action === "open-followup-drawer" ? `data-patient="${plan.patientId}" data-plan="${plan.id}"` : ""}>${rules.primary.label}</button>` : "";
  const secondaryBtns = (rules?.secondary || []).map((s) => {
    if (s.action === "open-followup-drawer") return `<button class="btn" data-action="${s.action}" data-patient="${plan.patientId}" data-plan="${plan.id}">${s.label}</button>`;
    if (s.action === "send-advice") return `<button class="btn" data-action="${s.action}" data-patient="${plan.patientId}">${s.label}</button>`;
    return `<button class="btn" data-action="${s.action}" data-id="${plan.id}">${s.label}</button>`;
  }).join("");
  return `<article class="flow-card ${plan.status === "执行中" ? "active-plan" : ""}">
    <div class="card-top"><div><h3>${plan.title}</h3><p>${patientName(plan.patientId)} | ${plan.disease} | ${plan.source} | ${plan.updatedAt}</p></div>${tag(plan.status, toneOf(plan.status))}</div>
    <p>${plan.objective}</p>
    <div class="pill-list">${plan.targets.map((item) => `<span>${item}</span>`).join("")}</div>
    <div class="task-list">${plan.tasks.map((item) => `<div>${item}</div>`).join("")}</div>
    <div class="actions">${primaryBtn}${secondaryBtns}<button class="btn" data-action="preview-plan" data-id="${plan.id}">患者端预览</button></div>
  </article>`;
}

function planRow(plan) {
  ensurePlanShape(plan);
  const patient = patientById(plan.patientId);
  const validation = validatePlan(plan);
  const includedModules = plan.modules.filter((module) => module.included).length;
  const statusCode = PLAN_STATUS_CODE[plan.status] || "draft";
  const rules = PLAN_ACTION_RULES[statusCode];
  const primaryBtn = rules?.primary ? `<button class="btn primary" data-action="${rules.primary.action}" data-id="${plan.id}" ${rules.primary.action === "open-followup-drawer" ? `data-patient="${plan.patientId}" data-plan="${plan.id}"` : ""}>${rules.primary.label}</button>` : "";
  const secondaryBtns = (rules?.secondary || []).map((s) => {
    const attrs = `data-action="${s.action}" data-id="${plan.id}"`;
    if (s.action === "open-followup-drawer") return `<button class="btn" data-action="${s.action}" data-patient="${plan.patientId}" data-plan="${plan.id}">${s.label}</button>`;
    if (s.action === "send-advice") return `<button class="btn" data-action="${s.action}" data-patient="${plan.patientId}">${s.label}</button>`;
    return `<button class="btn" ${attrs}>${s.label}</button>`;
  }).join("");
  const extraBtns = `<button class="btn" data-action="preview-plan" data-id="${plan.id}">预览</button><button class="btn" data-action="view-patient" data-patient="${plan.patientId}">患者</button>`;
  const burdenBadge = plan.workload?.burdenLevel ? `<span class="burden-badge burden-${plan.workload.burdenLevel}">${plan.workload.burdenLevel}</span>` : "";
  const reminderTags = planReminderTags(plan).map((item) => tag(item, toneOf(item))).join("");
  const diseases = (plan.diseases || [plan.disease]).map((d) => tag(d, "muted")).join("");
  return `<tr>
    <td><strong>${plan.title}</strong><small>${plan.objective}</small></td>
    <td><strong>${patient?.name || "-"}</strong><small>${patient?.sex || ""} ${patient?.age || ""}岁 | ${patient?.phone || ""}<br>${patient?.relation || ""} | ${plan.patientId}</small></td>
    <td>${diseases}<small>${plan.source} | ${plan.version}</small></td>
    <td>${tag(plan.status, toneOf(plan.status))}${reminderTags ? `<div class="tag-row">${reminderTags}</div>` : ""}</td>
    <td><div class="mini-progress"><span style="width:${Math.round(validation.requiredCompleted / validation.requiredTotal * 100)}%"></span></div><small>${validation.requiredCompleted}/${validation.requiredTotal} 必填模块，已启用 ${includedModules} 项${burdenBadge}</small></td>
    <td>${plan.updatedAt}<small>${plan.changeLogs?.[0]?.text || "最近更新"}</small></td>
    <td><div class="row-actions">${primaryBtn}${secondaryBtns}${extraBtns}</div></td>
  </tr>`;
}

function renderExecutionOverview(plan) {
  const goalsModule = plan.modules.find((m) => m.key === "goals");
  const targets = goalsModule?.fields?.targets || [];
  const mockData = {
    "睡眠时长 >= 6 小时": { actual: "5.8小时", achieved: false, trend: "up" },
    "最低血氧 >= 90%": { actual: "88%", achieved: false, trend: "up" },
    "AHI < 15 次/小时": { actual: "12.5", achieved: true, trend: "down" },
    "CPAP 使用 >= 4 小时/晚": { actual: "3.5小时", achieved: false, trend: "up" },
    "空腹血糖 4.4-7.0 mmol/L": { actual: "6.2", achieved: true, trend: "stable" },
    "静息 SpO2 >= 92%": { actual: "93%", achieved: true, trend: "stable" },
    "家庭收缩压 SBP < 135": { actual: "128mmHg", achieved: true, trend: "down" }
  };
  return `<div class="execution-overview">
    <h3>执行概览</h3>
    <div class="overview-section">
      <h4>目标达成概况</h4>
      <ul>${targets.map((t) => {
        const d = mockData[t] || { actual: "待采集", achieved: false, trend: "-" };
        const trendIcon = d.trend === "up" ? "↑" : d.trend === "down" ? "↓" : d.trend === "stable" ? "→" : "-";
        return `<li><span>${escapeHtml(t)}</span><strong class="${d.achieved ? "achieved" : "not-achieved"}">${d.actual}</strong>${tag(d.achieved ? "达标" : "未达标", d.achieved ? "green" : "red")} <small>${trendIcon}</small></li>`;
      }).join("")}</ul>
    </div>
    <div class="overview-section">
      <h4>执行依从概况</h4>
      <div class="adherence-grid">
        <div><span>测量完成率</span><strong>71%</strong><small>5/7天</small></div>
        <div><span>设备同步率</span><strong>80%</strong><small>4/5报告</small></div>
        ${plan.modules.find((m) => m.key === "medication" && m.included) ? `<div><span>用药执行率</span><strong>85%</strong><small>6/7天</small></div>` : ""}
      </div>
    </div>
    <div class="overview-section">
      <h4>关键风险提示</h4>
      <ul><li>${tag("提醒", "orange")} 最低血氧连续3天未达标</li><li>${tag("提醒", "orange")} 近2天缺1次睡眠报告</li></ul>
    </div>
  </div>`;
}

function showModuleClosurePreview(plan, moduleKey) {
  const rules = MODULE_DEPENDENCY_RULES[moduleKey];
  if (!rules) { return true; }
  if (!rules.closable) {
    openModal("不可关闭", `<div class="closure-preview-modal"><p>${tag("不可关闭", "red")} ${rules.closableReason}</p><button class="btn" data-action="close-modal">知道了</button></div>`);
    return false;
  }
  const consequencesHTML = `<div class="closure-preview-modal">
    <h3>关闭后果预览</h3>
    <div><strong>将失去的患者端功能：</strong><ul>${rules.affectedPatientFeatures.map((f) => `<li>${f}</li>`).join("")}</ul></div>
    ${rules.affectedTargets.length ? `<div><strong>将影响的量化目标：</strong><ul>${rules.affectedTargets.map((t) => `<li>${t} ${tag("无数据来源", "red")}</li>`).join("")}</ul></div>` : ""}
    ${rules.affectedAlerts.length ? `<div><strong>将影响的预警规则：</strong><ul>${rules.affectedAlerts.map((a) => `<li>${a} ${tag("失去触发条件", "red")}</li>`).join("")}</ul></div>` : ""}
    <p class="warning">确认关闭后，上述功能将不再对患者可见，相关目标将标记"无数据来源"。</p>
    <div class="modal-actions"><button class="btn" data-action="confirm-close-module" data-id="${plan.id}" data-module="${moduleKey}">确认关闭</button><button class="btn" data-action="close-modal">取消</button></div>
  </div>`;
  openModal("关闭后果预览", consequencesHTML);
  return null;
}

function showQuickReview(plan) {
  const goalsModule = plan.modules.find((m) => m.key === "goals");
  const targets = goalsModule?.fields?.targets || [];
  const validation = validatePlan(plan);
  const html = `<div class="quick-review">
    <div class="review-section">
      <h4>方案总览</h4>
      <p><strong>${escapeHtml(plan.title)}</strong> · ${tag(plan.diseases?.[0] || plan.disease || "", "muted")} · ${plan.period?.days || 14}天周期</p>
      <p class="muted">${escapeHtml(plan.modules.find((m) => m.key === "basic")?.fields?.stageGoal || "")}</p>
    </div>
    <div class="review-section">
      <h4>管理目标预览</h4>
      <p><strong>阶段目标</strong>：${escapeHtml(goalsModule?.fields?.stageGoal || "")}</p>
      <ul>${targets.map((t) => `<li>${escapeHtml(t)} ${tag("启用", "green")}</li>`).join("")}</ul>
    </div>
    <div class="review-section">
      <h4>关键变更</h4>
      ${plan.modules.filter((m) => m.doctorModified).map((m) => `<p>${tag("已修改", "blue")} ${m.name}</p>`).join("") || `<p class="muted">无修改，与系统推荐一致。</p>`}
    </div>
    <div class="review-section">
      <h4>校验结果</h4>
      ${validation.canPublish ? tag("通过", "green") : tag(`有${validation.warnings.filter((w) => w.level === "error").length}项阻断`, "red")}
    </div>
    <div class="modal-actions">
      <button class="btn primary" data-action="approve-plan" data-id="${plan.id}">确认下发</button>
      <button class="btn" data-action="edit-plan" data-id="${plan.id}">返回逐模块编辑</button>
      <button class="btn" data-action="reject-plan" data-id="${plan.id}">驳回推荐</button>
    </div>
  </div>`;
  openModal("快速审核", html);
}

function renderPlanDetail() {
  const plan = state.plans.find((item) => item.id === selectedPlanId);
  if (!plan) {
    planMode = "list";
    renderPlans();
    return;
  }
  ensurePlanShape(plan);
  const patient = patientById(plan.patientId);
  const statusCode = PLAN_STATUS_CODE[plan.status] || "draft";
  const rules = PLAN_ACTION_RULES[statusCode];
  const diseases = (plan.diseases || [plan.disease]).map((d) => tag(d, "muted")).join("");
  const latestAlert = state.alerts.filter((a) => a.patientId === plan.patientId && a.status === "待处理")[0];
  const latestFollowup = state.followups.filter((f) => f.patientId === plan.patientId && f.id === patient?.nextFollowupId)[0];
  const alertText = latestAlert ? [latestAlert.metricName, latestAlert.value].filter(Boolean).join(" ") || latestAlert.title || "待处理预警" : "";
  const alertHint = latestAlert ? `<span class="alert-hint">${tag("待处理预警", "red")} ${escapeHtml(alertText)}</span>` : "";
  const followupHint = latestFollowup ? `<span class="followup-hint">下次随访: ${latestFollowup.dueAt}</span>` : "";
  const heroPrimaryBtn = rules?.primary ? `<button class="btn primary" data-action="${rules.primary.action}" data-id="${plan.id}" ${rules.primary.action === "open-followup-drawer" ? `data-patient="${plan.patientId}" data-plan="${plan.id}"` : ""}>${rules.primary.label}</button>` : "";
  const heroSecondaryBtns = (rules?.secondary || []).map((s) => {
    if (s.action === "open-followup-drawer") return `<button class="btn" data-action="${s.action}" data-patient="${plan.patientId}" data-plan="${plan.id}">${s.label}</button>`;
    if (s.action === "send-advice") return `<button class="btn" data-action="${s.action}" data-patient="${plan.patientId}">${s.label}</button>`;
    return `<button class="btn" data-action="${s.action}" data-id="${plan.id}">${s.label}</button>`;
  }).join("");

  app.innerHTML = `<section class="page-stack">
    <button class="back-link" data-action="back-plan-list">← 返回方案列表</button>
    <section class="plan-patient-bar panel">
      <div class="patient-bar-info">
        <div class="patient-bar-basic"><strong>${patient?.name || "-"}</strong> ${patient?.sex || ""} ${patient?.age || ""}岁 | ${patient?.phone || ""}</div>
        <div class="patient-bar-tags">${diseases}${patient?.riskLevel ? tag(patient.riskLevel, toneOf(patient.riskLevel)) : ""}${patient?.riskScore ? `<span class="risk-score">${patient.riskScore}分</span>` : ""}</div>
      </div>
      <div class="patient-bar-plan-meta">
        ${tag(plan.status, toneOf(plan.status))}${plan.version ? tag(plan.version, "gray") : ""}${tag(plan.source, "gray")}
        <div class="patient-bar-hints">${alertHint}${followupHint}</div>
      </div>
      <div class="patient-bar-actions">
        ${heroPrimaryBtn}${heroSecondaryBtns}<button class="btn" data-action="preview-plan" data-id="${plan.id}">患者可见预览</button>
      </div>
    </section>
    <section class="plan-editor">
      <nav class="plan-anchor-bar">
        ${plan.modules.map((module) => {
          let dotClass = "gray";
          if (module.type === "required" && (!module.included || !String(module.summary || "").trim())) dotClass = "red";
          else if (module.doctorModified) dotClass = "blue";
          else if (!module.included) dotClass = "gray";
          else if (module.status === "completed") dotClass = "green";
          else dotClass = "orange";
          return `<a href="#plan-${module.key}" class="${module.included ? "" : "muted"}"><span class="status-dot ${dotClass}"></span>${module.name}<small>${module.type === "required" ? "必填" : module.included ? "已启用" : "未启用"}</small></a>`;
        }).join("")}
        <a href="#plan-timeline"><span class="status-dot blue"></span>方案时间轴<small>记录</small></a>
      </nav>
      <div class="plan-content">
        <div class="plan-module-list">
          ${plan.modules.map((module) => planModuleCard(plan, module)).join("")}
          ${statusCode === "active" ? renderExecutionOverview(plan) : ""}
          ${renderPlanTimeline(plan)}
        </div>
      </div>
    </section>
    <div class="plan-bottom-actions">
      <div>
        <strong>${escapeHtml(plan.title)}</strong>
        <span>${tag(plan.status, toneOf(plan.status))}${plan.version ? tag(plan.version, "gray") : ""}</span>
      </div>
      <div class="row-actions">
        <button class="btn" data-action="save-plan-draft" data-id="${plan.id}">保存草稿</button>
        <button class="btn primary" data-action="approve-plan" data-id="${plan.id}">确认下发</button>
      </div>
    </div>
  </section>`;
}

function planModuleCard(plan, module) {
  if (module.key === "basic") return basicPlanModuleCard(plan, module);
  const required = module.type === "required";
  const hasSummary = String(module.summary || "").trim();
  let statusLabel = "";
  let cardClass = module.included ? "" : "disabled";
  if (required) {
    if (!module.included) { statusLabel = tag("缺失", "red"); cardClass += " incomplete"; }
    else if (!hasSummary) { statusLabel = tag("待补充", "orange"); cardClass += " incomplete"; }
    else if (module.status === "warning") { statusLabel = tag("有风险", "orange"); cardClass += " warning"; }
    else if (module.doctorModified) { statusLabel = tag("已修改", "blue"); }
    else { statusLabel = tag("已完成", "green"); }
  } else {
    if (!module.included) { statusLabel = tag(module.excludeReason || "未纳入", "gray"); }
    else if (!hasSummary) { statusLabel = tag("待补充", "orange"); cardClass += " incomplete"; }
    else { statusLabel = tag("已完成", "green"); }
  }
  const toggleBtn = required ? "" : `<button class="btn" data-action="toggle-plan-module" data-id="${plan.id}" data-module="${module.key}">${module.included ? "关闭模块" : "启用模块"}</button>`;
  const displaySummary = module.key === "alerts" && module.fields?.useGlobalRules ? "" : module.summary;
  return `<article class="plan-module-card panel ${cardClass}" id="plan-${module.key}">
    <div class="plan-module-head">
      <div>
        <h3>${module.name}${required ? tag("必填", "blue") : statusLabel}</h3>
      </div>
      <div class="row-actions">
        ${toggleBtn}
        <button class="btn primary" data-action="edit-plan-module" data-id="${plan.id}" data-module="${module.key}">${module.included ? "编辑" : "查看"}</button>
      </div>
    </div>
    <div class="module-summary">
      ${module.included && displaySummary ? `<p>${escapeHtml(displaySummary)}</p>` : ""}
      ${!module.included && module.excludeReason ? `<p>${escapeHtml(module.excludeReason)}</p>` : ""}
      ${module.included ? renderModuleStructuredContent(module) : ""}
    </div>
  </article>`;
}

function renderPlanTimeline(plan) {
  const logs = plan.changeLogs || [];
  return `<article class="plan-module-card panel plan-timeline-card" id="plan-timeline">
    <div class="plan-module-head">
      <div><h3>方案时间轴${tag("记录", "gray")}</h3></div>
    </div>
    <div class="timeline-list">
      ${logs.length ? logs.map((item) => `<div class="timeline-item"><time>${escapeHtml(item.time)}</time><p>${escapeHtml(item.text)}</p></div>`).join("") : `<div class="empty">暂无方案变更记录</div>`}
    </div>
  </article>`;
}

function basicPlanModuleCard(plan, module) {
  const hasSummary = String(module.summary || "").trim();
  const statusLabel = hasSummary ? tag(module.doctorModified ? "已修改" : "已完成", module.doctorModified ? "blue" : "green") : tag("待补充", "orange");
  return `<article class="plan-module-card panel ${hasSummary ? "" : "incomplete"}" id="plan-${module.key}">
    <div class="plan-module-head">
      <div><h3>${module.name}${tag("必填", "blue")}${statusLabel}</h3></div>
      <div class="row-actions">
        <button class="btn primary" data-action="save-plan-module" data-id="${plan.id}" data-module="${module.key}">保存基础信息</button>
      </div>
    </div>
    ${basicInlineEditor(module)}
  </article>`;
}

function renderModuleStructuredContent(module) {
  const rows = module.fields?.rows || [];
  if (module.key === "basic") {
    const f = module.fields || {};
    return `<div class="module-detail-grid">
      <div><span>方案名称</span><strong>${escapeHtml(f.planName || module.summary)}</strong></div>
      <div><span>适用疾病</span>${renderMiniTags(f.diseases || [])}</div>
      <div><span>方案周期</span><strong>${f.periodDays || 30} 天</strong></div>
      <div><span>开始日期</span><strong>${escapeHtml(f.startDate || "待设置")}</strong></div>
    </div>`;
  }
  if (module.key === "goals") {
    return `<div class="module-detail-grid">
      <div><span>阶段目标</span><strong>${escapeHtml(module.fields.stageGoal || module.summary)}</strong></div>
      <div><span>量化目标</span><ul>${(module.fields.targets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    </div>`;
  }
  if (module.key === "metrics") {
    return `<table class="config-table structured-table">
      <thead><tr><th>指标</th><th>场景</th><th>频率/时间</th><th>来源</th><th>目标</th><th>任务规则</th></tr></thead>
      <tbody>${(module.fields.metricItems || []).map((item) => `<tr>
        <td>${escapeHtml(item.metricName)}<small>${escapeHtml(item.metricCode)}</small></td>
        <td>${renderMiniTags(item.scenes)}</td>
        <td>${escapeHtml(item.frequency)}<small>${escapeHtml(item.timeWindow || "不限")}</small></td>
        <td>${renderMiniTags(item.dataSources)}</td>
        <td>${escapeHtml(item.targetRange)}</td>
        <td>${tag("自动生成任务", "blue")}${tag(item.priority, toneOf(item.priority))}<small>${escapeHtml(item.taskGroup)}</small></td>
      </tr>`).join("")}</tbody>
    </table>`;
  }
  if (module.key === "symptoms") {
    const f = module.fields || {};
    return `<div class="module-detail-grid">
      <div><span>症状记录项</span>${renderMiniTags(f.symptomItems || [])}</div>
      <div><span>记录方式</span><strong>${escapeHtml(f.recordMode || "-")}</strong></div>
      <div><span>严重程度</span><strong>${f.severityEnabled ? "记录" : "不记录"}</strong></div>
      <div><span>触发后动作</span>${renderMiniTags(f.triggerActions || [])}</div>
    </div>`;
  }
  if (module.key === "medication") {
    return `<table class="config-table structured-table">
      <thead><tr><th>药品</th><th>剂量/频次</th><th>服用时间</th><th>来源</th><th>关键性</th></tr></thead>
      <tbody>${(module.fields.medicationItems || []).map((item) => `<tr>
        <td>${escapeHtml(item.medName)}</td>
        <td>${escapeHtml(item.dose)} ${escapeHtml(item.frequency)}</td>
        <td>${renderMiniTags(item.timing || [])}</td>
        <td>${tag(item.source || "院内处方", "gray")}</td>
        <td>${item.isCritical ? tag("关键用药", "red") : tag("普通", "gray")}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  }
  if (module.key === "device") {
    return `<table class="config-table structured-table">
      <thead><tr><th>设备类型</th><th>绑定</th></tr></thead>
      <tbody>${(module.fields.deviceItems || []).map((item) => `<tr>
        <td>${renderMiniTags(item.deviceType || [])}</td>
        <td>${item.recommendBind ? tag("推荐绑定", "green") : tag("可选", "gray")}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  }
  if (module.key === "lifestyle") {
    return `<table class="config-table structured-table">
      <thead><tr><th>指导类型</th><th>执行频率</th><th>完成反馈</th></tr></thead>
      <tbody>${(module.fields.lifestyleItems || []).map((item) => `<tr>
        <td>${renderMiniTags(item.type || [])}</td>
        <td>${escapeHtml(item.frequency)}</td>
        <td>${escapeHtml(item.feedbackMode)}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  }
  if (module.key === "alerts") {
    if (module.fields?.useGlobalRules) {
      return `<div class="module-detail-grid"><div><span>规则来源</span><strong>使用全局预警规则</strong><p>按疾病与指标默认规则触发，医生无需逐个患者配置。</p></div></div>`;
    }
    return `<table class="config-table structured-table">
      <thead><tr><th>预警对象</th><th>触发条件</th><th>等级</th><th>患者动作</th><th>医生动作</th><th>随访建议</th></tr></thead>
      <tbody>${(module.fields.alertRules || []).map((rule) => `<tr>
        <td>${escapeHtml(rule.metricName)}</td>
        <td>${escapeHtml([rule.operator, rule.threshold].filter(Boolean).join(" "))}${rule.duration ? `<small>连续/持续 ${escapeHtml(rule.duration)}</small>` : ""}</td>
        <td>${tag(rule.alertLevel, toneOf(rule.alertLevel === "紧急" ? "紧急" : rule.alertLevel === "重要" ? "重要" : "提醒"))}</td>
        <td>${renderMiniTags(rule.patientActions)}</td>
        <td>${renderMiniTags(rule.doctorActions)}</td>
        <td>${rule.generateFollowupSuggestion ? tag("自动建议", "blue") : tag("不建议", "gray")}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  }
  if (module.key === "followup") {
    const rule = module.fields.followupRule || {};
    return `<div class="module-detail-grid">
      <div><span>首次随访</span><strong>下发后第 ${escapeHtml(rule.firstFollowupAfterDays || "-")} 天</strong></div>
      <div><span>随访频率/方式</span><strong>${escapeHtml(rule.frequencyRule || "-")}</strong><p>${renderMiniTags(rule.methods || [])}</p></div>
      <div><span>随访重点</span><p>${renderMiniTags(rule.focusItems || [])}</p></div>
      <div><span>患者准备材料</span><p>${renderMiniTags(rule.prepareItems || [])}</p></div>
    </div>`;
  }
  if (!rows.length) return "";
  return `<table class="config-table">
    <tbody>${rows.map((row) => `<tr>${String(row).split("|").map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

function renderMiniTags(items = []) {
  return `<span class="mini-tags">${items.map((item) => `<em>${escapeHtml(item)}</em>`).join("")}</span>`;
}

function selectOptions(options, selected, allowFallback = true) {
  const selectedList = Array.isArray(selected) ? selected : [selected].filter(Boolean);
  const allOptions = allowFallback ? [...new Set([...options, ...selectedList])] : options;
  return allOptions.map((value) => `<option value="${escapeAttr(value)}" ${selectedList.includes(value) ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
}

function metricSceneOptions(metricName) {
  return METRIC_SCENE_OPTIONS[normalizeMetricName(metricName)] || ["默认"];
}

function diseaseMultiSelect(fieldPath, selected) {
  const selectedList = normalizeDiseases(selected);
  return checkboxDropdown(fieldPath, PLAN_DISEASE_OPTIONS, selectedList);
}

function checkboxDropdown(fieldPath, options, selected) {
  const selectedList = Array.isArray(selected) ? selected.filter(Boolean) : splitList(selected);
  const label = selectedList.join("、") || "请选择";
  return `<details class="multi-select">
    <summary data-field-summary="${fieldPath}">${escapeHtml(label)}</summary>
    <div class="multi-select-menu">
      ${options.map((option) => `<label><input type="checkbox" data-field-option="${fieldPath}" value="${escapeAttr(option)}" ${selectedList.includes(option) ? "checked" : ""}> ${escapeHtml(option)}</label>`).join("")}
    </div>
    <input type="hidden" data-field="${fieldPath}" value="${escapeAttr(label)}">
  </details>`;
}

function basicInlineEditor(module) {
  const f = module.fields || {};
  const diseases = normalizeDiseases(f.diseases);
  return `<div class="basic-inline-editor">
    <div class="rule-card single basic-editor">
      <label>方案名称<input data-field="basic.planName" value="${escapeAttr(f.planName || module.summary || "")}"></label>
      <label>适用疾病${diseaseMultiSelect("basic.diseases", diseases)}</label>
      <label>方案周期<select data-field="basic.periodDays">${PLAN_PERIOD_DAYS.map((d) => `<option value="${d}" ${Number(f.periodDays) === d ? "selected" : ""}>${d} 天</option>`).join("")}</select></label>
      <label>计划开始日期<input type="date" data-field="basic.startDate" value="${escapeAttr(f.startDate || "")}"><small>默认患者确认次日开始</small></label>
      <label class="wide">医生端摘要<textarea id="moduleSummary">${escapeHtml(module.summary || "")}</textarea></label>
    </div>
  </div>`;
}

function taskLoadSummary(plan) {
  const types = new Map();
  plan.taskRules.forEach((rule) => types.set(rule.taskType, (types.get(rule.taskType) || 0) + 1));
  return [...types.entries()].map(([type, count]) => `${type} ${count} 条`).join("；") || "暂无患者端待办规则";
}

function moduleEditorBody(module) {
  const rowTip = {
    basic: "每行一条：字段|内容",
    symptoms: "每行一条：症状|记录时机|记录字段|关联逻辑",
    medication: "每行一条：药品/治疗|提醒规则|患者记录|备注",
    device: "每行一条：设备|同步要求|来源|异常处理",
    lifestyle: "每行一条：建议|执行频次|患者记录|复盘方式",
    alerts: "每行一条：对象|触发规则|系统动作|预警级别",
    followup: "每行一条：随访类型|时间规则|随访重点|生成方式"
  };
  const rows = (module.fields.rows || []).join("\n");
  const structuredFields = structuredModuleEditor(module);
  const goalFields = module.key === "goals" ? `
    <label>阶段目标<textarea id="moduleStageGoal">${escapeHtml(module.fields.stageGoal || module.summary || "")}</textarea></label>
    <label>量化目标（一行一个）<textarea id="moduleTargets">${escapeHtml((module.fields.targets || []).join("\n"))}</textarea></label>` : "";
  const rowFields = module.key === "goals" || structuredFields ? "" : `
    <label>结构化配置<small>${rowTip[module.key] || "每行一条配置，字段用 | 分隔"}</small><textarea id="moduleRows">${escapeHtml(rows)}</textarea></label>`;
  return `<div class="form">
    <p class="modal-tip">${module.type === "required" ? "必填模块，确认下发前必须补齐。" : "条件模块，启用后会进入患者执行方案。"}</p>
    ${goalFields}
    ${structuredFields}
    ${rowFields}
  </div>`;
}

function structuredModuleEditor(module) {
  if (module.key === "basic") {
    const f = module.fields || {};
    return `<div class="rule-card single basic-editor">
      <label>方案名称<input data-field="basic.planName" value="${escapeAttr(f.planName || module.summary || "")}"></label>
      <label>适用疾病${diseaseMultiSelect("basic.diseases", normalizeDiseases(f.diseases))}</label>
      <label>方案周期<select data-field="basic.periodDays">${PLAN_PERIOD_DAYS.map((d) => `<option value="${d}" ${Number(f.periodDays) === d ? "selected" : ""}>${d} 天</option>`).join("")}</select></label>
      <label>计划开始日期<input type="date" data-field="basic.startDate" value="${escapeAttr(f.startDate || "")}"><small>默认患者确认次日开始</small></label>
      <label class="wide">医生端摘要<textarea id="moduleSummary">${escapeHtml(module.summary || "")}</textarea></label>
    </div>`;
  }
  if (module.key === "symptoms") {
    const f = module.fields || {};
    return `<div class="rule-card single symptoms-editor">
      <label>症状记录项<input data-field="symptoms.symptomItems" value="${escapeAttr((f.symptomItems || []).join("、"))}" placeholder="从疾病症状库选择，顿号分隔"></label>
      <label>记录方式<select data-field="symptoms.recordMode">${["出现时记录", "每日记录", "随访前记录"].map((v) => `<option ${f.recordMode === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label><input type="checkbox" data-field="symptoms.severityEnabled" ${f.severityEnabled ? "checked" : ""}> 记录严重程度</label>
      <label>触发后动作<input data-field="symptoms.triggerActions" value="${escapeAttr((f.triggerActions || []).join("、"))}" placeholder="复测提醒/随访准备/联系医生"></label>
    </div>`;
  }
  if (module.key === "medication") {
    const items = module.fields.medicationItems || [];
    return `<div class="rule-editor">
      <div class="rule-editor-head"><strong>用药方案</strong><button class="btn" data-action="add-medication-rule">添加药品</button></div>
      <div id="medicationRuleList">${items.map((item, index) => medicationRuleEditor(item, index)).join("")}</div>
    </div>`;
  }
  if (module.key === "device") {
    const items = module.fields.deviceItems || [];
    return `<div class="rule-editor">
      <div class="rule-editor-head"><strong>设备监测规则</strong><button class="btn" data-action="add-device-rule">添加设备</button></div>
      <div id="deviceRuleList">${items.map((item, index) => deviceRuleEditor(item, index)).join("")}</div>
    </div>`;
  }
  if (module.key === "lifestyle") {
    const items = module.fields.lifestyleItems || [];
    return `<div class="rule-editor">
      <div class="rule-editor-head"><strong>生活方式指导</strong><button class="btn" data-action="add-lifestyle-rule">添加指导</button></div>
      <div id="lifestyleRuleList">${items.map((item, index) => lifestyleRuleEditor(item, index)).join("")}</div>
    </div>`;
  }
  if (module.key === "metrics") {
    return `<div class="rule-editor">
      <div class="rule-editor-head"><strong>指标测量规则</strong><button class="btn" data-action="add-metric-rule">添加指标</button></div>
      <div id="metricRuleList">${(module.fields.metricItems || []).map((item, index) => metricRuleEditor(item, index)).join("")}</div>
    </div>`;
  }
  if (module.key === "alerts") {
    return `<div class="rule-editor">
      <div class="rule-editor-head"><strong>预警规则参数</strong><button class="btn" data-action="add-alert-rule">添加规则</button></div>
      <div class="rule-card single">
        <label><input type="checkbox" data-field="alerts.useGlobalRules" ${module.fields.useGlobalRules !== false ? "checked" : ""}> 使用全局预警规则</label>
        <small>默认按疾病、指标与平台全局阈值触发；关闭后可为该患者单独配置规则。</small>
      </div>
      <div id="alertRuleList">${(module.fields.alertRules || []).map((rule, index) => alertRuleEditor(rule, index)).join("")}</div>
    </div>`;
  }
  if (module.key === "followup") {
    const rule = module.fields.followupRule || {};
    return `<div class="rule-card single">
      <label><input type="checkbox" data-field="followup.scheduleFollowup" ${rule.scheduleFollowup !== false ? "checked" : ""}> 安排随访</label>
      <label>首次随访时间<select data-field="followup.firstFollowupAfterDays">${[3, 7, 14, 30].map((day) => `<option value="${day}" ${Number(rule.firstFollowupAfterDays) === day ? "selected" : ""}>下发后第 ${day} 天</option>`).join("")}</select></label>
      <label>随访频率<select data-field="followup.frequencyRule">${["每周", "每 2 周", "每月", "按预警触发"].map((item) => `<option ${rule.frequencyRule === item ? "selected" : ""}>${item}</option>`).join("")}</select></label>
      <label>随访方式<input data-field="followup.methods" value="${escapeAttr((rule.methods || []).join("、"))}"></label>
      <label>随访重点<input data-field="followup.focusItems" value="${escapeAttr((rule.focusItems || []).join("、"))}"></label>
      <label>患者准备材料<input data-field="followup.prepareItems" value="${escapeAttr((rule.prepareItems || []).join("、"))}"></label>
    </div>`;
  }
  return "";
}

function metricRuleEditor(item, index) {
  const metricName = normalizeMetricName(item.metricName);
  const sceneOptions = metricSceneOptions(metricName);
  const selectedScenes = (item.scenes || []).length ? item.scenes : sceneOptions;
  return `<div class="rule-card" data-rule-type="metric">
    <label>指标名称<select data-field="metricName">${METRIC_NAME_OPTIONS.map((name) => `<option ${metricName === name ? "selected" : ""}>${name}</option>`).join("")}</select></label>
    <label>测量场景${checkboxDropdown("scenes", sceneOptions, selectedScenes)}<small>${METRIC_SCENE_PLACEHOLDER}</small></label>
    <label>测量频率<select data-field="frequency">${METRIC_FREQUENCIES.map((value) => `<option ${item.frequency === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
    <label>时间窗<input data-field="timeWindow" value="${escapeAttr(item.timeWindow || "")}" placeholder="如 06:00-09:00"></label>
    <label>数据来源<input data-field="dataSources" value="${escapeAttr((item.dataSources || []).join("、"))}"></label>
    <label>目标范围<input data-field="targetRange" value="${escapeAttr(item.targetRange || "")}"></label>
    <label>任务分组<select data-field="taskGroup">${["晨间测量", "睡前测量", "睡眠监测", "日常记录"].map((value) => `<option ${item.taskGroup === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
    <label>优先级<select data-field="priority">${["普通", "重要", "紧急"].map((value) => `<option ${item.priority === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
  </div>`;
}

function alertRuleEditor(rule) {
  return `<div class="rule-card" data-rule-type="alert">
    <label>预警指标<select data-field="metricName">${["空腹血糖", "餐后 2h 血糖", "血压", "SpO2", "最低血氧", "AHI", "CPAP 使用", "任务完成率"].map((name) => `<option ${rule.metricName === name ? "selected" : ""}>${name}</option>`).join("")}</select></label>
    <label>操作符<select data-field="operator">${["<", "<=", ">", ">=", "连续异常"].map((value) => `<option ${rule.operator === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
    <label>阈值<input data-field="threshold" value="${escapeAttr(rule.threshold || "")}" placeholder="如 90%"></label>
    <label>连续/持续<input data-field="duration" value="${escapeAttr(rule.duration || "")}" placeholder="如 2 次 / 10 分钟"></label>
    <label>预警等级<select data-field="alertLevel">${["一般", "重要", "紧急"].map((value) => `<option ${rule.alertLevel === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
    <label>患者动作<input data-field="patientActions" value="${escapeAttr((rule.patientActions || []).join("、"))}"></label>
    <label>医生动作<input data-field="doctorActions" value="${escapeAttr((rule.doctorActions || []).join("、"))}"></label>
    <label><input type="checkbox" data-field="generateFollowupSuggestion" ${rule.generateFollowupSuggestion ? "checked" : ""}> 自动建议随访</label>
    <label><input type="checkbox" data-field="enabled" ${rule.enabled ? "checked" : ""}> 启用规则</label>
  </div>`;
}

function addMetricRuleEditor() {
  const list = $("#metricRuleList");
  if (!list) return;
  list.insertAdjacentHTML("beforeend", metricRuleEditor(metricRowToConfig("空腹血糖|4.4-7.0 mmol/L|每日|手动记录/设备采集|按时完成血糖记录"), list.children.length));
}

function addAlertRuleEditor() {
  const list = $("#alertRuleList");
  if (!list) return;
  list.insertAdjacentHTML("beforeend", alertRuleEditor(alertRowToConfig("空腹血糖|> 7.0 mmol/L 连续2次|提醒复测并记录症状|重要")));
}

function medicationRuleEditor(item, index) {
  return `<div class="rule-card" data-rule-type="medication">
    <label>药品名称<input data-field="medication.medName" value="${escapeAttr(item.medName || "")}"></label>
    <label>单次剂量<input data-field="medication.dose" value="${escapeAttr(item.dose || "")}" placeholder="如 10mg"></label>
    <label>服用频次<select data-field="medication.frequency">${MEDICATION_FREQUENCIES.map((v) => `<option ${item.frequency === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>服用时间<input data-field="medication.timing" value="${escapeAttr((item.timing || []).join("、"))}" placeholder="早餐后/晚餐后/睡前"></label>
    <label>用药来源<select data-field="medication.source">${["院内处方", "自购", "家属提供"].map((v) => `<option ${item.source === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label><input type="checkbox" data-field="medication.isCritical" ${item.isCritical ? "checked" : ""}> 关键用药</label>
  </div>`;
}

function addMedicationRuleEditor() {
  const list = $("#medicationRuleList");
  if (!list) return;
  list.insertAdjacentHTML("beforeend", medicationRuleEditor({ medName: "", dose: "", frequency: "每日 1 次", timing: [], source: "院内处方", isCritical: false, patientInstruction: "" }, list.children.length));
}

function deviceRuleEditor(item, index) {
  return `<div class="rule-card" data-rule-type="device">
    <label>设备类型<input data-field="device.deviceType" value="${escapeAttr(listText(item.deviceType))}" placeholder="血压计/血氧仪/睡眠监测仪"></label>
    <label><input type="checkbox" data-field="device.recommendBind" ${item.recommendBind !== false ? "checked" : ""}> 推荐绑定设备</label>
    <label class="wide">患者端说明<textarea data-field="device.patientInstruction" placeholder="无默认值，医生需要时填写">${escapeHtml(item.patientInstruction || "")}</textarea></label>
  </div>`;
}

function addDeviceRuleEditor() {
  const list = $("#deviceRuleList");
  if (!list) return;
  list.insertAdjacentHTML("beforeend", deviceRuleEditor({ deviceType: [], recommendBind: true, patientInstruction: "" }, list.children.length));
}

function lifestyleRuleEditor(item, index) {
  return `<div class="rule-card" data-rule-type="lifestyle">
    <label>指导类型<input data-field="lifestyle.type" value="${escapeAttr((item.type || []).join("、"))}" placeholder="饮食/运动/戒烟/睡眠/肺康复"></label>
    <label>执行频率<select data-field="lifestyle.frequency">${["每日", "每周 3 次", "每周 1 次", "持续执行"].map((v) => `<option ${item.frequency === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>完成反馈<select data-field="lifestyle.feedbackMode">${["打卡确认", "记录时长/量", "自我评分"].map((v) => `<option ${item.feedbackMode === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
  </div>`;
}

function addLifestyleRuleEditor() {
  const list = $("#lifestyleRuleList");
  if (!list) return;
  list.insertAdjacentHTML("beforeend", lifestyleRuleEditor({ type: [], frequency: "每日", feedbackMode: "打卡确认", patientInstruction: "" }, list.children.length));
}

function patientTerm(text) {
  return String(text || "")
    .replace(/SpO2/g, "血氧")
    .replace(/AHI/g, "睡眠呼吸事件")
    .replace(/ODI/g, "夜间缺氧情况")
    .replace(/CPAP/g, "呼吸机")
    .replace(/mmol\/L/g, "")
    .replace(/mmHg/g, "")
    .replace(/>=/g, "达到")
    .replace(/<=/g, "不高于")
    .replace(/>/g, "高于")
    .replace(/</g, "低于");
}

function compileMetricInstruction(item = {}) {
  const metric = patientTerm(item.metricName || "指标");
  const time = patientTerm(item.timeWindow || (item.scenes || []).join("、"));
  const frequency = patientTerm(item.frequency || "按医生要求");
  const action = (item.dataSources || []).includes("设备采集") ? "保持设备同步" : `记录${metric}`;
  return `${frequency}${time ? `在${time}` : ""}${action}，如有明显不适请补充备注。`;
}

function compileMedicationInstruction(item = {}) {
  const name = patientTerm(item.medName || "当前用药");
  const timing = (item.timing || []).length ? `，时间：${patientTerm(item.timing.join("、"))}` : "";
  return `请按医生已确认的用药安排记录${name}执行情况${timing}；如漏服或不适，请如实备注。`;
}

function compileLifestyleInstruction(item = {}) {
  const type = patientTerm((item.type || []).join("、") || "生活方式建议");
  return `请按${patientTerm(item.frequency || "医生建议")}完成${type}，完成后按要求${patientTerm(item.feedbackMode || "反馈")}。`;
}

function compilePatientInstruction(module = {}) {
  const f = module.fields || {};
  if (module.key === "basic") return `本方案用于${patientTerm((f.diseases || []).join("、") || "当前疾病")}阶段管理，请按页面提示完成记录和随访。`;
  if (module.key === "goals") return `本阶段重点：${patientTerm(f.stageGoal || module.summary || "按计划完成健康管理目标")}。`;
  if (module.key === "metrics") return (f.metricItems || []).slice(0, 2).map(compileMetricInstruction).join(" ") || "请按医生设置的时间完成记录。";
  if (module.key === "symptoms") return `出现${patientTerm((f.symptomItems || []).join("、") || "不适症状")}时请及时记录，方便医生判断变化。`;
  if (module.key === "medication") return (f.medicationItems || []).slice(0, 2).map(compileMedicationInstruction).join(" ") || "请按医生已确认的用药安排记录执行情况。";
  if (module.key === "device") return (f.deviceItems || []).map((item) => item.patientInstruction).filter(Boolean).join(" ") || "";
  if (module.key === "lifestyle") return (f.lifestyleItems || []).slice(0, 2).map(compileLifestyleInstruction).join(" ") || "请按生活方式建议执行。";
  if (module.key === "alerts") return module.fields?.useGlobalRules ? "使用全局预警规则" : "数据异常时请先复测，并按提示补充症状；如明显不适，请联系医生或线下就医。";
  if (module.key === "followup") return `请在随访前准备${patientTerm((f.followupRule?.prepareItems || []).join("、") || "近期记录")}，按提醒配合医生复盘。`;
  return patientTerm(module.summary || "");
}

function moduleSummaryFromFields(module) {
  if (module.key === "goals") return module.fields.stageGoal || module.summary || "";
  const rows = module.fields.rows || [];
  if (!rows.length) return module.summary || "";
  if (module.key === "metrics") return `配置 ${rows.length} 个指标测量项：${rows.map((row) => row.split("|")[0]).join("、")}`;
  if (module.key === "alerts") return module.fields?.useGlobalRules ? "使用全局预警规则" : `配置 ${rows.length} 条预警规则：${rows.map((row) => row.split("|")[0]).join("、")}`;
  if (module.key === "followup") return `配置 ${rows.length} 类随访：${rows.map((row) => row.split("|")[0]).join("、")}`;
  return rows.map((row) => row.split("|").slice(0, 2).join("：")).join("；");
}

function renderFollowups() {
  const { pageItems } = paginateItems("followups", state.followups);
  const upcomingCount = state.followups.filter((item) => ["待随访", "待患者准备"].includes(followupStatusLabel(item.status))).length;
  const overdueCount = state.followups.filter((item) => followupStatusLabel(item.status) === "逾期").length;
  const preparingCount = state.followups.filter((item) => followupStatusLabel(item.status) === "待患者准备").length;
  const doneCount = state.followups.filter((item) => followupStatusLabel(item.status) === "已完成").length;
  app.innerHTML = `<section class="page-stack operations-page followup-workbench">
    <div class="workbench-summary followup-summary">
      ${workbenchStat("待推进随访", upcomingCount, "随访前材料与执行任务", "primary")}
      ${workbenchStat("已逾期", overdueCount, "需要优先回收结论", "danger")}
      ${workbenchStat("待患者准备", preparingCount, "先补齐记录与材料", "warning")}
      ${workbenchStat("已完成", doneCount, "已形成随访结论", "success")}
    </div>
    <section class="panel operations-panel">
      <div class="panel-hd"><strong>随访任务流</strong><span>待随访与逾期优先</span></div>
      <div class="card-list">${pageItems.map(followupCard).join("")}</div>
      ${renderPagination("followups", state.followups.length)}
    </section>
  </section>`;
}

function followupCard(followup) {
  const statusLabel = followupStatusLabel(followup.status);
  const nextStepSummary = [followup._lastAdviceSummary, followup._lastRecheckSummary, followup._nextFollowupSummary].filter(Boolean).join("；");
  return `<article class="flow-card followup-card ${statusLabel === "已完成" ? "done" : statusLabel === "逾期" ? "urgent" : ""}">
    <div class="card-top"><div><h3>${followup.title}</h3><p>${patientName(followup.patientId)} | ${followup.type} | ${followup.dueAt}</p></div>${tag(statusLabel, toneOf(statusLabel))}</div>
    <div class="followup-meta">
      <span>方式 ${followup.method || "-"}</span>
      <span>负责人 ${followup.owner || followup.doctorName || "-"}</span>
      <span>准备项 ${(followup.prepareItems || []).length}</span>
    </div>
    <div class="pill-list">${followup.focus.map((item) => `<span>${item}</span>`).join("")}</div>
    ${nextStepSummary ? `<div class="alert-action-summary">${nextStepSummary}</div>` : ""}
    <div class="actions">
      <button class="btn primary" data-action="complete-followup" data-id="${followup.id}" ${["已完成", "已取消"].includes(followup.status) ? "disabled" : ""}>完成随访</button>
      <button class="btn" data-action="send-advice" data-patient="${followup.patientId}" data-followup="${followup.id}">发送医生建议</button>
      <button class="btn" data-action="open-recheck-drawer" data-patient="${followup.patientId}" data-followup="${followup.id}">复测指标</button>
      <button class="btn" data-action="open-followup-drawer" data-patient="${followup.patientId}" data-followup="${followup.id}">追加随访</button>
      <button class="btn" data-action="reschedule-followup" data-id="${followup.id}">改期</button>
      <button class="btn danger" data-action="cancel-followup" data-id="${followup.id}">取消</button>
      <button class="btn" data-action="view-patient" data-patient="${followup.patientId}">患者详情</button>
    </div>
  </article>`;
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

/* ── System Configuration: Metric Dictionary & Goal Management ── */

const METRIC_CATEGORIES = ["全部", "血糖类", "血压类", "呼吸血氧类", "睡眠类", "代谢体重类", "心率类"];
const GOAL_STATUS_OPTIONS = ["全部", "启用", "禁用"];

function renderMetricDictionary() {
  const query = metricDictSearchQuery.trim().toLowerCase();
  const filtered = (state.metricDictionary || []).filter((item) => {
    if (metricDictCategoryFilter !== "全部" && item.category !== metricDictCategoryFilter) return false;
    if (query && !item.name.toLowerCase().includes(query) && !item.englishAbbr.toLowerCase().includes(query)) return false;
    return true;
  });
  const { pager, pageItems } = paginateItems("metricDictionary", filtered);
  const content = !filtered.length ? empty("暂无指标数据") : `<div class="toolbar compact-toolbar">
    <div class="global-search">
      <span>⌕</span>
      <input value="${escapeAttr(metricDictSearchQuery)}" data-action="metric-dict-search" placeholder="搜索指标名称 / 英文简称">
      ${metricDictSearchQuery ? `<button data-action="clear-metric-dict-search">清空</button>` : ""}
    </div>
  </div>
  <div class="config-filter-group">
    ${METRIC_CATEGORIES.map((cat) => `<button class="chip sm ${metricDictCategoryFilter === cat ? "active" : ""}" data-action="set-metric-dict-category" data-category="${cat}">${cat}</button>`).join("")}
  </div>
  <div class="filter-summary"><strong>当前结果：${filtered.length} 条指标</strong></div>
  <section class="panel table-panel">
    <table class="table config-table">
      <thead><tr><th>序号</th><th>指标分类</th><th>指标名称</th><th>指标英文简称</th><th>指标单位</th><th>指标释义</th><th>创建时间</th></tr></thead>
      <tbody>${pageItems.map((item, i) => `<tr>
        <td>${(pager.page - 1) * pager.pageSize + i + 1}</td>
        <td><span class="ant-tag ant-tag-blue">${item.category}</span></td>
        <td><strong>${item.name}</strong></td>
        <td>${item.englishAbbr}</td>
        <td>${item.unit}</td>
        <td class="metric-definition" title="${item.definition}">${item.definition}</td>
        <td>${item.createdAt}</td>
      </tr>`).join("")}</tbody>
    </table>
    ${renderPagination("metricDictionary", filtered.length)}
  </section>`;
  app.innerHTML = `<section class="page-stack config-page">${content}</section>`;
}

function renderGoalManagement() {
  const query = goalSearchQuery.trim().toLowerCase();
  const filtered = (state.goalManagement || []).filter((item) => {
    if (goalCategoryFilter !== "全部" && item.category !== goalCategoryFilter) return false;
    if (goalStatusFilter !== "全部" && item.status !== goalStatusFilter) return false;
    if (query && !item.name.toLowerCase().includes(query)) return false;
    return true;
  });
  const { pager, pageItems } = paginateItems("goalManagement", filtered);
  const content = !filtered.length ? empty("暂无目标数据") : `<div class="toolbar compact-toolbar">
    <div class="global-search">
      <span>⌕</span>
      <input value="${escapeAttr(goalSearchQuery)}" data-action="goal-search" placeholder="搜索指标名称">
      ${goalSearchQuery ? `<button data-action="clear-goal-search">清空</button>` : ""}
    </div>
  </div>
  <div class="config-filter-group">
    <span class="filter-label">分类</span>
    ${METRIC_CATEGORIES.map((cat) => `<button class="chip sm ${goalCategoryFilter === cat ? "active" : ""}" data-action="set-goal-category" data-category="${cat}">${cat}</button>`).join("")}
    <span class="filter-label">状态</span>
    ${GOAL_STATUS_OPTIONS.map((s) => `<button class="chip sm ${goalStatusFilter === s ? "active" : ""}" data-action="set-goal-status" data-status="${s}">${s}</button>`).join("")}
  </div>
  <div class="filter-summary"><strong>当前结果：${filtered.length} 条指标</strong></div>
  <section class="panel table-panel">
    <table class="table config-table">
      <thead><tr><th>序号</th><th>指标分类</th><th>指标名称</th><th>指标英文简称</th><th>指标单位</th><th>全局目标阈值</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
      <tbody>${pageItems.map((item, i) => goalRow(item, (pager.page - 1) * pager.pageSize + i + 1)).join("")}</tbody>
    </table>
    ${renderPagination("goalManagement", filtered.length)}
  </section>`;
  app.innerHTML = `<section class="page-stack config-page">${content}</section>`;
}

function goalRow(item, index) {
  const statusTag = item.status === "启用"
    ? `<span class="ant-tag ant-tag-green">${item.status}</span>`
    : `<span class="ant-tag ant-tag-red">${item.status}</span>`;
  return `<tr>
    <td>${index}</td>
    <td><span class="ant-tag ant-tag-blue">${item.category}</span></td>
    <td><strong>${item.name}</strong></td>
    <td>${item.englishAbbr}</td>
    <td>${item.unit}</td>
    <td><strong class="threshold-value">${item.thresholdDisplay} ${item.unit}</strong></td>
    <td>${statusTag}</td>
    <td>${item.updatedAt}</td>
    <td><div class="row-actions">
      <button class="btn primary" data-action="edit-goal-threshold" data-id="${item.id}">编辑</button>
      <button class="btn" data-action="toggle-goal-status" data-id="${item.id}">${item.status === "启用" ? "禁用" : "启用"}</button>
    </div></td>
  </tr>`;
}

function openGoalThresholdEditor(goalId) {
  const goal = (state.goalManagement || []).find((item) => item.id === goalId);
  if (!goal) return;
  const isRange = goal.thresholdType === "range";
  const isUpper = goal.thresholdType === "upper";
  const isLower = goal.thresholdType === "lower";
  let thresholdFieldsHTML = "";
  if (isRange) {
    thresholdFieldsHTML = `<div class="drawer-form"><label>下限<input id="goalThresholdMin" type="number" step="0.1" value="${goal.thresholdMin}" placeholder="请输入下限值"></label><label>上限<input id="goalThresholdMax" type="number" step="0.1" value="${goal.thresholdMax}" placeholder="请输入上限值"></label></div>`;
  } else if (isUpper) {
    thresholdFieldsHTML = `<div class="drawer-form"><label>上限值<input id="goalThresholdMax" type="number" step="0.1" value="${goal.thresholdMax}" placeholder="请输入上限值"></label></div>`;
  } else {
    thresholdFieldsHTML = `<div class="drawer-form"><label>下限值<input id="goalThresholdMin" type="number" step="0.1" value="${goal.thresholdMin}" placeholder="请输入下限值"></label></div>`;
  }
  const bodyHTML = `<div class="goal-threshold-form">
    <div class="goal-edit-header">
      <p><strong>${goal.name}</strong>（${goal.englishAbbr}）</p>
      <p>分类：${goal.category} | 单位：${goal.unit}</p>
      <p class="hint">阈值类型：${isRange ? "区间（X~Y）" : isUpper ? "上限（≤X）" : "下限（≥X）"}</p>
    </div>
    ${thresholdFieldsHTML}
    <div class="goal-edit-warning"><p>修改后仅对新初始化患者生效，存量患者目标不受影响。</p></div>
  </div>`;
  openDrawer(`编辑全局目标阈值 - ${goal.name}`, bodyHTML, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="save-goal-threshold" data-id="${goalId}">保存</button>`);
}

function saveGoalThreshold() {
  const goalId = document.querySelector('[data-action="save-goal-threshold"]')?.dataset.id;
  const goal = (state.goalManagement || []).find((item) => item.id === goalId);
  if (!goal) return;
  const minInput = document.getElementById("goalThresholdMin");
  const maxInput = document.getElementById("goalThresholdMax");
  let errors = [];
  let thresholdMin = goal.thresholdMin;
  let thresholdMax = goal.thresholdMax;
  if (goal.thresholdType === "range") {
    thresholdMin = parseFloat(minInput.value);
    thresholdMax = parseFloat(maxInput.value);
    if (isNaN(thresholdMin) || isNaN(thresholdMax)) errors.push("请输入有效的数值");
    if (!errors.length && thresholdMin >= thresholdMax) errors.push("下限必须小于上限");
    if (!errors.length && thresholdMin < 0) errors.push("下限值不能为负数");
  } else if (goal.thresholdType === "upper") {
    thresholdMax = parseFloat(maxInput.value);
    if (isNaN(thresholdMax)) errors.push("请输入有效的上限值");
    if (!errors.length && thresholdMax <= 0) errors.push("上限值必须大于0");
  } else {
    thresholdMin = parseFloat(minInput.value);
    if (isNaN(thresholdMin)) errors.push("请输入有效的下限值");
    if (!errors.length && thresholdMin <= 0) errors.push("下限值必须大于0");
  }
  if (errors.length) {
    openModal("阈值校验失败", `<div class="warning-list">${errors.map((e) => `<p>${tag("错误", "red")} ${e}</p>`).join("")}</div><p>请输入合规的目标阈值。</p>`, `<button class="btn primary" data-action="close-modal">知道了</button>`);
    return;
  }
  goal.thresholdMin = thresholdMin;
  goal.thresholdMax = thresholdMax;
  if (goal.thresholdType === "range") goal.thresholdDisplay = `${thresholdMin}~${thresholdMax}`;
  else if (goal.thresholdType === "upper") goal.thresholdDisplay = `≤${thresholdMax}`;
  else goal.thresholdDisplay = `≥${thresholdMin}`;
  goal.updatedAt = nowText();
  closeDrawer();
  persist("全局目标阈值已更新（仅对新患者生效）");
}

function confirmToggleGoalStatus(goalId) {
  const goal = (state.goalManagement || []).find((item) => item.id === goalId);
  if (!goal) return;
  const newStatus = goal.status === "启用" ? "禁用" : "启用";
  openModal(`确认${newStatus}指标`, `<p>确认将「${goal.name}」的状态从「${goal.status}」变更为「${newStatus}」？</p><div class="goal-edit-warning"><p>${newStatus === "禁用" ? "禁用后新患者初始化将不再带出该指标目标，存量患者不受影响。" : "启用后新患者初始化将正常带出该指标目标。"}</p></div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="confirm-toggle-goal-status" data-id="${goalId}">确认${newStatus}</button>`);
}

function doToggleGoalStatus(goalId) {
  const goal = (state.goalManagement || []).find((item) => item.id === goalId);
  if (!goal) return;
  goal.status = goal.status === "启用" ? "禁用" : "启用";
  goal.updatedAt = nowText();
  closeModal();
  persist(`指标「${goal.name}」已${goal.status}`);
}

function openGoalDetailDrawer(goalId) {
  const goal = (state.goalManagement || []).find((item) => item.id === goalId);
  const metric = (state.metricDictionary || []).find((item) => item.id === goal?.metricId);
  if (!goal) return;
  const thresholdLabel = goal.thresholdType === "range" ? "区间（X~Y）" : goal.thresholdType === "upper" ? "上限（≤X）" : "下限（≥X）";
  const bodyHTML = `<div class="goal-detail-form">
    <div class="detail-section">
      <h4>指标信息</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>指标分类</label><span>${goal.category}</span></div>
        <div class="detail-item"><label>指标名称</label><span><strong>${goal.name}</strong></span></div>
        <div class="detail-item"><label>指标英文简称</label><span>${goal.englishAbbr}</span></div>
        <div class="detail-item"><label>指标单位</label><span>${goal.unit}</span></div>
      </div>
    </div>
    ${metric ? `<div class="detail-section"><h4>指标释义</h4><p class="metric-definition-full">${metric.definition}</p></div>` : ""}
    <div class="detail-section">
      <h4>全局目标配置</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>阈值类型</label><span>${thresholdLabel}</span></div>
        <div class="detail-item"><label>全局目标阈值</label><span><strong class="threshold-value">${goal.thresholdDisplay} ${goal.unit}</strong></span></div>
        <div class="detail-item"><label>状态</label><span>${goal.status === "启用" ? '<span class="ant-tag ant-tag-green">启用</span>' : '<span class="ant-tag ant-tag-red">禁用</span>'}</span></div>
        <div class="detail-item"><label>更新时间</label><span>${goal.updatedAt}</span></div>
      </div>
    </div>
    <div class="goal-edit-warning"><p>全局目标仅对新初始化患者生效，已完成初始化的存量患者数据不受影响。</p></div>
  </div>`;
  openDrawer(`指标详情 - ${goal.name}`, bodyHTML, `<button class="btn primary" data-action="close-modal">关闭</button>`);
}

function openModal(title, body, footer = `<button class="btn primary" data-action="close-modal">关闭</button>`) {
  modalRoot.innerHTML = `<div class="modal-mask show"><div class="modal"><header><strong>${title}</strong><button class="icon-btn" data-action="close-modal">×</button></header><div class="modal-body">${body}</div><footer>${footer}</footer></div></div>`;
}

function closeModal() {
  modalRoot.innerHTML = "";
  closeDrawer();
}

function openDrawer(title, bodyHTML, footerHTML) {
  const existing = document.querySelector(".drawer-container");
  if (existing) existing.remove();
  const existingMask = document.querySelector(".drawer-mask");
  if (existingMask) existingMask.remove();
  const mask = document.createElement("div");
  mask.className = "drawer-mask show";
  mask.dataset.action = "close-modal";
  document.body.appendChild(mask);
  const drawer = document.createElement("div");
  drawer.className = "drawer-container show";
  drawer.innerHTML = `<header class="drawer-header"><strong>${title}</strong><button class="icon-btn" data-action="close-modal">×</button></header><div class="drawer-body">${bodyHTML}</div><footer class="drawer-footer">${footerHTML}</footer>`;
  document.body.appendChild(drawer);
}

function closeDrawer() {
  const mask = document.querySelector(".drawer-mask");
  const drawer = document.querySelector(".drawer-container");
  if (mask) mask.remove();
  if (drawer) drawer.remove();
}

function handleAlert(id) {
  const alert = state.alerts.find((item) => item.id === id);
  openModal("处理预警", `<div class="form">
    <p class="modal-tip">${alert.title}</p>
    <label>处理结论<textarea id="alertConclusion">已查看预警证据，建议联系患者核实情况并进行复测。</textarea></label>
    <label><input id="needFollow" type="checkbox" checked> 生成随访计划</label>
    <label><input id="needPlan" type="checkbox"> 调整当前管理方案</label>
  </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="save-alert" data-id="${id}">保存处理</button>`);
}

function saveAlert(id) {
  const alert = state.alerts.find((item) => item.id === id);
  alert.status = "已处理";
  addTimeline(alert.patientId, "预警", `医生处理预警：${$("#alertConclusion").value}`);
  if ($("#needFollow").checked) createFollowup(alert.patientId, alert.id, true);
  if ($("#needPlan").checked) adjustCurrentPlan(alert.patientId, alert.id);
  closeModal();
  persist("预警已处理");
}

function openCreatePlanModal() {
  const patientOptions = state.patients.map((patient) => `<option value="${patient.id}">${patient.name}（${patient.diseases.join("、")}）</option>`).join("");
  openModal("新建管理方案", `<div class="form">
    <label>选择患者<select id="newPlanPatient">${patientOptions}</select></label>
    <label>确诊疾病<select id="newPlanDisease"><option>糖尿病</option><option>慢阻肺</option><option>睡眠呼吸暂停</option><option>高血压</option></select></label>
      <label>方案周期<select id="newPlanPeriod">${PLAN_PERIOD_DAYS.map((day) => `<option ${day === 30 ? "selected" : ""}>${day} 天</option>`).join("")}</select></label>
    <div class="method-cards">
      <label class="method-card active" data-method="system">
        <input type="radio" name="createMethod" value="系统推荐模板" checked>
        <strong>系统推荐模板</strong>
        <p>基于疾病诊断和风险等级自动生成，包含完整的10模块配置。</p>
        <small class="method-card-preview">核心目标: 按疾病模板生成指标测量/预警/随访等配置</small>
      </label>
      <label class="method-card" data-method="copy">
        <input type="radio" name="createMethod" value="复制历史方案">
        <strong>复制历史方案</strong>
        <p>复制该患者的历史执行方案作为基础，调整后下发。</p>
        <select id="copySourcePlan" style="margin-top:4px">${state.plans.filter((p) => ["已完成", "已停用"].includes(p.status)).map((p) => `<option value="${p.id}">${p.title}（${p.status}）</option>`).join("") || "<option>暂无可复制方案</option>"}</select>
      </label>
      <label class="method-card" data-method="blank">
        <input type="radio" name="createMethod" value="空白创建">
        <strong>空白创建</strong>
        <p>从零创建方案，所有模块为空白状态，需逐一配置。</p>
        <span class="method-warning">需确保每个必填模块完整填写后才能下发。</span>
      </label>
    </div>
    <label>创建备注<textarea id="newPlanNote" rows="2" placeholder="创建原因或备注说明（可选）"></textarea></label>
  </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="save-new-plan">创建草稿</button>`);
}

function saveNewPlan() {
  const patientId = $("#newPlanPatient").value;
  const disease = $("#newPlanDisease").value;
  const method = $('[name="createMethod"]:checked')?.value || "系统推荐模板";
  let plan;
  if (method === "复制历史方案") {
    const sourceId = $("#copySourcePlan")?.value;
    const sourcePlan = state.plans.find((p) => p.id === sourceId);
    if (sourcePlan) {
      plan = JSON.parse(JSON.stringify(sourcePlan));
      plan.id = uid("PL");
      plan.status = "草稿";
      plan.source = "复制历史方案";
      plan.version = "V2";
      plan.updatedAt = nowText();
      plan.changeLogs = [{ time: plan.updatedAt, text: `从方案 ${sourceId} 复制` }];
      plan.modules.forEach((m) => { m.status = "pending"; m.doctorModified = false; });
    } else {
      showToast("无可复制方案，将使用系统推荐模板");
      plan = buildPlanDraft(patientId, { disease, source: "系统推荐模板", status: "草稿", period: $("#newPlanPeriod").value });
    }
  } else if (method === "空白创建") {
    plan = buildPlanDraft(patientId, { disease, source: "空白创建", status: "草稿", period: $("#newPlanPeriod").value });
    plan.modules.forEach((m) => {
      m.summary = "";
      m.fields = {};
      m.status = "pending";
    });
  } else {
    plan = buildPlanDraft(patientId, { disease, source: "系统推荐模板", status: "草稿", period: $("#newPlanPeriod").value });
  }
  const note = $("#newPlanNote")?.value?.trim() || "";
  if (note) plan.changeLogs.unshift({ time: plan.updatedAt, text: `创建备注: ${note}` });
  state.plans.unshift(plan);
  patientById(patientId).activePlanId = plan.id;
  addTimeline(patientId, "方案", `创建管理方案草稿：${plan.title}`);
  selectedPlanId = plan.id;
  planMode = "detail";
  closeModal();
  persist("已创建管理方案草稿");
}

function buildPlanDraft(patientId, options = {}) {
  const patient = patientById(patientId);
  const disease = options.disease || patient?.diseases?.[0] || "慢病";
  const plan = {
    id: uid("PL"),
    patientId,
    disease,
    title: options.title || `${disease}管理方案草稿`,
    source: options.source || "医生创建",
    status: options.status || "草稿",
    objective: options.objective || "阶段管理目标待完善",
    targets: defaultTargets(disease),
    tasks: defaultTasks(disease),
    period: options.period || (disease.includes("睡眠") ? "14 天" : "30 天"),
    updatedAt: nowText(),
    version: "V1.0"
  };
  ensurePlanShape(plan);
  return plan;
}

function defaultTargets(disease) {
  if (disease.includes("睡眠")) return ["睡眠时长 >= 6 小时", "最低血氧 >= 90%", "AHI < 15 次/小时", "CPAP 使用 >= 4 小时/晚"];
  if (disease.includes("糖尿病")) return ["空腹血糖 4.4-7.0 mmol/L", "餐后 2h 血糖 < 10.0 mmol/L", "每周记录 >= 5 天"];
  if (disease.includes("慢阻肺")) return ["静息 SpO2 >= 92%", "呼吸频率 12-20 次/分", "CAT 评分较上次不升高"];
  if (disease.includes("高血压")) return ["平均血压 < 130/80 mmHg", "每周记录 >= 5 天", "异常血压 0 次"];
  return ["核心指标达到目标范围", "记录完整率提升"];
}

function defaultTasks(disease) {
  if (disease.includes("睡眠")) return ["每日同步睡眠报告", "每晚佩戴 CPAP", "出现憋醒/晨起头痛时记录症状"];
  if (disease.includes("糖尿病")) return ["每日记录空腹血糖", "每周至少 2 次餐后 2h 血糖", "记录饮食备注"];
  if (disease.includes("慢阻肺")) return ["每日记录血氧", "每周完成 CAT 评估", "咳嗽/痰量变化时记录症状"];
  if (disease.includes("高血压")) return ["每日晨间血压", "每周复盘饮食运动", "按月随访"];
  return ["按方案记录核心指标", "出现症状时补充症状记录", "按时完成随访"];
}

function createPlan(patientId, alertId, silent = false) {
  const alert = state.alerts.find((item) => item.id === alertId);
  const patient = patientById(patientId);
  const plan = buildPlanDraft(patientId, {
    disease: patient?.diseases?.[0],
    source: alert ? "预警处理生成" : "医生创建",
    status: "草稿",
    objective: alert ? `围绕“${alert.title}”形成阶段管理目标` : "阶段管理目标待完善"
  });
  state.plans.unshift(plan);
  patient.activePlanId = plan.id;
  addTimeline(patientId, "方案", `创建方案草稿：${plan.title}`);
  selectedPlanId = plan.id;
  planMode = "detail";
  if (!silent) persist("已创建方案草稿");
}

function approvePlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  const statusCode = plan.statusCode || PLAN_STATUS_CODE[plan.status] || "draft";
  if (statusCode !== "draft") {
    showToast("当前方案状态不可重复下发");
    return;
  }
  const validation = validatePlan(plan);
  if (!validation.canPublish) {
    openModal("方案暂不可下发", `<div class="modal-tip">请先补齐阻断项。</div><div class="warning-list">${validation.warnings.map((item) => `<p>${item.message}</p>`).join("")}</div>`, `<button class="btn primary" data-action="close-modal">知道了</button>`);
    return;
  }
  const conflictPlans = state.plans.filter((p) => p.patientId === plan.patientId && p.id !== plan.id && ["执行中", "已下发待患者确认"].includes(p.status) && (p.disease === plan.disease || (plan.diseases && p.diseases && plan.diseases.some((d) => p.diseases.includes(d)))));
  const conflictHTML = conflictPlans.length ? `<div class="conflict-section">
    <strong>冲突检测</strong>
    <p>该患者同疾病域下有 ${conflictPlans.length} 个执行中方案：</p>
    ${conflictPlans.map((p) => `<div class="conflict-item">${tag(p.disease, "muted")} ${p.title} ${tag(p.status, toneOf(p.status))}</div>`).join("")}
    <label>旧方案处理<select id="conflictAction"><option value="replace">替换旧方案（停用旧方案并下发新方案）</option><option value="cancel">取消下发</option></select></label>
  </div>` : "";
  openModal("确认下发方案", `<div class="confirm-release-modal">
    <div class="release-summary">
      <strong>校验结果</strong>${validation.canPublish ? tag("通过", "green") : tag("有阻断项", "red")}
      <p>必填模块完成 ${validation.requiredCompleted}/${validation.requiredTotal}</p>
      ${validation.warnings.length ? `<div class="warning-list">${validation.warnings.map((w) => `<p class="${w.level}">${w.level === "error" ? "阻断" : "提醒"}：${w.message}</p>`).join("")}</div>` : ""}
    </div>
    ${conflictHTML}
    <div class="release-preview-hint"><button class="link" data-action="preview-plan" data-id="${plan.id}">查看患者端预览</button></div>
  </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="confirm-release-plan" data-id="${id}">确认下发</button>`);
}

function confirmReleasePlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  const conflictAction = $("#conflictAction")?.value || "replace";
  if ($("#conflictAction")) {
    const conflictPlans = state.plans.filter((p) => p.patientId === plan.patientId && p.id !== plan.id && ["执行中", "已下发待患者确认"].includes(p.status) && (p.disease === plan.disease));
    if (conflictAction === "replace" && conflictPlans.length) {
      conflictPlans.forEach((p) => { p.status = "已停用"; p.updatedAt = nowText(); p.changeLogs.unshift({ time: p.updatedAt, text: "被新方案替换停用" }); });
    } else if (conflictAction === "cancel") {
      closeModal();
      return;
    }
  }
  plan.status = "已下发待患者确认";
  plan.statusCode = "pending_patient";
  plan.updatedAt = nowText();
  plan.taskRules = generatePlanTaskRules(plan);
  plan.patientPreview = buildPatientPreview(plan);
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "医生确认并下发给患者" });
  addTimeline(plan.patientId, "方案", `医生确认并下发方案：${plan.title}`);
  openModal("患者知晓确认", `<p>方案已下发给患者，待患者确认已知晓并开始执行。</p><div class="summary-box">${plan.title}</div>`, `<button class="btn" data-action="close-modal">稍后</button><button class="btn primary" data-action="patient-confirm-plan" data-id="${id}">标记已确认</button>`);
  saveState(state);
}

function patientConfirmPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  plan.status = "执行中";
  plan.statusCode = "active";
  plan.statusTags = [];
  plan.updatedAt = nowText();
  const closedOldTasks = closeOldPlanVersionTasks(plan);
  plan.changeLogs.unshift({ time: plan.updatedAt, text: `患者确认已知晓并开始执行${closedOldTasks ? `，旧版本未完成任务已结束 ${closedOldTasks} 条` : ""}` });
  addTimeline(plan.patientId, "方案", `患者知晓并开始执行方案：${plan.title}`);
  const patient = patientById(plan.patientId);
  if (patient) patient.activePlanId = plan.id;
  state.advice = state.advice || [];
  state.advice.unshift({ id: uid("AD"), patientId: plan.patientId, type: "方案执行提醒", source: "管理方案", status: "未读", text: `${plan.title}已生效，请按方案完成记录和随访。`, createdAt: nowText() });
  createPatientTasksFromPlan(plan);
  createFollowup(plan.patientId, null, true, plan.id);
  closeModal();
  persist("方案已进入执行中");
}

function createPatientTasksFromPlan(plan) {
  state.patientTasks = state.patientTasks || [];
  const version = planVersionNumber(plan);
  const existingKeys = new Set(state.patientTasks.filter((task) => task.relatedPlanId === plan.id && task.planVersion === version).map((task) => task.mergeKey + task.title));
  (plan.taskRules || []).forEach((rule) => {
    const key = rule.mergeKey + rule.title;
    if (existingKeys.has(key)) return;
    state.patientTasks.unshift({
      id: uid("PT"),
      patientId: plan.patientId,
      taskType: rule.taskType,
      sourceType: "management_plan",
      sourceModule: rule.sourceModule,
      sourceId: plan.id,
      relatedPlanId: plan.id,
      planVersion: version,
      taskGroupId: rule.taskGroup,
      mergeKey: rule.mergeKey,
      diseaseCodes: rule.diseaseCodes,
      title: rule.title,
      patientInstruction: rule.patientInstruction,
      taskPayload: rule.taskPayload,
      scheduleRule: rule.scheduleRule,
      scheduledAt: "按规则生成",
      dueAt: rule.scheduleRule?.firstAfterDays ? `下发后第 ${rule.scheduleRule.firstAfterDays} 天` : rule.scheduleRule?.timeWindow || "当日",
      priority: rule.priority,
      status: "pending",
      allowUnableFeedback: rule.allowUnableFeedback,
      allowBackfill: rule.allowBackfill,
      reminderRule: { miniProgram: true, homeTodo: true },
      overdueRule: { remindPatient: true, notifyDoctor: rule.priority !== "普通" },
      completionPolicy: { mode: rule.taskPayload?.dataSources?.includes("设备采集") ? "manual_or_device" : "manual" },
      createdAt: nowText()
    });
  });
  addTimeline(plan.patientId, "任务", `根据管理方案生成 ${plan.taskRules.length} 条患者端待办规则`);
}

function closeOldPlanVersionTasks(plan) {
  state.patientTasks = state.patientTasks || [];
  const currentVersion = planVersionNumber(plan);
  let closedCount = 0;
  state.patientTasks.forEach((task) => {
    if (task.relatedPlanId !== plan.id || Number(task.planVersion) === currentVersion) return;
    if (["completed", "closed", "invalidated"].includes(task.status)) return;
    task.status = "closed";
    task.closedAt = nowText();
    task.closeReason = "方案版本调整，新版本任务已生效";
    closedCount += 1;
  });
  if (closedCount) addTimeline(plan.patientId, "任务", `方案${plan.version}生效，自动结束旧版本未完成任务 ${closedCount} 条`);
  return closedCount;
}

function savePlanDraft(id) {
  const plan = state.plans.find((item) => item.id === id);
  if (plan.status === "草稿") plan.status = "草稿";
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "医生保存草稿" });
  persist("方案草稿已保存");
}

function rejectPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  const reasons = ["不适用于此患者", "资料不足无法评估", "已线下处理", "风险判断不准确", "其他"];
  openModal("驳回推荐方案", `
    <div class="reject-modal-content">
      <p>驳回后方案将标记为"已驳回"，患者不会收到此方案。请选择驳回原因：</p>
      <div class="reject-reasons">${reasons.map((r, i) => `<label class="radio-item"><input type="radio" name="rejectReason" value="${r}" ${i === 0 ? "checked" : ""}> ${r}</label>`).join("")}</div>
      <label style="margin-top:12px;display:block"><strong>医生备注</strong><textarea id="rejectNote" rows="2" placeholder="补充说明（可选）"></textarea></label>
    </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="confirm-reject-plan" data-id="${id}">确认驳回</button>`);
}

function confirmRejectPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  const reason = $('[name="rejectReason"]:checked')?.value || "其他";
  const note = $("#rejectNote")?.value?.trim() || "";
  plan.status = "已驳回";
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: `驳回推荐：${reason}${note ? `（${note}）` : ""}` });
  closeModal();
  persist("方案已驳回");
}

function withdrawPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  plan.status = "草稿";
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "医生撤回下发，回退到草稿" });
  persist("方案已撤回，回退到草稿状态");
}

function markPatientKnown(id) {
  const plan = state.plans.find((item) => item.id === id);
  plan.status = "执行中";
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "标记患者已知晓，方案进入执行中" });
  const patient = patientById(plan.patientId);
  if (patient) patient.activePlanId = plan.id;
  persist("已标记患者知晓，方案开始执行");
}

function stopPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  const reasons = ["患者依从性差", "治疗方案变更", "患者主动要求停用", "出现不良反应", "已完成阶段性目标", "其他"];
  openModal("停用方案", `
    <div class="reject-modal-content">
      <p>停用后方案将标记为"已停用"，患者端将收到停用通知。请选择停用原因：</p>
      <div class="reject-reasons">${reasons.map((r, i) => `<label class="radio-item"><input type="radio" name="stopReason" value="${r}" ${i === 0 ? "checked" : ""}> ${r}</label>`).join("")}</div>
      <label style="margin-top:12px;display:block"><strong>医生备注</strong><textarea id="stopNote" rows="2" placeholder="补充说明（可选）"></textarea></label>
    </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="confirm-stop-plan" data-id="${id}">确认停用</button>`);
}

function confirmStopPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  const reason = $('[name="stopReason"]:checked')?.value || "其他";
  const note = $("#stopNote")?.value?.trim() || "";
  plan.status = "已停用";
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: `停用方案：${reason}${note ? `（${note}）` : ""}` });
  const patient = patientById(plan.patientId);
  if (patient && patient.activePlanId === plan.id) patient.activePlanId = null;
  closeModal();
  persist("方案已停用");
}

function copyAsNewPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  const newPlan = JSON.parse(JSON.stringify(plan));
  newPlan.id = uid("PL");
  newPlan.status = "草稿";
  newPlan.version = "V2";
  newPlan.source = "复制历史方案";
  newPlan.updatedAt = nowText();
  newPlan.changeLogs = [{ time: newPlan.updatedAt, text: `从方案 ${plan.id} 复制为新方案草稿` }];
  newPlan.modules.forEach((m) => { m.status = "pending"; m.doctorModified = false; });
  state.plans.push(newPlan);
  selectedPlanId = newPlan.id;
  planMode = "detail";
  persist("已复制为新方案草稿，请继续编辑");
}

function adjustPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  const wasAdjustmentDraft = plan.status === "草稿" && plan.statusTags?.includes("调整版本");
  const previousVersion = plan.version || "V1.0";
  plan.status = "草稿";
  plan.statusCode = "draft";
  plan.statusTags = ["调整版本"];
  if (!wasAdjustmentDraft) plan.version = nextPlanVersion(plan);
  plan.source = plan.source?.includes("调整") ? plan.source : `${plan.source || "医生创建"}·方案调整`;
  plan.updatedAt = nowText();
  plan.taskRules = generatePlanTaskRules(plan);
  plan.changeLogs.unshift({ time: plan.updatedAt, text: `医生在原方案上发起调整，保留同一方案记录${wasAdjustmentDraft ? "" : `（${previousVersion} -> ${plan.version}）`}` });
  selectedPlanId = plan.id;
  planMode = "detail";
  persist("原方案已进入调整状态，请继续编辑");
}

function adjustCurrentPlan(patientId, fallbackAlertId = null) {
  const patient = patientById(patientId);
  const currentPlan = state.plans.find((item) => item.id === patient?.activePlanId)
    || plansOf(patientId).find((item) => item.status === "执行中")
    || plansOf(patientId).find((item) => item.status === "草稿" && item.statusTags?.includes("调整版本"));
  if (currentPlan) {
    adjustPlan(currentPlan.id);
    return currentPlan;
  }
  createPlan(patientId, fallbackAlertId, true);
  return null;
}

function continuePlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  plan.status = "执行中";
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "复盘后继续当前方案" });
  persist("方案复盘完成，继续执行");
}

function completePlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  plan.status = "已完成";
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "医生结束方案阶段" });
  const patient = patientById(plan.patientId);
  if (patient && patient.activePlanId === plan.id) patient.activePlanId = null;
  persist("方案阶段已结束");
}

function deletePlanDraft(id) {
  const idx = state.plans.findIndex((item) => item.id === id);
  if (idx !== -1) {
    state.plans.splice(idx, 1);
    if (selectedPlanId === id) { selectedPlanId = null; planMode = "list"; }
    persist("草稿已删除");
  }
}

function remindPatient(id) {
  const plan = state.plans.find((item) => item.id === id);
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "医生提醒患者确认方案" });
  persist("已向患者发送确认提醒");
}

function viewPatientFeedback(id) {
  const plan = state.plans.find((item) => item.id === id);
  const patient = patientById(plan.patientId);
  const isQuestion = plan.statusTags?.includes("患者有疑问");
  const feedbackType = isQuestion ? "疑问" : "无法执行";
  const feedbackText = isQuestion
    ? "患者反馈：对方案中的血压测量频率有疑问，认为每日测量过于频繁，希望改为每周3次。"
    : "患者反馈：无法执行方案中的每日步行30分钟要求，因膝关节疼痛无法长时间行走，希望调整为室内轻度活动。";
  openModal(`患者${feedbackType}反馈`, `
    <div class="feedback-modal-content">
      <div class="feedback-header">
        <strong>${patient?.name || "-"}</strong> <span>${feedbackType}反馈</span>
      </div>
      <div class="feedback-body">
        <p>${feedbackText}</p>
        <small>反馈时间：${plan.updatedAt}</small>
      </div>
      <div class="feedback-actions-hint">
        <p>您可以选择：</p>
        <ul>
          <li>发送医生建议回应患者</li>
          <li>调整方案内容适应患者需求</li>
          ${plan.statusTags?.includes("患者无法执行") ? "<li>停用方案</li>" : ""}
        </ul>
      </div>
    </div>`, `<button class="btn" data-action="close-modal">关闭</button>`);
}

function openPlanModuleEditor(id, moduleKey) {
  if (moduleKey === "basic") {
    document.querySelector("#plan-basic")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector('[data-field="basic.planName"]')?.focus();
    return;
  }
  const plan = state.plans.find((item) => item.id === id);
  const module = planModule(plan, moduleKey);
  const headerTags = `${module.patientVisible ? '<span class="tag blue">患者可见</span>' : '<span class="tag gray">患者不可见</span>'}${module.type === "required" ? '<span class="tag blue">必填</span>' : '<span class="tag green">条件模块</span>'}`;
  const restoreBtn = module.doctorModified ? `<button class="btn" data-action="restore-module-recommend" data-id="${id}" data-module="${moduleKey}">恢复系统推荐</button>` : "";
  openDrawer(`编辑${module.name} ${headerTags}`, moduleEditorBody(module), `<button class="btn" data-action="close-modal">取消</button>${restoreBtn}<button class="btn primary" data-action="save-plan-module" data-id="${id}" data-module="${moduleKey}">保存</button>`);
}

function savePlanModule(id, moduleKey) {
  const plan = state.plans.find((item) => item.id === id);
  const module = planModule(plan, moduleKey);
  module.included = true;
  module.status = "completed";
  module.doctorModified = true;
  if (module.key === "basic") {
    module.fields.planName = readField("basic.planName");
    module.fields.diseases = normalizeDiseases(readField("basic.diseases"));
    module.fields.periodDays = Number(readField("basic.periodDays")) || 30;
    module.fields.startDate = readField("basic.startDate");
    plan.title = module.fields.planName;
    if (module.fields.diseases.length) plan.disease = module.fields.diseases[0];
    plan.diseases = module.fields.diseases;
    plan.period = `${module.fields.periodDays} 天`;
    module.fields.rows = [`方案名称|${module.fields.planName}`, `适用疾病|${module.fields.diseases.join("、")}`, `周期|${module.fields.periodDays} 天`, `开始日期|${module.fields.startDate}`];
  } else if (module.key === "goals") {
    module.fields.stageGoal = $("#moduleStageGoal").value.trim();
    module.fields.targets = $("#moduleTargets").value.split("\n").map((item) => item.trim()).filter(Boolean);
    plan.objective = module.fields.stageGoal;
    plan.targets = module.fields.targets;
  } else if (module.key === "metrics") {
    module.fields.metricItems = readMetricRules();
    module.fields.metricItems.forEach((item) => { item.patientInstruction = compileMetricInstruction(item); });
    module.fields.rows = module.fields.metricItems.map((item) => `${item.metricName}|${item.targetRange}|${item.frequency}${item.timeWindow ? ` ${item.timeWindow}` : ""}|${item.dataSources.join("/")}|${item.patientInstruction}`);
    plan.targets = module.fields.metricItems.map((item) => `${item.metricName} ${item.targetRange}`);
  } else if (module.key === "alerts") {
    module.fields.useGlobalRules = readCheckboxField("alerts.useGlobalRules");
    module.fields.alertRules = readAlertRules();
    module.fields.rows = module.fields.useGlobalRules ? ["规则来源|使用全局预警规则"] : module.fields.alertRules.map((rule) => `${rule.metricName}|${rule.operator} ${rule.threshold}${rule.duration ? ` 连续/持续${rule.duration}` : ""}|${rule.patientActions.join("、")}|${rule.alertLevel}`);
  } else if (module.key === "followup") {
    module.fields.followupRule = readFollowupRule();
    module.fields.rows = [`计划随访|下发后第 ${module.fields.followupRule.firstFollowupAfterDays} 天|${module.fields.followupRule.focusItems.join("、")}|系统生成待随访`];
  } else if (module.key === "symptoms") {
    module.fields.symptomItems = splitList(readField("symptoms.symptomItems"));
    module.fields.recordMode = readField("symptoms.recordMode");
    module.fields.severityEnabled = readCheckboxField("symptoms.severityEnabled");
    module.fields.triggerActions = splitList(readField("symptoms.triggerActions"));
    module.fields.rows = [`症状记录|${module.fields.symptomItems.join("、")}`, `记录方式|${module.fields.recordMode}`, `严重程度|${module.fields.severityEnabled ? "记录" : "不记录"}`, `触发动作|${module.fields.triggerActions.join("、")}`];
  } else if (module.key === "medication") {
    module.fields.medicationItems = readMedicationRules();
    module.fields.medicationItems.forEach((item) => { item.patientInstruction = compileMedicationInstruction(item); });
    module.fields.rows = module.fields.medicationItems.map((item) => `${item.medName}|${item.dose} ${item.frequency}|${(item.timing || []).join("、")}|${item.source}|${item.isCritical ? "关键" : "普通"}`);
  } else if (module.key === "device") {
    module.fields.deviceItems = readDeviceRules();
    module.fields.rows = module.fields.deviceItems.map((item) => `${listText(item.deviceType)}|${item.recommendBind ? "推荐绑定" : "可选"}|${item.patientInstruction || ""}`);
  } else if (module.key === "lifestyle") {
    module.fields.lifestyleItems = readLifestyleRules();
    module.fields.lifestyleItems.forEach((item) => { item.patientInstruction = compileLifestyleInstruction(item); });
    module.fields.rows = module.fields.lifestyleItems.map((item) => `${(item.type || []).join("、")}|${item.frequency}|${item.feedbackMode}|${item.patientInstruction}`);
  } else {
    module.fields.rows = $("#moduleRows")?.value?.split("\n").map((item) => item.trim()).filter(Boolean) || [];
  }
  module.summary = $("#moduleSummary")?.value?.trim() || moduleSummaryFromFields(module);
  module.fields.patientInstruction = compilePatientInstruction(module);
  module.excludeReason = "";
  plan.updatedAt = nowText();
  plan.taskRules = generatePlanTaskRules(plan);
  plan.patientPreview = buildPatientPreview(plan);
  plan.changeLogs.unshift({ time: plan.updatedAt, text: `编辑${module.name}` });
  closeDrawer();
  persist("模块已保存");
}

function readField(fieldPath) {
  const el = document.querySelector(`[data-field="${fieldPath}"]`);
  if (!el) return "";
  if (el.type === "checkbox") return el.checked;
  if (el.multiple) return [...el.selectedOptions].map((option) => option.value);
  return el.value.trim();
}

function readCheckboxField(fieldPath) {
  const el = document.querySelector(`[data-field="${fieldPath}"]`);
  return el ? el.checked : false;
}

function readMedicationRules() {
  return $$("[data-rule-type='medication']").map((card) => {
    const get = (field) => $(`[data-field="${field}"]`, card);
    return {
      medName: get("medication.medName")?.value || "",
      dose: get("medication.dose")?.value || "",
      frequency: get("medication.frequency")?.value || "每日 1 次",
      timing: splitList(get("medication.timing")?.value || ""),
      source: get("medication.source")?.value || "院内处方",
      isCritical: get("medication.isCritical")?.checked || false
    };
  });
}

function readDeviceRules() {
  return $$("[data-rule-type='device']").map((card) => {
    const get = (field) => $(`[data-field="${field}"]`, card);
    return {
      deviceType: splitList(get("device.deviceType")?.value || ""),
      recommendBind: get("device.recommendBind")?.checked ?? true,
      patientInstruction: get("device.patientInstruction")?.value?.trim() || ""
    };
  });
}

function readLifestyleRules() {
  return $$("[data-rule-type='lifestyle']").map((card) => {
    const get = (field) => $(`[data-field="${field}"]`, card);
    return {
      type: splitList(get("lifestyle.type")?.value || ""),
      frequency: get("lifestyle.frequency")?.value || "每日",
      feedbackMode: get("lifestyle.feedbackMode")?.value || "打卡确认"
    };
  });
}

function restoreModuleRecommend(id, moduleKey) {
  const plan = state.plans.find((item) => item.id === id);
  const module = planModule(plan, moduleKey);
  module.doctorModified = false;
  module.status = "completed";
  const defaults = getDefaultModuleFields(module.key, plan);
  Object.assign(module.fields, defaults);
  module.summary = moduleSummaryFromFields(module);
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: `恢复${module.name}系统推荐配置` });
  closeDrawer();
  persist("已恢复系统推荐配置");
}

function getDefaultModuleFields(key, plan) {
  const disease = plan.disease;
  if (key === "goals") return { stageGoal: plan.objective || `${disease}阶段性管理目标`, targets: plan.targets || [] };
  if (key === "metrics") return { metricItems: planMetricConfig(disease) };
  if (key === "alerts") return { alertRules: planAlertRules(disease).map((r, i) => ({ id: `AR${i}`, metricName: r.split("|")[0], enabled: true })) };
  if (key === "followup") return { followupRule: { scheduleFollowup: true, firstFollowupAfterDays: 7 } };
  return {};
}

function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
}

function listText(value) {
  return Array.isArray(value) ? value.join("、") : String(value || "");
}

function readMetricRules() {
  return $$("#metricRuleList [data-rule-type='metric']").map((card) => {
    const get = (field) => $(`[data-field="${field}"]`, card);
    const metricName = get("metricName").value;
    const scenesEl = get("scenes");
    return {
      metricCode: metricCodeOf(metricName),
      metricName,
      scenes: scenesEl?.multiple ? [...scenesEl.selectedOptions].map((option) => option.value) : splitList(scenesEl?.value || ""),
      frequency: get("frequency").value,
      timeWindow: get("timeWindow").value.trim(),
      dataSources: splitList(get("dataSources").value),
      targetRange: get("targetRange").value.trim(),
      taskGroup: get("taskGroup").value,
      priority: get("priority").value,
      generateTodo: true,
      allowBackfill: true,
      allowUnableFeedback: true
    };
  });
}

function readAlertRules() {
  return $$("#alertRuleList [data-rule-type='alert']").map((card) => {
    const get = (field) => $(`[data-field="${field}"]`, card);
    const metricName = get("metricName").value;
    return {
      metricCode: metricCodeOf(metricName),
      metricName,
      operator: get("operator").value,
      threshold: get("threshold").value.trim(),
      duration: get("duration").value.trim(),
      alertLevel: get("alertLevel").value,
      patientActions: splitList(get("patientActions").value),
      doctorActions: splitList(get("doctorActions").value),
      generateFollowupSuggestion: get("generateFollowupSuggestion").checked,
      enabled: get("enabled").checked
    };
  });
}

function readFollowupRule() {
  return {
    firstFollowupAfterDays: Number($('[data-field="followup.firstFollowupAfterDays"]').value),
    frequencyRule: $('[data-field="followup.frequencyRule"]').value,
    methods: splitList($('[data-field="followup.methods"]').value),
    focusItems: splitList($('[data-field="followup.focusItems"]').value),
    prepareItems: splitList($('[data-field="followup.prepareItems"]').value),
    scheduleFollowup: $('[data-field="followup.scheduleFollowup"]').checked
  };
}

function togglePlanModule(id, moduleKey) {
  const plan = state.plans.find((item) => item.id === id);
  const module = planModule(plan, moduleKey);
  if (module.type === "required") return;
  if (!module.included) {
    module.included = true;
    module.status = "completed";
    module.excludeReason = "";
    plan.updatedAt = nowText();
    plan.changeLogs.unshift({ time: plan.updatedAt, text: `启用${module.name}` });
    persist(`已启用${module.name}`);
    return;
  }
  openModal(`关闭${module.name}`, `<div class="form">
    <p class="modal-tip">关闭后该模块不会下发给患者，历史记录仍保留在方案时间轴中。</p>
    <label>关闭原因<textarea id="moduleExcludeReason">本阶段暂不需要患者执行该模块。</textarea></label>
  </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn danger" data-action="confirm-toggle-plan-module" data-id="${id}" data-module="${moduleKey}">确认关闭</button>`);
}

function confirmTogglePlanModule(id, moduleKey) {
  const plan = state.plans.find((item) => item.id === id);
  const module = planModule(plan, moduleKey);
  module.included = false;
  module.status = "excluded";
  module.excludeReason = $("#moduleExcludeReason").value.trim();
  plan.updatedAt = nowText();
  plan.patientPreview = buildPatientPreview(plan);
  plan.changeLogs.unshift({ time: plan.updatedAt, text: `关闭${module.name}` });
  closeModal();
  persist(`已关闭${module.name}`);
}

function showPlanPreview(id) {
  const plan = state.plans.find((item) => item.id === id);
  const statusCode = plan.statusCode || PLAN_STATUS_CODE[plan.status] || "draft";
  const preview = buildPatientPreview(plan);
  const goalCard = preview.objective ? `<div class="mini-app-card goal-card"><div class="card-bar blue"></div><div class="card-content"><strong>本阶段目标</strong><p>${escapeHtml(preview.objective)}</p></div></div>` : "";
  const todayTasks = preview.dailyTasks.length ? `<div class="mini-app-card task-card"><div class="card-bar green"></div><div class="card-content"><strong>今日待完成</strong>${preview.dailyTasks.map((t) => `<div class="preview-task-item">${escapeHtml(t)}</div>`).join("")}</div></div>` : "";
  const followupCard = preview.followup ? `<div class="mini-app-card followup-card"><div class="card-bar orange"></div><div class="card-content"><strong>随访提醒</strong><p>${escapeHtml(preview.followup)}</p></div></div>` : "";
  const abnormalCard = preview.abnormalTips ? `<div class="mini-app-card abnormal-card"><div class="card-bar red"></div><div class="card-content"><strong>异常处理提示</strong><p>${escapeHtml(preview.abnormalTips)}</p></div></div>` : "";
  openModal("患者可见内容预览（小程序卡片风格）", `<div class="preview-mini-app">
    <div class="preview-mini-app-header"><strong>${escapeHtml(preview.title)}</strong><p>${escapeHtml(preview.objective || "")}</p></div>
    ${goalCard}
    ${todayTasks}
    ${followupCard}
    ${abnormalCard}
    <div class="preview-mini-app-modules"><strong>可见模块</strong><div class="pill-list">${preview.visibleModules.map((m) => `<span>${m}</span>`).join("")}</div></div>
  </div>`, `<button class="btn" data-action="close-modal">返回编辑</button><button class="btn primary" data-action="approve-plan" data-id="${id}" ${statusCode === "draft" ? "" : "disabled"}>确认下发</button>`);
}

const FOLLOWUP_TYPES = ["预警后随访", "方案复盘随访", "主动随访", "追踪随访"];
const FOLLOWUP_METHODS = ["电话", "线下"];
const FOLLOWUP_PREPARE_ITEMS = ["血糖记录", "血压记录", "血氧/呼吸数据", "症状记录", "用药记录", "设备同步", "睡眠报告", "检查报告", "量表问卷"];
const FOLLOWUP_SCALES = ["CAT", "mMRC", "ESS", "STOP-Bang"];

function openFollowupDrawer(patientId, alertId, followupId) {
  const patient = patientById(patientId);
  const alert = alertId ? state.alerts.find((a) => a.id === alertId) : null;
  const sourceFollowup = followupId ? state.followups.find((f) => f.id === followupId) : null;
  const defaultType = alert ? "预警后随访" : sourceFollowup ? "追踪随访" : "主动随访";
  const activePlan = plansOf(patientId).find((p) => p.id === patient.activePlanId);
  const sourceLabel = alert ? `预警：${alert.title}` : sourceFollowup ? `随访：${sourceFollowup.title}` : "";
  const sourceType = alert ? "alert" : sourceFollowup ? "followup" : "manual";
  const sourceId = alert?.id || sourceFollowup?.id || "";
  const today = new Date().toISOString().slice(0, 16);
  openDrawer(
    `创建随访`,
    `<div class="form drawer-form">
      <div class="drawer-patient-bar"><strong>${patient.name}</strong>${sourceId ? `<span class="tag blue">${sourceLabel}</span>` : ""}</div>
      <fieldset class="form-group">
        <legend>随访基础信息</legend>
        <label>随访类型 <span class="field-note">必填</span>
          <select id="followupType">
            ${FOLLOWUP_TYPES.map((t) => `<option ${t === defaultType ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </label>
        <label>关联方案
          <select id="followupPlan">
            <option value="">无关联方案</option>
            ${activePlan ? `<option value="${escapeAttr(activePlan.id)}" selected>${escapeHtml(activePlan.title)}</option>` : ""}
          </select>
        </label>
        ${alert ? `<label>关联预警<input value="${escapeAttr(alert.title)}" readonly></label>` : ""}
        <label>创建原因 <span class="field-note">必填</span>
          <textarea id="followupReason" rows="2" maxlength="200" placeholder="填写安排此次随访的原因">${alert ? alert.title : ""}</textarea>
          <span class="field-error" id="followupReasonError"></span>
        </label>
      </fieldset>
      <fieldset class="form-group">
        <legend>随访安排</legend>
        <label>计划时间 <span class="field-note">必填</span>
          <div class="quick-time-row">
            <button type="button" class="chip" data-quick-hours="24">24小时后</button>
            <button type="button" class="chip" data-quick-hours="48">48小时后</button>
            <button type="button" class="chip" data-quick-days="3">3天后</button>
            <button type="button" class="chip" data-quick-days="7">1周后</button>
          </div>
          <input id="followupScheduledAt" type="datetime-local" min="${escapeAttr(today)}">
          <span class="field-error" id="followupTimeError"></span>
        </label>
        <label>随访方式 <span class="field-note">必填</span>
          <div class="radio-group">
            ${FOLLOWUP_METHODS.map((m, i) => `<label class="radio-item"><input type="radio" name="followupMethod" value="${escapeAttr(m)}" ${i === 0 ? "checked" : ""}> ${m}</label>`).join("")}
          </div>
        </label>
        <label>负责人<input id="followupOwner" value="${escapeAttr(state.currentDoctor?.name || "林医生")}"></label>
      </fieldset>
      <fieldset class="form-group">
        <legend>患者准备</legend>
        <label>准备材料（可多选）
          <div class="check-group" id="followupPrepareItems">
            ${FOLLOWUP_PREPARE_ITEMS.map((item) => `<label class="check-item"><input type="checkbox" name="followupPrepare" value="${escapeAttr(item)}"> ${item}</label>`).join("")}
          </div>
        </label>
        <div id="scalesArea" style="display:none">
          <label>量表 <span class="field-note">至少选一个</span>
            <div class="check-group">
              ${FOLLOWUP_SCALES.map((s) => `<label class="check-item"><input type="checkbox" name="followupScale" value="${escapeAttr(s)}"> ${s}</label>`).join("")}
            </div>
            <span class="field-error" id="scalesError"></span>
          </label>
        </div>
        <label>患者端说明 <span class="field-note">必填，120字内</span>
          <textarea id="followupInstruction" rows="3" maxlength="120" placeholder="告知患者需要准备什么（患者可见）"></textarea>
          <span class="field-error" id="followupInstructionError"></span>
        </label>
        <label class="switch-row"><span>是否提醒患者</span><input id="followupNotify" type="checkbox" checked></label>
      </fieldset>
      <input type="hidden" id="followupSourceType" value="${escapeAttr(sourceType)}">
      <input type="hidden" id="followupSourceId" value="${escapeAttr(sourceId)}">
      <input type="hidden" id="followupPatientId" value="${escapeAttr(patientId)}">
    </div>`,
    `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" id="saveFollowupBtn" data-action="save-followup-drawer" disabled>创建随访</button>`
  );
  function updateFollowupBtn() {
    const btn = document.querySelector("#saveFollowupBtn");
    if (!btn) return;
    const reason = (document.querySelector("#followupReason")?.value || "").trim();
    const time = document.querySelector("#followupScheduledAt")?.value;
    const method = document.querySelector('[name="followupMethod"]:checked')?.value;
    const instruction = (document.querySelector("#followupInstruction")?.value || "").trim();
    btn.disabled = !reason || !time || !method || !instruction;
  }
  document.addEventListener("click", function onFollowupClick(e) {
    if (!document.querySelector("#followupPatientId")) { document.removeEventListener("click", onFollowupClick); return; }
    const hoursBtn = e.target.closest("[data-quick-hours]");
    const daysBtn = e.target.closest("[data-quick-days]");
    if (hoursBtn || daysBtn) {
      const d = new Date();
      if (hoursBtn) d.setHours(d.getHours() + parseInt(hoursBtn.dataset.quickHours));
      if (daysBtn) d.setDate(d.getDate() + parseInt(daysBtn.dataset.quickDays));
      const el = document.querySelector("#followupScheduledAt");
      if (el) el.value = d.toISOString().slice(0, 16);
      updateFollowupBtn();
    }
  }, { passive: true });
  document.addEventListener("change", function onFollowupChange(e) {
    if (!document.querySelector("#followupPatientId")) { document.removeEventListener("change", onFollowupChange); return; }
    if (e.target.name === "followupPrepare" && e.target.value === "量表问卷") {
      const scalesArea = document.querySelector("#scalesArea");
      if (scalesArea) scalesArea.style.display = e.target.checked ? "" : "none";
    }
    updateFollowupBtn();
  }, { passive: true });
  document.addEventListener("input", function onFollowupInput(e) {
    if (!document.querySelector("#followupPatientId")) { document.removeEventListener("input", onFollowupInput); return; }
    if (e.target.id === "followupInstruction") {
      const el = document.querySelector("#followupInstructionError");
      if (el) el.textContent = e.target.value.length > 120 ? "患者端说明不能超过120字" : "";
    }
    if (e.target.id === "followupReason") {
      const el = document.querySelector("#followupReasonError");
      if (el) el.textContent = e.target.value.length > 200 ? "创建原因不能超过200字" : "";
    }
    updateFollowupBtn();
  }, { passive: true });
}

function saveFollowupDrawer() {
  const patientId = document.querySelector("#followupPatientId")?.value;
  const sourceType = document.querySelector("#followupSourceType")?.value || "manual";
  const sourceId = document.querySelector("#followupSourceId")?.value || "";
  const type = document.querySelector("#followupType")?.value;
  const relatedPlanId = document.querySelector("#followupPlan")?.value || null;
  const reason = (document.querySelector("#followupReason")?.value || "").trim();
  const scheduledAt = document.querySelector("#followupScheduledAt")?.value;
  const method = document.querySelector('[name="followupMethod"]:checked')?.value;
  const owner = (document.querySelector("#followupOwner")?.value || "").trim();
  const instruction = (document.querySelector("#followupInstruction")?.value || "").trim();
  const prepareItems = [...document.querySelectorAll('[name="followupPrepare"]:checked')].map((el) => el.value);
  const scales = [...document.querySelectorAll('[name="followupScale"]:checked')].map((el) => el.value);
  if (!reason || !scheduledAt || !method || !instruction) { showToast("请填写必填项"); return; }
  if (new Date(scheduledAt) < new Date()) { showToast("随访时间不能早于当前时间"); return; }
  if (prepareItems.includes("量表问卷") && !scales.length) {
    const el = document.querySelector("#scalesError");
    if (el) el.textContent = "请选择至少一个量表";
    showToast("请选择至少一个量表");
    return;
  }
  const followup = {
    id: uid("F"),
    patientId,
    sourceType,
    sourceId,
    relatedAlertId: sourceType === "alert" ? sourceId : null,
    relatedPlanId,
    title: type,
    type,
    status: "待随访",
    dueAt: scheduledAt.replace("T", " "),
    method,
    owner: owner || state.currentDoctor?.name || "林医生",
    prepareItems,
    scales,
    patientInstruction: instruction,
    reason,
    focus: prepareItems.length ? prepareItems.slice(0, 3) : ["方案执行情况", "指标记录", "症状变化"]
  };
  state.followups.unshift(followup);
  patientById(patientId).nextFollowupId = followup.id;
  addTimeline(patientId, "随访", `创建随访计划：${type}（${method}，${followup.dueAt}）`);
  if (sourceType === "alert" && sourceId) {
    const alert = state.alerts.find((a) => a.id === sourceId);
    if (alert) alert._actionSummary = (alert._actionSummary ? alert._actionSummary + "；" : "") + `已创建随访「${type}」`;
  }
  if (sourceType === "followup" && sourceId) {
    const src = state.followups.find((f) => f.id === sourceId);
    if (src) src._nextFollowupSummary = `已追加随访「${type}」`;
  }
  closeDrawer();
  persist(`已创建随访：${type}`);
}

function createFollowup(patientId, alertId, silent = false, planId = null) {
  const followup = {
    id: uid("F"),
    patientId,
    title: alertId ? "预警后随访" : "方案执行随访",
    type: alertId ? "预警后随访" : "方案随访",
    status: "待随访",
    dueAt: "2026-05-20 10:00",
    focus: alertId ? ["异常原因核实", "症状变化", "是否调整方案"] : ["方案执行情况", "指标记录完整性", "患者反馈"],
    linkedPlanId: planId
  };
  state.followups.unshift(followup);
  patientById(patientId).nextFollowupId = followup.id;
  addTimeline(patientId, "随访", `创建随访计划：${followup.title}`);
  if (!silent) persist("已创建随访计划");
}

function completeFollowup(id) {
  openModal("完成随访", `<div class="form">
    <label>随访结论<textarea id="followConclusion">患者已完成沟通，继续观察核心指标。</textarea></label>
    <label><input id="adjustPlan" type="checkbox"> 需要调整管理方案</label>
  </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="save-followup" data-id="${id}">保存随访</button>`);
}

function saveFollowup(id) {
  const followup = state.followups.find((item) => item.id === id);
  followup.status = "已完成";
  addTimeline(followup.patientId, "随访", `完成随访：${$("#followConclusion").value}`);
  if ($("#adjustPlan").checked) adjustCurrentPlan(followup.patientId);
  closeModal();
  persist("随访已完成");
}

function sendAdvice(patientId, alertId, followupId) {
  const patient = patientById(patientId);
  const alert = alertId ? state.alerts.find((a) => a.id === alertId) : null;
  const followup = followupId ? state.followups.find((f) => f.id === followupId) : null;
  const sourceLabel = alert ? `预警：${alert.title}` : followup ? `随访：${followup.title}` : "手动发起";
  const sourceType = alert ? "alert" : followup ? "followup" : "manual";
  const sourceId = alert?.id || followup?.id || "";
  openDrawer(
    `发送医生建议`,
    `<div class="form drawer-form">
      <div class="drawer-patient-bar"><strong>${patient.name}</strong>${sourceId ? `<span class="tag blue">${sourceLabel}</span>` : ""}</div>
      <fieldset class="form-group">
        <legend>来源信息</legend>
        <label>来源<input id="adviceSourceLabel" value="${escapeAttr(sourceLabel)}" readonly></label>
        <label>发送原因（内部留痕，患者不可见）<textarea id="adviceReason" rows="2" placeholder="可填写此次发送建议的内部原因"></textarea></label>
      </fieldset>
      <fieldset class="form-group">
        <legend>建议内容</legend>
        <label>标题 <span class="field-note">必填，20字内</span>
          <input id="adviceTitle" maxlength="20" placeholder="请输入建议标题">
          <span class="field-error" id="adviceTitleError"></span>
        </label>
        <label>正文 <span class="field-note">必填，200字内</span>
          <textarea id="adviceContent" rows="5" maxlength="200" placeholder="请用患者可理解的语言描述建议内容（30-150字为佳）"></textarea>
          <span class="field-error" id="adviceContentError"></span>
        </label>
      </fieldset>
      <input type="hidden" id="adviceSourceType" value="${escapeAttr(sourceType)}">
      <input type="hidden" id="adviceSourceId" value="${escapeAttr(sourceId)}">
      <input type="hidden" id="advicePatientId" value="${escapeAttr(patientId)}">
    </div>`,
    `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" id="sendAdviceBtn" data-action="save-advice" disabled>发送建议</button>`
  );
  const updateBtn = () => {
    const btn = document.querySelector("#sendAdviceBtn");
    if (!btn) return;
    const title = (document.querySelector("#adviceTitle")?.value || "").trim();
    const content = (document.querySelector("#adviceContent")?.value || "").trim();
    btn.disabled = !title || !content;
  };
  document.addEventListener("input", function onInput(e) {
    if (!document.querySelector("#adviceTitle")) { document.removeEventListener("input", onInput); return; }
    if (e.target.id === "adviceTitle") {
      const v = e.target.value;
      document.querySelector("#adviceTitleError").textContent = v.length > 20 ? "标题不能超过20字" : "";
    }
    if (e.target.id === "adviceContent") {
      const v = e.target.value;
      document.querySelector("#adviceContentError").textContent = v.length > 200 ? "正文不能超过200字" : "";
    }
    updateBtn();
  }, { passive: true });
}

function saveAdvice() {
  const patientId = document.querySelector("#advicePatientId")?.value;
  const title = (document.querySelector("#adviceTitle")?.value || "").trim();
  const content = (document.querySelector("#adviceContent")?.value || "").trim();
  const reason = (document.querySelector("#adviceReason")?.value || "").trim();
  const sourceType = document.querySelector("#adviceSourceType")?.value || "manual";
  const sourceId = document.querySelector("#adviceSourceId")?.value || "";
  if (!title || !content) { showToast("请填写标题和正文"); return; }
  if (title.length > 20) { showToast("标题不能超过20字"); return; }
  if (content.length > 200) { showToast("正文不能超过200字"); return; }
  state.advice = state.advice || [];
  state.advice.unshift({ id: uid("AD"), patientId, sourceType, sourceId, title, content, reason, status: "未读", sentAt: nowText(), createdAt: nowText() });
  addTimeline(patientId, "医生建议", `发送医生建议：${title}`);
  if (sourceType === "alert" && sourceId) {
    const alert = state.alerts.find((a) => a.id === sourceId);
    if (alert) alert._actionSummary = (alert._actionSummary ? alert._actionSummary + "；" : "") + `已发送建议「${title}」`;
  }
  if (sourceType === "followup" && sourceId) {
    const followup = state.followups.find((f) => f.id === sourceId);
    if (followup) followup._lastAdviceSummary = `已发送建议「${title}」`;
  }
  closeDrawer();
  persist("医生建议已发送");
}

const RECHECK_METRIC_SCENES = {
  "血糖": ["凌晨", "空腹", "早餐后2h", "午餐前", "午餐后2h", "晚餐前", "睡前", "随机"],
  "血压": ["晨起", "睡前", "随机"],
  "SpO2": ["静息后", "活动后", "睡前"],
  "呼吸频率": ["静息后", "活动后", "睡前"],
  "睡眠报告": ["夜间", "起床后", "每次睡眠报告后"]
};
const RECHECK_METRICS = Object.keys(RECHECK_METRIC_SCENES);
const RECHECK_FREQUENCIES = ["一次", "每日1次", "每日2次", "每日3次"];
const RECHECK_DURATIONS = ["1天", "2天", "3天", "5天", "7天", "自定义"];

function openRecheckDrawer(patientId, alertId, followupId) {
  const patient = patientById(patientId);
  const alert = alertId ? state.alerts.find((a) => a.id === alertId) : null;
  const followup = followupId ? state.followups.find((f) => f.id === followupId) : null;
  const sourceLabel = alert ? `预警：${alert.title}` : followup ? `随访：${followup.title}` : "手动发起";
  const sourceType = alert ? "alert" : followup ? "followup" : "manual";
  const sourceId = alert?.id || followup?.id || "";
  const today = new Date().toISOString().slice(0, 10);
  openDrawer(
    `创建复测指标`,
    `<div class="form drawer-form">
      <div class="drawer-patient-bar"><strong>${patient.name}</strong>${sourceId ? `<span class="tag blue">${sourceLabel}</span>` : ""}</div>
      <fieldset class="form-group">
        <legend>复测对象与原因</legend>
        <label>复测指标 <span class="field-note">必填，最多3个</span>
          <div class="check-group" id="recheckMetrics">
            ${RECHECK_METRICS.map((m) => `<label class="check-item"><input type="checkbox" name="recheckMetric" value="${escapeAttr(m)}"> ${m}</label>`).join("")}
          </div>
          <span class="field-error" id="recheckMetricsError"></span>
        </label>
        <div id="recheckScenesArea"></div>
        <label>复测原因 <span class="field-note">必填</span>
          <textarea id="recheckReason" rows="2" maxlength="200" placeholder="填写此次复测的原因（医生内部留痕）">${alert ? alert.title : ""}</textarea>
          <span class="field-error" id="recheckReasonError"></span>
        </label>
      </fieldset>
      <fieldset class="form-group">
        <legend>执行规则</legend>
        <div class="form-row">
          <label>执行频率 <span class="field-note">必填</span>
            <select id="recheckFreq">
              <option value="">请选择</option>
              ${RECHECK_FREQUENCIES.map((f) => `<option>${f}</option>`).join("")}
            </select>
          </label>
          <label>复测时长 <span class="field-note">必填</span>
            <select id="recheckDuration">
              <option value="">请选择</option>
              ${RECHECK_DURATIONS.map((d) => `<option>${d}</option>`).join("")}
            </select>
          </label>
        </div>
        <div id="recheckCustomDurationArea" style="display:none">
          <label>自定义天数<input id="recheckCustomDays" type="number" min="1" max="30" placeholder="输入天数"></label>
        </div>
      </fieldset>
      <fieldset class="form-group">
        <legend>患者承接方式</legend>
        <label>患者端说明 <span class="field-note">必填，120字内</span>
          <textarea id="recheckInstruction" rows="3" maxlength="120" placeholder="用患者可理解的语言说明为什么要复测、怎么做"></textarea>
          <span class="field-error" id="recheckInstructionError"></span>
        </label>
        <div class="form-row">
          <label>开始时间 <span class="field-note">必填</span>
            <input id="recheckStartAt" type="date" value="${escapeAttr(today)}" min="${escapeAttr(today)}">
            <span class="field-error" id="recheckStartError"></span>
          </label>
          <label>截止时间 <span class="field-note">按时长自动计算</span>
            <input id="recheckEndAt" type="date" readonly>
          </label>
        </div>
        <label class="switch-row"><span>是否提醒患者</span><input id="recheckNotify" type="checkbox" checked></label>
      </fieldset>
      <input type="hidden" id="recheckSourceType" value="${escapeAttr(sourceType)}">
      <input type="hidden" id="recheckSourceId" value="${escapeAttr(sourceId)}">
      <input type="hidden" id="recheckPatientId" value="${escapeAttr(patientId)}">
    </div>`,
    `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" id="saveRecheckBtn" data-action="save-recheck" disabled>创建复测</button>`
  );
  function updateRecheckScenes() {
    const checked = [...document.querySelectorAll('[name="recheckMetric"]:checked')].map((el) => el.value);
    const area = document.querySelector("#recheckScenesArea");
    if (!area) return;
    area.innerHTML = checked.map((metric) => {
      const scenes = RECHECK_METRIC_SCENES[metric] || [];
      if (!scenes.length) return "";
      return `<label>${metric}测量场景 <span class="field-note">条件必填</span>
        <div class="check-group" id="recheckScenes_${escapeAttr(metric)}">
          ${scenes.map((s) => `<label class="check-item"><input type="checkbox" name="recheckScene_${escapeAttr(metric)}" value="${escapeAttr(s)}"> ${s}</label>`).join("")}
        </div>
        <span class="field-error" id="recheckSceneError_${escapeAttr(metric)}"></span>
      </label>`;
    }).join("");
  }
  function updateEndDate() {
    const start = document.querySelector("#recheckStartAt")?.value;
    const dur = document.querySelector("#recheckDuration")?.value;
    const customDays = parseInt(document.querySelector("#recheckCustomDays")?.value || "0");
    if (!start) return;
    let days = 0;
    if (dur === "1天") days = 1;
    else if (dur === "2天") days = 2;
    else if (dur === "3天") days = 3;
    else if (dur === "5天") days = 5;
    else if (dur === "7天") days = 7;
    else if (dur === "自定义" && customDays > 0) days = customDays;
    if (days > 0) {
      const end = new Date(start);
      end.setDate(end.getDate() + days - 1);
      const endEl = document.querySelector("#recheckEndAt");
      if (endEl) endEl.value = end.toISOString().slice(0, 10);
    }
  }
  function updateRecheckBtn() {
    const btn = document.querySelector("#saveRecheckBtn");
    if (!btn) return;
    const checkedMetrics = [...document.querySelectorAll('[name="recheckMetric"]:checked')];
    const reason = (document.querySelector("#recheckReason")?.value || "").trim();
    const freq = document.querySelector("#recheckFreq")?.value;
    const dur = document.querySelector("#recheckDuration")?.value;
    const instruction = (document.querySelector("#recheckInstruction")?.value || "").trim();
    const startAt = document.querySelector("#recheckStartAt")?.value;
    btn.disabled = !checkedMetrics.length || !reason || !freq || !dur || !instruction || !startAt;
  }
  document.addEventListener("change", function onRecheckChange(e) {
    if (!document.querySelector("#recheckPatientId")) { document.removeEventListener("change", onRecheckChange); return; }
    if (e.target.name === "recheckMetric") {
      const checked = [...document.querySelectorAll('[name="recheckMetric"]:checked')];
      if (checked.length > 3) { e.target.checked = false; showToast("最多选择3个指标"); return; }
      updateRecheckScenes();
    }
    if (e.target.id === "recheckDuration") {
      const customArea = document.querySelector("#recheckCustomDurationArea");
      if (customArea) customArea.style.display = e.target.value === "自定义" ? "" : "none";
      updateEndDate();
    }
    if (e.target.id === "recheckStartAt" || e.target.id === "recheckCustomDays") updateEndDate();
    updateRecheckBtn();
  }, { passive: true });
  document.addEventListener("input", function onRecheckInput(e) {
    if (!document.querySelector("#recheckPatientId")) { document.removeEventListener("input", onRecheckInput); return; }
    if (e.target.id === "recheckInstruction") {
      const v = e.target.value;
      const el = document.querySelector("#recheckInstructionError");
      if (el) el.textContent = v.length > 120 ? "患者端说明不能超过120字" : "";
    }
    if (e.target.id === "recheckReason") {
      const v = e.target.value;
      const el = document.querySelector("#recheckReasonError");
      if (el) el.textContent = v.length > 200 ? "复测原因不能超过200字" : "";
    }
    if (e.target.id === "recheckCustomDays") updateEndDate();
    updateRecheckBtn();
  }, { passive: true });
}

function saveRecheck() {
  const patientId = document.querySelector("#recheckPatientId")?.value;
  const sourceType = document.querySelector("#recheckSourceType")?.value || "manual";
  const sourceId = document.querySelector("#recheckSourceId")?.value || "";
  const metrics = [...document.querySelectorAll('[name="recheckMetric"]:checked')].map((el) => el.value);
  const scenes = {};
  metrics.forEach((m) => {
    const checked = [...document.querySelectorAll(`[name="recheckScene_${m}"]:checked`)].map((el) => el.value);
    if (checked.length) scenes[m] = checked;
  });
  const reason = (document.querySelector("#recheckReason")?.value || "").trim();
  const freq = document.querySelector("#recheckFreq")?.value;
  const dur = document.querySelector("#recheckDuration")?.value;
  const instruction = (document.querySelector("#recheckInstruction")?.value || "").trim();
  const startAt = document.querySelector("#recheckStartAt")?.value;
  const endAt = document.querySelector("#recheckEndAt")?.value;
  if (!metrics.length) { showToast("请选择至少一个复测指标"); return; }
  for (const m of metrics) {
    const scenesForMetric = RECHECK_METRIC_SCENES[m];
    if (scenesForMetric.length && !(scenes[m]?.length)) {
      const errEl = document.querySelector(`#recheckSceneError_${m}`);
      if (errEl) errEl.textContent = "请选择测量场景";
      showToast("请选择测量场景");
      return;
    }
  }
  if (!reason || !freq || !dur || !instruction || !startAt) { showToast("请填写必填项"); return; }
  state.recheckPlans = state.recheckPlans || [];
  const plan = { id: uid("RC"), patientId, sourceType, sourceId, metricCodes: metrics, scenes, frequency: freq, duration: dur, startAt, endAt, patientInstruction: instruction, reason, status: "active", createdAt: nowText() };
  state.recheckPlans.unshift(plan);
  const summary = `${metrics.join("、")}，${dur}复测`;
  addTimeline(patientId, "复测指标", `创建复测指标：${summary}`);
  if (sourceType === "alert" && sourceId) {
    const alert = state.alerts.find((a) => a.id === sourceId);
    if (alert) alert._actionSummary = (alert._actionSummary ? alert._actionSummary + "；" : "") + `已创建复测（${summary}）`;
  }
  if (sourceType === "followup" && sourceId) {
    const followup = state.followups.find((f) => f.id === sourceId);
    if (followup) followup._lastRecheckSummary = `已创建复测（${summary}）`;
  }
  closeDrawer();
  persist(`已创建复测：${summary}`);
}

function openMore(patientId) {
  const patient = patientById(patientId);
  const rows = [];
  if (alertsOf(patientId).some((item) => item.status === "待处理")) rows.push(`<button class="btn primary" data-view-link="alerts">去处理预警</button>`);
  if (hasPendingDiseaseRisk(patient)) rows.push(`<button class="btn primary" data-action="view-patient-tab" data-patient="${patientId}" data-tab="screening">去确认疾病</button>`);
  if (plansOf(patientId).some((item) => item.status === "草稿")) rows.push(`<button class="btn primary" data-view-link="plans">去确认方案</button>`);
  if (followupsOf(patientId).some((item) => ["待随访", "逾期"].includes(item.status))) rows.push(`<button class="btn primary" data-view-link="followups">去完成随访</button>`);
  if (hasDataIssue(patient)) rows.push(`<button class="btn" data-action="view-patient-tab" data-patient="${patientId}" data-tab="${hasSleepBreathingDisorder(patient) ? "analysis" : "overview"}">查看数据缺失</button>`);
  openModal(`${patient.name} 的待处理事项`, `<div class="action-stack">${rows.join("") || "暂无待处理事项"}</div>`, `<button class="btn" data-action="close-modal">关闭</button>`);
}

document.body.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-view-link]");
  if (!target) return;

  if (target.dataset.viewLink) {
    currentView = target.dataset.viewLink;
    if (currentView === "plans") planMode = "list";
    closeModal();
    render();
    return;
  }

  const action = target.dataset.action;
  if (action === "close-modal") closeModal();
  if (action === "toggle-nav-group") {
    const group = target.closest(".nav-group");
    if (group) group.classList.toggle("open");
    return;
  }
  // ── Config module actions ──
  if (action === "set-metric-dict-category") { metricDictCategoryFilter = target.dataset.category; resetPage("metricDictionary"); render(); }
  if (action === "clear-metric-dict-search") { metricDictSearchQuery = ""; resetPage("metricDictionary"); render(); }
  if (action === "set-goal-category") { goalCategoryFilter = target.dataset.category; resetPage("goalManagement"); render(); }
  if (action === "set-goal-status") { goalStatusFilter = target.dataset.status; resetPage("goalManagement"); render(); }
  if (action === "clear-goal-search") { goalSearchQuery = ""; resetPage("goalManagement"); render(); }
  if (action === "edit-goal-threshold") { openGoalThresholdEditor(target.dataset.id); }
  if (action === "save-goal-threshold") { saveGoalThreshold(); }
  if (action === "toggle-goal-status") { confirmToggleGoalStatus(target.dataset.id); }
  if (action === "confirm-toggle-goal-status") { doToggleGoalStatus(target.dataset.id); }
  if (action === "view-goal-detail") { openGoalDetailDrawer(target.dataset.id); }
  if (action === "reset") {
    state = resetState();
    selectedPatientId = state.patients[0].id;
    patientFilter = "all";
    Object.values(paginationState).forEach((pager) => {
      pager.page = 1;
      pager.jump = "";
    });
    persist("数据已刷新");
  }
  if (action === "filter-patients") {
    patientFilter = patientFilter === target.dataset.filter ? "all" : target.dataset.filter;
    resetPage("patients");
    render();
  }
  if (action === "set-filter") {
    patientFilters[target.dataset.filterKey] = target.dataset.filterValue;
    resetPage("patients");
    render();
  }
  if (action === "remove-filter") {
    const key = target.dataset.filterKey;
    if (key === "quick") patientFilter = "all";
    else if (key === "search") searchQuery = "";
    else patientFilters[key] = "全部";
    resetPage("patients");
    render();
  }
  if (action === "clear-all-filters") {
    patientFilter = "all";
    searchQuery = "";
    patientFilters = {
      important: "全部",
      risk: "全部",
      diseaseRisk: "全部",
      disease: "全部",
      todo: "全部",
      plan: "全部",
      followup: "全部",
      data: "全部",
      relation: "全部",
      device: "全部"
    };
    resetPage("patients");
    render();
  }
  if (action === "clear-search") {
    searchQuery = "";
    resetPage("patients");
    render();
  }
  if (action === "clear-plan-search") {
    planSearchQuery = "";
    resetPage("plans");
    render();
  }
  if (action === "page-prev" || action === "page-next" || action === "page-go") {
    const scope = target.dataset.pageScope;
    const pager = paginationState[scope];
    if (action === "page-prev") pager.page -= 1;
    if (action === "page-next") pager.page += 1;
    if (action === "page-go") pager.page = Number(target.dataset.page);
    render();
  }
  if (action === "toggle-filters") {
    filtersCollapsed = !filtersCollapsed;
    render();
  }
  if (action === "view-patient") {
    selectedPatientId = target.dataset.patient;
    detailTab = "overview";
    currentView = "detail";
    render();
  }
  if (action === "toggle-important") {
    const patient = patientById(target.dataset.patient);
    patient.important = !patient.important;
    addTimeline(patient.id, "档案", `${patient.important ? "标记" : "取消"}重点关注`);
    persist(patient.important ? "已标记重点关注" : "已取消重点关注");
  }
  if (action === "detail-tab") {
    detailTab = target.dataset.tab;
    render();
  }
  if (action === "glucose-subtab") {
    if (!window._glucoseSubTab) window._glucoseSubTab = {};
    window._glucoseSubTab[target.dataset.patient] = target.dataset.tab;
    render();
    // Init charts after render if switching to CGM
    if (target.dataset.tab === "cgm") {
      setTimeout(() => initGlucoseCharts(target.dataset.patient), 50);
    }
  }
  if (action === "enter-twin") {
    detailTab = "digital-twin";
    render();
  }
  if (action === "dt-organ-click") {
    const organ = target.dataset.organ;
    if (twinSelectedOrgan === organ) {
      twinSelectedOrgan = null;
      twinSelectedSource = null;
    } else {
      twinSelectedOrgan = organ;
      twinSelectedSource = "organ";
    }
    render();
  }
  if (action === "dt-chain-click") {
    const chainId = target.dataset.chain;
    twinPlayingChain = twinPlayingChain === chainId ? null : chainId;
    render();
  }
  if (action === "dt-toggle-demo") {
    twinDemoMode = !twinDemoMode;
    twinSelectedOrgan = null;
    twinPlayingChain = null;
    render();
  }
  if (action === "dt-demo-template") {
    twinDemoTemplate = target.dataset.template;
    twinSelectedOrgan = null;
    twinPlayingChain = null;
    render();
  }
  if (action === "enter-sleep-tab") {
    detailTab = "analysis";
    render();
  }
  if (action === "agp-period") {
    window._gAgpPeriod = parseInt(target.dataset.period, 10);
    document.querySelectorAll("[data-action='agp-period']").forEach(b => b.classList.toggle("active", b === target));
    initGlucoseCharts(selectedPatientId);
  }
  if (action === "tl-expand") {
    const idx = target.dataset.idx;
    const full = document.getElementById("g-tl-full-" + idx);
    if (!full) return;
    const isShown = full.style.display !== "none";
    full.style.display = isShown ? "none" : "block";
    target.textContent = isShown ? "展开" : "收起";
  }
  if (action === "set-sleep-window") setSleepWindow(target.dataset.patient || selectedPatientId, target.dataset.window);
  if (action === "set-sleep-trend") setSleepTrend(target.dataset.metric);
  if (action === "select-sleep-report") selectSleepReport(target.dataset.patient || selectedPatientId, target.dataset.report);
  if (action === "open-sleep-reports") openSleepReportsModal(target.dataset.patient || selectedPatientId);
  if (action === "view-patient-tab") {
    selectedPatientId = target.dataset.patient;
    detailTab = target.dataset.tab;
    currentView = "detail";
    closeModal();
    render();
  }
  if (action === "open-more") openMore(target.dataset.patient);
  if (action === "add-patient") {
    openModal("添加患者", `<div class="qr-box"><strong>绑定二维码</strong><p>请患者使用小程序扫码确认绑定。</p></div>`, `<button class="btn" data-action="close-modal">关闭</button>`);
  }
  if (action === "quick-primary") {
    const alert = alertsOf(target.dataset.patient).find((item) => item.status === "待处理");
    if (alert) handleAlert(alert.id);
    else showToast("当前无待处理预警，可从详情继续分析");
  }
  if (action === "handle-alert") handleAlert(target.dataset.id);
  if (action === "save-alert") saveAlert(target.dataset.id);
  if (action === "open-create-plan") openCreatePlanModal();
  if (action === "save-new-plan") saveNewPlan();
  if (action === "set-plan-status") {
    planStatusFilter = target.dataset.status;
    planMode = "list";
    resetPage("plans");
    render();
  }
  if (action === "set-plan-tag") {
    planTagFilter = target.dataset.tag;
    planMode = "list";
    resetPage("plans");
    render();
  }
  if (action === "set-plan-source") {
    planSourceFilter = target.dataset.source;
    planMode = "list";
    resetPage("plans");
    render();
  }
  if (action === "set-plan-disease") {
    planDiseaseFilter = target.dataset.disease;
    planMode = "list";
    resetPage("plans");
    render();
  }
  if (action === "edit-plan") {
    selectedPlanId = target.dataset.id;
    planMode = "detail";
    currentView = "plans";
    render();
  }
  if (action === "back-plan-list") {
    planMode = "list";
    render();
  }
  if (action === "save-plan-draft") savePlanDraft(target.dataset.id);
  if (action === "edit-plan-module") openPlanModuleEditor(target.dataset.id, target.dataset.module);
  if (action === "add-metric-rule") addMetricRuleEditor();
  if (action === "add-alert-rule") addAlertRuleEditor();
  if (action === "add-medication-rule") addMedicationRuleEditor();
  if (action === "add-device-rule") addDeviceRuleEditor();
  if (action === "add-lifestyle-rule") addLifestyleRuleEditor();
  if (action === "save-plan-module") savePlanModule(target.dataset.id, target.dataset.module);
  if (action === "restore-module-recommend") restoreModuleRecommend(target.dataset.id, target.dataset.module);
  if (action === "toggle-plan-module") togglePlanModule(target.dataset.id, target.dataset.module);
  if (action === "confirm-toggle-plan-module") confirmTogglePlanModule(target.dataset.id, target.dataset.module);
  if (action === "preview-plan") showPlanPreview(target.dataset.id);
  if (action === "quick-review") { const plan = state.plans.find((p) => p.id === target.dataset.id); if (plan) showQuickReview(plan); }
  if (action === "create-plan") createPlan(target.dataset.patient, target.dataset.alert);
  if (action === "approve-plan") approvePlan(target.dataset.id);
  if (action === "confirm-release-plan") confirmReleasePlan(target.dataset.id);
  if (action === "confirm-release-plan") confirmReleasePlan(target.dataset.id);
  if (action === "reject-plan") rejectPlan(target.dataset.id);
  if (action === "confirm-reject-plan") confirmRejectPlan(target.dataset.id);
  if (action === "withdraw-plan") withdrawPlan(target.dataset.id);
  if (action === "mark-patient-known") markPatientKnown(target.dataset.id);
  if (action === "stop-plan") stopPlan(target.dataset.id);
  if (action === "confirm-stop-plan") confirmStopPlan(target.dataset.id);
  if (action === "copy-as-new-plan") copyAsNewPlan(target.dataset.id);
  if (action === "adjust-plan") adjustPlan(target.dataset.id);
  if (action === "continue-plan") continuePlan(target.dataset.id);
  if (action === "complete-plan") completePlan(target.dataset.id);
  if (action === "delete-plan") deletePlanDraft(target.dataset.id);
  if (action === "remind-patient") remindPatient(target.dataset.id);
  if (action === "view-patient-feedback") viewPatientFeedback(target.dataset.id);
  if (action === "patient-confirm-plan") patientConfirmPlan(target.dataset.id);
  if (action === "create-followup") createFollowup(target.dataset.patient, target.dataset.alert, false, target.dataset.plan);
  if (action === "open-followup-drawer") openFollowupDrawer(target.dataset.patient, target.dataset.alert, target.dataset.followup);
  if (action === "save-followup-drawer") saveFollowupDrawer();
  if (action === "open-recheck-drawer") openRecheckDrawer(target.dataset.patient, target.dataset.alert, target.dataset.followup);
  if (action === "save-recheck") saveRecheck();
  if (action === "complete-followup") completeFollowup(target.dataset.id);
  if (action === "save-followup") saveFollowup(target.dataset.id);
  if (action === "reschedule-followup") {
    const followup = state.followups.find((item) => item.id === target.dataset.id);
    followup.dueAt = "2026-05-21 10:00";
    addTimeline(followup.patientId, "随访", `随访改期至 ${followup.dueAt}`);
    persist("随访已改期");
  }
  if (action === "cancel-followup") {
    const followup = state.followups.find((item) => item.id === target.dataset.id);
    followup.status = "已取消";
    addTimeline(followup.patientId, "随访", `取消随访：${followup.title}`);
    persist("随访已取消");
  }
  if (action === "send-advice") sendAdvice(target.dataset.patient, target.dataset.alert, target.dataset.followup);
  if (action === "save-advice") saveAdvice();
  if (action === "copd-scale-detail") {
    const scaleId = target.dataset.scaleId;
    const scaleCode = target.dataset.scaleCode;
    const record = (state.scaleRecords || []).find(r => r.id === scaleId);
    if (!record) return;
    let modalContent = "";
    if (scaleCode === "cat") {
      const CAT_QUESTIONS = [
        { id: "q1", title: "咳嗽", text: "最近您咳嗽的情况如何？" },
        { id: "q2", title: "痰", text: "最近您咳痰的情况如何？" },
        { id: "q3", title: "胸闷", text: "最近您感觉胸闷的情况如何？" },
        { id: "q4", title: "爬坡/楼梯", text: "爬坡或上一层楼梯时气喘？" },
        { id: "q5", title: "家务劳动", text: "在家做家务时气喘情况？" },
        { id: "q6", title: "外出", text: "外出时因气喘信心不足？" },
        { id: "q7", title: "睡眠", text: "因呼吸问题睡眠不佳？" },
        { id: "q8", title: "精力", text: "最近精力状况如何？" }
      ];
      const goldGroup = record.totalScore >= 10 ? "更多症状组(GOLD B/E)" : "较少症状组(GOLD A/C)";
      const rows = CAT_QUESTIONS.map(q => {
        const score = record.answers?.[q.id] || 0;
        return `<tr><td>${q.title}</td><td>${q.text}</td><td>${score}分</td></tr>`;
      }).join("");
      modalContent = `<h3>CAT慢阻肺评估测试详情</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr><th>题目</th><th>提问</th><th>得分</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:12px;font-weight:700">总分：${record.totalScore}分 | ${CAT_LEVEL_MAP[record.levelName]} | ${goldGroup}</div>
        <div style="font-size:12px;color:#86909C;margin-top:4px">MCID最小临床重要差异为2分，趋势变化≥2分视为有临床意义</div>`;
    } else {
      const MMRC_OPTIONS = [
        { grade: 0, text: "仅在剧烈运动时才感到呼吸困难" },
        { grade: 1, text: "平地快走或上小坡时感到气短" },
        { grade: 2, text: "因气短，平地行走比同龄人慢，或需要停下休息" },
        { grade: 3, text: "平地行走数分钟或约100米后需停下喘气" },
        { grade: 4, text: "严重呼吸困难，无法外出，或穿衣时也感到气短" }
      ];
      const goldGroup = record.grade >= 2 ? "高症状组(GOLD B/E)" : "低症状组(GOLD A/C)";
      const selectedOption = MMRC_OPTIONS[record.grade] || {};
      modalContent = `<h3>mMRC呼吸困难指数详情</h3>
        <div style="margin:12px 0;font-size:14px">
          <div>选择等级：${record.grade}级</div>
          <div>等级描述：${selectedOption.text || "-"}</div>
          <div>GOLD分组：${goldGroup}</div>
          <div>填报时间：${record.completedAt.replace("T"," ").slice(0,16)}</div>
        </div>`;
    }
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"></div>
      <div class="modal-panel" style="max-width:600px">
        <div class="modal-header"><h2>问卷详情</h2><button data-action="close-modal" class="modal-close">&times;</button></div>
        <div class="modal-body">${modalContent}</div>
      </div>`;
  }
  if (action === "confirm-disease") {
    const patient = patientById(target.dataset.patient);
    patient.screening.pending = patient.screening.pending.filter((item) => item !== target.dataset.disease);
    patient.screening.confirmed.push(target.dataset.disease);
    if (!patient.diseases.includes(target.dataset.disease)) patient.diseases.push(target.dataset.disease);
    addTimeline(patient.id, "筛查", `医生确认疾病：${target.dataset.disease}`);
    persist("疾病已确认");
  }
});

document.body.addEventListener("input", (event) => {
  const searchTarget = event.target.closest('[data-action="patient-search"]');
  if (searchTarget) {
    searchQuery = searchTarget.value;
    resetPage("patients");
    render();
    const input = document.querySelector('[data-action="patient-search"]');
    if (input) {
      input.focus();
      input.setSelectionRange(searchQuery.length, searchQuery.length);
    }
    return;
  }
  const planSearchTarget = event.target.closest('[data-action="plan-search"]');
  if (planSearchTarget) {
    planSearchQuery = planSearchTarget.value;
    planMode = "list";
    resetPage("plans");
    render();
    const input = document.querySelector('[data-action="plan-search"]');
    if (input) {
      input.focus();
      input.setSelectionRange(planSearchQuery.length, planSearchQuery.length);
    }
    return;
  }
  const jumpTarget = event.target.closest('[data-action="page-jump-input"]');
  if (jumpTarget) {
    const scope = jumpTarget.dataset.pageScope;
    paginationState[scope].jump = jumpTarget.value.replace(/\D/g, "");
  }
  // ── Config module search ──
  const metricDictSearchTarget = event.target.closest('[data-action="metric-dict-search"]');
  if (metricDictSearchTarget) {
    metricDictSearchQuery = metricDictSearchTarget.value;
    resetPage("metricDictionary");
    render();
    const input = document.querySelector('[data-action="metric-dict-search"]');
    if (input) { input.focus(); input.setSelectionRange(metricDictSearchQuery.length, metricDictSearchQuery.length); }
    return;
  }
  const goalSearchTarget = event.target.closest('[data-action="goal-search"]');
  if (goalSearchTarget) {
    goalSearchQuery = goalSearchTarget.value;
    resetPage("goalManagement");
    render();
    const input = document.querySelector('[data-action="goal-search"]');
    if (input) { input.focus(); input.setSelectionRange(goalSearchQuery.length, goalSearchQuery.length); }
    return;
  }
});

document.body.addEventListener("change", (event) => {
  const pageSizeTarget = event.target.closest('[data-action="page-size"]');
  if (pageSizeTarget) {
    const scope = pageSizeTarget.dataset.pageScope;
    paginationState[scope].pageSize = Number(pageSizeTarget.value);
    paginationState[scope].page = 1;
    render();
    return;
  }
  const metricNameTarget = event.target.closest('[data-field="metricName"]');
  if (metricNameTarget) {
    const card = metricNameTarget.closest('[data-rule-type="metric"]');
    const sceneDropdown = card?.querySelector(".multi-select [data-field='scenes']")?.closest(".multi-select");
    if (sceneDropdown) {
      const options = metricSceneOptions(metricNameTarget.value);
      sceneDropdown.outerHTML = checkboxDropdown("scenes", options, options);
    }
    return;
  }
  const multiOptionTarget = event.target.closest("[data-field-option]");
  if (multiOptionTarget) {
    const fieldPath = multiOptionTarget.dataset.fieldOption;
    const wrap = multiOptionTarget.closest(".multi-select");
    const fallback = fieldPath === "basic.diseases" ? PLAN_DISEASE_OPTIONS[0] : "";
    const checked = [...wrap.querySelectorAll(`[data-field-option="${fieldPath}"]:checked`)].map((item) => item.value);
    const value = (checked.length ? checked : [fallback].filter(Boolean)).join("、");
    wrap.querySelector(`[data-field="${fieldPath}"]`).value = value;
    wrap.querySelector(`[data-field-summary="${fieldPath}"]`).textContent = value || "请选择";
  }
});

document.body.addEventListener("keydown", (event) => {
  const target = event.target.closest('[data-action="page-jump-input"]');
  if (!target || event.key !== "Enter") return;
  const scope = target.dataset.pageScope;
  const pager = paginationState[scope];
  const pageSize = Number(pager.pageSize) || 20;
  const totalPages = Math.max(1, Math.ceil(listTotal(scope) / pageSize));
  pager.page = Math.min(Math.max(Number(target.value) || 1, 1), totalPages);
  pager.jump = "";
  render();
});

$$(".nav-item").forEach((item) => item.addEventListener("click", () => {
  if (item.classList.contains("nav-parent")) return; // parent only toggles group
  const view = item.dataset.view;
  if (!view) return;
  currentView = view;
  if (currentView === "plans") planMode = "list";
  // Ensure parent group is open when clicking a sub-item
  const group = item.closest(".nav-group");
  if (group) group.classList.add("open");
  render();
}));

render();
