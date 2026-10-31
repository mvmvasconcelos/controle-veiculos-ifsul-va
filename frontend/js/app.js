// Main App Logic for Controle de Veículos IFSul
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  currentTab: 'dashboard',
  adminSubtab: 'vehicles',
  currentUser: null,
  dashboardData: null,
  vehicles: [],
  drivers: [],
  users: [],
  movements: [],
  activeMovementsMap: {},
  movementsPage: 1,
  movementsPerPage: 10,

  init() {
    this.currentUser = API.getUser();
    this.updateUserHeader();
    this.bindEvents();
    this.switchTab(this.currentTab);
    
    // Auto refresh dashboard every 30 seconds
    setInterval(() => {
      if (this.currentTab === 'dashboard' || this.currentTab === 'portaria') {
        this.loadCurrentTabData(true);
      }
    }, 30000);
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    container.replaceChildren();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} active`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3500);
  },

  updateUserHeader() {
    const badge = document.getElementById('user-header-badge');
    badge.replaceChildren();

    if (this.currentUser) {
      badge.className = `user-status-badge ${this.currentUser.role}`;
      const iconSpan = document.createElement('span');
      iconSpan.textContent = '👤';
      const textSpan = document.createElement('span');
      textSpan.textContent = `${this.currentUser.name} (${this.currentUser.role.toUpperCase()})`;
      badge.appendChild(iconSpan);
      badge.appendChild(textSpan);
      
      document.getElementById('nav-login-text').textContent = 'Sair';
    } else {
      badge.className = 'user-status-badge';
      badge.textContent = '🔓 Visitante (Público)';
      document.getElementById('nav-login-text').textContent = 'Login';
    }

    // Toggle admin tab visibility
    const adminNavBtn = document.getElementById('nav-btn-admin');
    if (this.currentUser && this.currentUser.role === 'admin') {
      adminNavBtn.style.display = 'flex';
    } else {
      adminNavBtn.style.display = 'none';
      if (this.currentTab === 'admin') {
        this.switchTab('dashboard');
      }
    }
  },

  bindEvents() {
    // Mobile navigation clicks
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab === 'login') {
          if (this.currentUser) {
            if (confirm('Deseja realmente sair do sistema?')) {
              API.logout();
            }
          } else {
            this.openModal('modal-login');
          }
        } else {
          this.switchTab(tab);
        }
      });
    });

    document.getElementById('portaria-search').addEventListener('input', () => {
      this.renderPortariaVehicles();
    });

    document.getElementById('vehicle-status').addEventListener('change', () => {
      this.updateVehicleReasonVisibility();
    });

    // Admin Subnav Clicks
    document.querySelectorAll('.btn-subnav').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = btn.getAttribute('data-subtab');
        this.switchAdminSubtab(sub);
      });
    });

    // Pagination for Movements
    const btnPrevMov = document.getElementById('btn-prev-movements');
    if (btnPrevMov) {
      btnPrevMov.addEventListener('click', () => {
        if (this.movementsPage > 1) {
          this.movementsPage--;
          this.renderAdmin();
        }
      });
    }
    const btnNextMov = document.getElementById('btn-next-movements');
    if (btnNextMov) {
      btnNextMov.addEventListener('click', () => {
        const totalPages = Math.ceil(this.movements.length / this.movementsPerPage) || 1;
        if (this.movementsPage < totalPages) {
          this.movementsPage++;
          this.renderAdmin();
        }
      });
    }

    // Escape key modal close handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });

    // Login Form Submit
    document.getElementById('form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const userVal = document.getElementById('login-username').value.trim();
      const passVal = document.getElementById('login-password').value;
      try {
        const user = await API.login(userVal, passVal);
        this.currentUser = user;
        this.updateUserHeader();
        this.closeModal('modal-login');
        this.showToast(`Bem-vindo, ${user.name}!`);
        this.switchTab('portaria');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // Modal close buttons
    document.querySelectorAll('.btn-close, .btn-modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('active');
      });
    });

    // Form Exit Submit (with KM > 2000 warning alert)
    document.getElementById('form-exit').addEventListener('submit', async (e) => {
      e.preventDefault();
      const vehicleId = parseInt(document.getElementById('exit-vehicle-id').value);
      const driverId = parseInt(document.getElementById('exit-driver-id').value);
      const destination = document.getElementById('exit-destination').value.trim();
      const purpose = document.getElementById('exit-purpose').value.trim();
      const odometer = parseInt(document.getElementById('exit-odometer').value);

      const targetVehicle = this.vehicles.find(v => v.id === vehicleId);
      if (targetVehicle && odometer - targetVehicle.current_odometer > 2000) {
        const diff = odometer - targetVehicle.current_odometer;
        if (!confirm(`⚠️ ALERTA DE ALTOM ODÔMETRO:\nA quilometragem informada (${odometer.toLocaleString()} km) é ${diff.toLocaleString()} km superior ao registro anterior (${targetVehicle.current_odometer.toLocaleString()} km).\n\nTem certeza de que os valores estão corretos?`)) {
          return;
        }
      }

      try {
        await API.recordExit({
          vehicle_id: vehicleId,
          driver_id: driverId,
          destination: destination,
          purpose: purpose,
          departure_odometer: odometer
        });
        this.closeModal('modal-exit');
        this.showToast('Saída registrada com sucesso!');
        this.loadCurrentTabData();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // Form Return Submit (with KM > 2000 warning alert)
    document.getElementById('form-return').addEventListener('submit', async (e) => {
      e.preventDefault();
      const movementId = parseInt(document.getElementById('return-movement-id').value);
      const odometer = parseInt(document.getElementById('return-odometer').value);
      const notes = document.getElementById('return-notes').value.trim();

      const activeTrip = Object.values(this.activeMovementsMap).find(m => m.id === movementId);
      if (activeTrip) {
        const diff = odometer - activeTrip.departure_odometer;
        if (diff > 2000) {
          if (!confirm(`⚠️ ALERTA DE ALTA QUILOMETRAGEM:\nA distância percorrida informada nesta viagem é de ${diff.toLocaleString()} km (superior a 2.000 km).\n\nTem certeza de que o odômetro de retorno (${odometer.toLocaleString()} km) está correto?`)) {
            return;
          }
        }
      }

      try {
        await API.recordReturn(movementId, {
          return_odometer: odometer,
          notes: notes
        });
        this.closeModal('modal-return');
        this.showToast('Retorno registrado com sucesso!');
        this.loadCurrentTabData();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // Quick Add Driver Form Submit
    document.getElementById('form-quick-driver').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('quick-driver-name').value.trim();
      const department = document.getElementById('quick-driver-department').value.trim();
      const driverType = document.getElementById('quick-driver-type').value;

      try {
        const newDriver = await API.createDriver({
          name, department, driver_type: driverType
        });
        this.closeModal('modal-quick-driver');
        this.showToast(`Motorista '${newDriver.name}' cadastrado!`);
        await this.reloadDriversDropdown();
        document.getElementById('exit-driver-id').value = newDriver.id;
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    document.getElementById('btn-open-quick-driver').addEventListener('click', () => {
      this.openModal('modal-quick-driver');
    });

    // Admin Add Buttons
    document.getElementById('btn-add-vehicle').addEventListener('click', () => {
      this.openVehicleModal(null);
    });

    document.getElementById('btn-add-driver').addEventListener('click', () => {
      this.openDriverModal(null);
    });

    document.getElementById('btn-add-user').addEventListener('click', () => {
      this.openUserModal(null);
    });

    // Admin Forms Submits
    document.getElementById('form-admin-vehicle').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSaveVehicle();
    });

    document.getElementById('form-admin-driver').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSaveDriver();
    });

    document.getElementById('form-admin-user').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSaveUser();
    });

    document.getElementById('form-admin-movement').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSaveMovement();
    });

    // Export CSV Button
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      if (!this.currentUser) {
        this.showToast('Faça login na portaria para baixar relatórios', 'error');
        return;
      }
      window.open(API.getExportCsvUrl(), '_blank');
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(sec => {
      sec.style.display = sec.id === `tab-${tabName}` ? 'block' : 'none';
    });

    this.loadCurrentTabData();
  },

  switchAdminSubtab(subtabName) {
    this.adminSubtab = subtabName;
    document.querySelectorAll('.btn-subnav').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-subtab') === subtabName);
    });

    document.querySelectorAll('.admin-subtab-content').forEach(div => {
      div.style.display = div.id === `admin-subtab-${subtabName}` ? 'block' : 'none';
    });

    if (subtabName === 'audit') {
      this.renderAuditLogs();
    }
  },

  async loadCurrentTabData(silent = false) {
    if (this.currentTab === 'dashboard') {
      await this.renderDashboard();
    } else if (this.currentTab === 'portaria') {
      if (!this.currentUser) {
        this.openModal('modal-login');
        return;
      }
      await this.renderPortaria();
    } else if (this.currentTab === 'admin') {
      if (!this.currentUser || this.currentUser.role !== 'admin') {
        this.showToast('Acesso restrito a administradores', 'error');
        this.switchTab('dashboard');
        return;
      }
      await this.renderAdmin();
    }
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  },

  // -------------------------------------------------------------
  // SHARED UI HELPERS
  // -------------------------------------------------------------
  STATUS_LABELS: {
    disponivel: 'Disponível',
    em_uso: 'Em Trânsito',
    manutencao: 'Em manutenção',
    indisponivel: 'Indisponível'
  },

  createStatusBadge(status, label = null) {
    const badge = document.createElement('span');
    badge.className = `badge badge-${status}`;
    badge.textContent = label || this.STATUS_LABELS[status] || status;
    return badge;
  },

  // Badges for a vehicle: its state for next exits plus, if applicable, the open movement
  createVehicleBadges(vehicle, activeTrip) {
    const row = document.createElement('div');
    row.className = 'badge-row';
    row.appendChild(this.createStatusBadge(vehicle.status));
    if (activeTrip && vehicle.status !== 'em_uso') {
      row.appendChild(this.createStatusBadge('em_uso', 'Em Trânsito'));
    }
    return row;
  },

  createStateBox(message, kind = 'empty', onRetry = null) {
    const box = document.createElement('div');
    box.className = `state-box${kind === 'error' ? ' state-error' : ''}`;
    box.textContent = message;
    if (onRetry) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary';
      btn.textContent = 'Tentar novamente';
      btn.addEventListener('click', onRetry);
      box.appendChild(btn);
    }
    return box;
  },

  setFeedback(id, message = null, kind = 'error') {
    const el = document.getElementById(id);
    el.replaceChildren();
    if (message) {
      el.appendChild(this.createStateBox(message, kind, () => this.loadCurrentTabData()));
    }
  },

  createVehicleTitle(vehicle) {
    const titleBox = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'vehicle-title';
    title.textContent = vehicle.display_name;
    const plate = document.createElement('span');
    plate.className = 'vehicle-plate';
    plate.textContent = vehicle.plate;
    titleBox.appendChild(title);
    titleBox.appendChild(plate);
    return titleBox;
  },

  formatTime(value) {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  formatDashboardDeparture(value) {
    const departure = new Date(value);
    const date = departure.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const time = departure.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).replace(':', '-');
    return `${date} - ${time}`;
  },

  // -------------------------------------------------------------
  // TAB 1: DASHBOARD PÚBLICO
  // -------------------------------------------------------------
  async renderDashboard() {
    const grid = document.getElementById('dashboard-vehicles-grid');
    if (!this.dashboardData) {
      grid.replaceChildren(this.createStateBox('Carregando veículos...'));
    }

    let data;
    try {
      data = await API.getDashboardSummary();
    } catch (err) {
      console.error('Error rendering dashboard:', err);
      this.setFeedback('dashboard-feedback', `Não foi possível carregar o painel: ${err.message}`);
      if (!this.dashboardData) grid.replaceChildren();
      return;
    }

    this.setFeedback('dashboard-feedback');
    this.dashboardData = data;
    this.vehicles = data.vehicles;

    document.getElementById('metric-total').textContent = data.metrics.total_vehicles;
    document.getElementById('metric-available').textContent = data.metrics.available_count;
    document.getElementById('metric-inuse').textContent = data.metrics.in_use_count;
    document.getElementById('metric-unavailable').textContent = data.metrics.unavailable_count;
    document.getElementById('metric-maintenance').textContent = data.metrics.maintenance_count;

    // Active movements list
    const activeList = document.getElementById('dashboard-active-list');
    activeList.replaceChildren();
    if (data.active_movements.length === 0) {
      activeList.appendChild(this.createStateBox('Nenhum veículo em trânsito no momento.'));
    } else {
      data.active_movements.forEach(m => {
        activeList.appendChild(this.createTripCard(m, { vehicle: m.vehicle }));
      });
    }

    // Fleet cards
    grid.replaceChildren();
    if (data.vehicles.length === 0) {
      grid.appendChild(this.createStateBox('Nenhum veículo cadastrado.'));
    }
    data.vehicles.forEach(v => {
      const activeTrip = data.active_movements.find(m => m.vehicle_id === v.id);

      const card = document.createElement('div');
      card.className = `vehicle-card status-${v.status}`;

      const header = document.createElement('div');
      header.className = 'vehicle-header';
      header.appendChild(this.createVehicleTitle(v));
      header.appendChild(this.createVehicleBadges(v, activeTrip));
      card.appendChild(header);

      const details = document.createElement('div');
      details.className = 'vehicle-details';

      const row1 = document.createElement('div');
      row1.className = 'vehicle-meta-row';
      const span1 = document.createElement('span');
      span1.textContent = `Modelo: ${v.make} ${v.model}`;
      row1.appendChild(span1);

      const row2 = document.createElement('div');
      row2.className = 'vehicle-meta-row';
      const span2a = document.createElement('span');
      span2a.textContent = `Odômetro: ${v.current_odometer.toLocaleString()} km`;
      const span2b = document.createElement('span');
      span2b.textContent = `Comb: ${v.fuel}`;
      row2.appendChild(span2a);
      row2.appendChild(span2b);

      details.appendChild(row1);
      details.appendChild(row2);
      card.appendChild(details);

      if (activeTrip) {
        const tripBox = document.createElement('div');
        tripBox.className = 'active-trip-info';
        tripBox.textContent = `Em trânsito. Destino: ${activeTrip.destination}. Horário: ${this.formatDashboardDeparture(activeTrip.departure_time)}`;
        card.appendChild(tripBox);
      }

      grid.appendChild(card);
    });

    const destList = document.getElementById('dashboard-destinations');
    destList.replaceChildren();
    if (data.common_destinations.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'Nenhuma movimentação registrada ainda.';
      destList.appendChild(empty);
    } else {
      data.common_destinations.forEach(d => {
        const li = document.createElement('li');
        li.textContent = `${d.destination} (${d.count} viagens)`;
        destList.appendChild(li);
      });
    }
  },

  // Card for an open movement; used by the public dashboard
  createTripCard(movement, { vehicle, onReturn = null }) {
    const card = document.createElement('div');
    card.className = 'trip-card';

    const head = document.createElement('div');
    head.className = 'trip-card-head';
    head.appendChild(this.createVehicleTitle(vehicle));
    head.appendChild(this.createVehicleBadges(vehicle, movement));
    card.appendChild(head);

    const meta = document.createElement('div');
    meta.className = 'trip-meta';
    const dest = document.createElement('div');
    dest.textContent = `Destino: ${movement.destination}`;
    const dep = document.createElement('div');
    dep.textContent = `Saída: ${new Date(movement.departure_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`;
    meta.append(dest);
    if (this.currentUser && movement.driver) {
      const drv = document.createElement('div');
      drv.textContent = `Motorista: ${movement.driver.name}`;
      meta.appendChild(drv);
    }
    meta.appendChild(dep);
    card.appendChild(meta);

    if (onReturn) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-danger';
      btn.textContent = '🏁 Registrar Retorno';
      btn.addEventListener('click', onReturn);
      card.appendChild(btn);
    }
    return card;
  },

  // -------------------------------------------------------------
  // TAB 2: PORTARIA / VIGILANTE
  // -------------------------------------------------------------
  async renderPortaria() {
    const grid = document.getElementById('portaria-vehicles-grid');
    if (this.vehicles.length === 0) {
      grid.replaceChildren(this.createStateBox('Carregando veículos...'));
    }

    try {
      const [vehicles, activeMovements, drivers] = await Promise.all([
        API.getStaffVehicles(),
        API.getMovements({ status: 'em_transito' }),
        API.getDrivers()
      ]);
      this.vehicles = vehicles;
      this.drivers = drivers;
      this.activeMovementsMap = {};
      activeMovements.forEach(m => {
        this.activeMovementsMap[m.vehicle_id] = m;
      });
    } catch (err) {
      console.error('Error rendering portaria:', err);
      this.setFeedback('portaria-feedback', `Não foi possível carregar a portaria: ${err.message}`);
      if (this.vehicles.length === 0) grid.replaceChildren();
      return;
    }

    this.setFeedback('portaria-feedback');
    this.renderPortariaVehicles();
  },

  renderPortariaVehicles() {
    const container = document.getElementById('portaria-vehicles-grid');
    container.replaceChildren();

    const term = document.getElementById('portaria-search').value.trim().toLowerCase();
    const matches = PortariaVehicleState.sortPortariaVehicles(this.vehicles, this.activeMovementsMap).filter(v =>
      !term || `${v.display_name} ${v.plate} ${v.make} ${v.model}`.toLowerCase().includes(term)
    );

    if (matches.length === 0) {
      container.appendChild(this.createStateBox(term ? 'Nenhum veículo encontrado para a busca.' : 'Nenhum veículo cadastrado.'));
      return;
    }

    matches.forEach(v => {
      const state = PortariaVehicleState.getPortariaVehicleState(
        v.status,
        Boolean(this.activeMovementsMap[v.id])
      );
      const canExit = state.canStartMovement;
      const trip = this.activeMovementsMap[v.id];
      const card = document.createElement('div');
      card.className = `vehicle-option status-${v.status}${trip ? ' status-em_uso' : ''}${canExit ? '' : ' is-disabled'}`;

      const head = document.createElement('div');
      head.className = 'vehicle-option-head';
      const title = document.createElement('div');
      title.className = 'vehicle-title';
      title.textContent = v.display_name;
      head.appendChild(title);
      head.appendChild(this.createVehicleBadges(v, trip));
      card.appendChild(head);

      if (trip) {
        const tripInfo = document.createElement('div');
        tripInfo.className = 'vehicle-option-note';
        const driverName = trip.driver ? `${trip.driver.name} • ` : '';
        tripInfo.textContent = `${driverName}Saída ${new Date(trip.departure_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`;
        card.appendChild(tripInfo);
      } else if (v.status === 'indisponivel' && v.unavailable_reason) {
        const reason = document.createElement('div');
        reason.className = 'vehicle-option-note';
        reason.textContent = `Motivo: ${v.unavailable_reason}`;
        card.appendChild(reason);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';
      if (canExit) {
        btn.textContent = '🚀 Registrar Saída';
        btn.addEventListener('click', () => this.openExitModal(v));
      } else if (trip) {
        btn.className = 'btn btn-danger';
        btn.textContent = '🏁 Registrar Retorno';
        btn.addEventListener('click', () => this.openReturnModal(v, trip));
      } else {
        btn.disabled = true;
        btn.className = 'btn btn-secondary';
        btn.textContent = 'Saída bloqueada';
      }
      card.appendChild(btn);
      container.appendChild(card);
    });
  },

  async reloadDriversDropdown() {
    this.drivers = await API.getDrivers();
    const select = document.getElementById('exit-driver-id');
    select.replaceChildren();

    if (this.drivers.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-- Nenhum motorista cadastrado --';
      select.appendChild(opt);
      return;
    }

    this.drivers.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      const freqBadge = d.driver_type === 'fixo' ? ' [FIXO]' : (d.trip_count > 0 ? ` (${d.trip_count} viagens)` : '');
      opt.textContent = `${d.name} ${d.department ? '- ' + d.department : ''}${freqBadge}`;
      select.appendChild(opt);
    });
  },

  async openExitModal(vehicle) {
    document.getElementById('exit-vehicle-id').value = vehicle.id;
    document.getElementById('exit-vehicle-name').textContent = `${vehicle.display_name} (${vehicle.plate})`;
    document.getElementById('exit-odometer').value = vehicle.current_odometer;
    document.getElementById('exit-destination').value = '';
    document.getElementById('exit-purpose').value = '';

    await this.reloadDriversDropdown();
    this.openModal('modal-exit');
  },

  openReturnModal(vehicle, movement) {
    document.getElementById('return-movement-id').value = movement.id;
    document.getElementById('return-vehicle-name').textContent = `${vehicle.display_name} (${vehicle.plate})`;
    document.getElementById('return-departure-info').textContent = `Saída com ${movement.driver ? movement.driver.name : 'Motorista'} (${movement.departure_odometer.toLocaleString()} km)`;
    document.getElementById('return-odometer').value = vehicle.current_odometer;
    document.getElementById('return-notes').value = '';

    this.openModal('modal-return');
  },

  // -------------------------------------------------------------
  // TAB 3: ADMIN (FULL CRUD)
  // -------------------------------------------------------------
  async renderAdmin() {
    try {
      this.vehicles = await API.getStaffVehicles();
      this.drivers = await API.getDrivers();
      this.users = await API.getUsers();
      this.movements = await API.getMovements({ limit: 50 });
      const activeMovements = await API.getMovements({ status: 'em_transito' });
      const activeVehicleIds = new Set(activeMovements.map(m => m.vehicle_id));
      this.setFeedback('admin-feedback');

      // 1. Render Admin Vehicles Table
      const vehTbody = document.getElementById('admin-vehicles-tbody');
      vehTbody.replaceChildren();

      this.vehicles.forEach(v => {
        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        tdId.textContent = v.id;
        
        const tdName = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = v.display_name;
        const br = document.createElement('br');
        const plateSpan = document.createElement('span');
        plateSpan.className = 'vehicle-plate';
        plateSpan.textContent = v.plate;
        tdName.appendChild(strong);
        tdName.appendChild(br);
        tdName.appendChild(plateSpan);

        const tdType = document.createElement('td');
        tdType.textContent = `${v.type} (${v.make} ${v.model})`;

        const tdOdo = document.createElement('td');
        tdOdo.textContent = `${v.current_odometer.toLocaleString()} km`;

        const tdStatus = document.createElement('td');
        tdStatus.appendChild(this.createVehicleBadges(v, activeVehicleIds.has(v.id)));
        if (v.status === 'indisponivel' && v.unavailable_reason) {
          const reason = document.createElement('span');
          reason.className = 'reason-text';
          reason.textContent = `Motivo: ${v.unavailable_reason}`;
          tdStatus.appendChild(reason);
        }

        const tdActions = document.createElement('td');
        const actionsBox = document.createElement('div');
        actionsBox.className = 'actions-cell';
        tdActions.appendChild(actionsBox);

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-secondary btn-sm';
        btnEdit.textContent = '✏️ Editar';
        btnEdit.addEventListener('click', () => this.openVehicleModal(v));
        actionsBox.appendChild(btnEdit);

        // Indisponível is released through the vehicle editor, where ADMIN chooses the next state
        if (v.status !== 'indisponivel') {
          const btnMaint = document.createElement('button');
          btnMaint.className = `btn ${v.status === 'manutencao' ? 'btn-primary' : 'btn-warning'} btn-sm`;
          btnMaint.textContent = v.status === 'manutencao' ? '🟢 Liberar' : '🔧 Manutenção';
          btnMaint.addEventListener('click', async () => {
            const newStatus = v.status === 'manutencao' ? 'disponivel' : 'manutencao';
            try {
              await API.updateVehicle(v.id, { status: newStatus });
              this.showToast(`Status do veículo '${v.display_name}' atualizado!`);
              this.renderAdmin();
            } catch (err) {
              this.showToast(err.message, 'error');
            }
          });
          actionsBox.appendChild(btnMaint);
        }

        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-danger btn-sm';
        btnDel.textContent = '🗑️ Excluir';
        btnDel.addEventListener('click', async () => {
          if (confirm(`Confirma a exclusão do veículo ${v.display_name} (${v.plate})?`)) {
            try {
              await API.deleteVehicle(v.id);
              this.showToast('Veículo excluído com sucesso');
              this.renderAdmin();
            } catch (err) {
              this.showToast(err.message, 'error');
            }
          }
        });
        actionsBox.appendChild(btnDel);

        tr.appendChild(tdId);
        tr.appendChild(tdName);
        tr.appendChild(tdType);
        tr.appendChild(tdOdo);
        tr.appendChild(tdStatus);
        tr.appendChild(tdActions);
        vehTbody.appendChild(tr);
      });

      // 2. Render Admin Drivers Table
      const drvTbody = document.getElementById('admin-drivers-tbody');
      drvTbody.replaceChildren();

      this.drivers.forEach(d => {
        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        tdId.textContent = d.id;

        const tdName = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = d.name;
        tdName.appendChild(strong);

        const tdDept = document.createElement('td');
        tdDept.textContent = d.department || '-';

        const tdCnh = document.createElement('td');
        tdCnh.textContent = d.cnh || '-';

        const tdType = document.createElement('td');
        const typeBadge = document.createElement('span');
        typeBadge.className = `badge badge-${d.driver_type === 'fixo' ? 'disponivel' : 'manutencao'}`;
        typeBadge.textContent = d.driver_type ? d.driver_type.toUpperCase() : 'EVENTUAL';
        tdType.appendChild(typeBadge);

        const tdTrips = document.createElement('td');
        tdTrips.textContent = d.trip_count || 0;

        const tdActions = document.createElement('td');
        tdActions.style.display = 'flex';
        tdActions.style.gap = '6px';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-secondary btn-sm';
        btnEdit.textContent = '✏️ Editar';
        btnEdit.addEventListener('click', () => this.openDriverModal(d));
        tdActions.appendChild(btnEdit);

        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-danger btn-sm';
        btnDel.textContent = '🗑️ Excluir';
        btnDel.addEventListener('click', async () => {
          if (confirm(`Confirma a exclusão do motorista '${d.name}'?`)) {
            try {
              await API.deleteDriver(d.id);
              this.showToast('Motorista excluído');
              this.renderAdmin();
            } catch (err) {
              this.showToast(err.message, 'error');
            }
          }
        });
        tdActions.appendChild(btnDel);

        tr.appendChild(tdId);
        tr.appendChild(tdName);
        tr.appendChild(tdDept);
        tr.appendChild(tdCnh);
        tr.appendChild(tdType);
        tr.appendChild(tdTrips);
        tr.appendChild(tdActions);
        drvTbody.appendChild(tr);
      });

      // 3. Render Admin Users Table
      const usrTbody = document.getElementById('admin-users-tbody');
      usrTbody.replaceChildren();

      this.users.forEach(u => {
        const tr = document.createElement('tr');

        const tdId = document.createElement('td');
        tdId.textContent = u.id;

        const tdUsername = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = u.username;
        tdUsername.appendChild(strong);

        const tdName = document.createElement('td');
        tdName.textContent = u.name;

        const tdRole = document.createElement('td');
        const roleBadge = document.createElement('span');
        roleBadge.className = `badge badge-${u.role === 'admin' ? 'disponivel' : 'manutencao'}`;
        roleBadge.textContent = u.role.toUpperCase();
        tdRole.appendChild(roleBadge);

        const tdStatus = document.createElement('td');
        tdStatus.textContent = u.is_active ? '🟢 Ativo' : '🔴 Inativo';

        const tdActions = document.createElement('td');
        tdActions.style.display = 'flex';
        tdActions.style.gap = '6px';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-secondary btn-sm';
        btnEdit.textContent = '✏️ Editar';
        btnEdit.addEventListener('click', () => this.openUserModal(u));
        tdActions.appendChild(btnEdit);

        if (u.id !== this.currentUser.id) {
          const btnDel = document.createElement('button');
          btnDel.className = 'btn btn-danger btn-sm';
          btnDel.textContent = '🗑️ Excluir';
          btnDel.addEventListener('click', async () => {
            if (confirm(`Confirma a exclusão do usuário '${u.username}'?`)) {
              try {
                await API.deleteUser(u.id);
                this.showToast('Usuário excluído');
                this.renderAdmin();
              } catch (err) {
                this.showToast(err.message, 'error');
              }
            }
          });
          tdActions.appendChild(btnDel);
        }

        tr.appendChild(tdId);
        tr.appendChild(tdUsername);
        tr.appendChild(tdName);
        tr.appendChild(tdRole);
        tr.appendChild(tdStatus);
        tr.appendChild(tdActions);
        usrTbody.appendChild(tr);
      });

      // 4. Render Admin Movements Table with Pagination & High KM Badges
      const movTbody = document.getElementById('admin-movements-tbody');
      movTbody.replaceChildren();

      const totalPages = Math.ceil(this.movements.length / this.movementsPerPage) || 1;
      if (this.movementsPage > totalPages) this.movementsPage = totalPages;
      if (this.movementsPage < 1) this.movementsPage = 1;

      const pageInfo = document.getElementById('movements-page-info');
      if (pageInfo) pageInfo.textContent = `Página ${this.movementsPage} de ${totalPages}`;

      const btnPrev = document.getElementById('btn-prev-movements');
      if (btnPrev) btnPrev.disabled = (this.movementsPage <= 1);
      const btnNext = document.getElementById('btn-next-movements');
      if (btnNext) btnNext.disabled = (this.movementsPage >= totalPages);

      const startIdx = (this.movementsPage - 1) * this.movementsPerPage;
      const paginatedMovements = this.movements.slice(startIdx, startIdx + this.movementsPerPage);

      paginatedMovements.forEach(m => {
        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        tdId.textContent = m.id;

        const tdVeh = document.createElement('td');
        const strongVeh = document.createElement('strong');
        strongVeh.textContent = m.vehicle ? m.vehicle.display_name : '';
        const brVeh = document.createElement('br');
        const spanPlate = document.createElement('span');
        spanPlate.className = 'vehicle-plate';
        spanPlate.textContent = m.vehicle ? m.vehicle.plate : '';
        tdVeh.appendChild(strongVeh);
        tdVeh.appendChild(brVeh);
        tdVeh.appendChild(spanPlate);

        const tdDriver = document.createElement('td');
        tdDriver.textContent = m.driver ? m.driver.name : '';

        const tdDest = document.createElement('td');
        tdDest.textContent = m.destination;

        const tdDep = document.createElement('td');
        tdDep.textContent = m.departure_time ? new Date(m.departure_time).toLocaleString() : '';

        const tdRet = document.createElement('td');
        tdRet.textContent = m.return_time ? new Date(m.return_time).toLocaleString() : 'Em Trânsito';

        const tdDriven = document.createElement('td');
        if (m.return_odometer && m.departure_odometer) {
          const dist = m.return_odometer - m.departure_odometer;
          tdDriven.textContent = `${dist.toLocaleString()} km`;
          if (dist > 1000) {
            const highKmBadge = document.createElement('span');
            highKmBadge.className = 'badge-high-km';
            highKmBadge.textContent = '⚡ > 1.000 km';
            tdDriven.appendChild(highKmBadge);
          }
        } else {
          tdDriven.textContent = '-';
        }

        const tdStatus = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge badge-${m.status}`;
        statusBadge.textContent = m.status === 'em_transito' ? 'Em Trânsito' : 'Concluído';
        tdStatus.appendChild(statusBadge);

        const tdActions = document.createElement('td');
        tdActions.style.display = 'flex';
        tdActions.style.gap = '6px';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-secondary btn-sm';
        btnEdit.textContent = '✏️ Editar';
        btnEdit.addEventListener('click', () => this.openMovementModal(m));
        tdActions.appendChild(btnEdit);

        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-danger btn-sm';
        btnDel.textContent = '🗑️ Excluir';
        btnDel.addEventListener('click', async () => {
          if (confirm(`Confirma a exclusão do registro de movimentação #${m.id}?`)) {
            try {
              await API.deleteMovement(m.id);
              this.showToast('Movimentação excluída com sucesso');
              this.renderAdmin();
            } catch (err) {
              this.showToast(err.message, 'error');
            }
          }
        });
        tdActions.appendChild(btnDel);

        tr.appendChild(tdId);
        tr.appendChild(tdVeh);
        tr.appendChild(tdDriver);
        tr.appendChild(tdDest);
        tr.appendChild(tdDep);
        tr.appendChild(tdRet);
        tr.appendChild(tdDriven);
        tr.appendChild(tdStatus);
        tr.appendChild(tdActions);

        movTbody.appendChild(tr);
      });

      if (this.adminSubtab === 'audit') {
        await this.renderAuditLogs();
      }

    } catch (err) {
      console.error('Error rendering admin:', err);
      this.setFeedback('admin-feedback', `Não foi possível carregar a administração: ${err.message}`);
    }
  },

  async renderAuditLogs() {
    try {
      const logs = await API.getAuditLogs({ limit: 50 });
      const tbody = document.getElementById('admin-audit-tbody');
      if (!tbody) return;
      tbody.replaceChildren();

      if (logs.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.textContent = 'Nenhum log de auditoria registrado ainda.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      logs.forEach(l => {
        const tr = document.createElement('tr');

        const tdId = document.createElement('td');
        tdId.textContent = l.id;

        const tdTime = document.createElement('td');
        tdTime.textContent = new Date(l.created_at).toLocaleString();

        const tdUser = document.createElement('td');
        tdUser.textContent = l.username;

        const tdAction = document.createElement('td');
        const actionBadge = document.createElement('span');
        actionBadge.className = `badge badge-${l.action === 'DELETE' ? 'manutencao' : 'disponivel'}`;
        actionBadge.textContent = l.action;
        tdAction.appendChild(actionBadge);

        const tdResource = document.createElement('td');
        tdResource.textContent = l.resource;

        const tdDetails = document.createElement('td');
        tdDetails.textContent = l.details || '-';

        tr.appendChild(tdId);
        tr.appendChild(tdTime);
        tr.appendChild(tdUser);
        tr.appendChild(tdAction);
        tr.appendChild(tdResource);
        tr.appendChild(tdDetails);

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('Error rendering audit logs:', err);
    }
  },

  // -------------------------------------------------------------
  // ADMIN MODAL HANDLERS
  // -------------------------------------------------------------
  populateVehicleStatusOptions(currentStatus) {
    const select = document.getElementById('vehicle-status');
    select.replaceChildren();
    const options = ['disponivel', 'manutencao', 'indisponivel'];
    // Em Trânsito is set by exits; it is only kept as an option for vehicles already in that state
    if (currentStatus === 'em_uso') options.unshift('em_uso');
    options.forEach(value => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = this.STATUS_LABELS[value];
      select.appendChild(opt);
    });

    const hint = document.getElementById('vehicle-status-hint');
    hint.textContent = currentStatus === 'indisponivel'
      ? 'Para remover o bloqueio, escolha Disponível ou Em manutenção.'
      : 'Indisponível bloqueia novas saídas por motivo diferente de manutenção.';
  },

  updateVehicleReasonVisibility() {
    const isUnavailable = document.getElementById('vehicle-status').value === 'indisponivel';
    document.getElementById('vehicle-reason-group').style.display = isUnavailable ? 'block' : 'none';
  },

  openVehicleModal(vehicle = null) {
    const title = document.getElementById('modal-vehicle-title');
    const editId = document.getElementById('vehicle-edit-id');
    this.populateVehicleStatusOptions(vehicle ? vehicle.status : null);

    if (vehicle) {
      title.textContent = `🚗 Editar Veículo #${vehicle.id}`;
      editId.value = vehicle.id;
      document.getElementById('vehicle-display-name').value = vehicle.display_name;
      document.getElementById('vehicle-plate').value = vehicle.plate;
      document.getElementById('vehicle-type').value = vehicle.type;
      document.getElementById('vehicle-make').value = vehicle.make;
      document.getElementById('vehicle-model').value = vehicle.model;
      document.getElementById('vehicle-color').value = vehicle.color;
      document.getElementById('vehicle-fuel').value = vehicle.fuel;
      document.getElementById('vehicle-odometer').value = vehicle.current_odometer;
      document.getElementById('vehicle-year-manuf').value = vehicle.year_manufacture;
      document.getElementById('vehicle-year-model').value = vehicle.year_model;
      document.getElementById('vehicle-renavam').value = vehicle.renavam || '';
      document.getElementById('vehicle-chassis').value = vehicle.chassis || '';
      document.getElementById('vehicle-status').value = vehicle.status;
      document.getElementById('vehicle-unavailable-reason').value = vehicle.unavailable_reason || '';
    } else {
      title.textContent = '🚗 Cadastrar Novo Veículo';
      editId.value = '';
      document.getElementById('form-admin-vehicle').reset();
      document.getElementById('vehicle-status').value = 'disponivel';
    }
    this.updateVehicleReasonVisibility();
    this.openModal('modal-admin-vehicle');
  },

  async handleSaveVehicle() {
    const editId = document.getElementById('vehicle-edit-id').value;
    const data = {
      display_name: document.getElementById('vehicle-display-name').value.trim(),
      plate: document.getElementById('vehicle-plate').value.trim().toUpperCase(),
      type: document.getElementById('vehicle-type').value.trim(),
      make: document.getElementById('vehicle-make').value.trim(),
      model: document.getElementById('vehicle-model').value.trim(),
      color: document.getElementById('vehicle-color').value.trim(),
      fuel: document.getElementById('vehicle-fuel').value.trim(),
      current_odometer: parseInt(document.getElementById('vehicle-odometer').value),
      year_manufacture: parseInt(document.getElementById('vehicle-year-manuf').value),
      year_model: parseInt(document.getElementById('vehicle-year-model').value),
      renavam: document.getElementById('vehicle-renavam').value.trim() || null,
      chassis: document.getElementById('vehicle-chassis').value.trim() || null,
      status: document.getElementById('vehicle-status').value
    };
    data.unavailable_reason = data.status === 'indisponivel'
      ? (document.getElementById('vehicle-unavailable-reason').value.trim() || null)
      : null;

    try {
      if (editId) {
        await API.updateVehicle(editId, data);
        this.showToast('Veículo atualizado com sucesso!');
      } else {
        await API.createVehicle(data);
        this.showToast('Veículo cadastrado com sucesso!');
      }
      this.closeModal('modal-admin-vehicle');
      this.renderAdmin();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  openDriverModal(driver = null) {
    const title = document.getElementById('modal-driver-title');
    const editId = document.getElementById('driver-edit-id');

    if (driver) {
      title.textContent = `👤 Editar Motorista #${driver.id}`;
      editId.value = driver.id;
      document.getElementById('driver-name').value = driver.name;
      document.getElementById('driver-department').value = driver.department || '';
      document.getElementById('driver-cnh').value = driver.cnh || '';
      document.getElementById('driver-type').value = driver.driver_type || 'eventual';
    } else {
      title.textContent = '👤 Cadastrar Novo Motorista';
      editId.value = '';
      document.getElementById('form-admin-driver').reset();
    }
    this.openModal('modal-admin-driver');
  },

  async handleSaveDriver() {
    const editId = document.getElementById('driver-edit-id').value;
    const data = {
      name: document.getElementById('driver-name').value.trim(),
      department: document.getElementById('driver-department').value.trim() || null,
      cnh: document.getElementById('driver-cnh').value.trim() || null,
      driver_type: document.getElementById('driver-type').value
    };

    try {
      if (editId) {
        await API.updateDriver(editId, data);
        this.showToast('Motorista atualizado com sucesso!');
      } else {
        await API.createDriver(data);
        this.showToast('Motorista cadastrado com sucesso!');
      }
      this.closeModal('modal-admin-driver');
      this.renderAdmin();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  openUserModal(user = null) {
    const title = document.getElementById('modal-user-title');
    const editId = document.getElementById('user-edit-id');
    const pwdHint = document.getElementById('user-password-hint');

    if (user) {
      title.textContent = `🔑 Editar Usuário #${user.id}`;
      editId.value = user.id;
      document.getElementById('user-username').value = user.username;
      document.getElementById('user-name').value = user.name;
      document.getElementById('user-role').value = user.role;
      document.getElementById('user-password').value = '';
      pwdHint.textContent = '(deixe em branco para manter a mesma senha)';
    } else {
      title.textContent = '🔑 Cadastrar Novo Usuário';
      editId.value = '';
      document.getElementById('form-admin-user').reset();
      pwdHint.textContent = '(obrigatória para novo usuário)';
    }
    this.openModal('modal-admin-user');
  },

  async handleSaveUser() {
    const editId = document.getElementById('user-edit-id').value;
    const password = document.getElementById('user-password').value;
    const data = {
      username: document.getElementById('user-username').value.trim(),
      name: document.getElementById('user-name').value.trim(),
      role: document.getElementById('user-role').value
    };

    if (password) {
      data.password = password;
    } else if (!editId) {
      this.showToast('Digite uma senha para o novo usuário', 'error');
      return;
    }

    try {
      if (editId) {
        await API.updateUser(editId, data);
        this.showToast('Usuário atualizado com sucesso!');
      } else {
        await API.createUser(data);
        this.showToast('Usuário criado com sucesso!');
      }
      this.closeModal('modal-admin-user');
      this.renderAdmin();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async openMovementModal(movement) {
    document.getElementById('modal-movement-title').textContent = `📋 Editar Movimentação #${movement.id}`;
    document.getElementById('movement-edit-id').value = movement.id;

    // Populate vehicles select
    const vehSelect = document.getElementById('movement-vehicle-id');
    vehSelect.replaceChildren();
    this.vehicles.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.display_name} (${v.plate})`;
      if (v.id === movement.vehicle_id) opt.selected = true;
      vehSelect.appendChild(opt);
    });

    // Populate drivers select
    const drvSelect = document.getElementById('movement-driver-id');
    drvSelect.replaceChildren();
    this.drivers.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      if (d.id === movement.driver_id) opt.selected = true;
      drvSelect.appendChild(opt);
    });

    document.getElementById('movement-destination').value = movement.destination || '';
    document.getElementById('movement-purpose').value = movement.purpose || '';
    document.getElementById('movement-departure-odometer').value = movement.departure_odometer;
    document.getElementById('movement-return-odometer').value = movement.return_odometer || '';
    document.getElementById('movement-status').value = movement.status;
    document.getElementById('movement-notes').value = movement.notes || '';

    this.openModal('modal-admin-movement');
  },

  async handleSaveMovement() {
    const editId = document.getElementById('movement-edit-id').value;
    const retOdo = document.getElementById('movement-return-odometer').value;

    const data = {
      vehicle_id: parseInt(document.getElementById('movement-vehicle-id').value),
      driver_id: parseInt(document.getElementById('movement-driver-id').value),
      destination: document.getElementById('movement-destination').value.trim(),
      purpose: document.getElementById('movement-purpose').value.trim() || null,
      departure_odometer: parseInt(document.getElementById('movement-departure-odometer').value),
      return_odometer: retOdo ? parseInt(retOdo) : null,
      status: document.getElementById('movement-status').value,
      notes: document.getElementById('movement-notes').value.trim() || null
    };

    try {
      await API.updateMovement(editId, data);
      this.showToast('Movimentação atualizada com sucesso!');
      this.closeModal('modal-admin-movement');
      this.renderAdmin();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }
};
