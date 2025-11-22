// assets/auth.js - Gestion de l'authentification

function checkAuth() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('⚠️ No token found, redirecting to login');
    window.location.href = 'login.html';
    return false;
  }
  
  return true;
}

async function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (user.username) {
    const userNameElements = document.querySelectorAll('#userName');
    userNameElements.forEach(el => {
      el.textContent = user.username;
    });
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}