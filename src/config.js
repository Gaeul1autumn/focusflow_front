const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080' 
  : 'https://focusflow-back-83tb.onrender.com';

export default API_BASE_URL;