import { GAME_CONFIG } from "./config.js";
import { Particle } from "./entities.js";
import { ObjectPool } from "./objectPool.js";

export class ParticleSystem {
  constructor() {
    const maxCount =
      GAME_CONFIG.particles.explosionCountMax + GAME_CONFIG.particles.cloudCountMax;
    this.pool = new ObjectPool(() => new Particle(), maxCount);
    this.particles = [];
  }

  spawnCloudBurst(x, y) {
    const { cloudCountMin, cloudCountMax, initialSpeed, gravity, lifeMin, lifeMax } =
      GAME_CONFIG.particles;
    const count =
      cloudCountMin + Math.floor(Math.random() * (cloudCountMax - cloudCountMin + 1));
    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      p.x = x;
      p.y = y;
      const angle = Math.random() * Math.PI;
      const speed = initialSpeed * (0.4 + Math.random() * 0.6);
      p.vx = Math.cos(angle) * speed;
      p.vy = -Math.abs(Math.sin(angle) * speed);
      p.life = lifeMin + Math.random() * (lifeMax - lifeMin);
      p.age = 0;
      p.size = 6 + Math.random() * 4;
      p.color = "rgba(226,232,240,";
      p.gravity = gravity;
      p.active = true;
      this.particles.push(p);
    }
  }

  spawnExplosion(x, y, colorA, colorB) {
    const { explosionCountMin, explosionCountMax, initialSpeed, gravity, lifeMin, lifeMax } =
      GAME_CONFIG.particles;
    const count =
      explosionCountMin +
      Math.floor(Math.random() * (explosionCountMax - explosionCountMin + 1));
    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      p.x = x;
      p.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = initialSpeed * (0.5 + Math.random());
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = lifeMin + Math.random() * (lifeMax - lifeMin);
      p.age = 0;
      p.size = 4 + Math.random() * 4;
      const t = Math.random();
      const color = t < 0.5 ? colorA : colorB;
      p.color = color;
      p.gravity = gravity;
      p.active = true;
      this.particles.push(p);
    }
  }

  spawnSwordBoost(x, y) {
    // Spawn 3 phantom swords for double jump visual
    const count = 3;
    const offsets = [0, -20, 20]; // Center, Left, Right
    
    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      p.x = x + offsets[i];
      p.y = y;
      p.vx = 0;
      p.vy = 400; // Fast downward movement
      p.life = 0.25; // Short life
      p.age = 0;
      p.size = 1; // Not used for circle, but logic needs it
      p.type = "sword"; // Special type
      p.color = "rgba(34, 211, 238,"; // Cyan base
      p.gravity = 0;
      p.active = true;
      this.particles.push(p);
    }
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      if (p.age >= p.life) {
        p.active = false;
        this.pool.release(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = 1 - p.age / p.life;
      
      if (p.type === "sword") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.globalAlpha = alpha;
          
          // Draw Sword Shape (Narrow Diamond/Rect)
          // Pointing UP (visual boost direction) but moving DOWN
          
          // Blade
          ctx.fillStyle = `rgba(34, 211, 238, ${0.8 * alpha})`; // Cyan
          ctx.beginPath();
          ctx.moveTo(0, -30); // Tip
          ctx.lineTo(6, 0);   // Right
          ctx.lineTo(0, 40);  // Bottom
          ctx.lineTo(-6, 0);  // Left
          ctx.closePath();
          ctx.fill();
          
          // Core
          ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
          ctx.beginPath();
          ctx.moveTo(0, -25);
          ctx.lineTo(2, 0);
          ctx.lineTo(0, 30);
          ctx.lineTo(-2, 0);
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
          continue;
      }

      if (p.color.startsWith("rgba(")) {
        ctx.fillStyle = p.color + alpha + ")";
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

