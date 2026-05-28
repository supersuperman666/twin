const recordStore = require('../../../utils/record-store')
const symptomConfig = require('../../../utils/symptom-config')

Page({
  data: {
    categories: symptomConfig.getFilterCategories(),
    activeCategory: 0,
    records: [],
    todayStatus: null,
    trendSummary: null,
  },

  onShow() {
    this.refreshAll()
  },

  refreshAll() {
    const todayStatus = recordStore.getTodaySymptomStatus()
    const trendSummary = recordStore.getSymptomSummary7Days()
    this.setData({ todayStatus, trendSummary })
    this.refreshRecords()
  },

  refreshRecords() {
    const domain = symptomConfig.getDomainKeyFromCategoryIndex(this.data.activeCategory)
    const records = recordStore.listSymptomRecords({ domain }).map(item => ({
      time: recordStore.formatShortTime(item),
      title: item.title || symptomConfig.generateTitle(item.symptom_items || []) || '无明显不适',
      desc: item.desc || symptomConfig.generateDesc(item.duration, item.measures_taken) || '已记录',
      level: item.level || item.severity || '已记录',
      severity_code: item.severity_code || '',
      symptom_items: item.symptom_items || [],
      has_discomfort: item.has_discomfort,
    }))
    this.setData({ records })
  },

  selectCategory(event) {
    this.setData({ activeCategory: Number(event.currentTarget.dataset.index) })
    this.refreshRecords()
  },

  goAddSymptom() {
    wx.navigateTo({ url: '/pages/symptom/form/index' })
  },

  markNoSymptom() {
    const now = new Date()
    recordStore.addRecord({
      metric_code: 'symptom',
      metric_name: '症状',
      has_discomfort: false,
      symptom_items: [],
      symptom_domains: [],
      severity: '',
      severity_code: '',
      title: '今日无明显不适',
      desc: '用户主动记录暂无症状',
      level: '无症状',
      occurred_date: recordStore.formatDateStr(now),
      occurred_time: recordStore.formatTimeStr(now),
      recorded_at: `${recordStore.formatDateStr(now)} ${recordStore.formatTimeStr(now)}`,
      source: 'manual',
      source_text: '主动记录',
      remark: '',
    })
    this.refreshAll()
    wx.showToast({ title: '已记录今日无不适', icon: 'none' })
  },
})