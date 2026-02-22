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

  function setMenuOpenState(menu, toggleButton, isOpen) {
    if (!menu || !toggleButton) return;
    menu.classList.toggle('open', isOpen);
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  }

  function toggleMenu(menu, toggleButton) {
    if (!menu || !toggleButton) return;
    setMenuOpenState(menu, toggleButton, !menu.classList.contains('open'));
  }

  window.CrosswordUtils = {
    normalizeAnswerForComparison,
    isAnswerLetter,
    getCellIndex,
    setMenuOpenState,
    toggleMenu,
  };
})();