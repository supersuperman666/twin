const recordStore = require('../../../utils/record-store')

Page({
  data: {
    tabs: ['全部', '静息', '活动后', '睡前'],
    activeTab: 0,
    latest: { value: '--', unit: '%', scene: '暂无', status: '暂无', time: '--', pulse: '--' },
    summary: { avg: '--', min: '--', low: '0次' },
    records: []
  },

  onShow() {
    this.refreshRecords()
  },

  refreshRecords() {
    const oxygenRecords = recordStore.listRecords({ metric: 'oxygen' })
    const pulseLatest = recordStore.getLatestRecord('pulse')
    const latest = oxygenRecords[0] || null
    const values = oxygenRecords.map((item) => Number(item.value)).filter((item) => !Number.isNaN(item))
    this.setData({
      latest: latest ? {
        value: latest.value,
        unit: latest.unit,
        scene: latest.scene || '静息',
        status: latest.status_text || '正常',
        time: recordStore.formatShortTime(latest),
        pulse: pulseLatest ? `${pulseLatest.value} ${pulseLatest.unit}` : '--'
      } : null,
      summary: {
        avg: values.length ? `${Math.round(values.reduce((sum, item) => sum + item, 0) / values.length)}%` : '--',
        min: values.length ? `${Math.min(...values)}%` : '--',
        low: `${oxygenRecords.filter((item) => Number(item.value) < 90).length}次`
      },
      records: oxygenRecords.slice(0, 4).map((item) => ({
        time: recordStore.formatShortTime(item),
        value: `SpO2 ${item.value}${item.unit}`,
        scene: item.scene || '静息',
        status: item.status_text || '正常'
      }))
    })
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
