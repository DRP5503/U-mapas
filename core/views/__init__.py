"""
Paquete de vistas de la aplicación core.
Re-exporta las vistas de cada dominio para mantener compatibilidad con core/urls.py.
"""
from .auth import login_user, logout_user, register_user
from .favoritos import (
    estado_favorito, guardar_profesor_favorito, mis_lugares_favoritos,
    quitar_favorito, toggle_favorito,
)
from .profesores import perfil_profesor
from .mapa import (
    index,
    piso_json,
    pisos_edificio,
    ruta_json,
    ruta_nodos,
    ruta_salas,
    buscar,
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
    'guardar_profesor_favorito',
    'quitar_favorito',
    'toggle_favorito',
    'estado_favorito',
    'crear_reporte_view',
    'detalle_reporte_view',
    'confirmar_reporte_view',
    'cerrar_reporte_view',
    'perfil_profesor',
]
