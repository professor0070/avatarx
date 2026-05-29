import fs from 'fs';
import path from 'path';

const envPath = 'c:/Users/pandi/OneDrive/Desktop/AvatarX/avatarx/.env';

function auditEnv() {
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');

  console.log('--- .env Audit Report ---');
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const parts = trimmed.split('=');
    if (parts.length < 2) {
      console.warn(`⚠️ Line ${index + 1}: Invalid format (missing =): "${trimmed}"`);
      return;
    }

    const key = parts[0].trim();
    let rawValue = parts.slice(1).join('=');
    let value = rawValue.trim();

    // Check for common issues
    const issues = [];
    
    if (rawValue !== value) issues.push('Value contains leading or trailing spaces');
    
    if (value.startsWith('"') && !value.endsWith('"')) issues.push('Missing closing quote');
    if (value.startsWith("'") && !value.endsWith("'")) issues.push('Missing closing quote');
    if (value.includes(' ') && !value.startsWith('"')) issues.push('Value contains spaces but is not quoted');
    
    if (key === 'MONGODB_URI') {
      if (value.includes('<') || value.includes('>')) issues.push('Contains < or > brackets');
      
      // Check for unencoded special characters in password
      const match = value.match(/mongodb(?:\+srv)?:\/\/([^:]+):([^@]+)@/);
      const afterAt = value.split('@')[1];
      if (match) {
        const username = match[1];
        const password = match[2];
        console.log(`- Parsed Username: "${username}"`);
        console.log(`- Parsed Host: "${afterAt.split('/')[0]}"`);
        
        const specialChars = /[@:/?#\[\]%]/; 
        
        if (specialChars.test(username)) {
          issues.push('Username contains unencoded special characters');
        }
        if (specialChars.test(password)) {
          issues.push('Password contains unencoded special characters (like @, :, /, ?, #, %, [, ])');
        }
        if (password.includes('$')) {
          issues.push('Password contains $ which may cause interpolation issues');
        }

        // Check for space between host and database
        if (afterAt && afterAt.includes(' ')) {
          issues.push('Contains a space after the @ symbol (check between host and database)');
        }
        
        // Check if slash is missing between host and query/database
        if (afterAt && !afterAt.includes('/') && afterAt.includes('?')) {
          issues.push('Missing / before ? (Database name or / separator is required)');
        }
      } else {
        issues.push('Could not parse MONGODB_URI format');
      }
    }

    if (issues.length > 0) {
      console.log(`❌ ${key}: ${issues.join(', ')}`);
    } else {
      console.log(`✅ ${key}: Looks okay`);
    }
  });
}

auditEnv();
