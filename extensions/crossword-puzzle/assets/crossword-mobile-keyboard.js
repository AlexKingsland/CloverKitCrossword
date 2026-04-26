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

      // Cache keyboard layout panels
      this._keyboardLetters = this.mobileKeyboard.querySelector('#keyboard-letters');
      this._keyboardNumbers = this.mobileKeyboard.querySelector('#keyboard-numbers');

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

      const SCROLL_HIDE_DELTA_THRESHOLD = 24;
      this._programmaticScroll = false;
      this._lastScrollY = window.scrollY || window.pageYOffset || 0;
      this.addTrackedListener(window, 'scroll', () => {
        const currentScrollY = window.scrollY || window.pageYOffset || 0;
        const scrollDelta = currentScrollY - this._lastScrollY;
        this._lastScrollY = currentScrollY;

        if (this._programmaticScroll) return;

        const isKeyboardVisible = this.mobileKeyboard && this.mobileKeyboard.classList.contains('visible');
        const isDownwardScroll = scrollDelta > 0;
        const exceedsThreshold = scrollDelta >= SCROLL_HIDE_DELTA_THRESHOLD;
        if (isKeyboardVisible && isDownwardScroll && exceedsThreshold) this.hideMobileKeyboard();
      }, { passive: true });

      this.addTrackedListener(document, 'click', (e) => {
        if (!this.containerElement.contains(e.target)) this.hideMobileKeyboard();
      });
    };

    proto.showMobileKeyboard = function showMobileKeyboard() {
      if (!this.mobileKeyboard) return;
      this._lastScrollY = window.scrollY || window.pageYOffset || 0;
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
      if (clueText) {
        const displayNum = window.CrosswordUtils.getDisplayClueNumber(clueNum);
        this.keyboardClueText.textContent = `${displayNum}. ${clueText}`;
      }
    };

    proto.switchKeyboardLayout = function switchKeyboardLayout(showNumbers) {
      if (!this._keyboardLetters || !this._keyboardNumbers) return;
      if (showNumbers) {
        this._keyboardLetters.style.display = 'none';
        this._keyboardNumbers.style.display = '';
      } else {
        this._keyboardNumbers.style.display = 'none';
        this._keyboardLetters.style.display = '';
      }
    };

    proto.handleMobileKeyPress = function handleMobileKeyPress(key) {
      if (key === 'ShowNumbers') return this.switchKeyboardLayout(true);
      if (key === 'ShowLetters') return this.switchKeyboardLayout(false);
      if (!this.currentCell) return;
      if (key === 'Dismiss') return this.hideMobileKeyboard();
      if (key === 'Backspace') {
        this.handleBackspace(this.currentCell.row, this.currentCell.col);
        return this.updateKeyboardClue();
      }
      if (key.length === 1) {
        const { row, col } = this.currentCell;
        const value = key.toUpperCase();
        this.userInputs[row][col] = value;
        const input = this.getInputAt(row, col);
        if (input) input.value = value;
        this.advanceToNextCell(row, col);
        this.updateKeyboardClue();
      }
    };

    proto.getAllCluesOrdered = function getAllCluesOrdered() {
      const clues = [];
      Object.keys(this.currentPuzzle.acrossClues).forEach((num) => clues.push({ num, direction: 'across' }));
      Object.keys(this.currentPuzzle.downClues).forEach((num) => clues.push({ num, direction: 'down' }));
      return window.CrosswordUtils.sortClueEntries(clues);
    };

    proto.getCluesForDirection = function getCluesForDirection(direction) {
      const clueSet = direction === 'across' ? this.currentPuzzle.acrossClues : this.currentPuzzle.downClues;
      const clues = Object.keys(clueSet).map((num) => ({ num, direction }));
      return window.CrosswordUtils.sortClueEntries(clues);
    };

    proto.isWordFullyFilled = function isWordFullyFilled(clueNum, direction) {
      const position = this.currentPuzzle.cluePositions[clueNum];
      if (!position) return false;
      const word = this.findWordAt(position.row, position.col, direction);
      if (!word) return false;
      return word.every((cell) => !!this.userInputs[cell.row][cell.col]);
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

      // Navigate to first empty cell in the word, falling back to first cell
      const word = this.findWordAt(position.row, position.col, direction);
      let targetRow = position.row;
      let targetCol = position.col;
      if (word) {
        const firstEmpty = word.find((cell) => !this.userInputs[cell.row][cell.col]);
        if (firstEmpty) {
          targetRow = firstEmpty.row;
          targetCol = firstEmpty.col;
        }
      }

      this.handleCellClick(targetRow, targetCol);
      this.currentDirection = direction;
      this.currentClueNumber = clueNum;
      if (!this.isMobileDevice) {
        const input = this.getInputAt(targetRow, targetCol);
        if (input) input.focus();
      }
      this.highlightClue(clueNum);
      this.updateKeyboardClue();
    };

    proto.navigateToPreviousClue = function navigateToPreviousClue() {
      const dirClues = this.getCluesForDirection(this.currentDirection);
      if (dirClues.length === 0) return;
      const currentClueNum = this.getCurrentClueNumber();
      if (!currentClueNum) {
        const last = dirClues[dirClues.length - 1];
        return this.navigateToClue(last.num, last.direction);
      }
      const currentIndex = dirClues.findIndex((c) => c.num === currentClueNum && c.direction === this.currentDirection);
      // Skip fully-filled clues; fall back to simple prev if all are filled
      for (let step = 1; step < dirClues.length; step++) {
        const idx = (currentIndex - step + dirClues.length) % dirClues.length;
        if (!this.isWordFullyFilled(dirClues[idx].num, this.currentDirection)) {
          return this.navigateToClue(dirClues[idx].num, dirClues[idx].direction);
        }
      }
      const prevIdx = (currentIndex - 1 + dirClues.length) % dirClues.length;
      this.navigateToClue(dirClues[prevIdx].num, dirClues[prevIdx].direction);
    };

    proto.navigateToNextClue = function navigateToNextClue() {
      const dirClues = this.getCluesForDirection(this.currentDirection);
      if (dirClues.length === 0) return;
      const currentClueNum = this.getCurrentClueNumber();
      if (!currentClueNum) {
        return this.navigateToClue(dirClues[0].num, dirClues[0].direction);
      }
      const currentIndex = dirClues.findIndex((c) => c.num === currentClueNum && c.direction === this.currentDirection);
      // Skip fully-filled clues; fall back to simple next if all are filled
      for (let step = 1; step < dirClues.length; step++) {
        const idx = (currentIndex + step) % dirClues.length;
        if (!this.isWordFullyFilled(dirClues[idx].num, this.currentDirection)) {
          return this.navigateToClue(dirClues[idx].num, dirClues[idx].direction);
        }
      }
      const nextIdx = (currentIndex + 1) % dirClues.length;
      this.navigateToClue(dirClues[nextIdx].num, dirClues[nextIdx].direction);
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