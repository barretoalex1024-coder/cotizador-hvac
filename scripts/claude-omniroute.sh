#!/usr/bin/env bash
# Abre Claude Code enrutando todas sus solicitudes por OmniRoute.
# Antes de arrancar comprueba que OmniRoute esté vivo; si no lo está, aplica OMNIROUTE_FALLBACK:
#   abortar (por defecto) → no abre Claude Code y explica qué revisar
#   directo               → abre Claude Code contra Anthropic con tu login normal
# Los argumentos extra se pasan tal cual a `claude`.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
[[ -f "$RAIZ/.env.omniroute" ]] && source "$RAIZ/.env.omniroute"

if [[ -z "${OMNIROUTE_URL:-}" || -z "${OMNIROUTE_API_KEY:-}" ]]; then
  echo "Falta configuración. Corre primero: npm run omniroute:configurar" >&2
  exit 1
fi

if grep -q ANTHROPIC_BASE_URL "$RAIZ/.claude/settings.local.json" 2>/dev/null; then
  echo "Aviso: .claude/settings.local.json ya fija ANTHROPIC_BASE_URL; ese valor manda sobre este script." >&2
fi

disponible() {
  for intento in 1 2 3; do
    curl -fsS --max-time 5 "$OMNIROUTE_URL/healthz" >/dev/null 2>&1 && return 0
    # Railway puede tardar unos segundos en despertar el contenedor
    sleep $((intento * 2))
  done
  return 1
}

if disponible; then
  export ANTHROPIC_BASE_URL="$OMNIROUTE_URL"
  export ANTHROPIC_AUTH_TOKEN="$OMNIROUTE_API_KEY"
  export ANTHROPIC_MODEL="${OMNIROUTE_MODELO_CLAUDE:-bsam-claude-code}"
  export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
  unset ANTHROPIC_API_KEY
  echo "✓ OmniRoute OK → Claude Code usará el combo $ANTHROPIC_MODEL"
  exec claude "$@"
fi

case "${OMNIROUTE_FALLBACK:-abortar}" in
  directo)
    echo "⚠ OmniRoute no responde en $OMNIROUTE_URL. Abriendo Claude Code directo contra Anthropic." >&2
    unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
    exec claude "$@"
    ;;
  *)
    cat >&2 <<EOF
✗ OmniRoute no responde en $OMNIROUTE_URL/healthz.
  1. Railway → servicio OmniRoute → Deployments: ¿está "Active" o se reinició por memoria?
  2. Revisa los logs del servicio en Railway.
  3. Para trabajar mientras tanto: OMNIROUTE_FALLBACK=directo npm run omniroute:claude
EOF
    exit 1
    ;;
esac
