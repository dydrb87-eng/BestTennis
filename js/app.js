/**
 * Main Application Orchestrator & Multi-Month State Manager with Firebase Sync
 */
const App = {
  STORAGE_KEY: 'BEST_TENNIS_CLUB_DATA_V2',

  activeMonth: '3월',
  monthList: ['3월'],
  tournaments: {
    '3월': { currentRound: 0, matches: [], pairingHistory: [], absentPlayers: [], matchMode: 'regular' }
  },
  selectedStatsMonths: ['3월'],

  init() {
    this.bindNavigation();
    this.loadState();
    
    // Initialize sub-modules
    ParticipantManager.init();
    MatchingManager.init();
    StatsManager.init();
    FirebaseManager.init();

    // Render initial views
    ParticipantManager.render();
    MatchingManager.render();
    StatsManager.calculateAndRender();
  },

  bindNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = document.getElementById(targetTab);
        if (targetPane) targetPane.classList.add('active');

        if (targetTab === 'tab-matching') {
          MatchingManager.render();
        } else if (targetTab === 'tab-stats') {
          StatsManager.calculateAndRender();
        }
      });
    });
  },

  saveState() {
    MatchingManager.saveCurrentMonthData();

    const data = {
      participants: ParticipantManager.list,
      activeMonth: this.activeMonth,
      monthList: this.monthList,
      tournaments: this.tournaments,
      selectedStatsMonths: this.selectedStatsMonths,
      updatedAt: new Date().toISOString()
    };

    // Save to browser local storage
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }

    // Save to Firebase Realtime Cloud DB (for multi-device live sync)
    FirebaseManager.saveToCloud(data);
  },

  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      if (data.participants) ParticipantManager.list = data.participants;
      if (data.monthList && data.monthList.length > 0) this.monthList = data.monthList;
      if (data.activeMonth && this.monthList.includes(data.activeMonth)) this.activeMonth = data.activeMonth;
      else if (this.monthList.length > 0) this.activeMonth = this.monthList[0];

      if (data.tournaments) this.tournaments = data.tournaments;
      if (data.selectedStatsMonths) this.selectedStatsMonths = data.selectedStatsMonths;
      else this.selectedStatsMonths = [...this.monthList];

      MatchingManager.loadActiveMonthData();
    } catch (e) {
      console.error('LocalStorage load error:', e);
    }
  },

  exportJsonBackup() {
    this.saveState();
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      Toast.show('백업할 데이터가 없습니다.', 'error');
      return;
    }
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `테니스대회_전체백업_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('전체 대회 백업 파일이 다운로드되었습니다.');
  },

  importJsonBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsed = JSON.parse(content);
        if (!parsed.participants) throw new Error('유효하지 않은 백업 형식입니다.');

        localStorage.setItem(this.STORAGE_KEY, content);
        this.loadState();
        ParticipantManager.render();
        MatchingManager.render();
        StatsManager.calculateAndRender();
        this.saveState();
        Toast.show('전체 대회 백업 데이터가 성공적으로 복원되고 클라우드에 연동되었습니다!');
      } catch (err) {
        console.error(err);
        Toast.show('JSON 파일 복원 중 오류가 발생했습니다.', 'error');
      }
    };
    reader.readAsText(file);
  }
};

/**
 * Toast Notification Utility
 */
const Toast = {
  show(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `
      <i class="ph ph-${type === 'error' ? 'warning-circle' : 'check-circle'}" style="font-size: 1.3rem; color: var(--${type === 'error' ? 'danger' : 'primary'});"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
