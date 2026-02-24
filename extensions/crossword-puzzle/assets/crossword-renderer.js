// Rendering module (grid, clues, visual highlights)
(function () {
  function applyRendererModule(proto) {
    proto.updateCellSize = function updateCellSize() {
      if (!this.currentPuzzle || !this.gridElement) return;
      const gridSize = this.currentPuzzle.answers.length;
      const gapSize = 2;
      const borderSize = 2;
      const wrapper = this.gridElement.closest('.crossword-grid-wrapper') || this.gridElement.parentElement;
      const containerWidth = wrapper ? wrapper.clientWidth : window.innerWidth;
      const totalGap = (gridSize - 1) * gapSize + borderSize * 2;
      const maxCellSize = 36;
      const minCellSize = 20;
      let cellSize = Math.floor((containerWidth - totalGap) / gridSize);
      cellSize = Math.max(minCellSize, Math.min(maxCellSize, cellSize));
      this.gridElement.style.setProperty('--cell-size', `${cellSize}px`);
      const scale = cellSize / maxCellSize;
      this.gridElement.style.setProperty('--cell-font-size', `${Math.max(11, Math.round(16 * scale))}px`);
      this.gridElement.style.setProperty('--cell-number-size', `${Math.max(7, Math.round(10 * scale))}px`);
    };

    proto.renderGrid = function renderGrid() {
      this.gridElement.innerHTML = '';
      const gridSize = this.currentPuzzle.answers.length;

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const cell = document.createElement('div');
          cell.className = 'crossword-cell';
          const isBlack = this.currentPuzzle.answers[row][col] === null;

          if (isBlack) {
            cell.classList.add('black');
            cell.innerHTML = '&nbsp;';
          } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'crossword-cell-input';
            input.maxLength = 1;
            input.value = this.userInputs[row][col];
            input.dataset.row = row;
            input.dataset.col = col;

            if (this.isMobileDevice) {
              input.setAttribute('readonly', 'readonly');
              input.setAttribute('inputmode', 'none');
              input.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleCellClick(row, col);
                this.showMobileKeyboard();
                this.updateKeyboardClue();
              });
              input.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCellClick(row, col);
                this.showMobileKeyboard();
                this.updateKeyboardClue();
              });
              input.addEventListener('focus', (e) => {
                e.preventDefault();
                e.target.blur();
              });
            } else {
              input.addEventListener('click', () => this.handleCellClick(row, col));
              input.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase();
                if (value.length > 1) value = value.slice(-1);
                this.userInputs[row][col] = value;
                e.target.value = value;
                if (value) this.advanceToNextCell(row, col);
              });
              input.addEventListener('keydown', (e) => this.handleKeyDown(e, row, col));
            }

            cell.appendChild(input);
            const clueNumber = this.getClueNumber(row, col);
            if (clueNumber) {
              const numberSpan = document.createElement('span');
              numberSpan.className = 'crossword-cell-number';
              numberSpan.textContent = window.CrosswordUtils.getDisplayClueNumber(clueNumber);
              cell.appendChild(numberSpan);
            }
            if (this.revealedCells.has(`${row},${col}`)) cell.classList.add('revealed');
          }

          this.gridElement.appendChild(cell);
        }
      }
    };

    proto.renderClues = function renderClues() {
      const acrossEntries = window.CrosswordUtils.sortClueEntries(
        Object.entries(this.currentPuzzle.acrossClues).map(([num, clue]) => ({ num, clue, direction: 'across' }))
      );
      const downEntries = window.CrosswordUtils.sortClueEntries(
        Object.entries(this.currentPuzzle.downClues).map(([num, clue]) => ({ num, clue, direction: 'down' }))
      );

      this.acrossCluesElement.innerHTML = acrossEntries
        .map(({ num, clue }) => `<div class="clue-item" data-clue="${num}">${window.CrosswordUtils.getDisplayClueNumber(num)}. ${clue}</div>`)
        .join('');
      this.downCluesElement.innerHTML = downEntries
        .map(({ num, clue }) => `<div class="clue-item" data-clue="${num}">${window.CrosswordUtils.getDisplayClueNumber(num)}. ${clue}</div>`)
        .join('');
    };

    proto.clearHighlights = function clearHighlights() {
      this.gridElement.querySelectorAll('.crossword-cell').forEach((cell) => cell.classList.remove('highlighted', 'current'));
    };

    proto.highlightWord = function highlightWord(cells, currentRow, currentCol) {
      this.clearHighlights();
      cells.forEach(({ row, col }) => {
        const cellElement = this.getCellElement(row, col);
        if (!cellElement) return;
        cellElement.classList.add(row === currentRow && col === currentCol ? 'current' : 'highlighted');
      });
    };

    proto.applyRevealedClass = function applyRevealedClass(row, col) {
      const cellElement = this.getCellElement(row, col);
      if (cellElement) cellElement.classList.add('revealed');
    };

    proto.highlightClue = function highlightClue(clueNum) {
      document.querySelectorAll('.clue-item').forEach((item) => item.classList.remove('highlight'));
      const clueElement = document.querySelector(`[data-clue="${clueNum}"]`);
      if (clueElement) clueElement.classList.add('highlight');
    };

    proto.showCompletionBanner = function showCompletionBanner() {
      const timeStr = this.formatElapsedTime();
      const banner = document.createElement('div');
      banner.className = 'completion-banner';
      banner.innerHTML = `<div class="banner-content"><h3>🎉 Congratulations!</h3><p>You completed the crossword in <strong>${timeStr}</strong>!</p><button class="btn btn-primary" onclick="this.closest('.completion-banner').remove()">Close</button></div>`;
      this.containerElement.insertBefore(banner, this.containerElement.firstChild);
    };
  }

  window.CrosswordRendererModule = { applyRendererModule };
})();