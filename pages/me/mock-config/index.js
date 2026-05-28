const mockSession = require('../../../utils/mock-session');
const planStore = require('../../../utils/plan-store');

Page({
  data: {
    config: null,
    userStages: [
      { value: 'new', label: '新用户', desc: '未开始筛查，首页展示筛查引导' },
      { value: 'screening_draft', label: '已筛查未完成', desc: '存在筛查草稿，首页提示继续筛查' },
      { value: 'assessed', label: '筛查完成未管理', desc: '已完成筛查，但无医生确认方案' },
      { value: 'managed', label: '管理中', desc: '已有医生确认方案，首页展示管理工作台' },
    ],
    planStatuses: [
      { value: 'pending_confirm', label: '未确认', desc: '方案页展示待确认，首页出现确认任务' },
      { value: 'active', label: '已确认', desc: '方案页进入执行中，首页不再提示确认' },
    ],
  },

  onShow() {
    this.refreshConfig();
  },

  refreshConfig() {
    const config = mockSession.getConfig();
    const plan = planStore.getPlan();
    if (config.planStatus !== plan.patientStatus) {
      config.planStatus = plan.patientStatus;
      mockSession.setConfig({ planStatus: plan.patientStatus });
    }
    this.setData({ config });
  },

  setUserStage(e) {
    const { value } = e.currentTarget.dataset;
    const next = mockSession.setConfig({ userStage: value });
    this.setData({ config: next });
    wx.showToast({ title: '用户状态已更新', icon: 'success' });
  },

  setPlanStatus(e) {
    const { value } = e.currentTarget.dataset;
    planStore.setPlanStatus(value);
    const next = mockSession.setConfig({ planStatus: value });
    this.setData({ config: next });
    wx.showToast({ title: '方案状态已更新', icon: 'success' });
  },

  toggleRiskAlert(e) {
    const next = mockSession.setConfig({ showRiskAlert: e.detail.value });
    this.setData({ config: next });
  },

  toggleDeviceAbnormal(e) {
    const next = mockSession.setConfig({ deviceAbnormal: e.detail.value });
    this.setData({ config: next });
  },

  resetDemo() {
    const config = mockSession.resetConfig();
    planStore.setPlanStatus(config.planStatus);
    this.setData({ config });
    wx.showToast({ title: '已恢复默认演示', icon: 'success' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
