#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const execute = (command) => {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error('Error executing command:', command);
    process.exit(1);
  }
};

const promptVersion = () => {
  rl.question('Select version bump (patch | minor | major): ', (bumpType) => {
    if (!['patch', 'minor', 'major'].includes(bumpType)) {
      console.error('Invalid version type. Please use patch, minor, or major');
      rl.close();
      process.exit(1);
    }

    try {
      // Ensure working directory is clean
      execute('git diff-index --quiet HEAD --');
      
      // Bump version and create git tag
      execute(`npm version ${bumpType}`);
      
      // Push changes and tags
      execute('git push');
      execute('git push --tags');

      console.log('\n✨ Successfully pushed new version! GitHub Actions will handle npm publishing.\n');
    } catch (error) {
      console.error('\n❌ Please commit all changes before publishing a new version.\n');
    }

    rl.close();
  });
};

// Start the script
console.log('\n📦 Publishing new version...\n');
promptVersion(); 