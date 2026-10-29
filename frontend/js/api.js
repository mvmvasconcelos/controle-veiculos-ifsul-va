// API Service Client for Controle de Veículos IFSul
const API_BASE_URL = window.location.pathname.startsWith('/controle-veiculos') 
  ? '/controle-veiculos/api/v1' 
  : '/api/v1';

const API = {
  getToken() {
    return localStorage.getItem('ifsul_auth_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('ifsul_auth_token', token);
    } else {
      localStorage.removeItem('ifsul_auth_token');
    }
  },

  getUser() {
    const u = localStorage.getItem('ifsul_auth_user');
    return u ? JSON.parse(u) : null;
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('ifsul_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ifsul_auth_user');
    }
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = options.headers || {};
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    options.headers = headers;

    try {
      const response = await fetch(url, options);
      if (response.status === 401) {
        this.setToken(null);
        this.setUser(null);
      }
      
      const data = await response.json().catch(() => null);
      
      if (!response.ok) {
        const errorMsg = (data && data.detail) ? data.detail : 'Erro na requisição';
        throw new Error(errorMsg);
      }
      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  // Auth Endpoints
  async login(username, password) {
    const res = await this.request('/auth/login/json', {
      method: 'POST',
      body: { username, password }
    });
    this.setToken(res.access_token);
    this.setUser(res.user);
    return res.user;
  },

  async getMe() {
    return await this.request('/auth/me');
  },

  logout() {
    this.setToken(null);
    this.setUser(null);
    window.location.reload();
  },

  // Dashboard Endpoint
  async getDashboardSummary() {
    return await this.request('/dashboard/summary');
  },

  // Vehicles Endpoints
  async getVehicles() {
    return await this.request('/vehicles');
  },

  async getStaffVehicles() {
    return await this.request('/vehicles/staff');
  },

  async createVehicle(data) {
    return await this.request('/vehicles', { method: 'POST', body: data });
  },

  async updateVehicle(id, data) {
    return await this.request(`/vehicles/${id}`, { method: 'PUT', body: data });
  },

  async deleteVehicle(id) {
    return await this.request(`/vehicles/${id}`, { method: 'DELETE' });
  },

  // Drivers Endpoints
  async getDrivers() {
    return await this.request('/drivers');
  },

  async createDriver(data) {
    return await this.request('/drivers', { method: 'POST', body: data });
  },

  async updateDriver(id, data) {
    return await this.request(`/drivers/${id}`, { method: 'PUT', body: data });
  },

  async deleteDriver(id) {
    return await this.request(`/drivers/${id}`, { method: 'DELETE' });
  },

  // Movements Endpoints
  async getMovements(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/movements${query ? '?' + query : ''}`);
  },

  async recordExit(data) {
    return await this.request('/movements/exit', { method: 'POST', body: data });
  },

  async recordReturn(id, data) {
    return await this.request(`/movements/${id}/return`, { method: 'POST', body: data });
  },

  async updateMovement(id, data) {
    return await this.request(`/movements/${id}`, { method: 'PUT', body: data });
  },

  async deleteMovement(id) {
    return await this.request(`/movements/${id}`, { method: 'DELETE' });
  },

  // Users Endpoints
  async getUsers() {
    return await this.request('/users');
  },

  async createUser(data) {
    return await this.request('/users', { method: 'POST', body: data });
  },

  async updateUser(id, data) {
    return await this.request(`/users/${id}`, { method: 'PUT', body: data });
  },

  async deleteUser(id) {
    return await this.request(`/users/${id}`, { method: 'DELETE' });
  },

  async refreshToken() {
    const res = await this.request('/auth/refresh', { method: 'POST' });
    this.setToken(res.access_token);
    this.setUser(res.user);
    return res;
  },

  // Audit Logs
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/audit-logs${query ? '?' + query : ''}`);
  },

  // Reports
  getExportCsvUrl() {
    return `${API_BASE_URL}/reports/export/csv`;
  }
};
