<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$SUPABASE_URL = 'https://mddfvarvwltbanbmzmao.supabase.co';
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZGZ2YXJ2d2x0YmFuYm16bWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzQ2MjgsImV4cCI6MjA4NTcxMDYyOH0.64m8Ey1P4jLvDpvnkhMBz9iBEG-UfpXVCNksf4X-TM4';

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (!$input || empty($input['session_id'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Payload inválido ou session_id ausente.',
    ]);
    exit;
}

function first_ip_from_list($value) {
    $parts = explode(',', (string) $value);
    return trim($parts[0]);
}

function client_ip() {
    $candidates = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_REAL_IP',
        'REMOTE_ADDR',
    ];

    foreach ($candidates as $key) {
        if (empty($_SERVER[$key])) {
            continue;
        }
        $ip = $key === 'HTTP_X_FORWARDED_FOR'
            ? first_ip_from_list($_SERVER[$key])
            : trim((string) $_SERVER[$key]);
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            return $ip;
        }
    }

    return '';
}

function geo_lookup($ip) {
    if (!$ip) {
        return ['cidade' => '', 'estado' => '', 'pais' => ''];
    }

    $geoUrl = 'https://ipwho.is/' . rawurlencode($ip) . '?fields=success,city,region,country';
    $ch = curl_init($geoUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpcode < 200 || $httpcode >= 300 || !$response) {
        return ['cidade' => '', 'estado' => '', 'pais' => ''];
    }

    $json = json_decode($response, true);
    if (!$json || empty($json['success'])) {
        return ['cidade' => '', 'estado' => '', 'pais' => ''];
    }

    return [
        'cidade' => isset($json['city']) ? (string) $json['city'] : '',
        'estado' => isset($json['region']) ? (string) $json['region'] : '',
        'pais' => isset($json['country']) ? (string) $json['country'] : '',
    ];
}

function supabase_upsert($url, $key, $payload) {
    $ch = curl_init($url . '/rest/v1/diagnostico_leads?on_conflict=session_id');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Prefer: resolution=merge-duplicates,return=minimal',
    ]);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return [$httpcode, $response, $error];
}

function supabase_insert($url, $key, $payload) {
    $ch = curl_init($url . '/rest/v1/diagnostico_leads');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Prefer: return=minimal',
    ]);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return [$httpcode, $response, $error];
}

$payload = $input;
$payload = array_merge($payload, geo_lookup(client_ip()));

list($httpcode, $response, $error) = supabase_upsert($SUPABASE_URL, $SUPABASE_KEY, $payload);

if ($httpcode === 400 && strpos((string) $response, '42P10') !== false) {
    list($httpcode, $response, $error) = supabase_insert($SUPABASE_URL, $SUPABASE_KEY, $payload);
}

if ($httpcode >= 400 && strpos((string) $response, 'ddi') !== false) {
    unset($payload['ddi']);
    list($httpcode, $response, $error) = supabase_upsert($SUPABASE_URL, $SUPABASE_KEY, $payload);
    if ($httpcode === 400 && strpos((string) $response, '42P10') !== false) {
        list($httpcode, $response, $error) = supabase_insert($SUPABASE_URL, $SUPABASE_KEY, $payload);
    }
}

echo json_encode([
    'status' => ($httpcode >= 200 && $httpcode < 300) ? 'success' : 'error',
    'http_code' => $httpcode,
    'session_id' => $input['session_id'],
    'geo' => [
        'cidade' => isset($payload['cidade']) ? $payload['cidade'] : '',
        'estado' => isset($payload['estado']) ? $payload['estado'] : '',
        'pais' => isset($payload['pais']) ? $payload['pais'] : '',
    ],
    'response' => json_decode($response, true),
    'curl_error' => $error,
]);
