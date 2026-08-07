/* bootstrap.js — 伺服器模式啟動器：全站密碼閘道 + 資料載入
   由 index.html / admin.html 在 app.js 之前載入。
   資料不再透過 <script src="data.js"> 載入，而是從需權杖的 API 取得。 */
(function () {
  'use strict';

  var TOKEN_KEY = 'dome_site_token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function setToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
  }

  function gateEl(id) { return document.getElementById(id); }

  function showGate(message) {
    var overlay = gateEl('siteGateOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    var msg = gateEl('siteGateMsg');
    if (msg) msg.textContent = message || '';
    var pw = gateEl('siteGatePassword');
    if (pw) pw.focus();
  }

  function hideGate() {
    var overlay = gateEl('siteGateOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function siteLogin(password) {
    return fetch('/api/site-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          var err = new Error((data && data.error) || '使用密碼錯誤');
          err.status = res.status;
          throw err;
        });
      }
      return res.json();
    });
  }

  function fetchSiteData(token) {
    return fetch('/api/site-data', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (res) {
      if (res.status === 401) {
        var err = new Error('UNAUTHORIZED');
        err.status = 401;
        throw err;
      }
      if (!res.ok) {
        var err2 = new Error('載入資料失敗 (' + res.status + ')');
        err2.status = res.status;
        throw err2;
      }
      return res.json();
    });
  }

  // 把 API 回傳的資料掛到全域變數，供 app.js / admin.html 使用
  window.__applyDomeData = function (data) {
    window.performersData = (data && data.performers) || [];
    window.DAY_SESSIONS = (data && data.daySessions) || [];
    window.DAY_PERFORMERS = (data && data.dayPerformers) || {};
    window.ACTION_HINTS_DATA = (data && data.actionHints) || {};
    window.CARD_HINTS_DATA = (data && data.cardHints) || {};
    window.chantLyrics = (data && data.chantLyrics) || {};
  };

  // 靜態模式（GitHub Pages / 直接開啟檔案）：用 <script> 直接載入資料檔
  var STATIC_DATA_FILES = [
    'data.js',
    'daydata.js',
    'action_hints_data.js',
    'card_hints_data.js',
    'lyrics.js'
  ];

  // 資料版本號（加速快取用）：每次更新上述資料檔內容後，請改這個數字/日期，
  // 瀏覽器才會重新下載；未變更時直接使用瀏覽器快取，大幅加快再次載入速度。
  var DATA_VERSION = '20260807';

  function loadStaticData() {
    return new Promise(function (resolve) {
      var loaders = STATIC_DATA_FILES.map(function (file) {
        return new Promise(function (res) {
          var s = document.createElement('script');
          s.src = file + '?v=' + DATA_VERSION;
          s.onload = res;
          s.onerror = res;
          document.head.appendChild(s);
        });
      });

      // 平行載入（同時下載，不再依序排隊）
      Promise.all(loaders).then(function () {
        window.__applyDomeData({
          performers: typeof performersData !== 'undefined' ? performersData : [],
          daySessions: typeof DAY_SESSIONS !== 'undefined' ? DAY_SESSIONS : [],
          dayPerformers: typeof DAY_PERFORMERS !== 'undefined' ? DAY_PERFORMERS : {},
          actionHints: typeof ACTION_HINTS_DATA !== 'undefined' ? ACTION_HINTS_DATA : {},
          cardHints: typeof CARD_HINTS_DATA !== 'undefined' ? CARD_HINTS_DATA : {},
          chantLyrics: typeof chantLyrics !== 'undefined' ? chantLyrics : {}
        });
        resolve();
      });
    });
  }

  // 場次（日期）清單由 index.html 以同步 <script src="sessions.js"> 載入，
  // 開場即存在 window.SITE_SESSIONS，無需在此非同步處理。

  window.SITE_BOOT_READY = new Promise(function (resolve) {
    function finish(data) {
      window.__applyDomeData(data);
      hideGate();
      resolve(data);
    }

    function start() {
      var token = getToken();
      fetchSiteData(token).then(function (data) {
        finish(data);
      }).catch(function () {
        // 沒有伺服器（例如 GitHub Pages）→ 退回靜態載入
        loadStaticData().then(function () {
          hideGate();
          resolve();
        }).catch(function () {
          showGate('無法載入資料，請確認已執行 node server.js');
        });
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  });
})();
