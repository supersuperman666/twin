const recordStore = require('../../../utils/record-store')

const pageTitles = {
  glucose: '血糖记录明细',
  oxygen: '血氧记录明细',
  blood_pressure: '血压记录明细',
  symptom: '症状记录明细',
  medication: '用药记录明细'
}

Page({
  data: {
    title: '血糖记录明细',
    startDate: '',
    endDate: '',
    dateRangeText: '',
    drawerVisible: false,
    selectedRecord: null,
    metric: 'glucose',
    summary: { total: 0, abnormal: 0, manual: 0, device: 0 },
    records: [],
    dayGroups: []
  },

  onLoad(options) {
    const metric = options.metric || 'glucose'
    const title = pageTitles[metric] || '指标记录明细'
    const range = this.getDefaultRange()
    wx.setNavigationBarTitle({ title })
    this.setData({
      metric,
      title,
      startDate: range.startDate,
      endDate: range.endDate,
      dateRangeText: `${range.startDate} 至 ${range.endDate}`
    })
    this.refreshRecords()
  },

  onShow() {
    this.refreshRecords()
  },

  refreshRecords() {
    const rawRecords = recordStore.listRecords({ metric: this.data.metric })
      .filter((item) => this.inDateRange(item.recorded_at))
    const records = rawRecords.map((item) => this.mapHistoryRecord(item))
    const groups = records.reduce((result, item) => {
      const existed = result.find((group) => group.day === item.day)
      if (existed) {
        existed.items.push(item)
        existed.count += 1
        return result
      }
      result.push({ day: item.day, count: 1, items: [item] })
      return result
    }, [])
    this.setData({
      records,
      dayGroups: groups,
      summary: {
        total: records.length,
        abnormal: rawRecords.filter((item) => item.status && item.status !== 'normal' && item.status !== 'done').length,
        manual: rawRecords.filter((item) => item.source !== 'device').length,
        device: rawRecords.filter((item) => item.source === 'device').length
      }
    })
  },

  getDefaultRange() {
    const end = new Date()
    const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)
    return {
      startDate: this.formatDate(start),
      endDate: this.formatDate(end)
    }
  },

  formatDate(date) {
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
  },

  parseDate(value) {
    return new Date(`${value} 00:00:00`.replace(/-/g, '/'))
  },

  formatGroupDay(recordedAt) {
    if (!recordedAt) return '--'
    const date = this.parseDate(recordedAt.slice(0, 10))
    const shortDay = recordedAt.replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$2.$3')
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
    return `${shortDay} ${week}`
  },

  inDateRange(recordedAt) {
    if (!recordedAt) return false
    const recordDate = this.parseDate(recordedAt.slice(0, 10)).getTime()
    const start = this.parseDate(this.data.startDate).getTime()
    const end = this.parseDate(this.data.endDate).getTime() + 24 * 60 * 60 * 1000 - 1
    return recordDate >= start && recordDate <= end
  },

  normalizeRange(startDate, endDate, changedField) {
    let start = this.parseDate(startDate)
    let end = this.parseDate(endDate)
    const day = 24 * 60 * 60 * 1000

    if (start.getTime() > end.getTime()) {
      if (changedField === 'start') end = start
      else start = end
    }

    if ((end.getTime() - start.getTime()) / day > 29) {
      wx.showToast({ title: '最多查看30天数据', icon: 'none' })
      if (changedField === 'start') {
        end = new Date(start.getTime() + 29 * day)
      } else {
        start = new Date(end.getTime() - 29 * day)
      }
    }

    return {
      startDate: this.formatDate(start),
      endDate: this.formatDate(end)
    }
  },

  onStartDateChange(event) {
    const range = this.normalizeRange(event.detail.value, this.data.endDate, 'start')
    this.setData({
      ...range,
      dateRangeText: `${range.startDate} 至 ${range.endDate}`
    })
    this.refreshRecords()
  },

  onEndDateChange(event) {
    const range = this.normalizeRange(this.data.startDate, event.detail.value, 'end')
    this.setData({
      ...range,
      dateRangeText: `${range.startDate} 至 ${range.endDate}`
    })
    this.refreshRecords()
  },

  mapHistoryRecord(item) {
    const titleSuffix = item.measure_point_name || item.scene || item.level || item.status_text || ''
    return {
      id: item.id,
      day: this.formatGroupDay(item.recorded_at),
      time: (recordStore.formatShortTime(item).split(' ')[1]) || '--',
      fullTime: item.recorded_at || '--',
      title: titleSuffix ? `${item.metric_name} · ${titleSuffix}` : item.metric_name,
      value: item.value || item.title || item.name || '--',
      unit: item.unit || '',
      status: item.status_text || item.level || '已记录',
      source: recordStore.sourceText(item.source),
      sourceType: item.source || 'manual',
      device: item.device || '',
      remark: item.remark || item.desc || '',
      edited: item.source === 'device' ? '设备原始数据' : '未修改'
    }
  },

  openDrawer(event) {
    const id = event.currentTarget.dataset.id
    const selectedRecord = this.data.records.find((item) => item.id === id)
    this.setData({ selectedRecord, drawerVisible: true })
  },

  closeDrawer() {
    this.setData({ drawerVisible: false })
  },

  noop() {},

  handlePrimaryAction() {
    const record = this.data.selectedRecord || {}
    wx.showToast({
      title: record.sourceType === 'device' ? '可添加备注或重新同步' : '进入编辑记录',
      icon: 'none'
    })
  },

  handleDangerAction() {
    const record = this.data.selectedRecord || {}
    wx.showModal({
      title: record.sourceType === 'device' ? '标记为无效？' : '删除记录？',
      content: record.sourceType === 'device' ? '设备原始数据不会被删除，仅标记为无效。' : '删除后不可恢复，请确认。',
      confirmText: record.sourceType === 'device' ? '标记无效' : '删除',
      confirmColor: '#ef4444'
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
