const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const scoreDisplay = document.getElementById('score');

// Game State
let gameActive = false;
let score = 0;
let lastTime = 0;

// Entities
const pitcher = {
    x: 0,
    y: 150,
    width: 32,
    height: 32,
    color: '#ffffff',
    throwTimer: 0,
    throwInterval: 2000
};

const bat = {
    x: 0,
    y: 0,
    length: 50,
    width: 12,
    angle: 0,
    swinging: false,
    swingSpeed: -0.3,
    pivotX: 0,
    pivotY: 0
};

const balls = [];

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    pitcher.x = canvas.width / 2 - pitcher.width / 2;
    bat.pivotX = canvas.width / 2 - 40;
    bat.pivotY = canvas.height - 120;
}

window.addEventListener('resize', resize);
resize();

// Input handling
function swing() {
    if (!gameActive) {
        startGame();
        return;
    }
    if (!bat.swinging) {
        bat.swinging = true;
        bat.angle = 0;
    }
}

window.addEventListener('mousedown', swing);
window.addEventListener('touchstart', (e) => {
    e.preventDefault();
    swing();
}, { passive: false });

function startGame() {
    gameActive = true;
    score = 0;
    scoreDisplay.innerText = `Score: ${score}`;
    startScreen.style.display = 'none';
    balls.length = 0;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameActive = false;
    startScreen.innerText = "Game Over! Tap to Restart";
    startScreen.style.display = 'block';
}

// Drawing Helpers
function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

function drawPitcher() {
    drawRect(pitcher.x, pitcher.y, pitcher.width, pitcher.height, pitcher.color);
    drawRect(pitcher.x + 8, pitcher.y - 10, 16, 16, '#ffccaa');
    drawRect(pitcher.x + 6, pitcher.y - 14, 20, 6, '#e74c3c');
}

function drawBat() {
    ctx.save();
    ctx.translate(bat.pivotX, bat.pivotY);
    ctx.rotate(bat.angle);

    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(0, -bat.width / 2, 15, bat.width);
    ctx.fillRect(15, -bat.width / 2 - 2, bat.length, bat.width + 4);

    ctx.restore();
}

function drawBall(ball) {
    drawRect(ball.x, ball.y, ball.size, ball.size, '#ffffff');
    drawRect(ball.x + 2, ball.y + 2, 2, 2, '#ff0000');
    drawRect(ball.x + 6, ball.y + 6, 2, 2, '#ff0000');
}

function drawField() {
    ctx.fillStyle = '#00a800';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const homeY = canvas.height - 120;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, homeY);
    ctx.lineTo(0, homeY - (centerX * 1.5));
    ctx.moveTo(centerX, homeY);
    ctx.lineTo(canvas.width, homeY - ((canvas.width - centerX) * 1.5));
    ctx.stroke();

    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(centerX, pitcher.y + pitcher.height / 2 + 10, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(centerX, homeY, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 70, homeY - 30, 30, 60);
    ctx.strokeRect(centerX + 40, homeY - 30, 30, 60);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(centerX, homeY + 10);
    ctx.lineTo(centerX + 10, homeY);
    ctx.lineTo(centerX + 10, homeY - 10);
    ctx.lineTo(centerX - 10, homeY - 10);
    ctx.lineTo(centerX - 10, homeY);
    ctx.fill();
}

// Game Loop
function update(dt) {
    pitcher.throwTimer += dt;
    if (pitcher.throwTimer > pitcher.throwInterval) {
        pitcher.throwTimer = 0;
        balls.push({
            x: pitcher.x + pitcher.width / 2 - 5,
            y: pitcher.y + pitcher.height,
            size: 10,
            speedY: 0.35 * dt,
            active: true
        });
    }

    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];

        if (ball.hit) {
            ball.x += ball.speedX;
            ball.y += ball.speedY;
        } else {
            ball.y += ball.speedY;
        }

        if (ball.y > canvas.height || ball.y < -50 || ball.x < -50 || ball.x > canvas.width + 50) {
            balls.splice(i, 1);
        }
    }

    if (bat.swinging) {
        bat.angle += bat.swingSpeed * (dt / 16);
        if (bat.angle <= -Math.PI * 2) {
            bat.angle = 0;
            bat.swinging = false;
        }
    }

    // Collision Detection
    if (bat.swinging) {
        for (let i = balls.length - 1; i >= 0; i--) {
            const ball = balls[i];
            if (!ball.active) continue;

            const dx = ball.x - bat.pivotX;
            const dy = ball.y - bat.pivotY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const ballAngle = Math.atan2(dy, dx);

            let batAngleNorm = bat.angle % (Math.PI * 2);
            if (batAngleNorm > Math.PI) batAngleNorm -= Math.PI * 2;
            if (batAngleNorm < -Math.PI) batAngleNorm += Math.PI * 2;

            let ballAngleNorm = ballAngle % (Math.PI * 2);
            if (ballAngleNorm > Math.PI) ballAngleNorm -= Math.PI * 2;
            if (ballAngleNorm < -Math.PI) ballAngleNorm += Math.PI * 2;

            let angleDiff = Math.abs(batAngleNorm - ballAngleNorm);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            const isAngleMatch = angleDiff < 0.8;
            const isBarrelHit = dist > 30 && dist < bat.length + 15;
            const isBatFacingPlate = true;
            const isBallInFront = ball.x > bat.pivotX - 10;
            const isBallHighEnough = ball.y < bat.pivotY + 30;

            if (isAngleMatch && isBarrelHit && isBatFacingPlate && isBallInFront && isBallHighEnough) {
                ball.active = false;

                const hitAngle = bat.angle;
                const isGoodInput = hitAngle < -0.2 && hitAngle > -2.5;

                if (isGoodInput) {
                    const clampedInput = Math.max(-2.0, Math.min(-0.4, hitAngle));
                    const inputRatio = (clampedInput - (-0.4)) / (-2.0 - (-0.4));

                    const jitter = (Math.random() - 0.5) * 0.1;
                    let outputAngle = -1.35 + (inputRatio * (-1.8 - (-1.35))) + jitter;

                    const safeRight = -1.35;
                    const safeLeft = -1.8;
                    outputAngle = Math.max(safeLeft, Math.min(safeRight, outputAngle));

                    ball.speedY = -Math.abs(ball.speedY * 3.0);
                    ball.speedX = (outputAngle + Math.PI / 2) * 15;

                    score++;
                    scoreDisplay.innerText = `Score: ${score} - GOOD HIT!`;
                    setTimeout(() => {
                        if (scoreDisplay.innerText.includes("GOOD HIT")) {
                            scoreDisplay.innerText = `Score: ${score}`;
                        }
                    }, 1000);

                } else {
                    ball.speedY = Math.abs(ball.speedY * 1.5);

                    let foulAngle;
                    if (hitAngle > -1.5) {
                        foulAngle = -0.6;
                    } else {
                        foulAngle = -2.5;
                    }
                    foulAngle += (Math.random() - 0.5) * 0.4;

                    ball.speedX = (foulAngle + Math.PI / 2) * 15;
                    scoreDisplay.innerText = `Score: ${score} - FOUL`;
                }

                ball.hit = true;
                ball.active = false;
            }
        }
    }
}

function draw() {
    drawField();
    drawPitcher();
    drawBat();
    balls.forEach(drawBall);
}

function gameLoop(timestamp) {
    if (!gameActive) return;

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

resize();
draw();
