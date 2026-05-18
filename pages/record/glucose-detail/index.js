const recordStore = require('../../../utils/record-store')

Page({
  data: {
    tabs: ['全部', '空腹', '餐后2h', '随机', '睡前'],
    activeTab: 0,
    latest: { value: '--', unit: 'mmol/L', scene: '暂无', status: '暂无', time: '--', desc: '新增血糖记录后这里会自动更新。' },
    summary: { avg: '--', max: '--', rate: '--' },
    records: []
  },

  onShow() {
    this.refreshRecords()
  },

  refreshRecords() {
    const records = recordStore.listRecords({ metric: 'glucose' })
    const latest = records[0] || null
    const values = records.map((item) => Number(item.value)).filter((item) => !Number.isNaN(item))
    const normalCount = records.filter((item) => item.status === 'normal').length
    this.setData({
      latest: latest ? {
        value: latest.value,
        unit: latest.unit,
        scene: latest.measure_point_name || '随机',
        status: latest.status_text || '正常',
        time: recordStore.formatShortTime(latest),
        desc: latest.status === 'normal' ? '近期血糖暂无连续异常。' : '本次记录异常，建议结合症状复测。'
      } : null,
      summary: {
        avg: values.length ? (values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(1) : '--',
        max: values.length ? Math.max(...values).toFixed(1) : '--',
        rate: records.length ? `${Math.round((normalCount / records.length) * 100)}%` : '--'
      },
      records: records.slice(0, 3).map((item) => ({
        time: recordStore.formatShortTime(item),
        value: `${item.value} ${item.unit}`,
        scene: item.measure_point_name || '随机',
        status: item.status_text || '正常'
      }))
    })
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
