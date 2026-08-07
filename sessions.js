// sessions.js — 場次（日期）快速清單：僅供「選擇日期場次」按鈕立即顯示。
// 完整資料（daydata.js）載入後會以 DAY_SESSIONS 為準再次同步校正。
// 注意：新增／修改場次時，請同步更新此檔與 daydata.js。

window.SITE_SESSIONS = [
  { key: '1112', label: '11/12(四)', date: '11/12(四)', count: 4186 },
  { key: '1113', label: '11/13(五)', date: '11/13(五)', count: 4209 },
  { key: '1114', label: '11/14(六)', date: '11/14(六)', count: 4186 },
  { key: '1115', label: '11/15(日)', date: '11/15(日)', count: 4759 }
];
