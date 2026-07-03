export const rewardLanes = ["strength", "agility", "intelligence", "utility"];

export const rarityTable = [
  { id: "common", name: "Common", quality: 0, weight: 55 },
  { id: "uncommon", name: "Uncommon", quality: 1, weight: 30 },
  { id: "rare", name: "Rare", quality: 2, weight: 12 },
  { id: "epic", name: "Epic", quality: 3, weight: 3 },
];

export const rewardTemplates = [
  { id: "strengthTraining", lane: "strength", kind: "training", stat: "strength", costStat: "intelligence", name: "Strength Training" },
  { id: "agilityTraining", lane: "agility", kind: "training", stat: "agility", costStat: "strength", name: "Agility Training" },
  { id: "intelligenceTraining", lane: "intelligence", kind: "training", stat: "intelligence", costStat: "agility", name: "Intelligence Training" },

  { id: "ironSwordReward", lane: "strength", kind: "item", templateId: "ironSword" },
  { id: "battleAxeReward", lane: "strength", kind: "item", templateId: "battleAxe" },
  { id: "greatswordReward", lane: "strength", kind: "item", templateId: "greatsword" },
  { id: "batteredShieldReward", lane: "strength", kind: "item", templateId: "batteredShield" },
  { id: "battleCryReward", lane: "strength", kind: "item", templateId: "battleCry" },
  { id: "ironheartEmblemReward", lane: "strength", kind: "item", templateId: "ironheartEmblem" },

  { id: "quickDaggerReward", lane: "agility", kind: "item", templateId: "quickDagger" },
  { id: "venomDaggerReward", lane: "agility", kind: "item", templateId: "venomDagger" },
  { id: "serratedKnifeReward", lane: "agility", kind: "item", templateId: "serratedKnife" },
  { id: "sapReward", lane: "agility", kind: "item", templateId: "sap" },
  { id: "smokeVanishReward", lane: "agility", kind: "item", templateId: "smokeVanish" },
  { id: "quickeningReward", lane: "agility", kind: "item", templateId: "quickening" },
  { id: "huntersLongbowReward", lane: "agility", kind: "item", templateId: "huntersLongbow" },
  { id: "venomBowReward", lane: "agility", kind: "item", templateId: "venomBow" },
  { id: "barbedBowReward", lane: "agility", kind: "item", templateId: "barbedBow" },
  { id: "windrunnerBroochReward", lane: "agility", kind: "item", templateId: "windrunnerBrooch" },

  { id: "fireboltReward", lane: "intelligence", kind: "item", templateId: "firebolt" },
  { id: "arcLightningReward", lane: "intelligence", kind: "item", templateId: "arcLightning" },
  { id: "deathBoltReward", lane: "intelligence", kind: "item", templateId: "deathBolt" },
  { id: "manaShieldReward", lane: "intelligence", kind: "item", templateId: "manaShield" },
  { id: "arcaneFocusReward", lane: "intelligence", kind: "item", templateId: "arcaneFocus" },
  { id: "renewalReward", lane: "intelligence", kind: "item", templateId: "renewal" },
  { id: "restorationAmuletReward", lane: "intelligence", kind: "item", templateId: "restorationAmulet" },
  { id: "sageglassPrismReward", lane: "intelligence", kind: "item", templateId: "sageglassPrism" },

  { id: "tacticalEye", lane: "utility", kind: "targeting", rule: "lowestHp", name: "Tactical Eye", description: "Unlock Lowest HP priority" },
  { id: "magehunterMark", lane: "utility", kind: "targeting", rule: "casters", name: "Magehunter Mark", description: "Unlock Casters priority" },
  { id: "hawkSightCharm", lane: "utility", kind: "targeting", rule: "skirmishers", name: "Hawk-Sight Charm", description: "Unlock Skirmishers priority" },
  { id: "emberTracker", lane: "utility", kind: "targeting", rule: "spawns", name: "Ember Tracker", description: "Unlock Spawns priority" },
  { id: "mercilessVow", lane: "utility", kind: "targeting", rule: "healers", name: "Merciless Vow", description: "Unlock Healers priority" },
  { id: "threatReader", lane: "utility", kind: "targeting", rule: "highestDamage", name: "Threat Reader", description: "Unlock Highest Damage priority" },
  { id: "fieldRecovery", lane: "utility", kind: "recovery", name: "Field Recovery" },
];
