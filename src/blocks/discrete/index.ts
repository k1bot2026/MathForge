import type { BlockRegistry } from "../registry";
import { BinomialBlock } from "./binomial/definition";
import { CartesianProductBlock } from "./cartesian-product/definition";
import { DifferenceBlock } from "./difference/definition";
import { DivisorsBlock } from "./divisors/definition";
import { FactorBlock } from "./factor/definition";
import { FactorialBlock } from "./factorial/definition";
import { GcdBlock } from "./gcd/definition";
import { IntersectionBlock } from "./intersection/definition";
import { IsPrimeBlock } from "./is-prime/definition";
import { LcmBlock } from "./lcm/definition";
import { ModpowBlock } from "./modpow/definition";
import { ModularInverseBlock } from "./modular-inverse/definition";
import { MultinomialBlock } from "./multinomial/definition";
import { PrimeFactorizeBlock } from "./prime-factorize/definition";
import { SetBlock } from "./set/definition";
import { TotientBlock } from "./totient/definition";
import { UnionBlock } from "./union/definition";

export function register(registry: BlockRegistry): void {
  registry.register(SetBlock);
  registry.register(UnionBlock);
  registry.register(IntersectionBlock);
  registry.register(DifferenceBlock);
  registry.register(CartesianProductBlock);
  registry.register(FactorialBlock);
  registry.register(BinomialBlock);
  registry.register(MultinomialBlock);
  registry.register(GcdBlock);
  registry.register(LcmBlock);
  registry.register(ModpowBlock);
  registry.register(IsPrimeBlock);
  registry.register(FactorBlock);
  registry.register(TotientBlock);
  registry.register(DivisorsBlock);
  registry.register(PrimeFactorizeBlock);
  registry.register(ModularInverseBlock);
}
