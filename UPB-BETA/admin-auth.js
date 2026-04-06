const ADMIN_SESSION_KEY = 'upb_admin_session';

function getAdminSession() {
    try {
        const raw = localStorage.getItem(ADMIN_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function isAdminAuthenticated() {
    const session = getAdminSession();
    return !!(session && session.isLoggedIn);
}

function setAdminSession(userData) {
    const session = {
        username: userData.username || userData,
        role: userData.role || 'admin',
        userId: userData.id || null,
        isLoggedIn: true,
        loginAt: new Date().toISOString()
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return session;
}

function clearAdminSession() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
}

function requireAdminSession() {
    if (!isAdminAuthenticated()) {
        window.location.href = './login.html';
        return false;
    }
    return true;
}

window.getAdminSession = getAdminSession;
window.isAdminAuthenticated = isAdminAuthenticated;
window.setAdminSession = setAdminSession;
window.clearAdminSession = clearAdminSession;
window.requireAdminSession = requireAdminSession;
