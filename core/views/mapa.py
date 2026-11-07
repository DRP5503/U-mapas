"""
Vistas y endpoints JSON asociados a la visualización del mapa, pisos y rutas.
"""
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render

from core.models import Nodo, Piso, Sala
from core.services.rutas import calcular_ruta_nodos


def index(request):
    """Renderiza la vista general interactiva de la aplicación."""
    return render(request, 'core/index.html')


def pisos_edificio(request, edificio):
    """Devuelve en JSON la lista de números de piso disponibles para un edificio."""
    pisos = Piso.objects.filter(edificio__iexact=edificio).order_by('-numero')
    return JsonResponse({'pisos': [p.numero for p in pisos]})


def piso_json(request, edificio, numero):
    """Devuelve en JSON las dimensiones de un piso, sus salas con geometría y profesores."""
    piso = get_object_or_404(Piso, edificio__iexact=edificio, numero=numero)
    salas = piso.salas.prefetch_related('profesores')
    return JsonResponse({
        'edificio': piso.edificio,
        'numero': piso.numero,
        'ancho': piso.ancho,
        'alto': piso.alto,
        'salas': [
            {
                'nombre': s.nombre,
                'tipo': s.tipo,
                'x': s.x,
                'y': s.y,
                'ancho': s.ancho,
                'alto': s.alto,
                'profesores': [p.nombre for p in s.profesores.all()],
            }
            for s in salas
        ],
    })


def _respuesta_ruta(piso, nodo_origen, nodo_destino):
    """Calcula la ruta entre dos nodos y retorna el JsonResponse correspondiente."""
    resultado = calcular_ruta_nodos(piso, nodo_origen, nodo_destino)
    if resultado is None:
        return JsonResponse({'error': 'No hay camino entre esos puntos'}, status=404)
    return JsonResponse(resultado)


def ruta_nodos(request, edificio, numero, desde, hasta):
    """Calcula y retorna en JSON la ruta más corta entre dos nodos buscados por nombre."""
    piso = get_object_or_404(Piso, edificio__iexact=edificio, numero=numero)
    nodo_a = get_object_or_404(Nodo, piso=piso, nombre__iexact=desde)
    nodo_b = get_object_or_404(Nodo, piso=piso, nombre__iexact=hasta)
    return _respuesta_ruta(piso, nodo_a, nodo_b)


def ruta_json(request, edificio, numero, desde, hasta):
    """Calcula y retorna en JSON la ruta más corta entre dos salas del mismo piso."""
    piso = get_object_or_404(Piso, edificio__iexact=edificio, numero=numero)
    sala_a = get_object_or_404(Sala, piso=piso, nombre__iexact=desde)
    sala_b = get_object_or_404(Sala, piso=piso, nombre__iexact=hasta)
    if sala_a.nodo is None or sala_b.nodo is None:
        return JsonResponse({'error': 'Una de las salas no tiene nodo asignado'}, status=400)
    return _respuesta_ruta(piso, sala_a.nodo, sala_b.nodo)
