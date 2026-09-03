let extId;
let isFirefox = navigator.userAgent.indexOf('Firefox') > -1;
let cookie = null;
let otdtoken = null;

if(!window.chrome) window.chrome = {};
if(!window.chrome.runtime) window.chrome.runtime = {};
window.chrome.runtime.getURL = url => {
    if(!url.startsWith('/')) url = `/${url}`;
    return `${isFirefox ? 'moz-extension://' : 'chrome-extension://'}${extId}${url}`;   
}
let initStarted = false;

window.addEventListener('message', async e => {
    if(e.data.extensionId) {
        extId = e.data.extensionId;
    } else if(e.data.cookie) {
        cookie = e.data.cookie;
    } else if(e.data.token) {
        otdtoken = e.data.token;
    }

    // Erst starten, wenn wir sowohl Extension-ID als auch den Auth-Status kennen
    if (extId && !initStarted) {
        initStarted = true;
        await main();
    }
});
window.postMessage('extensionId', '*');
window.postMessage('cookie', '*');
window.postMessage('getotdtoken', '*');

async function main() {
    let html = await fetch(chrome.runtime.getURL('/files/index.html')).then(r => r.text());
    document.documentElement.innerHTML = html;

    let [challenge_js, interception_js, vendor_js, bundle_js, bundle_css, twitter_text] =
        await Promise.allSettled([
            fetch(chrome.runtime.getURL("/src/challenge.js")).then(r => r.text()),
            fetch(chrome.runtime.getURL("/src/interception.js")).then(r => r.text()),
            fetch(chrome.runtime.getURL("/files/vendor.js")).then(r => r.text()),
            fetch(chrome.runtime.getURL("/files/bundle.js")).then(r => r.text()),
            fetch(chrome.runtime.getURL("/files/bundle.css")).then(r => r.text()),
            fetch(chrome.runtime.getURL("/files/twitter-text.js")).then(r => r.text()),
        ]);
    if (!localStorage.getItem("OTDalwaysUseLocalFiles")) {
        const [
            remote_challenge_js_req,
            remote_interception_js_req,
            remote_vendor_js_req,
            remote_bundle_js_req,
            remote_bundle_css_req,
            remote_twitter_text_req,
        ] = await Promise.allSettled([
            fetch("https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/src/challenge.js"),
            fetch("https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/src/interception.js"),
            fetch("https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/vendor.js"),
            fetch("https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/bundle.js"),
            fetch("https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/bundle.css"),
            fetch("https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/twitter-text.js"),
        ]);
        
        if(
            (remote_challenge_js_req.value && remote_challenge_js_req.value.ok) ||
            (remote_interception_js_req.value && remote_interception_js_req.value.ok) || 
            (remote_vendor_js_req.value && remote_vendor_js_req.value.ok) ||
            (remote_bundle_js_req.value && remote_bundle_js_req.value.ok) ||
            (remote_bundle_css_req.value && remote_bundle_css_req.value.ok) ||
            (remote_twitter_text_req.value && remote_twitter_text_req.value.ok)
        ) {
            const [
                remote_challenge_js,
                remote_interception_js,
                remote_vendor_js,
                remote_bundle_js,
                remote_bundle_css,
                remote_twitter_text,
            ] = await Promise.allSettled([
                remote_challenge_js_req.value.text(),
                remote_interception_js_req.value.text(),
                remote_vendor_js_req.value.text(),
                remote_bundle_js_req.value.text(),
                remote_bundle_css_req.value.text(),
                remote_twitter_text_req.value.text(),
            ]);

            if (
                remote_challenge_js_req.value &&
                remote_challenge_js_req.value.ok &&
                remote_challenge_js.status === "fulfilled" &&
                remote_challenge_js.value.length > 30
            ) {
                challenge_js = remote_challenge_js;
                console.log("Using remote challenge.js");
            }

            if (
                remote_interception_js_req.value &&
                remote_interception_js_req.value.ok &&
                remote_interception_js.status === "fulfilled" &&
                remote_interception_js.value.length > 30
            ) {
                interception_js = remote_interception_js;
                console.log("Using remote interception.js");
            }
            if (
                remote_vendor_js_req.value &&
                remote_vendor_js_req.value.ok &&
                remote_vendor_js.status === "fulfilled" &&
                remote_vendor_js.value.length > 30
            ) {
                vendor_js = remote_vendor_js;
                console.log("Using remote vendor.js");
            }
            if (
                remote_bundle_js_req.value &&
                remote_bundle_js_req.value.ok &&
                remote_bundle_js.status === "fulfilled" &&
                remote_bundle_js.value.length > 30
            ) {
                bundle_js = remote_bundle_js;
                console.log("Using remote bundle.js");
            }
            if (
                remote_bundle_css_req.value &&
                remote_bundle_css_req.value.ok &&
                remote_bundle_css.status === "fulfilled" &&
                remote_bundle_css.value.length > 30
            ) {
                bundle_css = remote_bundle_css;
                console.log("Using remote bundle.css");
            }
            if (
                remote_twitter_text_req.value &&
                remote_twitter_text_req.value.ok &&
                remote_twitter_text.status === "fulfilled" &&
                remote_twitter_text.value.length > 30
            ) {
                twitter_text = remote_twitter_text;
                console.log("Using remote twitter-text.js");
            }
        }
    }

function injectScriptBlob(content) {
        let blob = new Blob([content], { type: 'text/javascript' });
        let script = document.createElement('script');
        script.src = URL.createObjectURL(blob);
        script.async = false;
        document.head.appendChild(script);
    }

    let bundle_css_style = document.createElement("style");
    bundle_css_style.textContent = bundle_css.value;
    document.head.appendChild(bundle_css_style);

    injectScriptBlob(challenge_js.value.replaceAll('SOLVER_URL', chrome.runtime.getURL("solver.html")));
    injectScriptBlob(interception_js.value);
    injectScriptBlob(vendor_js.value);
    injectScriptBlob(bundle_js.value);
    injectScriptBlob(twitter_text.value);

    (async () => {
        try {
            const additionalScripts = await fetch("https://oldtd.org/api/scripts", {
                headers: otdtoken ? {
                    Authorization: `Bearer ${otdtoken}`
                } : undefined
            }).then(r => r.json());
            for(let script of additionalScripts) {
                let scriptSource = await fetch(`https://oldtd.org/api/scripts/${script}`, {
                    headers: otdtoken ? {
                        Authorization: `Bearer ${otdtoken}`
                    } : undefined
                }).then(r => r.text());
                let scriptElement = document.createElement("script");
                scriptElement.innerHTML = scriptSource;
                document.head.appendChild(scriptElement);
            }
        } catch(e) {
            console.error(e);
        }
    })();

    let int = setTimeout(function() {
        let badBody = document.querySelector('body:not(#injected-body)');
        if (badBody) {
            let badHead = document.querySelector('head:not(#injected-head)');
            clearInterval(int);
            if(badHead) badHead.remove();
            badBody.remove(); 
        }
    }, 200);
    setTimeout(() => clearInterval(int), 10000);

    let injInt;
    function injectAccount() {
        if(!document.querySelector('a[data-title="Accounts"]')) return;
        clearInterval(injInt);

        let accountsBtn = document.querySelector('a[data-title="Accounts"]');
        accountsBtn.addEventListener("click", function() {
            console.log("setting account cookie");
            chrome.runtime.sendMessage({ action: "setcookie" }); 
        });
    }
    setInterval(injectAccount, 1000);
};
