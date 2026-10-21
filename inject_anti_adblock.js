// AdLaurent - Anti-Adblock Killer & Trap Defuser (MAIN world)

(function () {
  'use strict';

  if (window.__adlaurent_antiadblock_loaded) return;
  window.__adlaurent_antiadblock_loaded = true;

  function isTeamsOrWorkplace() {
    const testPattern = /cloud\.microsoft|teams\.|microsoft\.|office\.|office365\.|skype\.|sharepoint\.|live\.com|msauth\.net|msftauth\.net|azure|trafficmanager\.net|windows\.net|msecnd\.net|gfx\.ms|lync\.com/i;
    const host = (window.location.hostname || '').toLowerCase();
    const href = (window.location.href || '').toLowerCase();
    if (testPattern.test(host) || testPattern.test(href)) return true;

    try {
      if (document.referrer && testPattern.test(document.referrer)) return true;
      if (window.location.ancestorOrigins) {
        for (let i = 0; i < window.location.ancestorOrigins.length; i++) {
          if (testPattern.test(window.location.ancestorOrigins[i])) return true;
        }
      }
    } catch (_) {}
    return false;
  }

  // Whitelist Microsoft Teams, Microsoft 365 Cloud, and enterprise authentication
  if (isTeamsOrWorkplace()) {
    return;
  }

  // 1. Defuse global ad-detection booleans
  try {
    window.canRunAds = true;
    window.isAdBlockActive = false;
    window.adblock = false;
    window.adBlockerDetected = false;
    window.google_ad_status = 1;
    window.hasAdBlocker = function () { return false; };
  } catch (_) {}

  // 2. Mock BlockAdBlock & FuckAdBlock libraries
  try {
    const fakeBab = {
      check: function () { return true; },
      clearEvent: function () {},
      on: function (detected, fn) {
        if (!detected && typeof fn === 'function') {
          try { fn(); } catch (_) {}
        }
        return this;
      },
      onDetected: function () { return this; },
      onNotDetected: function (fn) {
        if (typeof fn === 'function') {
          try { fn(); } catch (_) {}
        }
        return this;
      },
      setOption: function () { return this; }
    };

    window.blockAdBlock = fakeBab;
    window.fuckAdBlock = fakeBab;
    window.BlockAdBlock = function () { return fakeBab; };
    window.FuckAdBlock = function () { return fakeBab; };
  } catch (_) {}

  // 3. Mock Google Funding Choices (googlefc)
  try {
    window.googlefc = window.googlefc || {};
    window.googlefc.controlledMessagingFunction = function () {};
    window.googlefc.callbackQueue = [];
    window.googlefc.getConsentedProviders = function () { return []; };
    window.googlefc.showRevocationMessage = function () {};
  } catch (_) {}

  // 4. Mock adsbygoogle pre-load state
  try {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.loaded = true;
  } catch (_) {}

  // 5. Fast Spoof offsetHeight/offsetWidth for bait honey-pot elements
  try {
    const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')?.get;
    const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')?.get;
    const origClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')?.get;
    const BAIT_REGEX = /\b(adsbox|ad-placement|pub_300x250|ad-banner|adsbygoogle|banner-ad|ad-zone|ad_unit)\b/i;

    function isBaitElement(el) {
      if (!el.className && !el.id) return false;
      const combined = (el.className || '') + ' ' + (el.id || '');
      const lower = combined.toLowerCase();
      if (!lower.includes('ad') && !lower.includes('pub')) return false;
      return BAIT_REGEX.test(combined);
    }

    if (origOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        get: function () {
          const val = origOffsetHeight.call(this);
          if (val === 0 && isBaitElement(this)) return 250;
          return val;
        },
        configurable: true
      });
    }

    if (origOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        get: function () {
          const val = origOffsetWidth.call(this);
          if (val === 0 && isBaitElement(this)) return 300;
          return val;
        },
        configurable: true
      });
    }

    if (origClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        get: function () {
          const val = origClientHeight.call(this);
          if (val === 0 && isBaitElement(this)) return 250;
          return val;
        },
        configurable: true
      });
    }
  } catch (_) {}

})();
