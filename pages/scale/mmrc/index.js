const scaleStore = require('../../../utils/scale-store');

Page({
  data: {
    question: null,
    selectedIndex: null,
    isTransitioning: false,
  },

  onLoad() {
    const question = scaleStore.MMRC_SCALE.questions[0];
    const draft = scaleStore.loadDraft('mmrc');
    let selectedIndex = null;
    if (draft && draft.answers && draft.answers.q1 !== undefined) {
      selectedIndex = draft.answers.q1;
    }
    this.setData({ question, selectedIndex });
  },

  onOptionTap(e) {
    const { index } = e.currentTarget.dataset;
    const answers = { q1: index };

    this.setData({
      selectedIndex: index,
      isTransitioning: true,
    });

    setTimeout(() => {
      const result = scaleStore.computeMmrcResult(answers);
      const record = {
        id: 'mmrc_' + Date.now(),
        scaleCode: 'mmrc',
        grade: result.grade,
        levelName: result.levelName,
        levelColor: result.levelColor,
        answers: { ...answers },
        completedAt: result.completedAt,
      };
      scaleStore.addRecord(record);
      scaleStore.clearDraft('mmrc');

      this.setData({ isTransitioning: false });

      wx.redirectTo({
        url: `/pages/scale/mmrc-result/index?id=${record.id}`,
      });
    }, 300);
  },

  goBack() {
    wx.navigateBack();
  },
});