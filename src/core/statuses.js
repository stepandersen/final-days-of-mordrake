export const statusDefinitions = {
  poisoned: {
    label: "Poison",
    category: "dot",
    durationUnit: "set",
    stacking: "stackAmountRefreshDuration",
    trigger: "setEnd",
    damageLabel: "poison",
  },
  bleeding: {
    label: "Bleed",
    category: "dot",
    durationUnit: "set",
    stacking: "stackAmountRefreshDuration",
    trigger: "physicalAttackEnd",
    damageLabel: "bleed",
  },
  stunned: {
    label: "Stun",
    category: "control",
    durationUnit: "action",
    stacking: "refreshDuration",
    bossChanceMultiplier: 0.5,
  },
  rooted: {
    label: "Rooted",
    category: "debuff",
    durationUnit: "set",
    stacking: "refreshDuration",
  },
  vulnerable: {
    label: "Vulnerable",
    category: "debuff",
    durationUnit: "set",
    stacking: "refreshDuration",
  },
  healingBlocked: {
    label: "Healing Blocked",
    category: "debuff",
    durationUnit: "set",
    stacking: "refreshDuration",
  },
  hidden: {
    label: "Hidden",
    category: "defense",
    durationUnit: "set",
    stacking: "replace",
  },
  defender: {
    label: "Defender",
    category: "defense",
    durationUnit: "incomingAction",
    stacking: "replace",
  },
  ward: {
    label: "Ward",
    category: "defense",
    durationUnit: "incomingAction",
    stacking: "replace",
  },
};

const fallbackDefinition = {
  category: "buff",
  durationUnit: "set",
  stacking: "refreshDuration",
};

export function getStatusDefinition(id) {
  return statusDefinitions[id] ?? fallbackDefinition;
}

export function getStatusLabel(id) {
  return statusDefinitions[id]?.label ?? label(id);
}

export function getStatusDurationUnit(status) {
  return status.durationUnit ?? getStatusDefinition(status.id).durationUnit;
}

export function getStatusStacking(status) {
  if (status.stack) return "stackAmountRefreshDuration";
  return status.stacking ?? getStatusDefinition(status.id).stacking;
}

export function isSetDurationStatus(status) {
  return getStatusDurationUnit(status) === "set";
}

export function isIncomingActionDefense(status) {
  return getStatusDurationUnit(status) === "incomingAction";
}

export function isControlStatus(status) {
  return getStatusDefinition(status.id).category === "control";
}

function label(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^\w/, (letter) => letter.toUpperCase());
}
