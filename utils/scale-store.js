const SCALE_KEY = 'patientScaleRecords';
const SCALE_DRAFT_KEY = 'scaleDraft';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function nowISO() {
  return new Date().toISOString();
}

// ─── CAT 量表定义 ───

const CAT_SCALE = {
  code: 'cat',
  name: 'CAT 评估',
  fullName: 'COPD Assessment Test',
  shortName: 'CAT',
  desc: '慢阻肺评估测试，评估您的呼吸健康对日常活动的影响程度',
  icon: 'CAT',
  color: '#1F82FF',
  questions: [
    {
      id: 'q1',
      title: '咳嗽',
      text: '最近您咳嗽的情况如何？',
      options: [
        { label: '从不咳嗽', score: 0 },
        { label: '偶尔咳嗽', score: 1 },
        { label: '几天咳嗽', score: 2 },
        { label: '多数天咳嗽', score: 3 },
        { label: '每天都咳嗽', score: 4 },
        { label: '整天都在咳嗽', score: 5 },
      ],
    },
    {
      id: 'q2',
      title: '痰',
      text: '最近您咳痰的情况如何？',
      options: [
        { label: '从不咳痰', score: 0 },
        { label: '偶尔咳痰', score: 1 },
        { label: '几天咳痰', score: 2 },
        { label: '多数天咳痰', score: 3 },
        { label: '每天都咳痰', score: 4 },
        { label: '整天都在咳痰', score: 5 },
      ],
    },
    {
      id: 'q3',
      title: '胸闷',
      text: '最近您感觉胸闷的情况如何？',
      options: [
        { label: '从不胸闷', score: 0 },
        { label: '偶尔胸闷', score: 1 },
        { label: '几天胸闷', score: 2 },
        { label: '多数天胸闷', score: 3 },
        { label: '每天都胸闷', score: 4 },
        { label: '整天都在胸闷', score: 5 },
      ],
    },
    {
      id: 'q4',
      title: '爬坡或上一层楼梯时',
      text: '爬坡或上一层楼梯时，您感觉气喘的情况如何？',
      options: [
        { label: '从不气喘', score: 0 },
        { label: '偶尔气喘', score: 1 },
        { label: '几天气喘', score: 2 },
        { label: '多数天气喘', score: 3 },
        { label: '每天都气喘', score: 4 },
        { label: '整天都在气喘', score: 5 },
      ],
    },
    {
      id: 'q5',
      title: '家务劳动',
      text: '在家做家务时，您感觉气喘的情况如何？',
      options: [
        { label: '从不气喘', score: 0 },
        { label: '偶尔气喘', score: 1 },
        { label: '几天气喘', score: 2 },
        { label: '多数天气喘', score: 3 },
        { label: '每天都气喘', score: 4 },
        { label: '整天都在气喘', score: 5 },
      ],
    },
    {
      id: 'q6',
      title: '外出',
      text: '外出时，您是否因气喘而信心不足？',
      options: [
        { label: '从不受限', score: 0 },
        { label: '偶尔受限', score: 1 },
        { label: '几天受限', score: 2 },
        { label: '多数天受限', score: 3 },
        { label: '每天受限', score: 4 },
        { label: '整天受限', score: 5 },
      ],
    },
    {
      id: 'q7',
      title: '睡眠',
      text: '最近您因呼吸问题睡眠不佳的情况如何？',
      options: [
        { label: '从不受影响', score: 0 },
        { label: '偶尔受影响', score: 1 },
        { label: '几天受影响', score: 2 },
        { label: '多数天受影响', score: 3 },
        { label: '每天受影响', score: 4 },
        { label: '整天受影响', score: 5 },
      ],
    },
    {
      id: 'q8',
      title: '精力',
      text: '最近您的精力状况如何？',
      options: [
        { label: '精力充沛', score: 0 },
        { label: '精力较好', score: 1 },
        { label: '精力一般', score: 2 },
        { label: '精力较差', score: 3 },
        { label: '精力很差', score: 4 },
        { label: '完全没有精力', score: 5 },
      ],
    },
  ],
};

// ─── mMRC 量表定义 ───

const MMRC_SCALE = {
  code: 'mmrc',
  name: 'mMRC 评估',
  fullName: 'Modified Medical Research Council Dyspnea Scale',
  shortName: 'mMRC',
  desc: '呼吸困难分级评估，判断您的气短程度对日常活动的影响',
  icon: 'mMRC',
  color: '#EF4444',
  questions: [
    {
      id: 'q1',
      title: '呼吸困难分级',
      text: '您感到呼吸困难的情况如何？',
      options: [
        { label: '仅在剧烈运动时才感到呼吸困难', grade: 0 },
        { label: '平地快走或上小坡时感到气短', grade: 1 },
        { label: '因气短，平地行走比同龄人慢，或需要停下休息', grade: 2 },
        { label: '平地行走数分钟或约100米后需停下喘气', grade: 3 },
        { label: '严重呼吸困难，无法外出，或穿衣时也感到气短', grade: 4 },
      ],
    },
  ],
};

// ─── 量表目录 ───

const SCALE_CATALOG = [
  {
    code: 'cat',
    name: 'CAT 评估',
    fullName: 'COPD Assessment Test',
    desc: '慢阻肺评估测试，评估您的呼吸健康对日常活动的影响程度',
    icon: 'CAT',
    color: '#1F82FF',
    tag: '呼吸',
    questionsCount: 8,
    timeEstimate: '约 3 分钟',
    route: '/pages/scale/cat/index',
  },
  {
    code: 'mmrc',
    name: 'mMRC 评估',
    fullName: 'Modified Medical Research Council Dyspnea Scale',
    desc: '呼吸困难分级评估，判断您的气短程度对日常活动的影响',
    icon: 'mMRC',
    color: '#EF4444',
    tag: '呼吸',
    questionsCount: 1,
    timeEstimate: '约 1 分钟',
    route: '/pages/scale/mmrc/index',
  },
  {
    code: 'screening',
    name: '健康筛查',
    fullName: '健康风险筛查',
    desc: '综合评估您的慢病风险等级，获取个性化健康建议',
    icon: '筛',
    color: '#F59E0B',
    tag: '综合',
    questionsCount: 4,
    timeEstimate: '约 10 分钟',
    route: '/pages/screening/index',
  },
];

// ─── CAT 评分规则 ───

function computeCatResult(answers) {
  const questions = CAT_SCALE.questions;
  const scores = {};
  let total = 0;

  questions.forEach(q => {
    const answerIdx = answers[q.id];
    if (answerIdx !== undefined && answerIdx !== null) {
      scores[q.id] = q.options[answerIdx].score;
      total += q.options[answerIdx].score;
    } else {
      scores[q.id] = null;
    }
  });

  // 影响等级
  let level, levelName, levelColor, levelDesc;
  if (total <= 10) {
    level = 'mild';
    levelName = '轻微影响';
    levelColor = '#10B981';
    levelDesc = '您的慢阻肺对日常活动影响轻微，建议继续坚持当前管理方案，保持规律记录和随访。';
  } else if (total <= 20) {
    level = 'moderate';
    levelName = '中度影响';
    levelColor = '#F59E0B';
    levelDesc = '您的慢阻肺对日常活动有中度影响，建议加强记录频率，及时与医生沟通调整方案。';
  } else if (total <= 30) {
    level = 'severe';
    levelName = '重度影响';
    levelColor = '#EF4444';
    levelDesc = '您的慢阻肺对日常活动有重度影响，请尽快联系医生评估是否需要调整治疗方案。';
  } else {
    level = 'verySevere';
    levelName = '极重度影响';
    levelColor = '#7C3AED';
    levelDesc = '您的慢阻肺对日常活动影响极重，请立即联系医生或前往医院就诊。';
  }

  // GOLD 分组
  const goldGroup = total >= 10 ? '更多症状组 (GOLD Group B/E)' : '较少症状组 (GOLD Group A/C)';
  const goldAdvice = total >= 10
    ? '属于 GOLD 更多症状组，建议与医生讨论是否需要加强症状管理。'
    : '属于 GOLD 较少症状组，当前症状管理可以维持。';

  // MCID
  const mcidNote = 'CAT 评分最小临床重要差异（MCID）为 2 分，下次评估时若评分变化 ≥ 2 分则说明病情有显著变化。';

  // 明细
  const details = questions.map(q => ({
    id: q.id,
    title: q.title,
    text: q.text,
    selectedOption: answers[q.id] !== undefined ? q.options[answers[q.id]].label : '未作答',
    score: scores[q.id],
    maxScore: 5,
  }));

  return {
    scaleCode: 'cat',
    total,
    maxTotal: 40,
    level,
    levelName,
    levelColor,
    levelDesc,
    goldGroup,
    goldAdvice,
    mcidNote,
    scores,
    details,
    completedAt: nowISO(),
  };
}

// ─── mMRC 评分规则 ───

function computeMmrcResult(answers) {
  const q = MMRC_SCALE.questions[0];
  const answerIdx = answers[q.id];
  const grade = answerIdx !== undefined && answerIdx !== null ? q.options[answerIdx].grade : null;

  const GRADE_MAP = {
    0: { levelName: 'none', levelColor: '#10B981', desc: '无呼吸困难', goldGroup: '低症状组 (GOLD A/C)' },
    1: { levelName: 'mild', levelColor: '#10B981', desc: '轻度气短', goldGroup: '低症状组 (GOLD A/C)' },
    2: { levelName: 'moderate', levelColor: '#F59E0B', desc: '中度呼吸困难', goldGroup: '高症状组 (GOLD B/E)' },
    3: { levelName: 'severe', levelColor: '#EF4444', desc: '重度呼吸困难', goldGroup: '高症状组 (GOLD B/E)' },
    4: { levelName: 'verySevere', levelColor: '#EF4444', desc: '极重度呼吸困难', goldGroup: '高症状组 (GOLD B/E)' },
  };

  const mapping = grade !== null ? GRADE_MAP[grade] : { levelName: '', levelColor: '#8D99A8', desc: '未作答', goldGroup: '' };
  const selectedLabel = grade !== null ? q.options[answerIdx].label : '未作答';

  return {
    scaleCode: 'mmrc',
    grade,
    levelName: mapping.levelName,
    levelColor: mapping.levelColor,
    levelDesc: mapping.desc,
    goldGroup: mapping.goldGroup,
    selectedLabel,
    answers,
    completedAt: nowISO(),
  };
}

// ─── 评估记录管理 ───

function loadRecords() {
  let data = wx.getStorageSync(SCALE_KEY);
  if (!data) data = [];
  return data;
}

function saveRecords(data) {
  wx.setStorageSync(SCALE_KEY, data);
}

function addRecord(record) {
  const records = loadRecords();
  records.unshift(record);
  saveRecords(records);
  return records;
}

function getRecords(scaleCode) {
  const records = loadRecords();
  if (scaleCode) return records.filter(r => r.scaleCode === scaleCode);
  return records;
}

function getLatestRecord(scaleCode) {
  const records = getRecords(scaleCode);
  return records.length ? records[0] : null;
}

function hasCompleted(scaleCode) {
  return getRecords(scaleCode).length > 0;
}

// ─── 草稿管理 ───

function loadDraft(scaleCode) {
  const drafts = wx.getStorageSync(SCALE_DRAFT_KEY) || {};
  return drafts[scaleCode] || null;
}

function saveDraft(scaleCode, draft) {
  const drafts = wx.getStorageSync(SCALE_DRAFT_KEY) || {};
  drafts[scaleCode] = draft;
  wx.setStorageSync(SCALE_DRAFT_KEY, drafts);
}

function clearDraft(scaleCode) {
  const drafts = wx.getStorageSync(SCALE_DRAFT_KEY) || {};
  delete drafts[scaleCode];
  wx.setStorageSync(SCALE_DRAFT_KEY, drafts);
}

module.exports = {
  CAT_SCALE,
  MMRC_SCALE,
  SCALE_CATALOG,
  computeCatResult,
  computeMmrcResult,
  loadRecords,
  addRecord,
  getRecords,
  getLatestRecord,
  hasCompleted,
  loadDraft,
  saveDraft,
  clearDraft,
};