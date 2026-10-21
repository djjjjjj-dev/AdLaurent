// AdLaurent - Universal Content Script for All Websites

(function () {
  'use strict';

  if (window.__adlaurent_generic_loaded) return;
  window.__adlaurent_generic_loaded = true;

  const hostname = window.location.hostname.toLowerCase();
  const isYouTube = hostname.includes('youtube.com');
  const isTwitch = hostname.includes('twitch.tv');

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

  let isEnabled = true;
  let blockCookies = true;
  let blockNewsletters = true;
  let blockStickyVideos = true;
  let cleanTrackingUrls = true;
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
        blockCookies = data.settings.blockCookies !== false;
        blockNewsletters = data.settings.blockNewsletters !== false;
        blockStickyVideos = data.settings.blockStickyVideos !== false;
        cleanTrackingUrls = data.settings.cleanTrackingUrls !== false;
      }
    });

    // Settings synchronization
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.settings) {
        const s = changes.settings.newValue;
        isEnabled = s.enabled !== false && s.genericEnabled !== false;
        blockCookies = s.blockCookies !== false;
        blockNewsletters = s.blockNewsletters !== false;
        blockStickyVideos = s.blockStickyVideos !== false;
        cleanTrackingUrls = s.cleanTrackingUrls !== false;
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

  let lastReportedTarget = '';
  let lastReportedMethod = '';

  // Notify background about blocked ads with batching
  function reportBlockedAds(count = 1, category = 'Bannières & Widgets', target = '', method = '') {
    if (!isEnabled) return;
    pendingBlockCount += count;
    sessionBlockedCount += count;
    lastReportedType = category;
    if (target) lastReportedTarget = target;
    if (method) lastReportedMethod = method;

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
          target: lastReportedTarget || `${toSend} élément(s) publicitaire(s) DOM`,
          method: lastReportedMethod || 'Purge DOM physique (MutationObserver & Sélecteurs CSS)',
          secondsSaved: toSend * 3
        });
        lastReportedTarget = '';
        lastReportedMethod = '';
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
        if (!el || el.dataset.adlaurentBlocked) continue;

        el.dataset.adlaurentBlocked = 'true';

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
        reportBlockedAds(found, 'Bannières & Widgets', `${found} conteneur(s) pub (.ads, iframe, dfp)`, 'Purge DOM physique (MutationObserver & Sélecteurs universels)');
      }
    } catch (_) {}
  }

  // Universal HTML5 Video Ad Skipper (e.g., news portals, Dailymotion, video embeds)
  function handleGenericVideoAds() {
    if (!isEnabled || isYouTube || isTwitch) return;

    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      if (video.dataset.adlaurentChecked) return;

      const parentAd = video.closest('[class*="ad-"], [class*="ads-"], [id*="ad-"], .video-ad, .ad-container, .preroll, [class*="pub-"], [class*="dfp"]');
      const isShortAd = video.duration && video.duration < 35 && (video.src.includes('ad') || video.currentSrc.includes('ad'));

      if (parentAd || isShortAd) {
        video.dataset.adlaurentChecked = 'true';
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

        // Never intercept authentication, workspace, or common SSO popups
        if (/cloud\.microsoft|teams\.|login\.|microsoft\.|office\.|google\.|accounts\.google|github\.|apple\./i.test(urlString)) {
          return originalWindowOpen.apply(this, arguments);
        }

        const suspiciousPatterns = [
          'popads', 'popcash', 'propellerads', 'adsterra', 'exoclick',
          'clickadu', 'trafficjunky', 'onclick', 'doubleclick', 'adservice',
          'adtrack', 'clicktrack', 'affiliate', 'cpm', 'bidvertiser', 'popunder'
        ];

        const isSuspicious = suspiciousPatterns.some((pattern) => urlString.includes(pattern));

        if (isSuspicious) {
          console.warn('[AdLaurent] Popup publicitaire neutralisé:', url);
          reportBlockedAds(1, 'Fenêtre Pop-up', urlString, 'Protection Pop-up - window.open() intercepté et avorté');
          return null;
        }

        return originalWindowOpen.apply(this, arguments);
      };
    } catch (_) {}
  }

  // Document class indicator
  function initDoc() {
    if (document.body) {
      document.body.classList.add('adlaurent-clean');
    }
  }

  // MutationObserver for continuous dynamic ad blocking (debounced & idle-aware)
  function initObserver() {
    if (isYouTube || isTwitch) return;

    cleanAdElements(document);
    handleGenericVideoAds();

    let cleanThrottleTimer = null;

    const observer = new MutationObserver((mutations) => {
      if (!isExtensionValid()) {
        observer.disconnect();
        return;
      }
      if (document.hidden) return; // Do zero work when tab is in background

      let hasAddedNodes = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
          hasAddedNodes = true;
          break;
        }
      }
      if (!hasAddedNodes) return;

      if (!cleanThrottleTimer) {
        cleanThrottleTimer = setTimeout(() => {
          cleanThrottleTimer = null;
          if (document.hidden) return;
          cleanAdElements(document);
          handleGenericVideoAds();
        }, 200);
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  // Anti-Adblock Killer & Scroll Lock Restorer
  function killAntiAdblock() {
    if (!isEnabled || isYouTube || isTwitch) return;

    const antiAdblockSelectors = [
      '.fc-ab-root',
      '.fc-dialog-container',
      '.fc-ab-dialog',
      'div[class*="fc-whitelist"]',
      '[class*="admiral-root"]',
      'div[id^="admiral-"]',
      '[class*="adblock-modal"]',
      '[id*="adblock-modal"]',
      '[class*="adblocker-modal"]',
      '[class*="adblock-overlay"]',
      '[id*="adblock-overlay"]',
      '[class*="adblock-backdrop"]',
      '[class*="anti-adblock"]',
      '[id*="anti-adblock"]',
      '.sp-message-open',
      '.adblock-warning',
      '.adblock-detected',
      '.adblocker-overlay'
    ];

    let killed = 0;
    antiAdblockSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      els.forEach((el) => {
        try {
          el.remove();
          killed++;
        } catch (_) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });

    // Detect text-based anti-adblock modals with fixed/absolute positioning
    const fixedOverlays = document.querySelectorAll('div[style*="fixed"], div[style*="absolute"]');
    fixedOverlays.forEach((el) => {
      if (el.dataset.adlaurentChecked) return;
      const txt = (el.innerText || '').toLowerCase();
      if ((txt.includes('bloqueur') || txt.includes('adblock') || txt.includes('ad blocker')) &&
          (txt.includes('désactiver') || txt.includes('disable') || txt.includes('whitelist') || txt.includes('soutenir'))) {
        el.dataset.adlaurentChecked = 'true';
        try {
          el.remove();
          killed++;
        } catch (_) {}
      }
    });

    restoreScrollAndUnblur(killed > 0);

    if (killed > 0) {
      reportBlockedAds(killed, 'Anti-Adblock Déjoué');
    }
  }

  // Restore Scroll Lock & Remove Paywall/Anti-adblock blur
  function restoreScrollAndUnblur(forced = false) {
    const docEl = document.documentElement;
    const body = document.body;
    if (!body) return;

    const antiAdblockLock = docEl.classList.contains('fc-ab-open') ||
                           body.classList.contains('fc-ab-open') ||
                           docEl.classList.contains('sp-message-open') ||
                           body.classList.contains('sp-message-open');

    if (antiAdblockLock || forced) {
      body.style.setProperty('overflow', 'auto', 'important');
      docEl.style.setProperty('overflow', 'auto', 'important');
      body.style.setProperty('position', 'static', 'important');

      body.classList.remove('modal-open', 'fc-ab-open', 'no-scroll', 'sp-message-open');
      docEl.classList.remove('fc-ab-open', 'modal-open', 'no-scroll');
    }

    // Unblur articles and re-enable user interaction
    const blurredContainers = document.querySelectorAll('article, main, #content, .article-content, [class*="article-body"]');
    blurredContainers.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.filter && style.filter.includes('blur')) {
        el.style.setProperty('filter', 'none', 'important');
        el.style.setProperty('-webkit-filter', 'none', 'important');
        el.style.setProperty('user-select', 'auto', 'important');
        el.style.setProperty('pointer-events', 'auto', 'important');
      }
    });
  }

  // Link Cleaner - Tracking parameters
  const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'mc_eid', 'igshid', 'yclid',
    '_hsenc', '_hsmi', 'mkt_tok', 'sc_src', 'sc_lid', 'rb_clickid'
  ];

  function cleanCurrentUrlTracking() {
    if (!isEnabled || !cleanTrackingUrls) return;
    try {
      const url = new URL(window.location.href);
      let removed = false;
      TRACKING_PARAMS.forEach((param) => {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          removed = true;
        }
      });
      if (removed) {
        window.history.replaceState(null, document.title, url.toString());
        reportBlockedAds(1, 'Lien Espion');
      }
    } catch (_) {}
  }

  function cleanClickedLink(e) {
    if (!isEnabled || !cleanTrackingUrls) return;
    const a = e.target.closest ? e.target.closest('a') : null;
    if (a && a.href && (a.href.startsWith('http://') || a.href.startsWith('https://'))) {
      try {
        const url = new URL(a.href);
        let removed = false;
        TRACKING_PARAMS.forEach((param) => {
          if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            removed = true;
          }
        });
        if (removed) {
          a.href = url.toString();
        }
      } catch (_) {}
    }
  }
  document.addEventListener('click', cleanClickedLink, true);

  // Cookie Consent Banners Killer
  const COOKIE_SELECTORS = [
    '#didomi-host',
    '.didomi-popup-container',
    '[id*="didomi-notice"]',
    '#onetrust-consent-sdk',
    '#onetrust-banner-sdk',
    '.onetrust-pc-dark-filter',
    '#CybotCookiebotDialog',
    '#CybotCookiebotDialogBodyUnderlay',
    '[id*="axeptio"]',
    '[class*="axeptio"]',
    '#tarteaucitronRoot',
    '#tarteaucitronAlertBig',
    '#tarteaucitronBack',
    '.qc-cmp2-container',
    '.qc-cmp-cleanslate',
    '.trustarc-banner-container',
    '#truste-consent-track',
    '[id*="cookie-banner"]',
    '[class*="cookie-banner"]',
    '[id*="cookie-consent"]',
    '[class*="cookie-consent"]',
    '[id*="cookie-notice"]',
    '[class*="cookie-notice"]',
    '[class*="gdpr-banner"]',
    '[class*="consent-banner"]',
    '[id*="consent-banner"]',
    '[class*="cookie-law"]',
    '#cookie-law-info-bar'
  ];

  function cleanCookieBanners() {
    if (!isEnabled || !blockCookies || isYouTube || isTwitch) return;

    let removed = 0;
    COOKIE_SELECTORS.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      els.forEach((el) => {
        try {
          el.remove();
          removed++;
        } catch (_) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });

    if (removed > 0) {
      if (document.body) document.body.style.setProperty('overflow', 'auto', 'important');
      if (document.documentElement) document.documentElement.style.setProperty('overflow', 'auto', 'important');
      reportBlockedAds(removed, 'Bandeau Cookie', 'Bannière de consentement RGPD (Didomi, OneTrust, Axeptio)', 'Defuser RGPD - Suppression overlay & Restauration scroll lock');
    }
  }

  // Newsletter & Exit-Intent Popups Killer
  const NEWSLETTER_SELECTORS = [
    '[class*="newsletter-popup"]',
    '[id*="newsletter-popup"]',
    '[class*="newsletter-modal"]',
    '[id*="newsletter-modal"]',
    '[class*="mailchimp-popup"]',
    '[class*="exit-popup"]',
    '[class*="exit-intent"]',
    '[class*="sub-popup"]',
    '[id*="sub-popup"]',
    '[class*="optin-modal"]',
    '[class*="optin-popup"]',
    '.om-holder',
    '[id*="om-"]',
    '.sumo-popup',
    '[class*="pum-container"]',
    '[class*="spu-container"]',
    '[class*="privy-popup"]',
    '[class*="sleeknote"]'
  ];

  function cleanNewsletterPopups() {
    if (!isEnabled || !blockNewsletters || isYouTube || isTwitch) return;

    let removed = 0;
    NEWSLETTER_SELECTORS.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      els.forEach((el) => {
        try {
          el.remove();
          removed++;
        } catch (_) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });

    // Detect exit-intent email subscription overlays with fixed position
    const fixedOverlays = document.querySelectorAll('div[style*="fixed"]');
    fixedOverlays.forEach((el) => {
      if (el.dataset.adlaurentNewsletter) return;
      const hasEmailInput = el.querySelector('input[type="email"], input[name*="email" i]');
      const text = (el.innerText || '').toLowerCase();
      if (hasEmailInput && (text.includes('newsletter') || text.includes('abonnez') || text.includes('inscrivez') || text.includes('subscribe'))) {
        el.dataset.adlaurentNewsletter = 'true';
        try {
          el.remove();
          removed++;
        } catch (_) {}
      }
    });

    if (removed > 0) {
      if (document.body) document.body.style.setProperty('overflow', 'auto', 'important');
      reportBlockedAds(removed, 'Popup Newsletter', 'Modale de capture e-mail exit-intent', 'Defuser Newsletter - Élimination physique du popup fixe');
    }
  }

  // Floating Sticky Autoplay Videos Killer
  const STICKY_VIDEO_SELECTORS = [
    '[class*="sticky-player"]',
    '[class*="pip-player"]',
    '[class*="float-player"]',
    '[class*="floating-player"]',
    '[id*="floating-video"]',
    '[class*="docked-video"]',
    '.video-sticky',
    '.jw-flag-floating',
    '.vjs-floating-player',
    '[class*="sticky-video"]',
    '[id*="sticky-video"]',
    '[class*="sticky_player"]'
  ];

  function cleanStickyVideos() {
    if (!isEnabled || !blockStickyVideos || isYouTube || isTwitch) return;

    let removed = 0;
    STICKY_VIDEO_SELECTORS.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      els.forEach((el) => {
        const v = el.querySelector('video');
        if (v && typeof v.pause === 'function') {
          try { v.pause(); } catch (_) {}
        }
        try {
          el.remove();
          removed++;
        } catch (_) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });

    if (removed > 0) {
      reportBlockedAds(removed, 'Vidéo Flottante', 'Lecteur vidéo flottant autoplay', 'Anti-Sticky - Neutralisation conteneur PIP');
    }
  }

  function cleanAll() {
    cleanAdElements(document);
    handleGenericVideoAds();
    killAntiAdblock();
    cleanCookieBanners();
    cleanNewsletterPopups();
    cleanStickyVideos();
    cleanCurrentUrlTracking();
  }

  // Initialization sequence
  setupPopupProtection();

  // Run immediately on existing elements
  cleanAll();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initDoc();
      initObserver();
      cleanAll();
    });
  } else {
    initDoc();
    initObserver();
    cleanAll();
  }

  window.addEventListener('load', () => {
    cleanAll();
  });

  // Periodic safety sweep (5000ms and only when tab is visible)
  const sweepInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(sweepInterval);
      return;
    }
    if (document.hidden) return; // Zero work in background
    if (isEnabled && !isYouTube && !isTwitch) {
      cleanAll();
    }
  }, 5000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isEnabled && !isYouTube && !isTwitch) {
      cleanAll();
    }
  });

})();
