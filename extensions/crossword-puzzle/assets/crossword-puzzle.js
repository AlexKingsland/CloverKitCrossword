// Crossword Puzzle - Fetched dynamically from API

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

    // Get topic from data attribute for API calls
    const container = document.querySelector('.crossword-container');
    this.topic = container ? container.dataset.topic : 'shopping';
    
    this.currentPuzzle = null;
    this.userInputs = null;
    this.isLoading = true;
    
    // Timer properties
    this.startTime = null;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.puzzleCompleted = false;

    // Initialize asynchronously
    this.initialize();
  }

  async initialize() {
    console.log('🎯 Initializing crossword for topic:', this.topic);
    
    try {
      // Show loading state
      this.showLoadingState();
      
      // Load puzzle from API
      await this.loadPuzzleFromAPI();
      
      // Initialize grid
      this.userInputs = this.createEmptyGrid();
      this.isLoading = false;
      
      // Render and bind events
      this.init();
    } catch (error) {
      // Error already handled and displayed in loadPuzzleFromAPI
      this.isLoading = false;
      console.error('Failed to initialize crossword:', error);
    }
  }

  getApiEndpoint() {
    // Automatic environment detection
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  hostname.includes('.ngrok.io') ||
                  hostname.includes('.ngrok-free.app');
    
    if (isDev) {
      console.log('🔧 Dev mode detected - using local API');
      return 'http://localhost:5001/api/v1';
    } else {
      console.log('🚀 Production mode - using Heroku API');
      return 'https://crossword-7f44d990ad45.herokuapp.com/api/v1';
    }
  }

  async loadPuzzleFromAPI() {
    try {
      const apiBase = this.getApiEndpoint();
      const url = `${apiBase}/puzzles/daily?topic=${this.topic}`;
      
      console.log('📡 Fetching puzzle from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform API response to match expected format
      this.currentPuzzle = {
        acrossClues: data.acrossClues,
        downClues: data.downClues,
        answers: data.answers,
        cluePositions: data.cluePositions
      };
      
      console.log('✅ Puzzle loaded successfully from API');
      console.log('   Title:', data.title);
      console.log('   Difficulty:', data.difficulty);
      
    } catch (error) {
      console.error('❌ Failed to load puzzle from API:', error.message);
      this.showErrorState(error.message);
      throw error; // Re-throw to prevent initialization from continuing
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

          input.addEventListener('input', (e) => {
            this.userInputs[row][col] = e.target.value.toUpperCase();
            e.target.value = e.target.value.toUpperCase();
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
      case 'ArrowUp':
        newRow = Math.max(0, row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(gridSize - 1, row + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(gridSize - 1, col + 1);
        break;
      default:
        return;
    }

    if (newRow !== row || newCol !== col) {
      e.preventDefault();
      if (this.currentPuzzle.answers[newRow][newCol] !== null) {
        const nextInput = this.getInputAt(newRow, newCol);
        if (nextInput) nextInput.focus();
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
