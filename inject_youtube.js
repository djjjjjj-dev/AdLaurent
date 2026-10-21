// AdShield Pro - YouTube In-Page Ad Neutralizer (Runs in MAIN world context)

(function () {
  'use strict';

  // 1. Strip ad placements from player response object
  function cleanPlayerResponse(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    try {
      if (obj.adPlacements) delete obj.adPlacements;
      if (obj.playerAds) delete obj.playerAds;
      if (obj.adSlots) delete obj.adSlots;
      if (obj.adBreakHeartbeatParams) delete obj.adBreakHeartbeatParams;
    } catch (e) {}
    return obj;
  }

  // Neutralize initial player response on initial page load
  if (window.ytInitialPlayerResponse) {
    cleanPlayerResponse(window.ytInitialPlayerResponse);
  }

  let rawInitialPlayerResponse = window.ytInitialPlayerResponse;
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    get() {
      return rawInitialPlayerResponse;
    },
    set(val) {
      rawInitialPlayerResponse = cleanPlayerResponse(val);
    },
    configurable: true
  });

  // 2. Intercept JSON responses for SPA player requests (/youtubei/v1/player)
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

    if (url.includes('/youtubei/v1/player')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        cleanPlayerResponse(data);
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } catch (e) {
        return response;
      }
    }
    return response;
  };

  // Intercept XMLHttpRequest for legacy/fallback requests
  const originalXHR = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === 'string' && url.includes('/youtubei/v1/player')) {
      this.addEventListener('readystatechange', function () {
        if (this.readyState === 4 && this.status === 200) {
          try {
            const data = JSON.parse(this.responseText);
            cleanPlayerResponse(data);
            Object.defineProperty(this, 'responseText', {
              value: JSON.stringify(data),
              configurable: true
            });
            Object.defineProperty(this, 'response', {
              value: JSON.stringify(data),
              configurable: true
            });
          } catch (e) {}
        }
      });
    }
    return originalXHR.apply(this, [method, url, ...rest]);
  };

  console.log('[AdShield Pro] Zero-delay YouTube engine initialized');
})();
