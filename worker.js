importScripts("https://cdn.jsdelivr.net/npm/comlink@4.4.1/dist/umd/comlink.js");

class Worker {
    constructor() {
        this._wasm = null;
    }
    async initWasm() {
        await this.wasm;
    }
    get wasm() {
        if (this._wasm !== null) return this._wasm;
        let f = async () => {
            let r = await import("./pkg/rsa_calculator.js");
            await r.default();
            return r;
        };
        return this._wasm = f();
    }
    async state() {
        if (this.wasm === null) return "NOT LOADED";
        return (await this.wasm).state();
    }
    async gen_prime(bits) {
        return (await this.wasm).generate_prime(bits);
    }
    powmod(base, exp, mod) {
        base = BigInt(base);
        exp = BigInt(exp);
        mod = BigInt(mod);
        let x = base % mod;
        let res = exp & 1n ? x : 1n;
        do {
            x = x ** 2n % mod;
            if (exp & 2n) res = (res * x) % mod;
        } while (exp >>= 1n);
        return res;
    }
}

Comlink.expose(Worker);
