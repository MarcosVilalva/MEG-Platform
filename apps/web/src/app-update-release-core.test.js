import assert from 'node:assert/strict';
import { selectNewestRelease, updateIsAvailable, validRelease } from './app-update-release-core.js';

const release173 = { versionCode: 173, versionName: '1.1.173' };
const release175 = { versionCode: 175, versionName: '1.1.175' };

assert.equal(validRelease(release173), true);
assert.equal(validRelease({ versionCode: 0 }), false);
assert.equal(validRelease(null), false);

assert.equal(selectNewestRelease([release173, release175]), release175);
assert.equal(selectNewestRelease([release175, release173]), release175);
assert.equal(selectNewestRelease([null, { versionCode: '175' }, release173]).versionCode, '175');
assert.equal(selectNewestRelease([]), null);

assert.equal(updateIsAvailable({ versionCode: 173 }, release175), true);
assert.equal(updateIsAvailable({ versionCode: 175 }, release175), false);
assert.equal(updateIsAvailable({ versionCode: 176 }, release175), false);

console.log('app update release core tests passed');
