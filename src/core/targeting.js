export const targetingLabels = {
  lowestHp: "Lowest HP",
  highestHp: "Highest HP",
  summoner: "Summoner",
  afflicted: "Afflicted",
  unafflicted: "Unafflicted",
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
  if (!encounter) return [];

  const targets = new Map();
  const visit = (monster) => {
    if (!monster || targets.has(monster.id)) return;
    targets.set(monster.id, {
      id: `target:${monster.id}`,
      label: monster.name,
      count: 0,
    });

    for (const action of monster.actions ?? []) {
      if (action.kind === "summon") visit(action.summon);
    }
  };

  for (const monster of encounter.monsters) {
    visit(monster);
    targets.get(monster.id).count += 1;
  }

  return [...targets.values()];
}

export function reconcileTargetPriority(priority, encounterRules, unlockedRules) {
  const available = [
    ...encounterRules.map((rule) => rule.id),
    ...unlockedRules.map((rule) => `rule:${rule}`),
  ];
  const retained = priority.filter((rule) => available.includes(rule));
  return [...retained, ...available.filter((rule) => !retained.includes(rule))];
}

function findRuleMatch(living, rule) {
  if (rule.startsWith("target:")) {
    const targetId = rule.slice("target:".length);
    return living.find((enemy) => enemy.id === targetId);
  }

  const condition = rule.startsWith("rule:") ? rule.slice("rule:".length) : rule;
  if (condition === "lowestHp") {
    return [...living].sort((a, b) => a.hp - b.hp)[0];
  }
  if (condition === "highestHp") {
    return [...living].sort((a, b) => b.hp - a.hp)[0];
  }
  if (condition === "summoner") {
    return living.find((enemy) => enemy.actions?.some((action) => action.kind === "summon"));
  }
  if (condition === "afflicted") {
    return living.find((enemy) => hasDamageAffliction(enemy));
  }
  if (condition === "unafflicted") {
    return living.find((enemy) => !hasDamageAffliction(enemy));
  }

  return null;
}

function hasDamageAffliction(enemy) {
  return enemy.statuses?.some((status) => ["poisoned", "bleeding"].includes(status.id)) ?? false;
}
