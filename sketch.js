// 고유 클라이언트 ID 생성 및 통신 채널 설정
const clientId = 'player_' + Math.random().toString(16).substring(2, 10);
// 다른 사람과 겹치지 않도록 고유한 토픽 이름을 사용합니다 (원하는 이름으로 변경 가능)
const TOPIC = 'github-multiplayer-ball-game-2026/room1';

let client;
let isConnected = false;

// 게임 상태: 'SELECTING'(선택하라) | 'COMPLETE_MSG'(선택완료 1초) | 'PLAYING'(게임중) | 'ENDED'(종료)
let gameState = 'SELECTING';
let myColor = null; // 'red' 또는 'blue'
let completeMsgStartTime = 0;

// 공 객체 정보
const BALL_RADIUS = 40;
let redBall = { x: 250, y: 250, targetX: 250, targetY: 250 };
let blueBall = { x: 550, y: 250, targetX: 550, targetY: 250 };

let lastSentTime = 0;

function setup() {
  const canvas = createCanvas(800, 500);
  canvas.parent('canvas-container');
  textAlign(CENTER, CENTER);

  initMultiplayer();

  // '끝내기' 버튼 이벤트 연결
  const endBtn = document.getElementById('end-btn');
  const resetBtn = document.getElementById('reset-btn');

  endBtn.addEventListener('click', () => {
    if (gameState !== 'ENDED') {
      sendMessage({ type: 'END_GAME' });
      endGame();
    }
  });

  resetBtn.addEventListener('click', () => {
    sendMessage({ type: 'RESET_GAME' });
    resetGame();
  });
}

function draw() {
  background(22, 30, 46);

  // 1. "선택완료" 1초 타이머 체크 후 플레이 상태로 전환
  if (gameState === 'COMPLETE_MSG') {
    if (millis() - completeMsgStartTime >= 1000) {
      gameState = 'PLAYING';
    }
  }

  // 2. 플레이 상태에서 내 마우스 위치를 내 공에 반영하고 상대방에게 전송
  if (gameState === 'PLAYING') {
    updateMyBallPosition();
  }

  // 상대방 공의 움직임을 부드럽게 보간(lerp)
  if (myColor !== 'red') {
    redBall.x = lerp(redBall.x, redBall.targetX, 0.35);
    redBall.y = lerp(redBall.y, redBall.targetY, 0.35);
  }
  if (myColor !== 'blue') {
    blueBall.x = lerp(blueBall.x, blueBall.targetX, 0.35);
    blueBall.y = lerp(blueBall.y, blueBall.targetY, 0.35);
  }

  // 3. 빨간 공과 파란 공 그리기
  drawBalls();

  // 4. 상태별 화면 안내 메시지 출력
  drawStatusMessages();
}

// 공 그리기 함수
function drawBalls() {
  noStroke();

  // 빨간 공
  if (myColor === 'red' && gameState === 'PLAYING') {
    stroke(255, 255, 255, 180);
    strokeWeight(4);
  } else {
    noStroke();
  }
  fill(239, 68, 68);
  circle(redBall.x, redBall.y, BALL_RADIUS * 2);

  // 파란 공
  if (myColor === 'blue' && gameState === 'PLAYING') {
    stroke(255, 255, 255, 180);
    strokeWeight(4);
  } else {
    noStroke();
  }
  fill(59, 130, 246);
  circle(blueBall.x, blueBall.y, BALL_RADIUS * 2);
}

// 상태별 텍스트 UI 출력 함수
function drawStatusMessages() {
  noStroke();
  fill(255);

  if (gameState === 'SELECTING') {
    textSize(42);
    textStyle(BOLD);
    text('선택하라', width / 2, 80);

    textSize(18);
    textStyle(NORMAL);
    fill(148, 163, 184);
    text('마우스로 빨간 공 또는 파란 공을 클릭하세요', width / 2, 130);
  } 
  else if (gameState === 'COMPLETE_MSG') {
    // 1초간 "선택완료" 표시
    fill(0, 0, 0, 140);
    rect(0, 0, width, height);

    fill(74, 222, 128);
    textSize(48);
    textStyle(BOLD);
    text('선택완료', width / 2, height / 2 - 20);

    fill(255);
    textSize(24);
    const colorName = myColor === 'red' ? '빨간 공' : '파란 공';
    text(`당신의 공: ${colorName}`, width / 2, height / 2 + 35);
  } 
  else if (gameState === 'PLAYING') {
    textSize(20);
    textStyle(BOLD);
    const colorName = myColor === 'red' ? '빨간 공 (내 공)' : '파란 공 (내 공)';
    fill(myColor === 'red' ? color(252, 165, 165) : color(147, 197, 253));
    text(colorName, width / 2, 35);
  } 
  else if (gameState === 'ENDED') {
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);

    fill(248, 113, 113);
    textSize(48);
    textStyle(BOLD);
    text('게임이 끝났습니다', width / 2, height / 2);
  }
}

// 마우스 클릭으로 공 선택 처리
function mousePressed() {
  if (!isConnected || gameState !== 'SELECTING') return;

  const distRed = dist(mouseX, mouseY, redBall.x, redBall.y);
  const distBlue = dist(mouseX, mouseY, blueBall.x, blueBall.y);

  if (distRed <= BALL_RADIUS) {
    selectBall('red');
  } else if (distBlue <= BALL_RADIUS) {
    selectBall('blue');
  }
}

// 내가 공을 선택했을 때 실행
function selectBall(chosenColor) {
  myColor = chosenColor;
  gameState = 'COMPLETE_MSG';
  completeMsgStartTime = millis();

  // 상대방에게 내가 선택한 공 색상을 전송
  sendMessage({
    type: 'BALL_SELECTED',
    chosenColor: chosenColor
  });
}

// 플레이 중 마우스 움직임 반영 및 상대방에게 좌표 전송
function updateMyBallPosition() {
  // 마우스가 캔버스 내부에 있을 때만 이동
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  const constrainedX = constrain(mouseX, BALL_RADIUS, width - BALL_RADIUS);
  const constrainedY = constrain(mouseY, BALL_RADIUS, height - BALL_RADIUS);

  let targetBall = myColor === 'red' ? redBall : blueBall;

  // 마우스 좌표가 이전과 달라졌을 때만 위치 갱신
  if (abs(targetBall.x - constrainedX) > 0.5 || abs(targetBall.y - constrainedY) > 0.5) {
    targetBall.x = constrainedX;
    targetBall.y = constrainedY;
    targetBall.targetX = constrainedX;
    targetBall.targetY = constrainedY;

    // 네트워크 부하 방지를 위해 약 25ms(초당 40회) 간격으로 전송
    if (millis() - lastSentTime > 25) {
      sendMessage({
        type: 'MOVE',
        color: myColor,
        x: Math.round(constrainedX),
        y: Math.round(constrainedY)
      });
      lastSentTime = millis();
    }
  }
}

// 끝내기 처리
function endGame() {
  gameState = 'ENDED';
  document.getElementById('reset-btn').style.display = 'inline-block';
}

// 다시 시작(초기화) 처리
function resetGame() {
  gameState = 'SELECTING';
  myColor = null;
  redBall = { x: 250, y: 250, targetX: 250, targetY: 250 };
  blueBall = { x: 550, y: 250, targetX: 550, targetY: 250 };
  document.getElementById('reset-btn').style.display = 'none';
}

// MQTT 웹소켓 서버 연결 및 수신 설정
function initMultiplayer() {
  const statusBar = document.getElementById('status-bar');

  // GitHub Pages(HTTPS) 환경에서 작동하는 무료 공개 보안 웹소켓(WSS) 브로커
  client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
    clientId: clientId,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000
  });

  client.on('connect', () => {
    isConnected = true;
    statusBar.textContent = '온라인 연결됨 (두 기기에서 접속 완료)';
    statusBar.style.color = '#4ade80';
    client.subscribe(TOPIC);
  });

  client.on('message', (topic, payload) => {
    const data = JSON.parse(payload.toString());

    // 내가 보낸 메시지는 무시
    if (data.senderId === clientId) return;

    // 1. 상대방이 먼저 공을 선택한 경우 -> 나는 자동으로 반대 색상의 공을 배정받음
    if (data.type === 'BALL_SELECTED' && gameState === 'SELECTING') {
      myColor = data.chosenColor === 'red' ? 'blue' : 'red';
      gameState = 'COMPLETE_MSG';
      completeMsgStartTime = millis();
    }
    // 2. 상대방이 공을 움직인 경우 -> 내 화면의 상대방 공 위치 업데이트
    else if (data.type === 'MOVE' && gameState === 'PLAYING') {
      if (data.color === 'red' && myColor !== 'red') {
        redBall.targetX = data.x;
        redBall.targetY = data.y;
      } else if (data.color === 'blue' && myColor !== 'blue') {
        blueBall.targetX = data.x;
        blueBall.targetY = data.y;
      }
    }
    // 3. 상대방이 '끝내기' 버튼을 누른 경우 -> 양쪽 모두 종료
    else if (data.type === 'END_GAME') {
      endGame();
    }
    // 4. 상대방이 '다시 시작' 버튼을 누른 경우 -> 양쪽 모두 초기화
    else if (data.type === 'RESET_GAME') {
      resetGame();
    }
  });

  client.on('error', (err) => {
    statusBar.textContent = '연결 오류 발생: ' + err.message;
    statusBar.style.color = '#f87171';
  });
}

// 메시지 전송 헬퍼 함수
function sendMessage(msgObj) {
  if (!isConnected) return;
  msgObj.senderId = clientId;
  client.publish(TOPIC, JSON.stringify(msgObj));
}
