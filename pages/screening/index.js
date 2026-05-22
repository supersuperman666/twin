const formatDate = (date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getCurrentYear = () => new Date().getFullYear()

const getRiskMeta = (riskLevel) => {
  const map = {
    low: { riskName: '低风险', resultTitle: '当前健康状态较好', homeTitle: '筛查完成，当前低风险' },
    medium: { riskName: '中风险', resultTitle: '存在部分健康风险', homeTitle: '筛查完成，存在中风险' },
    high: { riskName: '高风险', resultTitle: '存在较明显健康风险', homeTitle: '筛查完成，存在高风险' }
  }
  return map[riskLevel] || map.medium
}

const diseaseOptions = [
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
].map((label) => ({ label, value: label, exclusive: label === '无' }))

const familyOptions = [
  '糖尿病',
  '高血压',
  '脑中风',
  '冠心病',
  '其他心血管疾病',
  '肺癌',
  '乳腺癌',
  '无'
].map((label) => ({ label, value: label, exclusive: label === '无' }))

const dietOptions = [
  '三餐不规律',
  '常不吃早餐',
  '常暴饮暴食',
  '喜欢吃甜食',
  '口味偏咸',
  '食用油摄入过量',
  '以上全无'
].map((label) => ({ label, value: label, exclusive: label === '以上全无' }))

const diseaseDurationOptions = [
  { label: '1年以内', value: '1年以内' },
  { label: '1-3年', value: '1-3年' },
  { label: '3-5年', value: '3-5年' },
  { label: '5-10年', value: '5-10年' },
  { label: '10年以上', value: '10年以上' }
]

const steps = [
  {
    name: '基础信息',
    title: '您好，请填写您的基础信息',
    desc: '我们将严格保护您的隐私，信息仅用于健康评估',
    fields: [
      {
        code: 'sex',
        label: '您的性别',
        kind: 'segment',
        required: true,
        columns: 2,
        options: [
          { label: '男', value: '男', icon: '♂' },
          { label: '女', value: '女', icon: '♀' }
        ]
      },
      { code: 'age', label: '您的年龄', kind: 'number', required: true, min: 1, max: 120, unit: '岁', placeholder: '请输入您的年龄' },
      { code: 'height', label: '您的身高', kind: 'number', required: true, min: 100, max: 230, unit: 'cm', placeholder: '请输入您的身高' },
      { code: 'weight', label: '您的体重', kind: 'number', required: true, min: 20, max: 150, unit: 'kg', placeholder: '请输入您的体重' },
      { code: 'bmi', label: 'BMI', kind: 'computed', unit: 'kg/m²', note: '系统根据身高和体重自动计算' },
      {
        code: 'maritalStatus',
        label: '婚姻状况（选填）',
        kind: 'segment',
        columns: 2,
        options: [
          { label: '未婚', value: '未婚' },
          { label: '已婚', value: '已婚' },
          { label: '离异', value: '离异' },
          { label: '丧偶', value: '丧偶' }
        ]
      },
      {
        code: 'education',
        label: '教育程度（选填）',
        kind: 'single',
        options: [
          { label: '小学及以下', value: '小学及以下' },
          { label: '初中', value: '初中' },
          { label: '高中/中专', value: '高中/中专' },
          { label: '大专/本科', value: '大专/本科' },
          { label: '硕士及以上', value: '硕士及以上' }
        ]
      }
    ]
  },
  {
    name: '疾病史调查',
    title: '请填写您的疾病史信息',
    desc: '这些信息将帮助我们更准确地评估您的健康风险',
    fields: [
      { code: 'disease', label: '您是否确诊以下慢性疾病？（可多选）', kind: 'multiple', required: true, options: diseaseOptions, extraInput: 'otherDisease', extraPlaceholder: '请填写其他慢性疾病名称（如有）' },
      {
        code: 'surgery',
        label: '您是否有过重大手术史？',
        kind: 'segment',
        columns: 2,
        options: [
          { label: '是', value: '是' },
          { label: '否', value: '否' }
        ]
      },
      { code: 'surgeryNote', label: '手术史补充', kind: 'text', placeholder: '请填写手术名称、时间（如有）', visibleWhen: { code: 'surgery', equals: '是' } },
      {
        code: 'allergy',
        label: '您是否有药物或食物过敏史？',
        kind: 'segment',
        columns: 2,
        options: [
          { label: '是', value: '是' },
          { label: '否', value: '否' }
        ]
      },
      { code: 'allergyNote', label: '过敏史补充', kind: 'text', placeholder: '请填写过敏原、过敏反应（如有）', visibleWhen: { code: 'allergy', equals: '是' } },
      { code: 'family', label: '您的直系亲属是否有以下疾病史？（可多选）', kind: 'multiple', required: true, options: familyOptions }
    ]
  },
  {
    name: '生活方式评估',
    title: '请填写您的生活方式信息',
    desc: '生活方式是影响慢病发展的重要因素',
    fields: [
      {
        code: 'smoke',
        label: '您的吸烟情况是？',
        kind: 'single',
        required: true,
        options: [
          { label: '从不吸烟', value: '否' },
          { label: '已戒烟', value: '已戒烟' },
          { label: '偶尔吸烟（每周少于1次）', value: '偶尔吸烟' },
          { label: '经常吸烟（每天1-10支）', value: '是' },
          { label: '大量吸烟（每天10支以上）', value: '大量吸烟' }
        ]
      },
      {
        code: 'alcoholic',
        label: '您的饮酒情况是？',
        kind: 'single',
        required: true,
        options: [
          { label: '从不饮酒', value: '否' },
          { label: '偶尔饮酒（每月少于1次）', value: '偶尔饮酒' },
          { label: '少量饮酒（每周1-2次）', value: '少量饮酒' },
          { label: '经常饮酒（每周3-5次）', value: '是' },
          { label: '几乎每日饮酒', value: '每日饮酒' }
        ]
      },
      {
        code: 'drink',
        label: '每日饮酒量',
        kind: 'single',
        required: true,
        options: [
          { label: '少量饮酒（<100ml）', value: '<100ml' },
          { label: '过量饮酒（≥100ml）', value: '>=100ml' }
        ],
        visibleWhen: { code: 'alcoholic', not: '否' }
      },
      {
        code: 'regularSports',
        label: '您的平均每周运动次数是？',
        kind: 'single',
        required: true,
        options: [
          { label: '基本不运动', value: '无' },
          { label: '每周1-2次', value: '1-2次' },
          { label: '每周3-4次', value: '2次以上' },
          { label: '每周5次以上', value: '5次以上' }
        ]
      },
      {
        code: 'sportsTime',
        label: '单次运动时间',
        kind: 'single',
        required: true,
        options: [
          { label: '少于30分钟', value: '<30分钟' },
          { label: '30-60分钟', value: '30-60分钟' },
          { label: '超过60分钟', value: '>60分钟' }
        ],
        visibleWhen: { code: 'regularSports', not: '无' }
      },
      {
        code: 'regularDietary',
        label: '您的饮食习惯更符合以下哪项？',
        kind: 'single',
        required: true,
        options: [
          { label: '清淡饮食', value: '以上全无', desc: '少油少盐，蔬菜水果摄入充足' },
          { label: '均衡饮食', value: '均衡饮食', desc: '荤素搭配，油盐摄入适中' },
          { label: '偏好高油高盐', value: '口味偏咸', desc: '喜欢油炸、腌制食品，蔬菜水果摄入少' },
          { label: '饮食不规律', value: '三餐不规律', desc: '经常不吃早餐、暴饮暴食，常吃外卖' }
        ]
      },
      {
        code: 'sleep',
        label: '您的平均每日睡眠时间是？',
        kind: 'single',
        required: true,
        options: [
          { label: '不足6小时', value: '<6小时' },
          { label: '6-7小时', value: '>=6小时' },
          { label: '7-8小时', value: '7-8小时' },
          { label: '8小时以上', value: '8小时以上' }
        ]
      },
      { code: 'sleepQuality', label: '您的睡眠质量如何？', kind: 'rating' },
      {
        code: 'nervousness',
        label: '长期精神高度紧张',
        kind: 'segment',
        required: true,
        columns: 2,
        options: [
          { label: '是', value: '是' },
          { label: '否', value: '否' }
        ]
      },
      {
        code: 'sit',
        label: '每日静坐时长',
        kind: 'single',
        required: true,
        options: [
          { label: '8小时及以上', value: '>=8小时' },
          { label: '少于8小时', value: '<8小时' }
        ]
      }
    ]
  },
  {
    name: '健康状况确认',
    title: '请确认您的当前健康状况',
    desc: '最后一步啦，完成后即可获取专属健康评估报告',
    fields: [
      {
        code: 'symptoms',
        label: '近1个月您是否有以下不适症状？',
        kind: 'tags',
        options: ['头晕头痛', '胸闷胸痛', '心慌心悸', '视力模糊', '手脚麻木', '口干多饮', '多食易饥', '体重下降', '咳嗽咳痰', '呼吸困难', '睡眠打鼾', '乏力疲劳', '其他症状'].map((label) => ({ label, value: label })),
        extraInput: 'symptomNote',
        extraPlaceholder: '请补充描述其他症状（如有）'
      },
      {
        code: 'medications',
        label: '您目前是否在规律服用以下药物？',
        kind: 'multiple',
        options: ['降压药', '降糖药（口服）', '胰岛素', '降脂药', '抗血小板药（如阿司匹林）', '其他药物'].map((label) => ({ label, value: label })),
        extraInput: 'medicationNote',
        extraPlaceholder: '请补充药物名称、剂量（如有）'
      },
      {
        code: 'checkupTime',
        label: '您最近一次体检是在什么时候？',
        kind: 'single',
        options: [
          { label: '半年以内', value: '半年以内' },
          { label: '1年以内', value: '1年以内' },
          { label: '1-2年', value: '1-2年' },
          { label: '2年以上', value: '2年以上' },
          { label: '从未做过全面体检', value: '从未做过全面体检' }
        ]
      },
      {
        code: 'examAbnormal',
        label: '最近一次体检是否有以下异常？',
        kind: 'multiple',
        options: ['血糖升高', '血压升高', '血脂异常', '尿酸升高', '肝功能异常', '肾功能异常', '心电图异常', '其他异常'].map((label) => ({ label, value: label }))
      },
      {
        code: 'healthGoals',
        label: '您最希望改善的健康问题是？',
        kind: 'tags',
        options: ['控制血糖', '控制血压', '减轻体重', '改善睡眠', '调整饮食习惯', '增加运动', '戒烟限酒', '缓解压力'].map((label) => ({ label, value: label }))
      },
      {
        code: 'bpAbnormal',
        label: '您是否存在血压异常',
        kind: 'segment',
        required: true,
        columns: 3,
        options: [
          { label: '是', value: '是' },
          { label: '否', value: '否' },
          { label: '未知', value: '未知' }
        ]
      },
      { code: 'sbp', label: '收缩压', kind: 'number', min: 60, max: 250, unit: 'mmHg', placeholder: '选填' },
      { code: 'dbp', label: '舒张压', kind: 'number', min: 30, max: 180, unit: 'mmHg', placeholder: '选填' },
      { code: 'waistline', label: '腰围', kind: 'number', required: true, min: 50, max: 150, unit: 'cm', placeholder: '请输入腰围' },
      {
        code: 'bsAbnormal',
        label: '您是否存在血糖异常情况',
        kind: 'segment',
        required: true,
        columns: 3,
        options: [
          { label: '是', value: '是' },
          { label: '否', value: '否' },
          { label: '未知', value: '未知' }
        ]
      },
      { code: 'fpg', label: '空腹血糖', kind: 'number', min: 1, max: 33.3, unit: 'mmol/L', placeholder: '选填' },
      { code: 'pbg2h', label: '餐后2h血糖', kind: 'number', min: 1, max: 33.3, unit: 'mmol/L', placeholder: '选填' }
    ]
  }
]

const initialAnswers = {
  age: '',
  birthday: '',
  sex: '',
  height: '',
  weight: '',
  maritalStatus: '',
  education: '',
  disease: [],
  diseaseDurations: {},
  otherDisease: '',
  surgery: '',
  surgeryNote: '',
  allergy: '',
  allergyNote: '',
  family: [],
  bpAbnormal: '',
  sbp: '',
  dbp: '',
  waistline: '',
  bsAbnormal: '',
  fpg: '',
  pbg2h: '',
  regularDietary: [],
  regularSports: '',
  sportsTime: '',
  smoke: '',
  alcoholic: '',
  drink: '',
  sleep: '',
  sleepQuality: 0,
  nervousness: '',
  sit: '',
  symptoms: [],
  symptomNote: '',
  medications: [],
  medicationNote: '',
  checkupTime: '',
  examAbnormal: [],
  healthGoals: []
}

Page({
  data: {
    today: formatDate(new Date()),
    steps,
    currentIndex: 0,
    currentStep: steps[0],
    visibleFields: steps[0].fields,
    answers: { ...initialAnswers },
    selectedMap: {},
    ratingOptions: [1, 2, 3, 4, 5],
    progressPercent: 12.5,
    bmiDisplay: '--',
    canContinue: false,
    showResult: false,
    result: null,
    statusBarHeight: 20
  },

  onLoad(options = {}) {
    const systemInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: systemInfo.statusBarHeight || 20 })
    if (options.mode === 'restart') {
      wx.removeStorageSync('screeningDraft')
      this.refreshStep()
      return
    }
    const saved = wx.getStorageSync('screeningDraft')
    if (saved && saved.answers) {
      this.setData({ answers: { ...initialAnswers, ...saved.answers }, currentIndex: saved.currentIndex || 0 }, () => {
        this.refreshStep()
      })
      return
    }
    this.refreshStep()
  },

  handleBack() {
    if (this.data.showResult) {
      this.setData({ showResult: false })
      return
    }
    if (this.data.currentIndex > 0) {
      this.handlePrev()
      return
    }
    wx.navigateBack()
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  handlePrev() {
    const nextIndex = Math.max(0, this.data.currentIndex - 1)
    this.setData({ currentIndex: nextIndex }, () => this.refreshStep())
  },

  handleNext() {
    if (!this.data.canContinue) {
      wx.showToast({ title: '请先完成本页必填项', icon: 'none' })
      return
    }
    const currentError = this.validateRanges()
    if (currentError) {
      wx.showToast({ title: currentError, icon: 'none' })
      return
    }
    wx.setStorageSync('screeningDraft', { answers: this.data.answers, currentIndex: this.data.currentIndex })
    if (this.data.currentIndex === this.data.steps.length - 1) {
      const result = this.calculateResult()
      wx.setStorageSync('screeningResult', result)
      wx.setStorageSync('screeningAnswers', this.data.answers)
      this.appendAssessmentHistory(result)
      wx.removeStorageSync('screeningDraft')
      this.setData({ result, showResult: true })
      return
    }
    this.setData({ currentIndex: this.data.currentIndex + 1 }, () => this.refreshStep())
  },

  onDateChange(event) {
    const { code } = event.currentTarget.dataset
    this.updateAnswer(code, event.detail.value)
  },

  onNumberInput(event) {
    const { code } = event.currentTarget.dataset
    this.updateAnswer(code, event.detail.value)
  },

  onTextInput(event) {
    const { code } = event.currentTarget.dataset
    this.updateAnswer(code, event.detail.value)
  },

  onSingleSelect(event) {
    const { code, value } = event.currentTarget.dataset
    if (code.startsWith('diseaseDuration:')) {
      this.updateAnswer(code, value)
      return
    }
    const updates = { [code]: value }
    if (code === 'regularSports' && value === '无') updates.sportsTime = ''
    if (code === 'alcoholic' && value === '否') updates.drink = ''
    this.setData({ answers: { ...this.data.answers, ...updates } }, () => this.refreshStep())
  },

  onMultipleToggle(event) {
    const { code, value, exclusive } = event.currentTarget.dataset
    const current = this.data.answers[code] || []
    let next = []
    if (exclusive === true || exclusive === 'true') {
      next = current.includes(value) ? [] : [value]
    } else {
      next = current.includes(value) ? current.filter((item) => item !== value) : [...current.filter((item) => !this.isExclusiveOption(code, item)), value]
    }
    const updates = { [code]: next }
    if (code === 'disease') {
      updates.diseaseDurations = this.pruneDiseaseDurations(next)
      if (!next.includes('其他')) updates.otherDisease = ''
    }
    this.setData({ answers: { ...this.data.answers, ...updates } }, () => this.refreshStep())
  },

  restart() {
    wx.removeStorageSync('screeningDraft')
    this.setData(
      {
        currentIndex: 0,
        answers: { ...initialAnswers },
        showResult: false,
        result: null
      },
      () => this.refreshStep()
    )
  },

  finish() {
    wx.showToast({ title: '已更新测评结果', icon: 'none' })
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/index/index' })
    }, 500)
  },

  updateAnswer(code, value) {
    if (code.startsWith('diseaseDuration:')) {
      const disease = code.split(':').slice(1).join(':')
      this.setData(
        {
          answers: {
            ...this.data.answers,
            diseaseDurations: {
              ...(this.data.answers.diseaseDurations || {}),
              [disease]: value
            }
          }
        },
        () => this.refreshStep()
      )
      return
    }
    this.setData({ answers: { ...this.data.answers, [code]: value } }, () => this.refreshStep())
  },

  appendAssessmentHistory(result) {
    const history = wx.getStorageSync('screeningHistory') || []
    wx.setStorageSync('screeningHistory', [result, ...history].slice(0, 10))
  },

  refreshStep() {
    const currentStep = this.data.steps[this.data.currentIndex]
    const visibleFields = this.expandDiseaseDurationFields(currentStep.fields.filter((field) => this.isVisible(field))).map((field) => {
      const value = this.getAnswerValue(field.code)
      if (field.kind === 'single' || field.kind === 'segment') {
        return {
          ...field,
          value,
          options: field.options.map((option) => ({
            ...option,
            selected: value === option.value
          }))
        }
      }
      if (field.kind === 'rating') return { ...field, value: Number(value || 0) }
      if (field.kind === 'tags') {
        const selected = this.data.answers[field.code] || []
        return {
          ...field,
          value,
          extraValue: field.extraInput ? this.data.answers[field.extraInput] : '',
          options: field.options.map((option) => ({
            ...option,
            selected: selected.includes(option.value)
          }))
        }
      }
      if (field.kind !== 'multiple') return { ...field, value }
      const selected = this.data.answers[field.code] || []
      return {
        ...field,
        value,
        extraValue: field.extraInput ? this.data.answers[field.extraInput] : '',
        options: field.options.map((option) => ({
          ...option,
          selected: selected.includes(option.value)
        }))
      }
    })
    const bmiDisplay = this.getBmiDisplay()
    const progressPercent = ((this.data.currentIndex + 1) / this.data.steps.length) * 100
    this.setData({
      currentStep,
      visibleFields,
      bmiDisplay,
      progressPercent,
      canContinue: this.canContinue(visibleFields)
    })
  },

  isVisible(field) {
    if (field.visibleWhenAny) {
      const current = this.data.answers[field.visibleWhenAny.code]
      if (!Array.isArray(current)) return false
      return field.visibleWhenAny.values.some((item) => current.includes(item))
    }
    if (!field.visibleWhen) return true
    const value = this.data.answers[field.visibleWhen.code]
    if (field.visibleWhen.equals !== undefined) return value === field.visibleWhen.equals
    if (field.visibleWhen.not !== undefined) return value !== field.visibleWhen.not && value !== ''
    return true
  },

  isExclusiveOption(code, value) {
    const allFields = this.data.steps.reduce((acc, step) => acc.concat(step.fields), [])
    const field = allFields.find((item) => item.code === code)
    const option = field && field.options ? field.options.find((item) => item.value === value) : null
    return !!(option && option.exclusive)
  },

  canContinue(fields) {
    return fields.every((field) => {
      if (!field.required) return true
      const value = this.getAnswerValue(field.code)
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && `${value}`.trim() !== ''
    })
  },

  expandDiseaseDurationFields(fields) {
    const selectedDiseases = (this.data.answers.disease || []).filter((disease) => disease !== '无')
    if (!selectedDiseases.length) return fields

    return fields.reduce((allFields, field) => {
      allFields.push(field)
      if (field.code !== 'disease') return allFields

      selectedDiseases.forEach((disease) => {
        allFields.push({
          code: `diseaseDuration:${disease}`,
          label: `您确诊${disease === '其他' ? '该慢性疾病' : disease}已有多少年？`,
          kind: 'single',
          required: true,
          options: diseaseDurationOptions
        })
      })
      return allFields
    }, [])
  },

  getAnswerValue(code) {
    if (!code.startsWith('diseaseDuration:')) return this.data.answers[code]
    const disease = code.split(':').slice(1).join(':')
    return (this.data.answers.diseaseDurations || {})[disease]
  },

  pruneDiseaseDurations(selectedDiseases) {
    const currentDurations = this.data.answers.diseaseDurations || {}
    return selectedDiseases
      .filter((disease) => disease !== '无')
      .reduce((durations, disease) => {
        if (currentDurations[disease]) durations[disease] = currentDurations[disease]
        return durations
      }, {})
  },

  validateRanges() {
    const numberFields = this.data.visibleFields.filter((field) => field.kind === 'number')
    for (let i = 0; i < numberFields.length; i += 1) {
      const field = numberFields[i]
      const raw = this.data.answers[field.code]
      if (raw === '' || raw === undefined) continue
      const value = Number(raw)
      if (Number.isNaN(value) || value < field.min || value > field.max) {
        return `${field.label}需在${field.min}-${field.max}${field.unit || ''}之间`
      }
    }
    return ''
  },

  getBmiDisplay() {
    const height = Number(this.data.answers.height)
    const weight = Number(this.data.answers.weight)
    if (!height || !weight) return '--'
    const bmi = weight / ((height / 100) * (height / 100))
    return bmi.toFixed(1)
  },

  calculateResult() {
    const answers = this.data.answers
    const abnormalItems = []
    let deduction = 0
    let indicatorDeduction = 0
    let lifestyleDeduction = 0
    const hasDiabetes = (answers.disease || []).includes('糖尿病')

    const add = (code, label, points, desc, group = 'normal') => {
      if (!points) return
      abnormalItems.push({ code, label, points, desc })
      if (group === 'indicator') indicatorDeduction += points
      else if (group === 'lifestyle') lifestyleDeduction += points
      else deduction += points
    }

    const age = this.getAge(answers.birthday)
    if (age >= 55) add('birth', '年龄', 4, '属于慢病高发年龄段')
    else if (age >= 45) add('birth', '年龄', 3, '建议开始重视慢病预防')

    const diseaseCount = this.countSelected(answers.disease, '无')
    if (diseaseCount === 1) add('disease', '疾病史', 20, '已存在慢病或相关疾病')
    else if (diseaseCount === 2) add('disease', '疾病史', 22, '存在多项疾病史')
    else if (diseaseCount === 3) add('disease', '疾病史', 24, '存在多项疾病史')
    else if (diseaseCount >= 4) add('disease', '疾病史', 26, '存在多项疾病史')

    const familyCount = this.countSelected(answers.family, '无')
    if (familyCount === 1) add('family', '家族史', 1, '父母存在相关疾病史')
    else if (familyCount === 2) add('family', '家族史', 2, '父母存在多项疾病史')
    else if (familyCount >= 3) add('family', '家族史', 4, '父母存在多项疾病史')

    const bmi = Number(this.getBmiDisplay())
    if (bmi && bmi < 18.5) add('bmi', 'BMI', 2, `当前 BMI ${bmi}，偏低`, 'indicator')
    else if (bmi >= 24 && bmi < 28) add('bmi', 'BMI', 4, `当前 BMI ${bmi}，超重`, 'indicator')
    else if (bmi >= 28) add('bmi', 'BMI', 6, `当前 BMI ${bmi}，肥胖`, 'indicator')

    if (answers.bpAbnormal === '未知') add('bpUnknown', '血压情况', 2, '尚不了解血压情况，建议补充测量', 'indicator')
    const sbp = Number(answers.sbp)
    if (sbp > 120 && sbp < 130) add('sbp', '收缩压', 1, `收缩压 ${sbp}mmHg，需关注`, 'indicator')
    else if (sbp >= 130 && sbp < 140) add('sbp', '收缩压', 2, `收缩压 ${sbp}mmHg，偏高`, 'indicator')
    else if (sbp >= 140) add('sbp', '收缩压', 4, `收缩压 ${sbp}mmHg，异常`, 'indicator')

    const dbp = Number(answers.dbp)
    if (dbp >= 80 && dbp < 90) add('dbp', '舒张压', 2, `舒张压 ${dbp}mmHg，偏高`, 'indicator')
    else if (dbp >= 90) add('dbp', '舒张压', 4, `舒张压 ${dbp}mmHg，异常`, 'indicator')

    const waistline = Number(answers.waistline)
    if ((answers.sex === '男' && waistline >= 90) || (answers.sex === '女' && waistline >= 85)) {
      add('waistline', '腰围', 4, `腰围 ${waistline}cm，超过建议范围`, 'indicator')
    }

    if (answers.bsAbnormal === '未知') add('bsUnknown', '血糖情况', 2, '尚不了解血糖情况，建议补充测量', 'indicator')
    const fpg = Number(answers.fpg)
    if (fpg) {
      if (!hasDiabetes) {
        if (fpg < 2.8) add('fpg', '空腹血糖', 4, `空腹血糖 ${fpg}mmol/L，明显偏低`, 'indicator')
        else if (fpg < 3.9) add('fpg', '空腹血糖', 2, `空腹血糖 ${fpg}mmol/L，偏低`, 'indicator')
        else if (fpg >= 6.1) add('fpg', '空腹血糖', 4, `空腹血糖 ${fpg}mmol/L，偏高`, 'indicator')
      } else if (fpg <= 3.9) add('fpg', '空腹血糖', 4, `空腹血糖 ${fpg}mmol/L，偏低`, 'indicator')
      else if (fpg < 4.4) add('fpg', '空腹血糖', 2, `空腹血糖 ${fpg}mmol/L，略低`, 'indicator')
      else if (fpg > 7.0) add('fpg', '空腹血糖', 4, `空腹血糖 ${fpg}mmol/L，高于目标`, 'indicator')
    }

    const pbg2h = Number(answers.pbg2h)
    if (pbg2h) {
      if (pbg2h <= 3.9) add('pbg2h', '餐后2h血糖', 4, `餐后2h血糖 ${pbg2h}mmol/L，偏低`, 'indicator')
      else if (pbg2h < 4.4) add('pbg2h', '餐后2h血糖', 2, `餐后2h血糖 ${pbg2h}mmol/L，略低`, 'indicator')
      else if (pbg2h >= 10.0) add('pbg2h', '餐后2h血糖', 4, `餐后2h血糖 ${pbg2h}mmol/L，偏高`, 'indicator')
    }

    const dietCount = Array.isArray(answers.regularDietary)
      ? this.countSelected(answers.regularDietary, '以上全无')
      : (answers.regularDietary && answers.regularDietary !== '以上全无' && answers.regularDietary !== '均衡饮食' ? 1 : 0)
    if (dietCount === 1) add('regularDietary', '饮食习惯', 1, '存在不利于慢病管理的饮食习惯', 'lifestyle')
    else if (dietCount >= 2) add('regularDietary', '饮食习惯', 2, '存在多项不利于慢病管理的饮食习惯', 'lifestyle')
    if (answers.regularSports === '无') add('regularSports', '运动习惯', 2, '缺少规律运动', 'lifestyle')
    else if (answers.regularSports === '1-2次') add('regularSports', '运动习惯', 1, '运动频次偏少', 'lifestyle')
    if (answers.sportsTime === '<30分钟') add('sportsTime', '运动时间', 1, '单次运动时间偏短', 'lifestyle')
    if (answers.smoke === '是' || answers.smoke === '大量吸烟') add('smoke', '吸烟', 4, '吸烟会增加慢病风险', 'lifestyle')
    if (answers.drink === '>=100ml') add('drink', '饮酒量', 4, '每日饮酒量偏高', 'lifestyle')
    if (answers.sleep === '<6小时') add('sleep', '睡眠', 4, '睡眠时长不足', 'lifestyle')
    if (answers.nervousness === '是') add('nervousness', '精神压力', 2, '长期精神高度紧张', 'lifestyle')
    if (answers.sit === '>=8小时') add('sit', '久坐', 2, '每日静坐时间偏长', 'lifestyle')

    const cappedIndicatorDeduction = Math.min(indicatorDeduction, 26)
    deduction += cappedIndicatorDeduction + lifestyleDeduction
    const score = Math.max(0, 100 - deduction)
    const riskLevel = score >= 85 ? 'low' : score >= 70 ? 'medium' : 'high'
    const riskMeta = getRiskMeta(riskLevel)
    const primaryAdvice = this.getPrimaryAdvice({
      answers,
      abnormalItems,
      diseaseCount,
      indicatorCount: abnormalItems.filter((item) => ['bmi', 'bpUnknown', 'sbp', 'dbp', 'waistline', 'bsUnknown', 'fpg', 'pbg2h'].includes(item.code)).length,
      lifestyleDeduction,
      deduction
    })

    return {
      score,
      deduction,
      riskLevel,
      riskName: riskMeta.riskName,
      riskText: riskMeta.resultTitle,
      resultTitle: riskMeta.resultTitle,
      homeTitle: riskMeta.homeTitle,
      primaryAdvice,
      abnormalItems,
      summaryMetrics: this.buildSummaryMetrics(abnormalItems, answers),
      submittedAt: new Date().toISOString()
    }
  },

  buildSummaryMetrics(abnormalItems, answers) {
    const has = (codes) => abnormalItems.some((item) => codes.includes(item.code))
    const hasDiabetes = (answers.disease || []).includes('糖尿病')
    return [
      {
        label: '疾病风险',
        value: this.countSelected(answers.disease, '无') > 0 ? '需管理' : '未发现'
      },
      {
        label: '指标风险',
        value: has(['bmi', 'bpUnknown', 'sbp', 'dbp', 'waistline', 'bsUnknown', 'fpg', 'pbg2h']) ? '异常' : '稳定'
      },
      {
        label: '生活方式',
        value: has(['regularDietary', 'regularSports', 'sportsTime', 'smoke', 'drink', 'sleep', 'nervousness', 'sit']) ? '需调整' : '良好'
      }
    ].map((item) => ({ ...item, value: hasDiabetes && item.label === '疾病风险' ? '糖尿病' : item.value }))
  },

  getPrimaryAdvice({ answers, abnormalItems, diseaseCount, indicatorCount, lifestyleDeduction, deduction }) {
    if (diseaseCount > 0 && indicatorCount >= 2 && lifestyleDeduction > 0) {
      return '您目前处于疾病状态，且存在多个指标异常，生活方式也需要调整，建议您尽快规范治疗，改变生活方式，控制疾病发展。'
    }
    if (diseaseCount > 0) {
      return '建议您对目前所患的相关疾病进行定期就诊，做好疾病监测，积极治疗。'
    }
    const indicatorNames = abnormalItems
      .filter((item) => ['bmi', 'sbp', 'dbp', 'waistline', 'fpg', 'pbg2h'].includes(item.code))
      .map((item) => item.label)
    if (indicatorNames.length) {
      return `您目前${Array.from(new Set(indicatorNames)).join('、')}异常，建议做好数据监测，改善生活方式，定期体检，做好疾病预防。`
    }
    if (answers.bpAbnormal === '未知' || answers.bsAbnormal === '未知') {
      const names = []
      if (answers.bpAbnormal === '未知') names.push('血压')
      if (answers.bsAbnormal === '未知') names.push('血糖')
      return `您应该关注${names.join('、')}，了解自己健康状况，做好健康监测。`
    }
    if (lifestyleDeduction > 0) {
      const extra = []
      if (answers.drink === '>=100ml') extra.push('避免过量饮酒')
      if (answers.smoke === '是' || answers.smoke === '大量吸烟') extra.push('务必戒烟')
      if (answers.nervousness === '是') extra.push('避免长期精神紧张')
      if (answers.sit === '>=8小时') extra.push('减少长时间静坐')
      return `您目前的生活方式存在健康风险，建议您培养健康生活习惯，请保持规律饮食、良好的运动习惯与充足的睡眠${extra.length ? '，' + extra.join('，') : ''}。`
    }
    if (this.countSelected(answers.family, '无') > 0) {
      const list = answers.family.filter((item) => item !== '无').join('、')
      return `您目前最需要关注的是有${list}疾病家族史，属于高风险人群，建议您积极预防。`
    }
    if (deduction > 0) {
      return '您目前属于慢性疾病高发年龄，建议做好生活方式管理，定期体检，做好疾病预防。'
    }
    return '您目前健康状态良好，建议您继续保持良好生活习惯，做好疾病预防。'
  },

  getAge(dateString) {
    if (this.data.answers.age) return Number(this.data.answers.age)
    if (!dateString) return 0
    const birthYear = Number(dateString.slice(0, 4))
    return getCurrentYear() - birthYear
  },

  countSelected(list, emptyValue) {
    if (!Array.isArray(list)) return 0
    return list.filter((item) => item !== emptyValue).length
  }
})
