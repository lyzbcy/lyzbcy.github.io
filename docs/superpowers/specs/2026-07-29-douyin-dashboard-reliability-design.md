# Douyin Dashboard Reliability Design

## Goal

Make the Douyin dashboard accurate, readable on phones, and reliably updated every day without changing unrelated blog pages.

## Scope

- Correct the percentage-unit conversion at the Excel ingestion boundary.
- Regenerate the current snapshot and Jekyll data from a fresh creator-center export.
- Escape creator-controlled text before inserting it into HTML attributes or elements.
- Replace mobile table clipping with explicit horizontal scrolling and readable text sizes.
- Show a placeholder until at least two daily samples exist and label top-play data honestly.
- Move the OpenClaw job to 10:20 Asia/Shanghai, away from the 02:00 reboot and 10:10 diary job.
- Make collection single-instance and make build/push failures stop the workflow.
- Update the OpenClaw skill and the local Tencent Cloud connection skill to match the verified workflow.

## Data Flow

The exporter writes fractional rate strings such as `0.418760`. The ingestion normalizer will preserve fractions in `[0,1]`, divide explicit percentages such as `41.876%` by 100, and treat bare values above 1 as whole-number percentages. Snapshot and Jekyll generation remain fraction-based.

## Failure Handling

Collection will use a non-blocking lock to prevent concurrent browser-profile access. Generation will validate data, build Jekyll into a temporary directory, reject escaped-markup regressions, and only then commit and push. Push retries will run inside an explicit conditional so `set -e` cannot bypass them.

## Verification

- Node unit tests cover percentage normalization.
- Python source tests cover escaping, responsive table behavior, truthful labels, and schedule copy.
- Shell syntax checks cover both operational scripts.
- A clean Jekyll build and rendered HTML assertions run before push.
- A fresh production collection proves the original symptom is fixed.
- The final online page is checked for HTTP 200, plausible percentages, no escaped `<strong>` text, and the new GitHub Pages commit.
