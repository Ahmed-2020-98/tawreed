#!/usr/bin/env bash
# Dev helper: prints an access token for a demo phone via the dev OTP flow (APP_ENV=development only).
#   infra/scripts/dev-token.sh 0500000001 [BUYER_APP]
set -euo pipefail
phone=$1; app=${2:-BUYER_APP}; base=${API_URL:-http://localhost:8030}/api/v1
code=$(curl -s -XPOST "$base/auth/otp/request" -H 'content-type: application/json' -d "{\"phone\":\"$phone\",\"app\":\"$app\"}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('devCode',''))")
[ -z "$code" ] && { echo "no devCode (cooldown or non-dev API)" >&2; exit 1; }
curl -s -XPOST "$base/auth/otp/verify" -H 'content-type: application/json' -d "{\"phone\":\"$phone\",\"app\":\"$app\",\"code\":\"$code\"}" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['tokens']['accessToken'])"
