export const targetingLabels = {
  closest: "Closest",
  lowestHp: "Lowest HP",
  casters: "Casters",
  skirmishers: "Skirmishers",
  spawns: "Spawns",
  healers: "Healers",
  highestDamage: "Highest Damage",
};

const DEFAULT_TARGETING = ["closest"];
const roleDistance = {
  brute: 0,
  caster: 1,
  decoy: 1,
  healer: 1,
  summon: 1,
  skirmisher: 2,
};

export function findTarget(enemies, priority) {
  const living = enemies.filter((enemy) => enemy.hp > 0);
  if (living.length === 0) {
    return null;
  }

  for (const rule of priority) {
    const match = findRuleMatch(living, rule);
    if (match) {
      return match;
    }
  }

  return living[0];
}

export function getEncounterTargetRules(encounter) {
  if (!encounter) return DEFAULT_TARGETING.map(createTargetRule);

  return DEFAULT_TARGETING.map(createTargetRule);
}

export function reconcileTargetPriority(priority, encounterRules, unlockedRules) {
  const available = [
    ...encounterRules.map((rule) => rule.id),
    ...unlockedRules.map((rule) => `mode:${rule}`),
  ];
  const retained = priority.filter((rule) => available.includes(rule));
  return [...retained, ...available.filter((rule) => !retained.includes(rule))];
}

function findRuleMatch(living, rule) {
  const condition = rule.startsWith("mode:") ? rule.slice("mode:".length) : rule;
  if (condition === "closest") {
    return [...living].sort((a, b) => targetDistance(a) - targetDistance(b))[0];
  }
  if (condition === "lowestHp") {
    return [...living].sort((a, b) => a.hp - b.hp)[0];
  }
  if (condition === "casters") {
    return living.find((enemy) => enemy.role === "caster");
  }
  if (condition === "skirmishers") {
    return living.find((enemy) => enemy.role === "skirmisher");
  }
  if (condition === "spawns") {
    return living.find((enemy) => enemy.role === "summon");
  }
  if (condition === "healers") {
    return living.find((enemy) => enemy.role === "healer" || canHeal(enemy));
  }
  if (condition === "highestDamage") {
    return [...living].sort((a, b) => threatDamage(b) - threatDamage(a))[0];
  }

  return null;
}

function createTargetRule(id) {
  return {
    id: `mode:${id}`,
    label: targetingLabels[id] ?? id,
  };
}

function targetDistance(enemy) {
  return roleDistance[enemy.role] ?? 1;
}

function canHeal(enemy) {
  return (enemy.actions ?? []).some((action) => action.kind === "heal" || action.status?.hpRegen);
}

function threatDamage(enemy) {
  const actionThreat = Math.max(0, ...(enemy.actions ?? []).map(actionDamage));
  const engageThreat = enemy.engage ? actionDamage(enemy.engage) : 0;
  return Math.max(actionThreat, engageThreat);
}

function actionDamage(action) {
  if (!["attack", "spellAttack"].includes(action.kind)) return 0;
  const damage = action.damage ?? {};
  return damage.flat ?? 0;
}
