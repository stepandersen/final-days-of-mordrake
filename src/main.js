import { runCombat } from "./core/combat.js";
import { createItemInstanceForRarity, createRewardChoices } from "./core/rewards.js";
import { getPlayerStatBlock } from "./core/formulas.js";
import { describeItemRules, getInventoryItem, getInventoryRef, resolveItem } from "./core/items.js";
import { selectPortraitAttribute } from "./core/portraits.js";
import { actionSlotRules, isActionSlotUnlocked, isPassiveSlotUnlocked, passiveSlotRules } from "./core/slots.js";
import { getStatusDefinition, getStatusLabel } from "./core/statuses.js";
import {
  getEncounterTargetRules,
  reconcileTargetPriority,
  targetingLabels,
} from "./core/targeting.js";
import { createCemeteryEncounter } from "./data/cemetery.js";
import { encounters } from "./data/monsters.js";
import { starterPlayer } from "./data/player.js";
import { rarityTable, rewardTemplates } from "./data/rewards.js";
import { storyScreens } from "./data/story.js";

const areaBackgrounds = {
  "Old Woods": "assets/backgrounds/old-woods-duel.png",
  "Ash Wastelands": "assets/backgrounds/ash-wastelands.png",
  "Haunted Forest": "assets/backgrounds/haunted-forest.png",
  "Volcanic Mountain": "assets/backgrounds/volcanic-mountain.png",
  "Evil Fortress": "assets/backgrounds/evil-fortress.png",
};

const playerPortraits = {
  strength: "assets/characters/adventurer-strength.png",
  agility: "assets/characters/adventurer-agility.png",
  intelligence: "assets/characters/adventurer-intelligence.png",
};

const encounterPortraits = {
  oldWoods01: "assets/opponents/old-woods-01-hungry-wolf.png",
  oldWoods02: "assets/opponents/old-woods-02-wolf-pair.png",
  oldWoods03: "assets/opponents/old-woods-03-forest-poacher.png",
  oldWoods04: "assets/opponents/old-woods-04-thornback-boar.png",
  oldWoods05: "assets/opponents/old-woods-05-old-tusker.png",
  oldWoods06: "assets/opponents/old-woods-06-venom-spider-pack.png",
  oldWoods07: "assets/opponents/old-woods-07-rootbinder-scout.png",
  oldWoods08: "assets/opponents/old-woods-08-briar-archer.png",
  oldWoods09: "assets/opponents/old-woods-09-briar-witch.png",
  oldWoods10: "assets/opponents/old-woods-10-briarheart-stag.png",
  oldWoods11: "assets/opponents/mordrake.png",
  ashWastelands01: "assets/opponents/ash-wastelands-01-ash-skitterers.png",
  ashWastelands02: "assets/opponents/ash-wastelands-02-cinder-hound.png",
  ashWastelands03: "assets/opponents/ash-wastelands-03-glassback-beetle.png",
  ashWastelands04: "assets/opponents/ash-wastelands-01-gate-guardians.png",
  ashWastelands05: "assets/opponents/ash-wastelands-05-cindermaw.png",
  ashWastelands06: "assets/opponents/ash-wastelands-06-ember-wraiths.png",
  ashWastelands07: "assets/opponents/ash-wastelands-07-scorched-pack.png",
  ashWastelands08: "assets/opponents/ash-wastelands-08-ash-burrower.png",
  ashWastelands09: "assets/opponents/ash-wastelands-09-pyre-shaman.png",
  ashWastelands10: "assets/opponents/ash-wastelands-10-cinder-colossus.png",
  ashWastelands11: "assets/opponents/ash-wastelands-11-mordrake-ash-warden.png",
};

const app = {
  player: structuredClone(starterPlayer),
  encounterIndex: 0,
  currentRewards: [],
  lastCombat: null,
  lastEncounter: null,
  combatView: null,
  visibleLog: [],
  narration: "Choose a plan and start the fight.",
  isPlaying: false,
  playbackToken: 0,
  combatVisual: null,
  portraitAttribute: "strength",
  activeStoryId: "opening",
  storyQueue: [],
  cemetery: {
    visits: 0,
    active: false,
    rematchIndex: null,
    wins: 0,
    winsNeeded: 0,
    currentEncounter: null,
  },
};

const elements = {
  areaBackdrop: document.querySelector("#area-backdrop"),
  runSummary: document.querySelector("#run-summary"),
  playerStats: document.querySelector("#player-stats"),
  playerLoadout: document.querySelector("#player-loadout"),
  playerName: document.querySelector("#player-name"),
  playerLevel: document.querySelector("#player-level"),
  playerHpBar: document.querySelector("#player-hp-bar"),
  playerHpText: document.querySelector("#player-hp-text"),
  playerManaBar: document.querySelector("#player-mana-bar"),
  playerManaText: document.querySelector("#player-mana-text"),
  playerStatuses: document.querySelector("#player-statuses"),
  playerPortrait: document.querySelector("#player-portrait"),
  playerPortraitImage: document.querySelector("#player-portrait-image"),
  combatFx: document.querySelector("#combat-fx"),
  enemyPortrait: document.querySelector("#enemy-portrait"),
  enemyPortraitImage: document.querySelector("#enemy-portrait-image"),
  enemyPortraitPlaceholder: document.querySelector("#enemy-portrait-placeholder"),
  enemyList: document.querySelector("#enemy-list"),
  targetPriority: document.querySelector("#target-priority"),
  startFight: document.querySelector("#start-fight"),
  resetRun: document.querySelector("#reset-run"),
  debugItems: document.querySelector("#debug-items"),
  debugMonsters: document.querySelector("#debug-monsters"),
  combatNarration: document.querySelector("#combat-narration"),
  combatLog: document.querySelector("#combat-log"),
  rewardPopover: document.querySelector("#reward-popover"),
  rewardList: document.querySelector("#reward-list"),
  debugItemsPopover: document.querySelector("#debug-items-popover"),
  debugItemList: document.querySelector("#debug-item-list"),
  debugItemStatus: document.querySelector("#debug-item-status"),
  debugMonstersPopover: document.querySelector("#debug-monsters-popover"),
  debugMonsterList: document.querySelector("#debug-monster-list"),
  storyOverlay: document.querySelector("#story-overlay"),
  storyEyebrow: document.querySelector("#story-eyebrow"),
  storyTitle: document.querySelector("#story-title"),
  storySubtitle: document.querySelector("#story-subtitle"),
  storyImage: document.querySelector("#story-image"),
  storyBody: document.querySelector("#story-body"),
  storyContinue: document.querySelector("#story-continue"),
};

elements.startFight.addEventListener("click", startFight);
elements.resetRun.addEventListener("click", resetRun);
elements.debugItems.addEventListener("click", openDebugItems);
elements.debugMonsters.addEventListener("click", openDebugMonsters);
elements.storyContinue.addEventListener("click", continueStory);
document.querySelectorAll("[data-close-debug]").forEach((button) => {
  button.addEventListener("click", closeDebugPopovers);
});
document.querySelectorAll(".debug-popover").forEach((popover) => {
  popover.addEventListener("click", (event) => {
    if (event.target === popover) closeDebugPopovers();
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDebugPopovers();
});

render();

async function startFight() {
  if (app.activeStoryId || app.isPlaying || app.currentRewards.length > 0) return;

  const encounter = currentEncounter();
  if (!encounter) return;

  const result = runCombat(app.player, encounter, app.player.targeting);
  const playbackToken = app.playbackToken + 1;

  app.playbackToken = playbackToken;
  app.combatVisual = null;
  app.isPlaying = true;
  app.lastCombat = null;
  app.lastEncounter = encounter;
  app.combatView = createCombatView(encounter);
  app.visibleLog = [];
  app.currentRewards = [];
  app.narration = `${encounter.name} begins.`;
  render();
  document.querySelector(".arena-panel")?.scrollIntoView({ block: "start", behavior: "smooth" });
  await wait(180);
  if (app.playbackToken !== playbackToken) return;

  await playCombatLog(result.log, playbackToken);
  if (app.playbackToken !== playbackToken) {
    return;
  }

  app.isPlaying = false;
  app.lastCombat = result;
  app.combatView = null;
  app.combatVisual = null;
  app.visibleLog = result.log;
  app.narration = result.victory ? "Victory." : "Defeat.";
  app.player.currentHp = result.player.hp;

  if (result.victory) {
    app.player.wins += 1;
    app.currentRewards = createRewardChoices(app.player);
    if (app.cemetery.active) {
      app.cemetery.wins += 1;
    } else {
      app.encounterIndex += 1;
    }
  } else {
    enterCemetery();
  }

  render();
}

function resetRun() {
  app.playbackToken += 1;
  closeDebugPopovers();
  app.player = structuredClone(starterPlayer);
  app.encounterIndex = 0;
  app.currentRewards = [];
  app.lastCombat = null;
  app.lastEncounter = null;
  app.combatView = null;
  app.combatVisual = null;
  app.visibleLog = [];
  app.narration = "Choose a plan and start the fight.";
  app.isPlaying = false;
  app.portraitAttribute = "strength";
  app.activeStoryId = "opening";
  app.storyQueue = [];
  app.cemetery = createEmptyCemeteryState();
  render();
}

function chooseReward(reward) {
  const completedEncounter = app.lastEncounter;
  reward.apply(app.player);
  const { derived } = getPlayerStatBlock(app.player);
  app.player.currentHp = Math.min(app.player.currentHp ?? derived.maxHp, derived.maxHp);
  app.currentRewards = [];
  app.lastCombat = null;
  app.lastEncounter = null;
  app.combatView = null;
  app.combatVisual = null;
  app.visibleLog = [];
  app.narration = "Choose a plan and start the fight.";
  if (completedEncounter?.cemetery) {
    continueCemeteryAfterReward();
  } else {
    queueStoryForCompletedEncounter(completedEncounter);
  }
  render();
}

function currentEncounter() {
  if (app.cemetery.active) {
    return app.cemetery.currentEncounter;
  }
  return encounters[app.encounterIndex] ?? null;
}

function render() {
  const statBlock = getPlayerStatBlock(app.player);
  const derived = statBlock.derived;
  const showResolvedCombat = app.isPlaying || app.currentRewards.length > 0;
  const encounter = showResolvedCombat
    ? app.lastEncounter
    : currentEncounter();
  const combatPlayer = app.combatView?.player ?? (showResolvedCombat ? app.lastCombat?.player : null);
  const playerHp = combatPlayer?.hp ?? Math.min(app.player.currentHp ?? derived.maxHp, derived.maxHp);
  const playerMana = combatPlayer?.mana ?? derived.maxMana;

  elements.runSummary.textContent = encounter
    ? `${encounter.area} - Fight ${encounter.fight} / ${getEncounterFightCount(encounter)}`
    : "Old Woods cleared";
  elements.startFight.disabled = app.isPlaying
    || Boolean(app.activeStoryId)
    || app.currentRewards.length > 0
    || !encounter
    || playerHp <= 0;
  elements.targetPriority.classList.toggle("disabled", app.isPlaying || Boolean(app.activeStoryId));
  elements.resetRun.disabled = app.isPlaying || Boolean(app.activeStoryId);
  elements.debugItems.disabled = app.isPlaying || Boolean(app.activeStoryId);
  elements.debugMonsters.disabled = app.isPlaying || Boolean(app.activeStoryId);
  elements.combatNarration.textContent = app.narration;
  elements.combatNarration.classList.toggle("playing", app.isPlaying);
  elements.playerStatuses.innerHTML = renderStatusChips(combatPlayer?.statuses ?? []);
  elements.playerPortrait.closest(".combatant").classList.toggle("pulse", app.combatVisual?.pulseIds?.includes("player") ?? false);
  elements.playerName.textContent = app.player.name;
  elements.playerLevel.textContent = statBlock.level;
  renderPlayerPortrait(statBlock.effectiveStats);
  elements.playerHpBar.style.width = `${percent(playerHp, derived.maxHp)}%`;
  elements.playerHpText.textContent = `${playerHp} / ${derived.maxHp} HP`;
  elements.playerManaBar.style.width = `${percent(playerMana, derived.maxMana)}%`;
  elements.playerManaText.textContent = `${playerMana} / ${derived.maxMana} Mana`;

  renderAreaBackdrop(encounter);
  renderStats(statBlock);
  renderLoadout();
  renderEncounter(encounter);
  renderTargeting();
  renderLog();
  renderRewards();
  renderStoryOverlay();
}

function showStory(id) {
  if (!storyScreens[id]) return;

  app.activeStoryId = id;
  render();
}

function queueStory(id) {
  if (!storyScreens[id]) return;
  app.storyQueue.push(id);

  if (!app.activeStoryId) {
    app.activeStoryId = app.storyQueue.shift();
    render();
  }
}

function queueStoryForCompletedEncounter(encounter) {
  if (encounter?.id === "oldWoods11") {
    showStory("oldWoodsMordrakeEscape");
  } else if (encounter?.id === "ashWastelands11") {
    showStory("ashWastelandsMordrakeEscape");
  }
}

function enterCemetery() {
  const { derived } = getPlayerStatBlock(app.player);
  const rematchIndex = app.cemetery.active
    ? app.cemetery.rematchIndex
    : app.encounterIndex;

  app.cemetery.visits += 1;
  app.cemetery.active = true;
  app.cemetery.rematchIndex = rematchIndex;
  app.cemetery.wins = 0;
  app.cemetery.winsNeeded = app.cemetery.visits;
  app.cemetery.currentEncounter = createCemeteryEncounter({
    rematchIndex,
    visit: app.cemetery.visits,
    step: 1,
  });
  app.lastCombat = null;
  app.lastEncounter = null;
  app.visibleLog = [];
  app.player.currentHp = Math.max(1, Math.floor(derived.maxHp * 0.5));
  app.narration = `Death opens the cemetery. Win ${app.cemetery.winsNeeded} fight${app.cemetery.winsNeeded === 1 ? "" : "s"} to return.`;
}

function continueCemeteryAfterReward() {
  if (!app.cemetery.active) return;

  if (app.cemetery.wins >= app.cemetery.winsNeeded) {
    const rematchIndex = app.cemetery.rematchIndex;
    app.cemetery.active = false;
    app.cemetery.rematchIndex = null;
    app.cemetery.wins = 0;
    app.cemetery.winsNeeded = 0;
    app.cemetery.currentEncounter = null;
    app.encounterIndex = rematchIndex;
    app.narration = "You claw your way back to the chase.";
    return;
  }

  app.cemetery.currentEncounter = createCemeteryEncounter({
    rematchIndex: app.cemetery.rematchIndex,
    visit: app.cemetery.visits,
    step: app.cemetery.wins + 1,
  });
  app.narration = `The cemetery holds you. ${app.cemetery.winsNeeded - app.cemetery.wins} fight${app.cemetery.winsNeeded - app.cemetery.wins === 1 ? "" : "s"} remain.`;
}

function createEmptyCemeteryState() {
  return {
    visits: 0,
    active: false,
    rematchIndex: null,
    wins: 0,
    winsNeeded: 0,
    currentEncounter: null,
  };
}

function continueStory() {
  if (!app.activeStoryId || elements.storyOverlay.classList.contains("leaving")) return;

  elements.storyOverlay.classList.add("leaving");
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.setTimeout(() => {
    app.activeStoryId = app.storyQueue.shift() ?? null;
    elements.storyOverlay.classList.remove("leaving");
    render();
  }, 220);
}

function renderStoryOverlay() {
  const story = storyScreens[app.activeStoryId];
  document.body.classList.toggle("story-active", Boolean(story));

  if (!story) {
    elements.storyOverlay.hidden = true;
    elements.storyOverlay.classList.remove("visible");
    return;
  }

  elements.storyOverlay.hidden = false;
  elements.storyOverlay.classList.toggle("visible", !elements.storyOverlay.classList.contains("leaving"));
  elements.storyEyebrow.textContent = story.eyebrow ?? "";
  elements.storyTitle.textContent = story.title;
  elements.storySubtitle.textContent = story.subtitle ?? "";
  elements.storyImage.setAttribute("aria-label", story.imageLabel ?? story.title);
  elements.storyImage.className = story.image ? "story-image" : "story-image-placeholder";
  elements.storyImage.innerHTML = story.image
    ? `<img src="${story.image}" alt="${story.imageLabel ?? story.title}">`
    : story.imageLabel ?? "Story image";
  elements.storyBody.innerHTML = story.body.map((line) => `<p>${line}</p>`).join("");
  elements.storyContinue.textContent = story.cta ?? "Continue";
}

function renderPlayerPortrait(effectiveStats) {
  app.portraitAttribute = selectPortraitAttribute(effectiveStats, app.portraitAttribute);

  elements.playerPortraitImage.src = playerPortraits[app.portraitAttribute];
  elements.playerPortraitImage.alt = `${capitalize(app.portraitAttribute)}-focused ${app.player.name}`;
}

function renderAreaBackdrop(encounter) {
  const area = encounter?.area ?? encounters[Math.max(0, Math.min(app.encounterIndex, encounters.length) - 1)]?.area ?? "Old Woods";
  const background = areaBackgrounds[area] ?? areaBackgrounds["Old Woods"];
  elements.areaBackdrop.style.backgroundImage = `url("${background}")`;
}

function renderStats(statBlock) {
  const rows = [
    ["Strength", statBlock.coreStats.strength, statBlock.bonuses.strength],
    ["Intelligence", statBlock.coreStats.intelligence, statBlock.bonuses.intelligence],
    ["Agility", statBlock.coreStats.agility, statBlock.bonuses.agility],
    ["Spell Power", statBlock.coreDerived.spellPower, statBlock.derived.spellPower - statBlock.coreDerived.spellPower],
    ["Armor", 0, statBlock.bonuses.armor],
  ];

  elements.playerStats.innerHTML = rows
    .map(([label, value, bonus]) => `
      <div class="stat">
        <span class="muted">${label}</span>
        <strong>${value}${renderBonus(bonus)}</strong>
      </div>
    `)
    .join("");
}

function renderLoadout() {
  elements.playerLoadout.innerHTML = `
    <div class="loadout-row loadout-actions">
      <div class="loadout-slot">
        <h3>Engage</h3>
        ${renderSlotCycler("engage", 0, app.player.engage, "engage", true)}
        ${renderItemCard(resolveItem(app.player, app.player.engage))}
      </div>
      ${actionSlotRules
        .map(({ index, unlockLevel }) => {
          const id = app.player.actions[index];
          const unlocked = isActionSlotUnlocked(app.player, index);
          return `
          <div class="loadout-slot">
            <h3>Action ${index + 1}${unlocked ? "" : ` - Level ${unlockLevel}`}</h3>
            ${renderSlotCycler("action", index, id, "action", unlocked)}
            ${renderItemCard(resolveItem(app.player, id), unlocked)}
          </div>
        `;
        })
        .join("")}
    </div>
    <div class="loadout-row loadout-passives">
      ${passiveSlotRules
        .map(({ index, unlockLevel }) => {
          const id = app.player.passives[index];
          const unlocked = isPassiveSlotUnlocked(app.player, index);
          return `
          <div class="loadout-slot">
            <h3>Passive ${index + 1}${unlocked ? "" : ` - Level ${unlockLevel}`}</h3>
            ${renderSlotCycler("passive", index, id, "passive", unlocked)}
            ${renderItemCard(resolveItem(app.player, id), unlocked)}
          </div>
        `;
        })
        .join("")}
    </div>
  `;

  elements.playerLoadout.querySelectorAll("[data-slot-type]").forEach((button) => {
    button.addEventListener("click", () => cycleLoadoutSlot(button));
  });
}

function renderItemCard(item, unlocked = true) {
  const rules = describeItemRules(item);
  return `
    <article class="card ${unlocked ? "" : "locked"}">
      <div class="item-card-header">
        ${renderIcon(item.icon, item.name, "item-icon")}
        <div>
          <h3 class="${rarityClass(item.rarity)}">${item.name}</h3>
          <p class="meta">${item.type}${unlocked ? "" : " - locked"}</p>
        </div>
      </div>
      <div class="rule-list">
        ${rules.map((rule) => `<p class="meta">${rule}</p>`).join("")}
      </div>
    </article>
  `;
}

function renderSlotCycler(slotType, index, selectedId, itemType, unlocked) {
  const options = inventoryOptions(itemType, selectedId, slotType, index);
  const enabledOptions = options.filter((option) => !option.disabled || option.id === selectedId);
  const selected = options.find((option) => option.id === selectedId) ?? options[0];
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === selected?.id));
  return `
    <button
      type="button"
      class="slot-cycler"
      data-slot-type="${slotType}"
      data-slot-index="${index}"
      ${app.isPlaying || !unlocked || enabledOptions.length <= 1 ? "disabled" : ""}
    >
      <span class="slot-cycler-main">
        ${renderIcon(selected?.icon, selected?.label ?? "Empty", "slot-icon")}
        <span class="${rarityClass(selected?.rarity)}">${selected?.label ?? "Empty"}</span>
      </span>
      <span class="slot-count">${options.length > 0 ? `${selectedIndex + 1}/${options.length}` : ""}</span>
    </button>
  `;
}

function inventoryOptions(itemType, selectedId, slotType, slotIndex) {
  const entries = app.player.inventory.filter((entry) => getInventoryItem(entry).type === itemType);
  const refs = entries.map(getInventoryRef);
  return [...new Set(refs)].map((id) => {
    const item = resolveItem(app.player, id);
    const selectedCount = countEquipped(id, slotType, slotIndex);
    const ownedCount = refs.filter((ownedId) => ownedId === id).length;
    const remaining = ownedCount - selectedCount;
    const blockedByShieldLimit = id !== selectedId && isShieldItem(item) && hasEquippedShield(slotType, slotIndex);
    const suffix = ownedCount > 1 ? ` (${remaining} free)` : "";

    return {
      id,
      label: `${item.name}${suffix}`,
      rarity: item.rarity,
      icon: item.icon,
      disabled: id !== selectedId && (remaining <= 0 || blockedByShieldLimit),
    };
  });
}

function isShieldItem(item) {
  return item.category === "shield";
}

function hasEquippedShield(slotType, slotIndex) {
  return app.player.actions.some((actionId, index) => (
    (slotType !== "action" || slotIndex !== index)
    && isActionSlotUnlocked(app.player, index)
    && isShieldItem(resolveItem(app.player, actionId))
  ));
}

function countEquipped(id, slotType, slotIndex) {
  let count = 0;
  if (slotType !== "engage" || slotIndex !== 0) {
    count += app.player.engage === id ? 1 : 0;
  }

  app.player.actions.forEach((actionId, index) => {
    if ((slotType !== "action" || slotIndex !== index) && isActionSlotUnlocked(app.player, index) && actionId === id) count += 1;
  });

  app.player.passives.forEach((passiveId, index) => {
    if ((slotType !== "passive" || slotIndex !== index) && isPassiveSlotUnlocked(app.player, index) && passiveId === id) count += 1;
  });

  return count;
}

function cycleLoadoutSlot(button) {
  const slotType = button.dataset.slotType;
  const index = Number(button.dataset.slotIndex);
  const selectedId = getSelectedSlotRef(slotType, index);
  const itemType = slotType === "engage" ? "engage" : slotType === "action" ? "action" : "passive";
  const options = inventoryOptions(itemType, selectedId, slotType, index).filter((option) => !option.disabled || option.id === selectedId);
  if (options.length <= 1) return;

  const selectedIndex = options.findIndex((option) => option.id === selectedId);
  const next = options[(selectedIndex + 1) % options.length];
  updateLoadoutSlot(slotType, index, next.id);
}

function getSelectedSlotRef(slotType, index) {
  if (slotType === "engage") return app.player.engage;
  if (slotType === "action") return app.player.actions[index];
  return app.player.passives[index];
}

function updateLoadoutSlot(slotType, index, id) {

  if (slotType === "engage") {
    app.player.engage = id;
  } else if (slotType === "action") {
    app.player.actions[index] = id;
  } else if (slotType === "passive") {
    app.player.passives[index] = id;
  }

  app.lastCombat = null;
  render();
}

function renderEncounter(encounter) {
  renderOpponentPortrait(encounter);
  renderCombatFx();

  if (!encounter) {
    elements.enemyList.innerHTML = "";
    return;
  }

  const enemies = app.combatView?.enemies ?? app.lastCombat?.enemies ?? encounter.monsters.map((monster) => ({
    ...monster,
    instanceId: monster.instanceId ?? monster.id,
    maxHp: monster.hp,
  }));

  elements.enemyList.innerHTML = enemies
    .map((enemy) => {
      const hp = Math.max(0, enemy.hp);
      const pulse = app.combatVisual?.pulseIds?.includes(enemy.instanceId) || app.combatVisual?.pulseIds?.includes(enemy.id);
      return `
        <article class="card enemy-card ${hp <= 0 ? "defeated" : ""} ${pulse ? "pulse" : ""}">
          <h3>${enemy.name}</h3>
          <p class="meta">${enemy.role}</p>
          ${renderStatusRow(enemy.statuses)}
          <div class="bar"><span style="width: ${percent(hp, enemy.maxHp)}%"></span></div>
          <p class="meta">${enemy.fled ? "Fled" : `${hp} / ${enemy.maxHp} HP`}</p>
        </article>
      `;
    })
    .join("");
}

function renderCombatFx() {
  const visual = app.combatVisual;
  if (!visual) {
    elements.combatFx.innerHTML = "";
    return;
  }

  const action = visual.action
    ? `
      <div
        class="action-fx ${visual.action.mode}"
        style="--fx-x: ${visual.action.x}; --fx-y: ${visual.action.y}; --fx-end-x: ${visual.action.endX}; --fx-end-y: ${visual.action.endY};"
        title="${visual.action.label}"
      >
        ${visual.action.icon
          ? `<img src="${visual.action.icon}" alt="">`
          : `<span class="action-fx-symbol">${visual.action.symbol}</span>`}
      </div>
    `
    : "";
  const result = visual.result
    ? `
      <div
        class="result-fx ${visual.result.kind}"
        style="--result-x: ${visual.result.x}; --result-y: ${visual.result.y};"
      >
        ${visual.result.icon ? `<span aria-hidden="true">${visual.result.icon}</span>` : ""}
        <span>${visual.result.text}</span>
      </div>
    `
    : "";

  elements.combatFx.innerHTML = `${action}${result}`;
}

function renderOpponentPortrait(encounter) {
  const portrait = encounterPortraits[encounter?.id];
  elements.enemyPortraitImage.hidden = !portrait;
  elements.enemyPortraitPlaceholder.hidden = Boolean(portrait);

  if (!portrait) {
    elements.enemyPortraitImage.removeAttribute("src");
    elements.enemyPortraitImage.alt = "";
    return;
  }

  elements.enemyPortraitImage.src = portrait;
  elements.enemyPortraitImage.alt = encounter.name;
}

function renderTargeting() {
  const encounter = currentEncounter();
  const targetRules = getEncounterTargetRules(encounter);
  app.player.targeting = reconcileTargetPriority(
    app.player.targeting,
    targetRules,
    app.player.unlockedTargeting,
  );

  const labels = new Map(targetRules.map((rule) => [rule.id, rule]));
  elements.targetPriority.innerHTML = app.player.targeting
    .map((rule, index) => {
      const modeId = rule.startsWith("mode:") ? rule.slice("mode:".length) : rule;
      const target = labels.get(rule);
      const label = target?.label ?? targetingLabels[modeId] ?? rule;
      const separator = index < app.player.targeting.length - 1
        ? '<span class="priority-arrow" aria-hidden="true">&gt;</span>'
        : "";
      return `
        <button
          type="button"
          class="priority-chip ${modeId !== "closest" ? "conditional" : ""}"
          data-priority-index="${index}"
          title="${index === 0 ? "Move to the end" : "Move one step forward"}"
          ${app.isPlaying || app.activeStoryId ? "disabled" : ""}
        >
          ${label}
        </button>
        ${separator}
      `;
    })
    .join("");

  elements.targetPriority.querySelectorAll("[data-priority-index]").forEach((button) => {
    button.addEventListener("click", () => movePriorityRule(Number(button.dataset.priorityIndex)));
  });
}

function movePriorityRule(index) {
  if (app.isPlaying || app.activeStoryId || app.player.targeting.length < 2) return;

  const next = [...app.player.targeting];
  if (index === 0) {
    next.push(next.shift());
  } else {
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
  }
  app.player.targeting = next;
  renderTargeting();
}

function renderLog() {
  const log = app.visibleLog.length > 0 ? app.visibleLog : app.lastCombat?.log;

  if (!log) {
    elements.combatLog.innerHTML = '<p class="log-entry important">Choose a priority and start the first fight.</p>';
    return;
  }

  elements.combatLog.innerHTML = log
    .filter(shouldDisplayEvent)
    .map((entry) => `<p class="log-entry ${entry.important ? "important" : ""}">${entry.text}</p>`)
    .join("");
}

function renderRewards() {
  if (app.currentRewards.length === 0) {
    elements.rewardPopover.hidden = true;
    elements.rewardList.innerHTML = "";
    return;
  }

  elements.rewardPopover.hidden = false;
  elements.rewardList.innerHTML = "";
  for (const reward of app.currentRewards) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reward-button";
    button.innerHTML = `
      <article class="card">
        <div class="item-card-header">
            ${renderIcon(reward.icon, reward.name, "item-icon")}
          <div>
            <h3 class="${rarityClass(reward.rarity)}">${reward.name}</h3>
            <p class="meta">${reward.slotLabel ?? capitalize(reward.lane)}</p>
          </div>
        </div>
        <div class="reward-rules">
          ${normalizeRewardDescription(reward.description)
            .map((rule) => `<p class="meta">${rule}</p>`)
            .join("")}
        </div>
      </article>
    `;
    button.addEventListener("click", () => chooseReward(reward));
    elements.rewardList.append(button);
  }
}

function normalizeRewardDescription(description) {
  if (Array.isArray(description)) return description;
  return String(description).split(" | ");
}

function openDebugItems() {
  if (app.isPlaying) return;

  closeDebugPopovers();
  elements.debugItemStatus.textContent = "";
  renderDebugItems();
  elements.debugItemsPopover.hidden = false;
}

function renderDebugItems() {
  const templates = rewardTemplates.filter((template) => template.kind === "item");
  elements.debugItemList.innerHTML = `
    <div class="debug-item-header" aria-hidden="true">
      <span>Reward</span>
      ${rarityTable.map((rarity) => `<span class="${rarityClass(rarity.id)}">${rarity.name}</span>`).join("")}
    </div>
    ${templates.map((template) => renderDebugItemRow(template)).join("")}
  `;

  elements.debugItemList.querySelectorAll("[data-debug-template]").forEach((button) => {
    button.addEventListener("click", () => {
      addDebugItem(button.dataset.debugTemplate, button.dataset.debugRarity, button.dataset.debugLane);
    });
  });
}

function renderDebugItemRow(template) {
  const base = createItemInstanceForRarity(template.templateId, "common", template.lane).item;
  return `
    <div class="debug-item-row">
      <div class="debug-item-name">
        ${renderIcon(base.icon, base.name, "item-icon")}
        <div>
          <strong>${base.name}</strong>
          <span class="meta">${capitalize(base.type)} / ${capitalize(template.lane)}</span>
        </div>
      </div>
      ${rarityTable.map((rarity) => renderDebugRarityItem(template, rarity)).join("")}
    </div>
  `;
}

function renderDebugRarityItem(template, rarity) {
  const item = createItemInstanceForRarity(template.templateId, rarity.id, template.lane).item;
  return `
    <button
      type="button"
      class="debug-reward"
      data-debug-template="${template.templateId}"
      data-debug-rarity="${rarity.id}"
      data-debug-lane="${template.lane}"
    >
      <strong class="${rarityClass(rarity.id)}">${item.name}</strong>
      <span class="debug-rule-list">
        ${item.rules.map((rule) => `<span>${rule}</span>`).join("")}
      </span>
    </button>
  `;
}

function addDebugItem(templateId, rarityId, lane) {
  const instance = createItemInstanceForRarity(templateId, rarityId, lane);
  app.player.inventory.push(instance);
  render();
  elements.debugItemStatus.textContent = `Added ${instance.item.name} (${capitalize(rarityId)}).`;
}

function openDebugMonsters() {
  if (app.isPlaying) return;

  closeDebugPopovers();
  renderDebugMonsters();
  elements.debugMonstersPopover.hidden = false;
}

function renderDebugMonsters() {
  elements.debugMonsterList.innerHTML = encounters
    .map((encounter, index) => `
      <button type="button" class="debug-encounter" data-debug-encounter="${index}">
        <span>${encounter.area} - Fight ${encounter.fight} / ${getAreaFightCount(encounter.area)}</span>
        <strong>${encounter.name}</strong>
        <span class="meta">${encounter.monsters.map((monster) => monster.name).join(", ")}</span>
      </button>
    `)
    .join("");

  elements.debugMonsterList.querySelectorAll("[data-debug-encounter]").forEach((button) => {
    button.addEventListener("click", () => selectDebugEncounter(Number(button.dataset.debugEncounter)));
  });
}

function selectDebugEncounter(index) {
  app.playbackToken += 1;
  app.encounterIndex = index;
  app.player.wins = index;
  app.cemetery = createEmptyCemeteryState();
  app.currentRewards = [];
  app.lastCombat = null;
  app.lastEncounter = null;
  app.combatView = null;
  app.combatVisual = null;
  app.visibleLog = [];
  app.narration = "Choose a plan and start the fight.";
  app.isPlaying = false;
  const { derived } = getPlayerStatBlock(app.player);
  app.player.currentHp = derived.maxHp;
  closeDebugPopovers();
  render();
}

function closeDebugPopovers() {
  elements.debugItemsPopover.hidden = true;
  elements.debugMonstersPopover.hidden = true;
}

async function playCombatLog(log, playbackToken) {
  for (const entry of log) {
    if (app.playbackToken !== playbackToken) return;
    if (!shouldDisplayEvent(entry)) {
      applyEventToCombatView(entry);
      continue;
    }

    app.visibleLog = [entry, ...app.visibleLog];
    app.narration = entry.text;
    elements.combatNarration.textContent = app.narration;
    renderLog();
    flash(elements.combatNarration, "flash");

    await playCombatEvent(entry, playbackDelay(entry), playbackToken);
  }

  app.combatVisual = null;
  renderCombatView();
}

async function playCombatEvent(entry, delay, playbackToken) {
  const visual = createCombatVisual(entry);
  if (!visual) {
    applyEventToCombatView(entry);
    renderCombatView();
    await wait(delay);
    return;
  }

  app.combatVisual = { action: visual.action, result: null, pulseIds: [] };
  renderCombatView();

  const windup = Math.min(460, Math.max(220, Math.round(delay * 0.38)));
  await wait(windup);
  if (app.playbackToken !== playbackToken) return;

  applyEventToCombatView(entry);
  app.combatVisual = {
    action: visual.action,
    result: visual.result,
    pulseIds: visual.pulseIds,
  };
  renderCombatView();

  await wait(Math.max(180, delay - windup));
  if (app.playbackToken !== playbackToken) return;

  app.combatVisual = null;
  renderCombatView();
}

function flash(element, className) {
  element.classList.remove(className);
  requestAnimationFrame(() => {
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), 300);
  });
}

function playbackDelay(entry) {
  if (entry.important) return 1300;
  if (["damage", "heal", "lifeSteal", "recovery", "summon", "doubleStrike", "poison", "bleed", "miss", "enemyEngage", "engageReplay", "skip", "regen", "manaRegen", "defense", "block", "blockFail", "defenseExpire"].includes(entry.type)) return 1200;
  return 950;
}

function createCombatVisual(entry) {
  if (entry.important || ["round", "spent", "hold"].includes(entry.type)) return null;

  const actorSide = entry.actorId === "player" ? "player" : "enemy";
  const targetSide = entry.targetId === "player" ? "player" : entry.targetId ? "enemy" : actorSide;
  const isSelf = entry.targetId && entry.targetId === entry.actorId;
  const isTravel = Boolean(entry.targetId) && !isSelf && ["damage", "miss", "block", "blockFail", "defenseExpire", "status", "statusMiss"].includes(entry.type);
  const action = createActionFx(entry, actorSide, isTravel ? targetSide : actorSide, isTravel);
  const result = createResultFx(entry, isTravel ? targetSide : targetSide);
  const pulseIds = result ? impactedIds(entry) : [];

  if (!action && !result) return null;
  return { action, result, pulseIds };
}

function createActionFx(entry, actorSide, targetSide, travel) {
  const source = sourceVisual(entry);
  if (!source) return null;

  const actorAnchor = combatAnchor(actorSide, "fx");
  const targetAnchor = combatAnchor(targetSide, "fx");

  return {
    ...source,
    x: actorAnchor.x,
    y: actorAnchor.y,
    endX: travel ? targetAnchor.x : actorAnchor.x,
    endY: travel ? targetAnchor.y : actorAnchor.y,
    mode: travel ? "travel" : "self",
  };
}

function createResultFx(entry, side) {
  const anchor = combatAnchor(side, "result");

  if (entry.type === "damage") {
    return {
      kind: entry.amount === 0 ? "immune" : "damage",
      text: entry.amount === 0 ? "Immune" : `-${entry.amount}`,
      icon: entry.critical ? "CRIT" : "",
      ...anchor,
    };
  }

  if (["heal", "lifeSteal", "recovery", "regen"].includes(entry.type)) {
    return { kind: entry.type, text: `+${entry.amount ?? 0}`, icon: "", ...anchor };
  }

  if (entry.type === "block") return { kind: "block", text: "Blocked", icon: "", ...anchor };
  if (entry.type === "blockFail") return { kind: "blockFail", text: "Block failed", icon: "", ...anchor };
  if (entry.type === "defenseExpire") return { kind: "defenseExpire", text: "Faded", icon: "", ...anchor };
  if (entry.type === "miss") return { kind: "miss", text: "Miss", icon: "", ...anchor };
  if (entry.type === "statusMiss") return { kind: "statusMiss", text: "Resisted", icon: "", ...anchor };
  if (entry.type === "status") return { kind: "status", text: getStatusLabel(entry.statusId), icon: "", ...anchor };
  if (entry.type === "defense") return { kind: "block", text: getStatusLabel(entry.statusId), icon: "", ...anchor };
  if (entry.type === "buff") return { kind: "buff", text: "Buff", icon: "", ...anchor };
  if (entry.type === "summon") return { kind: "summon", text: "Summon", icon: "", ...anchor };
  if (entry.type === "skip") return { kind: "miss", text: "Stunned", icon: "", ...anchor };
  if (entry.type === "noMana") return { kind: "noMana", text: "No mana", icon: "", ...anchor };
  if (entry.type === "flee") return { kind: "miss", text: "Flee", icon: "", ...anchor };

  return null;
}

function combatAnchor(side, kind) {
  return {
    x: `var(--${side}-${kind}-x)`,
    y: `var(--${side}-${kind}-y)`,
  };
}

function sourceVisual(entry) {
  const item = entry.sourceId ? getItemBySource(entry.sourceId) : null;
  if (item?.icon) {
    return {
      icon: item.icon,
      label: item.name,
      symbol: "",
    };
  }

  const label = entry.sourceId && entry.sourceId !== "baselineManaRegen"
    ? String(entry.sourceId)
    : entry.type;

  return {
    icon: "",
    label,
    symbol: actionSymbol(entry),
  };
}

function actionSymbol(entry) {
  if (["block", "blockFail", "defense", "defenseExpire"].includes(entry.type)) return "DEF";
  if (["heal", "lifeSteal", "recovery", "regen"].includes(entry.type)) return "HP";
  if (["status", "statusMiss", "skip"].includes(entry.type)) return "FX";
  if (entry.type === "summon") return "SUM";
  if (entry.type === "flee") return "RUN";
  if (entry.damageType === "spell" || entry.sourceType === "monsterAction") return "ACT";
  return "HIT";
}

function getItemBySource(sourceId) {
  try {
    return resolveItem(app.player, sourceId);
  } catch {
    return null;
  }
}

function impactedIds(entry) {
  return [entry.targetId, entry.actorId].filter(Boolean);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldDisplayEvent(entry) {
  return !["round", "spent", "hold"].includes(entry.type);
}

function createCombatView(encounter) {
  const { derived } = getPlayerStatBlock(app.player);
  const currentHp = Math.max(0, Math.min(app.player.currentHp ?? derived.maxHp, derived.maxHp));

  return {
    player: {
      id: "player",
      name: app.player.name,
      hp: currentHp,
      maxHp: derived.maxHp,
      mana: derived.maxMana,
      maxMana: derived.maxMana,
      shield: 0,
      spellShield: 0,
      statuses: [],
    },
    enemies: encounter.monsters.map((monster, index) => ({
      ...monster,
      instanceId: `${monster.id}-${index}`,
      maxHp: monster.hp,
      shield: 0,
      spellShield: monster.spellShield ?? 0,
      statuses: [],
    })),
  };
}

function applyEventToCombatView(entry) {
  if (!app.combatView) return;

  updateCombatViewActor(entry.actorId, {
    hp: entry.actorHp,
    maxHp: entry.actorMaxHp,
    mana: entry.actorMana,
    maxMana: entry.actorMaxMana,
    shield: entry.actorShield,
    spellShield: entry.actorSpellShield,
    statuses: entry.actorStatuses,
    fled: entry.actorFled,
  });

  updateCombatViewActor(entry.targetId, {
    hp: entry.targetHp,
    maxHp: entry.targetMaxHp,
    mana: entry.targetMana,
    maxMana: entry.targetMaxMana,
    shield: entry.targetShield,
    spellShield: entry.targetSpellShield,
    statuses: entry.targetStatuses,
    fled: entry.targetFled,
  });

  if (entry.summonInstanceId && !app.combatView.enemies.some((enemy) => enemy.instanceId === entry.summonInstanceId)) {
    app.combatView.enemies.push({
      id: entry.summonId,
      instanceId: entry.summonInstanceId,
      name: entry.summonName ?? "Summoned Enemy",
      role: entry.summonRole ?? "summon",
      hp: entry.summonHp ?? 1,
      maxHp: entry.summonMaxHp ?? 1,
      statuses: [],
    });
  }
}

function getEncounterFightCount(encounter) {
  return encounter.fightTotal ?? getAreaFightCount(encounter.area);
}

function getAreaFightCount(area) {
  return encounters.filter((encounter) => encounter.area === area).length;
}

function updateCombatViewActor(id, values) {
  if (!id) return;

  const actor = id === "player"
    ? app.combatView.player
    : app.combatView.enemies.find((enemy) => enemy.instanceId === id || enemy.id === id);

  if (!actor) return;

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      actor[key] = value;
    }
  }
}

function renderCombatView() {
  const { derived } = getPlayerStatBlock(app.player);
  const player = app.combatView?.player;
  const encounter = app.lastEncounter ?? currentEncounter();

  if (player) {
    elements.playerHpBar.style.width = `${percent(player.hp, player.maxHp ?? derived.maxHp)}%`;
    elements.playerHpText.textContent = `${player.hp} / ${player.maxHp ?? derived.maxHp} HP`;
    elements.playerManaBar.style.width = `${percent(player.mana, player.maxMana ?? derived.maxMana)}%`;
    elements.playerManaText.textContent = `${player.mana} / ${player.maxMana ?? derived.maxMana} Mana`;
    elements.playerStatuses.innerHTML = renderStatusChips(player.statuses ?? []);
    elements.playerPortrait.closest(".combatant").classList.toggle("pulse", app.combatVisual?.pulseIds?.includes("player") ?? false);
  }

  renderEncounter(encounter);
}

function renderStatusRow(statuses = []) {
  return `<div class="status-row">${renderStatusChips(statuses)}</div>`;
}

function renderStatusChips(statuses = []) {
  if (!statuses.length) return "";

  return statuses
    .map((status) => {
      const definition = getStatusDefinition(status.id);
      const label = getStatusLabel(status.id);
      const amount = status.amount ? ` ${status.amount}` : "";
      const duration = status.duration !== undefined ? `<span class="status-duration">${status.duration}</span>` : "";
      const category = statusCategoryClass(status, definition.category);
      return `<span class="status-chip ${category}" title="${label}">${statusSymbol(status.id)}${amount}${duration}</span>`;
    })
    .join("");
}

function statusCategoryClass(status, category) {
  if (status.hpRegen || status.manaRegen || status.bonuses) return "buff";
  return category ?? "buff";
}

function statusSymbol(id) {
  const symbols = {
    poisoned: "POI",
    bleeding: "BLD",
    stunned: "STN",
    rooted: "ROOT",
    vulnerable: "VUL",
    healingBlocked: "NOHP",
    hidden: "HID",
    defender: "BLK",
    ward: "WRD",
    kindledCore: "CORE",
    ashenRenewal: "REN",
    desperateRenewal: "REN",
  };
  return symbols[id] ?? getStatusLabel(id).slice(0, 4).toUpperCase();
}

function percent(value, max) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function renderBonus(value) {
  if (!value) return "";
  const sign = value > 0 ? "+" : "";
  return ` <span class="stat-bonus">${sign}${value}</span>`;
}

function capitalize(value) {
  return value.replace(/^\w/, (letter) => letter.toUpperCase());
}

function rarityClass(rarity = "common") {
  return `rarity-${rarity}`;
}

function renderIcon(icon, label, className) {
  if (!icon) return "";
  return `<img class="${className}" src="${icon}" alt="${label}" loading="lazy">`;
}
