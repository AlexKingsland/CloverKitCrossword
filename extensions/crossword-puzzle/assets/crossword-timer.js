// Timer module for crossword lifecycle
(function () {
  function applyTimerModule(proto) {
    proto.startTimer = function startTimer() {
      this.startTime = Date.now();
      this.elapsedTime = 0;
      this.puzzleCompleted = false;
      this.isPaused = false;
      this.timerInterval = setInterval(() => {
        this.updateTimer();
      }, 1000);
    };

    proto.pauseTimer = function pauseTimer() {
      if (this.isPaused || this.puzzleCompleted || !this.timerInterval) return;
      this.elapsedTime += Date.now() - this.startTime;
      this.isPaused = true;
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    };

    proto.resumeTimer = function resumeTimer() {
      if (!this.isPaused || this.puzzleCompleted) return;
      this.startTime = Date.now();
      this.isPaused = false;
      this.timerInterval = setInterval(() => {
        this.updateTimer();
      }, 1000);
    };

    proto.updateTimer = function updateTimer() {
      if (this.puzzleCompleted || this.isPaused) return;
      const elapsed = this.elapsedTime + (Date.now() - this.startTime);
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    proto.stopTimer = function stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.elapsedTime += Date.now() - this.startTime;
        this.puzzleCompleted = true;
      }
    };

    proto.formatElapsedTime = function formatElapsedTime() {
      const minutes = Math.floor(this.elapsedTime / 60000);
      const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
  }

  window.CrosswordTimerModule = { applyTimerModule };
})();