<?php

namespace App\Services;

use App\DTOs\OrderDTO;
use Illuminate\Support\Collection;

class MetricsService
{
    private Collection $orders;

    public function getAllMetrics(Collection $orders): array
    {
        $this->orders = $orders;

        return [
            'totalOrders' => $this->totalOrders(),
            'totalRevenueUSD' => $this->totalRevenueUSD(),
            'totalRevenueBRL' => $this->totalRevenueBRL(),
            'fulfilledOrders' => $this->fulfilledOrders(),
            'uniqueCustomers' => $this->uniqueCustomers(),
            'financialSummary' => $this->financialSummary(),
            'refundRate' => $this->refundRate(),
            'topProduct' => $this->topProduct(),
            'ordersTable' => $this->ordersTable(),
            'topProductsByRevenue' => $this->topProductsByRevenue(5),
            'averageTicket' => $this->averageTicket(),
            'paymentConversion' => $this->paymentConversion(),
            'topCities' => $this->topCities(10),
            'salesByDate' => $this->salesByDate(),
            'highRefundProducts' => $this->highRefundProducts(),
        ];
    }

    public function totalOrders(): int
    {
        return $this->orders->count();
    }

    public function totalRevenueUSD(): float
    {
        return round($this->orders->sum(fn(OrderDTO $order) => $order->getTotalPriceInUSD()), 2);
    }

    public function totalRevenueBRL(): float
    {
        return round($this->orders->sum(fn(OrderDTO $order) => $order->getTotalPriceInBRL()), 2);
    }

    public function fulfilledOrders(): array
    {
        $total = $this->orders->count();
        $fulfilled = $this->orders->filter(
            fn(OrderDTO $order) => $order->fulfillmentStatus === 'Fully Fulfilled'
        )->count();

        return [
            'count' => $fulfilled,
            'rate' => $total > 0 ? round(($fulfilled / $total) * 100, 1) : 0,
        ];
    }

    public function uniqueCustomers(): array
    {
        $total = $this->orders->count();
        $uniqueIds = $this->orders->pluck('customerId')->filter()->unique()->count();

        return [
            'count' => $uniqueIds,
            'avgOrdersPerCustomer' => $uniqueIds > 0 ? round($total / $uniqueIds, 1) : 0,
        ];
    }

    public function financialSummary(): array
    {
        $grossRevenue = $this->totalRevenueUSD();
        $totalRefunds = round($this->orders->sum(fn(OrderDTO $order) => $order->getRefundsTotalUSD()), 2);
        $netRevenue = round($grossRevenue - $totalRefunds, 2);

        return [
            'grossRevenue' => $grossRevenue,
            'totalRefunds' => $totalRefunds,
            'netRevenue' => $netRevenue,
        ];
    }

    public function refundRate(): float
    {
        $total = $this->orders->count();
        $refunded = $this->orders->filter(fn(OrderDTO $order) => $order->hasRefund())->count();

        return $total > 0 ? round(($refunded / $total) * 100, 1) : 0;
    }

    public function topProduct(): array
    {
        $products = $this->aggregateProducts();

        if ($products->isEmpty()) {
            return ['name' => '-', 'quantity' => 0, 'revenue' => 0];
        }

        return $products->sortByDesc('quantity')->first();
    }

    public function ordersTable(): array
    {
        return $this->orders->map(function (OrderDTO $order) {
            return [
                'id' => $order->id,
                'customer' => $order->customerEmail,
                'status' => $order->fulfillmentStatus,
                'total' => $order->getTotalPriceInUSD(),
                'date' => $order->createdAt,
            ];
        })->values()->toArray();
    }

    public function topProductsByRevenue(int $limit = 5): array
    {
        return $this->aggregateProducts()
            ->sortByDesc('revenue')
            ->take($limit)
            ->values()
            ->toArray();
    }

    public function averageTicket(): float
    {
        $total = $this->orders->count();

        if ($total === 0) {
            return 0;
        }

        return round($this->totalRevenueUSD() / $total, 2);
    }

    public function paymentConversion(): array
    {
        $grouped = $this->orders->groupBy(function (OrderDTO $order) {
            return $order->paymentType ?: 'unknown';
        });

        $total = $this->orders->count();

        return $grouped->map(function ($orders, $type) use ($total) {
            $count = $orders->count();
            return [
                'type' => $type,
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
                'revenue' => round($orders->sum(fn(OrderDTO $o) => $o->getTotalPriceInUSD()), 2),
            ];
        })->values()->toArray();
    }

    public function topCities(int $limit = 10): array
    {
        return $this->orders->groupBy(function (OrderDTO $order) {
            return $order->shippingCity ?: 'Unknown';
        })->map(function ($orders, $city) {
            return [
                'city' => $city,
                'orders' => $orders->count(),
                'revenue' => round($orders->sum(fn(OrderDTO $o) => $o->getTotalPriceInUSD()), 2),
            ];
        })->sortByDesc('revenue')
            ->take($limit)
            ->values()
            ->toArray();
    }

    public function salesByDate(): array
    {
        return $this->orders->groupBy(function (OrderDTO $order) {
            try {
                return \Carbon\Carbon::parse($order->createdAt)->format('Y-m-d');
            } catch (\Exception $e) {
                return 'unknown';
            }
        })->map(function ($orders, $date) {
            return [
                'date' => $date,
                'orders' => $orders->count(),
                'revenue' => round($orders->sum(fn(OrderDTO $o) => $o->getTotalPriceInUSD()), 2),
            ];
        })->sortBy('date')
            ->values()
            ->toArray();
    }

    public function highRefundProducts(): array
    {
        $allItems = collect();

        $this->orders->each(function (OrderDTO $order) use (&$allItems) {
            foreach ($order->lineItems as $item) {
                $allItems->push([
                    'title' => $item['title'],
                    'isRefunded' => $item['isRefunded'],
                    'quantity' => $item['quantity'],
                    'refundedQuantity' => $item['refundedQuantity'],
                ]);
            }
        });

        $grouped = $allItems->groupBy('title');

        return $grouped->map(function ($items, $title) {
            $totalQty = $items->sum('quantity');
            $refundedQty = $items->sum('refundedQuantity');
            $refundedCount = $items->where('isRefunded', 1)->count();
            $totalCount = $items->count();

            $refundRate = $totalCount > 0 ? round(($refundedCount / $totalCount) * 100, 1) : 0;

            return [
                'title' => $title,
                'totalQuantity' => $totalQty,
                'refundedQuantity' => $refundedQty,
                'refundRate' => $refundRate,
                'occurrences' => $totalCount,
            ];
        })->filter(fn($item) => $item['refundRate'] > 0)
            ->sortByDesc('refundRate')
            ->values()
            ->toArray();
    }

    private function aggregateProducts(): Collection
    {
        $allItems = collect();

        $this->orders->each(function (OrderDTO $order) use (&$allItems) {
            foreach ($order->lineItems as $item) {
                $allItems->push($item);
            }
        });

        return $allItems->groupBy('title')
            ->map(function ($items, $title) {
                return [
                    'name' => $title,
                    'quantity' => $items->sum('quantity'),
                    'revenue' => round($items->sum('totalPrice'), 2),
                ];
            });
    }
}
