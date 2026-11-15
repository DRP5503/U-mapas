from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.index, name='index'),
    # Autenticación de usuarios
    path('register', views.register_user, name='register_user'),
    path('login', views.login_user, name='login_user'),
    path('logout', views.logout_user, name='logout_user'),
    # Favoritos
    path('favoritos/', views.mis_lugares_favoritos, name='mis_lugares_favoritos'),
    path('api/favoritos/toggle/<int:sala_id>/', views.toggle_favorito, name='toggle_favorito'),
    path('api/favoritos/estado/<int:sala_id>/', views.estado_favorito, name='estado_favorito'),
    # API de pisos y rutas
    path('api/pisos/<str:edificio>/', views.pisos_edificio, name='pisos_edificio'),
    path('api/piso/<str:edificio>/<int:numero>/', views.piso_json, name='piso_json'),
    path('api/ruta/<str:edificio>/<int:numero>/<str:desde>/<str:hasta>/', views.ruta_json, name='ruta_json'),
    path('api/ruta-salas/<int:desde_id>/<int:hasta_id>/', views.ruta_salas, name='ruta_salas'),
    path('api/ruta-nodos/<str:edificio>/<int:numero>/<str:desde>/<str:hasta>/', views.ruta_nodos, name='ruta_nodos'),
    # API de reportes comunitarios
    path('api/reportes/crear/', views.crear_reporte_view, name='crear_reporte'),
    path('api/reportes/<int:reporte_id>/', views.detalle_reporte_view, name='detalle_reporte'),
    path('api/reportes/<int:reporte_id>/confirmar/', views.confirmar_reporte_view, name='confirmar_reporte'),
    path('api/reportes/<int:reporte_id>/cerrar/', views.cerrar_reporte_view, name='cerrar_reporte'),
    path('api/buscar/', views.buscar, name='buscar'),
    path('profesores/<int:profesor_id>/', views.perfil_profesor, name='perfil_profesor'),
]
