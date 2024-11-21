#!/usr/bin/env bun

const { $ } = require('bun');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const execute = async (command) => {
  try {
    await $`${command}`;
  } catch (error) {
    console.error('Error executing command:', command);
    process.exit(1);
  }
};

const promptVersion = () => {
  rl.question('Select version bump (patch | minor | major): ', async (bumpType) => {
    if (!['patch', 'minor', 'major'].includes(bumpType)) {
      console.error('Invalid version type. Please use patch, minor, or major');
      rl.close();
      process.exit(1);
    }
    
    try {
      // Ensure working directory is clean
      await execute('git diff-index --quiet HEAD --');
      
      // Bump version and create git tag
      await execute(`npm version ${bumpType}`);
      
      // Push changes and tags
      await execute('git push');
      await execute('git push --tags');

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