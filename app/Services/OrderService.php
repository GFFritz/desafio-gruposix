<?php

namespace App\Services;

use App\DTOs\OrderDTO;
use App\Integrations\OrdersApiClient;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class OrderService
{
    private const CACHE_KEY = 'orders.raw.v1';
    private const CACHE_TTL = 600;

    private OrdersApiClient $apiClient;

    public function __construct(OrdersApiClient $apiClient)
    {
        $this->apiClient = $apiClient;
    }

    public function getOrders(): Collection
    {
        try {
            $rawData = Cache::store('redis')->get(self::CACHE_KEY);

            if ($rawData !== null) {
                return $this->mapToDTO($rawData);
            }
        } catch (\Exception $e) {
            Log::warning('Redis indisponível, buscando direto da API.', [
                'error' => $e->getMessage(),
            ]);
        }

        $apiResponse = $this->apiClient->fetchOrders();

        if ($apiResponse !== null) {
            try {
                Cache::store('redis')->put(self::CACHE_KEY, $apiResponse, self::CACHE_TTL);
            } catch (\Exception $e) {
                Log::warning('Não foi possível salvar no Redis.', [
                    'error' => $e->getMessage(),
                ]);
            }

            return $this->mapToDTO($apiResponse);
        }

        // API falhou — tentar retornar último cache válido
        try {
            $fallbackData = Cache::store('redis')->get(self::CACHE_KEY);

            if ($fallbackData !== null) {
                return $this->mapToDTO($fallbackData);
            }
        } catch (\Exception $e) {
            Log::error('Redis indisponível no fallback.', [
                'error' => $e->getMessage(),
            ]);
        }

        Log::error('Sem dados disponíveis: API falhou e não há cache.');
        return collect();
    }

    private function mapToDTO(array $rawData): Collection
    {
        $orders = $rawData['orders'] ?? [];

        return collect($orders)->map(function ($item) {
            $orderData = $item['order'] ?? $item;
            return OrderDTO::fromArray($orderData);
        });
    }
}
