const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const app = express();
const PORT = process.env.PORT || 8000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files
app.use(express.static(__dirname));

// Utility: Load database files using VM to execute JS safely
function loadPerformersData() {
  const filePath = path.join(__dirname, 'data.js');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const context = {};
  vm.createContext(context);
  vm.runInContext(content, context);
  return context.performersData || [];
}

function savePerformersData(data) {
  const filePath = path.join(__dirname, 'data.js');
  const content = `// Performer Stage Formations Database\nconst performersData = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function loadDayData() {
  const filePath = path.join(__dirname, 'daydata.js');
  if (!fs.existsSync(filePath)) {
    return { DAY_SESSIONS: [], DAY_PERFORMERS: {} };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const context = {};
  vm.createContext(context);
  vm.runInContext(content, context);
  return {
    DAY_SESSIONS: context.DAY_SESSIONS || [],
    DAY_PERFORMERS: context.DAY_PERFORMERS || {}
  };
}

function saveDayData(sessions, performers) {
  const filePath = path.join(__dirname, 'daydata.js');
  const content = `// daydata.js — 自動由 import_daycsv.py 產生，請勿手動修改\n\nconst DAY_SESSIONS = ${JSON.stringify(sessions, null, 2)};\n\nconst DAY_PERFORMERS = ${JSON.stringify(performers, null, 2)};\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

// Simple CSV parser
function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    let next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') { row[row.length - 1] += '"'; i++; } // Escaped quote
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') { i++; }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

// Check admin password
function checkPassword(password) {
  return password === ADMIN_PASSWORD;
}

// API Routes
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (checkPassword(password)) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: '密碼錯誤' });
  }
});

app.post('/api/admin/get-data', (req, res) => {
  const { password } = req.body;
  if (!checkPassword(password)) {
    return res.status(401).json({ success: false, error: '未授權' });
  }

  try {
    const performers = loadPerformersData();
    const { DAY_PERFORMERS } = loadDayData();
    
    // dayperformers needs to be an array for table view in admin dashboard
    const dayperformersList = [];
    Object.keys(DAY_PERFORMERS).forEach(date => {
      DAY_PERFORMERS[date].forEach(p => {
        dayperformersList.push({
          ...p,
          date: date
        });
      });
    });

    res.json({
      success: true,
      performers: performers,
      dayperformers: dayperformersList
    });
  } catch (err) {
    res.status(500).json({ success: false, error: '讀取資料失敗: ' + err.message });
  }
});

app.post('/api/admin/save-row', (req, res) => {
  const { password, type, action, row } = req.body;
  if (!checkPassword(password)) {
    return res.status(401).json({ success: false, error: '未授權' });
  }

  try {
    if (type === 'dayperformers') {
      const { DAY_SESSIONS, DAY_PERFORMERS } = loadDayData();
      const dateKey = row['日期'] || row['date'];
      const id = row['身份證'] || row['id'];
      const name = row['姓名'] || row['name'];
      const team = row['班別'] || row['team'];

      if (!DAY_PERFORMERS[dateKey]) {
        DAY_PERFORMERS[dateKey] = [];
      }

      const existingIdx = DAY_PERFORMERS[dateKey].findIndex(p => p.id === id && p.team === team);
      
      if (action === 'delete') {
        if (existingIdx !== -1) {
          DAY_PERFORMERS[dateKey].splice(existingIdx, 1);
        }
      } else { // add or edit
        const item = { id, name, team };
        if (existingIdx !== -1) {
          DAY_PERFORMERS[dateKey][existingIdx] = item;
        } else {
          DAY_PERFORMERS[dateKey].push(item);
        }
      }

      saveDayData(DAY_SESSIONS, DAY_PERFORMERS);
      res.json({ success: true });

    } else if (type === 'performers') {
      const performers = loadPerformersData();
      const id = row['身份證'] || row['id'];
      const team = row['班別'] || row['team'] || row['teamVal'];

      const existingIdx = performers.findIndex(p => p.id === id && p.team === team);

      if (action === 'delete') {
        if (existingIdx !== -1) {
          performers.splice(existingIdx, 1);
        }
      } else { // add or edit
        const item = {
          category: row['身分別'] || row['category'] || 'A白',
          id: id,
          name: row['姓名'] || row['name'] || '',
          team: team,
          circle: row['01圓形'] || row['circle'] || '',
          xingYuan: row['02行願'] || row['xingYuan'] || '',
          miLuo: row['03米籮'] || row['miLuo'] || id,
          jingSi: row['04靜思家風'] || row['jingSi'] || '',
          lamp: row['05-1有法船（點一盞燈）'] || row['lamp'] || '',
          noBoat: row['05-2無法船（菜市場5毛錢）'] || row['noBoat'] || '',
          noBoat3: row['05-3無法船3'] || row['noBoat3'] || '',
          bigV: row['06四弘誓願'] || row['bigV'] || '',
          daChuanShi: row['07-1大船師'] || row['daChuanShi'] || '',
          boneDonation: row['07-2骨捐能捨'] || row['boneDonation'] || '',
          edu: row['08教育'] || row['edu'] || '',
          humanities1: row['09-1人文'] || row['humanities1'] || id,
          humanities2: row['09-2人文'] || row['humanities2'] || '',
          fiveContinents1: row['10-1五大洲'] || row['fiveContinents1'] || '',
          fiveContinents2: row['10-2五大洲'] || row['fiveContinents2'] || '',
          flyingApsaras: row['11飛天'] || row['flyingApsaras'] || ''
        };

        if (existingIdx !== -1) {
          performers[existingIdx] = item;
        } else {
          performers.push(item);
        }
      }

      savePerformersData(performers);
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: '無效的類型' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/import-csv', (req, res) => {
  const { password, importType, classVal, sessionVal, dateVal, csvText } = req.body;
  if (!checkPassword(password)) {
    return res.status(401).json({ success: false, error: '未授權' });
  }

  try {
    const rows = parseCSV(csvText.trim());
    if (rows.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV 檔案內容為空或無資料列' });
    }

    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    const getColIndex = (aliases) => {
      return headers.findIndex(h => aliases.some(a => a.toLowerCase() === h.toLowerCase()));
    };

    const classIdx = getColIndex(['班別', '東西班', '組別', 'team']);
    const idIdx = getColIndex(['身份證', '身分證', 'id']);
    const nameIdx = getColIndex(['姓名', 'name']);

    if (classIdx === -1 || idIdx === -1) {
      return res.status(400).json({ success: false, error: 'CSV 檔案必須包含「班別」與「身份證」欄位' });
    }

    let added_count = 0;
    let updated_count = 0;
    let ignored_count = 0;
    let total_read = 0;

    if (importType === 'dayperformers') {
      const dateIdx = getColIndex(['日期', 'date']);
      if (dateIdx === -1 || nameIdx === -1) {
        return res.status(400).json({ success: false, error: '每日名單 CSV 必須包含「日期」與「姓名」欄位' });
      }

      const { DAY_SESSIONS, DAY_PERFORMERS } = loadDayData();
      if (!DAY_PERFORMERS[dateVal]) {
        DAY_PERFORMERS[dateVal] = [];
      }

      dataRows.forEach(row => {
        if (row.length < 2 || row.every(val => val === '')) return;
        total_read++;

        const rClass = row[classIdx]?.trim();
        const rDate = row[dateIdx]?.trim();
        const rId = row[idIdx]?.trim();
        const rName = row[nameIdx]?.trim();

        // Validate filters if match
        if (rClass !== classVal || rDate !== dateVal) {
          ignored_count++;
          return;
        }

        const existingIdx = DAY_PERFORMERS[dateVal].findIndex(p => p.id === rId && p.team === rClass);
        const item = { id: rId, name: rName, team: rClass };

        if (existingIdx !== -1) {
          DAY_PERFORMERS[dateVal][existingIdx] = item;
          updated_count++;
        } else {
          DAY_PERFORMERS[dateVal].push(item);
          added_count++;
        }
      });

      saveDayData(DAY_SESSIONS, DAY_PERFORMERS);

    } else if (importType === 'performers') {
      const catIdx = getColIndex(['身分別', '身分', 'category']);
      const circleIdx = getColIndex(['01圓形', 'circle']);
      const xingYuanIdx = getColIndex(['02行願', 'xingYuan']);
      const miLuoIdx = getColIndex(['03米籮', 'miLuo']);
      const jingSiIdx = getColIndex(['04靜思家風', 'jingSi']);
      const lampIdx = getColIndex(['05-1有法船（點一盞燈）', '05-1有法船', 'lamp']);
      const noBoatIdx = getColIndex(['05-2無法船（菜市場5毛錢）', '05-2無法船', 'noBoat']);
      const bigVIdx = getColIndex(['06四弘誓願', 'bigV']);
      const daChuanShiIdx = getColIndex(['07-1大船師', 'daChuanShi']);
      const boneDonationIdx = getColIndex(['07-2骨捐能捨', 'boneDonation']);
      const eduIdx = getColIndex(['08教育', 'edu']);
      const humanities2Idx = getColIndex(['09-2人文', 'humanities2']);
      const fiveContinents1Idx = getColIndex(['10-1五大洲', 'fiveContinents1']);
      const fiveContinents2Idx = getColIndex(['10-2五大洲', 'fiveContinents2']);
      const flyingApsarasIdx = getColIndex(['11飛天', 'flyingApsaras']);

      const performers = loadPerformersData();

      dataRows.forEach(row => {
        if (row.length < 2 || row.every(val => val === '')) return;
        total_read++;

        const rClass = row[classIdx]?.trim();
        const rId = row[idIdx]?.trim();

        if (rClass !== classVal) {
          ignored_count++;
          return;
        }

        const existingIdx = performers.findIndex(p => p.id === rId && p.team === rClass);
        const nameVal = nameIdx !== -1 ? row[nameIdx]?.trim() : '';
        const catVal = catIdx !== -1 ? row[catIdx]?.trim() : 'A白';

        const item = {
          category: catVal,
          id: rId,
          name: nameVal,
          team: rClass,
          circle: circleIdx !== -1 ? row[circleIdx]?.trim() : '',
          xingYuan: xingYuanIdx !== -1 ? row[xingYuanIdx]?.trim() : '',
          miLuo: miLuoIdx !== -1 ? row[miLuoIdx]?.trim() : rId,
          jingSi: jingSiIdx !== -1 ? row[jingSiIdx]?.trim() : '',
          lamp: lampIdx !== -1 ? row[lampIdx]?.trim() : '',
          noBoat: noBoatIdx !== -1 ? row[noBoatIdx]?.trim() : '',
          noBoat3: '', // fallback or unused
          bigV: bigVIdx !== -1 ? row[bigVIdx]?.trim() : '',
          daChuanShi: daChuanShiIdx !== -1 ? row[daChuanShiIdx]?.trim() : '',
          boneDonation: boneDonationIdx !== -1 ? row[boneDonationIdx]?.trim() : '',
          edu: eduIdx !== -1 ? row[eduIdx]?.trim() : '',
          humanities1: rId, // basic center
          humanities2: humanities2Idx !== -1 ? row[humanities2Idx]?.trim() : '',
          fiveContinents1: fiveContinents1Idx !== -1 ? row[fiveContinents1Idx]?.trim() : '',
          fiveContinents2: fiveContinents2Idx !== -1 ? row[fiveContinents2Idx]?.trim() : '',
          flyingApsaras: flyingApsarasIdx !== -1 ? row[flyingApsarasIdx]?.trim() : ''
        };

        if (existingIdx !== -1) {
          // Merge coordinates, keep existing name if CSV name is empty
          const existing = performers[existingIdx];
          item.name = item.name || existing.name;
          performers[existingIdx] = item;
          updated_count++;
        } else {
          performers.push(item);
          added_count++;
        }
      });

      savePerformersData(performers);
    }

    res.json({
      success: true,
      total_read,
      added_count,
      updated_count,
      ignored_count
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/update-dayperformer', (req, res) => {
  const { session, id, name, team, password } = req.body;
  if (!checkPassword(password)) {
    return res.status(401).json({ success: false, error: '未授權' });
  }

  try {
    const { DAY_SESSIONS, DAY_PERFORMERS } = loadDayData();
    if (!DAY_PERFORMERS[session]) {
      DAY_PERFORMERS[session] = [];
    }

    const idx = DAY_PERFORMERS[session].findIndex(p => p.id === id && p.team === team);
    if (idx !== -1) {
      DAY_PERFORMERS[session][idx].name = name;
    } else {
      DAY_PERFORMERS[session].push({ id, name, team });
    }

    saveDayData(DAY_SESSIONS, DAY_PERFORMERS);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/update-performer', (req, res) => {
  const {
    id, circle, xingYuan, miLuo, jingSi, lamp, noBoat, bigV, daChuanShi,
    boneDonation, edu, humanities2, fiveContinents1, fiveContinents2,
    flyingApsaras, team, password
  } = req.body;

  if (!checkPassword(password)) {
    return res.status(401).json({ success: false, error: '未授權' });
  }

  try {
    const performers = loadPerformersData();
    const idx = performers.findIndex(p => p.id === id && p.team === team);
    if (idx !== -1) {
      performers[idx].circle = circle;
      performers[idx].xingYuan = xingYuan;
      performers[idx].miLuo = miLuo;
      performers[idx].jingSi = jingSi;
      performers[idx].lamp = lamp;
      performers[idx].noBoat = noBoat;
      performers[idx].bigV = bigV;
      performers[idx].daChuanShi = daChuanShi;
      performers[idx].boneDonation = boneDonation;
      performers[idx].edu = edu;
      performers[idx].humanities2 = humanities2;
      performers[idx].fiveContinents1 = fiveContinents1;
      performers[idx].fiveContinents2 = fiveContinents2;
      performers[idx].flyingApsaras = flyingApsaras;

      savePerformersData(performers);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: '找不到該表演者座標資料' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback to index.html for general routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
