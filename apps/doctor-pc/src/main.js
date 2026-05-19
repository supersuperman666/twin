import { loadState, nowText, resetState, saveState } from "./store.js";

let state = loadState();
let currentView = "patients";
let selectedPatientId = state.patients[0]?.id;
let patientFilter = "all";
let detailTab = "overview";

const app = document.querySelector("#app");
const pageTitle = document.querySelector("#pageTitle");
const pageSubTitle = document.querySelector("#pageSubTitle");
const toast = document.querySelector("#toast");
const modalRoot = document.querySelector("#modalRoot");

const viewMeta = {
  patients: ["患者管理", "默认首页：筛患者、找患者、进入单患者深度分析"],
  alerts: ["预警中心", "按异常事件集中处理预警，并形成随访或方案调整闭环"],
  plans: ["方案管理", "集中确认系统草稿、维护执行中方案和患者知晓状态"],
  followups: ["随访计划", "按时间任务管理待随访、逾期随访和随访结论"],
  detail: ["患者详情", "单患者深度分析、健康档案、筛查、数据分析和管理闭环"]
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
    已下发待患者确认: "blue",
    执行中: "green",
    需调整: "orange",
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
    ["all", "全部患者", state.patients.length, "当前授权患者"],
    ["important", "重点关注", state.patients.filter((p) => p.important).length, "医生标记重点"],
    ["alerts", "待处理预警", state.patients.filter((p) => alertsOf(p.id).some((a) => a.status === "待处理")).length, "需进入预警处理"],
    ["plans", "待确认方案", state.patients.filter((p) => plansOf(p.id).some((plan) => plan.status === "待医生确认")).length, "系统草稿待审核"],
    ["followups", "今日待随访", state.patients.filter((p) => followupsOf(p.id).some((f) => ["待随访", "逾期"].includes(f.status))).length, "含逾期随访"],
    ["missing", "数据缺失", state.patients.filter((p) => p.dataStatus.includes("异常") || p.dataStatus.includes("未同步")).length, "关键数据缺失"]
  ];
}

function filteredPatients() {
  const matchers = {
    all: () => true,
    important: (p) => p.important,
    alerts: (p) => alertsOf(p.id).some((a) => a.status === "待处理"),
    plans: (p) => plansOf(p.id).some((plan) => plan.status === "待医生确认"),
    followups: (p) => followupsOf(p.id).some((f) => ["待随访", "逾期"].includes(f.status)),
    missing: (p) => p.dataStatus.includes("异常") || p.dataStatus.includes("未同步")
  };
  return state.patients.filter(matchers[patientFilter] || matchers.all);
}

function renderPatients() {
  const patients = filteredPatients();
  app.innerHTML = `
    <section class="page-stack">
      <div class="toolbar">
        <div>
          <h2>患者管理</h2>
          <p>列表只负责找患者和定位待处理状态，深度判断进入患者详情。</p>
        </div>
        <div class="toolbar-actions">
          <button class="btn" data-action="reset">重置 Mock</button>
          <button class="btn primary" data-action="add-patient">添加患者</button>
        </div>
      </div>
      <div class="stat-grid six">
        ${patientStats().map(([key, label, value, note]) => `
          <button class="stat-card ${patientFilter === key ? "active" : ""}" data-action="filter-patients" data-filter="${key}">
            <span>${label}</span><strong>${value}</strong><small>${note}</small>
          </button>`).join("")}
      </div>
      <section class="layout-list">
        <aside class="filter-panel">
          <h3>筛选条件</h3>
          ${filterBlock("风险状态", ["全部", "稳定", "需关注", "需干预"])}
          ${filterBlock("确诊疾病", ["全部", "糖尿病", "慢阻肺", "睡眠呼吸暂停", "高血压"])}
          ${filterBlock("待处理事项", ["全部", "有预警", "待确认方案", "今日待随访", "数据缺失"])}
          <p class="hint">P0 不做保存常用筛选，统计卡承担快捷筛选。</p>
        </aside>
        <div class="panel table-panel">
          <div class="panel-hd">
            <strong>患者列表</strong>
            <span>${patients.length} 位患者</span>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>患者</th>
                <th>确诊疾病</th>
                <th>健康风险分</th>
                <th>待处理事项</th>
                <th>最新动态</th>
                <th>方案/随访</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>${patients.map(patientRow).join("")}</tbody>
          </table>
        </div>
      </section>
    </section>`;
}

function filterBlock(title, options) {
  return `<div class="filter-block"><span>${title}</span><div>${options.map((item, index) => `<button class="chip ${index === 0 ? "active" : ""}">${item}</button>`).join("")}</div></div>`;
}

function patientRow(patient) {
  const pendingAlerts = alertsOf(patient.id).filter((item) => item.status === "待处理");
  const pendingPlans = plansOf(patient.id).filter((item) => item.status === "待医生确认");
  const pendingFollowups = followupsOf(patient.id).filter((item) => ["待随访", "逾期"].includes(item.status));
  const currentPlan = plansOf(patient.id).find((item) => item.id === patient.activePlanId);
  const nextFollow = followupsOf(patient.id).find((item) => item.id === patient.nextFollowupId);
  const hasMore = pendingAlerts.length || pendingPlans.length || pendingFollowups.length;
  return `<tr>
    <td>
      <div class="patient-cell">
        <button class="star ${patient.important ? "on" : ""}" data-action="toggle-important" data-patient="${patient.id}">${patient.important ? "★" : "☆"}</button>
        <div><strong>${patient.name}</strong><small>${patient.sex} ${patient.age}岁 | ${patient.phone}<br>${patient.relation} | ${patient.bindAt}</small></div>
      </div>
    </td>
    <td>${patient.diseases.map((item) => tag(item, "blue")).join("")}</td>
    <td><div class="score-line"><b>${patient.riskScore}</b>${tag(patient.riskLevel, toneOf(patient.riskLevel))}<small>${patient.riskChange > 0 ? "+" : ""}${patient.riskChange} 较上周期</small></div></td>
    <td>
      ${pendingAlerts.length ? tag(`${pendingAlerts.length} 个预警`, "red") : ""}
      ${pendingPlans.length ? tag("待确认方案", "orange") : ""}
      ${pendingFollowups.length ? tag("待随访", "blue") : ""}
      ${patient.dataStatus !== "正常" ? tag(patient.dataStatus, "orange") : tag("无待办", "green")}
    </td>
    <td>${patient.latest}</td>
    <td><small>${currentPlan?.status || "无方案"}<br>${nextFollow ? `${nextFollow.dueAt} ${nextFollow.status}` : "暂无随访"}</small></td>
    <td>
      <div class="row-actions">
        <button class="btn primary" data-action="view-patient" data-patient="${patient.id}">查看详情</button>
        <button class="btn" data-action="toggle-important" data-patient="${patient.id}">${patient.important ? "取消重点" : "标记重点"}</button>
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
        <div class="info-block"><h3>${activePlan?.title || "暂无方案"}</h3><p>${activePlan?.objective || "可从管理方案 Tab 创建"}</p>${activePlan ? tag(activePlan.status, toneOf(activePlan.status)) : ""}</div>
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
        <div class="panel-hd"><strong>疾病专题趋势</strong><span>示意趋势图</span></div>
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
  app.innerHTML = `<section class="panel"><div class="panel-hd"><strong>预警中心</strong><span>${state.alerts.filter((item) => item.status === "待处理").length} 条待处理</span></div><div class="card-list">${state.alerts.map(alertCard).join("")}</div></section>`;
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
  app.innerHTML = `<section class="panel"><div class="panel-hd"><strong>方案管理</strong><span>待确认方案优先处理</span></div><div class="card-list">${state.plans.map(planCard).join("")}</div></section>`;
}

function planCard(plan) {
  return `<article class="flow-card ${plan.status === "执行中" ? "active-plan" : ""}">
    <div class="card-top"><div><h3>${plan.title}</h3><p>${patientName(plan.patientId)} | ${plan.disease} | ${plan.source} | ${plan.updatedAt}</p></div>${tag(plan.status, toneOf(plan.status))}</div>
    <p>${plan.objective}</p>
    <div class="pill-list">${plan.targets.map((item) => `<span>${item}</span>`).join("")}</div>
    <div class="task-list">${plan.tasks.map((item) => `<div>${item}</div>`).join("")}</div>
    <div class="actions">
      <button class="btn primary" data-action="approve-plan" data-id="${plan.id}" ${plan.status !== "待医生确认" ? "disabled" : ""}>确认下发</button>
      <button class="btn" data-action="view-patient" data-patient="${plan.patientId}">患者详情</button>
      <button class="btn" data-action="create-followup" data-patient="${plan.patientId}" data-plan="${plan.id}">建随访</button>
    </div>
  </article>`;
}

function renderFollowups() {
  app.innerHTML = `<section class="panel"><div class="panel-hd"><strong>随访计划</strong><span>待随访与逾期优先</span></div><div class="card-list">${state.followups.map(followupCard).join("")}</div></section>`;
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

function createPlan(patientId, alertId, silent = false) {
  const patient = patientById(patientId);
  const alert = state.alerts.find((item) => item.id === alertId);
  const plan = {
    id: uid("PL"),
    patientId,
    disease: patient.diseases[0],
    title: `${patient.diseases[0]}管理方案草稿`,
    source: alert ? "预警处理生成" : "医生创建",
    status: "待医生确认",
    objective: alert ? `围绕“${alert.title}”形成阶段管理目标` : "医生从 0-1 创建阶段管理目标",
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
  openModal("患者知晓确认", `<p>方案已下发至患者端。生产环境由患者端点击“已知晓并开始执行”。</p><div class="summary-box">${plan.title}</div>`, `<button class="btn" data-action="close-modal">稍后</button><button class="btn primary" data-action="patient-confirm-plan" data-id="${id}">模拟患者确认</button>`);
  saveState(state);
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
  if (plansOf(patientId).some((item) => item.status === "待医生确认")) rows.push(`<button class="btn primary" data-view-link="plans">去确认方案</button>`);
  if (followupsOf(patientId).some((item) => ["待随访", "逾期"].includes(item.status))) rows.push(`<button class="btn primary" data-view-link="followups">去完成随访</button>`);
  openModal(`${patient.name} 的待处理事项`, `<div class="action-stack">${rows.join("") || "暂无待处理事项"}</div>`, `<button class="btn" data-action="close-modal">关闭</button>`);
}

document.body.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-view-link]");
  if (!target) return;

  if (target.dataset.viewLink) {
    currentView = target.dataset.viewLink;
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
    persist("Mock 数据已重置");
  }
  if (action === "filter-patients") {
    patientFilter = target.dataset.filter;
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
  if (action === "open-more") openMore(target.dataset.patient);
  if (action === "add-patient") showToast("添加患者二维码入口已预留");
  if (action === "quick-primary") {
    const alert = alertsOf(target.dataset.patient).find((item) => item.status === "待处理");
    if (alert) handleAlert(alert.id);
    else showToast("当前无待处理预警，可从详情继续分析");
  }
  if (action === "handle-alert") handleAlert(target.dataset.id);
  if (action === "save-alert") saveAlert(target.dataset.id);
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

$$(".nav-item").forEach((item) => item.addEventListener("click", () => {
  currentView = item.dataset.view;
  render();
}));

render();
