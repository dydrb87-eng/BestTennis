/**
 * Firebase Realtime Database Integration & Synchronization Module
 */
const FirebaseManager = {
  db: null,
  dbRef: null,
  isLive: false,
  roomId: 'default_club_room', // Default tournament room ID

  // Default Firebase Public Demo Config (Easily customizable by user)
  defaultConfig: {
    apiKey: "AIzaSyDemoKeyBestTennisClub2026",
    authDomain: "best-tennis-club.firebaseapp.com",
    databaseURL: "https://best-tennis-club-default-rtdb.firebaseio.com",
    projectId: "best-tennis-club",
    storageBucket: "best-tennis-club.appspot.com",
    messagingSenderId: "100000000000",
    appId: "1:100000000000:web:demo123456"
  },

  init() {
    this.loadCustomConfig();
    this.bindEvents();
  },

  loadCustomConfig() {
    const savedConfig = localStorage.getItem('FIREBASE_CUSTOM_CONFIG');
    const savedRoomId = localStorage.getItem('FIREBASE_ROOM_ID');
    
    if (savedRoomId) {
      this.roomId = savedRoomId;
    }

    let configToUse = this.defaultConfig;
    if (savedConfig) {
      try {
        configToUse = JSON.parse(savedConfig);
      } catch (e) {
        console.error('Invalid saved firebase config', e);
      }
    }

    this.connectFirebase(configToUse);
  },

  connectFirebase(config) {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded. Operating in LocalStorage fallback mode.');
      this.updateStatusBadge(false, '로컬 저장 모드');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      this.db = firebase.database();
      this.dbRef = this.db.ref('tournaments/' + this.roomId);
      this.isLive = true;

      this.updateStatusBadge(true, `실시간 DB 동기화 (${this.roomId})`);
      this.listenToDatabaseChanges();
    } catch (e) {
      console.error('Firebase connection error:', e);
      this.isLive = false;
      this.updateStatusBadge(false, '오프라인 / 로컬 저장');
    }
  },

  listenToDatabaseChanges() {
    if (!this.dbRef) return;

    // Listen to real-time database updates from any device
    this.dbRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      console.log('⚡ Realtime Database update received from cloud');
      
      // Update local application state dynamically
      if (data.participants) ParticipantManager.list = data.participants;
      if (data.monthList) App.monthList = data.monthList;
      if (data.activeMonth) App.activeMonth = data.activeMonth;
      if (data.tournaments) App.tournaments = data.tournaments;
      if (data.selectedStatsMonths) App.selectedStatsMonths = data.selectedStatsMonths;

      // Reload current active month data
      MatchingManager.loadActiveMonthData();

      // Refresh UI components
      ParticipantManager.render();
      MatchingManager.render();
      StatsManager.calculateAndRender();
    });
  },

  saveToCloud(data) {
    if (!this.isLive || !this.dbRef) return;
    try {
      this.dbRef.set(data).catch(err => {
        console.error('Firebase set error:', err);
      });
    } catch (e) {
      console.error('Firebase save exception:', e);
    }
  },

  updateStatusBadge(isOnline, text) {
    const badge = document.getElementById('dbSyncStatusBadge');
    if (!badge) return;

    if (isOnline) {
      badge.className = 'db-sync-badge sync-online';
      badge.innerHTML = `<i class="ph ph-wifi-high"></i> ${text}`;
    } else {
      badge.className = 'db-sync-badge sync-offline';
      badge.innerHTML = `<i class="ph ph-wifi-slash"></i> ${text}`;
    }
  },

  bindEvents() {
    const settingsBtn = document.getElementById('firebaseSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveDbSettingsBtn');
    const modal = document.getElementById('dbSettingsModal');
    const closeBtn = document.getElementById('closeDbModalBtn');

    if (settingsBtn && modal) {
      settingsBtn.addEventListener('click', () => {
        const roomIdInput = document.getElementById('dbRoomIdInput');
        const configTextarea = document.getElementById('dbConfigJsonInput');
        if (roomIdInput) roomIdInput.value = this.roomId;
        if (configTextarea) {
          const savedConfig = localStorage.getItem('FIREBASE_CUSTOM_CONFIG');
          configTextarea.value = savedConfig || JSON.stringify(this.defaultConfig, null, 2);
        }
        modal.style.display = 'flex';
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.style.display = 'none');
    }

    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        const roomIdVal = document.getElementById('dbRoomIdInput').value.trim() || 'default_club_room';
        const configVal = document.getElementById('dbConfigJsonInput').value.trim();

        try {
          if (configVal) {
            const parsed = JSON.parse(configVal);
            localStorage.setItem('FIREBASE_CUSTOM_CONFIG', JSON.stringify(parsed));
          }
          localStorage.setItem('FIREBASE_ROOM_ID', roomIdVal);
          
          this.roomId = roomIdVal;
          if (modal) modal.style.display = 'none';
          
          Toast.show('DB 설정이 저장되었습니다. 실시간 동기화를 다시 재설정합니다.');
          location.reload();
        } catch (e) {
          Toast.show('올바른 Firebase JSON 설정 형식이 아닙니다.', 'error');
        }
      });
    }
  }
};
