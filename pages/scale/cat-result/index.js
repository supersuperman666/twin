const scaleStore = require('../../../utils/scale-store');

Page({
  data: {
    result: null,
    totalScore: 0,
    maxTotal: 40,
    levelName: '',
    levelColor: '',
    levelDesc: '',
    barSegments: [],
    activeBarIndex: 0,
    goldGroup: '',
    goldAdvice: '',
    mcidNote: '',
    recordId: '',
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '缺少评估记录', icon: 'none' });
      return;
    }

    // Load record from store
    const records = scaleStore.loadRecords();
    const record = records.find(r => r.id === id);
    if (!record) {
      wx.showToast({ title: '评估记录不存在', icon: 'none' });
      return;
    }

    // Recompute result from saved answers
    const result = scaleStore.computeCatResult(record.answers || {});
    const barSegments = [
      { label: '轻微', min: 0, max: 10, color: '#10B981', width: '25%' },
      { label: '中等', min: 11, max: 20, color: '#F59E0B', width: '25%' },
      { label: '严重', min: 21, max: 30, color: '#EF4444', width: '25%' },
      { label: '极严重', min: 31, max: 40, color: '#7C1D1D', width: '25%' },
    ];
    const activeBarIndex = barSegments.findIndex(s => result.total >= s.min && result.total <= s.max);

    this.setData({
      result,
      totalScore: result.total,
      maxTotal: result.maxTotal,
      levelName: result.levelName,
      levelColor: result.levelColor,
      levelDesc: result.levelDesc,
      barSegments,
      activeBarIndex,
      goldGroup: result.goldGroup,
      goldAdvice: result.goldAdvice,
      mcidNote: result.mcidNote,
      recordId: id,
    });
  },

  goDetail() {
    wx.navigateTo({ url: `/pages/scale/cat-detail/index?id=${this.data.recordId}` });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/scale/history/index' });
  },
});