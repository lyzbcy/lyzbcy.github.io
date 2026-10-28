const { runCreator } = require("./creator-display.js");
const { copyFileSync, existsSync, mkdirSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const skillRoot = path.resolve(__dirname, "..");
const localOutputDir = path.join(skillRoot, "comments-output");
const creatorRoot = path.join(process.env.HOME || "/root", ".openclaw", "douyin-creator-tools");
const creatorWorksFile = path.join(creatorRoot, "comments-output", "list-works.json");

function shanghaiDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function main() {

  console.log("🔄 使用真实 douyin-creator-tools 刷新作品列表...");
  runCreator("npm", ["run", "works"], {
    cwd: creatorRoot,
    stdio: "inherit",
  });

  mkdirSync(localOutputDir, { recursive: true });
  if (existsSync(creatorWorksFile)) {
    copyFileSync(creatorWorksFile, path.join(localOutputDir, "list-works.json"));
  }

  const marker = path.join(skillRoot, `works-refreshed-${shanghaiDateString()}`);
  writeFileSync(marker, "done\n", "utf8");
  console.log("✅ 作品列表刷新完成");
}

main();
