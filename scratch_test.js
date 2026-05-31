import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as parser from '@babel/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src', 'tabs', 'CalendarTab.jsx');
const code = fs.readFileSync(filePath, 'utf8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('No syntax errors found!');
} catch (e) {
  console.error('Syntax error found:');
  console.error(e.message);
  console.error('At line:', e.loc.line, 'column:', e.loc.column);
}
