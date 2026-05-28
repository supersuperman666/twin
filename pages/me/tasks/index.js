const interventionStore = require('../../../utils/intervention-store');

const actionMap = {
  recheck: { text: '去记录', url: '/pages/record/form/index?type=glucose&scene=recheck' },
  followup_prepare: { text: '查看准备', url: '/pages/followup/records/index' },
  scale: { text: '去填写', url: '/pages/scale/index/index' },
};

function decorateTask(item) {
  const action = actionMap[item.type] || { text: '查看详情', url: '' };
  return {
    ...item,
    actionText: action.text,
    actionUrl: action.url,
    canAction: !!action.url && item.statusKey !== 'done',
  };
}

Page({
  data: {
    todayTasks: [],
    overdueTasks: [],
    completedTasks: [],
    summary: {
      pending: 0,
      overdue: 0,
      completed: 0,
    },
    expandedId: '',
  },

  onShow() {
    const all = interventionStore.getTaskHistoryList();
    const todayTasks = all.filter(item => item.statusKey === 'active').map(decorateTask);
    const overdueTasks = all.filter(item => item.statusKey === 'expired').map(decorateTask);
    const completedTasks = all.filter(item => item.statusKey === 'done').map(decorateTask);
    this.setData({
      todayTasks,
      overdueTasks,
      completedTasks,
      summary: {
        pending: todayTasks.length,
        overdue: overdueTasks.length,
        completed: completedTasks.length,
      },
      expandedId: todayTasks[0] ? todayTasks[0].id : '',
    });
  },

  toggleCard(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ expandedId: this.data.expandedId === id ? '' : id });
  },

  handleTaskAction(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    wx.navigateTo({ url });
  },
});
