export function validRelease(release) {
  const versionCode = Number(release?.versionCode);
  return Boolean(release && Number.isFinite(versionCode) && versionCode > 0);
}

export function selectNewestRelease(releases = []) {
  return releases
    .filter(validRelease)
    .reduce((newest, release) => {
      if (!newest) return release;
      return Number(release.versionCode) > Number(newest.versionCode) ? release : newest;
    }, null);
}

export function updateIsAvailable(installed, release) {
  const installedCode = Number(installed?.versionCode);
  const releaseCode = Number(release?.versionCode);
  if (!Number.isFinite(installedCode) || !Number.isFinite(releaseCode)) return false;
  return releaseCode > installedCode;
}
