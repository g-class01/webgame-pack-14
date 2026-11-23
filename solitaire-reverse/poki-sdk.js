/**
 * Universal Offline Poki SDK & Sitelock Immunizer v2.3 Complete
 * - Bypasses all Poki Sitelocks (eval, atob, location redirects)
 * - Auto-rewrites root-relative URLs (/assets/...) to relative paths
 * - Direct window hooks for commercialBreak and rewardedBreak
 * - Emulates Unity Poki Bridge and ads events
 */
(function() {
    'use strict';

    var origAtob = window.atob;
    window.atob = function(str) {
        if (typeof str === 'string') {
            if (str.indexOf('aHR0cHM6Ly9wb2tpLmNvbS9zaXRlbG9jaw') !== -1 || str.indexOf('sitelock') !== -1) {
                console.log('[Offline PokiSDK] Sitelock payload neutralized in atob');
                return 'javascript:void(0)';
            }
        }
        return origAtob.apply(this, arguments);
    };

    var origEval = window.eval;
    window.eval = function(str) {
        if (typeof str === 'string' && (str.indexOf('aHR0cHM6Ly9wb2tpLmNvbS9zaXRlbG9jaw') !== -1 || str.indexOf('sitelock') !== -1)) {
            console.log('[Offline PokiSDK] Sitelock code neutralized in eval');
            return;
        }
        return origEval.apply(this, arguments);
    };

    var origXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
            url = '.' + url;
        }
        return origXhrOpen.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
    };

    if (window.fetch) {
        var origFetch = window.fetch;
        window.fetch = function(input, init) {
            if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('//')) {
                input = '.' + input;
            }
            return origFetch.apply(this, arguments);
        };
    }

    var bridgeName = null;
    function notifyBridge(event, data) {
        var g = window.unityInstance || window.unityGame;
        if (g && bridgeName) {
            try { g.SendMessage(bridgeName, event, data || ""); } catch(e) {}
        }
    }

    window.initPokiBridge = function(e) {
        bridgeName = e;
        console.log('[Offline PokiSDK] initPokiBridge:', e);
        function sendReady() {
            var g = window.unityInstance || window.unityGame;
            if (g) {
                try { g.SendMessage(e, "ready"); } catch(err) {}
            } else {
                setTimeout(sendReady, 50);
            }
        }
        sendReady();
    };

    window.commercialBreak = function(fn) {
        console.log('[Offline PokiSDK] window.commercialBreak called');
        notifyBridge("commercialBreakCompleted");
        if (typeof fn === 'function') fn();
        return Promise.resolve(true);
    };

    window.rewardedBreak = function(fn) {
        console.log('[Offline PokiSDK] window.rewardedBreak called');
        notifyBridge("rewardedBreakCompleted");
        if (typeof fn === 'function') fn(true);
        return Promise.resolve(true);
    };

    try {
        if (window.parent && window.parent !== window) {
            window.parent.commercialBreak = window.commercialBreak;
            window.parent.rewardedBreak = window.rewardedBreak;
        }
        if (window.top && window.top !== window) {
            window.top.commercialBreak = window.commercialBreak;
            window.top.rewardedBreak = window.rewardedBreak;
        }
    } catch(e) {}

    var PokiSDK_Stub = {
        init: function() {
            console.log('[Offline PokiSDK] PokiSDK.init called');
            return Promise.resolve();
        },
        initWithVideoHB: function() { return Promise.resolve(); },
        customEvent: function() {},
        commercialBreak: function(fn) {
            window.commercialBreak(fn);
            return Promise.resolve(true);
        },
        rewardedBreak: function(fn) {
            window.rewardedBreak(fn);
            return Promise.resolve(true);
        },
        displayAd: function(e, t, n, r) {
            if (r) r();
            return Promise.resolve();
        },
        destroyAd: function() {},
        getLeaderboard: function() { return Promise.resolve([]); },
        gameplayStart: function() { console.log('[Offline PokiSDK] gameplayStart'); },
        gameplayStop: function() { console.log('[Offline PokiSDK] gameplayStop'); },
        gameLoadingStart: function() { console.log('[Offline PokiSDK] gameLoadingStart'); },
        gameLoadingFinished: function() { console.log('[Offline PokiSDK] gameLoadingFinished'); },
        gameLoadingProgress: function() {},
        roundStart: function() {},
        roundEnd: function() {},
        happyTime: function() {},
        setDebug: function() {},
        isAdBlocked: function() { return false; },
        measure: function() {},
        setPlayerAge: function() {},
        togglePause: function() {},
        muteAd: function() {}
    };

    window.PokiSDK = new Proxy(PokiSDK_Stub, {
        get: function(target, prop) {
            if (prop in target) return target[prop];
            return function() {
                console.log('[Offline PokiSDK] PokiSDK.' + String(prop) + ' stub called');
                return Promise.resolve();
            };
        }
    });

    console.log('[Offline PokiSDK v2.3] Initialized successfully');
})();
