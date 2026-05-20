const planStore = require('../../utils/plan-store');
const recordStore = require('../../utils/record-store');

Page({
  data: {
    pageState: 'loading',   // 'empty' | 'pending_confirm' | 'active'
    plan: null,
    activeTab: 0,           // 0=今日任务  1=方案详情  2=随访计划
    tasks: [],
    doneCount: 0,
    totalCount: 0,
    progressPct: 0,
    doctorAdviceNote: '',
    showQuestionModal: false,
    questionInput: '',
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
    const guidanceMod = plan.modules.find(m => m.key === 'guidance');
    this.setData({
      plan,
      tasks,
      doneCount,
      totalCount,
      progressPct: totalCount ? Math.round(doneCount / totalCount * 100) : 0,
      pageState: plan.patientStatus === 'pending_confirm' ? 'pending_confirm' : 'active',
      doctorAdviceNote: guidanceMod ? guidanceMod.note : '',
    });
  },

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

  onTabChange(e) {
    this.setData({ activeTab: +e.currentTarget.dataset.tab });
  },

  onConfirmPlan() {
    wx.showModal({
      title: '确认开始执行',
      content: '确认后将正式开始此管理方案，每日任务将同步更新',
      confirmText: '开始执行',
      cancelText: '再看看',
      success: res => {
        if (!res.confirm) return;
        const plan = planStore.confirmPlan();
        const taskStatus = planStore.getTaskStatus();
        const tasks = this._buildTasks(plan.tasks, taskStatus);
        const doneCount = tasks.filter(t => t.done).length;
        const guidanceMod = plan.modules.find(m => m.key === 'guidance');
        this.setData({
          pageState: 'active',
          plan,
          tasks,
          doneCount,
          totalCount: tasks.length,
          progressPct: tasks.length ? Math.round(doneCount / tasks.length * 100) : 0,
          doctorAdviceNote: guidanceMod ? guidanceMod.note : '',
        });
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

  onTaskAction(e) {
    const task = e.currentTarget.dataset.task;
    if (task.done) return;
    if (task.type === 'metric') {
      const routeMap = {
        glucose: '/pages/record/form/index?type=glucose',
        blood_pressure: '/pages/record/form/index?type=blood_pressure',
        oxygen: '/pages/record/form/index?type=oxygen',
      };
      wx.navigateTo({ url: routeMap[task.metricCode] || '/pages/record/index' });
    } else if (task.type === 'medication') {
      wx.navigateTo({ url: '/pages/medication/detail/index' });
    } else if (task.type === 'lifestyle') {
      const status = planStore.completeTask(task.id);
      const tasks = this.data.tasks.map(t => t.id === task.id ? { ...t, done: true } : t);
      const doneCount = tasks.filter(t => t.done).length;
      this.setData({
        tasks,
        doneCount,
        progressPct: Math.round(doneCount / tasks.length * 100),
      });
      wx.showToast({ title: '已打卡', icon: 'success', duration: 1000 });
    }
  },

  goScreening() {
    wx.navigateTo({ url: '/pages/screening/index' });
  },
});
