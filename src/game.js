import { GAME_CONFIG, ACHIEVEMENTS, ITEM_TYPE } from "./config.js";
import { InputController } from "./input.js";
import { BackgroundSystem } from "./background.js";
import { ObjectPool } from "./objectPool.js";
import { Platform, Aura, Enemy, Sword, Player, Obstacle, PLAYER_BUFF } from "./entities.js";
import { ParticleSystem } from "./particles.js";

export const GAME_STATE = {
  INIT: "INIT",
  TITLE: "TITLE",
  COUNTDOWN: "COUNTDOWN",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  REVIVING: "REVIVING",
  DEAD: "DEAD"
};

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.config = GAME_CONFIG;
    this.scale = 1;

    this.background = new BackgroundSystem(
      GAME_CONFIG.canvas.baseWidth,
      GAME_CONFIG.canvas.baseHeight
    );
    this.particles = new ParticleSystem();
    this.player = new Player();

    this.platformPool = new ObjectPool(() => new Platform(), GAME_CONFIG.pools.platforms);
    this.auraPool = new ObjectPool(() => new Aura(), GAME_CONFIG.pools.auras);
    this.enemyPool = new ObjectPool(() => new Enemy(), GAME_CONFIG.pools.enemies);
    this.obstaclePool = new ObjectPool(() => new Obstacle(), GAME_CONFIG.pools.obstacles);
    this.swordPool = new ObjectPool(() => new Sword(), 16);

    this.platforms = [];
    this.auras = [];
    this.enemies = [];
    this.obstacles = [];
    this.swords = [];

    this.input = new InputController(canvas);
    this.input.on("jump", () => this.handleJump());
    
    this.input.on("slide", () => this.handleSlide());
    this.input.on("shoot", () => this.handleManualShoot());

    this.state = GAME_STATE.INIT;
    this.countdownTimer = 0;
    this.reviveTimer = 0;
    this.baseSpeed = GAME_CONFIG.speed.initial;
    this.currentSpeed = this.baseSpeed;
    this.distance = 0;
    this.score = 0;
    this.elapsed = 0;
    this.lastTime = 0;
    this.gameOver = false;

    // REPLACED buffSword with buffGiant
    this.buffGiant = {
      active: false,
      timer: 0,
    };
    this.buffShield = {
      active: false,
      hitsLeft: 0,
    };

    this.stats = {
      distance: 0,
      enemiesDefeated: 0,
      doubleJumps: 0,
      noPitfalls: true,
      swordsCollected: 0,
    };

    this.slideGhosts = [];

    this.achievementsState = this.loadAchievements();

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.initLevel();
    
    // Title Scene Setup
    this.titleTimer = 0;
    this.ambientParticles = [];
    for(let i=0; i<20; i++) {
        this.ambientParticles.push({
            x: Math.random() * GAME_CONFIG.canvas.baseWidth,
            y: Math.random() * GAME_CONFIG.canvas.baseHeight,
            vy: -Math.random() * 20 - 10,
            size: Math.random() * 2 + 1,
            alpha: Math.random() * 0.5
        });
    }
    this.loop = this.loop.bind(this);
    this.isLoopRunning = false;

    // Debug State Logging
    setInterval(() => {
      console.log({ 
        gameState: this.state, 
        playerBuffState: this.player.buffState, 
        spiritCount: Math.floor(this.score / GAME_CONFIG.collectibles.scorePerAura),
        hp: this.player.hp, 
        scale: this.player.scale 
      });
    }, 1000);
  }

  resize() {
    const baseWidth = GAME_CONFIG.canvas.baseWidth;
    const baseHeight = GAME_CONFIG.canvas.baseHeight;
    const ratio = baseWidth / baseHeight;
    
    // Get parent container dimensions instead of window
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const w = container.clientWidth;
    const h = container.clientHeight;
    
    const screenRatio = w / h;
    
    if (screenRatio > ratio) {
         this.canvas.style.width = `${h * ratio}px`;
         this.canvas.style.height = `${h}px`;
    } else {
         this.canvas.style.width = `${w}px`;
         this.canvas.style.height = `${w / ratio}px`;
    }
    
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '50%';
    this.canvas.style.top = '50%';
    this.canvas.style.transform = 'translate(-50%, -50%)';
    
    this.canvas.width = baseWidth;
    this.canvas.height = baseHeight;

    this.scale = parseFloat(this.canvas.style.width) / baseWidth;
  }

  initLevel() {
    this.platforms.length = 0;
    this.auras.length = 0;
    this.enemies.length = 0;
    this.obstacles.length = 0;
    this.swords.length = 0;

    this.lastPlatformY = GAME_CONFIG.canvas.baseHeight * 0.8;
    this.lastPlatformRight = 0;

    let cursorX = 0;
    let length = 800;
    let p = this.platformPool.acquire();
    p.x = cursorX;
    p.y = this.lastPlatformY;
    p.width = length;
    p.height = 24;
    p.active = true;
    p.type = "normal";
    p.touched = false;
    p.timer = 0;
    this.platforms.push(p);
    cursorX += length + 100; // Gap
    this.lastPlatformRight = p.x + p.width;

    for (let i = 0; i < 5; i++) {
        length = 300 + Math.random() * 100;
        
        const yOffset = (Math.random() * 100) - 50;
        let nextY = this.lastPlatformY + yOffset;
        const minY = GAME_CONFIG.canvas.baseHeight * 0.4;
        const maxY = GAME_CONFIG.canvas.baseHeight * 0.8;
        if (nextY < minY) nextY = minY + 10;
        if (nextY > maxY) nextY = maxY - 10;
        
        p = this.platformPool.acquire();
        p.x = cursorX;
        p.y = nextY;
        p.width = length;
        p.height = 24;
        p.active = true;
        p.type = "normal";
        p.touched = false;
        p.timer = 0;
        this.platforms.push(p);
        
        this.lastPlatformY = nextY;
        cursorX += length + 200;
        this.lastPlatformRight = p.x + p.width;
    }
    
    const playerX = GAME_CONFIG.canvas.baseWidth * GAME_CONFIG.player.xRatio;
    this.player.reset(playerX, GAME_CONFIG.canvas.baseHeight * 0.8);
  }

  start() {
    this.state = GAME_STATE.PLAYING;
    this.gameOver = false;
    this.distance = 0;
    this.score = 0;
    this.elapsed = 0;
    this.currentSpeed = this.baseSpeed;
    this.buffGiant.active = false; // Reset Giant
    this.buffGiant.timer = 0;
    this.buffShield.active = false;
    this.buffShield.hitsLeft = 0;
    this.stats = {
      distance: 0,
      enemiesDefeated: 0,
      doubleJumps: 0,
      noPitfalls: true,
      swordsCollected: 0,
    };
    this.initLevel();
    this.lastTime = performance.now();
    
    // Ensure loop is running
    if (!this.isLoopRunning) {
      this.isLoopRunning = true;
      requestAnimationFrame(this.loop);
    }
  }
  
  enterTitleMode() {
      this.state = GAME_STATE.TITLE;
      this.initLevel();
      this.player.x = GAME_CONFIG.canvas.baseWidth * 0.15;
      this.player.y = GAME_CONFIG.canvas.baseHeight * 0.7;
      this.player.state = "idle";
      this.lastTime = performance.now();
      
      if (!this.isLoopRunning) {
        this.isLoopRunning = true;
        requestAnimationFrame(this.loop);
      }
  }

  loop(timestamp) {
    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    
    // State Validity Check
    const VALID_STATES = Object.values(GAME_STATE);
    if (!VALID_STATES.includes(this.state)) {
      console.error('Invalid game state', this.state);
      this.state = GAME_STATE.DEAD;
    }

    // Input Processing
    // Poll input state every frame to handle triggers and conflicts
    this.input.update();

    this.update(delta);
    this.draw();
    
    requestAnimationFrame(this.loop);
  }

  update(delta) {
    switch (this.state) {
      case GAME_STATE.INIT:
        return;
      
      case GAME_STATE.TITLE:
        this.updateTitleScene(delta);
        return;

      case GAME_STATE.COUNTDOWN:
        this.updateCountdown(delta);
        return;

      case GAME_STATE.PLAYING:
        this.updatePlaying(delta);
        return;

      case GAME_STATE.REVIVING:
        this.updateRevive(delta);
        return;

      case GAME_STATE.PAUSED:
      case GAME_STATE.DEAD:
        return;
    }
  }

  updatePlaying(delta) {
    this.elapsed += delta;
    this.distance += this.currentSpeed * delta;
    this.updateDifficulty();

    // INSTANT items must give immediate visual feedback. 
    // Never delay, batch, or defer their effects.
    this.updateBuffs(delta); // Update buffs first

    this.background.update(
      delta,
      this.currentSpeed,
      1
    );
    this.updateWorld(delta);
    this.generateTerrain();
    this.updatePlayer(delta);
    this.checkCollisions(delta);
    this.particles.update(delta);
    this.updateAchievements();
    this.updateUI();
  }

  updateBuffs(delta) {
    if (this.player.buffState === PLAYER_BUFF.BIG) {
        this.player.buffTimer -= delta;
        if (this.player.buffTimer <= 0) {
            this.endBigBuff();
        }
    }

    if (this.player.buffState === PLAYER_BUFF.INVINCIBLE) {
        this.player.buffTimer -= delta; // Using same timer variable for simplicity
        if (this.player.buffTimer <= 0) {
            this.endInvincible();
        }
    }
  }

  endBigBuff() {
      this.player.buffState = PLAYER_BUFF.INVINCIBLE;
      this.player.buffTimer = 0.5; // 0.5s invincibility after big
      this.player.scale = 1.0;
      this.buffGiant.active = false; // Sync visual flag
  }

  endInvincible() {
      this.player.buffState = PLAYER_BUFF.NONE;
      this.player.visible = true; // Ensure visible
  }

  updateCountdown(delta) {
    this.countdownTimer -= delta;
    if (this.countdownTimer <= 0) {
        this.state = GAME_STATE.PLAYING;
        this.countdownTimer = 0;
    }
  }

  updateRevive(delta) {
    this.reviveTimer -= delta;
    // During REVIVING, we might want to update some background/particles
    this.background.update(delta, 0, 1);
    this.particles.update(delta);
    this.updatePlayer(delta); // Update player for animations/timers
    
    if (this.reviveTimer <= 0) {
        this.state = GAME_STATE.PLAYING;
        this.reviveTimer = 0;
    }
  }
  
  updateTitleScene(delta) {
      this.titleTimer += delta;
      this.background.update(delta, 50, 1);
      this.particles.update(delta);
      this.updateAmbientParticles(delta);
  }

  updateAmbientParticles(delta) {
    if (!this.ambientParticles) return;
    this.ambientParticles.forEach(p => {
        p.y += p.vy * delta; 
        if (p.y < 0) {
            p.y = this.canvas.height;
            p.x = Math.random() * this.canvas.width;
        }
    });
  }

  handleJump() {
    if (this.state !== GAME_STATE.PLAYING) return;
    if (this.player.state === "slide") return;

    if (this.player.jumpCount < this.player.maxJumps) {
      const cfg = GAME_CONFIG.player;
      const gravity = GAME_CONFIG.physics.gravity;
      
      if (this.player.jumpCount === 0) {
        this.player.vy = -Math.sqrt(2 * gravity * cfg.firstJumpHeight);
        this.player.state = "jump";
        this.particles.spawnCloudBurst(
          this.player.x + this.player.width * 0.5,
          this.player.y + this.player.height
        );
      } else {
        this.player.vy = -Math.sqrt(2 * gravity * cfg.secondJumpHeight);
        this.stats.doubleJumps += 1;
         
        // Visual feedback for double jump: Show Single Sword under feet
        // No particles, no physics, just a visual flag
        this.player.showJumpSword = true;
      }
       
      this.player.jumpCount += 1;
      this.player.onGround = false;
      this.player.rotation = (cfg.jumpRotationDeg * Math.PI) / 180;
    }
  }

  handleSlide() {
    if (this.state !== GAME_STATE.PLAYING) return;
    if (!this.player.onGround) return;
    if (this.player.state === "slide") return;
    if (this.player.slideCooldownTimer > 0) return;

    const cfg = GAME_CONFIG.player;
    this.player.state = "slide";
    this.player.slideTimer = cfg.slideDuration;
    this.player.slideCooldownTimer = cfg.slideCooldown;
    this.player.height = this.player.baseHeight * cfg.slideHeightScale;
    this.player.y = this.player.y + (this.player.baseHeight - this.player.height);

    this.slideGhosts.length = 0;
  }

  handleManualShoot() {
    if (this.state !== GAME_STATE.PLAYING) return;
  }

  applyBigBuff() {
    if (this.state !== GAME_STATE.PLAYING) return;
    if (this.player.buffState !== PLAYER_BUFF.NONE) return;

    // INSTANT item effect: Must apply immediately in the current frame
    // Never delay, batch, or defer this effect.
    this.player.buffState = PLAYER_BUFF.BIG;
    this.player.scale = GAME_CONFIG.items.giant.scale;
    this.player.buffTimer = GAME_CONFIG.items.giant.duration;
    this.buffGiant.active = true; // Keep visual flag for now, but logic moves to buffState
    
    console.log('PICKUP:', ITEM_TYPE.INSTANT, 'BIG', performance.now());
  }

  giveShieldBuff() {
    if (this.state !== GAME_STATE.PLAYING) return;
    
    // INSTANT item effect: Must apply immediately in the current frame
    // Never delay, batch, or defer this effect.
    this.player.buffState = PLAYER_BUFF.INVINCIBLE;
    
    // CORE CONFIGURATION GUARD:
    // This duration MUST come from config.js (shield.duration).
    // DO NOT hardcode values here. DO NOT modify without updating config.
    this.player.buffTimer = GAME_CONFIG.items.shield.duration;
    
    this.buffShield.active = true;
    this.buffShield.hitsLeft = GAME_CONFIG.buffs.shield.hitCapacity;
    this.player.shieldHits = this.buffShield.hitsLeft;
    
    this.triggerHurtEffect(false); // Visual blink
    
    console.log('PICKUP:', ITEM_TYPE.INSTANT, 'SHIELD', performance.now());
  }

  updateDifficulty() {
    const step = GAME_CONFIG.speed.difficultyStepMeters;
    const factor = Math.min(
      1 +
        Math.floor(this.distance / step) * GAME_CONFIG.speed.difficultyIncreasePercent,
      GAME_CONFIG.speed.maxMultiplier
    );
    this.currentSpeed = this.baseSpeed * factor;
  }

  updatePlayer(delta) {
    let gravity = GAME_CONFIG.physics.gravity;
    
    const isJumpHeld = this.input.isJumpHeld();
    
    if (!this.player.onGround && this.player.vy > 0 && isJumpHeld) {
        if (this.player.glideTimer < GAME_CONFIG.player.glideDuration) {
            this.player.isGliding = true;
            this.player.glideTimer += delta;
            gravity *= GAME_CONFIG.player.glideGravityScale;
            
            // Glide Visual: Show Sword (Xianxia style)
            this.player.showJumpSword = true;
        } else {
            this.player.isGliding = false;
        }
    } else {
        this.player.isGliding = false;
    }

    this.player.vy += gravity * delta;
    this.player.y += this.player.vy * delta;

    // Sword Visual Cleanup Rule:
    // Sword should be visible during:
    // 1. Double Jump Rising (handled by showJumpSword=true in handleJump, naturally persists until falling)
    // 2. Gliding (handled by showJumpSword=true in gliding logic above)
    // 
    // Cleanup Conditions:
    // - Falling (vy > 0) AND NOT gliding -> Hide
    // - Grounded -> Hide (handled below)
    
    if (this.player.vy > 0 && !this.player.isGliding) {
        this.player.showJumpSword = false;
    }

    const groundY = GAME_CONFIG.canvas.baseHeight * 0.8;
    let grounded = false;
    for (const p of this.platforms) {
      if (!p.active) continue;
      
      const prevBottom = this.player.y - this.player.vy * delta + this.player.height;
      const currBottom = this.player.y + this.player.height;
      
      const isFalling = this.player.vy >= 0;
      const horizontalOverlap = 
        this.player.collisionRect.right > p.left && 
        this.player.collisionRect.left < p.right;
        
      if (isFalling && horizontalOverlap) {
          if (prevBottom <= p.y + 10 && currBottom >= p.y - 10) {
              this.player.y = p.y - this.player.height;
              this.player.vy = 0;
              grounded = true;
          }
      }
    }

    this.player.onGround = grounded;
    if (grounded) {
      if (this.player.vy >= 0) { // Only reset if actually landing (moving down or stationary)
          this.player.jumpCount = 0;
      }
      this.player.rotation = 0;
      this.player.glideTimer = 0;
      this.player.isGliding = false;
      this.player.showJumpSword = false; // Force hide sword on ground
      if (this.player.state !== "slide") {
        this.player.state = "run";
        this.player.height = this.player.baseHeight;
      }
    }

    if (this.player.state === "slide") {
      this.player.slideTimer -= delta;
      this.slideGhosts.unshift({
        x: this.player.x,
        y: this.player.y,
        width: this.player.width,
        height: this.player.height,
        alpha: 0.6,
      });
      if (this.slideGhosts.length > 3) {
        this.slideGhosts.pop();
      }
      this.slideGhosts.forEach((g) => {
        g.alpha *= 0.75;
      });
      if (this.player.slideTimer <= 0) {
        this.player.state = "run";
        const oldHeight = this.player.height;
        this.player.height = this.player.baseHeight;
        this.player.y -= (this.player.height - oldHeight);
        this.slideGhosts.length = 0;
      }
    }

    if (this.player.slideCooldownTimer > 0) {
      this.player.slideCooldownTimer -= delta;
    }

    if (this.buffGiant.active) {
      this.buffGiant.timer -= delta;
      if (this.buffGiant.timer <= 0) {
        this.buffGiant.active = false;
      }
    }

    if (this.buffShield.active && this.buffShield.hitsLeft <= 0) {
      this.buffShield.active = false;
    }

    if (this.player.invincibleTimer > 0) {
      this.player.invincibleTimer -= delta;
    }

    if (this.player.reviveMessageTimer > 0) {
      this.player.reviveMessageTimer -= delta;
    }

    this.player.autoShootTimer += delta;
    if (this.player.autoShootTimer >= GAME_CONFIG.player.autoShootInterval && GAME_CONFIG.player.autoShootInterval > 0) {
      this.player.autoShootTimer = 0;
      this.spawnSword();
    }
  }

  updateWorld(delta) {
    const speed = this.currentSpeed * delta;
    
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      if (!p.active) {
        this.platformPool.release(p);
        this.platforms.splice(i, 1);
        continue;
      }
      p.x -= speed;

      if (p.type === "vanish") {
        if (p.touched) {
          p.timer += delta;
          if (p.timer > 0.4) {
             p.active = false;
          }
        }
      } else if (p.type === "moving_y") {
        p.timer += delta;
        p.y = p.startY + Math.sin(p.timer * 2) * 50;
      } else if (p.type === "moving_x") {
        p.timer += delta;
        p.x += Math.sin(p.timer * 2) * 100 * delta;
      } else if (p.type === "short_life") {
        p.timer += delta;
        if (p.timer > 2.5) p.active = false;
      }

      if (p.right < 0) {
        p.active = false;
        this.platformPool.release(p);
        this.platforms.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (!e.active) {
          this.enemyPool.release(e);
          this.enemies.splice(i, 1);
          continue;
        }
        e.x -= speed;

        if (e.type === "patrol") {
            e.timer += delta;
            e.x += Math.sin(e.timer * 2) * 100 * delta;
        } else if (e.type === "jump") {
            e.timer += delta;
            if (e.onGround && e.timer > 2) {
                e.vy = -600;
                e.onGround = false;
                e.timer = 0;
            }
            e.vy += GAME_CONFIG.physics.gravity * delta;
            e.y += e.vy * delta;
            if (e.y > e.startY) {
                e.y = e.startY;
                e.vy = 0;
                e.onGround = true;
            }
        } else if (e.type === "fly") {
            e.timer += delta;
            e.y = e.startY + Math.sin(e.timer * 3) * 30;
        }
        
        if (e.right < 0) {
          e.active = false;
          this.enemyPool.release(e);
          this.enemies.splice(i, 1);
        }
    }

    const lists = [
      { items: this.auras, pool: this.auraPool },
      { items: this.obstacles, pool: this.obstaclePool },
    ];
    for (const { items, pool } of lists) {
      for (let i = items.length - 1; i >= 0; i--) {
        const obj = items[i];
        if (!obj.active) {
          pool.release(obj);
          items.splice(i, 1);
          continue;
        }
        obj.x -= speed;
        if (obj.right < 0) {
          obj.active = false;
          pool.release(obj);
          items.splice(i, 1);
        }
      }
    }

    for (let i = this.swords.length - 1; i >= 0; i--) {
      const s = this.swords[i];
      if (!s.active) {
        this.swords.splice(i, 1);
        continue;
      }
      s.x += GAME_CONFIG.sword.speed * delta;
      s.distanceTraveled += GAME_CONFIG.sword.speed * delta;
      if (s.distanceTraveled >= GAME_CONFIG.sword.range) {
        s.active = false;
        this.swordPool.release(s);
        this.swords.splice(i, 1);
      }
    }
  }

  generateTerrain() {
    const worldRight = GAME_CONFIG.canvas.baseWidth * 1.5;
    let maxX = 0;
    let lastY = this.lastPlatformY || GAME_CONFIG.canvas.baseHeight * 0.8;
    
    for (const p of this.platforms) {
      if (p.active && p.right > maxX) {
          maxX = p.right;
          lastY = p.y;
      }
    }
    
    if (maxX === 0) maxX = 0;

    const distanceMeters = this.distance / 10;
    const difficultyLevel = Math.min(
        GAME_CONFIG.difficulty.maxLevel, 
        Math.floor(distanceMeters / GAME_CONFIG.difficulty.baseMeters)
    );
    
    const enemyChance = GAME_CONFIG.difficulty.enemySpawnRate + difficultyLevel * 0.05;
    const obstacleChance = GAME_CONFIG.difficulty.obstacleSpawnRate + difficultyLevel * 0.05;
    const dynamicPlatformChance = GAME_CONFIG.difficulty.dynamicPlatformRate + difficultyLevel * 0.05;

    while (maxX < worldRight) {
      const distanceFactor = 1 + this.distance / 1000;
      
      const airTime = 0.9; 
      const maxSafeGap = this.currentSpeed * airTime * 0.9; 
      
      const riskFactor = 0.7 + Math.random() * 0.25; 
      const targetGap = maxSafeGap * riskFactor;
      
      let gap = Math.max(GAME_CONFIG.terrain.platformGapMin, targetGap);
      gap = Math.min(gap, maxSafeGap);

      const emptySpace = gap; 
      maxX += emptySpace;
      
      const minY = GAME_CONFIG.canvas.baseHeight * 0.3;
      const maxY = GAME_CONFIG.canvas.baseHeight * 0.85;
      
      let yOffset = (Math.random() * 200) - 80; 
      let nextY = lastY + yOffset;
      
      if (nextY < minY) nextY = minY + Math.random() * 50;
      if (nextY > maxY) nextY = maxY - Math.random() * 50;
      
      const p = this.platformPool.acquire();
      p.x = maxX;
      p.y = nextY;
      lastY = nextY; 
      
      const length =
        GAME_CONFIG.terrain.platformLengthMin +
        Math.random() *
          (GAME_CONFIG.terrain.platformLengthMax - GAME_CONFIG.terrain.platformLengthMin);
      
      p.width = length;
      p.height = 24;
      p.active = true;
      p.type = "normal"; 
      p.startX = p.x;
      p.startY = p.y;
      p.timer = 0;
      p.touched = false;

      if (Math.random() < dynamicPlatformChance) {
          const r = Math.random();
          if (r < 0.4) {
              p.type = "vanish";
          } else if (r < 0.7) {
              p.type = "moving_y";
          } else {
              p.type = "moving_x";
          }
      }

      this.platforms.push(p);
      this.lastPlatformY = lastY; 

      const auraCount = Math.floor(length / GAME_CONFIG.collectibles.auraSpacingMax);
      
      for (let i = 0; i < auraCount; i++) {
        const a = this.auraPool.acquire();
        a.active = true;
        a.radius = 10;
        a.width = a.radius * 2;
        a.height = a.radius * 2;
        
        const xOffset = 50 + i * (length / auraCount);
        a.x = p.x + xOffset;
        
        const isJump = Math.random() < 0.5;
        const heightAbove = isJump ? 100 : 40; 
        
        a.y = p.y - heightAbove;
        a.type = "aura";
        a.collecting = false;
        a.collectTime = 0;
        
        const r = Math.random();
        
        // Rule-based spawn for Shield (State Compensation)
        // If HP is low (<=1) and no shield, force spawn shield with high probability
        // Otherwise use standard chance
        let spawnShield = false;
        if (this.player.hp <= 1 && !this.buffShield.active && Math.random() < 0.3) {
            spawnShield = true;
        } else if (r < GAME_CONFIG.buffsSpawn.healChance + GAME_CONFIG.buffsSpawn.giantChance + GAME_CONFIG.buffsSpawn.shieldChance) {
             // Standard spawn chance check (must fall within the shield window)
             const shieldThreshold = GAME_CONFIG.buffsSpawn.healChance + GAME_CONFIG.buffsSpawn.giantChance;
             if (r >= shieldThreshold) {
                 spawnShield = true;
             }
        }

        if (r < GAME_CONFIG.buffsSpawn.healChance) {
             a.type = "heal";
        } else if (r < GAME_CONFIG.buffsSpawn.healChance + GAME_CONFIG.buffsSpawn.giantChance) {
             a.type = "giant";
        } else if (spawnShield) {
             a.type = "shield";
        } else if (r < GAME_CONFIG.buffsSpawn.healChance + GAME_CONFIG.buffsSpawn.giantChance + GAME_CONFIG.buffsSpawn.shieldChance + GAME_CONFIG.buffsSpawn.reviveChance) {
             a.type = "revive";
        }
        
        this.auras.push(a);
      }

      let obstacleProb = 0.4;
      if (p.type === "moving_x" || p.type === "moving_y") obstacleProb = 0.6;
      if (p.type === "vanish") obstacleProb = 0.8;
      
      this.platformsSinceObstacle = (this.platformsSinceObstacle || 0) + 1;
      if (this.platformsSinceObstacle >= 3) {
          obstacleProb = 1.0;
      }

      if (Math.random() < obstacleProb) {
          const o = this.obstaclePool.acquire();
          o.active = true;
          o.width = GAME_CONFIG.obstacle.width; 
          
          o.x = p.x + (p.width - o.width) / 2;
          
          if (Math.random() < GAME_CONFIG.obstacle.slideChance) {
              o.type = "low_bar";
              o.height = 20; 
              o.y = p.y - GAME_CONFIG.obstacle.yOffsetLow; 
          } else {
              o.type = "high_bar";
              o.height = GAME_CONFIG.obstacle.heightJump; 
              o.y = p.y - o.height; 
          }
          
          this.obstacles.push(o);
          this.platformsSinceObstacle = 0;
      }
      
      if (this.platformsSinceObstacle > 0) { 
           if (Math.random() < enemyChance) {
                const spawnX = p.x + length * 0.5;
                const groupType = Math.random();
                let baseType = "patrol";
                let baseYOffset = 0;
                if (groupType < 0.4) baseType = "patrol";
                else if (groupType < 0.7) baseType = "jump";
                else { baseType = "fly"; baseYOffset = -110; }

                for (let k = 0; k < 3; k++) {
                    const e = this.enemyPool.acquire();
                    e.active = true;
                    e.width = 50;
                    e.height = 60;
                    e.x = spawnX + (k * 80) + (Math.random() * 20 - 10);
                    e.y = p.y - e.height + baseYOffset;
                    if (baseType === "fly") e.y += (k % 2 === 0 ? 0 : 40);
                    e.startY = e.y;
                    e.startX = e.x;
                    e.timer = Math.random() * 10;
                    e.type = baseType;
                    this.enemies.push(e);
                }
           }
      }

      maxX += length;
    }
  }

  collectSpirit(amount = 1) {
    // Spirit collection must: Only increase a number
    // Never trigger logic chains, never affect physics or difficulty
    const rawSpirit = Math.floor(this.score / GAME_CONFIG.collectibles.scorePerAura);
    const newSpirit = Math.min(rawSpirit + amount, GAME_CONFIG.collectibles.maxSpirit);
    this.score = newSpirit * GAME_CONFIG.collectibles.scorePerAura;
  }

  checkCollisions(delta) {
    if (this.state !== GAME_STATE.PLAYING) return;
    const playerRect = this.player.collisionRect;

    for (let i = this.auras.length - 1; i >= 0; i--) {
      const a = this.auras[i];
      if (!a.active) continue;
      if (
        playerRect.right > a.left &&
        playerRect.left < a.right &&
        playerRect.bottom > a.top &&
        playerRect.top < a.bottom
      ) {
        a.collecting = true;
        a.collectTime = 0;
        if (a.type === "aura") {
          this.collectSpirit(1);
        } else if (a.type === "giant") {
          this.applyBigBuff();
        } else if (a.type === "shield") {
          this.giveShieldBuff();
        } else if (a.type === "heal") {
          if (this.player.hp < this.player.maxHp) {
              this.player.hp += GAME_CONFIG.items.heal.amount;
          }
        } else if (a.type === "revive") {
          // Only pickup if not already used and don't already have one
          if (!this.player.reviveUsed && !this.player.hasRevive) {
              this.player.hasRevive = true;
          }
        }
      }
    }

    for (let i = this.auras.length - 1; i >= 0; i--) {
      const a = this.auras[i];
      if (!a.collecting) continue;
      a.collectTime += delta;
      const t = a.collectTime / 0.3;
      if (t >= 1) {
        a.active = false;
        this.auraPool.release(a);
        this.auras.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.active) continue;
      for (let j = this.swords.length - 1; j >= 0; j--) {
        const s = this.swords[j];
        if (!s.active) continue;
        if (s.intersects(e)) {
          e.active = false;
          this.enemyPool.release(e);
          this.enemies.splice(i, 1);
          s.active = false;
          this.swordPool.release(s);
          this.swords.splice(j, 1);
          this.stats.enemiesDefeated += 1;
          this.particles.spawnExplosion(
            e.x + e.width / 2,
            e.y + e.height / 2,
            "rgba(191,219,254,",
            "rgba(252,211,77,"
          );
          break;
        }
      }
    }

    if (this.player.buffState === PLAYER_BUFF.INVINCIBLE || 
        this.player.buffState === PLAYER_BUFF.BIG ||
        this.player.invincibleTimer > 0) {
      // Ignore damage logic, but check for falling
    } else {
        let hit = false;
        for (const e of this.enemies) {
            if (!e.active) continue;
            if (this.checkRectCollision(playerRect, e)) {
                this.applyDamage();
                hit = true;
                break; 
            }
        }

        if (!hit) {
            for (const o of this.obstacles) {
            if (!o.active) continue;
            if (this.checkRectCollision(playerRect, o)) {
                this.applyDamage();
                break;
            }
            }
        }
    }

    const deathY = GAME_CONFIG.canvas.baseHeight + 50; 
    
    if (this.player.y > deathY) {
       this.onPlayerDeath("pitfall");
       return; 
    }
  }
  
  onPlayerDeath(reason) {
      if (this.state !== GAME_STATE.PLAYING) return;

      // Check for Revive
      if (this.player.hasRevive && !this.player.reviveUsed) {
          this.enterRevive();
          return;
      }
      
      this.state = GAME_STATE.DEAD;
      this.gameOver = true;
      this.player.hp = 0;
      
      if (reason === "pitfall") {
          this.stats.noPitfalls = false;
      }
      
      this.updateUI();
      this.showResultModal();
  }

  enterRevive() {
      this.state = GAME_STATE.REVIVING;
      this.reviveTimer = 1.0; // Atomic timer for REVIVING state
      this.player.reviveUsed = true;
      this.player.hasRevive = false;
      this.player.hp = 3;
      this.player.jumpCount = 0; // Reset jump count on revive
      this.player.invincibleTimer = GAME_CONFIG.items.revive.invincibleDuration;
      this.player.reviveMessageTimer = 1.5; // Show "Revive" for 1.5s
      
      // Reset position slightly to avoid immediate re-death (especially for pitfalls)
      this.player.y = GAME_CONFIG.canvas.baseHeight * 0.5;
      this.player.vy = -400; // Small hop up
      this.player.onGround = false;
      
      // Spawn some special particles
      this.particles.spawnExplosion(
          this.player.x + this.player.width / 2,
          this.player.y + this.player.height / 2,
          "rgba(244,114,182,", // Pink
          "rgba(255,255,255,"  // White
      );

      this.updateUI();
  }

  checkRectCollision(r1, r2) {
    return (
      r1.right > r2.left &&
      r1.left < r2.right &&
      r1.bottom > r2.top &&
      r1.top < r2.bottom
    );
  }

  applyDamage() {
    if (this.state !== GAME_STATE.PLAYING) return;
    if (this.player.buffState === PLAYER_BUFF.INVINCIBLE || 
        this.player.buffState === PLAYER_BUFF.BIG || 
        this.player.invincibleTimer > 0) return;

    if (this.buffShield.active && this.buffShield.hitsLeft > 0) {
      this.buffShield.hitsLeft -= 1;
      this.triggerHurtEffect(true); 
    } else {
      this.player.hp -= 1;
      
      this.enterHurtInvincible();

      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.onPlayerDeath("combat");
      }
    }
    this.updateUI();
  }

  enterHurtInvincible() {
      this.player.buffState = PLAYER_BUFF.INVINCIBLE;
      this.player.buffTimer = 0.5;
      this.triggerHurtEffect(false); 
  }

  triggerHurtEffect(isShield) {
    this.player.invincibleTimer = GAME_CONFIG.player.invincibleDuration;
    
    const colorStart = isShield ? "rgba(251,191,36," : "rgba(239,68,68,";
    const colorEnd = isShield ? "rgba(248,250,252," : "rgba(185,28,28,";

    this.particles.spawnExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      colorStart,
      colorEnd
    );
  }

  updateAchievements() {
    this.stats.distance = this.distance / 10;

    const list = [];
    for (const key in ACHIEVEMENTS) {
      const ach = ACHIEVEMENTS[key];
      const unlocked = this.achievementsState[ach.key];
      if (!unlocked && ach.condition(this.stats)) {
        this.achievementsState[ach.key] = true;
        list.push(ach);
        this.showAchievementToast(ach.name);
      }
    }
    if (list.length > 0) {
      this.saveAchievements();
    }

    const ul = document.getElementById("achievement-list");
    if (ul) {
      const items = ul.querySelectorAll("li");
      items.forEach((li) => {
        const k = li.getAttribute("data-key");
        if (this.achievementsState[k]) {
          li.textContent = li.textContent.replace("◻", "✔");
        }
      });
    }
  }

  showAchievementToast(text) {
    const toast = document.getElementById("achievement-toast");
    const span = document.getElementById("achievement-text");
    if (!toast || !span) return;
    span.textContent = text;
    toast.classList.remove("invisible");
    toast.classList.add("opacity-100");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.add("opacity-0");
      setTimeout(() => {
        toast.classList.add("invisible");
      }, 500);
    }, 1600);
  }

  loadAchievements() {
    try {
      const raw = localStorage.getItem("xiantu_achievements");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  saveAchievements() {
    try {
      localStorage.setItem("xiantu_achievements", JSON.stringify(this.achievementsState));
    } catch (e) {}
  }

  update(delta) {
    switch (this.state) {
      case GAME_STATE.INIT:
        return;
      
      case GAME_STATE.TITLE:
        this.updateTitleScene(delta);
        return;

      case GAME_STATE.COUNTDOWN:
        this.updateCountdown(delta);
        return;

      case GAME_STATE.PLAYING:
        this.updatePlaying(delta);
        return;

      case GAME_STATE.REVIVING:
        this.updateRevive(delta);
        return;

      case GAME_STATE.PAUSED:
      case GAME_STATE.DEAD:
        return;
    }
  }

  updatePlaying(delta) {
    this.elapsed += delta;
    this.distance += this.currentSpeed * delta;
    this.updateDifficulty();

    this.background.update(
      delta,
      this.currentSpeed,
      1
    );
    this.updateWorld(delta);
    this.generateTerrain();
    this.updatePlayer(delta);
    this.checkCollisions(delta);
    this.particles.update(delta);
    this.updateAchievements();
    this.updateUI();
  }

  drawPlayer(ctx) {
    if (!this.player.visible) return;
    
    ctx.save();
    
    // Flashing effect during invincibility
    if (this.player.invincibleTimer > 0) {
        const flashSpeed = 0.1;
        if (Math.floor(this.player.invincibleTimer / flashSpeed) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }
    }

    ctx.translate(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );
    ctx.rotate(this.player.rotation);
    
    let drawScale = 1.3;
    if (this.buffGiant.active) {
        drawScale *= GAME_CONFIG.items.giant.scale; 
    }
    ctx.scale(drawScale, drawScale);

    const time = performance.now() / 1000;
    const auraAlpha = 0.2 + Math.sin(time * 3) * 0.1; 
    
    // Optimized: Use Gradient instead of ShadowBlur for performance
    const auraGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, 35);
    auraGrad.addColorStop(0, `rgba(34, 211, 238, ${auraAlpha})`);
    auraGrad.addColorStop(1, "rgba(34, 211, 238, 0)");
    
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    
    if (this.buffGiant.active) {
        // Optimized: Gradient for Giant Aura
        const giantGrad = ctx.createRadialGradient(0, 0, 30, 0, 0, 60);
        giantGrad.addColorStop(0, "rgba(252, 211, 77, 0.3)");
        giantGrad.addColorStop(1, "rgba(252, 211, 77, 0)");
        
        ctx.fillStyle = giantGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI*2);
        ctx.fill();
    }

    if (this.player.showJumpSword) {
        ctx.save();
        // Position: Centered under player's feet
        const swordX = 0; // Relative to player center (already translated)
        const swordY = this.player.height / 2 + 20; // Slightly below feet
        
        ctx.translate(swordX, swordY);
        
        // Draw Single Sword (Horizontal)
        // Style: Xianxia Cyan Energy Sword
        
        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(34, 211, 238, 0.8)";
        
        // Blade Body (Horizontal)
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.moveTo(-40, 0);  // Tip (Left)
        ctx.lineTo(30, -6);  // Upper Guard
        ctx.lineTo(30, 6);   // Lower Guard
        ctx.closePath();
        ctx.fill();
        
        // Blade Core (Cyan)
        ctx.fillStyle = "rgba(34, 211, 238, 0.8)";
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(25, -3);
        ctx.lineTo(25, 3);
        ctx.closePath();
        ctx.fill();
        
        // Hilt
        ctx.fillStyle = "#0e7490";
        ctx.fillRect(30, -3, 15, 6);
        
        ctx.restore();
    }

    ctx.fillStyle = "#164e63"; 
    ctx.beginPath();
    
    ctx.moveTo(-10, -35);
    ctx.lineTo(10, -35);
    
    ctx.quadraticCurveTo(15, -10, 20, 40); 
    ctx.lineTo(-25, 45); 
    ctx.quadraticCurveTo(-15, 0, -10, -35);
    ctx.fill();
    
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.lineTo(8, 10);
    ctx.lineTo(10, 42);
    ctx.lineTo(-10, 42);
    ctx.fill();

    ctx.fillStyle = "#f59e0b"; 
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(11, 0);
    ctx.lineTo(12, 6);
    ctx.lineTo(-12, 6);
    ctx.fill();
    
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 3);
    ctx.quadraticCurveTo(-30, 10, -35, 25);
    ctx.stroke();

    ctx.fillStyle = "#020617"; 
    ctx.beginPath();
    ctx.arc(0, -42, 10, 0, Math.PI * 2); 
    ctx.fill();

    ctx.fillStyle = "#fcd34d"; 
    ctx.beginPath();
    ctx.moveTo(4, -48); 
    ctx.lineTo(10, -42); 
    ctx.lineTo(8, -36); 
    ctx.lineTo(2, -34); 
    ctx.lineTo(2, -48); 
    ctx.fill();

    ctx.fillStyle = "#020617"; 
    ctx.beginPath();
    ctx.arc(-8, -42, 5, 0, Math.PI * 2); 
    ctx.fill();
    
    ctx.fillStyle = "#e0f2fe"; 
    ctx.fillRect(0, -48, 8, 3); 
    ctx.fillRect(-8, -48, 8, 3); 
    
    const ribbonWave = Math.sin(time * 5) * 2;
    
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -42);
    ctx.quadraticCurveTo(-25, -40 + ribbonWave, -40, -35 + ribbonWave);
    ctx.stroke();

    ctx.fillStyle = "#155e75"; 
    ctx.beginPath();
    ctx.moveTo(8, -25); 
    ctx.lineTo(15, 5); 
    ctx.lineTo(5, -5); 
    ctx.fill();
    
    ctx.fillStyle = "#0e7490"; 
    ctx.beginPath();
    ctx.moveTo(-8, -25);
    ctx.lineTo(-15, 5);
    ctx.lineTo(-5, -5);
    ctx.fill();

    ctx.restore();

    if (this.slideGhosts.length > 0) {
      this.slideGhosts.forEach((g, index) => {
        ctx.save();
        ctx.globalAlpha = g.alpha * 0.4;
        ctx.translate(g.x + g.width/2, g.y + g.height/2);
        ctx.fillStyle = "#0891b2"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 35, 0.2, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      });
    }

    if (this.buffShield.active && this.buffShield.hitsLeft > 0) {
      ctx.strokeStyle = "rgba(251,191,36,0.8)";
      ctx.lineWidth = 2;
      const r = this.player.width * 0.9;
      
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const sx = this.player.x + this.player.width/2 + Math.cos(angle) * r;
          const sy = this.player.y + this.player.height/2 + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.stroke();
      
      ctx.fillStyle = "rgba(251,191,36,0.05)";
      ctx.fill();
    }
  }

  drawPlatforms(ctx) {
    this.platforms.forEach((p) => {
      if (!p.active) return;
      
      let rockColor, topColor;
      
      if (p.type === "vanish") {
          rockColor = "#475569"; 
          topColor = `rgba(148, 163, 184, ${0.3 + Math.random() * 0.2})`; 
      } else if (p.type === "moving_y" || p.type === "moving_x") {
          rockColor = "#334155"; 
          topColor = "#3b82f6"; 
      } else {
          rockColor = "#1e293b"; 
          topColor = "#334155"; 
      }
      
      const slabHeight = p.height + 15; 
      
      ctx.fillStyle = rockColor;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, slabHeight, 4);
      ctx.fill();
      
      ctx.fillStyle = topColor;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, 8, {topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0});
      ctx.fill();
      
      // Removed per-frame random noise for performance
      
      if (p.type === "moving_y" || p.type === "moving_x") {
         // Optimized: Solid trail instead of gradient
         ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
         ctx.fillRect(p.x, p.y, p.width, 40);
      }
    });
  }

  drawAuras(ctx) {
    this.auras.forEach((a) => {
      if (!a.active) return;
      const radius = a.radius * (a.collecting ? 1 - a.collectTime / 0.3 : 1);
      const alpha = a.collecting ? 1 - a.collectTime / 0.3 : 1;
      
      const cx = a.x + a.radius;
      const cy = a.y + a.radius;
      
      // Optimized: No Gradients
      let colorBase = "34, 211, 238"; // Cyan default
      if (a.type === "giant") colorBase = "251, 191, 36"; // Amber
      else if (a.type === "heal") colorBase = "74, 222, 128"; // Green
      else if (a.type === "revive") colorBase = "244, 114, 182"; // Pink
      
      // Outer Glow (Simple Circle)
      ctx.fillStyle = `rgba(${colorBase}, ${0.2 * alpha})`;
      ctx.beginPath();
      if (a.type === "giant") {
          ctx.rect(cx - radius*1.2, cy - radius*1.2, radius*2.4, radius*2.4);
      } else {
          ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
      }
      ctx.fill();
      
      // Inner Core
      ctx.fillStyle = `rgba(${colorBase}, ${alpha})`;
      ctx.beginPath();
      if (a.type === "heal") {
          ctx.ellipse(cx, cy, radius * 0.8, radius, 0, 0, Math.PI*2);
      } else if (a.type === "giant") {
          ctx.rect(cx - radius*0.8, cy - radius*0.8, radius*1.6, radius*1.6);
      } else {
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      }
      ctx.fill();
      
      ctx.fillStyle = `rgba(255,255,255,${0.9 * alpha})`;
      ctx.font = "12px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let char = "气";
      if (a.type === "giant") char = "体";
      if (a.type === "shield") char = "盾";
      if (a.type === "heal") char = "丹";
      if (a.type === "revive") char = "命";
      ctx.fillText(char, cx, cy);
    });
  }

  drawEnemies(ctx) {
    this.enemies.forEach((e) => {
      if (!e.active) return;
      
      if (e.type === "fly") {
         ctx.fillStyle = "#4c1d95"; 
         ctx.beginPath();
         ctx.ellipse(e.x + e.width/2, e.y + e.height/2, e.width, e.height/3, 0, 0, Math.PI*2);
         ctx.fill();
      } else if (e.type === "jump") {
         ctx.fillStyle = "#15803d"; 
      } else {
         ctx.fillStyle = "#1e293b"; 
      }

      ctx.beginPath();
      ctx.roundRect(e.x, e.y, e.width, e.height, 14);
      ctx.fill();
      
      ctx.strokeStyle = "rgba(96,165,250,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + e.height / 3, 10, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  drawObstacles(ctx) {
    this.obstacles.forEach((o) => {
      if (!o.active) return;
      
      if (o.type === "high_bar") {
        ctx.fillStyle = "#b91c1c"; 
        ctx.fillRect(o.x + o.width/2 - 5, o.y, 10, o.height);
        ctx.fillRect(o.x, o.y, o.width, 10);
      } else {
        ctx.fillStyle = "#7f1d1d"; 
        ctx.beginPath();
        ctx.roundRect(o.x, o.y, o.width, o.height, 4);
        ctx.fill();
        
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y + o.height / 2);
        ctx.lineTo(o.x + o.width, o.y + o.height / 2);
        ctx.stroke();
      }
    });
  }

  drawSwords(ctx) {
    if (this.swords.length === 0) return;
    
    // Optimized: Use single solid color for all swords
    ctx.fillStyle = "#38bdf8"; 
    
    this.swords.forEach((s) => {
      if (!s.active) return;
      ctx.beginPath();
      ctx.roundRect(s.x, s.y, s.width, s.height, 4);
      ctx.fill();
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.background.draw(ctx, 1);

    if (this.state === GAME_STATE.TITLE) {
        this.drawTitleCliff(ctx);
    } else {
        this.drawPlatforms(ctx);
        this.drawAuras(ctx);
        this.drawEnemies(ctx);
        this.drawObstacles(ctx);
        this.drawSwords(ctx);
    }
    
    this.drawAmbientParticles(ctx);
    this.drawPlayer(ctx);
    this.particles.draw(ctx);

    if (this.state === GAME_STATE.COUNTDOWN) {
        this.drawCountdownOverlay(ctx);
    }

    if (this.player.reviveMessageTimer > 0) {
        this.drawReviveMessage(ctx);
    }
  }

  drawReviveMessage(ctx) {
    ctx.save();
    ctx.fillStyle = "#f472b6";
    ctx.font = "bold 40px font-kaiti";
    ctx.textAlign = "center";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "white";
    ctx.fillText("复活", this.player.x + this.player.width / 2, this.player.y - 40);
    ctx.restore();
  }

  drawTitleCliff(ctx) {
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.moveTo(0, this.canvas.height);
      ctx.lineTo(0, this.canvas.height * 0.6);
      ctx.lineTo(this.canvas.width * 0.1, this.canvas.height * 0.62);
      ctx.lineTo(this.canvas.width * 0.25, this.canvas.height * 0.58);
      ctx.lineTo(this.canvas.width * 0.3, this.canvas.height * 0.65);
      ctx.lineTo(this.canvas.width * 0.2, this.canvas.height * 0.8);
      ctx.lineTo(this.canvas.width * 0.4, this.canvas.height);
      ctx.fill();
      
      // Setup player for title scene
      const cliffY = this.canvas.height * 0.58;
      this.player.x = this.canvas.width * 0.2;
      this.player.y = cliffY - this.player.height;
      this.player.rotation = 0;
  }

  drawAmbientParticles(ctx) {
    if (!this.ambientParticles) return;
    
    this.ambientParticles.forEach(p => {
        ctx.fillStyle = `rgba(127, 255, 212, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
  }

  drawCountdownOverlay(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 120px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = Math.ceil(this.countdownTimer);
    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    ctx.restore();
  }

  updateUI() {
    const distanceMeters = Math.floor(this.distance / 10);
    this.ui.distanceText.textContent = `${distanceMeters} m`;
    this.ui.metersText.textContent = `${distanceMeters} m`;
    this.ui.scoreText.textContent = `${this.score}`;
    
    const spiritFire = "🔥".repeat(Math.max(0, this.player.hp));
    const brokenFire = "🌑".repeat(Math.max(0, this.player.maxHp - this.player.hp));
    this.ui.hpText.textContent = spiritFire + brokenFire;

    this.ui.speedText.textContent = `${Math.round(this.currentSpeed)} 遁速`; 
    
    let status = "肉身凡胎";
    if (this.buffGiant.active) status = "法相天地";
    else if (this.buffShield.active) status = "真气护体";
    
    if (this.player.hasRevive) {
        status += " (有替身傀儡)";
    }
    
    this.ui.buffSwordText.textContent = status; 
    this.ui.buffShieldText.textContent = this.buffShield.active ? `护盾: ${this.buffShield.hitsLeft}` : "";
  }

  endGame(fellIntoPit) {
    this.onPlayerDeath(fellIntoPit ? "pitfall" : "combat");
  }

  showResultModal() {
    const modal = document.getElementById("result-modal");
    if (!modal) return;
    
    const distanceMeters = Math.floor(this.distance / 10);
    
    const elDist = document.getElementById("result-distance");
    const elScore = document.getElementById("result-score");
    const elEnemies = document.getElementById("result-enemies");
    const elDouble = document.getElementById("result-double");
    
    if (elDist) elDist.textContent = `${distanceMeters} m`;
    if (elScore) elScore.textContent = `${this.score}`;
    if (elEnemies) elEnemies.textContent = `${this.stats.enemiesDefeated}`;
    if (elDouble) elDouble.textContent = `${this.stats.doubleJumps}`;
    
    modal.classList.remove("pointer-events-none", "opacity-0", "invisible");
    
    modal.style.opacity = "1";
    modal.style.visibility = "visible";
    modal.style.pointerEvents = "auto";
  }
}
