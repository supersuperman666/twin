const planStore = require('../../utils/plan-store');
const mockSession = require('../../utils/mock-session');

function findModule(plan, key) {
  return (plan.modules || []).find(item => item.key === key) || null;
}

function moduleItems(plan, key) {
  const mod = findModule(plan, key);
  if (!mod) return [];
  if (mod.items && mod.items.length) return mod.items;
  return [];
}

function buildPlanView(plan) {
  const isPending = plan.patientStatus === 'pending_confirm';
  const goals = moduleItems(plan, 'goals');
  const metrics = moduleItems(plan, 'metrics');
  const medication = moduleItems(plan, 'medication');
  const lifestyle = moduleItems(plan, 'lifestyle');
  const guidance = findModule(plan, 'guidance');
  const followup = plan.followup || {};

  return {
    header: {
      title: plan.title || '当前管理方案',
      stage: plan.stageName || '控糖巩固期',
      statusText: isPending ? '待确认' : '执行中',
      doctor: plan.doctor || '林医生',
      startDate: plan.period && plan.period.startDate,
      period: plan.period ? `${plan.period.days} 天` : '30 天',
      diseases: plan.disease || '糖尿病',
    },
    stageGoals: [
      plan.objective,
      '稳定空腹血糖，减少餐后波动。',
      '保持规律记录，便于下次随访评估。',
    ].filter(Boolean).slice(0, 3),
    managementRequirements: [
      '按医生要求完成血糖、血压和症状相关记录。',
      '按当前用药安排完成服药打卡，漏服时记录实际情况。',
      '出现明显异常时及时复测，必要时联系医生。',
      ...(lifestyle.length ? lifestyle.slice(0, 1) : []),
    ],
    metricTargets: (goals.length ? goals : plan.targets || []).map((item, index) => ({
      id: `metric_${index}`,
      title: index === 0 ? '血糖目标' : index === 1 ? '餐后目标' : '记录目标',
      desc: item,
      path: index <= 1 ? '/pages/record/form/index?type=glucose' : '/pages/record/index',
    })),
    medicationRequirements: medication.length ? medication : [
      '二甲双胍 0.5g · 随餐 · 早晚各一次',
      '阿卡波糖 50mg · 餐前嚼服 · 三餐前',
    ],
    deviceRequirements: [
      '睡眠监测设备：保持正常同步。',
      '指夹血氧仪：按医生要求完成复测。',
      '若设备连续未同步，请去设备页处理。',
    ],
    followup: {
      date: followup.nextDate || '2026-05-25',
      label: followup.label || '下次随访',
      frequency: followup.frequency || '之后每 2 周随访 1 次',
      prepare: followup.prepare || ['近 7 天血糖记录', '用药记录', '饮食运动备注'],
      focus: followup.focus || [],
    },
    recentChange: {
      date: '2026-05-25',
      doctor: plan.doctor || '林医生',
      items: [
        '更新本阶段血糖记录要求。',
        '下次随访前补齐近 7 天记录。',
      ],
    },
    guidanceNote: guidance && guidance.note ? guidance.note : plan.abnormalTips,
  };
}

Page({
  data: {
    pageState: 'loading',
    plan: null,
    planView: null,
    showQuestionModal: false,
    questionInput: '',
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadPlan();
  },

  loadPlan() {
    const plan = planStore.getPlan();
    if (!plan) {
      this.setData({ pageState: 'empty', plan: null, planView: null });
      return;
    }
    this.setData({
      plan,
      pageState: plan.patientStatus === 'pending_confirm' ? 'pending_confirm' : 'active',
      planView: buildPlanView(plan),
    });
  },

  onConfirmPlan() {
    wx.showModal({
      title: '确认开始执行',
      content: '确认后方案将进入执行中，今日任务会回到首页和我的任务页处理。',
      confirmText: '开始执行',
      cancelText: '再看看',
      success: res => {
        if (!res.confirm) return;
        planStore.confirmPlan();
        mockSession.setConfig({ planStatus: 'active' });
        this.loadPlan();
        wx.showToast({ title: '方案已确认', icon: 'success' });
      },
    });
  },

  onQuestionTap() {
    this.setData({ showQuestionModal: true });
  },

  onQuestionInput(e) {
    this.setData({ questionInput: e.detail.value });
  },

  onSubmitQuestion() {
    const text = this.data.questionInput.trim();
    if (!text) {
      wx.showToast({ title: '请输入疑问内容', icon: 'none' });
      return;
    }
    planStore.reportQuestion(text);
    this.setData({ showQuestionModal: false, questionInput: '' });
    wx.showToast({ title: '疑问已提交给医生', icon: 'success' });
  },

  onCloseQuestion() {
    this.setData({ showQuestionModal: false, questionInput: '' });
  },

  goPath(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) return;
    wx.navigateTo({ url: path });
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  goScreening() {
    wx.navigateTo({ url: '/pages/screening/index' });
  },

  onGoHistoryPlans() {
    wx.navigateTo({ url: '/pages/plan/history/index' });
  },

  noop() {},
});
