// auth.js
const Auth = {
    token: null,
    user: null,
    role: null,

    init() {
        this.token = localStorage.getItem('hotel_token');
        this.user = localStorage.getItem('hotel_user');
        this.role = localStorage.getItem('hotel_role');
        if (this.token) {
            API.setToken(this.token);
            return true;
        }
        return false;
    },

    async login(username, password) {
        try {
            const data = await API.login(username, password);
            if (data.access_token) {
                this.token = data.access_token;
                this.user = username;
                this.role = data.role;
                localStorage.setItem('hotel_token', this.token);
                localStorage.setItem('hotel_user', this.user);
                localStorage.setItem('hotel_role', this.role);
                API.setToken(this.token);
                return { success: true, role: this.role };
            } else {
                return { success: false, message: 'Token olinmadi' };
            }
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    logout() {
        this.token = null;
        this.user = null;
        this.role = null;
        localStorage.removeItem('hotel_token');
        localStorage.removeItem('hotel_user');
        localStorage.removeItem('hotel_role');
        API.setToken(null);
        if (window.ws) window.ws.close();
        window.location.hash = '#login';
        window.location.reload();
    },

    getRole() {
        return this.role;
    },

    isAuthenticated() {
        return !!this.token;
    }
};