"""Vista del perfil de un profesor."""
from django.shortcuts import get_object_or_404, render
from django.utils import timezone

from core.models import Profesor
from core.services.rutas import _normalizar

ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']


def _indice_dia(dia):
    clave = _normalizar(dia)
    return ORDEN_DIAS.index(clave) if clave in ORDEN_DIAS else len(ORDEN_DIAS)


def perfil_profesor(request, profesor_id):
    """Muestra oficina, contacto y horarios de atención de un profesor."""
    profesor = get_object_or_404(
        Profesor.objects.select_related('oficina__piso'), pk=profesor_id
    )

    ahora = timezone.localtime()
    dia_hoy = ORDEN_DIAS[ahora.weekday()]
    disponible_ahora = False

    bloques = sorted(
        profesor.bloquehorario_set.all(),
        key=lambda b: (_indice_dia(b.dia_semana), b.hora_inicio),
    )
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

    return render(request, 'profesor.html', {
        'profesor': profesor,
        'oficina': profesor.oficina,
        'dias': dias,
        'disponible_ahora': disponible_ahora,
        'iniciales': iniciales,
    })