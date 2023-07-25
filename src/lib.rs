mod utils;

use num_bigint::BigUint;
use num_bigint::RandBigInt;
use num_bigint::RandomBits;
use num_integer::Integer;
use num_traits::{One, Zero};
use once_cell::sync::Lazy;
use rand::Rng;
use std::ops::Sub;
use miller_rabin::is_prime as miller_rabin;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn state() -> String {
    return "LOADED".into();
}

fn miller_rabin_rounds(bits: u64) -> usize {
    // inspired by https://stackoverflow.com/a/21450484/6732111
    match bits{
        u64::MIN..=127 => 30,
        128..=191 => 24,
        192..=383 => 16,
        384..=511 => 8,
        512..=767 => 5,
        768..=1535 => 4,
        1536..=3071 => 2,
        3072..=u64::MAX => 1
    }
}

static ZERO: Lazy<BigUint> = Lazy::new(|| BigUint::zero());
static ONE: Lazy<BigUint> = Lazy::new(|| BigUint::one());
static TWO: Lazy<BigUint> = Lazy::new(|| &*ONE + &*ONE);
static SMALL_PRIMES: Lazy<[usize; 4096]> = Lazy::new(||primal::Primes::all().take(4096).collect::<Vec<usize>>().try_into().unwrap());

fn not_dividing_by_small_primes(n: &BigUint) -> bool {
    for p in SMALL_PRIMES
        .iter()
        .map(|x| BigUint::from(*x))
        .filter(|x| x <= n)
    {
        if n % p.clone() == *ZERO {
            return n == &p;
        }
    }
    return true;
}

fn fermat(candidate: &BigUint) -> bool {
    let mut rng = rand::thread_rng();
    let a: BigUint = rng.gen_biguint_below(candidate);
    a.modpow(&candidate.sub(&*ONE), candidate) == *ONE // a ** (p-1) == 1 (mod p)
}

fn is_probable_prime(candidate: &BigUint) -> bool {
    return candidate > &*ONE
        && (!candidate.is_even() || candidate == &*TWO)
        && not_dividing_by_small_primes(candidate)
        && match candidate.bits() {
            u64::MIN..=512 => fermat(candidate) && fermat(candidate),
            513..=4096 => fermat(candidate),
            4097..=u64::MAX => true
        }
        && miller_rabin(candidate, miller_rabin_rounds(candidate.bits()));
}

#[wasm_bindgen]
pub fn generate_prime(bits: u32) -> String {
    if bits < 2 {
        "-1".into()
    } else if bits == 2 {
        if rand::random() {
            "2".into()
        } else {
            "3".into()
        }
    } else {
        let bits: u64 = bits.into();
        utils::set_panic_hook();
        let mut rng = rand::thread_rng();
        loop {
            let mut candidate: BigUint = rng.sample(RandomBits::new(bits));
            candidate.set_bit(0, true);
            candidate.set_bit(bits - 1, true);
            if is_probable_prime(&candidate) {
                return candidate.to_str_radix(10);
            }
        }
    }
}
