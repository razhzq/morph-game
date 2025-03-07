const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 400;

// Game state
let player = null;
let playerName = 'Player';  // Default name
let gameStarted = false;
let score = 0;
let gameOver = false;
let enemy = null;
let startTime = 0;
let survivalTime = 0;

// Environment constants
const SKY_COLOR = '#87CEEB';  // Light sky blue
const GROUND_LEVEL = canvas.height - 100;
const SKY_LEVEL = 150;  // Height where jet appears after transformation

// Function to format time as MM:SS
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Function to reset game state
function resetGame() {
    score = 0;
    gameOver = false;
    startTime = Date.now();
    survivalTime = 0;
    // Create player at random position
    const randomX = Math.random() * (canvas.width - 100);
    player = new Player(randomX);
    // Create first enemy
    enemy = new Enemy();
    // Start game loop if not already started
    if (!gameStarted) {
        gameStarted = true;
        gameLoop();
    }
}

// Function to draw environment
function drawEnvironment() {
    // Desert ground
    ctx.fillStyle = '#F4A460';  // Sandy brown
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desert details - add more sand dunes for background
    for (let i = 0; i < canvas.width; i += 50) {
        // Background dunes
        ctx.fillStyle = '#DEB887';  // Darker sand
        ctx.beginPath();
        ctx.arc(i, canvas.height / 2, 30, 0, Math.PI, true);
        ctx.fill();
        
        // Foreground dunes
        ctx.beginPath();
        ctx.arc(i, GROUND_LEVEL, 20, 0, Math.PI, true);
        ctx.fill();
    }

    // Add some cacti
    for (let i = 0; i < canvas.width; i += 200) {
        drawCactus(i + Math.random() * 50, GROUND_LEVEL);
    }
}

// Function to draw a cactus
function drawCactus(x, y) {
    ctx.fillStyle = '#2D5A27';  // Cactus green
    // Main body
    ctx.fillRect(x, y - 40, 10, 40);
    // Arms
    ctx.fillRect(x - 15, y - 30, 15, 8);
    ctx.fillRect(x + 10, y - 20, 15, 8);
}

// Enemy class
class Enemy {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.side = Math.random() < 0.5 ? 'left' : 'right';
        this.x = this.side === 'left' ? -this.width : canvas.width;
        this.y = player.isJet ? 
            SKY_LEVEL + Math.random() * 200 : // Spawn at sky level if player is jet
            GROUND_LEVEL;                     // Spawn at ground level otherwise
        this.speed = 1.5; // Reduced from 3 to 1.5
        this.color = '#e74c3c';
    }

    update(playerX, playerY) {
        // Move towards player with smoother tracking
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Add slight delay in enemy response
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed * 0.8; // Reduced vertical speed for smoother movement
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        // Enemy body
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // Enemy details
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        ctx.restore();
    }

    checkCollision(missile) {
        return (missile.x < this.x + this.width &&
                missile.x + missile.width > this.x &&
                missile.y < this.y + this.height &&
                missile.y + missile.height > this.y);
    }

    checkPlayerCollision(player) {
        return (this.x < player.x + 40 &&
                this.x + this.width > player.x - 20 &&
                this.y < player.y + 20 &&
                this.y + this.height > player.y - 35);
    }
}

// Missile class
class Missile {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 8;
        this.speed = 10;
        this.direction = direction;
        this.active = true;
    }

    update() {
        this.x += this.speed * this.direction;
        // Deactivate missile if it goes off screen
        if (this.x < 0 || this.x > canvas.width) {
            this.active = false;
        }
    }

    draw() {
        ctx.save();
        // Missile body
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x, this.y, this.width * this.direction, this.height);
        // Missile tip
        ctx.beginPath();
        ctx.moveTo(this.x + (this.width * this.direction), this.y);
        ctx.lineTo(this.x + ((this.width + 10) * this.direction), this.y + this.height/2);
        ctx.lineTo(this.x + (this.width * this.direction), this.y + this.height);
        ctx.fillStyle = '#c0392b';
        ctx.fill();
        ctx.restore();
    }
}

// Player class
class Player {
    constructor(startX) {
        this.x = startX;
        this.y = canvas.height - 100;
        this.width = 60;
        this.height = 60;
        this.isSkater = true;
        this.isTank = false;
        this.isJet = false;
        this.morphTimer = 0;
        this.morphDuration = 2000; // 2 seconds
        this.speed = 0; // Current speed
        this.maxSpeed = 6; // Maximum speed
        this.jetMaxSpeed = 8; // Faster speed for jet
        this.acceleration = 0.5;
        this.deceleration = 0.3;
        this.velocityY = 0;
        this.gravity = 0.5;
        this.jetGravity = 0.2; // Reduced gravity for jet
        this.jumpForce = -12;
        this.isJumping = false;
        this.direction = 1; // 1 for right, -1 for left
        this.missiles = [];
        this.canFire = true;
        this.fireDelay = 500;
        
        // Movement flags
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;
        
        // Animation properties
        this.frame = 0;
        this.frameCount = 0;

        // Set up keyboard controls
        this.setupControls();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.moveLeft = true;
                    this.direction = -1;
                    break;
                case 'ArrowRight':
                    this.moveRight = true;
                    this.direction = 1;
                    break;
                case 'ArrowUp':
                    if (this.isJet) {
                        this.moveUp = true;
                    } else {
                        this.jump();
                    }
                    break;
                case 'ArrowDown':
                    if (this.isJet) {
                        this.moveDown = true;
                    }
                    break;
                case ' ': // Spacebar
                    this.fireMissile();
                    break;
                case 'x':
                case 'X':
                    this.transformToJet();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.moveLeft = false;
                    break;
                case 'ArrowRight':
                    this.moveRight = false;
                    break;
                case 'ArrowUp':
                    this.moveUp = false;
                    break;
                case 'ArrowDown':
                    this.moveDown = false;
                    break;
            }
        });
    }

    transformToJet() {
        if (!this.isJet && !this.isSkater) { // Only transform if in tank form
            this.isJet = true;
            this.isTank = false;
            // Reset velocities but keep position
            this.velocityY = 0;
            this.speed = 0;
        }
    }

    fireMissile() {
        if (!this.isSkater && this.canFire) { // Only tank can fire
            // Calculate missile starting position based on tank cannon
            const missileX = this.direction === 1 ? this.x + 65 : this.x - 25;
            const missileY = this.y - 25;
            
            this.missiles.push(new Missile(missileX, missileY, this.direction));
            
            // Add firing cooldown
            this.canFire = false;
            setTimeout(() => {
                this.canFire = true;
            }, this.fireDelay);
        }
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = this.jumpForce;
            this.isJumping = true;
        }
    }

    update() {
        if (gameOver) return;

        // Handle horizontal movement with acceleration/deceleration
        const currentMaxSpeed = this.isJet ? this.jetMaxSpeed : this.maxSpeed;
        
        if (this.moveLeft) {
            this.speed = Math.max(this.speed - this.acceleration, -currentMaxSpeed);
            this.direction = -1;
        } else if (this.moveRight) {
            this.speed = Math.min(this.speed + this.acceleration, currentMaxSpeed);
            this.direction = 1;
        } else {
            if (this.speed > 0) {
                this.speed = Math.max(0, this.speed - this.deceleration);
            } else if (this.speed < 0) {
                this.speed = Math.min(0, this.speed + this.deceleration);
            }
        }

        // Update position based on speed
        this.x += this.speed;

        // Keep player within canvas bounds
        if (this.x < 0) {
            this.x = 0;
            this.speed = 0;
        }
        if (this.x > canvas.width - this.width) {
            this.x = canvas.width - this.width;
            this.speed = 0;
        }

        // Handle vertical movement
        if (this.isJet) {
            // Jet movement with gradual takeoff/landing
            if (this.moveUp) {
                this.velocityY = -5;
            } else if (this.moveDown) {
                this.velocityY = 5;
            } else {
                // Slight hover effect when not moving
                this.velocityY = this.y > GROUND_LEVEL - 50 ? -0.5 : 0;
            }
        } else {
            // Normal gravity for non-jet forms
            this.velocityY += this.gravity;
        }

        // Update vertical position
        this.y += this.velocityY;

        // Ground collision and bounds checking
        if (this.y > GROUND_LEVEL) {
            this.y = GROUND_LEVEL;
            this.velocityY = 0;
            this.isJumping = false;
        }

        // Sky bounds for jet
        if (this.isJet && this.y < 50) {
            this.y = 50;
            this.velocityY = 0;
        }

        // Update morph timer
        this.morphTimer += 16;
        if (this.morphTimer >= this.morphDuration && this.isSkater) {
            this.isSkater = false;
            this.isTank = true;
        }

        // Rest of update method remains the same
        this.missiles = this.missiles.filter(missile => missile.active);
        this.missiles.forEach(missile => missile.update());

        this.frameCount++;
        if (this.frameCount >= 5) {
            this.frame = (this.frame + 1) % 4;
            this.frameCount = 0;
        }

        // Check missile hits and collisions
        this.missiles.forEach((missile, index) => {
            if (enemy && enemy.checkCollision(missile)) {
                this.missiles.splice(index, 1);
                score += 100;
                enemy = new Enemy();
            }
        });

        if (enemy && enemy.checkPlayerCollision(this)) {
            gameOver = true;
            this.showGameOver();
        }
    }

    showGameOver() {
        ctx.save();
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Game Over text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 70);
        
        // Score and time text
        ctx.font = '24px Arial';
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(`Survival Time: ${formatTime(survivalTime)}`, canvas.width / 2, canvas.height / 2 + 20);
        
        // Instructions
        ctx.font = '20px Arial';
        ctx.fillText('Press SPACE to play again', canvas.width / 2, canvas.height / 2 + 70);
        ctx.restore();

        // Add event listener for restart
        document.addEventListener('keydown', this.handleRestart);
    }

    handleRestart = (e) => {
        if (e.key === ' ' && gameOver) {
            document.removeEventListener('keydown', this.handleRestart);
            resetGame();
        }
    }

    draw() {
        // Draw player name, score and time
        ctx.save();
        ctx.fillStyle = '#2c3e50';
        ctx.font = '20px Arial';
        
        // Draw name and score on left
        ctx.textAlign = 'left';
        ctx.fillText(`${playerName} - Score: ${score}`, 20, 30);
        
        // Draw survival time on right
        ctx.textAlign = 'right';
        ctx.fillText(`Time: ${formatTime(survivalTime)}`, canvas.width - 20, 30);
        ctx.restore();

        // Draw missiles
        this.missiles.forEach(missile => missile.draw());

        ctx.save();
        
        // Flip context if facing left
        if (this.direction === -1) {
            ctx.scale(-1, 1);
            ctx.translate(-this.x * 2 - this.width, 0);
        }

        if (this.isSkater) {
            // Draw skater
            ctx.fillStyle = '#3498db';
            ctx.fillRect(this.x, this.y - 30, 20, 30);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(this.x - 10, this.y, 40, 8);
            ctx.fillStyle = '#34495e';
            ctx.beginPath();
            ctx.arc(this.x - 5, this.y + 8, 5, 0, Math.PI * 2);
            ctx.arc(this.x + 25, this.y + 8, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.isJet) {
            // Draw jet
            ctx.fillStyle = '#3498db';
            // Main body
            ctx.fillRect(this.x - 20, this.y - 15, 70, 30);
            // Nose cone
            ctx.beginPath();
            ctx.moveTo(this.x + 50, this.y);
            ctx.lineTo(this.x + 70, this.y);
            ctx.lineTo(this.x + 50, this.y - 15);
            ctx.fill();
            // Wings
            ctx.fillStyle = '#2980b9';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - 30, this.y + 20);
            ctx.lineTo(this.x + 20, this.y);
            ctx.fill();
            // Tail
            ctx.fillRect(this.x - 20, this.y - 25, 10, 20);
            // Engine
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(this.x - 25, this.y + 5, 15, 10);
        } else {
            // Draw tank
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(this.x - 20, this.y - 20, 80, 40);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(this.x, this.y - 35, 40, 20);
            ctx.fillRect(this.x + 35, this.y - 30, 30, 10);
            ctx.fillStyle = '#34495e';
            ctx.fillRect(this.x - 20, this.y + 20, 80, 10);
            
            for (let i = 0; i < 8; i++) {
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(this.x - 20 + (i * 10), this.y + 22, 8, 6);
            }
        }

        ctx.restore();
    }
}

// Start the game immediately
resetGame();

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update survival time if game is active
    if (!gameOver) {
        survivalTime = Date.now() - startTime;
    }

    // Draw environment
    drawEnvironment();

    // Update and draw enemy
    if (enemy && !gameOver) {
        enemy.update(player.x, player.y);
        enemy.draw();
    }

    // Update and draw player
    player.update();
    player.draw();

    // Continue game loop
    requestAnimationFrame(gameLoop);
}