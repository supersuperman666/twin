const scaleStore = require('../../../utils/scale-store');

Page({
  data: {
    grade: 0,
    levelName: '',
    levelColor: '',
    levelDesc: '',
    selectedLabel: '',
    goldGroup: '',
    goldAdvice: '',
    barSegments: [],
    activeBarIndex: 0,
    recordId: '',
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

    const result = scaleStore.computeMmrcResult(record.answers || {});

    const barSegments = [
      { label: '0', min: 0, max: 0, color: '#10B981', width: '20%' },
      { label: '1', min: 1, max: 1, color: '#10B981', width: '20%' },
      { label: '2', min: 2, max: 2, color: '#F59E0B', width: '20%' },
      { label: '3', min: 3, max: 3, color: '#EF4444', width: '20%' },
      { label: '4', min: 4, max: 4, color: '#EF4444', width: '20%' },
    ];
    const activeBarIndex = result.grade;

    const goldAdvice = result.grade >= 2
      ? '属于 GOLD 高症状组，建议与医生讨论是否需要加强症状管理。'
      : '属于 GOLD 低症状组，当前症状管理可以维持。';

    this.setData({
      grade: result.grade,
      levelName: result.levelName,
      levelColor: result.levelColor,
      levelDesc: result.levelDesc,
      selectedLabel: result.selectedLabel,
      goldGroup: result.goldGroup,
      goldAdvice,
      barSegments,
      activeBarIndex,
      recordId: id,
    });
  },

  goDetail() {
    wx.navigateTo({ url: `/pages/scale/mmrc-detail/index?id=${this.data.recordId}` });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },
});