Page({
  data: {
    filters: ['全部报告', '正常', '轻度风险', '无效'],
    activeFilter: 0,
    reports: [
      { date: '05.17 周日', range: '22:48-06:20', device: 'ZG-M11A-0008', status: '轻度风险', warn: true, sleep: '6.5h', ahi: '3.2', spo2: '88%', low: '12分' },
      { date: '05.16 周六', range: '23:10-06:42', device: 'ZG-M11A-0008', status: '正常', sleep: '6.9h', ahi: '2.6', spo2: '92%', low: '0分' }
    ]
  },
  selectFilter(event) {
    this.setData({ activeFilter: Number(event.currentTarget.dataset.index) })
  },
  goReport() {
    wx.navigateTo({ url: '/pages/sleep/report/index' })
  },
  goBack() {
    wx.navigateBack()
  }
})
