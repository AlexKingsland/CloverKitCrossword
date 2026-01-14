// Crossword Puzzle Data - Database-ready structure
// In production, this would be fetched from an API endpoint like: fetch('/api/puzzle/today')
const puzzleData = {
  acrossClues: {
    1: "E-commerce platform",
    8: "Shopping basket",
    10: "Purchase request",
    11: "Item for sale",
    13: "Discounted items",
    15: "Expensive",
    18: "Final purchase step"
  },
  downClues: {
    1: "Online store",
    2: "Buyer",
    3: "Transaction",
    4: "Platform",
    5: "Goods",
    6: "Design",
    7: "Vendor",
    9: "Add to",
    12: "Price tag",
    14: "Store section"
  },
  answers: [
    ['S', 'H', 'O', 'P', 'I', 'F', 'Y', null, 'C', 'A', 'R', 'T'],
    ['H', null, 'R', null, 'T', null, null, null, 'A', null, 'D', null],
    ['O', null, 'D', null, 'E', null, 'O', 'R', 'D', 'E', 'R', 'S'],
    ['P', 'R', 'O', 'D', 'U', 'C', 'T', null, 'A', null, 'E', null],
    [null, null, null, null, null, null, null, null, 'D', null, 'T', null],
    ['S', 'A', 'L', 'E', 'S', null, 'P', 'R', 'I', 'C', 'Y', null],
    ['A', null, null, null, 'L', null, 'T', null, 'C', null, null, null],
    ['L', null, null, null, 'L', null, 'O', null, 'K', null, null, null],
    ['E', null, null, null, 'S', null, 'R', null, 'O', null, null, null],
    [null, null, 'C', 'H', 'E', 'C', 'K', 'O', 'U', 'T', 'S', null]
  ]
};

class CrosswordPuzzle {
  constructor() {
    this.gridElement = document.getElementById('crossword-grid');
    this.acrossCluesElement = document.getElementById('across-clues');
    this.downCluesElement = document.getElementById('down-clues');
    this.checkButton = document.getElementById('check-answers');
    this.showButton = document.getElementById('show-solution');
    this.resetButton = document.getElementById('reset-puzzle');
    this.messageElement = document.getElementById('crossword-message');

    this.currentPuzzle = puzzleData; // In production: await this.loadPuzzleFromAPI()
    this.userInputs = this.createEmptyGrid();

    this.init();
  }

  async loadPuzzleFromAPI() {
    // Future implementation:
    // try {
    //   const response = await fetch('/api/puzzle/today');
    //   return await response.json();
    // } catch (error) {
    //   console.error('Failed to load puzzle:', error);
    //   return puzzleData; // fallback to hardcoded
    // }
    return puzzleData;
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
  }

  renderGrid() {
    console.log('=== CROSSWORD RENDER v2.0 - Starting renderGrid ===');
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
          console.log(`Creating BLACK cell at [${row},${col}]`);
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
    const clueNumbers = {
      '0-0': '1',
      '0-8': '8',
      '1-0': '2',
      '1-8': '9',
      '2-0': '3',
      '2-6': '11',
      '3-0': '4',
      '3-4': '5',
      '3-6': '12',
      '3-8': '13',
      '4-2': '6',
      '5-0': '15',
      '5-6': '16',
      '5-8': '17',
      '6-0': '7',
      '6-2': '10',
      '6-6': '14',
      '7-8': '20',
      '8-0': '18',
      '8-6': '19',
      '9-2': '21'
    };
    return clueNumbers[`${row}-${col}`];
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
      this.showMessage('Congratulations! Puzzle completed!', 'success');
    } else {
      this.showMessage(`Correct: ${correct}/${total}. Keep trying!`, 'info');
    }
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
