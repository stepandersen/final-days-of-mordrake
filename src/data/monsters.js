const wolf = {
  id: "wolf",
  name: "Hungry Wolf",
  role: "brute",
  hp: 28,
  armor: 0,
  actions: [
    { name: "Bite", kind: "attack", damage: { flat: 6 } },
  ],
};

const briarVine = {
  id: "briarVine",
  name: "Briar Vine",
  role: "summon",
  hp: 24,
  armor: 2,
  actions: [
    { name: "Lashing Vine", kind: "attack", damage: { flat: 5 }, status: { id: "rooted", chance: 0.2, duration: 2, armor: -2 } },
  ],
};

export const encounters = [
  {
    id: "oldWoods01",
    area: "Old Woods",
    fight: 1,
    name: "Hungry Wolf",
    initiate: true,
    monsters: [
      wolf,
    ],
  },
  {
    id: "oldWoods02",
    area: "Old Woods",
    fight: 2,
    name: "Wolf Pair",
    initiate: true,
    monsters: [
      { ...wolf, name: "First Wolf" },
      { ...wolf, name: "Second Wolf", hp: 24 },
    ],
  },
  {
    id: "oldWoods03",
    area: "Old Woods",
    fight: 3,
    name: "Forest Poacher",
    initiate: true,
    monsters: [
      {
        id: "forestPoacher",
        name: "Forest Poacher",
        role: "ranged",
        hp: 34,
        armor: 0,
        actions: [
          { name: "Quick Shot", kind: "attack", damage: { flat: 8 } },
          { name: "Aim", kind: "buffNextAttack", bonus: 4 },
        ],
      },
    ],
  },
  {
    id: "oldWoods04",
    area: "Old Woods",
    fight: 4,
    name: "Thornback Boar",
    initiate: true,
    monsters: [
      {
        id: "thornbackBoar",
        name: "Thornback Boar",
        role: "brute",
        hp: 48,
        armor: 4,
        actions: [
          { name: "Gore", kind: "attack", damage: { flat: 8 } },
          { name: "Bristle", kind: "defense", status: { id: "defender", blockChance: 0.2, damageType: "physical" } },
        ],
      },
    ],
  },
  {
    id: "oldWoods05",
    area: "Old Woods",
    fight: 5,
    boss: true,
    bossTier: "mid",
    name: "Old Tusker",
    initiate: true,
    monsters: [
      {
        id: "oldTusker",
        name: "Old Tusker",
        role: "brute",
        hp: 76,
        armor: 4,
        actions: [
          { name: "Tusker Charge", kind: "attack", damage: { flat: 11 }, status: { id: "bleeding", chance: 0.25, amount: 3, duration: 3, stack: true } },
          { name: "Thick Hide", kind: "defense", status: { id: "defender", blockChance: 0.25, damageType: "physical" } },
        ],
      },
    ],
  },
  {
    id: "oldWoods06",
    area: "Old Woods",
    fight: 6,
    name: "Venom Spider Pack",
    initiate: true,
    monsters: [
      {
        id: "venomSpider",
        name: "Venom Spider",
        role: "brute",
        hp: 24,
        armor: 0,
        actions: [
          { name: "Venom Bite", kind: "attack", damage: { flat: 5 }, status: { id: "poisoned", chance: 0.35, amount: 2, duration: 3, stack: true } },
        ],
      },
      {
        id: "venomSpider",
        name: "Venom Spider",
        role: "brute",
        hp: 24,
        armor: 0,
        actions: [
          { name: "Venom Bite", kind: "attack", damage: { flat: 5 }, status: { id: "poisoned", chance: 0.35, amount: 2, duration: 3, stack: true } },
        ],
      },
      {
        id: "smallSpider",
        name: "Small Spider",
        role: "brute",
        hp: 18,
        armor: 0,
        actions: [
          { name: "Needle Bite", kind: "attack", damage: { flat: 4 }, status: { id: "poisoned", chance: 0.25, amount: 1, duration: 3, stack: true } },
        ],
      },
    ],
  },
  {
    id: "oldWoods07",
    area: "Old Woods",
    fight: 7,
    name: "Rootbinder Scout",
    initiate: true,
    monsters: [
      {
        id: "rootbinderScout",
        name: "Rootbinder Scout",
        role: "caster",
        hp: 38,
        armor: 1,
        mana: 36,
        actions: [
          { name: "Root Snare", kind: "status", status: { id: "rooted", duration: 2, armor: -3 } },
          { name: "Thorn Spark", kind: "spellAttack", damageType: "spell", damage: { flat: 8 }, manaCost: 5 },
        ],
      },
      { ...wolf, name: "Tethered Wolf", hp: 34 },
    ],
  },
  {
    id: "oldWoods08",
    area: "Old Woods",
    fight: 8,
    name: "Briar Archer",
    initiate: true,
    monsters: [
      {
        id: "briarArcher",
        name: "Briar Archer",
        role: "ranged",
        hp: 38,
        armor: 1,
        actions: [
          { name: "Poison Arrow", kind: "attack", damage: { flat: 9 }, status: { id: "poisoned", chance: 0.35, amount: 3, duration: 3, stack: true } },
          { name: "Draw Deep", kind: "buffNextAttack", bonus: 5 },
        ],
      },
      {
        id: "woodsGuard",
        name: "Woods Guard",
        role: "brute",
        hp: 44,
        armor: 3,
        actions: [
          { name: "Wood Axe", kind: "attack", damage: { flat: 7 } },
          { name: "Raise Buckler", kind: "defense", status: { id: "defender", blockChance: 0.25, damageType: "physical" } },
        ],
      },
    ],
  },
  {
    id: "oldWoods09",
    area: "Old Woods",
    fight: 9,
    boss: true,
    bossTier: "gatekeeper",
    name: "Briar Witch",
    initiate: true,
    monsters: [
      {
        id: "briarWitch",
        name: "Briar Witch",
        role: "caster",
        hp: 74,
        armor: 1,
        mana: 60,
        actions: [
          { name: "Rooted Curse", kind: "status", status: { id: "rooted", duration: 3, armor: -4 } },
          {
            name: "Call Briars",
            kind: "summon",
            summon: briarVine,
            maxAlive: 2,
          },
          { name: "Witchfire Thorn", kind: "spellAttack", damageType: "spell", damage: { flat: 10 }, manaCost: 6 },
        ],
      },
    ],
  },
  {
    id: "oldWoods10",
    area: "Old Woods",
    fight: 10,
    boss: true,
    bossTier: "areaFinal",
    name: "The Briarheart Stag",
    initiate: true,
    monsters: [
      {
        id: "briarheartStag",
        name: "The Briarheart Stag",
        role: "brute",
        hp: 96,
        armor: 4,
        actions: [
          { name: "Antler Crush", kind: "attack", damage: { flat: 12 }, status: { id: "rooted", chance: 0.35, duration: 2, armor: -3 } },
          { name: "Briarheart Renewal", kind: "buff", status: { id: "briarheartRenewal", duration: 3, hpRegen: 5 } },
          {
            name: "Awaken Briars",
            kind: "summon",
            summon: briarVine,
            maxAlive: 3,
          },
        ],
      },
      { ...briarVine, name: "Awakened Briar", hp: 22 },
    ],
  },
];
