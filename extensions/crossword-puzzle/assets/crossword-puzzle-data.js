// Crossword data service (R2 fetch + fallback)
(function () {
  const R2_PUBLIC_HOST = "cdn.cloverkitstudio.com";
  const BASE_PATH = "v1/generic";

  function getTodayUTC() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  function getYesterdayUTC() {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() - 1);
    return now.toISOString().split('T')[0];
  }

  function getTomorrowUTC() {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() + 1);
    return now.toISOString().split('T')[0];
  }

  async function fetchTomorrowTitle(difficulty) {
    const tomorrow = getTomorrowUTC();
    const url = `https://${R2_PUBLIC_HOST}/${BASE_PATH}/${difficulty}/${tomorrow}.json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.title || null;
  }

  async function fetchPuzzle(difficulty, debug = () => {}) {
    const today = getTodayUTC();
    const url = `https://${R2_PUBLIC_HOST}/${BASE_PATH}/${difficulty}/${today}.json`;
    debug('📡 Fetching puzzle from R2:', url);

    const response = await fetch(url);
    if (!response.ok) {
      debug('⚠️ Today\'s puzzle not found, trying yesterday...');
      const yesterday = getYesterdayUTC();
      const fallbackUrl = `https://${R2_PUBLIC_HOST}/${BASE_PATH}/${difficulty}/${yesterday}.json`;
      debug('📡 Fetching fallback puzzle from R2:', fallbackUrl);

      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) {
        throw new Error(`Puzzle not found for ${today} or ${yesterday}`);
      }

      const data = await fallbackResponse.json();
      debug('✅ Loaded yesterday\'s puzzle as fallback');
      debug('   Title:', data.title);
      debug('   Date:', data.date);
      return data;
    }

    const data = await response.json();
    debug('✅ Puzzle loaded successfully from R2');
    debug('   Title:', data.title);
    debug('   Date:', data.date);
    return data;
  }

  window.CrosswordDataService = {
    fetchPuzzle,
    fetchTomorrowTitle,
  };
})();