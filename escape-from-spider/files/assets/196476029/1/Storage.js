class Storage {
    constructor(key, defaultData = {}, options = {}) {
        this.options = {
            key: key,
            useLocalStorage: true,
            useCookies: false,
            cookieExpirationDays: 365,
            ...options
        };

        this.localStorageAvailable = this.checkLocalStorageAvailability();
        this._data = this.load(defaultData);

        setInterval(() => {
            this.save();
        }, 1000);

        return this._data;
    }

    load(defaultData) {
        let data;
        if (this.options.useLocalStorage && this.localStorageAvailable) {
            data = localStorage.getItem(this.options.key);
        }
        if (!data && this.options.useCookies) {
            data = this.getCookie(this.options.key);
        }
        return data ? JSON.parse(data) : defaultData;
    }

    save() {
        const data = JSON.stringify(this._data);
        if (this.options.useLocalStorage && this.localStorageAvailable) {
            localStorage.setItem(this.options.key, data);
        }
        if (this.options.useCookies) {
            this.setCookie(this.options.key, data, this.options.cookieExpirationDays);
        }
    }

    clear() {
        this._data = {};
        if (this.options.useLocalStorage && this.localStorageAvailable) {
            localStorage.removeItem(this.options.key);
        }
        if (this.options.useCookies) {
            this.setCookie(this.options.key, '', -1);
        }
    }

    checkLocalStorageAvailability() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    }

    setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
}
