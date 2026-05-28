const mockSession = require('../../../utils/mock-session');

Page({
  data: {
    config: null,
    userStages: [
      { value: 'new', label: '新用户', desc: '未开始筛查，首页展示筛查引导' },
      { value: 'screening_draft', label: '已筛查未完成', desc: '存在筛查草稿，首页提示继续筛查' },
      { value: 'assessed', label: '筛查完成', desc: '已完成筛查，等待医生管理' },
      { value: 'managed', label: '管理中', desc: '已在医生管理下，首页展示管理工作台' },
    ],
  },

  onShow() {
    this.refreshConfig();
  },

  refreshConfig() {
    const config = mockSession.getConfig();
    this.setData({ config });
  },

  setUserStage(e) {
    const { value } = e.currentTarget.dataset;
    const next = mockSession.setConfig({ userStage: value });
    this.setData({ config: next });
    wx.showToast({ title: '用户状态已更新', icon: 'success' });
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
    this.setData({ config });
    wx.showToast({ title: '已恢复默认演示', icon: 'success' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});