/**
 * Matching Manager Module (Regular Doubles & Mixed Doubles Engine)
 */
const MatchingManager = {
  currentRound: 0,
  matches: [],
  pairingHistory: new Set(),
  absentPlayers: new Set(),

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const generateBtn = document.getElementById('generateMatchBtn');
    const deleteAllBtn = document.getElementById('deleteAllMatchesBtn');
    const addMonthBtn = document.getElementById('addMonthBtn');
    const deleteMonthBtn = document.getElementById('deleteMonthBtn');

    if (generateBtn) generateBtn.addEventListener('click', () => this.generateNextRound());
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', () => this.deleteAllMatches());
    if (addMonthBtn) addMonthBtn.addEventListener('click', () => this.promptAddMonth());
    if (deleteMonthBtn) deleteMonthBtn.addEventListener('click', () => this.deleteCurrentMonth());

    document.getElementsByName('matchMode').forEach(radio => {
      radio.addEventListener('change', () => App.saveState());
    });
  },

  saveCurrentMonthData() {
    const active = App.activeMonth;
    if (!active) return;
    App.tournaments[active] = {
      currentRound: this.currentRound,
      matches: this.matches,
      pairingHistory: Array.from(this.pairingHistory),
      absentPlayers: Array.from(this.absentPlayers),
      matchMode: this.getMatchMode()
    };
  },

  loadActiveMonthData() {
    const active = App.activeMonth;
    if (!active || !App.tournaments[active]) {
      this.currentRound = 0;
      this.matches = [];
      this.pairingHistory = new Set();
      this.absentPlayers = new Set();
      return;
    }
    const t = App.tournaments[active];
    this.currentRound = t.currentRound || 0;
    this.matches = t.matches || [];
    this.pairingHistory = new Set(t.pairingHistory || []);
    this.absentPlayers = new Set(t.absentPlayers || []);

    if (t.matchMode) {
      const radio = document.querySelector(`input[name="matchMode"][value="${t.matchMode}"]`);
      if (radio) radio.checked = true;
    }
  },

  toggleAbsent(participantId, isAbsent) {
    if (isAbsent) this.absentPlayers.add(participantId);
    else this.absentPlayers.delete(participantId);
    this.saveCurrentMonthData();
    this.renderParticipantCountsList();
    App.saveState();
  },

  deleteSingleMatch(matchId) {
    const targetIndex = this.matches.findIndex(m => m.id === matchId);
    if (targetIndex === -1) return;
    const gameNumStr = this.matches[targetIndex].gameNumber || (targetIndex + 1);
    if (confirm(`${gameNumStr}GAME 경기를 삭제하시겠습니까?`)) {
      this.matches.splice(targetIndex, 1);
      this.matches.forEach((m, idx) => { m.gameNumber = idx + 1; });
      this.currentRound = this.matches.length === 0 ? 0 : Math.max(...this.matches.map(m => m.round || 1));
      this.render();
      StatsManager.calculateAndRender();
      App.saveState();
      Toast.show(`${gameNumStr}GAME 경기가 삭제되었습니다.`);
    }
  },

  deleteAllMatches() {
    const active = App.activeMonth;
    if (this.matches.length === 0) { Toast.show('삭제할 경기가 없습니다.', 'error'); return; }
    if (confirm(`${active} 대회의 모든 경기를 삭제하시겠습니까?`)) {
      this.matches = [];
      this.currentRound = 0;
      this.pairingHistory.clear();
      this.render();
      StatsManager.calculateAndRender();
      App.saveState();
      Toast.show(`${active} 대회의 모든 경기가 삭제되었습니다.`);
    }
  },

  promptAddMonth() {
    const monthsAvailable = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const unadded = monthsAvailable.filter(m => !App.monthList.includes(m));
    if (unadded.length === 0) { Toast.show('모든 월례대회가 이미 생성되어 있습니다.', 'error'); return; }
    const monthStr = prompt(`추가할 월을 입력하세요 (${unadded.join(', ')}):`, unadded[0]);
    if (!monthStr) return;
    const formatted = monthStr.trim().endsWith('월') ? monthStr.trim() : monthStr.trim() + '월';
    if (App.monthList.includes(formatted)) { Toast.show(`이미 ${formatted} 대회가 존재합니다.`, 'error'); return; }

    this.saveCurrentMonthData();
    App.monthList.push(formatted);
    App.monthList.sort((a, b) => parseInt(a) - parseInt(b));
    App.tournaments[formatted] = { currentRound: 0, matches: [], pairingHistory: [], absentPlayers: [], matchMode: 'regular' };
    if (!App.selectedStatsMonths.includes(formatted)) App.selectedStatsMonths.push(formatted);
    this.switchMonth(formatted);
    Toast.show(`${formatted} 대회가 생성되었습니다.`);
  },

  switchMonth(monthName) {
    if (!App.monthList.includes(monthName)) return;
    this.saveCurrentMonthData();
    App.activeMonth = monthName;
    this.loadActiveMonthData();
    this.render();
    StatsManager.calculateAndRender();
    App.saveState();
  },

  deleteCurrentMonth() {
    const active = App.activeMonth;
    if (App.monthList.length <= 1) { Toast.show('최소 1개의 월례대회는 유지되어야 합니다.', 'error'); return; }
    if (confirm(`${active} 대회를 삭제하시겠습니까?`)) {
      delete App.tournaments[active];
      App.monthList = App.monthList.filter(m => m !== active);
      App.selectedStatsMonths = App.selectedStatsMonths.filter(m => m !== active);
      App.activeMonth = App.monthList[0];
      this.loadActiveMonthData();
      this.render();
      StatsManager.calculateAndRender();
      App.saveState();
      Toast.show(`${active} 대회가 삭제되었습니다.`);
    }
  },

  getMatchMode() {
    const checked = document.querySelector('input[name="matchMode"]:checked');
    return checked ? checked.value : 'regular';
  },

  getPlayedCounts() {
    const counts = {};
    ParticipantManager.list.forEach(p => counts[p.id] = 0);
    this.matches.forEach(m => {
      [...m.teamA, ...m.teamB].forEach(pId => { if (counts[pId] !== undefined) counts[pId]++; });
    });
    return counts;
  },

  generateNextRound() {
    const activeParticipants = ParticipantManager.list.filter(p => !this.absentPlayers.has(p.id));
    if (activeParticipants.length < 4) { Toast.show('참석 인원이 최소 4명 이상이어야 합니다.', 'error'); return; }
    const mode = this.getMatchMode();
    const targetRound = this.currentRound + 1;
    const playedCounts = this.getPlayedCounts();

    if (mode === 'mixed') {
      const males = activeParticipants.filter(p => p.gender === 'M');
      const females = activeParticipants.filter(p => p.gender === 'F');
      if (males.length < 2 || females.length < 2) { Toast.show('혼합 복식에는 참석 남성 2명, 여성 2명이 필요합니다.', 'error'); return; }
    }

    const roundMatches = this.createMatchesForRound(targetRound, mode, playedCounts, activeParticipants);
    if (roundMatches.length === 0) { Toast.show('생성 가능한 경기가 없습니다.', 'error'); return; }

    this.currentRound = targetRound;
    this.matches.push(...roundMatches);
    roundMatches.forEach(m => {
      this.savePair(m.teamA[0], m.teamA[1]);
      this.savePair(m.teamB[0], m.teamB[1]);
    });

    this.render();
    StatsManager.calculateAndRender();
    App.saveState();
    Toast.show(`${App.activeMonth} ${roundMatches.length}개 경기가 생성되었습니다!`);
  },

  savePair(p1, p2) {
    if (!p1 || !p2) return;
    this.pairingHistory.add(`${p1}_${p2}`);
    this.pairingHistory.add(`${p2}_${p1}`);
  },

  hasPaired(p1, p2) {
    return this.pairingHistory.has(`${p1}_${p2}`);
  },

  createMatchesForRound(targetRound, mode, currentCounts, activeParticipants) {
    const created = [];
    const tempCounts = { ...currentCounts };
    let nextGameNum = this.matches.length + 1;

    while (true) {
      const eligible = activeParticipants.filter(p => tempCounts[p.id] < targetRound);
      if (eligible.length < 4) break;
      let matchTeams = mode === 'mixed' ? this.findMixedMatch(eligible, tempCounts) : this.findRegularMatch(eligible, tempCounts);
      if (!matchTeams) break;

      const matchObj = {
        id: 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        round: targetRound,
        gameNumber: nextGameNum++,
        mode: mode,
        teamA: matchTeams.teamA,
        teamB: matchTeams.teamB,
        scoreA: '',
        scoreB: ''
      };

      created.push(matchObj);
      [...matchTeams.teamA, ...matchTeams.teamB].forEach(id => { tempCounts[id]++; });
    }

    // Randomize the order of generated matches so male & female matches mix randomly
    created.sort(() => Math.random() - 0.5);
    created.forEach((m, idx) => { m.gameNumber = (this.matches.length + idx + 1); });

    return created;
  },

  findRegularMatch(eligiblePlayers, counts) {
    const eligibleMales = eligiblePlayers.filter(p => p.gender === 'M').sort((a, b) => (counts[a.id] - counts[b.id]) || (Math.random() - 0.5));
    const eligibleFemales = eligiblePlayers.filter(p => p.gender === 'F').sort((a, b) => (counts[a.id] - counts[b.id]) || (Math.random() - 0.5));
    const canMale = eligibleMales.length >= 4, canFemale = eligibleFemales.length >= 4;
    if (!canMale && !canFemale) return null;

    let selectedGroup = null;
    if (canMale && canFemale) {
      const mScore = eligibleMales.slice(0, 4).reduce((sum, p) => sum + counts[p.id], 0);
      const fScore = eligibleFemales.slice(0, 4).reduce((sum, p) => sum + counts[p.id], 0);
      selectedGroup = (mScore + (Math.random() * 0.5)) <= (fScore + (Math.random() * 0.5)) ? eligibleMales : eligibleFemales;
    } else selectedGroup = canMale ? eligibleMales : eligibleFemales;

    const selected = selectedGroup.slice(0, 4);
    const [p1, p2, p3, p4] = selected.map(p => p.id);
    const pairings = [
      { teamA: [p1, p2], teamB: [p3, p4] },
      { teamA: [p1, p3], teamB: [p2, p4] },
      { teamA: [p1, p4], teamB: [p2, p3] }
    ];

    pairings.sort((pairX, pairY) => {
      const penX = (this.hasPaired(pairX.teamA[0], pairX.teamA[1]) ? 10 : 0) + (this.hasPaired(pairX.teamB[0], pairX.teamB[1]) ? 10 : 0);
      const penY = (this.hasPaired(pairY.teamA[0], pairY.teamA[1]) ? 10 : 0) + (this.hasPaired(pairY.teamB[0], pairY.teamB[1]) ? 10 : 0);
      return (penX + Math.random()) - (penY + Math.random());
    });

    return pairings[0];
  },

  findMixedMatch(eligiblePlayers, counts) {
    const eligibleMales = eligiblePlayers.filter(p => p.gender === 'M').sort((a, b) => (counts[a.id] - counts[b.id]) || (Math.random() - 0.5));
    const eligibleFemales = eligiblePlayers.filter(p => p.gender === 'F').sort((a, b) => (counts[a.id] - counts[b.id]) || (Math.random() - 0.5));
    if (eligibleMales.length < 2 || eligibleFemales.length < 2) return null;

    const m1 = eligibleMales[0].id, m2 = eligibleMales[1].id, f1 = eligibleFemales[0].id, f2 = eligibleFemales[1].id;
    const option1 = { teamA: [m1, f1], teamB: [m2, f2] };
    const option2 = { teamA: [m1, f2], teamB: [m2, f1] };

    const pen1 = (this.hasPaired(m1, f1) ? 10 : 0) + (this.hasPaired(m2, f2) ? 10 : 0);
    const pen2 = (this.hasPaired(m1, f2) ? 10 : 0) + (this.hasPaired(m2, f1) ? 10 : 0);

    return pen1 <= pen2 ? option1 : option2;
  },

  handleScoreChange(matchId, scoreAVal, scoreBVal) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) return;
    match.scoreA = scoreAVal;
    match.scoreB = scoreBVal;
    this.updateCardState(matchId);
    StatsManager.calculateAndRender();
    App.saveState();
  },

  updateCardState(matchId) {
    const card = document.querySelector(`.match-card[data-id="${matchId}"]`);
    if (!card) return;
    const match = this.matches.find(m => m.id === matchId);
    if (!match) return;

    const sA = parseInt(match.scoreA, 10), sB = parseInt(match.scoreB, 10);
    const isValid = !isNaN(sA) && !isNaN(sB);
    const teamABox = card.querySelector('.team-box-a');
    const teamBBox = card.querySelector('.team-box-b');
    const statusBadge = card.querySelector('.match-status');

    if (isValid) {
      statusBadge.textContent = '경기 완료';
      statusBadge.className = 'match-status status-completed';
      if (sA > sB) { teamABox.classList.add('winner'); teamBBox.classList.remove('winner'); }
      else if (sB > sA) { teamBBox.classList.add('winner'); teamABox.classList.remove('winner'); }
      else { teamABox.classList.remove('winner'); teamBBox.classList.remove('winner'); }
    } else {
      statusBadge.textContent = '진행 예정';
      statusBadge.className = 'match-status';
      teamABox.classList.remove('winner');
      teamBBox.classList.remove('winner');
    }
  },

  renderMonthPills() {
    const container = document.getElementById('monthPillsContainer');
    if (!container) return;
    container.innerHTML = App.monthList.map(m => `
      <div class="month-pill ${m === App.activeMonth ? 'active' : ''}" onclick="MatchingManager.switchMonth('${m}')">${m} 대회</div>
    `).join('');

    const badge = document.getElementById('activeMonthTitleBadge');
    if (badge) badge.textContent = `${App.activeMonth} 대회 (${this.matches.length}경기 매칭됨)`;
  },

  renderParticipantCountsList() {
    const container = document.getElementById('participantMatchCountsList');
    if (!container) return;
    const counts = this.getPlayedCounts();
    const allParticipants = ParticipantManager.list;
    if (allParticipants.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">등록된 참가자가 없습니다.</p>`;
      return;
    }

    const attending = allParticipants.filter(p => !this.absentPlayers.has(p.id));
    const absent = allParticipants.filter(p => this.absentPlayers.has(p.id));
    const attendingMales = attending.filter(p => p.gender === 'M');
    const attendingFemales = attending.filter(p => p.gender === 'F');

    const renderItem = (p, isAbs = false) => `
      <div class="participant-v-item ${isAbs ? 'absent-item' : ''}">
        <div class="name-box">
          ${isAbs ? `<button class="btn-restore-toggle" title="참석으로 복원" onclick="MatchingManager.toggleAbsent('${p.id}', false)"><i class="ph ph-arrow-u-up-left"></i></button>`
                  : `<button class="btn-absent-toggle" title="불참으로 지정" onclick="MatchingManager.toggleAbsent('${p.id}', true)"><i class="ph ph-x"></i></button>`}
          <span class="name-text">${p.name} ${p.gender === 'F' ? '<span class="badge-f">(여)</span>' : '<span class="badge-m">(남)</span>'}</span>
        </div>
        <span class="count-tag">${counts[p.id] || 0}경기</span>
      </div>
    `;

    container.innerHTML = `
      <div class="participant-gender-columns">
        <div class="gender-column">
          <div class="gender-column-title"><span><i class="ph ph-gender-male"></i> 남성 참석자</span><span style="color: var(--primary); font-size:0.85rem;">${attendingMales.length}명</span></div>
          ${attendingMales.length > 0 ? attendingMales.map(p => renderItem(p, false)).join('') : '<div style="font-size:0.8rem; color:var(--text-muted); padding:6px 0;">없음</div>'}
        </div>
        <div class="gender-column">
          <div class="gender-column-title"><span><i class="ph ph-gender-female"></i> 여성 참석자</span><span style="color: var(--accent-pink); font-size:0.85rem;">${attendingFemales.length}명</span></div>
          ${attendingFemales.length > 0 ? attendingFemales.map(p => renderItem(p, false)).join('') : '<div style="font-size:0.8rem; color:var(--text-muted); padding:6px 0;">없음</div>'}
        </div>
      </div>
      ${absent.length > 0 ? `
        <div class="absent-section">
          <div class="absent-section-title"><i class="ph ph-user-minus"></i> 불참자 목록 (${absent.length}명)</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">${absent.map(p => renderItem(p, true)).join('')}</div>
        </div>
      ` : ''}
    `;
  },

  render() {
    this.renderMonthPills();
    this.renderParticipantCountsList();
    const roundListContainer = document.getElementById('matchesRoundList');
    if (!roundListContainer) return;

    if (this.matches.length === 0) {
      roundListContainer.innerHTML = `<div class="empty-state"><i class="ph ph-tennis-ball"></i><p>${App.activeMonth} 대회의 생성된 경기가 없습니다. [게임 만들기 1회 진행] 버튼을 클릭하세요.</p></div>`;
      return;
    }

    const playerMap = {};
    ParticipantManager.list.forEach(p => playerMap[p.id] = p);
    const playerMatchSequenceCounter = {};

    const matchesHtml = this.matches.map((m, index) => {
      const gameNum = m.gameNumber || (index + 1);
      const getPlayerNames = (ids) => ids.map(id => {
        const p = playerMap[id];
        if (!p) return '알 수 없음';
        playerMatchSequenceCounter[id] = (playerMatchSequenceCounter[id] || 0) + 1;
        const seqNum = playerMatchSequenceCounter[id];
        const gBadge = p.gender === 'F' ? '<span class="badge-f" style="font-size:0.75rem; padding:1px 4px; display:inline-flex;">(여)</span>' : '<span class="badge-m" style="font-size:0.75rem; padding:1px 4px; display:inline-flex;">(남)</span>';
        return `<div class="player-item"><span>${p.name}</span> ${gBadge} <span class="match-seq-badge">(${seqNum})</span></div>`;
      }).join('');

      const sA = parseInt(m.scoreA, 10), sB = parseInt(m.scoreB, 10);
      const isCompleted = !isNaN(sA) && !isNaN(sB);
      const winnerA = isCompleted && sA > sB ? 'winner' : '';
      const winnerB = isCompleted && sB > sA ? 'winner' : '';

      return `
        <div class="match-card" data-id="${m.id}">
          <div class="match-card-header">
            <span class="game-title"><i class="ph ph-trophy"></i> ${gameNum}GAME</span>
            <div class="match-card-actions">
              <span class="match-status ${isCompleted ? 'status-completed' : ''}">${isCompleted ? '경기 완료' : '진행 예정'}</span>
              <button class="btn-card-delete" onclick="MatchingManager.deleteSingleMatch('${m.id}')" title="이 경기 삭제"><i class="ph ph-trash"></i> 삭제</button>
            </div>
          </div>
          <div class="teams-container">
            <div class="team-box team-box-a ${winnerA}">
              <div class="team-name">팀 A ${winnerA ? '👑 WIN' : ''}</div>
              <div class="team-players">${getPlayerNames(m.teamA)}</div>
            </div>
            <div class="vs-badge">VS</div>
            <div class="team-box team-box-b ${winnerB}">
              <div class="team-name">팀 B ${winnerB ? '👑 WIN' : ''}</div>
              <div class="team-players">${getPlayerNames(m.teamB)}</div>
            </div>
          </div>
          <div class="score-controller">
            <input type="number" min="0" max="99" class="score-input" value="${m.scoreA}" placeholder="0" oninput="MatchingManager.handleScoreChange('${m.id}', this.value, this.nextElementSibling.nextElementSibling.value)">
            <span class="score-divider">:</span>
            <input type="number" min="0" max="99" class="score-input" value="${m.scoreB}" placeholder="0" oninput="MatchingManager.handleScoreChange('${m.id}', this.previousElementSibling.previousElementSibling.value, this.value)">
          </div>
        </div>
      `;
    }).join('');

    roundListContainer.innerHTML = `<div class="matches-single-column-list">${matchesHtml}</div>`;
  }
};
