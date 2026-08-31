#!/usr/bin/env bash
# Install or update the Dunyo Hotel 1 Mini App bot on a Debian/Ubuntu host.
#
# Idempotent: safe to re-run for every deploy. It never writes .env — the secrets
# are placed once, by hand, and left alone.
#
#   sudo ./deploy/install.sh            # run from the repo root on the server
#
set -euo pipefail

APP=dunyo-hotel-1-miniapp-bot
APP_USER=dunyo-hotel-1-miniapp
TARGET=/opt/$APP
UNIT=$APP.service

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo $0" >&2
  exit 1
fi

if [[ ! -f "$SOURCE/bot/bot.py" ]]; then
  echo "bot/bot.py not found next to this script — run it from the repo root." >&2
  exit 1
fi

echo "==> System packages"
apt-get update -qq
apt-get install -y -qq python3 python3-venv rsync

PYVER=$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])')
if [[ $(printf '%s\n3.11\n' "$PYVER" | sort -V | head -1) != "3.11" ]]; then
  echo "Python 3.11+ required, found $PYVER." >&2
  exit 1
fi

echo "==> Service user: $APP_USER"
id -u "$APP_USER" &>/dev/null || useradd --system --home-dir "$TARGET" --shell /usr/sbin/nologin "$APP_USER"

echo "==> Code -> $TARGET"
mkdir -p "$TARGET"
# --delete keeps the target a mirror of the repo, but never touches .env or the
# virtualenv, which live in the target only.
rsync -a --delete \
  --exclude '.venv' --exclude '.env' --exclude '__pycache__' --exclude '.git' \
  "$SOURCE/bot/" "$TARGET/bot/"

echo "==> Virtualenv"
[[ -d $TARGET/.venv ]] || python3 -m venv "$TARGET/.venv"
"$TARGET/.venv/bin/pip" install --quiet --upgrade pip
"$TARGET/.venv/bin/pip" install --quiet -r "$TARGET/bot/requirements.txt"

if [[ ! -f $TARGET/bot/.env ]]; then
  install -o "$APP_USER" -g "$APP_USER" -m 600 "$TARGET/bot/.env.example" "$TARGET/bot/.env"
  echo
  echo "!! $TARGET/bot/.env was created from the example and is NOT filled in."
  echo "!! Edit it (BOT_TOKEN, WEBAPP_URL, OWNER_CHAT_ID), then re-run this script."
  echo
  chown -R "$APP_USER:$APP_USER" "$TARGET"
  exit 1
fi

chown -R "$APP_USER:$APP_USER" "$TARGET"
chmod 600 "$TARGET/bot/.env"

echo "==> Config check"
# Fails loudly on a bad .env before systemd starts flapping on Restart=always.
( cd "$TARGET/bot" && runuser -u "$APP_USER" -- "$TARGET/.venv/bin/python" -c \
  'import bot; bot.load_dotenv(); bot.load_settings(); print("   .env OK")' )

echo "==> systemd unit"
install -m 644 "$SOURCE/deploy/$UNIT" "/etc/systemd/system/$UNIT"
systemctl daemon-reload
systemctl enable "$UNIT" >/dev/null
systemctl restart "$UNIT"

sleep 3
systemctl is-active --quiet "$UNIT" && echo "==> $UNIT is running" || {
  echo "!! $UNIT failed to start:" >&2
  journalctl -u "$UNIT" -n 30 --no-pager >&2
  exit 1
}

echo
echo "Logs:    journalctl -u $UNIT -f"
echo "Restart: systemctl restart $UNIT"
