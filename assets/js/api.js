/**
 * Wrapper komunikasi ke Google Apps Script Web App.
 * GANTI SCRIPT_URL di bawah dengan URL deployment Web App Anda
 * (Deploy > New deployment > Web app, lalu salin URL /exec).
 */
const API = (() => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/GANTI_DENGAN_DEPLOYMENT_ID/exec';

  function getToken() {
    return localStorage.getItem('kdtb_token');
  }

  function resolvePath(page) {
    const inPages = window.location.pathname.includes('/pages/');
    return inPages ? '../' + page : page;
  }

  async function get(action, params) {
    params = params || {};
    const url = new URL(SCRIPT_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', getToken() || '');
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        url.searchParams.set(k, params[k]);
      }
    });
    const res = await fetch(url.toString());
    return handleResponse(res);
  }

  async function post(action, data) {
    data = data || {};
    const body = JSON.stringify(Object.assign({ action: action, token: getToken() }, data));
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body
    });
    return handleResponse(res);
  }

  async function handleResponse(res) {
    let json;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error('Respon server tidak valid.');
    }
    if (json && json.success === false && json.message === 'Sesi tidak valid. Silakan login kembali.') {
      localStorage.removeItem('kdtb_token');
      localStorage.removeItem('kdtb_user');
      window.location.href = resolvePath('login.html');
    }
    return json;
  }

  return { get: get, post: post, getToken: getToken, resolvePath: resolvePath };
})();
