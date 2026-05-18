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
    timeModes: ['按年', '按月', '按日', '全部'],
    activeTimeMode: 1,
    filters: ['全部来源', '手动', '设备', '正常', '异常'],
    scenes: ['全部场景', '空腹', '餐后', '随机', '睡前'],
    activeFilter: 0,
    activeScene: 0,
    drawerVisible: false,
    selectedRecord: null,
    metric: 'glucose',
    summary: { total: 0, abnormal: 0, manual: 0, device: 0 },
    records: [],
    dayGroups: []
  },

  onLoad(options) {
    const metric = options.metric || 'glucose'
    this.setData({
      metric,
      title: pageTitles[metric] || '指标记录明细'
    })
    this.refreshRecords()
  },

  onShow() {
    this.refreshRecords()
  },

  refreshRecords() {
    const rawRecords = recordStore.listRecords({ metric: this.data.metric })
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

  mapHistoryRecord(item) {
    const titleSuffix = item.measure_point_name || item.scene || item.level || item.status_text || ''
    return {
      id: item.id,
      day: recordStore.formatDay(item),
      time: (recordStore.formatShortTime(item).split(' ')[1]) || '--',
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

  selectTimeMode(event) {
    this.setData({ activeTimeMode: Number(event.currentTarget.dataset.index) })
  },

  selectFilter(event) {
    this.setData({ activeFilter: Number(event.currentTarget.dataset.index) })
  },

  selectScene(event) {
    this.setData({ activeScene: Number(event.currentTarget.dataset.index) })
  },

  openDrawer(event) {
    const id = Number(event.currentTarget.dataset.id)
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
