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

const mordrakeIllusion = {
  id: "mordrakeIllusion",
  name: "Mordrake's Illusion",
  role: "decoy",
  hp: 76,
  armor: 2,
  mana: 40,
  actions: [
    { name: "False Ward", kind: "defense", status: { id: "ward", blockChance: 0.45, damageType: "spell" }, manaCost: 4 },
    { name: "Mirror Guard", kind: "defense", status: { id: "defender", blockChance: 0.35, damageType: "physical" }, manaCost: 4 },
    { name: "Splintered Doubt", kind: "status", status: { id: "stunned", chance: 0.2, duration: 1 }, manaCost: 6 },
  ],
};

const ashSkitterer = {
  id: "ashSkitterer",
  name: "Ash Skitterer",
  role: "brute",
  hp: 22,
  armor: 0,
  engage: { name: "Skitter Ambush", kind: "attack", damage: { flat: 4 } },
  actions: [
    { name: "Ash Bite", kind: "attack", damage: { flat: 5 } },
  ],
};

const cinderHound = {
  id: "cinderHound",
  name: "Cinder Hound",
  role: "brute",
  hp: 58,
  armor: 1,
  actions: [
    { name: "Burning Bite", kind: "attack", damage: { flat: 9 }, status: { id: "bleeding", chance: 0.25, amount: 3, duration: 3, stack: true } },
    { name: "Cinder Howl", kind: "buffNextAttack", bonus: 5 },
  ],
};

const cinderling = {
  id: "cinderling",
  name: "Cinderling",
  role: "summon",
  hp: 24,
  armor: 0,
  damageTaken: {
    fire: 0,
  },
  actions: [
    { name: "Ember Scratch", kind: "spellAttack", damageType: "spell", elementType: "fire", damage: { flat: 5 }, manaCost: 0 },
  ],
};

const ashGateGuardian = {
  id: "ashGateGuardian",
  name: "Ash Gate Guardian",
  role: "brute",
  hp: 70,
  armor: 4,
  engage: { name: "Gate Ambush", kind: "attack", damage: { flat: 9 }, status: { id: "stunned", chance: 0.2, duration: 1 } },
  actions: [
    { name: "Charred Halberd", kind: "attack", damage: { flat: 9 } },
    { name: "Brace the Gate", kind: "defense", status: { id: "defender", blockChance: 0.3, damageType: "physical" } },
  ],
};

const ashGateAcolyte = {
  id: "ashGateAcolyte",
  name: "Ash Gate Acolyte",
  role: "caster",
  hp: 50,
  armor: 1,
  mana: 44,
  engage: { name: "Ashen Warning", kind: "status", status: { id: "rooted", duration: 2, armor: -3 }, manaCost: 5 },
  actions: [
    { name: "Ember Seal", kind: "spellAttack", damageType: "spell", elementType: "fire", damage: { flat: 8 }, manaCost: 5 },
    { name: "Smoke Ward", kind: "defense", status: { id: "ward", blockChance: 0.3, damageType: "spell" }, manaCost: 4 },
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
  {
    id: "oldWoods11",
    area: "Old Woods",
    fight: 11,
    boss: true,
    bossTier: "mordrake",
    name: "Mordrake",
    initiate: true,
    monsters: [
      {
        id: "mordrake",
        name: "Mordrake",
        role: "caster",
        hp: 92,
        armor: 3,
        mana: 70,
        thresholds: [
          {
            id: "mordrakeEscape",
            hpPercent: 0.5,
            effect: "fleeAndSummon",
            summon: mordrakeIllusion,
            message: "Mordrake splits into a full-blooded illusion and slips between the trees.",
          },
        ],
        actions: [
          { name: "Keep Away", kind: "status", status: { id: "stunned", chance: 0.25, duration: 1 }, manaCost: 8 },
          { name: "Crown Ward", kind: "defense", status: { id: "ward", blockChance: 0.5, damageType: "spell" }, manaCost: 5 },
          { name: "Turn Aside Steel", kind: "defense", status: { id: "defender", blockChance: 0.4, damageType: "physical" }, manaCost: 5 },
          { name: "Desperate Renewal", kind: "buff", status: { id: "desperateRenewal", duration: 3, hpRegen: 4 }, manaCost: 8 },
        ],
      },
    ],
  },
  {
    id: "ashWastelands01",
    area: "Ash Wastelands",
    fight: 1,
    name: "Ash Skitterers",
    initiate: false,
    enemyInitiate: true,
    monsters: [
      ashSkitterer,
      { ...ashSkitterer, name: "Ash Skitterer", hp: 20 },
      { ...ashSkitterer, name: "Small Ash Skitterer", hp: 16, engage: { name: "Skitter Ambush", kind: "attack", damage: { flat: 3 } } },
    ],
  },
  {
    id: "ashWastelands02",
    area: "Ash Wastelands",
    fight: 2,
    name: "Cinder Hound",
    initiate: true,
    monsters: [
      cinderHound,
    ],
  },
  {
    id: "ashWastelands03",
    area: "Ash Wastelands",
    fight: 3,
    name: "Glassback Beetle",
    initiate: true,
    monsters: [
      {
        id: "glassbackBeetle",
        name: "Glassback Beetle",
        role: "brute",
        hp: 48,
        armor: 8,
        damageTaken: {
          spell: 1.35,
        },
        actions: [
          { name: "Glass Mandibles", kind: "attack", damage: { flat: 8 } },
          { name: "Brittle Shell", kind: "defense", status: { id: "defender", blockChance: 0.35, damageType: "physical" } },
        ],
      },
    ],
  },
  {
    id: "ashWastelands04",
    area: "Ash Wastelands",
    fight: 4,
    name: "Ash Gate Guardians",
    initiate: false,
    enemyInitiate: true,
    monsters: [
      ashGateGuardian,
      ashGateAcolyte,
    ],
  },
  {
    id: "ashWastelands05",
    area: "Ash Wastelands",
    fight: 5,
    boss: true,
    bossTier: "mid",
    name: "Cindermaw",
    initiate: true,
    monsters: [
      {
        id: "cindermaw",
        name: "Cindermaw",
        role: "brute",
        hp: 98,
        armor: 2,
        damageTaken: {
          fire: 0.25,
        },
        actions: [
          { name: "Coal-Jaw Crush", kind: "attack", damage: { flat: 13 }, status: { id: "bleeding", chance: 0.3, amount: 4, duration: 3, stack: true } },
          { name: "Cinder Breath", kind: "spellAttack", damageType: "spell", elementType: "fire", damage: { flat: 10 }, manaCost: 0 },
        ],
      },
    ],
  },
  {
    id: "ashWastelands06",
    area: "Ash Wastelands",
    fight: 6,
    name: "Ember Wraiths",
    initiate: true,
    monsters: [
      {
        id: "emberWraith",
        name: "Ember Wraith",
        role: "caster",
        hp: 42,
        armor: 0,
        mana: 42,
        damageTaken: {
          physical: 0.65,
          fire: 0,
        },
        actions: [
          { name: "Heat Shimmer", kind: "spellAttack", damageType: "spell", elementType: "fire", damage: { flat: 9 }, manaCost: 5 },
          { name: "Smokeform", kind: "defense", status: { id: "ward", blockChance: 0.35, damageType: "spell" }, manaCost: 4 },
        ],
      },
      {
        id: "emberWraith",
        name: "Lesser Ember Wraith",
        role: "caster",
        hp: 34,
        armor: 0,
        mana: 36,
        damageTaken: {
          physical: 0.75,
          fire: 0,
        },
        actions: [
          { name: "Heat Shimmer", kind: "spellAttack", damageType: "spell", elementType: "fire", damage: { flat: 7 }, manaCost: 5 },
        ],
      },
    ],
  },
  {
    id: "ashWastelands07",
    area: "Ash Wastelands",
    fight: 7,
    name: "Scorched Pack",
    initiate: false,
    enemyInitiate: true,
    monsters: [
      { ...cinderHound, name: "Scorched Hound", hp: 46, engage: { name: "Pack Rush", kind: "attack", damage: { flat: 6 } } },
      { ...cinderHound, name: "Scorched Hound", hp: 46, engage: { name: "Pack Rush", kind: "attack", damage: { flat: 6 } } },
      { ...ashSkitterer, name: "Ash Skitterer", hp: 24 },
    ],
  },
  {
    id: "ashWastelands08",
    area: "Ash Wastelands",
    fight: 8,
    name: "Ash Burrower",
    initiate: true,
    monsters: [
      {
        id: "ashBurrower",
        name: "Ash Burrower",
        role: "brute",
        hp: 86,
        armor: 3,
        actions: [
          { name: "Erupting Bite", kind: "attack", damage: { flat: 12 } },
          { name: "Burrow Smoke", kind: "defense", status: { id: "defender", blockChance: 0.45, damageType: "physical" } },
        ],
      },
    ],
  },
  {
    id: "ashWastelands09",
    area: "Ash Wastelands",
    fight: 9,
    boss: true,
    bossTier: "gatekeeper",
    name: "Pyre Shaman",
    initiate: true,
    monsters: [
      {
        id: "pyreShaman",
        name: "Pyre Shaman",
        role: "caster",
        hp: 76,
        armor: 1,
        mana: 72,
        actions: [
          {
            name: "Call Cinderlings",
            kind: "summon",
            summon: cinderling,
            maxAlive: 3,
          },
          { name: "Ash Hex", kind: "status", status: { id: "vulnerable", duration: 2, bonuses: { damageMultiplier: 1.2 } }, manaCost: 6 },
          { name: "Pyre Bolt", kind: "spellAttack", damageType: "spell", elementType: "fire", damage: { flat: 10 }, manaCost: 6 },
        ],
      },
    ],
  },
  {
    id: "ashWastelands10",
    area: "Ash Wastelands",
    fight: 10,
    boss: true,
    bossTier: "areaFinal",
    name: "The Cinder Colossus",
    initiate: true,
    monsters: [
      {
        id: "cinderColossus",
        name: "The Cinder Colossus",
        role: "brute",
        hp: 142,
        armor: 6,
        damageTaken: {
          fire: 0,
          physical: 0.85,
        },
        actions: [
          { name: "Molten Fist", kind: "attack", damage: { flat: 15 } },
          { name: "Ashen Quake", kind: "status", status: { id: "stunned", chance: 0.25, duration: 1 } },
          { name: "Kindled Core", kind: "buff", status: { id: "kindledCore", duration: 3, hpRegen: 6, bonuses: { damageMultiplier: 1.1 } } },
        ],
      },
    ],
  },
  {
    id: "ashWastelands11",
    area: "Ash Wastelands",
    fight: 11,
    boss: true,
    bossTier: "mordrake",
    name: "Mordrake and the Ash Warden",
    initiate: true,
    monsters: [
      {
        id: "ashWarden",
        name: "Ash Warden",
        role: "brute",
        hp: 98,
        armor: 5,
        actions: [
          { name: "Warden's Halberd", kind: "attack", damage: { flat: 13 }, status: { id: "stunned", chance: 0.18, duration: 1 } },
          { name: "Interpose", kind: "defense", status: { id: "defender", blockChance: 0.4, damageType: "physical" } },
        ],
      },
      {
        id: "mordrake",
        name: "Mordrake",
        role: "caster",
        hp: 104,
        armor: 3,
        mana: 82,
        thresholds: [
          {
            id: "mordrakeAshEscape",
            hpPercent: 0.5,
            effect: "fleeAndSummon",
            summon: { ...mordrakeIllusion, hp: 86, armor: 3 },
            message: "Mordrake leaves the Ash Warden to die and vanishes into burning dust.",
          },
        ],
        actions: [
          { name: "Keep Away", kind: "status", status: { id: "stunned", chance: 0.28, duration: 1 }, manaCost: 8 },
          { name: "Crown Ward", kind: "defense", status: { id: "ward", blockChance: 0.55, damageType: "spell" }, manaCost: 5 },
          { name: "Ashen Renewal", kind: "buff", status: { id: "ashenRenewal", duration: 3, hpRegen: 5 }, manaCost: 8 },
        ],
      },
    ],
  },
];
