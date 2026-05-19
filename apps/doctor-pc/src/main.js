import { loadState, nowText, resetState, saveState } from "./store.js";

let state = loadState();
let currentView = "patients";
let selectedPatientId = state.patients[0]?.id;
let patientFilter = "all";
let detailTab = "overview";
let searchQuery = "";
let filtersCollapsed = true;
let planMode = "list";
let selectedPlanId = state.plans[0]?.id;
let planStatusFilter = "全部";
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

const PLAN_STATUSES = ["全部", "待医生确认", "草稿", "已下发待患者确认", "执行中", "待调整", "患者有疑问", "患者反馈无法执行", "待复盘", "已停用", "已完成"];
const REQUIRED_PLAN_MODULES = ["basic", "goals", "metrics", "alerts", "followup", "guidance"];
const PLAN_MODULE_META = {
  basic: { name: "方案基础信息", type: "required", visible: true },
  goals: { name: "管理目标", type: "required", visible: true },
  metrics: { name: "指标测量方案", type: "required", visible: true },
  symptoms: { name: "症状记录方案", type: "conditional", visible: true },
  medication: { name: "用药方案", type: "conditional", visible: true },
  device: { name: "设备监测方案", type: "conditional", visible: false },
  lifestyle: { name: "生活方式方案", type: "conditional", visible: true },
  alerts: { name: "预警规则", type: "required", visible: false },
  followup: { name: "随访计划", type: "required", visible: true },
  guidance: { name: "患者指导", type: "required", visible: true }
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
    待医生确认: "orange",
    草稿: "gray",
    已下发待患者确认: "blue",
    执行中: "green",
    需调整: "orange",
    待调整: "orange",
    患者有疑问: "orange",
    患者反馈无法执行: "red",
    待复盘: "blue",
    已停用: "gray",
    已驳回: "gray",
    待随访: "blue",
    逾期: "red",
    已完成: "green",
    已取消: "gray",
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
    ["plans", "待确认方案", state.patients.filter((p) => plansOf(p.id).some((plan) => plan.status === "待医生确认")).length, "存在待医生审核确认方案的患者。"],
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
  if (value === "待医生确认") return hasPendingDiseaseRisk(patient);
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
  const hasPlan = plansOf(patient.id).some((plan) => plan.status === "待医生确认");
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
  if (value === "待患者知晓") return plans.some((plan) => plan.status === "已下发待患者确认");
  if (value === "待调整") return plans.some((plan) => ["需调整", "待调整"].includes(plan.status));
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
    plans: (p) => plansOf(p.id).some((plan) => plan.status === "待医生确认"),
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
      ${filterBlock("疾病风险", "diseaseRisk", ["全部", "糖尿病风险", "慢阻肺风险", "睡眠呼吸暂停风险", "高血压风险", "待医生确认"])}
      ${filterBlock("确诊疾病", "disease", ["全部", "糖尿病", "慢阻肺", "睡眠呼吸暂停", "高血压", "多病共管"])}
      ${filterBlock("待处理事项", "todo", ["全部", "有预警", "待确认方案", "今日待随访", "数据缺失"])}
      ${filterBlock("方案状态", "plan", ["全部", "无方案", "待医生确认", "待患者知晓", "执行中", "待调整"])}
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
  if (plan.status === "需调整") plan.status = "待调整";
  plan.title = plan.title || `${plan.disease || "慢病"}管理方案`;
  plan.source = plan.source || "医生创建";
  plan.version = plan.version || "V1.0";
  plan.period = plan.period || (plan.disease === "睡眠呼吸暂停" ? "14 天" : "30 天");
  plan.targets = plan.targets || [];
  plan.tasks = plan.tasks || [];
  plan.objective = plan.objective || "阶段管理目标待完善";
  plan.updatedAt = plan.updatedAt || nowText();
  plan.modules = plan.modules?.length ? plan.modules : defaultPlanModules(plan);
  plan.modules.forEach((module) => {
    const meta = PLAN_MODULE_META[module.key] || {};
    module.name = module.name || meta.name || module.key;
    module.type = module.type || meta.type || "conditional";
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
  });
  plan.patientPreview = plan.patientPreview || buildPatientPreview(plan);
  plan.changeLogs = plan.changeLogs || [{ time: plan.updatedAt, text: `${plan.source}创建方案` }];
  return plan;
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
    moduleTemplate("alerts", true, planAlertRules(disease).join("；"), plan),
    moduleTemplate("followup", true, `${plan.period}内至少 1 次计划随访；出现预警后可发起临时随访。`, plan),
    moduleTemplate("guidance", true, `请按方案完成记录；出现明显不适或紧急症状时及时线下就医。`, plan)
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
    recommendationReason: included ? "根据患者疾病标签、筛查风险、近期数据与设备情况生成，可由医生编辑确认。" : "本次方案未启用该模块。",
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
  const deviceRows = (patient?.profile?.devices || (disease.includes("睡眠") ? ["睡眠监测仪", "CPAP"] : ["血氧仪"])).map((item) => `${item}|每日自动同步|设备采集|异常时提醒患者重新同步`);
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
      patientInstruction: "请保持设备绑定和同步，连续未同步时系统会提醒。"
    },
    lifestyle: {
      seedDisease: disease,
      rows: lifestyleAdvice(disease).map((item) => `${item}|每日/每周执行|患者备注完成情况|医生随访时复盘`),
      patientInstruction: "请按生活方式建议执行，并在异常或未完成时备注原因。"
    },
    alerts: {
      seedDisease: disease,
      rows: alertRuleConfigs(disease),
      patientInstruction: "指标或设备数据异常时，系统会提示复测、补充症状或等待医生处理。"
    },
    followup: {
      seedDisease: disease,
      rows: [`计划随访|${plan?.period || "30 天"}内至少 1 次|方案执行情况、指标完整性、患者反馈|系统生成待随访`, "临时随访|预警处理后|异常原因、症状变化、是否调整方案|医生主动发起"],
      patientInstruction: "请按随访提醒配合医生完成反馈。"
    },
    guidance: {
      seedDisease: disease,
      rows: ["日常执行|按方案完成指标、症状、用药和设备同步", "异常处理|明显不适或紧急症状请及时线下就医", "备注要求|记录饮食、活动、睡眠、漏服等影响因素"],
      patientInstruction: summary || "请按方案完成记录；出现明显不适或紧急症状时及时线下就医。"
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

function metricFrequency(disease, item) {
  if (/CPAP|睡眠|AHI|最低血氧/.test(item)) return "每日夜间";
  if (disease.includes("糖尿病")) return item.includes("餐后") ? "每周至少 2 次" : "每日晨起";
  if (disease.includes("慢阻肺")) return "每日 1 次";
  if (disease.includes("高血压")) return "每日晨间";
  return "按方案";
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
  const deviceDependent = plan.targets.some((item) => /AHI|ODI|CPAP|最低血氧|睡眠报告/.test(item));
  if (deviceDependent && !planModule(plan, "device")?.included) {
    warnings.push({ level: "warning", moduleKey: "device", message: "方案包含睡眠/低氧设备指标，建议启用设备监测方案。" });
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
    .filter((plan) => {
      if (!query) return true;
      const patient = patientById(plan.patientId);
      return [plan.title, plan.id, plan.disease, patient?.name, patient?.id, patient?.phone]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
}

function buildPatientPreview(plan) {
  const followup = plan.modules.find((module) => module.key === "followup");
  const alerts = plan.modules.find((module) => module.key === "alerts");
  return {
    title: plan.title,
    objective: plan.objective,
    visibleModules: plan.modules.filter((module) => module.included && module.patientVisible).map((module) => module.name),
    dailyTasks: plan.tasks.length ? plan.tasks : plan.modules.filter((module) => module.included && module.patientVisible).map((module) => module.summary).slice(0, 4),
    followup: followup?.summary || "按医生设置时间完成随访",
    abnormalTips: alerts?.summary || "异常情况请按页面提示处理"
  };
}

function patientRow(patient) {
  const pendingAlerts = alertsOf(patient.id).filter((item) => item.status === "待处理");
  const pendingPlans = plansOf(patient.id).filter((item) => item.status === "待医生确认");
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
          <button class="btn" data-action="create-followup" data-patient="${patient.id}">创建随访</button>
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
        <div class="relation-list">${patient.analysis.correlations.map((item) => `<button data-action="create-followup" data-patient="${patient.id}">${item}<small>创建随访</small></button>`).join("")}</div>
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
  return `<section class="panel"><div class="panel-hd"><strong>随访记录</strong><button class="btn primary" data-action="create-followup" data-patient="${patient.id}">创建随访</button></div><div class="card-list">${followupsOf(patient.id).map(followupCard).join("") || empty("暂无随访")}</div></section>`;
}

function renderTimeline(patient) {
  const events = state.timeline.filter((item) => item.patientId === patient.id);
  return `<section class="panel"><div class="panel-hd"><strong>患者管理时间轴</strong></div><div class="timeline-full">${events.map((item) => `<article><time>${item.time}</time>${tag(item.type, "blue")}<strong>${item.text}</strong><p>操作者：${item.type === "预警" ? "系统" : "林医生"}，来源对象已关联，可进入详情查看。</p></article>`).join("") || empty("暂无时间轴")}</div></section>`;
}

function renderAdvice(patient) {
  return `<section class="panel"><div class="panel-hd"><strong>医生建议</strong><button class="btn primary" data-action="send-advice" data-patient="${patient.id}">发送医生建议</button></div><div class="card-list">${adviceOf(patient.id).map((item) => `<article class="flow-card"><div class="card-top"><div><h3>${item.type}</h3><p>${item.source} | ${item.createdAt}</p></div>${tag(item.status, toneOf(item.status))}</div><p>${item.text}</p></article>`).join("") || empty("暂无医生建议")}</div></section>`;
}

function renderAlerts() {
  const { pageItems } = paginateItems("alerts", state.alerts);
  app.innerHTML = `<section class="panel"><div class="panel-hd"><strong>预警中心</strong><span>${state.alerts.filter((item) => item.status === "待处理").length} 条待处理</span></div><div class="card-list">${pageItems.map(alertCard).join("")}</div>${renderPagination("alerts", state.alerts.length)}</section>`;
}

function alertCard(alert) {
  return `<article class="flow-card ${alert.level === "紧急" ? "urgent" : alert.level === "重要" ? "important" : ""}">
    <div class="card-top"><div><h3>${alert.title}</h3><p>${patientName(alert.patientId)} | ${alert.type} | ${alert.createdAt}</p></div><div>${tag(alert.level, toneOf(alert.level))}${tag(alert.status, toneOf(alert.status))}</div></div>
    <div class="evidence"><strong>触发规则</strong><span>${alert.rule}</span>${alert.evidence.map((item) => `<strong>证据</strong><span>${item}</span>`).join("")}</div>
    <div class="actions">
      <button class="btn primary" data-action="handle-alert" data-id="${alert.id}" ${alert.status !== "待处理" ? "disabled" : ""}>处理预警</button>
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
  app.innerHTML = `<section class="page-stack">
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
    <div class="plan-status-tabs">${PLAN_STATUSES.map((status) => `<button class="chip ${planStatusFilter === status ? "active" : ""}" data-action="set-plan-status" data-status="${status}">${status}<small>${status === "全部" ? state.plans.length : state.plans.filter((plan) => ensurePlanShape(plan).status === status).length}</small></button>`).join("")}</div>
    <section class="panel table-panel">
      ${pageItems.length ? `<table class="table plan-table">
        <thead><tr><th>方案</th><th>患者</th><th>疾病/来源</th><th>状态</th><th>完整度</th><th>最近更新</th><th>操作</th></tr></thead>
        <tbody>${pageItems.map(planRow).join("")}</tbody>
      </table>${renderPagination("plans", plans.length)}` : `<div class="empty"><strong>暂无匹配方案</strong><p>请调整搜索关键词或状态筛选。</p></div>`}
    </section>
  </section>`;
}

function planCard(plan) {
  ensurePlanShape(plan);
  const validation = validatePlan(plan);
  return `<article class="flow-card ${plan.status === "执行中" ? "active-plan" : ""}">
    <div class="card-top"><div><h3>${plan.title}</h3><p>${patientName(plan.patientId)} | ${plan.disease} | ${plan.source} | ${plan.updatedAt}</p></div>${tag(plan.status, toneOf(plan.status))}</div>
    <p>${plan.objective}</p>
    <div class="pill-list">${plan.targets.map((item) => `<span>${item}</span>`).join("")}</div>
    <div class="task-list">${plan.tasks.map((item) => `<div>${item}</div>`).join("")}</div>
    <div class="actions">
      <button class="btn primary" data-action="edit-plan" data-id="${plan.id}">${plan.status === "待医生确认" ? "审核方案" : "查看方案"}</button>
      <button class="btn" data-action="preview-plan" data-id="${plan.id}">患者端预览</button>
      <button class="btn" data-action="approve-plan" data-id="${plan.id}" ${!validation.canPublish || !["待医生确认", "草稿", "待调整"].includes(plan.status) ? "disabled" : ""}>确认下发</button>
      <button class="btn" data-action="view-patient" data-patient="${plan.patientId}">患者详情</button>
      <button class="btn" data-action="create-followup" data-patient="${plan.patientId}" data-plan="${plan.id}">建随访</button>
    </div>
  </article>`;
}

function planRow(plan) {
  ensurePlanShape(plan);
  const patient = patientById(plan.patientId);
  const validation = validatePlan(plan);
  const includedModules = plan.modules.filter((module) => module.included).length;
  return `<tr>
    <td><strong>${plan.title}</strong><small>${plan.objective}</small></td>
    <td><strong>${patient?.name || "-"}</strong><small>${patient?.sex || ""} ${patient?.age || ""}岁 | ${patient?.phone || ""}</small></td>
    <td>${tag(plan.disease, "blue")}<small>${plan.source} | ${plan.version}</small></td>
    <td>${tag(plan.status, toneOf(plan.status))}</td>
    <td><div class="mini-progress"><span style="width:${Math.round(validation.requiredCompleted / validation.requiredTotal * 100)}%"></span></div><small>${validation.requiredCompleted}/${validation.requiredTotal} 必填模块，已启用 ${includedModules} 项</small></td>
    <td>${plan.updatedAt}<small>${plan.changeLogs?.[0]?.text || "最近更新"}</small></td>
    <td><div class="row-actions">
      <button class="btn primary" data-action="edit-plan" data-id="${plan.id}">${plan.status === "待医生确认" ? "审核" : "查看"}</button>
      <button class="btn" data-action="preview-plan" data-id="${plan.id}">预览</button>
      <button class="btn" data-action="view-patient" data-patient="${plan.patientId}">患者</button>
    </div></td>
  </tr>`;
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
  const validation = validatePlan(plan);
  app.innerHTML = `<section class="page-stack">
    <button class="back-link" data-action="back-plan-list">← 返回方案列表</button>
    <section class="plan-hero panel">
      <div>
        <div class="tag-row">${tag(plan.status, toneOf(plan.status))}${tag(plan.disease, "blue")}${tag(plan.source, "gray")}</div>
        <h2>${plan.title}</h2>
        <p>${patient?.name || "-"} | ${patient?.sex || ""} ${patient?.age || ""}岁 | ${patient?.phone || ""} | ${plan.period}</p>
      </div>
      <div class="hero-actions">
        <button class="btn" data-action="preview-plan" data-id="${plan.id}">患者可见预览</button>
        <button class="btn" data-action="save-plan-draft" data-id="${plan.id}">保存草稿</button>
        <button class="btn primary" data-action="approve-plan" data-id="${plan.id}" ${!validation.canPublish || !["待医生确认", "草稿", "待调整"].includes(plan.status) ? "disabled" : ""}>确认下发</button>
      </div>
    </section>
    <section class="plan-editor">
      <aside class="plan-anchor panel">
        <strong>方案结构</strong>
        ${plan.modules.map((module) => `<a href="#plan-${module.key}" class="${module.included ? "" : "muted"}">${module.name}<small>${module.type === "required" ? "必填" : module.included ? "已启用" : "未启用"}</small></a>`).join("")}
      </aside>
      <div class="plan-module-list">
        ${plan.modules.map((module) => planModuleCard(plan, module)).join("")}
      </div>
      <aside class="audit-panel panel">
        <div class="audit-block">
          <span>必填完整度</span>
          <strong>${validation.requiredCompleted}/${validation.requiredTotal}</strong>
          <div class="mini-progress"><span style="width:${Math.round(validation.requiredCompleted / validation.requiredTotal * 100)}%"></span></div>
        </div>
        <div class="audit-block">
          <span>发布校验</span>
          ${validation.warnings.length ? validation.warnings.map((item) => `<p class="${item.level}">${item.level === "error" ? "阻断" : "提醒"}：${item.message}</p>`).join("") : `<p class="ok">已满足下发条件。</p>`}
        </div>
        <div class="audit-block">
          <span>患者执行负担</span>
          <strong>${plan.modules.filter((module) => module.included && module.patientVisible).length} 项可见模块</strong>
          <p>建议保持患者端任务清晰，设备采集项优先自动同步。</p>
        </div>
        <div class="audit-block">
          <span>方案时间轴</span>
          ${(plan.changeLogs || []).map((item) => `<p>${item.time} ${item.text}</p>`).join("")}
        </div>
      </aside>
    </section>
  </section>`;
}

function planModuleCard(plan, module) {
  const required = module.type === "required";
  return `<article class="plan-module-card panel ${module.included ? "" : "disabled"}" id="plan-${module.key}">
    <div class="plan-module-head">
      <div>
        <h3>${module.name}${required ? tag("必填", "blue") : tag(module.included ? "已启用" : "未启用", module.included ? "green" : "gray")}</h3>
        <p>${module.recommendationReason}</p>
      </div>
      <div class="row-actions">
        ${required ? "" : `<button class="btn" data-action="toggle-plan-module" data-id="${plan.id}" data-module="${module.key}">${module.included ? "关闭模块" : "启用模块"}</button>`}
        <button class="btn primary" data-action="edit-plan-module" data-id="${plan.id}" data-module="${module.key}">${module.included ? "编辑" : "查看"}</button>
      </div>
    </div>
    <div class="module-summary">
      <strong>医生端配置</strong>
      <p>${module.included ? escapeHtml(module.summary || "待补充") : escapeHtml(module.excludeReason || "未启用，该模块不会下发给患者。")}</p>
      ${module.included ? renderModuleStructuredContent(module) : ""}
      ${module.patientVisible && module.included ? `<strong>患者端展示</strong><p>${escapeHtml(module.fields?.patientInstruction || module.summary || "待补充")}</p>` : ""}
    </div>
  </article>`;
}

function renderModuleStructuredContent(module) {
  const rows = module.fields?.rows || [];
  if (module.key === "goals") {
    return `<div class="module-detail-grid">
      <div><span>阶段目标</span><strong>${escapeHtml(module.fields.stageGoal || module.summary)}</strong></div>
      <div><span>量化目标</span><ul>${(module.fields.targets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    </div>`;
  }
  if (!rows.length) return "";
  return `<table class="config-table">
    <tbody>${rows.map((row) => `<tr>${String(row).split("|").map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

function moduleEditorBody(module) {
  const rowTip = {
    basic: "每行一条：字段|内容",
    metrics: "每行一条：指标|目标范围|测量频次|数据来源|患者任务",
    symptoms: "每行一条：症状|记录时机|记录字段|关联逻辑",
    medication: "每行一条：药品/治疗|提醒规则|患者记录|备注",
    device: "每行一条：设备|同步要求|来源|异常处理",
    lifestyle: "每行一条：建议|执行频次|患者记录|复盘方式",
    alerts: "每行一条：对象|触发规则|系统动作|预警级别",
    followup: "每行一条：随访类型|时间规则|随访重点|生成方式",
    guidance: "每行一条：指导主题|患者可见内容"
  };
  const rows = (module.fields.rows || []).join("\n");
  const goalFields = module.key === "goals" ? `
    <label>阶段目标<textarea id="moduleStageGoal">${escapeHtml(module.fields.stageGoal || module.summary || "")}</textarea></label>
    <label>量化目标（一行一个）<textarea id="moduleTargets">${escapeHtml((module.fields.targets || []).join("\n"))}</textarea></label>` : "";
  const rowFields = module.key === "goals" ? "" : `
    <label>结构化配置<small>${rowTip[module.key] || "每行一条配置，字段用 | 分隔"}</small><textarea id="moduleRows">${escapeHtml(rows)}</textarea></label>`;
  return `<div class="form">
    <p class="modal-tip">${module.type === "required" ? "必填模块，确认下发前必须补齐。" : "条件模块，启用后会进入患者执行方案。"} ${module.recommendationReason}</p>
    ${goalFields}
    ${rowFields}
    <label>医生端摘要<textarea id="moduleSummary">${escapeHtml(module.summary || "")}</textarea></label>
    <label>患者端展示文案<textarea id="modulePatient">${escapeHtml(module.fields?.patientInstruction || module.summary || "")}</textarea></label>
  </div>`;
}

function moduleSummaryFromFields(module) {
  if (module.key === "goals") return module.fields.stageGoal || module.summary || "";
  const rows = module.fields.rows || [];
  if (!rows.length) return module.summary || "";
  if (module.key === "metrics") return `配置 ${rows.length} 个指标测量项：${rows.map((row) => row.split("|")[0]).join("、")}`;
  if (module.key === "alerts") return `配置 ${rows.length} 条预警规则：${rows.map((row) => row.split("|")[0]).join("、")}`;
  if (module.key === "followup") return `配置 ${rows.length} 类随访：${rows.map((row) => row.split("|")[0]).join("、")}`;
  return rows.map((row) => row.split("|").slice(0, 2).join("：")).join("；");
}

function renderFollowups() {
  const { pageItems } = paginateItems("followups", state.followups);
  app.innerHTML = `<section class="panel"><div class="panel-hd"><strong>随访计划</strong><span>待随访与逾期优先</span></div><div class="card-list">${pageItems.map(followupCard).join("")}</div>${renderPagination("followups", state.followups.length)}</section>`;
}

function followupCard(followup) {
  return `<article class="flow-card ${followup.status === "已完成" ? "done" : followup.status === "逾期" ? "urgent" : ""}">
    <div class="card-top"><div><h3>${followup.title}</h3><p>${patientName(followup.patientId)} | ${followup.type} | ${followup.dueAt}</p></div>${tag(followup.status, toneOf(followup.status))}</div>
    <div class="pill-list">${followup.focus.map((item) => `<span>${item}</span>`).join("")}</div>
    <div class="actions">
      <button class="btn primary" data-action="complete-followup" data-id="${followup.id}" ${["已完成", "已取消"].includes(followup.status) ? "disabled" : ""}>完成随访</button>
      <button class="btn" data-action="reschedule-followup" data-id="${followup.id}">改期</button>
      <button class="btn danger" data-action="cancel-followup" data-id="${followup.id}">取消</button>
      <button class="btn" data-action="view-patient" data-patient="${followup.patientId}">患者详情</button>
    </div>
  </article>`;
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function openModal(title, body, footer) {
  modalRoot.innerHTML = `<div class="modal-mask show"><div class="modal"><header><strong>${title}</strong><button class="icon-btn" data-action="close-modal">×</button></header><div class="modal-body">${body}</div><footer>${footer}</footer></div></div>`;
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function handleAlert(id) {
  const alert = state.alerts.find((item) => item.id === id);
  openModal("处理预警", `<div class="form">
    <p class="modal-tip">${alert.title}</p>
    <label>处理结论<textarea id="alertConclusion">已查看预警证据，建议联系患者核实情况并进行复测。</textarea></label>
    <label><input id="needFollow" type="checkbox" checked> 生成随访计划</label>
    <label><input id="needPlan" type="checkbox"> 生成方案调整草稿</label>
  </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="save-alert" data-id="${id}">保存处理</button>`);
}

function saveAlert(id) {
  const alert = state.alerts.find((item) => item.id === id);
  alert.status = "已处理";
  addTimeline(alert.patientId, "预警", `医生处理预警：${$("#alertConclusion").value}`);
  if ($("#needFollow").checked) createFollowup(alert.patientId, alert.id, true);
  if ($("#needPlan").checked) createPlan(alert.patientId, alert.id, true);
  closeModal();
  persist("预警已处理");
}

function openCreatePlanModal() {
  const patientOptions = state.patients.map((patient) => `<option value="${patient.id}">${patient.name}（${patient.diseases.join("、")}）</option>`).join("");
  openModal("新建管理方案", `<div class="form">
    <label>选择患者<select id="newPlanPatient">${patientOptions}</select></label>
    <label>确诊疾病<select id="newPlanDisease"><option>糖尿病</option><option>慢阻肺</option><option>睡眠呼吸暂停</option><option>高血压</option></select></label>
    <label>方案周期<select id="newPlanPeriod"><option>14 天</option><option selected>30 天</option><option>90 天</option></select></label>
    <label>创建方式<select id="newPlanSource"><option>医生从 0-1 创建</option><option>基于系统推荐生成</option><option>基于随访结论调整</option></select></label>
    <label>阶段目标<textarea id="newPlanObjective">围绕患者当前风险和核心指标，建立可执行的阶段管理目标。</textarea></label>
  </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="save-new-plan">创建草稿</button>`);
}

function saveNewPlan() {
  const patientId = $("#newPlanPatient").value;
  const disease = $("#newPlanDisease").value;
  const plan = buildPlanDraft(patientId, {
    disease,
    source: $("#newPlanSource").value,
    status: "草稿",
    objective: $("#newPlanObjective").value,
    period: $("#newPlanPeriod").value
  });
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
    status: options.status || "待医生确认",
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
    status: "待医生确认",
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
  if (!["待医生确认", "草稿", "待调整"].includes(plan.status)) {
    showToast("当前方案状态不可重复下发");
    return;
  }
  const validation = validatePlan(plan);
  if (!validation.canPublish) {
    openModal("方案暂不可下发", `<div class="modal-tip">请先补齐阻断项。</div><div class="warning-list">${validation.warnings.map((item) => `<p>${item.message}</p>`).join("")}</div>`, `<button class="btn primary" data-action="close-modal">知道了</button>`);
    return;
  }
  plan.status = "已下发待患者确认";
  plan.updatedAt = nowText();
  plan.patientPreview = buildPatientPreview(plan);
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "医生确认并下发给患者" });
  addTimeline(plan.patientId, "方案", `医生确认并下发方案：${plan.title}`);
  openModal("患者知晓确认", `<p>方案已下发给患者，待患者确认已知晓并开始执行。</p><div class="summary-box">${plan.title}</div>`, `<button class="btn" data-action="close-modal">稍后</button><button class="btn primary" data-action="patient-confirm-plan" data-id="${id}">标记已确认</button>`);
  saveState(state);
}

function patientConfirmPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  plan.status = "执行中";
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "患者确认已知晓并开始执行" });
  addTimeline(plan.patientId, "方案", `患者知晓并开始执行方案：${plan.title}`);
  state.advice = state.advice || [];
  state.advice.unshift({ id: uid("AD"), patientId: plan.patientId, type: "方案执行提醒", source: "管理方案", status: "未读", text: `${plan.title}已生效，请按方案完成记录和随访。`, createdAt: nowText() });
  createFollowup(plan.patientId, null, true, plan.id);
  closeModal();
  persist("方案已进入执行中");
}

function savePlanDraft(id) {
  const plan = state.plans.find((item) => item.id === id);
  if (plan.status === "待医生确认") plan.status = "草稿";
  plan.updatedAt = nowText();
  plan.changeLogs.unshift({ time: plan.updatedAt, text: "医生保存草稿" });
  persist("方案草稿已保存");
}

function openPlanModuleEditor(id, moduleKey) {
  const plan = state.plans.find((item) => item.id === id);
  const module = planModule(plan, moduleKey);
  openModal(`编辑${module.name}`, moduleEditorBody(module), `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="save-plan-module" data-id="${id}" data-module="${moduleKey}">保存</button>`);
}

function savePlanModule(id, moduleKey) {
  const plan = state.plans.find((item) => item.id === id);
  const module = planModule(plan, moduleKey);
  module.included = true;
  module.status = "completed";
  if (module.key === "goals") {
    module.fields.stageGoal = $("#moduleStageGoal").value.trim();
    module.fields.targets = $("#moduleTargets").value.split("\n").map((item) => item.trim()).filter(Boolean);
    plan.objective = module.fields.stageGoal;
    plan.targets = module.fields.targets;
  } else {
    module.fields.rows = $("#moduleRows").value.split("\n").map((item) => item.trim()).filter(Boolean);
  }
  module.summary = $("#moduleSummary").value.trim() || moduleSummaryFromFields(module);
  module.fields.patientInstruction = $("#modulePatient").value.trim();
  module.excludeReason = "";
  plan.updatedAt = nowText();
  plan.patientPreview = buildPatientPreview(plan);
  plan.changeLogs.unshift({ time: plan.updatedAt, text: `编辑${module.name}` });
  closeModal();
  persist("模块已保存");
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
  const preview = buildPatientPreview(plan);
  openModal("患者可见内容预览", `<div class="preview-panel">
    <h3>${preview.title}</h3>
    <p>${preview.objective}</p>
    <div class="preview-section"><strong>患者将看到的模块</strong><div class="pill-list">${preview.visibleModules.map((item) => `<span>${item}</span>`).join("")}</div></div>
    <div class="preview-section"><strong>执行任务</strong>${preview.dailyTasks.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
    <div class="preview-section"><strong>随访提醒</strong><p>${escapeHtml(preview.followup)}</p></div>
    <div class="preview-section"><strong>异常提示</strong><p>${escapeHtml(preview.abnormalTips)}</p></div>
  </div>`, `<button class="btn" data-action="close-modal">关闭</button><button class="btn primary" data-action="approve-plan" data-id="${id}" ${["待医生确认", "草稿", "待调整"].includes(plan.status) ? "" : "disabled"}>确认下发</button>`);
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
  if ($("#adjustPlan").checked) createPlan(followup.patientId, null, true);
  closeModal();
  persist("随访已完成");
}

function sendAdvice(patientId) {
  openModal("发送医生建议", `<div class="form">
    <label>建议类型<select id="adviceType"><option>复测建议</option><option>执行建议</option><option>就医/转诊建议</option><option>健康指导</option></select></label>
    <label>患者可见内容<textarea id="adviceText">请根据当前方案完成记录，如出现明显不适请及时线下就医。</textarea></label>
    <label><input id="adviceTask" type="checkbox" checked> 同步生成患者端待办</label>
  </div>`, `<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="save-advice" data-patient="${patientId}">发送</button>`);
}

function saveAdvice(patientId) {
  state.advice = state.advice || [];
  state.advice.unshift({ id: uid("AD"), patientId, type: $("#adviceType").value, source: "医生手动", status: "未读", text: $("#adviceText").value, createdAt: nowText() });
  addTimeline(patientId, "医生建议", `发送医生建议：${$("#adviceType").value}`);
  closeModal();
  persist("医生建议已发送");
}

function openMore(patientId) {
  const patient = patientById(patientId);
  const rows = [];
  if (alertsOf(patientId).some((item) => item.status === "待处理")) rows.push(`<button class="btn primary" data-view-link="alerts">去处理预警</button>`);
  if (hasPendingDiseaseRisk(patient)) rows.push(`<button class="btn primary" data-action="view-patient-tab" data-patient="${patientId}" data-tab="screening">去确认疾病</button>`);
  if (plansOf(patientId).some((item) => item.status === "待医生确认")) rows.push(`<button class="btn primary" data-view-link="plans">去确认方案</button>`);
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
  if (action === "save-plan-module") savePlanModule(target.dataset.id, target.dataset.module);
  if (action === "toggle-plan-module") togglePlanModule(target.dataset.id, target.dataset.module);
  if (action === "confirm-toggle-plan-module") confirmTogglePlanModule(target.dataset.id, target.dataset.module);
  if (action === "preview-plan") showPlanPreview(target.dataset.id);
  if (action === "create-plan") createPlan(target.dataset.patient, target.dataset.alert);
  if (action === "approve-plan") approvePlan(target.dataset.id);
  if (action === "patient-confirm-plan") patientConfirmPlan(target.dataset.id);
  if (action === "create-followup") createFollowup(target.dataset.patient, target.dataset.alert, false, target.dataset.plan);
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
  if (action === "send-advice") sendAdvice(target.dataset.patient);
  if (action === "save-advice") saveAdvice(target.dataset.patient);
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
  const target = event.target.closest('[data-action="page-size"]');
  if (!target) return;
  const scope = target.dataset.pageScope;
  paginationState[scope].pageSize = Number(target.value);
  paginationState[scope].page = 1;
  render();
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
