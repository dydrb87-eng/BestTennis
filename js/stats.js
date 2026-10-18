/**
 * Statistics & Standings Module with Monthly Checkbox Filtering
 */
const StatsManager = {
  sortKey: 'winRate',
  sortOrder: 'desc',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const exportExcelBtn = document.getElementById('exportExcelStatsBtn');
    const exportJsonBtn = document.getElementById('exportJsonDataBtn');
    const importJsonInput = document.getElementById('importJsonFileInput');

    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportToExcel());
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => App.exportJsonBackup());
    if (importJsonInput) importJsonInput.addEventListener('change', (e) => App.importJsonBackup(e.target.files[0]));
  },

  setSort(key) {
    if (this.sortKey === key) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortOrder = 'desc';
    }
    this.calculateAndRender();
  },

  renderMonthCheckboxes() {
    const container = document.getElementById('statsMonthCheckboxes');
    if (!container) return;

    if (!App.monthList || App.monthList.length === 0) {
      container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">등록된 월례대회가 없습니다.</span>`;
      return;
    }

    container.innerHTML = App.monthList.map(m => {
      const isChecked = App.selectedStatsMonths.includes(m);
      return `
        <label class="month-checkbox-item">
          <input type="checkbox" value="${m}" ${isChecked ? 'checked' : ''} onchange="StatsManager.toggleMonthFilter('${m}', this.checked)">
          <span>${m}</span>
        </label>
      `;
    }).join('');
  },

  toggleMonthFilter(monthName, isChecked) {
    if (isChecked) {
      if (!App.selectedStatsMonths.includes(monthName)) {
        App.selectedStatsMonths.push(monthName);
      }
    } else {
      App.selectedStatsMonths = App.selectedStatsMonths.filter(m => m !== monthName);
    }
    App.saveState();
    this.calculateAndRender();
  },

  calculateStats() {
    const statsMap = {};

    ParticipantManager.list.forEach(p => {
      statsMap[p.id] = {
        id: p.id,
        name: p.name,
        gender: p.gender,
        played: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        ptsWon: 0,
        ptsLost: 0,
        ptsDiff: 0
      };
    });

    // Iterate over selected months' matches
    App.selectedStatsMonths.forEach(mName => {
      const tournament = App.tournaments[mName];
      if (!tournament || !tournament.matches) return;

      tournament.matches.forEach(m => {
        const sA = parseInt(m.scoreA, 10);
        const sB = parseInt(m.scoreB, 10);

        if (!isNaN(sA) && !isNaN(sB)) {
          // Team A stats
          m.teamA.forEach(id => {
            if (statsMap[id]) {
              statsMap[id].played += 1;
              statsMap[id].ptsWon += sA;
              statsMap[id].ptsLost += sB;

              if (sA > sB) statsMap[id].wins += 1;
              else if (sB > sA) statsMap[id].losses += 1;
            }
          });

          // Team B stats
          m.teamB.forEach(id => {
            if (statsMap[id]) {
              statsMap[id].played += 1;
              statsMap[id].ptsWon += sB;
              statsMap[id].ptsLost += sA;

              if (sB > sA) statsMap[id].wins += 1;
              else if (sA > sB) statsMap[id].losses += 1;
            }
          });
        }
      });
    });

    // Compute derived properties
    const resultList = Object.values(statsMap).map(st => {
      st.winRate = st.played > 0 ? (st.wins / st.played) * 100 : 0;
      st.ptsDiff = st.ptsWon - st.ptsLost;
      return st;
    });

    // Sort result list
    resultList.sort((a, b) => {
      let valA = a[this.sortKey];
      let valB = b[this.sortKey];

      if (valA === valB) {
        if (this.sortKey !== 'winRate') {
          valA = a.winRate;
          valB = b.winRate;
        }
        if (valA === valB) {
          valA = a.ptsDiff;
          valB = b.ptsDiff;
        }
      }

      if (typeof valA === 'string') {
        return this.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return this.sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return resultList;
  },

  calculateAndRender() {
    this.renderMonthCheckboxes();

    const tbody = document.getElementById('statsTableBody');
    if (!tbody) return;

    const stats = this.calculateStats();
    this.updateSortHeaders();

    if (stats.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-state">
            <i class="ph ph-chart-bar"></i>
            <p>등록된 참가자가 없습니다.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = stats.map((st, index) => {
      let rankBadgeClass = 'rank-badge';
      if (index === 0) rankBadgeClass += ' rank-1';
      else if (index === 1) rankBadgeClass += ' rank-2';
      else if (index === 2) rankBadgeClass += ' rank-3';

      const genderBadge = st.gender === 'F' ? '<span class="badge-f">(여)</span>' : '<span class="badge-m">(남)</span>';
      
      let diffClass = 'diff-zero';
      let diffSign = '';
      if (st.ptsDiff > 0) {
        diffClass = 'diff-positive';
        diffSign = '+';
      } else if (st.ptsDiff < 0) {
        diffClass = 'diff-negative';
      }

      return `
        <tr>
          <td style="text-align: center;"><span class="${rankBadgeClass}">${index + 1}</span></td>
          <td><strong>${st.name}</strong> ${genderBadge}</td>
          <td style="text-align: center;">${st.played}</td>
          <td style="text-align: center; color: var(--primary); font-weight: 700;">${st.wins}</td>
          <td style="text-align: center; color: var(--text-muted);">${st.losses}</td>
          <td style="text-align: center; font-weight: 700;">${st.winRate.toFixed(1)}%</td>
          <td style="text-align: center;">${st.ptsWon}</td>
          <td style="text-align: center; color: var(--text-muted);">${st.ptsLost}</td>
          <td style="text-align: center;" class="${diffClass}">${diffSign}${st.ptsDiff}</td>
        </tr>
      `;
    }).join('');
  },

  updateSortHeaders() {
    const headers = document.querySelectorAll('#statsTable th.sortable');
    headers.forEach(th => {
      const key = th.dataset.sort;
      const icon = th.querySelector('.sort-icon');
      if (icon) {
        if (key === this.sortKey) {
          th.style.color = 'var(--primary)';
          icon.className = `sort-icon ph ph-caret-${this.sortOrder === 'asc' ? 'up' : 'down'}`;
        } else {
          th.style.color = '';
          icon.className = 'sort-icon ph ph-caret-up-down';
        }
      }
    });
  },

  exportToExcel() {
    const stats = this.calculateStats();
    if (stats.length === 0) {
      Toast.show('내보낼 통계 데이터가 없습니다.', 'error');
      return;
    }

    const excelData = stats.map((st, index) => ({
      '순위': index + 1,
      '이름': st.name,
      '성별': st.gender === 'M' ? '남성' : '여성',
      '총 경기 수': st.played,
      '승': st.wins,
      '패': st.losses,
      '승률 (%)': Number(st.winRate.toFixed(1)),
      '총 득점': st.ptsWon,
      '총 실점': st.ptsLost,
      '득실차': st.ptsDiff
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '대회통계');
    
    const selectedMonthsStr = App.selectedStatsMonths.join('_');
    XLSX.writeFile(wb, `테니스월례대회_통계_${selectedMonthsStr}.xlsx`);
    Toast.show(`선택한 월례대회(${selectedMonthsStr})의 통계 엑셀 파일이 다운로드되었습니다.`);
  }
};
