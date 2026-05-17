Page({
  data: {
    tabs: ['全部', '静息', '活动后', '睡前'],
    activeTab: 0,
    records: [
      { time: '05.17 08:30', value: 'SpO2 98% · 脉率 72次/分', scene: '静息', status: '正常' },
      { time: '05.16 21:20', value: 'SpO2 94% · 脉率 78次/分', scene: '睡前', status: '偏低' }
    ]
  },

  selectTab(event) {
    this.setData({ activeTab: Number(event.currentTarget.dataset.index) })
  },

  goForm() {
    wx.navigateTo({ url: '/pages/record/form/index?type=oxygen' })
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/record/history/index?metric=oxygen' })
  },

  goDevice() {
    wx.navigateTo({ url: '/pages/device/index/index?type=oxygen' })
  },

  goBack() {
    wx.navigateBack()
  }
})
