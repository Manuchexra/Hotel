// utils.js
const Utils = {
    // DOM element yaratish
    createElement(tag, className, innerHTML = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (innerHTML) el.innerHTML = innerHTML;
        return el;
    },

    // Fetch xatoliklarini boshqarish
    handleError(error) {
        console.error('Error:', error);
        const msg = error.message || 'Xatolik yuz berdi';
        this.showToast(msg, 'error');
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '8px';
        toast.style.color = '#fff';
        toast.style.zIndex = '10000';
        toast.style.fontSize = '14px';
        if (type === 'error') toast.style.backgroundColor = '#ef4444';
        else if (type === 'success') toast.style.backgroundColor = '#10b981';
        else toast.style.backgroundColor = '#3b82f6';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    
    // API endpointlarini backend servislarga moslashtirish (Nginx yoki to‘g‘ridan-to‘g‘ri)
    getBaseUrl(service) {
        const ports = {
            panel: 'http://localhost:8000',
            reception: 'http://localhost:8001',
            housekeeping: 'http://localhost:8002',
            roomservice: 'http://localhost:8003',
            maintenance: 'http://localhost:8004',
            billing: 'http://localhost:8005',
            hr: 'http://localhost:8006'
        };
        return ports[service] || ports.panel;
    }
};
