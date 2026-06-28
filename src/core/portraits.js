const portraitAttributes = ["strength", "agility", "intelligence"];

export function selectPortraitAttribute(effectiveStats, currentAttribute = "strength") {
  const highestValue = Math.max(
    effectiveStats.strength,
    effectiveStats.agility,
    effectiveStats.intelligence,
  );
  const leaders = portraitAttributes
    .filter((attribute) => effectiveStats[attribute] === highestValue);

  return leaders.length === 1 ? leaders[0] : currentAttribute;
}
