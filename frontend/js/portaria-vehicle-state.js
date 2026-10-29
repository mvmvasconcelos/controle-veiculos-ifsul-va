(function (root) {
  const portariaVehicleState = {
    getPortariaVehicleState(status, hasActiveMovement) {
      const inTransit = Boolean(hasActiveMovement);

      return {
        canStartMovement: status === 'disponivel' && !inTransit,
        showTransitBadge: inTransit && status !== 'em_uso'
      };
    }
  };

  root.PortariaVehicleState = portariaVehicleState;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = portariaVehicleState;
  }
})(globalThis);
