const test = require('node:test');
const assert = require('node:assert/strict');
const { getPortariaVehicleState } = require('../../frontend/js/portaria-vehicle-state.js');

test('available vehicle without an active movement can start a movement', () => {
  assert.deepEqual(getPortariaVehicleState('disponivel', false), {
    canStartMovement: true,
    showTransitBadge: false
  });
});

test('available vehicle with an active movement is blocked and marked in transit', () => {
  assert.deepEqual(getPortariaVehicleState('disponivel', true), {
    canStartMovement: false,
    showTransitBadge: true
  });
});

test('unavailable and maintenance vehicles cannot start a movement', () => {
  for (const status of ['indisponivel', 'manutencao']) {
    assert.deepEqual(getPortariaVehicleState(status, false), {
      canStartMovement: false,
      showTransitBadge: false
    });
  }
});

test('blocked vehicle with an active movement still shows the transit badge', () => {
  for (const status of ['indisponivel', 'manutencao']) {
    assert.deepEqual(getPortariaVehicleState(status, true), {
      canStartMovement: false,
      showTransitBadge: true
    });
  }
});

test('em_uso status does not duplicate the active movement badge', () => {
  assert.deepEqual(getPortariaVehicleState('em_uso', true), {
    canStartMovement: false,
    showTransitBadge: false
  });
});
