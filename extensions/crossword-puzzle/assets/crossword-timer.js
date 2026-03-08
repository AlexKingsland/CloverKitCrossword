// Timer module for crossword lifecycle + next puzzle countdown
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
      if (this.updatePauseButtonIcon) this.updatePauseButtonIcon();
    };

    proto.resumeTimer = function resumeTimer() {
      if (!this.isPaused || this.puzzleCompleted) return;
      this.startTime = Date.now();
      this.isPaused = false;
      this.timerInterval = setInterval(() => {
        this.updateTimer();
      }, 1000);
      if (this.updatePauseButtonIcon) this.updatePauseButtonIcon();
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

    // --- Next puzzle countdown (countdown to midnight UTC) ---

    proto.startCountdownTimer = function startCountdownTimer() {
      this.updateCountdownDisplay();
      this._countdownInterval = setInterval(() => {
        this.updateCountdownDisplay();
      }, 1000);
    };

    proto.stopCountdownTimer = function stopCountdownTimer() {
      if (this._countdownInterval) {
        clearInterval(this._countdownInterval);
        this._countdownInterval = null;
      }
    };

    proto.updateCountdownDisplay = function updateCountdownDisplay() {
      if (!this.nextPuzzleCountdown) return;
      const now = new Date();
      const tomorrow = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
      ));
      const diff = tomorrow.getTime() - now.getTime();
      if (diff <= 0) {
        this.nextPuzzleCountdown.textContent = '00:00:00';
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      this.nextPuzzleCountdown.textContent =
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
  }

  window.CrosswordTimerModule = { applyTimerModule };
})();
