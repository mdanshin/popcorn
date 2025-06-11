// Игровые переменные
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameRunning = false;
let soundEnabled = true;

// Аудио контекст для звуков
let audioContext;
let masterGain;

// Игровые объекты
let paddle = {
    x: 350,
    y: 550,
    width: 100,
    height: 15,
    speed: 8
};

let ball = {
    x: 400,
    y: 400,
    dx: 4,
    dy: -4,
    radius: 8,
    speed: 4
};

let bricks = [];
let powerUps = [];
let particles = [];

// Игровые переменные
let score = 0;
let level = 1;
let lives = 3;
let keys = {};

// Инициализация аудио
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.connect(audioContext.destination);
        masterGain.gain.value = 0.3;
    }
}

// Создание звуковых эффектов
function playSound(frequency, duration, type = 'sine', volume = 0.1) {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Звуковые эффекты
function playHitSound() {
    playSound(800, 0.1, 'square', 0.15);
}

function playBrickSound() {
    playSound(400 + Math.random() * 400, 0.2, 'sawtooth', 0.12);
}

function playPowerUpSound() {
    playSound(600, 0.3, 'sine', 0.1);
    setTimeout(() => playSound(800, 0.2, 'sine', 0.08), 100);
}

function playGameOverSound() {
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            playSound(200 - i * 30, 0.3, 'sawtooth', 0.1);
        }, i * 100);
    }
}

function playLevelCompleteSound() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((note, i) => {
        setTimeout(() => playSound(note, 0.4, 'sine', 0.1), i * 150);
    });
}

// Фоновая музыка
function playBackgroundMusic() {
    if (!soundEnabled || !audioContext) return;
    
    const melody = [262, 294, 330, 349, 392, 440, 494, 523]; // C мажор
    let noteIndex = 0;
    
    function playNote() {
        if (gameRunning && soundEnabled) {
            playSound(melody[noteIndex] * 0.5, 0.8, 'triangle', 0.03);
            noteIndex = (noteIndex + 1) % melody.length;
            setTimeout(playNote, 1000 + Math.random() * 500);
        }
    }
    
    setTimeout(playNote, 1000);
}

// Создание кирпичей
function createBricks() {
    bricks = [];
    const rows = 5 + level;
    const cols = 10;
    const brickWidth = 70;
    const brickHeight = 25;
    const offsetX = 35;
    const offsetY = 80;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const colors = ['#ff0040', '#ff8000', '#ffff00', '#00ff40', '#0080ff', '#8000ff'];
            bricks.push({
                x: col * (brickWidth + 5) + offsetX,
                y: row * (brickHeight + 5) + offsetY,
                width: brickWidth,
                height: brickHeight,
                color: colors[row % colors.length],
                hits: Math.min(3, Math.floor(row / 2) + 1),
                maxHits: Math.min(3, Math.floor(row / 2) + 1)
            });
        }
    }
}

// Создание частиц для эффектов
function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
            color: color,
            life: 1,
            decay: 0.02 + Math.random() * 0.02
        });
    }
}

// Создание бонусов
function createPowerUp(x, y) {
    if (Math.random() < 0.3) {
        const types = [
            { type: 'expand', color: '#00ff00' },
            { type: 'multiball', color: '#ff00ff' },
            { type: 'slow', color: '#00ffff' },
            { type: 'fast', color: '#ffff00' }
        ];
        
        const powerUp = types[Math.floor(Math.random() * types.length)];
        powerUps.push({
            x: x,
            y: y,
            width: 20,
            height: 20,
            dy: 2,
            type: powerUp.type,
            color: powerUp.color
        });
    }
}

// Обработка столкновений
function checkCollisions() {
    // Столкновение с краями
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
        playHitSound();
    }
    
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
        playHitSound();
    }

    // Столкновение с нижней границей
    if (ball.y + ball.radius > canvas.height) {
        lives--;
        if (lives <= 0) {
            gameOver();
        } else {
            resetBall();
        }
        return;
    }

    // Столкновение с платформой
    if (ball.x > paddle.x && ball.x < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y && ball.y - ball.radius < paddle.y + paddle.height) {
        
        // Изменение угла отскока в зависимости от места удара
        const hitPos = (ball.x - paddle.x) / paddle.width;
        const angle = (hitPos - 0.5) * Math.PI / 3;
        
        ball.dx = Math.sin(angle) * ball.speed;
        ball.dy = -Math.abs(Math.cos(angle) * ball.speed);
        
        playHitSound();
        createParticles(ball.x, ball.y, '#00ffff', 4);
    }

    // Столкновение с кирпичами
    for (let i = bricks.length - 1; i >= 0; i--) {
        const brick = bricks[i];
        
        if (ball.x + ball.radius > brick.x && ball.x - ball.radius < brick.x + brick.width &&
            ball.y + ball.radius > brick.y && ball.y - ball.radius < brick.y + brick.height) {
            
            // Определение стороны столкновения
            const overlapX = Math.min(ball.x + ball.radius - brick.x, brick.x + brick.width - (ball.x - ball.radius));
            const overlapY = Math.min(ball.y + ball.radius - brick.y, brick.y + brick.height - (ball.y - ball.radius));
            
            if (overlapX < overlapY) {
                ball.dx = -ball.dx;
            } else {
                ball.dy = -ball.dy;
            }

            brick.hits--;
            playBrickSound();
            createParticles(brick.x + brick.width/2, brick.y + brick.height/2, brick.color, 6);

            if (brick.hits <= 0) {
                score += 100 * level;
                createPowerUp(brick.x + brick.width/2, brick.y + brick.height/2);
                bricks.splice(i, 1);
                
                if (bricks.length === 0) {
                    levelComplete();
                }
            } else {
                score += 10;
            }
            
            break;
        }
    }

    // Столкновение с бонусами
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        
        if (powerUp.x < paddle.x + paddle.width && powerUp.x + powerUp.width > paddle.x &&
            powerUp.y < paddle.y + paddle.height && powerUp.y + powerUp.height > paddle.y) {
            
            applyPowerUp(powerUp.type);
            playPowerUpSound();
            createParticles(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, powerUp.color, 8);
            powerUps.splice(i, 1);
        }
    }
}

// Применение бонусов
function applyPowerUp(type) {
    switch(type) {
        case 'expand':
            paddle.width = Math.min(150, paddle.width + 20);
            setTimeout(() => { 
                paddle.width = Math.max(60, paddle.width - 20); 
            }, 10000);
            break;
        case 'slow':
            ball.dx *= 0.7;
            ball.dy *= 0.7;
            ball.speed *= 0.7;
            setTimeout(() => {
                ball.dx /= 0.7;
                ball.dy /= 0.7;
                ball.speed /= 0.7;
            }, 8000);
            break;
        case 'fast':
            ball.dx *= 1.5;
            ball.dy *= 1.5;
            ball.speed *= 1.5;
            setTimeout(() => {
                ball.dx /= 1.5;
                ball.dy /= 1.5;
                ball.speed /= 1.5;
            }, 5000);
            break;
    }
}

// Сброс мяча
function resetBall() {
    ball.x = 400;
    ball.y = 400;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
    ball.dy = -4;
    ball.speed = 4;
}

// Завершение уровня
function levelComplete() {
    level++;
    ball.speed += 0.5;
    playLevelCompleteSound();
    
    setTimeout(() => {
        createBricks();
        resetBall();
    }, 2000);
}

// Окончание игры
function gameOver() {
    gameRunning = false;
    playGameOverSound();
    document.getElementById('finalScore').textContent = `Ваш счёт: ${score}`;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

// Отрисовка игры
function draw() {
    // Очистка canvas с градиентом
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#001122');
    gradient.addColorStop(1, '#000511');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Отрисовка звёзд (фон)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 17) % canvas.width;
        const y = (i * 13) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }

    // Отрисовка платформы
    const paddleGradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    paddleGradient.addColorStop(0, '#00ffff');
    paddleGradient.addColorStop(1, '#0080ff');
    ctx.fillStyle = paddleGradient;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Отрисовка мяча
    const ballGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(1, '#00ffff');
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Отрисовка кирпичей
    bricks.forEach(brick => {
        const alpha = brick.hits / brick.maxHits;
        const brickGradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
        brickGradient.addColorStop(0, brick.color);
        brickGradient.addColorStop(1, brick.color + '80');
        
        ctx.fillStyle = brickGradient;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        
        // Индикатор прочности
        if (brick.hits > 1) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(brick.hits, brick.x + brick.width/2, brick.y + brick.height/2 + 4);
        }
    });

    // Отрисовка бонусов
    powerUps.forEach(powerUp => {
        ctx.fillStyle = powerUp.color;
        ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        
        // Символ бонуса
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron';
        ctx.textAlign = 'center';
        const symbol = powerUp.type === 'expand' ? '+' : 
                      powerUp.type === 'slow' ? 'S' : 
                      powerUp.type === 'fast' ? 'F' : '•';
        ctx.fillText(symbol, powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2 + 4);
    });

    // Отрисовка частиц
    particles.forEach(particle => {
        ctx.fillStyle = particle.color + Math.floor(particle.life * 255).toString(16).padStart(2, '0');
        ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });
}

// Обновление игры
function update() {
    if (!gameRunning) return;

    // Движение платформы
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        paddle.x = Math.max(0, paddle.x - paddle.speed);
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        paddle.x = Math.min(canvas.width - paddle.width, paddle.x + paddle.speed);
    }

    // Движение мяча
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Движение бонусов
    powerUps.forEach((powerUp, index) => {
        powerUp.y += powerUp.dy;
        if (powerUp.y > canvas.height) {
            powerUps.splice(index, 1);
        }
    });

    // Обновление частиц
    particles.forEach((particle, index) => {
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.dx *= 0.98;
        particle.dy *= 0.98;
        particle.life -= particle.decay;
        
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });

    checkCollisions();
    updateUI();
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lives').textContent = lives;
}

// Игровой цикл
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Управление
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Функции управления игрой
function startGame() {
    initAudio();
    gameRunning = true;
    score = 0;
    level = 1;
    lives = 3;
    
    createBricks();
    resetBall();
    
    document.getElementById('startScreen').style.display = 'none';
    playBackgroundMusic();
}

function restartGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    startGame();
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.querySelector('#startScreen .btn:last-child');
    btn.textContent = `ЗВУК: ${soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}`;
}

// Запуск игрового цикла
gameLoop();
