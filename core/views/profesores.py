"""Vista del perfil de un profesor y gestión de sus bloques de horario."""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from core.forms import BloqueHorarioForm
from core.models import BloqueHorario, Profesor, ProfesorFavorito
from core.services.rutas import _normalizar

ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
DIAS_HABILES = [
    ('lunes', 'Lunes'),
    ('martes', 'Martes'),
    ('miercoles', 'Miércoles'),
    ('jueves', 'Jueves'),
    ('viernes', 'Viernes'),
]


def _indice_dia(dia):
    clave = _normalizar(dia)
    return ORDEN_DIAS.index(clave) if clave in ORDEN_DIAS else len(ORDEN_DIAS)


def _es_dueno_perfil(user, profesor):
    return (
        user.is_authenticated
        and getattr(user, 'rol', None) == 'PROFESOR'
        and profesor.user_id == user.id
    )


def perfil_profesor(request, profesor_id):
    """Muestra oficina, contacto y horarios de atención de un profesor."""
    profesor = get_object_or_404(
        Profesor.objects.select_related('oficina__piso'), pk=profesor_id
    )
    es_dueno = _es_dueno_perfil(request.user, profesor)

    ahora = timezone.localtime()
    dia_hoy = ORDEN_DIAS[ahora.weekday()]
    disponible_ahora = False

    bloques = sorted(
        profesor.bloques_horario.all(),
        key=lambda b: (_indice_dia(b.dia_semana), b.hora_inicio),
    )

    if es_dueno:
        # Mostramos los 5 días hábiles para que el profesor vea qué días tiene libres u ocupados
        dias_map = {
            clave: {
                'clave': clave,
                'nombre': nombre,
                'es_hoy': clave == dia_hoy,
                'bloques': [],
            }
            for clave, nombre in DIAS_HABILES
        }
        for b in bloques:
            clave = _normalizar(b.dia_semana)
            if clave not in dias_map:
                dias_map[clave] = {
                    'clave': clave,
                    'nombre': b.dia_semana.strip().capitalize(),
                    'es_hoy': clave == dia_hoy,
                    'bloques': [],
                }
            dias_map[clave]['bloques'].append(b)
            if clave == dia_hoy and b.hora_inicio <= ahora.time() <= b.hora_fin:
                disponible_ahora = True
        dias = list(dias_map.values())
    else:
        dias = []
        for b in bloques:
            clave = _normalizar(b.dia_semana)
            if not dias or dias[-1]['clave'] != clave:
                dias.append({
                    'clave': clave,
                    'nombre': b.dia_semana.strip().capitalize(),
                    'es_hoy': clave == dia_hoy,
                    'bloques': [],
                })
            dias[-1]['bloques'].append(b)
            if clave == dia_hoy and b.hora_inicio <= ahora.time() <= b.hora_fin:
                disponible_ahora = True

    partes = profesor.nombre.split()
    iniciales = ''.join(p[0] for p in partes[:2]).upper() or '?'
    es_favorito = request.user.is_authenticated and ProfesorFavorito.objects.filter(
        usuario=request.user, profesor=profesor,
    ).exists()

    return render(request, 'profesor.html', {
        'profesor': profesor,
        'oficina': profesor.oficina,
        'dias': dias,
        'disponible_ahora': disponible_ahora,
        'iniciales': iniciales,
        'es_favorito': es_favorito,
        'es_dueno': es_dueno,
        'form_bloque': BloqueHorarioForm() if es_dueno else None,
    })


@login_required
@require_POST
def agregar_bloque_horario(request, profesor_id):
    """Agrega un bloque semanal de atención al perfil del profesor autenticado."""
    profesor = get_object_or_404(Profesor, pk=profesor_id)
    if not _es_dueno_perfil(request.user, profesor):
        messages.error(request, 'No tienes permisos para editar este horario.')
        return redirect('core:perfil_profesor', profesor_id=profesor.id)

    form = BloqueHorarioForm(request.POST, profesor=profesor)
    if form.is_valid():
        bloque = form.save(commit=False)
        bloque.profesor = profesor
        bloque.save()
        messages.success(request, f'Bloque agregado el {bloque.dia_semana}.')
    else:
        for error in form.non_field_errors():
            messages.error(request, error)
        for field_errors in form.errors.values():
            for error in field_errors:
                if error not in form.non_field_errors():
                    messages.error(request, error)

    return redirect('core:perfil_profesor', profesor_id=profesor.id)


@login_required
@require_POST
def eliminar_bloque_horario(request, profesor_id, bloque_id):
    """Elimina un bloque de atención del perfil del profesor autenticado."""
    profesor = get_object_or_404(Profesor, pk=profesor_id)
    if not _es_dueno_perfil(request.user, profesor):
        messages.error(request, 'No tienes permisos para editar este horario.')
        return redirect('core:perfil_profesor', profesor_id=profesor.id)

    bloque = get_object_or_404(BloqueHorario, pk=bloque_id, profesor=profesor)
    bloque.delete()
    messages.success(request, 'Bloque horario eliminado.')
    return redirect('core:perfil_profesor', profesor_id=profesor.id)