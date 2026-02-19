<?php

namespace App\Http\Controllers;

use App\Services\OrderService;
use App\Services\MetricsService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private OrderService $orderService,
        private MetricsService $metricsService
    ) {}

    public function index(): Response
    {
        $orders = $this->orderService->getOrders();
        $metrics = $this->metricsService->getAllMetrics($orders);

        return Inertia::render('Dashboard', $metrics);
    }
}
