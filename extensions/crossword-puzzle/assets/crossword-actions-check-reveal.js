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
        this.addTrackedListener(this.resetButton, 'click', () => this.resetPuzzle());
      }

      if (this.checkLetterBtn) {
        this.addTrackedListener(this.checkLetterBtn, 'click', (e) => {
          e.stopPropagation();
          this.checkLetter();
          this.closeCheckMenu();
        });
      }
      if (this.checkWordBtn) {
        this.addTrackedListener(this.checkWordBtn, 'click', (e) => {
          e.stopPropagation();
          this.checkWord();
          this.closeCheckMenu();
        });
      }
      if (this.checkPuzzleBtn) {
        this.addTrackedListener(this.checkPuzzleBtn, 'click', (e) => {
          e.stopPropagation();
          this.checkPuzzle();
          this.closeCheckMenu();
        });
      }

      if (this.revealLetterBtn) {
        this.addTrackedListener(this.revealLetterBtn, 'click', (e) => {
          e.stopPropagation();
          this.revealLetter();
          this.closeRevealMenu();
        });
      }
      if (this.revealWordBtn) {
        this.addTrackedListener(this.revealWordBtn, 'click', (e) => {
          e.stopPropagation();
          this.revealWord();
          this.closeRevealMenu();
        });
      }
      if (this.revealPuzzleBtn) {
        this.addTrackedListener(this.revealPuzzleBtn, 'click', (e) => {
          e.stopPropagation();
          this.revealPuzzle();
          this.closeRevealMenu();
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

    proto.checkPuzzle = function checkPuzzle() {
      this.clearCheckIndicators();
      let correct = 0;
      let total = 0;
      let filled = 0;
      this.forEachAnswerCell((row, col, ans) => {
        total++;
        if (this.userInputs[row][col]) {
          filled++;
          if (sameAnswer(this.userInputs[row][col], ans)) {
            correct++;
            this.applyCellCheckClass(row, col, 'correct-check');
          } else {
            this.applyCellCheckClass(row, col, 'incorrect');
          }
        }
      });
      this.showMessage(`${correct}/${total} correct (${filled} filled)`, correct === total ? 'success' : 'info');
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
      let correct = 0;
      let total = 0;
      this.forEachAnswerCell((row, col, ans) => {
        total++;
        if (sameAnswer(this.userInputs[row][col], ans)) correct++;
      });
      if (correct === total) {
        this.stopTimer();
        this.markAsSolved();
        this.showCompletionBanner();
      } else {
        this.showMessage(`${correct}/${total} correct. Keep trying!`, 'info');
      }
    };

    proto.markAsSolved = function markAsSolved() {
      if (!this.submitButton) return;
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'Solved!';
      this.submitButton.classList.add('btn-solved');
    };

    proto.resetPuzzle = function resetPuzzle() {
      this.userInputs = this.createEmptyGrid();
      this.revealedCells.clear();
      this.renderGrid();
      this.showMessage('Puzzle reset!', 'info');
    };

    proto.showMessage = function showMessage(text, type) {
      this.messageElement.textContent = text;
      this.messageElement.className = `crossword-message message-${type}`;
      setTimeout(() => {
        this.messageElement.textContent = '';
        this.messageElement.className = 'crossword-message';
      }, 3000);
    };
  }

  window.CrosswordActionsModule = { applyActionsModule };
})();