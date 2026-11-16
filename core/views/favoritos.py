"""Vistas de favoritos de profesores y lugares (salas) del usuario."""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods, require_POST

from core.forms import ProfesorFavoritoForm
from core.models import LugarFavorito, Profesor, ProfesorFavorito, Sala


@login_required
@require_http_methods(['GET', 'HEAD', 'POST'])
def mis_lugares_favoritos(request):
    """Muestra ambos tipos de favoritos y permite guardar un profesor."""
    form = ProfesorFavoritoForm(request.POST if request.method == 'POST' else None)
    if request.method == 'POST' and form.is_valid():
        profesor = form.cleaned_data['profesor']
        ProfesorFavorito.objects.get_or_create(usuario=request.user, profesor=profesor)
        messages.success(request, f'{profesor.nombre} está en tus favoritos.')
        return redirect('core:mis_lugares_favoritos')

    favoritos = LugarFavorito.objects.filter(usuario=request.user).select_related('sala', 'sala__piso')
    profesores_favoritos = ProfesorFavorito.objects.filter(usuario=request.user).select_related(
        'profesor__oficina__piso',
    ).order_by('profesor__nombre', 'profesor_id')
    return render(request, 'favoritos.html', {
        'favoritos': favoritos,
        'profesores_favoritos': profesores_favoritos,
        'form': form,
    })


@login_required
@require_POST
def guardar_profesor_favorito(request, profesor_id):
    """Guarda un profesor desde su perfil, incluso ante solicitudes repetidas."""
    profesor = get_object_or_404(Profesor, pk=profesor_id)
    ProfesorFavorito.objects.get_or_create(usuario=request.user, profesor=profesor)
    messages.success(request, f'{profesor.nombre} está en tus favoritos.')
    return redirect('core:perfil_profesor', profesor_id=profesor_id)


@login_required
@require_POST
def quitar_favorito(request, profesor_id):
    """Quita el profesor solo de la lista de la cuenta activa."""
    ProfesorFavorito.objects.filter(usuario=request.user, profesor_id=profesor_id).delete()
    messages.success(request, 'El profesor se quitó de tus favoritos.')
    if request.POST.get('desde') == 'perfil':
        return redirect('core:perfil_profesor', profesor_id=profesor_id)
    return redirect('core:mis_lugares_favoritos')


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
