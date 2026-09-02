const Auth = (() => {
  function saveSession(token, user) {
    localStorage.setItem('kdtb_token', token);
    localStorage.setItem('kdtb_user', JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem('kdtb_token');
    localStorage.removeItem('kdtb_user');
  }

  function getUser() {
    const raw = localStorage.getItem('kdtb_user');
    return raw ? JSON.parse(raw) : null;
  }

  function requireLogin() {
    if (!API.getToken()) {
      window.location.href = API.resolvePath('login.html');
    }
  }

  async function login(username, password) {
    return API.post('login', { username: username, password: password });
  }

  async function logout() {
    try { await API.post('logout', {}); } catch (e) { /* tetap lanjut logout lokal */ }
    clearSession();
    window.location.href = API.resolvePath('login.html');
  }

  return { saveSession, clearSession, getUser, requireLogin, login, logout };
})();
