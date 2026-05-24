const scaleStore = require('../../../utils/scale-store');

Page({
  data: {
    questions: scaleStore.CAT_SCALE.questions,
    currentIndex: 0,
    currentQuestion: null,
    answers: {},
    selectedIndex: null,
    progressPercent: 0,
    totalCount: 8,
    isTransitioning: false,
  },

  onLoad() {
    const draft = scaleStore.loadDraft('cat');
    let answers = {};
    let currentIndex = 0;
    if (draft && draft.answers) {
      answers = draft.answers;
      // Find the first unanswered question
      for (let i = 0; i < scaleStore.CAT_SCALE.questions.length; i++) {
        if (answers[scaleStore.CAT_SCALE.questions[i].id] === undefined) {
          currentIndex = i;
          break;
        }
        if (i === scaleStore.CAT_SCALE.questions.length - 1) {
          currentIndex = i;
        }
      }
    }
    this.setData({ answers, currentIndex }, () => this.refreshQuestion());
  },

  refreshQuestion() {
    const questions = this.data.questions;
    const idx = this.data.currentIndex;
    const q = questions[idx];
    const answers = this.data.answers;
    const selectedIdx = answers[q.id] !== undefined ? answers[q.id] : null;
    const answeredCount = questions.filter(qq => answers[qq.id] !== undefined).length;
    const progressPercent = ((answeredCount) / questions.length) * 100;

    this.setData({
      currentQuestion: q,
      selectedIndex: selectedIdx,
      progressPercent,
    });
  },

  onOptionTap(e) {
    const { index } = e.currentTarget.dataset;
    const q = this.data.currentQuestion;
    const answers = { ...this.data.answers };
    answers[q.id] = index;

    this.setData({
      answers,
      selectedIndex: index,
      isTransitioning: true,
    });

    // Auto-advance after short delay
    setTimeout(() => {
      scaleStore.saveDraft('cat', { answers });

      if (this.data.currentIndex < this.data.questions.length - 1) {
        const nextIndex = this.data.currentIndex + 1;
        this.setData({
          currentIndex: nextIndex,
          isTransitioning: false,
        }, () => this.refreshQuestion());
      } else {
        // All questions answered — compute result and save
        const result = scaleStore.computeCatResult(answers);
        const record = {
          id: 'cat_' + Date.now(),
          scaleCode: 'cat',
          totalScore: result.total,
          levelName: result.levelName,
          levelColor: result.levelColor,
          answers: { ...answers },
          completedAt: result.completedAt,
        };
        scaleStore.addRecord(record);
        scaleStore.clearDraft('cat');

        this.setData({ isTransitioning: false });

        wx.redirectTo({
          url: `/pages/scale/cat-result/index?id=${record.id}`,
        });
      }
    }, 300);
  },

  goPrev() {
    if (this.data.currentIndex > 0) {
      this.setData({
        currentIndex: this.data.currentIndex - 1,
      }, () => this.refreshQuestion());
    } else {
      wx.navigateBack();
    }
  },

  goNext() {
    if (this.data.selectedIndex === null) {
      wx.showToast({ title: '请先选择一个选项', icon: 'none' });
      return;
    }
    if (this.data.currentIndex < this.data.questions.length - 1) {
      this.setData({
        currentIndex: this.data.currentIndex + 1,
      }, () => this.refreshQuestion());
    }
  },

  handleBack() {
    if (this.data.currentIndex > 0) {
      this.setData({
        currentIndex: this.data.currentIndex - 1,
      }, () => this.refreshQuestion());
    } else {
      wx.navigateBack();
    }
  },
});