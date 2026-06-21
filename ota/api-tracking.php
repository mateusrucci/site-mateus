<?php
/**
 * Rastreamento Server-Side 100% PHP (Meta Conversions API) — OTA Odontologia
 * Recebe dados do front-end e envia ao Meta com ENRIQUECIMENTO MÁXIMO de dados,
 * driblando bloqueadores e iOS. Espelha o padrão do site, com pixel/token da OTA.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ==========================================
// 🔴 CONFIG — OTA Odontologia
// ==========================================
$PIXEL_ID = '906409825814867';
$ACCESS_TOKEN = 'EAGMPUY1GeToBR9qYwA08a0xSVTNQQgoZC3QYHtUNBrelm4vrzHzlmeA0YBpaiSRPMLhMGWU9QRYaLKOWMPeH0rNZBvjGN1CAvR4zldm5Nkn5M24jNFq2SX5FG9aDA0IdbeU2ZCL3xE0jXc9MPZC0FW3NZB2b9vyHgOzZCtFXNj8H7T8KEPr0p5ILLM3C2dcVHDigZDZD';
$API_VERSION = 'v19.0';
// ==========================================

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

if (!$input) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Nenhum dado recebido pelo arquivo PHP.']);
    exit;
}

// Helper: hash SHA-256 normalizado (exigido pelo Meta para dados pessoais)
function hsh($v) {
    return hash('sha256', strtolower(trim($v)));
}

$eventName = isset($input['eventName']) ? $input['eventName'] : 'PageView';
$eventTime = time();
$eventId = isset($input['eventId']) ? $input['eventId'] : uniqid('evt_');
$eventSourceUrl = isset($input['eventUrl']) ? $input['eventUrl'] : '';

// IP real do usuário, atravessando proxies/Cloudflare quando houver
$ip = $_SERVER['REMOTE_ADDR'];
if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $ip = trim($parts[0]);
}

// ==========================================
// ENRIQUECIMENTO MÁXIMO DE user_data
// ==========================================
$userData = [
    'client_ip_address' => $ip,
    'client_user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '',
];

// IDs do Facebook (cookies de 1ª parte) — essenciais para o match
if (!empty($input['fbp'])) { $userData['fbp'] = $input['fbp']; }
if (!empty($input['fbc'])) { $userData['fbc'] = $input['fbc']; }

// Dados pessoais (hash SHA-256). Quanto mais campos, maior a qualidade do match (EMQ).
if (!empty($input['email']))      { $userData['em'] = hsh($input['email']); }
if (!empty($input['phone'])) {
    // Telefone: só números, com DDI (55). Ex.: 5545999999999
    $phone = preg_replace('/[^0-9]/', '', $input['phone']);
    if (!empty($phone)) { $userData['ph'] = hsh($phone); }
}
if (!empty($input['firstName']))  { $userData['fn'] = hsh($input['firstName']); }
if (!empty($input['lastName']))   { $userData['ln'] = hsh($input['lastName']); }
if (!empty($input['city']))       { $userData['ct'] = hsh($input['city']); }
if (!empty($input['state']))      { $userData['st'] = hsh($input['state']); }
if (!empty($input['zip']))        { $userData['zp'] = hsh(preg_replace('/[^0-9]/', '', $input['zip'])); }
// País padrão Brasil (público local da clínica)
$userData['country'] = hsh(!empty($input['country']) ? $input['country'] : 'br');
// ID externo persistente do visitante (gerado e guardado no navegador)
if (!empty($input['external_id'])) { $userData['external_id'] = hsh($input['external_id']); }
// fbclid bruto (caso não tenha virado fbc ainda)
if (empty($userData['fbc']) && !empty($input['fbclid'])) {
    $userData['fbc'] = 'fb.1.' . (int) round(microtime(true) * 1000) . '.' . $input['fbclid'];
}

// ==========================================
// Evento
// ==========================================
$event = [
    'event_name' => $eventName,
    'event_time' => $eventTime,
    'action_source' => 'website',
    'event_id' => $eventId,
    'event_source_url' => $eventSourceUrl,
    'user_data' => $userData,
];

if (isset($input['custom_data']) && is_array($input['custom_data'])) {
    $event['custom_data'] = $input['custom_data'];
}

$payload = json_encode(['data' => [$event]]);

// Disparo via cURL para a Graph API
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

echo json_encode([
    'status' => $httpcode >= 200 && $httpcode < 300 ? 'success' : 'error',
    'meta_response' => json_decode($response),
    'http_code' => $httpcode,
    'curl_error' => $error
]);
