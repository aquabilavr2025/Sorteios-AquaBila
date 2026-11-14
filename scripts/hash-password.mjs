import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: npm run hash:password -- "A password with at least 12 characters"');
  process.exit(1);
}
const salt = randomBytes(16);
const derivedKey = scryptSync(password, salt, 64);
console.log(`scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`);
