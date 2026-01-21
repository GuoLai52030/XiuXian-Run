import { GAME_CONFIG } from "./config.js";

export class BackgroundLayer {
  constructor(speedFactor, drawFn, width, height) {
    this.speedFactor = speedFactor;
    this.offset = 0;
    this.baseWidth = width;
    this.baseHeight = height;
    this.offscreen = document.createElement("canvas");
    this.offscreen.width = width;
    this.offscreen.height = height;
    this.offCtx = this.offscreen.getContext("2d");
    drawFn(this.offCtx, width, height);
  }

  update(delta, worldSpeed) {
    this.offset += worldSpeed * this.speedFactor * delta;
    if (this.offset > this.baseWidth) {
      this.offset -= this.baseWidth;
    }
  }

  draw(ctx, scaleX, scaleY) {
    const w = this.baseWidth * scaleX;
    const h = this.baseHeight * scaleY;
    const offset = (this.offset * scaleX) % w;
    const repeats = Math.ceil(ctx.canvas.width / w) + 1;
    for (let i = -1; i < repeats; i++) {
      ctx.drawImage(
        this.offscreen,
        0,
        0,
        this.baseWidth,
        this.baseHeight,
        -offset + i * w,
        ctx.canvas.height - h,
        w,
        h
      );
    }
  }
}

export class BackgroundSystem {
  constructor(width, height) {
    this.baseWidth = width;
    this.baseHeight = height;
    const farSpeed = GAME_CONFIG.parallax.far;
    const midSpeed = GAME_CONFIG.parallax.mid;
    const nearSpeed = GAME_CONFIG.parallax.near;

    // Helper to draw seamless objects that wrap around edges
    const drawSeamless = (ctx, x, y, drawCallback) => {
      ctx.save();
      ctx.translate(x, y);
      drawCallback(ctx);
      ctx.restore();
      
      if (x < width * 0.5) {
         ctx.save();
         ctx.translate(x + width, y);
         drawCallback(ctx);
         ctx.restore();
      } else {
         ctx.save();
         ctx.translate(x - width, y);
         drawCallback(ctx);
         ctx.restore();
      }
    };

    // Make far layer wider to reduce moon frequency
    // NEW DESIGN: Infinite Mountain Range + Cloud Sea
    const farWidth = width * 2;
    this.far = new BackgroundLayer(
      farSpeed,
      (ctx, w, h) => {
        // 1. SKY (Gradient) - High Altitude feel
        // Top: Deep Space Blue/Grey -> Bottom: Misty White/Cyan
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#cbd5e1"); // Light Grey/Blue (Sky)
        grad.addColorStop(0.4, "#94a3b8");
        grad.addColorStop(1, "#f1f5f9"); // Cloud Sea White
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        
        // 2. SUN/MOON (Subtle)
        // A pale white sun/moon behind mist
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.shadowBlur = 60;
        ctx.shadowColor = "white";
        ctx.beginPath();
        ctx.arc(w * 0.7, h * 0.2, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // 3. FAR MOUNTAINS (Ink Wash Style - Danqing)
        // Layer 1: Very far, faint grey
        ctx.fillStyle = "rgba(100, 116, 139, 0.3)";
        this.drawMountainRange(ctx, w, h, 150, 50, 0);
        
        // Layer 2: Closer, darker ink
        ctx.fillStyle = "rgba(71, 85, 105, 0.5)";
        this.drawMountainRange(ctx, w, h, 100, 80, 200);
        
        // Layer 3: Cloud Sea (Bottom)
        const cloudGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
        cloudGrad.addColorStop(0, "rgba(255,255,255,0)");
        cloudGrad.addColorStop(0.3, "rgba(241, 245, 249, 0.8)");
        cloudGrad.addColorStop(1, "#f1f5f9");
        ctx.fillStyle = cloudGrad;
        ctx.fillRect(0, h * 0.6, w, h * 0.4);
      },
      farWidth,
      height
    );

    this.mid = new BackgroundLayer(
      midSpeed,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        
        // FLOATING ISLANDS / CLIFFS (Ink Style)
        // Darker, more detailed silhouettes
        ctx.fillStyle = "rgba(30, 41, 59, 0.9)"; // Dark Slate
        
        for (let i = 0; i < 5; i++) {
            const x = (i / 5) * w + 100;
            const y = h * 0.3 + (Math.random() * h * 0.4);
            const scale = 0.5 + Math.random() * 0.5;
            
            drawSeamless(ctx, x, y, (c) => {
                c.save();
                c.scale(scale, scale);
                // Draw Floating Rock
                c.beginPath();
                c.moveTo(-100, 0);
                c.lineTo(100, 0); // Flat top
                // Jagged bottom
                c.lineTo(80, 40);
                c.lineTo(20, 120); // Deep root
                c.lineTo(-40, 60);
                c.lineTo(-90, 30);
                c.closePath();
                c.fill();
                
                // Pine Trees on top (Silhouette)
                c.fillStyle = "#0f172a"; // Almost black
                c.beginPath();
                c.moveTo(-60, 0);
                c.lineTo(-50, -40); // Trunk/Top
                c.lineTo(-30, 0);
                c.fill();
                
                // Reset fill for next rock
                c.fillStyle = "rgba(30, 41, 59, 0.9)";
                c.restore();
            });
        }
        
        // Mist passing through
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.ellipse(w/2, h/2, w/2, 50, 0, 0, Math.PI*2);
        ctx.fill();
      },
      width,
      height
    );

    this.near = new BackgroundLayer(
      nearSpeed,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        
        // Fast moving cloud wisps (Foreground)
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        for(let i=0; i<8; i++) {
            const x = Math.random() * w;
            const y = h * 0.8 + Math.random() * h * 0.2;
            const size = 100 + Math.random() * 200;
            
            ctx.beginPath();
            ctx.ellipse(x, y, size, size/3, 0, 0, Math.PI*2);
            ctx.fill();
        }
      },
      width,
      height
    );

    this.scaleX = 1;
  }
  
  drawMountainRange(ctx, w, h, amplitude, offsetY, seedOffset) {
      // Simple noise-like mountain drawing
      ctx.beginPath();
      ctx.moveTo(0, h);
      
      const step = 50;
      for (let x = 0; x <= w; x += step) {
          // Simple pseudo-random height based on x
          const n = Math.sin((x + seedOffset) * 0.005) + Math.sin((x + seedOffset) * 0.02) * 0.5;
          const y = h * 0.6 + n * amplitude - offsetY;
          ctx.lineTo(x, y);
      }
      
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
  }

  update(delta, worldSpeed, backgroundScaleX) {
    this.scaleX = backgroundScaleX || 1;
    this.far.update(delta, worldSpeed);
    this.mid.update(delta, worldSpeed);
    this.near.update(delta, worldSpeed);
  }

  draw(ctx, scale) {
    const sx = this.scaleX * scale;
    const sy = scale;
    this.far.draw(ctx, sx, sy);
    this.mid.draw(ctx, sx, sy);
    this.near.draw(ctx, sx, sy);
  }
}

