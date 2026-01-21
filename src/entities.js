import { GAME_CONFIG } from "./config.js";

export class RectEntity {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.active = false;
  }

  reset() {
    this.active = false;
  }

  get left() {
    return this.x;
  }
  get right() {
    return this.x + this.width;
  }
  get top() {
    return this.y;
  }
  get bottom() {
    return this.y + this.height;
  }

  intersects(other) {
    return !(
      this.right < other.left ||
      this.left > other.right ||
      this.bottom < other.top ||
      this.top > other.bottom
    );
  }
}

export class Platform extends RectEntity {
  constructor() {
    super();
    this.height = 20;
    this.type = "normal"; // normal, vanish, moving_y, moving_x, short_life
    this.timer = 0;
    this.vy = 0;
    this.vx = 0;
    this.startY = 0;
    this.startX = 0;
    this.touched = false;
  }

  reset() {
    super.reset();
    this.type = "normal";
    this.timer = 0;
    this.vy = 0;
    this.vx = 0;
    this.startY = 0;
    this.startX = 0;
    this.touched = false;
  }
}

export class Aura extends RectEntity {
  constructor() {
    super();
    this.radius = 10;
    this.type = "aura";
    this.collecting = false;
    this.collectTime = 0;
  }

  reset() {
    super.reset();
    this.type = "aura";
    this.collecting = false;
    this.collectTime = 0;
  }
}

export class Enemy extends RectEntity {
  constructor() {
    super();
    this.type = "patrol"; // patrol, jump, fly
    this.vy = 0;
    this.startX = 0;
    this.patrolRange = 100;
    this.timer = 0;
  }
  
  reset() {
    super.reset();
    this.type = "patrol";
    this.vy = 0;
    this.startX = 0;
    this.patrolRange = 100;
    this.timer = 0;
  }
}

export class Obstacle extends RectEntity {
  constructor() {
    super();
    this.type = "low_bar"; // low_bar, high_bar
  }

  reset() {
    super.reset();
    this.type = "low_bar";
  }
}

export class Sword extends RectEntity {
  constructor() {
    super();
    this.distanceTraveled = 0;
  }

  reset() {
    super.reset();
    this.distanceTraveled = 0;
  }
}

export class Particle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.age = 0;
    this.color = "white";
    this.size = 4;
    this.active = false;
  }

  reset() {
    this.active = false;
    this.age = 0;
  }
}

export const PLAYER_BUFF = {
  NONE: "NONE",
  BIG: "BIG",
  INVINCIBLE: "INVINCIBLE"
};

export class Player {
  constructor() {
    const cfg = GAME_CONFIG.player;
    this.width = cfg.width;
    this.height = cfg.height;
    this.baseHeight = cfg.height;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.onGround = false;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.state = "run";
    this.hp = cfg.maxHp;
    this.maxHp = cfg.maxHp;
    this.slideTimer = 0;
    this.slideCooldownTimer = 0;
    this.rotation = 0;
    this.shieldHits = 0;
    this.invincibleTimer = 0;
    this.autoShootTimer = 0;
    this.hurtFlashTimer = 0;
    this.hurtFlashCount = 0;
    this.visible = true;
    this.glideTimer = 0;
    this.isGliding = false;
    this.hasRevive = false;
    this.reviveUsed = false;
    this.reviveMessageTimer = 0;
    this._rect = { left: 0, right: 0, top: 0, bottom: 0 };
    
    // New Buff State Machine
    this.buffState = PLAYER_BUFF.NONE;
    this.buffTimer = 0;
    this.scale = 1.0;

    // Visual-only State for Double Jump Sword
    this.showJumpSword = false;
  }

  reset(x, groundY) {
    this.x = x;
    this.y = groundY - this.baseHeight;
    this.vy = 0;
    this.onGround = true;
    this.jumpCount = 0;
    this.state = "run";
    this.hp = this.maxHp;
    this.slideTimer = 0;
    this.slideCooldownTimer = 0;
    this.rotation = 0;
    this.shieldHits = 0;
    this.invincibleTimer = 0;
    this.autoShootTimer = 0;
    this.visible = true;
    this.height = this.baseHeight;
    this.glideTimer = 0;
    this.isGliding = false;
    this.hasRevive = false;
    this.reviveUsed = false;
    this.reviveMessageTimer = 0;
    // Reuse collision rect to reduce GC
    this._rect = { left: 0, right: 0, top: 0, bottom: 0 };
    
    // Reset Buff State
    this.buffState = PLAYER_BUFF.NONE;
    this.buffTimer = 0;
    this.scale = 1.0;
    
    this.showJumpSword = false;
  }

  // Use a method to update and return the shared rect object
  // OR just compute properties on the fly if needed.
  // But let's stick to returning a shared object.
  get collisionRect() {
    this._rect.left = this.x;
    this._rect.right = this.x + this.width;
    this._rect.top = this.y;
    this._rect.bottom = this.y + this.height;
    return this._rect;
  }
}
