"""
Vistas y endpoints JSON asociados a la visualización del mapa, pisos y rutas.
"""
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render

from core.models import LugarFavorito, Nodo, Piso, Sala
from core.services.rutas import calcular_ruta, calcular_ruta_nodos


def index(request):
    """Renderiza la vista general interactiva de la aplicación."""
    return render(request, 'index.html')


def pisos_edificio(request, edificio):
    """Devuelve en JSON la lista de números de piso disponibles para un edificio."""
    pisos = Piso.objects.filter(edificio__iexact=edificio).order_by('-numero')
    return JsonResponse({'pisos': [p.numero for p in pisos]})


def piso_json(request, edificio, numero):
    """Devuelve en JSON las dimensiones de un piso, sus salas con geometría y profesores."""
    piso = get_object_or_404(Piso, edificio__iexact=edificio, numero=numero)
    salas = piso.salas.select_related('nodo').prefetch_related('profesores')
    # Ids de las salas de este piso que el usuario tiene en favoritos (así el panel no necesita
    # consultar el estado sala por sala al abrirse).
    favoritos = set()
    if request.user.is_authenticated:
        favoritos = set(
            LugarFavorito.objects.filter(usuario=request.user, sala__piso=piso)
            .values_list('sala_id', flat=True)
        )
    return JsonResponse({
        'edificio': piso.edificio,
        'numero': piso.numero,
        'ancho': piso.ancho,
        'alto': piso.alto,
        'salas': [
            {
                'id': s.id,
                'nombre': s.nombre,
                'tipo': s.tipo,
                'x': s.x,
                'y': s.y,
                'ancho': s.ancho,
                'alto': s.alto,
                'nodo': {'x': s.nodo.x, 'y': s.nodo.y} if s.nodo else None,
                'favorito': s.id in favoritos,
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


def ruta_salas(request, desde_id, hasta_id):
    """Calcula la ruta entre dos salas (por id) aunque estén en pisos o edificios distintos."""
    sala_a = get_object_or_404(Sala, id=desde_id)
    sala_b = get_object_or_404(Sala, id=hasta_id)
    if sala_a.nodo is None or sala_b.nodo is None:
        return JsonResponse({'error': 'Una de las salas no tiene nodo asignado'}, status=400)
    resultado = calcular_ruta(sala_a, sala_b)
    if resultado is None:
        return JsonResponse({'error': 'No hay camino entre esos puntos'}, status=404)
    return JsonResponse(resultado)
