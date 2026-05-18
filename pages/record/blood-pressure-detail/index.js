const recordStore = require('../../../utils/record-store')

Page({
  data: {
    latest: { value: '--', unit: 'mmHg', scene: '暂无', status: '暂无', time: '--' },
    summary: { avg: '--', max: '--', abnormal: '0次' },
    records: []
  },
  onShow() {
    this.refreshRecords()
  },
  refreshRecords() {
    const records = recordStore.listRecords({ metric: 'blood_pressure' })
    const latest = records[0] || null
    const systolic = records.map((item) => Number(item.systolic || `${item.value}`.split('/')[0])).filter((item) => !Number.isNaN(item))
    const diastolic = records.map((item) => Number(item.diastolic || `${item.value}`.split('/')[1])).filter((item) => !Number.isNaN(item))
    this.setData({
      latest: latest ? {
        value: latest.value,
        unit: latest.unit,
        scene: latest.scene || '晨起',
        status: latest.status_text || '正常',
        time: recordStore.formatShortTime(latest)
      } : null,
      summary: {
        avg: systolic.length && diastolic.length
          ? `${Math.round(systolic.reduce((sum, item) => sum + item, 0) / systolic.length)}/${Math.round(diastolic.reduce((sum, item) => sum + item, 0) / diastolic.length)}`
          : '--',
        max: systolic.length && diastolic.length ? `${Math.max(...systolic)}/${Math.max(...diastolic)}` : '--',
        abnormal: `${records.filter((item) => item.status !== 'normal').length}次`
      },
      records: records.slice(0, 4).map((item) => ({
        time: recordStore.formatShortTime(item),
        value: `${item.value} ${item.unit}`,
        scene: item.scene || '晨起',
        status: item.status_text || '正常'
      }))
    })
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
