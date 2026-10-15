<?php
/**
 * RELAY DE LEADS — OTA Odontologia
 * Recebe o lead do site (mesma origem), captura IP + User-Agent reais e
 * encaminha pro Apps Script (planilha/hub). Fire-and-forget: o Apps Script
 * grava a linha mesmo sem a gente ler a resposta.
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { echo json_encode(['ok' => true, 'relay' => 'online']); exit; }

// ====== CONFIG (mesma senha que está nas Script Properties do Apps Script) ======
$HUB_URL    = 'https://script.google.com/macros/s/AKfycbyOabg7uO0_6jiXs9hZTF-U40yDcz_ZNziyh0x6v3mDthEjZRKcba7Tt7cC9ytxi2dg/exec';
$HUB_SECRET = 'ota-dbiwdb92db239d82';
// ===============================================================================

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'sem dados']); exit; }

// IP real (atravessa Cloudflare/proxy quando houver)
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $ip = trim($parts[0]);
}

$pick = function ($k) use ($in) { return isset($in[$k]) ? $in[$k] : ''; };

$payload = [
    'secret'       => $HUB_SECRET,
    'origem'       => $pick('origem') ?: 'Lead enviado',
    'nome'         => $pick('nome'),
    'telefone'     => $pick('telefone'),
    'tratamento'   => $pick('tratamento'),
    'email'        => $pick('email'),
    'fbclid'       => $pick('fbclid'),
    'fbp'          => $pick('fbp'),
    'fbc'          => $pick('fbc'),
    'gclid'        => $pick('gclid'),
    'gbraid'       => $pick('gbraid'),
    'wbraid'       => $pick('wbraid'),
    'utm_source'   => $pick('utm_source'),
    'utm_medium'   => $pick('utm_medium'),
    'utm_campaign' => $pick('utm_campaign'),
    'utm_term'     => $pick('utm_term'),
    'utm_content'  => $pick('utm_content'),
    'landing'      => $pick('landing'),
    'referrer'     => $pick('referrer'),
    'external_id'  => $pick('external_id'),
    'event_id'     => $pick('event_id'),
    'ip'           => $ip,
    'user_agent'   => $_SERVER['HTTP_USER_AGENT'] ?? '',
];

// Bloqueia reenvios do mesmo telefone por 24 horas, inclusive entre abas/visitas.
// O lock cobre a consulta, o envio e a gravação para evitar corridas simultâneas.
$origin = $payload['origem'];
$phone = preg_replace('/\D+/', '', (string) $payload['telefone']);
if (strlen($phone) === 10 || strlen($phone) === 11) { $phone = '55' . $phone; }
$eventId = trim((string) $payload['event_id']);
$identity = $phone !== '' ? 'phone:' . $phone : ($eventId !== '' ? 'event:' . $eventId : '');
$lock = null;
$state = [];
$now = time();
if ($identity !== '' && in_array($origin, ['Lead enviado', 'Abandono de carrinho'], true)) {
    $dir = sys_get_temp_dir() . '/ota-lead-hub-dedupe';
    if (is_dir($dir) || @mkdir($dir, 0700)) {
        $path = $dir . '/' . hash_hmac('sha256', $identity, $HUB_SECRET) . '.json';
        $lock = @fopen($path, 'c+');
        if ($lock && flock($lock, LOCK_EX)) {
            $saved = json_decode(stream_get_contents($lock), true);
            if (is_array($saved)) { $state = $saved; }
            $leadRecent = ($now - (int) ($state['lead_at'] ?? 0)) < 86400;
            $abandonRecent = ($now - (int) ($state['abandon_at'] ?? 0)) < 86400;
            if (($origin === 'Lead enviado' && $leadRecent) ||
                ($origin === 'Abandono de carrinho' && ($leadRecent || $abandonRecent))) {
                flock($lock, LOCK_UN);
                fclose($lock);
                echo json_encode(['ok' => true, 'duplicate' => true]);
                exit;
            }
        } else {
            if ($lock) { fclose($lock); }
            $lock = null;
        }
    }
}

$ch = curl_init($HUB_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

$hubResult = is_string($response) ? json_decode($response, true) : null;
$ok = $code >= 200 && $code < 400 && is_array($hubResult) && !empty($hubResult['ok']);
if ($lock) {
    if ($ok) {
        $state[$origin === 'Lead enviado' ? 'lead_at' : 'abandon_at'] = $now;
        rewind($lock);
        ftruncate($lock, 0);
        fwrite($lock, json_encode($state));
        fflush($lock);
    }
    flock($lock, LOCK_UN);
    fclose($lock);
}

echo json_encode(['ok' => $ok, 'hub_code' => $code, 'err' => $err]);
