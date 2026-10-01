const fs = require("fs");
const path = require("path");
const p1 = fs.readFileSync(path.join(__dirname, "assemble-admin-p1.txt"), "utf8");
const p2 = fs.readFileSync(path.join(__dirname, "assemble-admin-p2.txt"), "utf8");
fs.writeFileSync(path.join(__dirname, "_assemble_body.js"), p1 + p2);
require("./_assemble_body.js");
