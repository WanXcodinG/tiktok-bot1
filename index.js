// Simple entry point that calls the main uploader
const { main } = require('./simple-uploader');

main().catch(err => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});