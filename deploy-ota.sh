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
#    (index.html com popup/pixel/reorder, /depoimentos, api-tracking.php e tracking.js
#    com o Pixel/CAPI da OTA). Vem DEPOIS do sed — já são root-relative, não precisam de rewrite.
if [ -d ota ]; then
  /bin/cp -rf ota/. "$OTAPATH/"
fi

# 4) Remove o arquivo temporário de diagnóstico, se existir
/bin/rm -f "$DEPLOYPATH/__ota_probe.txt"

echo "deploy-ota.sh concluído"
