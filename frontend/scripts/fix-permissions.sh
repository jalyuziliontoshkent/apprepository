#!/bin/bash
# EAS build server'ida fayl ruxsatlarini to'g'rilash
set -e

echo "[fix-permissions] Fixing file permissions..."

# Barcha fayllarga o'qish/yozish ruxsatlarini berish
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;

# Execute permission for scripts
[ -f scripts/*.sh ] && chmod +x scripts/*.sh

echo "[fix-permissions] Done."
