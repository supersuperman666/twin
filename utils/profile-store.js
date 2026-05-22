const PROFILE_KEY = 'healthProfile'
const SCREENING_ANSWERS_KEY = 'screeningAnswers'

const defaultProfile = {
  sex: '',
  birthDate: '',
  height: '',
  weight: '',
  waistline: '',
  neckCircumference: '',
  disease: [],
  diseaseDurations: {},
  otherDisease: '',
  surgery: '',
  surgeryNote: '',
  family: [],
  allergy: '',
  allergyNote: '',
  smoke: '',
  smokingYears: '',
  cigarettesPerDay: '',
  quitSmokingTime: '',
  alcoholic: '',
  drink: '',
  regularSports: '',
  sportsTime: '',
  regularDietary: '',
  sleep: '',
  sleepQuality: 0,
  nervousness: '',
  sit: '',
  exposureHistory: [],
  symptoms: [],
  symptomNote: '',
  medications: [],
  medicationNote: '',
  checkupTime: '',
  examAbnormal: [],
  healthGoals: [],
  bpAbnormal: '',
  sbp: '',
  dbp: '',
  bsAbnormal: '',
  fpg: '',
  pbg2h: '',
  updatedAt: ''
}

function getStoredProfile() {
  return wx.getStorageSync(PROFILE_KEY) || null
}

function getScreeningSeed() {
  const answers = wx.getStorageSync(SCREENING_ANSWERS_KEY) || {}
  return {
    sex: answers.sex || '',
    height: answers.height || '',
    weight: answers.weight || '',
    waistline: answers.waistline || '',
    disease: answers.disease || [],
    diseaseDurations: answers.diseaseDurations || {},
    otherDisease: answers.otherDisease || '',
    surgery: answers.surgery || '',
    surgeryNote: answers.surgeryNote || '',
    family: answers.family || [],
    allergy: answers.allergy || '',
    allergyNote: answers.allergyNote || '',
    smoke: answers.smoke || '',
    alcoholic: answers.alcoholic || '',
    drink: answers.drink || '',
    regularSports: answers.regularSports || '',
    sportsTime: answers.sportsTime || '',
    regularDietary: answers.regularDietary || '',
    sleep: answers.sleep || '',
    sleepQuality: answers.sleepQuality || 0,
    nervousness: answers.nervousness || '',
    sit: answers.sit || '',
    symptoms: answers.symptoms || [],
    symptomNote: answers.symptomNote || '',
    medications: answers.medications || [],
    medicationNote: answers.medicationNote || '',
    checkupTime: answers.checkupTime || '',
    examAbnormal: answers.examAbnormal || [],
    healthGoals: answers.healthGoals || [],
    bpAbnormal: answers.bpAbnormal || '',
    sbp: answers.sbp || '',
    dbp: answers.dbp || '',
    bsAbnormal: answers.bsAbnormal || '',
    fpg: answers.fpg || '',
    pbg2h: answers.pbg2h || ''
  }
}

function getProfile() {
  const stored = getStoredProfile()
  if (stored) return { ...defaultProfile, ...stored }
  return { ...defaultProfile, ...getScreeningSeed() }
}

function saveProfile(profile) {
  const next = {
    ...defaultProfile,
    ...profile,
    updatedAt: new Date().toISOString()
  }
  wx.setStorageSync(PROFILE_KEY, next)
  return next
}

module.exports = {
  getProfile,
  saveProfile
}
