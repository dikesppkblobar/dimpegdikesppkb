import { initBaileys, getBaileysStatus } from './server-baileys';

async function main() {
  console.log('Starting full init test...');
  try {
    await initBaileys(true);
    console.log('Status after init:', await getBaileysStatus());
    
    console.log('Waiting 15 seconds to see if Baileys crashes or outputs anything...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    console.log('Finished 15s wait. Status:', await getBaileysStatus());
    process.exit(0);
  } catch (err) {
    console.error('Exception caught in main:', err);
    process.exit(1);
  }
}

main();
