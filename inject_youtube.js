// AdLaurent - YouTube In-Page Ad Neutralizer (Runs in MAIN world context)

(function () {
  'use strict';

  // Safe ad placement cleaner: set to empty arrays instead of deleting to prevent TypeError crashes in YouTube's player
  function cleanPlayerResponse(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    try {
      if (Array.isArray(obj.adPlacements)) obj.adPlacements = [];
      if (Array.isArray(obj.playerAds)) obj.playerAds = [];
      if (Array.isArray(obj.adSlots)) obj.adSlots = [];
      if (obj.adBreakHeartbeatParams) obj.adBreakHeartbeatParams = null;
    } catch (_) {}
    return obj;
  }

  // Neutralize initial player response on page load safely
  if (window.ytInitialPlayerResponse) {
    cleanPlayerResponse(window.ytInitialPlayerResponse);
  }

  let rawInitialPlayerResponse = window.ytInitialPlayerResponse;
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get() {
        return rawInitialPlayerResponse;
      },
      set(val) {
        rawInitialPlayerResponse = cleanPlayerResponse(val);
      },
      configurable: true
    });
  } catch (_) {}

  // Intercept fetch responses for SPA player requests (/youtubei/v1/player)
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

    if (url.includes('/youtubei/v1/player')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        cleanPlayerResponse(data);

        // Crucial fix: strip compression headers when returning raw uncompressed JSON string
        // Failing to delete content-encoding causes browser gzip decompression errors and black screen hangs
        const newHeaders = new Headers(response.headers);
        newHeaders.delete('content-encoding');
        newHeaders.delete('content-length');
        newHeaders.set('content-type', 'application/json');

        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      } catch (_) {
        return response;
      }
    }
    return response;
  };

  // Intercept XMLHttpRequest for fallback requests
  const originalXHR = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === 'string' && url.includes('/youtubei/v1/player')) {
      this.addEventListener('readystatechange', function () {
        if (this.readyState === 4 && this.status === 200) {
          try {
            if (this.responseText) {
              const data = JSON.parse(this.responseText);
              cleanPlayerResponse(data);
              const str = JSON.stringify(data);
              Object.defineProperty(this, 'responseText', { value: str, configurable: true });
              if (this.responseType === '' || this.responseType === 'text') {
                Object.defineProperty(this, 'response', { value: str, configurable: true });
              } else if (this.responseType === 'json') {
                Object.defineProperty(this, 'response', { value: data, configurable: true });
              }
            }
          } catch (_) {}
        }
      });
    }
    return originalXHR.apply(this, [method, url, ...rest]);
  };

  // Native player skip bridge: allows content script to trigger YouTube's native skipAd() in main world
  window.addEventListener('adlaurent-skip-youtube-ad', () => {
    try {
      const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      if (player && typeof player.skipAd === 'function') {
        player.skipAd();
      }
    } catch (_) {}
  });

  console.log('[AdLaurent] Zero-delay YouTube engine initialized');
})();
