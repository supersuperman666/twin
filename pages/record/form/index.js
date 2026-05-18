const glucosePoints = [
  { key: 'dawn', name: '凌晨', min: 3.9, max: 7.8 },
  { key: 'fasting', name: '空腹', min: 4.4, max: 7.0 },
  { key: 'breakfast_2h', name: '早餐后', sub: '2小时', min: 4.4, max: 10.0 },
  { key: 'before_lunch', name: '午餐前', min: 4.4, max: 7.0 },
  { key: 'lunch_2h', name: '午餐后', sub: '2小时', min: 4.4, max: 10.0 },
  { key: 'before_dinner', name: '晚餐前', min: 4.4, max: 7.0 },
  { key: 'dinner_2h', name: '晚餐后', sub: '2小时', min: 4.4, max: 10.0 },
  { key: 'bedtime', name: '睡前', min: 6.1, max: 7.8 },
  { key: 'random', name: '随机', min: 4.4, max: 10.0 }
]

const metricConfig = {
  oxygen: {
    title: '记录血氧',
    label: '血氧',
    tabs: ['静息', '活动后', '睡前', '复测'],
    value: 98,
    unit: '%',
    min: 70,
    max: 100,
    step: 1,
    range: '建议静息 SpO2 保持在 95% 以上'
  },
  pulse: {
    title: '记录脉率',
    label: '脉率',
    tabs: ['静息', '活动后', '睡前', '复测'],
    value: 72,
    unit: '次/分',
    min: 30,
    max: 220,
    step: 1,
    range: '建议结合血氧和症状综合判断'
  },
  respiration: {
    title: '记录呼吸频率',
    label: '呼吸频率',
    tabs: ['静息', '活动后', '睡前', '复测'],
    value: 18,
    unit: '次/分',
    min: 8,
    max: 40,
    step: 1,
    range: '静息状态下数 1 分钟胸腹起伏次数'
  },
  blood_pressure: {
    title: '记录血压',
    label: '收缩压',
    tabs: ['晨起', '睡前', '复测', '其他'],
    value: 120,
    unit: 'mmHg',
    min: 70,
    max: 220,
    step: 1,
    range: '建议控制在 140/90 mmHg 以下'
  }
}

function pad(value) {
  return `${value}`.padStart(2, '0')
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function normalizeNumber(value, min, max, step = 1) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return min
  const decimal = `${step}`.split('.')[1]
  const precision = decimal ? decimal.length : 0
  const stepped = Math.round(parsed / step) * step
  return Math.min(max, Math.max(min, Number(stepped.toFixed(precision))))
}

function getDefaultPointKey(date) {
  const hour = date.getHours()
  if (hour >= 0 && hour < 5) return 'dawn'
  if (hour >= 5 && hour < 9) return 'fasting'
  if (hour >= 9 && hour < 11) return 'breakfast_2h'
  if (hour >= 11 && hour < 13) return 'before_lunch'
  if (hour >= 13 && hour < 16) return 'lunch_2h'
  if (hour >= 16 && hour < 19) return 'before_dinner'
  if (hour >= 19 && hour < 22) return 'dinner_2h'
  if (hour >= 22) return 'bedtime'
  return 'random'
}

Page({
  data: {
    metricType: 'glucose',
    config: metricConfig.oxygen,
    activeTab: 0,
    glucosePoints: glucosePoints.map((item) => ({
      ...item,
      minText: item.min.toFixed(1),
      maxText: item.max.toFixed(1)
    })),
    glucoseTicks: Array.from({ length: 33 }, (_, index) => {
      if (index % 8 === 0) return 'large'
      if (index % 4 === 0) return 'mid'
      return ''
    }),
    glucoseMin: 3,
    glucoseMax: 20,
    glucoseStep: 0.1,
    glucoseValue: 6.6,
    glucoseValueText: '6.6',
    activePointKey: 'random',
    currentPoint: glucosePoints[8],
    glucoseStatus: { text: '达标', level: 'normal' },
    genericValue: 98,
    dateValue: '',
    timeValue: '',
    remark: '',
    remarkLength: 0
  },

  onLoad(options) {
    const now = new Date()
    const type = options.type || 'glucose'
    const activePointKey = getDefaultPointKey(now)
    const currentPoint = this.getPoint(activePointKey)

    if (type === 'glucose') {
      wx.setNavigationBarTitle({ title: '添加血糖记录' })
      this.setData({
        metricType: 'glucose',
        dateValue: formatDate(now),
        timeValue: formatTime(now),
        activePointKey,
        currentPoint,
        glucoseStatus: this.getGlucoseStatus(this.data.glucoseValue, currentPoint)
      })
      return
    }

    const config = metricConfig[type] || metricConfig.oxygen
    wx.setNavigationBarTitle({ title: config.title })
    this.setData({
      metricType: type,
      config,
      genericValue: config.value,
      dateValue: formatDate(now),
      timeValue: formatTime(now)
    })
  },

  getPoint(key) {
    const point = glucosePoints.find((item) => item.key === key) || glucosePoints[8]
    return {
      ...point,
      minText: point.min.toFixed(1),
      maxText: point.max.toFixed(1)
    }
  },

  getGlucoseStatus(value, point) {
    if (value < 3.9) return { text: '偏低', level: 'low' }
    if (value < point.min) return { text: '偏低', level: 'low' }
    if (point.key === 'random' && value >= 11.1) return { text: '明显偏高', level: 'high' }
    if (value > point.max) return { text: '偏高', level: 'high' }
    return { text: '达标', level: 'normal' }
  },

  setGlucoseValue(value, options = {}) {
    const glucoseValue = normalizeNumber(value, this.data.glucoseMin, this.data.glucoseMax, this.data.glucoseStep)
    const nextData = {
      glucoseValue,
      glucoseStatus: this.getGlucoseStatus(glucoseValue, this.data.currentPoint)
    }
    if (!options.keepInputText) nextData.glucoseValueText = glucoseValue.toFixed(1)
    this.setData(nextData)
  },

  selectGlucosePoint(event) {
    const activePointKey = event.currentTarget.dataset.key
    const currentPoint = this.getPoint(activePointKey)
    this.setData({
      activePointKey,
      currentPoint,
      glucoseStatus: this.getGlucoseStatus(this.data.glucoseValue, currentPoint)
    })
  },

  onGlucoseSliderChanging(event) {
    this.setGlucoseValue(event.detail.value)
  },

  onGlucoseSliderChange(event) {
    this.setGlucoseValue(event.detail.value)
  },

  onGlucoseInput(event) {
    const value = event.detail.value
    this.setData({ glucoseValueText: value })
    if (/^\d{1,2}(\.\d)?$/.test(value)) {
      this.setGlucoseValue(value, { keepInputText: true })
    }
  },

  normalizeGlucoseInput() {
    this.setGlucoseValue(this.data.glucoseValueText)
  },

  selectTab(event) {
    this.setData({ activeTab: Number(event.currentTarget.dataset.index) })
  },

  onGenericSlider(event) {
    this.setData({ genericValue: normalizeNumber(event.detail.value, this.data.config.min, this.data.config.max, this.data.config.step) })
  },

  onGenericInput(event) {
    this.setData({ genericValue: normalizeNumber(event.detail.value, this.data.config.min, this.data.config.max, this.data.config.step) })
  },

  onDateChange(event) {
    this.setData({ dateValue: event.detail.value })
  },

  onTimeChange(event) {
    this.setData({ timeValue: event.detail.value })
  },

  onRemarkInput(event) {
    this.setData({
      remark: event.detail.value,
      remarkLength: event.detail.value.length
    })
  },

  saveRecord() {
    const record = this.buildRecord()
    const records = wx.getStorageSync('healthMetricRecords') || []
    wx.setStorageSync('healthMetricRecords', [record, ...records])
    wx.showToast({ title: '记录已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  },

  buildRecord() {
    if (this.data.metricType === 'glucose') {
      return {
        id: `manual_glucose_${Date.now()}`,
        metric_code: 'glucose',
        metric_name: '血糖',
        value: this.data.glucoseValue,
        unit: 'mmol/L',
        measure_point: this.data.activePointKey,
        measure_point_name: this.data.currentPoint.sub
          ? `${this.data.currentPoint.name}${this.data.currentPoint.sub}`
          : this.data.currentPoint.name,
        target_min: this.data.currentPoint.min,
        target_max: this.data.currentPoint.max,
        status: this.data.glucoseStatus.level,
        status_text: this.data.glucoseStatus.text,
        recorded_at: `${this.data.dateValue} ${this.data.timeValue}`,
        source: 'manual',
        remark: this.data.remark,
        created_at: new Date().toISOString()
      }
    }

    return {
      id: `manual_${this.data.metricType}_${Date.now()}`,
      metric_code: this.data.metricType,
      metric_name: this.data.config.label,
      value: this.data.genericValue,
      unit: this.data.config.unit,
      scene: this.data.config.tabs[this.data.activeTab],
      recorded_at: `${this.data.dateValue} ${this.data.timeValue}`,
      source: 'manual',
      remark: this.data.remark,
      created_at: new Date().toISOString()
    }
  }
})
