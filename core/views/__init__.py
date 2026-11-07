"""
Paquete de vistas de la aplicación core.
Re-exporta las vistas de cada dominio para mantener compatibilidad con core/urls.py.
"""
from .auth import login_user, logout_user, register_user
from .mapa import (
    index,
    piso_json,
    pisos_edificio,
    ruta_json,
    ruta_nodos,
)

__all__ = [
    'index',
    'register_user',
    'login_user',
    'logout_user',
    'pisos_edificio',
    'piso_json',
    'ruta_nodos',
    'ruta_json',
]
