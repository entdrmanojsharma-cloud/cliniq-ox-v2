const fs = require('fs');
const files = [
  'frontend/App.js',
  'frontend/features/invoices/InvoiceDetailScreen.js',
  'frontend/features/dashboard/screens.js',
  'frontend/features/auth/screens.js',
  'frontend/features/auth/store.js',
  'frontend/features/estimates/EstimateDetailScreen.js',
  'frontend/shared/utils/api.js'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/192\.168\.1\.40/g, '192.168.0.124');
  fs.writeFileSync(file, content);
}
console.log('Replaced IPs');
