from django.contrib import admin
from .models import Piso, Sala, Profesor, Reporte, BloqueHorario

# Vista de Pisos.
class PisoAdmin(admin.ModelAdmin):
    list_display = ('edificio', 'numero', 'ancho', 'alto')
    list_filter = ('edificio',)

# Personalizamos la vista de Salas
class SalaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'piso', 'tipo', 'x', 'y', 'ancho', 'alto')
    list_filter = ('piso__edificio', 'piso__numero', 'tipo')
    search_fields = ('nombre',)
    # Permite editar tipo y coordenadas directamente en la lista,
    # útil para ir calcando los planos sala por sala sin abrir cada ficha.
    list_editable = ('tipo', 'x', 'y', 'ancho', 'alto')
# Personalizamos la vista de Profesores
class ProfesorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'oficina', 'jornada') # Vemos las 3 columnas
    list_filter = ('jornada',) # Panel lateral para filtrar por Completa, Parcial o Externo
    search_fields = ('nombre',) # Barra de búsqueda por nombre del profe

# Registramos los modelos conectándolos con sus nuevas vistas
admin.site.register(Piso, PisoAdmin)
admin.site.register(Sala, SalaAdmin)
admin.site.register(Profesor, ProfesorAdmin)


admin.site.register(Reporte)
admin.site.register(BloqueHorario)