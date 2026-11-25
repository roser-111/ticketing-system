BEGIN;

-- Obecny zakup traktujemy jako natychmiast opłacony.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'paid'
CHECK (status IN ('pending', 'paid', 'cancelled'));

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT now();

-- Jeden bilet przypada na jedną pozycję zamówienia.
CREATE TABLE IF NOT EXISTS tickets (
    id              SERIAL PRIMARY KEY,
    order_item_id   INT NOT NULL UNIQUE
                    REFERENCES order_items(id) ON DELETE CASCADE,
    qr_token_hash   CHAR(64) NOT NULL UNIQUE,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at         TIMESTAMPTZ,
    checked_in_by   INT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_qr_token_hash
ON tickets(qr_token_hash);

CREATE INDEX IF NOT EXISTS idx_tickets_order_item_id
ON tickets(order_item_id);

COMMIT;
