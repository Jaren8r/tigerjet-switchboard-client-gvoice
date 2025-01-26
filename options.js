const saveOptions = () => {
    const secret = document.getElementById("secret").value;

    chrome.storage.local.set({ secret }, () => {
        const status = document.getElementById("status").textContent = "Secret saved";
        status
    });
};

const restoreOptions = () => {
    chrome.storage.local.get({ secret: "" }, items => {
        document.getElementById("secret").value = items.secret;
    });
};

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);