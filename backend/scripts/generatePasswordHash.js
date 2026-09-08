// Makes a bcrypt hash you can paste into Supabase.
// Usage:  node scripts/generatePasswordHash.js "MyPassword123"

import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generatePasswordHash.js "your password"');
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);

console.log("");
console.log("password: " + password);
console.log("hash:     " + hash);
console.log("");
