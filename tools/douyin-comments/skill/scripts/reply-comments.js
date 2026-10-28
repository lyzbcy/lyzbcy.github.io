const { runCreator } = require("./creator-display.js");
const { copyFileSync, existsSync, mkdirSync } = require("node:fs");
const path = require("node:path");

const skillRoot = path.resolve(__dirname, "..");
const localOutputDir = path.join(skillRoot, "comments-output");
const creatorRoot = path.join(process.env.HOME || "/root", ".openclaw", "douyin-creator-tools");
const creatorOutputDir = path.join(creatorRoot, "comments-output");

function main() {
  const argv = process.argv.slice(2);
  const planArg = argv.find((arg) => !arg.startsWith("-"));
  const extraArgs = argv.filter((arg, index) => index !== argv.indexOf(planArg));

  if (!planArg) {
    console.error("❌ 请提供回复计划文件路径");
    process.exit(1);
  }

  const localPlanPath = path.resolve(planArg);
  const planName = path.basename(localPlanPath);
  const resultName = planName.replace("reply-plan", "reply-comments-result");
  const localResultPath = path.join(localOutputDir, resultName);
  const localLatestResultPath = path.join(localOutputDir, "reply-comments-result.json");


  console.log(`📝 使用真实 douyin-creator-tools 执行回复: ${planName}`);
  // 不带 --headless，用 Xvfb 虚拟显示器绕过抖音反爬
  runCreator("npm", ["run", "comments:reply", "--", localPlanPath, ...extraArgs], {
    cwd: creatorRoot,
    stdio: "inherit",
  });

  const creatorResultPath = path.join(creatorOutputDir, "reply-comments-result.json");
  if (!existsSync(creatorResultPath)) {
    throw new Error(`真实回复结果不存在: ${creatorResultPath}`);
  }

  mkdirSync(localOutputDir, { recursive: true });
  copyFileSync(creatorResultPath, localResultPath);
  copyFileSync(creatorResultPath, localLatestResultPath);
  console.log(`✅ 已同步真实回复结果: ${resultName}`);
}

main();
