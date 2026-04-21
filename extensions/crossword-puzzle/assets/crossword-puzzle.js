// Bootstrap entrypoint (thin) — one instance per container.
// Guard against double-execution when multiple blocks emit the same script tag.
document.addEventListener('DOMContentLoaded', () => {
  if (!window.CrosswordPuzzleApp) return;
  document.querySelectorAll('.crossword-container').forEach((container) => {
    if (container.dataset.cwInit) return;
    container.dataset.cwInit = '1';
    new window.CrosswordPuzzleApp(container);
  });
});