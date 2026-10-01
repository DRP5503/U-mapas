from django.contrib import admin
from .models import Sala, Profesor, Reporte, BloqueHorario

# Personalizamos la vista de Salas
class SalaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'piso', 'edificio') # Vemos las 3 columnas
    list_filter = ('edificio', 'piso') # Crea un panel lateral para filtrar fácilmente
    search_fields = ('nombre',) # Barra de búsqueda por nombre de sala

# Personalizamos la vista de Profesores
class ProfesorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'oficina', 'jornada') # Vemos las 3 columnas
    list_filter = ('jornada',) # Panel lateral para filtrar por Completa, Parcial o Externo
    search_fields = ('nombre',) # Barra de búsqueda por nombre del profe

# Registramos los modelos conectándolos con sus nuevas vistas
admin.site.register(Sala, SalaAdmin)
admin.site.register(Profesor, ProfesorAdmin)


admin.site.register(Reporte)
admin.site.register(BloqueHorario)