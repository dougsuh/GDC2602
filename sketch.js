let ball;
let paddle;
let bricks = [];
let rows = 5;
let cols = 8;
let score = 0;
let gameOver = false;
let gameWon = false;

function setup() {
  // 화면 세로 길이를 600px로 확장
  createCanvas(600, 600);
  resetGame();
}

function resetGame() {
  score = 0;
  gameOver = false;
  gameWon = false;
  bricks = [];
  
  paddle = new Paddle();
  ball = new Ball();

  let brickWidth = width / cols;
  let brickHeight = 20;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let x = j * brickWidth;
      let y = i * brickHeight + 40; // 벽돌 위치
      bricks.push(new Brick(x, y, brickWidth - 4, brickHeight - 4));
    }
  }
}

function draw() {
  background(30);

  if (!gameOver && !gameWon) {
    paddle.update();
    ball.update();
    ball.checkPaddleCollision(paddle);

    for (let i = bricks.length - 1; i >= 0; i--) {
      if (ball.checkBrickCollision(bricks[i])) {
        bricks.splice(i, 1);
        score += 10;
      }
    }

    if (bricks.length === 0) {
      gameWon = true;
    }

    if (ball.y - ball.r > height) {
      gameOver = true;
    }
  }

  // 그려주기
  paddle.show();
  ball.show();
  for (let b of bricks) {
    b.show();
  }

  // 점수 및 상태 UI
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Score: " + score, 10, 10);

  if (gameOver) {
    textAlign(CENTER, CENTER);
    textSize(32);
    fill(255, 50, 50);
    text("GAME OVER", width / 2, height / 2);
    textSize(16);
    fill(200);
    text("Press R to Restart", width / 2, height / 2 + 40);
  } else if (gameWon) {
    textAlign(CENTER, CENTER);
    textSize(32);
    fill(50, 255, 50);
    text("YOU WIN!", width / 2, height / 2);
    textSize(16);
    fill(200);
    text("Press R to Restart", width / 2, height / 2 + 40);
  }
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    resetGame();
  }
}

// 패들 클래스 (마우스 조작 반영)
class Paddle {
  constructor() {
    this.w = 100;
    this.h = 15;
    this.x = width / 2 - this.w / 2;
    this.y = height - 30; // 간격 확장을 위해 하단에 배치
  }

  update() {
    // 마우스 X 위치를 기준으로 패들 이동
    this.x = mouseX - this.w / 2;
    this.x = constrain(this.x, 0, width - this.w);
  }

  show() {
    fill(200);
    noStroke();
    rect(this.x, this.y, this.w, this.h, 4);
  }
}

// 공 클래스
class Ball {
  constructor() {
    this.r = 8;
    this.reset();
  }

  reset() {
    this.x = width / 2;
    this.y = height / 2 + 50;
    this.vx = random([-4, -3, 3, 4]);
    this.vy = -6; // 세로 길이에 맞춰 공 속도를 약간 가속
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // 벽 충돌 (좌, 우, 상)
    if (this.x - this.r < 0 || this.x + this.r > width) {
      this.vx *= -1;
    }
    if (this.y - this.r < 0) {
      this.vy *= -1;
    }
  }

  checkPaddleCollision(p) {
    if (
      this.x + this.r > p.x &&
      this.x - this.r < p.x + p.w &&
      this.y + this.r > p.y &&
      this.y - this.r < p.y + p.h
    ) {
      this.vy = -Math.abs(this.vy);
      let hitOffset = (this.x - (p.x + p.w / 2)) / (p.w / 2);
      this.vx = hitOffset * 6;
    }
  }

  checkBrickCollision(b) {
    if (
      this.x + this.r > b.x &&
      this.x - this.r < b.x + b.w &&
      this.y + this.r > b.y &&
      this.y - this.r < b.y + b.h
    ) {
      this.vy *= -1;
      return true;
    }
    return false;
  }

  show() {
    fill(255, 200, 0);
    noStroke();
    ellipse(this.x, this.y, this.r * 2);
  }
}

// 벽돌 클래스
class Brick {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  show() {
    fill(100, 150, 255);
    noStroke();
    rect(this.x, this.y, this.w, this.h, 2);
  }
}