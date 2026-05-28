const symptomGroups = [
  {
    key: 'respiratory',
    label: '呼吸不适',
    items: [
      { label: '咳嗽', value: '咳嗽', domains: ['respiratory'] },
      { label: '咳痰', value: '咳痰', domains: ['respiratory'] },
      { label: '痰色变深', value: '痰色变深', domains: ['respiratory'] },
      { label: '气短', value: '气短', domains: ['respiratory'] },
      { label: '胸闷', value: '胸闷', domains: ['respiratory', 'cardiovascular'] },
      { label: '喘息', value: '喘息', domains: ['respiratory'] },
      { label: '活动后气短', value: '活动后气短', domains: ['respiratory'] },
    ]
  },
  {
    key: 'sleep',
    label: '睡眠不适',
    items: [
      { label: '打鼾明显', value: '打鼾明显', domains: ['sleep'] },
      { label: '夜间憋醒', value: '夜间憋醒', domains: ['sleep', 'respiratory'] },
      { label: '白天犯困', value: '白天犯困', domains: ['sleep'] },
      { label: '晨起头痛', value: '晨起头痛', domains: ['sleep'] },
      { label: '睡醒不解乏', value: '睡醒不解乏', domains: ['sleep'] },
    ]
  },
  {
    key: 'glucose_like',
    label: '疑似低血糖不适',
    items: [
      { label: '心慌', value: '心慌', domains: ['glucose_like', 'cardiovascular'] },
      { label: '出汗', value: '出汗', domains: ['glucose_like'] },
      { label: '手抖', value: '手抖', domains: ['glucose_like'] },
      { label: '饥饿', value: '饥饿', domains: ['glucose_like'] },
      { label: '头晕', value: '头晕', domains: ['glucose_like', 'mixed'] },
      { label: '乏力', value: '乏力', domains: ['glucose_like', 'general'] },
    ]
  },
  {
    key: 'other',
    label: '其他不适',
    items: [
      { label: '头痛', value: '头痛', domains: ['mixed'] },
      { label: '头晕', value: '头晕', domains: ['glucose_like', 'mixed'] },
      { label: '发热', value: '发热', domains: ['general'] },
      { label: '胸痛', value: '胸痛', domains: ['emergency', 'cardiovascular'] },
      { label: '恶心', value: '恶心', domains: ['general'] },
      { label: '口渴', value: '口渴', domains: ['glucose_like'] },
      { label: '多尿', value: '多尿', domains: ['glucose_like'] },
      { label: '其他', value: '其他', domains: ['other'] },
    ]
  }
]

const allSymptomItems = []
symptomGroups.forEach(group => {
  group.items.forEach(item => {
    if (!allSymptomItems.find(existing => existing.value === item.value)) {
      allSymptomItems.push(item)
    }
  })
})

const severityOptions = [
  { label: '轻度', value: 'mild', label_text: '轻度' },
  { label: '中度', value: 'moderate', label_text: '中度' },
  { label: '重度', value: 'severe', label_text: '重度' },
]

const durationOptions = [
  { label: '少于30分钟', value: '<30min' },
  { label: '30分钟-2小时', value: '30min_2h' },
  { label: '2-6小时', value: '2h_6h' },
  { label: '超过6小时', value: '>6h' },
  { label: '持续中', value: 'ongoing' },
]

const accompaniedAbnormalOptions = [
  { label: '血糖偏低', value: '血糖偏低', exclusive: false },
  { label: '血糖偏高', value: '血糖偏高', exclusive: false },
  { label: '血氧偏低', value: '血氧偏低', exclusive: false },
  { label: '血压偏高', value: '血压偏高', exclusive: false },
  { label: '无', value: '无', exclusive: true },
  { label: '不清楚', value: '不清楚', exclusive: true },
]

const measuresTakenOptions = [
  { label: '休息', value: '休息', exclusive: false },
  { label: '复测', value: '复测', exclusive: false },
  { label: '服药', value: '服药', exclusive: false },
  { label: '吸氧', value: '吸氧', exclusive: false },
  { label: '联系医生', value: '联系医生', exclusive: false },
  { label: '线下就医', value: '线下就医', exclusive: false },
  { label: '未处理', value: '未处理', exclusive: true },
]

const sourceSceneMap = {
  manual: '主动记录',
  alert_supplement: '预警后补充',
  followup_prep: '随访准备',
  doctor_advice: '医生建议',
}

const domainFilterMap = {
  respiratory: '呼吸不适',
  sleep: '睡眠不适',
  glucose_like: '疑似低血糖不适',
  cardiovascular: '其他不适',
  emergency: '其他不适',
  mixed: '其他不适',
  general: '其他不适',
  infection: '其他不适',
  blood_pressure: '其他不适',
  other: '其他不适',
}

function resolveDomains(symptomItems) {
  const domains = []
  symptomItems.forEach(name => {
    const item = allSymptomItems.find(i => i.value === name)
    if (item) {
      item.domains.forEach(d => {
        if (!domains.includes(d)) domains.push(d)
      })
    }
  })
  return domains
}

function generateTitle(symptomItems) {
  if (!symptomItems || !symptomItems.length) return '无明显不适'
  const display = symptomItems.slice(0, 3)
  return display.join('、') + (symptomItems.length > 3 ? '等' : '')
}

function generateDesc(duration, measuresTaken) {
  let parts = []
  if (duration) parts.push('持续' + duration)
  if (measuresTaken && measuresTaken.length && measuresTaken[0] !== '未处理') {
    const measureTexts = measuresTaken.map(m => '已' + m)
    parts.push(measureTexts.join('、'))
  }
  return parts.join('，') || ''
}

function getFilterCategories() {
  return ['全部', '呼吸不适', '睡眠不适', '疑似低血糖不适', '其他不适']
}

function filterByDomain(records, domain) {
  if (!domain) return records
  return records.filter(r => {
    const domains = r.symptom_domains
    if (!domains || !domains.length) {
      return domain === 'other' || domain === 'mixed' || domain === 'general'
    }
    return domains.some(d => domainFilterMap[d] === domainFilterMap[domain])
  })
}

function getDomainKeyFromCategoryIndex(index) {
  const keys = ['', 'respiratory', 'sleep', 'glucose_like', 'other']
  return keys[index] || ''
}

module.exports = {
  allSymptomItems,
  accompaniedAbnormalOptions,
  domainFilterMap,
  durationOptions,
  filterByDomain,
  generateDesc,
  generateTitle,
  getDomainKeyFromCategoryIndex,
  getFilterCategories,
  measuresTakenOptions,
  resolveDomains,
  severityOptions,
  sourceSceneMap,
  symptomGroups,
}