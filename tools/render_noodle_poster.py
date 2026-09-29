#!/usr/bin/env python3
"""兼容历史命令；所有排版与数据处理都使用 generate_posters.py。"""
import sys
from generate_posters import main

if __name__ == '__main__':
    raise SystemExit(main(['--kind', 'noodle', *sys.argv[1:]]))
