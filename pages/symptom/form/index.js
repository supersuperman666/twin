const recordStore = require('../../../utils/record-store')
const symptomConfig = require('../../../utils/symptom-config')

function initSymptomGroups() {
  return symptomConfig.symptomGroups.map(group => ({
    ...group,
    items: group.items.map(item => ({ ...item, selected: false }))
  }))
}

function initAbnormalOptions() {
  return symptomConfig.accompaniedAbnormalOptions.map(item => ({
    ...item,
    selected: item.value === '不清楚'
  }))
}

function initMeasureOptions() {
  return symptomConfig.measuresTakenOptions.map(item => ({
    ...item,
    selected: item.value === '未处理'
  }))
}

function toggleExclusiveOption(options, selectedValue, isExclusive) {
  return options.map(item => {
    if (isExclusive) {
      return { ...item, selected: item.value === selectedValue }
    }
    if (item.exclusive) {
      return { ...item, selected: false }
    }
    return { ...item, selected: item.value === selectedValue ? !item.selected : item.selected }
  })
}

Page({
  data: {
    source: 'manual',
    has_discomfort: true,
    showDiscomfortFields: true,
    symptomGroups: initSymptomGroups(),
    selectedSymptomItems: [],
    severity: '',
    severity_code: '',
    occurred_date: '',
    occurred_time: '',
    duration: '',
    duration_code: '',
    accompaniedAbnormalOptions: initAbnormalOptions(),
    accompanied_abnormal: ['不清楚'],
    measuresTakenOptions: initMeasureOptions(),
    measures_taken: ['未处理'],
    remark: '',
    remark_length: 0,
    severityOptions: symptomConfig.severityOptions,
    durationOptions: symptomConfig.durationOptions,
    canSave: false,
    showRiskWarning: false,
    riskWarningText: '',
  },

  onLoad(options) {
    const now = new Date()
    this.setData({
      source: options.source || 'manual',
      occurred_date: recordStore.formatDateStr(now),
      occurred_time: recordStore.formatTimeStr(now),
    })
    this.validateForm()
  },

  toggleDiscomfort(event) {
    const value = event.currentTarget.dataset.value === 'true'
    this.setData({
      has_discomfort: value,
      showDiscomfortFields: value,
    })
    if (!value) {
      this.setData({
        selectedSymptomItems: [],
        severity: '',
        severity_code: '',
        duration: '',
        duration_code: '',
        symptomGroups: initSymptomGroups(),
      })
    }
    this.validateForm()
  },

  toggleSymptomItem(event) {
    const value = event.currentTarget.dataset.value
    let selectedItems = this.data.selectedSymptomItems.slice()
    const index = selectedItems.indexOf(value)
    if (index >= 0) {
      selectedItems.splice(index, 1)
    } else {
      if (selectedItems.length >= 8) {
        wx.showToast({ title: '建议只选择最明显的症状', icon: 'none' })
        return
      }
      selectedItems.push(value)
    }

    const symptomGroups = this.data.symptomGroups.map(group => ({
      ...group,
      items: group.items.map(item => ({
        ...item,
        selected: selectedItems.includes(item.value)
      }))
    }))

    this.setData({ selectedSymptomItems: selectedItems, symptomGroups })
    this.validateForm()
    this.checkRiskWarning()
  },

  selectSeverity(event) {
    const { value, label } = event.currentTarget.dataset
    this.setData({
      severity: label,
      severity_code: value,
    })
    this.validateForm()
    this.checkRiskWarning()
  },

  selectDuration(event) {
    const { value, label } = event.currentTarget.dataset
    this.setData({
      duration: label,
      duration_code: value,
    })
    this.checkRiskWarning()
  },

  toggleAbnormal(event) {
    const value = event.currentTarget.dataset.value
    const clickedItem = this.data.accompaniedAbnormalOptions.find(i => i.value === value)
    const isExclusive = clickedItem && clickedItem.exclusive
    let currentValues = this.data.accompanied_abnormal.slice()

    if (isExclusive) {
      currentValues = [value]
    } else {
      const idx = currentValues.indexOf(value)
      if (idx >= 0) {
        currentValues.splice(idx, 1)
      } else {
        currentValues = currentValues.filter(v => v !== '无' && v !== '不清楚')
        currentValues.push(value)
      }
    }

    const options = this.data.accompaniedAbnormalOptions.map(item => ({
      ...item,
      selected: currentValues.includes(item.value)
    }))

    this.setData({
      accompaniedAbnormalOptions: options,
      accompanied_abnormal: currentValues,
    })
  },

  toggleMeasure(event) {
    const value = event.currentTarget.dataset.value
    const clickedItem = this.data.measuresTakenOptions.find(i => i.value === value)
    const isExclusive = clickedItem && clickedItem.exclusive
    let currentValues = this.data.measures_taken.slice()

    if (isExclusive) {
      currentValues = [value]
    } else {
      const idx = currentValues.indexOf(value)
      if (idx >= 0) {
        currentValues.splice(idx, 1)
      } else {
        currentValues = currentValues.filter(v => v !== '未处理')
        currentValues.push(value)
      }
    }

    const options = this.data.measuresTakenOptions.map(item => ({
      ...item,
      selected: currentValues.includes(item.value)
    }))

    this.setData({
      measuresTakenOptions: options,
      measures_taken: currentValues,
    })
  },

  onDateChange(event) {
    this.setData({ occurred_date: event.detail.value })
  },

  onTimeChange(event) {
    this.setData({ occurred_time: event.detail.value })
  },

  onRemarkInput(event) {
    this.setData({
      remark: event.detail.value,
      remark_length: event.detail.value.length,
    })
  },

  validateForm() {
    let canSave
    if (!this.data.has_discomfort) {
      canSave = true
    } else {
      canSave = this.data.selectedSymptomItems.length > 0 && this.data.severity_code !== ''
    }
    this.setData({ canSave })
  },

  checkRiskWarning() {
    let showWarning = false
    let warningText = ''

    const items = this.data.selectedSymptomItems
    const severity = this.data.severity_code
    const durationCode = this.data.duration_code

    if (items.includes('胸痛') && severity === 'severe') {
      showWarning = true
      warningText = '如胸痛明显或持续加重，请及时联系医生或线下就医。'
    }
    if (durationCode === 'ongoing' && severity === 'severe') {
      showWarning = true
      warningText = '症状持续中且程度较重，建议尽快联系医生或线下就医。'
    }
    if (items.includes('气短') || items.includes('喘息') || items.includes('活动后气短')) {
      if (severity === 'severe' || severity === 'moderate') {
        showWarning = true
        warningText = warningText || '呼吸症状较明显，建议复测血氧并联系医生。'
      }
    }
    if (items.includes('心慌') || items.includes('出汗') || items.includes('手抖')) {
      if (severity === 'severe' || severity === 'moderate') {
        const latestGlucose = recordStore.getLatestRecord('glucose')
        if (latestGlucose && latestGlucose.value < 3.9) {
          showWarning = true
          warningText = warningText || '疑似低血糖症状，建议立即复测血糖并按医生建议处理。'
        }
      }
    }

    this.setData({ showRiskWarning: showWarning, riskWarningText: warningText })
  },

  saveRecord() {
    if (!this.data.canSave) {
      wx.showToast({ title: '请完成必填项', icon: 'none' })
      return
    }

    const record = this.buildRecord()
    recordStore.addRecord(record)
    wx.showToast({ title: '记录已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  },

  buildRecord() {
    const hasDiscomfort = this.data.has_discomfort
    const symptomItems = hasDiscomfort ? this.data.selectedSymptomItems : []
    const domains = hasDiscomfort ? symptomConfig.resolveDomains(symptomItems) : []
    const title = hasDiscomfort ? symptomConfig.generateTitle(symptomItems) : '今日无明显不适'
    const desc = hasDiscomfort ? symptomConfig.generateDesc(this.data.duration, this.data.measures_taken) : '用户主动记录暂无症状'
    const level = hasDiscomfort ? this.data.severity : '无症状'
    const recordedAt = `${this.data.occurred_date} ${this.data.occurred_time}`
    const sourceText = symptomConfig.sourceSceneMap[this.data.source] || '主动记录'

    return {
      metric_code: 'symptom',
      metric_name: '症状',
      has_discomfort: hasDiscomfort,
      symptom_items: symptomItems,
      symptom_domains: domains,
      severity: hasDiscomfort ? this.data.severity : '',
      severity_code: hasDiscomfort ? this.data.severity_code : '',
      occurred_date: this.data.occurred_date,
      occurred_time: this.data.occurred_time,
      duration: hasDiscomfort ? this.data.duration : '',
      duration_code: hasDiscomfort ? this.data.duration_code : '',
      accompanied_abnormal: hasDiscomfort ? this.data.accompanied_abnormal : [],
      measures_taken: hasDiscomfort ? this.data.measures_taken : [],
      source: this.data.source,
      source_text: sourceText,
      remark: this.data.remark,
      title,
      desc,
      level,
      recorded_at: recordedAt,
    }
  },
})