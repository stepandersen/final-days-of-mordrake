export const actionSlotRules = [
  { index: 0, unlockLevel: 1 },
  { index: 1, unlockLevel: 1 },
  { index: 2, unlockLevel: 3 },
];

export const passiveSlotRules = [
  { index: 0, unlockLevel: 1 },
  { index: 1, unlockLevel: 6 },
  { index: 2, unlockLevel: 9 },
];

export function isActionSlotUnlocked(player, index) {
  return isRuleUnlocked(player, actionSlotRules[index]);
}

export function isPassiveSlotUnlocked(player, index) {
  return isRuleUnlocked(player, passiveSlotRules[index]);
}

export function getActiveActionRefs(player) {
  return player.actions.filter((_, index) => isActionSlotUnlocked(player, index));
}

export function getActivePassiveRefs(player) {
  return player.passives.filter((_, index) => isPassiveSlotUnlocked(player, index));
}

function isRuleUnlocked(player, rule) {
  return rule && getPlayerLevel(player.wins) >= rule.unlockLevel;
}

function getPlayerLevel(wins) {
  let level = 1;

  while (wins >= getWinsRequiredForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

function getWinsRequiredForLevel(level) {
  if (level <= 1) return 0;
  return (level - 1) * level / 2;
}
