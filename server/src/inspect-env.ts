import fs from 'fs';

const envPath = 'c:/Users/pandi/OneDrive/Desktop/AvatarX/avatarx/.env';
const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');
const uriLine = lines.find(l => l.includes('MONGODB_URI'));

if (uriLine) {
  console.log('Line Length:', uriLine.length);
  const chars = [];
  for (let i = 0; i < uriLine.length; i++) {
    const code = uriLine.charCodeAt(i);
    // Mask the password area (usually between first : and first @)
    const firstColon = uriLine.indexOf(':', 12); // skip mongodb+srv:
    const firstAt = uriLine.indexOf('@');
    
    if (i > firstColon && i < firstAt) {
      chars.push('*');
    } else {
      chars.push(uriLine[i]);
    }
  }
  console.log('Line Content (Masked):', chars.join(''));
  
  const uriPart = uriLine.split('=')[1];
  console.log('URI Hex Codes:', [...uriPart].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' '));
  console.log('URI Char Codes:', [...uriPart].map(c => c.charCodeAt(0)));
} else {
  console.log('MONGODB_URI line not found');
}
