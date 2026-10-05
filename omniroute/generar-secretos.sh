#!/usr/bin/env bash
# Imprime las variables que hay que pegar en Railway → servicio omniroute → Variables → Raw Editor.
set -euo pipefail
cat <<VARS
PORT=20128
DATA_DIR=/app/data
REQUIRE_API_KEY=true
INITIAL_PASSWORD=$(openssl rand -base64 18)
JWT_SECRET=$(openssl rand -hex 32)
API_KEY_SECRET=$(openssl rand -hex 32)
STORAGE_ENCRYPTION_KEY=$(openssl rand -hex 32)
OMNIROUTE_WS_BRIDGE_SECRET=$(openssl rand -hex 32)
OMNIROUTE_MEMORY_MB=2048
VARS
echo "# Guarda INITIAL_PASSWORD: es la contraseña para entrar al dashboard." >&2
