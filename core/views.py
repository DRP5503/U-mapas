from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
 
from .models import Piso
 

def index(request):
    """Renderiza la vista general de la aplicación."""
    return render(request, 'core/index.html')

def pisos_edificio(request, edificio):
    pisos = Piso.objects.filter(edificio__iexact=edificio).order_by('-numero')
    return JsonResponse({'pisos': [p.numero for p in pisos]})


def piso_json(request, edificio, numero):
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