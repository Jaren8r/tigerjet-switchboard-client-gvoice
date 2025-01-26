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
                    document.querySelector(".pickup-call-button-container button").click();
                    this._pws.send(JSON.stringify(["stopRinging", data]));
                }
    
                if (typ === "end") {
                    document.querySelector("button.call-end-button").click()
                }
    
                if (typ === "call") {
                    let input = document.querySelector("gv-make-call-panel input");
                    input.value = data;
                    input.dispatchEvent(new Event("input"));
                    document.querySelector("gv-make-call-panel .input-row button").click();
                }
            });
        }
    }

    window.WebSocket = WebSocket;
})();