const fs = require('fs');

async function run() {
  const url = 'http://localhost:9010/frontend/index.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable';
  console.log('Fetching bundle from:', url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch bundle: ${res.statusText}`);
  }
  const text = await res.text();
  console.log('Bundle size:', text.length);
  fs.writeFileSync('scratch/downloaded_bundle.js', text);
  console.log('Saved to scratch/downloaded_bundle.js');

  // Find occurrences of import.meta
  const lines = text.split('\n');
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('import.meta')) {
      count++;
      console.log(`\nMatch ${count} at line ${i + 1}:`);
      console.log(lines[i].substring(Math.max(0, lines[i].indexOf('import.meta') - 100), lines[i].indexOf('import.meta') + 150));
    }
  }
}

run().catch(console.error);
