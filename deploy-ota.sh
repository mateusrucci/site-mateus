#!/bin/bash
# Publica o site da OTA (pasta mozar/) na raiz do domínio otaodontologia.com.br.
# O mozar/ é a fonte; na mateusrucci.com.br ele fica em /mozar/, mas no
# otaodontologia.com.br ele é servido na RAIZ — então reescrevemos os caminhos
# /mozar/ -> / para que todos os links (inclusive os já existentes) funcionem.
# Roda no servidor cPanel, a partir da raiz do repositório, via .cpanel.yml.

OTAPATH=/home2/mate3251/otaodontologia.com.br
DEPLOYPATH=/home2/mate3251/mateusrucci.com.br

# 1) BASE: copia o conteúdo de mozar/ (vídeos, blog, landing pages, imagens) para a OTA
/bin/cp -rf mozar/. "$OTAPATH/"

# 2) Corrige caminhos da base para servir na RAIZ: /mozar/ -> / e domínio canônico
/usr/bin/find "$OTAPATH" -maxdepth 4 -name '*.html' -exec sed -i \
  -e 's#https://mateusrucci.com.br/mozar/#https://otaodontologia.com.br/#g' \
  -e 's#"/mozar/#"/#g' {} +
/usr/bin/find "$OTAPATH" -maxdepth 4 -name '*.xml' -exec sed -i \
  -e 's#https://mateusrucci.com.br/mozar/#https://otaodontologia.com.br/#g' {} +

# 3) OVERLAY EXCLUSIVO DA OTA: sobrepõe os arquivos específicos do otaodontologia
SCRIPTDIR="$(cd "$(dirname "$0")" && pwd)"
DIAG="$DEPLOYPATH/__ota_diag.txt"
{
  echo "=== diag $(date) ==="
  echo "pwd=$(pwd)"
  echo "scriptdir=$SCRIPTDIR"
  echo "git_head=$(git -C "$SCRIPTDIR" rev-parse HEAD 2>&1)"
  echo "ls_ota_pwd=$(ls -la ota 2>&1 | head -8)"
  echo "ls_ota_scriptdir=$(ls -la "$SCRIPTDIR/ota" 2>&1 | head -8)"
} > "$DIAG" 2>&1

# Tenta pela pasta relativa e, como reforço, pelo diretório do script (caminho absoluto)
if [ -d ota ]; then
  /bin/cp -rf ota/. "$OTAPATH/" 2>>"$DIAG"
elif [ -d "$SCRIPTDIR/ota" ]; then
  /bin/cp -rf "$SCRIPTDIR/ota/." "$OTAPATH/" 2>>"$DIAG"
fi

echo "overlay_index_has_openLead=$(grep -c openLead "$OTAPATH/index.html" 2>&1)" >> "$DIAG"

# 4) Remove o arquivo temporário de diagnóstico antigo
/bin/rm -f "$DEPLOYPATH/__ota_probe.txt"

echo "deploy-ota.sh concluído"
