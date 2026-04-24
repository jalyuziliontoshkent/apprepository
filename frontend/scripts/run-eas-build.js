const { spawnSync } = require('node:child_process');
const path = require('node:path');

const [, , platform, profile, ...restArgs] = process.argv;

if (!platform || !profile) {
  console.error('Usage: node ./scripts/run-eas-build.js <android|ios> <profile> [...extra args]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const easCommand = process.platform === 'win32' ? 'eas.cmd' : 'eas';
const env = {
  ...process.env,
  EAS_PROJECT_ROOT: projectRoot,
};

const args = ['build', '--platform', platform, '--profile', profile, ...restArgs];

const result = spawnSync(easCommand, args, {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
