// Grid / clue / navigation logic
(function () {
  function applyGridUtilsModule(proto) {
    proto.getCellIndex = function getCellIndex(row, col) {
      return window.CrosswordUtils.getCellIndex(row, col, this.currentPuzzle.answers.length);
    };

    proto.getCellElement = function getCellElement(row, col) {
      return this.gridElement.children[this.getCellIndex(row, col)] || null;
    };

    proto.isAnswerLetter = function isAnswerLetter(value) {
      return window.CrosswordUtils.isAnswerLetter(value);
    };

    proto.isAnswerCell = function isAnswerCell(row, col) {
      return this.isAnswerLetter(this.currentPuzzle.answers?.[row]?.[col]);
    };

    proto.forEachAnswerCell = function forEachAnswerCell(callback) {
      const gridSize = this.currentPuzzle.answers.length;
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          if (this.isAnswerCell(row, col)) callback(row, col, this.currentPuzzle.answers[row][col]);
        }
      }
    };

    proto.findWordAt = function findWordAt(row, col, direction) {
      const gridSize = this.currentPuzzle.answers.length;
      const cells = [];

      if (direction === 'across') {
        let startCol = col;
        while (startCol > 0 && this.currentPuzzle.answers[row][startCol - 1] !== null) startCol--;
        let endCol = col;
        while (endCol < gridSize - 1 && this.currentPuzzle.answers[row][endCol + 1] !== null) endCol++;
        for (let c = startCol; c <= endCol; c++) cells.push({ row, col: c });
      } else {
        let startRow = row;
        while (startRow > 0 && this.currentPuzzle.answers[startRow - 1][col] !== null) startRow--;
        let endRow = row;
        while (endRow < gridSize - 1 && this.currentPuzzle.answers[endRow + 1][col] !== null) endRow++;
        for (let r = startRow; r <= endRow; r++) cells.push({ row: r, col });
      }

      return cells.length > 1 ? cells : null;
    };

    proto.getClueNumberForWord = function getClueNumberForWord(wordCells, direction) {
      if (!wordCells || wordCells.length === 0) return null;
      const startCell = wordCells[0];

      for (const [clueNum, position] of Object.entries(this.currentPuzzle.cluePositions)) {
        if (position.row === startCell.row && position.col === startCell.col && position.direction === direction) return clueNum;
      }

      for (const [clueNum, position] of Object.entries(this.currentPuzzle.cluePositions)) {
        if (position.row !== startCell.row || position.col !== startCell.col) continue;
        const existsInDirection = direction === 'across'
          ? Object.prototype.hasOwnProperty.call(this.currentPuzzle.acrossClues, clueNum)
          : Object.prototype.hasOwnProperty.call(this.currentPuzzle.downClues, clueNum);
        if (existsInDirection) return clueNum;
      }
      return null;
    };

    proto.getClueNumber = function getClueNumber(row, col) {
      if (!this.currentPuzzle.cluePositions) return null;
      for (const [clueNum, position] of Object.entries(this.currentPuzzle.cluePositions)) {
        if (position.row === row && position.col === col) return clueNum;
      }
      return null;
    };

    proto.getInputAt = function getInputAt(row, col) {
      const gridSize = this.currentPuzzle.answers.length;
      const cell = this.gridElement.children[row * gridSize + col];
      return cell ? cell.querySelector('input') : null;
    };
  }

  window.CrosswordGridUtilsModule = { applyGridUtilsModule };
})();