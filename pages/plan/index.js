const planStore = require('../../utils/plan-store');
const recordStore = require('../../utils/record-store');
const interventionStore = require('../../utils/intervention-store');

Page({
  data: {
    pageState: 'loading',
    plan: null,
    // 执行态数据
    adviceList: [],
    recheckPlans: [],
    recheckProgress: {},
    activeFollowups: [],
    followupPrepareStatus: {},
    nearestFollowup: null,
    // 今日任务轻入口
    doneCount: 0,
    totalCount: 0,
    // 方案明细编译
    compiledMetrics: [],
    compiledLifestyle: [],
    compiledMedication: '',
    compiledDevice: '',
    compiledFollowupPace: '',
    // 阶段说明
    stageGoal: '',
    dailyToDo: [],
    abnormalHandling: '',
    // 待确认态
    showQuestionModal: false,
    questionInput: '',
    // 建议抽屉
    showAdviceDrawer: false,
    currentAdvice: null,
    // 方案明细展开
    detailExpanded: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadPlan();
  },

  loadPlan() {
    const plan = planStore.getPlan();
    if (!plan) {
      this.setData({ pageState: 'empty' });
      return;
    }
    const taskStatus = planStore.getTaskStatus();
    const tasks = this._buildTasks(plan.tasks, taskStatus);
    const doneCount = tasks.filter(t => t.done).length;
    const totalCount = tasks.length;

    // 干预数据
    const adviceList = interventionStore.getAdviceList();
    const recheckPlans = interventionStore.getActiveRecheckPlans();
    const recheckProgress = {};
    recheckPlans.forEach(r => {
      recheckProgress[r.id] = interventionStore.computeRecheckProgress(r.id);
    });
    const activeFollowups = interventionStore.getActiveFollowups();
    const followupPrepareStatus = {};
    activeFollowups.forEach(f => {
      followupPrepareStatus[f.id] = interventionStore.computeFollowupPrepareStatus(f.id);
    });

    // 最近一次随访（首屏只展示 1 条）
    let nearestFollowup = null;
    if (activeFollowups.length) {
      nearestFollowup = activeFollowups[0];
    }

    // 方案明细编译
    const metricsMod = plan.modules.find(m => m.key === 'metrics');
    const lifestyleMod = plan.modules.find(m => m.key === 'lifestyle');
    const medicationMod = plan.modules.find(m => m.key === 'medication');
    const deviceMod = plan.modules.find(m => m.key === 'device');
    const followupMod = plan.modules.find(m => m.key === 'followup');
    const guidanceMod = plan.modules.find(m => m.key === 'guidance');

    this.setData({
      plan,
      pageState: plan.patientStatus === 'pending_confirm' ? 'pending_confirm' : 'active',
      tasks,
      doneCount,
      totalCount,
      adviceList,
      recheckPlans,
      recheckProgress,
      activeFollowups,
      followupPrepareStatus,
      nearestFollowup,
      compiledMetrics: metricsMod ? this._compileMetrics(metricsMod) : [],
      compiledLifestyle: lifestyleMod ? this._compileLifestyle(lifestyleMod) : [],
      compiledMedication: medicationMod && medicationMod.included ? this._compileMedication(medicationMod) : '',
      compiledDevice: deviceMod && deviceMod.included ? this._compileDevice(deviceMod) : '',
      compiledFollowupPace: followupMod ? this._compileFollowupPace(followupMod, plan) : '',
      stageGoal: guidanceMod ? (guidanceMod.fields || {}).stageGoalExplanation || plan.objective : plan.objective,
      dailyToDo: guidanceMod ? (guidanceMod.fields || {}).dailyToDo || [] : [],
      abnormalHandling: guidanceMod ? (guidanceMod.fields || {}).abnormalHandling || plan.abnormalTips || '' : plan.abnormalTips || '',
    });
  },

  // ─── 编译方法 ───

  _compileMetrics(mod) {
    // Handle structured fields.metricItems (from doctor PC data)
    const metricItems = (mod.fields && mod.fields.metricItems) || [];
    if (metricItems.length) {
      const result = [];
      metricItems.forEach(mi => {
        const scenes = mi.scenes || [];
        scenes.forEach(scene => {
          const sceneExpr = this._mapScene(mi.metricName, scene);
          const freqExpr = this._mapFrequency(mi.frequency);
          result.push(sceneExpr + '：' + freqExpr);
        });
      });
      return result;
    }
    // Handle legacy string items (from plan-store SEED)
    const stringItems = mod.items || [];
    if (!stringItems.length) return [];
    return stringItems.map(line => line);
  },

  _mapScene(metricName, scene) {
    const m = {
      '血糖-凌晨': '凌晨血糖', '血糖-空腹': '空腹血糖',
      '血糖-早餐后2h': '餐后血糖', '血糖-午餐后2h': '餐后血糖', '血糖-晚餐后2h': '餐后血糖',
      '血糖-午餐前': '餐前血糖', '血糖-晚餐前': '餐前血糖',
      '血糖-睡前': '睡前血糖', '血糖-随机': '随机血糖',
      '血压-晨起': '晨起血压', '血压-睡前': '睡前血压', '血压-随机': '日间血压',
      'SpO2-静息': '静息后血氧', 'SpO2-静息后': '静息后血氧',
      'SpO2-活动后': '活动后血氧', 'SpO2-睡前': '睡前血氧',
      '呼吸频率-静息': '静息后呼吸情况', '呼吸频率-静息后': '静息后呼吸情况',
      '呼吸频率-活动后': '活动后呼吸情况', '呼吸频率-睡前': '睡前呼吸情况',
      '睡眠报告-起床后': '睡眠情况', '睡眠报告-夜间': '睡眠情况', '睡眠报告-每次睡眠报告后': '睡眠情况',
      '静息 SpO2-静息': '静息后血氧', '静息 SpO2-静息后': '静息后血氧',
      '空腹血糖-空腹': '空腹血糖',
      '餐后 2h 血糖-早餐后': '餐后血糖', '餐后 2h 血糖-午餐后': '餐后血糖', '餐后 2h 血糖-晚餐后': '餐后血糖',
      '最低血氧-夜间': '夜间最低血氧',
      'CPAP 使用时长-夜间': 'CPAP 使用时长',
      '睡眠时长-夜间': '睡眠时长',
      'AHI-夜间': 'AHI',
      '血压-晨起': '晨起血压',
    };
    return m[metricName + '-' + scene] || (metricName + '（' + scene + '）');
  },

  _mapFrequency(freq) {
    const m = {
      '每日': '每天测 1 次', '每日1次': '每天测 1 次',
      '每日2次': '每天测 2 次', '每日3次': '每天测 3 次', '每日4次': '每天测 4 次',
      '每 8 小时 1 次': '大约每 8 小时测 1 次', '每 12 小时 1 次': '大约每 12 小时测 1 次',
      '隔日1次': '每隔一天测 1 次', '每3日1次': '每 3 天测 1 次',
      '每周至少2次': '每周按要求测 2 天', '每周至少 2 次': '每周按要求测 2 天',
      '每周至少3天': '每周按要求测 3 天', '每周3次': '每周按要求测 3 天',
      '每周按要求测 N 天': '每周按要求测量',
      '一次': '按要求完成 1 次',
      '必要时': '不舒服或医生提醒时补充记录',
      '紧急时': '出现明显异常时立即记录或补充',
      '每日夜间': '每天测 1 次', '睡眠报告后': '每天测 1 次',
      '每次测量后': '按要求完成测量',
      '每周': '每周按要求测量',
      '每周至少 3 天': '每周按要求测 3 天',
      '每 2 周': '每两周按要求测量',
      '每月': '每月按要求测量',
      '出现时记录': '出现时补充记录',
    };
    return m[freq] || freq;
  },

  _compileLifestyle(mod) {
    // Handle structured fields.guidanceItems (from doctor PC data)
    const guidanceItems = (mod.fields && mod.fields.guidanceItems) || [];
    if (guidanceItems.length) {
      return guidanceItems.map(g => {
        if (g.frequency && g.frequency !== '持续' && g.frequency !== '每日') {
          return g.instruction + '（' + g.frequency + '）';
        }
        return g.instruction;
      });
    }
    // Handle legacy string items (from plan-store SEED)
    const stringItems = mod.items || [];
    if (!stringItems.length) return [];
    return stringItems.map(line => line);
  },

  _compileMedication(mod) {
    const items = (mod.fields && mod.fields.medicationItems) || [];
    if (!items.length) return [];
    return items.map(mi => mi.drugName + ' ' + mi.dose + ' · ' + mi.frequency);
  },

  _compileDevice(mod) {
    const items = (mod.fields && mod.fields.deviceItems) || [];
    if (!items.length) return [];
    return items.map(di => di.deviceType + '：请保持正常同步');
  },

  _compileFollowupPace(mod, plan) {
    const rule = (mod.fields && mod.fields.followupRule) || {};
    const lines = [];
    if (rule.frequencyRule) {
      lines.push('本阶段医生将按计划进行随访复盘');
    }
    if (rule.firstFollowupAfterDays) {
      lines.push('下次随访：方案开始后第 ' + rule.firstFollowupAfterDays + ' 天');
    }
    if (!lines.length) {
      lines.push('本阶段将根据情况安排随访跟进');
    }
    return lines;
  },

  // ─── 交互方法 ───

  _buildTasks(rawTasks, taskStatus) {
    const todayStr = this._todayStr();
    const glucoseRecords = recordStore.listRecords({ metric: 'glucose' });
    const todayGlucose = glucoseRecords.find(r => r.recorded_at && r.recorded_at.startsWith(todayStr));
    return rawTasks.map(t => {
      let done = !!taskStatus[t.id];
      let value = '';
      if (t.type === 'metric' && t.metricCode === 'glucose' && todayGlucose) {
        done = true;
        value = `${todayGlucose.value} mmol/L`;
      }
      return { ...t, done, value };
    });
  },

  _todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  noop() {},

  // 待确认态
  onConfirmPlan() {
    wx.showModal({
      title: '确认开始执行',
      content: '确认后将正式开始此管理方案，每日任务将同步更新',
      confirmText: '开始执行',
      cancelText: '再看看',
      success: res => {
        if (!res.confirm) return;
        const plan = planStore.confirmPlan();
        this.loadPlan();
        wx.showToast({ title: '方案已确认', icon: 'success' });
      },
    });
  },

  onQuestionTap() {
    this.setData({ showQuestionModal: true });
  },

  onQuestionInput(e) {
    this.setData({ questionInput: e.detail.value });
  },

  onSubmitQuestion() {
    const text = this.data.questionInput.trim();
    if (!text) {
      wx.showToast({ title: '请输入疑问内容', icon: 'none' });
      return;
    }
    planStore.reportQuestion(text);
    this.setData({ showQuestionModal: false, questionInput: '' });
    wx.showToast({ title: '疑问已提交给医生', icon: 'success' });
  },

  onCloseQuestion() {
    this.setData({ showQuestionModal: false, questionInput: '' });
  },

  // 执行态交互
  onAdviceTap(e) {
    const id = e.currentTarget.dataset.id;
    const advice = interventionStore.getAdviceById(id);
    if (!advice) return;
    interventionStore.markAdviceRead(id);
    this.setData({ showAdviceDrawer: true, currentAdvice: advice });
    this.loadPlan();
  },

  onAdviceClose() {
    this.setData({ showAdviceDrawer: false, currentAdvice: null });
  },

  onRecheckAction(e) {
    const planId = e.currentTarget.dataset.id;
    const plan = interventionStore.getRecheckPlanById(planId);
    if (!plan) return;
    const firstMetric = plan.metricCodes[0];
    const metricRouteMap = {
      '血糖': '/pages/record/form/index?type=glucose',
      'SpO2': '/pages/record/form/index?type=oxygen',
      '血压': '/pages/record/form/index?type=blood_pressure',
    };
    wx.navigateTo({ url: metricRouteMap[firstMetric] || '/pages/record/index' });
  },

  onFollowupPrepareTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/followup/records/index?highlight=${id}` });
  },

  onGoFollowupRecords() {
    wx.navigateTo({ url: '/pages/followup/records/index' });
  },

  onGoAdviceHistory() {
    wx.navigateTo({ url: '/pages/me/advice/index' });
  },

  onGoHistoryPlans() {
    wx.navigateTo({ url: '/pages/plan/history/index' });
  },

  onGoHomeTasks() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onToggleDetail() {
    this.setData({ detailExpanded: !this.data.detailExpanded });
  },

  goScreening() {
    wx.navigateTo({ url: '/pages/screening/index' });
  },
});
