#!/usr/bin/env python3
"""Start one Apify run, wait for success, and download that run's dataset."""
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = 'https://api.apify.com/v2'


def main():
    token = os.environ.get('APIFY_TOKEN', '').strip()
    task = os.environ.get('APIFY_TASK_ID', '').strip()
    if not token:
        raise RuntimeError('APIFY_TOKEN is missing from Actions secrets.')
    if task and not re.fullmatch(r'[A-Za-z0-9_~-]+', task):
        raise RuntimeError('APIFY_TASK_ID must be a Task ID, not a URL.')

    def request(path, payload=None):
        data = None if payload is None else json.dumps(payload).encode()
        req = urllib.request.Request(BASE + path, data=data, headers={
            'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            try:
                detail = json.loads(error.read()).get('error', {})
                message = str(detail.get('message', ''))[:500].replace(token, '[redacted]')
                kind = str(detail.get('type', ''))[:100].replace(token, '[redacted]')
            except (ValueError, AttributeError):
                message, kind = 'No JSON error detail', ''
            raise RuntimeError(f'Apify HTTP {error.code}: {kind}: {message}') from None

    if task:
        run = request(f'/actor-tasks/{task}/runs', {})['data']
    else:
        run = request('/acts/16Y8KDUNZ5NXdSOLX/runs', {
            'seller': '4934829', 'maxResults': 1000, 'sortBy': 'date',
            'skipAds': True, 'delayBetweenPages': 1})['data']
    # Never retry POST: a timeout may already have created a paid run.
    deadline = time.monotonic() + 900
    while run['status'] in {'READY', 'RUNNING', 'TIMING-OUT', 'ABORTING'}:
        if time.monotonic() >= deadline:
            raise RuntimeError(f"Apify run {run['id']} timed out; archive unchanged. Check Apify before retrying.")
        time.sleep(10)
        run = request(f"/actor-runs/{run['id']}")['data']
    if run['status'] != 'SUCCEEDED':
        raise RuntimeError(f"Apify run {run['id']} ended as {run['status']}; archive unchanged.")
    items = request(f"/datasets/{run['defaultDatasetId']}/items?format=json&clean=true&limit=1001")
    if not isinstance(items, list) or not items or len(items) > 1000:
        raise RuntimeError('Empty or truncated Apify dataset; archive unchanged.')
    path = Path(os.environ.get('BUNJANG_RAW_PATH', 'bunjang-actor-items.json'))
    path.write_text(json.dumps(items, ensure_ascii=False), encoding='utf-8')
    print(f"Fetched {len(items)} records from Apify run {run['id']}.")


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError) as error:
        # Do not emit Request objects, headers, or credential-bearing URLs.
        print(f'::error::{error}')
        raise SystemExit(1)
