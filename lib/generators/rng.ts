import { Faker, en_AU, en } from '@faker-js/faker';

export interface Rng {
  faker: Faker;
  seed: number;
}

export function makeRng(seed: number): Rng {
  const faker = new Faker({ locale: [en_AU, en] });
  faker.seed(seed);
  return { faker, seed };
}
