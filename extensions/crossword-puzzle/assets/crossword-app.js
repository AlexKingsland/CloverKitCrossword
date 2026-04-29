// Coordinator class for crossword experience
(function () {
  const DEBUG = false;

  class CrosswordPuzzle {
    constructor(rootElement) {
      this._listeners = [];
      this._resizeHandler = null;
      this._scrollTimer = null;

      this.containerElement = rootElement;
      this.titleElement = rootElement.querySelector('.crossword-title');
      this.storefrontDailyTitle = 'Daily Crossword';
      this.rotateOverlayElement = rootElement.querySelector('#crossword-rotate-overlay');
      this.collapsibleContentElement = rootElement.querySelector('#crossword-collapsible-content');
      this.collapsedCoverButton = rootElement.querySelector('#crossword-collapsed-cover');
      this.closeButton = rootElement.querySelector('#crossword-close-button');
      this.gridElement = rootElement.querySelector('#crossword-grid');
      this.acrossCluesElement = rootElement.querySelector('#across-clues');
      this.downCluesElement = rootElement.querySelector('#down-clues');
      this.messageElement = rootElement.querySelector('#crossword-message');

      // Toolbar elements
      this.timerDisplay = rootElement.querySelector('#timer-display');
      this.timerPauseBtn = rootElement.querySelector('#timer-pause-btn');
      this.submitButton = rootElement.querySelector('#submit-puzzle');
      this.toolbarHelpBtn = rootElement.querySelector('#toolbar-help-btn');
      this.toolbarSettingsBtn = rootElement.querySelector('#toolbar-settings-btn');

      // Help modal elements
      this.helpModalOverlay = rootElement.querySelector('#help-modal-overlay');
      this.helpModalClose = rootElement.querySelector('#help-modal-close');
      this.howToPlayBtn = rootElement.querySelector('#how-to-play-btn');
      this.helpInstructions = rootElement.querySelector('#help-instructions');
      this.checkLetterBtn = rootElement.querySelector('#check-letter');
      this.checkWordBtn = rootElement.querySelector('#check-word');
      this.checkPuzzleBtn = rootElement.querySelector('#check-puzzle');
      this.revealLetterBtn = rootElement.querySelector('#reveal-letter');
      this.revealWordBtn = rootElement.querySelector('#reveal-word');
      this.revealPuzzleBtn = rootElement.querySelector('#reveal-puzzle');
      this.resetButton = rootElement.querySelector('#reset-puzzle');

      // Settings modal elements
      this.settingsModalOverlay = rootElement.querySelector('#settings-modal-overlay');
      this.settingsModalClose = rootElement.querySelector('#settings-modal-close');
      this.darkModeToggle = rootElement.querySelector('#setting-dark-mode');
      this.skipFilledToggle = rootElement.querySelector('#setting-skip-filled');
      this.nextPuzzleCountdown = rootElement.querySelector('#next-puzzle-countdown');
      this.settingsTodayTheme = rootElement.querySelector('#settings-today-theme');
      this.settingsTomorrowTheme = rootElement.querySelector('#settings-tomorrow-theme');

      this.difficulty = rootElement.dataset.difficulty || 'medium';

      this.currentPuzzle = null;
      this.userInputs = null;
      this.revealedCells = new Set();
      this.isLoading = true;
      this.plan = null;

      this.startTime = null;
      this.elapsedTime = 0;
      this.timerInterval = null;
      this.puzzleCompleted = false;
      this._analyticsStartFired = false;

      this.currentDirection = 'across';
      this.selectedWord = null;
      this.lastClickTime = 0;
      this.currentCell = null;
      this.currentClueNumber = null;

      this.isMobileDevice = this.detectMobileDevice();
      this.mobileKeyboard = rootElement.querySelector('#mobile-keyboard');
      this.keyboardClueText = rootElement.querySelector('#keyboard-clue-text');
      this.keyboardPrevBtn = rootElement.querySelector('#keyboard-prev-clue');
      this.keyboardNextBtn = rootElement.querySelector('#keyboard-next-clue');

      this.mobileLandscapeMediaQuery = window.matchMedia('(orientation: landscape)');
      this.mobilePointerQuery = window.matchMedia('(pointer: coarse)');
      this.boundOrientationHandler = this.updateMobileOrientationState.bind(this);

      // Settings state (persisted in localStorage)
      this.skipFilledLetters = true;
      this.darkMode = false;
      this.loadSettings();

      this.bindOrientationEvents();
      this.updateMobileOrientationState();
      this.applyResolvedTitle();
      this.bindCollapseEvents();
      this.setCollapsedState(true);

      // Keep the cover button disabled until the plan check resolves.
      // This prevents merchants without a plan from expanding the crossword
      // during the brief async window before showNotActivatedState() fires.
      if (this.collapsedCoverButton) {
        this.collapsedCoverButton.disabled = true;
      }

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
      if (isCollapsed) {
        this.pauseTimer();
      } else {
        if (this.currentPuzzle && !this.timerInterval && !this.isPaused) {
          this.startTimer();
        } else {
          this.resumeTimer();
        }
        if (!this._analyticsStartFired && window.CloverKitAnalytics) {
          this._analyticsStartFired = true;
          var shopDomain = this.containerElement.dataset.shopDomain || '';
          window.CloverKitAnalytics.trackPuzzleStarted(shopDomain, this.difficulty, this.plan);
        }
      }
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

    async checkPlanStatus(shopDomain) {
      try {
        const appUrl = (this.containerElement && this.containerElement.dataset.appUrl)
          || 'https://app.cloverkitstudio.com';
        const res = await fetch(`${appUrl}/api/shop-status?shop=${encodeURIComponent(shopDomain)}`);
        if (!res.ok) return { plan: 'free', hasAccess: true }; // fail open
        return await res.json();
      } catch {
        return { plan: 'free', hasAccess: true }; // fail open on network error
      }
    }

    showNotActivatedState() {
      if (!this.containerElement) return;

      var isDesignMode = window.Shopify && window.Shopify.designMode;

      if (!isDesignMode) {
        // On the live storefront, hide the whole section so customers never see it.
        // The merchant will see the activation overlay in the theme editor instead.
        var section = this.containerElement.closest('.shopify-section') || this.containerElement;
        section.style.display = 'none';
        return;
      }

      // Clear the grid only when showing the overlay in the theme editor
      if (this.gridElement) this.gridElement.innerHTML = '';

      // --- Theme editor: show merchant-facing activation overlay ---
      var shopDomain = this.containerElement.dataset.shopDomain || '';
      var storeHandle = shopDomain.replace('.myshopify.com', '');
      var appHandle = this.containerElement.dataset.appHandle || 'cloverkit-crossword';
      var pricingUrl = storeHandle
        ? 'https://admin.shopify.com/store/' + storeHandle + '/apps/' + appHandle + '/app/pricing'
        : 'https://app.cloverkitstudio.com';

      // Ensure the container is tall enough to show the full overlay
      var currentPosition = window.getComputedStyle(this.containerElement).position;
      if (currentPosition === 'static') {
        this.containerElement.style.position = 'relative';
      }
      this.containerElement.style.minHeight = '320px';

      // Render a full blocking overlay over the entire crossword container
      var overlay = document.createElement('div');
      overlay.style.cssText =
        'position:absolute;top:0;right:0;bottom:0;left:0;z-index:999;' +
        'background:rgba(255,255,255,0.97);' +
        'display:flex;align-items:center;justify-content:center;' +
        'border-radius:inherit;';
      overlay.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;gap:20px;padding:40px 48px;max-width:700px;width:90%;text-align:center;">' +
        '<div style="width:56px;height:56px;border-radius:50%;background:#f0faf7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#008060" stroke-width="2"/>' +
        '<path d="M7 11V7a5 5 0 0110 0v4" stroke="#008060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
        '</div>' +
        '<div style="font-size:20px;font-weight:700;color:#202223;">One quick step to activate</div>' +
        '<div style="font-size:16px;color:#6d7175;line-height:1.6;">CloverKit Crossword is free to use. Activate your free plan to add the crossword to your storefront — no credit card required.</div>' +
        '<a href="' + pricingUrl + '" target="_top" ' +
        'style="display:inline-block;padding:12px 28px;background:#008060;color:#fff;border-radius:8px;' +
        'font-size:16px;font-weight:600;text-decoration:none;cursor:pointer;">' +
        'Activate for free →' +
        '</a>' +
        '</div>';

      this.containerElement.appendChild(overlay);
    }

    applyFreePlanRestrictions() {
      this.difficulty = 'easy';
      if (this.containerElement) {
        this.containerElement.dataset.difficulty = 'easy';
      }
      // Add a locked-features banner to the settings modal
      const modalBody = this.settingsModalOverlay
        ? this.settingsModalOverlay.querySelector('.modal-body')
        : null;
      if (modalBody) {
        const lockBanner = document.createElement('div');
        lockBanner.style.cssText =
          'margin-top:14px;padding:12px 14px;background:#f6f6f7;border-radius:8px;' +
          'border:1px solid #e1e3e5;display:flex;align-items:flex-start;gap:10px;';
        lockBanner.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" flex-shrink="0" style="margin-top:1px" aria-hidden="true">' +
          '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#6d7175" stroke-width="2"/>' +
          '<path d="M7 11V7a5 5 0 0110 0v4" stroke="#6d7175" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
          '<div style="font-size:13px;color:#6d7175;line-height:1.4;">' +
          '<strong style="color:#202223;">Difficulty &amp; Theme Color</strong><br>' +
          'Upgrade to Pro to customize difficulty and accent color.' +
          '</div>';
        modalBody.appendChild(lockBanner);
      }
    }

    async initialize() {
      this.debug('🎯 Initializing crossword for difficulty:', this.difficulty);
      try {
        this.showLoadingState();
        const shopDomain = this.containerElement
          ? (this.containerElement.dataset.shopDomain || '')
          : '';
        const planStatus = await this.checkPlanStatus(shopDomain);
        if (!planStatus.hasAccess) {
          this.showNotActivatedState();
          return;
        }
        // Plan verified — re-enable the cover button so the crossword can be opened
        if (this.collapsedCoverButton) {
          this.collapsedCoverButton.disabled = false;
        }
        this.plan = planStatus.plan || 'free';
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
          title: data.title || null,
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
      if (this.settingsTodayTheme && this.currentPuzzle.title) {
        this.settingsTodayTheme.textContent = this.currentPuzzle.title;
      }
      this.fetchTomorrowTheme();
      this.bindEvents();
      if (this.isMobileDevice) this.initMobileKeyboard();
      this._resizeHandler = () => {
        this.updateCellSize();
        this.syncCluesHeight();
      };
      this.addTrackedListener(window, 'resize', this._resizeHandler);
      this.syncCluesHeight();
      // Timer starts on first expand, not at load time, so two collapsed
      // crosswords on the same page don't share an identical elapsed time.
    }

    async fetchTomorrowTheme() {
      if (!this.settingsTomorrowTheme) return;
      try {
        const title = await window.CrosswordDataService.fetchTomorrowTitle(this.difficulty);
        if (title) {
          this.settingsTomorrowTheme.textContent = `Tomorrow: ${title}`;
        }
      } catch (_) {
        // silently ignore — tomorrow's puzzle may not be generated yet
      }
    }

    bindEvents() {
      this.bindMenuEvents();
      this.bindActionEvents();
      this.addTrackedListener(document, 'click', (e) => {
        if (e.target.classList.contains('clue-item') && this.containerElement.contains(e.target)) {
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
      if (currentIndex < 0 || currentIndex >= this.selectedWord.length - 1) return;

      // Find the next cell, optionally skipping filled cells
      for (let i = currentIndex + 1; i < this.selectedWord.length; i++) {
        const candidate = this.selectedWord[i];
        if (this.skipFilledLetters && this.userInputs[candidate.row][candidate.col]) {
          continue; // skip filled cells
        }
        const nextInput = this.getInputAt(candidate.row, candidate.col);
        if (nextInput) {
          if (!this.isMobileDevice) nextInput.focus();
          this.handleCellClick(candidate.row, candidate.col);
        }
        return;
      }

      // If skip-filled is on and all remaining cells are filled, just go to the next cell
      const fallback = this.selectedWord[currentIndex + 1];
      const fallbackInput = this.getInputAt(fallback.row, fallback.col);
      if (fallbackInput) {
        if (!this.isMobileDevice) fallbackInput.focus();
        this.handleCellClick(fallback.row, fallback.col);
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
          if (e.shiftKey) {
            this.navigateToPreviousClue();
          } else {
            this.navigateToNextClue();
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
      if (this._countdownInterval) {
        clearInterval(this._countdownInterval);
        this._countdownInterval = null;
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