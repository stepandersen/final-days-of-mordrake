import { getItem } from "../data/items.js";
import { getStatusDurationUnit, getStatusLabel } from "./statuses.js";

export function resolveItem(player, ref) {
  if (typeof ref === "object") {
    return ref.item;
  }

  const instance = player.inventory.find((entry) => typeof entry === "object" && entry.instanceId === ref);
  return instance ? instance.item : getItem(ref);
}

export function getInventoryRef(entry) {
  return typeof entry === "object" ? entry.instanceId : entry;
}

export function getInventoryItem(entry) {
  return typeof entry === "object" ? entry.item : getItem(entry);
}

export function hasCatalogItem(player, templateId) {
  return player.inventory.some((entry) => {
    if (typeof entry === "string") return entry === templateId;
    return entry.templateId === templateId;
  });
}

export function addUniqueCatalogItem(player, templateId) {
  if (!hasCatalogItem(player, templateId)) {
    player.inventory.push(templateId);
  }
}

export function describeItemRules(item) {
  const rules = [];

  if (item.bonuses && Object.keys(item.bonuses).length > 0) {
    rules.push(formatBonuses(item.bonuses));
  }

  if (item.action) {
    rules.push(...describeAction(item.action));
  }

  if (item.passive?.onSpellCast) {
    const trigger = item.passive.onSpellCast;
    rules.push(`${formatPercent(trigger.chance)} chance to restore ${trigger.restoreMana} mana when casting a spell`);
  }

  return rules.length > 0 ? rules : item.rules;
}

function describeAction(action) {
  if (action.kind === "attack" || action.kind === "spellAttack") {
    const rules = [];
    const prefix = getDamageLabel(action);
    const target = action.targetMode === "allEnemies" ? " to all enemies" : "";
    rules.push(`${prefix}: ${formatDamage(action.damage)}${target}`);

    if (action.criticalStrike) rules.push(`${formatPercent(action.criticalStrike.chance)} chance: critical strike for +${formatPercent(action.criticalStrike.multiplier - 1)} damage after armor`);
    if (action.doubleStrike) rules.push(`${formatPercent(action.doubleStrike.chance)} chance to strike twice`);
    if (action.lifeSteal) rules.push(`${formatPercent(action.lifeSteal.chance)} chance: heal for ${formatPercent(action.lifeSteal.percent)} of damage dealt`);
    if (action.status) rules.push(describeStatusApplication(action.status));
    if (action.selfStatus) rules.push(`Self: ${describeStatusApplication(action.selfStatus)}`);
    if (action.manaCost) rules.push(`Cost: ${action.manaCost} mana`);

    return rules;
  }

  if (action.kind === "buff") {
    return [describeBuff(action.status)];
  }

  if (action.kind === "defense") {
    return [describeDefense(action.status), action.manaCost ? `Cost: ${action.manaCost} mana` : null].filter(Boolean);
  }

  if (action.kind === "heal") {
    return [`Consumed for ${action.amount} HP if HP is below ${formatPercent(action.threshold)}`];
  }

  if (action.kind === "vanish") {
    return ["Once per fight: become Hidden", `Hidden: physical attacks have ${formatPercent(action.physicalMissChance)} miss chance`, "Next player turn starts with Engage"];
  }

  return [];
}

function getDamageLabel(action) {
  if (action.damageType === "spell" || action.kind === "spellAttack") {
    const element = action.elementType ?? action.element;
    return element ? `${label(element)} Damage` : "Spell Damage";
  }

  return "Damage";
}

function describeBuff(status) {
  const bonusText = status.bonuses && Object.keys(status.bonuses).length > 0 ? formatBonuses(status.bonuses) : null;
  const regenParts = [];
  if (status.hpRegen) regenParts.push(`regenerate ${formatAmount(status.hpRegen)} HP per set`);
  if (status.manaRegen) regenParts.push(`restore ${formatAmount(status.manaRegen)} mana per set`);

  if (bonusText) {
    return `Gain ${[bonusText, ...regenParts].join(" and ")} for ${status.duration} sets`;
  }

  return `${capitalize(regenParts.join(" and "))} for ${status.duration} sets`;
}

function formatAmount(amount) {
  return typeof amount === "number" ? amount : formatDamage(amount);
}

function describeDefense(status) {
  const name = status.id === "ward" ? "Ward" : "Defender";
  return `${name}: ${formatPercent(status.blockChance)} chance to block the next ${status.damageType} action`;
}

function describeStatusApplication(status) {
  const durationUnit = getStatusDurationUnit(status);
  const statusParts = [];
  statusParts.push(status.amount ? `${status.amount} ${getStatusLabel(status.id)}` : getStatusLabel(status.id));
  if (status.armor) statusParts.push(`${status.armor > 0 ? "+" : ""}${status.armor} Armor`);
  if (status.bonuses && Object.keys(status.bonuses).length > 0) statusParts.push(formatBonuses(status.bonuses));
  const chance = status.chance ? `${formatPercent(status.chance)} chance: ` : "";
  return `${chance}apply ${statusParts.join(", ")} for ${status.duration} ${durationUnit}${status.duration === 1 ? "" : "s"}`;
}

function formatDamage(damage) {
  const parts = [];
  const multiplier = damage.multiplier ?? 1;

  if (damage.stat) parts.push(`${multiplier === 1 ? "" : `${formatPercent(multiplier)} `}${label(damage.stat)}`);
  if (damage.derived) parts.push(`${multiplier === 1 ? "" : `${formatPercent(multiplier)} `}${label(damage.derived)}`);
  if (damage.flat) parts.push(`${parts.length > 0 && damage.flat > 0 ? "+ " : ""}${damage.flat}`);

  return parts.join(" ") || "0";
}

function formatBonuses(bonuses) {
  return Object.entries(bonuses)
    .map(([key, value]) => `${value > 0 ? "+" : ""}${formatBonusValue(key, value)} ${label(key)}`)
    .join(", ");
}

function formatBonusValue(key, value) {
  if (key === "damageMultiplier") return formatPercent(value - 1);
  if (key === "doubleStrikeChance") return formatPercent(value);
  return value;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function label(value) {
  const labels = {
    damageMultiplier: "Damage",
    doubleStrikeChance: "Double Strike Chance",
    maxHp: "Max HP",
    maxMana: "Max Mana",
    manaRegen: "Mana Regen",
    spellPower: "Spell Power",
  };

  if (labels[value]) return labels[value];
  return value.replace(/([A-Z])/g, " $1").replace(/^\w/, (letter) => letter.toUpperCase());
}

function capitalize(value) {
  return value.replace(/^\w/, (letter) => letter.toUpperCase());
}
