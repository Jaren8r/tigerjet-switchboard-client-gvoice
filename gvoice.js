let script;

chrome.storage.local.get({ secret: "" }, items => {
    script = document.createElement("script");
    script.src = chrome.runtime.getURL("gvoice_page.js");
    script.dataset.secret = items.secret;
    (document.head || document.documentElement).append(script);
});

chrome.storage.onChanged.addListener(changes => {
    for (let [key, { newValue }] of Object.entries(changes)) {
        if (key === "secret") {
            script.dataset.secret = newValue;
        }
    }
});