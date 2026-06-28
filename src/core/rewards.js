import { getItem } from "../data/items.js";
import { rarityTable, rewardLanes, rewardTemplates } from "../data/rewards.js";
import { getPlayerStatBlock } from "./formulas.js";
import { describeItemRules, getInventoryItem } from "./items.js";

const TRAINING_ICON = "assets/icons/items/training.png";
const RECOVERY_ICON = "assets/icons/items/recovery.png";
const TARGETING_ICON = "assets/icons/items/targeting.png";
const recoveryRates = [0.25, 0.4, 0.6, 1];

export function createRewardChoices(player) {
  return rewardLanes.map((lane) => createLaneReward(player, lane));
}

export function createItemInstanceForRarity(templateId, rarityId, lane) {
  const rarity = rarityTable.find((entry) => entry.id === rarityId);
  if (!rarity) {
    throw new Error(`Unknown rarity: ${rarityId}`);
  }

  return createItemInstance(templateId, rarity, lane);
}

function createLaneReward(player, lane) {
  const rarity = rollRarity();
  const templates = rewardTemplates.filter((template) => isAvailable(player, template, rarity) && template.lane === lane);
  const template = pickOne(templates);

  if (template.kind === "training") {
    return createTrainingReward(template, rarity);
  }

  if (template.kind === "targeting") {
    return createTargetingReward(template, rarity);
  }

  if (template.kind === "recovery") {
    return createRecoveryReward(template, rarity);
  }

  return createItemReward(template, rarity, lane);
}

function createTrainingReward(template, rarity) {
  const gain = 2 + rarity.quality;
  const extraStats = getTrainingExtras(template.stat, rarity.quality);
  const extrasText = Object.entries(extraStats).map(([stat, value]) => `+${value} ${label(stat)}`);
  const description = [`+${gain} ${label(template.stat)}`, `-1 ${label(template.costStat)}`, ...extrasText];

  return {
    id: `${template.id}-${rarity.id}`,
    lane: template.lane,
    slotLabel: "Training",
    rarity: rarity.id,
    name: template.name,
    icon: TRAINING_ICON,
    description,
    apply(player) {
      player.stats[template.stat] += gain;
      player.stats[template.costStat] = Math.max(1, player.stats[template.costStat] - 1);
      for (const [stat, value] of Object.entries(extraStats)) {
        player.stats[stat] += value;
      }
    },
  };
}

function createTargetingReward(template, rarity) {
  return {
    id: `${template.id}-${rarity.id}`,
    lane: template.lane,
    slotLabel: "Targeting",
    rarity: rarity.id,
    name: template.name,
    icon: TARGETING_ICON,
    description: [template.description],
    apply(player) {
      if (!player.unlockedTargeting.includes(template.rule)) {
        player.unlockedTargeting.push(template.rule);
      }
    },
  };
}

function createRecoveryReward(template, rarity) {
  const recoveryRate = recoveryRates[rarity.quality];
  const percent = Math.round(recoveryRate * 100);

  return {
    id: `${template.id}-${rarity.id}`,
    lane: template.lane,
    slotLabel: "Recovery",
    rarity: rarity.id,
    name: template.name,
    icon: RECOVERY_ICON,
    description: [`Recover ${percent}% of missing HP`],
    apply(player) {
      const { derived } = getPlayerStatBlock(player);
      const currentHp = Math.min(player.currentHp ?? derived.maxHp, derived.maxHp);
      const missingHp = Math.max(0, derived.maxHp - currentHp);
      const recovered = Math.round(missingHp * recoveryRate);
      player.currentHp = Math.min(derived.maxHp, currentHp + recovered);
    },
  };
}

function createItemReward(template, rarity, lane) {
  const item = createItemInstance(template.templateId, rarity, lane);

  return {
    id: item.instanceId,
    lane,
    slotLabel: slotLabel(item.item.type),
    rarity: rarity.id,
    name: item.item.name,
    icon: item.item.icon,
    description: item.item.rules,
    apply(player) {
      player.inventory.push(item);
    },
  };
}

function createItemInstance(templateId, rarity, lane) {
  const base = structuredClone(getItem(templateId));
  const quality = rarity.quality;
  const instanceId = `${templateId}-${rarity.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  base.templateId = templateId;
  base.rarity = rarity.id;

  if (base.attributeProgression) {
    applyAttributeProgression(base, quality);
  } else if (quality > 0) {
    improveAction(base, quality);
  }

  if (!base.attributeProgression && quality >= 2) {
    addRareEffect(base, lane, quality);
  }

  if (!base.attributeProgression && quality >= 3) {
    addEpicEffect(base, lane, quality);
  }

  base.rules = describeItemRules(base);

  return {
    instanceId,
    templateId,
    rarity: rarity.id,
    item: base,
  };
}

function applyAttributeProgression(item, quality) {
  const { primary, secondary } = item.attributeProgression;
  const other = ["strength", "intelligence", "agility"]
    .find((stat) => stat !== primary && stat !== secondary);

  item.bonuses = {
    [primary]: 2 + quality,
  };

  if (quality === 2) {
    item.bonuses[secondary] = 1;
  }

  if (quality >= 3) {
    item.bonuses[secondary] = 2;
    item.bonuses[other] = 2;
  }
}

function improveAction(item, quality) {
  if (item.bonuses) improveBonuses(item.bonuses, quality);
  if (item.passive?.onSpellCast) {
    item.passive.onSpellCast.chance = capChance(item.passive.onSpellCast.chance + quality * 0.05);
    item.passive.onSpellCast.restoreMana += quality * 5;
  }

  const action = item.action;
  if (!action) return;

  if (action.damage) {
    if (action.damage.flat !== undefined) action.damage.flat += quality;
    if (action.damage.multiplier !== undefined) action.damage.multiplier = round(action.damage.multiplier + quality * 0.05);
    if (action.damage.derived && action.damage.flat === undefined) action.damage.flat = quality * 2;
  }

  if (action.status) {
    if (action.status.amount !== undefined) action.status.amount += quality;
    if (action.status.chance !== undefined) action.status.chance = capChance(action.status.chance + quality * 0.05);
    if (quality >= 2 && action.status.duration !== undefined && action.status.id !== "stunned") action.status.duration += 1;
  }

  if (action.criticalStrike) action.criticalStrike.chance = capChance(action.criticalStrike.chance + quality * 0.05);
  if (action.doubleStrike) action.doubleStrike.chance = capChance(action.doubleStrike.chance + quality * 0.05);
  if (action.lifeSteal) {
    action.lifeSteal.chance = capChance(action.lifeSteal.chance + quality * 0.05);
    action.lifeSteal.percent = round(action.lifeSteal.percent + quality * 0.05);
  }

  if (action.manaCost) action.manaCost = Math.max(1, action.manaCost - quality);
  if (action.shield) action.shield += quality * 2;
  if (action.armor) action.armor += quality * 2;
  if (action.status?.bonuses) improveBonuses(action.status.bonuses, quality);
  if (action.status?.blockChance) action.status.blockChance = capChance(action.status.blockChance + quality * 0.05);
  if (action.status?.hpRegen) improveScalingAmount(action.status.hpRegen, quality * 2, action.status, "hpRegen");
  if (action.status?.manaRegen) improveScalingAmount(action.status.manaRegen, quality * 2, action.status, "manaRegen");
}

function improveScalingAmount(amount, bonus, owner, key) {
  if (typeof amount === "number") {
    owner[key] += bonus;
    return;
  }

  amount.flat = (amount.flat ?? 0) + bonus;
}

function addRareEffect(item, lane, quality) {
  const bonus = quality + 1;

  if (lane === "strength") {
    addBonuses(item, { spellPower: bonus });
    return;
  }

  if (lane === "agility") {
    addBonuses(item, { agility: 1 });
    return;
  }

  addBonuses(item, { maxMana: bonus * 3 });
}

function addEpicEffect(item, lane, quality) {
  if (lane === "strength") {
    addBonuses(item, { armor: quality + 1 });
    return;
  }

  if (lane === "agility") {
    if (!item.action?.doubleStrike) {
      item.action = item.action ?? {};
      item.action.doubleStrike = { chance: 0.15 };
    } else {
      item.action.doubleStrike.chance = capChance(item.action.doubleStrike.chance + 0.15);
    }
    return;
  }

  addBonuses(item, { spellPower: quality + 2 });
}

function getTrainingExtras(mainStat, quality) {
  if (quality < 2) return {};

  const extras = {};
  const first = mainStat === "strength" ? "agility" : mainStat === "agility" ? "intelligence" : "strength";
  extras[first] = 1;

  if (quality >= 3) {
    const second = ["strength", "intelligence", "agility"].find((stat) => stat !== mainStat && stat !== first);
    extras[second] = 1;
  }

  return extras;
}

function isAvailable(player, template, rarity) {
  if (template.kind === "targeting") return !player.unlockedTargeting.includes(template.rule);
  if (template.kind === "item") return !hasSameOrBetterItem(player, template.templateId, rarity);
  return true;
}

function hasSameOrBetterItem(player, templateId, rarity) {
  return player.inventory.some((entry) => {
    const item = getInventoryItem(entry);
    const ownedTemplateId = typeof entry === "object" ? entry.templateId : item.id;
    return ownedTemplateId === templateId && rarityQuality(item.rarity) >= rarity.quality;
  });
}

function rarityQuality(rarityId) {
  if (rarityId === "poor") return -1;
  return rarityTable.find((rarity) => rarity.id === rarityId)?.quality ?? 0;
}

function rollRarity() {
  const total = rarityTable.reduce((sum, rarity) => sum + rarity.weight, 0);
  let roll = Math.random() * total;

  for (const rarity of rarityTable) {
    roll -= rarity.weight;
    if (roll <= 0) return rarity;
  }

  return rarityTable[0];
}

function pickOne(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function addBonuses(item, bonuses) {
  item.bonuses = item.bonuses ?? {};
  for (const [key, value] of Object.entries(bonuses)) {
    item.bonuses[key] = (item.bonuses[key] ?? 0) + value;
  }
}

function addToObjectNumbers(object, amount) {
  for (const key of Object.keys(object)) {
    if (typeof object[key] === "number" && key !== "damageMultiplier") {
      object[key] += amount;
    }
  }
}

function improveBonuses(bonuses, quality) {
  for (const key of Object.keys(bonuses)) {
    if (typeof bonuses[key] !== "number") continue;
    bonuses[key] += ["damageMultiplier", "doubleStrikeChance"].includes(key) ? quality * 0.05 : quality;
  }
}

function capChance(value) {
  return Math.min(0.9, round(value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function label(value) {
  return value.replace(/^\w/, (letter) => letter.toUpperCase());
}

function slotLabel(value) {
  return label(value);
}
