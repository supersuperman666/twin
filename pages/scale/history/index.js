const scaleStore = require('../../../utils/scale-store');

Page({
  data: {
    records: [],
    filterTabs: [
      { key: 'all', label: '全部' },
      { key: 'cat', label: 'CAT' },
      { key: 'mmrc', label: 'mMRC' },
    ],
    activeFilter: 'all',
  },

  onLoad() {
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  loadRecords() {
    const rawRecords = scaleStore.loadRecords();
    const records = rawRecords
      .slice()
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
      .map(r => {
        let scoreDisplay = '';
        let levelName = '';
        let levelColor = '#8D99A8';
        let scaleName = '';
        let route = '';

        if (r.scaleCode === 'cat') {
          const result = scaleStore.computeCatResult(r.answers || {});
          scoreDisplay = String(result.total);
          levelName = result.levelName;
          levelColor = result.levelColor;
          scaleName = 'CAT 评估';
          route = `/pages/scale/cat-result/index?id=${r.id}`;
        } else if (r.scaleCode === 'mmrc') {
          const result = scaleStore.computeMmrcResult(r.answers || {});
          scoreDisplay = String(result.grade) + '级';
          levelName = result.levelName;
          levelColor = result.levelColor;
          scaleName = 'mMRC 评估';
          route = `/pages/scale/mmrc-result/index?id=${r.id}`;
        } else if (r.scaleCode === 'screening') {
          scoreDisplay = String(r.totalScore || 0);
          levelName = r.totalScore >= 85 ? '低风险' : r.totalScore >= 70 ? '中风险' : '高风险';
          levelColor = r.totalScore >= 85 ? '#10B981' : r.totalScore >= 70 ? '#F59E0B' : '#EF4444';
          scaleName = '健康筛查';
          route = '/pages/screening/index';
        }

        return {
          ...r,
          scoreDisplay,
          levelName,
          levelColor,
          scaleName,
          route,
          dateDisplay: (r.completedAt || '').slice(0, 10),
        };
      });

    this.setData({ records }, () => this.applyFilter());
  },

  applyFilter() {
    const { activeFilter, records } = this.data;
    const filtered = activeFilter === 'all'
      ? records
      : records.filter(r => r.scaleCode === activeFilter);
    this.setData({ filteredRecords: filtered });
  },

  onFilterTap(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ activeFilter: key }, () => this.applyFilter());
  },

  onRecordTap(e) {
    const { route } = e.currentTarget.dataset;
    if (route) {
      wx.navigateTo({ url: route });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});