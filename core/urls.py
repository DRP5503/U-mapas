from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.index, name='index'),
    # Pisos disponibles de un edificio (para el dropdown).
    path('api/pisos/<str:edificio>/', views.pisos_edificio, name='pisos_edificio'),
    # Un piso con sus salas (para dibujar el plano).
    # Nota: <int:> solo acepta enteros.
    path('api/piso/<str:edificio>/<int:numero>/', views.piso_json, name='piso_json'),
]
 