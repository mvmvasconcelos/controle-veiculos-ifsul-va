const test = require('node:test');
const assert = require('node:assert/strict');
const { getPortariaVehicleState, sortPortariaVehicles } = require('../../frontend/js/portaria-vehicle-state.js');

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

test('vehicles in transit come first (oldest departure first), then available, maintenance, unavailable', () => {
  const vehicles = [
    { id: 1, display_name: 'B', status: 'indisponivel' },
    { id: 2, display_name: 'A', status: 'manutencao' },
    { id: 3, display_name: 'C', status: 'disponivel' },
    { id: 4, display_name: 'D', status: 'em_uso' },
    { id: 5, display_name: 'E', status: 'indisponivel' },
    { id: 6, display_name: 'A2', status: 'disponivel' }
  ];
  const active = {
    4: { departure_time: '2026-01-01T10:00:00' },
    5: { departure_time: '2026-01-01T08:00:00' }
  };
  const order = sortPortariaVehicles(vehicles, active).map(v => v.id);
  assert.deepEqual(order, [5, 4, 6, 3, 2, 1]);
});
