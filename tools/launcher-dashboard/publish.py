"""Publish an allowlisted, aggregate-only SQLite snapshot. Run as repo owner."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import subprocess

TOP = {'schema_version','timezone','updated_at','daily_started_on','monthly_started_at','today','today_date','today_complete','yesterday','yesterday_date','daily_growth','seven_day_average','seven_day_covered_days','current_month','month_to_date_growth','days','months','retention_days','definition','coverage_note'}
MONTH = {'month','mau','coverage_full','closed','complete','growth'}
GROWTH = {'absolute','percent','reason'}
TARGET = 'assets/data/launcher-stats.json'
SSH = 'ssh -p 443 -o Hostname=ssh.github.com -o HostKeyAlias=github.com -o ConnectTimeout=8 -o BatchMode=yes -o StrictHostKeyChecking=yes'

def validate(data):
    if set(data) != TOP or data['schema_version'] != 2:
        raise ValueError('Unexpected snapshot schema')
    stamp = dt.datetime.fromisoformat(data['updated_at'])
    age = (dt.datetime.now(dt.timezone.utc) - stamp).total_seconds()
    if not -300 <= age <= 3600:
        raise ValueError('Snapshot is stale or from the future')
    if len(data['days']) > 400 or len(data['months']) > 15:
        raise ValueError('Snapshot exceeds retention bounds')
    for row in data['days']:
        if set(row) != {'day','dau','complete'} or type(row['dau']) is not int or not 0 <= row['dau'] <= 10000:
            raise ValueError('Unexpected daily record')
        dt.date.fromisoformat(row['day'])
    for row in data['months'] + ([data['current_month']] if data['current_month'] else []):
        if set(row) != MONTH or type(row['mau']) is not int or not 0 <= row['mau'] <= 100000:
            raise ValueError('Unexpected monthly record')
        dt.datetime.strptime(row['month'], '%Y-%m')
        if set(row['growth']) != GROWTH:
            raise ValueError('Unexpected growth record')
    for key in ['daily_growth','month_to_date_growth']:
        if set(data[key]) != GROWTH:
            raise ValueError('Unexpected growth record')
    return data

def publish(snapshot, repo):
    if snapshot.stat().st_size > 100000:
        raise ValueError('Snapshot too large')
    data = validate(json.loads(snapshot.read_text(encoding='utf-8')))
    output = repo / TARGET
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix('.json.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
    os.chmod(temp, 0o644)
    os.replace(temp, output)
    def git(*args):
        return subprocess.run(['git', *args], cwd=repo, check=True, capture_output=True, text=True, timeout=60).stdout.strip()
    # A separate index prevents this timer from touching any other staged work.
    with_index = repo / '.git' / 'launcher-dashboard-index'
    try:
        env = dict(os.environ, GIT_INDEX_FILE=str(with_index))
        def own_git(*args):
            return subprocess.run(['git', *args], cwd=repo, env=env, check=True, capture_output=True, text=True, timeout=60).stdout.strip()
        own_git('read-tree','HEAD')
        own_git('add','--',TARGET)
        staged = own_git('diff','--cached','--name-only')
        if staged:
            own_git('commit','-m',f"更新启动器活跃快照 {data['today_date']}")
            # Keep the normal index's entry for our generated file in sync with HEAD.
            git('reset','--',TARGET)
        git('-c', 'core.sshCommand=' + SSH, 'push','origin','HEAD:main')
    finally:
        with_index.unlink(missing_ok=True)
    print(json.dumps({'updated_at':data['updated_at'],'daily_rows':len(data['days']),'monthly_rows':len(data['months'])}))

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--snapshot',type=Path,required=True)
    parser.add_argument('--repo',type=Path,required=True)
    args=parser.parse_args()
    publish(args.snapshot,args.repo.resolve())
