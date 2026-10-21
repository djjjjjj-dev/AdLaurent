// AdShield Pro - Universal Content Script for All Websites

(function () {
  'use strict';

  // Do not duplicate efforts if specialized scripts handle YouTube/Twitch
  const hostname = window.location.hostname.toLowerCase();
  const isYouTube = hostname.includes('youtube.com');
  const isTwitch = hostname.includes('twitch.tv');

  let isEnabled = true;
  let sessionBlockedCount = 0;
  let reportTimeout = null;
  let pendingBlockCount = 0;
  let lastReportedType = 'Bannières & Trackers';

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

  // Retrieve current settings
  if (isExtensionValid()) {
    chrome.storage.local.get('settings', (data) => {
      if (data && data.settings) {
        isEnabled = data.settings.enabled !== false && data.settings.genericEnabled !== false;
      }
    });

    // Settings synchronization
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.settings) {
        const s = changes.settings.newValue;
        isEnabled = s.enabled !== false && s.genericEnabled !== false;
      }
    });
  }

  // Comprehensive ad selectors across French and international websites
  const AD_SELECTORS = [
    // Google AdSense & Google Publisher Tag (DFP/GAM)
    '.adsbygoogle',
    'ins.adsbygoogle',
    '[id^="google_ads_"]',
    '[id*="google_ads_iframe"]',
    '[id^="div-gpt-ad"]',
    '[id*="-gpt-ad-"]',
    '[id*="gpt-ad"]',
    'div[id*="google_ads"]',
    '[class*="dfp"]',
    '[id*="dfp"]',
    '.dfp-slot',
    '.dfp__slot',
    '.dfp__container',
    '[data-format*="banniere"]',
    '[data-format*="habillage"]',
    '[data-format*="pave"]',
    '[data-slot-name]',

    // French & European Press (Le Monde, Le Figaro, BFM, 20 Minutes, etc.)
    '[class*="ds-ad-slot"]',
    '[class*="ds-home__pub"]',
    '[class*="adm-ad"]',
    '.suspended-banner',
    '.lmd-banners',
    '[id*="habillage"]',
    '[class*="habillage"]',
    '[id*="banniere"]',
    '[class*="banniere"]',
    '[id*="pave_"]',
    '[class*="pave_"]',
    '[class*="pave-"]',
    '[class*="publicite"]',
    '[id*="publicite"]',
    '[class*="pub-"]',
    '[class*="__pub"]',
    '[class*="_pub_"]',
    '[class*="encart-pub"]',
    '[class*="fig-ad"]',
    '[id*="fig-ad"]',
    '[class*="sas_"]',
    '[id*="sas_"]',
    '[id^="sas_"]',
    '[class*="smartad"]',

    // Video In-Read & Native Ad Networks (Teads, Criteo, Taboola, Outbrain)
    '[class*="teads"]',
    '[id*="teads"]',
    '.taboola-container',
    '.taboola-below-article-thumbnails',
    '#taboola-below-article-thumbnails',
    '.trc_related_container',
    '.trc_rbox_container',
    '.outbrain-container',
    '.outbrain_widget',
    '.ob-widget',
    '.ob-smartfeed-wrapper',
    '.criteo-ad',
    '.criteo-placeholder',
    '[class*="criteo"]',
    '[class*="taboola"]',
    '[class*="outbrain"]',

    // Generic Ad Containers
    '.ad-banner',
    '.ad-container',
    '.ad-slot',
    '.ad-wrapper',
    '.ad-unit',
    '.ad-box',
    '.ad-placement',
    '.top-ad',
    '.bottom-ad',
    '.banner-ad',
    '.sticky-ad',
    '.ad-overlay',
    '.interstitial-ad',
    '[data-ad]',
    '[data-ad-slot]',
    '[data-ad-unit]',
    '[data-ad-client]',
    '[aria-label="advertisement" i]',
    '[aria-label="publicité" i]',
    '[aria-label="annonce" i]',
    '[aria-label="sponsored" i]',
    '.promotedlink',
    '[data-adclicklocation]',
    '.sponsored-post',
    '.sponsored-content',
    '[class*="sponsor"]',

    // Ad Iframes
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="googleadservices.com"]',
    'iframe[src*="amazon-adsystem.com"]',
    'iframe[src*="criteo.com"]',
    'iframe[src*="criteo.net"]',
    'iframe[src*="adnxs.com"]',
    'iframe[src*="taboola.com"]',
    'iframe[src*="outbrain.com"]',
    'iframe[src*="smartadserver.com"]',
    'iframe[src*="sascdn.com"]',
    'iframe[src*="rubiconproject.com"]',
    'iframe[src*="teads.tv"]',
    'iframe[id^="google_ads_iframe"]',
    'iframe[title*="3rd party ad content" i]',
    'iframe[title*="advertisement" i]',
    'iframe[title*="publicité" i]'
  ];

  const JOINED_SELECTORS = AD_SELECTORS.join(', ');

  // Notify background about blocked ads with batching
  function reportBlockedAds(count = 1, category = 'Bannières & Widgets') {
    if (!isEnabled) return;
    pendingBlockCount += count;
    sessionBlockedCount += count;
    lastReportedType = category;

    if (reportTimeout) clearTimeout(reportTimeout);
    reportTimeout = setTimeout(() => {
      if (pendingBlockCount > 0) {
        const toSend = pendingBlockCount;
        pendingBlockCount = 0;
        safeSendMessage({
          type: 'AD_BLOCKED',
          platform: 'generic',
          domain: window.location.hostname,
          url: window.location.href,
          count: toSend,
          category: lastReportedType,
          secondsSaved: toSend * 3
        });
      }
    }, 350);
  }

  // Fast DOM Ad Cleaner - Complete Physical DOM Removal
  function cleanAdElements(root = document) {
    if (!isEnabled) return;
    if (isYouTube || isTwitch) return; // Specialized scripts handle these

    try {
      const candidates = root.querySelectorAll ? root.querySelectorAll(JOINED_SELECTORS) : [];
      let found = 0;

      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        if (!el || el.dataset.adshieldBlocked) continue;

        el.dataset.adshieldBlocked = 'true';

        // Blank out iframe sources immediately to stop network activity
        try {
          if (el.tagName === 'IFRAME') {
            el.src = 'about:blank';
          }
        } catch (_) {}

        const parent = el.parentElement;

        // Permanently destroy and remove the ad element from the DOM tree
        try {
          el.remove();
        } catch (_) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
        }

        // If parent wrapper was dedicated to ads or is now empty, remove it too
        if (parent && parent !== document.body && parent !== document.documentElement) {
          const pClass = String(parent.className || '').toLowerCase();
          const pId = String(parent.id || '').toLowerCase();
          const isAdParent = pClass.includes('ad-') || pClass.includes('dfp') || pClass.includes('pub') ||
                             pId.includes('ad-') || pId.includes('dfp') || pId.includes('pub');
          if (isAdParent && parent.children.length === 0) {
            try { parent.remove(); } catch (_) {}
          }
        }

        found++;
      }

      if (found > 0) {
        reportBlockedAds(found, 'Bannières & Widgets');
      }
    } catch (_) {}
  }

  // Universal HTML5 Video Ad Skipper (e.g., news portals, Dailymotion, video embeds)
  function handleGenericVideoAds() {
    if (!isEnabled || isYouTube || isTwitch) return;

    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      if (video.dataset.adshieldChecked) return;

      const parentAd = video.closest('[class*="ad-"], [class*="ads-"], [id*="ad-"], .video-ad, .ad-container, .preroll, [class*="pub-"], [class*="dfp"]');
      const isShortAd = video.duration && video.duration < 35 && (video.src.includes('ad') || video.currentSrc.includes('ad'));

      if (parentAd || isShortAd) {
        video.dataset.adshieldChecked = 'true';
        video.muted = true;
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration;
        } else {
          video.playbackRate = 16.0;
        }
        reportBlockedAds(1, 'Vidéo Pub');
      }
    });
  }

  // Intelligent Anti-Popup & Popunder Blocker
  function setupPopupProtection() {
    if (isYouTube || isTwitch) return;

    try {
      const originalWindowOpen = window.open;
      window.open = function (url, target, features) {
        if (!isEnabled) {
          return originalWindowOpen.apply(this, arguments);
        }

        const urlString = String(url || '').toLowerCase();
        const suspiciousPatterns = [
          'popads', 'popcash', 'propellerads', 'adsterra', 'exoclick',
          'clickadu', 'trafficjunky', 'onclick', 'doubleclick', 'adservice',
          'track', 'affiliate', 'cpm', 'bidvertiser'
        ];

        const isSuspicious = suspiciousPatterns.some((pattern) => urlString.includes(pattern));

        if (isSuspicious) {
          console.warn('[AdShield Pro] Popup publicitaire neutralisé:', url);
          reportBlockedAds(1, 'Fenêtre Pop-up');
          return null;
        }

        return originalWindowOpen.apply(this, arguments);
      };
    } catch (_) {}
  }

  // Document class indicator
  function initDoc() {
    if (document.body) {
      document.body.classList.add('adshield-clean');
    }
  }

  // MutationObserver for continuous dynamic ad blocking
  function initObserver() {
    if (isYouTube || isTwitch) return;

    cleanAdElements(document);
    handleGenericVideoAds();

    const observer = new MutationObserver((mutations) => {
      if (!isExtensionValid()) {
        observer.disconnect();
        return;
      }
      let shouldClean = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
          shouldClean = true;
          break;
        }
      }
      if (shouldClean) {
        cleanAdElements(document);
        handleGenericVideoAds();
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initialization sequence
  setupPopupProtection();

  // Run immediately on existing elements
  cleanAdElements(document);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initDoc();
      initObserver();
    });
  } else {
    initDoc();
    initObserver();
  }

  window.addEventListener('load', () => {
    cleanAdElements(document);
    handleGenericVideoAds();
  });

  // Periodic safety sweep
  const sweepInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(sweepInterval);
      return;
    }
    if (isEnabled && !isYouTube && !isTwitch) {
      cleanAdElements(document);
      handleGenericVideoAds();
    }
  }, 1500);

})();
