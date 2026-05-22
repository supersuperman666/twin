const interventionStore = require('../../utils/intervention-store');

Page({
  data: {
    userStage: 'new',
    assessmentResult: null,
    assessmentMetrics: [
      { label: '健康分', value: '--' },
      { label: '指标风险', value: '--' },
      { label: '生活方式', value: '--' }
    ],
    quickRecords: [
      { label: '血糖', type: 'glucose' },
      { label: '血氧', type: 'oxygen' },
      { label: '血压', type: 'pressure' },
      { label: '睡眠', type: 'sleep' },
      { label: '用药', type: 'medicine' }
    ],
    alerts: [
      {
        level: 'high',
        mark: '!',
        title: '夜间血氧低于90%累计12分钟',
        desc: '建议今晚继续佩戴监测设备，若伴随胸闷、晨起头痛，请联系医生。',
        action: '处理'
      },
      {
        level: 'medium',
        mark: 'i',
        title: '空腹血糖连续2天高于目标',
        desc: '今日早餐后2小时需复测，并记录饮食与用药情况。',
        action: '复测'
      }
    ],
    services: [
      { label: '医生咨询', mark: '医', color: '#2d8df0' },
      { label: '报告解读', mark: '报', color: '#37b88f' },
      { label: '续方购药', mark: '药', color: '#f59b23' },
      { label: '设备绑定', mark: '设', color: '#6b73e8', path: '/pages/device/index/index' }
    ],
    healthTags: ['2型糖尿病', '慢阻肺稳定期', '睡眠呼吸障碍风险', '绑定血氧仪'],
    recheckPlans: [],
    recheckProgress: {},
    activeFollowups: [],
    nearestFollowup: null,
    showAdviceDrawer: false,
    currentAdvice: null,
  },

  onLoad() {
    this.loadAssessmentResult()
  },

  onShow() {
    this.setTabBarSelected()
    this.loadAssessmentResult({ preserveStage: true })
    this.loadInterventionData()
  },

  setTabBarSelected() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  loadInterventionData() {
    const recheckPlans = interventionStore.getActiveRecheckPlans();
    const recheckProgress = {};
    recheckPlans.forEach(r => {
      recheckProgress[r.id] = interventionStore.computeRecheckProgress(r.id);
    });
    const activeFollowups = interventionStore.getActiveFollowups();
    const todayTaskCount = recheckPlans.length;
    const managedSummary = [
      { label: '健康分', value: '78 分' },
      { label: '今日待办', value: todayTaskCount ? `${todayTaskCount} 项` : '暂无' },
      { label: '下次随访', value: activeFollowups[0] ? activeFollowups[0].dueAt.slice(5, 10) : '暂无' }
    ];
    this.setData({
      recheckPlans,
      recheckProgress,
      activeFollowups,
      nearestFollowup: activeFollowups[0] || null,
      managedSummary,
    });
  },

  loadAssessmentResult(options = {}) {
    const result = wx.getStorageSync('screeningResult')
    if (!result || !result.score) {
      this.setData({
        userStage: 'new',
        assessmentResult: null,
        assessmentMetrics: [
          { label: '健康分', value: '--' },
          { label: '指标风险', value: '--' },
          { label: '生活方式', value: '--' }
        ]
      })
      return
    }

    const fallbackMetrics = [
      { label: '健康分', value: `${result.score}` },
      { label: '指标风险', value: result.riskName || '已评估' },
      { label: '生活方式', value: result.riskLevel === 'low' ? '良好' : '需调整' }
    ]

    const nextData = {
      assessmentResult: {
        ...result,
        riskName: result.riskName || this.getRiskName(result.riskLevel),
        homeTitle: result.homeTitle || `筛查完成，存在${this.getRiskName(result.riskLevel)}`,
        primaryAdvice: result.primaryAdvice || '已完成健康状况评估，建议根据结果建立初始管理计划。'
      },
      assessmentMetrics: result.summaryMetrics && result.summaryMetrics.length ? [
        { label: '健康分', value: `${result.score}` },
        ...result.summaryMetrics.slice(1, 3)
      ] : fallbackMetrics
    }
    if (!options.preserveStage || this.data.userStage === 'new') {
      nextData.userStage = 'assessed'
    }
    this.setData(nextData)
  },

  getRiskName(riskLevel) {
    if (riskLevel === 'low') return '低风险'
    if (riskLevel === 'high') return '高风险'
    return '中风险'
  },

  switchStage(event) {
    const { stage } = event.currentTarget.dataset
    if (stage === 'assessed' && !this.data.assessmentResult) {
      wx.showToast({ title: '请先完成健康筛查', icon: 'none' })
      return
    }
    this.setData({ userStage: stage })
  },

  handlePrimaryAction() {
    if (this.data.userStage === 'new') {
      wx.navigateTo({ url: '/pages/screening/index' })
      return
    }
    if (this.data.userStage === 'assessed') {
      wx.showToast({ title: '正在生成管理方案', icon: 'none' })
      return
    }
    wx.switchTab({ url: '/pages/plan/index' })
  },

  restartAssessment() {
    wx.removeStorageSync('screeningDraft')
    wx.navigateTo({ url: '/pages/screening/index?mode=restart' })
  },

  handleService(event) {
    const { path } = event.currentTarget.dataset
    if (path) {
      wx.navigateTo({ url: path })
      return
    }
    wx.showToast({ title: '功能建设中', icon: 'none' })
  },

  onAdviceTap(e) {
    const id = e.currentTarget.dataset.id;
    const advice = interventionStore.getAdviceById(id);
    if (!advice) return;
    interventionStore.markAdviceRead(id);
    this.setData({ showAdviceDrawer: true, currentAdvice: advice });
    this.loadInterventionData();
  },

  onAdviceClose() {
    this.setData({ showAdviceDrawer: false, currentAdvice: null });
  },

  onRecheckAction(e) {
    const planId = e.currentTarget.dataset.id;
    const plan = interventionStore.getRecheckPlanById(planId);
    if (!plan) return;
    const firstMetric = plan.metricCodes[0];
    const metricRouteMap = {
      '血糖': '/pages/record/form/index?type=glucose',
      'SpO2': '/pages/record/form/index?type=oxygen',
      '血压': '/pages/record/form/index?type=blood_pressure',
    };
    wx.navigateTo({ url: metricRouteMap[firstMetric] || '/pages/record/index' });
  },

  onFollowupPrepareTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/followup/records/index?highlight=${id}` });
  },

  onFollowupRecords() {
    wx.navigateTo({ url: '/pages/followup/records/index' });
  },
})
