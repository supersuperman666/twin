const interventionStore = require('../../../utils/intervention-store');

Page({
  data: {
    pendingTasks: [],
    historyTasks: [],
    expandedId: '',
  },

  onShow() {
    const all = interventionStore.getTaskHistoryList();
    const pendingTasks = all.filter(item => item.statusKey === 'active');
    const historyTasks = all.filter(item => item.statusKey !== 'active');
    this.setData({ pendingTasks, historyTasks, expandedId: pendingTasks[0] ? pendingTasks[0].id : '' });
  },

  toggleCard(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ expandedId: this.data.expandedId === id ? '' : id });
  },
});
