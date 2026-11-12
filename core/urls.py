from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.index, name='index'),
    # Autenticación de usuarios
    path('register', views.register_user, name='register_user'),
    path('login', views.login_user, name='login_user'),
    path('logout', views.logout_user, name='logout_user'),
    # API de pisos y rutas
    path('api/pisos/<str:edificio>/', views.pisos_edificio, name='pisos_edificio'),
    path('api/piso/<str:edificio>/<int:numero>/', views.piso_json, name='piso_json'),
    path('api/ruta/<str:edificio>/<int:numero>/<str:desde>/<str:hasta>/', views.ruta_json, name='ruta_json'),
    path('api/ruta-nodos/<str:edificio>/<int:numero>/<str:desde>/<str:hasta>/', views.ruta_nodos, name='ruta_nodos'),
    # API de reportes comunitarios
    path('api/reportes/crear/', views.crear_reporte_view, name='crear_reporte'),
    path('api/reportes/<int:reporte_id>/', views.detalle_reporte_view, name='detalle_reporte'),
    path('api/reportes/<int:reporte_id>/confirmar/', views.confirmar_reporte_view, name='confirmar_reporte'),
]
