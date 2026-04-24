async def create_indexes(db):
    statements = [
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
        "CREATE INDEX IF NOT EXISTS idx_users_role_created_at ON users (role, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_orders_dealer_created_at ON orders (dealer_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_orders_inventory_status_updated_at ON orders (inventory_deducted, status, updated_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials (category_id)",
        "CREATE INDEX IF NOT EXISTS idx_materials_stock_quantity ON materials (stock_quantity)",
        "CREATE INDEX IF NOT EXISTS idx_messages_receiver_read_created_at ON messages (receiver_id, read, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_payments_dealer_created_at ON payments (dealer_id, created_at DESC)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id)",
    ]

    for statement in statements:
        try:
            await db.execute(statement)
        except Exception:
            # Legacy databases may be missing optional columns; startup should stay healthy.
            continue
