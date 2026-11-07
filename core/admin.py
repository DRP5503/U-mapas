"""
Configuración del panel administrativo de Django para los modelos de core.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Arista, BloqueHorario, Nodo, Piso, Profesor, Reporte, Sala, User


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'nombre', 'email', 'rol', 'is_staff')
    list_filter = ('rol', 'is_staff')


class PisoAdmin(admin.ModelAdmin):
    list_display = ('edificio', 'numero', 'ancho', 'alto')
    list_filter = ('edificio',)


class SalaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'piso', 'tipo', 'x', 'y', 'ancho', 'alto')
    list_filter = ('piso__edificio', 'piso__numero', 'tipo')
    search_fields = ('nombre',)
    list_editable = ('tipo', 'x', 'y', 'ancho', 'alto')


class ProfesorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'oficina', 'jornada')
    list_filter = ('jornada',)
    search_fields = ('nombre',)


class NodoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'piso', 'x', 'y')
    list_filter = ('piso',)
    list_editable = ('x', 'y')
    search_fields = ('nombre',)


class AristaAdmin(admin.ModelAdmin):
    list_display = ('origen', 'destino')
    list_filter = ('origen__piso',)


admin.site.register(User, CustomUserAdmin)
admin.site.register(Piso, PisoAdmin)
admin.site.register(Sala, SalaAdmin)
admin.site.register(Profesor, ProfesorAdmin)
admin.site.register(Reporte)
admin.site.register(BloqueHorario)
admin.site.register(Nodo, NodoAdmin)
admin.site.register(Arista, AristaAdmin)
