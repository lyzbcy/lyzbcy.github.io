const { runCreator } = require("./creator-display.js");
const { copyFileSync, existsSync, mkdirSync, rmSync, statSync, readFileSync } = require("node:fs");
const path = require("node:path");

const skillRoot = path.resolve(__dirname, "..");
const localOutputDir = path.join(skillRoot, "comments-output");
const creatorRoot = path.join(process.env.HOME || "/root", ".openclaw", "douyin-creator-tools");
const creatorOutputDir = path.join(creatorRoot, "comments-output");
const creatorUnrepliedFile = path.join(creatorOutputDir, "unreplied-latest.json");
const creatorWorksFile = path.join(creatorOutputDir, "list-works.json");

function main() {

  console.log("🔍 使用真实 douyin-creator-tools 采集未回复评论...");
  const startedAt = Date.now();
  if (existsSync(creatorUnrepliedFile)) {
    rmSync(creatorUnrepliedFile, { force: true });
  }
  // 不带 --headless，用 Xvfb 虚拟显示器绕过抖音反爬
  runCreator("npm", ["run", "comments:collect", "--", ...process.argv.slice(2)], {
    cwd: creatorRoot,
    stdio: "inherit",
  });

  mkdirSync(localOutputDir, { recursive: true });
  if (!existsSync(creatorUnrepliedFile)) {
    throw new Error(`真实采集结果不存在: ${creatorUnrepliedFile}`);
  }

  const stats = statSync(creatorUnrepliedFile);
  if (stats.mtimeMs < startedAt) {
    throw new Error(`真实采集结果不是本次新生成的文件: ${creatorUnrepliedFile}`);
  }

  const payload = JSON.parse(readFileSync(creatorUnrepliedFile, "utf8"));
  if (typeof payload !== "object" || payload === null || !Array.isArray(payload.comments)) {
    throw new Error("真实采集结果结构异常，缺少 comments 数组");
  }

  copyFileSync(creatorUnrepliedFile, path.join(localOutputDir, "unreplied-latest.json"));
  if (existsSync(creatorWorksFile)) {
    copyFileSync(creatorWorksFile, path.join(localOutputDir, "list-works.json"));
  }
  console.log("✅ 已同步真实未回复评论结果");
}

main();
