/**
 * Participants Management Module
 */
const ParticipantManager = {
  // Array of participant objects: { id, name, gender }
  list: [],

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const fileInput = document.getElementById('excelFileInput');
    const dropzone = document.getElementById('dropzone');
    const addBtn = document.getElementById('addParticipantBtn');
    const clearBtn = document.getElementById('clearParticipantsBtn');
    const templateBtn = document.getElementById('downloadTemplateBtn');
    const sampleBtn = document.getElementById('loadSampleBtn');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]));
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (addBtn) addBtn.addEventListener('click', () => this.addParticipant());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearAll());
    if (templateBtn) templateBtn.addEventListener('click', () => this.downloadTemplate());
    if (sampleBtn) sampleBtn.addEventListener('click', () => this.loadSampleData());
  },

  loadSampleData() {
    const samples = [
      { name: '김테니스', gender: 'M' },
      { name: '이페더러', gender: 'M' },
      { name: '박나달', gender: 'M' },
      { name: '최조코비치', gender: 'M' },
      { name: '정샤라포바', gender: 'F' },
      { name: '강윌리엄스', gender: 'F' },
      { name: '윤알카라스', gender: 'M' },
      { name: '한시노너', gender: 'M' },
      { name: '임사발렌카', gender: 'F' },
      { name: '송시비옹텍', gender: 'F' }
    ];
    this.list = samples.map((s, idx) => ({ id: 'p_' + Date.now() + '_' + idx, name: s.name, gender: s.gender }));
    this.render();
    App.saveState();
    Toast.show('샘플 데이터 10명이 등록되었습니다.');
  },

  handleFileUpload(file) {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          this.parseExcelData(jsonData);
        } catch (err) {
          console.error(err);
          Toast.show('엑셀 파일을 읽는 중 오류가 발생했습니다.', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Toast.show('.xlsx, .xls, .csv 확장자 파일만 지원합니다.', 'error');
    }
  },

  parseExcelData(rows) {
    if (!rows || rows.length === 0) {
      Toast.show('파일에 데이터가 없습니다.', 'error');
      return;
    }

    let addedCount = 0;
    // Inspect header or first rows to locate name & gender
    let startIdx = 0;
    let nameCol = 0;
    let genderCol = 1;

    // Detect header row if present
    const firstRow = rows[0].map(cell => String(cell || '').trim());
    if (firstRow.some(cell => cell.includes('이름') || cell.includes('성별') || cell.includes('Name'))) {
      startIdx = 1;
      firstRow.forEach((cell, idx) => {
        if (cell.includes('이름') || cell.toLowerCase().includes('name')) nameCol = idx;
        if (cell.includes('성별') || cell.toLowerCase().includes('gender')) genderCol = idx;
      });
    }

    const newList = [...this.list];

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const name = String(row[nameCol] || '').trim();
      let rawGender = String(row[genderCol] || 'M').trim();
      let gender = 'M';

      if (rawGender === '여' || rawGender === '여성' || rawGender.toUpperCase() === 'F' || rawGender.toUpperCase() === 'FEMALE') {
        gender = 'F';
      }

      if (name) {
        newList.push({
          id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: name,
          gender: gender
        });
        addedCount++;
      }
    }

    this.list = newList;
    this.render();
    App.saveState();
    Toast.show(`${addedCount}명의 참가자 목록을 업로드했습니다.`);
  },

  downloadTemplate() {
    const data = [
      ['이름', '성별 (남/여)'],
      ['홍길동', '남'],
      ['성춘향', '여'],
      ['이몽룡', '남']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '참가자양식');
    XLSX.writeFile(wb, '테니스대회_참가자_양식.xlsx');
  },

  addParticipant() {
    this.list.push({
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: `선수 ${this.list.length + 1}`,
      gender: 'M'
    });
    this.render();
    App.saveState();
  },

  updateParticipant(id, field, value) {
    const target = this.list.find(p => p.id === id);
    if (target) {
      target[field] = value;
      this.updateSummaryPills();
      App.saveState();
    }
  },

  deleteParticipant(id) {
    this.list = this.list.filter(p => p.id !== id);
    this.render();
    App.saveState();
  },

  clearAll() {
    if (confirm('참가자 목록을 전체 삭제하시겠습니까?')) {
      this.list = [];
      this.render();
      App.saveState();
      Toast.show('참가자 목록이 초기화되었습니다.');
    }
  },

  updateSummaryPills() {
    const total = this.list.length;
    const maleCount = this.list.filter(p => p.gender === 'M').length;
    const femaleCount = this.list.filter(p => p.gender === 'F').length;

    const totalEl = document.getElementById('totalParticipantsCount');
    const maleEl = document.getElementById('maleParticipantsCount');
    const femaleEl = document.getElementById('femaleParticipantsCount');

    if (totalEl) totalEl.textContent = total;
    if (maleEl) maleEl.textContent = maleCount;
    if (femaleEl) femaleEl.textContent = femaleCount;
  },

  render() {
    const tbody = document.getElementById('participantsTableBody');
    if (!tbody) return;

    this.updateSummaryPills();

    if (this.list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <i class="ph ph-user-plus"></i>
            <p>등록된 참가자가 없습니다. 엑셀 파일을 업로드하거나 [행 추가] 버튼을 눌러주세요.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.list.map((p, index) => `
      <tr data-id="${p.id}">
        <td style="width: 60px; text-align: center; color: var(--text-muted);">${index + 1}</td>
        <td>
          <input type="text" value="${p.name}" onchange="ParticipantManager.updateParticipant('${p.id}', 'name', this.value)">
        </td>
        <td style="width: 140px;">
          <select onchange="ParticipantManager.updateParticipant('${p.id}', 'gender', this.value)">
            <option value="M" ${p.gender === 'M' ? 'selected' : ''}>남성 (M)</option>
            <option value="F" ${p.gender === 'F' ? 'selected' : ''}>여성 (F)</option>
          </select>
        </td>
        <td style="width: 80px; text-align: center;">
          <button class="btn btn-danger" style="padding: 6px 10px;" onclick="ParticipantManager.deleteParticipant('${p.id}')">
            <i class="ph ph-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }
};
