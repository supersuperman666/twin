Page({
  data: {
    tabs: ['全部', '空腹', '餐后', '随机'],
    activeTab: 0,
    records: [
      { time: '05.17 08:30', value: '5.0 mmol/L', scene: '空腹', status: '正常' },
      { time: '05.16 21:20', value: '7.8 mmol/L', scene: '睡前', status: '正常' },
      { time: '05.15 13:05', value: '8.6 mmol/L', scene: '餐后', status: '正常' }
    ]
  },

  selectTab(event) {
    this.setData({ activeTab: Number(event.currentTarget.dataset.index) })
  },

  goForm() {
    wx.navigateTo({ url: '/pages/record/form/index?type=glucose' })
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/record/history/index?metric=glucose' })
  },

  goBack() {
    wx.navigateBack()
  }
})
