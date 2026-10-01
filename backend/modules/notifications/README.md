# Notifications backend module

Owns notification application commands.

The current product implementation exposes password-reset email as the implemented transactional notification kind. The canonical `send-notification` command validates kind and recipient and delegates to the existing SMTP adapter. Unsupported kinds fail explicitly instead of pretending delivery support.
