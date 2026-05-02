import fs from 'node:fs';
import path from 'node:path';

const appConfig = JSON.parse(fs.readFileSync(path.resolve('app.json'), 'utf8')).expo;
const scheme = appConfig.scheme;
const envFromFiles = ['.env.local', '.env'].reduce((acc, fileName) => {
  const filePath = path.resolve(fileName);
  if (!fs.existsSync(filePath)) return acc;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) acc[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }

  return acc;
}, {});
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? envFromFiles.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(
  /\/$/,
  '',
);

if (!scheme) {
  throw new Error('Missing expo.scheme in app.json.');
}

console.log('ApplyLoop auth redirect configuration');
console.log(`iOS bundle identifier: ${appConfig.ios?.bundleIdentifier ?? '(missing)'}`);
console.log(`Native URL scheme: ${scheme}`);
console.log(`Native OAuth redirect URL: ${scheme}:///`);
console.log(`Supabase redirect allow-list entries: ${scheme}:///, ${scheme}:///**`);

if (supabaseUrl) {
  console.log(`Google OAuth callback URL: ${supabaseUrl}/auth/v1/callback`);
} else {
  console.log('Google OAuth callback URL: set EXPO_PUBLIC_SUPABASE_URL to print this value.');
}
