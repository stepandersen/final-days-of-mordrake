const cemeteryTemplates = [
  {
    id: "restlessVillager",
    name: "Restless Villager",
    role: "brute",
    hp: 30,
    armor: 0,
    actions: [
      { name: "Grave Claw", kind: "attack", damage: { flat: 6 } },
    ],
  },
  {
    id: "graveHound",
    name: "Grave Hound",
    role: "brute",
    hp: 36,
    armor: 1,
    actions: [
      { name: "Spectral Bite", kind: "attack", damage: { flat: 7 }, status: { id: "bleeding", chance: 0.2, amount: 2, duration: 3, stack: true } },
    ],
  },
  {
    id: "mourningShade",
    name: "Mourning Shade",
    role: "caster",
    hp: 28,
    armor: 0,
    mana: 36,
    actions: [
      { name: "Cold Whisper", kind: "spellAttack", damageType: "spell", elementType: "arcane", damage: { flat: 7 }, manaCost: 4 },
      { name: "Dread Stillness", kind: "status", status: { id: "stunned", chance: 0.14, duration: 1 }, manaCost: 6 },
    ],
  },
  {
    id: "boneWarden",
    name: "Bone Warden",
    role: "brute",
    hp: 44,
    armor: 4,
    actions: [
      { name: "Rusty Cleaver", kind: "attack", damage: { flat: 7 } },
      { name: "Bone Guard", kind: "defense", status: { id: "defender", blockChance: 0.24, damageType: "physical" } },
    ],
  },
  {
    id: "lanternWisp",
    name: "Lantern Wisp",
    role: "skirmisher",
    hp: 26,
    armor: 0,
    mana: 28,
    actions: [
      { name: "Will-o-Flare", kind: "spellAttack", damageType: "spell", elementType: "fire", damage: { flat: 6 }, manaCost: 3 },
      { name: "Grave Glow", kind: "buff", status: { id: "ashenRenewal", duration: 2, hpRegen: 3 } },
    ],
  },
  {
    id: "failedAdventurer",
    name: "Failed Adventurer",
    role: "brute",
    hp: 52,
    armor: 2,
    actions: [
      { name: "Broken Sword", kind: "attack", damage: { flat: 8 } },
      { name: "Last Instinct", kind: "buffNextAttack", bonus: 5 },
    ],
  },
];

export function createCemeteryEncounter({ rematchIndex, visit, step }) {
  const progress = Math.max(1, rematchIndex + 1);
  const count = progress >= 12 || visit >= 3 ? randomInt(1, 3) : randomInt(1, 2);
  const monsters = Array.from({ length: count }, (_, index) => {
    const template = cemeteryTemplates[randomInt(0, cemeteryTemplates.length - 1)];
    return scaleCemeteryMonster(template, progress, visit, index);
  });

  return {
    id: `cemetery-${visit}-${step}-${Date.now()}-${randomInt(1000, 9999)}`,
    area: "Cemetery",
    fight: step,
    fightTotal: visit,
    name: count === 1 ? monsters[0].name : "Restless Dead",
    cemetery: true,
    initiate: true,
    monsters,
  };
}

function scaleCemeteryMonster(template, progress, visit, index) {
  const monster = structuredClone(template);
  const hpMultiplier = 1 + progress * 0.045 + visit * 0.055;
  const damageBonus = Math.floor(progress * 0.28 + visit * 0.45);

  monster.id = `${monster.id}${index + 1}`;
  monster.hp = Math.max(1, Math.round(monster.hp * hpMultiplier));
  monster.armor = Math.max(0, Math.round((monster.armor ?? 0) + visit * 0.25));
  monster.actions = monster.actions.map((action) => scaleAction(action, damageBonus));
  if (monster.engage) {
    monster.engage = scaleAction(monster.engage, damageBonus);
  }

  return monster;
}

function scaleAction(action, damageBonus) {
  const next = structuredClone(action);
  if (next.damage?.flat) {
    next.damage.flat += damageBonus;
  }
  if (next.status?.amount) {
    next.status.amount += Math.floor(damageBonus / 3);
  }
  return next;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
