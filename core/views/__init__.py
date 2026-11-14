"""
Paquete de vistas de la aplicación core.
Re-exporta las vistas de cada dominio para mantener compatibilidad con core/urls.py.
"""
from .auth import login_user, logout_user, register_user
from .favoritos import estado_favorito, mis_lugares_favoritos, toggle_favorito
from .mapa import (
    index,
    piso_json,
    pisos_edificio,
    ruta_json,
    ruta_nodos,
    ruta_salas,
)
from .reportes import (
    cerrar_reporte_view,
    confirmar_reporte_view,
    crear_reporte_view,
    detalle_reporte_view,
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
    'ruta_salas',
    'mis_lugares_favoritos',
    'toggle_favorito',
    'estado_favorito',
    'crear_reporte_view',
    'detalle_reporte_view',
    'confirmar_reporte_view',
    'cerrar_reporte_view',
]
