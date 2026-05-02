// Vertical Tabs Pro v2.1 — CSP-safe

// ── State ─────────────────────────────────────────────────────────────────────
const S = {
  view: 'tabs',
  tabs: [], groups: {},
  bm: { node: null, stack: [] },
  settings: {
    uiSize:'normal', fontSize:'md',
    faviconPos:'left', textAlign:'left',
    theme:'dark',
  },
  query: '',
  drag: { id: null },
  ctx: { tabId: null, bmId: null, bmUrl: null },
};


// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const app          = $('app');
const tabList      = $('tabList');
const tabCount     = $('tabCount');
const searchBar    = $('searchBar');
const searchInput  = $('searchInput');
const bmBreadcrumb = $('bmBreadcrumb');
const bmPath       = $('bmPath');
const ctxMenu      = $('ctxMenu');
const bmCtxMenu    = $('bmCtxMenu');
const settingsPanel= $('settingsPanel');
const bmPopup       = $('bmPopup');
const bmName        = $('bmName');
const bmFolder      = $('bmFolder');

// ── SVG helper ────────────────────────────────────────────────────────────────
function svgEl(paths, w=12, h=12, extra={}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', w); svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 24 24`);
  svg.setAttribute('fill', extra.fill || 'none');
  svg.setAttribute('stroke', extra.stroke || 'currentColor');
  svg.setAttribute('stroke-width', extra.sw || '2');
  for (const [tag, attrs] of paths) {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
    svg.appendChild(el);
  }
  return svg;
}

// ── Settings ──────────────────────────────────────────────────────────────────
async function loadSettings() {
  const r = await chrome.storage.local.get('settings');
  if (r.settings) Object.assign(S.settings, r.settings);
  applySettings();
}
function saveSettings() { chrome.storage.local.set({ settings: S.settings }); }
function applySettings() {
  const { uiSize, fontSize, faviconPos, textAlign, theme } = S.settings;
  app.dataset.uiSize     = uiSize;
  app.dataset.fontSize   = fontSize;
  app.dataset.faviconPos = faviconPos;
  app.dataset.textAlign  = textAlign;
  document.documentElement.dataset.theme = theme;
  const map = {
    uiSizeGroup:'uiSize', fontSizeGroup:'fontSize',
    faviconPosGroup:'faviconPos', textAlignGroup:'textAlign',
    themeGroup:'theme',
  };
  Object.entries(map).forEach(([id, key]) => {
    $(id)?.querySelectorAll('.seg-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.value === S.settings[key]));
  });
}
['uiSizeGroup','fontSizeGroup','faviconPosGroup','textAlignGroup','themeGroup']
  .forEach(id => {
    $(id)?.addEventListener('click', e => {
      const btn = e.target.closest('.seg-btn'); if (!btn) return;
      const map = {uiSizeGroup:'uiSize',fontSizeGroup:'fontSize',
        faviconPosGroup:'faviconPos',textAlignGroup:'textAlign',
        themeGroup:'theme'};
      S.settings[map[id]] = btn.dataset.value;
      applySettings(); saveSettings();
    });
  });

// ── Favicon ───────────────────────────────────────────────────────────────────
function resolveFaviconUrl(url, favIconUrl) {
  if (favIconUrl && favIconUrl.startsWith('http')) return favIconUrl;
  try {
    const u = new URL(url || '');
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch { return null; }
}

function makePlaceholder() {
  const d = document.createElement('div');
  d.className = 'tab-favicon-ph';
  d.appendChild(svgEl([['rect',{x:'3',y:'3',width:'18',height:'18',rx:'2'}]]));
  return d;
}

function makeFaviconEl(url, favIconUrl, isLoading) {
  if (isLoading) {
    const d = document.createElement('div');
    d.className = 'tab-loading';
    return d;
  }
  const src = resolveFaviconUrl(url, favIconUrl);
  if (!src) return makePlaceholder();
  const img = document.createElement('img');
  img.className = 'tab-favicon';
  img.alt = '';
  img.src = src;
  img.addEventListener('error', () => img.replaceWith(makePlaceholder()), { once: true });
  return img;
}

// ── Tab element ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function makeTabEl(tab) {
  const el = document.createElement('div');
  el.className = `tab-item${tab.active?' active':''}${tab.pinned?' pinned':''}`;
  el.dataset.tabId = tab.id;
  el.draggable = true;

  // Favicon
  el.appendChild(makeFaviconEl(tab.url, tab.favIconUrl, tab.status==='loading'));

  // Name
  const name = document.createElement('span');
  name.className = 'tab-name';
  name.title = tab.title || tab.url || '';
  name.textContent = tab.title || tab.url || 'New Tab';
  el.appendChild(name);

  // Pin dot
  if (tab.pinned) {
    const dot = document.createElement('div');
    dot.className = 'pin-dot';
    el.appendChild(dot);
  }

  // Audio indicator
  if (tab.audible) {
    const span = document.createElement('span');
    span.className = 'tab-audio';
    span.appendChild(svgEl([['path',{d:'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z'}]], 10, 10, {fill:'currentColor',stroke:'none'}));
    el.appendChild(span);
  }

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close';
  closeBtn.title = '閉じる';
  const ns = 'http://www.w3.org/2000/svg';
  const closeSvg = document.createElementNS(ns,'svg');
  closeSvg.setAttribute('width','9'); closeSvg.setAttribute('height','9');
  closeSvg.setAttribute('viewBox','0 0 24 24'); closeSvg.setAttribute('fill','none');
  closeSvg.setAttribute('stroke','currentColor'); closeSvg.setAttribute('stroke-width','2.5');
  ['M18 6 6 18','M6 6l12 12'].forEach(d => {
    const line = document.createElementNS(ns,'path');
    line.setAttribute('d', d);
    closeSvg.appendChild(line);
  });
  closeBtn.appendChild(closeSvg);
  el.appendChild(closeBtn);

  // ── Events ──
  el.addEventListener('click', e => {
    if (e.target.closest('.tab-close')) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      showBmPopup(tab);
      return;
    }
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  });
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    chrome.tabs.remove(tab.id);
  });
  el.addEventListener('mousedown', e => {
    if (e.button === 1) { e.preventDefault(); chrome.tabs.remove(tab.id); }
  });
  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    S.ctx.tabId = tab.id;
    showCtxMenu(ctxMenu, e.clientX, e.clientY);
  });

  // Drag & Drop
  el.addEventListener('dragstart', e => {
    S.drag.id = tab.id;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  el.addEventListener('dragend', () => { el.classList.remove('dragging'); clearDragOver(); S.drag.id = null; });
  el.addEventListener('dragover', e => {
    e.preventDefault();
    clearDragOver();
    const rel = (e.clientY - el.getBoundingClientRect().top) / el.getBoundingClientRect().height;
    if (rel < 0.25)      el.classList.add('drag-over-top');
    else if (rel > 0.75) el.classList.add('drag-over-bottom');
    else                 el.classList.add('drag-over-center');
  });
  el.addEventListener('drop', async e => {
    e.preventDefault();
    if (!S.drag.id || S.drag.id === tab.id) { clearDragOver(); return; }
    const rel = (e.clientY - el.getBoundingClientRect().top) / el.getBoundingClientRect().height;
    const src = S.tabs.find(t => t.id === S.drag.id);
    clearDragOver();
    if (rel >= 0.25 && rel <= 0.75) {
      // ── Center drop: add to group ─────────────────────────────────────────
      if (tab.groupId && tab.groupId !== -1) {
        await chrome.tabs.group({ tabIds: S.drag.id, groupId: tab.groupId });
      } else {
        const colors = ['blue','red','yellow','green','pink','purple','cyan','grey'];
        const gid = await chrome.tabs.group({ tabIds: [tab.id, S.drag.id] });
        await chrome.tabGroups.update(gid, { color: colors[gid%colors.length], title: 'グループ' });
      }
    } else {
      // ── Top/bottom drop: reorder ──────────────────────────────────────────
      const srcGroupId = src?.groupId ?? -1;

      // If dragged tab was in a group, ungroup it first then check if group is now single
      if (srcGroupId !== -1) {
        // Count remaining members after removal
        const remaining = S.tabs.filter(t => t.groupId === srcGroupId && t.id !== S.drag.id);
        await chrome.tabs.ungroup(S.drag.id);
        if (remaining.length === 1) {
          // Only one tab left — dissolve the group
          await chrome.tabs.ungroup(remaining[0].id);
        }
      }

      let idx = rel > 0.75 ? tab.index + 1 : tab.index;
      if (src && src.index < tab.index) idx = Math.max(0, idx - 1);
      await chrome.tabs.move(S.drag.id, { index: idx });
    }
  });

  return el;
}

function clearDragOver() {
  document.querySelectorAll('.drag-over-top,.drag-over-bottom,.drag-over-center')
    .forEach(e => e.classList.remove('drag-over-top','drag-over-bottom','drag-over-center'));
}

// ── Render Tabs ───────────────────────────────────────────────────────────────
function mkLabel(text) {
  const d = document.createElement('div');
  d.className = 'section-label';
  d.textContent = text;
  return d;
}

async function renderTabs() {
  const q = S.query.toLowerCase();
  let tabs = q ? S.tabs.filter(t =>
    (t.title||'').toLowerCase().includes(q)||(t.url||'').toLowerCase().includes(q)) : S.tabs;

  tabList.innerHTML = '';
  if (!tabs.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = q ? '一致なし' : 'タブがありません';
    tabList.appendChild(empty);
    return;
  }

  const pinned   = tabs.filter(t => t.pinned);
  const unpinned = tabs.filter(t => !t.pinned);

  if (pinned.length) {
    tabList.appendChild(mkLabel('📌 ピン留め'));
    pinned.forEach(t => tabList.appendChild(makeTabEl(t)));
  }
  if (pinned.length && unpinned.length) tabList.appendChild(mkLabel('タブ'));

  const seen = new Set();
  for (const tab of unpinned) {
    const gid = tab.groupId ?? -1;
    if (gid === -1) {
      tabList.appendChild(makeTabEl(tab));
    } else {
      if (!seen.has(gid)) {
        seen.add(gid);
        const grp = S.groups[gid];
        const color = grp?.color || 'grey';
        const container = document.createElement('div');
        container.dataset.gid = gid;

        const header = document.createElement('div');
        header.className = 'group-header';
        const dot = document.createElement('div');
        dot.className = `group-color-dot gc-${color}`;

        // Editable group name
        const gname = document.createElement('span');
        gname.className = 'group-name';
        gname.textContent = grp?.title || 'グループ';
        gname.title = 'クリックで折りたたむ / ダブルクリックで名前を変更';

        const ns = 'http://www.w3.org/2000/svg';
        const chevron = document.createElementNS(ns,'svg');
        chevron.setAttribute('class','group-toggle');
        chevron.setAttribute('width','12'); chevron.setAttribute('height','12');
        chevron.setAttribute('viewBox','0 0 24 24'); chevron.setAttribute('fill','none');
        chevron.setAttribute('stroke','currentColor'); chevron.setAttribute('stroke-width','2.5');
        const poly = document.createElementNS(ns,'polyline');
        poly.setAttribute('points','6 9 12 15 18 9');
        chevron.appendChild(poly);
        header.appendChild(dot); header.appendChild(gname); header.appendChild(chevron);

        const inner = document.createElement('div');
        inner.className = 'group-tabs';

        const startEdit = () => {
          gname.contentEditable = 'true';
          gname.classList.add('editing');
          gname.focus();
          const range = document.createRange();
          range.selectNodeContents(gname);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        };

        const commitRename = async () => {
          if (gname.contentEditable !== 'true') return;
          gname.contentEditable = 'false';
          gname.classList.remove('editing');
          const newTitle = gname.textContent.trim() || 'グループ';
          gname.textContent = newTitle;
          try { await chrome.tabGroups.update(gid, { title: newTitle }); } catch {}
        };

        // Chevron / dot → collapse; name → edit
        chevron.addEventListener('click', e => {
          e.stopPropagation();
          header.classList.toggle('collapsed');
          inner.style.display = header.classList.contains('collapsed') ? 'none' : '';
        });
        dot.addEventListener('click', e => {
          e.stopPropagation();
          header.classList.toggle('collapsed');
          inner.style.display = header.classList.contains('collapsed') ? 'none' : '';
        });
        gname.addEventListener('click', e => {
          e.stopPropagation();
          if (gname.contentEditable !== 'true') startEdit();
        });

        gname.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
          if (e.key === 'Escape') {
            gname.contentEditable = 'false';
            gname.classList.remove('editing');
            gname.textContent = grp?.title || 'グループ';
          }
          e.stopPropagation();
        });
        gname.addEventListener('blur', commitRename);
        container.appendChild(header);
        container.appendChild(inner);
        tabList.appendChild(container);
      }
      const inner = tabList.querySelector(`[data-gid="${gid}"] .group-tabs`);
      if (inner) inner.appendChild(makeTabEl(tab));
    }
  }
  tabCount.textContent = S.tabs.length;
}

// ── Load Tabs ─────────────────────────────────────────────────────────────────
async function loadTabs() {
  S.tabs = await chrome.tabs.query({ currentWindow: true });
  S.tabs.sort((a,b) => a.index - b.index);
  S.groups = {};
  try {
    const grps = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    grps.forEach(g => { S.groups[g.id] = g; });
  } catch {}
  if (S.view === 'tabs') renderTabs();
}

['onCreated','onRemoved','onUpdated','onActivated','onMoved','onDetached','onAttached']
  .forEach(ev => chrome.tabs[ev]?.addListener(() => loadTabs()));
try {
  ['onCreated','onRemoved','onUpdated'].forEach(ev =>
    chrome.tabGroups[ev]?.addListener(() => loadTabs()));
} catch {}

// ── Bookmarks ─────────────────────────────────────────────────────────────────
async function renderBookmarks(nodeId) {
  tabList.innerHTML = '';
  let node;
  if (!nodeId) {
    const roots = await chrome.bookmarks.getTree();
    node = roots[0];
  } else {
    const r = await chrome.bookmarks.getSubTree(nodeId);
    node = r[0];
  }
  S.bm.node = node;
  bmPath.textContent = S.bm.stack.length
    ? 'ブックマーク › ' + S.bm.stack.map(n=>n.title).join(' › ')
    : 'ブックマーク';

  const children = node.children || [];
  const q = S.query.toLowerCase();
  const items = q ? children.filter(c =>
    (c.title||'').toLowerCase().includes(q)||(c.url||'').toLowerCase().includes(q)) : children;

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = q ? '一致なし' : 'ブックマークがありません';
    tabList.appendChild(empty);
    return;
  }

  items.forEach(child => {
    const el = document.createElement('div');
    el.className = 'bm-item';
    const isFolder = !child.url;

    if (isFolder) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns,'svg');
      svg.setAttribute('class','bm-folder');
      svg.setAttribute('width','15'); svg.setAttribute('height','15');
      svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','currentColor');
      svg.setAttribute('opacity','0.6');
      const path = document.createElementNS(ns,'path');
      path.setAttribute('d','M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z');
      svg.appendChild(path);
      el.appendChild(svg);

      const span = document.createElement('span');
      span.className = 'bm-name';
      span.textContent = child.title || 'フォルダ';
      el.appendChild(span);

      const chevron = document.createElementNS(ns,'svg');
      chevron.setAttribute('width','10'); chevron.setAttribute('height','10');
      chevron.setAttribute('viewBox','0 0 24 24'); chevron.setAttribute('fill','none');
      chevron.setAttribute('stroke','currentColor'); chevron.setAttribute('stroke-width','2');
      chevron.style.flexShrink = '0'; chevron.style.color = 'var(--text-muted)';
      const poly = document.createElementNS(ns,'polyline');
      poly.setAttribute('points','9 18 15 12 9 6');
      chevron.appendChild(poly);
      el.appendChild(chevron);

      el.addEventListener('click', () => {
        S.bm.stack.push({ id: child.id, title: child.title });
        bmBreadcrumb.classList.remove('hidden');
        renderBookmarks(child.id);
      });
    } else {
      el.appendChild(makeFaviconEl(child.url, null, false));
      const span = document.createElement('span');
      span.className = 'bm-name';
      span.title = child.url || '';
      span.textContent = child.title || child.url || '';
      el.appendChild(span);

      el.addEventListener('click', () => chrome.tabs.create({ url: child.url }));
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        S.ctx.bmId  = child.id;
        S.ctx.bmUrl = child.url;
        showCtxMenu(bmCtxMenu, e.clientX, e.clientY);
      });
    }
    tabList.appendChild(el);
  });
}

// ── Context Menus ─────────────────────────────────────────────────────────────
function showCtxMenu(menu, x, y) {
  ctxMenu.classList.add('hidden');
  bmCtxMenu.classList.add('hidden');
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
  menu.classList.remove('hidden');
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  menu.style.left = (x - r.width)  + 'px';
    if (r.bottom > window.innerHeight) menu.style.top  = (y - r.height) + 'px';
  });
}
function hideCtxMenus() {
  ctxMenu.classList.add('hidden');
  bmCtxMenu.classList.add('hidden');
}

document.addEventListener('click', hideCtxMenus);

ctxMenu.addEventListener('click', async e => {
  const item = e.target.closest('.ctx-item'); if (!item) return;
  const action = item.dataset.action;
  const id  = S.ctx.tabId;
  const tab = S.tabs.find(t => t.id === id);
  hideCtxMenus();

  switch (action) {
    case 'activate':    chrome.tabs.update(id, { active: true }); break;
    case 'new-tab':     chrome.tabs.create({}); break;
    case 'duplicate':   chrome.tabs.duplicate(id); break;
    case 'pin':         chrome.tabs.update(id, { pinned: !tab?.pinned }); break;
    case 'mute':        chrome.tabs.update(id, { muted: !tab?.mutedInfo?.muted }); break;
    case 'group-new':
      try {
        const colors = ['blue','red','yellow','green','pink','purple','cyan','grey'];
        const gid = await chrome.tabs.group({ tabIds: id });
        await chrome.tabGroups.update(gid, { color: colors[gid%colors.length], title: 'グループ' });
      } catch {}
      break;
    case 'group-ungroup':
      try { await chrome.tabs.ungroup(id); } catch {}
      break;
    case 'copy-url':    navigator.clipboard.writeText(tab?.url || ''); break;
    case 'move-window': chrome.windows.create({ tabId: id }); break;
    case 'close':       chrome.tabs.remove(id); break;
    case 'close-others':
      if (tab) chrome.tabs.remove(S.tabs.filter(t=>t.id!==id).map(t=>t.id));
      break;
    case 'close-right':
      if (tab) chrome.tabs.remove(S.tabs.filter(t=>t.index>tab.index).map(t=>t.id));
      break;
  }
});

bmCtxMenu.addEventListener('click', async e => {
  const item = e.target.closest('.ctx-item'); if (!item) return;
  hideCtxMenus();
  switch (item.dataset.action) {
    case 'bm-open':     chrome.tabs.create({ url: S.ctx.bmUrl }); break;
    case 'bm-open-new': chrome.windows.create({ url: S.ctx.bmUrl }); break;
    case 'bm-copy-url': navigator.clipboard.writeText(S.ctx.bmUrl || ''); break;
    case 'bm-delete':
      await chrome.bookmarks.remove(S.ctx.bmId);
      renderBookmarks(S.bm.node?.id ?? null);
      break;
  }
});

// ── Search Popup ──────────────────────────────────────────────────────────────


// ── View switcher ─────────────────────────────────────────────────────────────
$('viewTabs').addEventListener('click', () => {
  S.view = 'tabs';
  $('viewTabs').classList.add('active');
  $('viewBookmarks').classList.remove('active');
  bmBreadcrumb.classList.add('hidden');
  S.query = ''; searchInput.value = '';
  renderTabs();
});
$('viewBookmarks').addEventListener('click', () => {
  S.view = 'bookmarks';
  $('viewBookmarks').classList.add('active');
  $('viewTabs').classList.remove('active');
  S.bm.stack = [];
  bmBreadcrumb.classList.add('hidden');
  S.query = ''; searchInput.value = '';
  renderBookmarks(null);
});
$('bmBack').addEventListener('click', () => {
  S.bm.stack.pop();
  if (!S.bm.stack.length) bmBreadcrumb.classList.add('hidden');
  const prev = S.bm.stack[S.bm.stack.length-1];
  renderBookmarks(prev?.id ?? null);
});

// ── Toolbar ───────────────────────────────────────────────────────────────────
$('newTabBtn').addEventListener('click', async () => {
  const tab = await chrome.tabs.create({ url: 'chrome://newtab' });
  // Focus the omnibox (address bar) so user can type a search immediately
  chrome.tabs.update(tab.id, { active: true });
  chrome.windows.update(tab.windowId, { focused: true });
});

$('searchBtn').addEventListener('click', () => {
  const hidden = searchBar.classList.contains('hidden');
  searchBar.classList.toggle('hidden');
  if (hidden) searchInput.focus();
  else { S.query = ''; searchInput.value = ''; rerenderCurrent(); }
});
$('closeSearch').addEventListener('click', () => {
  searchBar.classList.add('hidden');
  S.query = ''; searchInput.value = '';
  rerenderCurrent();
});
searchInput.addEventListener('input', () => { S.query = searchInput.value; rerenderCurrent(); });
searchInput.addEventListener('keydown', e => { if (e.key==='Escape') $('closeSearch').click(); });

$('settingsBtn').addEventListener('click', () => settingsPanel.classList.toggle('hidden'));
$('closeSettings').addEventListener('click', () => settingsPanel.classList.add('hidden'));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { hideCtxMenus(); hideSearchPopup(); }
  if ((e.ctrlKey||e.metaKey) && e.key==='f') {
    e.preventDefault();
    searchBar.classList.remove('hidden');
    searchInput.focus();
  }
});

function rerenderCurrent() {
  if (S.view === 'tabs') renderTabs();
  else renderBookmarks(S.bm.node?.id ?? null);
}

// ── Bookmark Register Popup ──────────────────────────────────────────────────
async function showBmPopup(tab) {
  // Populate folder select
  bmFolder.innerHTML = '';
  const buildOptions = (nodes, depth) => {
    for (const node of nodes) {
      if (!node.url) { // folder
        const opt = document.createElement('option');
        opt.value = node.id;
        opt.textContent = ' '.repeat(depth * 2) + (node.title || 'フォルダ');
        bmFolder.appendChild(opt);
        if (node.children) buildOptions(node.children, depth + 1);
      }
    }
  };
  const tree = await chrome.bookmarks.getTree();
  buildOptions(tree[0].children || [], 0);

  // Check if already bookmarked
  let existing = null;
  try {
    const results = await chrome.bookmarks.search({ url: tab.url });
    existing = results[0] || null;
  } catch {}

  bmName.value = tab.title || tab.url || '';
  if (existing) bmFolder.value = existing.parentId;

  bmPopup.dataset.tabUrl   = tab.url || '';
  bmPopup.dataset.existingId = existing?.id || '';
  bmPopup.classList.remove('hidden');
  setTimeout(() => bmName.focus(), 50);
}

function hideBmPopup() { bmPopup.classList.add('hidden'); }

$('bmPopupClose').addEventListener('click', hideBmPopup);
$('bmPopupCancel').addEventListener('click', hideBmPopup);
bmPopup.addEventListener('click', e => { if (e.target === bmPopup) hideBmPopup(); });

$('bmPopupSave').addEventListener('click', async () => {
  const url      = bmPopup.dataset.tabUrl;
  const title    = bmName.value.trim() || url;
  const parentId = bmFolder.value;
  const existId  = bmPopup.dataset.existingId;
  try {
    if (existId) {
      await chrome.bookmarks.update(existId, { title, parentId });
    } else {
      await chrome.bookmarks.create({ parentId, title, url });
    }
  } catch(e) { console.warn('bookmark save error', e); }
  hideBmPopup();
});

bmName.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('bmPopupSave').click();
  if (e.key === 'Escape') hideBmPopup();
  e.stopPropagation();
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  await loadSettings();
  await loadTabs();
})();
