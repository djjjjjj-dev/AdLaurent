// Content Script for Twitch Ad Elimination & Auto-Claim - AdLaurent

(function () {
  'use strict';

  if (window.__adlaurent_twitch_loaded) return;
  window.__adlaurent_twitch_loaded = true;

  function isExtensionValid() {
    try {
      return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    } catch (_) {
      return false;
    }
  }

  function safeSendMessage(message) {
    if (!isExtensionValid()) return;
    try {
      chrome.runtime.sendMessage(message, () => {
        const _ = chrome.runtime.lastError;
      });
    } catch (_) {}
  }

  let isEnabled = true;
  let autoClaimEnabled = true;
  let lastVideoAdReportedTime = 0;
  let lastBannerReportedTime = 0;
  let lastClaimedTime = 0;

  // Retrieve current settings
  if (isExtensionValid()) {
    chrome.storage.local.get('settings', (data) => {
      if (data && data.settings) {
        isEnabled = data.settings.enabled !== false && data.settings.twitchEnabled !== false;
        autoClaimEnabled = data.settings.twitchAutoClaim !== false;
      }
    });

    // Real-time settings sync
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.settings) {
        const s = changes.settings.newValue;
        isEnabled = s.enabled !== false && s.twitchEnabled !== false;
        autoClaimEnabled = s.twitchAutoClaim !== false;
      }
    });
  }

  function recordAdBlocked(count = 1, category = 'Coupure Twitch', seconds = 30, target = '', method = '') {
    if (!isEnabled || !isExtensionValid() || document.hidden) return;
    safeSendMessage({
      type: 'AD_BLOCKED',
      platform: 'twitch',
      domain: 'twitch.tv',
      category: category,
      count: count,
      target: target || 'Flux vidéo commercial Twitch',
      method: method || 'VAFT Webpack Hook (Segments M3U8 substitués)',
      secondsSaved: seconds
    });
  }

  // Listen to in-page ad bypass events from inject_twitch.js (1 per ad break)
  window.addEventListener('adlaurent-twitch-ad-blocked', (event) => {
    if (document.hidden) return;
    const now = Date.now();
    if (now - lastVideoAdReportedTime < 25000) return;
    lastVideoAdReportedTime = now;
    const seconds = (event.detail && event.detail.seconds) || 30;
    recordAdBlocked(1, 'Coupure Vidéo Twitch (Sans pub)', seconds, 'Coupure pub flux vidéo (M3U8 Usher)', 'VAFT Engine - Suppression segments pub & maintien du live');
  });

  // Permanently remove all ad containers, banners, chat cards, and overlays from Twitch DOM (Active tab only)
  function purgeTwitchAdElements() {
    if (!isEnabled || document.hidden) return;

    const selectors = [
      // Chat ad cards, community highlights & sponsored drops (Apple TV, partner promotions, etc.)
      '.community-highlight',
      '[class*="community-highlight"]',
      '.community-highlight-wrapper',
      '[data-test-selector*="community-highlight"]',
      '.disclosure-card',
      '.stream-display-ad__wrapper',
      '.stream-display-ad__container',
      '.chat-banner',
      '[data-a-target="chat-ad"]',
      '[data-test-selector="chat-ad"]',
      '[data-test-selector*="ad-banner"]',
      '[data-test-selector="drops-claim-banner"]',
      '.stream-chat [class*="chat-ad"]',
      '.stream-chat [class*="ChatAd"]',
      '.stream-chat [class*="disclosure"]',

      // Video Player ad overlays & badges
      '[data-a-target="video-ad-label"]',
      '[data-a-target="video-ad-countdown"]',
      '[data-test-selector="ad-banner-default-text"]',
      '.video-player__ad-overlay',
      '.player-ad-overlay',
      '.tw-ad-slot',
      '.ad-slot',
      '.channel-page-carousel-ad',
      '.whisper-thread--ad',
      '.top-nav__ad-container',
      'iframe[src*="amazon"]',
      'script[src*="amazon-adsystem"]',
      'script[src*="spade.twitch.tv"]',
      '[aria-label="Annonce"]',
      '[aria-label="Advertisement"]'
    ];

    let removedCount = 0;
    for (const sel of selectors) {
      const elements = document.querySelectorAll(sel);
      elements.forEach((el) => {
        if (el.dataset.adlaurentRemoved) return;
        el.dataset.adlaurentRemoved = 'true';
        try {
          el.remove();
          removedCount++;
        } catch (_) {}
      });
    }

    // Remove buttons or links for external ads ("En savoir plus", Apple links, etc.)
    const adLinks = document.querySelectorAll('a[href*="apple.com"], a[href*="amazon.com/ad"], [data-a-target*="sponsor"]');
    adLinks.forEach((a) => {
      if (a.dataset.adlaurentRemoved) return;
      a.dataset.adlaurentRemoved = 'true';
      try {
        const card = a.closest('.community-highlight') || a.closest('.disclosure-card') || a.closest('.chat-banner') || a;
        card.remove();
        removedCount++;
      } catch (_) {}
    });

    if (removedCount > 0) {
      const now = Date.now();
      if (now - lastBannerReportedTime > 15000) {
        lastBannerReportedTime = now;
        recordAdBlocked(1, 'Bannières & Promos', 10, 'Bannière promotionnelle / Drop Apple TV chat', 'Purge DOM sélective');
      }
    }
  }

  // Auto-Claim Twitch Channel Points bonus chests
  function autoClaimChannelPoints() {
    if (!isEnabled || !autoClaimEnabled) return;
    const now = Date.now();
    if (now - lastClaimedTime < 3000) return;

    const claimSelectors = [
      'button[aria-label="Claim Bonus"]',
      'button[aria-label="Récupérer le bonus"]',
      'button[aria-label*="Bonus"]',
      'button[aria-label*="bonus"]',
      '.community-points-summary button:not([disabled])',
      '[data-test-selector="community-points-summary"] button',
      '.claimable-bonus__icon'
    ];

    for (const sel of claimSelectors) {
      const target = document.querySelector(sel);
      if (target) {
        const btn = target.tagName === 'BUTTON' ? target : target.closest('button');
        if (btn && typeof btn.click === 'function' && !btn.disabled) {
          btn.click();
          lastClaimedTime = now;
          safeSendMessage({
            type: 'POINTS_CLAIMED',
            amount: 50
          });
          break;
        }
      }
    }
  }

  // Initial and periodic sweeps (idle-aware)
  purgeTwitchAdElements();

  const claimInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(claimInterval);
      return;
    }
    if (document.hidden) return;
    autoClaimChannelPoints();
  }, 3000);

  // MutationObserver for instant DOM ad removal (throttled to 350ms)
  let twitchThrottleTimer = null;
  const observer = new MutationObserver(() => {
    if (!isExtensionValid()) {
      observer.disconnect();
      return;
    }
    if (document.hidden) return;

    if (!twitchThrottleTimer) {
      twitchThrottleTimer = setTimeout(() => {
        twitchThrottleTimer = null;
        if (document.hidden) return;
        purgeTwitchAdElements();
        autoClaimChannelPoints();
      }, 350);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  console.log('[AdLaurent] Content script Twitch actif');
})();
