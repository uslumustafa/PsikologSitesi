#!/usr/bin/env bash
# sitemap.xml'deki tüm URL'leri IndexNow'a bildirir.
# Bing, Yandex ve DuckDuckGo bu protokolü dinler; Google dinlemez (o Search Console'dan yönetiliyor).
# Anahtar dosyası sitenin kökünde yayında olmalı: https://$HOST/$KEY.txt
set -euo pipefail

KEY="96589ed4b3ffcac27e71b7ba373f5d8e"
HOST="www.gebzepsikologonuruslu.com"

URLS=$(grep -o '<loc>[^<]*</loc>' sitemap.xml | sed -e 's|</\?loc>||g' -e 's|.*|"&"|' | paste -sd, -)

curl -sS -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"https://$HOST/$KEY.txt\",\"urlList\":[$URLS]}" \
  -w "IndexNow HTTP %{http_code}\n"
