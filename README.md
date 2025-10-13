# Checkout & Payments

## Environment

Create a `.env` in `backend/` with:

```
PORT=4000
DATABASE_URL=...
JWT_ACCESS_SECRET=...

# Razorpay Configuration (Test Mode)
RAZORPAY_KEY_ID=rzp_test_RFthbdvKoFjd2D
RAZORPAY_KEY_SECRET=05w5D0ulR9eUHJhhiAqtTS6T
```

## Endpoints

- POST `/api/checkout/init`
- POST `/api/checkout/pay`
- POST `/api/checkout/confirm`
- POST `/api/checkout/cancel`
- GET `/api/orders/:id`

Coupons are bound on cart apply and recorded on order confirmation.
