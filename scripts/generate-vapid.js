const webpush = require("web-push");
const keys = webpush.generateVAPIDKeys();
console.log("Add these to Vercel env:\n");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("VAPID_SUBJECT=mailto:localhandsgm@outlook.com");
