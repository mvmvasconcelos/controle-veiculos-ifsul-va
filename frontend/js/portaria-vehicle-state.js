(function (root) {
  const portariaVehicleState = {
    getPortariaVehicleState(status, hasActiveMovement) {
      const inTransit = Boolean(hasActiveMovement);

      return {
        canStartMovement: status === 'disponivel' && !inTransit,
        showTransitBadge: inTransit && status !== 'em_uso'
      };
    },

    sortPortariaVehicles(vehicles, activeMovementsMap) {
      const rank = { disponivel: 1, manutencao: 2, indisponivel: 3 };
      const groupOf = v => (activeMovementsMap[v.id] ? 0 : (rank[v.status] ?? 4));
      const name = v => String(v.display_name || '');

      return [...vehicles].sort((a, b) => {
        const ga = groupOf(a);
        const gb = groupOf(b);
        if (ga !== gb) return ga - gb;
        if (ga === 0) {
          const diff = new Date(activeMovementsMap[a.id].departure_time) - new Date(activeMovementsMap[b.id].departure_time);
          if (diff) return diff;
        }
        return name(a).localeCompare(name(b), 'pt-BR');
      });
    }
  };

  root.PortariaVehicleState = portariaVehicleState;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = portariaVehicleState;
  }
})(globalThis);
