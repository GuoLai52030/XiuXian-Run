import { Game, GAME_STATE } from "./game.js";

function init() {
  const canvas = document.getElementById("game-canvas");
  const ui = {
    distanceText: document.getElementById("distance-text"),
    scoreText: document.getElementById("score-text"),
    hpText: document.getElementById("hp-text"),
    speedText: document.getElementById("speed-text"),
    metersText: document.getElementById("meters-text"),
    // statePill removed
    buffSwordText: document.getElementById("buff-sword-text"),
    buffShieldText: document.getElementById("buff-shield-text"),
  };

  const game = new Game(canvas, ui);
  
  // --- Music Toggle Logic ---
  const btnMusicToggle = document.getElementById("btn-music-toggle");
  const iconMusicOn = document.getElementById("icon-music-on");
  const iconMusicOff = document.getElementById("icon-music-off");
  let isMuted = false;

  if (btnMusicToggle) {
      btnMusicToggle.addEventListener("click", () => {
          isMuted = !isMuted;
          if (isMuted) {
              iconMusicOn.classList.add("hidden");
              iconMusicOff.classList.remove("hidden");
              // TODO: Mute actual audio
          } else {
              iconMusicOn.classList.remove("hidden");
              iconMusicOff.classList.add("hidden");
              // TODO: Unmute actual audio
          }
      });
  }

  // --- Start Screen Logic ---
  const startScreen = document.getElementById("start-screen");
  const btnStartGame = document.getElementById("btn-start-game");
  const gameHud = document.getElementById("game-hud");
  const touchControls = document.getElementById("touch-controls");
  const transitionScreen = document.getElementById("transition-screen");
  const loadingBar = document.getElementById("loading-bar");

  // Initialize in Title Mode
  game.enterTitleMode();
  
  // Reusable Start Function with Transition
  const startWithTransition = () => {
      // 1. Hide Start Screen (Fade out) if visible
      startScreen.classList.add("opacity-0", "pointer-events-none");
      
      // Hide Result Modal if visible
      resultModal.classList.add("opacity-0", "invisible", "pointer-events-none");
      // Reset Modal Styles (force hide)
      resultModal.style.opacity = "";
      resultModal.style.visibility = "";
      resultModal.style.pointerEvents = "";
      
      // 2. Show Transition Screen
      if (transitionScreen) {
          transitionScreen.classList.remove("opacity-0", "invisible");
          
          // Reset loading bar first
          if (loadingBar) {
              loadingBar.style.transition = "none"; // Disable transition for instant reset
              loadingBar.style.width = "0%";
              void loadingBar.offsetWidth; // Force reflow
          }
          
          // Trigger Loading Bar Animation (Width 0 -> 100%)
          // Small delay to ensure browser renders the reset width
          setTimeout(() => {
             if (loadingBar) {
                 loadingBar.style.transition = "width 2s ease-out"; // Re-enable transition
                 loadingBar.style.width = "100%";
             }
          }, 50);
      }
      
      // 3. Wait for Transition (2 seconds)
      setTimeout(() => {
          // Hide Transition Screen
          if (transitionScreen) {
              transitionScreen.classList.add("opacity-0");
          }
          startScreen.style.display = "none";
          
          // Show HUD
          if (gameHud) gameHud.classList.remove("opacity-0", "invisible");
          if (touchControls) touchControls.classList.remove("opacity-0", "invisible");
          
          // Start Game Logic
          game.start();
          
          // Fully remove transition screen after its fade out (500ms)
          setTimeout(() => {
              if (transitionScreen) transitionScreen.classList.add("invisible");
          }, 500);
          
      }, 2000); // 2s duration
  };

  btnStartGame.addEventListener("click", startWithTransition);

  // --- UI Controls ---
  const btnMenu = document.getElementById("btn-menu");
  const btnCloseMenu = document.getElementById("btn-close-menu");
  const menuDrawer = document.getElementById("menu-drawer");
  const btnModalRestart = document.getElementById("btn-modal-restart");
  const resultModal = document.getElementById("result-modal");

  // Menu Toggle
  const toggleMenu = (open) => {
    if (open) {
      menuDrawer.classList.add("open");
    } else {
      menuDrawer.classList.remove("open");
    }
  };

  btnMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu(true);
  });
  btnCloseMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu(false);
  });
  // Close menu when clicking outside (optional but good UX)
  document.addEventListener("click", (e) => {
    if (menuDrawer.classList.contains("open") && !menuDrawer.contains(e.target) && e.target !== btnMenu) {
      toggleMenu(false);
    }
  });

  // Modal Restart
  btnModalRestart.addEventListener("click", startWithTransition);
  
  // Modal Exit (New)
  const btnModalExit = document.getElementById("btn-modal-exit");

  // --- Touch Controls ---
  const btnSlide = document.getElementById("btn-slide");
  const btnJump = document.getElementById("btn-jump");

  // Prevent default context menu on long press
  window.oncontextmenu = function(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

  const handleTouchStart = (action) => (e) => {
    e.preventDefault(); // Prevent scrolling/zooming
    if (action === "slide") game.handleSlide();
    if (action === "jump") game.handleJump();
  };

  // Bind Touch Events
  btnSlide.addEventListener("touchstart", handleTouchStart("slide"), { passive: false });
  btnSlide.addEventListener("mousedown", handleTouchStart("slide")); // For mouse testing

  btnJump.addEventListener("touchstart", handleTouchStart("jump"), { passive: false });
  btnJump.addEventListener("mousedown", handleTouchStart("jump")); // For mouse testing

  // Pause Overlay
  const pauseOverlay = document.getElementById("pause-overlay");
  const btnPause = document.getElementById("btn-pause");
  const btnResume = document.getElementById("btn-resume");
  const btnExit = document.getElementById("btn-exit");

  const togglePause = () => {
    if (game.state === GAME_STATE.PLAYING) {
      game.state = GAME_STATE.PAUSED;
      pauseOverlay.classList.remove("opacity-0", "invisible");
    } else if (game.state === GAME_STATE.PAUSED) {
      // Start 3s countdown before resuming
      game.state = GAME_STATE.COUNTDOWN;
      game.countdownTimer = 3;
      pauseOverlay.classList.add("opacity-0", "invisible");
    }
  };

  btnPause.addEventListener("click", togglePause);
  btnResume.addEventListener("click", togglePause);
  
  // Exit Function with Transition (Return to Title)
  const exitWithTransition = () => {
      // 1. Hide Current Overlays
      if (gameHud) gameHud.classList.add("opacity-0", "invisible");
      if (touchControls) touchControls.classList.add("opacity-0", "invisible");
      pauseOverlay.classList.add("opacity-0", "invisible");
      resultModal.classList.add("opacity-0", "invisible", "pointer-events-none");
      
      // 2. Show Transition Screen
      if (transitionScreen) {
          transitionScreen.classList.remove("opacity-0", "invisible");
          
          // Reset loading bar
          if (loadingBar) {
              loadingBar.style.transition = "none";
              loadingBar.style.width = "0%";
              void loadingBar.offsetWidth; // Force reflow
          }
          
          // Animate Loading Bar (Leaving World...)
          setTimeout(() => {
             if (loadingBar) {
                 loadingBar.style.transition = "width 1.5s ease-out"; 
                 loadingBar.style.width = "100%";
             }
          }, 50);
      }
      
      // 3. Reload Page after transition
      setTimeout(() => {
          window.location.reload();
      }, 1500); 
  };

  btnExit.addEventListener("click", exitWithTransition);

  // Menu Button should also pause
  btnMenu.addEventListener("click", () => {
    if (game.state === GAME_STATE.PLAYING) {
        togglePause();
    }
  });

  // Keyboard 'Escape' to pause
  window.addEventListener("keydown", (e) => {
      if (e.code === "Escape") togglePause();
  });

  // Bind Modal Exit to Transition
  if (btnModalExit) {
      btnModalExit.addEventListener("click", exitWithTransition);
  }
}

document.addEventListener("DOMContentLoaded", init);
