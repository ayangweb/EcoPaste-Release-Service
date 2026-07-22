interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

interface VersionedRelease {
  tag_name: string;
}

const SEMVER_PATTERN =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const parseSemanticVersion = (value: string): SemanticVersion | undefined => {
  const match = SEMVER_PATTERN.exec(value.trim());

  if (!match) return void 0;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split(".") ?? [],
  };
};

const compareNumericIdentifiers = (left: string, right: string): number => {
  const normalizedLeft = left.replace(/^0+/, "") || "0";
  const normalizedRight = right.replace(/^0+/, "") || "0";

  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length > normalizedRight.length ? 1 : -1;
  }

  if (normalizedLeft === normalizedRight) return 0;

  return normalizedLeft > normalizedRight ? 1 : -1;
};

const comparePrereleaseIdentifiers = (left: string, right: string): number => {
  const leftIsNumeric = /^\d+$/.test(left);
  const rightIsNumeric = /^\d+$/.test(right);

  if (leftIsNumeric && rightIsNumeric) return compareNumericIdentifiers(left, right);
  if (leftIsNumeric) return -1;
  if (rightIsNumeric) return 1;

  if (left === right) return 0;

  return left > right ? 1 : -1;
};

export const compareSemanticVersions = (
  leftValue: string,
  rightValue: string
): number | undefined => {
  const left = parseSemanticVersion(leftValue);
  const right = parseSemanticVersion(rightValue);

  if (!left || !right) return void 0;

  for (const key of ["major", "minor", "patch"] as const) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }

  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0;
  if (left.prerelease.length === 0) return 1;
  if (right.prerelease.length === 0) return -1;

  const identifierCount = Math.max(left.prerelease.length, right.prerelease.length);

  for (let index = 0; index < identifierCount; index += 1) {
    const leftIdentifier = left.prerelease[index];
    const rightIdentifier = right.prerelease[index];

    if (leftIdentifier === void 0) return -1;
    if (rightIdentifier === void 0) return 1;

    const comparison = comparePrereleaseIdentifiers(leftIdentifier, rightIdentifier);
    if (comparison !== 0) return comparison;
  }

  return 0;
};

export const selectNewerRelease = <T extends VersionedRelease>(
  stableRelease: T,
  prerelease: T
): T => {
  const comparison = compareSemanticVersions(
    stableRelease.tag_name,
    prerelease.tag_name
  );

  if (comparison === void 0) return prerelease;

  return comparison >= 0 ? stableRelease : prerelease;
};
