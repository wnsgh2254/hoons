# Stripe Webhook Setup

When a customer pays the deposit via Stripe, the webhook updates the booking to **confirmed** and stores the **deposit amount paid** in the database so staff can easily see the remaining balance.

## 1. Add `deposit_paid` column (one-time)

Run the SQL in Supabase **SQL Editor** (Dashboard → SQL Editor):

```sql
-- See scripts/add-deposit-paid-to-bookings.sql
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS deposit_paid numeric DEFAULT NULL;
```

## 2. Create webhook in Stripe Dashboard

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks).
2. Click **Add endpoint**.
3. **Endpoint URL**: `https://www.haeyoom.com.au/api/stripe/webhook` (or your production URL).
4. **Events to send**: Select **payment_intent.succeeded**.
5. Click **Add endpoint**.
6. Open the new endpoint and reveal **Signing secret** (starts with `whsec_`).

## 3. Add environment variable

Add the webhook signing secret to your env:

- **Local**: In `.env.local` add  
  `STRIPE_WEBHOOK_SECRET=whsec_...`
- **Vercel**: In Project → Settings → Environment Variables add  
  `STRIPE_WEBHOOK_SECRET` = `whsec_...`  
  (Production and Preview if you test with Stripe CLI.)

Redeploy after adding the variable.

## 4. Flow summary

1. Customer pays deposit on booking page → Stripe PaymentIntent succeeds.
2. Stripe sends `payment_intent.succeeded` to `/api/stripe/webhook`.
3. Webhook verifies signature, reads `metadata.booking_id` and amount, then:
   - Sets `bookings.status` = `'confirmed'`
   - Sets `bookings.deposit_paid` = amount paid (AUD).
4. Staff see **Paid** and **Remaining** (total_amount − deposit_paid) in Service History / admin.

## 5. Local testing (optional)

Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` in `.env.local`.
