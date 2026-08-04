/* ==========================================================================
   Dome Position Navigator - App Logic
   ========================================================================== */

(function () {
  'use strict';

  // Complete 17-point formation sequence, aligned with the reference website.
  const keyFormations = [
    { key: 'basic', name: '起點 (基本隊形)', label: '起點' },
    { key: 'circle', name: '01圓形（序、生、老、病、死、六度）', label: '01圓形' },
    { key: 'xingYuan', name: '02行願（千手/開經偈）', label: '02行願' },
    { key: 'miLuo', name: '03米籮（基本隊形）', label: '03米籮' },
    { key: 'jingSi', name: '04靜思家風（基本隊形）', label: '04靜思' },
    { key: 'lamp', name: '05-1有法船（點一盞燈）', label: '05-1有法船' },
    { key: 'noBoat', name: '05-2無法船（菜市場5毛錢）', label: '05-2無法船' },
    { key: 'noBoat3', name: '05-3無法船（是諸眾生）', label: '05-3無法船' },
    { key: 'bigV', name: '06四弘誓願（地藏經、醫療梵唄）', label: '06四弘誓願' },
    { key: 'daChuanShi', name: '07-1大船師（大醫王）', label: '07-1大船師' },
    { key: 'boneDonation', name: '07-2骨捐能捨（能捨）', label: '07-2骨捐' },
    { key: 'edu', name: '08教育（說法品梵唄、無語良師、大體老師、小樹阿、畢業典禮、藥草喻）', label: '08教育' },
    { key: 'humanities1', name: '09-1人文（基本隊形、慈誠、難報經）', label: '09-1人文' },
    { key: 'humanities2', name: '09-2人文（主機板、大愛讓世界亮起來、天空破了洞、環保志工、代謝不住）', label: '09-2人文' },
    { key: 'fiveContinents1', name: '10-1五大洲（開經書）', label: '10-1五大洲' },
    { key: 'fiveContinents2', name: '10-2五大洲', label: '10-2五大洲' },
    { key: 'flyingApsaras', name: '11飛天', label: '11飛天' }
  ];

  // Official reference video used only when a formation has no dedicated walk-through video.
  const formationReferenceVideos = {
    fiveContinents1: 'https://www.youtube.com/watch?v=K9D1BCRm-5c',
    fiveContinents2: 'https://www.youtube.com/watch?v=K9D1BCRm-5c',
    flyingApsaras: 'https://www.youtube.com/watch?v=K9D1BCRm-5c'
  };

  // DOM Elements
  const sessionSelectorGroup = document.getElementById('sessionSelectorGroup');
  const teamSelectorGroup = document.getElementById('teamSelectorGroup');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const autocompleteList = document.getElementById('autocompleteList');
  const searchConfirmBtn = document.getElementById('searchConfirmBtn');
  const appHeaderSearch = document.getElementById('appHeaderSearch');
  const appDashboard = document.getElementById('appDashboard');

  // Summary elements
  const perfAvatar = document.getElementById('perfAvatar');
  const perfName = document.getElementById('perfName');
  const perfCategory = document.getElementById('perfCategory');
  const perfID = document.getElementById('perfID');

  // SVG elements
  const stageWatermark = document.getElementById('stageWatermark');
  const localGridLines = document.getElementById('localGridLines');
  const localPathSegments = document.getElementById('localPathSegments');
  const localPathPoints = document.getElementById('localPathPoints');
  const localGridSvg = document.getElementById('localGridSvg');

  // List elements
  const formationsList = document.getElementById('formationsList');
  const mapLyricsGuide = document.getElementById('mapLyricsGuide');
  const actionHintsFlow = document.getElementById('actionHintsFlow');

  // Topbar actions
  const changePerformerBtn = document.getElementById('changePerformerBtn');
  const screenshotPageBtn = document.getElementById('screenshotPageBtn');

  // Map settings
  const showFullTrajectory = document.getElementById('showFullTrajectory');
  const showAlignmentGuides = document.getElementById('showAlignmentGuides');

  // Switcher controls
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const activeFormNum = document.getElementById('activeFormNum');
  const activeFormTitle = document.getElementById('activeFormTitle');
  const activeFormCoord = document.getElementById('activeFormCoord');

  // Admin Modal elements
  const adminBtn = document.getElementById('adminBtn');
  const adminModal = document.getElementById('adminModal');
  const closeAdminModalBtn = document.getElementById('closeAdminModalBtn');
  const verifyAdminPasswordBtn = document.getElementById('verifyAdminPasswordBtn');
  const adminPasswordInput = document.getElementById('adminPassword');
  const adminAuthScreen = document.getElementById('adminAuthScreen');
  const adminMainContent = document.getElementById('adminMainContent');
  const adminMessage = document.getElementById('adminMessage');
  const adminFinishBtn = document.getElementById('adminFinishBtn');

  // State Variables
  let currentPerformer = null;
  let currentDisplayName = '';
  let currentDayNameMap = {};
  
  let selectedSessionKey = null;
  let selectedTeam = null;

  let activeFormationIdx = 0; // Index inside keyFormations
  let zoomLevel = 1.0;
  let panX = 0;
  let panY = 0;
  let rotationAngle = 0;
  
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // Grid constants
  const GRID_CENTER_X = 180;
  const GRID_CENTER_Y = 180;
  let GRID_SPACING = 15;
  let MAX_GRID_COORD = 10;

  // Initial setup
  window.addEventListener('DOMContentLoaded', () => {
    initSessions();
    setupEventListeners();
  });

  // Mapped display sticker assets key mapping
  function getDisplayType(key) {
    if (key === 'miLuo') {
      return 'basic';
    }
    if (key === 'boneDonation') {
      return 'bigV';
    }
    if (key === 'edu') {
      return 'circle';
    }
    if (key === 'humanities1') {
      return 'basic';
    }
    if (key === 'humanities2') {
      return 'humanities';
    }
    if (selectedSessionKey === '1113' || selectedSessionKey === '1115') {
      if (key === 'noBoat3') {
        return 'lamp';
      }
    }
    if (key === 'noBoat3') {
      return 'noBoat';
    }
    return key;
  }

  // Keep the 9-key table label and landmark icon aligned with the selected session.
  function updateFormationDisplayForSession() {
    const noBoat3Formation = keyFormations.find(formation => formation.key === 'noBoat3');
    if (!noBoat3Formation) return;

    const isBoatSession = selectedSessionKey === '1113' || selectedSessionKey === '1115';
    noBoat3Formation.name = isBoatSession ? '05-3有法船（是諸眾生）' : '05-3無法船（是諸眾生）';
    noBoat3Formation.label = isBoatSession ? '05-3有法船' : '05-3無法船';
  }

  function getEnglishCategory(cat) {
    if (!cat) return 'A_white';
    if (cat.includes('A白')) return 'A_white';
    if (cat.includes('A藍')) return 'A_blue';
    if (cat.includes('B白')) return 'B_white';
    if (cat.includes('B藍')) return 'B_blue';
    return 'A_white';
  }

  // Populate dynamic session keys
  function initSessions() {
    sessionSelectorGroup.innerHTML = '';
    const sessions = (typeof DAY_SESSIONS !== 'undefined') ? DAY_SESSIONS : [
      { key: '1112', label: '11/12(四)', date: '11/12(四)' },
      { key: '1113', label: '11/13(五)', date: '11/13(五)' },
      { key: '1114', label: '11/14(六)', date: '11/14(六)' },
      { key: '1115', label: '11/15(日)', date: '11/15(日)' }
    ];

    sessions.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'session-btn';
      btn.dataset.key = s.key;
      btn.innerHTML = `
        <span class="day-label">${s.label.split('(')[0]}</span>
        <span class="day-sub">${s.label.includes('(') ? '(' + s.label.split('(')[1] : ''}</span>
      `;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.session-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSessionKey = s.key;
        updateFormationDisplayForSession();
        loadDayNameMap(s.key);
        validateSearchParams();
      });
      sessionSelectorGroup.appendChild(btn);
    });

    // Populate admin selector options
    const adminSess = document.getElementById('adminDaySession');
    if (adminSess) {
      adminSess.innerHTML = '';
      sessions.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.key;
        opt.textContent = s.label;
        adminSess.appendChild(opt);
      });
    }
  }

  // Load day names mapping
  function loadDayNameMap(sessionKey) {
    currentDayNameMap = {};
    if (typeof DAY_PERFORMERS !== 'undefined' && DAY_PERFORMERS[sessionKey]) {
      DAY_PERFORMERS[sessionKey].forEach(p => {
        currentDayNameMap[p.id] = p.name;
      });
    }
  }

  // Parse relative coordinates e.g., "7.5-43"
  function parseCoordinate(coordStr) {
    if (!coordStr) return { x: 0, y: 0, isText: true, text: '無' };
    
    // Check if it is text-only (e.g. stage descriptions)
    const normalized = coordStr.trim();
    const lastHyphenIndex = normalized.lastIndexOf('-');
    
    if (lastHyphenIndex > 0) {
      const xStr = normalized.substring(0, lastHyphenIndex);
      const yStr = normalized.substring(lastHyphenIndex + 1);
      
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);
      if (!isNaN(x) && !isNaN(y)) {
        return { x, y, isText: false, text: normalized };
      }
    }
    
    // Fallback: Check common text mappings for visual placeholder coordinates
    let mockX = 0;
    let mockY = 0;
    if (normalized.includes('西班') || normalized.includes('東班')) {
      mockX = -2.7;
      mockY = 40.8;
    } else if (normalized.includes('中線')) {
      mockX = -6;
      mockY = 38;
    }
    
    return { x: 0, y: 0, isText: true, text: normalized, mockX, mockY };
  }

  function getPerformerFields(perf) {
    return {
      coordinate: perf.id || '0-0',
      category: perf.category || 'A白'
    };
  }

  // Retrieve coordinate dynamically based on current configuration
  function getFormationCoordStr(performer, key) {
    if (!performer) return '';
    if (key === 'basic') {
      return getPerformerFields(performer).coordinate;
    }
    if (key === 'humanities1') {
      return performer.id || '';
    }
    if (selectedSessionKey === '1113' || selectedSessionKey === '1115') {
      if (key === 'noBoat3') {
        return performer.lamp || '';
      }
    }
    if (key === 'noBoat3') {
      return performer.noBoat || '';
    }
    return performer[key] || '';
  }

  // Validate start search params
  function validateSearchParams() {
    const searchVal = searchInput.value.trim();
    if (selectedSessionKey && selectedTeam && searchVal.length > 0) {
      searchConfirmBtn.removeAttribute('disabled');
    } else {
      searchConfirmBtn.setAttribute('disabled', 'true');
    }
  }

  // Setup UI event listeners
  function setupEventListeners() {
    // Team buttons selection
    document.querySelectorAll('.team-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTeam = btn.dataset.team;
        validateSearchParams();
      });
    });

    // Search input autocomplete logic
    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim();
      if (val.length > 0) {
        clearSearchBtn.style.display = 'block';
        showAutocompleteDropdown(val);
      } else {
        clearSearchBtn.style.display = 'none';
        autocompleteList.style.display = 'none';
      }
      validateSearchParams();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      autocompleteList.style.display = 'none';
      validateSearchParams();
      searchInput.focus();
    });

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
        autocompleteList.style.display = 'none';
      }
    });

    searchConfirmBtn.addEventListener('click', executeSearch);
    
    // Toggle options change
    showFullTrajectory.addEventListener('change', () => drawLocalGridPath());
    showAlignmentGuides.addEventListener('change', () => drawLocalGridPath());

    // Switch step button actions
    prevBtn.addEventListener('click', () => {
      if (activeFormationIdx > 0) {
        selectFormation(activeFormationIdx - 1);
      }
    });

    nextBtn.addEventListener('click', () => {
      if (activeFormationIdx < keyFormations.length - 1) {
        selectFormation(activeFormationIdx + 1);
      }
    });

    // Zoom/Pan/Rotate Map actions
    document.getElementById('zoomInBtn').addEventListener('click', () => adjustMapZoom(1 / 1.2));
    document.getElementById('zoomOutBtn').addEventListener('click', () => adjustMapZoom(1.2));
    document.getElementById('rotateCcwBtn').addEventListener('click', () => adjustMapRotation(-45));
    document.getElementById('rotateCwBtn').addEventListener('click', () => adjustMapRotation(45));
    document.getElementById('zoomResetBtn').addEventListener('click', resetMapTransforms);

    // Click back to search
    changePerformerBtn.addEventListener('click', () => {
      appDashboard.style.display = 'none';
      appHeaderSearch.style.display = 'block';
      appHeaderSearch.scrollIntoView({ behavior: 'smooth' });
    });

    screenshotPageBtn.addEventListener('click', () => {
      downloadDashboardScreenshot(screenshotPageBtn);
    });

    // Admin dialog listeners
    adminBtn.addEventListener('click', () => {
      adminModal.style.display = 'flex';
      adminPasswordInput.focus();
    });

    closeAdminModalBtn.addEventListener('click', () => {
      adminModal.style.display = 'none';
    });

    verifyAdminPasswordBtn.addEventListener('click', handleAdminLogin);

    // Close image lightbox
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target.id === 'imageLightbox' || e.target.className === 'lightbox-close') {
          lightbox.style.display = 'none';
        }
      });
    }

    // Keyboard navigation (A/D and left/right arrow keys)
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input fields
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = e.key.toLowerCase();
      
      if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeFormationIdx > 0) {
          selectFormation(activeFormationIdx - 1);
        }
      } else if (key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeFormationIdx < keyFormations.length - 1) {
          selectFormation(activeFormationIdx + 1);
        }
      }
    });
  }

  // Open image lightbox
  window.openLightbox = function(src, title) {
    const lightbox = document.getElementById('imageLightbox');
    const img = document.getElementById('lightboxImg');
    const caption = document.getElementById('lightboxCaption');
    if (lightbox && img) {
      img.src = src;
      if (caption) {
        caption.textContent = title;
      }
      lightbox.style.display = 'flex';
    }
  };

  // Handle Autocomplete list matching
  function showAutocompleteDropdown(query) {
    if (!selectedSessionKey || !selectedTeam) {
      autocompleteList.style.display = 'none';
      return;
    }

    const val = query.toLowerCase();
    const matches = [];

    // Search coordinates in performers database
    const db = (typeof performersData !== 'undefined') ? performersData : [];
    
    db.forEach(perf => {
      if (perf.team !== (selectedTeam === 'east' ? '東班' : '西班')) return;

      const id = perf.id || '';
      const nameInDb = perf.name || '';
      const dayName = currentDayNameMap[id] || '';

      // Check match by ID coordinate or by name
      const isIdMatch = id.toLowerCase().includes(val);
      const isNameMatch = nameInDb.toLowerCase().includes(val) || dayName.toLowerCase().includes(val);

      if (isIdMatch || isNameMatch) {
        const displayName = `座標 ${perf.id}`;
        matches.push({
          id: id,
          name: displayName,
          category: perf.category || 'A白'
        });
      }
    });

    // Deduplicate and cap matches to 10
    const unique = [];
    const seen = new Set();
    for (const m of matches) {
      const key = `${m.id}_${m.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(m);
      }
      if (unique.length >= 10) break;
    }

    if (unique.length > 0) {
      autocompleteList.innerHTML = '';
      unique.forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.innerHTML = `
          <span class="item-id">${item.id}</span>
          <span class="item-name">${item.name} (${item.category})</span>
        `;
        div.addEventListener('click', () => {
          searchInput.value = item.id;
          autocompleteList.style.display = 'none';
          validateSearchParams();
          executeSearch();
        });
        autocompleteList.appendChild(div);
      });
      autocompleteList.style.display = 'block';
    } else {
      autocompleteList.style.display = 'none';
    }
  }

  // Execute performer search query
  function executeSearch() {
    const val = searchInput.value.trim().toLowerCase();
    if (!selectedSessionKey || !selectedTeam || val.length === 0) return;

    const db = (typeof performersData !== 'undefined') ? performersData : [];
    let matchedPerf = null;
    let matchedName = '';

    // Match by exact ID coordinate only.
    for (const perf of db) {
      if (perf.team !== (selectedTeam === 'east' ? '東班' : '西班')) continue;
      
      const id = (perf.id || '').toLowerCase();
      if (id === val) {
        matchedPerf = perf;
        matchedName = `座標 ${perf.id}`;
        break;
      }
    }

    if (!matchedPerf) {
      // Try partial match on ID coordinate
      for (const perf of db) {
        if (perf.team !== (selectedTeam === 'east' ? '東班' : '西班')) continue;
        if ((perf.id || '').toLowerCase().includes(val)) {
          matchedPerf = perf;
          matchedName = `座標 ${perf.id}`;
          break;
        }
      }
    }

    if (matchedPerf) {
      currentPerformer = matchedPerf;
      currentDisplayName = matchedName;
      showFullTrajectory.checked = false;
      
      // Update header details
      perfAvatar.textContent = matchedName.charAt(0);
      perfAvatar.style.backgroundColor = matchedPerf.category.startsWith('B') ? 'var(--green-color)' : 'var(--blue-color)';
      perfName.textContent = matchedName;
      perfCategory.textContent = `${matchedPerf.category} (${selectedTeam === 'east' ? '東班' : '西班'})`;
      perfID.textContent = matchedPerf.id;

      // Show dashboard
      appHeaderSearch.style.display = 'none';
      appDashboard.style.display = 'flex';
      
      // Reset transforms
      resetMapTransforms();
      
      // Render formations list & select starting step
      renderFormationsTable();
      selectFormation(0);
      
    } else {
      alert('找不到該跑位人員！請確認輸入的身分證座標是否正確。');
    }
  }

  function getFormationHints(key) {
    const actionHints = typeof ACTION_HINTS_DATA !== 'undefined' && ACTION_HINTS_DATA[key]
      ? ACTION_HINTS_DATA[key]
      : [];
    const cardHints = typeof CARD_HINTS_DATA !== 'undefined' && CARD_HINTS_DATA[key]
      ? CARD_HINTS_DATA[key]
      : [];
    return [...actionHints, ...cardHints];
  }

  // Get YouTube link from Action Hints Data for a given formation key
  function getYoutubeLinkForKey(key) {
    if (key === 'basic') {
      // Fallback for 起點 (using the circle/序 video)
      return 'https://www.youtube.com/watch?v=9xXoD2XVbNY';
    }
    if (key === 'noBoat3') {
      // Fallback for 05-3有法船 (using the noBoat/是諸眾生 video)
      return 'https://youtu.be/vYxBbQ5FWu0?si=ECAovE17EjbU3aSP';
    }
    if (typeof ACTION_HINTS_DATA === 'undefined') return formationReferenceVideos[key] || '';
    const hints = ACTION_HINTS_DATA[key];
    if (!hints) return formationReferenceVideos[key] || '';
    for (const h of hints) {
      if (h.details) {
        for (const d of h.details) {
          if (d.type === 'text' && (d.content.includes('youtube.com') || d.content.includes('youtu.be'))) {
            return d.content;
          }
        }
      }
    }
    return formationReferenceVideos[key] || '';
  }

  // Parse time parameter from YouTube URL (e.g. t=85 or t=1m25s) and return friendly Chinese string
  function parseYoutubeTime(url) {
    if (!url) return '';
    const match = url.match(/[\?\&]t=([0-9a-zA-Z]+)/);
    if (!match) return '0分00秒'; // Default start time
    
    const tVal = match[1];
    
    if (/^\d+$/.test(tVal)) {
      const totalSec = parseInt(tVal, 10);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}分${s.toString().padStart(2, '0')}秒`;
    }
    
    if (/^\d+s$/.test(tVal)) {
      const totalSec = parseInt(tVal.replace('s', ''), 10);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}分${s.toString().padStart(2, '0')}秒`;
    }

    let minutes = 0;
    let seconds = 0;
    const mMatch = tVal.match(/(\d+)m/);
    const sMatch = tVal.match(/(\d+)s/);
    if (mMatch) minutes = parseInt(mMatch[1], 10);
    if (sMatch) seconds = parseInt(sMatch[1], 10);
    if (mMatch || sMatch) {
      return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
    }
    
    return '0分00秒';
  }

  // Render the complete 17-point formation table on the right panel.
  function renderFormationsTable() {
    const listPart1 = document.getElementById('formationsListPart1');
    const listPart2 = document.getElementById('formationsListPart2');
    const singleList = document.getElementById('formationsList');

    if (listPart1) listPart1.innerHTML = '';
    if (listPart2) listPart2.innerHTML = '';
    if (singleList) singleList.innerHTML = '';
    
    keyFormations.forEach((f, idx) => {
      const coordStr = getFormationCoordStr(currentPerformer, f.key) || '無';
      const displayType = getDisplayType(f.key);
      const category = currentPerformer.category;
      
      const itemRow = document.createElement('div');
      itemRow.className = `table-row formation-item step-row-${f.key}`;
      itemRow.dataset.index = idx;
      
      // Sticker image or coordinate overlay circle (起點 & 人文)
      let stickerHtml = '';
      if (f.key === 'basic') {
        const isCatA = category.startsWith('A');
        const color = isCatA ? 'var(--color-a-white)' : 'var(--color-b-white)';
        const parts = getPerformerFields(currentPerformer).coordinate.split('-');
        const topPart = parts[0] ? parts[0].padStart(2, '0') : '00';
        const bottomPart = parts[1] ? parts[1].padStart(2, '0') : '00';
        
        stickerHtml = `
          <div class="list-sticker-preview">
            <img src="images/stickers/basic_${getEnglishCategory(category)}.png" alt="basic">
            <div class="list-sticker-overlay" style="background-color: ${color};">
              <span style="border-bottom: 0.5px solid #fff; width: 80%; text-align: center; padding-bottom: 1px;">${topPart}</span>
              <span style="padding-top: 1px;">${bottomPart}</span>
            </div>
          </div>
        `;
      } else {
        stickerHtml = `
          <div class="list-sticker-preview">
            <img src="images/stickers/${displayType}_${getEnglishCategory(category)}.png" alt="${displayType}">
          </div>
        `;
      }

      // Fetch YouTube video link and parse minute/second timestamp for display badge
      const ytLink = getYoutubeLinkForKey(f.key);
      const timeStr = ytLink ? parseYoutubeTime(ytLink) : '';
      const isReferenceVideo = ytLink === formationReferenceVideos[f.key];
      const videoLabel = isReferenceVideo ? '參考影片' : (timeStr || 'YouTube');
      const timeBadgeHtml = timeStr 
        ? `<a href="${ytLink}" target="_blank" class="col-time-badge" style="display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; color: var(--gold-color); background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.2); padding: 1.5px 5px; border-radius: var(--radius-sm); margin-top: 3px; text-decoration: none; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(251,191,36,0.18)'; this.style.color='#ffffff';" onmouseout="this.style.background='rgba(251,191,36,0.08)'; this.style.color='var(--gold-color)';"><i class="fa-brands fa-youtube" style="color: #ef4444; margin-right: 3px;"></i>${videoLabel}</a>` 
        : '';

      // Calculate movement instructions for this item to show inside the row
      let moveInstructions = '';
      if (idx === 0) {
        moveInstructions = '起點站位';
      } else {
        const prevF = keyFormations[idx - 1];
        const prevCoordStr = prevF ? getFormationCoordStr(currentPerformer, prevF.key) : '';
        const prevCoord = parseCoordinate(prevCoordStr);
        const currentCoord = parseCoordinate(coordStr);
        
        if (prevCoord && currentCoord && !prevCoord.isText && !currentCoord.isText) {
          const dX = currentCoord.x - prevCoord.x;
          const dY = currentCoord.y - prevCoord.y;
          
          const roundedX = Math.round(Math.abs(dX));
          const roundedY = Math.round(Math.abs(dY));
          
          let parts = [];
          if (roundedX > 0) {
            parts.push(dX > 0 ? `右移 ${roundedX}` : `左移 ${roundedX}`);
          }
          
          if (roundedY > 0) {
            parts.push(dY > 0 ? `後退 ${roundedY}` : `前進 ${roundedY}`);
          }
          
          if (parts.length === 0) {
            moveInstructions = '原地不動';
          } else {
            moveInstructions = parts.join('，');
          }
        } else {
          moveInstructions = '無資料';
        }
      }

      const moveBadgeHtml = `
        <span class="col-move-badge" style="display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; color: #fbbf24; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); padding: 1.5px 5px; border-radius: var(--radius-sm); margin-top: 3px; ${timeBadgeHtml ? 'margin-left: 4px;' : ''}">
          <i class="fa-solid fa-person-walking" style="margin-right: 3px; color: #fbbf24;"></i>${moveInstructions}
        </span>
      `;

      itemRow.innerHTML = `
        <div class="col-name" style="display: flex; flex-direction: column; align-items: flex-start;">
          <span>${f.name}</span>
          <div style="display: flex; flex-wrap: wrap; align-items: center;">
            ${timeBadgeHtml}
            ${moveBadgeHtml}
          </div>
        </div>
        <div class="col-sticker">${stickerHtml}</div>
        <div class="col-coord">${coordStr}</div>
      `;

      // Prevent row selection click event when clicking the badge link directly
      const timeBadgeEl = itemRow.querySelector('.col-time-badge');
      if (timeBadgeEl) {
        timeBadgeEl.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      itemRow.addEventListener('click', () => {
        selectFormation(idx);
      });

      if (idx < 9) {
        if (listPart1) listPart1.appendChild(itemRow);
        else if (singleList) singleList.appendChild(itemRow);
      } else {
        if (listPart2) listPart2.appendChild(itemRow);
        else if (singleList) singleList.appendChild(itemRow);
      }
    });
  }

  // Parse Youtube video ID and return embed URL
  function getYoutubeEmbedUrl(url) {
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    if (videoId) {
      let timeParam = '';
      const tMatch = url.match(/[\?\&]t=(\d+)/);
      if (tMatch) {
        timeParam = `?start=${tMatch[1]}`;
      }
      return `https://www.youtube.com/embed/${videoId}${timeParam}`;
    }
    return '';
  }

  // Set active step and trigger UI highlighting/rendering
  function selectFormation(idx) {
    activeFormationIdx = idx;
    
    // Highlight list row
    document.querySelectorAll('.formation-item').forEach(row => row.classList.remove('active'));
    const activeRow = document.querySelector(`.step-row-${keyFormations[idx].key}`);
    if (activeRow) activeRow.classList.add('active');

    // Update active metadata switcher
    const f = keyFormations[idx];
    const coordStr = getFormationCoordStr(currentPerformer, f.key) || '無';
    activeFormNum.textContent = String(idx + 1).padStart(2, '0');
    activeFormTitle.textContent = f.name;
    activeFormCoord.textContent = `座標: ${coordStr}`;

    // Update movement instructions banner
    const activeFormMovementText = document.getElementById('activeFormMovementText');
    if (activeFormMovementText) {
      if (idx === 0) {
        activeFormMovementText.textContent = `走位指引：此處為起點站位。`;
      } else {
        const prevF = keyFormations[idx - 1];
        const prevCoordStr = prevF ? getFormationCoordStr(currentPerformer, prevF.key) : '';
        const prevCoord = parseCoordinate(prevCoordStr);
        const currentCoord = parseCoordinate(coordStr);
        
        if (prevCoord && currentCoord && !prevCoord.isText && !currentCoord.isText) {
          const dX = currentCoord.x - prevCoord.x;
          const dY = currentCoord.y - prevCoord.y;
          
          const roundedX = Math.round(Math.abs(dX));
          const roundedY = Math.round(Math.abs(dY));
          
          let parts = [];
          if (roundedX > 0) {
            parts.push(dX > 0 ? `向右邊移動 ${roundedX} 步` : `向左邊移動 ${roundedX} 步`);
          }
          
          if (roundedY > 0) {
            parts.push(dY > 0 ? `向後退 (遠離乙舞台) ${roundedY} 步` : `向前進 (靠近乙舞台) ${roundedY} 步`);
          }
          
          if (parts.length === 0) {
            activeFormMovementText.textContent = `走位指引：與前一景「${prevF.name}」座標相同，原地不動。`;
          } else {
            activeFormMovementText.textContent = `走位指引：從「${prevF.name}」出發，${parts.join('，')}。`;
          }
        } else {
          activeFormMovementText.textContent = `走位指引：座標非數值或無資料，請依現場標線為準。`;
        }
      }
    }

    // Disable step buttons at ends
    prevBtn.disabled = (idx === 0);
    nextBtn.disabled = (idx === keyFormations.length - 1);

    // Render lyrics details
    const lyrics = (typeof chantLyrics !== 'undefined') ? chantLyrics[f.key] : [];
    if (lyrics && lyrics.length > 0) {
      mapLyricsGuide.innerHTML = lyrics.map(line => `<p>${line}</p>`).join('');
    } else {
      mapLyricsGuide.innerHTML = '<p class="text-muted">此定點暫無唱誦歌詞。</p>';
    }

    // Render action explanation guides
    actionHintsFlow.innerHTML = '';
    const hints = getFormationHints(f.key);
    if (hints && hints.length > 0) {
      hints.forEach(h => {
        const div = document.createElement('div');
        div.className = 'action-hint-item';
        
        let detailsHtml = '';
        if (h.details) {
          h.details.forEach(d => {
            if (d.type === 'text') {
              if (d.content.includes('youtube.com') || d.content.includes('youtu.be')) {
                // Skip rendering YouTube link here since it is already clickable in the formations table list
              } else if (d.content.startsWith('http')) {
                detailsHtml += `<p class="action-detail-text"><i class="fa-solid fa-link"></i> <a href="${d.content}" target="_blank">開啟外部連結</a></p>`;
              } else {
                detailsHtml += `<p class="action-detail-text">${d.content}</p>`;
              }
            } else if (d.type === 'image') {
              let src = d.src;
              if (src && src.startsWith('images/action_hints/')) {
                src = 'https://jyhornglin-glitch.github.io/Dome_Position/' + src;
              }
              const safeTitle = h.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
              detailsHtml += `
                <div class="action-detail-image" style="cursor: zoom-in; position: relative;" onclick="openLightbox('${src}', '${safeTitle}')">
                  <img src="${src}" alt="hint">
                  <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.65); padding: 3px 6px; border-radius: var(--radius-sm); color: #fff; font-size: 10px; pointer-events: none; display: flex; align-items: center; gap: 4px; border: 1px solid rgba(255,255,255,0.15);">
                    <i class="fa-solid fa-magnifying-glass-plus"></i> <span>點擊放大</span>
                  </div>
                </div>
              `;
            }
          });
        }
        
        div.innerHTML = `
          <div class="action-hint-title">${h.title}</div>
          <div class="action-hint-details">${detailsHtml}</div>
        `;
        actionHintsFlow.appendChild(div);
      });
    } else {
      actionHintsFlow.innerHTML = '<p class="text-muted">暫無詳細演繹動作說明。</p>';
    }

    // Render map paths and focus active point
    drawLocalGridPath();
  }

  // Translate coordinates to SVG coordinates
  function gridToSvg(dx_rel, dy_rel) {
    const svgX = GRID_CENTER_X + dx_rel * GRID_SPACING;
    const svgY = GRID_CENTER_Y + dy_rel * GRID_SPACING;
    return { x: svgX, y: svgY };
  }

  // Draw local grid map centering the performer's starting coordinate (0,0)
  function drawLocalGridPath(targetSvg = null, targetIdx = null) {
    if (!currentPerformer) return;

    const svgEl = targetSvg || localGridSvg;
    const isMainSvg = (svgEl === localGridSvg);
    const fIdx = (targetIdx !== null) ? targetIdx : activeFormationIdx;
    
    const showFull = showFullTrajectory.checked;
    
    // Reset contents
    const wmkGroup = svgEl.querySelector('.stage-watermark');
    const linesGroup = svgEl.querySelector('.grid-lines');
    const pathSegmentsGroup = svgEl.querySelector('#localPathSegments');
    const pathPointsGroup = svgEl.querySelector('#localPathPoints');
    const contentGroup = svgEl.querySelector('#localGridContent') || svgEl;
    const existingPathLabelsGroup = svgEl.querySelector('#localPathLabels');

    wmkGroup.innerHTML = '';
    linesGroup.innerHTML = '';
    pathSegmentsGroup.innerHTML = '';
    pathPointsGroup.innerHTML = '';
    if (existingPathLabelsGroup) {
      existingPathLabelsGroup.remove();
    }

    const fields = getPerformerFields(currentPerformer);
    const homeCoord = parseCoordinate(fields.coordinate);
    const category = currentPerformer.category;
    const centerLineX = (selectedTeam === 'west') ? 6 : -6;

    // Calculate dynamic scaling size to fit all plotted points in grid
    let maxOffset = 0;
    const parsedPoints = keyFormations.map((f) => {
      const coordStr = getFormationCoordStr(currentPerformer, f.key);
      const coord = parseCoordinate(coordStr);
      let dx_rel = 0;
      let dy_rel = 0;
      if (!coord.isText && !homeCoord.isText) {
        dx_rel = coord.x - homeCoord.x;
        dy_rel = coord.y - homeCoord.y;
      } else if (coord.isText) {
        dx_rel = coord.mockX || 0;
        dy_rel = coord.mockY || 0;
      }
      return { dx_rel, dy_rel, coord };
    });

    parsedPoints.forEach(pt => {
      maxOffset = Math.max(maxOffset, Math.abs(pt.dx_rel), Math.abs(pt.dy_rel));
    });

    if (!homeCoord.isText) {
      const stageB_dx_rel = centerLineX - homeCoord.x;
      const stageB_dy_rel = 38 - homeCoord.y;
      maxOffset = Math.max(maxOffset, Math.abs(stageB_dx_rel), Math.abs(stageB_dy_rel));
    }

    // Set MAX_GRID_COORD dynamically
    MAX_GRID_COORD = 4;
    while (MAX_GRID_COORD < maxOffset + 1.5) {
      MAX_GRID_COORD += 4;
    }
    GRID_SPACING = 180 / MAX_GRID_COORD;

    // Adjust grid labels spacing based on coordinate density
    let labelStep = 2;
    if (MAX_GRID_COORD <= 6) labelStep = 1;
    else if (MAX_GRID_COORD <= 12) labelStep = 2;
    else if (MAX_GRID_COORD <= 24) labelStep = 4;
    else labelStep = 8;

    // Set clip rect size
    const gridClipRect = svgEl.querySelector('#gridClipRect');
    if (gridClipRect) {
      gridClipRect.setAttribute('x', GRID_CENTER_X - MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('y', GRID_CENTER_Y - MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('width', 2 * MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('height', 2 * MAX_GRID_COORD * GRID_SPACING);
    }

    // 1. Draw Stage Watermark Blueprint
    if (!homeCoord.isText) {
      // Outer rect mask
      const bg_x1_rel = (centerLineX - 3) - homeCoord.x;
      const bg_y1_rel = -MAX_GRID_COORD;
      const bg_svgTopLeft = gridToSvg(bg_x1_rel, bg_y1_rel);
      const bg_width = 6 * GRID_SPACING;
      const bg_height = 2 * MAX_GRID_COORD * GRID_SPACING;
      
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', bg_svgTopLeft.x);
      bgRect.setAttribute('y', bg_svgTopLeft.y);
      bgRect.setAttribute('width', bg_width);
      bgRect.setAttribute('height', bg_height);
      bgRect.setAttribute('class', 'watermark-bg');
      wmkGroup.appendChild(bgRect);

      // Stage B Center Circle
      const stageB_dx_rel = centerLineX - homeCoord.x;
      const stageB_dy_rel = 38 - homeCoord.y;
      const stageB_svg = gridToSvg(stageB_dx_rel, stageB_dy_rel);
      
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', stageB_svg.x);
      bgCircle.setAttribute('cy', stageB_svg.y);
      bgCircle.setAttribute('r', 9.8 * GRID_SPACING);
      bgCircle.setAttribute('class', 'watermark-bg');
      wmkGroup.appendChild(bgCircle);

      // Runway central rect
      const rect_x1_rel = (centerLineX - 3) - homeCoord.x;
      const rect_y1_rel = 33 - homeCoord.y;
      const rect_svgTopLeft = gridToSvg(rect_x1_rel, rect_y1_rel);
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', rect_svgTopLeft.x);
      rect.setAttribute('y', rect_svgTopLeft.y);
      rect.setAttribute('width', 6 * GRID_SPACING);
      rect.setAttribute('height', 10 * GRID_SPACING);
      rect.setAttribute('class', 'watermark-rect');
      wmkGroup.appendChild(rect);

      // Runway inner central square
      const squareSize = 8.0 * GRID_SPACING;
      const squareRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      squareRect.setAttribute('x', stageB_svg.x - squareSize / 2);
      squareRect.setAttribute('y', stageB_svg.y - squareSize / 2);
      squareRect.setAttribute('width', squareSize);
      squareRect.setAttribute('height', squareSize);
      squareRect.setAttribute('class', 'watermark-rect');
      wmkGroup.appendChild(squareRect);

      // Runway concentric track rings
      const sides = [1, -1];
      sides.forEach(side => {
        for (let i = 0; i <= 6; i++) {
          const R_i = 7.4 + i * 0.4;
          const W_i = 3.4 + i * 0.4;
          const col_top = centerLineX + side * W_i - homeCoord.x;
          const col_mid = centerLineX + side * R_i - homeCoord.x;
          const col_bottom = centerLineX + side * W_i - homeCoord.x;
          
          const pathD = `M ${GRID_CENTER_X + col_top * GRID_SPACING} ${GRID_CENTER_Y + (-MAX_GRID_COORD) * GRID_SPACING} ` +
                        `L ${GRID_CENTER_X + col_top * GRID_SPACING} ${GRID_CENTER_Y + (38 - 12 - homeCoord.y) * GRID_SPACING} ` +
                        `C ${GRID_CENTER_X + col_top * GRID_SPACING} ${GRID_CENTER_Y + (38 - 6 - homeCoord.y) * GRID_SPACING}, ${GRID_CENTER_X + col_mid * GRID_SPACING} ${GRID_CENTER_Y + (38 - 6 - homeCoord.y) * GRID_SPACING}, ${GRID_CENTER_X + col_mid * GRID_SPACING} ${GRID_CENTER_Y + (38 - homeCoord.y) * GRID_SPACING} ` +
                        `C ${GRID_CENTER_X + col_mid * GRID_SPACING} ${GRID_CENTER_Y + (38 + 6 - homeCoord.y) * GRID_SPACING}, ${GRID_CENTER_X + col_bottom * GRID_SPACING} ${GRID_CENTER_Y + (38 + 6 - homeCoord.y) * GRID_SPACING}, ${GRID_CENTER_X + col_bottom * GRID_SPACING} ${GRID_CENTER_Y + (38 + 12 - homeCoord.y) * GRID_SPACING} ` +
                        `L ${GRID_CENTER_X + col_bottom * GRID_SPACING} ${GRID_CENTER_Y + MAX_GRID_COORD * GRID_SPACING}`;
                        
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathD);
          path.setAttribute('fill', 'none');
          path.setAttribute('class', i === 0 ? 'watermark-line-accent' : (i % 2 === 1 ? 'watermark-line-yellow' : 'watermark-line'));
          wmkGroup.appendChild(path);
        }
      });

      // Radial stairs radiating from center (6, 38)
      const rightAngles = [-45, -30, -15, 0, 15, 30, 45];
      const leftAngles = [135, 150, 165, 180, 195, 210, 225];
      [...rightAngles, ...leftAngles].forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', stageB_svg.x + 8.0 * GRID_SPACING * Math.cos(rad));
        line.setAttribute('y1', stageB_svg.y + 8.0 * GRID_SPACING * Math.sin(rad));
        line.setAttribute('x2', stageB_svg.x + 9.8 * GRID_SPACING * Math.cos(rad));
        line.setAttribute('y2', stageB_svg.y + 9.8 * GRID_SPACING * Math.sin(rad));
        line.setAttribute('class', 'watermark-line');
        wmkGroup.appendChild(line);
      });

      // Watermark labels
      drawFloatingLabel('乙舞台', centerLineX, 38);

      // Master label shifted backwards (+12) relative to starting point Y level on stage center line
      let masterY = homeCoord.y + 12;
      drawMasterLabel('法師區', centerLineX, masterY);
    }

    function drawFloatingLabel(text, gridX, gridY) {
      const dx_rel = gridX - homeCoord.x;
      const dy_rel = gridY - homeCoord.y;
      const pt_svg = gridToSvg(dx_rel, dy_rel);
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pt_svg.x - 22);
      rect.setAttribute('y', pt_svg.y - 8);
      rect.setAttribute('width', 44);
      rect.setAttribute('height', 16);
      rect.setAttribute('rx', 3);
      rect.setAttribute('ry', 3);
      rect.setAttribute('style', 'fill: #ffffff; stroke: #475569; stroke-width: 0.5px; fill-opacity: 0.9;');
      wmkGroup.appendChild(rect);
      
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', pt_svg.x);
      txt.setAttribute('y', pt_svg.y + 3);
      txt.setAttribute('class', 'watermark-text');
      txt.setAttribute('style', 'fill: #0f172a; font-size: 8px; font-weight: bold; text-anchor: middle;');
      txt.textContent = text;
      wmkGroup.appendChild(txt);
    }

    function drawMasterLabel(text, gridX, gridY) {
      const dx_rel = gridX - homeCoord.x;
      const dy_rel = gridY - homeCoord.y;
      const pt_svg = gridToSvg(dx_rel, dy_rel);
      
      const w = 48;
      const h = 17;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pt_svg.x - w / 2);
      rect.setAttribute('y', pt_svg.y - h / 2);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', 4);
      rect.setAttribute('ry', 4);
      rect.setAttribute('style', 'fill: #fef3c7; stroke: #d97706; stroke-width: 1px; fill-opacity: 0.95;');
      wmkGroup.appendChild(rect);
      
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', pt_svg.x);
      txt.setAttribute('y', pt_svg.y + 3.2);
      txt.setAttribute('class', 'watermark-text');
      txt.setAttribute('style', 'fill: #92400e; font-size: 8.5px; font-weight: 800; text-anchor: middle;');
      txt.textContent = text;
      wmkGroup.appendChild(txt);
    }

    // 2. Draw Grid Lines and Coordinates labels
    const drawGuides = showAlignmentGuides.checked;
    for (let i = -MAX_GRID_COORD; i <= MAX_GRID_COORD; i += labelStep) {
      const isCenter = (i === 0);
      const isLabel = true;

      // Vertical line
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      vLine.setAttribute('x1', GRID_CENTER_X + i * GRID_SPACING);
      vLine.setAttribute('y1', GRID_CENTER_Y - MAX_GRID_COORD * GRID_SPACING);
      vLine.setAttribute('x2', GRID_CENTER_X + i * GRID_SPACING);
      vLine.setAttribute('y2', GRID_CENTER_Y + MAX_GRID_COORD * GRID_SPACING);
      vLine.setAttribute('class', isCenter && drawGuides ? 'axis-line' : '');
      linesGroup.appendChild(vLine);

      // Horizontal line
      const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hLine.setAttribute('x1', GRID_CENTER_X - MAX_GRID_COORD * GRID_SPACING);
      hLine.setAttribute('y1', GRID_CENTER_Y + i * GRID_SPACING);
      hLine.setAttribute('x2', GRID_CENTER_X + MAX_GRID_COORD * GRID_SPACING);
      hLine.setAttribute('y2', GRID_CENTER_Y + i * GRID_SPACING);
      hLine.setAttribute('class', isCenter && drawGuides ? 'axis-line' : '');
      linesGroup.appendChild(hLine);

      // Text labels for coordinates
      if (!isCenter && !homeCoord.isText) {
        const roundedX = Math.round((homeCoord.x + i) * 10) / 10;
        const roundedY = Math.round(homeCoord.y - i);

        // X coordinate labels (aligned to horizontal center line)
        const textX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textX.setAttribute('x', GRID_CENTER_X + i * GRID_SPACING);
        textX.setAttribute('y', GRID_CENTER_Y + 11);
        textX.setAttribute('text-anchor', 'middle');
        textX.textContent = Math.abs(roundedX);
        linesGroup.appendChild(textX);

        // Y coordinate labels (aligned to vertical center line)
        const textY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textY.setAttribute('x', GRID_CENTER_X - 10);
        textY.setAttribute('y', GRID_CENTER_Y + i * GRID_SPACING + 3);
        textY.setAttribute('text-anchor', 'end');
        textY.textContent = roundedY;
        linesGroup.appendChild(textY);
      }
    }

    // 3. Calculate SVG points for all 17 formations.
    const pointsToDraw = keyFormations.map((f, idx) => {
      const coordStr = getFormationCoordStr(currentPerformer, f.key);
      const coord = parseCoordinate(coordStr);
      let dx_rel = 0;
      let dy_rel = 0;
      if (!coord.isText && !homeCoord.isText) {
        dx_rel = coord.x - homeCoord.x;
        dy_rel = coord.y - homeCoord.y;
      } else if (coord.isText) {
        dx_rel = coord.mockX || 0;
        dy_rel = coord.mockY || 0;
      }

      const svgPos = gridToSvg(dx_rel, dy_rel);
      let role = 'prev';
      if (idx === 0) role = 'basic';
      if (idx === fIdx) role = 'current';

      return {
        key: f.key,
        name: f.name,
        label: f.label,
        coord,
        dx_rel,
        dy_rel,
        pos: svgPos,
        index: idx,
        role
      };
    });

    // 4. Draw Transition Connecting Paths
    const formationColors = {
      basic: '#eab308',
      circle: '#BE6C50',
      xingYuan: '#0B954B',
      jingSi: '#80CEF3',
      lamp: '#ACCE22',
      noBoat: '#ACCE22',
      noBoat3: '#ACCE22',
      bigV: '#F19EA8',
      daChuanShi: '#FDD100'
    };

    for (let i = 0; i < pointsToDraw.length - 1; i++) {
      // Connect sequential nodes
      const start = pointsToDraw[i];
      const end = pointsToDraw[i + 1];

      // Draw path line if end point is active or full trajectory is on
      const isPathActive = (i + 1 === fIdx);
      if (!showFull && !isPathActive) continue;

      if (start.pos.x !== end.pos.x || start.pos.y !== end.pos.y) {
        let endX = end.pos.x;
        let endY = end.pos.y;
        
        // Draw a direct diagonal route and shorten active arrows slightly before the node sticker.
        if (isPathActive) {
          endX = start.pos.x + 0.9 * (end.pos.x - start.pos.x);
          endY = start.pos.y + 0.9 * (end.pos.y - start.pos.y);
        }

        const pathD = `M ${start.pos.x} ${start.pos.y} L ${endX} ${endY}`;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('fill', 'none');
        
        const targetKey = end.key;
        const color = formationColors[targetKey] || '#fbbf24';
        path.style.stroke = color;

        if (isPathActive) {
          path.setAttribute('class', 'local-path-line');
          path.setAttribute('marker-end', `url(#local-arrow-${targetKey})`);
          path.style.filter = `drop-shadow(0 0 3px ${color})`;
        } else {
          path.setAttribute('class', 'local-path-line-static');
          path.setAttribute('marker-end', `url(#local-arrow-static-${targetKey})`);
        }
        pathSegmentsGroup.appendChild(path);
      }
    }

    // Create dedicated topmost layer for coordinate labels so stickers never obscure them
    const pathLabelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    pathLabelsGroup.setAttribute('id', 'localPathLabels');
    contentGroup.appendChild(pathLabelsGroup);

    const labelsToAppend = [];
    const stickerSize = Math.max(12, Math.min(32, GRID_SPACING * 1.8));
    const visiblePoints = pointsToDraw.filter(pt => showFull || pt.index === 0 || pt.index === fIdx || pt.index === fIdx - 1);
    const parseSvgViewBounds = () => {
      const viewBox = svgEl.getAttribute('viewBox') || '0 0 360 360';
      const [left, top, width, height] = viewBox.split(/\s+/).map(Number);
      if ([left, top, width, height].some(value => Number.isNaN(value))) {
        return { left: 0, top: 0, right: 360, bottom: 360, width: 360, height: 360 };
      }
      return { left, top, right: left + width, bottom: top + height, width, height };
    };
    const currentViewBounds = parseSvgViewBounds();

    const createBounds = (centerX, centerY, width, height) => ({
      left: centerX - width / 2,
      top: centerY - height / 2,
      right: centerX + width / 2,
      bottom: centerY + height / 2,
      width,
      height
    });

    const shiftBounds = (bounds, dx, dy) => ({
      ...bounds,
      left: bounds.left + dx,
      right: bounds.right + dx,
      top: bounds.top + dy,
      bottom: bounds.bottom + dy
    });

    const clampBoundsToSvg = (bounds) => {
      const margin = Math.max(6, Math.min(currentViewBounds.width, currentViewBounds.height) * 0.02);
      let dx = 0;
      let dy = 0;
      if (bounds.left < currentViewBounds.left + margin) dx = currentViewBounds.left + margin - bounds.left;
      if (bounds.right + dx > currentViewBounds.right - margin) dx = currentViewBounds.right - margin - bounds.right;
      if (bounds.top < currentViewBounds.top + margin) dy = currentViewBounds.top + margin - bounds.top;
      if (bounds.bottom + dy > currentViewBounds.bottom - margin) dy = currentViewBounds.bottom - margin - bounds.bottom;
      return shiftBounds(bounds, dx, dy);
    };

    const boundsOverlap = (a, b, padding = 0) => !(
      a.right + padding <= b.left ||
      a.left - padding >= b.right ||
      a.bottom + padding <= b.top ||
      a.top - padding >= b.bottom
    );

    const overlapArea = (a, b) => {
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return width * height;
    };

    const stickerBounds = visiblePoints.map(pt => ({
      key: pt.key,
      ...createBounds(pt.pos.x, pt.pos.y, stickerSize + 4, stickerSize + 4)
    }));
    const placedLabelBounds = [];
    const labelPointByCoordinate = new Map();

    const getCoordinateLabelKey = (pt) => (pt.coord.text || '無').trim() || '無';
    const shouldCreateCoordinateLabel = (pt) =>
      pt.coord && pt.coord.text;
    const getCoordinateDisplayText = (text) => text === '無' ? '無座標' : text;
    const estimateSvgTextWidth = (text, fontSize) => (
      Array.from(text).reduce((sum, char) => sum + (/[\u4e00-\u9fff]/.test(char) ? fontSize : fontSize * 0.62), 0) + 10
    );

    visiblePoints.forEach(pt => {
      if (!shouldCreateCoordinateLabel(pt)) return;

      const labelKey = getCoordinateLabelKey(pt);
      const existing = labelPointByCoordinate.get(labelKey);
      if (!existing) {
        labelPointByCoordinate.set(labelKey, { point: pt, members: [pt] });
      } else {
        existing.members.push(pt);
        if (pt.role === 'current' || (existing.point.role !== 'current' && pt.index < existing.point.index)) {
          existing.point = pt;
        }
      }
    });

    function findNonOverlappingLabelBounds(pt, labelWidth, labelHeight) {
      const baseGap = 5;
      const offsets = [baseGap, 10, 16, 24, 34, 46, 60, 78, 98];
      const directions = [
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
        { x: 1, y: -1 },
        { x: -1, y: -1 }
      ];
      let best = null;

      for (const offset of offsets) {
        for (const direction of directions) {
          const distanceX = direction.x === 0 ? 0 : stickerSize / 2 + labelWidth / 2 + offset;
          const distanceY = direction.y === 0 ? 0 : stickerSize / 2 + labelHeight / 2 + offset;
          const candidate = clampBoundsToSvg(createBounds(
            pt.pos.x + direction.x * distanceX,
            pt.pos.y + direction.y * distanceY,
            labelWidth,
            labelHeight
          ));

          const stickerPenalty = stickerBounds.reduce(
            (sum, bounds) => sum + (boundsOverlap(candidate, bounds, 1) ? overlapArea(candidate, bounds) + 10000 : 0),
            0
          );
          const labelPenalty = placedLabelBounds.reduce(
            (sum, bounds) => sum + (boundsOverlap(candidate, bounds, 2) ? overlapArea(candidate, bounds) + 5000 : 0),
            0
          );
          const score = stickerPenalty + labelPenalty + Math.abs(candidate.left + labelWidth / 2 - pt.pos.x) * 0.01 + Math.abs(candidate.top + labelHeight / 2 - pt.pos.y) * 0.01;

          if (!best || score < best.score) {
            best = { bounds: candidate, score };
          }
          if (stickerPenalty === 0 && labelPenalty === 0) {
            placedLabelBounds.push(candidate);
            return candidate;
          }
        }
      }

      placedLabelBounds.push(best.bounds);
      return best.bounds;
    }

    // 5. Draw Performer Nodes (Sticker Icons)
    visiblePoints.forEach(pt => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      let gClass = `path-point pt-${pt.key} role-${pt.role}`;
      if (pt.index === fIdx) gClass += ' active-formation';
      g.setAttribute('class', gClass);
      g.setAttribute('id', `local-point-${pt.key}`);

      const size = stickerSize;

      // Draw the sticker PNG image
      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      const displayType = getDisplayType(pt.key);
      const stickerSrc = `images/stickers/${displayType}_${getEnglishCategory(category)}.png`;
      img.setAttribute('href', stickerSrc);
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', stickerSrc);
      img.setAttribute('x', pt.pos.x - size / 2);
      img.setAttribute('y', pt.pos.y - size / 2);
      img.setAttribute('width', size);
      img.setAttribute('height', size);
      img.setAttribute('class', 'svg-sticker-image');

      if (isMainSvg) {
        img.addEventListener('click', () => selectFormation(pt.index));
      }
      g.appendChild(img);

      // Draw starting point overlay circle badge (with coordinate numbers)
      if (pt.key === 'basic') {
        const centerColor = category.startsWith('B') ? 'var(--color-b-white)' : 'var(--color-a-white)';
        const overlayCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        overlayCircle.setAttribute('cx', pt.pos.x);
        overlayCircle.setAttribute('cy', pt.pos.y);
        overlayCircle.setAttribute('r', (size * 0.3).toFixed(2));
        overlayCircle.setAttribute('fill', centerColor);
        g.appendChild(overlayCircle);

        const parts = fields.coordinate.split('-');
        if (parts.length === 2) {
          // Mid dividing line
          const midLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          midLine.setAttribute('x1', (pt.pos.x - size * 0.18).toFixed(2));
          midLine.setAttribute('y1', pt.pos.y);
          midLine.setAttribute('x2', (pt.pos.x + size * 0.18).toFixed(2));
          midLine.setAttribute('y2', pt.pos.y);
          midLine.setAttribute('stroke', '#ffffff');
          midLine.setAttribute('stroke-width', (size * 0.024).toFixed(2));
          g.appendChild(midLine);
          
          // Top number
          const topText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          topText.setAttribute('x', pt.pos.x);
          topText.setAttribute('y', (pt.pos.y - size * 0.06).toFixed(2));
          topText.setAttribute('text-anchor', 'middle');
          topText.setAttribute('class', 'sticker-coord-text');
          topText.setAttribute('fill', '#ffffff');
          topText.setAttribute('style', `font-size: ${(size * 0.208).toFixed(2)}px`);
          topText.textContent = parts[0].padStart(2, '0');
          g.appendChild(topText);
          
          // Bottom number
          const bottomText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          bottomText.setAttribute('x', pt.pos.x);
          bottomText.setAttribute('y', (pt.pos.y + size * 0.192).toFixed(2));
          bottomText.setAttribute('text-anchor', 'middle');
          bottomText.setAttribute('class', 'sticker-coord-text');
          bottomText.setAttribute('fill', '#ffffff');
          bottomText.setAttribute('style', `font-size: ${(size * 0.208).toFixed(2)}px`);
          bottomText.textContent = parts[1].padStart(2, '0');
          g.appendChild(bottomText);
        }
      }

      pathPointsGroup.appendChild(g);

      // Create coordinate label element (skip '無' text or starting point basic node)
      const coordinateLabelGroup = shouldCreateCoordinateLabel(pt)
        ? labelPointByCoordinate.get(getCoordinateLabelKey(pt))
        : null;

      if (coordinateLabelGroup && coordinateLabelGroup.point === pt) {
        const labelG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        labelG.setAttribute('class', `label-group role-${pt.role}`);
        labelG.setAttribute('data-anchor-x', pt.pos.x);
        labelG.setAttribute('data-anchor-y', pt.pos.y);
        labelG.setAttribute('data-label-key', getCoordinateLabelKey(pt));
        
        const coordinateText = getCoordinateDisplayText(pt.coord.text);
        const fontSize = 9;
        const bgWidth = estimateSvgTextWidth(coordinateText, fontSize);
        const bgHeight = fontSize * 1.5;
        const labelBounds = findNonOverlappingLabelBounds(pt, bgWidth, bgHeight);
        const labelX = labelBounds.left + bgWidth / 2;
        const labelY = labelBounds.top + bgHeight / 2;

        if (coordinateLabelGroup.members.length > 1) {
          coordinateLabelGroup.members.forEach(member => {
            const leaderLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            leaderLine.setAttribute('x1', labelX);
            leaderLine.setAttribute('y1', labelY);
            leaderLine.setAttribute('x2', member.pos.x);
            leaderLine.setAttribute('y2', member.pos.y);
            leaderLine.setAttribute('class', 'label-leader-line');
            leaderLine.setAttribute('data-label-key', getCoordinateLabelKey(pt));
            pathSegmentsGroup.appendChild(leaderLine);
          });
        }

        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('x', labelBounds.left);
        labelBg.setAttribute('y', labelBounds.top);
        labelBg.setAttribute('width', bgWidth);
        labelBg.setAttribute('height', bgHeight);
        labelBg.setAttribute('rx', 4);
        labelBg.setAttribute('ry', 4);
        labelBg.setAttribute('class', 'path-label-bg');
        labelG.appendChild(labelBg);

        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('x', labelX);
        textEl.setAttribute('y', labelY + fontSize * 0.35);
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('class', 'path-label-text');
        textEl.setAttribute('style', `font-size: ${fontSize}px; font-weight: bold;`);
        textEl.textContent = coordinateText;
        labelG.appendChild(textEl);

        labelsToAppend.push({ element: labelG, isCurrent: pt.role === 'current' });
      }
    });

    // Append labels to topmost layer (current active label last so it is on the highest Z-index)
    labelsToAppend.sort((a, b) => (a.isCurrent ? 1 : 0) - (b.isCurrent ? 1 : 0));
    labelsToAppend.forEach(item => pathLabelsGroup.appendChild(item.element));

    // Remove yellow current position marker avatar dot if present
    const existingAvatar = document.getElementById('liveAvatarMarker');
    if (existingAvatar && existingAvatar.parentNode) {
      existingAvatar.parentNode.removeChild(existingAvatar);
    }

    // Update main Viewbox scale/rotation
    if (isMainSvg) {
      updateSvgViewBox();
    }
  }

  // Update SVG zoom/rotation viewBox parameters
  function updateSvgViewBox() {
    const scale = zoomLevel;
    const viewSize = 360 * scale;
    const minX = GRID_CENTER_X + panX - viewSize / 2;
    const minY = GRID_CENTER_Y + panY - viewSize / 2;

    localGridSvg.setAttribute('viewBox', `${minX} ${minY} ${viewSize} ${viewSize}`);
    
    // Rotate the inner content group
    const contentGroup = document.getElementById('localGridContent');
    if (contentGroup) {
      contentGroup.setAttribute('transform', `rotate(${rotationAngle} ${GRID_CENTER_X} ${GRID_CENTER_Y})`);
    }

    // Keep sticker icons and text labels horizontal (unrotated)
    document.querySelectorAll('.svg-sticker-image').forEach(img => {
      const x = parseFloat(img.getAttribute('x'));
      const y = parseFloat(img.getAttribute('y'));
      const w = parseFloat(img.getAttribute('width'));
      const h = parseFloat(img.getAttribute('height'));
      const cx = x + w / 2;
      const cy = y + h / 2;
      img.setAttribute('transform', `rotate(${-rotationAngle} ${cx} ${cy})`);
    });

    document.querySelectorAll('.path-label-bg, .path-label-text, .path-label-subtext').forEach(el => {
      const x = parseFloat(el.getAttribute('x'));
      const y = parseFloat(el.getAttribute('y'));
      const w = parseFloat(el.getAttribute('width') || 0);
      const h = parseFloat(el.getAttribute('height') || 0);
      const cx = w > 0 ? x + w / 2 : x;
      const cy = h > 0 ? y + h / 2 : y;
      el.setAttribute('transform', `rotate(${-rotationAngle} ${cx} ${cy})`);
    });

    // Keep live avatar horizontal if it exists
    const avatar = document.getElementById('liveAvatarMarker');
    if (avatar) {
      const children = avatar.querySelectorAll('circle, text');
      children.forEach(c => {
        c.setAttribute('transform', `rotate(${-rotationAngle})`);
      });
    }
  }

  // Create live performer indicator element in SVG
  function createLiveAvatarElement() {
    let avatar = document.getElementById('liveAvatarMarker');
    if (!avatar) {
      avatar = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      avatar.setAttribute('id', 'liveAvatarMarker');
      avatar.style.pointerEvents = 'none';
      
      // Halo glowing ring
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('r', '14');
      halo.setAttribute('fill', 'rgba(251, 191, 36, 0.4)');
      halo.setAttribute('class', 'avatar-halo');
      
      // Center solid circle
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '5.5');
      dot.setAttribute('fill', '#fbbf24'); // Gold
      dot.setAttribute('stroke', '#0b0f19');
      dot.setAttribute('stroke-width', '1.5');
      
      avatar.appendChild(halo);
      avatar.appendChild(dot);
      
      const pathPointsGroup = document.getElementById('localPathPoints');
      if (pathPointsGroup) {
        pathPointsGroup.appendChild(avatar);
      }
    }
    return avatar;
  }

  // Map transforms
  function adjustMapZoom(factor) {
    zoomLevel *= factor;
    zoomLevel = Math.max(0.4, Math.min(2.5, zoomLevel));
    updateSvgViewBox();
  }

  function adjustMapRotation(angle) {
    rotationAngle = (rotationAngle + angle) % 360;
    updateSvgViewBox();
  }

  function resetMapTransforms() {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    rotationAngle = 0;
    updateSvgViewBox();
  }

  // Handle touch/mouse dragging, wheel zoom & 2-finger pinch zoom on SVG grid
  let isPointerDown = false;
  let touchStartDist = 0;
  let initialZoom = 1.0;

  localGridSvg.addEventListener('mousedown', pointerDown);
  document.addEventListener('mousemove', pointerMove);
  document.addEventListener('mouseup', pointerUp);
  window.addEventListener('blur', pointerUp);

  // Mouse wheel zoom
  localGridSvg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.88 : 1.14;
    adjustMapZoom(zoomFactor);
  }, { passive: false });

  localGridSvg.addEventListener('touchstart', touchStart, { passive: false });
  localGridSvg.addEventListener('touchmove', touchMove, { passive: false });
  document.addEventListener('touchend', pointerUp);

  function pointerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    isPointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
    localGridSvg.classList.add('is-dragging');
  }

  function pointerMove(e) {
    if (!isPointerDown) return;
    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;

    // Scale displacement based on zoom
    panX -= dx * zoomLevel * 0.8;
    panY -= dy * zoomLevel * 0.8;
    updateSvgViewBox();
  }

  function pointerUp() {
    isPointerDown = false;
    touchStartDist = 0;
    localGridSvg.classList.remove('is-dragging');
  }

  function touchStart(e) {
    if (e.touches.length === 2) {
      isPointerDown = false;
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialZoom = zoomLevel;
    } else if (e.touches.length === 1) {
      isPointerDown = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  }

  function touchMove(e) {
    if (e.touches.length === 2 && touchStartDist > 0) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (currentDist > 0) {
        const zoomRatio = touchStartDist / currentDist;
        zoomLevel = Math.max(0.4, Math.min(2.5, initialZoom * zoomRatio));
        updateSvgViewBox();
      }
    } else if (e.touches.length === 1 && isPointerDown) {
      e.preventDefault();
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      panX -= dx * zoomLevel * 0.8;
      panY -= dy * zoomLevel * 0.8;
      updateSvgViewBox();
    }
  }

  // ==========================================================================
  // Dashboard Screenshot Download Feature
  // ==========================================================================

  function sanitizeFilenamePart(value, fallback = 'screenshot') {
    const cleaned = String(value || fallback)
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '_');
    return cleaned || fallback;
  }

  function saveCanvasAsPng(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('無法產生截圖檔案。'));
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, 'image/png');
    });
  }

  async function buildStickerDataUrlMap(category) {
    const stickerDataUrls = {};
    const uniqueStickerSources = new Set(
      keyFormations.map((formation) => {
        const displayType = getDisplayType(formation.key);
        return `images/stickers/${displayType}_${getEnglishCategory(category)}.png`;
      })
    );

    for (const src of uniqueStickerSources) {
      let dataUrl = '';
      const renderedSticker = getRenderedSticker(src);
      if (renderedSticker) {
        try {
          dataUrl = imageToDataUrl(renderedSticker);
        } catch (error) {
          console.warn(error);
        }
      }

      if (!dataUrl) {
        try {
          dataUrl = await loadImageAsDataUrl(src);
        } catch (error) {
          console.warn(error);
        }
      }

      if (dataUrl) {
        stickerDataUrls[src] = dataUrl;
        stickerDataUrls[new URL(src, window.location.href).href] = dataUrl;
      }
    }

    return stickerDataUrls;
  }

  function repositionScreenshotLabels(clonedDocument) {
    const svg = clonedDocument.getElementById('localGridSvg');
    if (!svg) return;

    const readRect = (el, padding = 0) => {
      const x = parseFloat(el.getAttribute('x'));
      const y = parseFloat(el.getAttribute('y'));
      const width = parseFloat(el.getAttribute('width'));
      const height = parseFloat(el.getAttribute('height'));
      return {
        left: x - padding,
        top: y - padding,
        right: x + width + padding,
        bottom: y + height + padding,
        width: width + padding * 2,
        height: height + padding * 2
      };
    };

    const createBounds = (centerX, centerY, width, height) => ({
      left: centerX - width / 2,
      top: centerY - height / 2,
      right: centerX + width / 2,
      bottom: centerY + height / 2,
      width,
      height
    });

    const overlap = (a, b, padding = 0) => !(
      a.right + padding <= b.left ||
      a.left - padding >= b.right ||
      a.bottom + padding <= b.top ||
      a.top - padding >= b.bottom
    );

    const overlapArea = (a, b) => {
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return width * height;
    };

    const parseViewBounds = () => {
      const viewBox = svg.getAttribute('viewBox') || '0 0 360 360';
      const [left, top, width, height] = viewBox.split(/\s+/).map(Number);
      if ([left, top, width, height].some(value => Number.isNaN(value))) {
        return { left: 0, top: 0, right: 360, bottom: 360, width: 360, height: 360 };
      }
      return { left, top, right: left + width, bottom: top + height, width, height };
    };
    const viewBounds = parseViewBounds();

    const shiftIntoSvg = (bounds) => {
      const margin = Math.max(6, Math.min(viewBounds.width, viewBounds.height) * 0.02);
      let dx = 0;
      let dy = 0;
      if (bounds.left < viewBounds.left + margin) dx = viewBounds.left + margin - bounds.left;
      if (bounds.right + dx > viewBounds.right - margin) dx = viewBounds.right - margin - bounds.right;
      if (bounds.top < viewBounds.top + margin) dy = viewBounds.top + margin - bounds.top;
      if (bounds.bottom + dy > viewBounds.bottom - margin) dy = viewBounds.bottom - margin - bounds.bottom;
      return {
        ...bounds,
        left: bounds.left + dx,
        right: bounds.right + dx,
        top: bounds.top + dy,
        bottom: bounds.bottom + dy
      };
    };

    const stickerBounds = Array.from(svg.querySelectorAll('image.svg-sticker-image')).map(img => readRect(img, 3));
    const placedLabelBounds = [];
    const seenLabels = new Set();

    Array.from(svg.querySelectorAll('#localPathLabels .label-group')).forEach(group => {
      const rect = group.querySelector('.path-label-bg');
      const text = group.querySelector('.path-label-text');
      const subText = group.querySelector('.path-label-subtext');
      if (!rect || !text) return;

      const labelText = text.textContent.trim();
      const labelKey = group.getAttribute('data-label-key');
      if (seenLabels.has(labelText)) {
        Array.from(svg.querySelectorAll('.label-leader-line')).forEach(line => {
          if (line.getAttribute('data-label-key') === labelKey) {
            line.remove();
          }
        });
        group.remove();
        return;
      }
      seenLabels.add(labelText);

      const width = parseFloat(rect.getAttribute('width'));
      const height = parseFloat(rect.getAttribute('height'));
      const anchorX = parseFloat(group.getAttribute('data-anchor-x')) || parseFloat(text.getAttribute('x'));
      const anchorY = parseFloat(group.getAttribute('data-anchor-y')) || parseFloat(rect.getAttribute('y')) + height / 2;
      const textOffsetY = parseFloat(text.getAttribute('y')) - (parseFloat(rect.getAttribute('y')) + height / 2);
      const subTextOffsetY = subText
        ? parseFloat(subText.getAttribute('y')) - (parseFloat(rect.getAttribute('y')) + height / 2)
        : 0;
      const stickerSize = Math.max(...stickerBounds.map(bounds => Math.max(bounds.width, bounds.height)), 16);
      const offsets = [5, 10, 16, 24, 34, 46, 60, 76, 96, 118];
      const directions = [
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
        { x: 1, y: -1 },
        { x: -1, y: -1 }
      ];
      let best = null;

      for (const offset of offsets) {
        for (const direction of directions) {
          const distanceX = direction.x === 0 ? 0 : stickerSize / 2 + width / 2 + offset;
          const distanceY = direction.y === 0 ? 0 : stickerSize / 2 + height / 2 + offset;
          const candidate = shiftIntoSvg(createBounds(
            anchorX + direction.x * distanceX,
            anchorY + direction.y * distanceY,
            width,
            height
          ));
          const stickerPenalty = stickerBounds.reduce(
            (sum, bounds) => sum + (overlap(candidate, bounds, 1) ? overlapArea(candidate, bounds) + 10000 : 0),
            0
          );
          const labelPenalty = placedLabelBounds.reduce(
            (sum, bounds) => sum + (overlap(candidate, bounds, 2) ? overlapArea(candidate, bounds) + 5000 : 0),
            0
          );
          const score = stickerPenalty + labelPenalty;

          if (!best || score < best.score) {
            best = { bounds: candidate, score };
          }
          if (stickerPenalty === 0 && labelPenalty === 0) {
            best = { bounds: candidate, score };
            break;
          }
        }
        if (best && best.score === 0) break;
      }

      const nextBounds = best.bounds;
      rect.setAttribute('x', nextBounds.left);
      rect.setAttribute('y', nextBounds.top);
      const labelCenterX = nextBounds.left + width / 2;
      const labelCenterY = nextBounds.top + height / 2;
      text.setAttribute('x', labelCenterX);
      text.setAttribute('y', nextBounds.top + height / 2 + textOffsetY);
      if (subText) {
        subText.setAttribute('x', labelCenterX);
        subText.setAttribute('y', nextBounds.top + height / 2 + subTextOffsetY);
      }
      if (rotationAngle) {
        rect.setAttribute('transform', `rotate(${-rotationAngle} ${labelCenterX} ${labelCenterY})`);
        text.setAttribute('transform', `rotate(${-rotationAngle} ${labelCenterX} ${labelCenterY})`);
        if (subText) {
          subText.setAttribute('transform', `rotate(${-rotationAngle} ${labelCenterX} ${labelCenterY})`);
        }
      } else {
        rect.removeAttribute('transform');
        text.removeAttribute('transform');
        if (subText) {
          subText.removeAttribute('transform');
        }
      }
      Array.from(svg.querySelectorAll('.label-leader-line')).forEach(line => {
        if (line.getAttribute('data-label-key') === labelKey) {
          line.setAttribute('x1', labelCenterX);
          line.setAttribute('y1', labelCenterY);
        }
      });
      placedLabelBounds.push(nextBounds);
    });
  }

  async function downloadDashboardScreenshot(btnElement) {
    if (!currentPerformer) return;

    if (typeof window.html2canvas !== 'function') {
      alert('截圖工具尚未載入完成，請稍後再試一次。');
      return;
    }

    const originalHtml = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 截圖中...`;

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      drawLocalGridPath();
      await new Promise(resolve => requestAnimationFrame(resolve));

      const fields = getPerformerFields(currentPerformer);
      const stickerDataUrls = await buildStickerDataUrlMap(fields.category);
      const target = document.querySelector('.dashboard-body') || appDashboard;
      const canvas = await window.html2canvas(target, {
        backgroundColor: '#0b0f19',
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: target.scrollWidth,
        height: target.scrollHeight,
        windowWidth: Math.max(document.documentElement.clientWidth, target.scrollWidth),
        windowHeight: Math.max(document.documentElement.clientHeight, target.scrollHeight),
        onclone: (clonedDocument) => {
          const clonedButton = clonedDocument.getElementById('screenshotPageBtn');
          if (clonedButton) {
            clonedButton.disabled = false;
            clonedButton.innerHTML = originalHtml;
          }

          clonedDocument.querySelectorAll('#localGridSvg image.svg-sticker-image').forEach((svgImg) => {
            const href = svgImg.getAttribute('href') || svgImg.getAttribute('xlink:href') || svgImg.href?.baseVal || '';
            const dataUrl = stickerDataUrls[href];
            if (dataUrl) {
              svgImg.setAttribute('href', dataUrl);
              svgImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl);
            }
          });
        }
      });

      const filename = [
        sanitizeFilenamePart(currentDisplayName || fields.coordinate),
        sanitizeFilenamePart(fields.coordinate),
        '地圖與對照表截圖.png'
      ].join('_');

      await saveCanvasAsPng(canvas, filename);
      btnElement.innerHTML = `<i class="fa-solid fa-check"></i> 已截圖`;
    } catch (err) {
      console.error(err);
      alert(`網頁截圖失敗：${err.message || err}`);
      btnElement.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> 出錯`;
    }

    setTimeout(() => {
      btnElement.disabled = false;
      btnElement.innerHTML = originalHtml;
    }, 2000);
  }

  // ==========================================================================
  // Admin Backend API Handlers
  // ==========================================================================

  function handleAdminLogin() {
    const password = adminPasswordInput.value;
    adminMessage.style.display = 'none';
    
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        sessionStorage.setItem('admin_pwd', password);
        adminAuthScreen.style.display = 'none';
        adminMainContent.style.display = 'block';
        setupAdminDashboardHandlers(password);
      } else {
        showAdminMsg('密碼錯誤！請重新輸入。', 'error');
      }
    })
    .catch(err => {
      showAdminMsg('連線到後台伺服器失敗，請確認伺服器正在運行。', 'error');
    });
  }

  function showAdminMsg(text, type) {
    adminMessage.textContent = text;
    adminMessage.className = `admin-msg-box ${type}`;
    adminMessage.style.display = 'block';
  }

  // Initialize admin action forms
  function setupAdminDashboardHandlers(password) {
    const adminTabsBtns = document.querySelectorAll('.admin-tab-btn');
    const adminTabPanels = document.querySelectorAll('.admin-tab-panel');

    adminTabsBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        adminTabsBtns.forEach(b => b.classList.remove('active'));
        adminTabPanels.forEach(p => p.style.display = 'none');
        
        btn.classList.add('active');
        const activePanel = document.getElementById(`adminPanel-${btn.dataset.adminTab}`);
        if (activePanel) activePanel.style.display = 'block';
      });
    });

    // Query elements
    const queryDayPerformerBtn = document.getElementById('queryDayPerformerBtn');
    const queryPerformerBtn = document.getElementById('queryPerformerBtn');

    queryDayPerformerBtn.addEventListener('click', () => {
      const sess = document.getElementById('adminDaySession').value;
      const team = document.getElementById('adminDayTeam').value;
      const id = document.getElementById('adminDayId').value.trim();
      
      if (!id) return alert('請輸入身分證編號');
      
      // Load current names
      fetch('/api/admin/get-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const list = data.dayperformers || [];
          const match = list.find(p => p.id === id && p.team === team && p.date === sess);
          const oldNameInput = document.getElementById('adminDayOldName');
          if (match) {
            oldNameInput.value = match.name;
            document.getElementById('adminDayName').value = match.name;
          } else {
            oldNameInput.value = '尚未登記';
            document.getElementById('adminDayName').value = '';
          }
        }
      });
    });

    queryPerformerBtn.addEventListener('click', () => {
      const id = document.getElementById('adminId').value.trim();
      const team = document.getElementById('adminTeam').value;
      if (!id) return alert('請輸入身分證編號');

      fetch('/api/admin/get-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const list = data.performers || [];
          const match = list.find(p => p.id === id && p.team === team);
          if (match) {
            // Fill coordinate inputs
            document.getElementById('adminCircle').value = match.circle || '';
            document.getElementById('adminXingYuan').value = match.xingYuan || '';
            document.getElementById('adminMiLuo').value = match.miLuo || id;
            document.getElementById('adminJingSi').value = match.jingSi || '';
            document.getElementById('adminLamp').value = match.lamp || '';
            document.getElementById('adminNoBoat').value = match.noBoat || '';
            document.getElementById('adminBigV').value = match.bigV || '';
            document.getElementById('adminDaChuanShi').value = match.daChuanShi || '';
            document.getElementById('adminBoneDonation').value = match.boneDonation || '';
            document.getElementById('adminEdu').value = match.edu || '';
            document.getElementById('adminHumanities2').value = match.humanities2 || '';
            document.getElementById('adminFiveContinents1').value = match.fiveContinents1 || '';
            document.getElementById('adminFiveContinents2').value = match.fiveContinents2 || '';
            document.getElementById('adminFlyingApsaras').value = match.flyingApsaras || '';
            showAdminMsg('已成功載入該表演者現有座標！', 'success');
          } else {
            showAdminMsg('查無此表演者，儲存時將建立新資料。', 'error');
          }
        }
      });
    });

    // Form submit handlers
    const dayperformerForm = document.getElementById('dayperformerForm');
    dayperformerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const session = document.getElementById('adminDaySession').value;
      const team = document.getElementById('adminDayTeam').value;
      const id = document.getElementById('adminDayId').value.trim();
      const name = document.getElementById('adminDayName').value.trim();

      fetch('/api/update-dayperformer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, id, name, team, password })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showAdminMsg('姓名修改成功！可關閉視窗並重新整理套用變更。', 'success');
          adminFinishBtn.style.display = 'block';
        } else {
          showAdminMsg('儲存失敗：' + (data.error || '未知錯誤'), 'error');
        }
      });
    });

    const performerForm = document.getElementById('performerForm');
    performerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('adminId').value.trim();
      const team = document.getElementById('adminTeam').value;
      const circle = document.getElementById('adminCircle').value.trim();
      const xingYuan = document.getElementById('adminXingYuan').value.trim();
      const miLuo = document.getElementById('adminMiLuo').value.trim();
      const jingSi = document.getElementById('adminJingSi').value.trim();
      const lamp = document.getElementById('adminLamp').value.trim();
      const noBoat = document.getElementById('adminNoBoat').value.trim();
      const bigV = document.getElementById('adminBigV').value.trim();
      const daChuanShi = document.getElementById('adminDaChuanShi').value.trim();
      const boneDonation = document.getElementById('adminBoneDonation').value.trim();
      const edu = document.getElementById('adminEdu').value.trim();
      const humanities2 = document.getElementById('adminHumanities2').value.trim();
      const fiveContinents1 = document.getElementById('adminFiveContinents1').value.trim();
      const fiveContinents2 = document.getElementById('adminFiveContinents2').value.trim();
      const flyingApsaras = document.getElementById('adminFlyingApsaras').value.trim();

      fetch('/api/update-performer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, circle, xingYuan, miLuo, jingSi, lamp, noBoat, bigV, daChuanShi,
          boneDonation, edu, humanities2, fiveContinents1, fiveContinents2,
          flyingApsaras, team, password
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showAdminMsg('座標修改成功！可關閉視窗並重新整理套用變更。', 'success');
          adminFinishBtn.style.display = 'block';
        } else {
          showAdminMsg('儲存失敗：' + (data.error || '未知錯誤'), 'error');
        }
      });
    });

    adminFinishBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

})();
