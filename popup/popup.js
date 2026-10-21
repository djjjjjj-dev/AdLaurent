// AdLaurent - Popup Controller (Universal & History Edition)

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation Tabs
  const tabBtnDashboard = document.getElementById('tabBtnDashboard');
  const tabBtnHistory = document.getElementById('tabBtnHistory');
  const tabDashboard = document.getElementById('tabDashboard');
  const tabHistory = document.getElementById('tabHistory');
  const historySitesCountBadge = document.getElementById('historySitesCountBadge');

  // Current Site Card Elements
  const currentSiteIcon = document.getElementById('currentSiteIcon');
  const currentSiteDomain = document.getElementById('currentSiteDomain');
  const currentSiteStatus = document.getElementById('currentSiteStatus');
  const currentSiteBlockedCount = document.getElementById('currentSiteBlockedCount');

  // Controls Elements
  const masterToggle = document.getElementById('masterToggle');
  const genericToggle = document.getElementById('genericToggle');
  const ytToggle = document.getElementById('ytToggle');
  const twitchToggle = document.getElementById('twitchToggle');
  const twitchClaimToggle = document.getElementById('twitchClaimToggle');
  const cookieToggle = document.getElementById('cookieToggle');
  const newsletterToggle = document.getElementById('newsletterToggle');
  const stickyVideoToggle = document.getElementById('stickyVideoToggle');
  const trackingToggle = document.getElementById('trackingToggle');

  // Dashboard Stat Elements
  const totalBlockedCount = document.getElementById('totalBlockedCount');
  const youtubeBlockedCount = document.getElementById('youtubeBlockedCount');
  const twitchBlockedCount = document.getElementById('twitchBlockedCount');
  const genericBlockedCount = document.getElementById('genericBlockedCount');
  const twitchPointsCount = document.getElementById('twitchPointsCount');
  const timeSavedText = document.getElementById('timeSavedText');

  // Header Status Elements
  const globalStatusPill = document.getElementById('globalStatusPill');
  const globalStatusText = document.getElementById('globalStatusText');
  const masterStatusDesc = document.getElementById('masterStatusDesc');
  const pulseRing = document.getElementById('pulseRing');

  // Chart Elements
  const chartContainer = document.getElementById('chartContainer');
  const weeklyTotalBadge = document.getElementById('weeklyTotalBadge');

  // History Elements
  const historySearchInput = document.getElementById('historySearchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const historySitesSummary = document.getElementById('historySitesSummary');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const siteHistoryList = document.getElementById('siteHistoryList');

  // Technical / Secret Dev Inspector Elements
  const secretConsoleBtn = document.getElementById('secretConsoleBtn');
  const secretDevTrigger = document.getElementById('secretDevTrigger');
  const tabBtnDebug = document.getElementById('tabBtnDebug');
  const tabDebug = document.getElementById('tabDebug');
  const debugCloseBtn = document.getElementById('debugCloseBtn');
  const debugLogCountBadge = document.getElementById('debugLogCountBadge');
  const debugTotalCount = document.getElementById('debugTotalCount');
  const debugLogList = document.getElementById('debugLogList');
  const clearDebugLogBtn = document.getElementById('clearDebugLogBtn');
  const debugFilterChips = document.querySelectorAll('.debug-filter-chips .filter-chip');

  // Action Buttons
  const resetBtn = document.getElementById('resetBtn');
  const reloadTabBtn = document.getElementById('reloadTabBtn');

  // Local state cache
  let currentActiveDomain = '';
  let cachedSiteStats = {};
  let cachedAdLog = [];
  let currentSearchQuery = '';
  let currentDebugFilter = 'all';
  let isDevModeActive = false;

  // Tab switching logic (Supports Dashboard, History, and Technical Inspector)
  function switchTab(target) {
    [tabBtnDashboard, tabBtnHistory, tabBtnDebug].forEach((btn) => btn?.classList.remove('active'));
    [tabDashboard, tabHistory, tabDebug].forEach((tab) => tab?.classList.remove('active'));

    if (target === 'tabHistory') {
      tabBtnHistory.classList.add('active');
      tabHistory.classList.add('active');
      secretConsoleBtn?.classList.remove('active');
      if (historySearchInput) historySearchInput.focus();
    } else if (target === 'tabDebug') {
      if (tabBtnDebug) tabBtnDebug.style.display = 'flex';
      tabBtnDebug?.classList.add('active');
      tabDebug?.classList.add('active');
      secretConsoleBtn?.classList.add('active');
    } else {
      tabBtnDashboard.classList.add('active');
      tabDashboard.classList.add('active');
      secretConsoleBtn?.classList.remove('active');
    }
  }

  function toggleSecretDevMode() {
    isDevModeActive = !isDevModeActive;
    if (isDevModeActive) {
      if (tabBtnDebug) tabBtnDebug.style.display = 'flex';
      switchTab('tabDebug');
      if (pulseRing) {
        pulseRing.style.borderColor = '#38bdf8';
        setTimeout(() => { if (pulseRing) pulseRing.style.borderColor = ''; }, 1200);
      }
    } else {
      switchTab('tabDashboard');
    }
  }

  secretDevTrigger?.addEventListener('click', toggleSecretDevMode);
  secretConsoleBtn?.addEventListener('click', toggleSecretDevMode);
  tabBtnDashboard?.addEventListener('click', () => { isDevModeActive = false; switchTab('tabDashboard'); });
  tabBtnHistory?.addEventListener('click', () => { isDevModeActive = false; switchTab('tabHistory'); });
  tabBtnDebug?.addEventListener('click', () => switchTab('tabDebug'));
  debugCloseBtn?.addEventListener('click', () => { isDevModeActive = false; switchTab('tabDashboard'); });

  // Format seconds to human readable string
  function formatTimeSaved(totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return '0 min économisées';
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remMin = minutes % 60;
      return `${hours}h ${remMin}m économisées`;
    }
    if (minutes > 0) {
      return `${minutes} min économisées`;
    }
    return `${totalSeconds}s économisées`;
  }

  // Format timestamp to relative human string (French)
  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Récemment';
    const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diff < 45) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;

    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} à ${hours}:${mins}`;
  }

  // Smooth counter animation
  function animateValue(element, start, end, duration = 350) {
    if (!element) return;
    if (start === end) {
      element.textContent = end.toLocaleString('fr-FR');
      return;
    }
    const range = end - start;
    let current = start;
    const increment = range / (duration / 16);
    const stepTime = 16;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        current = end;
        clearInterval(timer);
      }
      element.textContent = Math.round(current).toLocaleString('fr-FR');
    }, stepTime);
  }

  // Extract clean domain from URL
  function extractDomain(url) {
    if (!url) return '';
    try {
      if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) {
        return 'Page Système';
      }
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch (_) {
      return '';
    }
  }

  // Detect current active tab
  async function initActiveTabInfo() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0] && tabs[0].url) {
        currentActiveDomain = extractDomain(tabs[0].url);
        if (currentActiveDomain && currentActiveDomain !== 'Page Système') {
          currentSiteDomain.textContent = currentActiveDomain;
          // Set favicon
          const firstChar = currentActiveDomain.charAt(0).toUpperCase();
          currentSiteIcon.innerHTML = `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(currentActiveDomain)}&sz=32" alt="${firstChar}" onerror="this.parentElement.textContent='${firstChar}'">`;
        } else {
          currentSiteDomain.textContent = 'Page Locale / Système';
          currentSiteIcon.textContent = '🔒';
          currentSiteStatus.textContent = 'Protection inactive';
          currentSiteBlockedCount.textContent = '0';
        }
      }
    } catch (_) {}
  }

  // Render weekly activity chart
  function renderWeeklyChart(dailyHistory = {}) {
    if (!chartContainer) return;
    chartContainer.innerHTML = '';

    const dayNames = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
    const days = [];
    let weeklySum = 0;
    let maxVal = 1;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${dayNum}`;
      const count = dailyHistory[key] || 0;
      weeklySum += count;
      if (count > maxVal) maxVal = count;

      days.push({
        key,
        dayLabel: dayNames[d.getDay()],
        count,
        isToday: i === 0
      });
    }

    if (weeklyTotalBadge) {
      weeklyTotalBadge.textContent = `${weeklySum.toLocaleString('fr-FR')} pubs`;
    }

    days.forEach((day) => {
      const col = document.createElement('div');
      col.className = 'chart-col' + (day.isToday ? ' is-today' : '');

      const percent = day.count === 0 ? 8 : Math.max(14, Math.round((day.count / maxVal) * 100));

      col.innerHTML = `
        <div class="chart-bar-track" title="${day.dayLabel.toUpperCase()} (${day.key}) : ${day.count} pub(s) bloquée(s)">
          <div class="chart-bar-fill" style="height: ${percent}%"></div>
        </div>
        <span class="chart-day-label">${day.dayLabel}</span>
      `;
      chartContainer.appendChild(col);
    });
  }

  // Update Status Pill UI
  function updateStatusUI(isEnabled) {
    if (isEnabled) {
      globalStatusPill.classList.remove('disabled');
      globalStatusText.textContent = 'ACTIF';
      masterStatusDesc.textContent = 'Actif';
      pulseRing.style.display = 'block';
    } else {
      globalStatusPill.classList.add('disabled');
      globalStatusText.textContent = 'PAUSE';
      masterStatusDesc.textContent = 'Pause';
      pulseRing.style.display = 'none';
    }
  }

  // Render Site History List
  function renderHistoryList(siteStats = {}) {
    cachedSiteStats = siteStats;
    if (!siteHistoryList) return;

    const sites = Object.values(siteStats || {});
    // Sort by most recently blocked or highest count
    sites.sort((a, b) => (b.lastBlocked || 0) - (a.lastBlocked || 0));

    const totalSites = sites.length;
    if (historySitesCountBadge) {
      historySitesCountBadge.textContent = totalSites.toString();
    }

    // Filter by search query
    const query = currentSearchQuery.trim().toLowerCase();
    const filteredSites = query
      ? sites.filter((s) => s.domain.toLowerCase().includes(query))
      : sites;

    if (historySitesSummary) {
      const countText = totalSites <= 1 ? `${totalSites} site` : `${totalSites} sites`;
      historySitesSummary.textContent = query ? `${filteredSites.length} sur ${countText}` : countText;
    }

    siteHistoryList.innerHTML = '';

    if (filteredSites.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-history-state';
      if (query) {
        emptyDiv.innerHTML = `
          <div class="empty-icon">🔍</div>
          <span class="empty-title">Aucun résultat</span>
          <span class="empty-sub">Aucun site ne correspond à "${query}".</span>
        `;
      } else {
        emptyDiv.innerHTML = `
          <div class="empty-icon">🛡️</div>
          <span class="empty-title">Aucun site enregistré</span>
          <span class="empty-sub">Les sites filtrés apparaîtront ici.</span>
        `;
      }
      siteHistoryList.appendChild(emptyDiv);
      return;
    }

    filteredSites.forEach((site) => {
      const card = document.createElement('div');
      card.className = 'site-card';

      const initial = site.domain ? site.domain.charAt(0).toUpperCase() : '🌐';
      const lastCat = site.lastCategory || 'Publicités';
      const timeStr = formatRelativeTime(site.lastBlocked);
      const blocked = site.totalBlocked || 0;

      card.innerHTML = `
        <div class="site-card-left">
          <div class="site-avatar">
            <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.domain)}&sz=32" alt="${initial}" onerror="this.parentElement.textContent='${initial}'">
          </div>
          <div class="site-meta">
            <div class="site-domain-row">
              <span class="site-domain" title="${site.domain}">${site.domain}</span>
              <span class="site-category-badge">${lastCat}</span>
            </div>
            <span class="site-time-ago">${timeStr}</span>
          </div>
        </div>
        <div class="site-card-right">
          <div class="site-blocked-pill" title="${blocked} pub(s) neutralisée(s)">
            <span class="site-blocked-count">${blocked.toLocaleString('fr-FR')}</span>
            <span class="site-blocked-unit">pubs</span>
          </div>
          <button class="site-delete-btn" data-domain="${site.domain}" title="Supprimer ce site de l'historique">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;

      // Single site delete handler
      const delBtn = card.querySelector('.site-delete-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSiteEntry(site.domain);
      });

      siteHistoryList.appendChild(card);
    });
  }

  // Delete a single site entry
  function deleteSiteEntry(domain) {
    chrome.runtime.sendMessage({
      type: 'DELETE_SITE_HISTORY',
      domain: domain
    }, (res) => {
      if (res && res.stats) {
        renderHistoryList(res.stats.siteStats || {});
        // Update current site card if needed
        if (domain === currentActiveDomain) {
          currentSiteBlockedCount.textContent = '0';
        }
      }
    });
  }

  // Search input listeners
  historySearchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    searchClearBtn.style.display = currentSearchQuery ? 'block' : 'none';
    renderHistoryList(cachedSiteStats);
  });

  searchClearBtn.addEventListener('click', () => {
    historySearchInput.value = '';
    currentSearchQuery = '';
    searchClearBtn.style.display = 'none';
    renderHistoryList(cachedSiteStats);
    historySearchInput.focus();
  });

  // Clear All History Button
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm("Effacer l'historique ?")) {
      chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, (res) => {
        if (res && res.stats) {
          renderHistoryList({});
          if (currentSiteBlockedCount) currentSiteBlockedCount.textContent = '0';
        }
      });
    }
  });

  // Technical Inspector Log Renderer
  function renderDebugLog(adLog = [], filter = 'all') {
    if (!debugLogList) return;
    cachedAdLog = adLog || [];

    const total = cachedAdLog.length;
    if (debugTotalCount) debugTotalCount.textContent = total.toString();
    if (debugLogCountBadge) debugLogCountBadge.textContent = total.toString();

    let filtered = cachedAdLog;
    if (filter === 'network') {
      filtered = cachedAdLog.filter((item) => 
        (item.method && item.method.toLowerCase().includes('declarativenetrequest')) || 
        (item.category && item.category.toLowerCase().includes('réseau'))
      );
    } else if (filter === 'twitch') {
      filtered = cachedAdLog.filter((item) => 
        (item.domain && item.domain.includes('twitch')) || 
        (item.category && item.category.toLowerCase().includes('twitch'))
      );
    } else if (filter === 'youtube') {
      filtered = cachedAdLog.filter((item) => 
        (item.domain && item.domain.includes('youtube')) || 
        (item.category && item.category.toLowerCase().includes('youtube'))
      );
    } else if (filter === 'web') {
      filtered = cachedAdLog.filter((item) => 
        (!item.domain || (!item.domain.includes('twitch') && !item.domain.includes('youtube')))
      );
    }

    if (filtered.length === 0) {
      debugLogList.innerHTML = `
        <div class="empty-debug-state">
          <span class="empty-debug-icon">🔍</span>
          <span class="empty-debug-title">Aucune publicité inspectée pour ce filtre</span>
          <p class="empty-debug-sub">Naviguez sur un site ou lancez un stream pour observer en direct la cible et la méthode de neutralisation.</p>
        </div>
      `;
      return;
    }

    debugLogList.innerHTML = '';
    filtered.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'debug-item-card';

      const domain = escapeHtml(item.domain || 'web');
      const timeStr = formatRelativeTime(item.timestamp);
      const targetStr = escapeHtml(item.target || item.category || 'Élément publicitaire détecté');
      const methodStr = escapeHtml(item.method || 'Filtre universel AdLaurent');
      const categoryStr = escapeHtml(item.category || 'Publicité');

      card.innerHTML = `
        <div class="debug-item-header">
          <div class="debug-item-domain-badge">
            <span>🌐</span>
            <span>${domain}</span>
          </div>
          <span class="debug-item-time">${timeStr}</span>
        </div>

        <div class="debug-item-row">
          <span class="debug-row-label target-label">🎯 Quelle était la pub :</span>
          <span class="debug-target-text">${targetStr}</span>
        </div>

        <div class="debug-item-row">
          <span class="debug-row-label method-label">🛡️ Comment elle est bloquée :</span>
          <span class="debug-method-text">${methodStr}</span>
        </div>

        <div class="debug-footer-row">
          <span class="debug-category-tag">${categoryStr}</span>
          <span>Quantité : +${item.count || 1}</span>
        </div>
      `;

      debugLogList.appendChild(card);
    });
  }

  // Filter chips listeners
  debugFilterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      debugFilterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentDebugFilter = chip.getAttribute('data-filter') || 'all';
      renderDebugLog(cachedAdLog, currentDebugFilter);
    });
  });

  // Clear Technical Log Button
  if (clearDebugLogBtn) {
    clearDebugLogBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, (res) => {
        if (res && res.stats) {
          cachedAdLog = [];
          renderDebugLog([], currentDebugFilter);
        }
      });
    });
  }

  // Render Full Extension State
  function render(state) {
    const { settings = {}, stats = {} } = state;

    masterToggle.checked = settings.enabled !== false;
    if (genericToggle) genericToggle.checked = settings.genericEnabled !== false;
    ytToggle.checked = settings.youtubeEnabled !== false;
    twitchToggle.checked = settings.twitchEnabled !== false;
    twitchClaimToggle.checked = settings.twitchAutoClaim !== false;
    if (cookieToggle) cookieToggle.checked = settings.blockCookies !== false;
    if (newsletterToggle) newsletterToggle.checked = settings.blockNewsletters !== false;
    if (stickyVideoToggle) stickyVideoToggle.checked = settings.blockStickyVideos !== false;
    if (trackingToggle) trackingToggle.checked = settings.cleanTrackingUrls !== false;

    updateStatusUI(settings.enabled !== false);

    const prevTotal = parseInt(totalBlockedCount.textContent.replace(/\s/g, ''), 10) || 0;
    const prevYt = parseInt(youtubeBlockedCount.textContent.replace(/\s/g, ''), 10) || 0;
    const prevTwitch = parseInt(twitchBlockedCount.textContent.replace(/\s/g, ''), 10) || 0;
    const prevGeneric = genericBlockedCount ? parseInt(genericBlockedCount.textContent.replace(/\s/g, ''), 10) || 0 : 0;

    animateValue(totalBlockedCount, prevTotal, stats.totalBlocked || 0);
    animateValue(youtubeBlockedCount, prevYt, stats.youtubeBlocked || 0);
    animateValue(twitchBlockedCount, prevTwitch, stats.twitchBlocked || 0);
    const genericVal = typeof stats.genericBlocked === 'number' && stats.genericBlocked > 0 
      ? stats.genericBlocked 
      : Math.max(0, (stats.totalBlocked || 0) - (stats.youtubeBlocked || 0) - (stats.twitchBlocked || 0));
    if (genericBlockedCount) animateValue(genericBlockedCount, prevGeneric, genericVal);

    timeSavedText.textContent = formatTimeSaved(stats.timeSavedSeconds || 0);

    const points = (stats.twitchPointsClaimed || 0).toLocaleString('fr-FR');
    if (twitchPointsCount) {
      twitchPointsCount.textContent = `+${points}`;
    }

    // Update active site card count
    let currentSiteCount = 0;
    if (currentActiveDomain && stats.siteStats && stats.siteStats[currentActiveDomain]) {
      currentSiteCount = stats.siteStats[currentActiveDomain].totalBlocked || 0;
    } else if (currentActiveDomain === 'twitch.tv' && (stats.twitchBlocked || 0) > 0) {
      currentSiteCount = stats.twitchBlocked;
    } else if (currentActiveDomain === 'youtube.com' && (stats.youtubeBlocked || 0) > 0) {
      currentSiteCount = stats.youtubeBlocked;
    }

    if (currentActiveDomain && currentActiveDomain !== 'Page Système') {
      currentSiteBlockedCount.textContent = currentSiteCount.toLocaleString('fr-FR');
      currentSiteStatus.textContent = currentSiteCount > 0 
        ? `${currentSiteCount} bloquée(s)`
        : 'Page active';
    }

    renderWeeklyChart(stats.dailyHistory || {});
    renderHistoryList(stats.siteStats || {});
    renderDebugLog(stats.adLog || [], currentDebugFilter);
  }

  // Toggle binding helper
  function bindToggle(inputEl, settingKey) {
    if (!inputEl) return;
    inputEl.addEventListener('change', () => {
      const val = inputEl.checked;
      chrome.runtime.sendMessage({
        type: 'TOGGLE_SETTING',
        key: settingKey,
        value: val
      }, (res) => {
        if (res && res.settings && settingKey === 'enabled') {
          updateStatusUI(val);
        }
      });
    });
  }

  bindToggle(masterToggle, 'enabled');
  bindToggle(genericToggle, 'genericEnabled');
  bindToggle(ytToggle, 'youtubeEnabled');
  bindToggle(twitchToggle, 'twitchEnabled');
  bindToggle(twitchClaimToggle, 'twitchAutoClaim');
  if (cookieToggle) bindToggle(cookieToggle, 'blockCookies');
  if (newsletterToggle) bindToggle(newsletterToggle, 'blockNewsletters');
  if (stickyVideoToggle) bindToggle(stickyVideoToggle, 'blockStickyVideos');
  if (trackingToggle) bindToggle(trackingToggle, 'cleanTrackingUrls');

  // Reset Stats Button
  resetBtn.addEventListener('click', () => {
    if (confirm('Réinitialiser les compteurs ?')) {
      chrome.runtime.sendMessage({ type: 'RESET_STATS' }, (res) => {
        if (res && res.stats) {
          totalBlockedCount.textContent = '0';
          youtubeBlockedCount.textContent = '0';
          twitchBlockedCount.textContent = '0';
          if (genericBlockedCount) genericBlockedCount.textContent = '0';
          if (currentSiteBlockedCount) currentSiteBlockedCount.textContent = '0';
          if (twitchPointsCount) twitchPointsCount.textContent = '+0';
          timeSavedText.textContent = '0 min économisées';
          renderWeeklyChart({});
          renderHistoryList({});
        }
      });
    }
  });

  // Reload current active tab
  reloadTabBtn.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].id) {
      chrome.tabs.reload(tabs[0].id);
      window.close();
    }
  });

  // Initial tab detection and state retrieval
  await initActiveTabInfo();

  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response) {
      render(response);
    }
  });

  // Live storage change synchronization
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
        if (state) render(state);
      });
    }
  });
});
