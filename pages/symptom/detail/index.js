const recordStore = require('../../../utils/record-store')

Page({
  data: {
    categories: ['全部', '呼吸相关', '睡眠相关', '血糖相关'],
    activeCategory: 0,
    records: []
  },
  onShow() {
    this.refreshRecords()
  },
  refreshRecords() {
    const records = recordStore.listRecords({ metric: 'symptom' }).map((item) => ({
      time: recordStore.formatShortTime(item),
      title: item.title || '无明显不适',
      desc: item.desc || item.remark || '已记录',
      level: item.level || '已记录'
    }))
    this.setData({ records })
  },
  selectCategory(event) {
    this.setData({ activeCategory: Number(event.currentTarget.dataset.index) })
  },
  markNoSymptom() {
    recordStore.addRecord({
      metric_code: 'symptom',
      metric_name: '症状',
      title: '今日无明显不适',
      desc: '用户主动记录暂无症状',
      level: '无症状',
      recorded_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      source: 'manual',
      remark: ''
    })
    this.refreshRecords()
    wx.showToast({ title: '已记录今日无不适', icon: 'none' })
  }
})
