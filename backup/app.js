// Tzu Chi Stage Formation - Relative Position App Logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.disabled = true;
    searchInput.placeholder = "請先點選上方演出場次";
  }
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Force reload page by appending timestamp query parameter
      const url = new URL(window.location.href);
      url.searchParams.set('t', Date.now().toString());
      window.location.href = url.toString();
    });
  }
  const reSearchBtn = document.getElementById('reSearchBtn');
  if (reSearchBtn) {
    reSearchBtn.addEventListener('click', () => {
      const overlay = document.getElementById('sessionOverlay');
      if (overlay) {
        if (appContainer) {
          appContainer.style.display = 'none';
        }
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
        
        // Restore temp selected state to current active performer
        tempSelectedPerformer = currentPerformer;
        tempDayOverrideName = currentDisplayName;
        
        const confirmBtn = document.getElementById('sessionConfirmBtn');
        if (confirmBtn) {
          confirmBtn.disabled = !(tempSelectedPerformer && selectedTeam);
        }
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const autocompleteList = document.getElementById('autocompleteList');
  const categoryFilter = document.getElementById('categoryFilter');
  const teamFilter = document.getElementById('teamFilter');
  const stageInstruction = document.getElementById('stageInstruction');
  const mainContent = document.getElementById('mainContent');
  const emptyState = document.getElementById('emptyState');
  const appContainer = document.getElementById('appContainer');
  
  // Performer Summary Elements
  const perfAvatar = document.getElementById('perfAvatar');
  const perfName = document.getElementById('perfName');
  const perfCategory = document.getElementById('perfCategory');
  const perfID = document.getElementById('perfID');
  
  // SVG relative Map Elements
  const stageWatermark = document.getElementById('stageWatermark');
  const localGridLines = document.getElementById('localGridLines');
  const localPathSegments = document.getElementById('localPathSegments');
  const localPathPoints = document.getElementById('localPathPoints');
  
  // Mobile Navigation Tabs
  const mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');
  const mobileTabPanels = document.querySelectorAll('.mobile-tab-panel');
  
  // Action Hints Flow
  const actionHintsFlow = document.getElementById('actionHintsFlow');
  
  // Map Control Elements
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const activeFormNum = document.getElementById('activeFormNum');
  const activeFormTitle = document.getElementById('activeFormTitle');
  const activeFormCoord = document.getElementById('activeFormCoord');
  
  // State variables
  let currentPerformer = null;
  let currentDisplayName = ''; // Day-specific name (blank when session has no data)
  let currentDayNameMap = {}; // id -> name for the selected session
  let activeTab = 'localGrid'; // Default mobile tab is Grid view
  let activeFormationIdx = 0; // Current active formation index (0 to 5)
  let zoomLevel = 1.0;
  let panX = 0;
  let panY = 0;
  let rotationAngle = 0;
  let selectedSessionKey = null; // Currently selected day key (e.g. '1114')
  let selectedTeam = null; // Currently selected team: 'east' or 'west'
  let hintModalClosed = true;
  let hintZoomLevel = 1.0;
  let hintsExpanded = false;
  let tempSelectedPerformer = null; // 暫存選中的表演者
  let tempDayOverrideName = '';     // 暫存選中的當日姓名

  // Relative Grid coordinate configuration
  const GRID_CENTER_X = 180;
  const GRID_CENTER_Y = 180;
  let GRID_SPACING = 15; // 1 coord unit = 15 pixels
  let MAX_GRID_COORD = 10;

  // 18 Formations metadata
  const formations = [
    { key: 'basic', name: '起點 (基本隊形)', label: '基本' },
    { key: 'circle', name: '01圓形', label: '圓形' },
    { key: 'xingYuan', name: '02行願', label: '行願' },
    { key: 'miLuo', name: '03米籮', label: '米籮' },
    { key: 'jingSi', name: '04靜思家風', label: '靜思' },
    { key: 'lamp', name: '05-1有法船（點一盞燈）', label: '有法船' },
    { key: 'noBoat', name: '05-2無法船（菜市場5毛錢）', label: '無法船' },
    { key: 'noBoat3', name: '05-3無法船(是諸眾生)', label: '無法船3' },
    { key: 'bigV', name: '06四弘誓願', label: '四弘誓願' },
    { key: 'daChuanShi', name: '07-1大船師', label: '大船師' },
    { key: 'boneDonation', name: '07-2骨捐能捨', label: '骨捐' },
    { key: 'edu', name: '08教育', label: '教育' },
    { key: 'humanities1', name: '09-1人文(基本隊形)', label: '人文(基本)' },
    { key: 'humanities2', name: '09-2人文(主機板)', label: '人文(主機板)' },
    { key: 'fiveContinents1', name: '10-1五大洲', label: '五大洲1' },
    { key: 'fiveContinents2', name: '10-2五大洲', label: '五大洲2' },
    { key: 'flyingApsaras', name: '11飛天', label: '飛天' }
  ];

  function getActionHintsForPerformer(performer, key) {
    return (typeof ACTION_HINTS_DATA !== 'undefined' && ACTION_HINTS_DATA[key]) || [];
  }

  // Get coordinate and name from performer record.
  // Since v1.2.8: name is always empty in performersData (supplied by dayperformers.csv).
  // id field always holds the stage coordinate (e.g. "1-49").
  function getPerformerFields(performer) {
    if (!performer) return { coordinate: '', name: '' };
    return {
      coordinate: performer.id,
      name: performer.name || ''
    };
  }

  // Get coordinate string for a given formation key, applying session overrides.
  // For '1113' (11/13五) and '1115' (11/15日), 'noBoat3' position is overridden
  // to be the same as 'lamp' (05-1有法船（點一盞燈）).
  // For other sessions, noBoat3 uses the same coordinate as noBoat.
  function getFormationCoordStr(performer, key) {
    if (!performer) return '';
    if (key === 'basic') {
      return getPerformerFields(performer).coordinate;
    }
    if (key === 'humanities1') {
      return performer.id || ''; // 直接以身分證座標(ID)為資料
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

  // Get sticker filename type mapped for dynamic session layout
  function getDisplayType(key) {
    if (key === 'miLuo') {
      return 'basic';
    }
    if (key === 'boneDonation') {
      return 'bigV';
    }
    if (key === 'edu') {
      return 'eduWaterSlash';
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

  // Update dynamic formation metadata and DOM elements labels on session selection
  function updateFormationDynamicLabels() {
    const isBoatDay = (selectedSessionKey === '1113' || selectedSessionKey === '1115');
    const noBoat3Form = formations.find(f => f.key === 'noBoat3');
    if (noBoat3Form) {
      if (isBoatDay) {
        noBoat3Form.name = '05-3有法船(是諸眾生)';
        noBoat3Form.label = '有法船3';
      } else {
        noBoat3Form.name = '05-3無法船(是諸眾生)';
        noBoat3Form.label = '無法船3';
      }
    }
    
    const titleEl = document.getElementById('title-noBoat3');
    const subEl = document.getElementById('sub-noBoat3');
    const prevLabelEl = document.getElementById('label-noBoat3-prev');
    const bigVPrevLabelEl = document.getElementById('label-bigV-prev');
    
    if (isBoatDay) {
      if (titleEl) titleEl.textContent = '05-3有法船(是諸眾生)';
      if (subEl) subEl.textContent = 'Dharma Boat (with boat 3)';
      if (prevLabelEl) prevLabelEl.textContent = '從無法船：';
      if (bigVPrevLabelEl) bigVPrevLabelEl.textContent = '從有法船：';
    } else {
      if (titleEl) titleEl.textContent = '05-3無法船(是諸眾生)';
      if (subEl) subEl.textContent = 'Dharma Boat (no boat 3)';
      if (prevLabelEl) prevLabelEl.textContent = '從無法船：';
      if (bigVPrevLabelEl) bigVPrevLabelEl.textContent = '從無法船：';
    }
  }

  // Initialize App — session overlay and logic immediately
  setupSessionOverlay();
  init();

  // ─── Session Selection Overlay ───────────────────────────────────────────
  function setupSessionOverlay() {
    const overlay = document.getElementById('sessionOverlay');
    const cardsContainer = document.getElementById('sessionCards');
    const confirmBtn = document.getElementById('sessionConfirmBtn');
    const sessionBadge = document.getElementById('currentSessionBadge');
    if (!overlay || !cardsContainer || !confirmBtn) { init(); return; }

    // Build session cards from DAY_SESSIONS
    DAY_SESSIONS.forEach(sess => {
      const card = document.createElement('div');
      card.className = 'session-card';
      card.dataset.key = sess.key;

      const parts = sess.label.match(/^(\d+\/\d+)\((.+)\)$/);
      const datePart   = parts ? parts[1] : sess.label;
      const weekPart   = parts ? parts[2] : '';

      card.innerHTML = `
        <span class="session-card-weekday">${weekPart}</span>
        <span class="session-card-date">${datePart}</span>
        <span class="session-card-count">${sess.count > 0 ? sess.count + ' 人' : '待補'}</span>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('#sessionCards .session-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedSessionKey = sess.key;
        confirmBtn.disabled = !(tempSelectedPerformer && selectedTeam);
        
        // Enable and Focus search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.disabled = false;
          searchInput.placeholder = "請輸入身分證位置座標查詢 (如: 4-46)";
          searchInput.focus();
        }
      });

      cardsContainer.appendChild(card);
    });

    // Setup team card clicks
    const teamCards = document.querySelectorAll('#sessionTeamCards .session-card');
    teamCards.forEach(card => {
      card.addEventListener('click', () => {
        teamCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTeam = card.dataset.team;
        
        // Update confirm button disabled state dynamically
        if (confirmBtn) {
          confirmBtn.disabled = !(tempSelectedPerformer && selectedTeam);
        }
        
        // Auto-focus search input and trigger search if has text
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          if (searchInput.value.trim()) {
            searchInput.dispatchEvent(new Event('input'));
          }
        }
      });
    });

    confirmBtn.addEventListener('click', () => {
      if (!selectedSessionKey) return;

      // Actually load the performer data now on manual confirmation
      if (tempSelectedPerformer) {
        selectPerformer(tempSelectedPerformer, tempDayOverrideName);
      }

      if (appContainer) {
        appContainer.style.display = 'flex';
      }

      const sess = DAY_SESSIONS.find(s => s.key === selectedSessionKey);
      // Show badge in header
      if (sessionBadge && sess) {
        sessionBadge.textContent = sess.label;
        sessionBadge.style.display = 'inline-block';
      }
      // Sync to dropdown
      const teamFilter = document.getElementById('teamFilter');
      if (teamFilter) {
        teamFilter.value = selectedTeam;
      }
      // Hide overlay with fade
      overlay.style.transition = 'opacity 0.35s ease';
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 360);
    });
  }
  // ─────────────────────────────────────────────────────────────────────────


  function init() {
    setupTime();
    setupAutocomplete();
    setupFilters();
    setupMobileTabs();
    setupEventListeners();
    setupDownloadListeners();
    setupZoomAndPan();
    setupActionHintsOverlay();
    setupActionHintsZoom();
  }

  // Real-time status bar clock
  function setupTime() {
    const timeEl = document.getElementById('phoneTime');
    if (!timeEl) return;
    function updateClock() {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      timeEl.textContent = `${hrs}:${mins}`;
    }
    updateClock();
    setInterval(updateClock, 60000);
  }

  // Parse coord strings: e.g. "5.2-46.2", "平台中-8-58.5", "二階-52.2", or "舞台上"
  function parseCoordinate(coordStr) {
    if (!coordStr) return { x: null, y: null, isText: true, text: '無資料' };
    
    // Clean string by removing parentheses
    const cleanStr = coordStr.replace(/[()]/g, '').trim();
    
    // Flexible regex to match (-?[0-9.]+)-(-?[0-9.]+) anywhere in the string,
    // optionally ignoring text separator characters in the middle
    const match = cleanStr.match(/(-?[0-9.]+)[^0-9.-]*-(-?[0-9.]+)/);
    if (match) {
      let x = parseFloat(match[1]);
      let y = parseFloat(match[2]);
      if (selectedTeam === 'west') {
        x = -x;
      }
      return {
        x: x,
        y: y,
        isText: false,
        text: coordStr
      };
    } else {
      // Return description and set dummy relative offsets for visual rendering
      // e.g. "舞台上" is upstage, "上階梯" is upstage and left
      let mockXOffset = 0;
      let mockYOffset = 0;
      if (coordStr.includes('階梯')) {
        mockXOffset = -3.0; // Left relative (towards center line)
        mockYOffset = -4.0; // Upstage relative (towards Stage A / up)
      } else if (coordStr.includes('舞台')) {
        mockXOffset = 0.0;  // Center relative
        mockYOffset = -5.0; // Upstage relative (towards Stage A / up)
      }
      return {
        x: null,
        y: null,
        isText: true,
        text: coordStr,
        mockX: mockXOffset,
        mockY: mockYOffset
      };
    }
  }

  // Helper to split landmark text and numeric coordinates
  function splitLandmarkAndCoordinate(coordStr) {
    if (!coordStr) return { landmark: '', coordinate: '' };
    const cleanStr = coordStr.replace(/[()]/g, '').trim();
    // Match coordinate patterns like -8-58.5, 6.2-49.2, -50.2, etc. at the end
    const coordRegex = /(-?\d+(\.\d+)?([^\d.-]*-?\d+(\.\d+)?)*)$/;
    const match = cleanStr.match(coordRegex);
    if (match) {
      const coordinatePart = match[1];
      const landmarkPart = cleanStr.substring(0, cleanStr.length - coordinatePart.length).replace(/[-#\s]+$/, '').trim();
      return {
        landmark: landmarkPart,
        coordinate: coordinatePart
      };
    } else {
      return {
        landmark: cleanStr,
        coordinate: ''
      };
    }
  }

  // Format coordinate string to always display X coordinate as positive for West team
  function formatCoordinateForDisplay(coordStr) {
    if (!coordStr) return '';
    if (selectedTeam === 'west') {
      const split = splitLandmarkAndCoordinate(coordStr);
      if (split.coordinate) {
        const numMatch = split.coordinate.match(/(-?[0-9.]+)[^0-9.-]*-(-?[0-9.]+)/);
        if (numMatch) {
          const xVal = parseFloat(numMatch[1]);
          const yVal = parseFloat(numMatch[2]);
          const absX = Math.abs(xVal);
          const landmarkPart = split.landmark ? split.landmark + '-' : '';
          return `${landmarkPart}${absX}-${yVal}`;
        }
      }
    }
    return coordStr;
  }

  // Color mapping helper
  function getCategoryColor(category) {
    switch(category) {
      case 'A白': return 'var(--color-a-white)';
      case 'A藍': return 'var(--color-a-blue)';
      case 'B白': return 'var(--color-b-white)';
      case 'B藍': return 'var(--color-b-blue)';
      default: return 'var(--text-secondary)';
    }
  }

  // Get English category name for sticker filename compatibility (e.g. Synology NAS Web Server)
  function getEnglishCategory(category) {
    switch (category) {
      case 'A白': return 'A_white';
      case 'A藍': return 'A_blue';
      case 'B白': return 'B_white';
      case 'B藍': return 'B_blue';
      default: return category;
    }
  }

  // Autocomplete functionality
  function setupAutocomplete() {
    searchInput.addEventListener('input', (e) => {
      // Reset temp selected states on manual text change
      tempSelectedPerformer = null;
      tempDayOverrideName = '';
      const confirmBtn = document.getElementById('sessionConfirmBtn');
      if (confirmBtn) {
        confirmBtn.disabled = true;
      }

      const val = e.target.value.trim().toLowerCase();
      if (!val) {
        autocompleteList.style.display = 'none';
        clearSearchBtn.style.display = 'none';
        return;
      }
      
      clearSearchBtn.style.display = 'block';
      let dayList = (typeof DAY_PERFORMERS !== 'undefined' && selectedSessionKey)
        ? (DAY_PERFORMERS[selectedSessionKey] || [])
        : [];

      // Filter dayList by selectedTeam ('east' -> '東班', 'west' -> '西班')
      const targetTeamChinese = (selectedTeam === 'west') ? '西班' : '東班';
      dayList = dayList.filter(d => {
        const orig = performersData.find(p => p.id === d.id && p.team === (d.team || '東班'));
        const t = (orig && orig.team) ? orig.team : (d.team || '東班');
        return t === targetTeamChinese;
      });

      // Build a quick lookup: id -> dayName
      const dayNameMap = {};
      dayList.forEach(d => { dayNameMap[d.id] = d.name; });
      currentDayNameMap = dayNameMap; // expose to drawLocalGridPath

      const category = categoryFilter.value;
      const normalizedVal = val.replace(/^0+(\d+)/, '$1').replace(/-0+(\d+)/, '-$1');

      const filtered = performersData.filter(p => {
        // Filter by selectedTeam
        const performerTeam = (p.team === '西班') ? 'west' : 'east';
        if (performerTeam !== selectedTeam) return false;

        if (category !== 'all' && p.category !== category) return false;
        const normalizedId = p.id.replace(/^0+(\d+)/, '$1').replace(/-0+(\d+)/, '-$1');
        const fields = getPerformerFields(p);
        // Only search by current session's name (dayName) or by coordinate/id.
        // Never use data.js fields.name to avoid cross-session name leakage.
        const dayName = dayNameMap[fields.coordinate] || dayNameMap[p.id] || '';
        return dayName.toLowerCase().includes(val) ||
               p.id.includes(val) ||
               normalizedId.includes(normalizedVal);
      }).slice(0, 100);

      renderAutocomplete(filtered, dayNameMap);
    });

    searchInput.addEventListener('focus', () => {
      const val = searchInput.value.trim().toLowerCase();
      if (val) autocompleteList.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
        autocompleteList.style.display = 'none';
      }
    });
  }

  function renderAutocomplete(list, dayNameMap) {
    autocompleteList.innerHTML = '';
    dayNameMap = dayNameMap || {};
    
    if (list.length === 0) {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.textContent = '無符合資料';
      div.style.color = 'var(--text-secondary)';
      div.style.cursor = 'default';
      autocompleteList.appendChild(div);
      autocompleteList.style.display = 'block';
      return;
    }
    
    list.forEach(p => {
      const fields = getPerformerFields(p);
      // displayName: STRICTLY from current session's dayNameMap only.
      // Never fall back to data.js fields.name to prevent cross-session name leakage.
      const dayName = dayNameMap[fields.coordinate] || dayNameMap[p.id] || '';
      const displayName = dayName; // '' when session has no data → shows blank

      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      
      const textDiv = document.createElement('div');
      textDiv.className = 'name-id';
      textDiv.innerHTML = `${displayName} <span>(${formatCoordinateForDisplay(fields.coordinate)})</span>`;
      
      const badge = document.createElement('span');
      badge.className = `category-badge cat-${p.category}`;
      badge.textContent = p.category;
      
      div.appendChild(textDiv);
      div.appendChild(badge);
      
      div.addEventListener('click', () => {
        tempSelectedPerformer = p;
        tempDayOverrideName = dayName;
        searchInput.value = displayName || formatCoordinateForDisplay(fields.coordinate);
        autocompleteList.style.display = 'none';
        
        const confirmBtn = document.getElementById('sessionConfirmBtn');
        if (confirmBtn) {
          confirmBtn.disabled = !(tempSelectedPerformer && selectedTeam);
        }
      });
      
      autocompleteList.appendChild(div);
    });
    
    autocompleteList.style.display = 'block';
  }

  // Filter change resets search
  function setupFilters() {
    categoryFilter.addEventListener('change', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      autocompleteList.style.display = 'none';
    });
    
    if (teamFilter) {
      teamFilter.addEventListener('change', () => {
        selectedTeam = teamFilter.value;
        if (currentPerformer) {
          selectPerformer(currentPerformer, currentDisplayName, selectedTeam);
        }
        if (searchInput.value.trim()) {
          searchInput.dispatchEvent(new Event('input'));
        }
      });
    }
  }



  // Mobile Tabs bar toggling
  function setupMobileTabs() {
    mobileTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        mobileTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const targetTab = btn.dataset.tab;
        mobileTabPanels.forEach(p => p.classList.remove('active'));
        
        const targetPanel = document.getElementById(`panel-${targetTab}`);
        if (targetPanel) targetPanel.classList.add('active');
        
        activeTab = targetTab;
        if (activeTab === 'localGrid' && currentPerformer) {
          drawLocalGridPath();
        } else if ((activeTab === 'walkthrough' || activeTab === 'cards') && currentPerformer) {
          syncActiveCardAndStep();
        }
      });
    });
  }

  // Search event listeners
  function setupEventListeners() {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      autocompleteList.style.display = 'none';
      tempSelectedPerformer = null;
      tempDayOverrideName = '';
      const confirmBtn = document.getElementById('sessionConfirmBtn');
      if (confirmBtn) {
        confirmBtn.disabled = true;
      }
    });

    prevBtn.addEventListener('click', () => {
      if (activeFormationIdx > 0) {
        activeFormationIdx--;
        updateFormationControls();
        drawLocalGridPath();
        syncActiveCardAndStep();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (activeFormationIdx < formations.length - 1) {
        activeFormationIdx++;
        updateFormationControls();
        drawLocalGridPath();
        syncActiveCardAndStep();
      }
    });

    const showFullTrajectory = document.getElementById('showFullTrajectory');
    if (showFullTrajectory) {
      showFullTrajectory.addEventListener('change', () => {
        drawLocalGridPath();
      });
    }

    const showNeighborDots = document.getElementById('showNeighborDots');
    if (showNeighborDots) {
      showNeighborDots.addEventListener('change', () => {
        drawLocalGridPath();
      });
    }

    const showNeighborNames = document.getElementById('showNeighborNames');
    if (showNeighborNames) {
      showNeighborNames.addEventListener('change', () => {
        drawLocalGridPath();
      });
    }

    const showAlignmentGuides = document.getElementById('showAlignmentGuides');
    if (showAlignmentGuides) {
      showAlignmentGuides.addEventListener('change', () => {
        drawLocalGridPath();
      });
    }
  }

  function resetToEmptyState() {
    currentPerformer = null;
    mainContent.style.display = 'none';
    emptyState.style.display = 'flex';
  }

  // Select performer and query details
  // dayOverrideName: name from the day's roster (may be blank)
  function selectPerformer(performer, dayOverrideName, forceTeam = null) {
    currentPerformer = performer;
    updateFormationDynamicLabels();
    activeFormationIdx = 0;
    hintModalClosed = true; // Initially closed by default as per request
    resetZoomAndPan();
    
    const showFullTrajectory = document.getElementById('showFullTrajectory');
    if (showFullTrajectory) showFullTrajectory.checked = false;
    const showNeighborDots = document.getElementById('showNeighborDots');
    if (showNeighborDots) showNeighborDots.checked = false;
    const showNeighborNamesEl = document.getElementById('showNeighborNames');
    if (showNeighborNamesEl) showNeighborNamesEl.checked = false;

    // Automatically detect and set the team class from database
    let performerTeam = '東班';
    if (performer && performer.team) {
      performerTeam = performer.team;
    } else if (selectedSessionKey && typeof DAY_PERFORMERS !== 'undefined') {
      const dayList = DAY_PERFORMERS[selectedSessionKey] || [];
      const match = dayList.find(d => d.id === performer.id);
      if (match && match.team) {
        performerTeam = match.team;
      }
    }
    
    selectedTeam = forceTeam ? forceTeam : ((performerTeam === '西班') ? 'west' : 'east');
    if (teamFilter) {
      teamFilter.value = selectedTeam;
    }

    
    const fields = getPerformerFields(performer);
    // displayName: strictly from day roster (dayOverrideName).
    // Empty string is a valid value (session with no data → show blank).
    const displayName = (dayOverrideName !== undefined && dayOverrideName !== null)
      ? dayOverrideName  // use day name (may be '' for no-data sessions)
      : '';              // default blank if called without day context
    currentDisplayName = displayName; // Store for use by map/modal/PDF
    
    // Update summary card
    perfAvatar.textContent = displayName ? displayName.charAt(0) : fields.coordinate.charAt(0);
    perfAvatar.className = `performer-avatar cat-${performer.category}`;
    perfName.textContent = displayName;
    perfCategory.textContent = performer.category;
    perfCategory.className = `meta-badge cat-${performer.category}`;
    perfID.textContent = `起點座標: ${formatCoordinateForDisplay(fields.coordinate)}`;
    
    if (stageInstruction) {
      if (selectedTeam === 'west') {
        stageInstruction.innerHTML = `<i class="fa-solid fa-circle-info"></i> 舞台中線位於 X = 6，乙舞台中心點為 (6,38)，表演位置在第三象限。網格標註為絕對舞台座標。`;
      } else {
        stageInstruction.innerHTML = `<i class="fa-solid fa-circle-info"></i> 舞台中線位於 X = -6，乙舞台中心點為 (-6,38)，表演位置在第四象限。網格標註為絕對舞台座標。`;
      }
    }
    
    // Show main view
    emptyState.style.display = 'none';
    mainContent.style.display = 'flex';
    
    // Update controls, cards, map, and walkthrough path
    updateFormationControls();
    updateFormationCards();
    drawLocalGridPath();
    updateNavigationSteps();
    syncActiveCardAndStep();
    
    // Default to relative grid map tab on mobile viewport
    const defaultMobileTab = document.querySelector('.mobile-tab-btn[data-tab="localGrid"]');
    if (defaultMobileTab) defaultMobileTab.click();
    
    // Scroll to top of app screen
    const appScreen = document.querySelector('.app-screen');
    if (appScreen) {
      appScreen.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Update detail cards values & icons
  function updateFormationCards() {
    const fields = getPerformerFields(currentPerformer);
    formations.forEach(f => {
      const card = document.getElementById(`card-${f.key}`);
      const coordBadge = document.getElementById(`coord-${f.key}`);
      const iconWrapper = document.getElementById(`icon-${f.key}`);
      const vectorHome = document.getElementById(`vector-${f.key}-home`);
      const vectorPrev = document.getElementById(`vector-${f.key}-prev`);
      
      let coordStr = getFormationCoordStr(currentPerformer, f.key);
      coordBadge.textContent = formatCoordinateForDisplay(coordStr);
      
      // Render HTML landmark icons
      drawHtmlLandmarkIcon(iconWrapper, f.key, currentPerformer.category, currentDisplayName || fields.coordinate);
      
      // Render lyrics inside Card (Disabled per user request)
      let lyricsItem = card.querySelector('.lyrics-item');
      if (lyricsItem) {
        lyricsItem.remove();
      }
      
      const currentCoord = parseCoordinate(coordStr);
      const basicCoord = parseCoordinate(fields.coordinate);
      
      // Calculate relative step descriptions
      if (f.key === 'basic') {
        // basic has no offset description, it is the center
      } else {
        vectorHome.textContent = getVectorDescription(basicCoord, currentCoord);
        
        const prevKey = formations[formations.findIndex(x => x.key === f.key) - 1].key;
        let prevCoordStr = getFormationCoordStr(currentPerformer, prevKey);
        
        const prevCoord = parseCoordinate(prevCoordStr);
        vectorPrev.textContent = getVectorDescription(prevCoord, currentCoord);
      }
      // Disabled card click interaction as per request
      card.onclick = null;
    });
  }

  // Describe offsets in step counts and directions (with screen top as performer's front)
  function getVectorDescription(from, to) {
    if (from.isText || to.isText) {
      if (from.isText && to.isText) return `從 [${from.text}] 移動至 [${to.text}]`;
      if (from.isText) return `從 [${from.text}] 前往 坐標 (${to.text})`;
      return `從 坐標 (${from.text}) 前往 [${to.text}]`;
    }
    
    const dx = to.x - from.x; // Column difference (horizontal: right-left)
    const dy = to.y - from.y; // Row difference (vertical: down-up)
    
    if (dx === 0 && dy === 0) return '原地 (0 步)';
    
    let parts = [];
    if (dy !== 0) {
      const direction = dy > 0 ? '向後 (往乙舞台)' : '向前 (往甲舞台)';
      parts.push(`${direction}走 ${Math.abs(dy).toFixed(1)} 步`);
    }
    if (dx !== 0) {
      let direction = '';
      if (selectedTeam === 'west') {
        direction = dx > 0 ? '向右 (往中線)' : '向左 (往左側)';
      } else {
        direction = dx > 0 ? '向右 (往右側)' : '向左 (往中線)';
      }
      parts.push(`${direction}走 ${Math.abs(dx).toFixed(1)} 步`);
    }
    
    const dist = Math.sqrt(dx*dx + dy*dy).toFixed(1);
    return `${parts.join('，')} (直線 ${dist} 步)`;
  }

  // Transform relative coordinate to SVG screen coordinates (standard horizontal/vertical layout)
  function gridToSvg(dx_rel, dy_rel) {
    // Column difference dx_rel: positive is right, negative is left
    const svgX = GRID_CENTER_X + dx_rel * GRID_SPACING;
    
    // Row difference dy_rel: positive is down, negative is up
    const svgY = GRID_CENTER_Y + dy_rel * GRID_SPACING;
    
    return { x: svgX, y: svgY };
  }

  // Draw Dynamic SVG Landmark Image inside grid map using PNG stickers
  function drawSvgLandmarkImage(parentGroup, type, category, x, y, size, isMainSvg = true) {
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    const displayType = getDisplayType(type);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `images/stickers/${displayType}_${getEnglishCategory(category)}.png`);
    img.setAttribute('x', x - size / 2);
    img.setAttribute('y', y - size / 2);
    img.setAttribute('width', size);
    img.setAttribute('height', size);
    img.setAttribute('class', 'svg-sticker-image');
    
    if (isMainSvg) {
      // Add click event to image to sync active formation
      img.addEventListener('click', () => {
        const idx = formations.findIndex(x => x.key === type);
        activeFormationIdx = idx;
        updateFormationControls();
        drawLocalGridPath();
        syncActiveCardAndStep();
      });
    }
    
    parentGroup.appendChild(img);

    if (type === 'basic' && currentPerformer) {
      const fields = getPerformerFields(currentPerformer);
      const centerColor = category.startsWith('B') ? '#7dbf32' : '#e65537';
      
      const overlayCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      overlayCircle.setAttribute('cx', x);
      overlayCircle.setAttribute('cy', y);
      overlayCircle.setAttribute('r', (size * 0.3).toFixed(2));
      overlayCircle.setAttribute('fill', centerColor);
      parentGroup.appendChild(overlayCircle);
      
      const formattedCoord = formatCoordinateForDisplay(fields.coordinate);
      const parts = formattedCoord.split('-');
      if (parts.length === 2) {
        // Draw white dividing line
        const midLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        midLine.setAttribute('x1', (x - size * 0.18).toFixed(2));
        midLine.setAttribute('y1', y);
        midLine.setAttribute('x2', (x + size * 0.18).toFixed(2));
        midLine.setAttribute('y2', y);
        midLine.setAttribute('stroke', '#ffffff');
        midLine.setAttribute('stroke-width', (size * 0.024).toFixed(2));
        parentGroup.appendChild(midLine);
        
        // Top number
        const topText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        topText.setAttribute('x', x);
        topText.setAttribute('y', (y - size * 0.06).toFixed(2));
        topText.setAttribute('text-anchor', 'middle');
        topText.setAttribute('class', 'sticker-coord-text');
        topText.setAttribute('style', `font-size: ${(size * 0.208).toFixed(2)}px`);
        topText.textContent = parts[0].padStart(2, '0');
        parentGroup.appendChild(topText);
        
        // Bottom number
        const bottomText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        bottomText.setAttribute('x', x);
        bottomText.setAttribute('y', (y + size * 0.192).toFixed(2));
        bottomText.setAttribute('text-anchor', 'middle');
        bottomText.setAttribute('class', 'sticker-coord-text');
        bottomText.setAttribute('style', `font-size: ${(size * 0.208).toFixed(2)}px`);
        bottomText.textContent = parts[1].padStart(2, '0');
        parentGroup.appendChild(bottomText);
      } else {
        const overlayText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        overlayText.setAttribute('x', x);
        overlayText.setAttribute('y', (y + size * 0.088).toFixed(2));
        overlayText.setAttribute('text-anchor', 'middle');
        overlayText.setAttribute('class', 'sticker-coord-text');
        overlayText.setAttribute('style', `font-size: ${(size * 0.208).toFixed(2)}px`);
        overlayText.textContent = formattedCoord.padStart(2, '0');
        parentGroup.appendChild(overlayText);
      }
    }
  }

  // Draw relative coordinate grid path centered at basic ID (0,0) (standard unrotated axes)
  function drawLocalGridPath(targetSvg = null, targetIdx = null) {
    if (!currentPerformer) return;
    
    const svgEl = targetSvg || document.getElementById('localGridSvg');
    const fIdx = (targetIdx !== null) ? targetIdx : activeFormationIdx;
    const isMainSvg = (svgEl === document.getElementById('localGridSvg'));
    
    const showFullToggle = document.getElementById('showFullTrajectory');
    const showFull = (targetSvg === null && showFullToggle) ? showFullToggle.checked : false;
    
    // Save original scales to avoid preview rendering overriding main scales
    const originalMaxGridCoord = MAX_GRID_COORD;
    const originalGridSpacing = GRID_SPACING;
    
    const fields = getPerformerFields(currentPerformer);
    // Home coordinates
    const homeCoord = parseCoordinate(fields.coordinate);
    const category = currentPerformer.category;
    const centerLineX = (selectedTeam === 'west') ? 6 : -6;

    // Calculate dynamic scale based on maximum coordinate offset of points to display
    let maxOffset = 0;
    const tempPoints = formations.map((f) => {
      let coordStr = getFormationCoordStr(currentPerformer, f.key);
      
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
      return { dx_rel, dy_rel };
    });
    
    // Calculate scale based on all 6 points so that all performer positions are always inside the grid boundaries
    tempPoints.forEach(pt => {
      maxOffset = Math.max(maxOffset, Math.abs(pt.dx_rel), Math.abs(pt.dy_rel));
    });
    
    // Always include Stage B center in the visible map area
    if (!homeCoord.isText) {
      const stageB_dx_rel = centerLineX - homeCoord.x;
      const stageB_dy_rel = 38 - homeCoord.y;
      maxOffset = Math.max(maxOffset, Math.abs(stageB_dx_rel), Math.abs(stageB_dy_rel));
    }
    
    // Determine MAX_GRID_COORD and GRID_SPACING dynamically
    MAX_GRID_COORD = 4;
    while (MAX_GRID_COORD < maxOffset + 1.5) {
      MAX_GRID_COORD += 4;
    }
    GRID_SPACING = 180 / MAX_GRID_COORD;

    // Adjust label frequency based on coordinate density
    let labelStep = 2;
    if (MAX_GRID_COORD <= 6) {
      labelStep = 1;
    } else if (MAX_GRID_COORD <= 12) {
      labelStep = 2;
    } else if (MAX_GRID_COORD <= 24) {
      labelStep = 4;
    } else {
      labelStep = 8;
    }
    
    const wmkGroup = svgEl.querySelector('.stage-watermark') || svgEl.querySelector('#stageWatermark');
    const linesGroup = svgEl.querySelector('.grid-lines') || svgEl.querySelector('#localGridLines');
    const pathSegmentsGroup = svgEl.querySelector('#localPathSegments');
    const pathPointsGroup = svgEl.querySelector('#localPathPoints');
    
    wmkGroup.innerHTML = '';
    linesGroup.innerHTML = '';
    pathSegmentsGroup.innerHTML = '';
    pathPointsGroup.innerHTML = '';
    
    const existingLegend = svgEl.querySelector('#nextPointGuideLegendLine');
    if (existingLegend) {
      existingLegend.remove();
    }
    
    // Update grid clipping path rect
    const gridClipRect = svgEl.querySelector('#gridClipRect') || svgEl.querySelector('clipPath rect');
    if (gridClipRect) {
      gridClipRect.setAttribute('x', GRID_CENTER_X - MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('y', GRID_CENTER_Y - MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('width', 2 * MAX_GRID_COORD * GRID_SPACING);
      gridClipRect.setAttribute('height', 2 * MAX_GRID_COORD * GRID_SPACING);
    }
    
    // Draw Stage B blueprint watermark background
    if (!homeCoord.isText) {
      // 0. Draw Stage Background to mask the grid lines underneath
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
      
      // Stage B Circular Background: Col = centerLineX, Row = 38, Radius = 9.8 (outermost step, inner gap=-0.6 toward stage, diameter=19.6)
      const stageB_dx_rel = centerLineX - homeCoord.x;
      const stageB_dy_rel = 38 - homeCoord.y;
      const stageB_svg = gridToSvg(stageB_dx_rel, stageB_dy_rel);
      
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', stageB_svg.x);
      bgCircle.setAttribute('cy', stageB_svg.y);
      bgCircle.setAttribute('r', 9.8 * GRID_SPACING);
      bgCircle.setAttribute('class', 'watermark-bg');
      wmkGroup.appendChild(bgCircle);

      // 1. Draw Runway Central Rectangle: Col = (centerLineX - 3) to (centerLineX + 3), Row = 33 to 43
      const rect_x1_rel = (centerLineX - 3) - homeCoord.x;
      const rect_y1_rel = 33 - homeCoord.y;
      const rect_svgTopLeft = gridToSvg(rect_x1_rel, rect_y1_rel);
      const rect_width = 6 * GRID_SPACING;
      const rect_height = 10 * GRID_SPACING;
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', rect_svgTopLeft.x);
      rect.setAttribute('y', rect_svgTopLeft.y);
      rect.setAttribute('width', rect_width);
      rect.setAttribute('height', rect_height);
      rect.setAttribute('class', 'watermark-rect');
      wmkGroup.appendChild(rect);
      
      // 1.5 Draw central square in circle (size 8.0)
      const squareSize = 8.0 * GRID_SPACING;
      const squareRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      squareRect.setAttribute('x', stageB_svg.x - squareSize / 2);
      squareRect.setAttribute('y', stageB_svg.y - squareSize / 2);
      squareRect.setAttribute('width', squareSize);
      squareRect.setAttribute('height', squareSize);
      squareRect.setAttribute('class', 'watermark-rect');
      wmkGroup.appendChild(squareRect);
      
      // 2. Draw bulging concentric lines representing stage B circles and runway steps on BOTH sides
      const sides = [1, -1];
      sides.forEach(side => {
        for (let i = 0; i <= 6; i++) {
          const R_i = 7.4 + i * 0.4;
          const W_i = 3.4 + i * 0.4;
          
          const col_top = centerLineX + side * W_i - homeCoord.x;
          const col_mid = centerLineX + side * R_i - homeCoord.x;
          const col_bottom = centerLineX + side * W_i - homeCoord.x;
          
          const row_top_start = -MAX_GRID_COORD;
          const row_top_curve = 38 - 12 - homeCoord.y;
          const row_mid = 38 - homeCoord.y;
          const row_bottom_curve = 38 + 12 - homeCoord.y;
          const row_bottom_end = MAX_GRID_COORD;
          
          const x_top = GRID_CENTER_X + col_top * GRID_SPACING;
          const x_mid = GRID_CENTER_X + col_mid * GRID_SPACING;
          const x_bottom = GRID_CENTER_X + col_bottom * GRID_SPACING;
          
          const y_top_start = GRID_CENTER_Y + row_top_start * GRID_SPACING;
          const y_top_curve = GRID_CENTER_Y + row_top_curve * GRID_SPACING;
          const y_mid = GRID_CENTER_Y + row_mid * GRID_SPACING;
          const y_bottom_curve = GRID_CENTER_Y + row_bottom_curve * GRID_SPACING;
          const y_bottom_end = GRID_CENTER_Y + row_bottom_end * GRID_SPACING;
          
          const y_control_top = GRID_CENTER_Y + (38 - 6 - homeCoord.y) * GRID_SPACING;
          const y_control_bottom = GRID_CENTER_Y + (38 + 6 - homeCoord.y) * GRID_SPACING;
          
          const pathD = `M ${x_top} ${y_top_start} ` +
                        `L ${x_top} ${y_top_curve} ` +
                        `C ${x_top} ${y_control_top}, ${x_mid} ${y_control_top}, ${x_mid} ${y_mid} ` +
                        `C ${x_mid} ${y_control_bottom}, ${x_bottom} ${y_control_bottom}, ${x_bottom} ${y_bottom_curve} ` +
                        `L ${x_bottom} ${y_bottom_end}`;
                        
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathD);
          path.setAttribute('fill', 'none');
          
          if (i === 0) {
            path.setAttribute('class', 'watermark-line-accent');
          } else if (i % 2 === 1) {
            path.setAttribute('class', 'watermark-line-yellow');
          } else {
            path.setAttribute('class', 'watermark-line');
          }
          wmkGroup.appendChild(path);
        }
      });
      
      // 3. Draw radial stairs/steps on Stage B: radiating from center (6, 38) on BOTH sides
      const rightAngles = [-45, -30, -15, 0, 15, 30, 45];
      const leftAngles = [135, 150, 165, 180, 195, 210, 225];
      const allAngles = [...rightAngles, ...leftAngles];
      
      allAngles.forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        const r_start = 8.0 * GRID_SPACING;
        const r_end = 9.8 * GRID_SPACING;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', stageB_svg.x + r_start * Math.cos(rad));
        line.setAttribute('y1', stageB_svg.y + r_start * Math.sin(rad));
        line.setAttribute('x2', stageB_svg.x + r_end * Math.cos(rad));
        line.setAttribute('y2', stageB_svg.y + r_end * Math.sin(rad));
        line.setAttribute('class', 'watermark-line');
        wmkGroup.appendChild(line);
      });
      
      // 4. Draw Floating Labels
      function drawFloatingLabel(text, gridX, gridY) {
        const dx_rel = gridX - homeCoord.x;
        const dy_rel = gridY - homeCoord.y;
        const pt_svg = gridToSvg(dx_rel, dy_rel);
        
        const rectW = 44;
        const rectH = 16;
        
        // Draw the background rectangle for the floating effect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', pt_svg.x - rectW / 2);
        rect.setAttribute('y', pt_svg.y - rectH / 2);
        rect.setAttribute('width', rectW);
        rect.setAttribute('height', rectH);
        rect.setAttribute('rx', 3);
        rect.setAttribute('ry', 3);
        rect.setAttribute('style', 'fill: #ffffff; stroke: #475569; stroke-width: 1px; fill-opacity: 0.95;');
        wmkGroup.appendChild(rect);
        
        // Draw the centered text label
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', pt_svg.x);
        txt.setAttribute('y', pt_svg.y + 3.5);
        txt.setAttribute('class', 'watermark-text');
        txt.setAttribute('style', 'fill: #0f172a; font-size: 8px; font-weight: bold; text-anchor: middle;');
        txt.textContent = text;
        wmkGroup.appendChild(txt);
      }

      // Draw stage and master labels
      drawFloatingLabel('甲舞台', centerLineX, 2);
      drawFloatingLabel('乙舞台', centerLineX, 38);
      drawFloatingLabel('法師', centerLineX, 78);
    }
    
    // Draw background grid lines (centered at 180, 180) - horizontal and vertical
    for (let i = -MAX_GRID_COORD; i <= MAX_GRID_COORD; i++) {
      const posOffset = i * GRID_SPACING;
      
      // Vertical line (truncated to y between -20 and 95)
      let vY1 = GRID_CENTER_Y - MAX_GRID_COORD * GRID_SPACING;
      let vY2 = GRID_CENTER_Y + MAX_GRID_COORD * GRID_SPACING;
      if (!homeCoord.isText) {
        const relY1 = Math.max(-MAX_GRID_COORD, -20 - homeCoord.y);
        const relY2 = Math.min(MAX_GRID_COORD, 95 - homeCoord.y);
        vY1 = GRID_CENTER_Y + relY1 * GRID_SPACING;
        vY2 = GRID_CENTER_Y + relY2 * GRID_SPACING;
      }
      
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      vLine.setAttribute('x1', GRID_CENTER_X + posOffset);
      vLine.setAttribute('y1', vY1);
      vLine.setAttribute('x2', GRID_CENTER_X + posOffset);
      vLine.setAttribute('y2', vY2);
      if (i === 0) vLine.setAttribute('class', 'axis');
      linesGroup.appendChild(vLine);
      
      // Horizontal line (only draw if absolute y is between -20 and 95)
      let shouldDrawHLine = true;
      if (!homeCoord.isText) {
        const absY = homeCoord.y + i;
        if (absY < -20 || absY > 95) {
          shouldDrawHLine = false;
        }
      }
      
      if (shouldDrawHLine) {
        const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hLine.setAttribute('x1', GRID_CENTER_X - MAX_GRID_COORD * GRID_SPACING);
        hLine.setAttribute('y1', GRID_CENTER_Y + posOffset);
        hLine.setAttribute('x2', GRID_CENTER_X + MAX_GRID_COORD * GRID_SPACING);
        hLine.setAttribute('y2', GRID_CENTER_Y + posOffset);
        if (i === 0) hLine.setAttribute('class', 'axis');
        linesGroup.appendChild(hLine);
      }
      
      // Grid coordinates labels
      if (i % labelStep === 0 && i !== 0) {
        const xText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xText.setAttribute('x', GRID_CENTER_X + posOffset);
        xText.setAttribute('y', GRID_CENTER_Y + 11);
        if (!homeCoord.isText) {
          let val = homeCoord.x + i;
          if (selectedTeam === 'west') {
            val = Math.abs(val);
          }
          xText.textContent = val.toFixed(1).replace('.0', '');
        } else {
          xText.textContent = i > 0 ? `右${i}` : `左${Math.abs(i)}`;
        }
        linesGroup.appendChild(xText);
        
        let shouldDrawYText = true;
        if (!homeCoord.isText) {
          const val = homeCoord.y + i;
          if (val < -20 || val > 95) {
            shouldDrawYText = false;
          }
        }
        
        if (shouldDrawYText) {
          const yText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          yText.setAttribute('x', GRID_CENTER_X - 10);
          yText.setAttribute('y', GRID_CENTER_Y + posOffset + 3);
          if (!homeCoord.isText) {
            const val = homeCoord.y + i;
            yText.textContent = val.toFixed(1).replace('.0', '');
          } else {
            yText.textContent = i > 0 ? `後${i}` : `前${Math.abs(i)}`;
          }
          linesGroup.appendChild(yText);
        }
      }
    }
    
    // Center coordinate label removed by request
    
    // Draw bold red lines for the rounded target coordinates
    const showGuidesToggle = document.getElementById('showAlignmentGuides');
    const showGuides = showGuidesToggle ? showGuidesToggle.checked : true;
    let targetForm = formations[fIdx];
    if (targetForm && showGuides) {
      let targetCoordStr = getFormationCoordStr(currentPerformer, targetForm.key);
      let targetCoord = parseCoordinate(targetCoordStr);
      if (targetCoord && !targetCoord.isText && !homeCoord.isText) {
        const roundedX = Math.trunc(targetCoord.x);
        const roundedY = Math.trunc(targetCoord.y);
        
        const dx_rel = roundedX - homeCoord.x;
        const dy_rel = roundedY - homeCoord.y;
        
        // Draw vertical red line at x = roundedX (extend 10 units up/down from roundedY)
        const vRedLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const vY1 = GRID_CENTER_Y + Math.max(-MAX_GRID_COORD, dy_rel - 10) * GRID_SPACING;
        const vY2 = GRID_CENTER_Y + Math.min(MAX_GRID_COORD, dy_rel + 10) * GRID_SPACING;
        vRedLine.setAttribute('x1', GRID_CENTER_X + dx_rel * GRID_SPACING);
        vRedLine.setAttribute('y1', vY1);
        vRedLine.setAttribute('x2', GRID_CENTER_X + dx_rel * GRID_SPACING);
        vRedLine.setAttribute('y2', vY2);
        vRedLine.setAttribute('style', 'stroke: orangered !important; stroke-width: 3px !important;');
        linesGroup.appendChild(vRedLine);
        
        // Draw horizontal red line at y = roundedY (extend 10 units left/right from roundedX)
        const hRedLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const hX1 = GRID_CENTER_X + Math.max(-MAX_GRID_COORD, dx_rel - 10) * GRID_SPACING;
        const hX2 = GRID_CENTER_X + Math.min(MAX_GRID_COORD, dx_rel + 10) * GRID_SPACING;
        hRedLine.setAttribute('x1', hX1);
        hRedLine.setAttribute('y1', GRID_CENTER_Y + dy_rel * GRID_SPACING);
        hRedLine.setAttribute('x2', hX2);
        hRedLine.setAttribute('y2', GRID_CENTER_Y + dy_rel * GRID_SPACING);
        hRedLine.setAttribute('style', 'stroke: orangered !important; stroke-width: 3px !important;');
        linesGroup.appendChild(hRedLine);
        
        // Label for coordinate intersection (place in fourth quadrant: dx_rel + 5, dy_rel + 3 for East; dx_rel - 5, dy_rel + 3 for West)
        const xOffset = (selectedTeam === 'west') ? -5 : 5;
        const coordText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        coordText.setAttribute('x', GRID_CENTER_X + (dx_rel + xOffset) * GRID_SPACING);
        coordText.setAttribute('y', GRID_CENTER_Y + (dy_rel + 3) * GRID_SPACING + 6);
        coordText.setAttribute('text-anchor', 'middle');
        coordText.setAttribute('style', 'fill: orangered !important; font-size: 16.5px !important; font-weight: 800 !important; font-family: Outfit, sans-serif !important;');
        coordText.textContent = `${Math.abs(roundedX)}-${roundedY}`;
        linesGroup.appendChild(coordText);
      }
    }
    
    // Calculate relative coordinates and map to SVG coords
    const allPoints = formations.map((f, idx) => {
      let coordStr = getFormationCoordStr(currentPerformer, f.key);
      
      const coord = parseCoordinate(coordStr);
      
      let dx_rel = 0;
      let dy_rel = 0;
      if (!coord.isText && !homeCoord.isText) {
        dx_rel = coord.x - homeCoord.x;
        dy_rel = coord.y - homeCoord.y;
      } else if (coord.isText) {
        dx_rel = coord.mockX;
        dy_rel = coord.mockY;
      }
      
      const ptSvg = gridToSvg(dx_rel, dy_rel);
      
      return {
        key: f.key,
        name: f.name,
        label: f.label,
        coord: coord,
        dx_rel: dx_rel,
        dy_rel: dy_rel,
        pos: ptSvg,
        index: idx
      };
    });
    
    // Map all 6 points to display on the SVG grid
    const pointsToDisplay = allPoints.map((pt, idx) => {
      let role = 'prev';
      let roleLabel = pt.label;
      if (idx === 0) {
        role = 'basic';
        roleLabel = '起點';
      }
      if (idx === fIdx) {
        role = 'current';
        roleLabel = `目前: ${pt.label}`;
      }
      return {
        ...pt,
        role,
        roleLabel
      };
    });
    
    // Define custom colors for each formation key
    const formationColors = {
      basic: '#eab308',      // 黃色
      circle: '#BE6C50',     // 暖紅棕色
      xingYuan: '#0B954B',   // 綠色
      miLuo: '#F48220',      // 橘色
      jingSi: '#80CEF3',     // 天藍色
      lamp: '#ACCE22',       // 嫩綠色
      noBoat: '#ACCE22',     // 嫩綠色
      noBoat3: '#ACCE22',    // 嫩綠色
      bigV: '#F19EA8',       // 粉紅色
      daChuanShi: '#FDD100',  // 黃色
      boneDonation: '#F19EA8', // 骨捐沿用四弘誓願的粉紅色
      edu: '#A6ADD6',          // 沿用原先 08-1 的藍紫色
      humanities1: '#0061AE',  // 藍色
      humanities2: '#0061AE',  // 藍色
      fiveContinents1: '#AF9DA8', // 灰紫色
      fiveContinents2: '#AF9DA8', // 灰紫色
      flyingApsaras: '#E62129'  // 紅色
    };
    
    // Draw all transition path segments sequentially
    for (let i = 0; i < allPoints.length - 1; i++) {
      if (!showFull && i + 1 !== fIdx) continue;
      
      const startPt = allPoints[i];
      const endPt = allPoints[i + 1];
      
      if (startPt.pos.x !== endPt.pos.x || startPt.pos.y !== endPt.pos.y) {
        let endX = endPt.pos.x;
        let endY = endPt.pos.y;
        if (i + 1 === fIdx) {
          // Reduce length by 10% (90% of distance remains)
          endX = startPt.pos.x + 0.9 * (endPt.pos.x - startPt.pos.x);
          endY = startPt.pos.y + 0.9 * (endPt.pos.y - startPt.pos.y);
        }
        const pathD = `M ${startPt.pos.x} ${startPt.pos.y} L ${endX} ${endY}`;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('fill', 'none');
        
        const targetKey = endPt.key;
        const color = formationColors[targetKey];
        path.style.stroke = color;
        
        if (i + 1 === fIdx) {
          path.setAttribute('class', 'local-path-line');
          path.setAttribute('marker-end', `url(#local-arrow-${targetKey})`);
          path.style.filter = `drop-shadow(0 0 3px ${color})`;
        } else {
          path.setAttribute('class', 'local-path-line-static');
          path.setAttribute('marker-end', `url(#local-arrow-static-${targetKey})`);
          path.style.filter = 'none';
        }
        pathSegmentsGroup.appendChild(path);
      }
    }
    
    // Render Display Nodes on SVG
    pointsToDisplay.forEach(pt => {
      if (!showFull && pt.index !== 0 && pt.index !== fIdx && pt.index !== fIdx - 1) {
        return;
      }
      
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `path-point pt-${pt.key} role-${pt.role} ${pt.key === formations[fIdx].key ? 'active-formation' : ''}`);
      g.setAttribute('id', `local-point-${pt.key}`);
      
      // Calculate dynamic landmark size based on grid spacing (enlarged by 25%, i.e., removing the 80% scaling down factor)
      const landmarkSize = Math.max(12, Math.min(32, GRID_SPACING * 1.8));
      
      // Render the sticker image dynamically sized
      drawSvgLandmarkImage(g, pt.key, category, pt.pos.x, pt.pos.y, landmarkSize, isMainSvg);
      
      // Draw coordinate label under the node (scaled down to 62.5% of original, i.e., 25% larger than 50%)
      if (pt.coord && pt.coord.text) {
        const formattedText = formatCoordinateForDisplay(pt.coord.text);
        const split = splitLandmarkAndCoordinate(formattedText);
        let labelToShow = '';
        if (pt.role === 'current') {
          labelToShow = formattedText;
        } else {
          labelToShow = split.landmark;
        }
        
        if (labelToShow) {
          const textLength = labelToShow.length;
          const bgWidth = (textLength * 5.2 + 6) * 0.625;
          const bgHeight = 6.875;
          const labelY = pt.pos.y + landmarkSize / 2 + 6.5; // position label dynamically below the node
          
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', pt.pos.x - bgWidth / 2);
          rect.setAttribute('y', labelY - bgHeight / 2);
          rect.setAttribute('width', bgWidth);
          rect.setAttribute('height', bgHeight);
          let bgClass = 'path-label-bg';
          if (pt.role === 'current') bgClass += ' bg-current';
          rect.setAttribute('class', bgClass);
          g.appendChild(rect);
          
          const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textEl.setAttribute('x', pt.pos.x);
          textEl.setAttribute('y', labelY + 1.56); // vertical baseline alignment for 62.5% scale
          let textClass = 'path-label-text';
          if (pt.role === 'current') textClass += ' label-current';
          else if (pt.role === 'prev') textClass += ' label-prev';
          textEl.setAttribute('class', textClass);
          textEl.textContent = labelToShow;
          g.appendChild(textEl);
        }
      }
      
      if (isMainSvg) {
        // Sync on node click
        g.addEventListener('click', () => {
          const idx = formations.findIndex(x => x.key === pt.key);
          activeFormationIdx = idx;
          updateFormationControls();
          drawLocalGridPath();
          syncActiveCardAndStep();
        });
      }
      
      pathPointsGroup.appendChild(g);
    });

    // ── Neighbor Dots ──────────────────────────────────────────────────
    // X軸 ±2 格 → 綠色點 | Y軸 ±4 格 → 紅色點
    {
      const showNeighborToggle = document.getElementById('showNeighborDots');
      const showNeighbors = showNeighborToggle ? showNeighborToggle.checked : false;

      if (showNeighbors && !homeCoord.isText) {
        const activeFormation = formations[fIdx];
        const myCoordStr = getFormationCoordStr(currentPerformer, activeFormation.key);
        const myCoord = parseCoordinate(myCoordStr);

        if (!myCoord.isText && myCoord.x !== null) {
          const X_RADIUS = 1;
          const Y_RADIUS = 1;
          const dotR = Math.max(2, GRID_SPACING * 0.14);

          const showNamesToggle = document.getElementById('showNeighborNames');
          const showNames = showNamesToggle ? showNamesToggle.checked : false;

          function drawNeighborDot(svgX, svgY, color, name, rx, ry) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', String(svgX));
            dot.setAttribute('cy', String(svgY));
            dot.setAttribute('r', String(dotR));
            dot.setAttribute('fill', color);
            dot.setAttribute('fill-opacity', '0.92');
            dot.setAttribute('stroke', '#ffffff');
            dot.setAttribute('stroke-width', '1.0');
            pathSegmentsGroup.appendChild(dot);
            // 顯示姓名標籤
            if (showNames && name) {
              const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              const shiftX = rx * GRID_SPACING;
              const shiftY = (ry + 1) * GRID_SPACING;
              lbl.setAttribute('x', String(svgX + shiftX));
              lbl.setAttribute('y', String(svgY + shiftY - dotR - 2));
              
              // 動態對齊以防重疊
              let anchor = 'middle';
              if (rx < -0.01) {
                anchor = 'end';
              } else if (rx > 0.01) {
                anchor = 'start';
              }
              lbl.setAttribute('text-anchor', anchor);
              lbl.setAttribute('fill', color);
              lbl.setAttribute('stroke', '#0f172a');
              lbl.setAttribute('stroke-width', '0.9');
              lbl.setAttribute('paint-order', 'stroke fill');
              lbl.setAttribute('font-size', '3.7');
              lbl.setAttribute('font-weight', 'bold');
              lbl.textContent = name;
              pathSegmentsGroup.appendChild(lbl);
            }
          }

          // 以身分證座標為基準，找三個縱軸的鄰近格，顯示當前隊形位置
          // X-1 → 藍色 | X → 紅色 | X+1 → 綠色
          const myBasicCoord = parseCoordinate(fields.coordinate);
          if (!myBasicCoord.isText && myBasicCoord.x !== null) {
            const columnDefs = [
              { xOffset: -1, color: '#3b82f6' }, // X-1 藍色
              { xOffset:  0, color: '#ef4444' }, // X   紅色
              { xOffset: +1, color: '#22c55e' }, // X+1 綠色
            ];
            columnDefs.forEach(col => {
              const targetX = myBasicCoord.x + col.xOffset;
              performersData.forEach(p => {
                if (p === currentPerformer && col.xOffset === 0) return;
                // Only consider performers belonging to the currently selected team
                const pTeam = (p.team === '西班') ? 'west' : 'east';
                if (pTeam !== selectedTeam) return;

                const basicCoord = parseCoordinate(p.id);
                if (basicCoord.isText || basicCoord.x === null) return;
                const dx = Math.abs(basicCoord.x - targetX);
                const dy = Math.abs(basicCoord.y - myBasicCoord.y);
                if (dx >= 0.01 || dy > Y_RADIUS) return; // 指定 X 欄、Y±1
                const nCoordStr = getFormationCoordStr(p, activeFormation.key);
                if (!nCoordStr) return;
                const nCoord = parseCoordinate(nCoordStr);
                if (nCoord.isText || nCoord.x === null) return;
                const rx = col.xOffset;
                const ry = basicCoord.y - myBasicCoord.y;
                const nsvg = gridToSvg(nCoord.x - homeCoord.x, nCoord.y - homeCoord.y);
                const nName = currentDayNameMap[p.id] || '';
                drawNeighborDot(nsvg.x, nsvg.y, col.color, nName, rx, ry);
              });
            });
          }
        }
      }
    }
    // ───────────────────────────────────────────────────────────────
    if (isMainSvg) {
      // (mapCoordDisplayBar rendering removed as it is merged into switcher)

      // Update landmark guide text below the map
      const mapMovementGuide = document.getElementById('mapMovementGuide');
      if (mapMovementGuide) {
        const f = formations[activeFormationIdx];
        let coordStr = getFormationCoordStr(currentPerformer, f.key);
        const currentCoord = parseCoordinate(coordStr);
        
        const showGuidesToggle = document.getElementById('showAlignmentGuides');
        const showGuides = showGuidesToggle ? showGuidesToggle.checked : true;

        let roundingText = '';
        if (currentCoord && !currentCoord.isText && showGuides) {
          const rx = Math.trunc(currentCoord.x);
          const ry = Math.trunc(currentCoord.y);
          roundingText = ` <span style="color: orangered; font-weight:bold;">(對齊紅線：${rx}-${ry})</span>`;
        }

        const split = splitLandmarkAndCoordinate(coordStr);
        const landmarkName = split.landmark || '無';
        const coordinateVal = split.coordinate || coordStr || '---';

        mapMovementGuide.innerHTML = `<i class="fa-solid fa-location-dot" style="color: var(--red-color); margin-right: 5px;"></i><strong>地標指引</strong>：<strong>${landmarkName}</strong> (座標: <strong>${coordinateVal}</strong>)${roundingText}`;
      }

      // Update lyrics guide text below the map (Disabled per user request)
      const mapLyricsGuide = document.getElementById('mapLyricsGuide');
      if (mapLyricsGuide) {
        mapLyricsGuide.style.display = 'none';
      }
    }
    
    // Manage zoom viewport centering on active point
    if (isMainSvg) {
      if (zoomLevel > 1.0) {
        // Calculate rotated coordinates to center correctly if rotated
        const rad = (rotationAngle * Math.PI) / 180;
        const rotatedX = 180 + (allPoints[fIdx].pos.x - 180) * Math.cos(rad) - (allPoints[fIdx].pos.y - 180) * Math.sin(rad);
        const rotatedY = 180 + (allPoints[fIdx].pos.x - 180) * Math.sin(rad) + (allPoints[fIdx].pos.y - 180) * Math.cos(rad);
        panX = rotatedX - 180;
        panY = rotatedY - 180;
      } else {
        panX = 0;
        panY = 0;
      }
      updateSvgViewBox(svgEl);
    } else {
      // Restore previous scale for preview renders to keep main SVG state pure
      MAX_GRID_COORD = originalMaxGridCoord;
      GRID_SPACING = originalGridSpacing;
    }

    // Draw current point guide line legend in bottom-right blank area of SVG (unaffected by grid rotation)
    const currentKey = formations[fIdx].key;
    const currentColor = formationColors[currentKey] || '#fbbf24';
    
    const currentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    currentLine.setAttribute('id', 'nextPointGuideLegendLine');
    const isWest = (selectedTeam === 'west');
    const x1Val = isWest ? '15' : '245';
    const x2Val = isWest ? '115' : '345';
    currentLine.setAttribute('x1', x1Val);
    currentLine.setAttribute('y1', '345');
    currentLine.setAttribute('x2', x2Val);
    currentLine.setAttribute('y2', '345');
    currentLine.setAttribute('stroke', currentColor);
    currentLine.setAttribute('stroke-width', '5.5px');
    currentLine.setAttribute('stroke-linecap', 'round');
    currentLine.setAttribute('style', `stroke: ${currentColor} !important; stroke-width: 5.5px !important; stroke-linecap: round !important;`);
    svgEl.appendChild(currentLine);
    if (isMainSvg) {
      updateSvgViewBox(svgEl);
    }
  }

  // Draw Card Landmark Icon in HTML using the cropped PNG stickers
  function drawHtmlLandmarkIcon(wrapper, type, category, id) {
    wrapper.innerHTML = '';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    
    const displayType = getDisplayType(type);
    const img = document.createElement('img');
    img.src = `images/stickers/${displayType}_${getEnglishCategory(category)}.png`;
    img.className = 'landmark-sticker-img';
    img.alt = `${type} sticker`;
    
    img.onerror = () => {
      console.error(`Failed to load sticker: images/stickers/${displayType}_${getEnglishCategory(category)}.png`);
      wrapper.textContent = type;
    };
    
    wrapper.appendChild(img);

    if ((type === 'basic' || type === 'miLuo' || type === 'humanities1') && currentPerformer) {
      const fields = getPerformerFields(currentPerformer);
      const circleOverlay = document.createElement('div');
      circleOverlay.className = 'sticker-circle-overlay';
      
      const centerColor = category.startsWith('B') ? '#7dbf32' : '#e65537';
      circleOverlay.style.backgroundColor = centerColor;
      
      const coordVal = type === 'miLuo' ? (getFormationCoordStr(currentPerformer, 'miLuo') || fields.coordinate) : fields.coordinate;
      const parts = coordVal.split('-');
      if (parts.length === 2) {
        const topSpan = document.createElement('span');
        topSpan.className = 'sticker-coord-part-html top';
        topSpan.textContent = parts[0].padStart(2, '0');
        
        const lineDiv = document.createElement('div');
        lineDiv.className = 'sticker-coord-line-html';
        
        const bottomSpan = document.createElement('span');
        bottomSpan.className = 'sticker-coord-part-html bottom';
        bottomSpan.textContent = parts[1].padStart(2, '0');
        
        circleOverlay.appendChild(topSpan);
        circleOverlay.appendChild(lineDiv);
        circleOverlay.appendChild(bottomSpan);
      } else {
        const textSpan = document.createElement('span');
        textSpan.className = 'sticker-coord-text-html';
        textSpan.textContent = coordVal.padStart(2, '0');
        circleOverlay.appendChild(textSpan);
      }
      
      wrapper.appendChild(circleOverlay);
    }
  }

  // Update Top Toggle Controls display text and button states
  function updateFormationControls() {
    const f = formations[activeFormationIdx];
    activeFormNum.textContent = String(activeFormationIdx + 1).padStart(2, '0');
    activeFormTitle.textContent = f.name;
    
    // Update step coordinate display
    if (activeFormCoord && currentPerformer) {
      const coordStr = getFormationCoordStr(currentPerformer, f.key) || '---';
      activeFormCoord.textContent = `座標: ${coordStr}`;
    }
    
    prevBtn.disabled = (activeFormationIdx === 0);
    nextBtn.disabled = (activeFormationIdx === formations.length - 1);
  }

  // Sync highlighting of detail cards and walkthrough steps
  function syncActiveCardAndStep() {
    const activeKey = formations[activeFormationIdx].key;
    
    // Detail Card Highlight and Auto-scroll
    unhighlightAllCards();
    const card = document.getElementById(`card-${activeKey}`);
    if (card && activeTab === 'cards') {
      // Scroll into view but do not highlight/change color as per request
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Action Hint Step Card Highlight
    const hintCards = document.querySelectorAll('.action-hint-step-card');
    hintCards.forEach((c, idx) => {
      if (idx === activeFormationIdx) {
        c.classList.add('active-step-card');
        if (activeTab === 'walkthrough') {
          c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else {
        c.classList.remove('active-step-card');
      }
    });
    
    updateActionHintsDisplay();
  }

  // Highlight detail card from map hover
  function highlightFormationCard(key) {
    unhighlightAllCards();
    const card = document.getElementById(`card-${key}`);
    if (card) {
      // Scroll card container into view but do not highlight as per request
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function unhighlightAllCards() {
    const cards = document.querySelectorAll('.formation-card');
    cards.forEach(c => c.classList.remove('highlighted'));
  }

  // Highlight relative point on map from card click
  function highlightFormation(key) {
    unhighlightAllCards();
    const card = document.getElementById(`card-${key}`);
    // Disabled card highlighted class toggle as per request
    
    const allPts = document.querySelectorAll('.path-point');
    allPts.forEach(pt => pt.classList.remove('active-formation'));
    
    const localPt = document.getElementById(`local-point-${key}`);
    if (localPt) localPt.classList.add('active-formation');
  }

  // Get YouTube video ID from URL
  function getYouTubeVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : null;
  }

  // Open YouTube app on mobile, or fallback to browser
  function openYouTubeVideo(videoId, originalUrl) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      let appUrl = '';
      if (isiOS) {
        appUrl = `youtube://watch?v=${videoId}`;
      } else {
        appUrl = `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;end`;
      }
      
      // Try redirecting to custom URL scheme
      window.location.href = appUrl;
      
      // Fallback redirect after 1.5 seconds if target app did not wake up
      setTimeout(() => {
        window.open(originalUrl, '_blank');
      }, 1500);
    } else {
      window.open(originalUrl, '_blank');
    }
  }

  // Render step navigation flow walkthrough list as Action Hints
  function updateNavigationSteps() {
    if (!actionHintsFlow || !currentPerformer) return;
    actionHintsFlow.innerHTML = '';

    // Function to parse YouTube links and replace them with button HTML
    function formatTextWithYtButtons(text) {
      if (!text) return '';
      let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
      
      const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s]*))/gi;
      return escaped.replace(ytRegex, function(match, url, videoId) {
        return `<button class="yt-red-btn" data-video-id="${videoId}" data-url="${url}"><i class="fa-brands fa-youtube"></i> 播放</button>`;
      });
    }

    // Setup event delegation for red buttons if not yet set up
    if (!actionHintsFlow.dataset.hasYtClick) {
      actionHintsFlow.dataset.hasYtClick = "true";
      actionHintsFlow.addEventListener('click', (e) => {
        const btn = e.target.closest('.yt-red-btn');
        if (btn) {
          e.stopPropagation();
          const videoId = btn.getAttribute('data-video-id');
          const url = btn.getAttribute('data-url');
          if (videoId && typeof openYouTubeVideo === 'function') {
            openYouTubeVideo(videoId, url);
          }
        }
      });
    }
    
    formations.forEach((f, idx) => {
      const card = document.createElement('div');
      card.className = 'action-hint-step-card card';
      if (idx === activeFormationIdx) {
        card.classList.add('active-step-card');
      }
      
      const header = document.createElement('div');
      header.className = 'action-hint-step-header';
      
      const titleSpan = document.createElement('span');
      titleSpan.className = 'action-hint-step-title';
      titleSpan.innerHTML = `<strong>${String(idx + 1).padStart(2, '0')}. ${f.name}</strong>`;
      
      header.appendChild(titleSpan);
      card.appendChild(header);
      
      const body = document.createElement('div');
      body.className = 'action-hint-step-body';
      
      const items = getActionHintsForPerformer(currentPerformer, f.key);
      
      if (items.length === 0) {
        const noHints = document.createElement('div');
        noHints.className = 'no-hints-placeholder';
        noHints.textContent = '此步驟無演繹內容';
        body.appendChild(noHints);
      } else {
        items.forEach(item => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'action-hint-item';
          itemDiv.style.cssText = 'padding: 8px 0; border-bottom: 1px dashed rgba(180, 83, 9, 0.1);';
          
          const itemTitle = document.createElement('div');
          itemTitle.style.cssText = 'font-weight: bold; color: #b45309; font-size: calc(13px * var(--hints-scale, 1)); margin-bottom: 4px;';
          itemTitle.innerHTML = formatTextWithYtButtons(item.title);
          itemDiv.appendChild(itemTitle);
          
          item.details.forEach(detail => {
            if (detail.type === 'text') {
               const p = document.createElement('p');
               p.style.cssText = 'margin: 0 0 4px 0; color: #1e293b; font-size: calc(12.5px * var(--hints-scale, 1)); line-height: 1.45; font-weight: 500;';
               p.innerHTML = formatTextWithYtButtons(detail.content);
               itemDiv.appendChild(p);
            } else if (detail.type === 'image') {
               const img = document.createElement('img');
               img.src = detail.src;
               img.style.cssText = 'width: calc(100% * var(--hints-scale, 1)); max-width: none; height: auto; display: block; border-radius: 6px; margin: 6px 0; border: 1px solid rgba(180, 83, 9, 0.1);';
               itemDiv.appendChild(img);
            }
          });
          
          body.appendChild(itemDiv);
        });
        
        if (body.lastChild) {
          body.lastChild.style.borderBottom = 'none';
        }
      }
      
      card.appendChild(body);
      
      // Click event to switch back to Tab 1 (Grid view)
      card.addEventListener('click', () => {
        activeFormationIdx = idx;
        updateFormationControls();
        drawLocalGridPath();
        
        // Highlight active step card in Tab 2
        document.querySelectorAll('.action-hint-step-card').forEach((c, cIdx) => {
          c.classList.toggle('active-step-card', cIdx === idx);
        });
        
        // Switch to grid tab
        const tabGrid = document.querySelector('.mobile-tab-btn[data-tab="localGrid"]');
        if (tabGrid) tabGrid.click();
      });
      
      actionHintsFlow.appendChild(card);
    });
  }

  // Get base64 representation of an HTML image element
  function getBase64FromImageEl(imgEl) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgEl.naturalWidth || imgEl.width || 44;
      canvas.height = imgEl.naturalHeight || imgEl.height || 44;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0);
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Error getting base64 from image element', e);
      return imgEl.src;
    }
  }

  // Convert SVG element to Canvas and return PNG base64 Data URL
  function convertSvgToPngDataUrl(svgEl, stepName = '') {
    return new Promise((resolve, reject) => {
      try {
        const clonedSvg = svgEl.cloneNode(true);
        clonedSvg.setAttribute('viewBox', '0 0 360 360');
        
        // 1. Convert relative images inside SVG to base64
        const images = clonedSvg.querySelectorAll('image');
        images.forEach(img => {
          const href = img.getAttribute('href') || img.getAttribute('xlink:href');
          if (href && !href.startsWith('data:')) {
            const filename = href.split('/').pop();
            const key = filename.split('_')[0];
            const cardImg = document.querySelector(`#card-${key} img.landmark-sticker-img`);
            if (cardImg) {
              const base64 = getBase64FromImageEl(cardImg);
              img.setAttribute('href', base64);
              img.removeAttribute('xlink:href');
            }
          }
        });
        
        // 2. Inject style sheet rules
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = `
          svg {
            background-color: #ffffff;
          }
          .grid-lines line {
            stroke: rgba(15, 23, 42, 0.06);
            stroke-width: 0.5px;
          }
          .grid-lines line.axis {
            stroke: rgba(15, 23, 42, 0.2);
            stroke-width: 1px;
          }
          .grid-lines text {
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 8px;
            fill: rgba(15, 23, 42, 0.65);
            text-anchor: middle;
          }
          .stage-watermark .watermark-bg {
            fill: #fef08a;
            stroke: none;
          }
          .stage-watermark .watermark-line {
            fill: none;
            stroke: #94a3b8;
            stroke-width: 0.75px;
          }
          .stage-watermark .watermark-line-accent {
            fill: none;
            stroke: #475569;
            stroke-width: 1.25px;
          }
          .stage-watermark .watermark-line-yellow {
            fill: none;
            stroke: #d97706;
            stroke-width: 0.75px;
          }
          .stage-watermark .watermark-rect {
            fill: #fde047;
            stroke: #475569;
            stroke-width: 1.25px;
          }
          .stage-watermark .watermark-text {
            fill: #0f172a;
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 8px;
            font-weight: bold;
            text-anchor: middle;
          }
          .local-path-line {
            fill: none;
            stroke: url(#local-path-grad);
            stroke-width: 1.4px;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 4.8, 3.2;
          }
          .local-path-line-static {
            fill: none;
            stroke: #0284c7;
            stroke-width: 1.05px;
            stroke-linecap: round;
            stroke-linejoin: round;
            opacity: 0.55;
          }
          .path-node-glow {
            opacity: 0.3;
          }
          .path-node-glow.glow-basic {
            fill: #ef4444;
          }
          .path-node-glow.glow-prev {
            fill: #0284c7;
          }
          .path-node-glow.glow-current {
            fill: #ef4444;
            opacity: 0.5;
          }
          .svg-sticker-image {
            filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));
          }
          .path-label-bg {
            fill: rgba(8, 12, 20, 0.9);
            stroke: rgba(255, 255, 255, 0.08);
            stroke-width: 0.5px;
            rx: 1.2px;
          }
          .path-label-bg.bg-current {
            fill: rgba(15, 23, 42, 0.95);
            stroke: rgba(239, 68, 68, 0.3);
            stroke-width: 0.75px;
          }
          .path-label-text {
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 4.69px;
            font-weight: 700;
            fill: #f8fafc;
            text-anchor: middle;
          }
          .path-label-text.label-current {
            fill: #ef4444;
            font-weight: 800;
          }
          .path-label-text.label-prev {
            fill: #38bdf8;
          }
          .sticker-coord-text {
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 5.2px;
            font-weight: bold;
            fill: #000000;
            text-anchor: middle;
          }
          .svg-pdf-title-text {
            font-family: 'Outfit', 'Noto Sans TC', -apple-system, sans-serif;
            font-size: 15px;
            font-weight: bold;
            fill: #0f172a;
            text-anchor: middle;
          }
        `;
        clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);
        
        // 2.5. Inject step name title if provided
        if (stepName) {
          const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          titleText.setAttribute('x', '180');
          titleText.setAttribute('y', '20');
          titleText.setAttribute('text-anchor', 'middle');
          titleText.setAttribute('class', 'svg-pdf-title-text');
          titleText.textContent = stepName;
          clonedSvg.appendChild(titleText);
        }
        
        // 3. Serialize to XML string
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(clonedSvg);
        
        // 4. Create blob url
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        
        // 5. Draw onto a Canvas
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 720;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');
            
            // Fill solid white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 720, 720);
            
            // Draw SVG
            ctx.drawImage(img, 0, 0, 720, 720);
            
            // Clean URL
            URL.revokeObjectURL(blobURL);
            
            const pngURL = canvas.toDataURL('image/png');
            resolve(pngURL);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(blobURL);
          reject(err);
        };
        img.src = blobURL;
      } catch (err) {
        reject(err);
      }
    });
  }

  // Preload an image from src url
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Wrap canvas text to wrap Chinese lines nicely
  function wrapCanvasText(ctx, text, maxWidth) {
    if (!text) return [];
    const paragraphs = text.split('\n');
    const allLines = [];
    
    paragraphs.forEach(p => {
      const chars = p.split('');
      let currentLine = '';
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
          allLines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        allLines.push(currentLine);
      }
    });
    
    return allLines;
  }

  // Helper to create a new canvas page with title, metadata, and table header
  function createPageCanvas(titleText, metadataText) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1697;
    const ctx = canvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 1697);
    
    // Set standard font settings
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    
    // Draw Title (Centered)
    ctx.save();
    ctx.fillStyle = '#1e3a8a'; // Dark Blue
    ctx.font = "bold 30px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(titleText, 600, 50);
    ctx.restore();
    
    // Draw Metadata (Centered)
    ctx.save();
    ctx.fillStyle = '#475569'; // Slate-600
    ctx.font = "18px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(metadataText, 600, 95);
    ctx.restore();
    
    // Draw table header
    const headerY = 135;
    const headerH = 45;
    ctx.fillStyle = '#f1f5f9'; // Light gray
    ctx.fillRect(40, headerY, 1120, headerH);
    
    // Header border box
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, headerY, 1120, headerH);
    
    // Column dividers for header
    const cols = [40, 200, 340, 960, 1160];
    ctx.beginPath();
    for (let i = 1; i < cols.length - 1; i++) {
      ctx.moveTo(cols[i], headerY);
      ctx.lineTo(cols[i], headerY + headerH);
    }
    ctx.stroke();
    
    // Header labels
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.font = "bold 16px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('跑位定點', 120, headerY + headerH / 2);
    ctx.fillText('專屬地標', 270, headerY + headerH / 2);
    ctx.fillText('演繹內容', 650, headerY + headerH / 2);
    ctx.fillText('網格定位', 1060, headerY + headerH / 2);
    ctx.restore();
    
    return { canvas, ctx, currentY: 180 };
  }

  // Draw table lines at the end of drawing a page
  function drawTableGridLines(ctx, endY) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    
    // Draw bottom horizontal line
    ctx.beginPath();
    ctx.moveTo(40, endY);
    ctx.lineTo(1160, endY);
    ctx.stroke();
    
    // Draw outer box
    ctx.strokeRect(40, 135, 1120, endY - 135);
    
    // Draw vertical column lines
    const cols = [40, 200, 340, 960, 1160];
    ctx.beginPath();
    for (let i = 1; i < cols.length - 1; i++) {
      ctx.moveTo(cols[i], 135);
      ctx.lineTo(cols[i], endY);
    }
    ctx.stroke();
  }

  // Draw action hints and inline images inside the text cell
  function drawTextCell(ctx, items, x, y, width, isPreflight, preloadedImages) {
    let currY = y + 15;
    
    items.forEach((item, itemIdx) => {
      // Draw item title (e.g. "1.序，甲45度→乙")
      ctx.save();
      ctx.font = "bold 14px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
      ctx.fillStyle = '#1e3a8a';
      ctx.textBaseline = 'top';
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
      
      // Draw details (lyrics & sub-actions)
      ctx.save();
      ctx.font = "500 13px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
      ctx.fillStyle = '#333333';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      
      item.details.forEach(detail => {
        if (detail.type === 'text') {
          const lines = wrapCanvasText(ctx, detail.content, width);
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
            // Scale image to fit within width (max width 280px)
            const maxImgW = 280;
            let imgW = img.width;
            let imgH = img.height;
            if (imgW > maxImgW) {
              imgH = (maxImgW / imgW) * imgH;
              imgW = maxImgW;
            }
            
            if (!isPreflight) {
              // Center image horizontally in Column 2 width
              const imgX = x + (width - imgW) / 2;
              ctx.drawImage(img, imgX, currY, imgW, imgH);
            }
            currY += imgH + 10;
          }
        }
      });
      ctx.restore();
      
      // Spacer between items
      if (itemIdx < items.length - 1) {
        currY += 8;
      }
    });
    
    return currY - y + 15;
  }

  // Generate and download a unified positioning table PDF
  async function downloadPerformerTablePdf(btnElement) {
    if (!currentPerformer) return;
    
    // Disable button and show loader
    btnElement.disabled = true;
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 產出中...`;
    
    try {
      const fields = getPerformerFields(currentPerformer);
      const titleText = "大巨蛋演繹個人跑位定位表";
      const metadataText = `姓名：${currentDisplayName || '無'}      身分：${currentPerformer.category || '無'}      起點座標：${fields.coordinate}`;
      
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      // Preload all grid images (render from SVG previews in modalBody)
      const gridImages = [];
      for (let idx = 0; idx < formations.length; idx++) {
        const card = document.getElementById('modalBody').children[idx];
        if (card) {
          const svg = card.querySelector('svg');
          if (svg) {
            const pngDataUrl = await convertSvgToPngDataUrl(svg, null);
            const img = await loadImage(pngDataUrl);
            gridImages.push(img);
          } else {
            gridImages.push(null);
          }
        } else {
          gridImages.push(null);
        }
      }
      
      // Preload all action hint images
      const hintImages = {};
      for (let idx = 0; idx < formations.length; idx++) {
        const f = formations[idx];
        const items = getActionHintsForPerformer(currentPerformer, f.key);
        for (const item of items) {
          for (const detail of item.details) {
            if (detail.type === 'image' && !hintImages[detail.src]) {
              const img = await loadImage(detail.src);
              hintImages[detail.src] = img;
            }
          }
        }
      }

      // Preload all sticker images
      const stickerImages = {};
      for (let idx = 0; idx < formations.length; idx++) {
        const f = formations[idx];
        const displayType = getDisplayType(f.key);
        const src = `images/stickers/${displayType}_${getEnglishCategory(currentPerformer.category)}.png`;
        const img = await loadImage(src);
        if (img) {
          stickerImages[f.key] = img;
        }
      }
      
      // Canvas pages list
      const pdfPages = [];
      
      // Initialize first page
      let page = createPageCanvas(titleText, metadataText);
      pdfPages.push(page);
      
      // Draw rows
      for (let idx = 0; idx < formations.length; idx++) {
        const f = formations[idx];
        const coord = getFormationCoordStr(currentPerformer, f.key) || '無';
        const items = getActionHintsForPerformer(currentPerformer, f.key);
        
        // Pre-calculate text height in Column 2
        page.ctx.save();
        page.ctx.font = "500 13px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
        page.ctx.textBaseline = 'top';
        page.ctx.textAlign = 'left';
        const textCellHeight = drawTextCell(page.ctx, items, 355, 0, 590, true, hintImages);
        page.ctx.restore();
        
        // Grid image height is 170px, so min row height is 190px
        const rowH = Math.max(190, textCellHeight);
        
        // Check for page overflow
        if (page.currentY + rowH > 1580) {
          // Close guidelines on current page
          drawTableGridLines(page.ctx, page.currentY);
          
          // Create new page
          page = createPageCanvas(titleText, metadataText);
          pdfPages.push(page);
        }
        
        const rowY = page.currentY;
        
        // 1. Column 0 (跑位定點)
        page.ctx.save();
        page.ctx.font = "bold 15px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
        page.ctx.fillStyle = '#0f172a';
        page.ctx.textAlign = 'center';
        page.ctx.textBaseline = 'middle';
        const stepNum = String(idx + 1).padStart(2, '0');
        page.ctx.fillText(`${stepNum}.${f.label}`, 120, rowY + rowH / 2);
        page.ctx.restore();
        
        // 2. Column 1 (專屬地標)
        page.ctx.save();
        const stickerImg = stickerImages[f.key];
        const stickerSize = 65;
        const col1CenterX = 270;
        const contentH = 85; // combination of sticker (65px) + text (20px)
        const startY = rowY + (rowH - contentH) / 2;
        
        if (stickerImg) {
          page.ctx.drawImage(stickerImg, col1CenterX - stickerSize / 2, startY, stickerSize, stickerSize);
          
          // If basic formation or humanities1, draw the green/red coordinate overlay
          if (f.key === 'basic' || f.key === 'humanities1') {
            page.ctx.save();
            const isCatA = currentPerformer.category.startsWith('A');
            const overlayColor = isCatA ? '#e65537' : '#7dbf32';
            
            const overlayCenterX = col1CenterX;
            const overlayCenterY = startY + stickerSize / 2;
            const overlayRadius = 24;
            
            // Draw filled circle
            page.ctx.beginPath();
            page.ctx.arc(overlayCenterX, overlayCenterY, overlayRadius, 0, 2 * Math.PI);
            page.ctx.fillStyle = overlayColor;
            page.ctx.fill();
            
            // Draw coordinate text split in half
            const coordVal = fields.coordinate;
            const parts = coordVal.split('-');
            if (parts.length === 2) {
              const topPart = parts[0].padStart(2, '0');
              const bottomPart = parts[1].padStart(2, '0');
              
              page.ctx.fillStyle = '#ffffff';
              page.ctx.font = "bold 13px sans-serif";
              page.ctx.textAlign = 'center';
              
              // Top text
              page.ctx.textBaseline = 'bottom';
              page.ctx.fillText(topPart, overlayCenterX, overlayCenterY - 1);
              
              // Middle line
              page.ctx.strokeStyle = '#ffffff';
              page.ctx.lineWidth = 1;
              page.ctx.beginPath();
              page.ctx.moveTo(overlayCenterX - 14, overlayCenterY);
              page.ctx.lineTo(overlayCenterX + 14, overlayCenterY);
              page.ctx.stroke();
              
              // Bottom text
              page.ctx.textBaseline = 'top';
              page.ctx.fillText(bottomPart, overlayCenterX, overlayCenterY + 1);
            } else {
              page.ctx.fillStyle = '#ffffff';
              page.ctx.font = "bold 13px sans-serif";
              page.ctx.textAlign = 'center';
              page.ctx.textBaseline = 'middle';
              page.ctx.fillText(coordVal.padStart(2, '0'), overlayCenterX, overlayCenterY);
            }
            page.ctx.restore();
          }
        }
        
        // Draw the coordinate text below the sticker
        page.ctx.fillStyle = '#475569';
        page.ctx.font = "bold 12px 'Noto Sans TC', 'PingFang TC', sans-serif";
        page.ctx.textAlign = 'center';
        page.ctx.textBaseline = 'top';
        page.ctx.fillText(coord, col1CenterX, startY + stickerSize + 6);
        page.ctx.restore();
        
        // 3. Column 2 (演繹內容)
        page.ctx.save();
        page.ctx.textBaseline = 'top';
        page.ctx.textAlign = 'left';
        drawTextCell(page.ctx, items, 355, rowY, 590, false, hintImages);
        page.ctx.restore();
        
        // 4. Column 3 (網格定位)
        const gridImg = gridImages[idx];
        if (gridImg) {
          const imgSize = 170;
          const imgX = 960 + (200 - imgSize) / 2;
          const imgY = rowY + (rowH - imgSize) / 2;
          page.ctx.drawImage(gridImg, imgX, imgY, imgSize, imgSize);
        }
        
        // Draw dividing horizontal line
        page.ctx.strokeStyle = '#cbd5e1';
        page.ctx.lineWidth = 1.0;
        page.ctx.beginPath();
        page.ctx.moveTo(40, rowY + rowH);
        page.ctx.lineTo(1160, rowY + rowH);
        page.ctx.stroke();
        
        page.currentY += rowH;
      }
      
      // Close last page table guidelines
      drawTableGridLines(page.ctx, page.currentY);
      
      // Render all pages to the PDF document
      for (let pIdx = 0; pIdx < pdfPages.length; pIdx++) {
        const p = pdfPages[pIdx];
        if (pIdx > 0) {
          pdf.addPage();
        }
        const pageImgData = p.canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(pageImgData, 'JPEG', 0, 0, 595, 842);
      }
      
      const filename = `${currentDisplayName || fields.coordinate}_${fields.coordinate}_個人定位表.pdf`;
      pdf.save(filename);
      btnElement.innerHTML = `<i class="fa-solid fa-check"></i> 下載成功`;
    } catch (err) {
      console.error(err);
      btnElement.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> 錯誤`;
    }
    
    setTimeout(() => {
      btnElement.disabled = false;
      btnElement.innerHTML = originalHtml;
    }, 2000);
  }

  // Setup Download & Modal Event Listeners
  function setupDownloadListeners() {
    const viewAllMapsBtn = document.getElementById('viewAllMapsBtn');
    const allMapsModal = document.getElementById('allMapsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    // 1. Open Modal & render previews
    viewAllMapsBtn.addEventListener('click', () => {
      if (!currentPerformer) return;
      const fields = getPerformerFields(currentPerformer);
      
      modalTitle.textContent = `${currentDisplayName || fields.coordinate} (${fields.coordinate}) - 個人定位表`;
      modalBody.innerHTML = '';
      
      // Render previews inside modal
      formations.forEach((f, idx) => {
        const card = document.createElement('div');
        card.className = 'modal-map-card';
        
        const title = document.createElement('div');
        title.className = 'modal-map-title';
        title.textContent = `${String(idx + 1).padStart(2, '0')}. ${f.name}`;
        
        const previewDiv = document.createElement('div');
        previewDiv.className = 'modal-map-preview';
        
        // Clone main SVG structure
        const previewSvg = document.getElementById('localGridSvg').cloneNode(true);
        previewSvg.setAttribute('viewBox', '0 0 360 360');
        previewSvg.removeAttribute('id');
        previewSvg.setAttribute('style', 'pointer-events: none;');
        previewSvg.querySelector('.grid-lines').innerHTML = '';
        previewSvg.querySelector('.stage-watermark').innerHTML = '';
        previewSvg.querySelector('#localPathSegments').innerHTML = '';
        previewSvg.querySelector('#localPathPoints').innerHTML = '';
        
        // Render into clone SVG
        drawLocalGridPath(previewSvg, idx);
        
        previewDiv.appendChild(previewSvg);
        
        // Download button
        const dlBtn = document.createElement('button');
        dlBtn.className = 'control-btn modal-map-btn';
        dlBtn.innerHTML = `<i class="fa-solid fa-download"></i> 下載定位表`;
        dlBtn.addEventListener('click', () => {
          downloadPerformerTablePdf(dlBtn);
        });
        
        card.appendChild(title);
        card.appendChild(previewDiv);
        card.appendChild(dlBtn);
        modalBody.appendChild(card);
      });
      
      allMapsModal.style.display = 'flex';
    });

    // 3. Close Modal
    closeModalBtn.addEventListener('click', () => {
      allMapsModal.style.display = 'none';
    });
    
    // Close modal on click outside container
    allMapsModal.addEventListener('click', (e) => {
      if (e.target === allMapsModal) {
        allMapsModal.style.display = 'none';
      }
    });

    // 4. Download unified positioning table PDF
    downloadAllBtn.addEventListener('click', async () => {
      downloadPerformerTablePdf(downloadAllBtn);
    });
  }

  // Update viewBox of SVG based on zoom and pan offsets
  function updateSvgViewBox(svgEl) {
    if (!svgEl) return;
    const w = 360 / zoomLevel;
    const h = 360 / zoomLevel;
    const x = 180 - (180 / zoomLevel) + panX;
    const y = 180 - (180 / zoomLevel) + panY;
    svgEl.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);

    // Update the position of the legend line if it exists (so it remains static in viewport)
    const legendLine = svgEl.querySelector('#nextPointGuideLegendLine');
    if (legendLine) {
      const isWest = (selectedTeam === 'west');
      let x1, x2;
      if (isWest) {
        x1 = x + (15 / zoomLevel);
        x2 = x1 + (100 / zoomLevel);
      } else {
        x2 = (x + w) - (15 / zoomLevel);
        x1 = x2 - (100 / zoomLevel);
      }
      const yVal = (y + h) - (15 / zoomLevel);
      const thickness = 5.5 / zoomLevel;
      
      legendLine.setAttribute('x1', String(x1));
      legendLine.setAttribute('y1', String(yVal));
      legendLine.setAttribute('x2', String(x2));
      legendLine.setAttribute('y2', String(yVal));
      legendLine.setAttribute('stroke-width', `${thickness}px`);
      
      const currentColor = legendLine.getAttribute('stroke') || '#fbbf24';
      legendLine.setAttribute('style', `stroke: ${currentColor} !important; stroke-width: ${thickness}px !important; stroke-linecap: round !important;`);
    }
  }

  // Apply rotation transform to local grid content group
  function applyRotation() {
    const contentEl = document.getElementById('localGridContent');
    if (contentEl) {
      contentEl.setAttribute('transform', `rotate(${rotationAngle}, 180, 180)`);
    }
  }

  // Reset zoom, pan, and rotation variables and update
  function resetZoomAndPan() {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    rotationAngle = 0;
    const svgEl = document.getElementById('localGridSvg');
    updateSvgViewBox(svgEl);
    applyRotation();
  }

  // Bind zoom and pan controls and drag/swipe handlers
  function setupZoomAndPan() {
    const svgEl = document.getElementById('localGridSvg');
    const wrapper = svgEl.parentElement; // .svg-wrapper
    
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const rotateCcwBtn = document.getElementById('rotateCcwBtn');
    const rotateCwBtn = document.getElementById('rotateCwBtn');
    
    // Zoom In
    zoomInBtn.addEventListener('click', () => {
      zoomLevel = Math.min(zoomLevel * 1.25, 5.0);
      updateSvgViewBox(svgEl);
    });
    
    // Zoom Out
    zoomOutBtn.addEventListener('click', () => {
      zoomLevel = Math.max(zoomLevel / 1.25, 0.5);
      updateSvgViewBox(svgEl);
    });
    
    // Zoom Reset
    zoomResetBtn.addEventListener('click', () => {
      resetZoomAndPan();
    });

    // Rotate CCW
    if (rotateCcwBtn) {
      rotateCcwBtn.addEventListener('click', () => {
        rotationAngle = (rotationAngle - 45) % 360;
        applyRotation();
      });
    }

    // Rotate CW
    if (rotateCwBtn) {
      rotateCwBtn.addEventListener('click', () => {
        rotationAngle = (rotationAngle + 45) % 360;
        applyRotation();
      });
    }
    
    // Drag/Pan & Pinch/Zoom Logic
    let isDragging = false;
    let isPinching = false;
    let startTouchDist = 0;
    let startZoomLevel = 1.0;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;
    
    function startDrag(e) {
      if (e.touches && e.touches.length === 2) {
        isDragging = false;
        isPinching = true;
        startTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        startZoomLevel = zoomLevel;
        return;
      }
      
      if (zoomLevel <= 1.0) return;
      
      // Disable dragging if starting on a landmark node
      if (e.target.closest('.path-point')) return;
      
      isDragging = true;
      svgEl.classList.add('dragging');
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      startX = clientX;
      startY = clientY;
      startPanX = panX;
      startPanY = panY;
    }
    
    function moveDrag(e) {
      if (e.touches && e.touches.length === 2) {
        if (!isPinching) {
          isDragging = false;
          isPinching = true;
          startTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          startZoomLevel = zoomLevel;
        } else {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (startTouchDist > 0) {
            const ratio = dist / startTouchDist;
            zoomLevel = Math.max(0.5, Math.min(startZoomLevel * ratio, 5.0));
            updateSvgViewBox(svgEl);
          }
        }
        if (e.cancelable) {
          e.preventDefault();
        }
        return;
      }

      if (!isDragging) return;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const dx = clientX - startX;
      const dy = clientY - startY;
      
      const displayWidth = wrapper.clientWidth || 320;
      const displayHeight = wrapper.clientHeight || 320;
      
      panX = startPanX - (dx * (360 / zoomLevel) / displayWidth);
      panY = startPanY - (dy * (360 / zoomLevel) / displayHeight);
      
      updateSvgViewBox(svgEl);
      
      if (e.cancelable) {
        e.preventDefault();
      }
    }
    
    function endDrag(e) {
      if (e && e.touches && e.touches.length > 0) {
        if (e.touches.length < 2) {
          isPinching = false;
          startTouchDist = 0;
        }
      } else {
        isDragging = false;
        isPinching = false;
        startTouchDist = 0;
        svgEl.classList.remove('dragging');
      }
    }
    
    // Mouse Event Listeners
    svgEl.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);
    
    // Touch Event Listeners (mobile)
    svgEl.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('touchend', endDrag);

    // Swipe gestures on SVG wrapper to switch steps
    let swipeStartX = 0;
    let swipeStartY = 0;
    
    wrapper.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
      }
    }, { passive: true });
    
    wrapper.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - swipeStartX;
        const deltaY = e.changedTouches[0].clientY - swipeStartY;
        
        // Check if it's a horizontal swipe and map is NOT zoomed in
        if (zoomLevel <= 1.0 && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 60) {
          if (deltaX < 0) {
            // Swipe Left -> Next step
            if (activeFormationIdx < formations.length - 1) {
              activeFormationIdx++;
              updateFormationControls();
              drawLocalGridPath();
            }
          } else {
            // Swipe Right -> Prev step
            if (activeFormationIdx > 0) {
              activeFormationIdx--;
              updateFormationControls();
              drawLocalGridPath();
            }
          }
        }
      }
    }, { passive: true });
  }

  // Define floating action hints modal initialization (Disabled/replaced by inline hints)
  function setupActionHintsOverlay() {
    // Replaced by inline action hints container, no floating modal needed.
  }

  // Set up pinch to zoom for action hints containers
  function setupActionHintsZoom() {
    const containers = [
      document.getElementById('actionHintsFlow'),
      document.getElementById('inlineActionHints')
    ].filter(Boolean);
    
    let currentScale = parseFloat(localStorage.getItem('actionHintsScale') || '1.0');
    
    function applyScale(scale) {
      document.documentElement.style.setProperty('--hints-scale', scale);
    }
    
    applyScale(currentScale);
    
    containers.forEach(container => {
      let isPinching = false;
      let startTouchDist = 0;
      let startScale = 1.0;
      
      container.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 2) {
          isPinching = true;
          startTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          startScale = currentScale;
        }
      }, { passive: true });
      
      container.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches && e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (startTouchDist > 0) {
            const ratio = dist / startTouchDist;
            currentScale = Math.max(0.8, Math.min(startScale * ratio, 2.5));
            applyScale(currentScale);
            localStorage.setItem('actionHintsScale', currentScale.toString());
          }
        }
      }, { passive: true });
      
      container.addEventListener('touchend', (e) => {
        if (isPinching && (!e.touches || e.touches.length < 2)) {
          isPinching = false;
        }
      });
    });
  }

  // Update inline action hints based on current step & performer
  function updateActionHintsDisplay() {
    const inlineContainer = document.getElementById('inlineActionHints');
    if (!inlineContainer || !currentPerformer) return;
    
    const f = formations[activeFormationIdx];
    const items = getActionHintsForPerformer(currentPerformer, f.key);
    
    if (items.length === 0) {
      inlineContainer.innerHTML = `
        <div class="hint-title">
          <span><i class="fa-solid fa-person-running"></i> 演繹內容 (${f.label})</span>
        </div>
        <div class="no-hints">此步驟無演繹內容</div>
      `;
      return;
    }
    
    // Header title and toggle button
    let headerHtml = `
      <div class="hint-title">
        <span><i class="fa-solid fa-person-running"></i> 演繹內容 (${f.label})</span>
    `;
    if (items.length > 2) {
      headerHtml += `<button id="toggleHintsBtn" class="toggle-btn">${hintsExpanded ? '收合部分' : '展開更多'}</button>`;
    }
    headerHtml += `</div>`;
    
    // Hints list body
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'hints-body-list';
    
    const visibleCount = hintsExpanded ? items.length : Math.min(2, items.length);
    for (let i = 0; i < visibleCount; i++) {
      const item = items[i];
      const itemDiv = document.createElement('div');
      itemDiv.className = 'action-hint-item';
      
      const itemTitle = document.createElement('div');
      itemTitle.style.cssText = 'font-weight: bold; color: #b45309; font-size: calc(13.5px * var(--hints-scale, 1)); margin-bottom: 6px;';
      itemTitle.textContent = item.title;
      itemDiv.appendChild(itemTitle);
      
      item.details.forEach(detail => {
        if (detail.type === 'text') {
          const ytId = getYouTubeVideoId(detail.content);
          if (ytId) {
            const btn = document.createElement('a');
            btn.className = 'yt-hint-btn';
            btn.href = 'javascript:void(0);';
            btn.innerHTML = '<i class="fa-brands fa-youtube yt-icon"></i> 播放提示影片';
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              openYouTubeVideo(ytId, detail.content);
            });
            itemDiv.appendChild(btn);
          } else {
            const p = document.createElement('p');
            p.style.cssText = 'margin: 0 0 4px 0; color: #1e293b; font-size: calc(13px * var(--hints-scale, 1)); font-weight: 500; line-height: 1.45;';
            p.textContent = detail.content;
            itemDiv.appendChild(p);
          }
        } else if (detail.type === 'image') {
          const img = document.createElement('img');
          img.src = detail.src;
          img.style.cssText = 'width: calc(100% * var(--hints-scale, 1)); max-width: none; height: auto; display: block; border-radius: 8px; margin: 8px 0; border: 1px solid rgba(180, 83, 9, 0.15);';
          img.className = 'hint-image';
          itemDiv.appendChild(img);
        }
      });
      bodyContainer.appendChild(itemDiv);
    }
    
    if (items.length > 2 && !hintsExpanded) {
      const moreDiv = document.createElement('div');
      moreDiv.style.cssText = 'color: #64748b; font-style: italic; text-align: center; font-size: calc(12px * var(--hints-scale, 1)); padding: 6px 0; cursor: pointer;';
      moreDiv.textContent = `...還有 ${items.length - 2} 項提示，點擊上方展開`;
      moreDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        hintsExpanded = true;
        updateActionHintsDisplay();
      });
      bodyContainer.appendChild(moreDiv);
    }
    
    inlineContainer.innerHTML = '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = headerHtml;
    inlineContainer.appendChild(tempDiv.firstElementChild);
    inlineContainer.appendChild(bodyContainer);
    
    // Add event listener to toggle button
    const toggleBtn = document.getElementById('toggleHintsBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hintsExpanded = !hintsExpanded;
        updateActionHintsDisplay();
      });
    }
  }

  // ── Setup Admin Panel Listeners ────────────────────────────────────
  function setupAdminListeners() {
    const adminBtn = document.getElementById('adminBtn');
    const adminModal = document.getElementById('adminModal');
    const closeAdminModalBtn = document.getElementById('closeAdminModalBtn');
    const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
    const adminTabPanels = document.querySelectorAll('.admin-tab-panel');
    const adminMessage = document.getElementById('adminMessage');
    
    // Auth UI Elements
    const adminAuthScreen = document.getElementById('adminAuthScreen');
    const adminMainContent = document.getElementById('adminMainContent');
    const adminPasswordInput = document.getElementById('adminPassword');
    const verifyAdminPasswordBtn = document.getElementById('verifyAdminPasswordBtn');
    
    let isAuthed = false;
    let currentAdminPassword = '';
    let hasModified = false;

    // Forms
    const dayperformerForm = document.getElementById('dayperformerForm');
    const performerForm = document.getElementById('performerForm');
    
    // Helper to show messages
    function showMsg(text, type) {
      adminMessage.textContent = text;
      adminMessage.className = `admin-msg-box ${type}`;
      adminMessage.style.display = 'block';
    }
    
    function clearMsg() {
      adminMessage.style.display = 'none';
      adminMessage.className = 'admin-msg-box';
      adminMessage.textContent = '';
    }

    if (!adminBtn || !adminModal) return;

    // Logo click counter to show Admin button
    const sessionLogo = document.getElementById('sessionLogo');
    if (sessionLogo) {
      let clickCount = 0;
      sessionLogo.addEventListener('click', () => {
        clickCount++;
        if (clickCount >= 10) {
          adminBtn.style.display = 'flex';
        }
      });
    }

    // Open Admin Modal
    adminBtn.addEventListener('click', () => {
      clearMsg();
      hasModified = false;
      const finishBtn = document.getElementById('adminFinishBtn');
      if (finishBtn) finishBtn.style.display = 'none';
      
      // Reset Auth Screen state
      isAuthed = false;
      adminPasswordInput.value = '';
      adminAuthScreen.style.display = 'flex';
      adminMainContent.style.display = 'none';

      // Pre-fill if we have an active performer currently queried on screen
      if (currentPerformer) {
        document.getElementById('adminDayId').value = currentPerformer.id;
        document.getElementById('adminId').value = currentPerformer.id;
        
        // Auto-query performer coords too
        document.getElementById('adminCircle').value = currentPerformer.circle || '';
        document.getElementById('adminXingYuan').value = currentPerformer.xingYuan || '';
        document.getElementById('adminMiLuo').value = currentPerformer.miLuo || '';
        document.getElementById('adminJingSi').value = currentPerformer.jingSi || '';
        document.getElementById('adminLamp').value = currentPerformer.lamp || '';
        document.getElementById('adminNoBoat').value = currentPerformer.noBoat || '';
        document.getElementById('adminBigV').value = currentPerformer.bigV || '';
        document.getElementById('adminDaChuanShi').value = currentPerformer.daChuanShi || '';
        document.getElementById('adminBoneDonation').value = currentPerformer.boneDonation || '';
        document.getElementById('adminEdu').value = currentPerformer.edu || '';
        document.getElementById('adminHumanities1').value = currentPerformer.id;
        document.getElementById('adminHumanities2').value = currentPerformer.humanities2 || '';
        document.getElementById('adminFiveContinents1').value = currentPerformer.fiveContinents1 || '';
        document.getElementById('adminFiveContinents2').value = currentPerformer.fiveContinents2 || '';
        document.getElementById('adminFlyingApsaras').value = currentPerformer.flyingApsaras || '';
      }
      adminModal.style.display = 'flex';
      adminPasswordInput.focus();
    });

    // Verify Password on UI
    function handlePasswordVerify() {
      clearMsg();
      const pwd = adminPasswordInput.value;
      if (pwd === 'tzuchi60' || pwd === 'tzuchi6060') {
        isAuthed = true;
        currentAdminPassword = pwd;
        adminAuthScreen.style.display = 'none';
        adminMainContent.style.display = 'flex';

        const adminTabs = document.querySelector('.admin-tabs');
        const performersTabBtn = document.querySelector('.admin-tab-btn[data-admin-tab="performers"]');
        const dayperformersTabBtn = document.querySelector('.admin-tab-btn[data-admin-tab="dayperformers"]');

        if (pwd === 'tzuchi60') {
          // Hide switcher (only modify names is allowed)
          if (adminTabs) adminTabs.style.display = 'none';
          if (dayperformersTabBtn) dayperformersTabBtn.click();
        } else {
          // Show switcher (both modify names & coordinates allowed)
          if (adminTabs) adminTabs.style.display = 'flex';
          if (performersTabBtn) performersTabBtn.style.display = '';
          if (dayperformersTabBtn) dayperformersTabBtn.click();
        }
      } else {
        showMsg('密碼錯誤，請重新輸入！', 'error');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
      }
    }

    verifyAdminPasswordBtn.addEventListener('click', handlePasswordVerify);
    adminPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handlePasswordVerify();
      }
    });

    // Close Admin Modal
    function closeAdminModal() {
      if (hasModified) {
        alert('修改作業已結束，網頁將自動重新整理以套用新資料！');
        window.location.reload();
      } else {
        adminModal.style.display = 'none';
      }
    }

    closeAdminModalBtn.addEventListener('click', closeAdminModal);

    // Disable click outside to close as per request
    // adminModal.addEventListener('click', (e) => {
    //   if (e.target === adminModal) {
    //     closeAdminModal();
    //   }
    // });

    const adminFinishBtn = document.getElementById('adminFinishBtn');
    if (adminFinishBtn) {
      adminFinishBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }

    // Switch Admin Tabs
    adminTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        clearMsg();
        adminTabBtns.forEach(b => b.classList.remove('active'));
        adminTabPanels.forEach(p => {
          p.classList.remove('active');
          p.style.display = 'none';
        });
        
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-admin-tab');
        const targetPanel = document.getElementById(`adminPanel-${targetTab}`);
        if (targetPanel) {
          targetPanel.classList.add('active');
          targetPanel.style.display = 'flex';
        }
      });
    });

    // Query Performer Name in Memory
    const queryDayPerformerBtn = document.getElementById('queryDayPerformerBtn');
    queryDayPerformerBtn.addEventListener('click', () => {
      clearMsg();
      const session = document.getElementById('adminDaySession').value;
      const team = document.getElementById('adminDayTeam').value;
      const enteredId = document.getElementById('adminDayId').value.trim();
      if (!enteredId) {
        showMsg('請輸入身分證編號後再進行查詢！', 'error');
        alert('請輸入身分證編號後再進行查詢！');
        return;
      }
      
      const list = DAY_PERFORMERS[session] || [];
      const p = list.find(x => x.id === enteredId && x.team === team);
      if (p) {
        document.getElementById('adminDayOldName').value = p.name || '';
        document.getElementById('adminDayName').value = p.name || '';
        showMsg(`查詢成功！目前儲存姓名為「${p.name}」`, 'success');
      } else {
        document.getElementById('adminDayOldName').value = '（查無資料）';
        document.getElementById('adminDayName').value = '';
        showMsg(`在此場次中找不到身分證為 "${enteredId}" 且屬於 "${team}" 的表演者姓名，您可以直接輸入並新增。`, 'error');
      }
    });

    // Query Performer Coordinates in Memory
    const queryPerformerBtn = document.getElementById('queryPerformerBtn');
    queryPerformerBtn.addEventListener('click', () => {
      clearMsg();
      const team = document.getElementById('adminTeam').value;
      const enteredId = document.getElementById('adminId').value.trim();
      if (!enteredId) {
        showMsg('請輸入身分證編號後再進行查詢！', 'error');
        alert('請輸入身分證編號後再進行查詢！');
        return;
      }
      
      const p = performersData.find(x => x.id === enteredId && x.team === team);
      if (p) {
        document.getElementById('adminCircle').value = p.circle || '';
        document.getElementById('adminXingYuan').value = p.xingYuan || '';
        document.getElementById('adminMiLuo').value = p.miLuo || '';
        document.getElementById('adminJingSi').value = p.jingSi || '';
        document.getElementById('adminLamp').value = p.lamp || '';
        document.getElementById('adminNoBoat').value = p.noBoat || '';
        document.getElementById('adminBigV').value = p.bigV || '';
        document.getElementById('adminDaChuanShi').value = p.daChuanShi || '';
        document.getElementById('adminBoneDonation').value = p.boneDonation || '';
        document.getElementById('adminEdu').value = p.edu || '';
        document.getElementById('adminHumanities1').value = p.id || '';
        document.getElementById('adminHumanities2').value = p.humanities2 || '';
        document.getElementById('adminFiveContinents1').value = p.fiveContinents1 || '';
        document.getElementById('adminFiveContinents2').value = p.fiveContinents2 || '';
        document.getElementById('adminFlyingApsaras').value = p.flyingApsaras || '';
        
        showMsg('已成功載入該表演者現有座標！', 'success');
      } else {
        document.getElementById('adminCircle').value = '';
        document.getElementById('adminXingYuan').value = '';
        document.getElementById('adminMiLuo').value = '';
        document.getElementById('adminJingSi').value = '';
        document.getElementById('adminLamp').value = '';
        document.getElementById('adminNoBoat').value = '';
        document.getElementById('adminBigV').value = '';
        document.getElementById('adminDaChuanShi').value = '';
        document.getElementById('adminBoneDonation').value = '';
        document.getElementById('adminEdu').value = '';
        document.getElementById('adminHumanities1').value = '';
        document.getElementById('adminHumanities2').value = '';
        document.getElementById('adminFiveContinents1').value = '';
        document.getElementById('adminFiveContinents2').value = '';
        document.getElementById('adminFlyingApsaras').value = '';
        showMsg(`找不到身分證編號為 "${enteredId}" 且屬於 "${team}" 的表演者！`, 'error');
      }
    });

    // Submit Dayperformer (Modify Name)
    dayperformerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearMsg();
      
      const session = document.getElementById('adminDaySession').value;
      const team = document.getElementById('adminDayTeam').value;
      const id = document.getElementById('adminDayId').value.trim();
      const name = document.getElementById('adminDayName').value.trim();
      
      const submitBtn = document.getElementById('submitDayBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = '儲存中...';

      fetch('/api/update-dayperformer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, id, name, team, password: currentAdminPassword })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          hasModified = true;
          const finishBtn = document.getElementById('adminFinishBtn');
          if (finishBtn) finishBtn.style.display = 'block';
          showMsg('姓名修改成功！您可以輸入新身份證編號繼續修改下一筆。全部修改完成後，請點選下方的「完成修改並重新整理」以套用變更。', 'success');
          alert('姓名修改成功！已可繼續修改下一筆。');
          submitBtn.disabled = false;
          submitBtn.textContent = '儲存修改';
          
          // Clear query fields to allow next edit easily
          document.getElementById('adminDayOldName').value = '尚未查詢';
          document.getElementById('adminDayName').value = '';
        } else {
          showMsg('錯誤: ' + (data.error || '未知錯誤'), 'error');
          alert('儲存失敗：' + (data.error || '未知錯誤'));
          submitBtn.disabled = false;
          submitBtn.textContent = '儲存修改';
        }
      })
      .catch(err => {
        showMsg('無法連線至後端伺服器！請確認伺服器正在運行中。', 'error');
        alert('儲存失敗：無法連線至伺服器！');
        submitBtn.disabled = false;
        submitBtn.textContent = '儲存修改';
      });
    });

    // Submit Performer (Modify Coordinates)
    performerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearMsg();
      
      const team = document.getElementById('adminTeam').value;
      const id = document.getElementById('adminId').value.trim();
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
      
      const submitBtn = document.getElementById('submitPerfBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = '儲存中...';

      fetch('/api/update-performer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, circle, xingYuan, miLuo, jingSi, lamp, noBoat, bigV, daChuanShi, boneDonation, edu, humanities2, fiveContinents1, fiveContinents2, flyingApsaras, team, password: currentAdminPassword })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          hasModified = true;
          const finishBtn = document.getElementById('adminFinishBtn');
          if (finishBtn) finishBtn.style.display = 'block';
          showMsg('座標修改成功！您可以輸入新身份證編號繼續修改下一筆。全部修改完成後，請點選下方的「完成修改並重新整理」以套用變更。', 'success');
          alert('座標修改成功！已可繼續修改下一筆。');
          submitBtn.disabled = false;
          submitBtn.textContent = '儲存座標修改';
        } else {
          showMsg('錯誤: ' + (data.error || '未知錯誤'), 'error');
          alert('儲存失敗：' + (data.error || '未知錯誤'));
          submitBtn.disabled = false;
          submitBtn.textContent = '儲存座標修改';
        }
      })
      .catch(err => {
        showMsg('無法連線至後端伺服器！請確認伺服器正在運行中。', 'error');
        alert('儲存失敗：無法連線至伺服器！');
        submitBtn.disabled = false;
        submitBtn.textContent = '儲存座標修改';
      });
    });
  }

  // Setup Admin Listeners
  setupAdminListeners();

  // Final sync check
  syncActiveCardAndStep();
});
