# 🎾 베스트 테니스 클럽 - 월례대회 경기 매칭 및 통계 시스템

베스트 테니스 클럽의 월례대회 경기 운영을 돕기 위해 개발된 **스마트 경기 매칭 및 통계 분석 웹 애플리케이션**입니다.  
공정한 기회 배분, 연속 경기 방지, 파트너 중복 최소화 알고리즘을 바탕으로 최적의 대진표를 자동으로 생성하고 대회 기록을 관리합니다.

---

## 🌐 서비스 접속 주소

- **배포 웹 앱 주소 (정식)**:  
  👉 [https://script.google.com/macros/s/AKfycbxEzbBXN39gfAMB8SgtHm3Q2Dzn6iNGYLlmQSrFYRA/exec](https://script.google.com/macros/s/AKfycbxEzbBXN39gfAMB8SgtHm3Q2Dzn6iNGYLlmQSrFYRA/exec)

---

## ✨ 주요 기능

### 1. 👥 참가자 및 출결 관리
- 월례대회 참가 회원 등록, 성별 구분, 참석/불참 상태 설정
- 지각자 출전 경기 수 보정 기능(`+1`) 지원

### 2. ⚡ 공정한 지능형 경기 자동 매칭
- **출전 기회 균등 배분**: 현재 시점에서 출전 경기 수가 가장 적은 회원을 우선 선발
- **연속 경기 차단**: 직전 경기에 참여한 회원의 연속 출전 방지 (휴식 보장)
- **파트너 중복 최소화**: 과거 파트너 이력을 누적 추적하여 새로운 파트너와 매칭
- **남복 / 여복 / 혼복 지원**: 성별 구성 및 출전 비율을 고려한 자동 종목 배정

### 3. 🎯 경기 관리 및 자유로운 대진 조정
- 경기 내/간 1:1 드래그 및 클릭 선수 교체 기능
- 선수 삭제(`✕`) 및 빈 슬롯 선택 드롭다운 기능
- 통계 기록 반영/미반영 개별 설정 (기준 게임 초과자 제외 지원)

### 4. 📊 실시간 승패 및 통계 산출
- 경기별 스코어 입력 시 승/패, 승률, 득실점, 득실차 자동 계산
- 월별 랭킹 뷰 및 종합 통계 표 제공
- 엑셀(Excel) 내보내기 지원

### 5. 🔒 관리자 보안 모드
- 스코어 입력, 선수 삭제, 기록 제외, 라운드 생성 등 주요 운영 기능은 관리자 인증을 통해 제어
- 기본 관리자 비밀번호 제공 및 웹 상에서 간편한 비밀번호 변경 지원

---

## 🛠 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+)
- **Backend / Hosting**: Google Apps Script (HtmlService, PropertiesService)
- **Database / Sync**: Google Apps Script PropertiesService / Firebase Realtime Database
- **UI & Icons**: Phosphor Icons, Google Fonts (Noto Sans KR, Outfit)
- **Library**: SheetJS (xlsx.full.min.js)
