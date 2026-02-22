// Mobile keyboard + clue navigation behaviors
(function () {
  function applyMobileKeyboardModule(proto) {
    proto.detectMobileDevice = function detectMobileDevice() {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const coarsePointer = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      const isMobile = hasTouch && coarsePointer;
      this.debug('🔍 Mobile Detection:', { hasTouch, coarsePointer, isMobile, userAgent: navigator.userAgent });
      return isMobile;
    };

    proto.initMobileKeyboard = function initMobileKeyboard() {
      if (!this.mobileKeyboard) return;

      const keys = this.mobileKeyboard.querySelectorAll('.keyboard-key');
      keys.forEach((key) => {
        this.addTrackedListener(key, 'touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleMobileKeyPress(key.dataset.key);
        }, { passive: false });

        this.addTrackedListener(key, 'click', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });

      if (this.keyboardPrevBtn) {
        this.addTrackedListener(this.keyboardPrevBtn, 'touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.navigateToPreviousClue();
        }, { passive: false });
      }

      if (this.keyboardNextBtn) {
        this.addTrackedListener(this.keyboardNextBtn, 'touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.navigateToNextClue();
        }, { passive: false });
      }

      let swipeStartY = null;
      const SWIPE_THRESHOLD = 40;
      this.addTrackedListener(this.mobileKeyboard, 'touchstart', (e) => {
        if (e.touches.length === 1) swipeStartY = e.touches[0].clientY;
      }, { passive: true });

      this.addTrackedListener(this.mobileKeyboard, 'touchmove', (e) => {
        if (swipeStartY === null || e.touches.length !== 1) return;
        if (e.touches[0].clientY - swipeStartY > SWIPE_THRESHOLD) {
          swipeStartY = null;
          this.hideMobileKeyboard();
        }
      }, { passive: true });

      this.addTrackedListener(this.mobileKeyboard, 'touchend', () => {
        swipeStartY = null;
      }, { passive: true });

      const rows = this.mobileKeyboard.querySelectorAll('.keyboard-row');
      rows.forEach((row) => {
        this.addTrackedListener(row, 'touchstart', (e) => {
          if (e.target.closest('.keyboard-key')) return;
          const touch = e.touches[0];
          let closestKey = null;
          let closestDist = Infinity;
          row.querySelectorAll('.keyboard-key').forEach((key) => {
            const r = key.getBoundingClientRect();
            const dist = Math.hypot(touch.clientX - (r.left + r.width / 2), touch.clientY - (r.top + r.height / 2));
            if (dist < closestDist) {
              closestDist = dist;
              closestKey = key;
            }
          });
          if (closestKey) {
            e.preventDefault();
            e.stopPropagation();
            this.handleMobileKeyPress(closestKey.dataset.key);
          }
        }, { passive: false });
      });

      const keysContainer = this.mobileKeyboard.querySelector('.keyboard-keys');
      if (keysContainer) {
        this.addTrackedListener(keysContainer, 'touchstart', (e) => {
          if (e.target.closest('.keyboard-key') || e.target.closest('.keyboard-row')) return;
          const touch = e.touches[0];
          let closestKey = null;
          let closestDist = Infinity;
          keysContainer.querySelectorAll('.keyboard-key').forEach((key) => {
            const r = key.getBoundingClientRect();
            const dist = Math.hypot(touch.clientX - (r.left + r.width / 2), touch.clientY - (r.top + r.height / 2));
            if (dist < closestDist) {
              closestDist = dist;
              closestKey = key;
            }
          });
          if (closestKey) {
            e.preventDefault();
            e.stopPropagation();
            this.handleMobileKeyPress(closestKey.dataset.key);
          }
        }, { passive: false });
      }

      this._programmaticScroll = false;
      this.addTrackedListener(window, 'scroll', () => {
        if (this._programmaticScroll) return;
        if (this.mobileKeyboard && this.mobileKeyboard.classList.contains('visible')) this.hideMobileKeyboard();
      }, { passive: true });

      this.addTrackedListener(document, 'click', (e) => {
        const isGridClick = e.target.closest('#crossword-grid');
        const isClueClick = e.target.closest('.crossword-clues');
        const isKeyboardClick = e.target.closest('#mobile-keyboard');
        if (!isGridClick && !isClueClick && !isKeyboardClick) this.hideMobileKeyboard();
      });
    };

    proto.showMobileKeyboard = function showMobileKeyboard() {
      if (!this.mobileKeyboard) return;
      this.mobileKeyboard.classList.add('visible');
      if (this.containerElement) this.containerElement.classList.add('keyboard-visible');
    };

    proto.hideMobileKeyboard = function hideMobileKeyboard() {
      if (!this.mobileKeyboard) return;
      this.mobileKeyboard.classList.remove('visible');
      if (this.containerElement) this.containerElement.classList.remove('keyboard-visible');
    };

    proto.updateKeyboardClue = function updateKeyboardClue() {
      if (!this.keyboardClueText || !this.selectedWord || !this.currentCell) return;
      const clueNum = this.getClueNumberForWord(this.selectedWord, this.currentDirection);
      if (!clueNum) {
        this.keyboardClueText.textContent = 'Select a cell to start';
        return;
      }
      const clueText = this.currentDirection === 'across' ? this.currentPuzzle.acrossClues[clueNum] : this.currentPuzzle.downClues[clueNum];
      if (clueText) this.keyboardClueText.textContent = `${clueNum}. ${clueText}`;
    };

    proto.handleMobileKeyPress = function handleMobileKeyPress(key) {
      if (!this.currentCell) return;
      if (key === 'Dismiss') return this.hideMobileKeyboard();
      if (key === 'Backspace') {
        this.handleBackspace(this.currentCell.row, this.currentCell.col);
        return this.updateKeyboardClue();
      }
      if (key.length === 1) {
        const { row, col } = this.currentCell;
        this.userInputs[row][col] = key.toUpperCase();
        const input = this.getInputAt(row, col);
        if (input) input.value = key.toUpperCase();
        this.advanceToNextCell(row, col);
        this.updateKeyboardClue();
      }
    };

    proto.getAllCluesOrdered = function getAllCluesOrdered() {
      const clues = [];
      Object.keys(this.currentPuzzle.acrossClues).forEach((num) => clues.push({ num, direction: 'across' }));
      Object.keys(this.currentPuzzle.downClues).forEach((num) => clues.push({ num, direction: 'down' }));
      return clues.sort((a, b) => {
        const numA = parseInt(a.num, 10);
        const numB = parseInt(b.num, 10);
        if (numA !== numB) return numA - numB;
        return a.direction === 'across' ? -1 : 1;
      });
    };

    proto.getCurrentClueNumber = function getCurrentClueNumber() {
      if (this.currentClueNumber) return this.currentClueNumber;
      if (!this.selectedWord) return null;
      return this.getClueNumberForWord(this.selectedWord, this.currentDirection);
    };

    proto.navigateToClue = function navigateToClue(clueNum, direction) {
      const position = this.currentPuzzle.cluePositions[clueNum];
      if (!position) return;
      this.lastClickTime = 0;
      this.currentDirection = direction;
      this.handleCellClick(position.row, position.col);
      this.currentDirection = direction;
      this.currentClueNumber = clueNum;
      if (!this.isMobileDevice) {
        const input = this.getInputAt(position.row, position.col);
        if (input) input.focus();
      }
      this.highlightClue(clueNum);
      this.updateKeyboardClue();
    };

    proto.navigateToPreviousClue = function navigateToPreviousClue() {
      const allClues = this.getAllCluesOrdered();
      if (allClues.length === 0) return;
      const currentClueNum = this.getCurrentClueNumber();
      if (!currentClueNum) return this.navigateToClue(allClues[0].num, allClues[0].direction);
      const currentIndex = allClues.findIndex((c) => c.num === currentClueNum && c.direction === this.currentDirection);
      const targetClue = currentIndex > 0 ? allClues[currentIndex - 1] : allClues[allClues.length - 1];
      if (targetClue) this.navigateToClue(targetClue.num, targetClue.direction);
    };

    proto.navigateToNextClue = function navigateToNextClue() {
      const allClues = this.getAllCluesOrdered();
      if (allClues.length === 0) return;
      const currentClueNum = this.getCurrentClueNumber();
      if (!currentClueNum) return this.navigateToClue(allClues[0].num, allClues[0].direction);
      const currentIndex = allClues.findIndex((c) => c.num === currentClueNum && c.direction === this.currentDirection);
      const targetClue = currentIndex >= 0 && currentIndex < allClues.length - 1 ? allClues[currentIndex + 1] : allClues[0];
      if (targetClue) this.navigateToClue(targetClue.num, targetClue.direction);
    };

    proto.scrollToGrid = function scrollToGrid() {
      if (!this.gridElement) return;
      this._programmaticScroll = true;
      this.gridElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => {
        this._programmaticScroll = false;
      }, 600);
    };
  }

  window.CrosswordMobileKeyboardModule = { applyMobileKeyboardModule };
})();