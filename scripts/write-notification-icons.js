#!/usr/bin/env node
/**
 * Write notification icons (green bg + white hand) into public/icons/
 * Runs at prebuild. Valid PNG Android can display.
 */
const fs = require("fs");
const path = require("path");

const iconsDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(iconsDir, { recursive: true });

const files = {
  "notification-192.png": "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAADB0lEQVR42u3dzU3rQBSAUbhKC9ANtJbQGuVQBQs2CEEIJhPfn/Pt3hOykpnjsWMTc/9werqTthaGQAAJIAEkgCSABJAAEkASQAJIAAkgCSABJIAEkASQABJAAkgASQAJIAEkgCSABJAAEkASQAJIAAkgCSABJIAEkACStnYY9W7fjq+f//n48px/y1agpHq+/Z9sWwYor55rzfS6LQOUXc//Z3rdlgGqoec/M71uywDJx3gJIK0u43WgsddUKo5GJB+vu0nXVCqORiQfr8mGSoxG5B+vmYaqjEaUGK9phgqNhk9hAkgACSABJAEkgASQAJIAEkACSABJAAkgASSAJIAEkAASQAJIAkgACSABJAGkG3QwBF/69Tvnw59XBNBGNxt+0iFMAkgACSABJE0DlOETU+9PbUEPQwAVmLOuhoIehgAqM0/9DAU9XiFAxeamk6Ggx6sFqOR89DDkSrTGA6q7KzdYhIIer98hTAANPg8t/S6sQJoKqNPluLrvxQqkSYDejq8fO2u/u5JF31FUHDvfzALo64qiojtGGC+VBEQPQPSsGplLnt+Q5BkPQU/OzvvI84SQoKecoVTPlwl6ahnK9nQizweqfSwbtAJZfloOlHthqgDI8gOQtBMgyw9AEkACSOMAOQECSAJIAAkgAaTF1fpzUgAJIAEkgATQ+FNCZ9BWIAEkgDTkcB/GRVYgy093QBYhK5DsYLsCsghZgWTX2hWQRcgKxJAB2fsQxlCnoYgGA0fkxJPoa836x3YqGurhPkqP4Oct1JqPNqvm/cPpafcXseHbqz9NQIkvwnY65kbFAT3z8/nnptkZW4oV6MIl5PKhT7sO9TvfTwdox8MiPVUPYRNmq+u1hs73wvLMWeMrVW0PYUkOZ+0vco64G7/XLE64RD5iBbr9UjTn7sosQDdgNO3G3ERAixjNvKc7F9C1JA3/XQCA/uzJb48AJB/jBZAAEkASQAJIAAkgCSABJIAEkASQABJAAkgCSAAJIAEkASSABJAAEkASQAJIAAkgCSAt7x30vA7MygPaFwAAAABJRU5ErkJggg==",
  "badge-96.png": "iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAABYElEQVR42u3c2w3CQAxEUbBoAbqB1oDWKIcqqICHsn6MzfV3lB0dJpESZdkfb+cd834MAoAAAggggAACCCAGIIAAAggggAACiAHo5zmUJ3heH58PON0vhfH2Je+kv6LoYGUDbaapYsoDcqHJZ8oAcqfJZLLWOgnnD2xQdFScKtkMnbgVbYZO3Lo2RidodZukE5HBhum4J+FhNQtIpz6+eWykjmMqLrF4IM36eGWjQcFAyvVxSUiDIoH067OekwYBBJAoUJcb0GJaGgQQQAABBBBAAAHEAJQLVPtlXFpaGgQQQLpAXW5DKzlpUDCQfokWE9KgeCDlEq1no0EpQJolckllUmnUdLjEcoF0SuSYxGSTiWQw8Xzlq1uLlIXrWqOsJSuGb6hL+MYh9Mew1ukTzs+eVRkgR6aZu55dmObvm9+A9Y//vPCnz2IAAcQABBBAAAEEEEAAMQABBBBAAAHUfl4KJXOP4qxvkwAAAABJRU5ErkJggg==",
};

for (const [name, b64] of Object.entries(files)) {
  const out = path.join(iconsDir, name);
  fs.writeFileSync(out, Buffer.from(b64, "base64"));
  console.log("wrote", out, fs.statSync(out).size, "bytes");
}
