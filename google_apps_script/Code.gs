function doGet(e) {
  // 1. 외부(GitHub Pages 등)에서 REST API로 최신 클라우드 데이터를 요청하는 경우
  if (e && e.parameter && e.parameter.action === 'getData') {
    var data = getCloudData();
    return ContentService.createTextOutput(JSON.stringify(data || {}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. 구글 앱스 스크립트 자체 웹 앱 접속 시 index.html 렌더링
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('베스트 테니스 클럽 - 월례대회 경기 매칭 및 통계')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var jsonString = '';
    if (e && e.postData && e.postData.contents) {
      jsonString = e.postData.contents;
    } else if (e && e.parameter && e.parameter.data) {
      jsonString = e.parameter.data;
    }

    if (jsonString) {
      saveCloudData(jsonString);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// [백엔드 DB] 클라우드 데이터 읽기 (Chunking 분할 지원 - 용량 제한 극복)
function getCloudData() {
  var props = PropertiesService.getScriptProperties();
  var count = props.getProperty('TENNIS_DATA_CHUNKS');
  if (count) {
    var num = parseInt(count, 10);
    var fullStr = '';
    for (var i = 0; i < num; i++) {
      fullStr += (props.getProperty('TENNIS_DATA_CHUNK_' + i) || '');
    }
    return fullStr ? JSON.parse(fullStr) : null;
  }
  // 이전 단일 필드 호환성
  var single = props.getProperty('TENNIS_CLUB_DATA');
  return single ? JSON.parse(single) : null;
}

// [백엔드 DB] 클라우드 데이터 영구 저장 (8KB Chunking 분할 저장 - PropertiesService 9KB 한계 돌파)
function saveCloudData(jsonString) {
  if (typeof jsonString === 'object') {
    jsonString = JSON.stringify(jsonString);
  }
  var props = PropertiesService.getScriptProperties();
  var CHUNK_SIZE = 8000;
  var totalChunks = Math.ceil(jsonString.length / CHUNK_SIZE);
  
  // 기존 청크 중 초과분 삭제
  var prevCount = parseInt(props.getProperty('TENNIS_DATA_CHUNKS') || '0', 10);
  for (var j = totalChunks; j < prevCount; j++) {
    props.deleteProperty('TENNIS_DATA_CHUNK_' + j);
  }

  for (var i = 0; i < totalChunks; i++) {
    var chunk = jsonString.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    props.setProperty('TENNIS_DATA_CHUNK_' + i, chunk);
  }
  props.setProperty('TENNIS_DATA_CHUNKS', totalChunks.toString());
  
  // 하위 호환성 (8KB 미만일 때만 단일 키 유지)
  if (jsonString.length < 8000) {
    props.setProperty('TENNIS_CLUB_DATA', jsonString);
  } else {
    props.deleteProperty('TENNIS_CLUB_DATA');
  }
  return { status: 'success' };
}
