const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, '../Nodes');
const dirs = fs.readdirSync(nodesDir);

const configToAppend = `
# Enhanced Transaction Pool for Migration
tx-pool="Layered"
tx-pool-layer-max-capacity=100000
tx-pool-layer-max-future-by-sender=50000
tx-pool-limit-by-account-percentage=1
`;

for (const dir of dirs) {
  const configPath = path.join(nodesDir, dir, 'config.toml');
  if (fs.existsSync(configPath)) {
    let content = fs.readFileSync(configPath, 'utf8');
    if (!content.includes('tx-pool="Layered"')) {
      fs.appendFileSync(configPath, configToAppend);
      console.log(`Updated ${configPath}`);
    } else {
      console.log(`Already configured ${configPath}`);
    }
  }
}
