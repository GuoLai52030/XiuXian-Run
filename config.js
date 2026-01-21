export const ITEM_TYPE = {
  INSTANT: "INSTANT", // Immediate effect (Big, Shield, Heal)
  PASSIVE: "PASSIVE", // Passive value (Spirit)
  CONDITIONAL: "CONDITIONAL" // Conditional trigger (Revive)
};

export const GAME_CONFIG = {
  canvas: {
    baseWidth: 1280,
    baseHeight: 720,
  },
  physics: {
    gravity: 1800,
  },
  speed: {
    initial: 250,
    maxMultiplier: 2,
    difficultyStepMeters: 1000,
    difficultyIncreasePercent: 0.05,
  },
  parallax: {
    far: 0.2,
    mid: 0.5,
    near: 1,
  },
  player: {
    xRatio: 0.33,
    width: 60,
    height: 90,
    runFrameCount: 8,
    jumpFrameCount: 3,
    slideFrameCount: 2,
    maxJumpHeight: 250,
    firstJumpHeight: 180,
    secondJumpHeight: 80,
    jumpRotationDeg: 15,
    slideDuration: 0.5,
    slideCooldown: 1,
    slideHeightScale: 0.6,
    glideDuration: 1.0, // Max glide time in seconds
    glideGravityScale: 0.1, // Reduce gravity during glide
    hurtFlashCount: 3,
    maxHp: 3, // Player starts with 3 HP
    invincibleDuration: 0.5, // 0.5s invincibility after taking damage
    autoShootInterval: 0, // No shooting
    manualShootKey: "", // No shooting
  },
  sword: {
    speed: 500,
    range: 800,
    width: 40,
    height: 10,
  },
  obstacle: {
    width: 80, // >= 1.2 * player.width (60) => 72. Set to 80.
    height: 60, 
    // Slide Obstacle: Needs to block standing (90px) but allow slide (54px)
    // Low bar: bottom at yOffsetLow from ground.
    // If yOffsetLow = 85, top = 85 + 25 = 110? No.
    // Coordinates are Y-up relative to ground? No, Y-down.
    // Obstacle Y is TOP-LEFT.
    // Ground is PlatformY.
    // Low Bar Y = PlatformY - yOffsetLow.
    // If we want to block head (90) but clear slide (54):
    // Bar should be at height ~60px from ground.
    // So yOffsetLow = 70 (bottom of bar) to 80?
    // Let's say bar is 20px high.
    // yOffsetLow should be around 75. 
    // Player Top (standing) = -90. Player Top (slide) = -54.
    // Bar should be at -70.
    
    yOffsetLow: 125, 
    
    // Jump Obstacle: Must be high enough to force jump.
    // Height >= 0.6 * player.height (90) = 54.
    // Let's make it 60px tall block on ground.
    heightJump: 60, 
    widthJump: 80, 
    slideChance: 0.6,
  },
  terrain: {
    platformGapMin: 200,
    platformGapMax: 400,
    platformLengthMin: 300,
    platformLengthMax: 600,
    pitMin: 150,
    pitMax: 300,
  },
  difficulty: {
    baseMeters: 500,
    maxLevel: 10,
    enemySpawnRate: 0.3,
    obstacleSpawnRate: 0.3,
    dynamicPlatformRate: 0.2,
  },
  collectibles: {
    auraSpacingMin: 50,
    auraSpacingMax: 100,
    scorePerAura: 10,
    maxSpirit: 999, // Hard cap for spirit count
  },
  buffsSpawn: {
    healChance: 0.05,
    giantChance: 0.015,
    shieldChance: 0.05,
    reviveChance: 0.01, // 1% chance for revive item
  },
  items: {
    giant: {
      duration: 6,
      scale: 2.0,
      color: "#fcd34d",
      radius: 15,
    },
    shield: {
      color: "#22d3ee",
      radius: 15,
      hitCapacity: 1,
      duration: 10, // Shield invincibility duration
    },
    heal: {
      amount: 1,
      color: "#4ade80",
      radius: 12,
    },
    revive: {
      color: "#f472b6", // Pink/Purple for revive
      radius: 15,
      invincibleDuration: 1.0, // 1s invincibility after revive
    },
  },
  particles: {
    cloudCountMin: 5,
    cloudCountMax: 8,
    explosionCountMin: 15,
    explosionCountMax: 20,
    initialSpeed: 200,
    gravity: 800,
    lifeMin: 0.5,
    lifeMax: 1.2,
  },
  pools: {
    platforms: 20,
    auras: 50,
    enemies: 10,
    obstacles: 10,
  },

};

export const ACHIEVEMENTS = {
  rookie: {
    key: "rookie",
    name: "初出茅庐",
    condition: (stats) => stats.distance > 500,
  },
  strictCultivator: {
    key: "strictCultivator",
    name: "严厉修士",
    condition: (stats) => stats.enemiesDefeated >= 100,
  },
  doubleMaster: {
    key: "doubleMaster",
    name: "凌空虚渡",
    condition: (stats) => stats.doubleJumps >= 20,
  },
  lightBody: {
    key: "lightBody",
    name: "身轻如燕",
    condition: (stats) => stats.noPitfalls && stats.distance >= 1000,
  },
  collector: {
    key: "collector",
    name: "法宝收集者",
    condition: (stats) => stats.swordsCollected >= 3,
  },
};
