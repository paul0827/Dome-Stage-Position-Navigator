// sessions.js — 場次（日期）快速清單：讓「選擇日期場次」按鈕零延遲立即顯示。
// 完整資料（daydata.js）載入後，app.js 會以 DAY_SESSIONS 為準再次同步校正。
// 注意：新增／修改場次時，請同步更新此檔與 daydata.js。

window.SITE_SESSIONS = [
  { key: '1112', label: '11/12(四)', date: '11/12(四)', count: 4186 },
  { key: '1113', label: '11/13(五)', date: '11/13(五)', count: 4209 },
  { key: '1114', label: '11/14(六)', date: '11/14(六)', count: 4186 },
  { key: '1115', label: '11/15(日)', date: '11/15(日)', count: 4759 }
];

// 立即渲染日期按鈕：不依賴 app.js / 大資料檔，開場就能選場次。
// 之後 app.js 的 initSessions() 會用相同樣式重建並補齊完整功能。
(function () {
  var container = document.getElementById('sessionSelectorGroup');
  if (!container) return;

  container.innerHTML = '';
  window.SITE_SESSIONS.forEach(function (s) {
    var btn = document.createElement('button');
    btn.className = 'session-btn';
    btn.dataset.key = s.key;
    var label = s.label || '';
    var dayPart = label.indexOf('(') !== -1 ? label.split('(')[0] : label;
    var subPart = label.indexOf('(') !== -1 ? '(' + label.split('(')[1] : '';
    btn.innerHTML = '<span class="day-label">' + dayPart + '</span>' +
      '<span class="day-sub">' + subPart + '</span>';

    btn.addEventListener('click', function () {
      var all = container.querySelectorAll('.session-btn');
      for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
      btn.classList.add('active');
      // 記住選擇，app.js 載入後會沿用（校正場次時不會被清掉）
      window.SITE_SESSION_KEY = s.key;
      window.SITE_SESSION_LABEL = s.label;
    });

    container.appendChild(btn);
  });
})();
