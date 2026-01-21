export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.listeners = {};
    
    // Direction State
    this.lastX = 0;
    this.lastY = 0;
    this.lastShoot = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
  }

  on(action, handler) {
    this.listeners[action] = handler;
  }

  emit(action, payload) {
    const fn = this.listeners[action];
    if (fn) fn(payload);
  }

  handleKeyDown(e) {
    this.keys.add(e.code);
    
    // Prevent scrolling for game keys
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    // Note: We no longer emit events here to prevent conflicts and duplicates.
    // Events are emitted in update() based on unified state.
  }

  handleKeyUp(e) {
    this.keys.delete(e.code);
  }

  update() {
    // 1. Unify Input Sources (WASD + Arrows)
    // Horizontal
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    let x = 0;
    if (left && right) x = 0; // Conflict Resolution: Neutral
    else if (left) x = -1;
    else if (right) x = 1;

    // Vertical (Up/Jump, Down/Slide)
    const up = this.keys.has("ArrowUp") || this.keys.has("KeyW") || this.keys.has("Space");
    const down = this.keys.has("ArrowDown") || this.keys.has("KeyS");
    let y = 0;
    if (up && down) y = 0; // Conflict Resolution: Neutral
    else if (up) y = -1;
    else if (down) y = 1;

    // 2. Edge Detection (Triggers)
    
    // Jump: Rising edge of Up (y becoming -1)
    if (y === -1 && this.lastY !== -1) {
        this.emit("jump");
    }

    // Slide: Rising edge of Down (y becoming 1)
    if (y === 1 && this.lastY !== 1) {
        this.emit("slide");
    }

    // Shoot: KeyJ
    const shoot = this.keys.has("KeyJ");
    if (shoot && !this.lastShoot) {
        this.emit("shoot");
    }

    // 3. Update State
    this.lastX = x;
    this.lastY = y;
    this.lastShoot = shoot;
  }
  
  handlePointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      this.emit("slide");
    } else {
      this.emit("jump");
    }
  }
  
  isJumpHeld() {
      // Use processed state for consistency (Conflict Protection applies here too)
      return this.lastY === -1;
  }

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
  }
}

