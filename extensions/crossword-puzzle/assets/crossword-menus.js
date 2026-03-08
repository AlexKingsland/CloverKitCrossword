// Modal & settings behavior (help modal, settings modal, toolbar interactions)
(function () {
  const SETTINGS_KEY = 'crossword_settings';

  function applyMenusModule(proto) {

    // --- Settings persistence ---

    proto.loadSettings = function loadSettings() {
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.darkMode = !!parsed.darkMode;
          this.skipFilledLetters = !!parsed.skipFilledLetters;
        }
      } catch (e) { /* ignore */ }
      this.applyDarkMode(this.darkMode);
      this.applySkipFilled(this.skipFilledLetters);
    };

    proto.saveSettings = function saveSettings() {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
          darkMode: this.darkMode,
          skipFilledLetters: this.skipFilledLetters,
        }));
      } catch (e) { /* ignore */ }
    };

    proto.applyDarkMode = function applyDarkMode(enabled) {
      this.darkMode = enabled;
      if (this.containerElement) {
        this.containerElement.classList.toggle('dark-mode', enabled);
      }
      if (this.darkModeToggle) {
        this.darkModeToggle.checked = enabled;
      }
    };

    proto.applySkipFilled = function applySkipFilled(enabled) {
      this.skipFilledLetters = enabled;
      if (this.skipFilledToggle) {
        this.skipFilledToggle.checked = enabled;
      }
    };

    // --- Modal open / close ---

    proto.openModal = function openModal(overlay) {
      if (overlay) overlay.classList.add('open');
    };

    proto.closeModal = function closeModal(overlay) {
      if (overlay) overlay.classList.remove('open');
    };

    proto.openHelpModal = function openHelpModal() {
      this.openModal(this.helpModalOverlay);
    };

    proto.closeHelpModal = function closeHelpModal() {
      this.closeModal(this.helpModalOverlay);
    };

    proto.openSettingsModal = function openSettingsModal() {
      this.openModal(this.settingsModalOverlay);
      this.startCountdownTimer();
    };

    proto.closeSettingsModal = function closeSettingsModal() {
      this.closeModal(this.settingsModalOverlay);
      this.stopCountdownTimer();
    };

    // --- Timer pause/play button ---

    proto.updatePauseButtonIcon = function updatePauseButtonIcon() {
      if (!this.timerPauseBtn) return;
      if (this.isPaused) {
        // Show play icon
        this.timerPauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>';
        this.timerPauseBtn.setAttribute('aria-label', 'Resume timer');
        this.timerPauseBtn.classList.add('timer-paused');
      } else {
        // Show pause icon
        this.timerPauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>';
        this.timerPauseBtn.setAttribute('aria-label', 'Pause timer');
        this.timerPauseBtn.classList.remove('timer-paused');
      }
    };

    // --- Bind all menu/modal events ---

    proto.bindMenuEvents = function bindMenuEvents() {
      // Toolbar: Help button
      if (this.toolbarHelpBtn) {
        this.addTrackedListener(this.toolbarHelpBtn, 'click', () => this.openHelpModal());
      }

      // Toolbar: Settings button
      if (this.toolbarSettingsBtn) {
        this.addTrackedListener(this.toolbarSettingsBtn, 'click', () => this.openSettingsModal());
      }

      // Toolbar: Timer pause/play
      if (this.timerPauseBtn) {
        this.addTrackedListener(this.timerPauseBtn, 'click', () => {
          if (this.isPaused) {
            this.resumeTimer();
          } else {
            this.pauseTimer();
          }
          this.updatePauseButtonIcon();
        });
      }

      // Help modal: close button
      if (this.helpModalClose) {
        this.addTrackedListener(this.helpModalClose, 'click', () => this.closeHelpModal());
      }

      // Help modal: overlay click to close
      if (this.helpModalOverlay) {
        this.addTrackedListener(this.helpModalOverlay, 'click', (e) => {
          if (e.target === this.helpModalOverlay) this.closeHelpModal();
        });
      }

      // Help modal: How to play toggle
      if (this.howToPlayBtn && this.helpInstructions) {
        this.addTrackedListener(this.howToPlayBtn, 'click', () => {
          const isVisible = this.helpInstructions.style.display !== 'none';
          this.helpInstructions.style.display = isVisible ? 'none' : 'block';
        });
      }

      // Settings modal: close button
      if (this.settingsModalClose) {
        this.addTrackedListener(this.settingsModalClose, 'click', () => this.closeSettingsModal());
      }

      // Settings modal: overlay click to close
      if (this.settingsModalOverlay) {
        this.addTrackedListener(this.settingsModalOverlay, 'click', (e) => {
          if (e.target === this.settingsModalOverlay) this.closeSettingsModal();
        });
      }

      // Settings: Dark mode toggle
      if (this.darkModeToggle) {
        this.addTrackedListener(this.darkModeToggle, 'change', () => {
          this.applyDarkMode(this.darkModeToggle.checked);
          this.saveSettings();
        });
      }

      // Settings: Skip filled letters toggle
      if (this.skipFilledToggle) {
        this.addTrackedListener(this.skipFilledToggle, 'change', () => {
          this.applySkipFilled(this.skipFilledToggle.checked);
          this.saveSettings();
        });
      }

      // Close modals on Escape key
      this.addTrackedListener(document, 'keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeHelpModal();
          this.closeSettingsModal();
        }
      });
    };
  }

  window.CrosswordMenusModule = { applyMenusModule };
})();
