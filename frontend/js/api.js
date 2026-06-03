// api.js
const API = {
    token: null,

    setToken(token) {
        this.token = token;
    },

    async request(service, endpoint, options = {}) {
        const baseUrl = Utils.getBaseUrl(service);
        const url = `${baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        const config = {
            ...options,
            headers
        };
        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP ${response.status}`);
            }
            if (response.status === 204) return null;
            return await response.json();
        } catch (err) {
            if (!options.silent) {
                Utils.handleError(err);
            }
            throw err;
        }
    },

    // Auth
    login(username, password) {
        return this.request('panel', '/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },

    getUsers() {
        return this.request('panel', '/users');
    },

    getUser(username) {
        return this.request('panel', `/users/${encodeURIComponent(username)}`);
    },

    // Reception
    getRooms() {
        return this.request('reception', '/reception/rooms');
    },
    createRoom(room) {
        return this.request('reception', '/reception/rooms', {
            method: 'POST',
            body: JSON.stringify(room)
        });
    },
    updateRoom(roomNumber, updates) {
        return this.request('reception', `/reception/rooms/${roomNumber}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },
    deleteRoom(roomNumber) {
        return this.request('reception', `/reception/rooms/${roomNumber}`, {
            method: 'DELETE'
        });
    },
    // BUG FIX #8: Xona holatini yangilash (room-management.js uchun kerak)
    updateRoomStatus(roomNumber, newStatus) {
        return this.request('reception', `/reception/rooms/${roomNumber}/status`, {
            method: 'PUT',
            body: JSON.stringify({ new_status: newStatus })
        });
    },
    checkin(data) {
        return this.request('reception', '/reception/checkin', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    checkout(guestId) {
        return this.request('reception', '/reception/checkout', {
            method: 'POST',
            body: JSON.stringify({ guest_id: guestId })
        });
    },
    getGuests() {
        return this.request('reception', '/reception/guests');
    },

    // Housekeeping
    startCleaning(roomId) {
        return this.request('housekeeping', '/housekeeping/start', {
            method: 'POST',
            body: JSON.stringify({ room_id: roomId })
        });
    },
    finishCleaning(roomId) {
        return this.request('housekeeping', '/housekeeping/finish', {
            method: 'POST',
            body: JSON.stringify({ room_id: roomId })
        });
    },
    getCleaningQueue() {
        return this.request('housekeeping', '/housekeeping/queue');
    },
    getCleanedRooms() {
        return this.request('housekeeping', '/housekeeping/cleaned');
    },

    // RoomService
    createOrder(order) {
        return this.request('roomservice', '/roomservice/orders/create', {
            method: 'POST',
            body: JSON.stringify(order)
        });
    },
    updateOrderStatus(orderId, status) {
        return this.request('roomservice', `/roomservice/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },
    getOrders() {
        return this.request('roomservice', '/roomservice/orders');
    },
    getOrdersByRoom(roomId) {
        return this.request('roomservice', `/roomservice/orders/room/${roomId}`);
    },

    // Maintenance
    createIssue(issue) {
        return this.request('maintenance', '/maintenance/issues/create', {
            method: 'POST',
            body: JSON.stringify(issue)
        });
    },
    assignIssue(issueId, technicianName) {
        return this.request('maintenance', `/maintenance/issues/${issueId}/assign`, {
            method: 'PUT',
            body: JSON.stringify({ technician_name: technicianName })
        });
    },
    resolveIssue(issueId) {
        return this.request('maintenance', `/maintenance/issues/${issueId}/resolve`, {
            method: 'PUT'
        });
    },
    getIssues(options = {}) {
        return this.request('maintenance', '/maintenance/issues', options);
    },
    getPriorityQueue() {
        return this.request('maintenance', '/maintenance/priority/queue');
    },
    getPerformance(period = 'all', options = {}) {
        return this.request('maintenance', `/maintenance/performance?period=${period}`, options);
    },
    getPriorityLimits(options = {}) {
        return this.request('maintenance', '/maintenance/priority/limits', options);
    },
    savePriorityLimits(limits) {
        return this.request('maintenance', '/maintenance/priority/limits', {
            method: 'PUT',
            body: JSON.stringify(limits)
        });
    },

    // Billing
    getBill(guestId) {
        return this.request('billing', `/billing/${guestId}`);
    },
    finalizeBill(guestId) {
        return this.request('billing', `/billing/finalize`, {
            method: 'POST',
            body: JSON.stringify({ guest_id: guestId })
        });
    },
    addBillItem(guestId, description, amount) {
        return this.request('billing', `/billing/add`, {
            method: 'POST',
            body: JSON.stringify({ guest_id: guestId, description, amount })
        });
    },
    applyDiscount(guestId, discountPercent) {
        return this.request('billing', `/billing/discount`, {
            method: 'POST',
            body: JSON.stringify({ guest_id: guestId, discount_percent: discountPercent })
        });
    },

    // Messages
    getMyMessages() {
        return this.request('panel', '/users/messages');
    },
    sendMessage(to, text) {
        return this.request('panel', '/admin/messages', {
            method: 'POST',
            body: JSON.stringify({ to, text })
        });
    },
    markMessageRead(messageId) {
        return this.request('panel', `/users/messages/${messageId}/read`, {
            method: 'PUT'
        });
    }
};
