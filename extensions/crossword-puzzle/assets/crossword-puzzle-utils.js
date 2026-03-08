// Shared crossword UI/logic utilities
(function () {
  function normalizeAnswerForComparison(value) {
    if (typeof value !== 'string') return '';
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  function isAnswerLetter(value) {
    return typeof value === 'string' && value.length === 1;
  }

  function getCellIndex(row, col, gridSize) {
    return row * gridSize + col;
  }

  function getDisplayClueNumber(clueKey) {
    if (clueKey === null || clueKey === undefined) return '';
    const raw = String(clueKey);
    const match = raw.match(/^\d+/);
    return match ? match[0] : raw;
  }

  function getClueNumberSortValue(clueKey) {
    const displayNum = getDisplayClueNumber(clueKey);
    const parsed = parseInt(displayNum, 10);
    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  }

  function compareClueEntries(a, b) {
    const numDiff = getClueNumberSortValue(a.num) - getClueNumberSortValue(b.num);
    if (numDiff !== 0) return numDiff;

    const dirA = a.direction === 'across' ? 0 : 1;
    const dirB = b.direction === 'across' ? 0 : 1;
    if (dirA !== dirB) return dirA - dirB;

    return String(a.num).localeCompare(String(b.num), undefined, { numeric: true, sensitivity: 'base' });
  }

  function sortClueEntries(entries) {
    return [...entries].sort(compareClueEntries);
  }

  window.CrosswordUtils = {
    normalizeAnswerForComparison,
    isAnswerLetter,
    getCellIndex,
    getDisplayClueNumber,
    sortClueEntries,
  };
})();