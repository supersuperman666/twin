const interventionStore = require('../../../utils/intervention-store');

Page({
  data: {
    followup: null,
    normalItems: [],
    specialItems: [],
    prepareStatus: 'pending',
    prepareLabel: '待准备',
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '随访信息不存在', icon: 'none' });
      return;
    }
    this.loadData(id);
  },

  loadData(id) {
    const followup = interventionStore.getFollowupById(id);
    if (!followup) {
      wx.showToast({ title: '随访信息不存在', icon: 'none' });
      return;
    }

    const { normalItems, specialItems, prepareStatus } = interventionStore.computeFollowupPrepareStatus(id);

    const prepareLabelMap = {
      pending: '待准备',
      partial: '已部分完成',
      ready: '已准备',
    };

    this.setData({
      followup,
      normalItems,
      specialItems,
      prepareStatus,
      prepareLabel: prepareLabelMap[prepareStatus] || '待准备',
    });
  },

  onUploadReport() {
    const id = this.data.followup.id;
    interventionStore.markFollowupReportUploaded(id);
    wx.showToast({ title: '上传功能演示中', icon: 'none' });
    this.loadData(id);
  },

  onFillScale(e) {
    const scaleCode = e.currentTarget.dataset.code;
    const id = this.data.followup.id;
    interventionStore.markFollowupScaleDone(id, scaleCode);
    wx.showToast({ title: '量表填写功能演示中', icon: 'none' });
    this.loadData(id);
  },

  onBack() {
    wx.navigateBack();
  },
});