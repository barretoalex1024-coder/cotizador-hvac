#!/usr/bin/env bash
# Configura este proyecto para usar OmniRoute (desplegado en Railway).
#
#   bash scripts/configurar-omniroute.sh              # guarda .env.omniroute y verifica conexión
#   bash scripts/configurar-omniroute.sh --permanente # además escribe .claude/settings.local.json
#
# Lee OMNIROUTE_URL / OMNIROUTE_API_KEY del entorno o de .env.omniroute; si faltan, los pregunta.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVO_ENV="$RAIZ/.env.omniroute"
PERMANENTE=0
[[ "${1:-}" == "--permanente" ]] && PERMANENTE=1

# shellcheck disable=SC1090
[[ -f "$ARCHIVO_ENV" ]] && source "$ARCHIVO_ENV"

if [[ -z "${OMNIROUTE_URL:-}" ]]; then
  read -rp "URL de OmniRoute en Railway (ej. https://omniroute-xxxx.up.railway.app): " OMNIROUTE_URL
fi
if [[ -z "${OMNIROUTE_API_KEY:-}" ]]; then
  read -rsp "API key de OmniRoute: " OMNIROUTE_API_KEY
  echo
fi
OMNIROUTE_MODELO_CLAUDE="${OMNIROUTE_MODELO_CLAUDE:-bsam-claude-code}"
OMNIROUTE_MODELO_COTIZADOR="${OMNIROUTE_MODELO_COTIZADOR:-bsam-estimados}"
OMNIROUTE_FALLBACK="${OMNIROUTE_FALLBACK:-abortar}"

# Claude Code agrega /v1/messages por su cuenta: la URL base va sin /v1 ni barra final.
OMNIROUTE_URL="${OMNIROUTE_URL%/}"
OMNIROUTE_URL="${OMNIROUTE_URL%/v1}"

echo "→ Verificando $OMNIROUTE_URL/healthz ..."
if ! curl -fsS --max-time 10 "$OMNIROUTE_URL/healthz" >/dev/null; then
  echo "✗ OmniRoute no responde. Revisa en Railway que el servicio esté activo y que la URL sea la pública." >&2
  exit 1
fi

echo "→ Verificando API key con /v1/models ..."
CODIGO=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
  -H "Authorization: Bearer $OMNIROUTE_API_KEY" "$OMNIROUTE_URL/v1/models")
case "$CODIGO" in
  200) echo "✓ Conexión y API key correctas." ;;
  401|403) echo "✗ La API key fue rechazada ($CODIGO). Crea una nueva en el dashboard → API Keys." >&2; exit 1 ;;
  *) echo "✗ /v1/models respondió $CODIGO." >&2; exit 1 ;;
esac

umask 077
cat > "$ARCHIVO_ENV" <<EOF
OMNIROUTE_URL=$OMNIROUTE_URL
OMNIROUTE_API_KEY=$OMNIROUTE_API_KEY
OMNIROUTE_MODELO_CLAUDE=$OMNIROUTE_MODELO_CLAUDE
OMNIROUTE_MODELO_COTIZADOR=$OMNIROUTE_MODELO_COTIZADOR
OMNIROUTE_FALLBACK=$OMNIROUTE_FALLBACK
EOF
echo "✓ Guardado $ARCHIVO_ENV (permisos 600, ignorado por git)."

if [[ $PERMANENTE -eq 1 ]]; then
  # settings.local.json: Claude Code lo aplica a TODAS las sesiones abiertas en este proyecto,
  # sin necesidad del script envoltorio. No tiene fallback automático (ver docs/OMNIROUTE.md).
  mkdir -p "$RAIZ/.claude"
  OMNIROUTE_URL="$OMNIROUTE_URL" OMNIROUTE_API_KEY="$OMNIROUTE_API_KEY" \
  OMNIROUTE_MODELO_CLAUDE="$OMNIROUTE_MODELO_CLAUDE" ARCHIVO="$RAIZ/.claude/settings.local.json" \
  node -e '
    const fs = require("fs");
    const f = process.env.ARCHIVO;
    const s = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
    s.env = {
      ...s.env,
      ANTHROPIC_BASE_URL: process.env.OMNIROUTE_URL,
      ANTHROPIC_AUTH_TOKEN: process.env.OMNIROUTE_API_KEY,
      ANTHROPIC_MODEL: process.env.OMNIROUTE_MODELO_CLAUDE,
      CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: "1",
    };
    fs.writeFileSync(f, JSON.stringify(s, null, 2) + "\n", { mode: 0o600 });
  '
  echo "✓ Escrito .claude/settings.local.json — reinicia Claude Code para que lo tome."
else
  echo "Listo. Abre Claude Code con: npm run omniroute:claude"
fi
