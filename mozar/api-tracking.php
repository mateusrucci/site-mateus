<?php
/**
 * Rastreamento Server-Side 100% PHP (Meta Conversions API)
 * Este arquivo recebe dados do front-end e os envia de forma segura para o Meta, driblando bloqueadores de anúncios e iOS 14.
 */

// Permite requisições do seu próprio front-end
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Responde ao pré-flight do navegador
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ==========================================
// 🔴 CONFIGURAÇÕES CRÍTICAS - PREENCHA AQUI
// ==========================================
$PIXEL_ID = 'SEU_ID_DO_PIXEL_AQUI'; // Ex: '123456789012345'
$ACCESS_TOKEN = 'SEU_TOKEN_DE_ACESSO_AQUI'; // Gere este token no Gerenciador de Eventos (Configurações > Gerar Token de Acesso)
$API_VERSION = 'v19.0';
// ==========================================

// Pega os dados enviados pelo seu JavaScript via POST/Fetch
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

if (!$input) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Nenhum dado recebido pelo arquivo PHP.']);
    exit;
}

$eventName = isset($input['eventName']) ? $input['eventName'] : 'PageView';
$eventTime = time();
$eventId = isset($input['eventId']) ? $input['eventId'] : uniqid('evt_');
$eventSourceUrl = isset($input['eventUrl']) ? $input['eventUrl'] : '';

// Extraindo dados automáticos do servidor
$userData = [
    'client_ip_address' => $_SERVER['REMOTE_ADDR'], // IP Real do Usuário (vital para o Meta cruzamento de dados)
    'client_user_agent' => $_SERVER['HTTP_USER_AGENT'], // Navegador e Dispositivo
];

// IDs do Facebook coletados pelo cookie no navegador da pessoa
if (!empty($input['fbp'])) { $userData['fbp'] = $input['fbp']; }
if (!empty($input['fbc'])) { $userData['fbc'] = $input['fbc']; }

// 🔐 CRIPTOGRAFIA EXIGIDA PELO META (SHA-256) PARA EMAILS E TELEFONES
if (!empty($input['email'])) {
    // Normalização: letras minúsculas, sem espaços e criptografado
    $userData['em'] = hash('sha256', strtolower(trim($input['email'])));
}
if (!empty($input['phone'])) {
    // Normalização: manter APENAS números + código do país
    $phone = preg_replace('/[^0-9]/', '', $input['phone']);
    $userData['ph'] = hash('sha256', $phone);
}

// Construção da carga para enviar ao Facebook
$data = [
    [
        'event_name' => $eventName,
        'event_time' => $eventTime,
        'action_source' => 'website',
        'event_id' => $eventId,
        'event_source_url' => $eventSourceUrl,
        'user_data' => $userData
    ]
];

// Dados extras opicionais (como valor da compra ou moeda)
if (isset($input['custom_data'])) {
    $data[0]['custom_data'] = $input['custom_data'];
}

$payload = json_encode([
    'data' => $data,
    // 'test_event_code' => 'TEST45612' // ATIVE SOMENTE SE ESTIVER TESTANDO NA FERRAMENTA DE TESTES DO GERENCIADOR
]);

// ✈️ Disparo da requisição usando cURL (Nativo da Hostgator/PHP)
$ch = curl_init("https://graph.facebook.com/{$API_VERSION}/{$PIXEL_ID}/events?access_token={$ACCESS_TOKEN}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Retorna feedback para o navegador saber se deu certo
echo json_encode([
    'status' => $httpcode >= 200 && $httpcode < 300 ? 'success' : 'error',
    'meta_response' => json_decode($response),
    'http_code' => $httpcode,
    'curl_error' => $error
]);
