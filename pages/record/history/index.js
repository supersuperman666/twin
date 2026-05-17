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
    records: [
      {
        id: 1,
        day: '05.17 周日',
        time: '08:30',
        title: '血糖 · 空腹',
        value: '5.0',
        unit: 'mmol/L',
        status: '正常',
        source: '手动记录',
        sourceType: 'manual',
        device: '',
        remark: '早餐前测量，无明显低血糖症状',
        edited: '未修改'
      },
      {
        id: 2,
        day: '05.17 周日',
        time: '13:05',
        title: '血糖 · 餐后',
        value: '8.6',
        unit: 'mmol/L',
        status: '正常',
        source: '设备采集',
        sourceType: 'device',
        device: 'ZG-P11H-0021',
        remark: '午餐后 2 小时自动同步',
        edited: '设备原始数据'
      },
      {
        id: 3,
        day: '05.16 周六',
        time: '21:20',
        title: '血糖 · 睡前',
        value: '7.8',
        unit: 'mmol/L',
        status: '正常',
        source: '手动记录',
        sourceType: 'manual',
        device: '',
        remark: '晚餐后散步 30 分钟',
        edited: '已修改'
      }
    ],
    dayGroups: []
  },

  onLoad(options) {
    const metric = options.metric || 'glucose'
    this.setData({
      title: pageTitles[metric] || '指标记录明细',
      dayGroups: [
        { day: '05.17 周日', count: 2, items: this.data.records.slice(0, 2) },
        { day: '05.16 周六', count: 1, items: this.data.records.slice(2) }
      ]
    })
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
