// Step 0: Kill Twitter/X Service Workers immediately
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
            registration.unregister();
            console.log('[OldTweetDeck] Unregistered rogue Twitter service worker');
        }
    });
    // Verhindern, dass Twitter neue registriert
    navigator.serviceWorker.register = () => new Promise(() => {});
}

// Step 1: fool twitter into thinking scripts loaded
window.__SCRIPTS_LOADED__ = Object.freeze({
    main: true,
    vendor: true,
    runtime: false
});

// Step 2: continuously wreck havoc & wipe react root if it spawns
let _destroyerInt = setInterval(() => {
    delete window.webpackChunk_twitter_responsive_web;
    window.__SCRIPTS_LOADED__ = Object.freeze({
        main: true,
        vendor: true,
        runtime: false
    });
    
    const root = document.getElementById('react-root');
    if (root && !document.getElementById('open-modal')) {
        // Leert die Standard-X-App, falls sie doch angesprungen ist
        root.innerHTML = '';
    }
    
    if(document.getElementById('ScriptLoadFailure')) {
        document.getElementById('ScriptLoadFailure').remove();
    }
}, 10);

// Step 3: destroy twitter critical modules
let _originalPush = Array.prototype.push;
Array.prototype.push = function() {
    try {
        const firstArg = arguments[0];
        if (Array.isArray(firstArg) && Array.isArray(firstArg[0])) {
            const chunkNames = firstArg[0];
            if (chunkNames.includes("vendor") || chunkNames.includes("main") || chunkNames.some(c => String(c).includes("bundle"))) {
                throw "Twitter killing magic killed Twitter (thats fine)";
            }
        }
    } catch(e) {
        Array.prototype.push = _originalPush;
    } finally {
        return _originalPush.apply(this, arguments);
    }
};

// Step 4: prevent twitter from reporting it
let _originalTest = RegExp.prototype.test;
RegExp.prototype.test = function() {
    try {
        if(this.toString() === '/[?&]failedScript=/') {
            RegExp.prototype.test = _originalTest;
            throw "prevent report";
        }
    } catch(e) {
        RegExp.prototype.test = _originalTest;
    } finally {
        return _originalTest.apply(this, arguments);
    }
};

// Step 5: self destruct
setTimeout(() => {
    clearInterval(_destroyerInt);
    Array.prototype.push = _originalPush;
    RegExp.prototype.test = _originalTest;
}, 6000);
