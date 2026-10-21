// Content Script for YouTube Ad Blocking & DOM Cleaner - AdLaurent

(function () {
  if (window.__adlaurent_yt_loaded) return;
  window.__adlaurent_yt_loaded = true;

  let isEnabled = true;
  let lastAdSkippedTime = 0;
  let wasMutedByAdLaurent = false;
  let userPlaybackRate = 1.0;

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
      if (data.settings) {
        isEnabled = data.settings.enabled && data.settings.youtubeEnabled;
      }
    });

    // Settings sync
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.settings) {
        const s = changes.settings.newValue;
        isEnabled = s.enabled && s.youtubeEnabled;
      }
    });
  }

  function recordAdBlocked(seconds = 15, target = 'Annonce vidéo YouTube (Midroll / Preroll)', method = 'Interception Player (Avance 16x & Auto-skip)') {
    if (!isExtensionValid()) return;
    const now = Date.now();
    if (now - lastAdSkippedTime > 1200) {
      lastAdSkippedTime = now;
      safeSendMessage({
        type: 'AD_BLOCKED',
        platform: 'youtube',
        domain: 'youtube.com',
        category: 'Vidéo YouTube',
        target: target,
        method: method,
        secondsSaved: seconds
      });
    }
  }

  // Fast click skip buttons
  function clickSkipButtons(player) {
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-slot button',
      'button.ytp-ad-skip-button',
      'button.ytp-ad-skip-button-modern',
      '.ytp-ad-overlay-close-button',
      '[id^="skip-button:"]',
      'button[aria-label="Skip ad"]',
      'button[aria-label="Passer l\'annonce"]'
    ];

    const root = player || document;
    for (const selector of skipSelectors) {
      const btn = root.querySelector(selector);
      if (btn && typeof btn.click === 'function') {
        btn.click();
        break;
      }
    }
  }

  // Handle Video Player Ads with instant acceleration (Permits background music/playback)
  function handleVideoAds() {
    if (!isEnabled) return;

    const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video');

    if (!moviePlayer || !video) return;

    // Detect strictly when an ad is actively playing
    const hasAdClass = moviePlayer.classList.contains('ad-showing') ||
                       moviePlayer.classList.contains('ad-interrupting');

    const hasAdOverlay = !!document.querySelector('.ytp-ad-player-overlay-layout') ||
                         !!document.querySelector('.ytp-ad-text') ||
                         !!document.querySelector('.ytp-ad-preview-container');

    const isAdShowing = hasAdClass || hasAdOverlay;

    if (isAdShowing) {
      // 1. Mute to prevent glitchy audio during skip
      if (!video.muted) {
        video.muted = true;
        wasMutedByAdLaurent = true;
      }

      // 2. Request native player skip in MAIN world
      window.dispatchEvent(new CustomEvent('adlaurent-skip-youtube-ad'));

      // 3. Click skip button immediately
      clickSkipButtons(moviePlayer);

      // 4. Fast forward ad timeline (ONLY if duration is short, < 180s, never on the real video!)
      video.playbackRate = 16.0;
      if (Number.isFinite(video.duration) && video.duration > 0 && video.duration < 180) {
        video.currentTime = Math.max(0, video.duration - 0.1);
      }

      // 5. If video got paused during ad transition, trigger play to avoid black screen freeze
      if (video.paused && !video.ended) {
        video.play().catch(() => {});
      }

      recordAdBlocked(15);
    } else {
      // Normal video playing - restore normal audio/speed
      if (wasMutedByAdLaurent) {
        video.muted = false;
        wasMutedByAdLaurent = false;
      }
      if (video.playbackRate > 2.0) {
        video.playbackRate = userPlaybackRate || 1.0;
      }

      // Prevent black screen freeze: if normal video is paused at start, kickstart playback
      if (video.paused && !video.ended && video.currentTime < 1 && (moviePlayer.classList.contains('playing-mode') || !moviePlayer.classList.contains('paused-mode'))) {
        video.play().catch(() => {});
      }
    }
  }

  // Remove black squares & empty ad placeholders from homepage and feeds
  function cleanHomepageAndFeeds() {
    if (!isEnabled) return;

    // 1. Remove all explicit ad slots and their parent cards
    const explicitAds = document.querySelectorAll(
      'ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer, ' +
      'ytd-statement-banner-renderer, ytd-display-ad-renderer, ytd-promoted-video-renderer, ' +
      '#masthead-ad, ytd-video-masthead-ad-v3-renderer, ytd-primetime-promo-renderer, ' +
      '.sparkles-light-cta, [id*="ad-slot"], ad-slot-renderer'
    );

    let removed = false;
    explicitAds.forEach(el => {
      const parentCard = el.closest('ytd-rich-item-renderer, ytd-rich-section-renderer');
      if (parentCard) {
        parentCard.remove();
      } else {
        el.remove();
      }
      removed = true;
    });

    // 2. Scan rich items on homepage: remove any that have no video/shorts/post media
    const richItems = document.querySelectorAll('ytd-rich-item-renderer');
    richItems.forEach(item => {
      const hasMedia = item.querySelector(
        'ytd-rich-grid-media, ytd-video-renderer, ytd-rich-grid-slim-media, ' +
        'ytd-post-renderer, ytd-playlist-renderer, ytd-channel-renderer, ytd-radio-renderer'
      );
      if (!hasMedia) {
        // Check if item contains an ad or is an empty placeholder
        const content = item.querySelector('#content');
        if (!content || content.children.length === 0 || item.querySelector('ytd-ad-slot-renderer')) {
          item.remove();
          removed = true;
        }
      }
    });

    // 3. Remove empty rich sections or mastheads
    const richSections = document.querySelectorAll('ytd-rich-section-renderer');
    richSections.forEach(section => {
      if (section.querySelector('#masthead-ad') || section.querySelector('ytd-statement-banner-renderer')) {
        section.remove();
        removed = true;
      }
    });

    if (removed) {
      recordAdBlocked(5, 'Bannière sponsorisée / Masthead feed', 'Purge DOM sélecteur (ytd-ad-slot-renderer / rich-section)');
    }
  }

  // Dismiss anti-adblock modals
  function bypassAntiAdblock() {
    if (!isEnabled) return;

    const dialog = document.querySelector('ytd-enforcement-message-view-model') ||
                   document.querySelector('tp-yt-paper-dialog:has(#feedback.ytd-enforcement-message-view-model)');

    if (dialog) {
      dialog.remove();
      document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(b => b.remove());

      const video = document.querySelector('video');
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }
  }

  // Track user playback rate
  document.addEventListener('ratechange', (e) => {
    const video = e.target;
    if (video && video.tagName === 'VIDEO' && video.playbackRate <= 2.0) {
      userPlaybackRate = video.playbackRate;
    }
  }, true);

  // Hook into video element events for zero-delay skipping
  function hookVideoEvents() {
    const video = document.querySelector('video');
    if (video && !video.dataset.adlaurentHooked) {
      video.dataset.adlaurentHooked = 'true';
      video.addEventListener('timeupdate', handleVideoAds);
      video.addEventListener('play', handleVideoAds);
      video.addEventListener('loadeddata', handleVideoAds);
    }
  }

  // Re-hook whenever user navigates to another video in YouTube SPA
  window.addEventListener('yt-navigate-finish', () => {
    hookVideoEvents();
    handleVideoAds();
  });

  // Intervals: high speed video check and periodic feed cleaner (idle-aware)
  const hookInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(hookInterval);
      return;
    }
    if (document.hidden) return;
    hookVideoEvents();
  }, 1000);

  const adCheckInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(adCheckInterval);
      return;
    }
    if (document.hidden) return;
    handleVideoAds();
  }, 350);

  const cleanInterval = setInterval(() => {
    if (!isExtensionValid()) {
      clearInterval(cleanInterval);
      return;
    }
    if (document.hidden) return;
    cleanHomepageAndFeeds();
    bypassAntiAdblock();
  }, 1200);

  // Run initial cleaning once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hookVideoEvents();
      cleanHomepageAndFeeds();
    });
  } else {
    hookVideoEvents();
    cleanHomepageAndFeeds();
  }

  console.log('[AdLaurent] YouTube zero-delay engine running');
})();
