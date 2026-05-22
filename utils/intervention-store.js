const ADVICE_KEY = 'patientAdvice';
const RECHECK_KEY = 'patientRecheckPlans';
const FOLLOWUP_KEY = 'patientFollowups';
const TASK_HISTORY_KEY = 'patientTaskHistory';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowISO() {
  return new Date().toISOString();
}

// ---------- Advice ----------

const SEED_ADVICE = [
  {
    id: 'AD001',
    patientId: 'P001',
    sourceType: 'alert',
    sourceId: 'A001',
    title: '注意夜间低氧',
    content: '今晚睡前确认 CPAP 佩戴并同步睡眠报告。如仍有晨起头痛或憋醒，请立即联系我。',
    reason: '夜间血氧低于90%累计12分钟',
    status: 'sent',
    sentAt: '2026-05-19 08:20',
    createdAt: '2026-05-19 08:20',
    doctorName: '林医生',
  },
  {
    id: 'AD002',
    patientId: 'P002',
    sourceType: 'plan',
    sourceId: 'PL002',
    title: '补充餐后血糖记录',
    content: '本周补充 2 次餐后 2h 血糖记录，并备注饮食内容。空腹血糖连续偏高时请复测并联系我。',
    reason: '',
    status: 'read',
    readAt: '2026-05-18 20:30',
    sentAt: '2026-05-18 18:12',
    createdAt: '2026-05-18 18:12',
    doctorName: '林医生',
  },
];

function loadAdvice() {
  let data = wx.getStorageSync(ADVICE_KEY);
  if (!data || !data.length) {
    data = deepClone(SEED_ADVICE);
    wx.setStorageSync(ADVICE_KEY, data);
  }
  return data;
}

function getAdviceList() {
  const list = loadAdvice();
  list.sort((a, b) => {
    if (a.status === 'sent' && b.status !== 'sent') return -1;
    if (a.status !== 'sent' && b.status === 'sent') return 1;
    return (b.sentAt || '').localeCompare(a.sentAt || '');
  });
  return list;
}

function getCurrentAdviceList(limit = 3) {
  return getAdviceList().slice(0, limit);
}

function getHistoricalAdviceList() {
  return getAdviceList();
}

function getAdviceById(id) {
  return loadAdvice().find(a => a.id === id) || null;
}

function markAdviceRead(id) {
  const list = loadAdvice();
  const item = list.find(a => a.id === id);
  if (item && item.status === 'sent') {
    item.status = 'read';
    item.readAt = nowISO();
    wx.setStorageSync(ADVICE_KEY, list);
  }
  return list;
}

// ---------- Recheck Plans ----------

const SEED_RECHECK = [
  {
    id: 'RC001',
    patientId: 'P001',
    sourceType: 'alert',
    sourceId: 'A001',
    metricCodes: ['血糖', 'SpO2'],
    scenes: { '血糖': ['空腹', '睡前'], 'SpO2': ['静息'] },
    frequency: '每日1次',
    duration: '3天',
    startAt: '2026-05-19',
    endAt: '2026-05-21',
    patientInstruction: '连续 3 天完成血糖和血氧复测，关注空腹和睡前时段',
    reason: '夜间血氧低于90%累计12分钟',
    status: 'active',
    createdAt: '2026-05-19 08:30',
  },
  {
    id: 'RC002',
    patientId: 'P002',
    sourceType: 'plan',
    sourceId: 'PL002',
    metricCodes: ['血压'],
    scenes: { '血压': ['晨起', '睡前'] },
    frequency: '每日1次',
    duration: '2天',
    startAt: '2026-05-19',
    endAt: '2026-05-20',
    patientInstruction: '连续 2 天完成晨起和睡前血压测量',
    reason: '餐后血糖连续偏高，需监测血压变化',
    status: 'active',
    createdAt: '2026-05-18 18:15',
  },
];

function loadRecheckPlans() {
  let data = wx.getStorageSync(RECHECK_KEY);
  if (!data || !data.length) {
    data = deepClone(SEED_RECHECK);
    wx.setStorageSync(RECHECK_KEY, data);
  }
  return data;
}

function getActiveRecheckPlans() {
  return loadRecheckPlans().filter(r => r.status === 'active');
}

function getRecheckPlanById(id) {
  return loadRecheckPlans().find(r => r.id === id) || null;
}

function computeRecheckSummary(plan) {
  const parts = plan.metricCodes.map(code => {
    const scenes = plan.scenes[code] || [];
    return scenes.length ? `${code}（${scenes.join('、')}）` : code;
  });
  return parts.join(' / ');
}

function computeRecheckProgress(planId) {
  const plan = getRecheckPlanById(planId);
  if (!plan) return { daysCompleted: 0, daysRemaining: 0, todayDone: false, taskStatus: 'pending' };

  const totalDays = parseInt(plan.duration) || 3;
  const today = todayStr();
  const start = plan.startAt;
  const taskStatus = wx.getStorageSync('recheckTaskStatus_' + today) || {};
  const todayDone = !!taskStatus[planId];

  let daysCompleted = 0;
  const startDate = new Date(start);
  const todayDate = new Date(today);
  for (let d = new Date(startDate); d <= todayDate; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayStatus = wx.getStorageSync('recheckTaskStatus_' + key) || {};
    if (dayStatus[planId]) daysCompleted++;
  }

  const daysRemaining = totalDays - daysCompleted;
  let taskStatusLabel = '待完成';
  if (todayDone) taskStatusLabel = '今日已完成';
  if (daysCompleted >= totalDays) taskStatusLabel = '已完成';
  if (today > plan.endAt && daysCompleted < totalDays) taskStatusLabel = '已到期';

  return { daysCompleted, daysRemaining, todayDone, taskStatus: taskStatusLabel, summary: computeRecheckSummary(plan) };
}

function markRecheckTodayDone(planId) {
  const today = todayStr();
  const key = 'recheckTaskStatus_' + today;
  const status = wx.getStorageSync(key) || {};
  status[planId] = true;
  wx.setStorageSync(key, status);
}

// ---------- Followups ----------

const SEED_FOLLOWUPS = [
  {
    id: 'F001',
    patientId: 'P001',
    sourceType: 'alert',
    sourceId: 'A001',
    relatedAlertId: 'A001',
    relatedPlanId: 'PL001',
    title: '低氧预警后随访',
    type: '预警后随访',
    status: 'pending_patient_prepare',
    dueAt: '2026-05-22 15:30',
    method: '电话',
    owner: '林医生',
    prepareItems: ['血糖记录', '血压记录', '症状记录', '用药记录', '检查报告', '量表问卷'],
    scales: ['STOP-Bang'],
    patientInstruction: '请在随访前补齐近期血糖和症状记录，并上传最近的检查报告',
    reason: '夜间血氧预警后跟进',
    focus: ['睡眠低氧原因', 'CPAP 佩戴依从性', '晨起症状'],
    doctorName: '林医生',
    createdAt: '2026-05-19 09:00',
  },
  {
    id: 'F002',
    patientId: 'P002',
    sourceType: 'plan',
    sourceId: 'PL002',
    relatedPlanId: 'PL002',
    title: '血糖方案执行随访',
    type: '方案随访',
    status: 'pending_patient_prepare',
    dueAt: '2026-05-25 10:00',
    method: '线下',
    owner: '林医生',
    prepareItems: ['血糖记录', '用药记录', '饮食备注'],
    scales: [],
    patientInstruction: '请携带近 7 天血糖记录和用药记录到门诊',
    reason: '方案下发后第 7 天首次随访',
    focus: ['空腹血糖达标率', '餐后血糖记录完整性', '用药依从性'],
    doctorName: '林医生',
    createdAt: '2026-05-18 16:20',
  },
];

function loadFollowups() {
  let data = wx.getStorageSync(FOLLOWUP_KEY);
  if (!data || !data.length) {
    data = deepClone(SEED_FOLLOWUPS);
    wx.setStorageSync(FOLLOWUP_KEY, data);
  }
  return data;
}

function getActiveFollowups() {
  return loadFollowups()
    .filter(f => f.status === 'pending_patient_prepare' || f.status === 'pending_doctor')
    .sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || ''));
}

function getFollowupById(id) {
  return loadFollowups().find(f => f.id === id) || null;
}

function getAllFollowups() {
  return loadFollowups().slice().sort((a, b) => {
    const now = todayStr();
    const da = (a.dueAt || '').slice(0, 10);
    const db = (b.dueAt || '').slice(0, 10);
    const diffA = Math.abs((new Date(da) - new Date(now.replace(/-/g, '/'))) || 0);
    const diffB = Math.abs((new Date(db) - new Date(now.replace(/-/g, '/'))) || 0);
    return diffA - diffB;
  });
}

function computeFollowupPrepareStatus(followupId) {
  const followup = getFollowupById(followupId);
  if (!followup) return { normalItems: [], specialItems: [], prepareStatus: 'pending' };

  const normalItems = followup.prepareItems.filter(i => i !== '检查报告' && i !== '量表问卷');
  const specialItems = [];

  if (followup.prepareItems.includes('检查报告')) {
    const reportUploaded = wx.getStorageSync('followupReport_' + followupId);
    specialItems.push({ type: 'report', label: '检查报告', done: !!reportUploaded, followupId });
  }

  if (followup.prepareItems.includes('量表问卷') && followup.scales && followup.scales.length) {
    followup.scales.forEach(scale => {
      const scaleDone = wx.getStorageSync('followupScale_' + followupId + '_' + scale);
      specialItems.push({ type: 'scale', label: `${scale} 量表`, scaleCode: scale, done: !!scaleDone, followupId });
    });
  }

  const allSpecialDone = specialItems.length ? specialItems.every(s => s.done) : true;
  let prepareStatus = 'pending';
  if (specialItems.length && specialItems.some(s => s.done)) prepareStatus = 'partial';
  if (allSpecialDone) prepareStatus = 'ready';

  return { normalItems, specialItems, prepareStatus };
}

function splitFollowupsByState() {
  const all = getAllFollowups();
  const pending = [];
  const completed = [];
  all.forEach(item => {
    if (item.status === 'pending_patient_prepare' || item.status === 'pending_doctor') {
      pending.push(item);
    } else {
      completed.push(item);
    }
  });
  completed.sort((a, b) => (b.dueAt || '').localeCompare(a.dueAt || ''));
  return { pending, completed };
}

function completeFollowup(followupId, summary) {
  const list = loadFollowups();
  const item = list.find(f => f.id === followupId);
  if (item) {
    item.status = 'completed';
    item.resultSummary = summary || '本次随访已完成，建议继续当前方案。';
    item.nextAdvice = '继续按医生方案完成当前阶段记录。';
    item.completedAt = nowISO();
    wx.setStorageSync(FOLLOWUP_KEY, list);
  }
}

function markFollowupReportUploaded(followupId) {
  wx.setStorageSync('followupReport_' + followupId, nowISO());
}

function markFollowupScaleDone(followupId, scaleCode) {
  wx.setStorageSync('followupScale_' + followupId + '_' + scaleCode, nowISO());
}

function loadTaskHistory() {
  let data = wx.getStorageSync(TASK_HISTORY_KEY);
  if (!data || !data.length) {
    data = [
      {
        id: 'TH001',
        title: '复测指标',
        type: 'recheck',
        status: '进行中',
        statusKey: 'active',
        source: '预警后安排',
        time: '2026-05-19',
        summary: '血糖（空腹、睡前）/ SpO2（静息）',
        detail: '连续 3 天完成复测，今日仍需继续记录。',
      },
      {
        id: 'TH002',
        title: '检查报告上传',
        type: 'followup_prepare',
        status: '已完成',
        statusKey: 'done',
        source: '随访准备',
        time: '2026-05-18',
        summary: '已补充最近一次肺功能检查报告',
        detail: '检查报告已上传，医生会在随访时结合症状和血氧情况一起评估。',
      },
      {
        id: 'TH003',
        title: 'STOP-Bang 量表',
        type: 'scale',
        status: '已完成',
        statusKey: 'done',
        source: '随访准备',
        time: '2026-05-18',
        summary: '睡眠呼吸障碍风险量表已填写',
        detail: '量表结果已提交，后续会在随访中结合睡眠报告一起解读。',
      },
      {
        id: 'TH004',
        title: '复测指标',
        type: 'recheck',
        status: '已到期',
        statusKey: 'expired',
        source: '方案观察',
        time: '2026-05-10',
        summary: '血压（晨起、睡前）连续 2 天复测',
        detail: '复测周期已结束，记录结果已保留在历史任务中。',
      },
    ];
    wx.setStorageSync(TASK_HISTORY_KEY, data);
  }
  return data;
}

function getTaskHistoryList() {
  return loadTaskHistory()
    .slice()
    .sort((a, b) => (b.time || '').localeCompare(a.time || ''));
}

module.exports = {
  getAdviceList,
  getCurrentAdviceList,
  getHistoricalAdviceList,
  getAdviceById,
  markAdviceRead,
  getActiveRecheckPlans,
  getRecheckPlanById,
  computeRecheckProgress,
  computeRecheckSummary,
  markRecheckTodayDone,
  getActiveFollowups,
  getAllFollowups,
  splitFollowupsByState,
  getFollowupById,
  computeFollowupPrepareStatus,
  markFollowupReportUploaded,
  markFollowupScaleDone,
  completeFollowup,
  getTaskHistoryList,
};
