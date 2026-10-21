// AdShield - Anti-Adblock Killer & Trap Defuser (MAIN world)

(function () {
  'use strict';

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
    window.snackBar = window.snackBar || {};
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

  // 5. Spoof offsetHeight/offsetWidth for bait honey-pot elements
  try {
    const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')?.get;
    const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')?.get;
    const origClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')?.get;
    const BAIT_REGEX = /\b(adsbox|ad-placement|pub_300x250|ad-banner|adsbygoogle|banner-ad|ad-zone|ad_unit)\b/i;

    if (origOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        get: function () {
          const val = origOffsetHeight.call(this);
          if (val === 0 && (BAIT_REGEX.test(this.className || '') || BAIT_REGEX.test(this.id || ''))) {
            return 250;
          }
          return val;
        },
        configurable: true
      });
    }

    if (origOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        get: function () {
          const val = origOffsetWidth.call(this);
          if (val === 0 && (BAIT_REGEX.test(this.className || '') || BAIT_REGEX.test(this.id || ''))) {
            return 300;
          }
          return val;
        },
        configurable: true
      });
    }

    if (origClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        get: function () {
          const val = origClientHeight.call(this);
          if (val === 0 && (BAIT_REGEX.test(this.className || '') || BAIT_REGEX.test(this.id || ''))) {
            return 250;
          }
          return val;
        },
        configurable: true
      });
    }
  } catch (_) {}

})();
