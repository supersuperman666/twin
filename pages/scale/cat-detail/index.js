const scaleStore = require('../../../utils/scale-store');

Page({
  data: {
    details: [],
    totalScore: 0,
    maxTotal: 40,
    levelName: '',
    levelColor: '',
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '缺少评估记录', icon: 'none' });
      return;
    }

    const records = scaleStore.loadRecords();
    const record = records.find(r => r.id === id);
    if (!record) {
      wx.showToast({ title: '评估记录不存在', icon: 'none' });
      return;
    }

    const result = scaleStore.computeCatResult(record.answers || {});

    this.setData({
      details: result.details,
      totalScore: result.total,
      maxTotal: result.maxTotal,
      levelName: result.levelName,
      levelColor: result.levelColor,
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },
});