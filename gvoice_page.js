const script = document.currentScript;
const fromRegexp = /^From: (.*) <sip:\+?(\d+|anonymous)\@/m;

(() => {
    let _WebSocket = window.WebSocket;

    class WebSocket extends _WebSocket {
        constructor(url, protocols) {
            super(url, protocols);
            if (protocols === "sip") {
                this._connect();
                this._active = true;
                this.addEventListener("message", this._onSipMessage);
                this.addEventListener("close", () => {
                    this._active = false;
                    this._pws.close();
                });
            }
        }

        _onSipMessage = (e) => {
            let text = e.data;
            if (text instanceof ArrayBuffer) {
                text = new TextDecoder().decode(text)
            }

            if (text.startsWith("INVITE ")) {
                let [, name, number] = text.match(fromRegexp);
                this._pws.send(JSON.stringify(["ring", {
                    id: number,
                    callerId: number === "anonymous" ? { nameNotPresent: "P", numberNotPresent: "P" } : {
                        name,
                        number
                    }
                }]));
            }
            if (text.startsWith("CANCEL ")) {
                let [, _, number] = text.match(fromRegexp);
                this._pws.send(JSON.stringify(["stopRinging", number]));
            }
            if (text.startsWith("BYE ")) {
                this._pws.send(JSON.stringify(["end"]));
            }
        }

        _connect = () => {
            this._pws = new _WebSocket(`ws://127.0.0.1:5840/ws?${new URLSearchParams({
                client: "gvoice",
                secret: script.dataset.secret
            }).toString()}`);
            this._pws.addEventListener("close", () => {
                if (this._active) this._connect();
            });
            this._pws.addEventListener("message", async e => {
                let [typ, data] = JSON.parse(e.data);
                
                if (typ === "answer") {
                    await changeAudioDevices(data.device.serial);
                    document.querySelector(".pickup-call-button-container button").click();
                }
    
                if (typ === "end") {
                    document.querySelector("button.call-end-button")?.click()
                }
    
                if (typ === "call") {
                    await changeAudioDevices(data.device.serial);
                    let input = document.querySelector("gv-make-call-panel input");
                    input.value = data.number;
                    input.dispatchEvent(new Event("input"));
                    document.querySelector("gv-make-call-panel .input-row button").click();
                }
            });
        }
    }

    window.WebSocket = WebSocket;

    let storageOverrides = new Map();

    async function changeAudioDevice(type, serial) {
        let devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === `audio${type}`);

        let device = devices.find(d => d.label.includes(serial));
        if (!device) {
            let genericDevices = devices.filter(s => s.label.includes("USB Internet Phone"));
            if (genericDevices.length === 0) {
                console.error(`Unable to find an ${type} device to switch to.`, devices);
                return;
            }
            if (genericDevices.length > 1) {
                console.warn(`The ${type} device for ${serial} could not be found directly, and multiple phone devices exist.`, genericDevices);
            }

            option = genericDevices[0];
        }

        let key = `gv::${window._gv.soyProto.UserInfo[1]}::audio-${type}-device-id`;
        let newValue = device.deviceId;

        console.log(key, newValue)
        storageOverrides.set(key, newValue);

        window.dispatchEvent(new StorageEvent("storage", {
            key,
            newValue,
            url: location.toString()
        }));
    }

    async function changeAudioDevices(serial) {
        changeAudioDevice("input", serial);
        changeAudioDevice("output", serial);
    }

    let localStorageGetItem = localStorage.getItem.bind(localStorage);
    localStorage.getItem = function (keyName) {
        if (storageOverrides.has(keyName)) {
            return storageOverrides.get(keyName);
        }

        return localStorageGetItem(keyName);
    }
})();