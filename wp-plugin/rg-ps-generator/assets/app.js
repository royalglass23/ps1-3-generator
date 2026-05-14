(function () {
  'use strict';

  // Injected by wp_localize_script
  const AJAX  = RGPSConfig.ajaxUrl;
  const NONCE = RGPSConfig.nonce;

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
    'top-channel': {
      displayName:  'Top Mount Channel',
      templateFile: 'Top_Channel_PS1_Template.pdf',
      poolTemplateFile: 'Top_Channel_PS1_POOL_Template.pdf',
      heights: {
        pool:    { height: '1.2', heightAboveFix: '1.2' },
        default: { height: '1.00', heightAboveFix: '1.00' },
      },
    },
  };

  const POOL_STRUCTURES = ['Pool', 'Pool Fence'];

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

  function buildDescription(thickness, glassType, structure, newOrExisting, location,systemKey) {
    const isPool  = POOL_STRUCTURES.includes(structure);
    const product = isPool ? 'Pool Fencing' : 'Balustrade';
    return thickness + 'mm ' + glassType + ' ' + product + ' installation for ' + newOrExisting + ' ' + location + ' ' + structure + ' area using ' + getSystem(systemKey).displayName + ' System';
  }

  function buildShortDescription(structure, systemKey) {
    return 'New ' + structure + ' ' + getSystem(systemKey).displayName + ' Glass Balustrade';
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
    function setCheck(name, checked) {
      try { const cb = form.getCheckBox(name); checked ? cb.check() : cb.uncheck(); } catch (_) {}
    }

    setText('Name',            data.clientName);
    setText('Address',         data.address);
    setMultilineText('Description',     data.longDescription);
    setText('Date0',           date);
    setText('Date01',          date);
    setText('Date-4',          date);
    setText('Name-2',          data.clientName);
    setText('Address-2',       data.address);
    setText('Address02',       data.address);
    setText('Address-4',       data.address);
    setText('Thickness',       data.thickness || '12');
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
    setCheck('Cont',        false);

    form.flatten();
    return pdf.save();
  }

  async function fillPS3(data) {
    const { PDFDocument } = PDFLib;
    const templateBytes   = await fetchTemplate('PS3_Template.pdf');
    const pdf  = await PDFDocument.load(templateBytes);
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
    function setCheck(name, checked) {
      try { const cb = form.getCheckBox(name); checked ? cb.check() : cb.uncheck(); } catch (_) {}
    }

    setText('BC',           data.bcNumber || '');
    setText('Address02',    data.address);
    setMultilineText('Description3', data.location + ' ' + data.structure);
    setMultilineText('Description2', data.longDescription);
    setText('Date03',       today());
    setText('Legal',        data.lotDescription || '');

    setCheck('B1TB',    true);
    setCheck('B2TB',    false);
    setCheck('F4TB',    true);
    setCheck('GlassTB', true);
    setCheck('PS1TB',   true);

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

  // ── Read form values ───────────────────────────────────────────────
  function formData() {
    const locationChecks = Array.from(document.querySelectorAll('input[name="rgps-location"]:checked')).map(cb => cb.value);
    return {
      clientName:     el('rgps-clientName').value.trim(),
      address:        el('rgps-address').value.trim(),
      bcNumber:       el('rgps-bcNumber').value.trim(),
      lotDescription: el('rgps-lotDescription').value.trim(),
      thickness:      el('rgps-thickness').value,
      system:         el('rgps-system').value,
      substrate:      el('rgps-substrate').value,
      structure:      el('rgps-structure').value,
      location:      locationChecks.length === 2 ? 'Internal and External' : (locationChecks[0] || 'External'),
      glassType:     document.querySelector('input[name="rgps-glassType"]:checked')?.value || 'Toughened',
      newOrExisting: document.querySelector('input[name="rgps-newOrExisting"]:checked').value || 'New',
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

    const btns = document.querySelectorAll('#rgps-app .rgps-btn');
    btns.forEach(b => b.disabled = true);
    status.className   = '';
    status.textContent = 'Generating…';

    try {
      const sys     = getSystem(fd.system);
      const heights = getHeights(fd.system, fd.structure);
      const data    = {
        ...fd,
        longDescription: buildDescription(fd.thickness, fd.glassType, fd.structure, fd.newOrExisting, fd.location, fd.system),
        shortDescription: buildShortDescription(fd.structure, fd.system),
      };

      const logFields = {
        client_name:     fd.clientName,
        address:         fd.address,
        bc_number:       fd.bcNumber,
        lot_description: fd.lotDescription,
        system_type:     fd.system,
        substrate:       fd.substrate,
        structure:       fd.structure,
        location:        fd.location,
        new_or_existing: fd.newOrExisting,
        thickness:       fd.thickness,
        glass_type:      fd.glassType,
      };

      const isPool       = POOL_STRUCTURES.includes(fd.structure);
      const templateFile = isPool && sys.poolTemplateFile ? sys.poolTemplateFile : sys.templateFile;

      if (mode === 'ps3') {
        const bytes    = await fillPS3(data);
        const filename = sanitizeFilename(fd.address + ' - PS3.pdf');
        triggerDownload(bytes, filename);
        await ajax('rgps_log', { ...logFields, ps: 'PS3', filename });

      } else if (mode === 'ps1') {
        const bytes    = await fillPS1(templateFile, data, heights);
        const filename = sanitizeFilename(fd.address + ' - PS1.pdf');
        triggerDownload(bytes, filename);
        await ajax('rgps_log', { ...logFields, ps: 'PS1', filename });

      } else {
        // both
        const [ps3Bytes, ps1Bytes] = await Promise.all([
          fillPS3(data),
          fillPS1(templateFile, data, heights),
        ]);
        const ps3File = sanitizeFilename(fd.address + ' - PS3.pdf');
        const ps1File = sanitizeFilename(fd.address + ' - PS1.pdf');
        triggerDownload(ps3Bytes, ps3File);
        triggerDownload(ps1Bytes, ps1File);
        await ajax('rgps_log', { ...logFields, ps: 'Both', filename: ps1File });
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

  // ── Records table + pagination ────────────────────────────────────
  let recordsPage  = 1;
  let recordsLimit = 10;
  let recordsTotal = 0;

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
        const date   = new Date(r.created_at).toLocaleString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        const psMap  = { PS1: 'rgps-tag-ps1', PS3: 'rgps-tag-ps3', Both: 'rgps-tag-both' };
        const psVal  = r.ps || 'PS1';
        const psTag  = '<span class="rgps-tag ' + (psMap[psVal] || 'rgps-tag-ps1') + '">' + esc(psVal) + '</span>';
        const glMap  = { Toughened: 'rgps-tag-ps1', Laminated: 'rgps-tag-ps3' };
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
    el('rgps-structure').value    = 'Deck';
    el('rgps-thickness').value    = '12';
    document.querySelectorAll('input[name="rgps-location"]').forEach(cb => { cb.checked = cb.value === 'External'; });
    document.querySelector('input[name="rgps-newOrExisting"][value="New"]').checked    = true;
    document.querySelector('input[name="rgps-requiresGate"][value="No"]').checked      = true;
    document.querySelector('input[name="rgps-glassType"][value="Toughened"]').checked  = true;
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
    // Auto-set Gate Required when structure changes to/from Pool
    el('rgps-structure').addEventListener('change', function () {
      const isPool = POOL_STRUCTURES.includes(this.value);
      document.querySelector('input[name="rgps-requiresGate"][value="Yes"]').checked = isPool;
      document.querySelector('input[name="rgps-requiresGate"][value="No"]').checked  = !isPool;
    });

    // Pagination controls
    const limitSel = el('rgps-records-limit');
    const prevBtn  = el('rgps-btn-prev');
    const nextBtn  = el('rgps-btn-next');
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
  });

})();
