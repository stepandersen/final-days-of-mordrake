import { resolveItem } from "./items.js";
import { getActiveActionRefs, getActivePassiveRefs } from "./slots.js";

const SPELL_POWER_PER_INTELLIGENCE = 1.5;

export function getPlayerLevel(wins) {
  let level = 1;

  while (wins >= getWinsRequiredForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export function getWinsRequiredForLevel(level) {
  if (level <= 1) return 0;
  return (level - 1) * level / 2;
}

export function getEquippedItems(player) {
  return [
    player.engage,
    ...getActiveActionRefs(player),
    ...getActivePassiveRefs(player),
  ].map((ref) => resolveItem(player, ref));
}

export function getEquippedBonuses(player) {
  return getEquippedItems(player).reduce(
    (total, item) => mergeBonuses(total, item.bonuses),
    createEmptyBonuses(),
  );
}

export function getCoreStats(player) {
  const level = getPlayerLevel(player.wins);
  const levelBonus = level - 1;

  return {
    strength: player.stats.strength + levelBonus,
    intelligence: player.stats.intelligence + levelBonus,
    agility: player.stats.agility + levelBonus,
  };
}

export function getPlayerStatBlock(player) {
  const level = getPlayerLevel(player.wins);
  const coreStats = getCoreStats(player);
  const bonuses = getEquippedBonuses(player);
  const effectiveStats = {
    strength: coreStats.strength + bonuses.strength,
    intelligence: coreStats.intelligence + bonuses.intelligence,
    agility: coreStats.agility + bonuses.agility,
  };
  const coreDerived = getDerivedStats(coreStats);
  const derived = getDerivedStats(effectiveStats, bonuses);

  return {
    level,
    coreStats,
    bonuses,
    effectiveStats,
    coreDerived,
    derived,
  };
}

export function getDerivedStats(stats, bonuses = {}) {
  return {
    maxHp: 20 + stats.strength * 10 + (bonuses.maxHp ?? 0),
    maxMana: 20 + stats.intelligence * 8 + (bonuses.maxMana ?? 0),
    spellPower: spellPowerFromIntelligence(stats.intelligence) + (bonuses.spellPower ?? 0),
  };
}

export function readAmount(source, actor) {
  const flat = source.flat ?? 0;
  const stat = source.stat ? readActorStat(actor, source.stat) : 0;
  const derived = source.derived ? readActorDerived(actor, source.derived) : 0;
  const multiplier = source.multiplier ?? 1;

  return Math.max(0, Math.round(flat + (stat + derived) * multiplier));
}

function readActorStat(actor, stat) {
  return (actor.stats[stat] ?? 0) + getStatusBonus(actor, stat);
}

function readActorDerived(actor, derived) {
  if (derived === "spellPower") {
    return (actor.derived.spellPower ?? 0)
      + getStatusBonus(actor, "spellPower")
      + spellPowerFromIntelligence(getStatusBonus(actor, "intelligence"));
  }

  return (actor.derived[derived] ?? 0) + getStatusBonus(actor, derived);
}

function spellPowerFromIntelligence(intelligence) {
  return Math.floor(intelligence * SPELL_POWER_PER_INTELLIGENCE);
}

function getStatusBonus(actor, key) {
  return actor.statuses?.reduce((total, status) => total + (status.bonuses?.[key] ?? 0), 0) ?? 0;
}

function createEmptyBonuses() {
  return {
    strength: 0,
    intelligence: 0,
    agility: 0,
    armor: 0,
    spellPower: 0,
    maxHp: 0,
    maxMana: 0,
    manaRegen: 0,
    doubleStrikeChance: 0,
  };
}

function mergeBonuses(total, bonuses = {}) {
  return Object.entries(bonuses).reduce((next, [key, value]) => {
    next[key] = (next[key] ?? 0) + value;
    return next;
  }, total);
}
