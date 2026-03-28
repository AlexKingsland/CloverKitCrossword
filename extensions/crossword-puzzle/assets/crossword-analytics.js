// CloverKit Analytics — PostHog integration
// The project token is intentionally public (write-only ingest key, safe in browser code)
(function () {
  var POSTHOG_TOKEN = 'phc_ByrwBZLjQm2NcYA9CZx95TfkZuoqCVD1lbv8MG0mkls'; // replace with your token from PostHog dashboard
  var POSTHOG_HOST = 'https://us.i.posthog.com';

  // PostHog JS snippet (async, non-blocking)
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="init be fe gs alias identify group onFeatureFlags getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId setPersonProperties".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||(window.posthog=[]));

  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    autocapture: false,        // don't capture every click on the merchant's storefront
    capture_pageview: false,   // we only want our explicit crossword events
    capture_performance: false, // web vitals not useful across merchant storefronts
  });

  window.CloverKitAnalytics = {
    trackPuzzleStarted: function (shopName, difficulty) {
      posthog.capture('crossword_puzzle_started', {
        shop: shopName,
        difficulty: difficulty,
      });
    },

    trackPuzzleCompleted: function (shopName, difficulty, elapsedSeconds) {
      posthog.capture('crossword_puzzle_completed', {
        shop: shopName,
        difficulty: difficulty,
        elapsed_seconds: elapsedSeconds,
      });
    },
  };
})();
