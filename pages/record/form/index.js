const metricConfig = {
  glucose: {
    title: '记录血糖',
    label: '血糖',
    tabs: ['空腹', '餐后', '随机', '睡前'],
    value: '5.0',
    unit: 'mmol/L',
    range: '正常范围：空腹 4.4-7.0 mmol/L',
    scenes: ['早餐前', '午餐前', '晚餐前', '运动后']
  },
  oxygen: {
    title: '记录血氧',
    label: '血氧',
    tabs: ['静息', '活动后', '睡前', '复测'],
    value: '98',
    unit: '%',
    range: '建议静息 SpO2 保持在 95% 以上',
    scenes: ['静息', '活动后', '睡前', '吸氧后']
  },
  pulse: {
    title: '记录脉率',
    label: '脉率',
    tabs: ['静息', '活动后', '睡前', '复测'],
    value: '72',
    unit: '次/分',
    range: '建议结合血氧和症状综合判断',
    scenes: ['静息', '活动后', '睡前', '吸氧后']
  },
  respiration: {
    title: '记录呼吸频率',
    label: '呼吸频率',
    tabs: ['静息', '活动后', '睡前', '复测'],
    value: '18',
    unit: '次/分',
    range: '静息状态下数 1 分钟胸腹起伏次数',
    scenes: ['静息', '活动后', '睡前']
  },
  blood_pressure: {
    title: '记录血压',
    label: '血压',
    tabs: ['晨起', '睡前', '复测', '其他'],
    value: '120/90',
    unit: 'mmHg',
    range: '建议控制在 140/90 mmHg 以下',
    scenes: ['晨起', '睡前', '服药前', '复测']
  }
}

Page({
  data: {
    config: metricConfig.glucose,
    activeTab: 0,
    activeScene: 0,
    ticks: [
      'mid', '', 'mid', 'large', 'mid', '', 'mid', 'large', 'mid', '', 'mid', 'large', 'mid', '', 'mid'
    ],
    date: '2026年5月17日',
    week: '周日',
    time: '08:30',
    remark: '今天没有明显不适，饮食正常。'
  },

  onLoad(options) {
    const type = options.type || 'glucose'
    this.setData({
      config: metricConfig[type] || metricConfig.glucose
    })
  },

  selectTab(event) {
    this.setData({ activeTab: Number(event.currentTarget.dataset.index) })
  },

  selectScene(event) {
    this.setData({ activeScene: Number(event.currentTarget.dataset.index) })
  },

  saveRecord() {
    wx.showToast({ title: '记录已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  },

  goBack() {
    wx.navigateBack()
  }
})
