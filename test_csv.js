import { parseCSV } from './src/csvHandler.js';
import fs from 'fs';

const csv = fs.readFileSync('test_channels.csv', 'utf8');
console.log('CSV content:');
console.log(csv);
console.log('\nParsed URLs:');
console.log(parseCSV(csv));