Page({
  data: {
    records: [
      { time: '05.17 08:10', value: '120/90 mmHg', scene: '晨起', status: '正常' },
      { time: '05.16 22:21', value: '132/84 mmHg', scene: '睡前', status: '正常' }
    ]
  },
  goForm() {
    wx.navigateTo({ url: '/pages/record/form/index?type=blood_pressure' })
  },
  goHistory() {
    wx.navigateTo({ url: '/pages/record/history/index?metric=blood_pressure' })
  },
  goBack() {
    wx.navigateBack()
  }
})
