# Douyin Dashboard Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the dashboard data and make its daily production update deterministic and verifiable.

**Architecture:** Normalize exported values once at ingestion, keep downstream data fractional, validate before publishing, and isolate the scheduled workflow with a lock. Template-only presentation changes remain scoped to the Douyin post.

**Tech Stack:** Node.js 22, Node test runner, Python unittest, Bash, Playwright, SQLite, Jekyll, OpenClaw cron, GitHub Pages.

---

### Task 1: Correct percentage ingestion

**Files:**
- Create: `douyin-creator-tools/src/lib/normalizers.mjs`
- Create: `douyin-creator-tools/test/normalizers.test.mjs`
- Modify: `douyin-creator-tools/src/scrape-video-stats.mjs`

- [ ] Run the new Node test and confirm it fails because the normalizer module is missing.
- [ ] Implement fraction-aware normalization and import it from the scraper.
- [ ] Run the Node test and confirm all cases pass.

### Task 2: Fix dashboard rendering

**Files:**
- Modify: `lyzbcy.github.io/_posts/2026-07-29-抖音数据看板.md`
- Create: `lyzbcy.github.io/tests/test_douyin_dashboard.py`

- [ ] Run the source tests and confirm escaping, mobile overflow, labels, trend threshold, and schedule tests fail.
- [ ] Add Liquid escaping, responsive scrolling, readable sizing, honest labels, and the 10:20 copy.
- [ ] Run the source tests and confirm they pass.

### Task 3: Harden collection and publishing

**Files:**
- Modify: `skills/lyzbcy-douyin-dashboard/scripts/collect.sh`
- Modify: `skills/lyzbcy-douyin-dashboard/scripts/update_douyin_dashboard.sh`
- Modify: `skills/lyzbcy-douyin-dashboard/SKILL.md`

- [ ] Add a non-blocking collection lock.
- [ ] Build Jekyll in a temporary directory and assert rendered dashboard invariants.
- [ ] Remove global Git config mutation and fail on commit errors.
- [ ] Make retries compatible with `set -e`.
- [ ] Update the runbook and schedule.
- [ ] Run shell syntax checks.

### Task 4: Deploy and prove the production result

**Files:**
- Modify generated snapshot and `_data/douyin.json` through the production workflow.
- Update the OpenClaw cron job.

- [ ] Run a fresh exporter collection and regenerate the snapshot.
- [ ] Confirm representative completion and bounce rates are within plausible fractional ranges.
- [ ] Commit and push the site through the hardened publisher.
- [ ] Change the OpenClaw cron expression to `20 10 * * *` in `Asia/Shanghai`.
- [ ] Wait for GitHub Pages and verify the online response and rendered invariants.

### Task 5: Repair the local connection skill

**Files:**
- Create: `ssh-tencent-cloud-connect/scripts/connect_tencent_cloud_ssh.sh`
- Modify: `ssh-tencent-cloud-connect/SKILL.md`
- Modify: `ssh-tencent-cloud-connect/references/connection-notes.md`
- Modify: `ssh-tencent-cloud-connect/agents/openai.yaml`

- [ ] Add the verified macOS key-based path without storing a password.
- [ ] Keep the Windows password fallback documented.
- [ ] Run shell syntax and a live handshake test.
