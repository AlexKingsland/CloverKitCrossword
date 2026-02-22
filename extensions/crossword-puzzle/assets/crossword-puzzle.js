// Bootstrap entrypoint (thin)
document.addEventListener('DOMContentLoaded', () => {
  if (window.__crosswordPuzzleInstance && typeof window.__crosswordPuzzleInstance.destroy === 'function') {
    window.__crosswordPuzzleInstance.destroy();
  }

  if (window.CrosswordPuzzleApp) {
    window.__crosswordPuzzleInstance = new window.CrosswordPuzzleApp();
  }
});