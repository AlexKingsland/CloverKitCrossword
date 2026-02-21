// Crossword Puzzle - Fetched from Cloudflare R2

// R2 Configuration
const R2_PUBLIC_HOST = "cdn.cloverkitstudio.com";
const BASE_PATH = "v1/generic";

class CrosswordPuzzle {
  constructor() {
    this.containerElement = document.querySelector('.crossword-container');
    this.titleElement = document.querySelector('.crossword-title');
    this.storefrontDailyTitle = "Daily Crossword";
    this.rotateOverlayElement = document.getElementById('crossword-rotate-overlay');
    this.collapsibleContentElement = document.getElementById('crossword-collapsible-content');
    this.collapsedCoverButton = document.getElementById('crossword-collapsed-cover');
    this.closeButton = document.getElementById('crossword-close-button');
    this.gridElement = document.getElementById('crossword-grid');
    this.acrossCluesElement = document.getElementById('across-clues');
    this.downCluesElement = document.getElementById('down-clues');
    this.submitButton = document.getElementById('submit-puzzle');
    this.checkDropdown = document.getElementById('check-dropdown');
    this.checkToggle = document.getElementById('check-toggle');
    this.checkMenu = document.getElementById('check-menu');
    this.checkLetterBtn = document.getElementById('check-letter');
    this.checkWordBtn = document.getElementById('check-word');
    this.checkPuzzleBtn = document.getElementById('check-puzzle');
    this.revealDropdown = document.getElementById('reveal-dropdown');
    this.revealToggle = document.getElementById('reveal-toggle');
    this.revealMenu = document.getElementById('reveal-menu');
    this.revealLetterBtn = document.getElementById('reveal-letter');
    this.revealWordBtn = document.getElementById('reveal-word');
    this.revealPuzzleBtn = document.getElementById('reveal-puzzle');
    this.resetButton = document.getElementById('reset-puzzle');
    this.messageElement = document.getElementById('crossword-message');
    this.timerDisplay = document.getElementById('timer-display');

    // Get difficulty from data attribute for R2 fetching
    const container = document.querySelector('.crossword-container');
    this.difficulty = container ? container.dataset.difficulty : 'medium';
    
    this.currentPuzzle = null;
    this.userInputs = null;
    this.revealedCells = new Set(); // Track cells revealed via Reveal feature (stored as "row,col")
    this.isLoading = true;
    
    // Timer properties
    this.startTime = null;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.puzzleCompleted = false;

    // Word selection properties
    this.currentDirection = 'across';
    this.selectedWord = null;
    this.lastClickTime = 0;
    this.currentCell = null;
    this.currentClueNumber = null;

    // Mobile keyboard properties
    this.isMobileDevice = this.detectMobileDevice();
    this.mobileKeyboard = document.getElementById('mobile-keyboard');
    this.keyboardClueText = document.getElementById('keyboard-clue-text');
    this.keyboardPrevBtn = document.getElementById('keyboard-prev-clue');
    this.keyboardNextBtn = document.getElementById('keyboard-next-clue');

    // Mobile orientation guard
    this.mobileLandscapeMediaQuery = window.matchMedia('(orientation: landscape)');
    this.mobilePointerQuery = window.matchMedia('(pointer: coarse)');
    this.boundOrientationHandler = this.updateMobileOrientationState.bind(this);

    this.bindOrientationEvents();
    this.updateMobileOrientationState();
    this.applyResolvedTitle();
    this.bindCollapseEvents();
    this.setCollapsedState(true);

    // Initialize asynchronously
    this.initialize();
  }

  applyResolvedTitle() {
    if (!this.titleElement) return;

    const configuredTitle = this.titleElement.textContent ? this.titleElement.textContent.trim() : '';
    if (configuredTitle) return;

    const storefrontName = this.containerElement && this.containerElement.dataset.storefrontName
      ? this.containerElement.dataset.storefrontName.trim()
      : '';

    this.storefrontDailyTitle = storefrontName ? `${storefrontName}'s Daily Crossword` : this.storefrontDailyTitle;
    this.titleElement.textContent = this.storefrontDailyTitle;
  }

  bindCollapseEvents() {
    if (this.collapsedCoverButton) {
      this.collapsedCoverButton.addEventListener('click', () => this.setCollapsedState(false));
    }

    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.setCollapsedState(true));
    }

    // Title click to minimize (only when expanded)
    if (this.titleElement) {
      this.titleElement.addEventListener('click', () => {
        if (this.containerElement && this.containerElement.classList.contains('is-expanded')) {
          this.setCollapsedState(true);
        }
      });
      this.titleElement.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && this.containerElement && this.containerElement.classList.contains('is-expanded')) {
          e.preventDefault();
          this.setCollapsedState(true);
        }
      });
    }
  }

  setCollapsedState(isCollapsed) {
    if (!this.containerElement) return;

    this.containerElement.classList.toggle('is-collapsed', isCollapsed);
    this.containerElement.classList.toggle('is-expanded', !isCollapsed);

    if (this.collapsibleContentElement) {
      this.collapsibleContentElement.setAttribute('aria-hidden', String(isCollapsed));
    }

    // Pause/resume timer based on collapsed state
    if (isCollapsed) {
      this.pauseTimer();
    } else {
      this.resumeTimer();
    }
  }

  bindOrientationEvents() {
    if (this.mobileLandscapeMediaQuery && this.mobileLandscapeMediaQuery.addEventListener) {
      this.mobileLandscapeMediaQuery.addEventListener('change', this.boundOrientationHandler);
    } else if (this.mobileLandscapeMediaQuery && this.mobileLandscapeMediaQuery.addListener) {
      this.mobileLandscapeMediaQuery.addListener(this.boundOrientationHandler);
    }

    window.addEventListener('resize', this.boundOrientationHandler);
    window.addEventListener('orientationchange', this.boundOrientationHandler);
  }

  updateMobileOrientationState() {
    if (!this.containerElement || !this.rotateOverlayElement) return;

    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const isLandscape = viewportWidth > viewportHeight;

    const hasTouch =
      ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
      ('ontouchstart' in window);

    const coarsePointer = this.mobilePointerQuery ? this.mobilePointerQuery.matches : false;

    // Don't gate by 768px: many phones in landscape exceed that width in CSS pixels.
    // Instead, treat touch/coarse-pointer devices with a phone-like shortest side as mobile.
    const shortestSide = Math.min(viewportWidth, viewportHeight);
    const isPhoneLikeViewport = shortestSide <= 900;
    const isMobileDevice = isPhoneLikeViewport && (hasTouch || coarsePointer);

    const isBlocked = isMobileDevice && isLandscape;
    this.containerElement.classList.toggle('mobile-landscape-blocked', isBlocked);

    if (!isBlocked) return;

    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  }

  async initialize() {
    console.log('🎯 Initializing crossword for difficulty:', this.difficulty);
    
    try {
      // Show loading state
      this.showLoadingState();
      
      // Load puzzle from R2
      await this.loadPuzzleFromR2();
      
      // Initialize grid
      this.userInputs = this.createEmptyGrid();
      this.isLoading = false;
      
      // Render and bind events
      this.init();
    } catch (error) {
      // Error already handled and displayed in loadPuzzleFromR2
      this.isLoading = false;
      console.error('Failed to initialize crossword:', error);
    }
  }

  getTodayUTC() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  getYesterdayUTC() {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() - 1);
    return now.toISOString().split('T')[0];
  }

  async loadPuzzleFromR2() {
    try {
      const today = this.getTodayUTC();
      const url = `https://${R2_PUBLIC_HOST}/${BASE_PATH}/${this.difficulty}/${today}.json`;
      
      console.log('📡 Fetching puzzle from R2:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        // Try yesterday's puzzle as fallback
        console.log('⚠️ Today\'s puzzle not found, trying yesterday...');
        const yesterday = this.getYesterdayUTC();
        const fallbackUrl = `https://${R2_PUBLIC_HOST}/${BASE_PATH}/${this.difficulty}/${yesterday}.json`;
        
        console.log('📡 Fetching fallback puzzle from R2:', fallbackUrl);
        const fallbackResponse = await fetch(fallbackUrl);
        
        if (!fallbackResponse.ok) {
          throw new Error(`Puzzle not found for ${today} or ${yesterday}`);
        }
        
        const data = await fallbackResponse.json();
        this.currentPuzzle = {
          acrossClues: data.acrossClues,
          downClues: data.downClues,
          answers: data.answers,
          cluePositions: data.cluePositions
        };
        console.log('✅ Loaded yesterday\'s puzzle as fallback');
        console.log('   Title:', data.title);
        console.log('   Date:', data.date);
        return;
      }
      
      const data = await response.json();
      this.currentPuzzle = {
        acrossClues: data.acrossClues,
        downClues: data.downClues,
        answers: data.answers,
        cluePositions: data.cluePositions
      };
      
      console.log('✅ Puzzle loaded successfully from R2');
      console.log('   Title:', data.title);
      console.log('   Date:', data.date);
      
    } catch (error) {
      console.error('❌ Failed to load puzzle from R2:', error.message);
      this.showErrorState(error.message);
      throw error;
    }
  }

  showErrorState(errorMessage) {
    this.gridElement.innerHTML = `
      <div class="error-state" style="padding: 2rem; text-align: center; color: #d32f2f;">
        <h3>⚠️ Unable to Load Puzzle</h3>
        <p>Failed to fetch puzzle from API.</p>
        <p style="font-size: 0.9em; color: #666;">${errorMessage}</p>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }

  showLoadingState() {
    this.gridElement.innerHTML = '<div class="loading-state">Loading puzzle...</div>';
  }

  createEmptyGrid() {
    const size = this.currentPuzzle.answers.length;
    return Array(size).fill().map(() => Array(size).fill(''));
  }

  init() {
    // Set grid size dynamically
    const gridSize = this.currentPuzzle.answers.length;
    this.gridElement.style.setProperty('--grid-size', gridSize);
    
    this.renderGrid();
    this.renderClues();
    this.bindEvents();
    
    // Initialize mobile keyboard if on mobile device
    if (this.isMobileDevice) {
      this.initMobileKeyboard();
    }
    
    // Start timer
    this.startTimer();
  }

  detectMobileDevice() {
    // Check if device has touch support and coarse pointer (mobile)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const coarsePointer = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const isMobile = hasTouch && coarsePointer;
    console.log('🔍 Mobile Detection:', {
      hasTouch,
      coarsePointer,
      isMobile,
      userAgent: navigator.userAgent
    });
    return isMobile;
  }

  initMobileKeyboard() {
    if (!this.mobileKeyboard) return;

    // Bind keyboard key events using touchstart for instant response
    const keys = this.mobileKeyboard.querySelectorAll('.keyboard-key');
    keys.forEach(key => {
      key.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const keyValue = key.dataset.key;
        this.handleMobileKeyPress(keyValue);
      }, { passive: false });
      // Fallback click for non-touch
      key.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Bind navigation buttons using touchstart for instant response
    if (this.keyboardPrevBtn) {
      this.keyboardPrevBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.navigateToPreviousClue();
      }, { passive: false });
    }

    if (this.keyboardNextBtn) {
      this.keyboardNextBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.navigateToNextClue();
      }, { passive: false });
    }

    // Swipe-down on keyboard to dismiss it
    let swipeStartY = null;
    const SWIPE_THRESHOLD = 40; // px

    this.mobileKeyboard.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        swipeStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.mobileKeyboard.addEventListener('touchmove', (e) => {
      if (swipeStartY === null || e.touches.length !== 1) return;
      const deltaY = e.touches[0].clientY - swipeStartY;
      if (deltaY > SWIPE_THRESHOLD) {
        swipeStartY = null;
        this.hideMobileKeyboard();
      }
    }, { passive: true });

    this.mobileKeyboard.addEventListener('touchend', () => {
      swipeStartY = null;
    }, { passive: true });

    // Dead-zone hit detection: taps in gaps between keys find the nearest key
    const rows = this.mobileKeyboard.querySelectorAll('.keyboard-row');
    rows.forEach(row => {
      row.addEventListener('touchstart', (e) => {
        if (e.target.closest('.keyboard-key')) return;
        const touch = e.touches[0];
        let closestKey = null;
        let closestDist = Infinity;
        row.querySelectorAll('.keyboard-key').forEach(key => {
          const r = key.getBoundingClientRect();
          const dist = Math.hypot(touch.clientX - (r.left + r.width / 2), touch.clientY - (r.top + r.height / 2));
          if (dist < closestDist) { closestDist = dist; closestKey = key; }
        });
        if (closestKey) {
          e.preventDefault();
          e.stopPropagation();
          this.handleMobileKeyPress(closestKey.dataset.key);
        }
      }, { passive: false });
    });

    // Also handle taps in vertical gaps between rows
    const keysContainer = this.mobileKeyboard.querySelector('.keyboard-keys');
    if (keysContainer) {
      keysContainer.addEventListener('touchstart', (e) => {
        if (e.target.closest('.keyboard-key') || e.target.closest('.keyboard-row')) return;
        const touch = e.touches[0];
        let closestKey = null;
        let closestDist = Infinity;
        keysContainer.querySelectorAll('.keyboard-key').forEach(key => {
          const r = key.getBoundingClientRect();
          const dist = Math.hypot(touch.clientX - (r.left + r.width / 2), touch.clientY - (r.top + r.height / 2));
          if (dist < closestDist) { closestDist = dist; closestKey = key; }
        });
        if (closestKey) {
          e.preventDefault();
          e.stopPropagation();
          this.handleMobileKeyPress(closestKey.dataset.key);
        }
      }, { passive: false });
    }

    // Dismiss keyboard when the user scrolls (but not during programmatic scrolls)
    this._programmaticScroll = false;
    window.addEventListener('scroll', () => {
      if (this._programmaticScroll) return;
      if (this.mobileKeyboard && this.mobileKeyboard.classList.contains('visible')) {
        this.hideMobileKeyboard();
      }
    }, { passive: true });

    // Handle outside taps to hide keyboard (but not grid/clues/keyboard)
    document.addEventListener('click', (e) => {
      const isGridClick = e.target.closest('#crossword-grid');
      const isClueClick = e.target.closest('.crossword-clues');
      const isKeyboardClick = e.target.closest('#mobile-keyboard');
      
      if (!isGridClick && !isClueClick && !isKeyboardClick) {
        this.hideMobileKeyboard();
      }
    });
  }

  showMobileKeyboard() {
    if (this.mobileKeyboard) {
      this.mobileKeyboard.classList.add('visible');
      // Add bottom padding so content isn't hidden behind keyboard
      if (this.containerElement) {
        this.containerElement.classList.add('keyboard-visible');
      }
    }
  }

  hideMobileKeyboard() {
    if (this.mobileKeyboard) {
      this.mobileKeyboard.classList.remove('visible');
      if (this.containerElement) {
        this.containerElement.classList.remove('keyboard-visible');
      }
    }
  }

  updateKeyboardClue() {
    if (!this.keyboardClueText || !this.selectedWord || !this.currentCell) return;

    const clueNum = this.getClueNumberForWord(this.selectedWord, this.currentDirection);
    if (clueNum) {
      const clueText = this.currentDirection === 'across' 
        ? this.currentPuzzle.acrossClues[clueNum]
        : this.currentPuzzle.downClues[clueNum];
      
      if (clueText) {
        this.keyboardClueText.textContent = `${clueNum}. ${clueText}`;
      }
    } else {
      this.keyboardClueText.textContent = 'Select a cell to start';
    }
  }

  handleMobileKeyPress(key) {
    if (!this.currentCell) return;

    if (key === 'Dismiss') {
      this.hideMobileKeyboard();
      return;
    }

    if (key === 'Backspace') {
      this.handleBackspace(this.currentCell.row, this.currentCell.col);
      this.updateKeyboardClue();
    } else if (key.length === 1) {
      // Insert letter
      const { row, col } = this.currentCell;
      this.userInputs[row][col] = key.toUpperCase();
      
      const input = this.getInputAt(row, col);
      if (input) {
        input.value = key.toUpperCase();
      }
      
      // Auto-advance to next cell
      this.advanceToNextCell(row, col);
      this.updateKeyboardClue();
    }
  }

  navigateToPreviousClue() {
    const allClues = this.getAllCluesOrdered();
    if (allClues.length === 0) return;

    const currentClueNum = this.getCurrentClueNumber();

    // If no clue is selected yet, jump to the first clue
    if (!currentClueNum) {
      this.navigateToClue(allClues[0].num, allClues[0].direction);
      return;
    }

    const currentIndex = allClues.findIndex(c => c.num === currentClueNum && c.direction === this.currentDirection);
    
    let targetClue;
    if (currentIndex > 0) {
      targetClue = allClues[currentIndex - 1];
    } else {
      // Wrap to last clue
      targetClue = allClues[allClues.length - 1];
    }
    
    if (targetClue) {
      this.navigateToClue(targetClue.num, targetClue.direction);
    }
  }

  navigateToNextClue() {
    const allClues = this.getAllCluesOrdered();
    if (allClues.length === 0) return;

    const currentClueNum = this.getCurrentClueNumber();

    // If no clue is selected yet, jump to the first clue
    if (!currentClueNum) {
      this.navigateToClue(allClues[0].num, allClues[0].direction);
      return;
    }

    const currentIndex = allClues.findIndex(c => c.num === currentClueNum && c.direction === this.currentDirection);
    
    let targetClue;
    if (currentIndex >= 0 && currentIndex < allClues.length - 1) {
      targetClue = allClues[currentIndex + 1];
    } else {
      // Wrap to first clue
      targetClue = allClues[0];
    }
    
    if (targetClue) {
      this.navigateToClue(targetClue.num, targetClue.direction);
    }
  }

  navigateToClue(clueNum, direction) {
    // Get position from cluePositions
    const position = this.currentPuzzle.cluePositions[clueNum];
    if (!position) return;
    
    // Reset click timing so navigation is never interpreted as a double-tap
    // direction toggle (same guard used in handleClueClick)
    this.lastClickTime = 0;

    // Set direction BEFORE calling handleCellClick so word selection is correct
    this.currentDirection = direction;
    this.handleCellClick(position.row, position.col);

    // Re-assert direction and clue number after handleCellClick, because
    // handleCellClick may have flipped them via double-click detection or
    // direction fallback logic.
    this.currentDirection = direction;
    this.currentClueNumber = clueNum;
    
    // Only focus on desktop
    if (!this.isMobileDevice) {
      const input = this.getInputAt(position.row, position.col);
      if (input) input.focus();
    }
    
    this.highlightClue(clueNum);
    this.updateKeyboardClue();
  }

  getAllCluesOrdered() {
    const clues = [];
    
    // Add all across clues
    Object.keys(this.currentPuzzle.acrossClues).forEach(num => {
      clues.push({ num, direction: 'across' });
    });
    
    // Add all down clues
    Object.keys(this.currentPuzzle.downClues).forEach(num => {
      clues.push({ num, direction: 'down' });
    });
    
    // Sort by clue number
    return clues.sort((a, b) => {
      const numA = parseInt(a.num);
      const numB = parseInt(b.num);
      if (numA !== numB) return numA - numB;
      // If same number, across comes before down
      return a.direction === 'across' ? -1 : 1;
    });
  }

  getCurrentClueNumber() {
    if (this.currentClueNumber) return this.currentClueNumber;
    if (!this.selectedWord) return null;
    return this.getClueNumberForWord(this.selectedWord, this.currentDirection);
  }

  startTimer() {
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.puzzleCompleted = false;
    this.isPaused = false;
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  pauseTimer() {
    if (this.isPaused || this.puzzleCompleted || !this.timerInterval) return;
    
    // Save elapsed time so far
    this.elapsedTime += Date.now() - this.startTime;
    this.isPaused = true;
    
    // Stop the interval
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  resumeTimer() {
    if (!this.isPaused || this.puzzleCompleted) return;
    
    // Reset start time for new interval
    this.startTime = Date.now();
    this.isPaused = false;
    
    // Restart the interval
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  updateTimer() {
    if (this.puzzleCompleted || this.isPaused) return;
    
    const elapsed = this.elapsedTime + (Date.now() - this.startTime);
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    this.timerDisplay.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.elapsedTime += Date.now() - this.startTime;
      this.puzzleCompleted = true;
    }
  }

  formatElapsedTime() {
    const minutes = Math.floor(this.elapsedTime / 60000);
    const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  showCompletionBanner() {
    const timeStr = this.formatElapsedTime();
    const banner = document.createElement('div');
    banner.className = 'completion-banner';
    banner.innerHTML = `
      <div class="banner-content">
        <h3>🎉 Congratulations!</h3>
        <p>You completed the crossword in <strong>${timeStr}</strong>!</p>
        <button class="btn btn-primary" onclick="this.closest('.completion-banner').remove()">Close</button>
      </div>
    `;
    
    const container = document.querySelector('.crossword-container');
    container.insertBefore(banner, container.firstChild);
  }

  findWordAt(row, col, direction) {
    const gridSize = this.currentPuzzle.answers.length;
    let cells = [];
    
    if (direction === 'across') {
      // Find start of word (scan left)
      let startCol = col;
      while (startCol > 0 && this.currentPuzzle.answers[row][startCol - 1] !== null) {
        startCol--;
      }
      
      // Find end of word (scan right)
      let endCol = col;
      while (endCol < gridSize - 1 && this.currentPuzzle.answers[row][endCol + 1] !== null) {
        endCol++;
      }
      
      // Build cell list
      for (let c = startCol; c <= endCol; c++) {
        cells.push({ row, col: c });
      }
    } else {
      // direction === 'down'
      // Find start of word (scan up)
      let startRow = row;
      while (startRow > 0 && this.currentPuzzle.answers[startRow - 1][col] !== null) {
        startRow--;
      }
      
      // Find end of word (scan down)
      let endRow = row;
      while (endRow < gridSize - 1 && this.currentPuzzle.answers[endRow + 1][col] !== null) {
        endRow++;
      }
      
      // Build cell list
      for (let r = startRow; r <= endRow; r++) {
        cells.push({ row: r, col });
      }
    }
    
    return cells.length > 1 ? cells : null; // Only return if it's actually a word (>1 cell)
  }

  clearHighlights() {
    const cells = this.gridElement.querySelectorAll('.crossword-cell');
    cells.forEach(cell => {
      cell.classList.remove('highlighted', 'current');
    });
  }

  highlightWord(cells, currentRow, currentCol) {
    this.clearHighlights();
    const gridSize = this.currentPuzzle.answers.length;
    
    cells.forEach(({ row, col }) => {
      const cellIndex = row * gridSize + col;
      const cellElement = this.gridElement.children[cellIndex];
      
      if (cellElement) {
        if (row === currentRow && col === currentCol) {
          cellElement.classList.add('current');
        } else {
          cellElement.classList.add('highlighted');
        }
      }
    });
  }

  getClueNumberForWord(wordCells, direction) {
    if (!wordCells || wordCells.length === 0) return null;
    
    // Get the starting cell of the word
    const startCell = wordCells[0];
    
    // First try strict direction match at this start cell
    for (const [clueNum, position] of Object.entries(this.currentPuzzle.cluePositions)) {
      if (position.row === startCell.row && 
          position.col === startCell.col && 
          position.direction === direction) {
        return clueNum;
      }
    }

    // Fallback: some puzzle payloads only store one direction in cluePositions
    // for shared start cells. If the start cell matches and this clue exists
    // in the requested direction's clue map, use that clue number.
    for (const [clueNum, position] of Object.entries(this.currentPuzzle.cluePositions)) {
      if (position.row !== startCell.row || position.col !== startCell.col) continue;

      const existsInDirection = direction === 'across'
        ? Object.prototype.hasOwnProperty.call(this.currentPuzzle.acrossClues, clueNum)
        : Object.prototype.hasOwnProperty.call(this.currentPuzzle.downClues, clueNum);

      if (existsInDirection) {
        return clueNum;
      }
    }
    
    return null;
  }

  handleCellClick(row, col) {
    const now = Date.now();
    const isDoubleClick = (now - this.lastClickTime) < 300;
    this.lastClickTime = now;
    
    if (isDoubleClick && this.currentCell && this.currentCell.row === row && this.currentCell.col === col) {
      // Double click - toggle direction
      this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
    }
    
    // Try to find word in current direction
    let word = this.findWordAt(row, col, this.currentDirection);
    
    // If no word found in current direction, try opposite direction
    if (!word) {
      const oppositeDirection = this.currentDirection === 'across' ? 'down' : 'across';
      word = this.findWordAt(row, col, oppositeDirection);
      
      // If word found in opposite direction, switch to that direction
      if (word) {
        this.currentDirection = oppositeDirection;
      }
    }
    
    // Highlight the word if found
    if (word) {
      this.selectedWord = word;
      this.highlightWord(word, row, col);
      
      // Highlight corresponding clue
      const clueNum = this.getClueNumberForWord(word, this.currentDirection);
      if (clueNum) {
        this.currentClueNumber = clueNum;
        this.highlightClue(clueNum);
      } else {
        this.currentClueNumber = null;
      }
    }
    
    this.currentCell = { row, col };
    
    // Select the text in the input for easy override (desktop only)
    // On mobile, skip entirely - no focus/select/setSelectionRange to avoid iOS keyboard
    if (!this.isMobileDevice) {
      const input = this.getInputAt(row, col);
      if (input && input.value) {
        input.select();
      }
    }
  }

  advanceToNextCell(row, col) {
    if (!this.selectedWord) return;
    
    // Find current position in selected word
    const currentIndex = this.selectedWord.findIndex(cell => cell.row === row && cell.col === col);
    
    if (currentIndex >= 0 && currentIndex < this.selectedWord.length - 1) {
      // Move to next cell in word
      const nextCell = this.selectedWord[currentIndex + 1];
      const nextInput = this.getInputAt(nextCell.row, nextCell.col);
      if (nextInput) {
        // Only focus on desktop - on mobile, focus triggers iOS keyboard
        if (!this.isMobileDevice) {
          nextInput.focus();
        }
        this.handleCellClick(nextCell.row, nextCell.col);
      }
    }
  }

  renderGrid() {
    this.gridElement.innerHTML = '';
    let cellCount = 0;
    let blackCount = 0;
    const gridSize = this.currentPuzzle.answers.length;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cell = document.createElement('div');
        cell.className = 'crossword-cell';

        const isBlack = this.currentPuzzle.answers[row][col] === null;

        if (isBlack) {
          cell.classList.add('black');
          cell.innerHTML = '&nbsp;';
          blackCount++;
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'crossword-cell-input';
          input.maxLength = 1;
          input.value = this.userInputs[row][col];
          
          input.dataset.row = row;
          input.dataset.col = col;

          // Setup event listeners based on device type
          if (this.isMobileDevice) {
            // Mobile: prevent native keyboard
            input.setAttribute('readonly', 'readonly');
            input.setAttribute('inputmode', 'none');
            
            // Use touchstart for immediate response on mobile
            input.addEventListener('touchstart', (e) => {
              e.preventDefault();
              this.handleCellClick(row, col);
              this.showMobileKeyboard();
              this.updateKeyboardClue();
            });
            
            // Also handle click for mobile browsers that don't support touch
            input.addEventListener('click', (e) => {
              e.preventDefault();
              this.handleCellClick(row, col);
              this.showMobileKeyboard();
              this.updateKeyboardClue();
            });
            
            // Prevent focus from triggering keyboard
            input.addEventListener('focus', (e) => {
              e.preventDefault();
              e.target.blur();
            });
            
          } else {
            // Desktop: normal keyboard input
            input.addEventListener('click', () => {
              this.handleCellClick(row, col);
            });

            input.addEventListener('input', (e) => {
              let value = e.target.value.toUpperCase();
              
              // Only keep the last character typed (replaces any existing character)
              if (value.length > 1) {
                value = value.slice(-1);
              }
              
              this.userInputs[row][col] = value;
              e.target.value = value;
              
              // Auto-advance to next cell if a letter was entered
              if (value) {
                this.advanceToNextCell(row, col);
              }
            });

            input.addEventListener('keydown', (e) => {
              this.handleKeyDown(e, row, col);
            });
          }

          cell.appendChild(input);

          // Add clue numbers
          const clueNumber = this.getClueNumber(row, col);
          if (clueNumber) {
            const numberSpan = document.createElement('span');
            numberSpan.className = 'crossword-cell-number';
            numberSpan.textContent = clueNumber;
            cell.appendChild(numberSpan);
          }

          // Restore revealed indicator if this cell was previously revealed
          if (this.revealedCells.has(`${row},${col}`)) {
            cell.classList.add('revealed');
          }
        }

        this.gridElement.appendChild(cell);
        cellCount++;
      }
    }
    
    console.log(`=== RENDER COMPLETE: ${cellCount} total cells, ${blackCount} black cells, ${cellCount - blackCount} white cells ===`);
  }

  getClueNumber(row, col) {
    // Dynamically find which clue number starts at this position
    if (!this.currentPuzzle.cluePositions) {
      return null;
    }
    
    for (const [clueNum, position] of Object.entries(this.currentPuzzle.cluePositions)) {
      if (position.row === row && position.col === col) {
        return clueNum;
      }
    }
    
    return null;
  }

  renderClues() {
    this.acrossCluesElement.innerHTML = Object.entries(this.currentPuzzle.acrossClues)
      .map(([num, clue]) => `<div class="clue-item" data-clue="${num}">${num}. ${clue}</div>`)
      .join('');

    this.downCluesElement.innerHTML = Object.entries(this.currentPuzzle.downClues)
      .map(([num, clue]) => `<div class="clue-item" data-clue="${num}">${num}. ${clue}</div>`)
      .join('');
  }

  bindEvents() {
    // Submit button (next to timer) — full puzzle check + completion
    if (this.submitButton) {
      this.submitButton.addEventListener('click', () => this.submitPuzzle());
    }
    this.resetButton.addEventListener('click', () => this.resetPuzzle());

    // Check dropdown toggle
    if (this.checkToggle) {
      this.checkToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCheckMenu();
      });
    }

    // Check menu items
    if (this.checkLetterBtn) {
      this.checkLetterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.checkLetter();
        this.closeCheckMenu();
      });
    }
    if (this.checkWordBtn) {
      this.checkWordBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.checkWord();
        this.closeCheckMenu();
      });
    }
    if (this.checkPuzzleBtn) {
      this.checkPuzzleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.checkPuzzle();
        this.closeCheckMenu();
      });
    }

    // Reveal dropdown toggle
    if (this.revealToggle) {
      this.revealToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRevealMenu();
      });
    }

    // Reveal menu items
    if (this.revealLetterBtn) {
      this.revealLetterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.revealLetter();
        this.closeRevealMenu();
      });
    }
    if (this.revealWordBtn) {
      this.revealWordBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.revealWord();
        this.closeRevealMenu();
      });
    }
    if (this.revealPuzzleBtn) {
      this.revealPuzzleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.revealPuzzle();
        this.closeRevealMenu();
      });
    }

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
      if (this.revealDropdown && !this.revealDropdown.contains(e.target)) {
        this.closeRevealMenu();
      }
      if (this.checkDropdown && !this.checkDropdown.contains(e.target)) {
        this.closeCheckMenu();
      }

      if (e.target.classList.contains('clue-item')) {
        const clueNum = e.target.dataset.clue;
        this.handleClueClick(clueNum);
        if (this.isMobileDevice) {
          this.updateKeyboardClue();
        }
      }
    });

    // Close menus on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeRevealMenu();
        this.closeCheckMenu();
      }
    });
  }

  // --- Reveal Dropdown ---

  toggleRevealMenu() {
    if (!this.revealMenu || !this.revealToggle) return;
    const isOpen = this.revealMenu.classList.contains('open');
    if (isOpen) {
      this.closeRevealMenu();
    } else {
      this.openRevealMenu();
    }
  }

  openRevealMenu() {
    if (!this.revealMenu || !this.revealToggle) return;
    this.revealMenu.classList.add('open');
    this.revealToggle.setAttribute('aria-expanded', 'true');
  }

  closeRevealMenu() {
    if (!this.revealMenu || !this.revealToggle) return;
    this.revealMenu.classList.remove('open');
    this.revealToggle.setAttribute('aria-expanded', 'false');
  }

  // --- Reveal Actions ---

  revealLetter() {
    if (!this.currentCell) {
      this.showMessage('Select a cell first', 'info');
      return;
    }

    const { row, col } = this.currentCell;
    const ans = this.currentPuzzle.answers?.[row]?.[col];

    if (typeof ans !== 'string' || ans.length !== 1) return;

    // Already correct — nothing to reveal
    if (this.userInputs[row][col] === ans) {
      this.showMessage('Already correct!', 'info');
      return;
    }

    this.userInputs[row][col] = ans;
    this.revealedCells.add(`${row},${col}`);

    // Update the input in the DOM
    const input = this.getInputAt(row, col);
    if (input) {
      input.value = ans;
    }

    // Apply revealed visual indicator to the cell
    this.applyRevealedClass(row, col);

    this.showMessage('Letter revealed', 'info');
  }

  revealWord() {
    if (!this.selectedWord || this.selectedWord.length === 0) {
      this.showMessage('Select a word first', 'info');
      return;
    }

    let alreadyComplete = true;

    this.selectedWord.forEach(({ row, col }) => {
      const ans = this.currentPuzzle.answers?.[row]?.[col];
      if (typeof ans !== 'string' || ans.length !== 1) return;

      if (this.userInputs[row][col] !== ans) {
        alreadyComplete = false;
        this.userInputs[row][col] = ans;
        this.revealedCells.add(`${row},${col}`);

        const input = this.getInputAt(row, col);
        if (input) {
          input.value = ans;
        }

        this.applyRevealedClass(row, col);
      }
    });

    if (alreadyComplete) {
      this.showMessage('Word already correct!', 'info');
    } else {
      this.showMessage('Word revealed', 'info');
    }
  }

  revealPuzzle() {
    const gridSize = this.currentPuzzle.answers.length;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const ans = this.currentPuzzle.answers?.[row]?.[col];
        if (typeof ans === 'string' && ans.length === 1) {
          if (this.userInputs[row][col] !== ans) {
            this.revealedCells.add(`${row},${col}`);
          }
          this.userInputs[row][col] = ans;
        }
      }
    }
    this.renderGrid();
    this.showMessage('Puzzle revealed!', 'info');
  }

  applyRevealedClass(row, col) {
    const gridSize = this.currentPuzzle.answers.length;
    const cellIndex = row * gridSize + col;
    const cellElement = this.gridElement.children[cellIndex];
    if (cellElement) {
      cellElement.classList.add('revealed');
    }
  }

  handleClueClick(clueNum) {
    // Determine direction - check if it's in across or down clues
    const isAcross = this.currentPuzzle.acrossClues.hasOwnProperty(clueNum);
    const direction = isAcross ? 'across' : 'down';
    
    // Get position from cluePositions
    const position = this.currentPuzzle.cluePositions[clueNum];
    if (!position) {
      console.warn(`No position found for clue ${clueNum}`);
      return;
    }
    
    // Reset click timing so clue navigation is never interpreted as
    // a double-tap direction toggle on the same cell.
    this.lastClickTime = 0;

    // Set direction BEFORE calling handleCellClick so word selection is correct
    this.currentDirection = direction;
    this.currentClueNumber = clueNum;
    this.handleCellClick(position.row, position.col);
    
    // Only focus on desktop - on mobile, focus triggers iOS keyboard
    if (!this.isMobileDevice) {
      const input = this.getInputAt(position.row, position.col);
      if (input) {
        input.focus();
      }
    }
    
    // Highlight the clue (already done by handleCellClick, but ensure it)
    this.highlightClue(clueNum);

    if (this.isMobileDevice) {
      this.showMobileKeyboard();
      this.updateKeyboardClue();
      // Scroll the grid into view so the user sees the highlighted word
      this.scrollToGrid();
    }
  }

  scrollToGrid() {
    if (!this.gridElement) return;
    // Suppress scroll-dismiss while we programmatically scroll
    this._programmaticScroll = true;
    this.gridElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Clear the flag after the smooth scroll finishes (~500ms)
    clearTimeout(this._scrollTimer);
    this._scrollTimer = setTimeout(() => {
      this._programmaticScroll = false;
    }, 600);
  }

  handleKeyDown(e, row, col) {
    const { key } = e;
    const gridSize = this.currentPuzzle.answers.length;
    let newRow = row, newCol = col;

    switch (key) {
      case 'Backspace':
        e.preventDefault();
        this.handleBackspace(row, col);
        return;
      case 'ArrowUp':
        newRow = Math.max(0, row - 1);
        this.currentDirection = 'down';
        break;
      case 'ArrowDown':
        newRow = Math.min(gridSize - 1, row + 1);
        this.currentDirection = 'down';
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, col - 1);
        this.currentDirection = 'across';
        break;
      case 'ArrowRight':
        newCol = Math.min(gridSize - 1, col + 1);
        this.currentDirection = 'across';
        break;
      default:
        return;
    }

    if (newRow !== row || newCol !== col) {
      e.preventDefault();
      if (this.currentPuzzle.answers[newRow][newCol] !== null) {
        const nextInput = this.getInputAt(newRow, newCol);
        if (nextInput) {
          nextInput.focus();
          // Highlight word when navigating with arrows
          this.handleCellClick(newRow, newCol);
          // Select existing text for easy override
          nextInput.select();
        }
      }
    }
  }

  handleBackspace(row, col) {
    // Clear current cell
    this.userInputs[row][col] = '';
    const currentInput = this.getInputAt(row, col);
    if (currentInput) {
      currentInput.value = '';
    }
    
    // Try to move to previous cell in selected word
    if (this.selectedWord) {
      const currentIndex = this.selectedWord.findIndex(
        cell => cell.row === row && cell.col === col
      );
      
      if (currentIndex > 0) {
        // Move to previous cell in word
        const prevCell = this.selectedWord[currentIndex - 1];
        const prevInput = this.getInputAt(prevCell.row, prevCell.col);
        if (prevInput) {
          if (!this.isMobileDevice) {
            prevInput.focus();
          }
          this.handleCellClick(prevCell.row, prevCell.col);
        }
        return;
      }
    }
    
    // Fallback: move based on current direction
    const gridSize = this.currentPuzzle.answers.length;
    let prevRow = row;
    let prevCol = col;
    
    if (this.currentDirection === 'across') {
      // Move left
      prevCol = col - 1;
      while (prevCol >= 0) {
        if (this.currentPuzzle.answers[prevRow][prevCol] !== null) {
          break; // Found valid cell
        }
        prevCol--;
      }
    } else {
      // Move up
      prevRow = row - 1;
      while (prevRow >= 0) {
        if (this.currentPuzzle.answers[prevRow][prevCol] !== null) {
          break; // Found valid cell
        }
        prevRow--;
      }
    }
    
    // Move focus if valid cell found
    if (prevRow >= 0 && prevCol >= 0 && 
        this.currentPuzzle.answers[prevRow][prevCol] !== null) {
      const prevInput = this.getInputAt(prevRow, prevCol);
      if (prevInput) {
        if (!this.isMobileDevice) {
          prevInput.focus();
        }
        this.handleCellClick(prevRow, prevCol);
      }
    }
  }

  getInputAt(row, col) {
    const gridSize = this.currentPuzzle.answers.length;
    const cells = this.gridElement.children;
    const cell = cells[row * gridSize + col];
    return cell ? cell.querySelector('input') : null;
  }

  // --- Check Dropdown ---

  toggleCheckMenu() {
    if (!this.checkMenu || !this.checkToggle) return;
    const isOpen = this.checkMenu.classList.contains('open');
    if (isOpen) {
      this.closeCheckMenu();
    } else {
      this.openCheckMenu();
    }
  }

  openCheckMenu() {
    if (!this.checkMenu || !this.checkToggle) return;
    this.checkMenu.classList.add('open');
    this.checkToggle.setAttribute('aria-expanded', 'true');
  }

  closeCheckMenu() {
    if (!this.checkMenu || !this.checkToggle) return;
    this.checkMenu.classList.remove('open');
    this.checkToggle.setAttribute('aria-expanded', 'false');
  }

  // --- Check Actions ---

  clearCheckIndicators() {
    const gridSize = this.currentPuzzle.answers.length;
    for (let i = 0; i < this.gridElement.children.length; i++) {
      this.gridElement.children[i].classList.remove('incorrect', 'correct-check');
    }
  }

  applyCellCheckClass(row, col, className) {
    const gridSize = this.currentPuzzle.answers.length;
    const cellIndex = row * gridSize + col;
    const cellElement = this.gridElement.children[cellIndex];
    if (cellElement) {
      cellElement.classList.add(className);
    }
  }

  checkLetter() {
    if (!this.currentCell) {
      this.showMessage('Select a cell first', 'info');
      return;
    }

    this.clearCheckIndicators();
    const { row, col } = this.currentCell;
    const ans = this.currentPuzzle.answers?.[row]?.[col];

    if (typeof ans !== 'string' || ans.length !== 1) return;

    if (!this.userInputs[row][col]) {
      this.showMessage('Cell is empty', 'info');
      return;
    }

    if (this.userInputs[row][col] === ans) {
      this.applyCellCheckClass(row, col, 'correct-check');
      this.showMessage('Correct!', 'success');
    } else {
      this.applyCellCheckClass(row, col, 'incorrect');
      this.showMessage('Incorrect', 'error');
    }

    // Auto-clear indicators after a delay
    setTimeout(() => this.clearCheckIndicators(), 3000);
  }

  checkWord() {
    if (!this.selectedWord || this.selectedWord.length === 0) {
      this.showMessage('Select a word first', 'info');
      return;
    }

    this.clearCheckIndicators();
    let allCorrect = true;
    let hasContent = false;

    this.selectedWord.forEach(({ row, col }) => {
      const ans = this.currentPuzzle.answers?.[row]?.[col];
      if (typeof ans !== 'string' || ans.length !== 1) return;

      if (this.userInputs[row][col]) {
        hasContent = true;
        if (this.userInputs[row][col] === ans) {
          this.applyCellCheckClass(row, col, 'correct-check');
        } else {
          this.applyCellCheckClass(row, col, 'incorrect');
          allCorrect = false;
        }
      } else {
        allCorrect = false;
      }
    });

    if (!hasContent) {
      this.showMessage('Word is empty', 'info');
    } else if (allCorrect) {
      this.showMessage('Word is correct!', 'success');
    } else {
      this.showMessage('Some letters are incorrect', 'error');
    }

    setTimeout(() => this.clearCheckIndicators(), 3000);
  }

  checkPuzzle() {
    this.clearCheckIndicators();
    const gridSize = this.currentPuzzle.answers.length;
    let correct = 0;
    let total = 0;
    let filled = 0;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const ans = this.currentPuzzle.answers?.[row]?.[col];
        if (typeof ans === 'string' && ans.length === 1) {
          total++;
          if (this.userInputs[row][col]) {
            filled++;
            if (this.userInputs[row][col] === ans) {
              correct++;
              this.applyCellCheckClass(row, col, 'correct-check');
            } else {
              this.applyCellCheckClass(row, col, 'incorrect');
            }
          }
        }
      }
    }

    this.showMessage(`${correct}/${total} correct (${filled} filled)`, correct === total ? 'success' : 'info');
    setTimeout(() => this.clearCheckIndicators(), 4000);
  }

  // --- Submit (full puzzle validation + completion) ---

  submitPuzzle() {
    if (this.puzzleCompleted) return;

    let correct = 0;
    let total = 0;
    const gridSize = this.currentPuzzle.answers.length;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const ans = this.currentPuzzle.answers?.[row]?.[col];
        if (typeof ans === 'string' && ans.length === 1) {
          total++;
          if (this.userInputs[row][col] === ans) {
            correct++;
          }
        }
      }
    }

    if (correct === total) {
      this.stopTimer();
      this.markAsSolved();
      this.showCompletionBanner();
    } else {
      this.showMessage(`${correct}/${total} correct. Keep trying!`, 'info');
    }
  }

  markAsSolved() {
    if (this.submitButton) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'Solved!';
      this.submitButton.classList.add('btn-solved');
    }
  }

  resetPuzzle() {
    this.userInputs = this.createEmptyGrid();
    this.revealedCells.clear();
    this.renderGrid();
    this.showMessage('Puzzle reset!', 'info');
  }

  highlightClue(clueNum) {
    // Remove highlight from all clues
    document.querySelectorAll('.clue-item').forEach(item => {
      item.classList.remove('highlight');
    });
    
    // Find and highlight the target clue
    const clueElement = document.querySelector(`[data-clue="${clueNum}"]`);
    if (clueElement) {
      clueElement.classList.add('highlight');
      console.log('✓ Highlighted clue:', clueNum);
    } else {
      console.warn('⚠️ Clue element not found for clue number:', clueNum);
      console.warn('   Available clue numbers:', 
        Array.from(document.querySelectorAll('.clue-item')).map(el => el.dataset.clue)
      );
    }
  }

  showMessage(text, type) {
    this.messageElement.textContent = text;
    this.messageElement.className = `crossword-message message-${type}`;
    setTimeout(() => {
      this.messageElement.textContent = '';
      this.messageElement.className = 'crossword-message';
    }, 3000);
  }
}

// Initialize the crossword when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new CrosswordPuzzle();
});
