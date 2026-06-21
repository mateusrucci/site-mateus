#!/bin/bash
# Publica o site da OTA na raiz do domínio otaodontologia.com.br.
# A base é a pasta mozar/ (na mateusrucci.com.br ela fica em /mozar/; aqui é servida
# na RAIZ, então reescrevemos /mozar/ -> /). Depois aplicamos a OVERLAY ota/, que tem
# os arquivos EXCLUSIVOS do otaodontologia (popup, pixel/CAPI, reorder, /depoimentos).
# Roda no servidor cPanel, a partir da raiz do repositório, via .cpanel.yml.

OTAPATH=/home2/mate3251/otaodontologia.com.br
DEPLOYPATH=/home2/mate3251/mateusrucci.com.br
SCRIPTDIR="$(cd "$(dirname "$0")" && pwd)"

# 1) BASE: copia o conteúdo de mozar/ (vídeos, blog, landing pages, imagens) para a OTA
/bin/cp -rf "$SCRIPTDIR/mozar/." "$OTAPATH/"

# 2) Corrige caminhos da base para servir na RAIZ: /mozar/ -> / e domínio canônico
/usr/bin/find "$OTAPATH" -maxdepth 4 -name '*.html' -exec sed -i \
  -e 's#https://mateusrucci.com.br/mozar/#https://otaodontologia.com.br/#g' \
  -e 's#"/mozar/#"/#g' {} +
/usr/bin/find "$OTAPATH" -maxdepth 4 -name '*.xml' -exec sed -i \
  -e 's#https://mateusrucci.com.br/mozar/#https://otaodontologia.com.br/#g' {} +

# 3) OVERLAY EXCLUSIVA DA OTA: sobrepõe os arquivos específicos do otaodontologia.
#    Vem DEPOIS do sed — já são root-relative, não precisam de rewrite.
if [ -d "$SCRIPTDIR/ota" ]; then
  /bin/cp -rf "$SCRIPTDIR/ota/." "$OTAPATH/"
fi

# 4) Limpeza de arquivos temporários de diagnóstico, se existirem
/bin/rm -f "$DEPLOYPATH/__ota_probe.txt" "$DEPLOYPATH/__ota_diag.txt"

echo "deploy-ota.sh concluído"
