const scaleStore = require('../../../utils/scale-store');

Page({
  data: {
    grade: 0,
    levelName: '',
    levelColor: '',
    levelDesc: '',
    selectedLabel: '',
    goldGroup: '',
    questionTitle: '',
    questionText: '',
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '缺少评估记录', icon: 'none' });
      return;
    }

    const records = scaleStore.loadRecords();
    const record = records.find(r => r.id === id);
    if (!record) {
      wx.showToast({ title: '评估记录不存在', icon: 'none' });
      return;
    }

    const result = scaleStore.computeMmrcResult(record.answers || {});
    const question = scaleStore.MMRC_SCALE.questions[0];

    this.setData({
      grade: result.grade,
      levelName: result.levelName,
      levelColor: result.levelColor,
      levelDesc: result.levelDesc,
      selectedLabel: result.selectedLabel,
      goldGroup: result.goldGroup,
      questionTitle: question.title,
      questionText: question.text,
    });
  },

  goBack() {
    wx.navigateBack();
  },
});