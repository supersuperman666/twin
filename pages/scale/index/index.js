const scaleStore = require('../../../utils/scale-store');

Page({
  data: {
    scales: [],
  },

  onLoad() {
    this.loadScales();
  },

  onShow() {
    this.loadScales();
  },

  loadScales() {
    const catalog = scaleStore.SCALE_CATALOG;
    const scales = catalog.map(s => {
      const lastResult = scaleStore.getLatestRecord(s.code);
      let statusLabel = '未评估';
      let statusColor = '#8D99A8';
      let lastScoreText = '';
      let lastDate = '';
      if (lastResult) {
        if (s.code === 'cat') {
          const result = scaleStore.computeCatResult(lastResult.answers || {});
          statusLabel = result.levelName;
          statusColor = result.levelColor;
          lastScoreText = '得分 ' + result.total;
          lastDate = (lastResult.completedAt || '').slice(0, 10);
        } else if (s.code === 'mmrc') {
          const result = scaleStore.computeMmrcResult(lastResult.answers || {});
          statusLabel = result.levelName;
          statusColor = result.levelColor;
          lastScoreText = '分级 ' + result.grade;
          lastDate = (lastResult.completedAt || '').slice(0, 10);
        } else {
          statusLabel = '已完成';
          statusColor = '#10B981';
          lastScoreText = '得分 ' + lastResult.totalScore;
          lastDate = (lastResult.completedAt || '').slice(0, 10);
        }
      }
      return {
        ...s,
        statusLabel,
        statusColor,
        lastScoreText,
        lastDate,
        hasHistory: !!lastResult,
      };
    });
    this.setData({ scales });
  },

  onScaleTap(e) {
    const { code, route } = e.currentTarget.dataset;
    if (code === 'screening') {
      wx.navigateTo({ url: '/pages/screening/index' });
      return;
    }
    if (code === 'mmrc') {
      wx.navigateTo({ url: '/pages/scale/mmrc/index' });
      return;
    }
    if (route) {
      wx.navigateTo({ url: route });
      return;
    }
    wx.navigateTo({ url: '/pages/scale/cat/index' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/scale/history/index' });
  },
});