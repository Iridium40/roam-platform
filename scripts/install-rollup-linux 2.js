const { execSync } = require('node:child_process');
const os = require('node:os');
const platform = os.platform();
const arch = os.arch();

if (platform === 'linux' && arch === 'x64') {
  try {
    execSync('npm install @rollup/rollup-linux-x64-gnu@4.13.0 --no-save', {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to install rollup linux binary:', error);
    process.exit(1);
  }
} else {
  console.log('Skipping @rollup/rollup-linux-x64-gnu install on non-Linux x64 platform.');
}
