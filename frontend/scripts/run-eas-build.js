const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const [, , platform, profile, ...restArgs] = process.argv;

if (!platform || !profile) {
  console.error('Usage: node ./scripts/run-eas-build.js <android|ios> <profile> [...extra args]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const easCommand = process.platform === 'win32' ? 'eas.cmd' : 'eas';
const repoRoot = path.join(os.tmpdir(), `lionapk-eas-${Date.now()}`);

const excludedDirs = new Set([
  '.git',
  '.expo',
  '.metro-cache',
  'dist',
  'web-build',
  'inspect-archive',
  'inspect-prebuild',
  'node_modules',
]);

const excludedFiles = new Set([
  '.env',
  '.env.local',
  '.env.example',
  'build.log',
  'build_detail.txt',
  'eas-build-output.log',
  'build_view.json',
]);

function shouldCopy(srcPath) {
  const relativePath = path.relative(projectRoot, srcPath);

  if (!relativePath || relativePath.startsWith('..')) {
    return true;
  }

  const parts = relativePath.split(path.sep);
  const baseName = path.basename(srcPath);

  if (excludedDirs.has(baseName) || excludedFiles.has(baseName)) {
    return false;
  }

  if (/^eas-log-.*\.txt$/i.test(baseName) || /^last_build.*\.json$/i.test(baseName)) {
    return false;
  }

  if (parts[0] === 'android' && ['.gradle', '.kotlin', 'build'].includes(parts[1])) {
    return false;
  }

  if (parts[0] === 'android' && parts[1] === 'app' && parts[2] === 'build') {
    return false;
  }

  return true;
}

function copyProject(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);

    if (!shouldCopy(sourcePath)) {
      continue;
    }

    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyProject(sourcePath, targetPath);
    } else if (entry.isSymbolicLink()) {
      fs.copyFileSync(fs.realpathSync(sourcePath), targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    shell: process.platform === 'win32' && /\.(cmd|bat)$/i.test(command),
    stdio: 'inherit',
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

copyProject(projectRoot, repoRoot);

const nodeModulesPath = path.join(projectRoot, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  fs.symlinkSync(nodeModulesPath, path.join(repoRoot, 'node_modules'), 'junction');
}

run('git', ['init', '--initial-branch=main'], repoRoot);
run('git', ['config', 'user.name', 'Codex Build Bot'], repoRoot);
run('git', ['config', 'user.email', 'codex-build@example.com'], repoRoot);
run('git', ['add', '.'], repoRoot);
run('git', ['commit', '-m', 'Prepare temporary EAS build snapshot'], repoRoot);

const args = ['build', '--platform', platform, '--profile', profile, ...restArgs];
const result = spawnSync(easCommand, args, {
  cwd: repoRoot,
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

try {
  fs.rmSync(repoRoot, { recursive: true, force: true });
} catch {
  // Best effort cleanup only.
}

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
