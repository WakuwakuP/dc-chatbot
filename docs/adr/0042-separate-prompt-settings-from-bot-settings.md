# Separate prompt settings from singleton bot settings

The bot will keep general instance-wide settings in a singleton `bot_settings` row, but prompt configuration will be separated from that singleton settings table. Model settings, notification target, and other single-instance operational settings can live in `bot_settings`; system prompt configuration should live in a prompt-specific table or structure.

This preserves a simple singleton settings model for the private bot while leaving room for future prompt customization per Owner Discord User. The MVP may use one global prompt setting, but the schema should not force system prompt customization to remain globally singleton forever.
