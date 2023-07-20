let isGameStarted = false;

// Получение ссылки на холст
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Размеры холста
const width = canvas.width = 640;
const height = canvas.height = 480;

// Цвета
const WHITE = '#fff';
const BLUE = '#0000ff';
const RED = '#ff0000';
const BLOCK_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff'];

// Платформа
const platformWidth = 100;
const platformHeight = 10;
let platformX = (width - platformWidth) / 2;
const platformY = height - 20;

// Шарик
const ballRadius = 10;
let ballX = platformX + platformWidth / 2;
let ballY = platformY - ballRadius;
let ballDX = 2;
let ballDY = 2;
const ballSpeed = 2; // Скорость мяча

// Блоки
const numColumns = 10;
const numRows = 5;
const blockWidth = 50;
const blockHeight = 20;
const blockPadding = 10;
const blocksOffsetTop = 30;
const blocksOffsetLeft = (width - (numColumns * (blockWidth + blockPadding))) / 2;
let blocks = [];

// Счет
let score = 0;

// Жизни
const maxLives = 3;
let lives = maxLives;

// Инициализация массива блоков
function createBlocks() {
    blocks = new Array(numColumns);
    for (let column = 0; column < numColumns; column++) {
        blocks[column] = new Array(numRows);
        for (let row = 0; row < numRows; row++) {
            blocks[column][row] = { x: 0, y: 0, status: 1 };
        }
    }
}

createBlocks();

// Отрисовка блоков
function drawBlocks() {
    for (let column = 0; column < numColumns; column++) {
        for (let row = 0; row < numRows; row++) {
            if (blocks[column][row].status === 1) {
                const blockX = (column * (blockWidth + blockPadding)) + blocksOffsetLeft;
                const blockY = (row * (blockHeight + blockPadding)) + blocksOffsetTop;
                blocks[column][row].x = blockX;
                blocks[column][row].y = blockY;
                ctx.fillStyle = BLOCK_COLORS[row];
                ctx.fillRect(blockX, blockY, blockWidth, blockHeight);
            }
        }
    }
}

// Отрисовка платформы
function drawPlatform() {
    ctx.fillStyle = BLUE;
    ctx.fillRect(platformX, platformY, platformWidth, platformHeight);
}

// Отрисовка шарика
function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2, false);
    ctx.fillStyle = BLUE;
    ctx.fill();
    ctx.closePath();
    const ballSpeed = 3; // Скорость мяча

    // Отскок от платформы
    if (ballX + ballRadius > platformX && ballX - ballRadius < platformX + platformWidth &&
        ballY + ballRadius > platformY) {
        // Рассчитываем точку попадания мяча на платформу
        const collisionPoint = ballX - (platformX + platformWidth / 2);
        // Нормализуем значение точки попадания в диапазон [-1, 1]
        const normalizedCollisionPoint = collisionPoint / (platformWidth / 2);
        // Рассчитываем новое направление мяча по горизонтали
        const angle = normalizedCollisionPoint * Math.PI / 3; // Максимальный угол отскока 60 градусов
        ballDX = Math.sin(angle) * ballSpeed;
        ballDY = -Math.cos(angle) * ballSpeed;
    }
}

// Коллизия шарика с блоками
function ballBlockCollisionDetection() {
    for (let column = 0; column < numColumns; column++) {
        for (let row = 0; row < numRows; row++) {
            const block = blocks[column][row];
            if (block.status === 1) {
                if (
                    ballX + ballRadius > block.x &&
                    ballX - ballRadius < block.x + blockWidth &&
                    ballY + ballRadius > block.y &&
                    ballY - ballRadius < block.y + blockHeight
                ) {
                    ballDY *= -1;
                    block.status = 0;
                    score++; // Увеличение счета при сбитии блока
                }
            }
        }
    }
}

// Отрисовка счета
function drawScore() {
    ctx.font = '16px Arial';
    ctx.fillStyle = RED; // Красный цвет
    ctx.fillText('Score: ' + score, 8, 20);
}

// Отрисовка жизней
function drawLives() {
    ctx.font = '16px Arial';
    ctx.fillStyle = RED; // Красный цвет

    let hearts = '';
    for (let i = 0; i < lives; i++) {
        hearts += '♥ ';
    }

    ctx.fillText('Lives: ' + hearts, width - 100, 20);
}

// Игровой цикл
function gameLoop() {

    ctx.clearRect(0, 0, width, height);

    // Отрисовка границ экрана
    ctx.strokeStyle = BLUE; // Цвет границ
    ctx.lineWidth = 2; // Толщина границ
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.stroke();


    // Обработка движения платформы с помощью клавиш или мыши
    if (keys['ArrowLeft'] || (isMouseMoving && mousePosition.x < platformX)) {
        if (platformX > 0) {
            platformX -= 5;
        }
    }
    if (keys['ArrowRight'] || (isMouseMoving && mousePosition.x > platformX + platformWidth)) {
        if (platformX < width - platformWidth) {
            platformX += 5;
        }
    }

    // Обновление позиции шарика
    ballX += ballDX;
    ballY += ballDY;

    // Отскок от стенок
    if (ballX - ballRadius < 0 || ballX + ballRadius > width) {
        ballDX *= -1;
    }
    if (ballY - ballRadius < 0) {
        ballDY *= -1;
    }

    // Потеря жизни и перезапуск шарика
    if (ballY + ballRadius > height) {
        lives--;
        if (lives === 0) {
            // Конец игры
            endGame();
            return;
        } else {
            // Перезапуск шарика
            ballX = width / 2;
            ballY = height / 2;
            ballDX = 2;
            ballDY = 2;
        }
    }

    // Обработка коллизии шарика с блоками
    ballBlockCollisionDetection();

    drawBlocks();
    drawPlatform();
    drawBall();
    drawScore();
    drawLives();

    if (!isGameStarted) {
        requestAnimationFrame(gameLoop);
        return;
    }
}

// Конец игры
function endGame() {
    ctx.clearRect(0, 0, width, height);
    ctx.font = '36px Arial';
    ctx.fillStyle = RED;
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', width / 2, height / 2);
}

// Обработка нажатий клавиш и движений мыши
const keys = {};
let mousePosition = { x: 0, y: 0 };
let isMouseMoving = false;

document.addEventListener('keydown', function (event) {
    keys[event.key] = true;
});

document.addEventListener('keyup', function (event) {
    delete keys[event.key];
});

document.addEventListener('mousemove', function (event) {
    const rect = canvas.getBoundingClientRect();
    mousePosition.x = event.clientX - rect.left;
    mousePosition.y = event.clientY - rect.top;
});

document.addEventListener('mousedown', function (event) {
    isMouseMoving = true;
});

document.addEventListener('mouseup', function (event) {
    isMouseMoving = false;
});


gameLoop();
