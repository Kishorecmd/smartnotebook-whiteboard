<?php
declare(strict_types=1);

// Included in Vite's public output for PHP-capable shared hosting.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
if (($_GET['action'] ?? '') === 'health' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    echo json_encode(['service' => 'jaihind-classroom', 'runtime' => 'php', 'protocol' => 1,
        'classroomAPI' => false, 'classroomWeather' => false,
        'supported' => PHP_VERSION_ID >= 80100 && extension_loaded('curl') && extension_loaded('session')]);
    exit;
}
http_response_code(503);
echo json_encode(['code' => 'ERP_UNAVAILABLE']);
