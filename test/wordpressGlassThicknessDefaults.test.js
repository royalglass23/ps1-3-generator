'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const APP_PATH = path.join(__dirname, '..', 'wp-plugin', 'rg-ps-generator', 'assets', 'app.js');

function fakeElement(value = '') {
  return {
    value,
    checked: false,
    disabled: false,
    style: {},
    listeners: {},
    classList: { add() {}, remove() {} },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    focus() {},
  };
}

function loadApp() {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) elements.set(id, fakeElement());
    return elements.get(id);
  };
  const glassType = getElement('rgps-glassType');
  glassType.value = 'Toughened';
  let ready;

  const document = {
    getElementById: getElement,
    addEventListener(type, handler) { if (type === 'DOMContentLoaded') ready = handler; },
    querySelectorAll() { return []; },
    querySelector() { return fakeElement(); },
  };
  const context = {
    RGPSConfig: { ajaxUrl: '/ajax', nonce: 'test', fontUrl: '/font' },
    document,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    window: { RGPS_TEST_API: {} },
    console,
    URLSearchParams,
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(fs.readFileSync(APP_PATH, 'utf8'), context);
  ready();
  return { getElement, glassType, testApi: context.window.RGPS_TEST_API };
}

function selectGlassType(glassType, value) {
  glassType.value = value;
  if (glassType.listeners.change) glassType.listeners.change.call(glassType);
}

test('selecting Toughened applies 12mm even when it is already selected', () => {
  const { getElement, glassType } = loadApp();
  const thickness = getElement('rgps-thickness');
  thickness.value = '15';
  selectGlassType(glassType, 'Toughened');
  assert.equal(thickness.value, '12');
  thickness.value = '13.2';
  assert.equal(thickness.value, '13.2');
  assert.equal(thickness.disabled, false);
});

test('keyboard selection of Toughened applies the 12mm default', () => {
  const { getElement, glassType } = loadApp();
  const thickness = getElement('rgps-thickness');
  glassType.value = 'Laminated';
  thickness.value = '13.52';
  selectGlassType(glassType, 'Toughened');
  assert.equal(thickness.value, '12');
});

test('system selection applies the Toughened 12mm default', () => {
  const { getElement, glassType } = loadApp();
  const thickness = getElement('rgps-thickness');
  const system = getElement('rgps-system');
  glassType.value = 'Laminated';
  thickness.value = '13.52';
  system.value = 'mini-post';
  system.listeners.change.call(system);
  assert.equal(glassType.value, 'Toughened');
  assert.equal(thickness.value, '12');
});

test('Aluminium and Unex Ascot default to Not Glass while allowing a glass override', () => {
  const { getElement, glassType } = loadApp();
  const thickness = getElement('rgps-thickness');
  const system = getElement('rgps-system');
  thickness.value = '12';
  selectGlassType(glassType, 'None');
  assert.equal(thickness.value, '');

  for (const systemKey of ['viking-aluminium', 'unex-ascot']) {
    thickness.value = '15';
    system.value = systemKey;
    system.listeners.change.call(system);
    assert.equal(glassType.value, 'None');
    assert.equal(thickness.value, '');
    selectGlassType(glassType, 'Toughened');
    assert.equal(glassType.value, 'Toughened');
    assert.equal(thickness.value, '12');
  }
});

test('Unex Metropolis defaults to Toughened 12mm glass', () => {
  const { getElement, glassType } = loadApp();
  const thickness = getElement('rgps-thickness');
  const system = getElement('rgps-system');
  glassType.value = 'None';
  thickness.value = '';
  system.value = 'unex-metropolis';
  system.listeners.change.call(system);
  assert.equal(glassType.value, 'Toughened');
  assert.equal(thickness.value, '12');
});

test('Aluminium descriptions distinguish pool fencing from balustrades', () => {
  const { testApi } = loadApp();
  assert.equal(
    testApi.buildDescription('', 'None', { combinedAreaList: 'External Pool Area', isPool: true }, 'New', 'viking-aluminium'),
    'New Aluminium pool fence installation for External Pool Area using Viking Aluminium System'
  );
  assert.equal(
    testApi.buildDescription('', 'None', { combinedAreaList: 'External Deck Area', isPool: false }, 'New', 'viking-aluminium'),
    'New Aluminium balustrade installation for External Deck Area using Viking Aluminium System'
  );
});

test('scope rows produce an ordered combined area list and make Pool exclusive', () => {
  const { testApi } = loadApp();
  const scope = testApi.buildScopeSummary([
    { location: 'Internal', structures: ['Stair', 'Balcony'] },
    { location: 'External', structures: ['Deck'] },
  ]);
  assert.equal(scope.combinedAreaList, 'Internal Stair and Balcony Area and External Deck Area');
  assert.equal(scope.location, 'Internal and External');
  assert.equal(scope.structure, 'Stair and Balcony and Deck');
  assert.equal(scope.isPool, false);
  assert.equal(scope.canAddScope, true);
  assert.equal(
    testApi.buildDescription('12', 'Toughened', scope, 'New', 'mini-post'),
    'New 12mm Toughened Glass installation for Internal Stair and Balcony Area and External Deck Area using Mini Post System'
  );
  const poolScope = testApi.buildScopeSummary([{ location: 'External', structures: ['Pool'] }]);
  assert.equal(poolScope.combinedAreaList, 'External Pool Area');
  assert.equal(poolScope.location, 'External');
  assert.equal(poolScope.structure, 'Pool');
  assert.equal(poolScope.isPool, true);
  assert.equal(poolScope.canAddScope, false);
});
