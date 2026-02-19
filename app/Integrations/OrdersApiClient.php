<?php

namespace App\Integrations;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrdersApiClient
{
    public function fetchOrders(): ?array
    {
        try {
            $response = Http::timeout(30)->get(config('services.orders_api.url'));

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('API retornou erro', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Falha ao conectar com a API', [
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
