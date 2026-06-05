// Global API Configuration
window.API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port !== '5002' ? 'http://localhost:5002/api' : '/api')
  : '/api';
