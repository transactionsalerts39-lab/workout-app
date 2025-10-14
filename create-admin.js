const textEncoder = new TextEncoder();

const HEX_DIGITS = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, '0'));

function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += HEX_DIGITS[bytes[i]];
  }
  return hex;
}

async function digestSha256(input) {
  const arrayBuffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return bufferToHex(digest);
}

async function hashPassword(password, salt) {
  const text = salt + ':' + password;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await digestSha256(data);
  return digest;
}

// Create the admin account with proper hash
async function createAdminAccount() {
  const salt = 'a1b2c3d4e5f67890';
  const passwordHash = await hashPassword('admin123', salt);
  
  console.log('Admin Account Credentials:');
  console.log('Username: admin');
  console.log('Password: admin123');
  console.log('Salt:', salt);
  console.log('Password Hash:', passwordHash);
  
  return { salt, passwordHash };
}

createAdminAccount().then(result => {
  console.log('\nUse these values to manually update your database:');
  console.log(`UPDATE app_users SET password_hash = '${result.passwordHash}', salt = '${result.salt}', is_admin = true WHERE username = 'admin';`);
});
