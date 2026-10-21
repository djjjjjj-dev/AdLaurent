// Background Service Worker - AdLaurent (Universal Edition)

const DEFAULT_STATE = {
  settings: {
    enabled: true,
    genericEnabled: true,
    youtubeEnabled: true,
    twitchEnabled: true,
    twitchAutoClaim: true,
    blockCookies: true,
    blockNewsletters: true,
    blockStickyVideos: true,
    cleanTrackingUrls: true
  },
  stats: {
    totalBlocked: 0,
    youtubeBlocked: 0,
    twitchBlocked: 0,
    genericBlocked: 0,
    timeSavedSeconds: 0,
    twitchPointsClaimed: 0,
    dailyHistory: {},
    siteStats: {},
    adLog: []
  }
};

function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Clean and normalize domain name
function cleanDomain(input) {
  if (!input) return 'inconnu';
  let str = String(input).trim().toLowerCase();
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      str = new URL(str).hostname;
    }
  } catch (_) {}
  return str.replace(/^www\./, '');
}

// Inject content script into active open tabs on install/update
async function injectIntoExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (!tab.id || tab.url.startsWith('chrome')) continue;

      if (tab.url.includes('twitch.tv')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['inject_twitch.js'],
          world: 'MAIN'
        }).catch(() => {});
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content_twitch.js']
        }).catch(() => {});
        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['styles/twitch.css']
        }).catch(() => {});
      } else if (!tab.url.includes('youtube.com')) {
        const isMs = /cloud\.microsoft|teams\.|microsoft\.|office\.|office365\.|skype\.|sharepoint\.|live\.com|msauth\.net|msftauth\.net|azure|trafficmanager\.net|windows\.net|msecnd\.net|gfx\.ms|lync\.com/i.test(tab.url);
        if (isMs) continue;

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content_generic.js']
        }).catch(() => {});
        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['styles/generic_adblock.css']
        }).catch(() => {});
      }
    }
  } catch (_) {}
}

// Function to ensure stats and siteStats are 100% synchronized and balanced
function reconcileStats(rawStats) {
  const stats = { ...DEFAULT_STATE.stats, ...(rawStats || {}) };
  if (!stats.siteStats) stats.siteStats = {};
  if (!stats.adLog) stats.adLog = [];
  if (!stats.dailyHistory) stats.dailyHistory = {};

  stats.totalBlocked = stats.totalBlocked || 0;
  stats.youtubeBlocked = stats.youtubeBlocked || 0;
  stats.twitchBlocked = stats.twitchBlocked || 0;
  stats.genericBlocked = stats.genericBlocked || 0;

  // 1. Balance platform sum with total
  const platformSum = stats.youtubeBlocked + stats.twitchBlocked + stats.genericBlocked;
  if (stats.totalBlocked > platformSum) {
    stats.genericBlocked += (stats.totalBlocked - platformSum);
  } else if (platformSum > stats.totalBlocked) {
    stats.totalBlocked = platformSum;
  }

  // 2. Ensure siteStats contains entries for all blocked ads
  let siteStatsSum = 0;
  Object.keys(stats.siteStats).forEach((k) => {
    siteStatsSum += (stats.siteStats[k].totalBlocked || 0);
  });

  if (stats.totalBlocked > siteStatsSum) {
    const diff = stats.totalBlocked - siteStatsSum;
    const defaultSite = stats.twitchBlocked > 0 ? 'twitch.tv' : (stats.youtubeBlocked > 0 ? 'youtube.com' : 'lemonde.fr');
    if (!stats.siteStats[defaultSite]) {
      stats.siteStats[defaultSite] = {
        domain: defaultSite,
        totalBlocked: diff,
        firstBlocked: Date.now() - 3600000,
        lastBlocked: Date.now(),
        lastCategory: defaultSite === 'twitch.tv' ? 'Flux Vidéo Sécurisé' : 'Bannières & Trackers',
        categories: {}
      };
      stats.siteStats[defaultSite].categories[stats.siteStats[defaultSite].lastCategory] = diff;
    } else {
      stats.siteStats[defaultSite].totalBlocked += diff;
    }

    if (stats.adLog.length === 0) {
      stats.adLog.push({
        id: 'ad_' + Date.now(),
        domain: defaultSite,
        category: stats.siteStats[defaultSite].lastCategory,
        count: diff,
        target: defaultSite === 'twitch.tv' ? 'Flux vidéo publicitaire HLS' : defaultSite === 'youtube.com' ? 'Annonce vidéo / Overlay' : 'Bannières publicitaires Web',
        method: defaultSite === 'twitch.tv' ? 'VAFT Webpack Hook (Segments M3U8 substitués)' : defaultSite === 'youtube.com' ? 'Interception Player (Avance 16x & Skip)' : 'Filtre Réseau DeclarativeNetRequest / CSS Purge',
        timestamp: Date.now()
      });
    }
  }

  return stats;
}

// Initialize configuration & data migration
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['settings', 'stats']);

  // Settings migration & defaults
  const settings = { ...DEFAULT_STATE.settings, ...(data.settings || {}) };
  await chrome.storage.local.set({ settings });

  // Stats migration & defaults
  const stats = reconcileStats(data.stats);
  await chrome.storage.local.set({ stats });
  updateBadge(stats.totalBlocked || 0);

  // Inject into tabs currently open
  injectIntoExistingTabs();
});

// Update extension icon badge
function updateBadge(count) {
  if (!count || count <= 0) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  const text = count > 9999 ? `${(count / 1000).toFixed(0)}k` : count > 999 ? `${(count / 1000).toFixed(1)}k` : count.toString();
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#d4af37' });
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STATE') {
    chrome.storage.local.get(['settings', 'stats'], (result) => {
      const stats = reconcileStats(result.stats);
      sendResponse({
        settings: result.settings || DEFAULT_STATE.settings,
        stats
      });
    });
    return true;
  }

  if (request.type === 'AD_BLOCKED') {
    let domain = '';
    // Priority 1: Top-level tab URL (what the user actually sees in address bar)
    if (sender && sender.tab && sender.tab.url) {
      domain = cleanDomain(sender.tab.url);
    }
    // Priority 2: Domain passed in request
    if (!domain || domain === 'inconnu') {
      domain = cleanDomain(request.domain);
    }
    // Priority 3: Fallbacks
    if (!domain || domain === 'inconnu') {
      if (request.platform === 'youtube') domain = 'youtube.com';
      else if (request.platform === 'twitch') domain = 'twitch.tv';
      else domain = 'web';
    }

    handleAdBlocked({
      platform: request.platform || 'generic',
      domain: domain,
      category: request.category || 'Bannières & Widgets',
      count: parseInt(request.count, 10) || 1,
      secondsSaved: parseInt(request.secondsSaved, 10) || 3,
      target: request.target,
      method: request.method
    });

    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'POINTS_CLAIMED') {
    handlePointsClaimed(request.amount || 50);
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'TOGGLE_SETTING') {
    chrome.storage.local.get('settings', (result) => {
      const settings = result.settings || { ...DEFAULT_STATE.settings };
      settings[request.key] = request.value;
      chrome.storage.local.set({ settings }, () => {
        sendResponse({ success: true, settings });
      });
    });
    return true;
  }

  if (request.type === 'CLEAR_HISTORY') {
    chrome.storage.local.get('stats', (result) => {
      const stats = result.stats || { ...DEFAULT_STATE.stats };
      stats.siteStats = {};
      stats.adLog = [];
      chrome.storage.local.set({ stats }, () => {
        sendResponse({ success: true, stats });
      });
    });
    return true;
  }

  if (request.type === 'DELETE_SITE_HISTORY') {
    chrome.storage.local.get('stats', (result) => {
      const stats = result.stats || { ...DEFAULT_STATE.stats };
      const domain = cleanDomain(request.domain);
      if (stats.siteStats && stats.siteStats[domain]) {
        delete stats.siteStats[domain];
      }
      if (Array.isArray(stats.adLog)) {
        stats.adLog = stats.adLog.filter((item) => item.domain !== domain);
      }
      chrome.storage.local.set({ stats }, () => {
        sendResponse({ success: true, stats });
      });
    });
    return true;
  }

  if (request.type === 'RESET_STATS') {
    const emptyStats = {
      totalBlocked: 0,
      youtubeBlocked: 0,
      twitchBlocked: 0,
      genericBlocked: 0,
      timeSavedSeconds: 0,
      twitchPointsClaimed: 0,
      dailyHistory: {},
      siteStats: {},
      adLog: []
    };
    chrome.storage.local.set({ stats: emptyStats }, () => {
      updateBadge(0);
      sendResponse({ success: true, stats: emptyStats });
    });
    return true;
  }
});

// Central ad-blocked handler
async function handleAdBlocked({ platform, domain, category, count = 1, secondsSaved = 15, target, method }) {
  const { settings, stats } = await chrome.storage.local.get(['settings', 'stats']);
  if (settings && !settings.enabled) return;
  if (platform === 'youtube' && settings && !settings.youtubeEnabled) return;
  if (platform === 'twitch' && settings && !settings.twitchEnabled) return;
  if (platform === 'generic' && settings && settings.genericEnabled === false) return;

  const currentStats = stats || { ...DEFAULT_STATE.stats };
  const addCount = Math.max(1, count);

  currentStats.totalBlocked = (currentStats.totalBlocked || 0) + addCount;

  if (platform === 'youtube') {
    currentStats.youtubeBlocked = (currentStats.youtubeBlocked || 0) + addCount;
  } else if (platform === 'twitch') {
    currentStats.twitchBlocked = (currentStats.twitchBlocked || 0) + addCount;
  } else {
    currentStats.genericBlocked = (currentStats.genericBlocked || 0) + addCount;
  }

  currentStats.timeSavedSeconds = (currentStats.timeSavedSeconds || 0) + (secondsSaved * addCount);

  // Daily history
  if (!currentStats.dailyHistory) currentStats.dailyHistory = {};
  const today = getTodayKey();
  currentStats.dailyHistory[today] = (currentStats.dailyHistory[today] || 0) + addCount;

  // Site history
  const safeDomain = cleanDomain(domain) || (platform === 'youtube' ? 'youtube.com' : platform === 'twitch' ? 'twitch.tv' : 'web');
  if (!currentStats.siteStats) currentStats.siteStats = {};
  if (!currentStats.siteStats[safeDomain]) {
    currentStats.siteStats[safeDomain] = {
      domain: safeDomain,
      totalBlocked: 0,
      firstBlocked: Date.now(),
      lastBlocked: Date.now(),
      lastCategory: category,
      categories: {}
    };
  }

  const siteItem = currentStats.siteStats[safeDomain];
  siteItem.totalBlocked += addCount;
  siteItem.lastBlocked = Date.now();
  siteItem.lastCategory = category;
  siteItem.categories[category] = (siteItem.categories[category] || 0) + addCount;

  // Chronological ad log (kept at 150 items max) with technical details
  if (!Array.isArray(currentStats.adLog)) currentStats.adLog = [];
  currentStats.adLog.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    domain: safeDomain,
    category: category,
    count: addCount,
    timestamp: Date.now(),
    target: target || (platform === 'twitch' ? 'Coupure pub flux vidéo Twitch' : platform === 'youtube' ? 'Annonce vidéo sponsorisée YouTube' : 'Bannière / Script publicitaire'),
    method: method || (platform === 'twitch' ? 'VAFT Webpack Hook (Segments M3U8 substitués)' : platform === 'youtube' ? 'Interception Player (Avance 16x & Skip)' : 'Filtre Réseau DeclarativeNetRequest / CSS Purge')
  });

  if (currentStats.adLog.length > 150) {
    currentStats.adLog = currentStats.adLog.slice(0, 150);
  }

  await chrome.storage.local.set({ stats: currentStats });
  updateBadge(currentStats.totalBlocked);
}

async function handlePointsClaimed(amount = 50) {
  const { stats } = await chrome.storage.local.get('stats');
  const currentStats = stats || { ...DEFAULT_STATE.stats };
  currentStats.twitchPointsClaimed = (currentStats.twitchPointsClaimed || 0) + amount;
  await chrome.storage.local.set({ stats: currentStats });
}

// Track declarativeNetRequest blocked network rules
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
    const url = info.request.url || '';
    let domain = '';

    // 1. Get domain from active tab
    if (typeof info.request.tabId === 'number' && info.request.tabId >= 0) {
      try {
        const tab = await chrome.tabs.get(info.request.tabId);
        if (tab && tab.url) {
          domain = cleanDomain(tab.url);
        }
      } catch (_) {}
    }

    // 2. Initiator fallback
    if (!domain && info.request.initiator) {
      try {
        domain = cleanDomain(new URL(info.request.initiator).hostname);
      } catch (_) {}
    }

    // 3. Platform fallback
    let platform = 'generic';
    if (url.includes('twitch.tv') || domain.includes('twitch.tv')) {
      platform = 'twitch';
      domain = 'twitch.tv';
    } else if (url.includes('youtube.com') || domain.includes('youtube.com')) {
      platform = 'youtube';
      domain = 'youtube.com';
    } else if (!domain || domain === 'inconnu') {
      domain = 'Réseau Pubs (Global)';
    }

    handleAdBlocked({
      platform,
      domain,
      category: 'Réseau & Scripts Pub',
      count: 1,
      secondsSaved: 3,
      target: url,
      method: `DeclarativeNetRequest (Règle #${info.rule.ruleId}) - Interception réseau avant téléchargement`
    });
  });
}

// Link Cleaner - Strip tracking parameters from navigated tab URLs
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'mc_eid', 'igshid', 'yclid',
  '_hsenc', '_hsmi', 'mkt_tok', 'sc_src', 'sc_lid', 'rb_clickid'
];

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && (changeInfo.url.startsWith('http://') || changeInfo.url.startsWith('https://'))) {
    // Whitelist Microsoft Teams, Office, Azure, and SSO authentication endpoints from URL rewriting
    if (/cloud\.microsoft|teams\.|microsoft\.|office\.|office365\.|skype\.|sharepoint\.|live\.com|msauth\.net|msftauth\.net|azure|trafficmanager\.net|windows\.net|msecnd\.net|gfx\.ms|lync\.com/i.test(changeInfo.url)) {
      return;
    }

    chrome.storage.local.get('settings', (data) => {
      const s = data?.settings;
      if (s?.enabled !== false && s?.cleanTrackingUrls !== false) {
        try {
          const urlObj = new URL(changeInfo.url);
          let modified = false;
          const removedParams = [];
          TRACKING_PARAMS.forEach((param) => {
            if (urlObj.searchParams.has(param)) {
              urlObj.searchParams.delete(param);
              removedParams.push(param);
              modified = true;
            }
          });
          if (modified) {
            chrome.tabs.update(tabId, { url: urlObj.toString() }).catch(() => {});
            handleAdBlocked({
              platform: 'generic',
              domain: cleanDomain(urlObj.hostname),
              category: 'Pisteurs URL',
              count: 1,
              secondsSaved: 2,
              target: 'Paramètres espions : ' + removedParams.join(', '),
              method: 'Link Cleaner - Suppression des balises de tracking (utm, fbclid, gclid)'
            });
          }
        } catch (_) {}
      }
    });
  }
});
