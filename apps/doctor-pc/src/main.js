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
let paginationState = {
  patients: { page: 1, pageSize: 20, jump: "" },
  alerts: { page: 1, pageSize: 20, jump: "" },
  plans: { page: 1, pageSize: 20, jump: "" },
  followups: { page: 1, pageSize: 20, jump: "" }
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
  detail: ["患者详情", "查看患者档案、筛查、数据分析和管理记录"]
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

function render() {
  normalizePlanData();
  const [title, subTitle] = viewMeta[currentView];
  pageTitle.textContent = title;
  pageSubTitle.textContent = subTitle;
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === currentView));
  const renderers = {
    patients: renderPatients,
    alerts: renderAlerts,
    plans: renderPlans,
    followups: renderFollowups,
    detail: renderPatientDetail
  };
  renderers[currentView]();
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
                <th>健康风险分</th>
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
  return `<tr>
    <td>
      <div class="patient-cell">
        <button class="star ${patient.important ? "on" : ""}" data-action="toggle-important" data-patient="${patient.id}">${patient.important ? "★" : "☆"}</button>
        <div><strong>${patient.name}</strong><small>${patient.sex} ${patient.age}岁 | ${patient.phone}<br>${patient.relation} | ${patient.bindAt}</small></div>
      </div>
    </td>
    <td>
      ${patient.screening.confirmed.map((item) => tag(item, "blue")).join("")}
      ${patient.screening.pending.map((item) => tag(`${item}待确认`, "orange")).join("")}
    </td>
    <td><div class="score-line"><b>${patient.riskScore}</b>${tag(patient.riskLevel, toneOf(patient.riskLevel))}<small>${patient.riskChange > 0 ? "+" : ""}${patient.riskChange} 较上周期</small></div></td>
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
    ["analysis", "数据分析"],
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
          <div class="tag-row">${patient.diseases.map((item) => tag(item, "blue")).join("")}${tag(patient.riskLevel, toneOf(patient.riskLevel))}${patient.important ? tag("重点关注", "orange") : ""}</div>
        </div>
        <div class="hero-score"><strong>${patient.riskScore}</strong><span>健康风险分</span></div>
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
    analysis: renderAnalysis,
    alerts: renderPatientAlerts,
    plans: renderPatientPlans,
    followups: renderPatientFollowups,
    timeline: renderTimeline,
    advice: renderAdvice
  };
  return map[detailTab](patient);
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
    <div class="screening-head"><div><strong>${screening.score}</strong><span>综合健康风险分</span></div><p>确认疾病：${screening.confirmed.join("、") || "暂无"}；待确认：${screening.pending.join("、") || "无"}</p></div>
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
  return `<section class="analysis-page">
    <div class="analysis-controls">
      ${["近 7 天", "近 30 天", "近 90 天", "自定义"].map((item, index) => `<button class="chip ${index === 1 ? "active" : ""}">${item}</button>`).join("")}
      ${["全部", ...patient.diseases].map((item, index) => `<button class="chip ${index === 0 ? "active" : ""}">${item}</button>`).join("")}
      ${["全部来源", "手动记录", "设备采集"].map((item, index) => `<button class="chip ${index === 0 ? "active" : ""}">${item}</button>`).join("")}
    </div>
    <section class="panel clinical-summary">
      <div class="panel-hd"><strong>临床摘要</strong><button class="btn" data-action="send-advice" data-patient="${patient.id}">生成医生建议</button></div>
      <div class="summary-list">${patient.analysis.summary.map((item) => `<p>${item}</p>`).join("")}</div>
    </section>
    <div class="content-grid">
      <section class="panel chart-panel">
        <div class="panel-hd"><strong>疾病专题趋势</strong><span>近 30 天</span></div>
        <div class="chart-lines">
          <span style="height:52%"></span><span style="height:68%"></span><span style="height:45%"></span><span style="height:72%"></span><span style="height:58%"></span><span style="height:80%"></span><span style="height:62%"></span>
        </div>
        <div class="event-band"><span>症状</span><span>预警</span><span>方案</span><span>随访</span></div>
      </section>
      <section class="panel">
        <div class="panel-hd"><strong>多指标关联</strong></div>
        <div class="relation-list">${patient.analysis.correlations.map((item) => `<button data-action="open-followup-drawer" data-patient="${patient.id}">${item}<small>创建随访</small></button>`).join("")}</div>
      </section>
    </div>
    <section class="panel">
      <div class="panel-hd"><strong>证据链 / 原始记录明细</strong></div>
      <table class="table compact-table"><thead><tr><th>时间</th><th>指标</th><th>数值</th><th>来源</th><th>设备号</th><th>关联</th></tr></thead><tbody>
        <tr><td>05.19 07:30</td><td>最低血氧</td><td>86%</td><td>设备采集</td><td>SL-2026-001</td><td>预警 A001</td></tr>
        <tr><td>05.19 08:00</td><td>空腹血糖</td><td>8.7 mmol/L</td><td>手动记录</td><td>-</td><td>方案执行</td></tr>
        <tr><td>05.18 22:10</td><td>CPAP 使用</td><td>2.1 小时</td><td>设备采集</td><td>CPAP-09</td><td>睡眠报告</td></tr>
      </tbody></table>
    </section>
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
  app.innerHTML = `<section class="panel"><div class="panel-hd"><strong>预警中心</strong><span>${state.alerts.filter((item) => item.status === "待处理").length} 条待处理</span></div><div class="card-list">${pageItems.map(alertCard).join("")}</div>${renderPagination("alerts", state.alerts.length)}</section>`;
}

function alertCard(alert) {
  const disabled = alert.status !== "待处理" ? "disabled" : "";
  const actionSummary = alert._actionSummary ? `<div class="alert-action-summary">${alert._actionSummary}</div>` : "";
  return `<article class="flow-card ${alert.level === "紧急" ? "urgent" : alert.level === "重要" ? "important" : ""}">
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
        <span class="sync-time">方案支持前端 Mock 流程闭环</span>
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
  const diseases = (plan.diseases || [plan.disease]).map((d) => tag(d, "blue")).join("");
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
      <p><strong>${escapeHtml(plan.title)}</strong> · ${tag(plan.diseases?.[0] || plan.disease || "", "blue")} · ${plan.period?.days || 14}天周期</p>
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
  const diseases = (plan.diseases || [plan.disease]).map((d) => tag(d, "blue")).join("");
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
  app.innerHTML = `<section class="panel"><div class="panel-hd"><strong>随访计划</strong><span>待随访与逾期优先</span></div><div class="card-list">${pageItems.map(followupCard).join("")}</div>${renderPagination("followups", state.followups.length)}</section>`;
}

function followupCard(followup) {
  const nextStepSummary = [followup._lastAdviceSummary, followup._lastRecheckSummary, followup._nextFollowupSummary].filter(Boolean).join("；");
  return `<article class="flow-card ${followup.status === "已完成" ? "done" : followup.status === "逾期" ? "urgent" : ""}">
    <div class="card-top"><div><h3>${followup.title}</h3><p>${patientName(followup.patientId)} | ${followup.type} | ${followup.dueAt}</p></div>${tag(followup.status, toneOf(followup.status))}</div>
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
    ${conflictPlans.map((p) => `<div class="conflict-item">${tag(p.disease, "blue")} ${p.title} ${tag(p.status, toneOf(p.status))}</div>`).join("")}
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
  if (hasDataIssue(patient)) rows.push(`<button class="btn" data-action="view-patient-tab" data-patient="${patientId}" data-tab="analysis">查看数据缺失</button>`);
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
  currentView = item.dataset.view;
  if (currentView === "plans") planMode = "list";
  render();
}));

render();
