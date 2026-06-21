# Hub de Conversões OTA — Setup do Apps Script

Peça 1 de 2. Aqui você publica o "cérebro" (planilha + Apps Script). No fim, me mande
**a URL do Web App** e **o SHARED_SECRET** que eu construo a peça 2 (captura no site + PHP).

## Passo a passo (≈10 min)

1. **Abra a planilha** → menu **Extensões → Apps Script**.
2. Apague o conteúdo do `Código.gs` e **cole todo o `Codigo.gs`** desta pasta. Salve (💾).
3. **Configurações do projeto** (engrenagem ⚙️ à esquerda):
   - **Fuso horário:** `America/Sao_Paulo`.
   - Role até **Propriedades do script → Adicionar propriedade** e crie:
     | Propriedade | Valor |
     |---|---|
     | `PIXEL_ID` | `906409825814867` |
     | `ACCESS_TOKEN` | *(o token do Meta — gere um novo no Gerenciador de Eventos)* |
     | `SHARED_SECRET` | *(invente uma senha forte, ex.: `ota-7f3k9x...`)* |
     | `SHEET_NAME` | `Leads` |
     | `TEST_EVENT_CODE` | *(opcional — código da aba "Testar eventos" do Meta, pra validar antes de valer)* |
4. No topo, selecione a função **`configurarPlanilha`** e clique **▶ Executar**. Autorize o acesso (sua conta Google). Isso cria o cabeçalho, o dropdown de **Status** e esconde as colunas técnicas.
5. Selecione **`criarGatilhoDiario`** e **▶ Executar** → cria o disparo automático às **00:00 (BR)**.
6. *(Opcional, recomendado)* Selecione **`testarMeta`** e **▶ Executar** → deve aparecer "Meta OK". Confere no Gerenciador de Eventos se chegou.
7. **Publicar o Web App:** botão **Implantar → Nova implantação → tipo: App da Web**:
   - **Executar como:** Eu (sua conta)
   - **Quem tem acesso:** Qualquer pessoa
   - Clique **Implantar** e **copie a URL** (termina em `/exec`).

## Me envie de volta
- A **URL do Web App** (`https://script.google.com/macros/s/…/exec`)
- O **SHARED_SECRET** que você criou

Com isso eu monto a captura no site (todos os parâmetros + abandono de carrinho) e o
PHP que joga tudo na planilha — e testamos um lead de ponta a ponta.

---

## Como você vai usar no dia a dia
- Os leads (e abandonos) caem sozinhos. Você mexe **só** em **Status** e **Valor (R$)**.
- Mude o **Status** conforme o lead anda:
  - **CONTATADO** → respondeu no WhatsApp → Meta recebe **Contact**
  - **Agendado** → marcou avaliação → Meta recebe **Schedule**
  - **Cliente** → fechou → preencha o **Valor** → Meta recebe **Purchase (com valor)**
- Você não precisa apagar nada: o script manda os eventos que **faltam** e marca a data de
  envio. Não duplica. (Se marcar **Cliente** sem **Valor**, ele segura o Purchase até você
  preencher o valor.)
- Menu **⚡ Hub Conversões** (recarregue a planilha pra ele aparecer) tem "Enviar agora" e
  "Testar conexão" pra rodar na mão quando quiser.

## Segurança
O token do Meta fica **só aqui**, nas Propriedades do script (privado da sua conta) — nunca
no site nem no repositório. O Web App é protegido pelo `SHARED_SECRET`.

---

# Fase 2 — Google Ads (conversões offline pelo gclid)

O mesmo lead que veio do Google (tem `gclid` na planilha) também volta pro **Google Ads**.
O Apps Script monta uma aba **"Google Ads"** no formato de importação, e o Google Ads
**puxa essa aba sozinho, todo dia**. (Já roda junto com o disparo das 00:00.)

### 1) Atualizar o código
- Cole novamente o `Codigo.gs` (agora tem a função `montarGoogleAds`) e salve.
  *Não precisa republicar o Web App — o `doPost` não mudou.*
- Recarregue a planilha → menu **⚡ Hub Conversões → Atualizar aba Google Ads** → ela cria
  a aba **"Google Ads"** com as conversões de quem tem gclid + Status.

### 2) Criar as conversões no Google Ads (uma vez)
Em **Ferramentas → Conversões → + Nova ação → Importar → Cliques (offline)**, crie 3 ações
com o **nome EXATAMENTE igual** (o nome precisa bater com a aba):
| Nome da ação | Categoria sugerida | Valor |
|---|---|---|
| `OTA - Contatado` | Contato | sem valor |
| `OTA - Agendado` | Agendamento / Lead | sem valor |
| `OTA - Cliente` | Compra | **usar o valor do upload (BRL)** |

> Dica: deixe **`OTA - Cliente`** como a conversão principal e use **lance por valor (tROAS)** —
> aí o Google otimiza por quem traz mais faturamento, não por quem só preenche.

### 3) Agendar a importação da planilha
Em **Ferramentas → Conversões → Uploads → (clique nos 3 pontos / Programações) → Criar
programação**:
- **Origem:** Planilhas Google → selecione esta planilha → aba **"Google Ads"**
- **Frequência:** Diária
- Salve.

Pronto: todo dia o Google Ads lê a aba e importa as conversões, ligando cada uma ao clique
do anúncio (gclid). Re-enviar é seguro — o Google deduplica por gclid + ação + horário.

> Obs.: o formato da aba (colunas `Google Click ID`, `Conversion Name`, `Conversion Time`,
> `Conversion Value`, `Conversion Currency` + a linha `Parameters:TimeZone`) é o padrão do
> Google. Se na hora de agendar o Google pedir um formato um pouco diferente, me avisa que eu
> ajusto a função em 1 minuto.
