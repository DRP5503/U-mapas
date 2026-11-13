"""Vistas de favoritos: lugares (salas) del usuario."""
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render

from core.models import LugarFavorito, Sala


@login_required
def mis_lugares_favoritos(request):
    """Muestra la página con los lugares favoritos del usuario."""
    favoritos = LugarFavorito.objects.filter(usuario=request.user).select_related('sala', 'sala__piso')
    return render(request, 'favoritos.html', {'favoritos': favoritos})


@login_required
def toggle_favorito(request, sala_id):
    """Agrega o quita una sala de favoritos (vía AJAX)."""
    if request.method == 'POST':
        sala = get_object_or_404(Sala, id=sala_id)
        favorito, creado = LugarFavorito.objects.get_or_create(usuario=request.user, sala=sala)
        if not creado:
            favorito.delete()
            return JsonResponse({'favorito': False, 'sala': sala.nombre})
        return JsonResponse({'favorito': True, 'sala': sala.nombre})
    return JsonResponse({'error': 'Método no permitido'}, status=405)


@login_required
def estado_favorito(request, sala_id):
    """Indica si una sala está en los favoritos del usuario."""
    sala = get_object_or_404(Sala, id=sala_id)
    es_favorito = LugarFavorito.objects.filter(usuario=request.user, sala=sala).exists()
    return JsonResponse({'favorito': es_favorito})