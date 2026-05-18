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
    title: '头痛，略有头晕',
    desc: '持续约2小时，休息后缓解',
    level: '轻度',
    recorded_at: '2026-05-17 19:30',
    source: 'manual',
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

module.exports = {
  addRecord,
  defaultRecords,
  formatDay,
  formatShortTime,
  getLatestRecord,
  listRecords,
  sourceText
}
