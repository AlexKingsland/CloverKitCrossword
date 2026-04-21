// Bootstrap entrypoint (thin) — one instance per container
document.addEventListener('DOMContentLoaded', () => {
  if (!window.CrosswordPuzzleApp) return;
  document.querySelectorAll('.crossword-container').forEach((container) => {
    new window.CrosswordPuzzleApp(container);
  });
});