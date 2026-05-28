const CONFIG_KEY = 'mockDemoConfig';

const DEFAULT_CONFIG = {
  userStage: 'managed',
  planStatus: 'pending_confirm',
  showRiskAlert: true,
  deviceAbnormal: true,
};

const STAGE_PROFILE = {
  new: {
    homeStage: 'new',
    hasCompletedScreening: false,
    hasActivePlan: false,
    riskLabel: '待评估',
    profileStatus: '未筛查',
    managedTitle: '周明，待筛查',
    managedDesc: '完成健康筛查后，可查看慢病风险和后续管理建议。',
  },
  screening_draft: {
    homeStage: 'screening_draft',
    hasCompletedScreening: false,
    hasActivePlan: false,
    riskLabel: '筛查中',
    profileStatus: '筛查未完成',
    managedTitle: '周明，筛查未完成',
    managedDesc: '继续完成健康筛查，帮助医生了解当前风险。',
  },
  assessed: {
    homeStage: 'assessed',
    hasCompletedScreening: true,
    hasActivePlan: false,
    riskLabel: '已筛查',
    profileStatus: '待医生确认',
    managedTitle: '周明，已完成筛查',
    managedDesc: '筛查结果已生成，医生确认并下发方案后进入管理中。',
  },
  managed: {
    homeStage: 'managed',
    hasCompletedScreening: true,
    hasActivePlan: true,
    riskLabel: '需干预',
    profileStatus: '管理中',
    managedTitle: '周明，需关注',
    managedDesc: '夜间低氧叠加空腹血糖偏高，建议先完成复测和设备同步确认。',
  },
};

const basePatient = {
  id: 'P001',
  name: '周明',
  avatarText: '周',
  sex: '男',
  age: 58,
  phone: '138****0921',
  doctorName: '林医生',
  doctorRole: '主责医生',
  riskScore: 78,
  riskChange: -8,
  diseases: ['糖尿病', '慢阻肺', '睡眠呼吸暂停'],
  patientDesc: '糖尿病 · 慢阻肺 · 睡眠呼吸暂停',
  healthTags: ['糖尿病', '慢阻肺', '睡眠呼吸暂停', '绑定血氧仪'],
  devices: [
    { name: '睡眠监测仪', desc: 'AHI、睡眠分期、夜间血氧', status: '已绑定', mark: '睡' },
    { name: '指夹血氧仪', desc: '血氧、脉率、ODI', status: '已绑定', mark: '氧' },
  ],
  managedSummary: [
    { label: '健康分', value: '78 分' },
    { label: '今日状态', value: '需关注' },
    { label: '下次随访', value: '05-22' },
  ],
};

function getConfig() {
  const stored = wx.getStorageSync(CONFIG_KEY) || {};
  return { ...DEFAULT_CONFIG, ...stored };
}

function setConfig(nextConfig) {
  const config = { ...getConfig(), ...nextConfig };
  wx.setStorageSync(CONFIG_KEY, config);
  return config;
}

function resetConfig() {
  wx.setStorageSync(CONFIG_KEY, { ...DEFAULT_CONFIG });
  return getConfig();
}

function getCurrentPatient() {
  const config = getConfig();
  const stage = STAGE_PROFILE[config.userStage] || STAGE_PROFILE.managed;
  const profileItems = [
    { label: '年龄', value: '58岁' },
    { label: 'BMI', value: '27.0' },
    { label: '绑定设备', value: '2台' },
    { label: '随访状态', value: stage.profileStatus },
  ];
  return {
    ...basePatient,
    ...stage,
    profileItems,
    demoConfig: config,
  };
}

function getCurrentPatientId() {
  return basePatient.id;
}

module.exports = {
  getConfig,
  setConfig,
  resetConfig,
  getCurrentPatient,
  getCurrentPatientId,
};
