'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const pluginSource = fs.readFileSync(
  path.join(ROOT, 'wp-plugin', 'rg-ps-generator', 'rg-ps-generator.php'),
  'utf8'
);
const styleSource = fs.readFileSync(
  path.join(ROOT, 'wp-plugin', 'rg-ps-generator', 'assets', 'style.css'),
  'utf8'
);
const appSource = fs.readFileSync(
  path.join(ROOT, 'wp-plugin', 'rg-ps-generator', 'assets', 'app.js'),
  'utf8'
);

function loadScopeHelpers() {
  const window = { RGPS_TEST_API: {} };
  let ready;
  const fakeElement = () => ({
    value: '', checked: false, disabled: false, style: {}, classList: { add() {}, remove() {} },
    addEventListener() {}, focus() {},
  });
  const context = {
    RGPSConfig: { ajaxUrl: '/ajax', nonce: 'test', fontUrl: '/font' },
    window,
    document: {
      getElementById: fakeElement,
      addEventListener(type, handler) { if (type === 'DOMContentLoaded') ready = handler; },
      querySelector: fakeElement,
      querySelectorAll() { return []; },
    },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    URLSearchParams,
    setTimeout,
    clearTimeout,
  };
  require('node:vm').runInNewContext(appSource, context);
  ready();
  return window.RGPS_TEST_API;
}

test('renders document details before blank multi-area rows in a responsive two-column layout', () => {
  assert.match(pluginSource, /class="rgps-form-grid"/);
  assert.ok(pluginSource.indexOf('id="rgps-clientName"') < pluginSource.indexOf('id="rgps-scope-rows"'));
  assert.match(styleSource, /\.rgps-form-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styleSource, /@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.rgps-form-grid\s*\{\s*grid-template-columns:\s*1fr/s);
});

test('uses document-wide select controls and keeps the three generation actions distinct', () => {
  assert.match(pluginSource, /<select id="rgps-newOrExisting">[\s\S]*?<option value="New" selected>New<\/option>[\s\S]*?<option value="Existing">Existing<\/option>[\s\S]*?<\/select>/);
  assert.match(pluginSource, /<select id="rgps-glassType">[\s\S]*?<option value="Toughened" selected>Toughened<\/option>[\s\S]*?<option value="Laminated">Laminated<\/option>[\s\S]*?<option value="None">Not Glass<\/option>[\s\S]*?<\/select>/);
  assert.doesNotMatch(pluginSource, /name="rgps-newOrExisting"/);
  assert.doesNotMatch(pluginSource, /name="rgps-glassType"/);
  assert.match(pluginSource, /data-mode="ps1">Generate PS1<\/button>/);
  assert.match(pluginSource, /data-mode="ps3">Generate PS3<\/button>/);
  assert.match(pluginSource, /data-mode="both">Generate PS1 \+ PS3<\/button>/);
});

test('uses an accessible structure-type multi-select dropdown and carries the combined area list into PDFs and logs', () => {
  assert.match(appSource, /data-scope-structure-toggle/);
  assert.match(appSource, /class="rgps-scope-structure-menu"/);
  assert.match(appSource, /aria-expanded=/);
  assert.match(appSource, /setText\('Structure02',\s*data\.combinedAreaList\)/);
  assert.match(appSource, /structure:\s+fd\.combinedAreaList/);
  assert.match(appSource, /window\.RGPS_TEST_API\.fillPS1 = fillPS1/);
  assert.match(appSource, /window\.RGPS_TEST_API\.fillPS3 = fillPS3/);
  assert.match(pluginSource, /function rgps_is_valid_structure/);
});

test('keeps the collapsed structure-type trigger to one compact line', () => {
  assert.match(appSource, /class="rgps-scope-structure-toggle-label">' \+ selectedStructures \+ '<\/span>/);
  assert.match(
    styleSource,
    /\.rgps-scope-structure-toggle-label\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s
  );
});

test('closes an open structure-type menu after the pointer leaves its picker', () => {
  assert.match(appSource, /addEventListener\('pointerout', function \(event\) \{[\s\S]*?closest\('\.rgps-scope-structure-picker'\)[\s\S]*?picker\.contains\(event\.relatedTarget\)[\s\S]*?closeScopeStructureMenu\(picker\);/);
});

test('shares scope-row resolution across structure menu actions', () => {
  assert.match(appSource, /function getScopeRowForTarget\(target\) \{[\s\S]*?target\.closest\('\[data-scope-index\]'\)/);
  assert.match(appSource, /function toggleScopeStructureMenu\(target\) \{\s*const row = getScopeRowForTarget\(target\);/);
  assert.match(appSource, /function closeScopeStructureMenu\(target\) \{\s*const row = getScopeRowForTarget\(target\);/);
});

test('cache-busts the updated structure trigger assets', () => {
  assert.match(pluginSource, /'rgps-app',\s+RGPS_URL \. 'assets\/app\.js',\s+\[ 'pdf-lib', 'pdf-fontkit' \],\s+'1\.0\.13'/);
  assert.match(pluginSource, /'rgps-style',\s+RGPS_URL \. 'assets\/style\.css',\s+\[\],\s+'1\.0\.2'/);
});

test('validates a complete five-area document and rejects incomplete or mixed Pool rows', () => {
  const { buildScopeSummary } = loadScopeHelpers();
  const fiveAreas = [
    { location: 'Internal', structures: ['Stair'] },
    { location: 'External', structures: ['Deck'] },
    { location: 'Internal', structures: ['Landing'] },
    { location: 'External', structures: ['Balcony'] },
    { location: 'Internal', structures: ['Deck', 'Balcony'] },
  ];

  assert.deepEqual({ ...buildScopeSummary(fiveAreas) }, {
    combinedAreaList: 'Internal Stair Area and External Deck Area and Internal Landing Area and External Balcony Area and Internal Deck and Balcony Area',
    location: 'Internal and External',
    structure: 'Stair and Deck and Landing and Balcony and Deck and Balcony',
    isPool: false,
    canAddScope: false,
    isComplete: true,
    isValid: true,
  });
  assert.equal(buildScopeSummary([{ location: 'Internal', structures: [] }]).isComplete, false);
  assert.equal(buildScopeSummary([{ location: 'External', structures: ['Pool', 'Deck'] }]).isValid, false);
  assert.equal(buildScopeSummary([
    { location: 'External', structures: ['Pool'] },
    { location: 'Internal', structures: ['Deck'] },
  ]).isValid, false);
});

test('upgrades the log schema so full five-area labels are never truncated', () => {
  assert.match(pluginSource, /structure\s+TEXT\s+NOT NULL/);
  assert.match(pluginSource, /function rgps_maybe_upgrade_schema/);
  assert.match(pluginSource, /ALTER TABLE `\{\$table\}` MODIFY `structure` TEXT NOT NULL/);
});

test('only marks the schema migration complete after verifying the widened column', () => {
  assert.match(pluginSource, /function rgps_is_structure_column_capacity_safe/);
  assert.match(pluginSource, /if \( ! rgps_is_structure_column_capacity_safe\( \$column \) \) return;\s*\n\s*update_option\( 'rgps_schema_version', RGPS_SCHEMA_VERSION \);/);
});

test('persists the generation log before allowing any PDF download', () => {
  assert.match(appSource, /await logGeneration\(\{ \.\.\.logFields, ps: 'PS3', filename \}\);\s*\n\s*triggerDownload\(bytes, filename\);/);
  assert.match(appSource, /await logGeneration\(\{ \.\.\.logFields, ps: 'PS1', filename \}\);\s*\n\s*triggerDownload\(bytes, filename\);/);
  assert.match(appSource, /await logGeneration\(\{ \.\.\.logFields, ps: 'Both', filename: ps1File \}\);\s*\n\s*triggerDownload\(ps3Bytes, ps3File\);/);
});
