// Crossword Puzzle - Fetched from Cloudflare R2

// R2 Configuration
const R2_PUBLIC_HOST = "cdn.cloverkitstudio.com";
const BASE_PATH = "v1/generic";

class CrosswordPuzzle {
  constructor() {
    this.gridElement = document.getElementById('crossword-grid');
    this.acrossCluesElement = document.getElementById('across-clues');
    this.downCluesElement = document.getElementById('down-clues');
    this.checkButton = document.getElementById('check-answers');
    this.showButton = document.getElementById('show-solution');
    this.resetButton = document.getElementById('reset-puzzle');
    this.messageElement = document.getElementById('crossword-message');
    this.timerDisplay = document.getElementById('timer-display');

    // Get difficulty from data attribute for R2 fetching
    const container = document.querySelector('.crossword-container');
    this.difficulty = container ? container.dataset.difficulty : 'medium';
    
    this.currentPuzzle = null;
    this.userInputs = null;
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

    // Initialize asynchronously
    this.initialize();
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
    
    // Start timer
    this.startTimer();
  }

  startTimer() {
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.puzzleCompleted = false;
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  updateTimer() {
    if (this.puzzleCompleted) return;
    
    const elapsed = Date.now() - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    this.timerDisplay.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.elapsedTime = Date.now() - this.startTime;
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
    }
    
    this.currentCell = { row, col };
    
    // Select the text in the input for easy override (desktop only)
    const input = this.getInputAt(row, col);
    if (input && input.value) {
      const isTouch =
        window.matchMedia &&
        window.matchMedia("(hover: none) and (pointer: coarse)").matches;

      if (!isTouch) {
        // Desktop: selecting makes typing overwrite existing letter
        input.select();
      } else {
        // Mobile: avoid selection UI; just place caret at end (or do nothing)
        // If you keep caret hidden via CSS, this still avoids the blue highlight.
        try {
          const len = input.value.length;
          input.setSelectionRange(len, len); // caret at end, no highlight
        } catch (e) {
          // ignore
        }
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
        nextInput.focus();
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

          cell.appendChild(input);

          // Add clue numbers
          const clueNumber = this.getClueNumber(row, col);
          if (clueNumber) {
            const numberSpan = document.createElement('span');
            numberSpan.className = 'crossword-cell-number';
            numberSpan.textContent = clueNumber;
            cell.appendChild(numberSpan);
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
    this.checkButton.addEventListener('click', () => this.checkAnswers());
    this.showButton.addEventListener('click', () => this.showSolution());
    this.resetButton.addEventListener('click', () => this.resetPuzzle());

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('clue-item')) {
        const clueNum = e.target.dataset.clue;
        this.highlightClue(clueNum);
      }
    });
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
          prevInput.focus();
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
        prevInput.focus();
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

  checkAnswers() {
    // Don't allow checking if already solved
    if (this.puzzleCompleted) {
      return;
    }

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
      this.showMessage(`Correct: ${correct}/${total}. Keep trying!`, 'info');
    }
  }

  markAsSolved() {
    this.checkButton.disabled = true;
    this.checkButton.textContent = 'Solved!';
    this.checkButton.classList.add('btn-solved');
  }

  showSolution() {
    this.userInputs = this.createEmptyGrid();
    const gridSize = this.currentPuzzle.answers.length;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const ans = this.currentPuzzle.answers?.[row]?.[col];
        if (typeof ans === 'string' && ans.length === 1) {
          this.userInputs[row][col] = ans;
        }
      }
    }
    this.renderGrid();
    this.showMessage('Solution shown!', 'info');
  }

  resetPuzzle() {
    this.userInputs = this.createEmptyGrid();
    this.renderGrid();
    this.showMessage('Puzzle reset!', 'info');
  }

  highlightClue(clueNum) {
    document.querySelectorAll('.clue-item').forEach(item => {
      item.classList.remove('highlight');
    });
    document.querySelector(`[data-clue="${clueNum}"]`).classList.add('highlight');
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
