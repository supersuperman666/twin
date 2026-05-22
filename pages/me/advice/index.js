const interventionStore = require('../../../utils/intervention-store');

Page({
  data: {
    adviceList: [],
    expandedId: '',
  },

  onShow() {
    this.setData({ adviceList: interventionStore.getHistoricalAdviceList() });
  },

  toggleCard(e) {
    const { id } = e.currentTarget.dataset;
    const advice = interventionStore.getAdviceById(id);
    if (advice && advice.status === 'sent') {
      interventionStore.markAdviceRead(id);
    }
    this.setData({
      adviceList: interventionStore.getHistoricalAdviceList(),
      expandedId: this.data.expandedId === id ? '' : id,
    });
  },
});
