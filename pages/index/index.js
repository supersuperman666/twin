const interventionStore = require('../../utils/intervention-store');
const mockSession = require('../../utils/mock-session');
const planStore = require('../../utils/plan-store');
const recordStore = require('../../utils/record-store');
const symptomConfig = require('../../utils/symptom-config');

function resolveHomeStage(patient) {
  if (patient.homeStage) return patient.homeStage;
  if (patient.hasActivePlan) return 'managed';
  if (patient.hasCompletedScreening) return 'assessed';
  return 'new';
}

function formatFollowupDate(value) {
  if (!value) return '';
  const parts = value.split(' ');
  const date = parts[0] || '';
  const time = parts[1] || '';
  const md = date.slice(5).replace('-', '月') + '日';
  return time ? `${md} ${time.slice(0, 5)}` : md;
}

function isTabPage(path) {
  return [
    '/pages/index/index',
    '/pages/record/index',
    '/pages/plan/index',
    '/pages/me/index',
  ].includes(path);
}

Page({
  data: {
    userStage: 'managed',
    currentPatient: null,
    todayStatus: null,
    coreIndicators: [],
    quickRecords: [
      { label: '记血糖', type: 'glucose', path: '/pages/record/form/index?type=glucose' },
      { label: '记血压', type: 'pressure', path: '/pages/record/form/index?type=blood_pressure' },
      { label: '记用药', type: 'medicine', path: '/pages/medication/detail/index' },
      { label: '记症状', type: 'symptom', path: '/pages/symptom/form/index' },
      { label: '更多', type: 'more', path: '/pages/record/index' },
    ],
    newUserQuickRecords: [
      { label: '记血糖', type: 'glucose', path: '/pages/record/form/index?type=glucose' },
      { label: '记血压', type: 'pressure', path: '/pages/record/form/index?type=blood_pressure' },
      { label: '记血氧', type: 'oxygen', path: '/pages/record/form/index?type=oxygen' },
      { label: '记用药', type: 'medicine', path: '/pages/medication/detail/index' },
      { label: '更多', type: 'more', path: '/pages/record/index' },
    ],
    newUserGuide: null,
    assessedGuide: null,
    riskAlert: null,
    todayTasks: [],
    taskSummary: { done: 0, total: 0 },
    doctorArrangement: null,
    nearestFollowup: null,
    planSummary: null,
    deviceStatus: null,
    showAdviceDrawer: false,
    currentAdvice: null,
  },

  onLoad() {
    this.loadHomeData();
  },

  onShow() {
    this.setTabBarSelected();
    this.loadHomeData();
  },

  setTabBarSelected() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  loadHomeData() {
    const currentPatient = mockSession.getCurrentPatient();
    const demoConfig = mockSession.getConfig();
    const recheckPlans = interventionStore.getActiveRecheckPlans()
      .filter(item => item.patientId === currentPatient.id);
    const activeFollowups = interventionStore.getActiveFollowups()
      .filter(item => item.patientId === currentPatient.id);
    const adviceList = interventionStore.getCurrentAdviceList(3)
      .filter(item => item.patientId === currentPatient.id);
    const plan = planStore.getPlan();
    const firstRecheck = recheckPlans[0] || null;
    const firstAdvice = adviceList[0] || null;
    const nearestFollowup = activeFollowups[0] || null;
    const todayTasks = this.buildTodayTasks(firstRecheck, plan, nearestFollowup);
    const completedCount = todayTasks.filter(item => item.status === 'done').length;

    const symptomStatus = recordStore.getTodaySymptomStatus();
    const coreIndicators = [
      { label: '血糖', value: '7.8', unit: 'mmol/L', meta: '餐后2h', status: '略高', tone: 'warning', path: '/pages/record/form/index?type=glucose' },
      { label: '血氧', value: '94', unit: '%', meta: '静息', status: '需关注', tone: 'danger', path: '/pages/record/form/index?type=oxygen' },
      { label: '睡眠', value: '18', unit: 'AHI', meta: '昨夜', status: '偏高', tone: 'danger', path: '/pages/sleep/report/index' },
    ];

    if (symptomStatus.hasDiscomfort === true) {
      const tone = symptomStatus.severityCode === 'severe' ? 'danger' : symptomStatus.severityCode === 'moderate' ? 'warning' : 'info';
      coreIndicators.push({ label: '症状', value: symptomStatus.maxSeverity, unit: '', meta: symptomStatus.summary, status: '有症状', tone, path: '/pages/symptom/detail/index' });
    } else if (symptomStatus.hasDiscomfort === false) {
      coreIndicators.push({ label: '症状', value: '无', unit: '', meta: '今日无不适', status: '正常', tone: 'good', path: '/pages/symptom/detail/index' });
    } else {
      coreIndicators.push({ label: '症状', value: '--', unit: '', meta: '暂无记录', status: '未记录', tone: 'gray', path: '/pages/symptom/form/index' });
    }

    this.setData({
      currentPatient,
      userStage: resolveHomeStage(currentPatient),
      coreIndicators,
      todayStatus: {
        label: currentPatient.riskLabel === '需干预' ? '需要关注' : currentPatient.riskLabel,
        score: currentPatient.riskScore,
        change: currentPatient.riskChange,
        desc: currentPatient.managedDesc,
      },
      newUserGuide: this.buildNewUserGuide(currentPatient),
      assessedGuide: this.buildAssessedGuide(currentPatient),
      riskAlert: demoConfig.showRiskAlert ? {
        level: '重要',
        title: '昨夜血氧偏低',
        desc: '最低血氧 86%，低氧持续时间较前日增加，建议完成一次静息血氧复测。',
        action: '去复测',
        path: '/pages/record/form/index?type=oxygen&scene=recheck',
      } : null,
      todayTasks,
      taskSummary: { done: completedCount, total: todayTasks.length },
      doctorArrangement: firstAdvice ? {
        id: firstAdvice.id,
        title: firstAdvice.title,
        desc: firstAdvice.content,
        doctorName: firstAdvice.doctorName,
        sentAt: firstAdvice.sentAt,
        status: firstAdvice.status,
      } : null,
      nearestFollowup,
      planSummary: {
        title: plan.title,
        stage: plan.disease === '糖尿病' ? '控糖巩固期' : '执行中',
        objective: plan.objective,
        doctor: plan.doctor,
        status: plan.patientStatus === 'pending_confirm' ? '待确认' : '执行中',
      },
      deviceStatus: {
        count: currentPatient.devices.length,
        latestSync: '今天 08:30',
        abnormal: demoConfig.deviceAbnormal,
        desc: demoConfig.deviceAbnormal ? '1 台设备昨夜报告未完整同步' : '设备同步正常',
      },
    });
  },

  buildNewUserGuide(patient) {
    const isDraft = patient.homeStage === 'screening_draft';
    const hasDoctor = false;
    const hasDevices = false;
    return {
      screening: {
        status: isDraft ? '筛查未完成' : '未评估',
        title: isDraft ? '继续完成健康筛查' : '先完成一次健康筛查',
        desc: isDraft ? '你还有部分问题未完成，提交后可查看健康风险提示。' : '约 3 分钟，了解血糖、呼吸、睡眠和血压相关风险。',
        note: isDraft ? '已完成 6/18 题' : '完成后可生成你的初步健康风险画像，并给出下一步管理建议。',
        action: isDraft ? '继续完成筛查' : '开始健康筛查',
      },
      doctor: {
        title: hasDoctor ? '我的医生' : '已有医生或管理师？',
        desc: hasDoctor ? `${patient.doctorName}｜呼吸与慢病管理` : '扫码绑定后，医生可在授权范围内查看你的筛查结果和健康记录。',
        note: hasDoctor ? '你的筛查和记录结果会在授权范围内同步给医生查看。' : '未完成筛查也可以先绑定医生。',
        action: hasDoctor ? '查看绑定信息' : '扫码绑定医生',
      },
      profile: {
        percent: 20,
        items: '基础资料 / 既往病史 / 当前用药',
      },
      device: {
        bound: hasDevices,
        count: hasDevices ? patient.devices.length : 0,
        title: hasDevices ? `已绑定 ${patient.devices.length} 台` : '未绑定',
        action: hasDevices ? '查看设备' : '去绑定',
      },
    };
  },

  buildAssessedGuide(patient) {
    const hasDoctor = false;
    const hasDevices = false;
    return {
      result: {
        status: '已完成健康筛查',
        title: hasDoctor ? '筛查结果已同步给医生' : '你的健康筛查已完成',
        desc: hasDoctor ? '医生可结合你的筛查结果、健康档案和后续记录，判断是否需要进入正式管理。' : '本次筛查提示你存在部分健康风险，需要结合更多健康资料和医生判断进一步确认。',
        risks: [
          { label: '血糖风险', value: '中' },
          { label: '呼吸风险', value: '低' },
          { label: '睡眠风险', value: '高' },
          { label: '血压风险', value: '中' },
        ],
      },
      doctor: {
        title: hasDoctor ? '筛查结果已同步给医生' : '需要医生进一步确认？',
        desc: hasDoctor ? '医生可查看你的筛查结果和后续记录。' : '绑定医生后，医生可结合你的筛查结果和健康记录，判断是否需要正式管理。',
        action: hasDoctor ? '查看绑定信息' : '扫码绑定医生',
      },
      profile: {
        percent: 20,
        items: '基础资料 / 既往病史 / 当前用药',
      },
      device: {
        bound: hasDevices,
        count: hasDevices ? patient.devices.length : 0,
        title: hasDevices ? `已绑定 ${patient.devices.length} 台` : '未绑定',
        action: hasDevices ? '查看设备' : '去绑定',
      },
    };
  },

  buildTodayTasks(recheckPlan, plan, followup) {
    const tasks = [
      {
        id: 'task_glucose_fasting',
        title: '空腹血糖记录',
        time: '07:00-09:00',
        source: '管理方案',
        status: 'pending',
        action: '去记录',
        path: '/pages/record/form/index?type=glucose',
      },
      {
        id: 'task_bp_morning',
        title: '晨间血压记录',
        time: '晨起后',
        source: '管理方案',
        status: 'done',
        action: '已完成',
        path: '/pages/record/form/index?type=blood_pressure',
      },
    ];

    if (recheckPlan) {
      tasks.splice(1, 0, {
        id: recheckPlan.id,
        title: '低氧后血氧复测',
        time: '今天完成',
        source: '预警',
        status: 'pending',
        action: '去复测',
        path: '/pages/record/form/index?type=oxygen&scene=recheck',
      });
    }

    if (plan && plan.patientStatus === 'pending_confirm') {
      tasks.push({
        id: 'plan_confirm',
        title: '新方案确认知晓',
        time: '今天完成',
        source: '医生方案',
        status: 'pending',
        action: '去确认',
        path: '/pages/plan/index',
      });
    }

    if (followup) {
      tasks.push({
        id: followup.id,
        title: '随访前资料准备',
        time: formatFollowupDate(followup.dueAt),
        source: '随访准备',
        status: 'pending',
        action: '查看',
        path: `/pages/followup/records/index?highlight=${followup.id}`,
      });
    }

    return tasks.slice(0, 3);
  },

  goPath(event) {
    const { path, switchtab } = event.currentTarget.dataset;
    if (!path) return;
    if (switchtab || isTabPage(path)) {
      wx.switchTab({ url: path });
      return;
    }
    wx.navigateTo({ url: path });
  },

  handlePrimaryAction() {
    if (this.data.userStage === 'new') {
      wx.navigateTo({ url: '/pages/screening/index' });
      return;
    }
    if (this.data.userStage === 'screening_draft') {
      wx.navigateTo({ url: '/pages/screening/index' });
      return;
    }
    if (this.data.userStage === 'assessed') {
      wx.navigateTo({ url: '/pages/screening/index?mode=result' });
      return;
    }
    wx.switchTab({ url: '/pages/plan/index' });
  },

  onDoctorBindTap() {
    wx.showToast({ title: '医生绑定信息建设中', icon: 'none' });
  },

  onAdviceTap() {
    const arrangement = this.data.doctorArrangement;
    if (!arrangement) return;
    const advice = interventionStore.getAdviceById(arrangement.id);
    if (!advice) return;
    interventionStore.markAdviceRead(advice.id);
    this.setData({ showAdviceDrawer: true, currentAdvice: advice });
    this.loadHomeData();
  },

  onAdviceClose() {
    this.setData({ showAdviceDrawer: false, currentAdvice: null });
  },

  noop() {},
});
