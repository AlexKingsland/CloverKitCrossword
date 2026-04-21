// Check / Reveal / Submit actions
(function () {
  function applyActionsModule(proto) {
    function sameAnswer(userValue, answerValue) {
      return (
        window.CrosswordUtils.normalizeAnswerForComparison(userValue) ===
        window.CrosswordUtils.normalizeAnswerForComparison(answerValue)
      );
    }

    proto.bindActionEvents = function bindActionEvents() {
      if (this.submitButton) {
        this.addTrackedListener(this.submitButton, 'click', () => this.submitPuzzle());
      }
      if (this.resetButton) {
        this.addTrackedListener(this.resetButton, 'click', (e) => {
          e.stopPropagation();
          this.resetPuzzle();
          this.closeHelpModal();
        });
      }

      if (this.checkLetterBtn) {
        this.addTrackedListener(this.checkLetterBtn, 'click', (e) => {
          e.stopPropagation();
          this.checkLetter();
          this.closeHelpModal();
        });
      }
      if (this.checkWordBtn) {
        this.addTrackedListener(this.checkWordBtn, 'click', (e) => {
          e.stopPropagation();
          this.checkWord();
          this.closeHelpModal();
        });
      }
      if (this.checkPuzzleBtn) {
        this.addTrackedListener(this.checkPuzzleBtn, 'click', (e) => {
          e.stopPropagation();
          this.checkPuzzle();
          this.closeHelpModal();
        });
      }

      if (this.revealLetterBtn) {
        this.addTrackedListener(this.revealLetterBtn, 'click', (e) => {
          e.stopPropagation();
          this.revealLetter();
          this.closeHelpModal();
        });
      }
      if (this.revealWordBtn) {
        this.addTrackedListener(this.revealWordBtn, 'click', (e) => {
          e.stopPropagation();
          this.revealWord();
          this.closeHelpModal();
        });
      }
      if (this.revealPuzzleBtn) {
        this.addTrackedListener(this.revealPuzzleBtn, 'click', (e) => {
          e.stopPropagation();
          this.revealPuzzle();
          this.closeHelpModal();
        });
      }
    };

    proto.clearCheckIndicators = function clearCheckIndicators() {
      for (let i = 0; i < this.gridElement.children.length; i++) {
        this.gridElement.children[i].classList.remove('incorrect', 'correct-check');
      }
    };

    proto.applyCellCheckClass = function applyCellCheckClass(row, col, className) {
      const cellElement = this.getCellElement(row, col);
      if (cellElement) cellElement.classList.add(className);
    };

    proto.checkLetter = function checkLetter() {
      if (!this.currentCell) return this.showMessage('Select a cell first', 'info');
      this.clearCheckIndicators();
      const { row, col } = this.currentCell;
      const ans = this.currentPuzzle.answers?.[row]?.[col];
      if (!this.isAnswerLetter(ans)) return;
      if (!this.userInputs[row][col]) return this.showMessage('Cell is empty', 'info');
      if (sameAnswer(this.userInputs[row][col], ans)) {
        this.applyCellCheckClass(row, col, 'correct-check');
        this.showMessage('Correct!', 'success');
      } else {
        this.applyCellCheckClass(row, col, 'incorrect');
        this.showMessage('Incorrect', 'error');
      }
      setTimeout(() => this.clearCheckIndicators(), 3000);
    };

    proto.checkWord = function checkWord() {
      if (!this.selectedWord || this.selectedWord.length === 0) return this.showMessage('Select a word first', 'info');
      this.clearCheckIndicators();
      let allCorrect = true;
      let hasContent = false;
      this.selectedWord.forEach(({ row, col }) => {
        const ans = this.currentPuzzle.answers?.[row]?.[col];
        if (!this.isAnswerLetter(ans)) return;
        if (this.userInputs[row][col]) {
          hasContent = true;
          if (sameAnswer(this.userInputs[row][col], ans)) {
            this.applyCellCheckClass(row, col, 'correct-check');
          } else {
            this.applyCellCheckClass(row, col, 'incorrect');
            allCorrect = false;
          }
        } else {
          allCorrect = false;
        }
      });
      if (!hasContent) this.showMessage('Word is empty', 'info');
      else if (allCorrect) this.showMessage('Word is correct!', 'success');
      else this.showMessage('Some letters are incorrect', 'error');
      setTimeout(() => this.clearCheckIndicators(), 3000);
    };

    proto.countWords = function countWords() {
      const words = [];
      const puzzle = this.currentPuzzle;
      // Collect all across words
      Object.keys(puzzle.acrossClues).forEach((clueNum) => {
        const pos = puzzle.cluePositions[clueNum];
        if (!pos) return;
        const cells = this.findWordAt(pos.row, pos.col, 'across');
        if (cells && cells.length > 0) words.push(cells);
      });
      // Collect all down words
      Object.keys(puzzle.downClues).forEach((clueNum) => {
        const pos = puzzle.cluePositions[clueNum];
        if (!pos) return;
        const cells = this.findWordAt(pos.row, pos.col, 'down');
        if (cells && cells.length > 0) words.push(cells);
      });
      return words;
    };

    proto.isWordCorrect = function isWordCorrect(wordCells) {
      return wordCells.every(({ row, col }) => {
        const ans = this.currentPuzzle.answers?.[row]?.[col];
        if (!this.isAnswerLetter(ans)) return true;
        return sameAnswer(this.userInputs[row][col], ans);
      });
    };

    proto.checkPuzzle = function checkPuzzle() {
      this.clearCheckIndicators();
      // Highlight individual cells for visual feedback
      this.forEachAnswerCell((row, col, ans) => {
        if (this.userInputs[row][col]) {
          if (sameAnswer(this.userInputs[row][col], ans)) {
            this.applyCellCheckClass(row, col, 'correct-check');
          } else {
            this.applyCellCheckClass(row, col, 'incorrect');
          }
        }
      });
      // Count by words
      const words = this.countWords();
      const totalWords = words.length;
      let correctWords = 0;
      words.forEach((wordCells) => {
        if (this.isWordCorrect(wordCells)) correctWords++;
      });
      this.showMessage(`${correctWords}/${totalWords} words correct`, correctWords === totalWords ? 'success' : 'info');
      setTimeout(() => this.clearCheckIndicators(), 4000);
    };

    proto.revealLetter = function revealLetter() {
      if (!this.currentCell) return this.showMessage('Select a cell first', 'info');
      const { row, col } = this.currentCell;
      const ans = this.currentPuzzle.answers?.[row]?.[col];
      if (!this.isAnswerLetter(ans)) return;
      if (sameAnswer(this.userInputs[row][col], ans)) return this.showMessage('Already correct!', 'info');
      this.userInputs[row][col] = ans;
      this.revealedCells.add(`${row},${col}`);
      const input = this.getInputAt(row, col);
      if (input) input.value = ans;
      this.applyRevealedClass(row, col);
      this.showMessage('Letter revealed', 'info');
    };

    proto.revealWord = function revealWord() {
      if (!this.selectedWord || this.selectedWord.length === 0) return this.showMessage('Select a word first', 'info');
      let alreadyComplete = true;
      this.selectedWord.forEach(({ row, col }) => {
        const ans = this.currentPuzzle.answers?.[row]?.[col];
        if (!this.isAnswerLetter(ans)) return;
        if (!sameAnswer(this.userInputs[row][col], ans)) {
          alreadyComplete = false;
          this.userInputs[row][col] = ans;
          this.revealedCells.add(`${row},${col}`);
          const input = this.getInputAt(row, col);
          if (input) input.value = ans;
          this.applyRevealedClass(row, col);
        }
      });
      this.showMessage(alreadyComplete ? 'Word already correct!' : 'Word revealed', 'info');
    };

    proto.revealPuzzle = function revealPuzzle() {
      this.forEachAnswerCell((row, col, ans) => {
        if (!sameAnswer(this.userInputs[row][col], ans)) this.revealedCells.add(`${row},${col}`);
        this.userInputs[row][col] = ans;
      });
      this.renderGrid();
      this.showMessage('Puzzle revealed!', 'info');
    };

    proto.submitPuzzle = function submitPuzzle() {
      if (this.puzzleCompleted) return;
      const words = this.countWords();
      const totalWords = words.length;
      let correctWords = 0;
      // Also check if every letter is correct for completion
      let allLettersCorrect = true;
      this.forEachAnswerCell((row, col, ans) => {
        if (!sameAnswer(this.userInputs[row][col], ans)) allLettersCorrect = false;
      });
      words.forEach((wordCells) => {
        if (this.isWordCorrect(wordCells)) correctWords++;
      });
      if (allLettersCorrect) {
        this.stopTimer();
        this.markAsSolved();
        this.showCompletionBanner();
        if (window.CloverKitAnalytics) {
          var shopDomain = this.containerElement ? this.containerElement.dataset.shopDomain || '' : '';
          window.CloverKitAnalytics.trackPuzzleCompleted(shopDomain, this.difficulty, Math.round(this.elapsedTime / 1000), this.plan);
        }
      } else {
        this.showIncorrectBanner(correctWords, totalWords);
      }
    };

    proto.markAsSolved = function markAsSolved() {
      if (!this.submitButton) return;
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'Solved!';
      this.submitButton.classList.add('cw-btn-solved');
    };

    proto.resetPuzzle = function resetPuzzle() {
      this.userInputs = this.createEmptyGrid();
      this.revealedCells.clear();
      this.renderGrid();
      this.showMessage('Puzzle reset!', 'info');
    };

    proto.showMessage = function showMessage(text, type) {
      const existing = this.containerElement.querySelector('.cw-message-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.className = 'cw-message-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'cw-message-dialog cw-message-' + type;
      dialog.innerHTML =
        '<p class="cw-message-text"></p>' +
        '<button class="cw-message-ok" type="button">OK</button>';
      dialog.querySelector('.cw-message-text').textContent = text;

      overlay.appendChild(dialog);
      this.containerElement.appendChild(overlay);

      const close = () => overlay.remove();
      dialog.querySelector('.cw-message-ok').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    };
  }

  window.CrosswordActionsModule = { applyActionsModule };
})();
