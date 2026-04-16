<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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
    $error = curl_error($ch);
    curl_close($ch);

    if ($httpcode < 200 || $httpcode >= 300 || !$response) {
        return ['cidade' => '', 'estado' => '', 'pais' => '', 'erro' => $error];
    }

    $json = json_decode($response, true);
    if (!$json || empty($json['success'])) {
        return ['cidade' => '', 'estado' => '', 'pais' => '', 'erro' => 'lookup_failed'];
    }

    return [
        'cidade' => isset($json['city']) ? (string) $json['city'] : '',
        'estado' => isset($json['region']) ? (string) $json['region'] : '',
        'pais' => isset($json['country']) ? (string) $json['country'] : '',
    ];
}

echo json_encode([
    'status' => 'success',
    'ip' => client_ip(),
    'geo' => geo_lookup(client_ip()),
]);
