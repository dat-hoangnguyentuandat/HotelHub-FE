/**
 * api-config.js - Centralized API configuration
 * This file should be loaded before any other JavaScript files
 */

// Get backend URL from window (injected by Thymeleaf) or fallback to localhost
window.API_BASE_URL = window.BACKEND_URL || 'http://localhost:8081';
window.API_BASE = window.API_BASE_URL + '/api';

console.log('API Base URL:', window.API_BASE_URL);
