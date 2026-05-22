const profileStore = require('../../utils/profile-store')

const exclusiveNone = (label) => ({ label, value: label, exclusive: label === '无' || label === '无明显暴露' })
const toOptions = (items) => items.map((item) => (typeof item === 'string' ? { label: item, value: item } : item))

const optionConfig = {
  sex: toOptions(['男', '女']),
  disease: [
    '糖尿病',
    '慢性阻塞性肺疾病',
    '睡眠呼吸障碍',
    '高血压',
    '高血脂',
    '脂肪肝',
    '心脑血管病',
    '痛风',
    '甲状腺疾病',
    '呼吸系统疾病',
    '消化系统疾病',
    '乳腺疾病',
    '其他',
    '无'
  ].map(exclusiveNone),
  duration: toOptions(['1年以内', '1-3年', '3-5年', '5-10年', '10年以上']),
  yesNo: toOptions(['是', '否']),
  family: ['糖尿病', '高血压', '脑中风', '冠心病', '其他心血管疾病', '肺癌', '乳腺癌', '无'].map(exclusiveNone),
  smoke: [
    { label: '从不吸烟', value: '否' },
    { label: '已戒烟', value: '已戒烟' },
    { label: '偶尔吸烟（每周少于1次）', value: '偶尔吸烟' },
    { label: '经常吸烟（每天1-10支）', value: '是' },
    { label: '大量吸烟（每天10支以上）', value: '大量吸烟' }
  ],
  smokingYears: toOptions(['1年以内', '1-5年', '5-10年', '10-20年', '20年以上']),
  cigarettesPerDay: toOptions(['少于1支/天', '1-10支/天', '11-20支/天', '20支以上/天']),
  quitSmokingTime: toOptions(['1年以内', '1-5年', '5-10年', '10年以上']),
  alcoholic: [
    { label: '从不饮酒', value: '否' },
    { label: '偶尔饮酒（每月少于1次）', value: '偶尔饮酒' },
    { label: '少量饮酒（每周1-2次）', value: '少量饮酒' },
    { label: '经常饮酒（每周3-5次）', value: '是' },
    { label: '几乎每日饮酒', value: '每日饮酒' }
  ],
  drink: [
    { label: '少量饮酒（<100ml）', value: '<100ml' },
    { label: '过量饮酒（>=100ml）', value: '>=100ml' }
  ],
  regularSports: [
    { label: '基本不运动', value: '无' },
    { label: '每周1-2次', value: '1-2次' },
    { label: '每周3-4次', value: '2次以上' },
    { label: '每周5次以上', value: '5次以上' }
  ],
  sportsTime: [
    { label: '少于30分钟', value: '<30分钟' },
    { label: '30-60分钟', value: '30-60分钟' },
    { label: '超过60分钟', value: '>60分钟' }
  ],
  regularDietary: [
    { label: '清淡饮食', value: '以上全无' },
    { label: '均衡饮食', value: '均衡饮食' },
    { label: '偏好高油高盐', value: '口味偏咸' },
    { label: '饮食不规律', value: '三餐不规律' }
  ],
  sleep: [
    { label: '不足6小时', value: '<6小时' },
    { label: '6-7小时', value: '>=6小时' },
    { label: '7-8小时', value: '7-8小时' },
    { label: '8小时以上', value: '8小时以上' }
  ],
  sit: [
    { label: '8小时及以上', value: '>=8小时' },
    { label: '少于8小时', value: '<8小时' }
  ],
  exposureHistory: ['无明显暴露', '粉尘暴露', '烟雾暴露', '化学气体暴露', '生物燃料烟雾暴露', '其他'].map(exclusiveNone),
  symptoms: toOptions(['头晕头痛', '胸闷胸痛', '心慌心悸', '视力模糊', '手脚麻木', '口干多饮', '多食易饥', '体重下降', '咳嗽咳痰', '呼吸困难', '睡眠打鼾', '乏力疲劳', '其他症状']),
  medications: toOptions(['降压药', '降糖药（口服）', '胰岛素', '降脂药', '抗血小板药（如阿司匹林）', '其他药物']),
  checkupTime: toOptions(['半年以内', '1年以内', '1-2年', '2年以上', '从未做过全面体检']),
  examAbnormal: toOptions(['血糖升高', '血压升高', '血脂异常', '尿酸升高', '肝功能异常', '肾功能异常', '心电图异常', '其他异常']),
  healthGoals: toOptions(['控制血糖', '控制血压', '减轻体重', '改善睡眠', '调整饮食习惯', '增加运动', '戒烟限酒', '缓解压力']),
  bpAbnormal: toOptions(['是', '否', '未知']),
  bsAbnormal: toOptions(['是', '否', '未知'])
}

const ratingOptions = [1, 2, 3, 4, 5]

function getAge(birthDate) {
  if (!birthDate) return '--'
  const birthday = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(birthday.getTime())) return '--'
  const today = new Date()
  let age = today.getFullYear() - birthday.getFullYear()
  const hasHadBirthday = today.getMonth() > birthday.getMonth()
    || (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate())
  if (!hasHadBirthday) age -= 1
  return age >= 0 ? `${age}岁` : '--'
}

function getBmi(profile) {
  const height = Number(profile.height)
  const weight = Number(profile.weight)
  if (!height || !weight) return '--'
  return (weight / ((height / 100) * (height / 100))).toFixed(1)
}

function formatUpdatedAt(value) {
  if (!value) return '待保存'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '待保存'
  const pad = (item) => `${item}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

Page({
  data: {
    profile: {},
    options: {},
    diseaseDurationRows: [],
    ratingOptions,
    ageDisplay: '--',
    bmiDisplay: '--',
    completionRate: 0,
    updatedAtText: '待保存',
    hasChanges: false,
    smokeNeedsDetail: false,
    isQuitSmoking: false,
    drinksAlcohol: false,
    hasExercise: false,
    showSurgeryNote: false,
    showAllergyNote: false,
    showOtherDisease: false,
    showSymptomNote: false
  },

  onLoad() {
    this.refreshProfile(profileStore.getProfile(), false)
  },

  onUnload() {
    if (this.data.hasChanges) {
      wx.showToast({ title: '健康档案尚未保存', icon: 'none' })
    }
  },

  refreshProfile(profile, hasChanges = true) {
    const diseaseDurationRows = (profile.disease || [])
      .filter((disease) => disease !== '无')
      .map((disease) => ({
        disease,
        label: disease === '其他' ? '该慢性疾病' : disease,
        options: this.selectSingleOptions(optionConfig.duration, (profile.diseaseDurations || {})[disease])
      }))
    const options = Object.keys(optionConfig).reduce((next, code) => {
      const value = profile[code]
      next[code] = Array.isArray(value)
        ? this.selectMultipleOptions(optionConfig[code], value)
        : this.selectSingleOptions(optionConfig[code], value)
      return next
    }, {})
    this.setData({
      profile,
      options,
      diseaseDurationRows,
      ageDisplay: getAge(profile.birthDate),
      bmiDisplay: getBmi(profile),
      completionRate: this.getCompletionRate(profile),
      updatedAtText: formatUpdatedAt(profile.updatedAt),
      hasChanges,
      smokeNeedsDetail: ['已戒烟', '偶尔吸烟', '是', '大量吸烟'].includes(profile.smoke),
      isQuitSmoking: profile.smoke === '已戒烟',
      drinksAlcohol: !!profile.alcoholic && profile.alcoholic !== '否',
      hasExercise: !!profile.regularSports && profile.regularSports !== '无',
      showSurgeryNote: profile.surgery === '是',
      showAllergyNote: profile.allergy === '是',
      showOtherDisease: (profile.disease || []).includes('其他'),
      showSymptomNote: (profile.symptoms || []).includes('其他症状')
    })
  },

  selectSingleOptions(options, value) {
    return (options || []).map((option) => ({ ...option, selected: option.value === value }))
  },

  selectMultipleOptions(options, selected) {
    return (options || []).map((option) => ({ ...option, selected: selected.includes(option.value) }))
  },

  updateProfile(updates) {
    this.refreshProfile({ ...this.data.profile, ...updates })
  },

  onDateChange(event) {
    this.updateProfile({ birthDate: event.detail.value })
  },

  onInput(event) {
    const { code } = event.currentTarget.dataset
    this.updateProfile({ [code]: event.detail.value })
  },

  onSingleSelect(event) {
    const { code, value } = event.currentTarget.dataset
    const updates = { [code]: value }
    if (code === 'smoke' && value === '否') {
      updates.smokingYears = ''
      updates.cigarettesPerDay = ''
      updates.quitSmokingTime = ''
    }
    if (code === 'smoke' && value !== '已戒烟') updates.quitSmokingTime = ''
    if (code === 'alcoholic' && value === '否') updates.drink = ''
    if (code === 'regularSports' && value === '无') updates.sportsTime = ''
    if (code === 'surgery' && value === '否') updates.surgeryNote = ''
    if (code === 'allergy' && value === '否') updates.allergyNote = ''
    this.updateProfile(updates)
  },

  onDurationSelect(event) {
    const { disease, value } = event.currentTarget.dataset
    this.updateProfile({
      diseaseDurations: {
        ...(this.data.profile.diseaseDurations || {}),
        [disease]: value
      }
    })
  },

  onMultipleToggle(event) {
    const { code, value, exclusive } = event.currentTarget.dataset
    const current = this.data.profile[code] || []
    let next = []
    if (exclusive === true || exclusive === 'true') {
      next = current.includes(value) ? [] : [value]
    } else {
      const nonExclusive = current.filter((item) => !this.isExclusiveValue(code, item))
      next = current.includes(value) ? current.filter((item) => item !== value) : [...nonExclusive, value]
    }
    const updates = { [code]: next }
    if (code === 'disease') {
      updates.diseaseDurations = this.pruneDiseaseDurations(next)
      if (!next.includes('其他')) updates.otherDisease = ''
    }
    this.updateProfile(updates)
  },

  onRatingSelect(event) {
    this.updateProfile({ sleepQuality: Number(event.currentTarget.dataset.value) })
  },

  isExclusiveValue(code, value) {
    const option = (optionConfig[code] || []).find((item) => item.value === value)
    return !!(option && option.exclusive)
  },

  pruneDiseaseDurations(selectedDiseases) {
    const current = this.data.profile.diseaseDurations || {}
    return selectedDiseases
      .filter((disease) => disease !== '无')
      .reduce((durations, disease) => {
        if (current[disease]) durations[disease] = current[disease]
        return durations
      }, {})
  },

  getCompletionRate(profile) {
    const required = [
      profile.sex,
      profile.birthDate,
      profile.height,
      profile.weight,
      profile.waistline,
      profile.family && profile.family.length,
      profile.allergy,
      profile.smoke,
      profile.alcoholic,
      profile.disease && profile.disease.length
    ]
    const durationsComplete = (profile.disease || [])
      .filter((disease) => disease !== '无')
      .every((disease) => !!(profile.diseaseDurations || {})[disease])
    const completed = required.filter(Boolean).length + (durationsComplete ? 1 : 0)
    return Math.round((completed / (required.length + 1)) * 100)
  },

  getRangeError() {
    const ranges = [
      ['height', '身高', 100, 230, 'cm'],
      ['weight', '体重', 20, 150, 'kg'],
      ['waistline', '腰围', 50, 150, 'cm'],
      ['neckCircumference', '颈围', 20, 80, 'cm'],
      ['sbp', '收缩压', 60, 250, 'mmHg'],
      ['dbp', '舒张压', 30, 180, 'mmHg'],
      ['fpg', '空腹血糖', 1, 33.3, 'mmol/L'],
      ['pbg2h', '餐后2h血糖', 1, 33.3, 'mmol/L']
    ]
    for (let index = 0; index < ranges.length; index += 1) {
      const [code, label, min, max, unit] = ranges[index]
      const raw = this.data.profile[code]
      if (raw === '' || raw === undefined) continue
      const value = Number(raw)
      if (Number.isNaN(value) || value < min || value > max) return `${label}需在${min}-${max}${unit}之间`
    }
    return ''
  },

  getDurationError() {
    const missing = (this.data.profile.disease || [])
      .filter((disease) => disease !== '无')
      .find((disease) => !(this.data.profile.diseaseDurations || {})[disease])
    return missing ? `请补充${missing === '其他' ? '其他慢性疾病' : missing}确诊年限` : ''
  },

  saveProfile() {
    const error = this.getDurationError() || this.getRangeError()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }
    const profile = profileStore.saveProfile(this.data.profile)
    this.refreshProfile(profile, false)
    wx.showToast({ title: '健康档案已保存', icon: 'success' })
  }
})
