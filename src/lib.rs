mod utils;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, wasm-test!");
}
#[wasm_bindgen]
pub fn state() -> String {
    return "LOADED".into();
}
