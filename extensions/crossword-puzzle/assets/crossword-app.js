// Coordinator class for crossword experience
(function () {
  const DEBUG = false;

  class CrosswordPuzzle {
    constructor() {
      this._listeners = [];
      this._resizeHandler = null;
      this._scrollTimer = null;

      this.containerElement = document.querySelector('.crossword-container');
      this.titleElement = document.querySelector('.crossword-title');
      this.storefrontDailyTitle = 'Daily Crossword';
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

      const container = document.querySelector('.crossword-container');
      this.difficulty = container ? container.dataset.difficulty : 'medium';

      this.currentPuzzle = null;
      this.userInputs = null;
      this.revealedCells = new Set();
      this.isLoading = true;

      this.startTime = null;
      this.elapsedTime = 0;
      this.timerInterval = null;
      this.puzzleCompleted = false;

      this.currentDirection = 'across';
      this.selectedWord = null;
      this.lastClickTime = 0;
      this.currentCell = null;
      this.currentClueNumber = null;

      this.isMobileDevice = this.detectMobileDevice();
      this.mobileKeyboard = document.getElementById('mobile-keyboard');
      this.keyboardClueText = document.getElementById('keyboard-clue-text');
      this.keyboardPrevBtn = document.getElementById('keyboard-prev-clue');
      this.keyboardNextBtn = document.getElementById('keyboard-next-clue');

      this.mobileLandscapeMediaQuery = window.matchMedia('(orientation: landscape)');
      this.mobilePointerQuery = window.matchMedia('(pointer: coarse)');
      this.boundOrientationHandler = this.updateMobileOrientationState.bind(this);

      this.bindOrientationEvents();
      this.updateMobileOrientationState();
      this.applyResolvedTitle();
      this.bindCollapseEvents();
      this.setCollapsedState(true);

      this.initialize();
    }

    debug(...args) {
      if (DEBUG) console.log(...args);
    }

    addTrackedListener(target, event, handler, options) {
      if (!target || !target.addEventListener) return;
      target.addEventListener(event, handler, options);
      this._listeners.push({ target, event, handler, options });
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
        this.addTrackedListener(this.collapsedCoverButton, 'click', () => this.setCollapsedState(false));
      }
      if (this.closeButton) {
        this.addTrackedListener(this.closeButton, 'click', () => this.setCollapsedState(true));
      }
      if (this.titleElement) {
        this.addTrackedListener(this.titleElement, 'click', () => {
          if (this.containerElement && this.containerElement.classList.contains('is-expanded')) {
            this.setCollapsedState(true);
          }
        });
        this.addTrackedListener(this.titleElement, 'keydown', (e) => {
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
      if (isCollapsed) this.pauseTimer();
      else this.resumeTimer();
    }

    bindOrientationEvents() {
      if (this.mobileLandscapeMediaQuery && this.mobileLandscapeMediaQuery.addEventListener) {
        this.mobileLandscapeMediaQuery.addEventListener('change', this.boundOrientationHandler);
      } else if (this.mobileLandscapeMediaQuery && this.mobileLandscapeMediaQuery.addListener) {
        this.mobileLandscapeMediaQuery.addListener(this.boundOrientationHandler);
      }
      this.addTrackedListener(window, 'resize', this.boundOrientationHandler);
      this.addTrackedListener(window, 'orientationchange', this.boundOrientationHandler);
    }

    updateMobileOrientationState() {
      if (!this.containerElement || !this.rotateOverlayElement) return;
      const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const isLandscape = viewportWidth > viewportHeight;
      const hasTouch = ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
      const coarsePointer = this.mobilePointerQuery ? this.mobilePointerQuery.matches : false;
      const shortestSide = Math.min(viewportWidth, viewportHeight);
      const isMobileDevice = shortestSide <= 900 && (hasTouch || coarsePointer);
      const isBlocked = isMobileDevice && isLandscape;
      this.containerElement.classList.toggle('mobile-landscape-blocked', isBlocked);
      if (isBlocked && document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }

    async initialize() {
      this.debug('🎯 Initializing crossword for difficulty:', this.difficulty);
      try {
        this.showLoadingState();
        await this.loadPuzzleFromR2();
        this.userInputs = this.createEmptyGrid();
        this.isLoading = false;
        this.init();
      } catch (error) {
        this.isLoading = false;
        console.error('Failed to initialize crossword:', error);
      }
    }

    async loadPuzzleFromR2() {
      try {
        const data = await window.CrosswordDataService.fetchPuzzle(this.difficulty, (...args) => this.debug(...args));
        this.currentPuzzle = {
          acrossClues: data.acrossClues,
          downClues: data.downClues,
          answers: data.answers,
          cluePositions: data.cluePositions,
        };
      } catch (error) {
        console.error('❌ Failed to load puzzle from R2:', error.message);
        this.showErrorState(error.message);
        throw error;
      }
    }

    showErrorState(errorMessage) {
      this.gridElement.innerHTML = `<div class="error-state" style="padding: 2rem; text-align: center; color: #d32f2f;"><h3>⚠️ Unable to Load Puzzle</h3><p>Failed to fetch puzzle from API.</p><p style="font-size: 0.9em; color: #666;">${errorMessage}</p><button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">Retry</button></div>`;
    }

    showLoadingState() {
      this.gridElement.innerHTML = '<div class="loading-state">Loading puzzle...</div>';
    }

    createEmptyGrid() {
      const size = this.currentPuzzle.answers.length;
      return Array(size).fill().map(() => Array(size).fill(''));
    }

    init() {
      const gridSize = this.currentPuzzle.answers.length;
      this.gridElement.style.setProperty('--grid-size', gridSize);
      this.updateCellSize();
      this.renderGrid();
      this.renderClues();
      this.bindEvents();
      if (this.isMobileDevice) this.initMobileKeyboard();
      this._resizeHandler = () => this.updateCellSize();
      this.addTrackedListener(window, 'resize', this._resizeHandler);
      this.startTimer();
    }

    bindEvents() {
      this.bindMenuEvents();
      this.bindActionEvents();
      this.addTrackedListener(document, 'click', (e) => {
        if (e.target.classList.contains('clue-item')) {
          const clueNum = e.target.dataset.clue;
          this.handleClueClick(clueNum);
          if (this.isMobileDevice) this.updateKeyboardClue();
        }
      });
    }

    handleCellClick(row, col) {
      const now = Date.now();
      const isDoubleClick = (now - this.lastClickTime) < 300;
      this.lastClickTime = now;
      if (isDoubleClick && this.currentCell && this.currentCell.row === row && this.currentCell.col === col) {
        this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
      }

      let word = this.findWordAt(row, col, this.currentDirection);
      if (!word) {
        const oppositeDirection = this.currentDirection === 'across' ? 'down' : 'across';
        word = this.findWordAt(row, col, oppositeDirection);
        if (word) this.currentDirection = oppositeDirection;
      }

      if (word) {
        this.selectedWord = word;
        this.highlightWord(word, row, col);
        const clueNum = this.getClueNumberForWord(word, this.currentDirection);
        if (clueNum) {
          this.currentClueNumber = clueNum;
          this.highlightClue(clueNum);
        } else {
          this.currentClueNumber = null;
        }
      }

      this.currentCell = { row, col };
      if (!this.isMobileDevice) {
        const input = this.getInputAt(row, col);
        if (input && input.value) input.select();
      }
    }

    handleClueClick(clueNum) {
      const isAcross = this.currentPuzzle.acrossClues.hasOwnProperty(clueNum);
      const direction = isAcross ? 'across' : 'down';
      const position = this.currentPuzzle.cluePositions[clueNum];
      if (!position) return;
      this.lastClickTime = 0;
      this.currentDirection = direction;
      this.currentClueNumber = clueNum;
      this.handleCellClick(position.row, position.col);
      if (!this.isMobileDevice) {
        const input = this.getInputAt(position.row, position.col);
        if (input) input.focus();
      }
      this.highlightClue(clueNum);
      if (this.isMobileDevice) {
        this.showMobileKeyboard();
        this.updateKeyboardClue();
        this.scrollToGrid();
      }
    }

    advanceToNextCell(row, col) {
      if (!this.selectedWord) return;
      const currentIndex = this.selectedWord.findIndex((cell) => cell.row === row && cell.col === col);
      if (currentIndex >= 0 && currentIndex < this.selectedWord.length - 1) {
        const nextCell = this.selectedWord[currentIndex + 1];
        const nextInput = this.getInputAt(nextCell.row, nextCell.col);
        if (nextInput) {
          if (!this.isMobileDevice) nextInput.focus();
          this.handleCellClick(nextCell.row, nextCell.col);
        }
      }
    }

    findNextAnswerCell(row, col, reverse = false) {
      const gridSize = this.currentPuzzle.answers.length;
      const totalCells = gridSize * gridSize;
      const startIndex = row * gridSize + col;

      for (let step = 1; step < totalCells; step++) {
        const offset = reverse ? -step : step;
        const wrappedIndex = (startIndex + offset + totalCells) % totalCells;
        const nextRow = Math.floor(wrappedIndex / gridSize);
        const nextCol = wrappedIndex % gridSize;

        if (this.currentPuzzle.answers[nextRow][nextCol] !== null) {
          return { row: nextRow, col: nextCol };
        }
      }

      return null;
    }

    handleKeyDown(e, row, col) {
      const { key } = e;
      const gridSize = this.currentPuzzle.answers.length;
      let newRow = row;
      let newCol = col;
      switch (key) {
        case 'Backspace':
          e.preventDefault();
          this.handleBackspace(row, col);
          return;
        case 'Tab': {
          e.preventDefault();
          const nextCell = this.findNextAnswerCell(row, col, e.shiftKey);
          if (nextCell) {
            const nextInput = this.getInputAt(nextCell.row, nextCell.col);
            if (nextInput) {
              nextInput.focus();
              this.handleCellClick(nextCell.row, nextCell.col);
              nextInput.select();
            }
          }
          return;
        }
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
            this.handleCellClick(newRow, newCol);
            nextInput.select();
          }
        }
      }
    }

    handleBackspace(row, col) {
      this.userInputs[row][col] = '';
      const currentInput = this.getInputAt(row, col);
      if (currentInput) currentInput.value = '';

      if (this.selectedWord) {
        const currentIndex = this.selectedWord.findIndex((cell) => cell.row === row && cell.col === col);
        if (currentIndex > 0) {
          const prevCell = this.selectedWord[currentIndex - 1];
          const prevInput = this.getInputAt(prevCell.row, prevCell.col);
          if (prevInput) {
            if (!this.isMobileDevice) prevInput.focus();
            this.handleCellClick(prevCell.row, prevCell.col);
          }
          return;
        }
      }

      const gridSize = this.currentPuzzle.answers.length;
      let prevRow = row;
      let prevCol = col;
      if (this.currentDirection === 'across') {
        prevCol = col - 1;
        while (prevCol >= 0) {
          if (this.currentPuzzle.answers[prevRow][prevCol] !== null) break;
          prevCol--;
        }
      } else {
        prevRow = row - 1;
        while (prevRow >= 0) {
          if (this.currentPuzzle.answers[prevRow][prevCol] !== null) break;
          prevRow--;
        }
      }

      if (prevRow >= 0 && prevCol >= 0 && this.currentPuzzle.answers[prevRow][prevCol] !== null) {
        const prevInput = this.getInputAt(prevRow, prevCol);
        if (prevInput) {
          if (!this.isMobileDevice) prevInput.focus();
          this.handleCellClick(prevRow, prevCol);
        }
      }
    }

    destroy() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      clearTimeout(this._scrollTimer);

      this._listeners.forEach(({ target, event, handler, options }) => {
        if (target && target.removeEventListener) {
          target.removeEventListener(event, handler, options);
        }
      });
      this._listeners = [];

      if (this.mobileLandscapeMediaQuery && this.mobileLandscapeMediaQuery.removeEventListener) {
        this.mobileLandscapeMediaQuery.removeEventListener('change', this.boundOrientationHandler);
      } else if (this.mobileLandscapeMediaQuery && this.mobileLandscapeMediaQuery.removeListener) {
        this.mobileLandscapeMediaQuery.removeListener(this.boundOrientationHandler);
      }
    }
  }

  window.CrosswordGridUtilsModule.applyGridUtilsModule(CrosswordPuzzle.prototype);
  window.CrosswordTimerModule.applyTimerModule(CrosswordPuzzle.prototype);
  window.CrosswordRendererModule.applyRendererModule(CrosswordPuzzle.prototype);
  window.CrosswordMenusModule.applyMenusModule(CrosswordPuzzle.prototype);
  window.CrosswordActionsModule.applyActionsModule(CrosswordPuzzle.prototype);
  window.CrosswordMobileKeyboardModule.applyMobileKeyboardModule(CrosswordPuzzle.prototype);

  window.CrosswordPuzzleApp = CrosswordPuzzle;
})();