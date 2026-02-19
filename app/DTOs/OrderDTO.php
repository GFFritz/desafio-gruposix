<?php

namespace App\DTOs;

class OrderDTO
{
    public int $id;
    public string $createdAt;
    public string $currency;
    public float $totalPrice;
    public float $exchangeRateUsd;
    public string $fulfillmentStatus;
    public array $refunds;

    public ?int $customerId;
    public string $customerEmail;

    public array $lineItems;

    public string $shippingCity;
    public string $shippingProvince;

    public string $paymentGateway;
    public string $paymentType;

    private static function parseMonetary($value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        $cleaned = str_replace(',', '', (string) $value);

        return is_numeric($cleaned) ? (float) $cleaned : 0.0;
    }

    private static function parseFloat($value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        $cleaned = str_replace(',', '', (string) $value);

        return is_numeric($cleaned) ? (float) $cleaned : 0.0;
    }

    public static function fromArray(array $data): self
    {
        $dto = new self();

        $dto->id = $data['id'] ?? 0;
        $dto->createdAt = $data['created_at'] ?? '';
        $dto->currency = $data['currency'] ?? 'USD';
        $dto->totalPrice = self::parseMonetary($data['total_price'] ?? 0);
        $dto->exchangeRateUsd = self::parseFloat($data['exchange_rate_USD'] ?? 0);
        $dto->fulfillmentStatus = $data['fulfillment_status'] ?? '';
        $dto->refunds = array_map(function ($refund) {
            return [
                'id' => $refund['id'] ?? 0,
                'totalAmount' => self::parseMonetary($refund['total_amount'] ?? 0),
                'subTotal' => self::parseMonetary($refund['sub_total'] ?? 0),
            ];
        }, $data['refunds'] ?? []);

        $customer = $data['customer'] ?? [];
        $dto->customerId = $customer['id'] ?? null;
        $dto->customerEmail = $customer['email'] ?? '';

        $dto->lineItems = array_map(function ($item) {
            return [
                'productId' => $item['product_id'] ?? 0,
                'title' => $item['title'] ?? '',
                'quantity' => (int) ($item['quantity'] ?? 0),
                'totalPrice' => self::parseMonetary($item['total_price'] ?? 0),
                'isRefunded' => (int) ($item['is_refunded'] ?? 0),
                'refundedQuantity' => (int) ($item['refunded_quantity'] ?? 0),
            ];
        }, $data['line_items'] ?? []);

        $shipping = $data['shipping_address'] ?? [];
        $dto->shippingCity = $shipping['city'] ?? '';
        $dto->shippingProvince = $shipping['province'] ?? '';

        $payment = $data['payment'] ?? [];
        $dto->paymentGateway = $payment['gateway'] ?? '';
        $dto->paymentType = $payment['payment_type'] ?? '';

        return $dto;
    }

    /**
     * Se currency == USD, usa totalPrice diretamente.
     * Caso contrário, converte usando exchangeRateUsd.
     */
    public function getTotalPriceInUSD(): float
    {
        if (strtoupper($this->currency) === 'USD') {
            return $this->totalPrice;
        }

        if ($this->exchangeRateUsd <= 0) {
            return 0.0;
        }

        return $this->totalPrice * $this->exchangeRateUsd;
    }

    /**
     * Se currency == USD, divide por exchangeRate para obter BRL.
     * Se já for BRL, usa totalPrice diretamente.
     */
    public function getTotalPriceInBRL(): float
    {
        if (strtoupper($this->currency) === 'USD') {
            if ($this->exchangeRateUsd <= 0) {
                return 0.0;
            }
            return $this->totalPrice / $this->exchangeRateUsd;
        }

        return $this->totalPrice;
    }

    public function getRefundsTotalUSD(): float
    {
        $total = 0.0;

        foreach ($this->refunds as $refund) {
            $total += $refund['totalAmount'] ?? 0;
        }

        if (strtoupper($this->currency) === 'USD') {
            return $total;
        }

        if ($this->exchangeRateUsd <= 0) {
            return 0.0;
        }

        return $total * $this->exchangeRateUsd;
    }

    public function hasRefund(): bool
    {
        return count($this->refunds) > 0;
    }
}
