const Tracker = {
    endpoint: '../api-tracking.php',
    geoEndpoint: '../api-diagnostico.php',
    storageKeys: {
        fbc: 'mr_diag_fbc',
        fbp: 'mr_diag_fbp',
        externalId: 'mr_diag_external_id',
    },

    getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    },

    setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = name + '=' + value + ';expires=' + expires + ';path=/;SameSite=Lax';
    },

    getStored(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (_) {
            return null;
        }
    },

    setStored(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (_) {}
    },

    getExternalId() {
        let id = this.getCookie('_ext_id') || this.getStored(this.storageKeys.externalId);
        if (!id) {
            id = 'eid_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            this.setCookie('_ext_id', id, 180);
            this.setStored(this.storageKeys.externalId, id);
        }
        return id;
    },

    getFbc() {
        const cookie = this.getCookie('_fbc');
        if (cookie) {
            this.setStored(this.storageKeys.fbc, cookie);
            return cookie;
        }
        const match = window.location.search.match(/fbclid=([^&]*)/);
        if (match) {
            const fbc = 'fb.1.' + Date.now() + '.' + match[1];
            this.setCookie('_fbc', fbc, 90);
            this.setStored(this.storageKeys.fbc, fbc);
            return fbc;
        }
        return this.getStored(this.storageKeys.fbc);
    },

    getFbp() {
        const cookie = this.getCookie('_fbp');
        if (cookie) {
            this.setStored(this.storageKeys.fbp, cookie);
            return cookie;
        }
        const stored = this.getStored(this.storageKeys.fbp);
        if (stored) {
            this.setCookie('_fbp', stored, 90);
            return stored;
        }
        const seed = Math.floor(Math.random() * 1e10);
        const fbp = 'fb.1.' + Date.now() + '.' + seed;
        this.setCookie('_fbp', fbp, 90);
        this.setStored(this.storageKeys.fbp, fbp);
        return fbp;
    },

    normalizeEmail(email) {
        return String(email || '').trim().toLowerCase() || null;
    },

    normalizePhone(phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        return digits || null;
    },

    getGeo() {
        if (window.__diagGeo) return Promise.resolve(window.__diagGeo);
        return fetch(this.geoEndpoint)
            .then((r) => r.ok ? r.json() : null)
            .then((result) => {
                const geo = (result && result.geo) ? result.geo : {};
                window.__diagGeo = geo;
                return geo;
            })
            .catch(() => ({}));
    },

    track(eventName, customData = {}, userData = {}) {
        const eventId = 'evt_' + Math.random().toString(36).slice(2) + '_' + Date.now();
        const fbp = this.getFbp();
        const fbc = this.getFbc();

        if (typeof fbq === 'function') {
            fbq('track', eventName, customData, { eventID: eventId });
        }

        const payload = {
            eventName,
            eventId,
            eventUrl: window.location.href,
            fbp: fbp,
            fbc: fbc,
            external_id: userData.external_id || this.getExternalId(),
            email: this.normalizeEmail(userData.email),
            phone: this.normalizePhone(userData.phone),
            fn: userData.fn || null,
            ln: userData.ln || null,
            custom_data: customData,
        };

        return fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then((r) => r.json())
        .catch(() => null);
    },
};

document.addEventListener('DOMContentLoaded', () => {
    Tracker.getGeo().then((geo) => {
        Tracker.track('PageView', {
            form_type: 'diagnostico_personalizado',
            cidade: geo.cidade || '',
            estado: geo.estado || '',
            pais: geo.pais || '',
        });
    });
});
