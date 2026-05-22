const interventionStore = require('../../../utils/intervention-store');

Page({
  data: {
    pendingList: [],
    completedList: [],
    expandedId: '',
    prepareStatusMap: {},
  },

  onLoad(options) {
    this.highlightId = options.highlight || '';
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const { pending, completed } = interventionStore.splitFollowupsByState();
    const prepareStatusMap = {};
    pending.concat(completed).forEach(item => {
      const status = interventionStore.computeFollowupPrepareStatus(item.id);
      prepareStatusMap[item.id] = status;
    });
    const expandedId = this.highlightId || (pending[0] ? pending[0].id : '');
    this.setData({ pendingList: pending, completedList: completed, prepareStatusMap, expandedId });
    this.highlightId = '';
  },

  toggleCard(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ expandedId: this.data.expandedId === id ? '' : id });
  },

  onUploadReport(e) {
    const { id } = e.currentTarget.dataset;
    interventionStore.markFollowupReportUploaded(id);
    wx.showToast({ title: '已模拟上传', icon: 'success' });
    this.loadData();
  },

  onFillScale(e) {
    const { id, code } = e.currentTarget.dataset;
    interventionStore.markFollowupScaleDone(id, code);
    wx.showToast({ title: '已模拟完成', icon: 'success' });
    this.loadData();
  },
});
