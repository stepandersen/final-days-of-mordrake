import { getPlayerStatBlock, readAmount } from "./formulas.js";
import { resolveItem } from "./items.js";
import { getActiveActionRefs, getActivePassiveRefs } from "./slots.js";
import {
  getStatusDefinition,
  getStatusDurationUnit,
  getStatusLabel,
  getStatusStacking,
  isControlStatus,
  isIncomingActionDefense,
  isSetDurationStatus,
} from "./statuses.js";
import { findTarget } from "./targeting.js";

const MAX_ROUNDS = 40;
const MONSTER_DAMAGE_MULTIPLIER = 1.15;

export function runCombat(player, encounter, targetPriority) {
  const state = createCombatState(player, encounter);
  const log = [];
  const startingHp = state.player.hp;

  log.push(important(`${encounter.name} begins.`));

  if (encounter.initiate && player.engage) {
    const item = resolveItem(player, player.engage);
    log.push(event(`${player.name} opens with ${item.name}.`, {
      type: "engage",
      actorId: state.player.id,
      sourceId: item.id,
      sourceType: item.type,
    }));
    resolveAction({
      actor: state.player,
      action: item.action,
      actionName: item.name,
      sourceId: item.id,
      sourceType: item.type,
      allies: [state.player],
      enemies: state.enemies,
      targetPriority,
      log,
    });
  }

  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    if (isFightOver(state)) break;
    log.push(important(`Round ${round}`, { type: "round", round }));

    replayEngageIfHidden(state, player, targetPriority, log);

    for (const itemId of getActiveActionRefs(player)) {
      if (isFightOver(state)) break;
      const item = resolveItem(player, itemId);
      resolveAction({
        actor: state.player,
        action: item.action,
        actionName: item.name,
        sourceId: item.id,
        sourceType: item.type,
        allies: [state.player],
        enemies: state.enemies,
        targetPriority,
        log,
      });
    }
    resolveStatusTriggers(state.player, "setEnd", log);
    resolveBaselineManaRegen(state.player, log);
    tickSetStatuses(state.player);

    for (const enemy of state.enemies) {
      if (isFightOver(state) || enemy.hp <= 0) continue;

      for (const action of enemy.actions) {
        if (isFightOver(state) || enemy.hp <= 0) break;
        resolveAction({
          actor: enemy,
          action,
          actionName: action.name,
          sourceId: action.id ?? action.name,
          sourceType: "monsterAction",
          allies: state.enemies,
          enemies: [state.player],
          targetPriority: ["player"],
          log,
        });
      }
      resolveStatusTriggers(enemy, "setEnd", log);
      resolveBaselineManaRegen(enemy, log);
      tickSetStatuses(enemy);
    }

  }

  if (!isFightOver(state)) {
    log.push(important("The fight drags into exhaustion. The monster side wins."));
    state.player.hp = 0;
  }

  const victory = state.player.hp > 0 && state.enemies.every((enemy) => enemy.hp <= 0);
  if (victory) {
    resolvePostCombatRecovery(state.player, startingHp, player.recoveryRate ?? 0.2, log);
  }
  log.push(important(victory ? "Victory." : "Defeat."));

  return {
    victory,
    player: state.player,
    enemies: state.enemies,
    log,
  };
}

function createCombatState(player, encounter) {
  const statBlock = getPlayerStatBlock(player);

  return {
    player: {
      id: "player",
      name: player.name,
      role: "player",
      stats: structuredClone(statBlock.effectiveStats),
      derived: statBlock.derived,
      hp: Math.max(0, Math.min(player.currentHp ?? statBlock.derived.maxHp, statBlock.derived.maxHp)),
      maxHp: statBlock.derived.maxHp,
      mana: statBlock.derived.maxMana,
      maxMana: statBlock.derived.maxMana,
      armor: statBlock.bonuses.armor,
      doubleStrikeChance: statBlock.bonuses.doubleStrikeChance,
      manaRegen: statBlock.bonuses.manaRegen,
      shield: 0,
      spellShield: 0,
      statuses: [],
      usedOnce: new Set(),
      passives: getActivePassiveRefs(player).map((ref) => resolveItem(player, ref)),
      pendingEngageReplay: false,
    },
    enemies: encounter.monsters.map((monster, index) => ({
      ...structuredClone(monster),
      instanceId: `${monster.id}-${index}`,
      boss: monster.boss ?? (Boolean(encounter.boss) && index === 0),
      maxHp: monster.hp,
      mana: monster.mana ?? 0,
      maxMana: monster.mana ?? 0,
      stats: {},
      derived: {},
      shield: 0,
      spellShield: monster.spellShield ?? 0,
      statuses: [],
      usedOnce: new Set(),
      passives: [],
      attackBonus: 0,
    })),
  };
}

function resolvePostCombatRecovery(player, startingHp, recoveryRate, log) {
  const damageSustained = Math.max(0, startingHp - player.hp);
  if (damageSustained === 0 || recoveryRate <= 0) return;

  const recovery = Math.max(1, Math.round(damageSustained * recoveryRate));
  const healed = Math.min(recovery, player.maxHp - player.hp);
  if (healed <= 0) return;

  player.hp += healed;
  log.push(actionEvent(`${player.name} recovers ${healed} HP after the fight.`, "recovery", player, player, {
    sourceId: "postCombatRecovery",
    sourceType: "combatRule",
    amount: healed,
    recoveryRate,
    actorHp: player.hp,
    actorMaxHp: player.maxHp,
    targetHp: player.hp,
    targetMaxHp: player.maxHp,
  }));
}

function resolveAction({ actor, action, actionName, sourceId, sourceType, allies, enemies, targetPriority, log }) {
  if (actor.hp <= 0) return;

  const stun = actor.statuses.find((status) => status.id === "stunned");
  if (stun) {
    log.push(actionEvent(`${actor.name} is stunned and skips ${actionName}.`, "skip", actor, null, {
      sourceId,
      sourceType,
      statusId: "stunned",
    }));
    stun.duration -= 1;
    actor.statuses = actor.statuses.filter((status) => status.id !== "stunned" || status.duration > 0);
    return;
  }

  if (action.oncePerFight && actor.usedOnce.has(actionName)) {
    return;
  }

  if (action.manaCost && actor.mana < action.manaCost) {
    log.push(actionEvent(`${actor.name} lacks mana for ${actionName}.`, "noMana", actor, null, {
      sourceId,
      sourceType,
      manaCost: action.manaCost,
    }));
    return;
  }

  if (action.kind === "heal") {
    consumeEnemyDefenses(actor, action, actionName, sourceId, sourceType, enemies, log);
    resolveHeal(actor, action, actionName, sourceId, sourceType, log);
    return;
  }

  if (action.kind === "vanish") {
    consumeEnemyDefenses(actor, action, actionName, sourceId, sourceType, enemies, log);
    resolveVanish(actor, action, actionName, sourceId, sourceType, log);
    return;
  }

  if (action.kind === "buff") {
    consumeEnemyDefenses(actor, action, actionName, sourceId, sourceType, enemies, log);
    applyStatus(actor, action.status, log, actor, sourceId, sourceType);
    return;
  }

  if (action.manaCost) {
    actor.mana -= action.manaCost;
    triggerSpellPassives(actor, log);
  }

  if (action.kind === "attack" || action.kind === "spellAttack") {
    const targets = findActionTargets(action, enemies, targetPriority);
    if (targets.length === 0) return;
    for (const target of targets) {
      if (consumeReactiveDefense(target, getDamageType(action), actor, actionName, sourceId, sourceType, log)) {
        continue;
      }
      resolveAttack(actor, target, action, actionName, sourceId, sourceType, log);
    }
    if (getDamageType(action) === "physical") {
      resolveStatusTriggers(actor, "physicalAttackEnd", log);
    }
    const repeatTarget = targets[0];
    const doubleStrike = getDoubleStrike(action, actor);
    if (actor.hp > 0 && doubleStrike && Math.random() < doubleStrike.chance && repeatTarget.hp > 0) {
      log.push(actionEvent(`${actor.name}'s ${actionName} double strikes.`, "doubleStrike", actor, repeatTarget, {
        sourceId,
        sourceType,
      }));
      resolveAttack(actor, repeatTarget, action, actionName, sourceId, sourceType, log);
      if (getDamageType(action) === "physical") {
        resolveStatusTriggers(actor, "physicalAttackEnd", log);
      }
    }
    return;
  }

  if (action.kind === "defense") {
    applyDefenseStatus(actor, action.status, actionName, sourceId, sourceType, log);
    return;
  }

  if (action.kind === "status") {
    const target = findTarget(enemies, targetPriority);
    if (!target) return;
    consumeReactiveDefense(target, "status", actor, actionName, sourceId, sourceType, log);
    applyStatus(target, action.status, log, actor, sourceId, sourceType);
    return;
  }

  if (action.kind === "buffNextAttack") {
    consumeEnemyDefenses(actor, action, actionName, sourceId, sourceType, enemies, log);
    actor.attackBonus = (actor.attackBonus ?? 0) + action.bonus;
    log.push(actionEvent(`${actor.name} prepares +${action.bonus} damage for the next attack.`, "buff", actor, actor, {
      sourceId,
      sourceType,
      bonus: action.bonus,
    }));
    return;
  }

  if (action.kind === "summon") {
    consumeEnemyDefenses(actor, action, actionName, sourceId, sourceType, enemies, log);
    const aliveCount = allies.filter((ally) => ally.id === action.summon.id && ally.hp > 0).length;
    if (aliveCount >= action.maxAlive) {
      log.push(actionEvent(`${actor.name} cannot summon more ${action.summon.name}s.`, "summonBlocked", actor, null, {
        sourceId,
        sourceType,
        summonId: action.summon.id,
      }));
      return;
    }

    const summonedInstanceId = `${action.summon.id}-${Date.now()}-${Math.random()}`;
    allies.push({
      ...structuredClone(action.summon),
      instanceId: summonedInstanceId,
      maxHp: action.summon.hp,
      mana: action.summon.mana ?? 0,
      maxMana: action.summon.mana ?? 0,
      stats: {},
      derived: {},
      shield: 0,
      spellShield: action.summon.spellShield ?? 0,
      statuses: [],
      usedOnce: new Set(),
      passives: [],
      attackBonus: 0,
    });
    log.push(actionEvent(`${actor.name} summons a ${action.summon.name}.`, "summon", actor, null, {
      sourceId,
      sourceType,
      summonId: action.summon.id,
      summonInstanceId: summonedInstanceId,
      summonName: action.summon.name,
      summonRole: action.summon.role,
      summonHp: action.summon.hp,
      summonMaxHp: action.summon.hp,
    }));
  }
}

function resolveAttack(actor, target, action, actionName, sourceId, sourceType, log) {
  const damageMultiplier = statusDamageMultiplier(actor);
  const sourceDamageMultiplier = sourceType === "monsterAction" ? MONSTER_DAMAGE_MULTIPLIER : 1;
  const baseDamage = Math.max(0, Math.round(
    (readAmount(action.damage, actor) + (actor.attackBonus ?? 0))
      * damageMultiplier
      * sourceDamageMultiplier,
  ));
  actor.attackBonus = 0;
  const damageType = getDamageType(action);

  if (target.statuses.some((status) => status.id === "hidden") && damageType === "physical") {
    const hidden = target.statuses.find((status) => status.id === "hidden");
    if (Math.random() < hidden.missChance) {
      log.push(actionEvent(`${actor.name}'s ${actionName} misses ${target.name} in the smoke.`, "miss", actor, target, {
        sourceId,
        sourceType,
        damageType,
        missChance: hidden.missChance,
      }));
      return;
    }
  }

  const blockedByShield = Math.min(target.shield, baseDamage);
  target.shield -= blockedByShield;

  const spellShield = damageType === "spell" ? Math.min(target.spellShield, baseDamage - blockedByShield) : 0;
  target.spellShield -= spellShield;

  const armor = damageType === "physical" ? Math.max(0, target.armor + statusArmor(target)) : 0;
  const reducedDamage = Math.max(1, baseDamage - blockedByShield - spellShield - armor);
  const critical = rollCriticalStrike(action.criticalStrike);
  const damageBeforeResistance = critical
    ? Math.max(1, Math.round(reducedDamage * critical.multiplier))
    : reducedDamage;
  const resistanceMultiplier = damageTakenMultiplier(target, action);
  const damage = resistanceMultiplier === 0
    ? 0
    : Math.max(1, Math.round(damageBeforeResistance * resistanceMultiplier));
  target.hp = Math.max(0, target.hp - damage);

  const damageText = damage === 0
    ? `${target.name} is immune to ${actionName}.`
    : critical
      ? `${actor.name} lands a critical ${actionName} on ${target.name} for ${damage} damage.`
      : `${actor.name} uses ${actionName} on ${target.name} for ${damage} damage.`;
  log.push(actionEvent(damageText, "damage", actor, target, {
    sourceId,
    sourceType,
    amount: damage,
    damageType,
    baseDamage,
    damageMultiplier,
    resistanceMultiplier,
    damageBeforeResistance,
    reducedDamage,
    critical: Boolean(critical),
    criticalMultiplier: critical?.multiplier ?? 1,
    targetHp: target.hp,
    targetMaxHp: target.maxHp,
    blockedByShield,
    spellShield,
    armor,
  }));

  if (action.status && target.hp > 0) {
    applyStatus(target, action.status, log, actor, sourceId, sourceType);
  }

  if (action.selfStatus) {
    applyStatus(actor, action.selfStatus, log, actor, sourceId, sourceType);
  }

  if (action.lifeSteal) {
    resolveLifeSteal(actor, action.lifeSteal, damage, actionName, sourceId, sourceType, log);
  }

}

function findActionTargets(action, enemies, targetPriority) {
  if (action.targetMode === "allEnemies") {
    return enemies.filter((enemy) => enemy.hp > 0);
  }

  const target = findTarget(enemies, targetPriority);
  return target ? [target] : [];
}

function getDamageType(action) {
  return action.damageType ?? (action.kind === "spellAttack" ? "spell" : "physical");
}

function damageTakenMultiplier(target, action) {
  const taken = target.damageTaken ?? {};
  const typeMultiplier = taken[getDamageType(action)] ?? 1;
  const element = action.elementType ?? action.element;
  const elementMultiplier = element ? taken[element] ?? 1 : 1;
  return Math.max(0, typeMultiplier * elementMultiplier);
}

function rollCriticalStrike(criticalStrike) {
  if (!criticalStrike || Math.random() > criticalStrike.chance) {
    return null;
  }

  return {
    multiplier: criticalStrike.multiplier,
  };
}

function getDoubleStrike(action, actor) {
  const actionChance = action.doubleStrike?.chance ?? action.repeatChance ?? 0;
  const bonusChance = actor.doubleStrikeChance ?? 0;
  const chance = Math.min(0.9, actionChance + bonusChance);
  return chance > 0 ? { chance } : null;
}

function resolveLifeSteal(actor, lifeSteal, damage, actionName, sourceId, sourceType, log) {
  if (actor.hp >= actor.maxHp || Math.random() > lifeSteal.chance) {
    return;
  }

  const amount = Math.max(1, Math.round(damage * lifeSteal.percent));
  const healed = Math.min(amount, actor.maxHp - actor.hp);
  actor.hp += healed;

  log.push(actionEvent(`${actor.name}'s ${actionName} steals ${healed} HP.`, "lifeSteal", actor, actor, {
    sourceId,
    sourceType,
    amount: healed,
    actorHp: actor.hp,
    actorMaxHp: actor.maxHp,
  }));
}

function resolveVanish(actor, action, actionName, sourceId, sourceType, log) {
  actor.usedOnce.add(actionName);
  actor.pendingEngageReplay = true;
  applyStatus(actor, {
    id: "hidden",
    duration: action.duration,
    missChance: action.physicalMissChance,
  }, log, actor, sourceId, sourceType);
}

function replayEngageIfHidden(state, player, targetPriority, log) {
  const hidden = state.player.statuses.find((status) => status.id === "hidden");
  if (!hidden || !state.player.pendingEngageReplay || !player.engage) {
    return;
  }

  const item = resolveItem(player, player.engage);
  log.push(event(`${state.player.name} emerges from hiding with ${item.name}.`, {
    type: "engageReplay",
    actorId: state.player.id,
    actorName: state.player.name,
    sourceId: item.id,
    sourceType: item.type,
  }));
  resolveAction({
    actor: state.player,
    action: item.action,
    actionName: item.name,
    sourceId: item.id,
    sourceType: item.type,
    allies: [state.player],
    enemies: state.enemies,
    targetPriority,
    log,
  });
  state.player.pendingEngageReplay = false;
  state.player.statuses = state.player.statuses.filter((status) => status.id !== "hidden");
}


function resolveHeal(actor, action, actionName, sourceId, sourceType, log) {
  if (actor.hp / actor.maxHp > action.threshold) {
    log.push(actionEvent(`${actor.name} holds ${actionName}.`, "hold", actor, actor, {
      sourceId,
      sourceType,
    }));
    return;
  }

  if (actor.statuses.some((status) => status.id === "healingBlocked")) {
    log.push(actionEvent(`${actor.name}'s healing is blocked.`, "healingBlocked", actor, actor, {
      sourceId,
      sourceType,
    }));
    return;
  }

  actor.hp = Math.min(actor.maxHp, actor.hp + action.amount);
  actor.usedOnce.add(actionName);
  log.push(actionEvent(`${actor.name} uses ${actionName} and restores ${action.amount} HP.`, "heal", actor, actor, {
    sourceId,
    sourceType,
    amount: action.amount,
    actorHp: actor.hp,
    actorMaxHp: actor.maxHp,
  }));
}

function applyDefenseStatus(actor, status, actionName, sourceId, sourceType, log) {
  actor.statuses = actor.statuses.filter((activeStatus) => activeStatus.id !== status.id);
  actor.statuses.push({ ...status });

  log.push(actionEvent(`${actor.name} prepares ${defenseName(status)}.`, "defense", actor, actor, {
    sourceId,
    sourceType,
    statusId: status.id,
    blockChance: status.blockChance,
    damageType: status.damageType,
  }));
}

function consumeEnemyDefenses(actor, action, actionName, sourceId, sourceType, enemies, log) {
  const damageType = action.damageType ?? "noncombat";

  for (const enemy of enemies) {
    if (enemy.hp > 0) {
      consumeReactiveDefense(enemy, damageType, actor, actionName, sourceId, sourceType, log);
    }
  }
}

function consumeReactiveDefense(target, damageType, actor, actionName, sourceId, sourceType, log) {
  const status = target.statuses.find(isIncomingActionDefense);
  if (!status) {
    return false;
  }

  target.statuses = target.statuses.filter((activeStatus) => activeStatus !== status);
  const name = defenseName(status);

  if (status.damageType !== damageType) {
    log.push(actionEvent(`${target.name}'s ${name} fades against ${actionName}.`, "defenseExpire", actor, target, {
      sourceId,
      sourceType,
      statusId: status.id,
      damageType,
      expectedDamageType: status.damageType,
    }));
    return false;
  }

  if (Math.random() > status.blockChance) {
    log.push(actionEvent(`${target.name}'s ${name} fails against ${actionName}.`, "blockFail", actor, target, {
      sourceId,
      sourceType,
      statusId: status.id,
      blockChance: status.blockChance,
      damageType,
    }));
    return false;
  }

  log.push(actionEvent(`${target.name}'s ${name} blocks ${actionName}.`, "block", actor, target, {
    sourceId,
    sourceType,
    statusId: status.id,
    blockChance: status.blockChance,
    damageType,
  }));
  return true;
}

function defenseName(status) {
  return getStatusLabel(status.id);
}

function applyStatus(target, status, log, source, sourceId, sourceType) {
  const effectiveChance = getEffectiveStatusChance(target, status);
  if (effectiveChance !== null && Math.random() > effectiveChance) {
    log.push(actionEvent(`${source.name}'s effect fails to affect ${target.name}.`, "statusMiss", source, target, {
      sourceId,
      sourceType,
      statusId: status.id,
      chance: effectiveChance,
      baseChance: status.chance,
      bossResisted: target.boss && isControlStatus(status),
    }));
    return;
  }

  const existing = target.statuses.find((activeStatus) => activeStatus.id === status.id);
  const nextStatus = { ...status };
  const amount = status.amount ?? 0;
  if (status.amount !== undefined) nextStatus.amount = amount;

  if (existing && getStatusStacking(status) === "stackAmountRefreshDuration") {
    existing.amount = (existing.amount ?? 0) + amount;
    existing.duration = status.duration;
  } else if (existing && getStatusStacking(status) === "replace") {
    Object.assign(existing, nextStatus);
  } else if (existing) {
    if (status.amount !== undefined) existing.amount = amount;
    existing.duration = Math.max(existing.duration, status.duration);
  } else {
    target.statuses.push(nextStatus);
  }

  const active = target.statuses.find((activeStatus) => activeStatus.id === status.id);
  const amountText = active?.amount ? ` ${active.amount}` : "";
  const unit = getStatusDurationUnit(status);
  log.push(actionEvent(`${target.name} gains ${getStatusLabel(status.id)}${amountText} for ${status.duration} ${unit}(s).`, "status", source, target, {
    sourceId,
    sourceType,
    statusId: status.id,
    amount: active?.amount,
    duration: status.duration,
    durationUnit: unit,
    bonuses: active?.bonuses,
  }));
}

function getEffectiveStatusChance(target, status) {
  if (status.chance === undefined) return null;

  const definition = getStatusDefinition(status.id);
  const bossMultiplier = target.boss && isControlStatus(status)
    ? definition.bossChanceMultiplier ?? 1
    : 1;

  return Math.max(0, Math.min(1, status.chance * bossMultiplier));
}

function resolveStatusTriggers(actor, trigger, log) {
  for (const status of actor.statuses) {
    const definition = getStatusDefinition(status.id);
    if (definition.category === "dot" && definition.trigger === trigger) {
      dealStatusDamage(actor, status, definition.damageLabel, log);
    }

    if (trigger === "setEnd") {
      resolveRegeneration(actor, status, log);
    }
  }
}

function resolveRegeneration(actor, status, log) {
  if (status.hpRegen && actor.hp < actor.maxHp) {
    if (actor.statuses.some((activeStatus) => activeStatus.id === "healingBlocked")) {
      log.push(actionEvent(`${actor.name}'s healing is blocked.`, "healingBlocked", actor, actor, {
        sourceId: status.id,
        sourceType: "status",
      }));
    } else {
      const regenAmount = readAmount(normalizeAmountSource(status.hpRegen), actor);
      const healed = Math.min(regenAmount, actor.maxHp - actor.hp);
      actor.hp += healed;
      log.push(actionEvent(`${actor.name} regenerates ${healed} HP.`, "regen", actor, actor, {
        sourceId: status.id,
        sourceType: "status",
        amount: healed,
        actorHp: actor.hp,
        actorMaxHp: actor.maxHp,
        targetHp: actor.hp,
        targetMaxHp: actor.maxHp,
      }));
    }
  }

  if (status.manaRegen && actor.mana < actor.maxMana) {
    const regenAmount = readAmount(normalizeAmountSource(status.manaRegen), actor);
    const restored = Math.min(regenAmount, actor.maxMana - actor.mana);
    actor.mana += restored;
    log.push(actionEvent(`${actor.name} restores ${restored} mana.`, "manaRegen", actor, actor, {
      sourceId: status.id,
      sourceType: "status",
      amount: restored,
      actorMana: actor.mana,
      actorMaxMana: actor.maxMana,
      targetMana: actor.mana,
      targetMaxMana: actor.maxMana,
    }));
  }
}

function normalizeAmountSource(amount) {
  return typeof amount === "number" ? { flat: amount } : amount;
}

function resolveBaselineManaRegen(actor, log) {
  if (actor.mana >= actor.maxMana || actor.maxMana <= 0) {
    return;
  }

  const intelligence = actor.stats?.intelligence ?? 0;
  const amount = Math.max(1, 1 + Math.floor(intelligence / 5) + (actor.manaRegen ?? 0));
  const restored = Math.min(amount, actor.maxMana - actor.mana);
  actor.mana += restored;

  log.push(actionEvent(`${actor.name} recovers ${restored} mana.`, "manaRegen", actor, actor, {
    sourceId: "baselineManaRegen",
    sourceType: "combatRule",
    amount: restored,
    actorMana: actor.mana,
    actorMaxMana: actor.maxMana,
    targetMana: actor.mana,
    targetMaxMana: actor.maxMana,
  }));
}

function dealStatusDamage(actor, status, label, log) {
  const amount = Math.max(1, status.amount ?? 1);
  actor.hp = Math.max(0, actor.hp - amount);
  log.push(actionEvent(`${actor.name} suffers ${amount} ${label} damage.`, label, actor, actor, {
    sourceId: status.id,
    sourceType: "status",
    statusId: status.id,
    amount,
    actorHp: actor.hp,
    actorMaxHp: actor.maxHp,
    targetHp: actor.hp,
    targetMaxHp: actor.maxHp,
  }));
}

function triggerSpellPassives(actor, log) {
  for (const item of actor.passives) {
    const trigger = item.passive?.onSpellCast;
    if (trigger && Math.random() < trigger.chance) {
      actor.mana = Math.min(actor.maxMana, actor.mana + trigger.restoreMana);
      log.push(event(`${item.name} restores ${trigger.restoreMana} mana.`));
    }
  }
}

function tickSetStatuses(actor) {
  actor.statuses = actor.statuses
    .map((status) => {
      if (!isSetDurationStatus(status) || status.duration === undefined) {
        return status;
      }

      return { ...status, duration: status.duration - 1 };
    })
    .filter((status) => status.duration === undefined || status.duration > 0);
}

function statusArmor(actor) {
  return actor.statuses.reduce((total, status) => total + (status.armor ?? 0) + (status.bonuses?.armor ?? 0), 0);
}

function statusDamageMultiplier(actor) {
  return actor.statuses.reduce((total, status) => total * (status.bonuses?.damageMultiplier ?? 1), 1);
}

function isFightOver(state) {
  return state.player.hp <= 0 || state.enemies.every((enemy) => enemy.hp <= 0);
}

function event(text, details = {}) {
  return { text, important: false, ...details };
}

function important(text, details = {}) {
  return { text, important: true, ...details };
}

function actionEvent(text, type, actor, target, details = {}) {
  return {
    text,
    type,
    important: false,
    actorId: actor.instanceId ?? actor.id,
    actorName: actor.name,
    actorHp: actor.hp,
    actorMaxHp: actor.maxHp,
    actorMana: actor.mana,
    actorMaxMana: actor.maxMana,
    actorShield: actor.shield,
    actorSpellShield: actor.spellShield,
    targetId: target ? target.instanceId ?? target.id : null,
    targetName: target?.name ?? null,
    targetHp: target?.hp,
    targetMaxHp: target?.maxHp,
    targetMana: target?.mana,
    targetMaxMana: target?.maxMana,
    targetShield: target?.shield,
    targetSpellShield: target?.spellShield,
    ...details,
  };
}
