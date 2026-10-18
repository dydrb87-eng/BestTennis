function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('베스트 테니스 클럽 - 월례대회 경기 매칭 및 통계')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// [백엔드 DB] 클라우드 데이터 읽기
function getCloudData() {
  var props = PropertiesService.getScriptProperties();
  var data = props.getProperty('TENNIS_CLUB_DATA');
  return data ? JSON.parse(data) : null;
}

// [백엔드 DB] 클라우드 데이터 영구 저장
function saveCloudData(jsonString) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('TENNIS_CLUB_DATA', jsonString);
  return { status: 'success' };
}
