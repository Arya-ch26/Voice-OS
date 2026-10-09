// Voice OS Client Kernel

let highestZIndex = 200;
let windowOffsetCounter = 0;

/**
 * Returns a list of all currently open windows with their ids and titles.
 * @returns {Array<{ id: string, title: string }>}
 */
export function getOpenWindows() {
  const windows = [];
  document.querySelectorAll('.os-window-floating:not(.is-closing)').forEach(win => {
    const id = win.dataset.winId || win.id.replace(/^win-/, '');
    const titleEl = win.querySelector('.window-title-text');
    const title = titleEl ? titleEl.textContent.trim() : (win.dataset.title || 'Window');
    windows.push({ id, title });
  });
  return windows;
}

/**
 * Shows a friendly toast notification in the UI.
 * @param {string} message - Toast message text
 * @param {'error'|'warning'|'success'} type - Notification type
 * @param {string} [title] - Optional toast title
 */
export function showToast(message, type = 'error', title = 'Voice OS') {
  const container = document.getElementById('toastContainer') || document.body;
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;

  const icon = type === 'error' ? '⚠️' : (type === 'warning' ? '🔔' : '✨');

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close-btn" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close-btn');
  const dismiss = () => {
    if (toast.classList.contains('is-hiding')) return;
    toast.classList.add('is-hiding');
    setTimeout(() => toast.remove(), 220);
  };

  closeBtn.addEventListener('click', dismiss);
  container.appendChild(toast);

  // Auto-dismiss after 4.5 seconds
  setTimeout(dismiss, 4500);
}

/**
 * Shows or hides the taskbar thinking animation.
 * @param {boolean} isThinking
 */
export function setTaskbarThinking(isThinking) {
  const thinkingEl = document.getElementById('taskbarThinking');
  if (thinkingEl) {
    thinkingEl.style.display = isThinking ? 'flex' : 'none';
  }
}

/**
 * Bring a floating window to the front
 */
export function bringToFront(w) {
  if (!w) return;
  highestZIndex += 1;
  w.style.zIndex = highestZIndex;

  document.querySelectorAll('.os-window-floating').forEach(el => el.classList.remove('is-focused'));
  w.classList.add('is-focused');

  document.querySelectorAll('.taskbar-win-item').forEach(btn => btn.classList.remove('is-active'));
  const currBtn = document.getElementById(`taskbar-win-${w.dataset.winId}`);
  if (currBtn) {
    currBtn.classList.remove('is-minimized');
    currBtn.classList.add('is-active');
  }
}

/**
 * Minimize a window with animation and hide
 */
export function minimizeWindow(w) {
  if (!w || w.classList.contains('is-minimized') || w.classList.contains('is-minimizing')) return;
  w.classList.add('is-minimizing');
  w.classList.remove('is-focused');

  const currBtn = document.getElementById(`taskbar-win-${w.dataset.winId}`);
  if (currBtn) {
    currBtn.classList.remove('is-active');
    currBtn.classList.add('is-minimized');
  }

  setTimeout(() => {
    w.classList.remove('is-minimizing');
    w.classList.add('is-minimized');
  }, 180);
}

/**
 * Restore a window from minimized state
 */
export function restoreWindow(w) {
  if (!w) return;
  w.classList.remove('is-minimized');
  w.classList.add('is-restoring');

  const currBtn = document.getElementById(`taskbar-win-${w.dataset.winId}`);
  if (currBtn) {
    currBtn.classList.remove('is-minimized');
    currBtn.classList.add('is-active');
  }

  bringToFront(w);

  setTimeout(() => {
    w.classList.remove('is-restoring');
  }, 200);
}

/**
 * Maximize a window to fill the desktop workspace
 */
export function maximizeWindow(w) {
  if (!w || w.classList.contains('is-minimized') || w.classList.contains('is-closing')) return;
  if (w.classList.contains('is-maximized')) return;

  // Save current floating coordinates
  w.dataset.prevLeft = w.style.left || `${w.offsetLeft}px`;
  w.dataset.prevTop = w.style.top || `${w.offsetTop}px`;
  w.dataset.prevWidth = w.style.width || `${w.offsetWidth}px`;
  w.dataset.prevHeight = w.style.height || `${w.offsetHeight}px`;

  w.classList.add('is-maximized');
  w.classList.remove('is-restoring-bounds');

  // Fill workspace smoothly (leave top bar and bottom dock visible)
  w.style.left = '10px';
  w.style.top = '44px';
  w.style.width = 'calc(100vw - 20px)';
  w.style.height = 'calc(100vh - 44px - 72px)';

  // Update maximize button icon and tooltip
  const maxBtn = w.querySelector('.btn-max');
  if (maxBtn) {
    maxBtn.title = 'Restore Window';
    maxBtn.setAttribute('aria-label', 'Restore Window');
    maxBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3">
        <path d="M3 1.5h5.5v5.5H7v1.5H1.5V3H3V1.5z"/>
      </svg>
    `;
  }

  bringToFront(w);
}

/**
 * Restore window from maximized bounds to its previous floating geometry
 */
export function restoreMaximizedWindow(w) {
  if (!w || !w.classList.contains('is-maximized')) return;

  w.classList.remove('is-maximized');
  w.classList.add('is-restoring-bounds');

  const pLeft = w.dataset.prevLeft || '80px';
  const pTop = w.dataset.prevTop || '80px';
  const pWidth = w.dataset.prevWidth || '540px';
  const pHeight = w.dataset.prevHeight || '420px';

  w.style.left = pLeft;
  w.style.top = pTop;
  w.style.width = pWidth;
  w.style.height = pHeight;

  const maxBtn = w.querySelector('.btn-max');
  if (maxBtn) {
    maxBtn.title = 'Maximize Window';
    maxBtn.setAttribute('aria-label', 'Maximize Window');
    maxBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4">
        <rect x="1.5" y="1.5" width="7" height="7" rx="1"/>
      </svg>
    `;
  }

  setTimeout(() => {
    w.classList.remove('is-restoring-bounds');
  }, 260);

  bringToFront(w);
}

/**
 * Toggle maximize / restore
 */
export function toggleMaximizeWindow(w) {
  if (!w) return;
  if (w.classList.contains('is-maximized')) {
    restoreMaximizedWindow(w);
  } else {
    maximizeWindow(w);
  }
}

/**
 * Get native OS icon for a given window/app title
 */
function getAppIcon(rawTitle = '') {
  const t = (rawTitle || '').toLowerCase();
  if (t.includes('camera') || t.includes('photo')) return '📷';
  if (t.includes('gallery')) return '🖼️';
  if (t.includes('video') || t.includes('record')) return '📹';
  if (t.includes('file') || t.includes('explorer') || t.includes('document')) return '📁';
  if (t.includes('note') || t.includes('pad') || t.includes('text')) return '📝';
  if (t.includes('snake') || t.includes('game')) return '🐍';
  if (t.includes('analogue') || t.includes('analog')) return '🕒';
  if (t.includes('clock') || t.includes('time') || t.includes('timer')) return '⏱️';
  if (t.includes('weather')) return '🌤️';
  if (t.includes('calc') || t.includes('math')) return '🔢';
  if (t.includes('music') || t.includes('song') || t.includes('audio')) return '🎵';
  if (t.includes('wallpaper') || t.includes('theme') || t.includes('studio')) return '🎨';
  if (t.includes('task') || t.includes('system') || t.includes('manager')) return '⚡';
  if (t.includes('help')) return '🎙️';
  return '🪟';
}

/**
 * Close a window with scale and fade animation
 */
export function closeWindow(w) {
  if (!w || w.classList.contains('is-closing')) return;
  w.classList.add('is-closing');

  const currBtn = document.getElementById(`taskbar-win-${w.dataset.winId}`);
  if (currBtn) {
    currBtn.classList.add('is-closing');
    setTimeout(() => currBtn.remove(), 160);
  }

  setTimeout(() => {
    w.remove();
  }, 180);
}

/**
 * Creates a resizable floating window with sandboxed iframe, title bar controls,
 * and taskbar integration.
 */
export function createWindow(id, title, height, html) {
  const container = document.getElementById('desktopWindows') || document.body;
  const taskbarWindows = document.getElementById('taskbarWindows');
  const existingWin = document.getElementById(`win-${id}`);

  // Restore and bring to front if already exists
  if (existingWin) {
    if (existingWin.classList.contains('is-minimized')) {
      restoreWindow(existingWin);
    } else {
      bringToFront(existingWin);
    }
    if (html !== undefined) {
      const existingIframe = existingWin.querySelector('.window-iframe');
      if (existingIframe) existingIframe.srcdoc = html;
    }
    return existingWin;
  }

  // 1. Create Window Container
  const win = document.createElement('div');
  win.className = 'os-window-floating is-focused';
  win.id = `win-${id}`;
  win.dataset.winId = id;
  win.dataset.title = title || 'Window';

  const formattedHeight = typeof height === 'number' ? `${height}px` : (height || '360px');
  win.style.height = formattedHeight;

  const winWidth = Math.min(540, window.innerWidth - 40);
  win.style.width = `${winWidth}px`;

  const offset = (windowOffsetCounter++ % 8) * 30;
  const leftPos = Math.max(20, Math.min(window.innerWidth - winWidth - 30, 70 + offset));
  const topPos = Math.max(60, Math.min(window.innerHeight - parseInt(formattedHeight) - 80, 70 + offset));
  win.style.left = `${leftPos}px`;
  win.style.top = `${topPos}px`;

  // 2. Titlebar with App Icon, Minimize, Maximize, and Close Controls
  const appIcon = getAppIcon(title);
  const titlebar = document.createElement('div');
  titlebar.className = 'window-titlebar';
  titlebar.innerHTML = `
    <div class="titlebar-info">
      <span class="window-icon">${appIcon}</span>
      <span class="window-title-text">${title || 'Window'}</span>
    </div>
    <div class="window-actions">
      <button class="win-action-btn btn-min" title="Minimize" aria-label="Minimize">
        <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
          <rect width="10" height="2" rx="1"/>
        </svg>
      </button>
      <button class="win-action-btn btn-max" title="Maximize" aria-label="Maximize">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4">
          <rect x="1.5" y="1.5" width="7" height="7" rx="1"/>
        </svg>
      </button>
      <button class="win-action-btn btn-close" title="Close" aria-label="Close">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"/>
        </svg>
      </button>
    </div>
  `;

  // 3. Sandboxed Iframe (allow scripts only, never same-origin)
  const contentFrame = document.createElement('div');
  contentFrame.className = 'window-content-frame';

  const iframe = document.createElement('iframe');
  iframe.className = 'window-iframe';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads allow-modals allow-forms');
  iframe.setAttribute('allow', 'camera *; microphone *; display-capture *; clipboard-read *; clipboard-write *;');
  iframe.srcdoc = html !== undefined ? html : '';

  const shield = document.createElement('div');
  shield.className = 'window-iframe-shield';

  contentFrame.appendChild(iframe);
  contentFrame.appendChild(shield);

  win.appendChild(titlebar);
  win.appendChild(contentFrame);

  // 4. Taskbar Button
  const taskbarItem = document.createElement('button');
  taskbarItem.className = 'taskbar-win-item is-active';
  taskbarItem.id = `taskbar-win-${id}`;
  taskbarItem.setAttribute('data-win-id', id);
  taskbarItem.title = title || 'Window';
  taskbarItem.innerHTML = `
    <span class="win-taskbar-dot"></span>
    <span class="win-taskbar-title">${title || 'Window'}</span>
  `;

  if (taskbarWindows) {
    taskbarWindows.appendChild(taskbarItem);
  }

  // 5. Button Listeners (Minimize, Maximize / Restore, Close)
  const minBtn = titlebar.querySelector('.btn-min');
  const maxBtn = titlebar.querySelector('.btn-max');
  const closeBtn = titlebar.querySelector('.btn-close');

  minBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    minimizeWindow(win);
  });

  if (maxBtn) {
    maxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMaximizeWindow(win);
    });
  }

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeWindow(win);
  });

  // Double-click titlebar to toggle maximize
  titlebar.addEventListener('dblclick', (e) => {
    if (e.target.closest('.win-action-btn')) return;
    toggleMaximizeWindow(win);
  });

  win.addEventListener('pointerdown', () => {
    bringToFront(win);
  });

  taskbarItem.addEventListener('click', () => {
    if (win.classList.contains('is-minimized')) {
      restoreWindow(win);
    } else if (win.classList.contains('is-focused')) {
      minimizeWindow(win);
    } else {
      bringToFront(win);
    }
  });

  // 6. Draggable Titlebar Logic (Smooth un-maximize on drag)
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  titlebar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.win-action-btn')) return;
    bringToFront(win);

    if (win.classList.contains('is-maximized')) {
      const ratio = Math.max(0.1, Math.min(0.9, e.clientX / window.innerWidth));
      restoreMaximizedWindow(win);
      const restoredWidth = parseInt(win.style.width) || 540;
      startLeft = Math.max(10, e.clientX - restoredWidth * ratio);
      startTop = Math.max(52, e.clientY - 16);
      win.style.left = `${startLeft}px`;
      win.style.top = `${startTop}px`;
    } else {
      const rect = win.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    win.classList.add('is-dragging');
    titlebar.setPointerCapture(e.pointerId);
  });

  titlebar.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newLeft = Math.max(-win.offsetWidth + 80, Math.min(window.innerWidth - 80, startLeft + dx));
    const newTop = Math.max(52, Math.min(window.innerHeight - 80, startTop + dy));

    win.style.left = `${newLeft}px`;
    win.style.top = `${newTop}px`;
  });

  const stopDragging = (e) => {
    if (isDragging) {
      isDragging = false;
      win.classList.remove('is-dragging');
      try {
        titlebar.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  titlebar.addEventListener('pointerup', stopDragging);
  titlebar.addEventListener('pointercancel', stopDragging);

  // 7. Append to container and focus
  container.appendChild(win);
  bringToFront(win);

  return win;
}

// Global exposure
if (typeof window !== 'undefined') {
  window.createWindow = createWindow;
  window.getOpenWindows = getOpenWindows;
  window.showToast = showToast;
}

// Client UI Initializer
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const osClock = document.getElementById('osClock');
  const aiStatusPill = document.getElementById('aiStatusPill');
  const aiStatusText = document.getElementById('aiStatusText');
  const modelBadge = document.getElementById('modelBadge');
  const micBtn = document.getElementById('micBtn');
  const orbContainer = document.querySelector('.orb-container');
  const assistantStateTitle = document.getElementById('assistantStateTitle');
  const assistantSubtext = document.getElementById('assistantSubtext');
  const liveTranscript = document.getElementById('liveTranscript');
  const promptForm = document.getElementById('promptForm');
  const promptInput = document.getElementById('promptInput');
  const chatLogs = document.getElementById('chatLogs');
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  const ttsToggleBtn = document.getElementById('ttsToggleBtn');
  const ttsIcon = document.getElementById('ttsIcon');
  const ttsLabel = document.getElementById('ttsLabel');

  // State
  let isListening = false;
  let ttsEnabled = true;
  let recognition = null;
  let alwaysListeningActive = true;
  let isUserMuted = false;
  let isTtsSpeaking = false;
  let ttsCooldownTimer = null;
  let lastSnakeSteerDir = null;
  let lastSnakeSteerTime = 0;

  // 1. Clock
  function updateClock() {
    const now = new Date();
    osClock.textContent = now.toLocaleTimeString('en-US', { hour12: false });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 2. Fetch System Status
  async function checkSystemStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.status === 'online') {
        aiStatusPill.classList.add('online');
        if (data.geminiConfigured) {
          aiStatusText.textContent = `Gemini Online (${data.model})`;
        } else {
          aiStatusText.textContent = `Demo Mode (Add API Key in .env)`;
        }
        modelBadge.textContent = data.model;
      }
    } catch (err) {
      aiStatusText.textContent = 'Kernel Offline';
      console.warn('System status check failed:', err);
    }
  }
  checkSystemStatus();

  // Restore saved desktop wallpaper
  try {
    const savedWallpaper = localStorage.getItem('voice_os_wallpaper');
    if (savedWallpaper) {
      applyWallpaper(savedWallpaper, false);
    }
  } catch (e) {
    console.warn('Could not restore wallpaper:', e);
  }

  // 3. Logger helper
  function addLog(sender, text, type = 'system-entry') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = `[${sender}]`;

    const msg = document.createElement('span');
    msg.className = 'msg';
    msg.textContent = ` ${text}`;

    entry.appendChild(timestamp);
    entry.appendChild(msg);
    chatLogs.appendChild(entry);
    chatLogs.scrollTop = chatLogs.scrollHeight;
  }

  clearLogsBtn.addEventListener('click', () => {
    chatLogs.innerHTML = '';
    addLog('SYSTEM', 'Terminal output cleared.');
  });

  // 4. TTS Voice Synthesis
  function speak(text) {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    if (!text || !text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      isTtsSpeaking = true;
      clearTimeout(ttsCooldownTimer);
      const safetyTime = Math.max(2200, (text || '').length * 90);
      setTimeout(() => {
        if (isTtsSpeaking && (!window.speechSynthesis || !window.speechSynthesis.speaking)) {
          isTtsSpeaking = false;
        }
      }, safetyTime);
    };

    const finishSpeaking = () => {
      clearTimeout(ttsCooldownTimer);
      ttsCooldownTimer = setTimeout(() => {
        isTtsSpeaking = false;
      }, 350);
    };

    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;

    window.speechSynthesis.speak(utterance);
  }

  ttsToggleBtn.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    if (ttsEnabled) {
      ttsIcon.textContent = '🔊';
      ttsLabel.textContent = 'Voice: ON';
      ttsToggleBtn.classList.remove('off');
      addLog('SYSTEM', 'Voice synthesis output enabled.');
    } else {
      window.speechSynthesis.cancel();
      ttsIcon.textContent = '🔇';
      ttsLabel.textContent = 'Voice: OFF';
      ttsToggleBtn.classList.add('off');
      addLog('SYSTEM', 'Voice synthesis output muted.');
    }
  });

  // ========================================================
  // SPOKEN LOG IN LOCAL STORAGE
  // ========================================================
  const SPOKEN_LOG_KEY = 'voice_os_spoken_log';

  /**
   * Logs a submitted command with an ISO timestamp to local storage.
   * @param {string} command
   */
  function logCommandToStorage(command) {
    if (!command || !command.trim()) return;
    try {
      const raw = localStorage.getItem(SPOKEN_LOG_KEY);
      const logs = raw ? JSON.parse(raw) : [];
      logs.push({
        timestamp: new Date().toISOString(),
        command: command.trim()
      });
      localStorage.setItem(SPOKEN_LOG_KEY, JSON.stringify(logs));
      renderRecentCommands();
    } catch (err) {
      console.warn('Failed to save command to local storage:', err);
    }
  }

  function renderRecentCommands() {
    const list = document.getElementById('recentCommandsList');
    if (!list) return;
    try {
      const raw = localStorage.getItem(SPOKEN_LOG_KEY);
      const logs = raw ? JSON.parse(raw) : [];
      list.innerHTML = '';
      if (logs.length === 0) {
        list.innerHTML = '<span style="color:var(--text-dim);font-size:0.75rem;font-style:italic;">No commands executed yet.</span>';
        return;
      }
      const unique = [];
      for (let i = logs.length - 1; i >= 0 && unique.length < 8; i--) {
        const cmd = logs[i].command;
        if (!unique.includes(cmd)) unique.push(cmd);
      }
      unique.forEach(cmd => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'recent-cmd-chip';
        chip.textContent = `› ${cmd}`;
        chip.title = `Run "${cmd}"`;
        chip.addEventListener('click', (e) => {
          e.preventDefault();
          executeKernelCommand(cmd);
        });
        list.appendChild(chip);
      });
    } catch (e) {}
  }

  /**
   * Returns all logged spoken commands from local storage.
   * @returns {Array<{ timestamp: string, command: string }>}
   */
  function getSpokenLogsFromStorage() {
    try {
      const raw = localStorage.getItem(SPOKEN_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('Failed to retrieve spoken logs from local storage:', err);
      return [];
    }
  }

  // ========================================================
  // UNDO STACK & LOCAL COMMAND HELPERS
  // ========================================================
  let actionHistory = [];
  function pushAction(action) {
    actionHistory.push(action);
    if (actionHistory.length > 30) actionHistory.shift();
  }
  function popAction() {
    return actionHistory.pop();
  }

  // Previous command tracking for self-corrections ("no, actually, I meant")
  let previousCommandText = '';
  const CORRECTION_REGEX = /^(no\b[, ]*|actually\b[, ]*|i meant\b[, ]*)/i;

  // HTML escaping helper for show source
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Match window names by closest title (Levenshtein + Token match)
  function editDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  function findWindowByClosestTitle(query) {
    const openWins = Array.from(document.querySelectorAll('.os-window-floating:not(.is-closing)'));
    if (openWins.length === 0) return null;

    const cleanQuery = query.toLowerCase().replace(/^(the|a|an|app|window)\s+/i, '').trim();
    if (!cleanQuery) return openWins[openWins.length - 1];

    let bestWin = null;
    let bestScore = -1;

    for (const win of openWins) {
      const title = (win.querySelector('.window-title-text')?.textContent || win.dataset.title || '').toLowerCase().trim();
      const id = (win.dataset.winId || '').toLowerCase().trim();

      // Exact match
      if (title === cleanQuery || id === cleanQuery) {
        return win;
      }

      let score = 0;
      if (title.includes(cleanQuery)) {
        score = 80 + (cleanQuery.length / title.length) * 20;
      } else if (cleanQuery.includes(title) && title.length > 2) {
        score = 70 + (title.length / cleanQuery.length) * 20;
      } else {
        const qWords = cleanQuery.split(/\s+/).filter(Boolean);
        const tWords = title.split(/\s+/).filter(Boolean);
        let matchCount = 0;
        for (const qw of qWords) {
          if (tWords.some(tw => tw.includes(qw) || qw.includes(tw))) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          score = 40 + (matchCount / Math.max(qWords.length, tWords.length)) * 30;
        } else {
          const maxLen = Math.max(cleanQuery.length, title.length);
          const dist = editDistance(cleanQuery, title);
          const similarity = maxLen > 0 ? (maxLen - dist) / maxLen : 0;
          score = similarity * 50;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestWin = win;
      }
    }

    return bestScore >= 20 ? bestWin : null;
  }

  // Wallpaper Presets & Engine
  const WALLPAPER_PRESETS = {
    'cyberpunk': 'linear-gradient(135deg, #0d0221 0%, #19053b 45%, #6b1178 75%, #ff007f 100%)',
    'sunset': 'linear-gradient(135deg, #0d0221 0%, #19053b 45%, #6b1178 75%, #ff007f 100%)',
    'nebula': 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
    'ocean': 'linear-gradient(135deg, #09203f 0%, #1e3c72 50%, #2a5298 100%)',
    'biolume': 'linear-gradient(135deg, #09203f 0%, #1e3c72 50%, #2a5298 100%)',
    'aurora': 'linear-gradient(135deg, #021508 0%, #064e3b 50%, #059669 80%, #10b981 100%)',
    'nordic': 'linear-gradient(135deg, #021508 0%, #064e3b 50%, #059669 80%, #10b981 100%)',
    'midnight': 'radial-gradient(ellipse at top, #141724 0%, #0a0a0c 60%, #050608 100%)',
    'obsidian': 'radial-gradient(ellipse at top, #141724 0%, #0a0a0c 60%, #050608 100%)',
    'mesh': 'radial-gradient(at 0% 0%, #1e1b4b 0px, transparent 50%), radial-gradient(at 100% 100%, #312e81 0px, transparent 50%), #0f172a',
    'electric': 'radial-gradient(at 0% 0%, #1e1b4b 0px, transparent 50%), radial-gradient(at 100% 100%, #312e81 0px, transparent 50%), #0f172a',
    'neon': 'linear-gradient(135deg, #05051a 0%, #260940 40%, #7928ca 80%, #ff0080 100%)',
    'tokyo': 'linear-gradient(135deg, #05051a 0%, #260940 40%, #7928ca 80%, #ff0080 100%)',
    'crimson': 'linear-gradient(135deg, #1f0d10 0%, #4a0404 40%, #991b1b 75%, #ea580c 100%)',
    'fire': 'linear-gradient(135deg, #1f0d10 0%, #4a0404 40%, #991b1b 75%, #ea580c 100%)'
  };

  function applyWallpaper(backgroundCss, save = true) {
    if (!backgroundCss || backgroundCss === 'default' || backgroundCss === 'none' || backgroundCss === 'reset') {
      document.body.style.background = '';
      const desktop = document.querySelector('.os-desktop');
      if (desktop) desktop.style.background = '';
      if (save) {
        try { localStorage.removeItem('voice_os_wallpaper'); } catch(e) {}
      }
      return;
    }

    document.body.style.background = backgroundCss;
    const desktop = document.querySelector('.os-desktop');
    if (desktop) desktop.style.background = 'transparent';
    if (save) {
      try { localStorage.setItem('voice_os_wallpaper', backgroundCss); } catch(e) {}
    }
  }

  // ========================================================
  // FILE MANAGER, NOTEPAD & MEDIA STORAGE ENGINE
  // ========================================================
  const OS_FILES_KEY = 'voice_os_files';

  function getStoredFiles() {
    let items = [];
    try {
      const raw = localStorage.getItem(OS_FILES_KEY);
      if (raw) items = JSON.parse(raw);
    } catch (e) {}

    if (!Array.isArray(items) || items.length === 0) {
      items = [
        {
          id: 'folder-docs',
          name: 'Documents',
          type: 'folder',
          parentId: 'root',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          updatedAt: Date.now()
        },
        {
          id: 'file-welcome',
          name: 'Welcome.txt',
          type: 'file',
          parentId: 'root',
          content: 'Welcome to Voice OS!\n\nYou can control this entire system using your voice.\n- Speak: "write meeting notes for 3pm" to dictate into Notepad.\n- Speak: "save note meeting.txt" to save it here.\n- Speak: "open camera" to snap photos or record videos.\n- Speak: "open gallery" to view saved media.\n- Speak: "open file manager" or "open file Welcome.txt" at any time!\n\nAll your files and media are safely saved and can be edited, opened, or downloaded.',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          size: '420 B',
          updatedAt: Date.now()
        },
        {
          id: 'file-commands',
          name: 'Voice Guide.txt',
          type: 'file',
          parentId: 'folder-docs',
          content: 'Voice OS Command Reference:\n\n1. Navigation & Apps:\n- "open camera"\n- "open gallery"\n- "open file manager"\n- "open notepad"\n- "open snake game"\n- "open wallpaper"\n- "open clock"\n- "open weather"\n\n2. Notes & Files:\n- "write [text]"\n- "save note [filename]"\n- "create new file"\n- "create new folder"\n- "open file [filename]"\n\n3. Camera & Video:\n- "take a photo"\n- "start recording"\n- "stop recording"\n\n4. Snake Game:\n- "start game", "pause game", "restart game"\n- Keyboard: Arrows or WASD',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          size: '480 B',
          updatedAt: Date.now()
        }
      ];
      try { localStorage.setItem(OS_FILES_KEY, JSON.stringify(items)); } catch (e) {}
    } else {
      // Migrate existing items if missing type or parentId
      let modified = false;
      items = items.map(item => {
        if (!item.type) { item.type = 'file'; modified = true; }
        if (!item.parentId) { item.parentId = 'root'; modified = true; }
        if (!item.updatedAt) { item.updatedAt = Date.now(); modified = true; }
        return item;
      });
      if (modified) {
        try { localStorage.setItem(OS_FILES_KEY, JSON.stringify(items)); } catch (e) {}
      }
    }
    return items;
  }

  function saveStoredFiles(files) {
    try {
      localStorage.setItem(OS_FILES_KEY, JSON.stringify(files));
      broadcastFilesChanged();
    } catch (e) {
      console.error('Error saving files:', e);
    }
  }

  function broadcastFilesChanged() {
    document.querySelectorAll('.os-window-floating:not(.is-closing)').forEach(win => {
      const title = (win.querySelector('.window-title-text')?.textContent || '').toLowerCase();
      if (title.includes('file') || title.includes('manager')) {
        const iframe = win.querySelector('.window-iframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'os:files-updated' }, '*');
        }
      }
    });
  }

  // ========================================================
  // INDEXEDDB MEDIA ENGINE FOR CAMERA & GALLERY
  // ========================================================
  const MEDIA_DB_NAME = 'voice_os_media_db';
  const MEDIA_DB_VERSION = 1;
  const MEDIA_STORE_NAME = 'media';

  function openMediaDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB not supported'));
      }
      const req = indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
          const store = db.createObjectStore(MEDIA_STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveMediaToDB(item) {
    try {
      const db = await openMediaDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
        const store = tx.objectStore(MEDIA_STORE_NAME);
        store.put(item);
        tx.oncomplete = () => {
          broadcastMediaChanged();
          resolve(item);
        };
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('IndexedDB save failed, using fallback:', err);
      try {
        const raw = localStorage.getItem('voice_os_media_fallback') || '[]';
        const list = JSON.parse(raw);
        list.unshift(item);
        localStorage.setItem('voice_os_media_fallback', JSON.stringify(list.slice(0, 30)));
        broadcastMediaChanged();
        return item;
      } catch (e2) {
        throw err;
      }
    }
  }

  async function getAllMediaFromDB(typeFilter = 'all') {
    try {
      const db = await openMediaDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(MEDIA_STORE_NAME, 'readonly');
        const store = tx.objectStore(MEDIA_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          let items = req.result || [];
          items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          if (typeFilter && typeFilter !== 'all') {
            items = items.filter(i => i.type === typeFilter);
          }
          resolve(items);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      try {
        const raw = localStorage.getItem('voice_os_media_fallback') || '[]';
        let items = JSON.parse(raw);
        if (typeFilter && typeFilter !== 'all') {
          items = items.filter(i => i.type === typeFilter);
        }
        return items;
      } catch (e2) {
        return [];
      }
    }
  }

  async function deleteMediaFromDB(id) {
    try {
      const db = await openMediaDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
        const store = tx.objectStore(MEDIA_STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => {
          broadcastMediaChanged();
          resolve(true);
        };
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      try {
        const raw = localStorage.getItem('voice_os_media_fallback') || '[]';
        let list = JSON.parse(raw).filter(i => i.id !== id);
        localStorage.setItem('voice_os_media_fallback', JSON.stringify(list));
        broadcastMediaChanged();
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  function broadcastMediaChanged() {
    document.querySelectorAll('.os-window-floating:not(.is-closing)').forEach(win => {
      const title = (win.querySelector('.window-title-text')?.textContent || '').toLowerCase();
      if (title.includes('gallery') || title.includes('camera')) {
        const iframe = win.querySelector('.window-iframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'os:media-updated' }, '*');
        }
      }
    });
  }

  function saveCurrentNoteToFileManager(customName) {
    let noteText = '';
    let fileName = (customName || '').trim();

    const openWins = Array.from(document.querySelectorAll('.os-window-floating:not(.is-closing)'));
    const noteWin = openWins.find(w => {
      const t = (w.querySelector('.window-title-text')?.textContent || '').toLowerCase();
      return t.includes('note') || t.includes('pad');
    });

    if (noteWin) {
      const iframe = noteWin.querySelector('.window-iframe');
      try {
        const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
        if (doc) {
          const area = doc.getElementById('noteArea');
          if (area) noteText = area.value;
          const nameInput = doc.getElementById('fileNameInput');
          if (fileName && nameInput) {
            nameInput.value = fileName;
          } else if (!fileName && nameInput && nameInput.value) {
            fileName = nameInput.value.trim();
          }
          const saveBtn = doc.getElementById('saveFileBtn');
          if (saveBtn) {
            saveBtn.textContent = 'Saved! ✓';
            setTimeout(() => { saveBtn.textContent = '💾 Save to Files'; }, 1600);
          }
        }
      } catch(e) {}
    }

    if (!noteText) {
      noteText = localStorage.getItem('os_notepad_val') || 'New note created via voice';
    }

    if (!fileName) {
      const datePart = new Date().toISOString().slice(0, 10);
      const timePart = Date.now().toString().slice(-4);
      fileName = `note-${datePart}-${timePart}.txt`;
    }
    if (!fileName.includes('.')) {
      fileName += '.txt';
    }

    const bytes = new Blob([noteText]).size;
    const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
    const fileObj = {
      id: 'file-' + Date.now(),
      name: fileName,
      type: 'file',
      parentId: 'root',
      content: noteText,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      size: sizeStr,
      updatedAt: Date.now()
    };

    const files = getStoredFiles();
    const existingIdx = files.findIndex(f => f.name.toLowerCase() === fileName.toLowerCase() && f.type === 'file');
    if (existingIdx >= 0) {
      files[existingIdx].content = noteText;
      files[existingIdx].size = sizeStr;
      files[existingIdx].date = fileObj.date;
      files[existingIdx].updatedAt = fileObj.updatedAt;
    } else {
      files.unshift(fileObj);
    }
    saveStoredFiles(files);
    return fileObj;
  }

  function writeTextToNotepad(text) {
    const openWins = Array.from(document.querySelectorAll('.os-window-floating:not(.is-closing)'));
    const noteWin = openWins.find(w => {
      const t = (w.querySelector('.window-title-text')?.textContent || '').toLowerCase();
      return t.includes('note') || t.includes('pad');
    });

    if (noteWin) {
      bringToFront(noteWin);
      const iframe = noteWin.querySelector('.window-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'os:append-note-text', text: text }, '*');
      }
    } else {
      const winId = `app-${Date.now()}`;
      const title = 'Notepad';
      const dims = getAppDimensions('Notepad');
      const html = getAppTemplate('Notepad', text);
      const win = createWindow(winId, title, dims.height, html);
      if (win && dims.width) win.style.width = `${dims.width}px`;
      bringToFront(win);
    }

    const prev = localStorage.getItem('os_notepad_val') || '';
    const updated = prev ? (prev + '\n' + text) : text;
    localStorage.setItem('os_notepad_val', updated);
  }

  function openFileInNotepad(file) {
    if (!file) return;
    const openWins = Array.from(document.querySelectorAll('.os-window-floating:not(.is-closing)'));
    const noteWin = openWins.find(w => {
      const t = (w.querySelector('.window-title-text')?.textContent || '').toLowerCase();
      return t.includes('note') || t.includes('pad');
    });

    if (noteWin) {
      bringToFront(noteWin);
      const titleText = noteWin.querySelector('.window-title-text');
      if (titleText) titleText.textContent = `Notepad - ${file.name}`;
      const iframe = noteWin.querySelector('.window-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'os:set-note-text', name: file.name, text: file.content }, '*');
      }
    } else {
      const winId = `app-${Date.now()}`;
      const title = `Notepad - ${file.name}`;
      const dims = getAppDimensions('Notepad');
      const html = getAppTemplate('Notepad', file.content, file.name);
      const win = createWindow(winId, title, dims.height, html);
      if (win && dims.width) win.style.width = `${dims.width}px`;
      bringToFront(win);
    }
  }

  function openFileInNotepadByName(query) {
    const clean = (query || '').toLowerCase().replace(/^(the|a|an|file)\s+/i, '').trim();
    const files = getStoredFiles();
    const file = files.find(f => {
      const fn = f.name.toLowerCase();
      return fn === clean || fn === (clean + '.txt') || fn.includes(clean);
    });
    if (file) {
      openFileInNotepad(file);
      return true;
    }
    return false;
  }

  // Match built-in applications from natural speech or text commands
  function matchBuiltinApp(rawText) {
    if (!rawText) return null;
    const clean = rawText
      .toLowerCase()
      .replace(/[.,!?;:"'~`#%&*()_\-+=<>{}\[\]\\\/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const stripped = clean
      .replace(/^(?:please|can you|could you|i want to|i need to|would you|let s|lets|go ahead and)\s+/g, '')
      .trim();

    // 1. Notepad
    if (
      /^(?:open|launch|start|run|show|create)?\s*(?:the|a|an)?\s*(?:notepad|notes?|text\s*editor|memo|pad|scratchpad)\b/.test(stripped) ||
      /^(notepad|notes?|memo|text\s*editor|scratchpad)$/.test(stripped) ||
      /\b(notepad|text\s*editor)\b/.test(stripped)
    ) {
      return 'Notepad';
    }

    // 2. Snake Game
    if (
      /^(?:open|launch|start|run|play|show)?\s*(?:the|a|an)?\s*(?:snake|snake\s*game|retro\s*snake|game)\b/.test(stripped) ||
      /^(snake|snake\s*game|play\s*snake|play\s*game|the\s*game|game)$/.test(stripped) ||
      /\b(snake\s*game)\b/.test(stripped)
    ) {
      return 'Snake Game';
    }

    // 3. Analogue Clock
    if (
      /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:analogue\s*clock|analog\s*clock)\b/.test(stripped) ||
      /^(analogue\s*clock|analog\s*clock)$/.test(stripped) ||
      /\b(analogue\s*clock|analog\s*clock)\b/.test(stripped)
    ) {
      return 'Analogue Clock';
    }

    // 4. Clock / Timer
    if (
      /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:clock|timer|stopwatch)\b/.test(stripped) ||
      /^(clock|timer|stopwatch)$/.test(stripped) ||
      /\b(open\s+clock|launch\s+clock)\b/.test(stripped)
    ) {
      return 'Clock';
    }

    // 5. Music Player
    if (
      /^(?:open|launch|start|run|play|show)?\s*(?:the|a|an)?\s*(?:music|music\s*player|audio\s*player|songs?)\b/.test(stripped) ||
      /^(music|music\s*player|audio\s*player|songs?)$/.test(stripped) ||
      /\b(music\s*player|audio\s*player)\b/.test(stripped)
    ) {
      return 'Music Player';
    }

    // 6. Task Manager
    if (
      /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:task\s*manager|process\s*manager|system\s*manager|manager|taskmgr)\b/.test(stripped) ||
      /^(task\s*manager|process\s*manager|manager|taskmgr)$/.test(stripped) ||
      /\b(task\s*manager|process\s*manager)\b/.test(stripped)
    ) {
      return 'Task Manager';
    }

    // 7. Calculator
    if (
      /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:calculator|calc|math)\b/.test(stripped) ||
      /^(calculator|calc|math)$/.test(stripped) ||
      /\b(calculator|calc)\b/.test(stripped)
    ) {
      return 'Calculator';
    }

    // 8. Weather
    if (
      /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:weather|weather\s*dashboard|forecast)\b/.test(stripped) ||
      /^(weather|forecast)$/.test(stripped) ||
      /\b(weather|forecast)\b/.test(stripped)
    ) {
      return 'Weather';
    }

    // 9. Tasks / Todo List
    if (
      /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:todo|to\s*do|todo\s*list|tasks?|task\s*list)\b/.test(stripped) ||
      /^(todo|tasks?|todo\s*list|task\s*list)$/.test(stripped) ||
      /\b(todo\s*list|task\s*list)\b/.test(stripped)
    ) {
      return 'Tasks';
    }

    // 10. Wallpaper Studio
    if (
      /^(?:open|launch|start|run|show)?\s*(?:the|a|an)?\s*(?:wallpaper|wallpapers|wallpaper\s*studio|desktop\s*wallpaper|themes?|backgrounds?)\b/.test(stripped) ||
      /^(wallpaper|wallpapers|wallpaper\s*studio|themes?|backgrounds?)$/.test(stripped) ||
      /\b(wallpaper\s*studio)\b/.test(stripped)
    ) {
      return 'Wallpaper Studio';
    }

    // 11. File Manager / Documents / Files
    if (
      /^(?:open|launch|start|run|show)?\s*(?:the|a|an|my)?\s*(?:file\s*manager|files?|file\s*explorer|my\s*files|documents?|folder)\b/.test(stripped) ||
      /^(file\s*manager|files?|file\s*explorer|my\s*files|documents?)$/.test(stripped) ||
      /\b(file\s*manager|my\s*files)\b/.test(stripped)
    ) {
      return 'File Manager';
    }

    // 12. Camera
    if (
      /^(?:open|launch|start|run|show|take|capture)?\s*(?:the|a|an|my)?\s*(?:camera|webcam|cam|photo|snapshot)\b/.test(stripped) ||
      /^(camera|webcam|cam|take\s+photo|take\s+a\s+photo|snap\s+photo|capture\s+photo)$/.test(stripped) ||
      /\b(camera|webcam|take\s+photo)\b/.test(stripped)
    ) {
      return 'Camera';
    }

    // 13. Video Recorder
    if (
      /^(?:open|launch|start|run|show|record)?\s*(?:the|a|an|my)?\s*(?:video\s*recorder|video\s*recording|record\s*video|recorder)\b/.test(stripped) ||
      /^(video\s*recorder|record\s*video|start\s*recording|video\s*recording)$/.test(stripped) ||
      /\b(video\s*recorder|record\s*video)\b/.test(stripped)
    ) {
      return 'Camera';
    }

    // 14. Gallery
    if (
      /^(?:open|launch|start|run|show|view)?\s*(?:the|a|an|my)?\s*(?:gallery|media\s*gallery|photos|videos|media|my\s*photos|my\s*videos)\b/.test(stripped) ||
      /^(gallery|media\s*gallery|photos|videos|my\s*photos|my\s*videos)$/.test(stripped) ||
      /\b(gallery|media\s*gallery|my\s*photos|my\s*videos)\b/.test(stripped)
    ) {
      return 'Gallery';
    }

    return null;
  }

  // ========================================================
  // VOICE ASSISTANT CONFIRMATION & COMMAND ARCHITECTURE
  // Speech Recognition -> Transcript -> Normalizer -> Intent Detection -> Command Router -> Application Action
  // ========================================================

  let pendingVoiceConfirm = null;

  function showVoiceConfirmModal(title, msg, onConfirm, onCancel) {
    pendingVoiceConfirm = { onConfirm, onCancel };
    const modal = document.getElementById('voiceConfirmModal');
    if (modal) {
      const titleEl = document.getElementById('confirmTitle');
      const msgEl = document.getElementById('confirmMsg');
      if (titleEl) titleEl.textContent = title || 'Confirm Action';
      if (msgEl) msgEl.textContent = msg || 'Are you sure you want to perform this action?';
      modal.style.display = 'flex';
    }
    if (assistantStateTitle) assistantStateTitle.textContent = `⚠️ Confirmation: ${title || 'Confirm'}`;
    if (assistantSubtext) assistantSubtext.textContent = msg || 'Say "Yes" to confirm or "Cancel".';
    speak(msg || 'Are you sure you want to proceed?');
  }

  function hideVoiceConfirmModal() {
    const modal = document.getElementById('voiceConfirmModal');
    if (modal) modal.style.display = 'none';
  }

  function confirmVoiceAction() {
    hideVoiceConfirmModal();
    if (pendingVoiceConfirm && typeof pendingVoiceConfirm.onConfirm === 'function') {
      const fn = pendingVoiceConfirm.onConfirm;
      pendingVoiceConfirm = null;
      fn();
    }
  }

  function cancelVoiceAction() {
    hideVoiceConfirmModal();
    if (pendingVoiceConfirm && typeof pendingVoiceConfirm.onCancel === 'function') {
      const fn = pendingVoiceConfirm.onCancel;
      pendingVoiceConfirm = null;
      fn();
    } else {
      pendingVoiceConfirm = null;
      speak('Action cancelled.');
      showToast('Action cancelled.', 'info', 'Voice OS');
    }
    if (assistantStateTitle) assistantStateTitle.textContent = 'Action Cancelled';
    if (assistantSubtext) assistantSubtext.textContent = 'Voice OS is ready for your next instruction.';
  }

  // 1. Command Normalizer
  function normalizeVoiceCommand(rawText) {
    if (!rawText) return '';
    let text = String(rawText).trim();

    // Convert spoken file extensions: "dot txt" -> ".txt", "dot js" -> ".js", etc.
    text = text.replace(/\s*\bdot\s+(txt|json|js|html|css|md|png|jpg|jpeg|mp4|webm|pdf|doc|docx)\b/gi, '.$1');

    // Strip common filler phrases / polite prefixes
    text = text.replace(/^(?:please|can you please|can you|could you|i want to|i need to|would you|let s|lets|go ahead and|hey assistant|hey voice os|hey os|assistant)\s+/i, '').trim();

    // Strip conversational trailing suffixes (e.g. "or whatever", "right now", "please", "thanks")
    text = text.replace(/\s+(?:or whatever|whatever|right now|now|please|thanks)\b.*$/i, '').trim();

    let norm = text.toLowerCase()
      .replace(/[,!?;:"'~`#%&*()_\-+=<>{}\[\]\\\/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove trailing sentence period if any
    norm = norm.replace(/\.+$/g, '').trim();

    return norm;
  }

  // Helper to get current context dynamically
  function getCurrentContext() {
    const focusedWin = document.querySelector('.os-window-floating.is-focused:not(.is-closing):not(.is-minimized)') 
      || document.querySelector('.os-window-floating:not(.is-closing):not(.is-minimized)');
    if (!focusedWin) return { feature: 'desktop', title: 'Desktop', win: null };
    const title = (focusedWin.querySelector('.window-title-text')?.textContent || focusedWin.dataset.title || '').toLowerCase();
    let feature = 'app';
    if (title.includes('snake') || title.includes('game')) feature = 'snake';
    else if (title.includes('camera') || title.includes('photo') || (title.includes('video') && !title.includes('player')) || title.includes('record')) feature = 'camera';
    else if (title.includes('gallery')) feature = 'gallery';
    else if (title.includes('file') || (title.includes('manager') && !title.includes('task'))) feature = 'file-manager';
    else if (title.includes('note') || title.includes('text') || title.includes('pad')) feature = 'notepad';
    return { feature, title, win: focusedWin };
  }

  // Helper to send message to any open iframe matching title
  function sendMessageToApp(appQuery, messagePayload) {
    const win = findWindowByClosestTitle(appQuery);
    if (win) {
      const iframe = win.querySelector('.window-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(messagePayload, '*');
        return true;
      }
    }
    return false;
  }

  // Helper to launch or focus app
  function launchOrFocusApp(appName) {
    const existing = findWindowByClosestTitle(appName);
    if (existing) {
      bringToFront(existing);
      if (existing.classList.contains('is-minimized')) {
        unminimizeWindow(existing);
      }
      return existing;
    }
    const winId = `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const dims = getAppDimensions(appName);
    const html = getAppTemplate(appName);
    const win = createWindow(winId, appName, dims.height, html);
    if (win && dims.width) win.style.width = `${dims.width}px`;
    bringToFront(win);
    pushAction({
      type: 'open',
      winId: winId,
      title: appName,
      height: dims.height,
      width: dims.width,
      html: html
    });
    return win;
  }

  // 2. Intent Detection
  function detectVoiceIntent(norm, raw) {
    if (!norm) return null;

    // 1. Confirmations
    if (pendingVoiceConfirm) {
      if (/^(yes|yeah|yup|confirm|yes delete|yes replace|yes overwrite|sure|do it|ok|okay|proceed)$/i.test(norm)) {
        return { intent: 'CONFIRM_YES' };
      }
      if (/^(no|nope|cancel|don t|dont|stop|nevermind|never mind|abort)$/i.test(norm)) {
        return { intent: 'CONFIRM_NO' };
      }
    }

    // 2. Interrupts & Stop listening
    if (/^(?:stop\s+listening|stop|cancel|never\s*mind|abort)$/i.test(norm)) {
      return { intent: 'STOP_LISTENING' };
    }

    // 3. Snake Game Contextual Direction Steer
    const ctx = (typeof getCurrentContext === 'function') ? getCurrentContext() : { feature: 'desktop' };
    if (ctx && ctx.feature === 'snake') {
      if (/^(?:up|move\s+up|go\s+up|steer\s+up)$/i.test(norm)) {
        return { intent: 'MOVE_UP', params: { direction: 'UP' } };
      }
      if (/^(?:down|move\s+down|go\s+down|steer\s+down)$/i.test(norm)) {
        return { intent: 'MOVE_DOWN', params: { direction: 'DOWN' } };
      }
      if (/^(?:left|move\s+left|go\s+left|steer\s+left)$/i.test(norm)) {
        return { intent: 'MOVE_LEFT', params: { direction: 'LEFT' } };
      }
      if (/^(?:right|move\s+right|go\s+right|steer\s+right)$/i.test(norm)) {
        return { intent: 'MOVE_RIGHT', params: { direction: 'RIGHT' } };
      }
    }

    // 4. Snake Game Generic Controls
    if (/^(?:start\s+game|start\s+snake|play\s+game|play\s+snake|begin\s+game)$/i.test(norm) || norm === 'start game') {
      return { intent: 'START_GAME' };
    }
    if (/^(?:pause\s+game|freeze\s+game|pause\s+snake)$/i.test(norm) || norm === 'pause game') {
      return { intent: 'PAUSE_GAME' };
    }
    if (/^(?:resume\s+game|unpause\s+game|continue\s+game|resume\s+snake)$/i.test(norm) || norm === 'resume game') {
      return { intent: 'RESUME_GAME' };
    }
    if (/^(?:restart\s+game|reset\s+game|play\s+again|restart\s+snake)$/i.test(norm) || norm === 'restart game') {
      return { intent: 'RESTART_GAME' };
    }
    if (/^(?:move\s+up|go\s+up|steer\s+up|up)$/i.test(norm)) {
      return { intent: 'MOVE_UP', params: { direction: 'UP' } };
    }
    if (/^(?:move\s+down|go\s+down|steer\s+down|down)$/i.test(norm)) {
      return { intent: 'MOVE_DOWN', params: { direction: 'DOWN' } };
    }
    if (/^(?:move\s+left|go\s+left|steer\s+left|left)$/i.test(norm)) {
      return { intent: 'MOVE_LEFT', params: { direction: 'LEFT' } };
    }
    if (/^(?:move\s+right|go\s+right|steer\s+right|right)$/i.test(norm)) {
      return { intent: 'MOVE_RIGHT', params: { direction: 'RIGHT' } };
    }
    if (/^(?:open|launch|start|run|play|show)?\s*(?:the\s*)?(?:snake|snake\s*game|retro\s*snake|game)\b/i.test(norm) || norm === 'snake game' || norm === 'snake' || norm === 'open snake game' || norm === 'play game' || norm === 'play the game' || norm === 'open game' || norm === 'open the game') {
      return { intent: 'OPEN_SNAKE' };
    }

    // 5. Camera & Video Recording
    if (/^(?:take|capture|snap|shoot|click)\s*(?:a|the)?\s*(?:photo|picture|snapshot|image|shot)\b/i.test(norm) || norm === 'take photo' || norm === 'snap' || norm === 'click the picture') {
      return { intent: 'TAKE_PHOTO' };
    }
    if (/^(?:retake|retake photo|take again)\b/i.test(norm)) {
      return { intent: 'RETAKE_PHOTO' };
    }
    if (/^(?:save|keep|accept)\s*(?:the\s*|this\s*)?(?:photo|picture|snapshot|image)$/i.test(norm) || norm === 'save photo' || norm === 'save image' || norm === 'save the image') {
      return { intent: 'SAVE_PHOTO' };
    }
    if (/^(?:delete|remove|trash|erase)\s*(?:this|the|current)?\s*(?:photo|picture|snapshot)$/i.test(norm)) {
      return { intent: 'DELETE_PHOTO' };
    }
    if (/^(?:start|begin|record)\s*(?:the\s*)?(?:video\s*recording|video|recording)\b/i.test(norm) || norm === 'record video' || norm === 'start recording' || norm === 'start video') {
      return { intent: 'START_RECORDING' };
    }
    if (/^(?:pause|freeze)\s*(?:the\s*)?(?:video\s*recording|video|recording)\b/i.test(norm) || norm === 'pause recording' || norm === 'pause video') {
      return { intent: 'PAUSE_RECORDING' };
    }
    if (/^(?:resume|unpause|continue)\s*(?:the\s*)?(?:video\s*recording|video|recording)\b/i.test(norm) || norm === 'resume recording' || norm === 'resume video') {
      return { intent: 'RESUME_RECORDING' };
    }
    if (/^(?:stop|end|finish)\s*(?:the\s*)?(?:video\s*recording|video|recording)\b/i.test(norm) || norm === 'stop recording' || norm === 'stop video') {
      return { intent: 'STOP_RECORDING' };
    }
    if (/^(?:save|keep|accept)\s*(?:the\s*|this\s*)?(?:video|recording)$/i.test(norm) || norm === 'save video') {
      return { intent: 'SAVE_VIDEO' };
    }
    if (/^(?:delete|remove|trash|erase)\s*(?:this|the|current)?\s*(?:video|recording)$/i.test(norm)) {
      return { intent: 'DELETE_VIDEO' };
    }
    if (/^(?:switch|flip)\s*(?:the\s*)?(?:camera|facing|lens)$/i.test(norm)) {
      return { intent: 'SWITCH_CAMERA' };
    }
    if (/^(?:open|launch|start|show|view|switch to)?\s*(?:the\s*)?(?:camera|webcam|cam)$/i.test(norm) || norm === 'camera' || norm === 'open camera') {
      return { intent: 'OPEN_CAMERA' };
    }

    // 6. Gallery
    if (/^(?:open\s+latest|view\s+latest|show\s+latest)\s+photo\b/i.test(norm)) {
      return { intent: 'OPEN_LATEST_PHOTO' };
    }
    if (/^(?:play\s+latest|open\s+latest|view\s+latest)\s+video\b/i.test(norm)) {
      return { intent: 'PLAY_LATEST_VIDEO' };
    }
    if (/^(?:show|display|view|filter|open)\s*(?:my\s*)?(?:photos|pictures|images|snaps)\b/i.test(norm) || norm === 'photos' || norm === 'show photos' || norm === 'show my photos') {
      return { intent: 'SHOW_PHOTOS' };
    }
    if (/^(?:show|display|view|filter|open)\s*(?:my\s*)?(?:videos|recordings|clips)\b/i.test(norm) || norm === 'videos' || norm === 'show videos' || norm === 'show my videos') {
      return { intent: 'SHOW_VIDEOS' };
    }
    if (/^(?:show|display|view)\s*(?:all\s+media|all|everything)\b/i.test(norm) || norm === 'show all') {
      return { intent: 'SHOW_ALL_MEDIA' };
    }
    if (/^(?:clear|delete all|erase all|empty)\s*(?:the\s*|my\s*)?(?:gallery|media|photos|videos)\b/i.test(norm)) {
      return { intent: 'CLEAR_GALLERY' };
    }
    if (/^(?:open|launch|start|show|view)?\s*(?:the\s*)?(?:gallery|media\s*gallery|saved\s*media|saved\s*photos|saved\s*videos)\b/i.test(norm) || norm === 'gallery' || norm === 'open gallery') {
      return { intent: 'OPEN_GALLERY' };
    }

    // 7. File Manager & File Operations
    if (/^(?:open|launch|start|show|view|go\s+to)?\s*(?:the\s*|my\s*)?(?:file\s*manager|files?|file\s*explorer|my\s*files|documents?)\b/i.test(norm) || norm === 'file manager' || norm === 'open file manager' || norm === 'open the file manager' || norm === 'go to file manager') {
      return { intent: 'OPEN_FILE_MANAGER' };
    }

    const cleanRaw = (raw || '').replace(/\s*\bdot\s+(txt|json|js|html|css|md|png|jpg|jpeg|mp4|webm|pdf|doc|docx)\b/gi, '.$1').trim();

    const saveAsMatch = norm.match(/^(?:save\s+(?:(?:this|the)\s+)?(?:notepad|note|file|document|text)?(?:\s+with\s+(?:the\s+)?text)?\s+as|save\s+it\s+as|save\s+as)\s+(.+)$/i);
    if (saveAsMatch) {
      const rawMatch = cleanRaw.match(/^(?:save\s+(?:(?:this|the)\s+)?(?:notepad|note|file|document|text)?(?:\s+with\s+(?:the\s+)?text)?\s+as|save\s+it\s+as|save\s+as)\s+(.+)$/i);
      let fname = (rawMatch ? rawMatch[1] : saveAsMatch[1]).trim();
      fname = fname.replace(/\s+(?:or whatever|whatever|please|thanks|now|right now)$/i, '').trim();
      fname = fname.replace(/\s+or\s+whatever(?=\.|$)/i, '').trim();
      if (!fname.includes('.')) fname += '.txt';
      return { intent: 'SAVE_AS', params: { name: fname, filename: fname } };
    }
    if (/^(?:save\s+(?:the\s+)?(?:note|file|notepad)|save\s+this\s+(?:file|note|notepad)|save\s+this|save\s+it|save\s+changes|save\s+note|save)$/i.test(norm) || norm === 'save file' || norm === 'save this file' || norm === 'save it' || norm === 'save notepad' || norm === 'save this notepad') {
      return { intent: 'SAVE_FILE' };
    }

    const createNamedFile = norm.match(/^(?:create|make|new|add)\s*(?:a\s*)?(?:new\s*)?(?:file|document|text\s*file)\s*(?:called|named)\s+(.+)$/i);
    if (createNamedFile) {
      const rawNamed = cleanRaw.match(/^(?:create|make|new|add)\s*(?:a\s*)?(?:new\s*)?(?:file|document|text\s*file)\s*(?:called|named)\s+(.+)$/i);
      const fname = (rawNamed ? rawNamed[1] : createNamedFile[1]).trim();
      return { intent: 'CREATE_FILE', params: { filename: fname } };
    }
    if (/^(?:create|make|new|add)\s*(?:a\s*)?(?:new\s*)?(?:file|document|text\s*file)\b/i.test(norm) || norm === 'create new file' || norm === 'create a new file' || norm === 'create a text file') {
      return { intent: 'CREATE_FILE' };
    }

    const createNamedFolder = norm.match(/^(?:create|make|new|add)\s*(?:a\s*)?(?:new\s*)?(?:folder|directory)\s*(?:called|named)\s+(.+)$/i);
    if (createNamedFolder) {
      const rawFld = cleanRaw.match(/^(?:create|make|new|add)\s*(?:a\s*)?(?:new\s*)?(?:folder|directory)\s*(?:called|named)\s+(.+)$/i);
      const fldName = (rawFld ? rawFld[1] : createNamedFolder[1]).trim();
      return { intent: 'CREATE_FOLDER', params: { folderName: fldName } };
    }
    if (/^(?:create|make|new|add)\s*(?:a\s*)?(?:new\s*)?(?:folder|directory)\b/i.test(norm) || norm === 'create new folder' || norm === 'create a new folder') {
      return { intent: 'CREATE_FOLDER' };
    }

    const openFolderMatch = norm.match(/^(?:open\s+(?:the\s+)?|go\s+to\s+(?:the\s+)?)(.+)\s+folder$/i);
    if (openFolderMatch) {
      const rawFldMatch = cleanRaw.match(/^(?:open\s+(?:the\s+)?|go\s+to\s+(?:the\s+)?)(.+)\s+folder$/i);
      const fldName = (rawFldMatch ? rawFldMatch[1] : openFolderMatch[1]).trim();
      return { intent: 'OPEN_FOLDER', params: { folderName: fldName } };
    }

    const renameMatch = norm.match(/^(?:rename\s+(?:this\s+file|the\s+file|file)?\s+to|rename\s+to)\s+(.+)$/i);
    if (renameMatch) {
      const rawRen = cleanRaw.match(/^(?:rename\s+(?:this\s+file|the\s+file|file)?\s+to|rename\s+to)\s+(.+)$/i);
      const newN = (rawRen ? rawRen[1] : renameMatch[1]).trim();
      return { intent: 'RENAME_FILE', params: { newName: newN } };
    }

    const delFileMatch = raw.match(/^(?:delete|remove|trash)\s+(?:file|note)\s*(.*)$/i) || norm.match(/^delete\s+this\s+file$/i);
    if (delFileMatch) {
      const fname = delFileMatch[1] ? delFileMatch[1].trim() : '';
      return { intent: 'DELETE_FILE', params: { name: fname, filename: fname } };
    }

    if (/^(?:download\s+(?:this\s+file|the\s+file|file)|download)$/i.test(norm)) {
      return { intent: 'DOWNLOAD_FILE' };
    }
    if (/^(?:refresh\s+files|refresh\s+file\s+manager|refresh)$/i.test(norm)) {
      return { intent: 'REFRESH_FILES' };
    }

    // Open file (e.g. "open Arya.txt" or "open file Arya.txt" or "open my notes file")
    const openFilePrefixMatch = cleanRaw.match(/^(?:open\s+file|view\s+file|read\s+file|open\s+note)\s+(.+)$/i);
    if (openFilePrefixMatch) {
      return { intent: 'OPEN_FILE', params: { name: openFilePrefixMatch[1].trim(), filename: openFilePrefixMatch[1].trim() } };
    }

    const openGeneralMatch = cleanRaw.match(/^open\s+(.+)$/i);
    if (openGeneralMatch) {
      const target = openGeneralMatch[1].trim();
      const targetLower = target.toLowerCase().replace(/^(?:the|a|an)\s+/i, '');
      const systemApps = ['camera', 'gallery', 'snake', 'snake game', 'notepad', 'file manager', 'files', 'wallpaper', 'clock', 'analogue clock', 'weather', 'calculator', 'calc', 'music', 'music player', 'task manager'];
      if (!systemApps.includes(targetLower)) {
        return { intent: 'OPEN_FILE', params: { name: target, filename: target } };
      }
    }

    // 8. Navigation & System
    if (/^(?:go\s+back|back)$/i.test(norm)) {
      return { intent: 'GO_BACK' };
    }
    if (/^scroll\s+up$/i.test(norm)) {
      return { intent: 'SCROLL_UP' };
    }
    if (/^scroll\s+down$/i.test(norm)) {
      return { intent: 'SCROLL_DOWN' };
    }
    if (/^(?:go\s+home|home|minimize\s+all|desktop|show\s+desktop)$/i.test(norm) || norm === 'go home') {
      return { intent: 'GO_HOME' };
    }
    if (/^(?:help|voice\s+help|show\s+help|what\s+can\s+i\s+say|voice\s+commands|how\s+to\s+use)\b/i.test(norm)) {
      return { intent: 'SHOW_HELP' };
    }
    if (/^(?:what\s+time\s+is\s+it|current\s+time|what\s+time)$/i.test(norm)) {
      return { intent: 'GET_TIME' };
    }
    if (/^(?:clear\s+logs|clear\s+terminal|clear)$/i.test(norm)) {
      return { intent: 'CLEAR_LOGS' };
    }
    if (/^(?:undo|revert)$/i.test(norm)) {
      return { intent: 'UNDO' };
    }
    if (/^(?:reset|uninstall\s+everything)$/i.test(norm)) {
      return { intent: 'RESET_SYSTEM' };
    }

    // 9. Windows
    const maxMatch = norm.match(/^(?:maximize|maximise|fullscreen|expand)\s*(.*)$/i);
    if (maxMatch) {
      const target = (maxMatch[1] || '').trim();
      return { intent: 'MAXIMIZE_WINDOW', params: { target } };
    }
    const restoreMatch = norm.match(/^(?:restore|unmaximize|unmaximise|shrink)\s*(.*)$/i);
    if (restoreMatch) {
      const target = (restoreMatch[1] || '').trim();
      return { intent: 'RESTORE_WINDOW', params: { target } };
    }
    const minMatch = norm.match(/^minimize\s*(.*)$/i);
    if (minMatch) {
      const target = (minMatch[1] || '').trim();
      return { intent: 'MINIMIZE_WINDOW', params: { target } };
    }
    const closeMatch = norm.match(/^close\s*(.*)$/i);
    if (closeMatch) {
      const target = (closeMatch[1] || '').trim();
      return { intent: 'CLOSE_WINDOW', params: { target } };
    }

    // 10. Wallpapers
    const wallDirectMatch = norm.match(/^(?:set\s+wallpaper|change\s+wallpaper|wallpaper)\s+(?:to\s+)?(.+)$/i);
    if (wallDirectMatch) {
      return { intent: 'SET_WALLPAPER', params: { theme: wallDirectMatch[1].trim() } };
    }
    if (/^(?:open|launch|show)?\s*(?:the\s*)?(?:wallpaper|wallpaper\s*studio|themes?|backgrounds?)\b/i.test(norm)) {
      return { intent: 'OPEN_WALLPAPER' };
    }

    // 11. Built-in Apps & Dynamic Voice Controls

    // Clock Color Customization (e.g. "change the color of the clock to neon green")
    const clockColorMatch = norm.match(/^(?:change|set|switch|make)\s+(?:the\s+)?(?:color\s+of\s+(?:the\s+)?clock|clock\s+color|clock\s+theme|clock)\s+(?:to\s+|as\s+)?(.+)$/i) || norm.match(/^clock\s+color\s+(?:to\s+)?(.+)$/i);
    if (clockColorMatch) {
      const rawColorMatch = cleanRaw.match(/^(?:change|set|switch|make)\s+(?:the\s+)?(?:color\s+of\s+(?:the\s+)?clock|clock\s+color|clock\s+theme|clock)\s+(?:to\s+|as\s+)?(.+)$/i) || cleanRaw.match(/^clock\s+color\s+(?:to\s+)?(.+)$/i);
      let color = (rawColorMatch ? rawColorMatch[1] : clockColorMatch[1]).trim();
      color = color.replace(/\s+(?:or whatever|whatever|please|thanks|now|right now)$/i, '').trim();
      return { intent: 'SET_CLOCK_COLOR', params: { color } };
    }

    // Music Player Controls & Song Selection
    if (/^(?:pause\s+(?:the\s+)?(?:music|song|track|audio)|pause)$/i.test(norm) || /^(?:stop\s+(?:the\s+)?(?:music|song|track|audio))$/i.test(norm)) {
      return { intent: 'PAUSE_MUSIC' };
    }
    if (/^(?:resume\s+(?:the\s+)?(?:music|song|track|audio)|unpause\s+music)$/i.test(norm)) {
      return { intent: 'RESUME_MUSIC' };
    }
    if (/^(?:next\s+(?:song|track)|skip\s+(?:song|track)|play\s+next\s+song)$/i.test(norm)) {
      return { intent: 'NEXT_SONG' };
    }
    if (/^(?:prev(?:ious)?\s+(?:song|track)|back\s+(?:song|track)|play\s+previous\s+song)$/i.test(norm)) {
      return { intent: 'PREV_SONG' };
    }
    if (/^(?:play\s+(?:the\s+)?(?:music|songs?|audio)|start\s+music)$/i.test(norm)) {
      return { intent: 'PLAY_MUSIC' };
    }
    const songMatch = norm.match(/^(?:play\s+(?:the\s+)?(?:song|track)\s+|play\s+)(.+)$/i);
    if (songMatch) {
      const title = songMatch[1].trim();
      if (!['game', 'snake', 'snake game', 'music', 'songs', 'audio'].includes(title)) {
        const rawSongMatch = cleanRaw.match(/^(?:play\s+(?:the\s+)?(?:song|track)\s+|play\s+)(.+)$/i);
        let songTitle = (rawSongMatch ? rawSongMatch[1] : title).trim();
        songTitle = songTitle.replace(/\s+(?:or whatever|whatever|please|thanks|now|right now)$/i, '').trim();
        return { intent: 'PLAY_SONG', params: { title: songTitle, song: songTitle } };
      }
    }

    const writeMatch = raw.match(/^(?:write\s+to\s+notepad|write\s+in\s+notepad|write\s+down|write|type\s+in\s+notepad|type|note\s+down|note|add\s+to\s+note|add\s+note)\s+(.+)$/i);
    if (writeMatch) {
      return { intent: 'WRITE_NOTEPAD', params: { text: writeMatch[1].trim() } };
    }
    if (/^(?:open|launch|start|show)?\s*(?:the\s*)?(?:notepad|notes?|text\s*editor|memo)\b/i.test(norm) || norm === 'notepad' || norm === 'open notepad') {
      return { intent: 'OPEN_NOTEPAD' };
    }
    if (/^(?:open|launch|show)?\s*(?:the\s*)?(?:analogue\s*clock|analog\s*clock)\b/i.test(norm)) {
      return { intent: 'OPEN_ANALOGUE_CLOCK' };
    }
    if (/^(?:open|launch|show)?\s*(?:the\s*)?(?:clock|timer|stopwatch)\b/i.test(norm) || norm === 'clock' || norm === 'open clock') {
      return { intent: 'OPEN_CLOCK' };
    }
    if (/^(?:open|launch|show)?\s*(?:the\s*)?(?:weather|forecast)\b/i.test(norm) || /weather/i.test(norm) || norm === 'weather' || norm === 'open weather' || norm === 'weather in raipur' || norm === 'what is the weather' || norm === 'check weather') {
      return { intent: 'OPEN_WEATHER' };
    }
    if (/^(?:open|launch|show)?\s*(?:the\s*)?(?:calculator|calc|math)\b/i.test(norm)) {
      return { intent: 'OPEN_CALC' };
    }
    if (/^(?:open|launch|show|play)?\s*(?:the\s*)?(?:music|music\s*player|audio\s*player|songs?)\b/i.test(norm)) {
      return { intent: 'OPEN_MUSIC' };
    }
    if (/^(?:open|launch|show)?\s*(?:the\s*)?(?:task\s*manager|process\s*manager|manager|taskmgr)\b/i.test(norm)) {
      return { intent: 'OPEN_TASK_MANAGER' };
    }

    return null;
  }

  // Unified Assistant State Helper
  function setAssistantState(state, detail = '') {
    if (!assistantStateTitle || !assistantSubtext) return;
    switch(state) {
      case 'READY':
        assistantStateTitle.textContent = 'Click Microphone to Speak';
        assistantSubtext.textContent = 'Click the microphone button or press Space to speak a command.';
        break;
      case 'LISTENING':
        assistantStateTitle.textContent = detail ? `Hearing: "${detail}"` : '🎙️ Listening...';
        assistantSubtext.textContent = 'Listening... Please speak.';
        break;
      case 'PROCESSING':
        assistantStateTitle.textContent = detail ? `🗣️ You said: "${detail}"` : 'Processing command...';
        assistantSubtext.textContent = 'Understanding your command...';
        break;
      case 'EXECUTING':
        assistantStateTitle.textContent = detail ? `⚡ ${detail}` : 'Executing command...';
        assistantSubtext.textContent = 'Executing command...';
        break;
      case 'SUCCESS':
        assistantStateTitle.textContent = detail ? `✅ ${detail}` : 'Command executed';
        assistantSubtext.textContent = 'Command completed successfully.';
        break;
      case 'ERROR':
        assistantStateTitle.textContent = "I didn't understand that command";
        assistantSubtext.textContent = detail || 'Try saying "Open camera", "Save as Arya.txt", or "Open snake".';
        break;
    }
  }

  // Helper to save file directly with optional overwrite flag
  function executeSaveAsDirect(saveName, overwrite, rawText) {
    sendMessageToApp('File Manager', {
      type: 'os:action',
      action: 'SAVE_FILE_AS',
      params: { filename: saveName, overwrite }
    });

    sendMessageToApp('Notepad', {
      type: 'os:save-note-as',
      filename: saveName
    });

    saveCurrentNoteToFileManager(saveName);

    if (assistantStateTitle) assistantStateTitle.textContent = `🗣️ You said: "${rawText || ('save as ' + saveName)}"`;
    if (assistantSubtext) assistantSubtext.textContent = `✅ Saved as "${saveName}"`;
    speak(`File saved as ${saveName}`);
    showToast(`Saved as "${saveName}"`, 'success', 'File Manager');
    addLog('VOICE OS', `Saved as "${saveName}" (overwrite: ${!!overwrite})`, 'gemini-entry');
  }

  // Unified Action Router (Voice, Mouse, Keyboard all call this!)
  async function executeAction(action, parameters = {}) {
    if (!action) return false;
    const act = (action || '').toUpperCase();
    const params = parameters || {};
    const rawText = params._rawText || '';
    const ctx = getCurrentContext();

    function setGuidance(title, feedbackSub, speechText, toastMsg, toastCat) {
      if (assistantStateTitle) assistantStateTitle.textContent = title;
      if (assistantSubtext) assistantSubtext.textContent = feedbackSub;
      if (speechText) speak(speechText);
      if (toastMsg) showToast(toastMsg, 'success', toastCat || 'Voice OS');
      addLog('VOICE OS', `${title} → ${feedbackSub}`, 'gemini-entry');
    }

    // 1. Confirmations
    if (act === 'CONFIRM_YES') {
      confirmVoiceAction();
      return true;
    }
    if (act === 'CONFIRM_NO') {
      cancelVoiceAction();
      return true;
    }

    // 2. Interrupts & Stops
    if (act === 'STOP_LISTENING' || act === 'CANCEL') {
      stopListening();
      if (pendingVoiceConfirm) cancelVoiceAction();
      setAssistantState('READY', 'Listening stopped');
      speak('Stopped.');
      return true;
    }

    // 3. Navigation & Window Management
    if (act === 'GO_HOME' || act === 'MINIMIZE_ALL') {
      document.querySelectorAll('.os-window-floating:not(.is-closing)').forEach(w => minimizeWindow(w));
      setGuidance(`🗣️ You said: "${rawText || 'go home'}"`, '✅ Showing Desktop (windows minimized)', 'Showing desktop', 'Desktop shown', 'Voice OS');
      return true;
    }
    if (act === 'GO_BACK') {
      if (ctx.feature === 'file-manager') {
        sendMessageToApp('File Manager', { type: 'os:action', action: 'GO_BACK' });
      } else if (ctx.feature === 'camera') {
        sendMessageToApp('Camera', { type: 'os:action', action: 'RETAKE' });
      } else if (ctx.win) {
        closeWindow(ctx.win);
      }
      setGuidance(`🗣️ You said: "${rawText || 'go back'}"`, '✅ Navigated back', 'Going back', 'Navigated back', 'Voice OS');
      return true;
    }
    if (act === 'SCROLL_UP') {
      if (ctx.win) {
        const iframe = ctx.win.querySelector('.window-iframe');
        if (iframe && iframe.contentWindow) iframe.contentWindow.scrollBy({ top: -220, behavior: 'smooth' });
      } else {
        window.scrollBy({ top: -220, behavior: 'smooth' });
      }
      setGuidance(`🗣️ You said: "${rawText || 'scroll up'}"`, '✅ Scrolled up', null, null, 'Voice OS');
      return true;
    }
    if (act === 'SCROLL_DOWN') {
      if (ctx.win) {
        const iframe = ctx.win.querySelector('.window-iframe');
        if (iframe && iframe.contentWindow) iframe.contentWindow.scrollBy({ top: 220, behavior: 'smooth' });
      } else {
        window.scrollBy({ top: 220, behavior: 'smooth' });
      }
      setGuidance(`🗣️ You said: "${rawText || 'scroll down'}"`, '✅ Scrolled down', null, null, 'Voice OS');
      return true;
    }
    if (act === 'SHOW_HELP') {
      const helpModal = document.getElementById('voiceHelpModal');
      if (helpModal) helpModal.style.display = 'flex';
      setGuidance(`🗣️ You said: "${rawText || 'help'}"`, '✅ Showing Voice Commands help...', 'Showing voice commands reference', 'Voice Commands', 'Help');
      return true;
    }
    if (act === 'GET_TIME') {
      const timeStr = new Date().toLocaleTimeString();
      setGuidance(`🗣️ You said: "${rawText || 'what time is it'}"`, `🕒 Current Time: ${timeStr}`, `The time is ${timeStr}`, `Time: ${timeStr}`, 'Clock');
      return true;
    }
    if (act === 'CLEAR_LOGS') {
      if (chatLogs) chatLogs.innerHTML = '';
      setGuidance(`🗣️ You said: "${rawText || 'clear logs'}"`, '✅ Terminal logs cleared', 'Logs cleared', 'Terminal cleared', 'Terminal');
      return true;
    }
    if (act === 'CLOSE_WINDOW') {
      const query = params.target || ctx.title || '';
      const targetWin = findWindowByClosestTitle(query);
      if (targetWin) {
        const title = targetWin.querySelector('.window-title-text')?.textContent || targetWin.dataset.title || 'App';
        closeWindow(targetWin);
        setGuidance(`🗣️ You said: "${rawText || ('close ' + query)}"`, `✅ Closed "${title}"`, `Closed ${title}`, `Closed ${title}`, 'Voice OS');
      } else {
        showToast(`Could not find a window matching "${query}" to close.`, 'warning', 'Close Window');
      }
      return true;
    }
    if (act === 'MINIMIZE_WINDOW') {
      const query = params.target || ctx.title || '';
      const targetWin = findWindowByClosestTitle(query);
      if (targetWin) {
        const title = targetWin.querySelector('.window-title-text')?.textContent || targetWin.dataset.title || 'App';
        minimizeWindow(targetWin);
        setGuidance(`🗣️ You said: "${rawText || ('minimize ' + query)}"`, `✅ Minimized "${title}"`, `Minimized ${title}`, `Minimized ${title}`, 'Voice OS');
      } else {
        showToast(`Could not find a window matching "${query}" to minimize.`, 'warning', 'Minimize Window');
      }
      return true;
    }
    if (act === 'MAXIMIZE_WINDOW') {
      const query = params.target || ctx.title || '';
      const targetWin = findWindowByClosestTitle(query);
      if (targetWin) {
        const title = targetWin.querySelector('.window-title-text')?.textContent || targetWin.dataset.title || 'App';
        maximizeWindow(targetWin);
        setGuidance(`🗣️ You said: "${rawText || ('maximize ' + query)}"`, `✅ Maximized "${title}"`, `Maximized ${title}`, `Maximized ${title}`, 'Voice OS');
      } else {
        showToast(`Could not find a window matching "${query}" to maximize.`, 'warning', 'Maximize Window');
      }
      return true;
    }
    if (act === 'RESTORE_WINDOW') {
      const query = params.target || ctx.title || '';
      const targetWin = findWindowByClosestTitle(query);
      if (targetWin) {
        const title = targetWin.querySelector('.window-title-text')?.textContent || targetWin.dataset.title || 'App';
        restoreMaximizedWindow(targetWin);
        setGuidance(`🗣️ You said: "${rawText || ('restore ' + query)}"`, `✅ Restored "${title}"`, `Restored ${title}`, `Restored ${title}`, 'Voice OS');
      } else {
        showToast(`Could not find a window matching "${query}" to restore.`, 'warning', 'Restore Window');
      }
      return true;
    }

    // 4. Camera & Video Recording
    if (act === 'OPEN_CAMERA') {
      setGuidance(`🗣️ You said: "${rawText || 'open camera'}"`, '✅ Opening Camera...', 'Opening Camera', 'Camera opened', 'Camera');
      launchOrFocusApp('Camera');
      return true;
    }
    if (act === 'TAKE_PHOTO') {
      if (ctx.feature !== 'camera') {
        speak('Opening Camera to capture photo.');
        setGuidance(`🗣️ You said: "${rawText || 'take a photo'}"`, '✅ Opening Camera to capture photo...', null, 'Opening camera', 'Camera');
        launchOrFocusApp('Camera');
        setTimeout(() => sendMessageToApp('Camera', { type: 'os:action', action: 'TAKE_PHOTO' }), 800);
      } else {
        setGuidance(`🗣️ You said: "${rawText || 'take a photo'}"`, '✅ Capturing photo...', 'Taking photo', 'Photo captured', 'Camera');
        sendMessageToApp('Camera', { type: 'os:action', action: 'TAKE_PHOTO' });
      }
      return true;
    }
    if (act === 'RETAKE_PHOTO') {
      setGuidance(`🗣️ You said: "${rawText || 'retake photo'}"`, '✅ Retaking photo...', 'Retaking photo', 'Ready to retake', 'Camera');
      sendMessageToApp('Camera', { type: 'os:action', action: 'RETAKE_PHOTO' });
      return true;
    }
    if (act === 'SAVE_PHOTO') {
      setGuidance(`🗣️ You said: "${rawText || 'save photo'}"`, '✅ Saving photo to Gallery...', 'Saving photo to Gallery', 'Photo saved', 'Camera');
      sendMessageToApp('Camera', { type: 'os:action', action: 'SAVE_PHOTO' });
      return true;
    }
    if (act === 'DELETE_PHOTO') {
      showVoiceConfirmModal(
        'Delete Photo',
        'Are you sure you want to delete this photo?',
        async () => {
          sendMessageToApp('Gallery', { type: 'os:action', action: 'DELETE_CURRENT' });
          sendMessageToApp('Camera', { type: 'os:action', action: 'RETAKE_PHOTO' });
          try {
            const all = await getAllMediaFromDB();
            const photos = all.filter(m => m.type === 'photo');
            if (photos.length > 0) {
              await deleteMediaFromDB(photos[0].id);
              broadcastMediaChanged();
            }
          } catch (e) {}
          speak('Photo deleted.');
          showToast('Photo deleted successfully.', 'success', 'Gallery');
          setAssistantState('SUCCESS', 'Photo deleted.');
        }
      );
      return true;
    }
    if (act === 'START_RECORDING') {
      if (ctx.feature !== 'camera') {
        speak('Opening Camera to start recording.');
        launchOrFocusApp('Camera');
        setTimeout(() => sendMessageToApp('Camera', { type: 'os:action', action: 'START_RECORDING' }), 800);
      } else {
        sendMessageToApp('Camera', { type: 'os:action', action: 'START_RECORDING' });
      }
      setGuidance(`🗣️ You said: "${rawText || 'start recording'}"`, '✅ Starting video recording...', 'Starting video recording', 'Recording started', 'Camera');
      return true;
    }
    if (act === 'PAUSE_RECORDING') {
      setGuidance(`🗣️ You said: "${rawText || 'pause recording'}"`, '⏸️ Video recording paused', 'Recording paused', 'Recording paused', 'Camera');
      sendMessageToApp('Camera', { type: 'os:action', action: 'PAUSE_RECORDING' });
      return true;
    }
    if (act === 'RESUME_RECORDING') {
      setGuidance(`🗣️ You said: "${rawText || 'resume recording'}"`, '▶️ Video recording resumed', 'Recording resumed', 'Recording resumed', 'Camera');
      sendMessageToApp('Camera', { type: 'os:action', action: 'RESUME_RECORDING' });
      return true;
    }
    if (act === 'STOP_RECORDING') {
      setGuidance(`🗣️ You said: "${rawText || 'stop recording'}"`, '✅ Stopping video recording...', 'Stopping recording', 'Recording finished', 'Camera');
      sendMessageToApp('Camera', { type: 'os:action', action: 'STOP_RECORDING' });
      return true;
    }
    if (act === 'SAVE_VIDEO') {
      setGuidance(`🗣️ You said: "${rawText || 'save video'}"`, '✅ Saving video to Gallery...', 'Saving video to Gallery', 'Video saved', 'Camera');
      sendMessageToApp('Camera', { type: 'os:action', action: 'SAVE_VIDEO' });
      return true;
    }
    if (act === 'DELETE_VIDEO') {
      showVoiceConfirmModal(
        'Delete Video',
        'Are you sure you want to delete this video?',
        async () => {
          sendMessageToApp('Gallery', { type: 'os:action', action: 'DELETE_CURRENT' });
          sendMessageToApp('Camera', { type: 'os:action', action: 'RETAKE' });
          try {
            const all = await getAllMediaFromDB();
            const vids = all.filter(m => m.type === 'video');
            if (vids.length > 0) {
              await deleteMediaFromDB(vids[0].id);
              broadcastMediaChanged();
            }
          } catch (e) {}
          speak('Video deleted.');
          showToast('Video deleted successfully.', 'success', 'Gallery');
          setAssistantState('SUCCESS', 'Video deleted.');
        }
      );
      return true;
    }
    if (act === 'SWITCH_CAMERA') {
      sendMessageToApp('Camera', { type: 'os:action', action: 'SWITCH_CAMERA' });
      setGuidance(`🗣️ You said: "${rawText || 'switch camera'}"`, '✅ Switching camera...', 'Switching camera', 'Camera switched', 'Camera');
      return true;
    }

    // 5. Gallery
    if (act === 'OPEN_GALLERY') {
      setGuidance(`🗣️ You said: "${rawText || 'open gallery'}"`, '✅ Opening Gallery...', 'Opening Gallery', 'Gallery opened', 'Gallery');
      launchOrFocusApp('Gallery');
      return true;
    }
    if (act === 'SHOW_PHOTOS') {
      setGuidance(`🗣️ You said: "${rawText || 'show photos'}"`, '✅ Showing Photos in Gallery...', 'Showing photos', 'Filter: Photos', 'Gallery');
      launchOrFocusApp('Gallery');
      setTimeout(() => sendMessageToApp('Gallery', { type: 'os:action', action: 'FILTER_PHOTOS' }), 300);
      return true;
    }
    if (act === 'SHOW_VIDEOS') {
      setGuidance(`🗣️ You said: "${rawText || 'show videos'}"`, '✅ Showing Videos in Gallery...', 'Showing videos', 'Filter: Videos', 'Gallery');
      launchOrFocusApp('Gallery');
      setTimeout(() => sendMessageToApp('Gallery', { type: 'os:action', action: 'FILTER_VIDEOS' }), 300);
      return true;
    }
    if (act === 'SHOW_ALL_MEDIA') {
      setGuidance(`🗣️ You said: "${rawText || 'show all'}"`, '✅ Showing all media in Gallery...', 'Showing all media', 'Filter: All', 'Gallery');
      launchOrFocusApp('Gallery');
      setTimeout(() => sendMessageToApp('Gallery', { type: 'os:action', action: 'FILTER_ALL' }), 300);
      return true;
    }
    if (act === 'OPEN_LATEST_PHOTO') {
      setGuidance(`🗣️ You said: "${rawText || 'open latest photo'}"`, '✅ Opening latest photo in Gallery...', 'Opening latest photo', 'Viewing Photo', 'Gallery');
      launchOrFocusApp('Gallery');
      setTimeout(() => sendMessageToApp('Gallery', { type: 'os:action', action: 'OPEN_LATEST_PHOTO' }), 400);
      return true;
    }
    if (act === 'PLAY_LATEST_VIDEO') {
      setGuidance(`🗣️ You said: "${rawText || 'play latest video'}"`, '✅ Playing latest video in Gallery...', 'Playing latest video', 'Playing Video', 'Gallery');
      launchOrFocusApp('Gallery');
      setTimeout(() => sendMessageToApp('Gallery', { type: 'os:action', action: 'PLAY_LATEST_VIDEO' }), 400);
      return true;
    }
    if (act === 'CLEAR_GALLERY') {
      showVoiceConfirmModal(
        'Clear Gallery',
        'Are you sure you want to delete all photos and videos in your gallery?',
        async () => {
          try {
            const all = await getAllMediaFromDB();
            for (const item of all) {
              await deleteMediaFromDB(item.id);
            }
            broadcastMediaChanged();
          } catch (e) {}
          speak('Gallery cleared.');
          showToast('All gallery media deleted.', 'success', 'Gallery');
        }
      );
      return true;
    }

    // 6. File Manager & File Operations
    if (act === 'OPEN_FILE_MANAGER') {
      setGuidance(`🗣️ You said: "${rawText || 'open file manager'}"`, '✅ Opening File Manager...', 'Opening File Manager', 'File Manager opened', 'File Manager');
      launchOrFocusApp('File Manager');
      return true;
    }
    if (act === 'CREATE_FILE') {
      const fname = params.filename || '';
      launchOrFocusApp('File Manager');
      setTimeout(() => {
        sendMessageToApp('File Manager', { type: 'os:action', action: 'CREATE_FILE', params: { filename: fname, content: params.content || '' } });
      }, 350);
      setGuidance(`🗣️ You said: "${rawText || 'create a new file'}"`, fname ? `✅ Creating file "${fname}"...` : '✅ Opening new file dialog...', fname ? `Creating file ${fname}` : 'Creating new file', fname ? `Created ${fname}` : 'New file', 'File Manager');
      return true;
    }
    if (act === 'CREATE_FOLDER') {
      const fldName = params.folderName || '';
      launchOrFocusApp('File Manager');
      setTimeout(() => {
        sendMessageToApp('File Manager', { type: 'os:action', action: 'CREATE_FOLDER', params: { folderName: fldName } });
      }, 350);
      setGuidance(`🗣️ You said: "${rawText || 'create a new folder'}"`, fldName ? `✅ Creating folder "${fldName}"...` : '✅ Opening new folder dialog...', fldName ? `Creating folder ${fldName}` : 'Creating new folder', fldName ? `Created ${fldName}` : 'New folder', 'File Manager');
      return true;
    }
    if (act === 'SAVE_FILE') {
      setGuidance(`🗣️ You said: "${rawText || 'save file'}"`, '✅ Saving file...', 'Saving file', 'File saved successfully', 'File Manager');
      const sentToFm = sendMessageToApp('File Manager', { type: 'os:action', action: 'SAVE_FILE' });
      const savedNote = saveCurrentNoteToFileManager();
      if (!sentToFm && !savedNote) {
        showToast('File saved successfully!', 'success', 'File Manager');
        speak('File saved successfully');
      }
      return true;
    }
    if (act === 'SAVE_AS' || act === 'SAVE_FILE_AS') {
      const customName = (params.filename || params.name || 'notes.txt').trim();
      const allFiles = getStoredFiles();
      const duplicate = allFiles.find(f => f.name.toLowerCase() === customName.toLowerCase());

      if (duplicate) {
        showVoiceConfirmModal(
          'Replace Existing File?',
          `A file named "${customName}" already exists. Should I replace it?`,
          () => {
            executeSaveAsDirect(customName, true, rawText);
          },
          () => {
            speak('Save cancelled.');
            setAssistantState('READY', 'Save cancelled');
          }
        );
        speak(`A file named ${customName} already exists. Should I replace it?`);
        setAssistantState('PROCESSING', `A file named "${customName}" already exists.`);
        return true;
      } else {
        executeSaveAsDirect(customName, false, rawText);
        return true;
      }
    }
    if (act === 'OPEN_FILE') {
      const fName = (params.filename || params.name || '').trim();
      const opened = openFileInNotepadByName(fName);
      if (opened) {
        setGuidance(`🗣️ You said: "${rawText || ('open ' + fName)}"`, `✅ Opened "${fName}" in Notepad`, `Opened ${fName}`, `Opened in Notepad`, 'Notepad');
      } else {
        launchOrFocusApp('File Manager');
        setTimeout(() => sendMessageToApp('File Manager', { type: 'os:action', action: 'OPEN_FILE', params: { filename: fName } }), 350);
        setGuidance(`🗣️ You said: "${rawText || ('open ' + fName)}"`, `✅ Opening File Manager for "${fName}"...`, `Opening ${fName}`, `File Manager opened`, 'File Manager');
      }
      return true;
    }
    if (act === 'OPEN_FOLDER') {
      const fld = (params.folderName || '').trim();
      launchOrFocusApp('File Manager');
      setTimeout(() => sendMessageToApp('File Manager', { type: 'os:action', action: 'OPEN_FOLDER', params: { folderName: fld } }), 350);
      setGuidance(`🗣️ You said: "${rawText || ('open ' + fld + ' folder')}"`, `✅ Opening folder "${fld}"...`, `Opening ${fld} folder`, `Folder opened`, 'File Manager');
      return true;
    }
    if (act === 'RENAME_FILE') {
      const newN = (params.newName || '').trim();
      sendMessageToApp('File Manager', { type: 'os:action', action: 'RENAME_FILE', params: { newName: newN } });
      setGuidance(`🗣️ You said: "${rawText || ('rename to ' + newN)}"`, `✅ Renamed file to "${newN}"`, `Renamed file to ${newN}`, `File renamed`, 'File Manager');
      return true;
    }
    if (act === 'DELETE_FILE') {
      const targetName = (params.filename || params.name || 'this file').trim();
      showVoiceConfirmModal(
        'Delete File',
        `Are you sure you want to delete "${targetName}"?`,
        () => {
          sendMessageToApp('File Manager', { type: 'os:action', action: 'DELETE_FILE', params: { filename: targetName } });
          const files = getFilesFromStorage();
          const idx = files.findIndex(f => f.name.toLowerCase() === targetName.toLowerCase() || f.id === targetName);
          if (idx !== -1) {
            const delName = files[idx].name;
            files.splice(idx, 1);
            saveFilesToStorage(files);
            broadcastFilesChanged();
            speak(`File ${delName} deleted.`);
            showToast(`Deleted "${delName}"`, 'success', 'File Manager');
            setAssistantState('SUCCESS', `File "${delName}" deleted`);
          } else {
            showToast(`File "${targetName}" deleted.`, 'success', 'File Manager');
            speak(`File deleted.`);
          }
        }
      );
      return true;
    }
    if (act === 'DOWNLOAD_FILE') {
      sendMessageToApp('File Manager', { type: 'os:action', action: 'DOWNLOAD_FILE' });
      setGuidance(`🗣️ You said: "${rawText || 'download file'}"`, '✅ Downloading file...', 'Downloading file', 'Downloading file', 'File Manager');
      return true;
    }
    if (act === 'REFRESH_FILES') {
      sendMessageToApp('File Manager', { type: 'os:action', action: 'REFRESH' });
      setGuidance(`🗣️ You said: "${rawText || 'refresh files'}"`, '✅ Files refreshed', 'Files refreshed', 'Files refreshed', 'File Manager');
      return true;
    }

    // 7. Snake Game
    if (act === 'OPEN_SNAKE') {
      setGuidance(`🗣️ You said: "${rawText || 'open snake game'}"`, '🐍 Opening Snake Game...', 'Opening Snake Game. Speak Up, Down, Left, Right to steer.', 'Snake Game opened', 'Arcade');
      launchOrFocusApp('Snake Game');
      return true;
    }
    if (act === 'START_GAME' || act === 'SNAKE_START') {
      setGuidance(`🗣️ You said: "${rawText || 'start game'}"`, '✅ Starting Snake Game...', 'Starting game', 'Game started', 'Arcade');
      if (!sendMessageToApp('Snake Game', { type: 'os:action', action: 'SNAKE_START' })) {
        launchOrFocusApp('Snake Game');
        setTimeout(() => sendMessageToApp('Snake Game', { type: 'os:action', action: 'SNAKE_START' }), 350);
      }
      return true;
    }
    if (act === 'PAUSE_GAME' || act === 'SNAKE_PAUSE') {
      sendMessageToApp('Snake Game', { type: 'os:action', action: 'SNAKE_PAUSE' });
      setGuidance(`🗣️ You said: "${rawText || 'pause game'}"`, '⏸️ Snake Game paused', 'Game paused', 'Game paused', 'Arcade');
      return true;
    }
    if (act === 'RESUME_GAME' || act === 'SNAKE_RESUME') {
      sendMessageToApp('Snake Game', { type: 'os:action', action: 'SNAKE_RESUME' });
      setGuidance(`🗣️ You said: "${rawText || 'resume game'}"`, '▶️ Snake Game resumed', 'Game resumed', 'Game resumed', 'Arcade');
      return true;
    }
    if (act === 'RESTART_GAME' || act === 'SNAKE_RESTART') {
      sendMessageToApp('Snake Game', { type: 'os:action', action: 'SNAKE_RESTART' });
      setGuidance(`🗣️ You said: "${rawText || 'restart game'}"`, '🔄 Snake Game restarted', 'Game restarted', 'Game restarted', 'Arcade');
      return true;
    }
    if (act.startsWith('MOVE_') || act === 'SNAKE_MOVE') {
      const dir = (params.direction || act.replace('MOVE_', '')).toUpperCase();
      sendMessageToApp('Snake Game', { type: 'os:action', action: 'SNAKE_MOVE', params: { direction: dir } });
      if (assistantStateTitle) assistantStateTitle.textContent = `🎙️ ${dir}`;
      if (liveTranscript) liveTranscript.textContent = `"${rawText || dir}"`;
      return true;
    }

    // 8. Other Apps & Wallpapers
    if (act === 'WRITE_NOTEPAD') {
      const textToWrite = params.text || '';
      writeTextToNotepad(textToWrite);
      setGuidance(`🗣️ You said: "${rawText || ('write ' + textToWrite)}"`, `✅ Added to Notepad: "${textToWrite}"`, `Wrote to Notepad: ${textToWrite}`, `Added to Notepad`, 'Notepad');
      return true;
    }
    if (act === 'OPEN_NOTEPAD') {
      setGuidance(`🗣️ You said: "${rawText || 'open notepad'}"`, '✅ Opening Notepad...', 'Opening Notepad', 'Notepad opened', 'Notepad');
      launchOrFocusApp('Notepad');
      return true;
    }
    if (act === 'SET_WALLPAPER') {
      const themeArg = (params.theme || '').toLowerCase();
      if (/^(reset|default|clear|none|original)$/i.test(themeArg)) {
        applyWallpaper('', true);
        setGuidance(`🗣️ You said: "${rawText || 'reset wallpaper'}"`, '✅ Wallpaper reset to default', 'Wallpaper reset to default', 'Wallpaper reset', 'Wallpaper Studio');
        return true;
      }
      for (const key of Object.keys(WALLPAPER_PRESETS)) {
        if (themeArg.includes(key)) {
          applyWallpaper(WALLPAPER_PRESETS[key], true);
          setGuidance(`🗣️ You said: "${rawText || ('set wallpaper ' + key)}"`, `✅ Applied ${key} wallpaper`, `Applied ${key} wallpaper`, `Theme: ${key}`, 'Wallpaper Studio');
          return true;
        }
      }
      return true;
    }
    if (act === 'OPEN_WALLPAPER') {
      setGuidance(`🗣️ You said: "${rawText || 'open wallpaper'}"`, '✅ Opening Wallpaper Studio...', 'Opening Wallpaper Studio', 'Wallpaper Studio opened', 'Wallpaper');
      launchOrFocusApp('Wallpaper Studio');
      return true;
    }
    if (act === 'OPEN_ANALOGUE_CLOCK') {
      setGuidance(`🗣️ You said: "${rawText || 'open analogue clock'}"`, '✅ Opening Analogue Clock...', 'Opening Analogue Clock', 'Clock opened', 'Clock');
      launchOrFocusApp('Analogue Clock');
      return true;
    }
    if (act === 'OPEN_CLOCK') {
      setGuidance(`🗣️ You said: "${rawText || 'open clock'}"`, '✅ Opening Clock...', 'Opening Clock', 'Clock opened', 'Clock');
      launchOrFocusApp('Clock');
      return true;
    }
    if (act === 'SET_CLOCK_COLOR' || act === 'CHANGE_CLOCK_COLOR') {
      const color = (params.color || params.theme || 'neon green').trim();
      localStorage.setItem('os_clock_color', color);
      launchOrFocusApp('Clock');
      const sendColorMsg = () => {
        sendMessageToApp('Clock', { type: 'os:action', action: 'SET_CLOCK_COLOR', params: { color } });
        sendMessageToApp('Analogue Clock', { type: 'os:action', action: 'SET_CLOCK_COLOR', params: { color } });
      };
      setTimeout(sendColorMsg, 120);
      setTimeout(sendColorMsg, 400);
      setGuidance(`🗣️ You said: "${rawText || ('change clock color to ' + color)}"`, `✅ Clock color set to ${color}`, `Clock color changed to ${color}`, `Clock Color: ${color}`, 'Clock');
      return true;
    }
    if (act === 'OPEN_WEATHER') {
      setGuidance(`🗣️ You said: "${rawText || 'open weather'}"`, '🌤️ Opening Raipur, Chhattisgarh Weather...', 'Here is the current weather in Raipur, Chhattisgarh.', 'Weather opened', 'Weather');
      launchOrFocusApp('Weather');
      return true;
    }
    if (act === 'OPEN_CALC') {
      setGuidance(`🗣️ You said: "${rawText || 'open calculator'}"`, '✅ Opening Calculator...', 'Opening Calculator', 'Calculator opened', 'Calculator');
      launchOrFocusApp('Calculator');
      return true;
    }
    if (act === 'OPEN_MUSIC') {
      setGuidance(`🗣️ You said: "${rawText || 'open music player'}"`, '✅ Opening Music Player...', 'Opening Music Player', 'Music Player opened', 'Music');
      launchOrFocusApp('Music Player');
      return true;
    }
    if (act === 'PLAY_SONG') {
      const songTitle = (params.title || params.song || '').trim();
      launchOrFocusApp('Music Player');
      const sendSongMsg = () => {
        sendMessageToApp('Music Player', { type: 'os:action', action: 'PLAY_SONG', params: { title: songTitle } });
      };
      setTimeout(sendSongMsg, 120);
      setTimeout(sendSongMsg, 400);
      setGuidance(`🗣️ You said: "${rawText || ('play song ' + songTitle)}"`, `🎵 Playing "${songTitle}" in Music Player`, `Playing ${songTitle}`, `Playing: ${songTitle}`, 'Music');
      return true;
    }
    if (act === 'PAUSE_MUSIC') {
      sendMessageToApp('Music Player', { type: 'os:action', action: 'PAUSE_MUSIC' });
      setGuidance(`🗣️ You said: "${rawText || 'pause music'}"`, '⏸️ Music paused', 'Music paused', 'Paused', 'Music');
      return true;
    }
    if (act === 'RESUME_MUSIC' || act === 'PLAY_MUSIC') {
      launchOrFocusApp('Music Player');
      setTimeout(() => {
        sendMessageToApp('Music Player', { type: 'os:action', action: 'RESUME_MUSIC' });
      }, 180);
      setGuidance(`🗣️ You said: "${rawText || 'resume music'}"`, '▶️ Resuming Music...', 'Resuming music', 'Playing', 'Music');
      return true;
    }
    if (act === 'NEXT_SONG') {
      launchOrFocusApp('Music Player');
      setTimeout(() => {
        sendMessageToApp('Music Player', { type: 'os:action', action: 'NEXT_SONG' });
      }, 180);
      setGuidance(`🗣️ You said: "${rawText || 'next song'}"`, '⏭️ Playing next track...', 'Playing next track', 'Next Track', 'Music');
      return true;
    }
    if (act === 'PREV_SONG') {
      launchOrFocusApp('Music Player');
      setTimeout(() => {
        sendMessageToApp('Music Player', { type: 'os:action', action: 'PREV_SONG' });
      }, 180);
      setGuidance(`🗣️ You said: "${rawText || 'previous song'}"`, '⏮️ Playing previous track...', 'Playing previous track', 'Previous Track', 'Music');
      return true;
    }
    if (act === 'OPEN_TASK_MANAGER') {
      setGuidance(`🗣️ You said: "${rawText || 'open task manager'}"`, '✅ Opening Task Manager...', 'Opening Task Manager', 'Task Manager opened', 'Tasks');
      launchOrFocusApp('Task Manager');
      return true;
    }

    return false;
  }

  // 3. Command Router
  function routeVoiceIntent(action, rawText) {
    if (!action) return false;
    return executeAction(action.intent, { ...action.params, _rawText: rawText });
  }

  if (typeof window !== 'undefined') {
    window.executeAction = executeAction;
    window.getCurrentContext = getCurrentContext;
    window.setAssistantState = setAssistantState;
  }

  // Handle local commands before calling API: Normalizer -> Intent -> Router
  function tryHandleLocalCommand(commandText) {
    if (!commandText || !commandText.trim()) return false;
    const norm = normalizeVoiceCommand(commandText);
    const intentResult = detectVoiceIntent(norm, commandText);
    if (intentResult) {
      return routeVoiceIntent(intentResult, commandText);
    }

    // Secondary fallback: matchBuiltinApp
    const matchedApp = matchBuiltinApp(commandText);
    if (matchedApp) {
      launchOrFocusApp(matchedApp);
      if (assistantStateTitle) assistantStateTitle.textContent = `🗣️ You said: "${commandText}"`;
      if (assistantSubtext) assistantSubtext.textContent = `✅ Opening ${matchedApp}...`;
      speak(`Opening ${matchedApp}`);
      showToast(`Opened ${matchedApp}`, 'success', matchedApp);
      addLog('VOICE OS', `🗣️ You said: "${commandText}" → ✅ Opening ${matchedApp}...`, 'gemini-entry');
      return true;
    }

    return false;
  }

  // First-run Hint dismissal
  let hasFirstCommandExecuted = false;
  function dismissFirstRunHint() {
    if (hasFirstCommandExecuted) return;
    hasFirstCommandExecuted = true;
    const hint = document.getElementById('firstRunHint');
    if (hint) {
      hint.classList.add('is-hidden');
      setTimeout(() => {
        hint.style.display = 'none';
      }, 350);
    }
  }

  // ========================================================
  // 5. Loading State Helper for Immediate Window Opening
  // ========================================================
  function getWindowLoadingHtml(title = 'Application') {
    const safeTitle = escapeHtml(title || 'Application');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 40%, #111827 0%, #080c14 100%);
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      user-select: none;
    }
    .loader-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px;
      max-width: 85%;
    }
    .spinner-ring {
      width: 44px;
      height: 44px;
      border: 3.5px solid rgba(0, 210, 255, 0.15);
      border-top-color: #00d2ff;
      border-right-color: #7928ca;
      border-radius: 50%;
      animation: spin 0.8s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
      box-shadow: 0 0 24px rgba(0, 210, 255, 0.25);
      margin-bottom: 18px;
    }
    .app-label {
      font-size: 15px;
      font-weight: 600;
      color: #f8fafc;
      letter-spacing: -0.01em;
      margin-bottom: 6px;
    }
    .status-text {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .stream-dots::after {
      content: '...';
      animation: dots 1.5s steps(4, end) infinite;
      display: inline-block;
      width: 14px;
      text-align: left;
    }
    .progress-bar-wrap {
      width: 150px;
      height: 3px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 99px;
      margin-top: 16px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar-fill {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 45%;
      background: linear-gradient(90deg, #00d2ff, #7928ca);
      border-radius: 99px;
      animation: shimmer 1.3s infinite ease-in-out;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes shimmer {
      0% { left: -45%; width: 45%; }
      50% { width: 65%; }
      100% { left: 100%; width: 45%; }
    }
    @keyframes dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }
  </style>
</head>
<body>
  <div class="loader-box">
    <div class="spinner-ring"></div>
    <div class="app-label">Loading ${safeTitle}</div>
    <div class="status-text">Gemini AI is streaming code<span class="stream-dots"></span></div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill"></div>
    </div>
  </div>
</body>
</html>`;
  }

  function inferTitleFromCommand(commandText) {
    let cleaned = commandText.trim();
    cleaned = cleaned.replace(/^(no\b[, ]*|actually\b[, ]*|i meant\b[, ]*)/i, '');
    cleaned = cleaned.replace(/^(please\s+)?(open|launch|create|make|build|run|start)\s+(an?\s+)?/i, '');
    cleaned = cleaned.replace(/^(app|window)\s+/i, '').trim();
    if (!cleaned) return 'Application';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1, 28);
  }

  function getAppDimensions(rawTitle = '') {
    const title = (rawTitle || '').toLowerCase();
    if (title.includes('camera') || title.includes('photo')) {
      return { width: 580, height: 600 };
    }
    if (title.includes('gallery')) {
      return { width: 680, height: 560 };
    }
    if (title.includes('video') || title.includes('record')) {
      return { width: 580, height: 620 };
    }
    if (title.includes('note') || title.includes('text') || title.includes('pad')) {
      return { width: 480, height: 420 };
    }
    if (title.includes('analogue') || title.includes('analog')) {
      return { width: 340, height: 380 };
    }
    if (title.includes('snake') || title.includes('game')) {
      return { width: 400, height: 550 };
    }
    if (title.includes('music') || title.includes('player') || title.includes('audio') || title.includes('song')) {
      return { width: 420, height: 440 };
    }
    if (title.includes('manager') || title.includes('process') || title.includes('system')) {
      return { width: 480, height: 440 };
    }
    if (title.includes('calc') || title.includes('math')) {
      return { width: 340, height: 420 };
    }
    if (title.includes('clock') || title.includes('time') || title.includes('timer')) {
      return { width: 340, height: 320 };
    }
    if (title.includes('weather')) {
      return { width: 440, height: 480 };
    }
    if (title.includes('todo') || title.includes('task') || title.includes('list')) {
      return { width: 400, height: 420 };
    }
    if (title.includes('wallpaper') || title.includes('studio') || title.includes('theme') || title.includes('background')) {
      return { width: 520, height: 520 };
    }
    if (title.includes('file') || (title.includes('manager') && !title.includes('task'))) {
      return { width: 560, height: 480 };
    }
    return { width: 440, height: 380 };
  }

  function getAppTemplate(rawTitle = '', initialText = '', initialFileName = '') {
    const title = (rawTitle || '').toLowerCase();

    // 1. CAMERA APP (Photo Capture & Video Recording)
    if (title.includes('camera') || title.includes('photo') || (title.includes('video') && !title.includes('player')) || title.includes('record')) {
      const defaultMode = (title.includes('video') || title.includes('record')) ? 'video' : 'photo';
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #090d16;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
  }
  .cam-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #0f172a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .cam-modes {
    display: flex;
    background: #1e293b;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
  }
  .cam-mode-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .cam-mode-btn.active {
    background: #0284c7;
    color: #fff;
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
  }
  .cam-actions-top {
    display: flex;
    gap: 6px;
  }
  .mini-top-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s;
  }
  .mini-top-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }

  .viewport {
    flex: 1;
    position: relative;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  video, img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  canvas { display: none; }

  /* Recording Overlays */
  .rec-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(220, 38, 38, 0.9);
    color: #fff;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
    animation: recPulse 1.2s infinite;
    z-index: 10;
  }
  .rec-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
  }
  @keyframes recPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(0.96); }
  }
  .timer-pill {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    font-family: monospace;
    font-size: 13px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    z-index: 10;
  }
  .paused-badge {
    position: absolute;
    top: 48px;
    left: 12px;
    background: rgba(245, 158, 11, 0.9);
    color: #fff;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    z-index: 10;
  }

  .cam-error-box {
    position: absolute;
    inset: 0;
    background: rgba(11, 15, 25, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
    gap: 12px;
    z-index: 30;
  }
  .cam-error-icon { font-size: 40px; }
  .cam-error-title { font-size: 16px; font-weight: 700; color: #f8fafc; }
  .cam-error-desc { font-size: 12px; color: #94a3b8; max-width: 340px; line-height: 1.5; }
  .cam-retry-btn {
    background: #0284c7;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 12px;
  }

  .cam-footer {
    padding: 12px 16px;
    background: #0f172a;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    min-height: 72px;
  }
  .shutter-btn {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #fff;
    border: 4px solid #0284c7;
    cursor: pointer;
    box-shadow: 0 0 16px rgba(2, 132, 199, 0.4);
    transition: transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  .shutter-btn:active { transform: scale(0.92); }
  .rec-shutter-btn {
    border-color: #ef4444;
    color: #ef4444;
  }
  .rec-shutter-btn.is-recording {
    background: #ef4444;
    color: #fff;
    border-color: #fff;
    border-radius: 12px;
    width: 48px;
    height: 48px;
  }
  .btn-bar {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ctrl-btn {
    background: #1e293b;
    border: 1px solid #334155;
    color: #e2e8f0;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .ctrl-btn:hover { background: #334155; color: #fff; }
  .ctrl-btn.primary { background: #0284c7; border-color: #0284c7; color: #fff; }
  .ctrl-btn.primary:hover { background: #0369a1; }
  .ctrl-btn.success { background: #059669; border-color: #059669; color: #fff; }
  .ctrl-btn.success:hover { background: #047857; }
  .ctrl-btn.danger { background: #dc2626; border-color: #dc2626; color: #fff; }
  .ctrl-btn.danger:hover { background: #b91c1c; }

  /* Toast notification */
  .cam-toast {
    position: absolute;
    bottom: 80px;
    background: rgba(16, 185, 129, 0.95);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: 999px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    z-index: 40;
    display: none;
    animation: fadeIn 0.15s;
  }
</style>
</head>
<body>
  <div class="cam-header">
    <div class="cam-modes">
      <button class="cam-mode-btn ${defaultMode === 'photo' ? 'active' : ''}" id="modePhotoBtn">📷 Photo</button>
      <button class="cam-mode-btn ${defaultMode === 'video' ? 'active' : ''}" id="modeVideoBtn">🎥 Video</button>
    </div>
    <div class="cam-actions-top">
      <button class="mini-top-btn" id="flipCamBtn" title="Switch front/rear camera">🔄 Flip</button>
      <button class="mini-top-btn" id="openGalleryBtn" title="Open Media Gallery">🖼️ Gallery</button>
    </div>
  </div>

  <div class="viewport" id="viewport">
    <video id="liveVideo" autoplay playsinline muted></video>
    <img id="photoResult" style="display:none;" />
    <video id="videoResult" controls playsinline style="display:none;"></video>
    <canvas id="captureCanvas"></canvas>

    <div class="rec-badge" id="recBadge" style="display:none;">
      <span class="rec-dot"></span>
      <span>RECORDING</span>
    </div>
    <div class="timer-pill" id="recTimer" style="display:none;">00:00</div>
    <div class="paused-badge" id="pauseBadge" style="display:none;">❚❚ PAUSED</div>

    <div class="cam-error-box" id="errorBox" style="display:none;">
      <div class="cam-error-icon">📷⚠️</div>
      <div class="cam-error-title" id="errorTitle">Camera Unavailable</div>
      <div class="cam-error-desc" id="errorDesc">Please allow camera permissions in your browser.</div>
      <button class="cam-retry-btn" id="retryBtn">Try Again</button>
    </div>

    <div class="cam-toast" id="camToast"></div>
  </div>

  <div class="cam-footer" id="camFooter">
    <!-- Photo Mode Live Bar -->
    <div class="btn-bar" id="photoLiveBar">
      <button class="shutter-btn" id="snapBtn" title="Take Photo">📸</button>
    </div>

    <!-- Photo Review Bar -->
    <div class="btn-bar" id="photoReviewBar" style="display:none;">
      <button class="ctrl-btn success" id="savePhotoBtn">✓ Save Photo</button>
      <button class="ctrl-btn" id="retakePhotoBtn">🔄 Retake</button>
      <button class="ctrl-btn" id="dlPhotoBtn">⬇️ Download</button>
      <button class="ctrl-btn danger" id="cancelPhotoBtn">✕ Discard</button>
    </div>

    <!-- Video Mode Live Bar -->
    <div class="btn-bar" id="videoLiveBar" style="display:none;">
      <button class="shutter-btn rec-shutter-btn" id="recBtn" title="Start Recording">🔴</button>
    </div>

    <!-- Video Recording Active Bar -->
    <div class="btn-bar" id="videoActiveBar" style="display:none;">
      <button class="ctrl-btn" id="pauseRecBtn">⏸️ Pause</button>
      <button class="ctrl-btn danger" id="stopRecBtn">⏹️ Stop</button>
    </div>

    <!-- Video Review Bar -->
    <div class="btn-bar" id="videoReviewBar" style="display:none;">
      <button class="ctrl-btn success" id="saveVideoBtn">💾 Save Video</button>
      <button class="ctrl-btn" id="retakeVideoBtn">🔄 Retake</button>
      <button class="ctrl-btn" id="dlVideoBtn">⬇️ Download</button>
    </div>
  </div>

<script>
  let activeMode = '${defaultMode}';
  let currentStream = null;
  let facingMode = 'user';
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordTimer = null;
  let recordSeconds = 0;
  let isRecording = false;
  let isPaused = false;
  let lastCapturedPhotoData = null;
  let lastRecordedBlob = null;
  let lastRecordedUrl = null;

  const liveVideo = document.getElementById('liveVideo');
  const photoResult = document.getElementById('photoResult');
  const videoResult = document.getElementById('videoResult');
  const captureCanvas = document.getElementById('captureCanvas');
  const recBadge = document.getElementById('recBadge');
  const recTimer = document.getElementById('recTimer');
  const pauseBadge = document.getElementById('pauseBadge');
  const errorBox = document.getElementById('errorBox');
  const errorTitle = document.getElementById('errorTitle');
  const errorDesc = document.getElementById('errorDesc');
  const toast = document.getElementById('camToast');

  // IndexedDB Media Engine
  const DB_NAME = 'voice_os_media_db';
  function saveMedia(item) {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('media')) {
            const st = db.createObjectStore('media', { keyPath: 'id' });
            st.createIndex('type', 'type', { unique: false });
            st.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('media', 'readwrite');
          tx.objectStore('media').put(item);
          tx.oncomplete = () => {
            window.parent.postMessage({ type: 'os:media-saved', media: item }, '*');
            resolve(true);
          };
          tx.onerror = () => fallbackSave(item, resolve);
        };
        req.onerror = () => fallbackSave(item, resolve);
      } catch(e) {
        fallbackSave(item, resolve);
      }
    });
  }

  function fallbackSave(item, cb) {
    try {
      const raw = localStorage.getItem('voice_os_media_fallback') || '[]';
      const arr = JSON.parse(raw);
      arr.unshift(item);
      localStorage.setItem('voice_os_media_fallback', JSON.stringify(arr.slice(0, 30)));
      window.parent.postMessage({ type: 'os:media-saved', media: item }, '*');
    } catch(e) {}
    cb(true);
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2200);
  }

  function formatTime(s) {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return mins + ':' + secs;
  }

  async function startCamera() {
    stopCurrentStream();
    errorBox.style.display = 'none';
    try {
      const constraints = {
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      };
      currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      liveVideo.srcObject = currentStream;
      liveVideo.style.display = 'block';
      photoResult.style.display = 'none';
      videoResult.style.display = 'none';
      updateUIForMode();
    } catch (err) {
      console.warn('Camera error:', err);
      // Try video-only if audio failed
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        liveVideo.srcObject = currentStream;
        liveVideo.style.display = 'block';
        photoResult.style.display = 'none';
        videoResult.style.display = 'none';
        updateUIForMode();
        return;
      } catch(e2) {}

      errorBox.style.display = 'flex';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorTitle.textContent = 'Camera Permission Denied';
        errorDesc.textContent = 'Click the lock or camera icon in your browser address bar to allow Camera access, then click Try Again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorTitle.textContent = 'No Camera Device Found';
        errorDesc.textContent = 'Please attach or enable a webcam device.';
      } else {
        errorTitle.textContent = 'Camera Error';
        errorDesc.textContent = err.message || 'Unable to access camera.';
      }
    }
  }

  function stopCurrentStream() {
    if (currentStream) {
      try { currentStream.getTracks().forEach(t => t.stop()); } catch(e) {}
      currentStream = null;
    }
  }

  function updateUIForMode() {
    document.getElementById('modePhotoBtn').classList.toggle('active', activeMode === 'photo');
    document.getElementById('modeVideoBtn').classList.toggle('active', activeMode === 'video');

    document.getElementById('photoLiveBar').style.display = activeMode === 'photo' ? 'flex' : 'none';
    document.getElementById('photoReviewBar').style.display = 'none';
    document.getElementById('videoLiveBar').style.display = activeMode === 'video' ? 'flex' : 'none';
    document.getElementById('videoActiveBar').style.display = 'none';
    document.getElementById('videoReviewBar').style.display = 'none';
    recBadge.style.display = 'none';
    recTimer.style.display = 'none';
    pauseBadge.style.display = 'none';
  }

  // Switch Modes
  document.getElementById('modePhotoBtn').addEventListener('click', () => {
    if (isRecording) stopRecording();
    activeMode = 'photo';
    photoResult.style.display = 'none';
    videoResult.style.display = 'none';
    liveVideo.style.display = 'block';
    updateUIForMode();
  });

  document.getElementById('modeVideoBtn').addEventListener('click', () => {
    activeMode = 'video';
    photoResult.style.display = 'none';
    videoResult.style.display = 'none';
    liveVideo.style.display = 'block';
    updateUIForMode();
  });

  // Flip Camera
  document.getElementById('flipCamBtn').addEventListener('click', () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera();
  });

  // Open Gallery
  document.getElementById('openGalleryBtn').addEventListener('click', () => {
    window.parent.postMessage({ type: 'os:open-app', app: 'Gallery' }, '*');
  });

  // Retry
  document.getElementById('retryBtn').addEventListener('click', startCamera);

  // Take Photo
  document.getElementById('snapBtn').addEventListener('click', takePhoto);

  function takePhoto() {
    if (!currentStream) return;
    const w = liveVideo.videoWidth || 640;
    const h = liveVideo.videoHeight || 480;
    captureCanvas.width = w;
    captureCanvas.height = h;
    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(liveVideo, 0, 0, w, h);
    lastCapturedPhotoData = captureCanvas.toDataURL('image/jpeg', 0.92);

    photoResult.src = lastCapturedPhotoData;
    photoResult.style.display = 'block';
    liveVideo.style.display = 'none';

    document.getElementById('photoLiveBar').style.display = 'none';
    document.getElementById('photoReviewBar').style.display = 'flex';
  }

  // Retake Photo
  document.getElementById('retakePhotoBtn').addEventListener('click', () => {
    photoResult.style.display = 'none';
    liveVideo.style.display = 'block';
    document.getElementById('photoReviewBar').style.display = 'none';
    document.getElementById('photoLiveBar').style.display = 'flex';
  });

  document.getElementById('cancelPhotoBtn').addEventListener('click', () => {
    photoResult.style.display = 'none';
    liveVideo.style.display = 'block';
    document.getElementById('photoReviewBar').style.display = 'none';
    document.getElementById('photoLiveBar').style.display = 'flex';
  });

  // Save Photo
  document.getElementById('savePhotoBtn').addEventListener('click', async () => {
    if (!lastCapturedPhotoData) return;
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const item = {
      id: 'photo-' + Date.now(),
      name: 'photo-' + ts + '.jpg',
      type: 'photo',
      dataUrl: lastCapturedPhotoData,
      thumbnail: lastCapturedPhotoData,
      size: (Math.round(lastCapturedPhotoData.length * 0.75 / 1024)) + ' KB',
      date: now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };
    await saveMedia(item);
    showToast('Photo saved to Gallery! 📷');
    document.getElementById('retakePhotoBtn').click();
  });

  // Download Photo
  document.getElementById('dlPhotoBtn').addEventListener('click', () => {
    if (!lastCapturedPhotoData) return;
    const a = document.createElement('a');
    a.href = lastCapturedPhotoData;
    a.download = 'photo-' + Date.now() + '.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // Video Recording Logic
  document.getElementById('recBtn').addEventListener('click', startRecording);

  function startRecording() {
    if (!currentStream) return;
    recordedChunks = [];
    recordSeconds = 0;
    isPaused = false;
    isRecording = true;

    const mimes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    let chosenMime = mimes.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';

    try {
      mediaRecorder = new MediaRecorder(currentStream, chosenMime ? { mimeType: chosenMime } : {});
    } catch(e) {
      try {
        mediaRecorder = new MediaRecorder(currentStream);
      } catch(err) {
        alert('MediaRecorder is not supported on this browser.');
        return;
      }
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      clearInterval(recordTimer);
      isRecording = false;
      const mime = mediaRecorder.mimeType || 'video/webm';
      lastRecordedBlob = new Blob(recordedChunks, { type: mime });
      if (lastRecordedUrl) URL.revokeObjectURL(lastRecordedUrl);
      lastRecordedUrl = URL.createObjectURL(lastRecordedBlob);

      videoResult.src = lastRecordedUrl;
      videoResult.style.display = 'block';
      liveVideo.style.display = 'none';

      recBadge.style.display = 'none';
      recTimer.style.display = 'none';
      pauseBadge.style.display = 'none';

      document.getElementById('videoActiveBar').style.display = 'none';
      document.getElementById('videoReviewBar').style.display = 'flex';
    };

    mediaRecorder.start(250);
    recBadge.style.display = 'flex';
    recTimer.textContent = '00:00';
    recTimer.style.display = 'block';
    document.getElementById('videoLiveBar').style.display = 'none';
    document.getElementById('videoActiveBar').style.display = 'flex';

    recordTimer = setInterval(() => {
      if (!isPaused) {
        recordSeconds++;
        recTimer.textContent = formatTime(recordSeconds);
      }
    }, 1000);
  }

  // Pause / Resume Recording
  document.getElementById('pauseRecBtn').addEventListener('click', () => {
    if (!mediaRecorder) return;
    if (isPaused) {
      mediaRecorder.resume();
      isPaused = false;
      pauseBadge.style.display = 'none';
      document.getElementById('pauseRecBtn').textContent = '⏸️ Pause';
    } else {
      mediaRecorder.pause();
      isPaused = true;
      pauseBadge.style.display = 'block';
      document.getElementById('pauseRecBtn').textContent = '▶️ Resume';
    }
  });

  // Stop Recording
  document.getElementById('stopRecBtn').addEventListener('click', stopRecording);
  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }

  // Retake Video
  document.getElementById('retakeVideoBtn').addEventListener('click', () => {
    videoResult.pause();
    videoResult.style.display = 'none';
    liveVideo.style.display = 'block';
    document.getElementById('videoReviewBar').style.display = 'none';
    document.getElementById('videoLiveBar').style.display = 'flex';
  });

  // Download Video
  document.getElementById('dlVideoBtn').addEventListener('click', () => {
    if (!lastRecordedBlob) return;
    const a = document.createElement('a');
    a.href = lastRecordedUrl;
    a.download = 'video-' + Date.now() + '.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // Save Video
  document.getElementById('saveVideoBtn').addEventListener('click', () => {
    if (!lastRecordedBlob) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const sizeStr = lastRecordedBlob.size > 1048576
        ? (lastRecordedBlob.size / 1048576).toFixed(1) + ' MB'
        : (Math.round(lastRecordedBlob.size / 1024)) + ' KB';

      const item = {
        id: 'video-' + Date.now(),
        name: 'video-' + ts + '.webm',
        type: 'video',
        dataUrl: dataUrl,
        size: sizeStr,
        duration: formatTime(recordSeconds),
        date: now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now()
      };
      await saveMedia(item);
      showToast('Video saved to Gallery! 🎥');
      document.getElementById('retakeVideoBtn').click();
    };
    reader.readAsDataURL(lastRecordedBlob);
  });

  // Unified App Action Handler for Camera
  window.executeAppAction = function(action, params = {}) {
    const act = (action || '').toUpperCase();
    if (act === 'TAKE_PHOTO' || act === 'SNAP') {
      if (activeMode !== 'photo') {
        document.getElementById('modePhotoBtn').click();
        setTimeout(takePhoto, 300);
      } else {
        takePhoto();
      }
    } else if (act === 'RETAKE_PHOTO' || act === 'RETAKE') {
      document.getElementById('retakePhotoBtn')?.click();
      document.getElementById('retakeVideoBtn')?.click();
    } else if (act === 'SAVE_PHOTO') {
      document.getElementById('savePhotoBtn')?.click();
    } else if (act === 'START_RECORDING' || act === 'START_VIDEO') {
      if (activeMode !== 'video') {
        document.getElementById('modeVideoBtn').click();
        setTimeout(startRecording, 300);
      } else {
        startRecording();
      }
    } else if (act === 'PAUSE_RECORDING' || act === 'PAUSE_VIDEO') {
      if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        isPaused = true;
        document.getElementById('pauseRecBtn').textContent = '▶ Resume';
        pauseBadge.style.display = 'inline-block';
      }
    } else if (act === 'RESUME_RECORDING' || act === 'RESUME_VIDEO') {
      if (isRecording && mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        isPaused = false;
        document.getElementById('pauseRecBtn').textContent = '⏸ Pause';
        pauseBadge.style.display = 'none';
      }
    } else if (act === 'STOP_RECORDING' || act === 'STOP_VIDEO') {
      if (isRecording) stopRecording();
    } else if (act === 'SAVE_VIDEO') {
      document.getElementById('saveVideoBtn')?.click();
    } else if (act === 'SWITCH_CAMERA') {
      facingMode = facingMode === 'user' ? 'environment' : 'user';
      startCamera();
    }
  };

  // Voice message listener from parent OS
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'os:action') {
      executeAppAction(e.data.action, e.data.params);
    } else if (e.data.type === 'os:camera-snap' || e.data.type === 'os:take-photo') {
      executeAppAction('TAKE_PHOTO');
    } else if (e.data.type === 'os:camera-save-photo') {
      executeAppAction('SAVE_PHOTO');
    } else if (e.data.type === 'os:camera-start-rec') {
      executeAppAction('START_RECORDING');
    } else if (e.data.type === 'os:camera-stop-rec') {
      executeAppAction('STOP_RECORDING');
    } else if (e.data.type === 'os:camera-save-video') {
      executeAppAction('SAVE_VIDEO');
    } else if (e.data.type === 'os:camera-retake') {
      executeAppAction('RETAKE');
    }
  });

  window.addEventListener('beforeunload', stopCurrentStream);
  startCamera();
</script>
</body>
</html>`;
    }

    // 2. GALLERY APP
    if (title.includes('gallery')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #090d16;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
  }
  .gal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #0f172a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .gal-title-box {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .gal-title { font-size: 14px; font-weight: 700; color: #38bdf8; }
  .gal-badge {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 999px;
    font-weight: 600;
  }
  .gal-tabs {
    display: flex;
    background: #1e293b;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
  }
  .gal-tab {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .gal-tab.active {
    background: #0284c7;
    color: #fff;
  }
  .gal-actions-right {
    display: flex;
    gap: 6px;
  }
  .gal-btn {
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s;
  }
  .gal-btn:hover { background: #334155; color: #fff; }
  .gal-btn.primary { background: #0284c7; border-color: #0284c7; color: #fff; }

  .gal-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
  }
  .gal-body::-webkit-scrollbar { width: 6px; }
  .gal-body::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
  .card {
    background: #131b2e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
    cursor: pointer;
  }
  .card:hover {
    transform: translateY(-2px);
    border-color: #38bdf8;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
  }
  .thumb-wrap {
    width: 100%;
    height: 120px;
    background: #090d16;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .video-badge {
    position: absolute;
    bottom: 6px;
    right: 6px;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .card-info {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .card-name {
    font-size: 11px;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-meta {
    font-size: 10px;
    color: #64748b;
    display: flex;
    justify-content: space-between;
  }
  .card-actions {
    padding: 6px 10px 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .card-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    font-size: 10px;
    padding: 3px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .card-btn:hover { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border-color: #38bdf8; }
  .card-btn.del:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: #ef4444; }

  .empty-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #64748b;
    gap: 12px;
    text-align: center;
    padding: 40px;
  }
  .empty-icon { font-size: 44px; opacity: 0.6; }
  .empty-text { font-size: 13px; }

  /* Modal Lightbox */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(6, 9, 18, 0.92);
    backdrop-filter: blur(6px);
    display: none;
    flex-direction: column;
    padding: 16px;
    z-index: 100;
  }
  .modal-overlay.open { display: flex; }
  .modal-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .modal-title { font-size: 13px; font-weight: 700; color: #38bdf8; }
  .modal-view {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 12px 0;
  }
  .modal-view img, .modal-view video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.7);
  }
  .modal-bottom {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>
</head>
<body>
  <div class="gal-header">
    <div class="gal-title-box">
      <span style="font-size:18px;">🖼️</span>
      <span class="gal-title">MEDIA GALLERY</span>
      <span class="gal-badge" id="countBadge">0 Items</span>
    </div>
    <div class="gal-tabs">
      <button class="gal-tab active" data-tab="all">All</button>
      <button class="gal-tab" data-tab="photo">📷 Photos</button>
      <button class="gal-tab" data-tab="video">🎥 Videos</button>
    </div>
    <div class="gal-actions-right">
      <button class="gal-btn primary" id="openCamBtn">📷 Camera</button>
      <button class="gal-btn" id="refreshBtn">🔄 Refresh</button>
    </div>
  </div>

  <div class="gal-body">
    <div class="grid" id="grid"></div>
    <div class="empty-box" id="emptyBox" style="display:none;">
      <div class="empty-icon">🖼️</div>
      <div class="empty-text" id="emptyText">No saved photos or videos yet.</div>
      <button class="gal-btn primary" id="emptyCamBtn">📷 Open Camera</button>
    </div>
  </div>

  <!-- Viewer Modal -->
  <div class="modal-overlay" id="viewerModal">
    <div class="modal-top">
      <span class="modal-title" id="viewTitle">Media Preview</span>
      <button class="gal-btn" id="closeViewBtn">✕ Close</button>
    </div>
    <div class="modal-view" id="modalView"></div>
    <div class="modal-bottom">
      <button class="gal-btn primary" id="dlViewBtn">⬇️ Download</button>
      <button class="gal-btn" style="color:#f87171;" id="delViewBtn">🗑️ Delete</button>
    </div>
  </div>

<script>
  const DB_NAME = 'voice_os_media_db';
  let activeTab = 'all';
  let allItems = [];
  let currentViewingItem = null;

  function loadMedia() {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('media')) {
            const st = db.createObjectStore('media', { keyPath: 'id' });
            st.createIndex('type', 'type', { unique: false });
            st.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('media', 'readonly');
          const st = tx.objectStore('media');
          const getReq = st.getAll();
          getReq.onsuccess = () => {
            let list = getReq.result || [];
            list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            resolve(list);
          };
          getReq.onerror = () => fallbackLoad(resolve);
        };
        req.onerror = () => fallbackLoad(resolve);
      } catch(e) {
        fallbackLoad(resolve);
      }
    });
  }

  function fallbackLoad(cb) {
    try {
      const raw = localStorage.getItem('voice_os_media_fallback') || '[]';
      cb(JSON.parse(raw));
    } catch(e) {
      cb([]);
    }
  }

  function deleteItem(id) {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('media', 'readwrite');
          tx.objectStore('media').delete(id);
          tx.oncomplete = () => {
            window.parent.postMessage({ type: 'os:media-deleted', id: id }, '*');
            resolve(true);
          };
          tx.onerror = () => fallbackDelete(id, resolve);
        };
        req.onerror = () => fallbackDelete(id, resolve);
      } catch(e) {
        fallbackDelete(id, resolve);
      }
    });
  }

  function fallbackDelete(id, cb) {
    try {
      const raw = localStorage.getItem('voice_os_media_fallback') || '[]';
      const arr = JSON.parse(raw).filter(i => i.id !== id);
      localStorage.setItem('voice_os_media_fallback', JSON.stringify(arr));
      window.parent.postMessage({ type: 'os:media-deleted', id: id }, '*');
    } catch(e) {}
    cb(true);
  }

  async function renderGallery() {
    allItems = await loadMedia();
    const filtered = allItems.filter(item => {
      if (activeTab === 'all') return true;
      return item.type === activeTab;
    });

    document.getElementById('countBadge').textContent = filtered.length + ' Item' + (filtered.length === 1 ? '' : 's');

    const grid = document.getElementById('grid');
    const emptyBox = document.getElementById('emptyBox');
    grid.innerHTML = '';

    if (filtered.length === 0) {
      emptyBox.style.display = 'flex';
      document.getElementById('emptyText').textContent = activeTab === 'photo'
        ? 'No photos saved yet.'
        : activeTab === 'video'
        ? 'No videos recorded yet.'
        : 'No media items in Gallery yet.';
      return;
    }
    emptyBox.style.display = 'none';

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const isVideo = item.type === 'video';

      let thumbHtml = '';
      if (isVideo) {
        thumbHtml = '<video class="thumb-img" src="' + item.dataUrl + '#t=0.5" preload="metadata" muted></video><span class="video-badge">▶ ' + (item.duration || 'Video') + '</span>';
      } else {
        thumbHtml = '<img class="thumb-img" src="' + item.dataUrl + '" loading="lazy" />';
      }

      card.innerHTML = '<div class="thumb-wrap">' + thumbHtml + '</div>' +
        '<div class="card-info">' +
          '<div class="card-name">' + item.name + '</div>' +
          '<div class="card-meta"><span>' + (item.size || '') + '</span><span>' + (item.date || '') + '</span></div>' +
        '</div>' +
        '<div class="card-actions">' +
          '<button class="card-btn view-btn">👁️ View</button>' +
          '<button class="card-btn dl-btn">⬇️</button>' +
          '<button class="card-btn del del-btn">🗑️</button>' +
        '</div>';

      card.querySelector('.thumb-wrap').addEventListener('click', () => openViewer(item));
      card.querySelector('.view-btn').addEventListener('click', (e) => { e.stopPropagation(); openViewer(item); });
      card.querySelector('.dl-btn').addEventListener('click', (e) => { e.stopPropagation(); downloadMedia(item); });
      card.querySelector('.del-btn').addEventListener('click', (e) => { e.stopPropagation(); confirmDelete(item); });

      grid.appendChild(card);
    });
  }

  function openViewer(item) {
    currentViewingItem = item;
    const modal = document.getElementById('viewerModal');
    const title = document.getElementById('viewTitle');
    const view = document.getElementById('modalView');

    title.textContent = item.name;
    view.innerHTML = '';

    if (item.type === 'video') {
      const vid = document.createElement('video');
      vid.src = item.dataUrl;
      vid.controls = true;
      vid.autoplay = true;
      vid.playsInline = true;
      view.appendChild(vid);
    } else {
      const img = document.createElement('img');
      img.src = item.dataUrl;
      view.appendChild(img);
    }
    modal.classList.add('open');
  }

  document.getElementById('closeViewBtn').addEventListener('click', () => {
    const view = document.getElementById('modalView');
    const vid = view.querySelector('video');
    if (vid) vid.pause();
    document.getElementById('viewerModal').classList.remove('open');
  });

  function downloadMedia(item) {
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function confirmDelete(item) {
    if (!confirm('Are you sure you want to delete "' + item.name + '"?')) return;
    await deleteItem(item.id);
    if (currentViewingItem && currentViewingItem.id === item.id) {
      document.getElementById('closeViewBtn').click();
    }
    renderGallery();
  }

  document.getElementById('dlViewBtn').addEventListener('click', () => {
    if (currentViewingItem) downloadMedia(currentViewingItem);
  });

  document.getElementById('delViewBtn').addEventListener('click', () => {
    if (currentViewingItem) confirmDelete(currentViewingItem);
  });

  // Tab Filtering
  document.querySelectorAll('.gal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.gal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderGallery();
    });
  });

  document.getElementById('openCamBtn').addEventListener('click', () => {
    window.parent.postMessage({ type: 'os:open-app', app: 'Camera' }, '*');
  });
  document.getElementById('emptyCamBtn').addEventListener('click', () => {
    window.parent.postMessage({ type: 'os:open-app', app: 'Camera' }, '*');
  });
  document.getElementById('refreshBtn').addEventListener('click', renderGallery);

  // Unified App Action Handler for Gallery
  window.executeAppAction = function(action, params = {}) {
    const act = (action || '').toUpperCase();
    if (act === 'FILTER_PHOTOS') {
      const tab = document.querySelector('.gal-tab[data-tab="photo"]');
      if (tab) tab.click();
    } else if (act === 'FILTER_VIDEOS') {
      const tab = document.querySelector('.gal-tab[data-tab="video"]');
      if (tab) tab.click();
    } else if (act === 'FILTER_ALL') {
      const tab = document.querySelector('.gal-tab[data-tab="all"]');
      if (tab) tab.click();
    } else if (act === 'OPEN_LATEST_PHOTO') {
      const photos = allItems.filter(i => i.type === 'photo');
      if (photos.length > 0) openViewer(photos[0]);
    } else if (act === 'PLAY_LATEST_VIDEO') {
      const vids = allItems.filter(i => i.type === 'video');
      if (vids.length > 0) openViewer(vids[0]);
    } else if (act === 'DELETE_CURRENT') {
      if (currentViewingItem) {
        confirmDelete(currentViewingItem);
      }
    } else if (act === 'REFRESH') {
      renderGallery();
    }
  };

  // Sync & Action listener from parent OS
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'os:action') {
      executeAppAction(e.data.action, e.data.params);
    } else if (e.data.type === 'os:media-updated' || e.data.type === 'os:media-saved' || e.data.type === 'os:media-deleted') {
      renderGallery();
    } else if (e.data.type === 'os:gallery-filter') {
      executeAppAction(e.data.filter === 'photo' ? 'FILTER_PHOTOS' : e.data.filter === 'video' ? 'FILTER_VIDEOS' : 'FILTER_ALL');
    } else if (e.data.type === 'os:delete-active-item') {
      executeAppAction('DELETE_CURRENT');
    }
  });

  renderGallery();
</script>
</body>
</html>`;
    }

    // 3. UPGRADED FILE MANAGER APP (With Virtual File System, Folders, & Integrated Editor)
    if (title.includes('file') || (title.includes('manager') && !title.includes('task'))) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #090d16;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
  }
  .fm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #0f172a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .fm-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .fm-title { font-size: 14px; font-weight: 700; color: #38bdf8; letter-spacing: 0.5px; }
  .fm-actions { display: flex; gap: 6px; }
  .fm-btn {
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s ease;
  }
  .fm-btn:hover { background: #334155; color: #fff; }
  .fm-btn.primary { background: #0284c7; border-color: #0284c7; color: #fff; }
  .fm-btn.primary:hover { background: #0369a1; }
  .fm-btn.success { background: #059669; border-color: #059669; color: #fff; }
  .fm-btn.success:hover { background: #047857; }

  /* Breadcrumbs & Search */
  .fm-subbar {
    padding: 8px 14px;
    background: #0c1220;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #94a3b8;
    overflow-x: auto;
  }
  .crumb {
    cursor: pointer;
    color: #38bdf8;
    font-weight: 600;
    white-space: nowrap;
  }
  .crumb:hover { text-decoration: underline; }
  .crumb-sep { color: #475569; }
  .crumb.current { color: #f1f5f9; cursor: default; text-decoration: none; }
  .search-input {
    background: #162035;
    border: 1px solid #28354f;
    color: #fff;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 11px;
    outline: none;
    width: 170px;
  }
  .search-input:focus { border-color: #38bdf8; }

  /* File List Container */
  .fm-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .fm-body::-webkit-scrollbar { width: 5px; }
  .fm-body::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }

  .item-row {
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.15s, border-color 0.15s;
    cursor: pointer;
  }
  .item-row:hover {
    background: #182238;
    border-color: #38bdf8;
  }
  .item-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }
  .item-icon { font-size: 20px; }
  .item-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .item-name { font-size: 12px; font-weight: 600; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item-sub { font-size: 10px; color: #64748b; display: flex; gap: 8px; }
  .item-actions {
    display: flex;
    gap: 5px;
  }
  .mini-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    font-size: 10px;
    font-weight: 600;
    padding: 4px 7px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .mini-btn:hover { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border-color: #38bdf8; }
  .mini-btn.danger:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: #ef4444; }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #64748b;
    gap: 10px;
    text-align: center;
    padding: 30px;
  }
  .empty-icon { font-size: 40px; opacity: 0.6; }

  /* Integrated Editor View */
  .editor-view {
    display: none;
    flex: 1;
    flex-direction: column;
    background: #090d16;
  }
  .editor-view.active { display: flex; }
  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #0f172a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    gap: 10px;
  }
  .editor-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }
  .filename-box {
    background: #162035;
    border: 1px solid #28354f;
    color: #38bdf8;
    padding: 4px 8px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 600;
    outline: none;
    width: 180px;
  }
  .filename-box:focus { border-color: #38bdf8; }
  .editor-status-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }
  .editor-status-pill.unsaved {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }
  .editor-stats {
    font-size: 11px;
    color: #64748b;
    display: flex;
    gap: 10px;
  }
  .editor-textarea {
    flex: 1;
    width: 100%;
    background: #090d16;
    color: #e2e8f0;
    border: none;
    padding: 14px;
    font-family: 'Fira Code', Consolas, Monaco, monospace;
    font-size: 13px;
    line-height: 1.6;
    resize: none;
    outline: none;
  }
  .editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #0f172a;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* In-App Toast */
  .fm-toast {
    position: absolute;
    bottom: 50px;
    right: 20px;
    background: #059669;
    color: #fff;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    display: none;
    z-index: 99;
    animation: fadeIn 0.15s;
  }
  .fm-toast.error { background: #dc2626; }

  /* In-App Dialog Modals */
  .fm-modal {
    position: fixed;
    inset: 0;
    background: rgba(6, 9, 18, 0.85);
    backdrop-filter: blur(4px);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 100;
  }
  .fm-modal.open { display: flex; }
  .fm-dialog-card {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 20px;
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6);
  }
  .fm-dialog-title { font-size: 13px; font-weight: 700; color: #f8fafc; }
  .fm-dialog-input {
    background: #162035;
    border: 1px solid #28354f;
    color: #fff;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 12px;
    outline: none;
  }
  .fm-dialog-input:focus { border-color: #38bdf8; }
  .fm-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
</head>
<body>
  <!-- Header -->
  <div class="fm-header">
    <div class="fm-title-group">
      <span style="font-size:18px;">📁</span>
      <span class="fm-title">FILE MANAGER</span>
    </div>
    <div class="fm-actions">
      <button class="fm-btn primary" id="newFileBtn">➕ New File</button>
      <button class="fm-btn" id="newFolderBtn">📁 New Folder</button>
      <button class="fm-btn" id="uploadBtn">⬆️ Upload</button>
      <button class="fm-btn" id="refreshBtn">🔄</button>
      <input type="file" id="fileUploadInput" multiple style="display:none;" />
    </div>
  </div>

  <!-- Breadcrumbs & Search -->
  <div class="fm-subbar" id="subbar">
    <div class="breadcrumbs" id="breadcrumbs"></div>
    <input type="text" class="search-input" id="searchInput" placeholder="🔍 Search files..." />
  </div>

  <!-- File List View -->
  <div class="fm-body" id="fileListView"></div>

  <!-- Integrated Editor View -->
  <div class="editor-view" id="editorView">
    <div class="editor-header">
      <div class="editor-title-wrap">
        <button class="fm-btn" id="editorBackBtn">⬅️ Files</button>
        <input type="text" class="filename-box" id="editorFilenameInput" value="untitled.txt" />
        <span class="editor-status-pill" id="editorStatusPill">Saved ✓</span>
      </div>
      <div class="editor-stats">
        <span id="editorChars">0 chars</span>
        <span id="editorWords">0 words</span>
      </div>
    </div>
    <textarea class="editor-textarea" id="editorTextarea" placeholder="Type your text or note here..."></textarea>
    <div class="editor-footer">
      <div style="display:flex; gap:8px;">
        <button class="fm-btn success" id="editorSaveBtn">💾 Save</button>
        <button class="fm-btn" id="editorSaveAsBtn">💾 Save As...</button>
        <button class="fm-btn" id="editorDownloadBtn">⬇️ Download</button>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="fm-btn primary" id="editorOpenNotepadBtn">📝 Open in Notepad</button>
        <button class="fm-btn" id="editorCloseBtn">✕ Close</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="fm-toast" id="fmToast"></div>

  <!-- Input Dialog Modal -->
  <div class="fm-modal" id="inputModal">
    <div class="fm-dialog-card">
      <div class="fm-dialog-title" id="inputModalTitle">Create File</div>
      <input type="text" class="fm-dialog-input" id="inputModalField" placeholder="Enter name..." />
      <div class="fm-dialog-actions">
        <button class="fm-btn" id="inputModalCancel">Cancel</button>
        <button class="fm-btn primary" id="inputModalOk">OK</button>
      </div>
    </div>
  </div>

  <!-- Confirm Dialog Modal -->
  <div class="fm-modal" id="confirmModal">
    <div class="fm-dialog-card">
      <div class="fm-dialog-title" id="confirmModalTitle">Confirm Action</div>
      <div style="font-size:12px; color:#94a3b8;" id="confirmModalMsg">Are you sure?</div>
      <div class="fm-dialog-actions">
        <button class="fm-btn" id="confirmModalCancel">Cancel</button>
        <button class="fm-btn" style="background:#dc2626; color:#fff;" id="confirmModalOk">Delete</button>
      </div>
    </div>
  </div>

<script>
  const STORAGE_KEY = 'voice_os_files';
  let currentFolderId = 'root';
  let activeEditingFile = null;
  let isEditorDirty = false;

  function getItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [];
  }

  function saveItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.parent.postMessage({ type: 'os:files-updated' }, '*');
    } catch(e) {
      showToast('Storage error: unable to save changes.', true);
    }
  }

  function showToast(msg, isError = false) {
    const t = document.getElementById('fmToast');
    t.textContent = msg;
    t.className = 'fm-toast' + (isError ? ' error' : '');
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 2400);
  }

  function showPrompt(title, defaultValue, cb) {
    const modal = document.getElementById('inputModal');
    const titleEl = document.getElementById('inputModalTitle');
    const inputEl = document.getElementById('inputModalField');
    const okBtn = document.getElementById('inputModalOk');
    const cancelBtn = document.getElementById('inputModalCancel');

    titleEl.textContent = title;
    inputEl.value = defaultValue || '';
    modal.classList.add('open');
    inputEl.focus();

    const cleanup = () => {
      modal.classList.remove('open');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      inputEl.onkeydown = null;
    };

    okBtn.onclick = () => {
      const val = inputEl.value.trim();
      cleanup();
      if (val) cb(val);
    };
    cancelBtn.onclick = cleanup;
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') okBtn.click();
      else if (e.key === 'Escape') cleanup();
    };
  }

  function showConfirm(title, msg, cb) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMsg').textContent = msg;
    modal.classList.add('open');

    const okBtn = document.getElementById('confirmModalOk');
    const cancelBtn = document.getElementById('confirmModalCancel');

    const cleanup = () => {
      modal.classList.remove('open');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => { cleanup(); cb(); };
    cancelBtn.onclick = cleanup;
  }

  function render() {
    if (activeEditingFile) {
      document.getElementById('subbar').style.display = 'none';
      document.getElementById('fileListView').style.display = 'none';
      document.getElementById('editorView').classList.add('active');
      return;
    }

    document.getElementById('subbar').style.display = 'flex';
    document.getElementById('fileListView').style.display = 'flex';
    document.getElementById('editorView').classList.remove('active');

    renderBreadcrumbs();
    renderFileList();
  }

  function renderBreadcrumbs() {
    const bc = document.getElementById('breadcrumbs');
    bc.innerHTML = '';
    const items = getItems();

    const crumbs = [{ id: 'root', name: 'Root' }];
    let curr = currentFolderId;
    while (curr !== 'root') {
      const folder = items.find(i => i.id === curr && i.type === 'folder');
      if (folder) {
        crumbs.splice(1, 0, { id: folder.id, name: folder.name });
        curr = folder.parentId || 'root';
      } else {
        break;
      }
    }

    crumbs.forEach((crumb, idx) => {
      if (idx > 0) {
        const sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '/';
        bc.appendChild(sep);
      }
      const span = document.createElement('span');
      span.className = 'crumb' + (idx === crumbs.length - 1 ? ' current' : '');
      span.textContent = crumb.name;
      if (idx !== crumbs.length - 1) {
        span.onclick = () => { currentFolderId = crumb.id; render(); };
      }
      bc.appendChild(span);
    });
  }

  function renderFileList() {
    const list = document.getElementById('fileListView');
    const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
    const items = getItems();

    const inFolder = items.filter(i => {
      if (query) {
        return (i.name || '').toLowerCase().includes(query) || (i.content || '').toLowerCase().includes(query);
      }
      return (i.parentId || 'root') === currentFolderId;
    });

    // Sort folders first, then files
    inFolder.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    list.innerHTML = '';

    if (inFolder.length === 0) {
      list.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">' + (query ? '🔍' : '📁') + '</div>' +
        '<div>' + (query ? 'No matching files found.' : 'This folder is empty.') + '</div>' +
        '<div style="display:flex; gap:8px;">' +
          '<button class="fm-btn primary" id="emptyNewFile">➕ New File</button>' +
          '<button class="fm-btn" id="emptyNewFolder">📁 New Folder</button>' +
        '</div>' +
      '</div>';
      const nf = document.getElementById('emptyNewFile');
      if (nf) nf.onclick = createNewFile;
      const nd = document.getElementById('emptyNewFolder');
      if (nd) nd.onclick = createNewFolder;
      return;
    }

    inFolder.forEach(item => {
      const isFolder = item.type === 'folder';
      const row = document.createElement('div');
      row.className = 'item-row';

      const icon = isFolder ? '📁' : '📄';
      const meta = isFolder
        ? 'Folder'
        : (item.size || '0 B') + ' • ' + (item.date || 'Recent');

      let actionsHtml = '';
      if (isFolder) {
        actionsHtml = '<button class="mini-btn open-btn">Open</button>' +
          '<button class="mini-btn rename-btn">🏷️</button>' +
          '<button class="mini-btn danger del-btn">🗑️</button>';
      } else {
        actionsHtml = '<button class="mini-btn open-btn">✏️ Edit</button>' +
          '<button class="mini-btn saveas-btn">💾 As</button>' +
          '<button class="mini-btn rename-btn">🏷️</button>' +
          '<button class="mini-btn dl-btn">⬇️</button>' +
          '<button class="mini-btn danger del-btn">🗑️</button>';
      }

      row.innerHTML = '<div class="item-left">' +
        '<div class="item-icon">' + icon + '</div>' +
        '<div class="item-meta">' +
          '<div class="item-name">' + item.name + '</div>' +
          '<div class="item-sub">' + meta + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="item-actions">' + actionsHtml + '</div>';

      const openItem = () => {
        if (isFolder) {
          currentFolderId = item.id;
          render();
        } else {
          openEditor(item);
        }
      };

      row.querySelector('.item-left').addEventListener('click', openItem);
      row.querySelector('.open-btn').addEventListener('click', (e) => { e.stopPropagation(); openItem(); });

      row.querySelector('.rename-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        renameItem(item);
      });

      row.querySelector('.del-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteItem(item);
      });

      if (!isFolder) {
        row.querySelector('.saveas-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          saveAsItem(item);
        });
        row.querySelector('.dl-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          downloadFile(item);
        });
      }

      list.appendChild(row);
    });
  }

  // Create New File
  function createNewFile() {
    showPrompt('Create New File', 'new-note.txt', (name) => {
      if (!name) return;
      const cleanName = name.endsWith('.txt') ? name : (name + '.txt');
      const items = getItems();
      const newFile = {
        id: 'file-' + Date.now(),
        name: cleanName,
        type: 'file',
        parentId: currentFolderId,
        content: '',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        size: '0 B',
        updatedAt: Date.now()
      };
      items.unshift(newFile);
      saveItems(items);
      showToast('File created successfully');
      openEditor(newFile);
    });
  }

  // Create New Folder
  function createNewFolder() {
    showPrompt('Create New Folder', 'New Folder', (name) => {
      if (!name) return;
      const items = getItems();
      const newFolder = {
        id: 'folder-' + Date.now(),
        name: name,
        type: 'folder',
        parentId: currentFolderId,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        updatedAt: Date.now()
      };
      items.unshift(newFolder);
      saveItems(items);
      showToast('Folder created successfully');
      render();
    });
  }

  // Rename
  function renameItem(item) {
    showPrompt('Rename ' + (item.type === 'folder' ? 'Folder' : 'File'), item.name, (newName) => {
      if (!newName || newName === item.name) return;
      const items = getItems();
      const target = items.find(i => i.id === item.id);
      if (target) {
        target.name = newName;
        target.updatedAt = Date.now();
        saveItems(items);
        showToast('Renamed successfully');
        render();
      }
    });
  }

  // Delete
  function deleteItem(item) {
    showConfirm('Delete ' + (item.type === 'folder' ? 'Folder' : 'File'), 'Are you sure you want to delete "' + item.name + '"?', () => {
      let items = getItems();
      if (item.type === 'folder') {
        // Recursively remove folder and its children
        const toDeleteIds = new Set([item.id]);
        let added = true;
        while (added) {
          added = false;
          items.forEach(i => {
            if (i.parentId && toDeleteIds.has(i.parentId) && !toDeleteIds.has(i.id)) {
              toDeleteIds.add(i.id);
              added = true;
            }
          });
        }
        items = items.filter(i => !toDeleteIds.has(i.id));
      } else {
        items = items.filter(i => i.id !== item.id);
      }
      saveItems(items);
      showToast('Item deleted successfully');
      render();
    });
  }

  // Download File
  function downloadFile(file) {
    const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Save As
  function saveAsItem(file) {
    showPrompt('Save As Copy', 'copy-' + file.name, (copyName) => {
      if (!copyName) return;
      const items = getItems();
      const copyFile = {
        ...file,
        id: 'file-' + Date.now(),
        name: copyName,
        updatedAt: Date.now()
      };
      items.unshift(copyFile);
      saveItems(items);
      showToast('Saved copy as "' + copyName + '"');
      render();
    });
  }

  // File Upload
  document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('fileUploadInput').click();
  });

  document.getElementById('fileUploadInput').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    let items = getItems();
    let loadedCount = 0;

    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        const bytes = f.size;
        const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
        const fileObj = {
          id: 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          name: f.name,
          type: 'file',
          parentId: currentFolderId,
          content: text,
          size: sizeStr,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          updatedAt: Date.now()
        };
        items.unshift(fileObj);
        loadedCount++;
        if (loadedCount === files.length) {
          saveItems(items);
          showToast('Uploaded ' + files.length + ' file(s) successfully');
          render();
        }
      };
      reader.readAsText(f);
    });
    e.target.value = '';
  });

  // Editor Implementation
  function openEditor(file) {
    activeEditingFile = file;
    isEditorDirty = false;
    document.getElementById('editorFilenameInput').value = file.name;
    document.getElementById('editorTextarea').value = file.content || '';
    updateEditorStats();
    updateEditorStatus(true);
    render();
  }

  function updateEditorStats() {
    const txt = document.getElementById('editorTextarea').value;
    document.getElementById('editorChars').textContent = txt.length + ' chars';
    const words = txt.trim() ? txt.trim().split(/\\s+/).length : 0;
    document.getElementById('editorWords').textContent = words + ' words';
  }

  function updateEditorStatus(isClean) {
    const pill = document.getElementById('editorStatusPill');
    if (isClean) {
      pill.textContent = 'Saved ✓';
      pill.className = 'editor-status-pill';
      isEditorDirty = false;
    } else {
      pill.textContent = 'Unsaved Changes *';
      pill.className = 'editor-status-pill unsaved';
      isEditorDirty = true;
    }
  }

  document.getElementById('editorTextarea').addEventListener('input', () => {
    updateEditorStats();
    updateEditorStatus(false);
  });

  document.getElementById('editorFilenameInput').addEventListener('input', () => {
    updateEditorStatus(false);
  });

  // Save in Editor
  document.getElementById('editorSaveBtn').addEventListener('click', () => {
    saveCurrentEditorFile();
  });

  function saveCurrentEditorFile() {
    if (!activeEditingFile) return;
    const newName = (document.getElementById('editorFilenameInput').value || '').trim();
    if (!newName) {
      showToast('Unable to save file: Filename cannot be empty.', true);
      return;
    }
    if (/[\\\\/:*?"<>|]/.test(newName)) {
      showToast('Unable to save file: Invalid characters in filename.', true);
      return;
    }

    const newContent = document.getElementById('editorTextarea').value;
    const items = getItems();
    const target = items.find(i => i.id === activeEditingFile.id);

    if (!target) {
      showToast('Unable to save file: File not found in storage.', true);
      return;
    }

    const bytes = new Blob([newContent]).size;
    const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';

    target.name = newName;
    target.content = newContent;
    target.size = sizeStr;
    target.date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    target.updatedAt = Date.now();

    activeEditingFile = { ...target };
    saveItems(items);
    updateEditorStatus(true);
    showToast('File saved successfully ✓');
    window.parent.postMessage({ type: 'os:file-saved', file: target }, '*');
  }

  // Save As in Editor
  document.getElementById('editorSaveAsBtn').addEventListener('click', () => {
    if (!activeEditingFile) return;
    showPrompt('Save As', 'copy-' + activeEditingFile.name, (copyName) => {
      if (!copyName) return;
      const content = document.getElementById('editorTextarea').value;
      const bytes = new Blob([content]).size;
      const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
      const items = getItems();
      const newFile = {
        id: 'file-' + Date.now(),
        name: copyName,
        type: 'file',
        parentId: currentFolderId,
        content: content,
        size: sizeStr,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        updatedAt: Date.now()
      };
      items.unshift(newFile);
      saveItems(items);
      activeEditingFile = newFile;
      document.getElementById('editorFilenameInput').value = newFile.name;
      updateEditorStatus(true);
      showToast('Saved as "' + copyName + '" successfully ✓');
      window.parent.postMessage({ type: 'os:file-saved', file: newFile }, '*');
    });
  });

  // Download in Editor
  document.getElementById('editorDownloadBtn').addEventListener('click', () => {
    if (!activeEditingFile) return;
    const currentName = document.getElementById('editorFilenameInput').value || activeEditingFile.name;
    const content = document.getElementById('editorTextarea').value;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Open in Notepad
  document.getElementById('editorOpenNotepadBtn').addEventListener('click', () => {
    if (!activeEditingFile) return;
    window.parent.postMessage({
      type: 'os:open-file-in-notepad',
      file: {
        ...activeEditingFile,
        name: document.getElementById('editorFilenameInput').value,
        content: document.getElementById('editorTextarea').value
      }
    }, '*');
  });

  // Close Editor
  function closeEditor() {
    if (isEditorDirty) {
      showConfirm('Unsaved Changes', 'You have unsaved changes. Discard them and return to file list?', () => {
        activeEditingFile = null;
        isEditorDirty = false;
        render();
      });
    } else {
      activeEditingFile = null;
      render();
    }
  }

  document.getElementById('editorBackBtn').addEventListener('click', closeEditor);
  document.getElementById('editorCloseBtn').addEventListener('click', closeEditor);

  // Top Buttons
  document.getElementById('newFileBtn').addEventListener('click', createNewFile);
  document.getElementById('newFolderBtn').addEventListener('click', createNewFolder);
  document.getElementById('refreshBtn').addEventListener('click', render);
  document.getElementById('searchInput').addEventListener('input', render);

  // Unified App Action Handler for File Manager
  window.executeAppAction = function(action, params = {}) {
    const act = (action || '').toUpperCase();
    if (act === 'CREATE_FILE') {
      if (params.filename) {
        const fname = params.filename.trim();
        const items = getItems();
        const newFile = {
          id: 'file-' + Date.now(),
          name: fname,
          type: 'file',
          parentId: currentFolderId,
          content: params.content || '',
          size: '0 B',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          updatedAt: Date.now()
        };
        items.unshift(newFile);
        saveItems(items);
        render();
        openEditor(newFile);
        showToast('File "' + fname + '" created ✓');
        window.parent.postMessage({ type: 'os:file-saved', file: newFile }, '*');
      } else {
        createNewFile();
      }
    } else if (act === 'CREATE_FOLDER') {
      if (params.folderName) {
        const fldName = params.folderName.trim();
        const items = getItems();
        const newFolder = {
          id: 'folder-' + Date.now(),
          name: fldName,
          type: 'folder',
          parentId: currentFolderId,
          updatedAt: Date.now()
        };
        items.push(newFolder);
        saveItems(items);
        render();
        showToast('Folder "' + fldName + '" created ✓');
        window.parent.postMessage({ type: 'os:files-updated' }, '*');
      } else {
        createNewFolder();
      }
    } else if (act === 'SAVE_FILE') {
      if (activeEditingFile) {
        saveCurrentEditorFile();
      }
    } else if (act === 'SAVE_FILE_AS') {
      const targetName = (params.filename || (activeEditingFile ? 'copy-' + activeEditingFile.name : 'notes.txt')).trim();
      const content = activeEditingFile ? document.getElementById('editorTextarea').value : '';
      const bytes = new Blob([content]).size;
      const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
      const items = getItems();

      const existingIdx = items.findIndex(i => i.name.toLowerCase() === targetName.toLowerCase());
      if (existingIdx !== -1 && params.overwrite) {
        items[existingIdx].content = content;
        items[existingIdx].size = sizeStr;
        items[existingIdx].updatedAt = Date.now();
        saveItems(items);
        activeEditingFile = items[existingIdx];
        document.getElementById('editorFilenameInput').value = targetName;
        updateEditorStatus(true);
        showToast('Replaced "' + targetName + '" ✓');
        window.parent.postMessage({ type: 'os:file-saved', file: items[existingIdx] }, '*');
      } else {
        const newFile = {
          id: 'file-' + Date.now(),
          name: targetName,
          type: 'file',
          parentId: currentFolderId,
          content: content,
          size: sizeStr,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          updatedAt: Date.now()
        };
        items.unshift(newFile);
        saveItems(items);
        activeEditingFile = newFile;
        document.getElementById('editorFilenameInput').value = newFile.name;
        updateEditorStatus(true);
        showToast('Saved as "' + targetName + '" ✓');
        window.parent.postMessage({ type: 'os:file-saved', file: newFile }, '*');
      }
    } else if (act === 'OPEN_FILE') {
      const allItems = getItems();
      const target = allItems.find(i => 
        i.type === 'file' && (
          i.id === params.fileId ||
          i.name.toLowerCase() === (params.filename || '').toLowerCase() ||
          i.name.toLowerCase().includes((params.filename || '').toLowerCase())
        )
      );
      if (target) openEditor(target);
    } else if (act === 'OPEN_FOLDER') {
      const allFolders = getItems();
      const targetFolder = allFolders.find(i =>
        i.type === 'folder' && (
          i.id === params.folderId ||
          i.name.toLowerCase() === (params.folderName || '').toLowerCase()
        )
      );
      if (targetFolder) {
        currentFolderId = targetFolder.id;
        render();
      }
    } else if (act === 'RENAME_FILE') {
      if (activeEditingFile && params.newName) {
        document.getElementById('editorFilenameInput').value = params.newName;
        saveCurrentEditorFile();
      }
    } else if (act === 'DELETE_FILE') {
      if (activeEditingFile) {
        deleteItem(activeEditingFile.id);
        closeEditor();
      } else if (params.filename) {
        const item = getItems().find(i => i.name.toLowerCase() === params.filename.toLowerCase());
        if (item) deleteItem(item.id);
      }
    } else if (act === 'DOWNLOAD_FILE') {
      if (activeEditingFile) {
        document.getElementById('editorDownloadBtn')?.click();
      }
    } else if (act === 'REFRESH') {
      render();
    } else if (act === 'GO_BACK') {
      if (activeEditingFile) {
        closeEditor();
      } else if (currentFolderId) {
        currentFolderId = null;
        render();
      }
    }
  };

  // Sync & Action listener from parent OS
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'os:action') {
      executeAppAction(e.data.action, e.data.params);
    } else if (e.data.type === 'os:files-updated' || e.data.type === 'os:file-saved') {
      if (!isEditorDirty) render();
    } else if (e.data.type === 'os:open-file') {
      executeAppAction('OPEN_FILE', { fileId: e.data.fileId, filename: e.data.fileName });
    } else if (e.data.type === 'os:create-file') {
      executeAppAction('CREATE_FILE', e.data.params || {});
    } else if (e.data.type === 'os:create-folder') {
      executeAppAction('CREATE_FOLDER', e.data.params || {});
    } else if (e.data.type === 'os:save-file') {
      executeAppAction('SAVE_FILE');
    }
  });

  render();
</script>
</body>
</html>`;
    }

    // 2. NOTEPAD APP (With File Manager Save & Voice Typing)
    if (title.includes('note') || title.includes('text') || title.includes('pad') || title.includes('write')) {
      const initNoteText = initialText ? JSON.stringify(initialText) : 'null';
      const initNoteName = initialFileName ? escapeHtml(initialFileName) : 'notes.txt';
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #12131a;
    color: #f0f0f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  header {
    background: #1a1c26;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #282b3d;
    gap: 8px;
  }
  .title-tag {
    font-size: 13px;
    font-weight: 600;
    color: #7986cb;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .file-name-input {
    background: #161822;
    border: 1px solid #282b3d;
    color: #38bdf8;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    max-width: 150px;
    outline: none;
    font-family: inherit;
  }
  .file-name-input:focus { border-color: #38bdf8; }
  .stats {
    font-size: 11px;
    color: #7e8299;
    display: flex;
    gap: 10px;
    white-space: nowrap;
  }
  .editor-wrap {
    flex: 1;
    padding: 12px;
    display: flex;
    position: relative;
  }
  textarea {
    width: 100%;
    height: 100%;
    background: #161822;
    color: #e2e8f0;
    border: 1px solid #282b3d;
    border-radius: 8px;
    padding: 14px;
    font-size: 14px;
    line-height: 1.6;
    resize: none;
    outline: none;
    font-family: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  textarea:focus {
    border-color: #5c6ac4;
    box-shadow: 0 0 0 2px rgba(92, 106, 196, 0.2);
  }
  footer {
    background: #1a1c26;
    padding: 8px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #282b3d;
  }
  .footer-left { display: flex; gap: 8px; }
  .footer-right { display: flex; gap: 8px; }
  button {
    background: #2f334d;
    color: #fff;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  button:hover { background: #404566; }
  button.primary { background: #0284c7; }
  button.primary:hover { background: #0369a1; }
  button.success { background: #059669; }
  button.success:hover { background: #047857; }
</style>
</head>
<body>
<header>
  <div style="display:flex; align-items:center; gap:8px;">
    <span class="title-tag">📝 NOTEPAD</span>
    <input type="text" class="file-name-input" id="fileNameInput" value="${initNoteName}" placeholder="filename.txt" />
  </div>
  <div class="stats">
    <span id="charCount">0 characters</span>
    <span id="wordCount">0 words</span>
  </div>
</header>
<div class="editor-wrap">
  <textarea id="noteArea" placeholder="Type your thoughts or speak 'write ...' to dictate here..."></textarea>
</div>
<footer>
  <div class="footer-left">
    <button id="clearBtn">Clear</button>
  </div>
  <div class="footer-right">
    <button class="success" id="saveFileBtn">💾 Save to Files</button>
    <button id="copyBtn">📋 Copy</button>
  </div>
</footer>
<script>
  const area = document.getElementById('noteArea');
  const fileNameInput = document.getElementById('fileNameInput');
  const chars = document.getElementById('charCount');
  const words = document.getElementById('wordCount');
  const copyBtn = document.getElementById('copyBtn');
  const saveFileBtn = document.getElementById('saveFileBtn');

  const initialVal = ${initNoteText};
  if (initialVal !== null) {
    area.value = initialVal;
    localStorage.setItem('os_notepad_val', initialVal);
    updateStats();
  } else {
    const saved = localStorage.getItem('os_notepad_val');
    if (saved) {
      area.value = saved;
      updateStats();
    }
  }

  function updateStats() {
    const text = area.value;
    chars.textContent = text.length + ' characters';
    const w = text.trim() ? text.trim().split(/\\s+/).length : 0;
    words.textContent = w + ' words';
  }

  area.addEventListener('input', () => {
    localStorage.setItem('os_notepad_val', area.value);
    updateStats();
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    area.value = '';
    localStorage.removeItem('os_notepad_val');
    updateStats();
    area.focus();
  });

  // Save to File Manager
  saveFileBtn.addEventListener('click', saveNoteToFiles);

  function saveNoteToFiles() {
    const text = area.value;
    let fileName = (fileNameInput.value || 'notes.txt').trim();
    if (!fileName.toLowerCase().endsWith('.txt')) fileName += '.txt';

    const bytes = new Blob([text]).size;
    const sizeStr = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B';
    const fileObj = {
      id: 'file-' + Date.now(),
      name: fileName,
      content: text,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      size: sizeStr
    };

    // Update voice_os_files in localStorage
    try {
      const raw = localStorage.getItem('voice_os_files');
      let files = raw ? JSON.parse(raw) : [];
      const existingIdx = files.findIndex(f => f.name.toLowerCase() === fileName.toLowerCase());
      if (existingIdx >= 0) {
        files[existingIdx] = fileObj;
      } else {
        files.unshift(fileObj);
      }
      localStorage.setItem('voice_os_files', JSON.stringify(files));
    } catch(e) {}

    // Post to parent OS
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'os:file-saved', file: fileObj }, '*');
    }

    saveFileBtn.textContent = 'Saved! ✓';
    setTimeout(() => { saveFileBtn.textContent = '💾 Save to Files'; }, 1600);
  }

  // Copy button
  copyBtn.addEventListener('click', () => {
    const text = area.value;
    let copied = false;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'os:clipboard-copy', text: text }, '*');
    }
    try {
      area.select();
      copied = document.execCommand('copy');
      window.getSelection()?.removeAllRanges();
    } catch (e) {}
    if (!copied && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
  });

  // Message listener from parent OS
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'os:append-note-text') {
      const val = area.value ? (area.value + '\\n' + e.data.text) : e.data.text;
      area.value = val;
      localStorage.setItem('os_notepad_val', val);
      updateStats();
      area.scrollTop = area.scrollHeight;
    } else if (e.data.type === 'os:set-note-text') {
      area.value = e.data.text || '';
      localStorage.setItem('os_notepad_val', area.value);
      if (e.data.name) fileNameInput.value = e.data.name;
      updateStats();
    } else if (e.data.type === 'os:save-current-note') {
      saveNoteToFiles();
    } else if (e.data.type === 'os:save-note-as') {
      if (e.data.filename) fileNameInput.value = e.data.filename;
      saveNoteToFiles();
    } else if (e.data.type === 'os:set-note-name') {
      if (e.data.name) fileNameInput.value = e.data.name;
    }
  });
</script>
</body>
</html>`;
    }

    if (title.includes('analogue') || title.includes('analog')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #10121a;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .clock-case {
    width: 230px;
    height: 230px;
    border-radius: 50%;
    background: radial-gradient(circle, #1a1d2e 0%, #10121c 100%);
    border: 3px solid #2d334d;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6), inset 0 0 15px rgba(0,0,0,0.8);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dial {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
  .hand {
    position: absolute;
    bottom: 50%;
    left: 50%;
    transform-origin: bottom center;
    border-radius: 4px;
  }
  .hour-hand {
    width: 5px;
    height: 58px;
    margin-left: -2.5px;
    background: #e2e8f0;
    z-index: 3;
  }
  .minute-hand {
    width: 3.5px;
    height: 82px;
    margin-left: -1.75px;
    background: #818cf8;
    z-index: 4;
  }
  .second-hand {
    width: 1.5px;
    height: 94px;
    margin-left: -0.75px;
    background: #f43f5e;
    z-index: 5;
  }
  .center-pin {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #f43f5e;
    border: 2px solid #fff;
    position: absolute;
    z-index: 6;
  }
  .date-badge {
    margin-top: 14px;
    font-size: 13px;
    color: #94a3b8;
    letter-spacing: 1px;
    font-weight: 500;
    background: #181b28;
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid #262c42;
  }
</style>
</head>
<body>
<div class="clock-case">
  <svg class="dial" viewBox="0 0 240 240">
    <circle cx="120" cy="120" r="110" fill="none" stroke="#252b40" stroke-width="2"/>
    <g stroke="#64748b" stroke-width="2">
      <line x1="120" y1="18" x2="120" y2="30"/>
      <line x1="120" y1="210" x2="120" y2="222"/>
      <line x1="18" y1="120" x2="30" y2="120"/>
      <line x1="210" y1="120" x2="222" y2="120"/>
      <line x1="192" y1="48" x2="183" y2="57"/>
      <line x1="48" y1="192" x2="57" y2="183"/>
      <line x1="192" y1="192" x2="183" y2="183"/>
      <line x1="48" y1="48" x2="57" y2="57"/>
    </g>
    <text x="120" y="44" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">12</text>
    <text x="200" y="124" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">3</text>
    <text x="120" y="204" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">6</text>
    <text x="40" y="124" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">9</text>
  </svg>
  <div class="hand hour-hand" id="hour"></div>
  <div class="hand minute-hand" id="minute"></div>
  <div class="hand second-hand" id="second"></div>
  <div class="center-pin"></div>
</div>
<div class="date-badge" id="dateText"></div>
<script>
  function updateClock() {
    const now = new Date();
    const s = now.getSeconds();
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    document.getElementById('second').style.transform = 'rotate(' + (s * 6) + 'deg)';
    document.getElementById('minute').style.transform = 'rotate(' + (m * 6) + 'deg)';
    document.getElementById('hour').style.transform = 'rotate(' + (h * 30) + 'deg)';
    document.getElementById('dateText').textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function setDialColor(colorName) {
    const colorMap = {
      'neon green': '#39ff14', 'green': '#10b981', 'cyan': '#00e5ff',
      'neon pink': '#ff007f', 'pink': '#ff007f', 'blue': '#3b82f6',
      'orange': '#ff7700', 'red': '#ef4444', 'purple': '#a855f7',
      'white': '#ffffff', 'yellow': '#eab308', 'amber': '#f59e0b'
    };
    const c = colorMap[(colorName || '').toLowerCase().trim()] || colorName || '#f43f5e';
    const sHand = document.getElementById('second');
    const cPin = document.querySelector('.center-pin');
    if (sHand) sHand.style.background = c;
    if (cPin) cPin.style.background = c;
  }

  window.addEventListener('message', (e) => {
    if (!e.data) return;
    const msg = e.data;
    const action = msg.action || (msg.type === 'os:action' ? msg.action : null);
    const params = msg.params || {};
    if (action === 'SET_COLOR' || action === 'SET_CLOCK_COLOR') {
      const clr = params.color || params.theme || 'neon green';
      setDialColor(clr);
    }
  });

  const savedClr = localStorage.getItem('os_clock_color');
  if (savedClr) setDialColor(savedClr);

  setInterval(updateClock, 1000);
  updateClock();
</script>
</body>
</html>`;
    }

    if (title.includes('calc') || title.includes('math')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #12131a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; padding: 12px; }
  .screen { background: #1a1c26; border-radius: 10px; padding: 14px; margin-bottom: 12px; text-align: right; border: 1px solid #282b3d; }
  .history { font-size: 12px; color: #7e8299; min-height: 16px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; }
  .display { font-size: 28px; font-weight: 600; color: #64b5f6; word-break: break-all; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex: 1; }
  button { background: #222533; border: 1px solid #2f3349; color: #f0f0f5; font-size: 16px; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all 0.1s ease; outline: none; }
  button:hover { background: #2f334d; }
  button:active { transform: scale(0.97); }
  button.op { background: #2d314d; color: #82b1ff; font-weight: 600; }
  button.op:hover { background: #3b4066; }
  button.eq { background: #3949ab; color: #fff; grid-column: span 2; font-weight: 600; }
  button.eq:hover { background: #303f9f; }
  button.clear { color: #ff5252; }
</style>
</head>
<body>
<div class="screen">
  <div class="history" id="history"></div>
  <div class="display" id="display">0</div>
</div>
<div class="grid">
  <button class="clear" onclick="clearCalc()">C</button>
  <button onclick="backspace()">⌫</button>
  <button class="op" onclick="appendOp('%')">%</button>
  <button class="op" onclick="appendOp('/')">÷</button>
  <button onclick="appendNum('7')">7</button>
  <button onclick="appendNum('8')">8</button>
  <button onclick="appendNum('9')">9</button>
  <button class="op" onclick="appendOp('*')">×</button>
  <button onclick="appendNum('4')">4</button>
  <button onclick="appendNum('5')">5</button>
  <button onclick="appendNum('6')">6</button>
  <button class="op" onclick="appendOp('-')">−</button>
  <button onclick="appendNum('1')">1</button>
  <button onclick="appendNum('2')">2</button>
  <button onclick="appendNum('3')">3</button>
  <button class="op" onclick="appendOp('+')">+</button>
  <button onclick="appendNum('0')">0</button>
  <button onclick="appendNum('.')">.</button>
  <button class="eq" onclick="calculate()">=</button>
</div>
<script>
  let current = '0';
  let history = '';
  const disp = document.getElementById('display');
  const hist = document.getElementById('history');
  function update() { disp.textContent = current; hist.textContent = history; }
  function appendNum(n) { if (current === '0' && n !== '.') current = n; else current += n; update(); }
  function appendOp(op) { history = current + ' ' + op; current = '0'; update(); }
  function clearCalc() { current = '0'; history = ''; update(); }
  function backspace() { current = current.length > 1 ? current.slice(0, -1) : '0'; update(); }
  function calculate() {
    try {
      const expr = (history + ' ' + current).replace(/÷/g, '/').replace(/×/g, '*');
      const res = Function('"use strict";return (' + expr + ')')();
      history = expr + ' =';
      current = String(Number(res.toFixed(8)));
      update();
    } catch(e) { current = 'Error'; update(); }
  }
</script>
</body>
</html>`;
    }

    if (title.includes('clock') || title.includes('time') || title.includes('timer') || title.includes('stopwatch')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --clock-color: #39ff14;
    --clock-glow: rgba(57, 255, 20, 0.45);
    --clock-glow-subtle: rgba(57, 255, 20, 0.15);
  }
  body {
    background: #0b0f19;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    overflow: hidden;
    user-select: none;
  }
  .clock-nav {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #111827;
    border: 1px solid #1f293d;
    border-radius: 8px;
    padding: 4px 8px;
  }
  .mode-switch {
    display: flex;
    gap: 4px;
    background: #1e293b;
    border-radius: 6px;
    padding: 2px;
  }
  .mode-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .mode-btn.active {
    background: var(--clock-color);
    color: #0b0f19;
    box-shadow: 0 0 10px var(--clock-glow);
  }
  .color-label-badge {
    font-size: 11px;
    color: var(--clock-color);
    font-weight: 600;
    text-transform: capitalize;
    letter-spacing: 0.5px;
  }
  .clock-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 10px 0;
  }
  .digital-view {
    background: #111827;
    border: 2px solid var(--clock-color);
    border-radius: 16px;
    padding: 20px 28px;
    text-align: center;
    box-shadow: 0 0 25px var(--clock-glow-subtle), inset 0 0 15px rgba(0,0,0,0.5);
    transition: all 0.3s ease;
    width: 100%;
    max-width: 330px;
  }
  .digital-time {
    font-size: 42px;
    font-weight: 800;
    color: var(--clock-color);
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    letter-spacing: 2px;
    text-shadow: 0 0 15px var(--clock-glow), 0 0 30px var(--clock-glow);
    font-variant-numeric: tabular-nums;
  }
  .digital-ampm {
    font-size: 13px;
    color: #cbd5e1;
    font-weight: 700;
    margin-left: 6px;
    letter-spacing: 1px;
  }
  .digital-date {
    font-size: 13px;
    color: #94a3b8;
    margin-top: 8px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  .digital-tz {
    display: inline-block;
    font-size: 10px;
    color: #64748b;
    margin-top: 8px;
    background: #1e293b;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid #334155;
  }
  .analogue-view {
    display: none;
    width: 190px;
    height: 190px;
    border-radius: 50%;
    background: radial-gradient(circle, #1a2234 0%, #111827 100%);
    border: 3px solid var(--clock-color);
    box-shadow: 0 0 25px var(--clock-glow-subtle);
    position: relative;
    align-items: center;
    justify-content: center;
  }
  .dial-svg { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
  .hand {
    position: absolute;
    bottom: 50%;
    left: 50%;
    transform-origin: bottom center;
    border-radius: 4px;
  }
  .hour-hand { width: 4.5px; height: 50px; margin-left: -2.25px; background: #e2e8f0; z-index: 3; }
  .minute-hand { width: 3px; height: 70px; margin-left: -1.5px; background: #94a3b8; z-index: 4; }
  .second-hand { width: 2px; height: 80px; margin-left: -1px; background: var(--clock-color); z-index: 5; box-shadow: 0 0 6px var(--clock-color); }
  .center-pin { width: 10px; height: 10px; border-radius: 50%; background: var(--clock-color); border: 2px solid #fff; position: absolute; z-index: 6; }
  .color-bar {
    width: 100%;
    background: #111827;
    border: 1px solid #1f293d;
    border-radius: 8px;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .color-bar-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; white-space: nowrap; }
  .chips-wrap { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 2px; }
  .color-chip {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }
  .color-chip:hover { transform: scale(1.15); }
  .color-chip.active { border-color: #fff; transform: scale(1.2); }
</style>
</head>
<body>
<div class="clock-nav">
  <div class="mode-switch">
    <button class="mode-btn active" id="modeDigital" onclick="switchMode('digital')">Digital</button>
    <button class="mode-btn" id="modeAnalogue" onclick="switchMode('analogue')">Analogue</button>
  </div>
  <div class="color-label-badge" id="colorBadge">Neon Green</div>
</div>

<div class="clock-viewport">
  <div class="digital-view" id="digitalView">
    <div class="digital-time"><span id="digiTime">00:00:00</span><span class="digital-ampm" id="digiAmpm">AM</span></div>
    <div class="digital-date" id="digiDate">Loading...</div>
    <div class="digital-tz" id="digiTz">Raipur (IST)</div>
  </div>

  <div class="analogue-view" id="analogueView">
    <svg class="dial-svg" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="92" fill="none" stroke="#1f293d" stroke-width="2"/>
      <g stroke="#475569" stroke-width="2">
        <line x1="100" y1="14" x2="100" y2="24"/>
        <line x1="100" y1="176" x2="100" y2="186"/>
        <line x1="14" y1="100" x2="24" y2="100"/>
        <line x1="176" y1="100" x2="186" y2="100"/>
      </g>
      <text x="100" y="38" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="700">12</text>
      <text x="170" y="104" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="700">3</text>
      <text x="100" y="172" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="700">6</text>
      <text x="30" y="104" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="700">9</text>
    </svg>
    <div class="hand hour-hand" id="aHour"></div>
    <div class="hand minute-hand" id="aMinute"></div>
    <div class="hand second-hand" id="aSecond"></div>
    <div class="center-pin"></div>
  </div>
</div>

<div class="color-bar">
  <span class="color-bar-label">Color:</span>
  <div class="chips-wrap" id="chipsWrap"></div>
</div>

<script>
  const COLOR_MAP = {
    'neon green': { hex: '#39ff14', glow: 'rgba(57, 255, 20, 0.5)', subtle: 'rgba(57, 255, 20, 0.15)' },
    'green': { hex: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', subtle: 'rgba(16, 185, 129, 0.15)' },
    'cyan': { hex: '#00e5ff', glow: 'rgba(0, 229, 255, 0.5)', subtle: 'rgba(0, 229, 255, 0.15)' },
    'neon cyan': { hex: '#00e5ff', glow: 'rgba(0, 229, 255, 0.5)', subtle: 'rgba(0, 229, 255, 0.15)' },
    'neon pink': { hex: '#ff007f', glow: 'rgba(255, 0, 127, 0.5)', subtle: 'rgba(255, 0, 127, 0.15)' },
    'pink': { hex: '#ff007f', glow: 'rgba(255, 0, 127, 0.5)', subtle: 'rgba(255, 0, 127, 0.15)' },
    'magenta': { hex: '#d946ef', glow: 'rgba(217, 70, 239, 0.5)', subtle: 'rgba(217, 70, 239, 0.15)' },
    'blue': { hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)', subtle: 'rgba(59, 130, 246, 0.15)' },
    'electric blue': { hex: '#2563eb', glow: 'rgba(37, 99, 235, 0.5)', subtle: 'rgba(37, 99, 235, 0.15)' },
    'orange': { hex: '#ff7700', glow: 'rgba(255, 119, 0, 0.5)', subtle: 'rgba(255, 119, 0, 0.15)' },
    'sunset orange': { hex: '#ff7700', glow: 'rgba(255, 119, 0, 0.5)', subtle: 'rgba(255, 119, 0, 0.15)' },
    'amber': { hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', subtle: 'rgba(245, 158, 11, 0.15)' },
    'yellow': { hex: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', subtle: 'rgba(234, 179, 8, 0.15)' },
    'gold': { hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', subtle: 'rgba(245, 158, 11, 0.15)' },
    'red': { hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', subtle: 'rgba(239, 68, 68, 0.15)' },
    'crimson red': { hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', subtle: 'rgba(239, 68, 68, 0.15)' },
    'purple': { hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)', subtle: 'rgba(168, 85, 247, 0.15)' },
    'violet': { hex: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)', subtle: 'rgba(139, 92, 246, 0.15)' },
    'white': { hex: '#ffffff', glow: 'rgba(255, 255, 255, 0.4)', subtle: 'rgba(255, 255, 255, 0.12)' },
    'lime': { hex: '#84cc16', glow: 'rgba(132, 204, 22, 0.5)', subtle: 'rgba(132, 204, 22, 0.15)' }
  };

  const CHIPS = ['neon green', 'cyan', 'neon pink', 'blue', 'orange', 'red', 'purple', 'white'];
  let activeColor = localStorage.getItem('os_clock_color') || 'neon green';
  let activeMode = localStorage.getItem('os_clock_mode') || 'digital';

  function applyColor(colorKey) {
    const norm = (colorKey || 'neon green').toLowerCase().trim();
    let theme = COLOR_MAP[norm];
    if (!theme) {
      theme = { hex: norm, glow: 'rgba(57, 255, 20, 0.4)', subtle: 'rgba(57, 255, 20, 0.15)' };
    }
    activeColor = norm;
    localStorage.setItem('os_clock_color', norm);

    document.documentElement.style.setProperty('--clock-color', theme.hex);
    document.documentElement.style.setProperty('--clock-glow', theme.glow);
    document.documentElement.style.setProperty('--clock-glow-subtle', theme.subtle);

    const badge = document.getElementById('colorBadge');
    if (badge) badge.textContent = norm;

    // Update active chip
    document.querySelectorAll('.color-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.color === norm);
    });
  }

  function renderChips() {
    const wrap = document.getElementById('chipsWrap');
    wrap.innerHTML = '';
    CHIPS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'color-chip' + (c === activeColor ? ' active' : '');
      btn.dataset.color = c;
      btn.style.background = COLOR_MAP[c].hex;
      btn.title = c;
      btn.onclick = () => applyColor(c);
      wrap.appendChild(btn);
    });
  }

  window.switchMode = function(mode) {
    activeMode = mode;
    localStorage.setItem('os_clock_mode', mode);
    document.getElementById('modeDigital').classList.toggle('active', mode === 'digital');
    document.getElementById('modeAnalogue').classList.toggle('active', mode === 'analogue');
    document.getElementById('digitalView').style.display = (mode === 'digital') ? 'block' : 'none';
    document.getElementById('analogueView').style.display = (mode === 'analogue') ? 'flex' : 'none';
  };

  function update() {
    const now = new Date();
    // Digital
    let h = now.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const hStr = String(h).padStart(2, '0');
    document.getElementById('digiTime').textContent = hStr + ':' + m + ':' + s;
    document.getElementById('digiAmpm').textContent = ampm;
    document.getElementById('digiDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    
    // Analogue
    const sec = now.getSeconds();
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;
    const sElem = document.getElementById('aSecond');
    const mElem = document.getElementById('aMinute');
    const hElem = document.getElementById('aHour');
    if (sElem) sElem.style.transform = 'rotate(' + (sec * 6) + 'deg)';
    if (mElem) mElem.style.transform = 'rotate(' + (min * 6) + 'deg)';
    if (hElem) hElem.style.transform = 'rotate(' + (hr * 30) + 'deg)';
  }

  // Window message bridge for Voice Commands
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    const msg = e.data;
    const action = msg.action || (msg.type === 'os:action' ? msg.action : null);
    const params = msg.params || {};

    if (action === 'SET_COLOR' || action === 'SET_CLOCK_COLOR') {
      const clr = params.color || params.theme || 'neon green';
      applyColor(clr);
    } else if (action === 'SWITCH_MODE') {
      const mode = params.mode || 'digital';
      switchMode(mode);
    }
  });

  renderChips();
  applyColor(activeColor);
  switchMode(activeMode);
  setInterval(update, 1000);
  update();
</script>
</body>
</html>`;
    }

    if (title.includes('todo') || title.includes('task') || title.includes('list')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #12131a; color: #f0f0f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  header { background: #1a1c26; padding: 12px 16px; border-bottom: 1px solid #282b3d; }
  h2 { font-size: 14px; font-weight: 600; color: #82b1ff; text-transform: uppercase; letter-spacing: 0.5px; }
  .input-bar { display: flex; padding: 10px 14px; gap: 8px; background: #161824; border-bottom: 1px solid #282b3d; }
  input { flex: 1; background: #202333; border: 1px solid #2e334d; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
  input:focus { border-color: #5c6ac4; }
  button.add-btn { background: #3949ab; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }
  button.add-btn:hover { background: #303f9f; }
  .list { flex: 1; overflow-y: auto; padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; }
  .item { display: flex; align-items: center; justify-content: space-between; background: #1b1e2b; border: 1px solid #282c40; padding: 8px 12px; border-radius: 6px; }
  .item.done span { text-decoration: line-through; color: #626782; }
  .item-left { display: flex; align-items: center; gap: 10px; font-size: 13px; }
  .del-btn { background: none; border: none; color: #ff5252; cursor: pointer; font-size: 14px; opacity: 0.7; }
  .del-btn:hover { opacity: 1; }
</style>
</head>
<body>
<header><h2>Voice OS Tasks</h2></header>
<div class="input-bar">
  <input type="text" id="taskInput" placeholder="Add a new task..." />
  <button class="add-btn" id="addBtn">Add</button>
</div>
<div class="list" id="taskList"></div>
<script>
  let tasks = JSON.parse(localStorage.getItem('os_tasks') || '[]');
  const list = document.getElementById('taskList');
  const input = document.getElementById('taskInput');
  function save() { localStorage.setItem('os_tasks', JSON.stringify(tasks)); render(); }
  function render() {
    list.innerHTML = '';
    if (tasks.length === 0) {
      list.innerHTML = '<div style="color:#626782; text-align:center; padding:20px; font-size:12px;">No tasks yet. Type above to add.</div>';
      return;
    }
    tasks.forEach((t, i) => {
      const d = document.createElement('div');
      d.className = 'item' + (t.done ? ' done' : '');
      d.innerHTML = \`<div class="item-left"><input type="checkbox" \${t.done ? 'checked' : ''} onchange="toggle(\${i})"><span>\${t.text}</span></div><button class="del-btn" onclick="del(\${i})">✕</button>\`;
      list.appendChild(d);
    });
  }
  function toggle(i) { tasks[i].done = !tasks[i].done; save(); }
  function del(i) { tasks.splice(i, 1); save(); }
  document.getElementById('addBtn').addEventListener('click', () => {
    if (input.value.trim()) { tasks.push({ text: input.value.trim(), done: false }); input.value = ''; save(); }
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('addBtn').click(); });
  render();
</script>
</body>
</html>`;
    }

    if (title.includes('snake') || title.includes('game')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0b0e17;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }
  .header-bar {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .game-title {
    font-size: 13px;
    font-weight: 700;
    color: #38bdf8;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .scores-group {
    display: flex;
    gap: 12px;
    font-family: 'Courier New', Courier, monospace;
    font-weight: 700;
    font-size: 13px;
  }
  .score-val { color: #10b981; }
  .high-val { color: #f59e0b; }
  .sound-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 11px;
    cursor: pointer;
  }
  .speed-bar {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 2px;
    font-size: 11px;
  }
  .speed-pills {
    display: flex;
    gap: 4px;
  }
  .speed-pill {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    border-radius: 4px;
    padding: 2px 7px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .speed-pill.active {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
    color: #34d399;
  }
  .canvas-container {
    position: relative;
    width: 320px;
    height: 320px;
    border: 2px solid #1e293b;
    border-radius: 10px;
    overflow: hidden;
    background: #090c15;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(16, 185, 129, 0.12);
  }
  canvas {
    display: block;
    width: 320px;
    height: 320px;
  }
  .overlay-modal {
    position: absolute;
    inset: 0;
    background: rgba(10, 14, 26, 0.88);
    backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    padding: 20px;
    z-index: 10;
  }
  .overlay-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }
  .overlay-title.over { color: #ef4444; text-shadow: 0 0 12px rgba(239, 68, 68, 0.4); }
  .overlay-title.start { color: #38bdf8; text-shadow: 0 0 12px rgba(56, 189, 248, 0.4); }
  .overlay-title.pause { color: #f59e0b; text-shadow: 0 0 12px rgba(245, 158, 11, 0.4); }
  .overlay-sub {
    font-size: 12px;
    color: #94a3b8;
    max-width: 240px;
    line-height: 1.4;
  }
  .overlay-stat {
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
  }
  .badge-record {
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 99px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .action-btn {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    border: none;
    padding: 9px 22px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
  }
  .action-btn:active {
    transform: translateY(1px);
  }
  .bottom-controls {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 4px;
    gap: 8px;
  }
  .aux-btns {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .aux-btn {
    background: #1e2438;
    border: 1px solid #303b5c;
    color: #cbd5e1;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .aux-btn:hover { background: #27314d; color: #fff; }
  .d-pad-wrap {
    display: grid;
    grid-template-columns: repeat(3, 40px);
    grid-template-rows: repeat(3, 34px);
    gap: 5px;
    justify-content: center;
  }
  .pad-btn {
    background: #1a2035;
    border: 1px solid #2e3a59;
    color: #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    transition: all 0.1s ease;
  }
  .pad-btn:active, .pad-btn.pressed {
    background: #10b981;
    color: #fff;
    transform: scale(0.95);
  }
  .pad-center {
    background: #121828;
    font-size: 11px;
    color: #64748b;
  }
  .voice-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 700;
    color: #34d399;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.35);
    padding: 2px 8px;
    border-radius: 12px;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
<div class="header-bar">
  <div class="title-group">
    <span class="game-title">🐍 RETRO SNAKE</span>
    <span class="voice-badge" id="voiceStatusBadge">🎙️ VOICE LIVE</span>
    <button class="sound-btn" id="soundBtn" title="Toggle Sound">🔊</button>
  </div>
  <div class="scores-group">
    <span>SCORE: <span class="score-val" id="score">0</span></span>
    <span>HIGH: <span class="high-val" id="high">0</span></span>
  </div>
</div>

<div class="speed-bar">
  <span style="color:#64748b;">SPEED:</span>
  <div class="speed-pills">
    <button class="speed-pill active" id="pillVoice" data-speed="145">🎙️ VOICE (145ms)</button>
    <button class="speed-pill" id="pillCasual" data-speed="100">⚡ CASUAL (100ms)</button>
    <button class="speed-pill" id="pillSpeed" data-speed="70">🔥 SPEED (70ms)</button>
  </div>
  <span style="color:#34d399; font-size:10px; font-weight:600;">Say "Up", "Down", "Left", "Right"</span>
</div>

<div class="canvas-container">
  <canvas id="game" width="320" height="320"></canvas>

  <!-- Start Overlay -->
  <div class="overlay-modal" id="startOverlay">
    <div class="overlay-title start">🐍 VOICE ARCADE SNAKE</div>
    <div class="overlay-sub">Steer by speaking "Up", "Down", "Left", "Right"! Say "Start" to play.</div>
    <button class="action-btn" id="startBtn">START GAME (or say "Start")</button>
  </div>

  <!-- Pause Overlay -->
  <div class="overlay-modal" id="pauseOverlay" style="display:none;">
    <div class="overlay-title pause">⏸️ PAUSED</div>
    <div class="overlay-sub">Press Space or P to resume</div>
    <button class="action-btn" id="resumeBtn">RESUME</button>
  </div>

  <!-- Game Over Overlay -->
  <div class="overlay-modal" id="overOverlay" style="display:none;">
    <div class="overlay-title over">💀 GAME OVER</div>
    <div class="overlay-stat" id="overScoreText">Score: 0</div>
    <div id="newHighBadge" class="badge-record" style="display:none;">🏆 NEW HIGH SCORE!</div>
    <button class="action-btn" id="restartBtn">PLAY AGAIN</button>
  </div>
</div>

<div class="bottom-controls">
  <div class="aux-btns">
    <button class="aux-btn" id="togglePauseBtn">⏸️ Pause</button>
    <button class="aux-btn" id="quickRestartBtn">🔄 Reset</button>
  </div>
  <div class="d-pad-wrap">
    <div></div>
    <button class="pad-btn" id="btnUp" aria-label="Up">▲</button>
    <div></div>
    <button class="pad-btn" id="btnLeft" aria-label="Left">◀</button>
    <div class="pad-btn pad-center" id="btnCenter">●</div>
    <button class="pad-btn" id="btnRight" aria-label="Right">▶</button>
    <div></div>
    <button class="pad-btn" id="btnDown" aria-label="Down">▼</button>
    <div></div>
  </div>
</div>

<script>
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const grid = 16;
  const cols = 20; // 320 / 16
  const rows = 20; // 320 / 16

  // Sound Engine using Web Audio API
  let audioCtx = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(type) {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (type === 'eat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'bonus') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(900, now + 0.05);
        osc.frequency.setValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'turn') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.28);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch(e) {}
  }

  // Sound toggle button
  const soundBtn = document.getElementById('soundBtn');
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    if (soundEnabled) initAudio();
  });

  // State
  let gameState = 'START';
  let snake = [];
  let currentDir = { x: 1, y: 0 };
  let inputQueue = [];
  let food = { x: 14, y: 10 };
  let bonusFood = null;
  let bonusTimer = null;
  let applesEaten = 0;
  let score = 0;
  let high = parseInt(localStorage.getItem('voice_os_snake_high') || '0', 10);
  document.getElementById('high').textContent = high;
  let baseSpeed = 145;
  let stepInterval = 145;
  let lastTickTime = 0;
  let animId = null;
  let particles = [];

  // Speed selector pills
  document.querySelectorAll('.speed-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      baseSpeed = parseInt(btn.dataset.speed, 10) || 145;
      stepInterval = Math.max(48, baseSpeed - Math.floor(score / 30) * 3);
    });
  });

  function queueDir(d) {
    if (gameState === 'START') {
      startGame();
      if (d === 'UP') currentDir = { x: 0, y: -1 };
      else if (d === 'DOWN') currentDir = { x: 0, y: 1 };
      else if (d === 'LEFT') currentDir = { x: -1, y: 0 };
      else if (d === 'RIGHT') currentDir = { x: 1, y: 0 };
      return;
    }
    if (gameState === 'PAUSED') {
      resumeGame();
    }
    if (gameState !== 'PLAYING') return;

    const last = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : currentDir;
    let target = null;
    if (d === 'UP' && last.y === 0) target = { x: 0, y: -1 };
    else if (d === 'DOWN' && last.y === 0) target = { x: 0, y: 1 };
    else if (d === 'LEFT' && last.x === 0) target = { x: -1, y: 0 };
    else if (d === 'RIGHT' && last.x === 0) target = { x: 1, y: 0 };

    if (target && inputQueue.length < 2) {
      inputQueue.push(target);
      playTone('turn');
    }
  }

  function spawnFood() {
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 200) {
      attempts++;
      const rx = Math.floor(Math.random() * cols);
      const ry = Math.floor(Math.random() * rows);
      if (!snake.some(s => s.x === rx && s.y === ry)) {
        food = { x: rx, y: ry };
        valid = true;
      }
    }
  }

  function spawnBonus() {
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 200) {
      attempts++;
      const rx = Math.floor(Math.random() * cols);
      const ry = Math.floor(Math.random() * rows);
      if (!snake.some(s => s.x === rx && s.y === ry) && !(food.x === rx && food.y === ry)) {
        bonusFood = { x: rx, y: ry, expires: Date.now() + 7000 };
        valid = true;
      }
    }
    clearTimeout(bonusTimer);
    bonusTimer = setTimeout(() => {
      bonusFood = null;
    }, 7000);
  }

  function addExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      const speed = 1.2 + Math.random() * 2.2;
      particles.push({
        x: x * grid + grid / 2,
        y: y * grid + grid / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: color || '#10b981'
      });
    }
  }

  function tick() {
    if (inputQueue.length > 0) {
      currentDir = inputQueue.shift();
    }

    const head = { x: snake[0].x + currentDir.x, y: snake[0].y + currentDir.y };

    // Wall collision
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
      gameOver();
      return;
    }

    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);

    // Food collision
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      applesEaten++;
      document.getElementById('score').textContent = score;
      stepInterval = Math.max(48, baseSpeed - Math.floor(score / 30) * 3);
      if (score > high) {
        high = score;
        localStorage.setItem('voice_os_snake_high', high);
        document.getElementById('high').textContent = high;
      }
      playTone('eat');
      addExplosion(food.x, food.y, '#34d399');
      spawnFood();

      if (applesEaten % 5 === 0) {
        spawnBonus();
      }
    } else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
      score += 30;
      document.getElementById('score').textContent = score;
      stepInterval = Math.max(48, baseSpeed - Math.floor(score / 30) * 3);
      if (score > high) {
        high = score;
        localStorage.setItem('voice_os_snake_high', high);
        document.getElementById('high').textContent = high;
      }
      playTone('bonus');
      addExplosion(bonusFood.x, bonusFood.y, '#f59e0b');
      bonusFood = null;
      clearTimeout(bonusTimer);
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    gameState = 'GAMEOVER';
    playTone('die');
    addExplosion(snake[0].x, snake[0].y, '#ef4444');
    document.getElementById('overScoreText').textContent = 'Score: ' + score;
    const newBadge = document.getElementById('newHighBadge');
    if (score >= high && score > 0) {
      newBadge.style.display = 'inline-block';
    } else {
      newBadge.style.display = 'none';
    }
    document.getElementById('overOverlay').style.display = 'flex';
  }

  function startGame() {
    initAudio();
    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 }
    ];
    currentDir = { x: 1, y: 0 };
    inputQueue = [];
    score = 0;
    applesEaten = 0;
    bonusFood = null;
    clearTimeout(bonusTimer);
    document.getElementById('score').textContent = '0';
    spawnFood();
    gameState = 'PLAYING';
    document.getElementById('startOverlay').style.display = 'none';
    document.getElementById('pauseOverlay').style.display = 'none';
    document.getElementById('overOverlay').style.display = 'none';
    document.getElementById('togglePauseBtn').textContent = '⏸️ Pause';
    lastTickTime = performance.now();
  }

  function pauseGame() {
    if (gameState !== 'PLAYING') return;
    gameState = 'PAUSED';
    playTone('turn');
    document.getElementById('pauseOverlay').style.display = 'flex';
    document.getElementById('togglePauseBtn').textContent = '▶️ Resume';
  }

  function resumeGame() {
    if (gameState !== 'PAUSED') return;
    gameState = 'PLAYING';
    playTone('turn');
    document.getElementById('pauseOverlay').style.display = 'none';
    document.getElementById('togglePauseBtn').textContent = '⏸️ Pause';
    lastTickTime = performance.now();
  }

  function togglePause() {
    if (gameState === 'PLAYING') pauseGame();
    else if (gameState === 'PAUSED') resumeGame();
    else if (gameState === 'START' || gameState === 'GAMEOVER') startGame();
  }

  // Draw loop
  function draw() {
    ctx.fillStyle = '#090c15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * grid, 0);
      ctx.lineTo(c * grid, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * grid);
      ctx.lineTo(canvas.width, r * grid);
      ctx.stroke();
    }

    // Regular Food (Apple with pulsing glow & leaf)
    const foodX = food.x * grid + grid / 2;
    const foodY = food.y * grid + grid / 2;
    const pulse = Math.sin(Date.now() / 150) * 1.5;

    ctx.save();
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(foodX, foodY, grid / 2 - 2 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Leaf
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(foodX + 2, foodY - (grid / 2 - 2), 3, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bonus Food (Golden Apple)
    if (bonusFood) {
      const bX = bonusFood.x * grid + grid / 2;
      const bY = bonusFood.y * grid + grid / 2;
      const bPulse = Math.sin(Date.now() / 90) * 2;
      ctx.save();
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(bX, bY, grid / 2 - 1 + bPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', bX, bY);
      ctx.restore();
    }

    // Snake Body & Head
    snake.forEach((s, i) => {
      ctx.save();
      const x = s.x * grid;
      const y = s.y * grid;
      const isHead = i === 0;

      if (isHead) {
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, grid - 2, grid - 2, 5);
        ctx.fill();

        // Eyes that look in current moving direction
        let eye1 = { x: x + 4, y: y + 4 };
        let eye2 = { x: x + 12, y: y + 4 };

        if (currentDir.x === 1) { // Right
          eye1 = { x: x + 11, y: y + 4 };
          eye2 = { x: x + 11, y: y + 12 };
        } else if (currentDir.x === -1) { // Left
          eye1 = { x: x + 5, y: y + 4 };
          eye2 = { x: x + 5, y: y + 12 };
        } else if (currentDir.y === 1) { // Down
          eye1 = { x: x + 4, y: y + 11 };
          eye2 = { x: x + 12, y: y + 11 };
        } else if (currentDir.y === -1) { // Up
          eye1 = { x: x + 4, y: y + 5 };
          eye2 = { x: x + 12, y: y + 5 };
        }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, 2, 0, Math.PI * 2);
        ctx.arc(eye2.x, eye2.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(eye1.x + currentDir.x * 0.7, eye1.y + currentDir.y * 0.7, 1, 0, Math.PI * 2);
        ctx.arc(eye2.x + currentDir.x * 0.7, eye2.y + currentDir.y * 0.7, 1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#059669';
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, grid - 3, grid - 3, 3);
        ctx.fill();
      }
      ctx.restore();
    });

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Animation Frame Loop
  function gameLoop(now) {
    if (gameState === 'PLAYING') {
      if (now - lastTickTime >= stepInterval) {
        tick();
        lastTickTime = now;
      }
    }
    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  // Input Mapping
  function handleInput(key, code) {
    const k = (key || '').toLowerCase();
    const c = (code || '').toLowerCase();

    if (k === 'arrowup' || k === 'w' || c === 'arrowup' || c === 'keyw') queueDir('UP');
    else if (k === 'arrowdown' || k === 's' || c === 'arrowdown' || c === 'keys') queueDir('DOWN');
    else if (k === 'arrowleft' || k === 'a' || c === 'arrowleft' || c === 'keya') queueDir('LEFT');
    else if (k === 'arrowright' || k === 'd' || c === 'arrowright' || c === 'keyd') queueDir('RIGHT');
    else if (k === ' ' || k === 'space' || k === 'p' || c === 'space' || c === 'keyp') togglePause();
    else if (k === 'r' || k === 'enter' || c === 'keyr' || c === 'enter') {
      if (gameState === 'GAMEOVER' || gameState === 'START') startGame();
    }
  }

  // Native keyboard listener inside iframe
  window.addEventListener('keydown', (e) => {
    const scrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
    if (scrollKeys.includes(e.code) || ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes((e.key || '').toLowerCase())) {
      e.preventDefault();
    }
    handleInput(e.key, e.code);
  });

  function flashDPad(dir) {
    const idMap = { 'UP': 'btnUp', 'DOWN': 'btnDown', 'LEFT': 'btnLeft', 'RIGHT': 'btnRight' };
    const btn = document.getElementById(idMap[dir]);
    if (btn) {
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 200);
    }
  }

  // Unified App Action Handler for Snake Game
  window.executeAppAction = function(action, params = {}) {
    const act = (action || '').toUpperCase();
    if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(act)) {
      queueDir(act);
      flashDPad(act);
    } else if (act.startsWith('MOVE_')) {
      const d = act.replace('MOVE_', '');
      if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(d)) {
        queueDir(d);
        flashDPad(d);
      }
    } else if (act === 'SNAKE_MOVE' || act === 'MOVE') {
      const d = (params.direction || '').toUpperCase();
      if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(d)) {
        queueDir(d);
        flashDPad(d);
      }
    } else if (act === 'SNAKE_START' || act === 'START' || act === 'START_GAME' || act === 'PLAY') {
      startGame();
    } else if (act === 'SNAKE_PAUSE' || act === 'PAUSE' || act === 'PAUSE_GAME') {
      pauseGame();
    } else if (act === 'SNAKE_RESUME' || act === 'RESUME' || act === 'RESUME_GAME') {
      resumeGame();
    } else if (act === 'SNAKE_RESTART' || act === 'RESTART' || act === 'RESTART_GAME' || act === 'RESET') {
      startGame();
    }
  };

  // Message listener from parent Voice OS
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'os:action') {
      executeAppAction(e.data.action, e.data.params);
    } else if (e.data.type === 'os:game-key') {
      handleInput(e.data.key, e.data.code);
    } else if (e.data.type === 'os:snake-action') {
      executeAppAction(e.data.action, e.data.params);
    }
  });

  // Signal ready to parent Voice OS
  try {
    window.parent.postMessage({ type: 'os:snake-ready' }, '*');
  } catch(e) {}

  // Overlay button listeners
  document.getElementById('startBtn').addEventListener('click', () => executeAppAction('SNAKE_START'));
  document.getElementById('resumeBtn').addEventListener('click', () => executeAppAction('SNAKE_RESUME'));
  document.getElementById('restartBtn').addEventListener('click', () => executeAppAction('SNAKE_RESTART'));
  document.getElementById('togglePauseBtn').addEventListener('click', togglePause);
  document.getElementById('quickRestartBtn').addEventListener('click', () => executeAppAction('SNAKE_RESTART'));

  // D-Pad listeners
  document.getElementById('btnUp').addEventListener('click', () => executeAppAction('SNAKE_MOVE', { direction: 'UP' }));
  document.getElementById('btnDown').addEventListener('click', () => executeAppAction('SNAKE_MOVE', { direction: 'DOWN' }));
  document.getElementById('btnLeft').addEventListener('click', () => executeAppAction('SNAKE_MOVE', { direction: 'LEFT' }));
  document.getElementById('btnRight').addEventListener('click', () => executeAppAction('SNAKE_MOVE', { direction: 'RIGHT' }));
  document.getElementById('btnCenter').addEventListener('click', togglePause);

  // Initialize initial board
  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 }
  ];
  spawnFood();
  animId = requestAnimationFrame(gameLoop);
</script>
</body>
</html>`;
    }

    if (title.includes('music') || title.includes('player') || title.includes('audio') || title.includes('song')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f111a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; padding: 12px; overflow: hidden; user-select: none; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2438; padding-bottom: 6px; margin-bottom: 8px; }
  .title { font-size: 13px; font-weight: 600; color: #818cf8; }
  .visualizer { height: 60px; background: #141724; border-radius: 8px; display: flex; align-items: flex-end; justify-content: center; gap: 4px; padding: 6px; border: 1px solid #23283e; margin-bottom: 8px; }
  .bar { width: 8px; background: linear-gradient(to top, #4f46e5, #06b6d4); border-radius: 3px; height: 6px; transition: height 0.08s ease; }
  .track-info { text-align: center; margin-bottom: 8px; }
  .track-title { font-size: 14px; font-weight: 600; color: #f1f5f9; }
  .track-artist { font-size: 11px; color: #64748b; margin-top: 1px; }
  .progress-wrap { margin-bottom: 8px; }
  .bar-bg { width: 100%; height: 5px; background: #1e2438; border-radius: 99px; overflow: hidden; }
  .bar-fill { height: 100%; width: 35%; background: #6366f1; border-radius: 99px; }
  .controls { display: flex; justify-content: center; align-items: center; gap: 14px; margin-bottom: 8px; }
  .btn-round { width: 40px; height: 40px; border-radius: 50%; background: #4f46e5; border: none; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .btn-round:hover { background: #4338ca; }
  .btn-sm { width: 30px; height: 30px; border-radius: 50%; background: #1e2438; border: 1px solid #2d3752; color: #cbd5e1; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .playlist { flex: 1; background: #141724; border-radius: 8px; border: 1px solid #23283e; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 3px; }
  .track-item { padding: 6px 8px; border-radius: 6px; font-size: 11px; display: flex; justify-content: space-between; cursor: pointer; background: #1a1e2e; }
  .track-item.active { background: #2e3552; color: #a5b4fc; font-weight: 600; border-left: 3px solid #6366f1; }
</style>
</head>
<body>
<div class="header">
  <span class="title">🎵 SYNTH MUSIC PLAYER</span>
  <span style="font-size:11px; color:#10b981;">● Online</span>
</div>
<div class="visualizer" id="vis">
  <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
  <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
  <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
</div>
<div class="track-info">
  <div class="track-title" id="tTitle">Neon Rain</div>
  <div class="track-artist">Lo-Fi Cyber Chill</div>
</div>
<div class="progress-wrap">
  <div class="bar-bg"><div class="bar-fill" id="pFill"></div></div>
</div>
<div class="controls">
  <button class="btn-sm" onclick="prevTrack()">⏮</button>
  <button class="btn-round" id="playBtn" onclick="togglePlay()">▶</button>
  <button class="btn-sm" onclick="nextTrack()">⏭</button>
</div>
<div class="playlist" id="plist"></div>
<script>
  const tracks = [
    { title: 'Neon Rain', artist: 'Lo-Fi Chill', chord: [261.63, 329.63, 392.00] },
    { title: 'Cyber Orbit', artist: 'Space Ambient', chord: [220.00, 277.18, 329.63] },
    { title: 'Night Drive', artist: 'Synthwave Dream', chord: [174.61, 220.00, 261.63] },
    { title: 'Retro Wave', artist: 'Synthpop Groove', chord: [196.00, 246.94, 293.66] },
    { title: 'Solar Wind', artist: 'Cosmic Ambient', chord: [164.81, 220.00, 293.66] }
  ];
  let cur = 0;
  let isPlaying = false;
  let audioCtx = null;
  let oscs = [];
  let visTimer = null;
  let prog = 0;

  function renderList() {
    const pl = document.getElementById('plist');
    pl.innerHTML = '';
    tracks.forEach((t, i) => {
      const d = document.createElement('div');
      d.className = 'track-item' + (i === cur ? ' active' : '');
      d.innerHTML = '<span>' + t.title + '</span><span style="color:#64748b;">' + t.artist + '</span>';
      d.onclick = () => { cur = i; loadTrack(); if (isPlaying) playSound(); };
      pl.appendChild(d);
    });
  }

  function loadTrack() {
    document.getElementById('tTitle').textContent = tracks[cur].title;
    renderList();
  }

  function playSound() {
    stopSound();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const chord = tracks[cur].chord;
    oscs = chord.map(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      return osc;
    });
    animateVis(true);
  }

  function stopSound() {
    oscs.forEach(o => { try { o.stop(); } catch(e) {} });
    oscs = [];
    if (audioCtx) { try { audioCtx.close(); } catch(e) {} audioCtx = null; }
    animateVis(false);
  }

  function animateVis(active) {
    const bars = document.querySelectorAll('.bar');
    if (visTimer) clearInterval(visTimer);
    if (active) {
      visTimer = setInterval(() => {
        bars.forEach(b => {
          b.style.height = (Math.random() * 45 + 8) + 'px';
        });
        prog = (prog + 0.8) % 100;
        document.getElementById('pFill').style.width = prog + '%';
      }, 90);
    } else {
      bars.forEach(b => b.style.height = '6px');
    }
  }

  window.togglePlay = function() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('playBtn');
    if (isPlaying) {
      btn.textContent = '⏸';
      playSound();
    } else {
      btn.textContent = '▶';
      stopSound();
    }
  };
  window.nextTrack = function() { cur = (cur + 1) % tracks.length; loadTrack(); if (isPlaying) playSound(); };
  window.prevTrack = function() { cur = (cur - 1 + tracks.length) % tracks.length; loadTrack(); if (isPlaying) playSound(); };

  // Voice Command & OS Action Bridge
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    const msg = e.data;
    const action = msg.action || (msg.type === 'os:action' ? msg.action : null);
    const params = msg.params || {};

    if (action === 'PLAY_SONG') {
      const q = (params.title || params.song || '').toLowerCase().trim();
      let foundIdx = -1;
      if (q) {
        foundIdx = tracks.findIndex(t => t.title.toLowerCase().includes(q) || q.includes(t.title.toLowerCase()));
      }
      if (foundIdx >= 0) {
        cur = foundIdx;
      }
      loadTrack();
      isPlaying = true;
      document.getElementById('playBtn').textContent = '⏸';
      playSound();
    } else if (action === 'PAUSE_MUSIC' || action === 'PAUSE') {
      if (isPlaying) {
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶';
        stopSound();
      }
    } else if (action === 'RESUME_MUSIC' || action === 'PLAY_MUSIC' || action === 'RESUME') {
      if (!isPlaying) {
        isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸';
        playSound();
      }
    } else if (action === 'NEXT_SONG' || action === 'NEXT') {
      nextTrack();
    } else if (action === 'PREV_SONG' || action === 'PREV') {
      prevTrack();
    }
  });

  loadTrack();
</script>
</body>
</html>`;
    }

    if (title.includes('manager') || title.includes('process') || title.includes('system')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f111a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; padding: 12px; overflow: hidden; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2438; padding-bottom: 8px; margin-bottom: 10px; }
  .title { font-size: 13px; font-weight: 600; color: #38bdf8; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .stat-card { background: #141724; border: 1px solid #23283e; border-radius: 6px; padding: 8px; text-align: center; }
  .stat-val { font-size: 15px; font-weight: 700; color: #38bdf8; font-family: monospace; }
  .stat-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 2px; }
  .table-wrap { flex: 1; background: #141724; border: 1px solid #23283e; border-radius: 6px; overflow-y: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
  th { background: #181d2e; padding: 8px 10px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #23283e; position: sticky; top: 0; }
  td { padding: 8px 10px; border-bottom: 1px solid #1a1f33; color: #e2e8f0; }
  tr:hover { background: #1a1e30; }
  .badge { background: #065f46; color: #6ee7b7; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
  .btn-kill { background: #ef4444; color: #fff; border: none; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; }
  .btn-kill:hover { background: #dc2626; }
</style>
</head>
<body>
<div class="header">
  <span class="title">⚡ VOICE OS TASK MANAGER</span>
  <span style="font-size:11px; color:#94a3b8;" id="procCount">5 Processes Active</span>
</div>
<div class="stats-grid">
  <div class="stat-card"><div class="stat-val" id="cpuVal">14%</div><div class="stat-lbl">CPU Load</div></div>
  <div class="stat-card"><div class="stat-val">1.2 GB</div><div class="stat-lbl">RAM Usage</div></div>
  <div class="stat-card"><div class="stat-val">Online</div><div class="stat-lbl">Kernel</div></div>
</div>
<div class="table-wrap">
  <table>
    <thead><tr><th>App / Process</th><th>Status</th><th>Memory</th><th>Action</th></tr></thead>
    <tbody id="rows">
      <tr><td>📝 Notepad</td><td><span class="badge">Active</span></td><td>18 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
      <tr><td>🕒 Analogue Clock</td><td><span class="badge">Running</span></td><td>12 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
      <tr><td>🐍 Snake Game</td><td><span class="badge">Running</span></td><td>24 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
      <tr><td>🎵 Music Player</td><td><span class="badge">Running</span></td><td>31 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
      <tr><td>⚡ Task Manager</td><td><span class="badge">Active</span></td><td>15 MB</td><td><button class="btn-kill" onclick="kill(this)">Close</button></td></tr>
    </tbody>
  </table>
</div>
<script>
  window.kill = function(btn) {
    const row = btn.closest('tr');
    row.remove();
    const count = document.querySelectorAll('#rows tr').length;
    document.getElementById('procCount').textContent = count + ' Processes Active';
  };
  setInterval(() => {
    document.getElementById('cpuVal').textContent = (Math.floor(Math.random() * 18) + 8) + '%';
  }, 2000);
</script>
</body>
</html>`;
    }

    if (title.includes('weather')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0b0f19;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 14px;
    overflow-y: auto;
    overflow-x: hidden;
    user-select: none;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .title {
    font-size: 13px;
    font-weight: 700;
    color: #38bdf8;
    letter-spacing: 0.5px;
  }
  .country-badge {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #fbbf24;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .location-text {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
  }
  .city-bar {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .city-pill {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 20px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }
  .city-pill:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .city-pill.active {
    background: rgba(56, 189, 248, 0.18);
    border-color: #38bdf8;
    color: #38bdf8;
    font-weight: 600;
  }
  .hero {
    text-align: center;
    margin-bottom: 14px;
    padding: 12px;
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
  }
  .icon-wrap {
    font-size: 44px;
    line-height: 1;
    margin-bottom: 4px;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
  }
  .temp-wrap {
    display: flex;
    justify-content: center;
    align-items: baseline;
    gap: 4px;
  }
  .temp {
    font-size: 46px;
    font-weight: 800;
    color: #38bdf8;
    font-family: monospace;
    letter-spacing: -1px;
  }
  .unit {
    font-size: 20px;
    color: #64748b;
    font-weight: 600;
  }
  .cond {
    font-size: 13px;
    font-weight: 500;
    color: #e2e8f0;
    margin-top: 4px;
  }
  .range {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
  .details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .card {
    background: #111726;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
    transition: transform 0.15s ease;
  }
  .card:hover {
    transform: translateY(-1px);
    border-color: rgba(56, 189, 248, 0.3);
  }
  .val {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
  }
  .lbl {
    font-size: 10px;
    color: #64748b;
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 6px;
    font-size: 10px;
    color: #64748b;
  }
  .refresh-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #94a3b8;
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
  }
  .refresh-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
</style>
</head>
<body>
<div class="header">
  <div class="title-group">
    <span class="title">🌤️ WEATHER DASHBOARD</span>
    <span class="country-badge">🇮🇳 India</span>
  </div>
  <span class="location-text" id="locText">📍 Raipur, Chhattisgarh</span>
</div>

<div class="city-bar">
  <button class="city-pill active" data-city="Raipur" data-lat="21.2514" data-lon="81.6296" data-state="Chhattisgarh">📍 Raipur (Default)</button>
  <button class="city-pill" data-city="New Delhi" data-lat="28.6139" data-lon="77.2090" data-state="Delhi">New Delhi</button>
  <button class="city-pill" data-city="Mumbai" data-lat="19.0760" data-lon="72.8777" data-state="Maharashtra">Mumbai</button>
  <button class="city-pill" data-city="Bengaluru" data-lat="12.9716" data-lon="77.5946" data-state="Karnataka">Bengaluru</button>
  <button class="city-pill" data-city="Kolkata" data-lat="22.5726" data-lon="88.3639" data-state="West Bengal">Kolkata</button>
</div>

<div class="hero">
  <div class="icon-wrap" id="weatherIcon">☀️</div>
  <div class="temp-wrap">
    <span class="temp" id="tempVal">26</span>
    <span class="unit">°C</span>
  </div>
  <div class="cond" id="condText">Clear Sky • Pleasant Breeze</div>
  <div class="range" id="rangeText">High: 31°C • Low: 21°C</div>
</div>

<div class="details">
  <div class="card"><div class="val" id="humVal">58%</div><div class="lbl">Humidity</div></div>
  <div class="card"><div class="val" id="windVal">7 km/h</div><div class="lbl">Wind NW</div></div>
  <div class="card"><div class="val" id="pressVal">1012 hPa</div><div class="lbl">Pressure</div></div>
  <div class="card"><div class="val" id="aqiVal">Good (AQI 45)</div><div class="lbl">Air Quality</div></div>
</div>

<div class="footer-bar">
  <span id="updateTime">Live Indian Meteorological Data</span>
  <button class="refresh-btn" id="refreshBtn">🔄 Refresh</button>
</div>

<script>
  let currentLat = 21.2514;
  let currentLon = 81.6296;
  let currentCity = 'Raipur';
  let currentState = 'Chhattisgarh';

  function weatherCodeToDesc(code) {
    if (code === 0) return { desc: 'Clear Sky • Sunny', icon: '☀️' };
    if (code === 1 || code === 2) return { desc: 'Mainly Clear • Pleasant', icon: '🌤️' };
    if (code === 3) return { desc: 'Overcast • Breezy', icon: '☁️' };
    if ([45, 48].includes(code)) return { desc: 'Morning Mist / Fog', icon: '🌫️' };
    if ([51, 53, 55, 61, 63, 65].includes(code)) return { desc: 'Light Rain / Drizzle', icon: '🌧️' };
    if ([80, 81, 82].includes(code)) return { desc: 'Passing Showers', icon: '🌦️' };
    if ([95, 96, 99].includes(code)) return { desc: 'Thunderstorm', icon: '⛈️' };
    return { desc: 'Pleasant & Mild', icon: '⛅' };
  }

  async function fetchLiveWeather(lat, lon, cityName, stateName) {
    try {
      const url = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current_weather=true&hourly=relativehumidity_2m,surface_pressure\`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      if (data && data.current_weather) {
        const cur = data.current_weather;
        const temp = Math.round(cur.temperature);
        const wInfo = weatherCodeToDesc(cur.weathercode);
        document.getElementById('tempVal').textContent = temp;
        document.getElementById('weatherIcon').textContent = wInfo.icon;
        document.getElementById('condText').textContent = wInfo.desc;
        document.getElementById('windVal').textContent = Math.round(cur.windspeed) + ' km/h';
        if (data.hourly && data.hourly.relativehumidity_2m && data.hourly.relativehumidity_2m.length > 0) {
          document.getElementById('humVal').textContent = data.hourly.relativehumidity_2m[0] + '%';
        }
        if (data.hourly && data.hourly.surface_pressure && data.hourly.surface_pressure.length > 0) {
          document.getElementById('pressVal').textContent = Math.round(data.hourly.surface_pressure[0]) + ' hPa';
        }
        document.getElementById('rangeText').textContent = \`High: \${temp + 4}°C • Low: \${temp - 4}°C\`;
        document.getElementById('locText').textContent = \`📍 \${cityName}, \${stateName}\`;
        document.getElementById('updateTime').textContent = \`Updated: \${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\`;
      }
    } catch (e) {
      console.warn('Weather fetch fallback:', e);
      document.getElementById('locText').textContent = \`📍 \${cityName}, \${stateName}\`;
      document.getElementById('updateTime').textContent = 'Default Indian Station Data';
    }
  }

  // Load Raipur Weather on startup
  fetchLiveWeather(currentLat, currentLon, currentCity, currentState);

  // City selector buttons
  document.querySelectorAll('.city-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.city-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLat = parseFloat(btn.dataset.lat);
      currentLon = parseFloat(btn.dataset.lon);
      currentCity = btn.dataset.city;
      currentState = btn.dataset.state;
      fetchLiveWeather(currentLat, currentLon, currentCity, currentState);
    });
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    fetchLiveWeather(currentLat, currentLon, currentCity, currentState);
  });
</script>
</body>
</html>`;
    }

    if (title.includes('wallpaper') || title.includes('studio') || title.includes('theme') || title.includes('background')) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0b0f19;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 14px 16px;
    user-select: none;
  }
  body::-webkit-scrollbar { width: 6px; }
  body::-webkit-scrollbar-track { background: #0b0f19; }
  body::-webkit-scrollbar-thumb { background: #222d42; border-radius: 4px; }
  body::-webkit-scrollbar-thumb:hover { background: #334155; }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 14px;
  }
  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .title-icon { font-size: 20px; }
  .title-text {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #38bdf8;
  }
  .header-actions {
    display: flex;
    gap: 8px;
  }
  .btn-reset {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-reset:hover {
    background: rgba(239, 68, 68, 0.22);
    color: #fca5a5;
  }

  .nav-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
    background: rgba(255, 255, 255, 0.03);
    padding: 4px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    padding: 7px 4px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: center;
  }
  .tab-btn.active {
    background: #0284c7;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
  }

  .tab-pane {
    display: none;
    flex-direction: column;
    gap: 12px;
  }
  .tab-pane.active {
    display: flex;
  }

  /* Preset Grids */
  .preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .preset-card {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    height: 78px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    display: flex;
    align-items: flex-end;
    padding: 8px;
  }
  .preset-card:hover {
    transform: translateY(-2px);
    border-color: #38bdf8;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  }
  .preset-card.selected {
    border-color: #10b981;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
  }
  .preset-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%);
    pointer-events: none;
  }
  .preset-label {
    position: relative;
    z-index: 1;
    font-size: 11px;
    font-weight: 700;
    color: #f8fafc;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Upload Dropzone */
  .dropzone {
    border: 2px dashed rgba(56, 189, 248, 0.4);
    border-radius: 10px;
    padding: 28px 16px;
    text-align: center;
    background: rgba(15, 23, 42, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .dropzone:hover, .dropzone.dragover {
    border-color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
  }
  .dropzone-icon { font-size: 32px; }
  .dropzone-title { font-size: 13px; font-weight: 600; color: #f1f5f9; }
  .dropzone-sub { font-size: 11px; color: #94a3b8; }
  .file-preview {
    margin-top: 8px;
    max-height: 140px;
    width: 100%;
    border-radius: 6px;
    object-fit: cover;
    display: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* URL & Color forms */
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .form-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
  }
  .input-row {
    display: flex;
    gap: 8px;
  }
  input[type="text"], input[type="url"] {
    flex: 1;
    background: #131927;
    border: 1px solid #29354d;
    color: #f1f5f9;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 12px;
    outline: none;
    transition: border-color 0.15s ease;
  }
  input[type="text"]:focus, input[type="url"]:focus {
    border-color: #38bdf8;
  }
  .btn-primary {
    background: #0284c7;
    border: none;
    color: #fff;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
  }
  .btn-primary:hover { background: #0369a1; }

  .quick-urls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }
  .quick-url-pill {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    font-size: 10px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .quick-url-pill:hover {
    background: rgba(56, 189, 248, 0.15);
    border-color: #38bdf8;
    color: #38bdf8;
  }

  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  input[type="color"] {
    -webkit-appearance: none;
    border: 1px solid #334155;
    width: 44px;
    height: 36px;
    border-radius: 6px;
    cursor: pointer;
    background: transparent;
  }
  input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
  input[type="color"]::-webkit-color-swatch { border-radius: 4px; border: none; }

  /* Notification banner */
  .toast-bar {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%) translateY(50px);
    background: #10b981;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 99px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    opacity: 0;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
    z-index: 100;
  }
  .toast-bar.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <span class="title-icon">🖼️</span>
      <span class="title-text">WALLPAPER STUDIO</span>
    </div>
    <div class="header-actions">
      <button class="btn-reset" id="resetBtn" title="Reset to default background">🔄 Default</button>
    </div>
  </div>

  <div class="nav-tabs">
    <button class="tab-btn active" data-tab="tab-presets">🌌 Presets</button>
    <button class="tab-btn" data-tab="tab-upload">📁 Upload File</button>
    <button class="tab-btn" data-tab="tab-url">🌐 Image URL</button>
    <button class="tab-btn" data-tab="tab-colors">🎨 Custom Color</button>
  </div>

  <!-- 1. Presets -->
  <div class="tab-pane active" id="tab-presets">
    <div class="preset-grid" id="presetGrid"></div>
  </div>

  <!-- 2. Upload from PC -->
  <div class="tab-pane" id="tab-upload">
    <input type="file" id="fileInput" accept="image/*" style="display:none;" />
    <div class="dropzone" id="dropzone">
      <div class="dropzone-icon">🖼️</div>
      <div class="dropzone-title">Click or drag an image here</div>
      <div class="dropzone-sub">Supports PNG, JPG, WebP, GIF, SVG up to 10MB</div>
    </div>
    <img id="filePreview" class="file-preview" alt="Preview" />
    <button class="btn-primary" id="applyUploadedBtn" style="display:none;">Apply as Wallpaper</button>
  </div>

  <!-- 3. Image URL -->
  <div class="tab-pane" id="tab-url">
    <div class="form-group">
      <label class="form-label">ONLINE IMAGE ADDRESS</label>
      <div class="input-row">
        <input type="url" id="urlInput" placeholder="https://images.unsplash.com/photo-..." />
        <button class="btn-primary" id="applyUrlBtn">Apply</button>
      </div>
    </div>
    <div class="form-group" style="margin-top: 8px;">
      <label class="form-label">POPULAR CURATED WALLPAPERS</label>
      <div class="quick-urls">
        <button class="quick-url-pill" data-url="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80">🌴 Tropical Coast</button>
        <button class="quick-url-pill" data-url="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80">🌌 Deep Universe</button>
        <button class="quick-url-pill" data-url="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80">🏔️ Snowy Peaks</button>
        <button class="quick-url-pill" data-url="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80">🎮 Cyber Grid</button>
      </div>
    </div>
  </div>

  <!-- 4. Custom Color / Gradient -->
  <div class="tab-pane" id="tab-colors">
    <div class="form-group">
      <label class="form-label">DUAL COLOR GRADIENT</label>
      <div class="color-picker-row">
        <div>
          <span style="font-size:10px; color:#94a3b8; display:block; margin-bottom:2px;">Color 1</span>
          <input type="color" id="color1" value="#0f172a" />
        </div>
        <div>
          <span style="font-size:10px; color:#94a3b8; display:block; margin-bottom:2px;">Color 2</span>
          <input type="color" id="color2" value="#1e1b4b" />
        </div>
        <div style="flex:1;">
          <span style="font-size:10px; color:#94a3b8; display:block; margin-bottom:2px;">Direction</span>
          <select id="gradAngle" style="width:100%; background:#131927; border:1px solid #29354d; color:#fff; padding:7px; border-radius:6px; font-size:11px;">
            <option value="135deg">Diagonal (135°)</option>
            <option value="to bottom">Vertical (To Bottom)</option>
            <option value="to right">Horizontal (To Right)</option>
            <option value="radial">Radial Circle</option>
          </select>
        </div>
      </div>
      <button class="btn-primary" id="applyCustomGradBtn" style="margin-top:10px;">Apply Custom Gradient</button>
    </div>
  </div>

  <div class="toast-bar" id="toastBar">Wallpaper applied!</div>

<script>
  const presets = [
    { name: '🌌 Deep Nebula', css: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)' },
    { name: '🌇 Cyberpunk Sunset', css: 'linear-gradient(135deg, #0d0221 0%, #19053b 45%, #6b1178 75%, #ff007f 100%)' },
    { name: '🌊 Ocean Biolume', css: 'linear-gradient(135deg, #09203f 0%, #1e3c72 50%, #2a5298 100%)' },
    { name: '🌲 Nordic Aurora', css: 'linear-gradient(135deg, #021508 0%, #064e3b 50%, #059669 80%, #10b981 100%)' },
    { name: '🌑 Midnight Obsidian', css: 'radial-gradient(ellipse at top, #141724 0%, #0a0a0c 60%, #050608 100%)' },
    { name: '⚡ Electric Mesh', css: 'radial-gradient(at 0% 0%, #1e1b4b 0px, transparent 50%), radial-gradient(at 100% 100%, #312e81 0px, transparent 50%), #0f172a' },
    { name: '🔮 Tokyo Neon', css: 'linear-gradient(135deg, #05051a 0%, #260940 40%, #7928ca 80%, #ff0080 100%)' },
    { name: '🔥 Crimson Sunset', css: 'linear-gradient(135deg, #1f0d10 0%, #4a0404 40%, #991b1b 75%, #ea580c 100%)' }
  ];

  const toastBar = document.getElementById('toastBar');
  function showAppliedToast(msg) {
    toastBar.textContent = msg || 'Wallpaper applied!';
    toastBar.classList.add('show');
    setTimeout(() => {
      toastBar.classList.remove('show');
    }, 2200);
  }

  function setWallpaper(css, toastMsg) {
    window.parent.postMessage({ type: 'os:set-wallpaper', background: css }, '*');
    showAppliedToast(toastMsg || 'Wallpaper applied!');
  }

  // Populate Presets
  const presetGrid = document.getElementById('presetGrid');
  presets.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'preset-card';
    card.style.background = p.css;
    card.innerHTML = '<div class="preset-overlay"></div><div class="preset-label">' + p.name + '</div>';
    card.addEventListener('click', () => {
      document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      setWallpaper(p.css, 'Applied ' + p.name);
    });
    presetGrid.appendChild(card);
  });

  // Nav Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Reset Button
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
    setWallpaper('', 'Reset to default wallpaper');
  });

  // Local File Upload
  const fileInput = document.getElementById('fileInput');
  const dropzone = document.getElementById('dropzone');
  const filePreview = document.getElementById('filePreview');
  const applyUploadedBtn = document.getElementById('applyUploadedBtn');
  let currentUploadedDataUrl = null;

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      processFile(fileInput.files[0]);
    }
  });

  function processFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      currentUploadedDataUrl = e.target.result;
      filePreview.src = currentUploadedDataUrl;
      filePreview.style.display = 'block';
      applyUploadedBtn.style.display = 'block';
      const css = "url('" + currentUploadedDataUrl + "') center/cover no-repeat fixed";
      setWallpaper(css, 'Local image wallpaper applied!');
    };
    reader.readAsDataURL(file);
  }

  applyUploadedBtn.addEventListener('click', () => {
    if (currentUploadedDataUrl) {
      const css = "url('" + currentUploadedDataUrl + "') center/cover no-repeat fixed";
      setWallpaper(css, 'Local image wallpaper applied!');
    }
  });

  // URL Input
  const urlInput = document.getElementById('urlInput');
  const applyUrlBtn = document.getElementById('applyUrlBtn');
  function applyUrlWallpaper(rawUrl) {
    const url = (rawUrl || '').trim();
    if (!url) return;
    const css = "url('" + url + "') center/cover no-repeat fixed";
    setWallpaper(css, 'Online image wallpaper applied!');
  }
  applyUrlBtn.addEventListener('click', () => applyUrlWallpaper(urlInput.value));
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyUrlWallpaper(urlInput.value);
  });

  document.querySelectorAll('.quick-url-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const u = pill.dataset.url;
      urlInput.value = u;
      applyUrlWallpaper(u);
    });
  });

  // Custom Colors & Gradient
  document.getElementById('applyCustomGradBtn').addEventListener('click', () => {
    const c1 = document.getElementById('color1').value;
    const c2 = document.getElementById('color2').value;
    const angle = document.getElementById('gradAngle').value;
    let css = '';
    if (angle === 'radial') {
      css = 'radial-gradient(circle at center, ' + c1 + ' 0%, ' + c2 + ' 100%)';
    } else {
      css = 'linear-gradient(' + angle + ', ' + c1 + ' 0%, ' + c2 + ' 100%)';
    }
    setWallpaper(css, 'Custom gradient applied!');
  });
</script>
</body>
</html>`;
    }

    const appDisplayName = rawTitle || 'Interactive App';
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #12131a; color: #f0f0f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; padding: 16px; overflow: hidden; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #282b3d; padding-bottom: 10px; margin-bottom: 14px; }
  .title { font-size: 15px; font-weight: 600; color: #82b1ff; }
  .badge { background: #222638; color: #9fa8da; font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid #333852; }
  .card { flex: 1; background: #181a26; border: 1px solid #292d42; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .info { font-size: 13px; color: #a1a6bd; line-height: 1.5; }
  .input-group { display: flex; gap: 8px; margin-top: auto; }
  input { flex: 1; background: #202333; border: 1px solid #303550; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
  input:focus { border-color: #5c6ac4; }
  button { background: #3949ab; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; }
  button:hover { background: #303f9f; }
  .output { background: #13141f; border: 1px solid #23263b; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; color: #76d275; min-height: 48px; }
</style>
</head>
<body>
<div class="header">
  <span class="title">${appDisplayName}</span>
  <span class="badge">Voice OS Powered</span>
</div>
<div class="card">
  <div class="info">Ready to execute interactive commands. Type an input below to interact with ${appDisplayName}.</div>
  <div class="output" id="output">System initialized. Awaiting user input...</div>
  <div class="input-group">
    <input type="text" id="inputBox" placeholder="Type here..." />
    <button id="sendBtn">Execute</button>
  </div>
</div>
<script>
  const box = document.getElementById('inputBox');
  const out = document.getElementById('output');
  document.getElementById('sendBtn').addEventListener('click', () => {
    if (box.value.trim()) {
      out.textContent = 'Received: ' + box.value.trim() + ' (' + new Date().toLocaleTimeString() + ')';
      box.value = '';
    }
  });
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('sendBtn').click(); });
</script>
</body>
</html>`;
  }

  // ========================================================
  // 6. Send Command to /api/command (SSE Stream) and Handle Kernel Actions
  // ========================================================
  async function executeKernelCommand(rawCommandText) {
    if (!rawCommandText || rawCommandText.trim() === '') return;

    // Dismiss first-run hint on first command
    dismissFirstRunHint();
    cancelHandsFreeCountdown();

    const commandText = rawCommandText.trim();

    // Log every submitted command with an ISO timestamp to local storage
    logCommandToStorage(commandText);

    // Check if command is a voice self-correction (starts with no, actually, or I meant)
    const isCorrection = CORRECTION_REGEX.test(commandText);

    // If NOT a self-correction, check local commands before calling the API
    if (!isCorrection) {
      const handledLocally = tryHandleLocalCommand(commandText);
      if (handledLocally) {
        previousCommandText = commandText;
        if (promptInput) promptInput.value = '';
        return;
      }
    }

    // Call API (either self-correction or Gemini command)
    addLog('USER', isCorrection && previousCommandText ? `[Correction] ${commandText}` : commandText, 'user-entry');
    if (liveTranscript) liveTranscript.textContent = `"${commandText}"`;

    // Show thinking/streaming animation in the taskbar while request is loading
    setTaskbarThinking(true);
    assistantStateTitle.textContent = 'Kernel Streaming...';
    assistantSubtext.textContent = isCorrection ? 'Streaming voice correction from Gemini' : 'Streaming response from Gemini AI';

    // Check if this command indicates opening an app so we can open the window right away
    const isWallpaperCmd = /^(set\s+wallpaper|change\s+wallpaper|wallpaper)\b/i.test(commandText);
    const isCloseCmd = /^close\b/i.test(commandText);
    const isEditCmd = /^(edit|update|modify|change|make\s+the|resize)\b/i.test(commandText);
    const isPotentialOpenApp = !isWallpaperCmd && !isCloseCmd && !isEditCmd;

    let pendingWinId = null;
    let pendingWin = null;
    let fallbackTimer = null;
    const tentativeTitle = inferTitleFromCommand(commandText);

    // Open the window right away with ready app template (0ms latency, fully interactive immediately)
    if (isPotentialOpenApp) {
      pendingWinId = `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const dims = getAppDimensions(tentativeTitle);
      const readyHtml = getAppTemplate(tentativeTitle);
      pendingWin = createWindow(pendingWinId, tentativeTitle, dims.height, readyHtml);
      if (pendingWin && dims.width) {
        pendingWin.style.width = `${dims.width}px`;
      }
    }

    try {
      const openWindows = getOpenWindows();
      const payload = {
        text: commandText,
        openWindows: openWindows
      };

      // Send along the previous command if self-correcting
      if (isCorrection && previousCommandText) {
        payload.previousCommand = previousCommandText;
      }

      const response = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Server returned ${response.status}`);
      }

      // Read Server-Sent Events (SSE) stream from response body
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let accumulatedJson = '';
      let streamResult = null;
      let streamError = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const blocks = sseBuffer.split('\n\n');
        sseBuffer = blocks.pop(); // keep last incomplete block

        for (const block of blocks) {
          const trimmed = block.trim();
          if (!trimmed) continue;

          for (const line of trimmed.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const evt = JSON.parse(line.slice(6));
                if (evt.chunk) {
                  accumulatedJson += evt.chunk;
                  // If no window was opened yet, but action is "open app", open right away
                  if (!pendingWin && accumulatedJson.includes('"action": "open app"')) {
                    pendingWinId = `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    const dims = getAppDimensions(tentativeTitle);
                    pendingWin = createWindow(pendingWinId, tentativeTitle, dims.height, getAppTemplate(tentativeTitle));
                    if (pendingWin && dims.width) pendingWin.style.width = `${dims.width}px`;
                  }
                }
                if (evt.done && evt.result) {
                  streamResult = evt.result;
                }
                if (evt.error) {
                  streamError = evt.error;
                }
              } catch (parseErr) {
                console.warn('Failed to parse SSE JSON:', line, parseErr);
              }
            }
          }
        }
      }

      // Handle any trailing buffer
      if (sseBuffer.trim()) {
        for (const line of sseBuffer.trim().split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.chunk) accumulatedJson += evt.chunk;
              if (evt.done && evt.result) streamResult = evt.result;
              if (evt.error) streamError = evt.error;
            } catch (e) {}
          }
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }

      // If streamResult was not provided via done event, parse accumulatedJson
      if (!streamResult && accumulatedJson) {
        try {
          streamResult = JSON.parse(accumulatedJson);
        } catch (e) {
          const cleaned = accumulatedJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          streamResult = JSON.parse(cleaned);
        }
      }

      if (!streamResult) {
        throw new Error('No valid response received from Gemini stream.');
      }

      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }

      const data = streamResult;
      const action = (data.action || '').toLowerCase().trim();

      // ACTION 1: OPEN APP
      if (action.includes('open')) {
        const finalTitle = data.title || tentativeTitle || 'Application';
        const finalHeight = data.height || 380;
        const finalWidth = data.width;
        const finalHtml = (data.html && data.html.trim().length > 0) ? data.html : getAppTemplate(finalTitle);

        // If window was opened right away with loading state, update its iframe as HTML finishes arriving
        if (pendingWin && !pendingWin.classList.contains('is-closing') && document.body.contains(pendingWin)) {
          const titleEl = pendingWin.querySelector('.window-title-text');
          if (titleEl) titleEl.textContent = finalTitle;
          pendingWin.dataset.title = finalTitle;

          const tbItem = document.getElementById(`taskbar-win-${pendingWinId}`);
          if (tbItem) {
            const tbTitle = tbItem.querySelector('.win-taskbar-title');
            if (tbTitle) tbTitle.textContent = finalTitle;
          }

          if (finalWidth) pendingWin.style.width = typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth;
          if (finalHeight) pendingWin.style.height = typeof finalHeight === 'number' ? `${finalHeight}px` : finalHeight;

          // Update iframe if custom HTML arrived
          const iframe = pendingWin.querySelector('.window-iframe');
          if (iframe && finalHtml) {
            const isBuiltin = /snake|music|notepad|manager|analogue|clock|calc|weather|tasks|todo/i.test(finalTitle);
            const isCurrentlyLoading = !iframe.srcdoc || iframe.srcdoc.includes('loader-box') || iframe.srcdoc.includes('window-loading-wrap');
            if (isCurrentlyLoading || !isBuiltin || (data.html && data.html !== getAppTemplate(finalTitle))) {
              iframe.srcdoc = finalHtml;
            }
          }

          pushAction({
            type: 'open',
            winId: pendingWinId,
            title: finalTitle,
            height: finalHeight,
            width: finalWidth,
            html: finalHtml
          });

          bringToFront(pendingWin);
          addLog('VOICE OS', `Launched "${finalTitle}" [${pendingWinId}]`, 'gemini-entry');
          speak(`Opened ${finalTitle}`);
        } else {
          // If no pending window existed, create window now
          const uniqueId = `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const newWin = createWindow(uniqueId, finalTitle, finalHeight, finalHtml);
          if (newWin && finalWidth) {
            newWin.style.width = typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth;
          }

          pushAction({
            type: 'open',
            winId: uniqueId,
            title: finalTitle,
            height: finalHeight,
            width: finalWidth,
            html: finalHtml
          });

          addLog('VOICE OS', `Launched "${finalTitle}" [${uniqueId}]`, 'gemini-entry');
          speak(`Opened ${finalTitle}`);
        }
      }
      // ACTION 2: EDIT APP
      else if (action.includes('edit')) {
        // If placeholder window was opened, close it
        if (pendingWin && !pendingWin.classList.contains('is-closing')) {
          closeWindow(pendingWin);
        }

        const targetId = data.target || data.target_window_id || data.targetWindowId || data.id;
        let targetWin = null;

        if (targetId) {
          targetWin = document.getElementById(targetId) ||
                      document.getElementById(`win-${targetId}`) ||
                      document.querySelector(`[data-win-id="${targetId}"]`);
        }

        if (!targetWin) {
          const openWins = Array.from(document.querySelectorAll('.os-window-floating:not(.is-closing)'));
          targetWin = openWins[openWins.length - 1];
        }

        if (targetWin) {
          const iframe = targetWin.querySelector('.window-iframe');
          const oldHtml = iframe ? iframe.srcdoc : '';

          // Update iframe as the HTML finishes arriving
          if (iframe && data.html) {
            iframe.srcdoc = data.html;
          }

          const currentTitle = targetWin.querySelector('.window-title-text')?.textContent || targetWin.dataset.title || 'App';

          pushAction({
            type: 'edit',
            winId: targetWin.dataset.winId,
            title: currentTitle,
            prevHtml: oldHtml,
            newHtml: data.html
          });

          if (data.title) {
            const titleEl = targetWin.querySelector('.window-title-text');
            if (titleEl) titleEl.textContent = data.title;
            const tbItem = document.getElementById(`taskbar-win-${targetWin.dataset.winId}`);
            if (tbItem) {
              const tbTitle = tbItem.querySelector('.win-taskbar-title');
              if (tbTitle) tbTitle.textContent = data.title;
            }
          }

          if (data.width) targetWin.style.width = typeof data.width === 'number' ? `${data.width}px` : data.width;
          if (data.height) targetWin.style.height = typeof data.height === 'number' ? `${data.height}px` : data.height;

          // Restore and bring to front
          if (targetWin.classList.contains('is-minimized')) {
            restoreWindow(targetWin);
          } else {
            bringToFront(targetWin);
          }

          addLog('VOICE OS', `Updated app [${targetWin.dataset.winId}]`, 'gemini-entry');
          speak('App updated.');
        } else {
          showToast(`Target window "${targetId || 'active'}" not found for edit.`, 'warning', 'Edit Failed');
        }
      }
      // ACTION 3: CLOSE APP
      else if (action.includes('close')) {
        if (pendingWin && !pendingWin.classList.contains('is-closing')) {
          closeWindow(pendingWin);
        }

        const targetId = data.target || data.target_window_id || data.targetWindowId || data.id;
        let targetWin = null;

        if (targetId) {
          targetWin = document.getElementById(targetId) ||
                      document.getElementById(`win-${targetId}`) ||
                      document.querySelector(`[data-win-id="${targetId}"]`);
        }

        if (!targetWin) {
          const openWins = Array.from(document.querySelectorAll('.os-window-floating:not(.is-closing)'));
          targetWin = openWins[openWins.length - 1];
        }

        if (targetWin) {
          const winTitle = targetWin.querySelector('.window-title-text')?.textContent || targetWin.dataset.winId;
          const oldHtml = targetWin.querySelector('.window-iframe')?.srcdoc || '';

          pushAction({
            type: 'close',
            winId: targetWin.dataset.winId,
            title: winTitle,
            height: targetWin.style.height,
            width: targetWin.style.width,
            html: oldHtml
          });

          closeWindow(targetWin);
          addLog('VOICE OS', `Closed window: ${winTitle}`, 'gemini-entry');
          speak(`Closed ${winTitle}`);
        } else {
          showToast(`Target window "${targetId || 'active'}" not found to close.`, 'warning', 'Close Failed');
        }
      }
      // ACTION 4: SET WALLPAPER
      else if (action.includes('wallpaper')) {
        if (pendingWin && !pendingWin.classList.contains('is-closing')) {
          closeWindow(pendingWin);
        }

        const backgroundCss = data.css || data.background || data.value;
        if (backgroundCss) {
          const oldBg = document.body.style.background || '';
          pushAction({
            type: 'wallpaper',
            prevBackground: oldBg,
            newBackground: backgroundCss
          });

          document.body.style.background = backgroundCss;
          const desktop = document.querySelector('.os-desktop');
          if (desktop) desktop.style.background = 'transparent';

          addLog('VOICE OS', `Desktop wallpaper updated.`, 'gemini-entry');
          speak('Wallpaper updated.');
        }
      }
      // OTHER / FALLBACK
      else if (data.reply || data.message) {
        if (pendingWin && !pendingWin.classList.contains('is-closing')) {
          closeWindow(pendingWin);
        }
        const reply = data.reply || data.message;
        addLog('VOICE OS', reply, 'gemini-entry');
        speak(reply);
      } else {
        if (pendingWin && !pendingWin.classList.contains('is-closing')) {
          closeWindow(pendingWin);
        }
        addLog('VOICE OS', JSON.stringify(data), 'gemini-entry');
      }

      // Record this command as the previous command
      previousCommandText = commandText;
    } catch (err) {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      console.error('Kernel command failed:', err);
      if (pendingWin && !pendingWin.classList.contains('is-closing') && document.body.contains(pendingWin)) {
        const iframe = pendingWin.querySelector('.window-iframe');
        if (iframe) {
          iframe.srcdoc = getAppTemplate(tentativeTitle);
        }
        addLog('VOICE OS', `Loaded default template for "${tentativeTitle}"`, 'gemini-entry');
        speak(`Opened ${tentativeTitle}`);
      } else {
        addLog('ERROR', `Kernel failed: ${err.message}`, 'system-entry');
        showToast('Could not process command with Gemini. Please try again.', 'error', 'Command Error');
        speak('Sorry, I encountered an error executing that command.');
      }
    } finally {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      setTaskbarThinking(false);
      assistantStateTitle.textContent = 'Click Microphone to Speak';
      assistantSubtext.textContent = 'Voice OS is ready for instructions or questions';

      if (promptInput) {
        promptInput.value = '';
      }
    }
  }

  // ========================================================
  // 6. Focus Management
  // ========================================================
  function focusCommandBar() {
    if (promptInput && document.activeElement !== promptInput) {
      promptInput.focus();
    }
  }

  // Initial focus on startup
  setTimeout(focusCommandBar, 100);

  // Re-focus whenever browser window gains focus
  window.addEventListener('focus', () => {
    focusCommandBar();
  });

  // Re-focus whenever desktop is clicked (outside windows and control buttons)
  document.addEventListener('pointerdown', (e) => {
    if (
      !e.target.closest('.os-window-floating') &&
      !e.target.closest('.win-action-btn') &&
      !e.target.closest('.taskbar-win-item') &&
      !e.target.closest('.topbar-btn') &&
      !e.target.closest('.app-icon') &&
      !e.target.closest('.hands-free-btn') &&
      !e.target.closest('button') &&
      !e.target.closest('a')
    ) {
      focusCommandBar();
    }
  });

  // Backtick hotkey focuses the command bar
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.code === 'Backquote') {
      if (document.activeElement !== promptInput) {
        e.preventDefault();
        focusCommandBar();
        promptInput.select();
      }
    }

    // Escape cancels countdown and clears the bar
    if (e.key === 'Escape') {
      cancelHandsFreeCountdown();
      if (promptInput) {
        promptInput.value = '';
      }
    }
  });

  // Listen for postMessage events of type 'os:focus-bar' and 'os:dictate-*' from iframes
  let appDictationRecognition = null;
  let isAppDictating = false;

  window.addEventListener('message', (event) => {
    if (
      event.data === 'os:focus-bar' ||
      (event.data && event.data.type === 'os:focus-bar')
    ) {
      focusCommandBar();
    } else if (event.data && event.data.type === 'os:dictate-start') {
      startAppDictationBridge();
    } else if (event.data && event.data.type === 'os:dictate-stop') {
      stopAppDictationBridge();
    } else if (event.data && event.data.type === 'os:clipboard-copy' && event.data.text !== undefined) {
      const textToCopy = event.data.text;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
          .then(() => {
            showToast('Text copied to clipboard!', 'success', 'Notepad');
          })
          .catch(() => {
            fallbackCopy(textToCopy);
          });
      } else {
        fallbackCopy(textToCopy);
      }
    } else if (event.data && event.data.type === 'os:set-wallpaper') {
      const bg = event.data.background || '';
      applyWallpaper(bg, true);
      addLog('VOICE OS', bg ? 'Desktop wallpaper updated.' : 'Wallpaper restored to default.', 'gemini-entry');
      speak(bg ? 'Wallpaper updated.' : 'Wallpaper restored to default.');
      showToast(bg ? 'Wallpaper updated successfully!' : 'Wallpaper reset to default.', 'success', 'Wallpaper Studio');
    } else if (event.data && event.data.type === 'os:file-saved') {
      const file = event.data.file;
      if (file) {
        broadcastFilesChanged();
        addLog('VOICE OS', `Saved "${file.name}" to File Manager.`, 'gemini-entry');
        speak(`Saved ${file.name}`);
        showToast(`Saved "${file.name}" to File Manager!`, 'success', 'File Manager');
      }
    } else if (event.data && event.data.type === 'os:open-file-in-notepad') {
      const file = event.data.file;
      if (file) {
        openFileInNotepad(file);
        addLog('VOICE OS', `Opened "${file.name}" in Notepad.`, 'gemini-entry');
        speak(`Opened ${file.name}`);
        showToast(`Opened "${file.name}" in Notepad`, 'success', 'Notepad');
      }
    } else if (event.data && event.data.type === 'os:open-app' && event.data.app) {
      executeKernelCommand('open ' + event.data.app);
    } else if (event.data && (event.data.type === 'os:media-saved' || event.data.type === 'os:media-deleted')) {
      broadcastMediaChanged();
    }
  });

  function fallbackCopy(text) {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const res = document.execCommand('copy');
      document.body.removeChild(el);
      if (res) {
        showToast('Text copied to clipboard!', 'success', 'Notepad');
      }
    } catch (e) {
      console.warn('Clipboard fallback copy error:', e);
    }
  }

  function startAppDictationBridge() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (appDictationRecognition) {
      try { appDictationRecognition.stop(); } catch(e) {}
    }

    appDictationRecognition = new SpeechRec();
    appDictationRecognition.continuous = true;
    appDictationRecognition.interimResults = true;
    appDictationRecognition.lang = 'en-US';

    appDictationRecognition.onstart = () => {
      isAppDictating = true;
      showWisprFlowBadge();
      broadcastDictation({ type: 'os:dictation-state', active: true });
    };

    appDictationRecognition.onresult = (evt) => {
      let finalChunk = '';
      for (let i = evt.resultIndex; i < evt.results.length; ++i) {
        if (evt.results[i].isFinal) {
          finalChunk += evt.results[i][0].transcript;
        }
      }
      if (finalChunk.trim()) {
        showWisprFlowBadge();
        broadcastDictation({ type: 'os:dictation-text', text: finalChunk.trim() });
      }
    };

    appDictationRecognition.onerror = (err) => {
      console.warn('App dictation error:', err);
      broadcastDictation({ type: 'os:dictation-state', active: false });
    };

    appDictationRecognition.onend = () => {
      if (isAppDictating) {
        try { appDictationRecognition.start(); } catch(e) {
          isAppDictating = false;
          broadcastDictation({ type: 'os:dictation-state', active: false });
        }
      } else {
        broadcastDictation({ type: 'os:dictation-state', active: false });
      }
    };

    try {
      appDictationRecognition.start();
    } catch(e) {
      console.warn('Could not start app dictation bridge:', e);
    }
  }

  function stopAppDictationBridge() {
    isAppDictating = false;
    if (appDictationRecognition) {
      try { appDictationRecognition.stop(); } catch(e) {}
    }
    broadcastDictation({ type: 'os:dictation-state', active: false });
  }

  function broadcastDictation(msg) {
    const iframes = document.querySelectorAll('.window-iframe');
    iframes.forEach(iframe => {
      try {
        iframe.contentWindow?.postMessage(msg, '*');
      } catch(e) {}
    });
  }

  // ========================================================
  // 7. Dictation Detection: "Wispr Flow detected"
  // ========================================================
  let inputGrowthHistory = [];
  let wisprBadgeTimer = null;

  function detectDictation() {
    const now = performance.now();
    const currentLen = promptInput.value.length;

    // Filter history older than 400ms
    inputGrowthHistory = inputGrowthHistory.filter(entry => (now - entry.time) <= 400);

    // If command bar grows by > 8 characters within 400ms
    const grewMoreThanEight = inputGrowthHistory.some(entry => (currentLen - entry.len) > 8);
    inputGrowthHistory.push({ time: now, len: currentLen });

    if (grewMoreThanEight) {
      showWisprFlowBadge();
    }
  }

  function showWisprFlowBadge() {
    const badge = document.getElementById('wisprBadge');
    if (!badge) return;

    badge.style.display = 'flex';
    badge.classList.add('is-pulsing');

    clearTimeout(wisprBadgeTimer);
    wisprBadgeTimer = setTimeout(() => {
      badge.classList.remove('is-pulsing');
      badge.style.display = 'none';
    }, 3200);
  }

  // ========================================================
  // 8. Hands-Free Mode & Countdown Ring
  // ========================================================
  let handsFreeActive = false;
  let handsFreeTimer = null;
  let countdownAnimFrame = null;
  let countdownStartTime = null;
  const HANDS_FREE_DELAY = 1400; // 1.4 seconds

  const handsFreeBtn = document.getElementById('handsFreeBtn');
  const handsFreeLabel = document.getElementById('handsFreeLabel');

  function startHandsFreeCountdown() {
    cancelHandsFreeCountdown();

    const promptContainer = document.getElementById('promptContainer');
    const countdownRect = document.getElementById('countdownRect');
    const countdownPill = document.getElementById('countdownPill');
    const countdownText = document.getElementById('countdownText');

    if (!promptContainer || !countdownRect) return;

    promptContainer.classList.add('is-countdown-active');
    if (countdownPill) countdownPill.style.display = 'flex';

    countdownStartTime = performance.now();

    function renderCountdown(now) {
      const elapsed = now - countdownStartTime;
      const progress = Math.min(1, elapsed / HANDS_FREE_DELAY);
      const remainingSeconds = Math.max(0, (HANDS_FREE_DELAY - elapsed) / 1000).toFixed(1);

      // Smooth progress on SVG stroke
      countdownRect.style.strokeDashoffset = `${(1 - progress) * 100}`;
      if (countdownText) countdownText.textContent = `${remainingSeconds}s`;

      if (progress < 1) {
        countdownAnimFrame = requestAnimationFrame(renderCountdown);
      }
    }

    countdownAnimFrame = requestAnimationFrame(renderCountdown);

    handsFreeTimer = setTimeout(() => {
      cancelHandsFreeCountdown();
      const text = promptInput.value.trim();
      if (text) {
        executeKernelCommand(text);
      }
    }, HANDS_FREE_DELAY);
  }

  function cancelHandsFreeCountdown() {
    if (handsFreeTimer) {
      clearTimeout(handsFreeTimer);
      handsFreeTimer = null;
    }
    if (countdownAnimFrame) {
      cancelAnimationFrame(countdownAnimFrame);
      countdownAnimFrame = null;
    }

    const promptContainer = document.getElementById('promptContainer');
    const countdownRect = document.getElementById('countdownRect');
    const countdownPill = document.getElementById('countdownPill');

    if (promptContainer) promptContainer.classList.remove('is-countdown-active');
    if (countdownRect) countdownRect.style.strokeDashoffset = '100';
    if (countdownPill) countdownPill.style.display = 'none';
  }

  if (handsFreeBtn) {
    handsFreeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleListening();
    });
  }

  // Monitor typing for dictation detection & hands-free countdown
  promptInput.addEventListener('input', () => {
    detectDictation();

    if (handsFreeActive) {
      if (promptInput.value.trim().length > 0) {
        startHandsFreeCountdown();
      } else {
        cancelHandsFreeCountdown();
      }
    }
  });

  // 9. Command Bar Form Submission (Pressing Enter)
  promptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    cancelHandsFreeCountdown();
    const text = promptInput.value.trim();
    if (text) {
      executeKernelCommand(text);
    }
  });

  // 10. Speech Recognition Setup (Web Speech API) + Real-time Audio Level Visualizer
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  let activeMicStream = null;
  let hasUserEverInteracted = false;
  let currentVoiceLang = localStorage.getItem('os_voice_lang') || 'en-IN';
  let audioCtx = null;
  let analyserNode = null;
  let audioAnimFrame = null;
  let silenceTimer = null;
  let lastCapturedSpeech = '';
  let speechExecuted = false;

  async function requestMicHardwareAndVisualizer() {
    if (activeMicStream && activeMicStream.active) return activeMicStream;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      activeMicStream = stream;
      startMicVisualizer(stream);
      return stream;
    } catch (err) {
      console.warn('Microphone hardware stream permission notice:', err);
      return null;
    }
  }

  function startMicVisualizer(stream) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(stream);
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64;
      source.connect(analyserNode);

      const ring1 = document.querySelector('.ring-1');
      const ring2 = document.querySelector('.ring-2');
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

      function animate() {
        if (!isListening || !analyserNode) return;
        analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length; // 0 to 255
        const intensity = Math.min(1, avg / 100);
        const scale1 = 1 + intensity * 0.45;
        const scale2 = 1 + intensity * 0.85;
        const opacity = 0.35 + intensity * 0.65;
        if (ring1) ring1.style.transform = `scale(${scale1.toFixed(3)})`;
        if (ring2) {
          ring2.style.transform = `scale(${scale2.toFixed(3)})`;
          ring2.style.opacity = `${opacity.toFixed(2)}`;
        }
        audioAnimFrame = requestAnimationFrame(animate);
      }
      animate();
    } catch (e) {
      console.warn('Audio visualizer error:', e);
    }
  }

  function stopMicVisualizer() {
    if (audioAnimFrame) {
      cancelAnimationFrame(audioAnimFrame);
      audioAnimFrame = null;
    }
    const ring1 = document.querySelector('.ring-1');
    const ring2 = document.querySelector('.ring-2');
    if (ring1) ring1.style.transform = '';
    if (ring2) {
      ring2.style.transform = '';
      ring2.style.opacity = '';
    }
  }

  // Web Audio Synthesized Feedback Chimes
  function playVoiceTone(type) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch(e) {}
  }

  function extractSnakeDirection(spokenText) {
    if (!spokenText) return null;
    const words = spokenText.toLowerCase().replace(/[.,!?;:"'~`#%&*()_\-+=<>{}\[\]\\\/]+/g, ' ').trim().split(/\s+/);
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      if (w === 'up' || w === 'top' || w === 'north') return 'UP';
      if (w === 'down' || w === 'bottom' || w === 'south') return 'DOWN';
      if (w === 'left' || w === 'west') return 'LEFT';
      if (w === 'right' || w === 'east') return 'RIGHT';
    }
    return null;
  }

  function extractSnakeCommand(spokenText) {
    if (!spokenText) return null;
    const norm = spokenText.toLowerCase().trim();
    if (/^(?:start|start\s*game|play|play\s*game)$/i.test(norm)) return 'SNAKE_START';
    if (/^(?:pause|pause\s*game|stop\s*game|hold)$/i.test(norm)) return 'SNAKE_PAUSE';
    if (/^(?:resume|resume\s*game|continue)$/i.test(norm)) return 'SNAKE_RESUME';
    if (/^(?:restart|restart\s*game|play\s*again|reset)$/i.test(norm)) return 'SNAKE_RESTART';
    return null;
  }

  function commitSpokenCommand(sourceText) {
    const text = (sourceText || lastCapturedSpeech || '').trim();
    if (!text || speechExecuted) return;
    speechExecuted = true;
    lastCapturedSpeech = '';
    clearTimeout(silenceTimer);
    silenceTimer = null;

    // Do NOT stop listening! Voice Assistant stays open!
    playVoiceTone('success');
    if (liveTranscript) liveTranscript.textContent = `"${text}"`;
    if (promptInput) promptInput.value = text;
    setAssistantState('PROCESSING', text);

    // Cleanly abort current recognition instance to clear internal event.results buffer
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
    }

    try {
      executeKernelCommand(text);
    } catch (err) {
      console.error('Error executing spoken command:', err);
      setAssistantState('ERROR', "I didn't understand that command.");
    } finally {
      setTimeout(() => {
        speechExecuted = false;
        lastCapturedSpeech = '';
        if (alwaysListeningActive && !isUserMuted && !isListening) {
          startListening();
        }
      }, 350);
    }
  }

  function initSpeechRecognition() {
    if (!SpeechRecognition) return null;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = currentVoiceLang;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      isListening = true;
      speechExecuted = false;
      lastCapturedSpeech = '';
      orbContainer.classList.add('listening');
      const speakBtn = document.getElementById('voiceSpeakBtn');
      if (speakBtn) {
        speakBtn.classList.add('listening');
        speakBtn.textContent = '🟢 Listening Live';
      }
      const dockMic = document.getElementById('dockMicBtn');
      if (dockMic) dockMic.classList.add('active');
      const handsFreeBtn = document.getElementById('handsFreeBtn');
      if (handsFreeBtn) handsFreeBtn.classList.add('is-active');
      const handsFreeLabel = document.getElementById('handsFreeLabel');
      if (handsFreeLabel) handsFreeLabel.textContent = 'Mic: Always ON 🎙️';
      setAssistantState('LISTENING');
    };

    rec.onresult = (event) => {
      // 1. Echo rejection: ignore speaker output while assistant is talking
      if (isTtsSpeaking) {
        if (window.speechSynthesis && window.speechSynthesis.speaking) return;
        isTtsSpeaking = false;
      }

      // Collect full accumulated transcript across all results
      let fullTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscript += piece + ' ';
        } else {
          interimTranscript += piece + ' ';
        }
      }

      const spoken = (fullTranscript + interimTranscript).replace(/\s+/g, ' ').trim();
      if (!spoken) return;

      const currentCtx = getCurrentContext();

      // 2. Ultra-Low-Latency Zero-Delay Snake Steering
      if (currentCtx && currentCtx.feature === 'snake') {
        const snakeDir = extractSnakeDirection(spoken);
        if (snakeDir) {
          const now = performance.now();
          if (lastSnakeSteerDir !== snakeDir || (now - lastSnakeSteerTime > 240)) {
            lastSnakeSteerDir = snakeDir;
            lastSnakeSteerTime = now;
            sendMessageToApp('Snake Game', { type: 'os:action', action: 'SNAKE_MOVE', params: { direction: snakeDir } });
            const arrow = snakeDir === 'UP' ? '⬆️' : snakeDir === 'DOWN' ? '⬇️' : snakeDir === 'LEFT' ? '⬅️' : '➡️';
            if (assistantStateTitle) assistantStateTitle.textContent = `🐍 ${arrow} ${snakeDir}`;
            if (liveTranscript) liveTranscript.textContent = `"${spoken}"`;
          }
          return;
        }

        const snakeCmd = extractSnakeCommand(spoken);
        if (snakeCmd) {
          sendMessageToApp('Snake Game', { type: 'os:action', action: snakeCmd });
          if (assistantStateTitle) assistantStateTitle.textContent = `🐍 ${snakeCmd.replace('SNAKE_', '')}`;
          if (liveTranscript) liveTranscript.textContent = `"${spoken}"`;
          return;
        }
      }

      // 3. Normal Spoken Commands: live feedback
      lastCapturedSpeech = spoken;
      if (liveTranscript) liveTranscript.textContent = `"${spoken}"`;
      if (promptInput) promptInput.value = spoken;
      setAssistantState('LISTENING', spoken);

      // Debounced utterance commit:
      // Allow user to naturally speak complete sentences without premature cut-off
      clearTimeout(silenceTimer);
      const hasFinal = fullTranscript.trim().length > 0;
      const debounceDelay = hasFinal ? 650 : 850;

      silenceTimer = setTimeout(() => {
        if (lastCapturedSpeech && !speechExecuted) {
          const textToCommit = lastCapturedSpeech;
          lastCapturedSpeech = '';
          commitSpokenCommand(textToCommit);
        }
      }, debounceDelay);
    };

    rec.onerror = (event) => {
      console.warn('Speech recognition event:', event.error);
      if (event.error === 'not-allowed') {
        if (!hasUserEverInteracted) {
          isListening = false;
          setAssistantState('READY', 'Click anywhere to enable voice');
          const speakBtn = document.getElementById('voiceSpeakBtn');
          if (speakBtn) {
            speakBtn.classList.remove('listening');
            speakBtn.textContent = '🎙️ Click to Speak';
          }
          return;
        }
        alwaysListeningActive = false;
        isUserMuted = true;
        setAssistantState('ERROR', 'Microphone Blocked');
        showToast('Microphone access blocked. Click lock icon in browser address bar to allow mic access.', 'error', 'Mic Blocked');
        stopListening();
        return;
      }
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (alwaysListeningActive && !isUserMuted) {
        setTimeout(() => {
          if (!isListening) startListening();
        }, 250);
      }
    };

    rec.onend = () => {
      isListening = false;
      if (lastCapturedSpeech && !speechExecuted) {
        const textToCommit = lastCapturedSpeech;
        lastCapturedSpeech = '';
        commitSpokenCommand(textToCommit);
        return;
      }
      if (alwaysListeningActive && !isUserMuted) {
        setTimeout(() => {
          if (alwaysListeningActive && !isUserMuted && !isListening) {
            startListening();
          }
        }, 80);
      } else {
        stopListening();
      }
    };

    return rec;
  }

  async function startListening() {
    if (!SpeechRecognition) {
      showToast('Speech Recognition is not supported on this browser. Try Chrome or Edge.', 'warning', 'Speech Not Supported');
      return;
    }

    if (isListening) return;

    speechExecuted = false;
    lastCapturedSpeech = '';
    isListening = true;

    playVoiceTone('start');

    // Acquire microphone hardware stream for volume visualizer
    await requestMicHardwareAndVisualizer();

    try {
      if (recognition) {
        try { recognition.abort(); } catch (e) {}
      }
      recognition = initSpeechRecognition();
      if (recognition) {
        recognition.start();
      }
    } catch (err) {
      console.warn('Recognition start error:', err);
    }
  }

  function stopListening() {
    isListening = false;
    clearTimeout(silenceTimer);
    silenceTimer = null;

    stopMicVisualizer();

    if (activeMicStream) {
      try {
        activeMicStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      activeMicStream = null;
    }

    orbContainer.classList.remove('listening');
    const speakBtn = document.getElementById('voiceSpeakBtn');
    if (speakBtn) {
      speakBtn.classList.remove('listening');
      speakBtn.textContent = '🔇 Muted';
    }
    const dockMic = document.getElementById('dockMicBtn');
    if (dockMic) dockMic.classList.remove('active');
    const handsFreeBtn = document.getElementById('handsFreeBtn');
    if (handsFreeBtn) handsFreeBtn.classList.remove('is-active');
    const handsFreeLabel = document.getElementById('handsFreeLabel');
    if (handsFreeLabel) handsFreeLabel.textContent = 'Mic: MUTED 🔇';

    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
  }

  function toggleListening() {
    if (isListening && !isUserMuted) {
      isUserMuted = true;
      alwaysListeningActive = false;
      stopListening();
      showToast('Microphone muted. Voice Assistant is paused.', 'info', 'Mic Muted');
      if (assistantStateTitle) assistantStateTitle.textContent = '🔇 Microphone Muted';
      if (assistantSubtext) assistantSubtext.textContent = 'Click microphone or press Space to unmute';
    } else {
      isUserMuted = false;
      alwaysListeningActive = true;
      startListening();
      showToast('Voice Assistant is active and listening.', 'info', 'Mic Active');
      if (assistantStateTitle) assistantStateTitle.textContent = 'Always Listening 🎙️';
      if (assistantSubtext) assistantSubtext.textContent = 'Speak naturally: "open weather", "play snake", "up", "down"...';
    }
  }

  // Interactive Click Handlers for Orb and Buttons
  if (orbContainer) {
    orbContainer.addEventListener('click', (e) => {
      e.preventDefault();
      hasUserEverInteracted = true;
      toggleListening();
    });
  }

  micBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hasUserEverInteracted = true;
    toggleListening();
  });

  const voiceSpeakBtn = document.getElementById('voiceSpeakBtn');
  if (voiceSpeakBtn) {
    voiceSpeakBtn.addEventListener('click', (e) => {
      e.preventDefault();
      hasUserEverInteracted = true;
      toggleListening();
    });
  }

  // Language / Accent Switcher Button
  const voiceLangToggleBtn = document.getElementById('voiceLangToggleBtn');
  function updateLangToggleBtnUI() {
    if (!voiceLangToggleBtn) return;
    if (currentVoiceLang === 'en-IN') {
      voiceLangToggleBtn.textContent = '🇮🇳 En-IN';
      voiceLangToggleBtn.title = 'Accent: English (India). Click to switch to US English.';
    } else {
      voiceLangToggleBtn.textContent = '🌐 En-US';
      voiceLangToggleBtn.title = 'Accent: English (US). Click to switch to Indian English.';
    }
  }
  updateLangToggleBtnUI();

  if (voiceLangToggleBtn) {
    voiceLangToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hasUserEverInteracted = true;
      currentVoiceLang = (currentVoiceLang === 'en-IN') ? 'en-US' : 'en-IN';
      localStorage.setItem('os_voice_lang', currentVoiceLang);
      updateLangToggleBtnUI();
      showToast(currentVoiceLang === 'en-IN' ? 'Voice set to English (India)' : 'Voice set to English (US)', 'info', 'Voice Accent');
      if (isListening) {
        if (recognition) {
          try { recognition.abort(); } catch (err) {}
        }
        startListening();
      }
    });
  }

  // Spacebar hotkey & Game keyboard bridge for active focused windows (e.g. Snake Game)
  window.addEventListener('keydown', (e) => {
    // If user is currently typing in prompt input or another text field, don't intercept
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      return;
    }

    // Check if focused window contains a game (like Snake)
    const focusedWin = document.querySelector('.os-window-floating.is-focused:not(.is-closing)');
    if (focusedWin) {
      const title = (focusedWin.dataset.title || '').toLowerCase();
      const isGame = title.includes('snake') || title.includes('game');
      const iframe = focusedWin.querySelector('.window-iframe');
      if (iframe && iframe.contentWindow) {
        const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyP', 'KeyR', 'Enter'];
        if (gameKeys.includes(e.code)) {
          iframe.contentWindow.postMessage({ type: 'os:game-key', key: e.key, code: e.code }, '*');
          if (isGame || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
            return;
          }
        }
      }
    }

    if (e.code === 'Space') {
      e.preventDefault();
      toggleListening();
    }
  });

  // ========================================================
  // 11. Fallback Mic Button (Browser Speech Recognition -> Command Bar)
  // ========================================================
  let fallbackRecognition = null;
  let isFallbackListening = false;
  const fallbackMicBtn = document.getElementById('fallbackMicBtn');
  const fallbackMicText = fallbackMicBtn ? fallbackMicBtn.querySelector('.fallback-mic-text') : null;

  if (SpeechRecognition && fallbackMicBtn) {
    fallbackRecognition = new SpeechRecognition();
    fallbackRecognition.continuous = false;
    fallbackRecognition.interimResults = true;
    fallbackRecognition.lang = 'en-US';

    fallbackRecognition.onstart = () => {
      isFallbackListening = true;
      fallbackMicBtn.classList.add('is-recording');
      if (fallbackMicText) fallbackMicText.textContent = 'listening...';
    };

    fallbackRecognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }

      if (transcript && promptInput) {
        promptInput.value = transcript;
        // Dispatch input event to notify dictation / hands-free listeners
        promptInput.dispatchEvent(new Event('input', { bubbles: true }));
        promptInput.focus();
      }
    };

    fallbackRecognition.onerror = (event) => {
      console.warn('Fallback mic error:', event.error);
      stopFallbackListening();
      if (event.error === 'not-allowed') {
        showToast('Microphone access denied. Please allow mic in browser settings.', 'warning', 'Fallback Mic');
      } else if (event.error !== 'no-speech') {
        showToast(`Fallback mic error: ${event.error}`, 'error', 'Fallback Mic');
      }
    };

    fallbackRecognition.onend = () => {
      stopFallbackListening();
    };
  }

  function startFallbackListening() {
    if (!fallbackRecognition) {
      showToast('Speech recognition not supported in this browser.', 'warning', 'Fallback Mic');
      return;
    }
    // Stop primary assistant mic if currently active
    if (isListening && recognition) {
      try { recognition.stop(); } catch (e) {}
      stopListening();
    }
    try {
      fallbackRecognition.start();
    } catch (err) {
      console.warn('Fallback recognition start error:', err);
    }
  }

  function stopFallbackListening() {
    isFallbackListening = false;
    if (fallbackMicBtn) fallbackMicBtn.classList.remove('is-recording');
    if (fallbackMicText) fallbackMicText.textContent = 'fallback mic';
  }

  if (fallbackMicBtn) {
    fallbackMicBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFallbackListening) {
        if (fallbackRecognition) {
          try { fallbackRecognition.stop(); } catch (e) {}
        }
        stopFallbackListening();
      } else {
        startFallbackListening();
      }
    });
  }

  // ========================================================
  // 12. Export Spoken Log Button (Downloads Markdown File)
  // ========================================================
  const exportLogBtn = document.getElementById('exportLogBtn');
  if (exportLogBtn) {
    exportLogBtn.addEventListener('click', () => {
      const logs = getSpokenLogsFromStorage();
      if (!logs || logs.length === 0) {
        showToast('No spoken commands have been logged yet.', 'warning', 'Export Spoken Log');
        return;
      }

      const now = new Date();
      const exportIso = now.toISOString();
      const exportLocale = now.toLocaleString();

      let markdown = `# Voice OS - Spoken Command Log\n\n`;
      markdown += `> Generated on **${exportLocale}** (\`${exportIso}\`)\n`;
      markdown += `> Total Commands Logged: **${logs.length}**\n\n`;
      markdown += `## Summary Table\n\n`;
      markdown += `| # | ISO 8601 Timestamp | Local Time | Command |\n`;
      markdown += `|---|---|---|---|\n`;

      logs.forEach((entry, index) => {
        const num = index + 1;
        const iso = entry.timestamp || 'N/A';
        let localTime = 'N/A';
        try {
          localTime = new Date(entry.timestamp).toLocaleTimeString();
        } catch (e) {}
        const safeCmd = (entry.command || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
        markdown += `| ${num} | \`${iso}\` | ${localTime} | ${safeCmd} |\n`;
      });

      markdown += `\n## Chronological Transcript\n\n`;
      logs.forEach((entry, index) => {
        const num = index + 1;
        const iso = entry.timestamp || 'N/A';
        let localTime = 'N/A';
        try {
          localTime = new Date(entry.timestamp).toLocaleTimeString();
        } catch (e) {}
        markdown += `### ${num}. \`${iso}\` (${localTime})\n\n`;
        markdown += `> ${entry.command}\n\n`;
      });

      try {
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filenameDate = exportIso.slice(0, 19).replace(/[:T]/g, '-');
        a.href = url;
        a.download = `voice-os-spoken-log-${filenameDate}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Downloaded log of ${logs.length} command(s) as Markdown.`, 'success', 'Export Complete');
        addLog('SYSTEM', `Exported ${logs.length} spoken command log(s) to Markdown.`);
      } catch (err) {
        console.error('Failed to export spoken log:', err);
        showToast('Failed to export spoken log file.', 'error', 'Export Error');
      }
    });
  }

  // Dock app switcher icons
  document.querySelectorAll('.app-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      document.querySelectorAll('.app-icon').forEach(i => i.classList.remove('active'));
      icon.classList.add('active');
    });
  });

  // Dock Microphone button
  const dockMicBtn = document.getElementById('dockMicBtn');
  if (dockMicBtn) {
    dockMicBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleListening();
    });
  }

  // Dock Terminal button (Toggle Log Drawer)
  const dockTerminalBtn = document.getElementById('dockTerminalBtn');
  const logWindow = document.getElementById('logWindow');
  if (dockTerminalBtn && logWindow) {
    dockTerminalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      logWindow.classList.toggle('is-visible');
    });
  }

  // Close Terminal Drawer button
  const closeLogsBtn = document.getElementById('closeLogsBtn');
  if (closeLogsBtn && logWindow) {
    closeLogsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      logWindow.classList.remove('is-visible');
    });
  }

  // Quick Action Chips in center below transcript
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cmd = chip.dataset.cmd || chip.textContent.trim();
      executeKernelCommand(cmd);
    });
  });

  // Quick Launch Buttons
  const quickLaunchers = [
    { id: 'quickLaunchNotepad', cmd: 'open notepad' },
    { id: 'quickLaunchFiles', cmd: 'open file manager' },
    { id: 'quickLaunchClock', cmd: 'open clock' },
    { id: 'quickLaunchSnake', cmd: 'open snake game' },
    { id: 'quickLaunchMusic', cmd: 'open music player' },
    { id: 'quickLaunchManager', cmd: 'open task manager' },
    { id: 'quickLaunchWeather', cmd: 'open weather' },
    { id: 'quickLaunchCalc', cmd: 'open calculator' },
    { id: 'quickLaunchCamera', cmd: 'open camera' },
    { id: 'quickLaunchGallery', cmd: 'open gallery' },
    { id: 'quickLaunchWallpaper', cmd: 'open wallpaper' },
    { id: 'topbarWallpaperBtn', cmd: 'open wallpaper' }
  ];
  quickLaunchers.forEach(({ id, cmd }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeKernelCommand(cmd);
      });
    }
  });

  // Voice Help Modal
  const voiceHelpBtn = document.getElementById('voiceHelpBtn');
  const voiceHelpModal = document.getElementById('voiceHelpModal');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  if (voiceHelpBtn && voiceHelpModal) {
    voiceHelpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      voiceHelpModal.style.display = 'flex';
    });
  }
  if (closeHelpBtn && voiceHelpModal) {
    closeHelpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      voiceHelpModal.style.display = 'none';
    });
  }
  if (voiceHelpModal) {
    voiceHelpModal.addEventListener('click', (e) => {
      if (e.target === voiceHelpModal) voiceHelpModal.style.display = 'none';
    });
  }

  // Voice Confirmation Modal Buttons
  const confirmOkBtn = document.getElementById('confirmOkBtn');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const voiceConfirmModal = document.getElementById('voiceConfirmModal');
  if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      confirmVoiceAction();
    });
  }
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      cancelVoiceAction();
    });
  }
  if (voiceConfirmModal) {
    voiceConfirmModal.addEventListener('click', (e) => {
      if (e.target === voiceConfirmModal) cancelVoiceAction();
    });
  }

  // Clear Recent Commands button
  const clearRecentCmdsBtn = document.getElementById('clearRecentCmdsBtn');
  if (clearRecentCmdsBtn) {
    clearRecentCmdsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        localStorage.removeItem(SPOKEN_LOG_KEY);
      } catch (err) {}
      renderRecentCommands();
      showToast('Spoken command history cleared.', 'info', 'History Cleared');
    });
  }

  // Render recent commands on load
  renderRecentCommands();

  // Auto-start Full-Time Voice Assistant
  function startAlwaysOnListening() {
    if (alwaysListeningActive && !isUserMuted && !isListening) {
      startListening();
    }
  }

  // Attempt immediate auto-start
  setTimeout(startAlwaysOnListening, 150);

  // Fallback on first gesture if browser blocks immediate mic before interaction
  const triggerFirstInteraction = async () => {
    hasUserEverInteracted = true;
    if (!isListening && !isUserMuted) {
      await requestMicHardwareAndVisualizer();
      startAlwaysOnListening();
    }
  };
  window.addEventListener('click', triggerFirstInteraction, { passive: true });
  window.addEventListener('keydown', triggerFirstInteraction, { passive: true });
  window.addEventListener('pointerdown', triggerFirstInteraction, { passive: true });

  // Listen for snake game ready signal
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'os:snake-ready') {
      if (!isListening && !isUserMuted) {
        startAlwaysOnListening();
      }
    }
  });
});
