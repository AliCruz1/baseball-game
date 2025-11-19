const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const scoreDisplay = document.getElementById('score');

// Game State
let gameActive = false;
let score = 0;
let lastTime = 0;

// Sound Manager
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    playSwing() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    playHit() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    playFoul() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playPitch() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    playCurveCharge() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Wobbly rising tone for Curveball
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(400, now + 1.0);

        // Vibrato effect
        vibrato.frequency.value = 10; // 10Hz wobble
        vibratoGain.gain.value = 20; // Depth of wobble
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 1.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        vibrato.start(now);
        osc.stop(now + 1.0);
        vibrato.stop(now + 1.0);
    }

    playChangeCharge() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Lower, slower rising tone for Changeup
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(200, now + 1.0);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 1.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.0);
    }
}

const soundManager = new SoundManager();

// Entities
const PITCH_TYPES = {
    FASTBALL: 'FASTBALL',
    CURVEBALL: 'CURVEBALL',
    CHANGEUP: 'CHANGEUP'
};

const PITCHER_STATES = {
    IDLE: 'IDLE',
    WINDUP: 'WINDUP'
};

const pitcher = {
    x: 0,
    y: 150,
    width: 32,
    height: 32,
    baseColor: '#ffffff',
    color: '#ffffff',
    state: PITCHER_STATES.IDLE,
    timer: 0,
    idleDuration: 1000,
    windupDuration: 1000,
    nextPitch: PITCH_TYPES.FASTBALL
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

// Fixed Resolution
const GAME_WIDTH = 600;
const GAME_HEIGHT = 800;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Resize handling
function resize() {
    const scaleX = window.innerWidth / GAME_WIDTH;
    const scaleY = window.innerHeight / GAME_HEIGHT;
    const scale = Math.min(scaleX, scaleY);

    canvas.style.width = `${GAME_WIDTH * scale}px`;
    canvas.style.height = `${GAME_HEIGHT * scale}px`;

    // Center entities based on fixed resolution
    pitcher.x = GAME_WIDTH / 2 - pitcher.width / 2;
    bat.pivotX = GAME_WIDTH / 2 - 40;
    bat.pivotY = GAME_HEIGHT - 120;
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
        soundManager.playSwing();
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
    pitcher.state = PITCHER_STATES.IDLE;
    pitcher.timer = 0;
    soundManager.init();
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
    // Telegraphing Color
    let drawColor = pitcher.baseColor;
    if (pitcher.state === PITCHER_STATES.WINDUP) {
        // Flash effect
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            switch (pitcher.nextPitch) {
                case PITCH_TYPES.FASTBALL: drawColor = '#ffffff'; break; // White
                case PITCH_TYPES.CURVEBALL: drawColor = '#ff69b4'; break; // Pink
                case PITCH_TYPES.CHANGEUP: drawColor = '#ffd700'; break; // Gold/Yellow
            }
        }
    }

    drawRect(pitcher.x, pitcher.y, pitcher.width, pitcher.height, drawColor);
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
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const centerX = GAME_WIDTH / 2;
    const homeY = GAME_HEIGHT - 120;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, homeY);
    ctx.lineTo(0, homeY - (centerX * 1.5));
    ctx.moveTo(centerX, homeY);
    ctx.lineTo(GAME_WIDTH, homeY - ((GAME_WIDTH - centerX) * 1.5));
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

function update(dt) {
    // Pitcher State Machine
    pitcher.timer += dt;

    if (pitcher.state === PITCHER_STATES.IDLE) {
        if (pitcher.timer > pitcher.idleDuration) {
            pitcher.state = PITCHER_STATES.WINDUP;
            pitcher.timer = 0;

            // Select random pitch
            const rand = Math.random();
            if (rand < 0.5) pitcher.nextPitch = PITCH_TYPES.FASTBALL;
            else if (rand < 0.8) pitcher.nextPitch = PITCH_TYPES.CURVEBALL;
            else pitcher.nextPitch = PITCH_TYPES.CHANGEUP;

            // Start charge-up sound based on pitch type
            if (pitcher.nextPitch === PITCH_TYPES.CURVEBALL) {
                soundManager.playCurveCharge();
            } else if (pitcher.nextPitch === PITCH_TYPES.CHANGEUP) {
                soundManager.playChangeCharge();
            }
            // Fastball is silent
        }
    } else if (pitcher.state === PITCHER_STATES.WINDUP) {
        if (pitcher.timer > pitcher.windupDuration) {
            // Throw ball
            pitcher.state = PITCHER_STATES.IDLE;
            pitcher.timer = 0;

            let speedY = 0.35;
            let speedX = 0;

            if (pitcher.nextPitch === PITCH_TYPES.FASTBALL) {
                speedY = 0.45; // Faster
            } else if (pitcher.nextPitch === PITCH_TYPES.CHANGEUP) {
                speedY = 0.25; // Slower
            } else if (pitcher.nextPitch === PITCH_TYPES.CURVEBALL) {
                speedY = 0.35; // Normal speed
            }

            balls.push({
                x: pitcher.x + pitcher.width / 2 - 5,
                y: pitcher.y + pitcher.height,
                size: 10,
                speedY: speedY * dt,
                speedX: speedX, // Initial X speed
                baseSpeedY: speedY, // Store for curve calculation
                type: pitcher.nextPitch,
                timeAlive: 0,
                active: true
            });

            soundManager.playPitch();
        }
    }

    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];

        if (ball.hit) {
            ball.x += ball.speedX;
            ball.y += ball.speedY;
        } else {
            ball.timeAlive += dt;

            // Ball Physics based on Type
            if (ball.type === PITCH_TYPES.CURVEBALL) {
                // Sine wave movement
                ball.x += Math.sin(ball.timeAlive * 0.005) * 2.0;
            }

            ball.y += ball.speedY;
        }

        if (ball.y > GAME_HEIGHT || ball.y < -50 || ball.x < -50 || ball.x > GAME_WIDTH + 50) {
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

            const isAngleMatch = angleDiff < 1.2;
            const isBarrelHit = dist > 30 && dist < bat.length + 15;
            const isBatFacingPlate = true;
            const isBallInFront = ball.x > bat.pivotX - 10;
            const isBallHighEnough = ball.y < bat.pivotY + 30;

            if (isAngleMatch && isBarrelHit && isBatFacingPlate && isBallInFront && isBallHighEnough) {
                ball.active = false;

                const hitAngle = bat.angle;
                const isGoodInput = hitAngle < -0.2 && hitAngle > -2.5;

                if (isGoodInput) {
                    const clampedInput = Math.max(-1.8, Math.min(-0.4, hitAngle));
                    const inputRatio = (clampedInput - (-0.4)) / (-1.8 - (-0.4));

                    const jitter = (Math.random() - 0.5) * 0.1;
                    let outputAngle = -1.35 + (inputRatio * (-1.8 - (-1.35))) + jitter;

                    const safeRight = -1.35;
                    const safeLeft = -1.8;
                    outputAngle = Math.max(safeLeft, Math.min(safeRight, outputAngle));

                    ball.speedY = -Math.abs(ball.speedY * 3.0);
                    ball.speedX = (outputAngle + Math.PI / 2) * 15;

                    score++;
                    scoreDisplay.innerText = `Score: ${score} - GOOD HIT!`;
                    soundManager.playHit();
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
                    soundManager.playFoul();
                }

                ball.hit = true;
                ball.active = false;
            }
        }
    }
}

function gameLoop(timestamp) {
    if (!gameActive) return;

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawField();
    drawPitcher();
    drawBat();

    balls.forEach(drawBall);

    update(dt);

    requestAnimationFrame(gameLoop);
}
