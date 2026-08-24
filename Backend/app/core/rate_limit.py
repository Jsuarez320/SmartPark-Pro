from slowapi import Limiter
from slowapi.util import get_remote_address

# H-12: límite de intentos de login por IP. Cuenta también logins exitosos:
# para uso interno/desarrollo 5 cada 15 min es razonable; subir a "10/15minutes"
# si el volumen legítimo de la oficina lo requiere.
LOGIN_RATE_LIMIT = "5/15minutes"

limiter = Limiter(key_func=get_remote_address)
