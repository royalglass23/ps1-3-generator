(function () {
  'use strict';

  // Injected by wp_localize_script
  const AJAX  = RGPSConfig.ajaxUrl;
  const NONCE = RGPSConfig.nonce;
  let unicodeFontBytes;

  async function getUnicodeFontBytes() {
    if (unicodeFontBytes) return unicodeFontBytes;
    const response = await fetch(RGPSConfig.fontUrl);
    if (!response.ok) throw new Error('Unicode PDF font could not be loaded.');
    unicodeFontBytes = new Uint8Array(await response.arrayBuffer());
    return unicodeFontBytes;
  }

  // ── System config (mirrors systemConfig.js) ────────────────────────
  const SYSTEMS = {
    'mini-post': {
      displayName:      'Mini Post',
      templateFile:     'MP_PS1_2026.pdf',
      poolTemplateFile: 'MP_PS1_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.26', heightAboveFix: '1.05' },
        default: { height: '1.01', heightAboveFix: '0.85' },
      },
    },
    'double-disc': {
      displayName:  'Double Disc',
      templateFile: 'DD_PS1_2026.pdf',
      poolTemplateFile: 'DD_PS1_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.20', heightAboveFix: '1.25' },
        default: { height: '1.00', heightAboveFix: '1.05' },
      },
    },
    'side-channel': {
      displayName:  'Side Mount Channel',
      templateFile: 'Side_Channel_PS1_Template.pdf',
      poolTemplateFile: 'Side_Channel_PS1_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
    'hidden': {
      displayName:  'Hidden Face',
      templateFile: 'Hidden_PS1_Template.pdf',
      poolTemplateFile: 'Hidden_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.26', heightAboveFix: '1.05' },
        default: { height: '1.01', heightAboveFix: '0.85' },
      },
    },
    'top-channel': {
      displayName:  'Top Mount Channel',
      templateFile: 'Top_Channel_PS1_Template.pdf',
      poolTemplateFile: 'Top_Channel_PS1_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
    'viking-aluminium': {
      displayName:  'Viking Aluminium',
      templateFile: 'Juralco_Viking_Aluminium.pdf',
      poolTemplateFile: 'Juralco_Viking_Aluminium_POOL.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
    'viking-glass': {
      displayName:  'Viking Glass',
      templateFile: 'Juralco_Viking_Glass.pdf',
      poolTemplateFile: 'Juralco_Viking_Glass_POOL.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
    'jh-clamp': {
      displayName:  'JH Clamp',
      templateFile: 'Jur_JH_Clamp_Template.pdf',
      poolTemplateFile: 'Jur_JH_Clamp_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
    'vista': {
      displayName:  'Vista',
      templateFile: 'Opus_Vista_Template.pdf',
      poolTemplateFile: 'Opus_Vista_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
    'mp-sp14': {
      displayName:  'Mini Post SP14',
      templateFile: 'Opus_MP_SP14_Template.pdf',
      poolTemplateFile: 'Opus_MP_SP14_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
    'lugano': {
      displayName:  'Lugano',
      templateFile: 'Opus_Lugano_Template.pdf',
      poolTemplateFile: 'Opus_Lugano_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
    'unex-ascot': {
      displayName:  'Unex Ascot',
      templateFile: 'Unex_Ascot_Template.pdf',
      poolTemplateFile: 'Unex_Ascot_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
    'unex-metropolis': {
      displayName:  'Unex Metropolis',
      templateFile: 'Unex_Metropolis_Template.pdf',
      poolTemplateFile: 'Unex_Metropolis_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
  };

  const POOL_STRUCTURES = ['Pool', 'Pool Area', 'Pool Fence'];
  const NON_GLASS_SYSTEMS = ['viking-aluminium', 'unex-ascot'];
  const MAX_SCOPE_ROWS = 5;
  const SCOPE_STRUCTURES = [
    { value: 'Deck', label: 'Deck' },
    { value: 'Balcony', label: 'Balcony' },
    { value: 'Stair', label: 'Stair' },
    { value: 'Landing', label: 'Landing' },
    { value: 'Pool', label: 'Pool Area' },
  ];
  let scopeRows = [createEmptyScopeRow()];
  let scopeValidationAttempted = false;

  function createEmptyScopeRow() {
    return { location: '', structures: [], structureMenuOpen: false };
  }

  function getSystem(key) {
    const s = SYSTEMS[key];
    if (!s) throw new Error('Unknown system: ' + key);
    return s;
  }

  function getHeights(systemKey, structure) {
    const s      = getSystem(systemKey);
    const bucket = POOL_STRUCTURES.includes(structure) ? 'pool' : 'default';
    return s.heights[bucket];
  }

  function getScopeState(rows) {
    const normalisedRows = rows.map(row => ({
      location: row.location,
      structures: [...new Set(row.structures)].filter(value => SCOPE_STRUCTURES.some(option => option.value === value)),
    }));
    const selectedRows = normalisedRows.filter(row => row.location && row.structures.length);
    const locations = [...new Set(selectedRows.map(row => row.location))];
    const structureLabels = selectedRows.map(row => scopeStructureLabel(row.structures));
    const combinedAreaList = selectedRows
      .map((row, index) => row.location + ' ' + structureLabels[index] + ' Area')
      .join(' and ');
    const poolSelected = normalisedRows.some(row => row.structures.includes('Pool'));
    const poolExclusive = !poolSelected || (normalisedRows.length === 1 && normalisedRows[0].structures.length === 1);

    return {
      rows: normalisedRows,
      combinedAreaList,
      location: locations.length === 2 ? 'Internal and External' : (locations[0] || ''),
      structure: structureLabels.join(' and '),
      isPool: poolSelected,
      canSelectPool: normalisedRows.length === 1 && normalisedRows[0].structures.every(value => value === 'Pool'),
      canAddScope: !poolSelected && normalisedRows.length < MAX_SCOPE_ROWS,
      isComplete: normalisedRows.every(row => row.location && row.structures.length),
      isValid: normalisedRows.every(row => row.location && row.structures.length) && poolExclusive,
    };
  }

  function buildScopeSummary(rows) {
    const state = getScopeState(rows);
    return {
      combinedAreaList: state.combinedAreaList,
      location: state.location,
      structure: state.structure,
      isPool: state.isPool,
      canAddScope: state.canAddScope,
      isComplete: state.isComplete,
      isValid: state.isValid,
    };
  }

  function buildDescription(thickness, glassType, scope, newOrExisting, systemKey) {
    const suffix  = ' installation for ' + scope.combinedAreaList + ' using ' + getSystem(systemKey).displayName + ' System';
    // Aluminium systems have no glass, but retain the shared installation context.
    if (glassType === 'None') {
      const product = scope.isPool ? 'Aluminium pool fence' : 'Aluminium balustrade';
      return newOrExisting + ' ' + product + suffix;
    }
    return newOrExisting + ' ' + thickness + 'mm ' + glassType + ' Glass' + suffix;
  }

  // Available only to the browserless regression tests; not created in production.
  if (window.RGPS_TEST_API) {
    window.RGPS_TEST_API.buildDescription = buildDescription;
    window.RGPS_TEST_API.buildScopeSummary = buildScopeSummary;
    window.RGPS_TEST_API.fillPS1 = fillPS1;
    window.RGPS_TEST_API.fillPS3 = fillPS3;
  }

  function buildShortDescription(scope, systemKey) {
    return 'New ' + scope.combinedAreaList + ' ' + getSystem(systemKey).displayName + ' Glass Balustrade';
  }

  // ── Helpers ────────────────────────────────────────────────────────
  function today() {
    const d  = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '/' + mm + '/' + d.getFullYear();
  }

  function sanitizeFilename(name) {
    return name.replace(/[/\\?%*:|"<>\r\n\0]/g, '-').replace(/\.\./g, '--').trim();
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function el(id) { return document.getElementById(id); }

  function scopeStructureLabel(structures) {
    return [...new Set(structures)]
      .filter(value => SCOPE_STRUCTURES.some(option => option.value === value))
      .join(' and ');
  }

  function scopeRowValidationMessage(row) {
    if (row.location && row.structures.length) return '';
    if (!row.location && !row.structures.length) return 'Choose a location and at least one structure type.';
    return row.location ? 'Choose at least one structure type.' : 'Choose Internal or External.';
  }

  function renderScopeRows() {
    const container = el('rgps-scope-rows');
    const addButton = el('rgps-btn-add-scope');
    if (!container || !addButton) return;

    const scope = getScopeState(scopeRows);
    const poolSelectable = scope.canSelectPool;
    container.innerHTML = scopeRows.map((row, index) => {
      const locationName = 'rgps-scope-location-' + index;
      const structureInputs = SCOPE_STRUCTURES.map(option => {
        const checked = row.structures.includes(option.value) ? ' checked' : '';
        const disabled = option.value === 'Pool' && !poolSelectable ? ' disabled' : '';
        return '<label><input type="checkbox" data-scope-structure value="' + option.value + '"' + checked + disabled + ' /> ' + option.label + '</label>';
      }).join('');
      const menuId = 'rgps-scope-structure-menu-' + index;
      const selectedStructures = scopeStructureLabel(row.structures) || 'Choose structure types';
      const menuHidden = row.structureMenuOpen ? '' : ' hidden';
      const validationMessage = scopeValidationAttempted ? scopeRowValidationMessage(row) : '';
      const removeButton = scopeRows.length > 1
        ? '<button type="button" class="rgps-btn rgps-btn-remove-scope" data-remove-scope>Remove</button>'
        : '';
      return '<fieldset class="rgps-scope-row" data-scope-index="' + index + '">' +
        '<div class="rgps-scope-row-header"><span class="rgps-scope-row-title">Area ' + (index + 1) + '</span>' + removeButton + '</div>' +
        '<div class="rgps-scope-row-grid">' +
          '<div class="rgps-field"><label>Location</label><div class="rgps-radio-group">' +
            '<label><input type="radio" name="' + locationName + '" data-scope-location value="Internal"' + (row.location === 'Internal' ? ' checked' : '') + ' /> Internal</label>' +
            '<label><input type="radio" name="' + locationName + '" data-scope-location value="External"' + (row.location === 'External' ? ' checked' : '') + ' /> External</label>' +
          '</div></div>' +
          '<div class="rgps-field"><label>Structure types</label><div class="rgps-scope-structure-picker">' +
            '<button type="button" class="rgps-scope-structure-toggle" data-scope-structure-toggle aria-controls="' + menuId + '" aria-expanded="' + String(Boolean(row.structureMenuOpen)) + '"><span class="rgps-scope-structure-toggle-label">' + selectedStructures + '</span></button>' +
            '<div id="' + menuId + '" class="rgps-scope-structure-menu"' + menuHidden + '>' + structureInputs + '</div>' +
          '</div></div>' +
          (validationMessage ? '<p class="rgps-scope-error">' + validationMessage + '</p>' : '') +
        '</div></fieldset>';
    }).join('');

    addButton.disabled = !scope.canAddScope;
    const isPool = scope.isPool;
    document.querySelector('input[name="rgps-requiresGate"][value="Yes"]').checked = isPool;
    document.querySelector('input[name="rgps-requiresGate"][value="No"]').checked = !isPool;
  }

  function updateScopeRow(target) {
    const rowElement = target.closest('[data-scope-index]');
    if (!rowElement) return;
    const index = Number(rowElement.dataset.scopeIndex);
    const row = scopeRows[index];
    if (!row) return;

    if (target.hasAttribute('data-scope-location')) {
      row.location = target.value;
    } else if (target.hasAttribute('data-scope-structure')) {
      if (target.checked) {
        row.structures = target.value === 'Pool' ? ['Pool'] : row.structures.filter(value => value !== 'Pool').concat(target.value);
      } else {
        row.structures = row.structures.filter(value => value !== target.value);
      }
      if (row.structures.includes('Pool')) {
        row.structureMenuOpen = false;
        scopeRows = [row];
      } else {
        row.structureMenuOpen = true;
      }
    }
    scopeValidationAttempted = false;
    renderScopeRows();
  }

  function toggleScopeStructureMenu(target) {
    const rowElement = target.closest('[data-scope-index]');
    if (!rowElement) return;
    const row = scopeRows[Number(rowElement.dataset.scopeIndex)];
    if (!row) return;
    row.structureMenuOpen = !row.structureMenuOpen;
    renderScopeRows();
  }

  const GLASS_THICKNESS_DEFAULTS = {
    Toughened: '12',
    Laminated: '13.52',
    None: '',
  };

  function applyGlassThicknessDefault(glassType) {
    if (Object.hasOwn(GLASS_THICKNESS_DEFAULTS, glassType)) {
      el('rgps-thickness').value = GLASS_THICKNESS_DEFAULTS[glassType];
    }
  }

  // ── Session token (localStorage) ──────────────────────────────────
  const TOKEN_KEY = 'rgps_token';
  function getToken()   { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t)  { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  // ── AJAX wrapper ───────────────────────────────────────────────────
  async function ajax(action, params = {}, method = 'POST') {
    const fd = new FormData();
    fd.append('action', action);
    fd.append('nonce',  NONCE);
    fd.append('token',  getToken());
    Object.entries(params).forEach(([k, v]) => fd.append(k, v));

    const res = await fetch(AJAX, { method, body: fd });
    return res.json();
  }

  // ── Fetch template bytes from PHP ──────────────────────────────────
  async function fetchTemplate(name) {
    const url = AJAX + '?action=rgps_template&token=' + encodeURIComponent(getToken()) + '&name=' + encodeURIComponent(name);
    const res = await fetch(url);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to fetch template');
    const binary = atob(json.data);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // ── PDF filling (mirrors pdfFiller.js) ────────────────────────────
  async function fillPS1(templateFile, data, heights) {
    const { PDFDocument } = PDFLib;
    const templateBytes   = await fetchTemplate(templateFile);
    const pdf  = await PDFDocument.load(templateBytes);
    pdf.registerFontkit(fontkit);
    const unicodeFont = await pdf.embedFont(await getUnicodeFontBytes(), { subset: true });
    const form = pdf.getForm();
    const date = today();

    function setText(name, value) {
      try { form.getTextField(name).setText(value || ''); } catch (_) {}
    }
    function setMultilineText(name, value) {
      try {
        const field = form.getTextField(name);
        field.enableMultiline();
        field.setText(value || '');
      } catch (_) {}
    }
    function setRequiredMultilineText(name, value) {
      const field = form.getTextField(name);
      field.enableMultiline();
      field.setText(value || '');
    }
    function setCheck(name, checked) {
      try { const cb = form.getCheckBox(name); checked ? cb.check() : cb.uncheck(); } catch (_) {}
    }

    setText('Name',            data.clientName);
    setText('Address',         data.address);
    setRequiredMultilineText('Description', data.longDescription);
    setText('Date0',           date);
    setText('Date01',          date);
    setText('Date-4',          date);
    setText('Name-2',          data.clientName);
    setText('Address-2',       data.address);
    setText('Address02',       data.address);
    setText('Address-4',       data.address);
    setMultilineText('Description02',  data.longDescription);
    setText('LotDescription02', data.lotDescription || '');
    setText('Structure02',     data.combinedAreaList);
    setText('Thickness',       data.thickness);
    setText('Height',          heights.height);
    setText('HeightAboveFix',  heights.heightAboveFix);

    setCheck('TimberTB',    data.substrate === 'Timber');
    setCheck('ConcreteTB',  data.substrate === 'Concrete');
    setCheck('SteelTB',     data.substrate === 'Steel');
    setCheck('InternalTB',  data.location === 'Internal' || data.location === 'Internal and External');
    setCheck('ExternalTB',  data.location === 'External' || data.location === 'Internal and External');
    setCheck('NewTB',       data.newOrExisting === 'New');
    setCheck('ExistingTB',  data.newOrExisting === 'Existing');
    setCheck('ToughenedTB', data.glassType === 'Toughened');
    setCheck('LaminatedTB', data.glassType === 'Laminated');
    setCheck('Direct',      true);
    setCheck('Cont',        true);

    form.updateFieldAppearances(unicodeFont);
    form.flatten();
    return pdf.save();
  }

  async function fillPS3(data) {
    const { PDFDocument } = PDFLib;
    const templateBytes   = await fetchTemplate('PS3_Template.pdf');
    const pdf  = await PDFDocument.load(templateBytes);
    pdf.registerFontkit(fontkit);
    const unicodeFont = await pdf.embedFont(await getUnicodeFontBytes(), { subset: true });
    const form = pdf.getForm();

    function setText(name, value) {
      try { form.getTextField(name).setText(value || ''); } catch (_) {}
    }
    function setMultilineText(name, value) {
      try {
        const field = form.getTextField(name);
        field.enableMultiline();
        field.setText(value || '');
      } catch (_) {}
    }
    function setRequiredMultilineText(name, value) {
      const field = form.getTextField(name);
      field.enableMultiline();
      field.setText(value || '');
    }
    function setCheck(name, checked) {
      try { const cb = form.getCheckBox(name); checked ? cb.check() : cb.uncheck(); } catch (_) {}
    }

    setText('BC',           data.bcNumber || '');
    setText('Address02',    data.address);
    setRequiredMultilineText('Description3', data.combinedAreaList || (data.location + ' ' + data.structure));
    setRequiredMultilineText('Description2', data.longDescription);
    setText('Date03',       today());
    setText('Legal',        data.lotDescription || '');

    setCheck('B1TB',    true);
    setCheck('B2TB',    false);
    setCheck('F4TB',    true);
    setCheck('GlassTB', true);
    setCheck('PS1TB',   true);

    form.updateFieldAppearances(unicodeFont);
    form.flatten();
    return pdf.save();
  }

  // ── Trigger browser download ───────────────────────────────────────
  function triggerDownload(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function triggerTextDownload(text, filename, type) {
    const blob = new Blob([text], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ── Read form values ───────────────────────────────────────────────
  function formData() {
    const scope = getScopeState(scopeRows);
    return {
      clientName:     el('rgps-clientName').value.trim(),
      address:        el('rgps-address').value.trim(),
      bcNumber:       el('rgps-bcNumber').value.trim(),
      lotDescription: el('rgps-lotDescription').value.trim(),
      thickness:      el('rgps-thickness').value,
      system:         el('rgps-system').value,
      substrate:      el('rgps-substrate').value,
      scopeRows:      scope.rows,
      scope,
      combinedAreaList: scope.combinedAreaList,
      structure:      scope.structure,
      location:       scope.location,
      isPool:         scope.isPool,
      glassType:     el('rgps-glassType').value || 'Toughened',
      newOrExisting: el('rgps-newOrExisting').value || 'New',
    };
  }

  // ── Generate ───────────────────────────────────────────────────────
  async function generate(mode) {
    const status = el('rgps-status');
    const fd     = formData();

    if (!fd.clientName) {
      status.className = 'rgps-status-error';
      status.textContent = 'Client / Designer Name is required.';
      el('rgps-clientName').focus();
      return;
    }
    if (!fd.address) {
      status.className = 'rgps-status-error';
      status.textContent = 'Property Address is required.';
      el('rgps-address').focus();
      return;
    }
    if (!fd.scope.isComplete) {
      scopeValidationAttempted = true;
      renderScopeRows();
      status.className = 'rgps-status-error';
      status.textContent = 'Complete the highlighted area rows before generating.';
      return;
    }
    if (!fd.scope.isValid) {
      status.className = 'rgps-status-error';
      status.textContent = 'A Pool Area must be the only area in this document.';
      return;
    }

    const btns = document.querySelectorAll('#rgps-app .rgps-btn');
    btns.forEach(b => b.disabled = true);
    status.className   = '';
    status.textContent = 'Generating…';

    try {
      const sys     = getSystem(fd.system);
      const heights = getHeights(fd.system, fd.isPool ? 'Pool' : fd.structure);
      const data    = {
        ...fd,
        longDescription: buildDescription(fd.thickness, fd.glassType, fd.scope, fd.newOrExisting, fd.system),
        shortDescription: buildShortDescription(fd.scope, fd.system),
      };

      const logFields = {
        client_name:     fd.clientName,
        address:         fd.address,
        bc_number:       fd.bcNumber,
        lot_description: fd.lotDescription,
        system_type:     fd.system,
        substrate:       fd.substrate,
        structure:       fd.combinedAreaList,
        location:        fd.location,
        scope_rows:      JSON.stringify(fd.scopeRows),
        new_or_existing: fd.newOrExisting,
        thickness:       fd.thickness,
        glass_type:      fd.glassType,
      };

      const isPool = fd.isPool;
      let templateFile;

      async function logGeneration(fields) {
        const result = await ajax('rgps_log', fields);
        if (!result.ok) throw new Error(result.error || 'The PDF could not be logged, so its download was cancelled.');
      }

      if (isPool) {
        if (!sys.poolTemplateFile) {
          throw new Error('NO POOL TEMPLATE DEFINED. ASK ADMINISTRATOR.');
        }
        templateFile = sys.poolTemplateFile;
      } else {
        templateFile = sys.templateFile;
      }

      if (mode === 'ps3') {
        const bytes    = await fillPS3(data);
        const filename = sanitizeFilename(fd.address + ' - PS3.pdf');
        await logGeneration({ ...logFields, ps: 'PS3', filename });
        triggerDownload(bytes, filename);

      } else if (mode === 'ps1') {
        const bytes    = await fillPS1(templateFile, data, heights);
        const filename = sanitizeFilename(fd.address + ' - PS1.pdf');
        await logGeneration({ ...logFields, ps: 'PS1', filename });
        triggerDownload(bytes, filename);

      } else {
        // both
        const [ps3Bytes, ps1Bytes] = await Promise.all([
          fillPS3(data),
          fillPS1(templateFile, data, heights),
        ]);
        const ps3File = sanitizeFilename(fd.address + ' - PS3.pdf');
        const ps1File = sanitizeFilename(fd.address + ' - PS1.pdf');
        await logGeneration({ ...logFields, ps: 'Both', filename: ps1File });
        triggerDownload(ps3Bytes, ps3File);
        triggerDownload(ps1Bytes, ps1File);
      }

      status.className   = 'rgps-status-ok';
      status.textContent = mode === 'both' ? '2 PDFs downloaded.' : 'PDF downloaded.';

    } catch (err) {
      status.className   = 'rgps-status-error';
      status.textContent = err.message || 'An error occurred.';
    } finally {
      btns.forEach(b => b.disabled = false);
    }
  }

  // ── CSV export ────────────────────────────────────────────────────
  const EXPORT_COOLDOWN = 30;
  let exportCooldownTimer = null;

  function csvEscape(val) {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  }

  async function exportCSV() {
    const btn = el('rgps-btn-export');
    if (btn.disabled) return;

    btn.disabled = true;

    try {
      const json = await ajax('rgps_export', {});
      if (!json.ok) throw new Error(json.error || 'Export failed');

      const headers = ['Date','Client','Address','BC Number','System Type','Substrate','Structure','Location','Built','Thickness','Glass Type','PS'];
      const rows = (json.rows || []).map(r => {
        const date = new Date(r.created_at).toLocaleString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        return [
          date,
          r.client_name,
          r.address,
          r.bc_number || '',
          r.system_type,
          r.substrate,
          r.structure,
          r.location,
          r.new_or_existing,
          r.thickness || '',
          r.glass_type,
          r.ps,
        ].map(csvEscape).join(',');
      });

      const csv  = [headers.map(csvEscape).join(','), ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = 'ps-records-' + dateStr + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      btn.disabled = false;
      alert('Export failed: ' + (err.message || 'Unknown error'));
      return;
    }

    let remaining = EXPORT_COOLDOWN;
    btn.textContent = 'Export CSV (' + remaining + 's)';
    exportCooldownTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(exportCooldownTimer);
        btn.disabled    = false;
        btn.textContent = 'Export CSV';
      } else {
        btn.textContent = 'Export CSV (' + remaining + 's)';
      }
    }, 1000);
  }

  // ── Records table + pagination ────────────────────────────────────
  let recordsPage  = 1;
  let recordsLimit = 10;
  let recordsTotal = 0;

  function recordDate(value) {
    return new Date(value).toLocaleString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function todayYmd() {
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function startExportCooldown(btn) {
    let remaining = 30;
    btn.disabled = true;
    btn.textContent = 'Export CSV (' + remaining + 's)...';
    const timer = setInterval(function () {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = 'Export CSV';
        return;
      }
      btn.textContent = 'Export CSV (' + remaining + 's)...';
    }, 1000);
  }

  async function exportCSV(btn) {
    startExportCooldown(btn);
    try {
      const json = await ajax('rgps_export', {});
      if (!json.ok) throw new Error(json.error || 'Failed to export records');

      const headers = ['Date', 'Client', 'Address', 'BC Number', 'System Type', 'Substrate', 'Structure', 'Location', 'Built', 'Thickness', 'Glass Type', 'PS'];
      const rows = (json.rows || []).map(r => [
        recordDate(r.created_at),
        r.client_name,
        r.address,
        r.bc_number,
        r.system_type,
        r.substrate,
        r.structure,
        r.location,
        r.new_or_existing,
        r.thickness,
        r.glass_type,
        r.ps,
      ]);
      const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
      triggerTextDownload('\ufeff' + csv, 'ps-records-' + todayYmd() + '.csv', 'text/csv;charset=utf-8');
    } catch (err) {
      window.alert(err.message || 'Could not export records.');
    }
  }

  async function loadRecords() {
    const tbody = el('rgps-records-body');
    try {
      const json = await ajax('rgps_records', { page: recordsPage, per_page: recordsLimit });
      if (!json.ok) throw new Error(json.error || 'Failed to load');

      recordsTotal = json.total || 0;
      const totalPages = Math.max(1, Math.ceil(recordsTotal / recordsLimit));

      const infoEl = el('rgps-records-info');
      const prevEl = el('rgps-btn-prev');
      const nextEl = el('rgps-btn-next');
      if (infoEl) infoEl.textContent = recordsTotal + ' record' + (recordsTotal !== 1 ? 's' : '') + ' — page ' + recordsPage + ' of ' + totalPages;
      if (prevEl) prevEl.disabled = recordsPage <= 1;
      if (nextEl) nextEl.disabled = recordsPage >= totalPages;

      if (!json.rows || !json.rows.length) {
        tbody.innerHTML = '<tr><td colspan="12" style="color:#71717a;">No records yet.</td></tr>';
        return;
      }
      tbody.innerHTML = json.rows.map(r => {
        const date   = recordDate(r.created_at);
        const psMap  = { PS1: 'rgps-tag-ps1', PS3: 'rgps-tag-ps3', Both: 'rgps-tag-both' };
        const psVal  = r.ps || 'PS1';
        const psTag  = '<span class="rgps-tag ' + (psMap[psVal] || 'rgps-tag-ps1') + '">' + esc(psVal) + '</span>';
        const glMap  = { Toughened: 'rgps-tag-ps1', Laminated: 'rgps-tag-ps3', None: 'rgps-tag-ps3' };
        const glVal  = r.glass_type || 'Toughened';
        const glTag  = '<span class="rgps-tag ' + (glMap[glVal] || 'rgps-tag-ps1') + '">' + esc(glVal) + '</span>';
        return '<tr>' +
          '<td>' + date + '</td>' +
          '<td>' + esc(r.client_name) + '</td>' +
          '<td>' + esc(r.address) + '</td>' +
          '<td>' + esc(r.bc_number || '—') + '</td>' +
          '<td>' + esc(r.system_type) + '</td>' +
          '<td>' + esc(r.substrate) + '</td>' +
          '<td>' + esc(r.structure) + '</td>' +
          '<td>' + esc(r.location) + '</td>' +
          '<td>' + esc(r.new_or_existing) + '</td>' +
          '<td>' + esc(r.thickness || '—') + '</td>' +
          '<td>' + glTag + '</td>' +
          '<td>' + psTag + '</td>' +
        '</tr>';
      }).join('');
    } catch {
      tbody.innerHTML = '<tr><td colspan="12" style="color:#dc2626;">Could not load records.</td></tr>';
    }
  }

  // ── Auth ───────────────────────────────────────────────────────────
  async function submitPassword() {
    const errEl = el('rgps-password-error');
    errEl.textContent  = '';
    errEl.style.display = 'none';
    try {
      const pwd = el('rgps-pwd-input').value;
      const fd  = new FormData();
      fd.append('action',   'rgps_auth');
      fd.append('nonce',    NONCE);
      fd.append('password', pwd);
      const res  = await fetch(AJAX, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.ok) {
        setToken(json.token);
        showApp();
      } else {
        errEl.textContent   = json.error || 'Incorrect password.';
        errEl.style.display = 'block';
      }
    } catch {
      errEl.textContent   = 'Could not reach the server.';
      errEl.style.display = 'block';
    }
  }

  function showApp() {
    el('rgps-password-gate').style.display = 'none';
    el('rgps-app').style.display = 'block';
  }

  function showRecordsView() {
    el('rgps-form-view').style.display = 'none';
    el('rgps-records-view').style.display = 'block';
    el('rgps-root').classList.add('rgps-db-open');
    recordsPage = 1;
    loadRecords();
  }

  function showFormView() {
    el('rgps-records-view').style.display = 'none';
    el('rgps-form-view').style.display = 'block';
    el('rgps-root').classList.remove('rgps-db-open');
  }

  function clearForm() {
    el('rgps-clientName').value   = '';
    el('rgps-address').value      = '';
    el('rgps-bcNumber').value     = '';
    el('rgps-lotDescription').value = '';
    el('rgps-system').value       = 'mini-post';
    el('rgps-substrate').value    = 'Timber';
    el('rgps-thickness').value    = '12';
    scopeRows = [createEmptyScopeRow()];
    scopeValidationAttempted = false;
    renderScopeRows();
    el('rgps-newOrExisting').value = 'New';
    document.querySelector('input[name="rgps-requiresGate"][value="No"]').checked      = true;
    el('rgps-glassType').value = 'Toughened';
    el('rgps-status').textContent = '';
    el('rgps-status').className   = '';
    el('rgps-clientName').focus();
  }

  // ── Boot ───────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Check existing session
    if (getToken()) {
      ajax('rgps_records').then(json => {
        if (json.ok) showApp();
        else clearToken();
      }).catch(() => {});
    }

    // Sign in button
    el('rgps-signin-btn').addEventListener('click', submitPassword);
    el('rgps-pwd-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitPassword(); });

    // Generate buttons
    document.querySelectorAll('#rgps-app .rgps-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => generate(btn.dataset.mode));
    });

    // PS Database / Clear / Back buttons
    el('rgps-btn-database').addEventListener('click', showRecordsView);
    el('rgps-btn-clear').addEventListener('click', clearForm);
    el('rgps-btn-back').addEventListener('click', showFormView);
    renderScopeRows();
    el('rgps-btn-add-scope').addEventListener('click', function () {
      if (buildScopeSummary(scopeRows).canAddScope) {
        scopeRows.push(createEmptyScopeRow());
        scopeValidationAttempted = false;
        renderScopeRows();
      }
    });
    el('rgps-scope-rows').addEventListener('change', function (event) {
      if (event.target.hasAttribute('data-scope-location') || event.target.hasAttribute('data-scope-structure')) updateScopeRow(event.target);
    });
    el('rgps-scope-rows').addEventListener('click', function (event) {
      const toggle = event.target.closest('[data-scope-structure-toggle]');
      if (toggle) {
        toggleScopeStructureMenu(toggle);
        return;
      }
      if (!event.target.hasAttribute('data-remove-scope')) return;
      const rowElement = event.target.closest('[data-scope-index]');
      if (!rowElement) return;
      scopeRows.splice(Number(rowElement.dataset.scopeIndex), 1);
      if (!scopeRows.length) scopeRows = [createEmptyScopeRow()];
      scopeValidationAttempted = false;
      renderScopeRows();
    });
    // Apply the usual thickness for each glass type when selected, while
    // keeping the thickness dropdown available for a manual override.
    el('rgps-glassType').addEventListener('change', function () {
      applyGlassThicknessDefault(this.value);
    });
    // Aluminium baluster systems carry no glass: auto-select "Not Glass".
    // The dropdown remains editable so staff can override the default when required.
    el('rgps-system').addEventListener('change', function () {
      const glassVal = NON_GLASS_SYSTEMS.includes(this.value) ? 'None' : 'Toughened';
      el('rgps-glassType').value = glassVal;
      applyGlassThicknessDefault(glassVal);
    });

    // Pagination controls
    const limitSel = el('rgps-records-limit');
    const prevBtn  = el('rgps-btn-prev');
    const nextBtn  = el('rgps-btn-next');
    const exportBtn = el('rgps-btn-export');
    if (limitSel) limitSel.addEventListener('change', function () {
      recordsLimit = parseInt(this.value, 10);
      recordsPage  = 1;
      loadRecords();
    });
    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (recordsPage > 1) { recordsPage--; loadRecords(); }
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (recordsPage < Math.ceil(recordsTotal / recordsLimit)) { recordsPage++; loadRecords(); }
    });
    if (exportBtn) exportBtn.addEventListener('click', function () {
      exportCSV(exportBtn);
    });
  });

})();

// ── Google Places autocomplete (NZ only) ─────────────────────────────
window.rgpsInitPlaces = function () {
  const input = document.getElementById('rgps-address');
  if (!input || !window.google) return;
  const ac = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: 'nz' },
    fields: ['formatted_address'],
  });
  ac.addListener('place_changed', function () {
    const place = ac.getPlace();
    if (place.formatted_address) input.value = place.formatted_address;
  });
};
