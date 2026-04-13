// sidepanel.js â Ping Analyst v3.0 (Supabase-direct)
const $ = id => document.getElementById(id);

// ââ Supabase config ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const SUPABASE_URL = "https://knimxvcbrtkuhsuovasu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaW14dmNicnRrdWhzdW92YXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDEyNjAsImV4cCI6MjA4OTE3NzI2MH0.g3Gcz-c41C9jnxy5Gba_jzrV1ATjy5_Wr5yaIXOHY8M";
const RENDER_URL = "https://analyst-docker.onrender.com";

// ââ USD Formatting âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function parseUSD(val) { return String(val).replace(/[^0-9.]/g, ""); }
function formatUSD(val) {
  const num = parseFloat(parseUSD(val));
  if (isNaN(num) || val === "") return "";
  return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function wireUSDInputs() {
  ["price", "cost"].forEach(id => {
    const el = $(id);
    el.addEventListener("focus", () => { el.value = parseUSD(el.value); });
    el.addEventListener("blur",  () => { el.value = formatUSD(el.value); });
  });
}

// ââ Unit Mix Matrix ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const TYPES = { 0:"Studio", 1:"Single", 2:"Duplex", 3:"Triplex", 4:"Fourplex", 5:"Fiveplex" };
const MAX_COMBOS = 5;
let selectedCombos = [];
let resolvedCoords = null;
let resolvedAddress = null;

// ââ Commercial Spaces ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const COMMERCIAL_TYPES = ["Retail", "Office", "Restaurant", "Medical / Dental", "Flex Space"];
const MAX_COMMERCIAL = 5;
let selectedCommercial = [];

$("commercialToggle").addEventListener("change", function () {
  const panel = $("commercialPanel");
  if (this.checked) {
    panel.classList.add("on");
    if (!selectedCommercial.length) addCommercialRow();
    else renderCommercialPanel();
  } else {
    panel.classList.remove("on");
  }
});
$("addCommercialBtn").addEventListener("click", () => addCommercialRow());

function addCommercialRow() {
  if (selectedCommercial.length >= MAX_COMMERCIAL) return;
  selectedCommercial.push({ type: COMMERCIAL_TYPES[0], sqft: "", rentPerSF: "" });
  renderCommercialPanel();
}

function removeCommercialRow(i) {
  selectedCommercial.splice(i, 1);
  renderCommercialPanel();
}

function renderCommercialPanel() {
  const rowsDiv = $("commercialRows");
  rowsDiv.innerHTML = "";
  if (!selectedCommercial.length) {
    rowsDiv.innerHTML = '<div class="comm-empty">No spaces added yet.</div>';
  } else {
    selectedCommercial.forEach((space, i) => {
      const row = document.createElement("div");
      row.className = "comm-row";

      const typeEl = document.createElement("select");
      typeEl.className = "comm-select";
      COMMERCIAL_TYPES.forEach(t => {
        const o = document.createElement("option");
        o.value = t; o.textContent = t;
        if (t === space.type) o.selected = true;
        typeEl.appendChild(o);
      });
      typeEl.addEventListener("change", () => { selectedCommercial[i].type = typeEl.value; });

      const sfEl = document.createElement("input");
      sfEl.type = "number"; sfEl.min = "1"; sfEl.className = "comm-input"; sfEl.placeholder = "SF";
      if (space.sqft) sfEl.value = space.sqft;

      const rentEl = document.createElement("input");
      rentEl.type = "number"; rentEl.min = "0"; rentEl.step = "0.01";
      rentEl.className = "comm-input"; rentEl.placeholder = "$/SF";
      if (space.rentPerSF) rentEl.value = space.rentPerSF;

      const revEl = document.createElement("span");
      revEl.className = "comm-rev";
      const _upd = () => {
        const sf = parseFloat(sfEl.value)||0, r = parseFloat(rentEl.value)||0;
        if (sf>0&&r>0) { revEl.textContent=`$${Math.round(sf*r).toLocaleString()}`; revEl.classList.remove("empty"); }
        else { revEl.textContent="â"; revEl.classList.add("empty"); }
      };
      _upd();
      sfEl.addEventListener("input", () => { selectedCommercial[i].sqft = sfEl.value; _upd(); updateCommTotal(); if (sfEl.value && parseInt(sfEl.value)>=1) hideErr("commercialError"); });
      rentEl.addEventListener("input", () => { selectedCommercial[i].rentPerSF = rentEl.value; _upd(); updateCommTotal(); if (rentEl.value && parseFloat(rentEl.value)>0) hideErr("commercialError"); });

      const rmBtn = document.createElement("button");
      rmBtn.className = "btn-rm-comm"; rmBtn.type = "button"; rmBtn.textContent = "Ã";
      rmBtn.addEventListener("click", () => removeCommercialRow(i));

      row.append(typeEl, sfEl, rentEl, revEl, rmBtn);
      rowsDiv.appendChild(row);
    });
  }
  $("addCommercialBtn").disabled = selectedCommercial.length >= MAX_COMMERCIAL;
  updateCommTotal();
}

function updateCommTotal() {
  const totalSF = selectedCommercial.reduce((s,c) => s+(parseFloat(c.sqft)||0), 0);
  const totalRev = selectedCommercial.reduce((s,c) => s+(parseFloat(c.sqft)||0)*(parseFloat(c.rentPerSF)||0), 0);
  if (totalSF > 0 && totalRev > 0) $("commTotalDisplay").textContent = `${Math.round(totalSF).toLocaleString()} SF Â· $${Math.round(totalRev).toLocaleString()}/yr`;
  else if (totalSF > 0) $("commTotalDisplay").textContent = `${Math.round(totalSF).toLocaleString()} SF total`;
  else $("commTotalDisplay").textContent = "";
}

function buildMatrix() {
  const tbody = $("comboBody");
  tbody.innerHTML = "";
  for (let beds = 0; beds <= 5; beds++) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = `${TYPES[beds]} (${beds}bd)`;
    tr.appendChild(tdLabel);
    for (let baths = 1; baths <= 5; baths++) {
      const td = document.createElement("td");
      td.className = "cb-cell";
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.className = "combo-cb";
      cb.id = `cb_${beds}_${baths}`;
      cb.dataset.beds = beds; cb.dataset.baths = baths; cb.dataset.type = TYPES[beds];
      const lbl = document.createElement("label");
      lbl.htmlFor = cb.id; lbl.appendChild(cb);
      td.appendChild(lbl);
      td.addEventListener("click", e => { if (e.target !== cb) cb.click(); });
      cb.addEventListener("change", () => onComboChange(cb, td));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function onComboChange(cb, td) {
  const beds = parseInt(cb.dataset.beds), baths = parseInt(cb.dataset.baths), type = cb.dataset.type;
  if (cb.checked) {
    if (selectedCombos.length >= MAX_COMBOS) { cb.checked = false; return; }
    selectedCombos.push({ beds, baths, type, units: "" });
    td.classList.add("sel");
  } else {
    selectedCombos = selectedCombos.filter(c => !(c.beds===beds && c.baths===baths));
    td.classList.remove("sel");
  }
  updateMatrixBadge();
  updateUnitsPanel();
  document.querySelectorAll(".combo-cb").forEach(c => { if (!c.checked) c.disabled = selectedCombos.length >= MAX_COMBOS; });
  if (selectedCombos.length > 0) hideErr("comboError");
}

function updateUnitsPanel() {
  const panel = $("unitsPanel"), rowsDiv = $("unitsRows");
  if (!selectedCombos.length) { panel.classList.remove("on"); return; }
  panel.classList.add("on");
  rowsDiv.innerHTML = "";
  selectedCombos.forEach((combo, i) => {
    const row = document.createElement("div"); row.className = "units-row";
    const inp = document.createElement("input");
    inp.type = "number"; inp.min = "1"; inp.className = "units-input";
    inp.id = `units_${i}`; inp.placeholder = "# units";
    if (combo.units) inp.value = combo.units;
    inp.addEventListener("input", () => {
      selectedCombos[i].units = inp.value;
      updateUnitsTotal();
      if (inp.value && parseInt(inp.value)>=1) {
        if (selectedCombos.every(c => c.units && parseInt(c.units)>=1)) hideErr("unitsError");
      }
    });
    const lbl = document.createElement("span");
    lbl.className = "units-label";
    lbl.textContent = `${combo.type} ${combo.beds}bd/${combo.baths}ba`;
    row.append(lbl, inp);
    rowsDiv.appendChild(row);
  });
  updateUnitsTotal();
}

function updateUnitsTotal() {
  $("unitsTotalDisplay").textContent = `${selectedCombos.reduce((s,c) => s+(parseInt(c.units)||0), 0)} Total`;
}

function updateMatrixBadge() {
  const badge = $("matrixBadge");
  badge.textContent = `${selectedCombos.length} Selected`;
  badge.className = "matrix-badge" + (selectedCombos.length > 0 ? " active" : "");
}

// ââ Geocoding ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
let geoTimer = null;
$("address").addEventListener("input", () => {
  resolvedCoords = null; resolvedAddress = null;
  $("coordsPill").className = "coords-pill";
  clearTimeout(geoTimer);
  const val = $("address").value.trim();
  if (val.length < 6) return;
  geoTimer = setTimeout(() => geocodeAddress(val), 900);
});

async function geocodeAddress(address) {
  $("addrSpinner").className = "addr-spinner on";
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, {
      headers: {"Accept-Language":"en-US,en","User-Agent":"PingUnderwriting/1.0"}
    });
    const data = await res.json();
    if (data.length > 0) {
      resolvedCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      resolvedAddress = data[0].display_name;
      $("coordsText").textContent = `${resolvedCoords.lat.toFixed(5)}, ${resolvedCoords.lng.toFixed(5)}`;
      $("coordsPill").className = "coords-pill on";
    }
  } catch (_) {} finally { $("addrSpinner").className = "addr-spinner"; }
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// AUTH â Supabase Auth (email/password)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let currentApiKey = null;
let currentUserName = null;
let accessToken = null;      // Supabase JWT
let refreshToken = null;
let tokenExpiresAt = 0;

function isSignedIn() { return !!accessToken && !!currentApiKey; }

// ââ Supabase REST helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââ

function sbHeaders(auth = true) {
  const h = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
  };
  if (auth && accessToken) h["Authorization"] = `Bearer ${accessToken}`;
  return h;
}

async function sbFetch(path, opts = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { headers: sbHeaders(opts.auth !== false), ...opts });
  return res;
}

async function sbGet(table, query = "") {
  const res = await sbFetch(`/rest/v1/${table}?${query}`);
  if (!res.ok) throw new Error(`Supabase ${table} query failed: ${res.status}`);
  return res.json();
}

// ââ Token management âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function getSavedAuth() {
  return new Promise(resolve => {
    chrome.storage.local.get(
      ["sb_access_token", "sb_refresh_token", "sb_expires_at", "sb_api_key", "sb_user_name", "sb_email"],
      resolve
    );
  });
}

function saveAuth(access, refresh, expiresAt, apiKey, name, email) {
  accessToken = access;
  refreshToken = refresh;
  tokenExpiresAt = expiresAt;
  currentApiKey = apiKey;
  currentUserName = name;
  chrome.storage.local.set({
    sb_access_token: access,
    sb_refresh_token: refresh,
    sb_expires_at: expiresAt,
    sb_api_key: apiKey,
    sb_user_name: name,
    sb_email: email,
  });
}

function clearSavedAuth() {
  accessToken = null;
  refreshToken = null;
  tokenExpiresAt = 0;
  currentApiKey = null;
  currentUserName = null;
  chrome.storage.local.remove([
    "sb_access_token", "sb_refresh_token", "sb_expires_at",
    "sb_api_key", "sb_user_name", "sb_email",
  ]);
}

async function refreshSession() {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const meta = data.user?.user_metadata || {};
    saveAuth(
      data.access_token,
      data.refresh_token,
      Date.now() + (data.expires_in * 1000),
      meta.api_key || currentApiKey,
      meta.name || currentUserName,
      data.user?.email || ""
    );
    return true;
  } catch (_) {
    return false;
  }
}

async function ensureValidToken() {
  if (Date.now() < tokenExpiresAt - 60000) return true; // still valid (1 min buffer)
  return refreshSession();
}

// ââ Sign-in / sign-out âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  $(viewId).classList.add("active");
}

function showSignedIn(name) {
  const displayName = name || "User";
  $("headerUserName").textContent = displayName;
  $("headerUserAvatar").textContent = displayName.charAt(0).toUpperCase();
  $("templatesCard").style.display = "";
  loadTemplates();
  switchView("viewSearch");
}

function showSignedOut() {
  $("signInEmail").value = "";
  $("signInPassword").value = "";
  $("signInError").style.display = "none";
  $("signInBtn").disabled = false;
  $("signInBtn").innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Sign In`;
  switchView("viewSignIn");
}

async function handleSignIn() {
  const email = $("signInEmail").value.trim();
  const password = $("signInPassword").value;

  if (!email || !password) {
    $("signInError").textContent = "Please enter email and password.";
    $("signInError").style.display = "";
    return;
  }

  $("signInBtn").disabled = true;
  $("signInBtn").innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .7s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Signing inâ¦`;
  $("signInError").style.display = "none";

  try {
    // Sign in via Supabase Auth
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error_description || data.msg || "Sign-in failed");
    }

    const meta = data.user?.user_metadata || {};
    saveAuth(
      data.access_token,
      data.refresh_token,
      Date.now() + (data.expires_in * 1000),
      meta.api_key,
      meta.name,
      data.user?.email
    );

    // Load presets from Supabase now that we're authenticated
    await loadPresets();
    renderSearchPresetSelect();

    showSignedIn(meta.name);
  } catch (e) {
    $("signInError").textContent = e.message || "Sign-in failed. Check your credentials.";
    $("signInError").style.display = "";
    $("signInBtn").disabled = false;
    $("signInBtn").innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Sign In`;
  }
}

function handleSignOut() {
  clearSavedAuth();
  assumptionPresets = [];
  defaultPresetName = "";
  searchActivePreset = "";
  showSignedOut();
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// ASSUMPTION PRESETS â Read from Supabase (managed in CRM)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const PRESET_FIELD_CONFIG = [
  { key:"ltv",        label:"Loan-to-Value (LTV)",      step:"1",   min:"1",   max:"100", pct:true },
  { key:"closingPct", label:"Closing Costs",             step:"0.5", min:"0",   max:"20",  pct:true },
  { key:"vacancy",    label:"Vacancy Rate",              step:"1",   min:"0",   max:"50",  pct:true },
  { key:"opexRatio",  label:"OPEX Ratio",                step:"1",   min:"0",   max:"100", pct:true },
  { key:"intRate",    label:"Interest Rate (IO, Yr 1)",  step:"0.1", min:"0",   max:"30",  pct:true },
  { key:"rentGrowth1",label:"Year-1 Rent Growth",        step:"0.5", min:"-10", max:"20",  pct:true },
  { key:"otherIncMo", label:"Other Income / Unit / Mo",  step:"5",   min:"0",   max:"500", pct:false, prefix:"$" },
];

const SEED_PRESETS = [
  { name:"Conservative", ltv:0.65, closingPct:0.03, vacancy:0.10, opexRatio:0.40, intRate:0.07,  rentGrowth1:0.02, otherIncMo:50  },
  { name:"Standard",     ltv:0.70, closingPct:0.02, vacancy:0.07, opexRatio:0.35, intRate:0.065, rentGrowth1:0.03, otherIncMo:75  },
  { name:"Aggressive",   ltv:0.80, closingPct:0.015,vacancy:0.05, opexRatio:0.30, intRate:0.060, rentGrowth1:0.05, otherIncMo:100 },
];

let assumptionPresets = [];
let defaultPresetName = "";
let searchActivePreset = "";
let settingsSelected = "";

async function loadPresets() {
  // Fetch assumption presets from Supabase for this user
  try {
    await ensureValidToken();
    const rows = await sbGet(
      "assumption_templates",
      `api_key=eq.${encodeURIComponent(currentApiKey)}&select=name,assumptions,is_default&order=created_at.asc`
    );

    if (rows.length > 0) {
      // Flatten: merge assumptions JSONB into top-level keys
      assumptionPresets = rows.map(r => ({
        name: r.name,
        ...r.assumptions,
        _isDefault: r.is_default,
      }));
      const def = rows.find(r => r.is_default);
      defaultPresetName = def ? def.name : rows[0].name;
    } else {
      // No presets in DB yet â fall back to seed defaults
      assumptionPresets = SEED_PRESETS.map(p => ({ ...p }));
      defaultPresetName = assumptionPresets[0].name;
    }
    searchActivePreset = defaultPresetName;
    settingsSelected = defaultPresetName;
  } catch (e) {
    console.warn("Failed to load presets from Supabase, using seed defaults:", e);
    assumptionPresets = SEED_PRESETS.map(p => ({ ...p }));
    defaultPresetName = assumptionPresets[0].name;
    searchActivePreset = defaultPresetName;
    settingsSelected = defaultPresetName;
  }
}

function getPreset(name) { return assumptionPresets.find(p => p.name === name) || assumptionPresets[0]; }

function fmtPresetVal(key, val) {
  const cfg = PRESET_FIELD_CONFIG.find(c => c.key === key);
  if (!cfg) return String(val);
  if (cfg.pct) {
    const pct = val * 100;
    const decimals = (pct % 1 === 0) ? 0 : 1;
    return pct.toFixed(decimals).replace(/\.0$/, "") + "%";
  }
  return "$" + val;
}

// ââ Search preset selector âââââââââââââââââââââââââââââââââââââââââââââââââââ
function renderSearchPresetSelect() {
  const sel = $("searchPresetSelect");
  if (!sel) return;
  const prev = sel.value || searchActivePreset;
  sel.innerHTML = "";
  assumptionPresets.forEach(p => {
    const o = document.createElement("option");
    o.value = p.name;
    o.textContent = p.name + (p.name === defaultPresetName ? " (Default)" : "");
    if (p.name === prev) o.selected = true;
    sel.appendChild(o);
  });
  if (!sel.value && assumptionPresets.length) sel.value = assumptionPresets[0].name;
}

$("searchPresetSelect").addEventListener("change", function () {
  searchActivePreset = this.value;
});

$("openSettingsBtn").addEventListener("click", () => {
  settingsSelected = searchActivePreset || defaultPresetName;
  switchView("viewSettings");
  renderSettingsList();
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SETTINGS VIEW â Read-only (presets managed in CRM)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

$("settingsBackBtn").addEventListener("click", () => {
  switchView("viewSearch");
  renderSearchPresetSelect();
});

function renderSettingsList() {
  // Hide edit section, show main
  $("presetMainSection").classList.remove("off");
  if ($("presetEditSection")) $("presetEditSection").classList.remove("on");

  const list = $("presetList");
  list.innerHTML = "";

  if (!assumptionPresets.length) {
    list.innerHTML = '<div class="templates-empty">No presets found. Create presets in the CRM.</div>';
    return;
  }

  assumptionPresets.forEach(p => {
    const isDefault = p.name === defaultPresetName;
    const isSelected = p.name === settingsSelected;
    const item = document.createElement("div");
    item.className = "preset-item" + (isSelected ? " active" : "");

    const left = document.createElement("div"); left.className = "preset-item-left";
    const nameEl = document.createElement("div"); nameEl.className = "preset-item-name"; nameEl.textContent = p.name;
    left.appendChild(nameEl);
    if (isDefault) {
      const defEl = document.createElement("div"); defEl.className = "preset-default-label"; defEl.textContent = "Default";
      left.appendChild(defEl);
    }
    left.addEventListener("click", () => { settingsSelected = p.name; renderSettingsList(); });

    item.appendChild(left);
    list.appendChild(item);
  });
  renderPresetValues();
}

function renderPresetValues() {
  const p = getPreset(settingsSelected);
  if (!p) return;
  $("presetValuesTitle").textContent = p.name;
  const grid = $("presetValuesGrid");
  grid.innerHTML = "";
  PRESET_FIELD_CONFIG.forEach(cfg => {
    const box = document.createElement("div"); box.className = "pvb";
    box.innerHTML = `<div class="pvb-label">${cfg.label}</div><div class="pvb-value">${fmtPresetVal(cfg.key, p[cfg.key])}</div>`;
    grid.appendChild(box);
  });
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// TEMPLATES â Read from Supabase (with full combo/commercial restoration)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function loadTemplates() {
  const list = $("templatesList");
  list.innerHTML = '<div class="templates-empty">Loading templates...</div>';
  try {
    await ensureValidToken();
    const templates = await sbGet(
      "templates",
      `api_key=eq.${encodeURIComponent(currentApiKey)}&select=*&order=created_at.desc`
    );

    if (!templates || templates.length === 0) {
      list.innerHTML = '<div class="templates-empty">No saved templates yet. Create templates in the CRM.</div>';
      return;
    }
    list.innerHTML = "";
    templates.forEach(t => {
      const el = document.createElement("div");
      el.className = "template-item";
      el.innerHTML = '<div><div class="template-name">' + (t.name || "Untitled") + '</div><div class="template-address">' + (t.address || "") + '</div></div>' + '<span class="template-arrow">&#8250;</span>';
      el.addEventListener("click", () => applyTemplate(t));
      list.appendChild(el);
    });
  } catch (e) {
    console.warn("Failed to load templates:", e);
    list.innerHTML = '<div class="templates-empty">Could not load templates.</div>';
  }
}

function applyTemplate(t) {
  // ââ Basic fields ââ
  if (t.address) $("address").value = t.address;
  if (t.price)   $("price").value = formatUSD(String(t.price));
  if (t.improvements) $("cost").value = formatUSD(String(t.improvements));
  if (t.sqft)    $("sqft").value = t.sqft;
  if (t.radius)  $("radius").value = t.radius;
  if (t.min_comps) $("minComps").value = t.min_comps;
  if (t.max_comps) $("maxComps").value = t.max_comps;
  if (t.status)  $("status").value = t.status;

  // ââ Geocode the address ââ
  if (t.lat && t.lng) {
    resolvedCoords = { lat: t.lat, lng: t.lng };
    resolvedAddress = t.address;
    $("coordsText").textContent = `${t.lat.toFixed(5)}, ${t.lng.toFixed(5)}`;
    $("coordsPill").className = "coords-pill on";
  } else if (t.address) {
    geocodeAddress(t.address);
  }

  // ââ Restore unit mix combos ââ
  // Clear existing selections
  selectedCombos = [];
  document.querySelectorAll(".combo-cb").forEach(cb => {
    cb.checked = false; cb.disabled = false;
    cb.closest(".cb-cell")?.classList.remove("sel");
  });

  if (t.combos && Array.isArray(t.combos)) {
    t.combos.forEach(c => {
      // DB uses "bed"/"bath", extension uses "beds"/"baths"
      const beds = c.beds ?? c.bed;
      const baths = c.baths ?? c.bath;
      const units = c.units || "";
      const type = c.type || TYPES[beds] || "Unknown";

      selectedCombos.push({ beds, baths, type, units: String(units) });

      // Check the corresponding checkbox in the matrix
      const cb = $(`cb_${beds}_${baths}`);
      if (cb) {
        cb.checked = true;
        cb.closest(".cb-cell")?.classList.add("sel");
      }
    });
  }
  updateMatrixBadge();
  updateUnitsPanel();

  // Disable extra checkboxes if at max
  document.querySelectorAll(".combo-cb").forEach(c => {
    if (!c.checked) c.disabled = selectedCombos.length >= MAX_COMBOS;
  });

  // ââ Restore commercial spaces ââ
  selectedCommercial = [];
  if (t.commercial_spaces && Array.isArray(t.commercial_spaces) && t.commercial_spaces.length > 0) {
    selectedCommercial = t.commercial_spaces.map(s => ({
      type: s.type || s.space_type || COMMERCIAL_TYPES[0],
      sqft: String(s.sqft || ""),
      rentPerSF: String(s.rentPerSF || s.rent_per_sf || s.price_per_sqft || ""),
    }));
    $("commercialToggle").checked = true;
    $("commercialPanel").classList.add("on");
    renderCommercialPanel();
  } else {
    $("commercialToggle").checked = false;
    $("commercialPanel").classList.remove("on");
  }

  // Hide templates card and scroll to form
  $("templatesCard").style.display = "none";
  $("address").scrollIntoView({ behavior: "smooth" });
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// INIT
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function loadSettings() {
  // Wire sign-in
  $("signInBtn").addEventListener("click", handleSignIn);
  $("signOutBtn").addEventListener("click", handleSignOut);
  $("newSearchBtn").addEventListener("click", () => { $("templatesCard").style.display = "none"; });

  // Enter to submit sign-in
  $("signInPassword").addEventListener("keydown", e => { if (e.key === "Enter") handleSignIn(); });
  $("signInEmail").addEventListener("keydown", e => { if (e.key === "Enter") handleSignIn(); });

  // Check saved auth â try to restore session
  const saved = await getSavedAuth();
  if (saved.sb_access_token && saved.sb_refresh_token) {
    accessToken = saved.sb_access_token;
    refreshToken = saved.sb_refresh_token;
    tokenExpiresAt = saved.sb_expires_at || 0;
    currentApiKey = saved.sb_api_key;
    currentUserName = saved.sb_user_name;

    // Try to refresh the token silently
    const valid = await ensureValidToken();
    if (valid) {
      await loadPresets();
      renderSearchPresetSelect();
      showSignedIn(currentUserName);
    } else {
      clearSavedAuth();
      showSignedOut();
    }
  } else {
    showSignedOut();
  }
}

function getFormVals() {
  return {
    address:  $("address").value.trim(),
    price:    parseUSD($("price").value),
    cost:     parseUSD($("cost").value),
    sqft:     $("sqft").value.trim(),
    radius:   $("radius").value.trim(),
    minComps: $("minComps").value.trim(),
    maxComps: $("maxComps").value.trim(),
    status:   $("status").value,
  };
}

$("saveBtn").addEventListener("click", () => {
  const vals = getFormVals();
  chrome.storage.sync.set({ ...vals, combos: selectedCombos, commercial: selectedCommercial, commercialToggle: $("commercialToggle").checked }, () => {
    $("saveBtn").textContent = "Saved â";
    setTimeout(() => $("saveBtn").textContent = "Save", 1500);
  });
});

// ââ Validation âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function showErr(id) { $(id).classList.add("on"); }
function hideErr(id) { $(id).classList.remove("on"); }

["minComps","maxComps"].forEach(id => {
  $(id).addEventListener("input", () => {
    const mn = parseInt($("minComps").value), mx = parseInt($("maxComps").value);
    $("compsWarn").className = "warn-banner" + (mn > mx && mx ? " on" : "");
  });
});

function validate(vals) {
  let ok = true;

  if (!isSignedIn()) {
    $("formError").textContent = "You are not signed in. Please sign in first.";
    $("formError").className = "form-error on";
    return false;
  }

  if (!vals.address) { showErr("addressError"); $("address").classList.add("err"); ok = false; }
  else { hideErr("addressError"); $("address").classList.remove("err"); }

  const mn = parseInt(vals.minComps), mx = parseInt(vals.maxComps);
  if (!vals.radius || !vals.minComps || !vals.maxComps) { showErr("paramsError"); ok = false; }
  else if (mn > mx) { showErr("paramsError"); ok = false; }
  else { hideErr("paramsError"); }

  if (!selectedCombos.length) { showErr("comboError"); ok = false; }
  else { hideErr("comboError"); }

  if (selectedCombos.length) {
    if (selectedCombos.some(c => !c.units || parseInt(c.units) < 1)) { showErr("unitsError"); ok = false; }
    else { hideErr("unitsError"); }
  }

  if ($("commercialToggle").checked && selectedCommercial.length) {
    if (selectedCommercial.some(c => !c.sqft || parseInt(c.sqft)<1 || !c.rentPerSF || parseFloat(c.rentPerSF)<=0)) { showErr("commercialError"); ok = false; }
    else { hideErr("commercialError"); }
  } else { hideErr("commercialError"); }

  return ok;
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// IMAGE CAPTURE - Grab hero image from the active listing tab

async function captureListingImage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.url?.startsWith("chrome://")) return null;

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Strategy 1: og:image meta tag (works on Zillow, LoopNet, Crexi, Redfin, Realtor, etc.)
        const og = document.querySelector('meta[property="og:image"]');
        if (og?.content) return og.content;

        // Strategy 2: Twitter card image (fallback, many sites set this too)
        const tw = document.querySelector('meta[name="twitter:image"]');
        if (tw?.content) return tw.content;

        // Strategy 3: Largest visible image on page (last resort)
        let best = null, bestArea = 0;
        for (const img of document.querySelectorAll("img")) {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const area = w * h;
          if (area > bestArea && w >= 300 && h >= 200 && img.src?.startsWith("http")) {
            bestArea = area;
            best = img.src;
          }
        }
        return best;
      },
    });

    return result?.result || null;
  } catch (err) {
    console.warn("Image capture skipped:", err.message);
    return null;
  }
}

// RUN ANALYSIS â Still hits the Render backend (the only backend call)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

$("runBtn").addEventListener("click", async () => {
  const vals = getFormVals();
  $("formError").className = "form-error";
  if (!validate(vals)) return;

  $("runBtn").disabled = true;
  $("runBtn").innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .7s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Runningâ¦`;

  const activeCommercial = $("commercialToggle").checked ? selectedCommercial : [];

  // Save form state locally
  chrome.storage.sync.set({ ...vals, combos: selectedCombos, commercial: selectedCommercial, commercialToggle: $("commercialToggle").checked });

  // Resolve which preset to use
  const chosenPresetName = $("searchPresetSelect")?.value || searchActivePreset || defaultPresetName;
  const chosenPreset = getPreset(chosenPresetName);
  searchActivePreset = chosenPresetName;

  // Capture hero image from the listing page (non-blocking, graceful fallback)
  const imageUrl = await captureListingImage();


  try {
    const body = {
      api_key: currentApiKey,
      address: resolvedAddress || vals.address,
      lat: resolvedCoords?.lat ?? null,
      lng: resolvedCoords?.lng ?? null,
      image_url: imageUrl,
      price: vals.price,
      cost: vals.cost,
      sqft: vals.sqft,
      radius: vals.radius,
      minComps: vals.minComps,
      maxComps: vals.maxComps,
      status: vals.status,
      combos: selectedCombos,
      commercial: activeCommercial,
      assumptions: {
        ltv: chosenPreset.ltv,
        closingPct: chosenPreset.closingPct,
        vacancy: chosenPreset.vacancy,
        opexRatio: chosenPreset.opexRatio,
        intRate: chosenPreset.intRate,
        rentGrowth1: chosenPreset.rentGrowth1,
        otherIncMo: chosenPreset.otherIncMo,
      },
      preset_name: chosenPresetName,
    };

    const res = await fetch(`${RENDER_URL}/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const totalUnits = selectedCombos.reduce((s, c) => s + (parseInt(c.units) || 0), 0);

    const entry = {
      searchId: data.searchId || "â",
      address: vals.address,
      totalUnits,
      combos: selectedCombos,
      commercial: activeCommercial,
      presetName: chosenPresetName,
      timestamp: new Date().toISOString(),
      success: !!data.ok,
      message: data.error || (data.ok ? "Analysis started â results will be emailed to you shortly." : "Unknown error"),
    };
    addToHistory(entry);
    showResults(entry, vals);
  } catch (err) {
    const entry = { searchId: "ERROR", address: vals.address, combos: selectedCombos, commercial: activeCommercial, timestamp: new Date().toISOString(), success: false, message: err.message };
    addToHistory(entry);
    showResults(entry, vals);
  } finally {
    $("runBtn").disabled = false;
    $("runBtn").innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Run Analysis`;
  }
});

// ââ Results ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function showResults(entry, vals) {
  const hero = $("resultHero");
  hero.className = `result-hero ${entry.success ? "ok" : "err"}`;
  $("resultStatus").textContent = entry.success ? "â Analysis Started" : "â Failed";
  $("resultId").textContent = entry.searchId;
  $("resultMeta").textContent = entry.message;
  $("resultsBadge").className = "results-badge" + (entry.success ? "" : " error");
  $("resultsBadge").textContent = entry.success ? "Running" : "Error";

  const details = $("resultDetails");
  details.innerHTML = "";
  [
    ["Address", entry.address],
    ["Total Units", entry.totalUnits || "â"],
    ["Price", vals?.price ? formatUSD(vals.price) : "â"],
    ["Cost", vals?.cost ? formatUSD(vals.cost) : "â"],
    ["Building SqFt", vals?.sqft ? Number(vals.sqft).toLocaleString() + " sqft" : "â"],
    ["Radius", `${vals?.radius || "â"} mi`],
    ["Comps", `${vals?.minComps || "â"} â ${vals?.maxComps || "â"}`],
    ["Status", vals?.status || "â"],
    ["Assumptions", entry.presetName || "â"],
  ].forEach(([label, value]) => {
    const row = document.createElement("div"); row.className = "detail-row";
    row.innerHTML = `<span class="dl">${label}</span><span class="dv">${value}</span>`;
    details.appendChild(row);
  });

  if (entry.combos?.length) {
    const row = document.createElement("div");
    row.className = "detail-row";
    row.style.cssText = "flex-direction:column;align-items:flex-start;gap:6px;";
    row.innerHTML = `<span class="dl">Unit Mix</span>`;
    const tags = document.createElement("div");
    tags.className = "combo-tags";
    entry.combos.forEach(c => {
      const tag = document.createElement("span");
      tag.className = "combo-tag";
      tag.textContent = `${c.type} ${c.beds}bd/${c.baths}ba${c.units ? ` Â· ${c.units}u` : ""}`;
      tags.appendChild(tag);
    });
    row.appendChild(tags);
    details.appendChild(row);
  }

  renderHistory();
  switchView("viewResults");
}

$("backBtn").addEventListener("click", () => { switchView("viewSearch"); });

function handleNewSearch() {
  selectedCombos = [];
  document.querySelectorAll(".combo-cb").forEach(cb => {
    cb.checked=false; cb.disabled=false;
    cb.closest(".cb-cell")?.classList.remove("sel");
  });
  updateMatrixBadge();
  updateUnitsPanel();
  selectedCommercial = [];
  $("commercialToggle").checked=false;
  $("commercialPanel").classList.remove("on");
  renderCommercialPanel();
  chrome.storage.sync.remove(["combos","commercial","commercialToggle"]);
  switchView("viewSearch");
}

$("newSearchBtn2").addEventListener("click", handleNewSearch);

// ââ History ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function addToHistory(entry) {
  chrome.storage.local.get(["searchHistory"], ({ searchHistory }) => {
    const h = searchHistory || [];
    h.unshift(entry);
    chrome.storage.local.set({ searchHistory: h.slice(0, 20) });
  });
}

function renderHistory() {
  chrome.storage.local.get(["searchHistory"], ({ searchHistory }) => {
    const list = $("historyList"), h = searchHistory || [];
    if (!h.length) { list.innerHTML = '<div class="empty-state">No searches yet.</div>'; return; }
    list.innerHTML = "";
    h.slice(0, 8).forEach(entry => {
      const item = document.createElement("div"); item.className = "h-item";
      const d = new Date(entry.timestamp);
      const t = d.toLocaleDateString("en-US",{month:"short",day:"numeric"}) + " Â· " + d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
      item.innerHTML = `<div><div class="h-id">${entry.searchId}</div><div class="h-meta">${entry.address} Â· ${t}</div></div><span class="h-badge ${entry.success?"ok":"err"}">${entry.success?"OK":"ERR"}</span>`;
      list.appendChild(item);
    });
  });
}

// ââ Init âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
buildMatrix();
loadSettings();
wireUSDInputs();
