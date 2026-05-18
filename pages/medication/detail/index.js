const recordStore = require('../../../utils/record-store')

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
  onShow() {
    this.refreshTasks()
  },
  refreshTasks() {
    const records = recordStore.listRecords({ metric: 'medication' })
    if (!records.length) return
    this.setData({
      tasks: records.map((item) => ({
        time: (recordStore.formatShortTime(item).split(' ')[1]) || '--',
        name: item.name || item.metric_name,
        dose: item.dose || '',
        status: item.status_text || '已记录',
        done: item.status === 'done',
        desc: item.desc || item.remark || ''
      }))
    })
  },
  selectFilter(event) {
    this.setData({ activeFilter: Number(event.currentTarget.dataset.index) })
  },
  checkIn(event) {
    const index = Number(event.currentTarget.dataset.index || 0)
    const task = this.data.tasks[index] || this.data.tasks[0]
    recordStore.addRecord({
      metric_code: 'medication',
      metric_name: '用药',
      name: task.name,
      dose: task.dose,
      status: 'done',
      status_text: '已服用',
      desc: task.desc,
      recorded_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      source: 'manual',
      remark: ''
    })
    this.refreshTasks()
    wx.showToast({ title: '打卡成功', icon: 'success' })
  }
})
