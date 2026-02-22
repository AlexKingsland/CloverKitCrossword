// Menu behavior (check/reveal dropdowns)
(function () {
  function applyMenusModule(proto) {
    proto.toggleMenu = function toggleMenu(menu, toggleButton) {
      window.CrosswordUtils.toggleMenu(menu, toggleButton);
    };

    proto.setMenuOpenState = function setMenuOpenState(menu, toggleButton, isOpen) {
      window.CrosswordUtils.setMenuOpenState(menu, toggleButton, isOpen);
    };

    proto.toggleRevealMenu = function toggleRevealMenu() {
      this.toggleMenu(this.revealMenu, this.revealToggle);
    };

    proto.openRevealMenu = function openRevealMenu() {
      this.setMenuOpenState(this.revealMenu, this.revealToggle, true);
    };

    proto.closeRevealMenu = function closeRevealMenu() {
      this.setMenuOpenState(this.revealMenu, this.revealToggle, false);
    };

    proto.toggleCheckMenu = function toggleCheckMenu() {
      this.toggleMenu(this.checkMenu, this.checkToggle);
    };

    proto.openCheckMenu = function openCheckMenu() {
      this.setMenuOpenState(this.checkMenu, this.checkToggle, true);
    };

    proto.closeCheckMenu = function closeCheckMenu() {
      this.setMenuOpenState(this.checkMenu, this.checkToggle, false);
    };

    proto.bindMenuEvents = function bindMenuEvents() {
      if (this.checkToggle) {
        this.addTrackedListener(this.checkToggle, 'click', (e) => {
          e.stopPropagation();
          this.toggleCheckMenu();
        });
      }

      if (this.revealToggle) {
        this.addTrackedListener(this.revealToggle, 'click', (e) => {
          e.stopPropagation();
          this.toggleRevealMenu();
        });
      }

      this.addTrackedListener(document, 'click', (e) => {
        if (this.revealDropdown && !this.revealDropdown.contains(e.target)) this.closeRevealMenu();
        if (this.checkDropdown && !this.checkDropdown.contains(e.target)) this.closeCheckMenu();
      });

      this.addTrackedListener(document, 'keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeRevealMenu();
          this.closeCheckMenu();
        }
      });
    };
  }

  window.CrosswordMenusModule = { applyMenusModule };
})();