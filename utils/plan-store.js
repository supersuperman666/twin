const PLAN_KEY = 'patientActivePlan';
const TASK_PREFIX = 'planTaskStatus_';
const HISTORY_PLAN_KEY = 'patientHistoryPlans';

const SEED_PLAN = {
  id: 'PL002',
  title: '血糖稳定管理方案',
  disease: '糖尿病',
  doctor: '林医生',
  objective: '未来 30 天提升血糖记录完整性并降低空腹血糖波动',
  period: { startDate: '2026-05-18', endDate: '2026-06-17', days: 30 },
  patientStatus: 'pending_confirm',
  targets: [
    '空腹血糖 4.4-7.0 mmol/L',
    '餐后 2h 血糖 < 10.0 mmol/L',
    '每周记录 ≥ 5 天',
  ],
  abnormalTips: '空腹血糖低于 3.9 mmol/L，立即进食含糖食物并联系医生',
  tasks: [
    {
      id: 'task_glucose_fasting',
      type: 'metric',
      metricCode: 'glucose',
      title: '空腹血糖',
      desc: '06:00 – 09:00  目标 4.4–7.0',
      priority: 'important',
    },
    {
      id: 'task_glucose_post',
      type: 'metric',
      metricCode: 'glucose',
      title: '餐后 2h 血糖',
      desc: '餐后 2 小时  目标 < 10.0',
      priority: 'normal',
    },
    {
      id: 'task_med_metformin',
      type: 'medication',
      title: '二甲双胍 0.5g',
      desc: '随餐服用 · 早晚各一次',
      isKey: true,
    },
    {
      id: 'task_med_acarbose',
      type: 'medication',
      title: '阿卡波糖 50mg',
      desc: '与第一口饭嚼服 · 三餐前',
      isKey: false,
    },
    {
      id: 'task_diet',
      type: 'lifestyle',
      title: '饮食备注',
      desc: '减少精制碳水，增加蔬菜摄入',
    },
    {
      id: 'task_exercise',
      type: 'lifestyle',
      title: '运动打卡',
      desc: '每周 3 次中等强度运动（快走 / 骑车）',
    },
  ],
  modules: [
    {
      key: 'goals',
      name: '管理目标',
      accentColor: '#2478ff',
      items: ['空腹血糖 4.4-7.0 mmol/L', '餐后 2h 血糖 < 10.0 mmol/L', '每周记录 ≥ 5 天'],
    },
    {
      key: 'metrics',
      name: '测量要求',
      accentColor: '#10a37f',
      items: ['空腹血糖：每日 06:00–09:00，手动或设备采集', '餐后 2h 血糖：每周至少 2 次'],
    },
    {
      key: 'medication',
      name: '用药方案',
      accentColor: '#7c3aed',
      items: ['二甲双胍 0.5g · 随餐 · 早晚各一次', '阿卡波糖 50mg · 餐前嚼服 · 三餐前'],
    },
    {
      key: 'lifestyle',
      name: '生活方式',
      accentColor: '#ea7c0a',
      items: ['减少精制碳水和高脂食物', '每周至少 3 次 30 分钟中等强度运动'],
    },
    {
      key: 'guidance',
      name: '医生指导',
      accentColor: '#0369a1',
      note: '出现低血糖症状（头晕、出汗、心悸）时立即进食含糖食物并联系林医生。连续高血糖请复测并补充饮食备注。',
    },
  ],
  followup: {
    nextDate: '2026-05-25',
    nextDay: '25',
    nextMonth: '05月',
    label: '下发后第 7 天首次随访',
    frequency: '之后每 2 周随访 1 次',
    prepare: ['近 7 天血糖记录', '用药记录', '饮食运动备注'],
    focus: ['空腹血糖达标率', '餐后血糖记录完整性', '用药依从性'],
  },
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPlan() {
  let plan = wx.getStorageSync(PLAN_KEY);
  if (!plan) {
    plan = JSON.parse(JSON.stringify(SEED_PLAN));
    wx.setStorageSync(PLAN_KEY, plan);
  }
  return plan;
}

function getHistoryPlans() {
  let plans = wx.getStorageSync(HISTORY_PLAN_KEY);
  if (!plans || !plans.length) {
    plans = [
      {
        id: 'PL001',
        title: '糖尿病管理方案',
        disease: '糖尿病',
        status: '已完成',
        objective: '稳定空腹血糖，减少血糖波动',
        period: { startDate: '2026-04-01', endDate: '2026-04-30', days: 30 },
        modules: SEED_PLAN.modules,
      },
      {
        id: 'PL000',
        title: '血糖观察方案',
        disease: '糖尿病',
        status: '已替换',
        objective: '建立初始血糖记录习惯',
        period: { startDate: '2026-03-10', endDate: '2026-03-31', days: 21 },
        modules: SEED_PLAN.modules,
      }
    ];
    wx.setStorageSync(HISTORY_PLAN_KEY, plans);
  }
  return plans;
}

function confirmPlan() {
  const plan = getPlan();
  plan.patientStatus = 'active';
  plan.confirmedAt = new Date().toISOString();
  wx.setStorageSync(PLAN_KEY, plan);
  return plan;
}

function reportQuestion(text) {
  const questions = wx.getStorageSync('planQuestions') || [];
  questions.unshift({ planId: getPlan().id, text, createdAt: new Date().toISOString() });
  wx.setStorageSync('planQuestions', questions);
}

function getTaskStatus() {
  return wx.getStorageSync(TASK_PREFIX + todayKey()) || {};
}

function completeTask(taskId) {
  const status = getTaskStatus();
  status[taskId] = true;
  wx.setStorageSync(TASK_PREFIX + todayKey(), status);
  return status;
}

module.exports = { getPlan, getHistoryPlans, confirmPlan, reportQuestion, getTaskStatus, completeTask };
