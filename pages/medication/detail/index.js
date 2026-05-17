Page({
  data: {
    filters: ['全部', '口服药', '吸入药', '氧疗', 'CPAP'],
    activeFilter: 0,
    tasks: [
      { time: '07:35', name: '二甲双胍缓释片', dose: '0.5g', status: '已服用', done: true, desc: '早餐后服用' },
      { time: '07:20', name: '缬沙坦片', dose: '80mg', status: '已服用', done: true, desc: '早餐前服用' },
      { time: '11:30', name: '格列美脲片', dose: '2mg', status: '待服用', done: false, desc: '午餐前服用' },
      { time: '夜间', name: 'CPAP 佩戴', dose: '5.8小时', status: '已完成', done: true, desc: '设备自动同步' }
    ]
  },
  selectFilter(event) {
    this.setData({ activeFilter: Number(event.currentTarget.dataset.index) })
  },
  checkIn() {
    wx.showToast({ title: '打卡成功', icon: 'success' })
  }
})
