import { loadState, nowText, resetState, saveState } from "./store.js";

let state = loadState();
let currentView = "dashboard";
let selectedPatientId = state.patients[0]?.id;

const app = document.querySelector("#app");
const pageTitle = document.querySelector("#pageTitle");
const pageSubTitle = document.querySelector("#pageSubTitle");
const toast = document.querySelector("#toast");
const modalRoot = document.querySelector("#modalRoot");

const viewMeta = {
  dashboard: ["工作台", "医生今日需要处理的慢病管理事项"],
  patients: ["患者管理", "按患者维度查看预警、方案、随访和时间轴"],
  alerts: ["预警中心", "处理规则预警并形成随访或方案调整闭环"],
  plans: ["方案管理", "确认系统草稿、维护执行中方案和患者知晓状态"],
  followups: ["随访计划", "创建、改期、完成随访并沉淀结构化结论"]
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const patientName = (id) => state.patients.find((item) => item.id === id)?.name || "-";
const patientById = (id) => state.patients.find((item) => item.id === id);
const uid = (prefix) => `${prefix}${Date.now().toString(36).toUpperCase().slice(-6)}`;

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

function statusTag(status) {
  const map = {
    待处理: "red",
    紧急: "red",
    重要: "orange",
    提醒: "blue",
    待医生确认: "orange",
    已下发待患者确认: "blue",
    执行中: "green",
    需调整: "orange",
    已完成: "green",
    待随访: "blue",
    逾期: "red",
    已取消: "gray",
    已处理: "green"
  };
  return `<span class="tag ${map[status] || "gray"}">${status}</span>`;
}

function render() {
  const [title, subTitle] = viewMeta[currentView];
  pageTitle.textContent = title;
  pageSubTitle.textContent = subTitle;
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === currentView));
  const renderers = { dashboard: renderDashboard, patients: renderPatients, alerts: renderAlerts, plans: renderPlans, followups: renderFollowups };
  renderers[currentView]();
  bindPageEvents();
}

function renderDashboard() {
  const pendingAlerts = state.alerts.filter((item) => item.status === "待处理").length;
  const pendingPlans = state.plans.filter((item) => item.status === "待医生确认").length;
  const pendingFollowups = state.followups.filter((item) => ["待随访", "逾期"].includes(item.status)).length;
  app.innerHTML = `
    <section class="stat-grid">
      ${metric("管理患者", state.patients.length, "已绑定患者")}
      ${metric("待处理预警", pendingAlerts, "点击进入预警中心", "alerts")}
      ${metric("待确认方案", pendingPlans, "系统草稿需医生确认", "plans")}
      ${metric("待随访", pendingFollowups, "含逾期随访", "followups")}
    </section>
    <section class="two-col">
      <div class="panel">
        <div class="panel-hd"><strong>今日工作队列</strong><button class="btn" data-action="reset">重置 Mock 数据</button></div>
        <div class="card-list">
          ${state.alerts.filter((item) => item.status === "待处理").map(alertCard).join("") || empty("暂无待处理预警")}
        </div>
      </div>
      ${renderPatientSide()}
    </section>`;
}

function metric(label, value, note, view) {
  return `<button class="stat-card" ${view ? `data-view-link="${view}"` : ""}>
    <span>${label}</span><strong>${value}</strong><small>${note}</small>
  </button>`;
}

function renderPatients() {
  app.innerHTML = `
    <section class="patient-layout">
      <div class="panel">
        <div class="panel-hd"><strong>患者列表</strong><button class="btn primary" data-action="add-patient">添加患者</button></div>
        <table class="table">
          <thead><tr><th>患者</th><th>疾病</th><th>风险</th><th>最新动态</th><th>操作</th></tr></thead>
          <tbody>
            ${state.patients.map((patient) => `
              <tr class="${patient.id === selectedPatientId ? "active" : ""}" data-select-patient="${patient.id}">
                <td><strong>${patient.name}</strong><small>${patient.sex} ${patient.age}岁 | ${patient.phone}</small></td>
                <td>${patient.diseases.map((item) => `<span class="tag blue">${item}</span>`).join("")}</td>
                <td>${statusTag(patient.riskLevel)}<small>评分 ${patient.riskScore}</small></td>
                <td>${patient.latest}</td>
                <td><button class="link" data-view-link="plans">看方案</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      ${renderPatientSide()}
    </section>`;
}

function renderAlerts() {
  app.innerHTML = `
    <section class="two-col">
      <div class="panel">
        <div class="panel-hd"><strong>预警中心</strong><span>${state.alerts.filter((item) => item.status === "待处理").length} 条待处理</span></div>
        <div class="card-list">${state.alerts.map(alertCard).join("")}</div>
      </div>
      ${renderPatientSide()}
    </section>`;
}

function alertCard(alert) {
  return `<article class="flow-card ${alert.level === "紧急" ? "urgent" : alert.level === "重要" ? "important" : ""}">
    <div class="card-top">
      <div>
        <h3>${alert.title}</h3>
        <p>${patientName(alert.patientId)} | ${alert.type} | ${alert.createdAt}</p>
      </div>
      <div>${statusTag(alert.level)}${statusTag(alert.status)}</div>
    </div>
    <div class="evidence">
      <strong>触发规则</strong><span>${alert.rule}</span>
      ${alert.evidence.map((item) => `<strong>证据</strong><span>${item}</span>`).join("")}
    </div>
    <div class="actions">
      <button class="btn primary" data-action="handle-alert" data-id="${alert.id}" ${alert.status !== "待处理" ? "disabled" : ""}>处理预警</button>
      <button class="btn" data-action="create-followup" data-patient="${alert.patientId}" data-alert="${alert.id}">建随访</button>
      <button class="btn" data-action="create-plan" data-patient="${alert.patientId}" data-alert="${alert.id}">建方案草稿</button>
    </div>
  </article>`;
}

function renderPlans() {
  app.innerHTML = `
    <section class="two-col">
      <div class="panel">
        <div class="panel-hd"><strong>方案管理</strong><button class="btn primary" data-action="create-plan" data-patient="${selectedPatientId || state.patients[0].id}">新建方案</button></div>
        <div class="card-list">${state.plans.map(planCard).join("")}</div>
      </div>
      ${renderPatientSide()}
    </section>`;
}

function planCard(plan) {
  return `<article class="flow-card ${plan.status === "执行中" ? "active-plan" : ""}">
    <div class="card-top">
      <div>
        <h3>${plan.title}</h3>
        <p>${patientName(plan.patientId)} | ${plan.disease} | ${plan.source} | ${plan.updatedAt}</p>
      </div>
      ${statusTag(plan.status)}
    </div>
    <p class="summary">${plan.objective}</p>
    <div class="pill-list">${plan.targets.map((item) => `<span>${item}</span>`).join("")}</div>
    <div class="task-list">${plan.tasks.map((item) => `<div>${item}</div>`).join("")}</div>
    <div class="actions">
      <button class="btn primary" data-action="approve-plan" data-id="${plan.id}" ${plan.status !== "待医生确认" ? "disabled" : ""}>确认下发</button>
      <button class="btn" data-action="edit-plan" data-id="${plan.id}">编辑方案</button>
      <button class="btn" data-action="create-followup" data-patient="${plan.patientId}" data-plan="${plan.id}">建随访</button>
    </div>
  </article>`;
}

function renderFollowups() {
  app.innerHTML = `
    <section class="two-col">
      <div class="panel">
        <div class="panel-hd"><strong>随访计划</strong><button class="btn primary" data-action="create-followup" data-patient="${selectedPatientId || state.patients[0].id}">新建随访</button></div>
        <div class="card-list">${state.followups.map(followupCard).join("")}</div>
      </div>
      ${renderPatientSide()}
    </section>`;
}

function followupCard(followup) {
  return `<article class="flow-card ${followup.status === "已完成" ? "done" : followup.status === "逾期" ? "urgent" : ""}">
    <div class="card-top">
      <div>
        <h3>${followup.title}</h3>
        <p>${patientName(followup.patientId)} | ${followup.type} | ${followup.dueAt}</p>
      </div>
      ${statusTag(followup.status)}
    </div>
    <div class="pill-list">${followup.focus.map((item) => `<span>${item}</span>`).join("")}</div>
    <div class="actions">
      <button class="btn primary" data-action="complete-followup" data-id="${followup.id}" ${["已完成", "已取消"].includes(followup.status) ? "disabled" : ""}>完成随访</button>
      <button class="btn" data-action="reschedule-followup" data-id="${followup.id}">改期</button>
      <button class="btn danger" data-action="cancel-followup" data-id="${followup.id}">取消</button>
    </div>
  </article>`;
}

function renderPatientSide() {
  const patient = patientById(selectedPatientId) || state.patients[0];
  const timeline = state.timeline.filter((item) => item.patientId === patient.id).slice(0, 8);
  return `<aside class="panel side-panel">
    <div class="patient-head">
      <div>
        <h2>${patient.name}</h2>
        <p>${patient.sex} ${patient.age}岁 | ${patient.doctorRelation}</p>
      </div>
      <div class="score">${patient.riskScore}<small>健康分</small></div>
    </div>
    <div class="section">
      <strong>疾病标签</strong>
      <div class="pill-list">${patient.diseases.map((item) => `<span>${item}</span>`).join("")}</div>
    </div>
    <div class="section">
      <strong>管理时间轴</strong>
      <div class="timeline">${timeline.map((item) => `<div><time>${item.time}</time><b>${item.type}</b><span>${item.text}</span></div>`).join("") || empty("暂无时间轴")}</div>
    </div>
  </aside>`;
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function openModal(title, body, footer) {
  modalRoot.innerHTML = `<div class="modal-mask show">
    <div class="modal">
      <header><strong>${title}</strong><button class="icon-btn" data-action="close-modal">×</button></header>
      <div class="modal-body">${body}</div>
      <footer>${footer}</footer>
    </div>
  </div>`;
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function handleAlert(id) {
  const alert = state.alerts.find((item) => item.id === id);
  openModal("处理预警", `
    <div class="form">
      <label>处理结论<textarea id="alertConclusion">已查看预警证据，建议联系患者核实情况。</textarea></label>
      <label><input id="needFollow" type="checkbox" checked> 生成随访计划</label>
      <label><input id="needPlan" type="checkbox"> 生成方案调整草稿</label>
    </div>`, `
    <button class="btn" data-action="close-modal">取消</button>
    <button class="btn primary" data-action="save-alert" data-id="${id}">保存处理</button>`);
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

function createPlan(patientId, alertId, silent = false) {
  const alert = state.alerts.find((item) => item.id === alertId);
  const patient = patientById(patientId);
  const plan = {
    id: uid("PL"),
    patientId,
    disease: patient.diseases[0],
    title: `${patient.diseases[0]}管理方案草稿`,
    source: alert ? "预警处理生成" : "医生创建",
    status: "待医生确认",
    objective: alert ? `处理“${alert.title}”后形成阶段管理目标` : "医生从 0-1 创建阶段管理目标",
    targets: ["核心指标达到目标范围", "记录完整率提升", "异常情况及时反馈"],
    tasks: ["按方案记录核心指标", "出现症状时补充症状记录", "按时完成随访"],
    updatedAt: nowText()
  };
  state.plans.unshift(plan);
  patient.activePlanId = plan.id;
  addTimeline(patientId, "方案", `创建方案草稿：${plan.title}`);
  if (!silent) persist("已创建方案草稿");
}

function approvePlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  plan.status = "已下发待患者确认";
  plan.updatedAt = nowText();
  addTimeline(plan.patientId, "方案", `医生确认并下发方案：${plan.title}`);
  openModal("模拟患者确认", `
    <p>方案已下发至患者端。生产环境中患者端需点击“我已知晓并开始执行”，医生端再更新为执行中。</p>
    <div class="summary-box">${plan.title}</div>`, `
    <button class="btn" data-action="close-modal">稍后确认</button>
    <button class="btn primary" data-action="patient-confirm-plan" data-id="${id}">模拟患者确认</button>`);
  saveState(state);
  render();
}

function patientConfirmPlan(id) {
  const plan = state.plans.find((item) => item.id === id);
  plan.status = "执行中";
  plan.updatedAt = nowText();
  addTimeline(plan.patientId, "方案", `患者知晓并开始执行方案：${plan.title}`);
  createFollowup(plan.patientId, null, true, plan.id);
  closeModal();
  persist("方案已进入执行中");
}

function createFollowup(patientId, alertId, silent = false, planId = null) {
  const followup = {
    id: uid("F"),
    patientId,
    title: alertId ? "预警后随访" : "方案执行随访",
    type: alertId ? "预警后随访" : "方案随访",
    status: "待随访",
    dueAt: "2026-05-20 10:00",
    focus: alertId ? ["异常原因核实", "症状变化", "是否需要调整方案"] : ["方案执行情况", "指标记录完整性", "患者反馈"],
    linkedPlanId: planId
  };
  state.followups.unshift(followup);
  patientById(patientId).nextFollowupId = followup.id;
  addTimeline(patientId, "随访", `创建随访计划：${followup.title}`);
  if (!silent) persist("已创建随访计划");
}

function completeFollowup(id) {
  openModal("完成随访", `
    <div class="form">
      <label>随访结论<textarea id="followConclusion">患者已完成沟通，继续观察核心指标。</textarea></label>
      <label><input id="adjustPlan" type="checkbox"> 需要调整管理方案</label>
    </div>`, `
    <button class="btn" data-action="close-modal">取消</button>
    <button class="btn primary" data-action="save-followup" data-id="${id}">保存随访</button>`);
}

function saveFollowup(id) {
  const followup = state.followups.find((item) => item.id === id);
  followup.status = "已完成";
  addTimeline(followup.patientId, "随访", `完成随访：${$("#followConclusion").value}`);
  if ($("#adjustPlan").checked) createPlan(followup.patientId, null, true);
  closeModal();
  persist("随访已完成");
}

function bindPageEvents() {
  $$("[data-view-link]").forEach((node) => node.addEventListener("click", () => {
    currentView = node.dataset.viewLink;
    render();
  }));
  $$("[data-select-patient]").forEach((node) => node.addEventListener("click", () => {
    selectedPatientId = node.dataset.selectPatient;
    render();
  }));
}

document.body.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "close-modal") closeModal();
  if (action === "reset") {
    state = resetState();
    selectedPatientId = state.patients[0].id;
    persist("Mock 数据已重置");
  }
  if (action === "handle-alert") handleAlert(target.dataset.id);
  if (action === "save-alert") saveAlert(target.dataset.id);
  if (action === "create-plan") createPlan(target.dataset.patient || selectedPatientId, target.dataset.alert);
  if (action === "approve-plan") approvePlan(target.dataset.id);
  if (action === "patient-confirm-plan") patientConfirmPlan(target.dataset.id);
  if (action === "create-followup") createFollowup(target.dataset.patient || selectedPatientId, target.dataset.alert, false, target.dataset.plan);
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
  if (action === "add-patient") showToast("患者绑定二维码入口已预留");
  if (action === "edit-plan") showToast("方案编辑抽屉入口已预留，后续接入字段化编辑");
});

$$(".nav-item").forEach((item) => item.addEventListener("click", () => {
  currentView = item.dataset.view;
  render();
}));

render();
