from django.contrib import admin
from .models import Piso, Sala, Profesor, Reporte, BloqueHorario, Nodo, Arista

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

# Personalizamos la vista de Nodos del grafo del piso.
# Permite ver sus coordenadas y editar su posición directamente en la lista.
class NodoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'piso', 'x', 'y')
    list_filter = ('piso',)
    list_editable = ('x', 'y')
    search_fields = ('nombre',)

# Personalizamos la vista de Aristas del grafo.
# Permite consultar las conexiones entre nodos y filtrar por piso de origen.
class AristaAdmin(admin.ModelAdmin):
    list_display = ('origen', 'destino')
    list_filter = ('origen__piso',)

# Registramos los modelos con sus respectivas vistas personalizadas en el administrador.
admin.site.register(Piso, PisoAdmin)
admin.site.register(Sala, SalaAdmin)
admin.site.register(Profesor, ProfesorAdmin)

# Registramos los modelos sin una vista personalizada.
admin.site.register(Reporte)
admin.site.register(BloqueHorario)

admin.site.register(Nodo, NodoAdmin)
admin.site.register(Arista, AristaAdmin)