/* ==========================================================================
   Dome Position Navigator - App Logic
   ========================================================================== */

(function () {
  'use strict';

  // Complete 17-point formation sequence, aligned with the reference website.
  const keyFormations = [
    { key: 'basic', name: '起點 (基本隊形)', label: '起點' },
    { key: 'circle', name: '01圓形', label: '01圓形' },
    { key: 'xingYuan', name: '02行願', label: '02行願' },
    { key: 'miLuo', name: '03米籮', label: '03米籮' },
    { key: 'jingSi', name: '04靜思家風', label: '04靜思' },
    { key: 'lamp', name: '05-1有法船（點一盞燈）', label: '05-1有法船' },
    { key: 'noBoat', name: '05-2無法船（菜市場5毛錢）', label: '05-2無法船' },
    { key: 'noBoat3', name: '05-3無法船（是諸眾生）', label: '05-3無法船' },
    { key: 'bigV', name: '06四弘誓願', label: '06四弘誓願' },
    { key: 'daChuanShi', name: '07-1大船師', label: '07-1大船師' },
    { key: 'boneDonation', name: '07-2骨捐能捨', label: '07-2骨捐' },
    { key: 'edu', name: '08教育', label: '08教育' },
    { key: 'humanities1', name: '09-1人文（基本隊形）', label: '09-1人文' },
    { key: 'humanities2', name: '09-2人文（主機板）', label: '09-2人文' },
    { key: 'fiveContinents1', name: '10-1五大洲', label: '10-1五大洲' },
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
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');

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
    if (key === 'miLuo' || key === 'humanities1') {
      return 'basic';
    }
    if (key === 'boneDonation') {
      return 'bigV';
    }
    if (key === 'edu') {
      return 'eduWaterSlash';
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

    // Download PDF listener (Show Range Selection Modal)
    const pdfDownloadModal = document.getElementById('pdfDownloadModal');
    const downloadAllPdfBtn = document.getElementById('downloadAllPdfBtn');
    const downloadCurrentPdfBtn = document.getElementById('downloadCurrentPdfBtn');
    const closePdfModalBtn = document.getElementById('closePdfModalBtn');

    downloadPdfBtn.addEventListener('click', () => {
      pdfDownloadModal.style.display = 'flex';
    });

    closePdfModalBtn.addEventListener('click', () => {
      pdfDownloadModal.style.display = 'none';
    });

    pdfDownloadModal.addEventListener('click', (e) => {
      if (e.target === pdfDownloadModal) {
        pdfDownloadModal.style.display = 'none';
      }
    });

    downloadAllPdfBtn.addEventListener('click', () => {
      pdfDownloadModal.style.display = 'none';
      downloadPerformerTablePdf(downloadPdfBtn, 'all');
    });

    downloadCurrentPdfBtn.addEventListener('click', () => {
      pdfDownloadModal.style.display = 'none';
      downloadPerformerTablePdf(downloadPdfBtn, 'current');
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
        <div class="col-num">${idx + 1}</div>
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

      if (idx < 12) {
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

    wmkGroup.innerHTML = '';
    linesGroup.innerHTML = '';
    pathSegmentsGroup.innerHTML = '';
    pathPointsGroup.innerHTML = '';

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
      drawFloatingLabel('舞台中線', centerLineX, 38 - 14);
      drawFloatingLabel('舞台中線', centerLineX, 38 + 14);
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

    // 2. Draw Grid Lines and Coordinates labels
    const drawGuides = showAlignmentGuides.checked;
    for (let i = -MAX_GRID_COORD; i <= MAX_GRID_COORD; i += labelStep) {
      const isCenter = (i === 0);
      const ptZero = gridToSvg(i, i);

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

        // X coordinate labels (along bottom)
        const textX = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textX.setAttribute('x', GRID_CENTER_X + i * GRID_SPACING);
        textX.setAttribute('y', GRID_CENTER_Y + MAX_GRID_COORD * GRID_SPACING - 4);
        textX.setAttribute('text-anchor', 'middle');
        textX.textContent = Math.abs(roundedX);
        linesGroup.appendChild(textX);

        // Y coordinate labels (along left)
        const textY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textY.setAttribute('x', GRID_CENTER_X - MAX_GRID_COORD * GRID_SPACING + 4);
        textY.setAttribute('y', GRID_CENTER_Y + i * GRID_SPACING + 2);
        textY.setAttribute('text-anchor', 'start');
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
        // Orthogonal L-shaped route: Horizontal first, then Vertical (X-then-Y)
        const cornerX = end.pos.x;
        const cornerY = start.pos.y;
        
        let endX = end.pos.x;
        let endY = end.pos.y;
        
        // Shorten the final segment slightly to avoid overlapping the node sticker
        if (isPathActive) {
          if (start.pos.y === end.pos.y) {
            // Purely horizontal
            endX = start.pos.x + 0.9 * (end.pos.x - start.pos.x);
          } else {
            // L-shape or purely vertical (ends with vertical segment)
            endY = cornerY + 0.9 * (end.pos.y - cornerY);
          }
        }

        const pathD = `M ${start.pos.x} ${start.pos.y} L ${cornerX} ${cornerY} L ${endX} ${endY}`;
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

    // 5. Draw Performer Nodes (Sticker Icons)
    pointsToDraw.forEach(pt => {
      // Render node only if current, prev, or full trajectory is on
      const isVisible = showFull || pt.index === 0 || pt.index === fIdx || pt.index === fIdx - 1;
      if (!isVisible) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      let gClass = `path-point pt-${pt.key} role-${pt.role}`;
      if (pt.index === fIdx) gClass += ' active-formation';
      g.setAttribute('class', gClass);
      g.setAttribute('id', `local-point-${pt.key}`);

      const size = Math.max(12, Math.min(32, GRID_SPACING * 1.8));

      // Draw the sticker PNG image
      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      const displayType = getDisplayType(pt.key);
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `images/stickers/${displayType}_${getEnglishCategory(category)}.png`);
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

      // Draw coordinate label under the node
      if (pt.coord && pt.coord.text) {
        const labelText = `${pt.index + 1}. ${pt.coord.text}`;
        const bgWidth = (labelText.length * 5.2 + 6) * 0.625;
        const bgHeight = 6.875;
        const labelY = pt.pos.y + size / 2 + 6.5;

        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('x', pt.pos.x - bgWidth / 2);
        labelBg.setAttribute('y', labelY - bgHeight / 2);
        labelBg.setAttribute('width', bgWidth);
        labelBg.setAttribute('height', bgHeight);
        labelBg.setAttribute('class', pt.role === 'current' ? 'path-label-bg bg-current' : 'path-label-bg');
        g.appendChild(labelBg);

        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('x', pt.pos.x);
        textEl.setAttribute('y', labelY + 1.6);
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('class', pt.role === 'current' ? 'path-label-text text-current' : 'path-label-text');
        textEl.setAttribute('style', `font-size: 5px; font-weight: bold;`);
        textEl.textContent = labelText;
        g.appendChild(textEl);
      }

      pathPointsGroup.appendChild(g);
    });

    // 6. Draw the live performer avatar dot at its current position.
    if (isMainSvg) {
      const activePt = pointsToDraw[fIdx];
      if (activePt) {
        const avatar = createLiveAvatarElement();
        if (avatar) {
          avatar.setAttribute('transform', `translate(${activePt.pos.x}, ${activePt.pos.y})`);
        }
      }
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

    document.querySelectorAll('.path-label-bg, .path-label-text').forEach(el => {
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

  // Handle touch/mouse dragging of SVG grid
  let isPointerDown = false;
  localGridSvg.addEventListener('mousedown', pointerDown);
  localGridSvg.addEventListener('mousemove', pointerMove);
  document.addEventListener('mouseup', pointerUp);

  localGridSvg.addEventListener('touchstart', touchStart, { passive: false });
  localGridSvg.addEventListener('touchmove', touchMove, { passive: false });
  document.addEventListener('touchend', pointerUp);

  function pointerDown(e) {
    isPointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
  }

  function pointerMove(e) {
    if (!isPointerDown) return;
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
  }

  function touchStart(e) {
    if (e.touches.length === 1) {
      isPointerDown = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  }

  function touchMove(e) {
    if (!isPointerDown || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    panX -= dx * zoomLevel * 0.8;
    panY -= dy * zoomLevel * 0.8;
    updateSvgViewBox();
  }

  // ==========================================================================
  // PDF Generation and Download Feature
  // ==========================================================================

  // Wrap canvas lines safely
  function wrapCanvasText(ctx, text, maxWidth) {
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
      let testLine = currentLine + words[n];
      let metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(currentLine);
        currentLine = words[n];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  // Convert SVG clone to Canvas to embed PNG
  async function convertSvgToPngDataUrl(svgElement, scale = 2.0) {
    return new Promise((resolve, reject) => {
      try {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const factor = scale || 2.0;
          canvas.width = 360 * factor;
          canvas.height = 360 * factor;
          
          const context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          
          const pngDataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(blobURL);
          resolve(pngDataUrl);
        };
        image.onerror = (err) => {
          reject(err);
        };
        image.src = blobURL;
      } catch (err) {
        reject(err);
      }
    });
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Convert same-origin sticker files into embedded data before SVG/PDF export.
  async function loadImageAsDataUrl(src) {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Unable to load sticker: ${src}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function imageToDataUrl(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const context = canvas.getContext('2d');
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  function getRenderedSticker(src) {
    const absoluteSrc = new URL(src, window.location.href).href;
    return Array.from(document.images).find(img =>
      img.complete && img.naturalWidth > 0 && (img.currentSrc === absoluteSrc || img.src === absoluteSrc)
    ) || null;
  }

  // Create clean blank canvas page template
  function createPageCanvas(titleText, metadataText) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; // high-resolution template
    canvas.height = 1700;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 1700);
    
    // Draw header border & backgrounds
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(40, 40, 1120, 8);
    
    // Title
    ctx.fillStyle = '#0f172a';
    ctx.font = "bold 28px 'Noto Sans TC', sans-serif";
    ctx.fillText(titleText, 40, 80);
    
    // Metadata text
    ctx.fillStyle = '#475569';
    ctx.font = "bold 15px 'Noto Sans TC', sans-serif";
    ctx.fillText(metadataText, 40, 115);
    
    // Table Header Row background
    const headerY = 135;
    const headerH = 45;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(40, headerY, 1120, headerH);
    
    // Horizontal lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, headerY);
    ctx.lineTo(1160, headerY);
    ctx.moveTo(40, headerY + headerH);
    ctx.lineTo(1160, headerY + headerH);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#0f172a';
    ctx.font = "bold 16px 'Noto Sans TC', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('跑位定點', 120, headerY + headerH / 2 + 5);
    ctx.fillText('專屬地標', 270, headerY + headerH / 2 + 5);
    ctx.fillText('演繹內容與說明', 650, headerY + headerH / 2 + 5);
    ctx.fillText('網格定位軌跡', 1060, headerY + headerH / 2 + 5);
    
    return { canvas, ctx, currentY: 180 };
  }

  function drawTableGridLines(ctx, endY) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, endY);
    ctx.lineTo(1160, endY);
    ctx.stroke();
    
    // Outline box
    ctx.strokeRect(40, 135, 1120, endY - 135);
    
    // Vertical columns lines
    const cols = [40, 200, 340, 960, 1160];
    ctx.beginPath();
    for (let i = 1; i < cols.length - 1; i++) {
      ctx.moveTo(cols[i], 135);
      ctx.lineTo(cols[i], endY);
    }
    ctx.stroke();
  }

  function drawTextCell(ctx, items, x, y, width, isPreflight, preloadedImages) {
    let currY = y + 15;
    
    items.forEach((item, itemIdx) => {
      // Draw detail title
      ctx.save();
      ctx.font = "bold 14px 'Noto Sans TC', sans-serif";
      ctx.fillStyle = '#0d9488'; // Teal
      ctx.textAlign = 'left';
      const titleLines = wrapCanvasText(ctx, item.title, width);
      titleLines.forEach(line => {
        if (!isPreflight) {
          ctx.fillText(line, x, currY);
        }
        currY += 18;
      });
      ctx.restore();
      currY += 4;
      
      // Draw sub items (lyrics & text descriptions)
      ctx.save();
      ctx.font = "500 13px 'Noto Sans TC', sans-serif";
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left';
      
      item.details.forEach(detail => {
        if (detail.type === 'text') {
          const content = detail.content.startsWith('http') ? '🎬 線上教學影片連結' : detail.content;
          const lines = wrapCanvasText(ctx, content, width);
          lines.forEach(line => {
            if (!isPreflight) {
              ctx.fillText(line, x, currY);
            }
            currY += 17;
          });
          currY += 4;
        } else if (detail.type === 'image') {
          const img = preloadedImages[detail.src];
          if (img) {
            const maxImgW = 280;
            let imgW = img.width;
            let imgH = img.height;
            if (imgW > maxImgW) {
              imgH = (maxImgW / imgW) * imgH;
              imgW = maxImgW;
            }
            if (!isPreflight) {
              const imgX = x + (width - imgW) / 2;
              ctx.drawImage(img, imgX, currY, imgW, imgH);
            }
            currY += imgH + 10;
          }
        }
      });
      ctx.restore();
      
      if (itemIdx < items.length - 1) {
        currY += 8;
      }
    });
    
    return currY - y + 15;
  }

  // Create the one-page, foldable route sheet used by the full-download option.
  function createPocketRouteCanvas(fields, routeImage, stickerImages) {
    const canvas = document.createElement('canvas');
    canvas.width = 1680;
    canvas.height = 1180;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#eef2f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, 154);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, 146, canvas.width, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 38px 'Noto Sans TC', sans-serif";
    ctx.fillText('個人跑位隨身定位表', 64, 72);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = "18px 'Noto Sans TC', sans-serif";
    ctx.fillText(`定位座標 ${fields.coordinate}  ·  ${fields.category}  ·  ${selectedTeam === 'east' ? '東班' : '西班'}`, 66, 112);

    // Left: stage and full route map.
    const mapX = 50;
    const mapY = 190;
    const mapW = 860;
    const mapH = 930;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = '#dbe4ee';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapW, mapH);
    ctx.fillStyle = '#0f766e';
    ctx.fillRect(mapX, mapY, 8, mapH);
    ctx.fillStyle = '#0f172a';
    ctx.font = "bold 22px 'Noto Sans TC', sans-serif";
    ctx.fillText('完整走位路線', mapX + 32, mapY + 42);
    ctx.fillStyle = '#64748b';
    ctx.font = "16px 'Noto Sans TC', sans-serif";
    ctx.fillText('依序連接 17 個地標定點', mapX + 32, mapY + 70);
    if (routeImage) {
      const scale = Math.min(790 / routeImage.width, 810 / routeImage.height);
      const width = routeImage.width * scale;
      const height = routeImage.height * scale;
      ctx.drawImage(routeImage, mapX + 35 + (790 - width) / 2, mapY + 98 + (810 - height) / 2, width, height);
    }

    // Right: two balanced, stage-based landmark columns.
    const listX = 950;
    const columnW = 330;
    const drawSection = (title, formations, startX, accent) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(startX, mapY, columnW, mapH);
      ctx.strokeStyle = '#dbe4ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, mapY, columnW, mapH);
      ctx.fillStyle = accent;
      ctx.fillRect(startX, mapY, columnW, 52);
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 20px 'Noto Sans TC', sans-serif";
      ctx.fillText(title, startX + 18, mapY + 33);

      const isCompact = formations.length > 9;
      const yStep = isCompact ? 69 : 90;
      const stickerSize = isCompact ? 48 : 60;
      let y = mapY + (isCompact ? 68 : 82);

      formations.forEach((formation) => {
        const index = keyFormations.indexOf(formation) + 1;
        const sticker = stickerImages[formation.key];
        const coord = getFormationCoordStr(currentPerformer, formation.key) || '未提供';

        if (sticker) {
          ctx.drawImage(sticker, startX + 16, y - (isCompact ? 16 : 22), stickerSize, stickerSize);
        }

        ctx.fillStyle = '#0f172a';
        ctx.font = isCompact ? "bold 14px 'Noto Sans TC', sans-serif" : "bold 15px 'Noto Sans TC', sans-serif";
        const nameLines = wrapCanvasText(ctx, `${String(index).padStart(2, '0')}  ${formation.name}`, 225).slice(0, 2);
        nameLines.forEach((line, lineIndex) => ctx.fillText(line, startX + (isCompact ? 76 : 92), y + lineIndex * (isCompact ? 15 : 17)));

        ctx.fillStyle = '#475569';
        ctx.font = isCompact ? "13px 'Outfit', 'Noto Sans TC', sans-serif" : "14px 'Outfit', 'Noto Sans TC', sans-serif";
        ctx.fillText(coord, startX + (isCompact ? 76 : 92), y + (isCompact ? 32 : 43));

        const video = getYoutubeLinkForKey(formation.key);
        if (video) {
          ctx.fillStyle = video === formationReferenceVideos[formation.key] ? '#0369a1' : '#b91c1c';
          ctx.font = "bold 11px 'Noto Sans TC', sans-serif";
          ctx.fillText(video === formationReferenceVideos[formation.key] ? '參考影片' : 'YouTube', startX + 236, y + (isCompact ? 32 : 43));
        }

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX + 16, y + (isCompact ? 48 : 72));
        ctx.lineTo(startX + columnW - 16, y + (isCompact ? 48 : 72));
        ctx.stroke();

        y += yStep;
      });
    };

    drawSection('第一部分 (第一階段)', keyFormations.slice(0, 12), listX, '#0f766e');
    drawSection('第二部分 (第二階段)', keyFormations.slice(12), listX + columnW + 24, '#7c3aed');
    return canvas;
  }

  // Pre-render SVG grids in a hidden div to load them asynchronously
  async function downloadPerformerTablePdf(btnElement, mode = 'all') {
    if (!currentPerformer) return;
    
    btnElement.disabled = true;
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 產出中...`;
    
    try {
      const fields = getPerformerFields(currentPerformer);

      // Determine which formations to export based on mode
      let targetFormations;
      let titleText;
      if (mode === 'current') {
        const curF = keyFormations[activeFormationIdx];
        targetFormations = curF ? [curF] : keyFormations;
        titleText = `大巨蛋演繹個人跑位定位表 — 第 ${activeFormationIdx + 1} 景：${curF ? curF.label : ''}`;
      } else {
        targetFormations = keyFormations;
        titleText = '大巨蛋演繹個人跑位定位表 (17個跑位定點)';
      }

      const metadataText = `定位：${currentDisplayName}      身分：${fields.category}      起點座標：${fields.coordinate}      班別：${selectedTeam === 'east' ? '東班' : '西班'}`;
      
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      // 1. Preload sticker PNG images and convert to Base64 data URLs to bypass SVG serialization security blocks
      const stickerImages = {};
      const stickerBase64 = {};
      for (const f of targetFormations) {
        const displayType = getDisplayType(f.key);
        const src = `images/stickers/${displayType}_${getEnglishCategory(fields.category)}.png`;
        if (!stickerImages[f.key]) {
          const renderedSticker = getRenderedSticker(src);
          let dataUrl = '';
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
          const img = dataUrl ? await loadImage(dataUrl) : null;
          if (img) {
            stickerImages[f.key] = img;
            stickerBase64[src] = dataUrl;
            stickerBase64[new URL(src, window.location.href).href] = dataUrl;
          }
        }
      }

      // 2. Render SVG previews to canvas PNGs asynchronously (inlining stickers to prevent browser sandbox errors)
      const gridImages = [];
      const hiddenRenderDiv = document.getElementById('modalBody');
      hiddenRenderDiv.innerHTML = '';

      // The full download is a compact, one-page route sheet rather than the detailed multi-page report.
      if (mode === 'all') {
        const routeSvg = localGridSvg.cloneNode(true);
        routeSvg.setAttribute('viewBox', '0 0 360 360');
        routeSvg.removeAttribute('id');
        routeSvg.setAttribute('style', 'pointer-events: none;');
        hiddenRenderDiv.appendChild(routeSvg);

        const originalShowFullTrajectory = showFullTrajectory.checked;
        showFullTrajectory.checked = true;
        drawLocalGridPath(routeSvg, keyFormations.length - 1);
        showFullTrajectory.checked = originalShowFullTrajectory;

        routeSvg.querySelectorAll('image').forEach(svgImg => {
          const href = svgImg.getAttribute('href') || svgImg.getAttribute('xlink:href') || svgImg.href?.baseVal || '';
          if (href && !href.startsWith('data:') && stickerBase64[href]) {
            svgImg.setAttribute('href', stickerBase64[href]);
            svgImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', stickerBase64[href]);
          }
        });

        const routePng = await convertSvgToPngDataUrl(routeSvg, 2.5);
        const routeImage = await loadImage(routePng);
        const routeCanvas = createPocketRouteCanvas(fields, routeImage, stickerImages);
        const routePdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        routePdf.addImage(routeCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 842, 595);
        routePdf.save(`${fields.coordinate}_個人跑位隨身定位表.pdf`);
        btnElement.innerHTML = `<i class="fa-solid fa-check"></i> 已下載`;
        return;
      }

      for (let idx = 0; idx < targetFormations.length; idx++) {
        const realIdx = keyFormations.indexOf(targetFormations[idx]);
        // Clone main SVG structure to draw preview
        const previewSvg = localGridSvg.cloneNode(true);
        previewSvg.setAttribute('viewBox', '0 0 360 360');
        previewSvg.removeAttribute('id');
        previewSvg.setAttribute('style', 'pointer-events: none;');
        previewSvg.querySelector('.grid-lines').innerHTML = '';
        previewSvg.querySelector('.stage-watermark').innerHTML = '';
        previewSvg.querySelector('#localPathSegments').innerHTML = '';
        previewSvg.querySelector('#localPathPoints').innerHTML = '';
        
        hiddenRenderDiv.appendChild(previewSvg);
        drawLocalGridPath(previewSvg, realIdx);

        // Replace relative sticker image links with self-contained Base64 data URLs
        const svgImages = previewSvg.querySelectorAll('image');
        svgImages.forEach(svgImg => {
          const href = svgImg.getAttribute('href') || svgImg.getAttribute('xlink:href') || svgImg.href?.baseVal || '';
          if (href && !href.startsWith('data:')) {
            const base64 = stickerBase64[href];
            if (base64) {
              svgImg.setAttribute('href', base64);
              svgImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', base64);
            }
          }
        });

        const pngDataUrl = await convertSvgToPngDataUrl(previewSvg, 2.0);
        const img = await loadImage(pngDataUrl);
        gridImages.push(img);
      }
      
      // 3. Preload action details images (redirecting to remote hosted pages to resolve local missing files)
      const hintImages = {};
      for (const f of targetFormations) {
        const hints = getFormationHints(f.key);
        for (const h of hints) {
          if (h.details) {
            for (const d of h.details) {
              if (d.type === 'image' && !hintImages[d.src]) {
                const redirectedSrc = d.src.replace('images/action_hints/', 'https://jyhornglin-glitch.github.io/Dome_Position/images/action_hints/');
                const img = await loadImage(redirectedSrc);
                hintImages[d.src] = img;
              }
            }
          }
        }
      }
      
      // Canvas pages list
      const pdfPages = [];
      let page = createPageCanvas(titleText, metadataText);
      pdfPages.push(page);
      
      // Render row items sequentially
      for (let idx = 0; idx < targetFormations.length; idx++) {
        const f = targetFormations[idx];
        const realIdx = keyFormations.indexOf(f);
        const coord = getFormationCoordStr(currentPerformer, f.key) || '無';
        
        // Load details text
        const items = [];

        // 1. Calculate and add movement instruction first
        let moveInstructions = '';
        if (realIdx === 0) {
          moveInstructions = '此處為起點站位。';
        } else {
          const prevF = keyFormations[realIdx - 1];
          const prevCoordStr = prevF ? getFormationCoordStr(currentPerformer, prevF.key) : '';
          const prevCoord = parseCoordinate(prevCoordStr);
          const currentCoord = parseCoordinate(coord);
          
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
              moveInstructions = `與前一景「${prevF.name}」座標相同，原地不動。`;
            } else {
              moveInstructions = `從「${prevF.name}」出發，${parts.join('，')}。`;
            }
          } else {
            moveInstructions = '座標無資料，請依現場標線為準。';
          }
        }

        items.push({
          title: '走位指示',
          details: [{ type: 'text', content: moveInstructions }]
        });

        // 2. Add lyrics
        const lyrics = (typeof chantLyrics !== 'undefined') ? chantLyrics[f.key] : [];
        if (lyrics && lyrics.length > 0) {
          items.push({
            title: '唱誦段落',
            details: lyrics.map(l => ({ type: 'text', content: l }))
          });
        }

        // 3. Add action hints
        const hints = getFormationHints(f.key);
        if (hints && hints.length > 0) {
          hints.forEach(h => {
            items.push({
              title: h.title,
              details: h.details || []
            });
          });
        }

        // 4. Include the YouTube entry in exported positioning sheets as well.
        const videoUrl = getYoutubeLinkForKey(f.key);
        if (videoUrl) {
          const isReferenceVideo = videoUrl === formationReferenceVideos[f.key];
          items.push({
            title: isReferenceVideo ? 'YouTube 參考影片' : 'YouTube 教學影片',
            details: [{ type: 'text', content: videoUrl }]
          });
        }

        // Pre-calculate heights
        page.ctx.save();
        page.ctx.font = "500 13px 'Noto Sans TC', sans-serif";
        page.ctx.textBaseline = 'top';
        const textCellHeight = drawTextCell(page.ctx, items, 355, 0, 590, true, hintImages);
        page.ctx.restore();
        
        const rowH = Math.max(190, textCellHeight);
        
        // Create new page if overflows A4 printable area height
        if (page.currentY + rowH > 1600) {
          drawTableGridLines(page.ctx, page.currentY);
          page = createPageCanvas(titleText, metadataText);
          pdfPages.push(page);
        }
        
        const rowY = page.currentY;
        
        // 1. Column 0 (跑位定點)
        page.ctx.save();
        page.ctx.font = "bold 14px 'Noto Sans TC', sans-serif";
        page.ctx.fillStyle = '#0f172a';
        page.ctx.textAlign = 'center';
        page.ctx.fillText(`${realIdx + 1}.${f.label}`, 120, rowY + rowH / 2 + 4);
        page.ctx.restore();
        
        // 2. Column 1 (地標貼紙)
        page.ctx.save();
        const stickerImg = stickerImages[f.key];
        const stickerSize = 60;
        const col1CenterX = 270;
        const startY = rowY + (rowH - stickerSize - 20) / 2;
        
        if (stickerImg) {
          page.ctx.drawImage(stickerImg, col1CenterX - stickerSize / 2, startY, stickerSize, stickerSize);
          
          // Draw coordinate center overlay badge on basic index
          if (f.key === 'basic') {
            page.ctx.save();
            const isCatA = fields.category.startsWith('A');
            const overlayColor = isCatA ? '#e65537' : '#7dbf32';
            
            page.ctx.beginPath();
            page.ctx.arc(col1CenterX, startY + stickerSize / 2, 22, 0, 2 * Math.PI);
            page.ctx.fillStyle = overlayColor;
            page.ctx.fill();
            
            const parts = fields.coordinate.split('-');
            if (parts.length === 2) {
              const top = parts[0].padStart(2, '0');
              const bottom = parts[1].padStart(2, '0');
              page.ctx.fillStyle = '#ffffff';
              page.ctx.font = "bold 12px sans-serif";
              page.ctx.textAlign = 'center';
              
              page.ctx.fillText(top, col1CenterX, startY + stickerSize / 2 - 2);
              
              page.ctx.strokeStyle = '#ffffff';
              page.ctx.lineWidth = 1;
              page.ctx.beginPath();
              page.ctx.moveTo(col1CenterX - 12, startY + stickerSize / 2 + 1);
              page.ctx.lineTo(col1CenterX + 12, startY + stickerSize / 2 + 1);
              page.ctx.stroke();
              
              page.ctx.fillText(bottom, col1CenterX, startY + stickerSize / 2 + 12);
            }
            page.ctx.restore();
          }
        }
        
        page.ctx.fillStyle = '#475569';
        page.ctx.font = "bold 12px 'Outfit', sans-serif";
        page.ctx.textAlign = 'center';
        page.ctx.fillText(coord, col1CenterX, startY + stickerSize + 15);
        page.ctx.restore();
        
        // 3. Column 2 (演繹內容 text description)
        page.ctx.save();
        drawTextCell(page.ctx, items, 355, rowY, 590, false, hintImages);
        page.ctx.restore();
        
        // 4. Column 3 (網格地圖)
        const gridImg = gridImages[idx];
        if (gridImg) {
          const imgSize = 170;
          const imgX = 960 + (200 - imgSize) / 2;
          const imgY = rowY + (rowH - imgSize) / 2;
          page.ctx.drawImage(gridImg, imgX, imgY, imgSize, imgSize);
        }
        
        // Draw divider horizontal line
        page.ctx.strokeStyle = '#cbd5e1';
        page.ctx.lineWidth = 1.0;
        page.ctx.beginPath();
        page.ctx.moveTo(40, rowY + rowH);
        page.ctx.lineTo(1160, rowY + rowH);
        page.ctx.stroke();
        
        page.currentY += rowH;
      }
      
      // Close lines on last page
      drawTableGridLines(page.ctx, page.currentY);
      
      // Save canvas pages to PDF document
      for (let pIdx = 0; pIdx < pdfPages.length; pIdx++) {
        const p = pdfPages[pIdx];
        if (pIdx > 0) pdf.addPage();
        const pageImgData = p.canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(pageImgData, 'JPEG', 0, 0, 595, 842);
      }
      
      const suffix = mode === 'current' ? `_第${activeFormationIdx + 1}景_${keyFormations[activeFormationIdx]?.label || ''}` : '';
      const filename = `${currentDisplayName || fields.coordinate}_${fields.coordinate}_個人跑位定位表${suffix}.pdf`;
      pdf.save(filename);
      btnElement.innerHTML = `<i class="fa-solid fa-check"></i> 下載成功`;
    } catch (err) {
      console.error(err);
      alert("PDF 下載錯誤資訊: " + err.stack + "\n\n請截圖告知開發人員此錯誤資訊以供修復。");
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
