// ============================================================
// CAG BUS ZIMBABWE - API CLIENT & LIVE FEATURES
// ============================================================

const API_BASE = '/api';

// ===== TOAST NOTIFICATION SYSTEM =====
let toastIdCounter = 0;

function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) {
    const div = document.createElement('div');
    div.id = 'toastContainer';
    div.className = 'toast-container';
    document.body.appendChild(div);
  }
  const c = document.getElementById('toastContainer');
  const id = ++toastIdCounter;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.id = `toast-${id}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="dismissToast(${id})">&times;</button>
    <div class="toast-progress"></div>
  `;
  c.appendChild(toast);

  setTimeout(() => dismissToast(id), duration);
  return id;
}

function dismissToast(id) {
  const t = document.getElementById(`toast-${id}`);
  if (t) {
    t.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }
}

window.showToast = showToast;
window.dismissToast = dismissToast;

// ===== LIVE CLOCK =====
function initLiveClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  function update() {
    const now = new Date();
    const opts = { timeZone: 'Africa/Harare', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    el.textContent = now.toLocaleTimeString('en-US', opts);
    el.setAttribute('data-full', now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }
  update();
  setInterval(update, 1000);
}

// ===== API CLIENT =====
const api = {
  getToken: () => localStorage.getItem('cag_token'),
  getAdminToken: () => localStorage.getItem('cag_admin_token'),

  async request(method, endpoint, data = null, useAdminToken = false) {
    const headers = { 'Content-Type': 'application/json' };
    const token = useAdminToken ? this.getAdminToken() : this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      return result;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) throw new Error('Network error. Check your connection.');
      throw error;
    }
  },

  get: (endpoint, admin = false) => api.request('GET', endpoint, null, admin),
  post: (endpoint, data, admin = false) => api.request('POST', endpoint, data, admin),
  put: (endpoint, data, admin = false) => api.request('PUT', endpoint, data, admin),
  del: (endpoint, admin = false) => api.request('DELETE', endpoint, null, admin),

  // Auth
  auth: {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword: (current, next) => api.put('/auth/change-password', { current_password: current, new_password: next }),
  },

  // Admin
  admin: {
    login: (username, password) => api.post('/admin/login', { username, password }),
    me: () => api.get('/admin/me', true),
    dashboard: () => api.get('/admin/dashboard', true),
    settings: () => api.get('/admin/settings', true),
  },

  // Buses
  buses: {
    list: (type = '') => api.get(`/buses${type ? `?type=${type}` : ''}`),
    get: (id) => api.get(`/buses/${id}`),
    create: (data) => api.post('/buses', data, true),
    update: (id, data) => api.put(`/buses/${id}`, data, true),
    delete: (id) => api.del(`/buses/${id}`, true),
  },

  // Routes (Zimbabwe)
  routes: {
    list: () => api.get('/routes'),
    origins: () => api.get('/routes/origins'),
    destinations: (origin = '') => api.get(`/routes/destinations${origin ? `?origin=${encodeURIComponent(origin)}` : ''}`),
    get: (id) => api.get(`/routes/${id}`),
    create: (data) => api.post('/routes', data, true),
    update: (id, data) => api.put(`/routes/${id}`, data, true),
    delete: (id) => api.del(`/routes/${id}`, true),
  },

  // Schedules
  schedules: {
    search: (origin, destination, date) =>
      api.get(`/schedules/available?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}`),
    get: (id) => api.get(`/schedules/${id}`),
    create: (data) => api.post('/schedules', data, true),
    update: (id, data) => api.put(`/schedules/${id}`, data, true),
    delete: (id) => api.del(`/schedules/${id}`, true),
  },

  // Drivers
  drivers: {
    list: () => api.get('/drivers'),
  },

  // Seats
  seats: {
    getLayout: (scheduleId, date) => api.get(`/seats/${scheduleId}/${date}`),
    checkAvailability: (schedule_id, travel_date, seat_ids) =>
      api.post('/seats/check-availability', { schedule_id, travel_date, seat_ids }),
  },

  // Bookings
  bookings: {
    create: (data) => api.post('/bookings/create', data),
    myBookings: () => api.get('/bookings/my-bookings'),
    get: (ref) => api.get(`/bookings/${ref}`),
    cancel: (id) => api.put(`/bookings/${id}/cancel`),
    adminAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/bookings/admin/all${q ? `?${q}` : ''}`, true);
    },
    updateStatus: (id, status) => api.put(`/bookings/admin/${id}/status`, { status }, true),
  },

  // Payments
  payments: {
    process: (data) => api.post('/payments/process', data),
    reports: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/payments/reports${q ? `?${q}` : ''}`, true);
    },
  },

  // Tickets
  tickets: {
    get: (ref) => api.get(`/tickets/${ref}`),
  },

  // Users
  users: {
    list: (search = '') => api.get(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, true),
    stats: () => api.get('/users/stats', true),
    get: (id) => api.get(`/users/${id}`, true),
  },
};

// ===== UTILITY FUNCTIONS =====

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatZWL(amount) {
  // Show both USD and ZWL equivalent
  const usd = formatCurrency(amount);
  const zwl = (amount * 350).toLocaleString('en-US');
  return `${usd} (~ZWL $${zwl})`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
}

function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-ZW', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const h = parseInt(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h > 12 ? h - 12 : h || 12;
  return `${hour12}:${m} ${ampm}`;
}

function getStatusBadge(status) {
  const map = {
    pending: 'badge-gold',
    confirmed: 'badge-green',
    cancelled: 'badge-red',
    completed: 'badge-blue',
    refunded: 'badge-red',
    success: 'badge-green',
    failed: 'badge-red'
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

function getBusTypeIcon(type) {
  const icons = {
    luxury: '⭐',
    sleeper: '🛏️',
    ac: '❄️',
    standard: '🚌',
    non_ac: '🚌'
  };
  return icons[type] || '🚌';
}

function truncateText(text, max = 30) {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

function logout() {
  localStorage.removeItem('cag_token');
  localStorage.removeItem('cag_user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => window.location.href = '/customer/login.html', 500);
}

function adminLogout() {
  localStorage.removeItem('cag_admin_token');
  localStorage.removeItem('cag_admin_user');
  showToast('Logged out of admin panel', 'info');
  setTimeout(() => window.location.href = '/admin/login.html', 500);
}

function showLoading(container) {
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

function clearAlerts(container) {
  if (container) container.querySelectorAll('.alert').forEach(a => a.remove());
}

// ===== ZIMBABWE CITIES LIST =====
const ZIMBABWE_CITIES = [
  'Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Gweru', 'Kwekwe',
  'Kadoma', 'Masvingo', 'Chinhoyi', 'Marondera', 'Victoria Falls',
  'Beitbridge', 'Hwange', 'Bindura', 'Chegutu', 'Rusape', 'Chipinge',
  'Zvishavane', 'Gwanda', 'Lupane', 'Plumtree', 'Kariba', 'Norton',
  'Epworth', 'Ruwa', 'Redcliff', 'Gokwe', 'Mvurwi', 'Shamva', 'Murewa',
  'Chiredzi', 'Triangle', 'Nyanga', 'Karoi', 'Makuti'
];

// ===== INIT ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();
});
