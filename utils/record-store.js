const STORAGE_KEY = 'healthMetricRecords'

const defaultRecords = [
  {
    id: 'mock_glucose_1',
    metric_code: 'glucose',
    metric_name: '血糖',
    value: 5.0,
    unit: 'mmol/L',
    measure_point: 'fasting',
    measure_point_name: '空腹',
    status: 'normal',
    status_text: '正常',
    recorded_at: '2026-05-17 08:30',
    source: 'manual',
    remark: '早餐前测量'
  },
  {
    id: 'mock_glucose_2',
    metric_code: 'glucose',
    metric_name: '血糖',
    value: 8.6,
    unit: 'mmol/L',
    measure_point: 'lunch_2h',
    measure_point_name: '午餐后2小时',
    status: 'normal',
    status_text: '正常',
    recorded_at: '2026-05-16 13:05',
    source: 'device',
    device: 'ZG-P11H-0021',
    remark: '午餐后 2 小时自动同步'
  },
  {
    id: 'mock_bp_1',
    metric_code: 'blood_pressure',
    metric_name: '血压',
    value: '120/90',
    systolic: 120,
    diastolic: 90,
    unit: 'mmHg',
    scene: '晨起',
    status: 'normal',
    status_text: '正常',
    recorded_at: '2026-05-17 08:10',
    source: 'manual',
    remark: ''
  },
  {
    id: 'mock_oxygen_1',
    metric_code: 'oxygen',
    metric_name: 'SpO2',
    value: 98,
    unit: '%',
    scene: '静息',
    status: 'normal',
    status_text: '正常',
    recorded_at: '2026-05-17 08:30',
    source: 'device',
    device: 'ZG-P11H-0021',
    remark: ''
  },
  {
    id: 'mock_pulse_1',
    metric_code: 'pulse',
    metric_name: '脉率',
    value: 72,
    unit: '次/分',
    scene: '静息',
    status: 'normal',
    status_text: '正常',
    recorded_at: '2026-05-17 08:30',
    source: 'device',
    device: 'ZG-P11H-0021',
    remark: ''
  },
  {
    id: 'mock_respiration_1',
    metric_code: 'respiration',
    metric_name: '呼吸频率',
    value: 18,
    unit: '次/分',
    scene: '静息',
    status: 'normal',
    status_text: '正常',
    recorded_at: '2026-05-17 08:30',
    source: 'manual',
    remark: ''
  },
  {
    id: 'mock_symptom_1',
    metric_code: 'symptom',
    metric_name: '症状',
    has_discomfort: true,
    symptom_items: ['头痛', '头晕'],
    symptom_domains: ['mixed', 'glucose_like'],
    severity: '轻度',
    severity_code: 'mild',
    occurred_date: '2026-05-17',
    occurred_time: '19:30',
    duration: '30分钟-2小时',
    duration_code: '30min_2h',
    accompanied_abnormal: ['不清楚'],
    measures_taken: ['休息'],
    source: 'manual',
    source_text: '主动记录',
    title: '头痛、头晕',
    desc: '持续30分钟-2小时，已休息',
    level: '轻度',
    recorded_at: '2026-05-17 19:30',
    remark: ''
  },
  {
    id: 'mock_medication_1',
    metric_code: 'medication',
    metric_name: '用药',
    name: '二甲双胍缓释片',
    dose: '0.5g',
    status: 'done',
    status_text: '已服用',
    desc: '早餐后服用',
    recorded_at: '2026-05-17 07:35',
    source: 'manual',
    remark: ''
  }
]

function timestamp(record) {
  return new Date((record.recorded_at || '').replace(/-/g, '/')).getTime() || 0
}

function ensureRecords() {
  const records = wx.getStorageSync(STORAGE_KEY)
  if (records && records.length) return records
  wx.setStorageSync(STORAGE_KEY, defaultRecords)
  return defaultRecords
}

function listRecords(options = {}) {
  const records = ensureRecords()
  return records
    .filter((item) => !options.metric || item.metric_code === options.metric)
    .sort((a, b) => timestamp(b) - timestamp(a))
}

function addRecord(record) {
  const records = ensureRecords()
  const nextRecord = {
    ...record,
    id: record.id || `manual_${record.metric_code}_${Date.now()}`,
    created_at: record.created_at || new Date().toISOString()
  }
  wx.setStorageSync(STORAGE_KEY, [nextRecord, ...records])
  return nextRecord
}

function getLatestRecord(metric) {
  return listRecords({ metric })[0] || null
}

function formatShortTime(record) {
  if (!record || !record.recorded_at) return '--'
  const [, month = '--', day = '--', time = '--'] = record.recorded_at.match(/^\d{4}-(\d{2})-(\d{2})\s+(\d{2}:\d{2})/) || []
  return `${month}.${day} ${time}`
}

function formatDay(record) {
  if (!record || !record.recorded_at) return '--'
  const [, month = '--', day = '--'] = record.recorded_at.match(/^\d{4}-(\d{2})-(\d{2})/) || []
  return `${month}.${day}`
}

function sourceText(source) {
  if (source === 'device') return '设备采集'
  if (source === 'doctor') return '医生录入'
  return '手动记录'
}

function listSymptomRecords(options = {}) {
  const records = listRecords({ metric: 'symptom' })
  if (!options.domain) return records
  return records.filter(r => {
    const domains = r.symptom_domains
    if (!domains || !domains.length) {
      return options.domain === 'other' || options.domain === 'mixed' || options.domain === 'general'
    }
    return domains.includes(options.domain)
  })
}

function getTodaySymptomStatus() {
  const today = formatDateStr(new Date())
  const allRecords = listSymptomRecords()
  const todayRecords = allRecords.filter(r =>
    (r.recorded_at || '').startsWith(today)
  )
  const discomfortRecords = todayRecords.filter(r => r.has_discomfort === true)
  const noDiscomfortRecords = todayRecords.filter(r => r.has_discomfort === false)

  if (noDiscomfortRecords.length > 0 && discomfortRecords.length === 0) {
    return { hasDiscomfort: false, maxSeverity: '无症状', summary: '今日无不适' }
  }
  if (discomfortRecords.length === 0) {
    return { hasDiscomfort: null, maxSeverity: '', summary: '暂无记录' }
  }

  const severityOrder = { mild: 1, moderate: 2, severe: 3 }
  const maxRecord = discomfortRecords.reduce((max, r) => {
    const current = severityOrder[r.severity_code] || 0
    const existing = severityOrder[max.severity_code] || 0
    return current > existing ? r : max
  }, discomfortRecords[0])

  const allItems = discomfortRecords.flatMap(r => r.symptom_items || [])
  const uniqueItems = [...new Set(allItems)]

  return {
    hasDiscomfort: true,
    maxSeverity: maxRecord.severity || maxRecord.level || '已记录',
    severityCode: maxRecord.severity_code || 'mild',
    summary: uniqueItems.slice(0, 3).join('、') + (uniqueItems.length > 3 ? '等' : ''),
    recordCount: discomfortRecords.length,
  }
}

function getSymptomSummary7Days() {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const records = listSymptomRecords().filter(r => {
    const ts = timestamp(r)
    return ts >= sevenDaysAgo.getTime() && ts <= now.getTime()
  })

  const discomfortRecords = records.filter(r => r.has_discomfort === true)
  const uniqueDays = new Set(discomfortRecords.map(r => (r.recorded_at || '').slice(0, 10)))

  const severityOrder = { mild: 1, moderate: 2, severe: 3 }
  const maxLevel = discomfortRecords.reduce((max, r) => {
    const level = severityOrder[r.severity_code] || 0
    return level > max ? level : max
  }, 0)
  const maxSeverityText = maxLevel === 3 ? '重度' : maxLevel === 2 ? '中度' : maxLevel === 1 ? '轻度' : '无'

  const domainDays = {}
  discomfortRecords.forEach(r => {
    const day = (r.recorded_at || '').slice(0, 10)
    ;(r.symptom_domains || []).forEach(domain => {
      if (!domainDays[domain]) domainDays[domain] = new Set()
      domainDays[domain].add(day)
    })
  })

  return {
    symptomDays: uniqueDays.size,
    maxSeverity: maxSeverityText,
    respiratoryDays: (domainDays.respiratory || new Set()).size,
    sleepDays: (domainDays.sleep || new Set()).size,
    glucoseDays: (domainDays.glucose_like || new Set()).size,
  }
}

function formatDateStr(date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTimeStr(date) {
  const h = `${date.getHours()}`.padStart(2, '0')
  const m = `${date.getMinutes()}`.padStart(2, '0')
  return `${h}:${m}`
}

module.exports = {
  addRecord,
  defaultRecords,
  formatDateStr,
  formatDay,
  formatShortTime,
  formatTimeStr,
  getLatestRecord,
  getSymptomSummary7Days,
  getTodaySymptomStatus,
  listRecords,
  listSymptomRecords,
  sourceText
}
