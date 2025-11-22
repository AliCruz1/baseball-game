const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const scoreDisplay = document.getElementById('score');

// Game State
let gameActive = false;
let score = 0;
let lastTime = 0;
const TARGET_FPS = 120;
const TIME_STEP = 1000 / TARGET_FPS;
let accumulator = 0;

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

    playSuperCharge() {
        if (!this.initialized) return;
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // High-pitched screamer for Super Fastball
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 1.0); // Screaming high

        gain.gain.setValueAtTime(0.1, now);
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
    CHANGEUP: 'CHANGEUP',
    SUPER_FASTBALL: 'SUPER_FASTBALL'
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
    angle: Math.PI, // Start pointing Left
    swinging: false,
    swingSpeed: -0.3,
    pivotX: 0,
    pivotY: 0
};

const balls = [];

// Fixed Resolution
let GAME_WIDTH = 600;
let GAME_HEIGHT = 800;
const BASE_HEIGHT = 800;
const BASE_BATTER_Y = 680;
let playOffsetY = 0;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Resize handling
function resize() {
    const windowRatio = window.innerWidth / window.innerHeight;
    const gameRatio = 600 / 800; // 0.75

    if (windowRatio > gameRatio) {
        // Screen is wider than game (Wide Screen)
        // Fix Height at 800, Expand Width
        GAME_HEIGHT = 800;
        GAME_WIDTH = GAME_HEIGHT * windowRatio;
    } else {
        // Screen is taller than game (Tall Screen)
        // Fix Width at 600, Expand Height
        GAME_WIDTH = 600;
        GAME_HEIGHT = GAME_WIDTH / windowRatio;
    }

    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    // Scale canvas to fit window
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Center entities based on dynamic resolution
    if (GAME_HEIGHT > BASE_HEIGHT) {
        playOffsetY = (GAME_HEIGHT - BASE_HEIGHT) / 2;
    } else {
        playOffsetY = 0;
    }

    pitcher.x = GAME_WIDTH / 2 - pitcher.width / 2;
    pitcher.y = 150 + playOffsetY;

    bat.pivotX = GAME_WIDTH / 2 - 40;
    bat.pivotY = BASE_BATTER_Y + playOffsetY;
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
        bat.angle = Math.PI; // Start from Left
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
    accumulator = 0;
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
                case PITCH_TYPES.SUPER_FASTBALL: drawColor = '#ff0000'; break; // Red
            }
        }
    }

    // Animation Logic based on State and Timer
    if (pitcher.state === PITCHER_STATES.WINDUP) {
        const progress = pitcher.timer / pitcher.windupDuration;

        if (progress < 0.3) {
            // PHASE 1: THE SET (Hands at chest)
            // Torso
            drawRect(pitcher.x, pitcher.y, pitcher.width, 20, drawColor);
            // Legs (Standing straight)
            drawRect(pitcher.x + 2, pitcher.y + 20, 10, 12, drawColor); // Left Leg
            drawRect(pitcher.x + 20, pitcher.y + 20, 10, 12, drawColor); // Right Leg

            drawRect(pitcher.x + 8, pitcher.y - 10, 16, 16, '#ffccaa'); // Head
            drawRect(pitcher.x + 6, pitcher.y - 14, 20, 6, '#e74c3c'); // Hat

            // Feet (Standing)
            drawRect(pitcher.x + 2, pitcher.y + 32, 10, 4, '#000000'); // Left Shoe
            drawRect(pitcher.x + 20, pitcher.y + 32, 10, 4, '#000000'); // Right Shoe

            // Glove/Hands coming together (White)
            drawRect(pitcher.x + 10, pitcher.y + 12, 12, 10, '#ffffff');

        } else if (progress < 0.7) {
            // PHASE 2: THE LEG KICK (Leg raises high)
            // Torso
            drawRect(pitcher.x, pitcher.y, pitcher.width, 20, drawColor);

            // Pivot Leg (Right - Planted)
            drawRect(pitcher.x + 20, pitcher.y + 20, 10, 12, drawColor);
            drawRect(pitcher.x + 20, pitcher.y + 32, 10, 4, '#000000'); // Right Shoe

            // Raised Leg (Left - High Knee)
            drawRect(pitcher.x - 8, pitcher.y + 10, 10, 12, drawColor); // Thigh
            drawRect(pitcher.x - 8, pitcher.y + 22, 10, 4, '#000000'); // Left Shoe (in air)

            drawRect(pitcher.x + 8, pitcher.y - 10, 16, 16, '#ffccaa'); // Head
            drawRect(pitcher.x + 6, pitcher.y - 14, 20, 6, '#e74c3c'); // Hat

            // Glove tucked (White)
            drawRect(pitcher.x + 20, pitcher.y + 12, 8, 8, '#ffffff');

        } else {
            // PHASE 3: THE THROW (Lunge and Extend)
            // Torso (Leaning forward)
            drawRect(pitcher.x + 5, pitcher.y + 2, pitcher.width, 20, drawColor);

            // Lunge Leg (Left - Forward)
            drawRect(pitcher.x + 35, pitcher.y + 22, 10, 10, drawColor);
            drawRect(pitcher.x + 35, pitcher.y + 32, 10, 4, '#000000'); // Left Shoe

            // Pivot Leg (Right - Trailing)
            drawRect(pitcher.x + 5, pitcher.y + 22, 10, 10, drawColor);
            drawRect(pitcher.x + 5, pitcher.y + 32, 10, 4, '#000000'); // Right Shoe

            drawRect(pitcher.x + 13, pitcher.y - 8, 16, 16, '#ffccaa'); // Head
            drawRect(pitcher.x + 11, pitcher.y - 12, 20, 6, '#e74c3c'); // Hat

            // Throwing Arm Extending
            drawRect(pitcher.x + 35, pitcher.y + 5, 12, 6, drawColor);
            // Glove Hand Counter-balance (White)
            drawRect(pitcher.x - 5, pitcher.y + 10, 8, 8, '#ffffff');
        }
    } else {
        // IDLE POSE
        // Torso
        drawRect(pitcher.x, pitcher.y, pitcher.width, 20, drawColor);
        // Legs
        drawRect(pitcher.x + 2, pitcher.y + 20, 10, 12, drawColor);
        drawRect(pitcher.x + 20, pitcher.y + 20, 10, 12, drawColor);

        drawRect(pitcher.x + 8, pitcher.y - 10, 16, 16, '#ffccaa');
        drawRect(pitcher.x + 6, pitcher.y - 14, 20, 6, '#e74c3c');

        // Feet
        drawRect(pitcher.x + 2, pitcher.y + 32, 10, 4, '#000000'); // Left Shoe
        drawRect(pitcher.x + 20, pitcher.y + 32, 10, 4, '#000000'); // Right Shoe
    }
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
    const homeY = bat.pivotY;

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

    // Pacing: Only update pitcher timer if no balls are in play
    if (balls.length === 0) {
        pitcher.timer += dt;
    }

    if (pitcher.state === PITCHER_STATES.IDLE) {
        // Increased idle duration for better pacing (1.5s)
        if (pitcher.timer > 1500) {
            pitcher.state = PITCHER_STATES.WINDUP;
            pitcher.timer = 0;

            // Select random pitch
            const rand = Math.random();
            if (rand < 0.1) pitcher.nextPitch = PITCH_TYPES.SUPER_FASTBALL; // 10% chance
            else if (rand < 0.5) pitcher.nextPitch = PITCH_TYPES.FASTBALL;
            else if (rand < 0.8) pitcher.nextPitch = PITCH_TYPES.CURVEBALL;
            else pitcher.nextPitch = PITCH_TYPES.CHANGEUP;

            // Start charge-up sound based on pitch type
            if (pitcher.nextPitch === PITCH_TYPES.CURVEBALL) {
                soundManager.playCurveCharge();
            } else if (pitcher.nextPitch === PITCH_TYPES.CHANGEUP) {
                soundManager.playChangeCharge();
            } else if (pitcher.nextPitch === PITCH_TYPES.SUPER_FASTBALL) {
                soundManager.playSuperCharge();
            }
            // Fastball is silent
        }
    } else if (pitcher.state === PITCHER_STATES.WINDUP) {
        // Timer always updates during windup
        pitcher.timer += dt;

        if (pitcher.timer > pitcher.windupDuration) {
            // Throw ball
            pitcher.state = PITCHER_STATES.IDLE;
            pitcher.timer = 0;

            // Progressive Difficulty: Speed increases with score
            // Cap at 60% faster (multiplier 1.6)
            const speedMultiplier = 1 + Math.min(score * 0.02, 0.6);

            let speedY = 0.35;
            let speedX = 0;

            if (pitcher.nextPitch === PITCH_TYPES.FASTBALL) {
                speedY = 0.45; // Faster
            } else if (pitcher.nextPitch === PITCH_TYPES.CHANGEUP) {
                speedY = 0.25; // Slower
            } else if (pitcher.nextPitch === PITCH_TYPES.CURVEBALL) {
                speedY = 0.35; // Normal speed
            } else if (pitcher.nextPitch === PITCH_TYPES.SUPER_FASTBALL) {
                speedY = 0.65; // Super Fast!
            }

            // Apply Multiplier
            speedY *= speedMultiplier;

            balls.push({
                x: pitcher.x + pitcher.width / 2 - 5,
                y: pitcher.y + pitcher.height,
                startX: pitcher.x + pitcher.width / 2 - 5,
                startY: pitcher.y + pitcher.height,
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
                // Deterministic Curve based on distance traveled
                // Ensures ball always behaves consistently regardless of speed
                const totalDist = bat.pivotY - ball.startY;
                const currentDist = ball.y - ball.startY;
                const progress = Math.max(0, Math.min(1, currentDist / totalDist));

                let offset = 0;
                // Curve Phase: 0% to 75% of flight
                if (progress < 0.75) {
                    // Sine wave: 0 -> 1 -> 0
                    // Curves out and comes back to center
                    const curvePhase = (progress / 0.75) * Math.PI;
                    // Amplitude of 50 pixels
                    offset = Math.sin(curvePhase) * 50;

                    // Alternate direction based on something? 
                    // For now, let's just curve Left (negative) to simulate RHP breaking ball
                    offset = -offset;
                }
                // Straight Phase: 75% to 100% (Over the plate)
                // Offset remains 0 (Center)

                ball.x = ball.startX + offset;
            }

            ball.y += ball.speedY;
        }

        if (ball.y > GAME_HEIGHT || ball.y < -50 || ball.x < -50 || ball.x > GAME_WIDTH + 50) {
            balls.splice(i, 1);
        }
    }

    if (bat.swinging) {
        bat.angle += bat.swingSpeed * (dt / 16);
        if (bat.angle <= -Math.PI) {
            bat.angle = Math.PI;
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

                // Fixed speed for all hits (user requested)
                // Base speed of 12 pixels/frame @ 60fps, scaled by dt
                const HIT_SPEED = 12 * (dt / 16.667);

                // Field Geometry for strict foul lines
                // Slope is 1.5 (from drawField)
                const FAIR_ANGLE_RIGHT = Math.atan2(-1.5, 1); // ~ -0.98 rad
                const FAIR_ANGLE_LEFT = Math.atan2(-1.5, -1); // ~ -2.16 rad
                const SAFE_MARGIN = 0.1; // Buffer to ensure good hits are clearly fair

                if (isGoodInput) {
                    // Map timing to fair territory angles
                    const clampedInput = Math.max(-1.8, Math.min(-0.4, hitAngle));
                    const inputRatio = (clampedInput - (-0.4)) / (-1.8 - (-0.4));

                    // Map ratio to Safe Zone within Fair Territory
                    const safeRight = FAIR_ANGLE_RIGHT - SAFE_MARGIN;
                    const safeLeft = FAIR_ANGLE_LEFT + SAFE_MARGIN;

                    let outputAngle = safeRight + (inputRatio * (safeLeft - safeRight));

                    // Add slight jitter for realism
                    const jitter = (Math.random() - 0.5) * 0.05;
                    outputAngle += jitter;

                    // Clamp again just to be safe
                    outputAngle = Math.max(safeLeft, Math.min(safeRight, outputAngle));

                    // Apply Velocity Vector
                    ball.speedX = Math.cos(outputAngle) * HIT_SPEED;
                    ball.speedY = Math.sin(outputAngle) * HIT_SPEED;

                    score++;
                    scoreDisplay.innerText = `Score: ${score} - GOOD HIT!`;
                    soundManager.playHit();
                    setTimeout(() => {
                        if (scoreDisplay.innerText.includes("GOOD HIT")) {
                            scoreDisplay.innerText = `Score: ${score}`;
                        }
                    }, 1000);

                } else {
                    let foulAngle;
                    let foulType = "";
                    const rand = Math.random();

                    // Determine if it's a "Close Call" (near the line) or "Way Back"
                    // 30% Close Call, 70% Way Back
                    const isCloseCall = rand < 0.3;
                    const offset = isCloseCall ? 0.05 : (0.2 + Math.random() * 0.5);

                    // Randomly decide Left or Right foul (50/50)
                    if (Math.random() > 0.5) {
                        // Right Side Foul
                        // Must be GREATER than FAIR_ANGLE_RIGHT (closer to 0)
                        foulAngle = FAIR_ANGLE_RIGHT + offset;
                        foulType = isCloseCall ? "CLOSE CALL" : "WAY BACK";
                    } else {
                        // Left Side Foul
                        // Must be LESS than FAIR_ANGLE_LEFT (more negative)
                        foulAngle = FAIR_ANGLE_LEFT - offset;
                        foulType = isCloseCall ? "CLOSE CALL" : "WAY BACK";
                    }

                    // Apply Velocity Vector
                    ball.speedX = Math.cos(foulAngle) * HIT_SPEED;
                    ball.speedY = Math.sin(foulAngle) * HIT_SPEED;

                    scoreDisplay.innerText = `Score: ${score} - FOUL (${foulType})`;
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

    let dt = timestamp - lastTime;
    lastTime = timestamp;

    // Prevent spiral of death if lag occurs
    if (dt > 100) dt = 100;

    accumulator += dt;

    while (accumulator >= TIME_STEP) {
        update(TIME_STEP);
        accumulator -= TIME_STEP;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawField();
    drawPitcher();
    drawBat();

    balls.forEach(drawBall);

    requestAnimationFrame(gameLoop);
}
