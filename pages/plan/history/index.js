const planStore = require('../../../utils/plan-store');

Page({
  data: {
    plans: [],
    expandedId: '',
  },

  onShow() {
    const plans = planStore.getHistoryPlans();
    this.setData({ plans, expandedId: plans[0] ? plans[0].id : '' });
  },

  toggleCard(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ expandedId: this.data.expandedId === id ? '' : id });
  },
});
