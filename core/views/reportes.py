"""
Endpoints JSON para la creación, consulta, confirmación y cierre de reportes.
"""
import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_POST

from core.models import Reporte, Sala
from core.services.reportes import (
    ReporteDuplicadoError,
    ReporteInvalidoError,
    ReportePermisoError,
    cerrar_reporte,
    confirmar_reporte,
    crear_reporte,
    expirar_reportes_vencidos,
    serializar_reporte,
)


def _extraer_payload(request):
    """Extrae datos enviados como JSON o como formulario estándar."""
    if request.content_type and 'application/json' in request.content_type:
        try:
            return json.loads(request.body.decode('utf-8') or '{}')
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None
    return request.POST


def _obtener_confirmados_sesion(request):
    """Retorna el conjunto de IDs de reportes ya confirmados en la sesión actual."""
    return set(request.session.get('reportes_confirmados', []))


def _registrar_confirmado_sesion(request, reporte_id):
    """Guarda el ID del reporte en la sesión para evitar múltiples confirmaciones del mismo usuario."""
    confirmados = list(_obtener_confirmados_sesion(request))
    if reporte_id not in confirmados:
        confirmados.append(reporte_id)
        request.session['reportes_confirmados'] = confirmados
        request.session.modified = True


@require_POST
def crear_reporte_view(request):
    """Crea un nuevo reporte en una sala o baño, validando duplicados activos."""
    if not request.user.is_authenticated:
        return JsonResponse(
            {'error': 'Debes iniciar sesión para publicar un reporte.'},
            status=401,
        )

    payload = _extraer_payload(request)
    if payload is None:
        return JsonResponse({'error': 'Formato JSON inválido.'}, status=400)

    sala_id = payload.get('sala_id')
    tipo = (payload.get('tipo') or '').strip()
    descripcion = payload.get('descripcion') or ''

    if not sala_id:
        return JsonResponse({'error': 'Debes indicar el espacio o sala a reportar.'}, status=400)

    sala = get_object_or_404(Sala, pk=sala_id)

    try:
        reporte = crear_reporte(
            sala=sala,
            tipo=tipo,
            descripcion=descripcion,
            usuario=request.user,
        )
    except ReporteDuplicadoError as exc:
        confirmados_ids = _obtener_confirmados_sesion(request)
        return JsonResponse(
            {
                'error': str(exc),
                'codigo': 'REPORTE_DUPLICADO',
                'reporte_existente': serializar_reporte(
                    exc.reporte_existente,
                    usuario=request.user,
                    confirmados_ids=confirmados_ids,
                ),
            },
            status=409,
        )
    except ReporteInvalidoError as exc:
        return JsonResponse({'error': str(exc)}, status=400)

    confirmados_ids = _obtener_confirmados_sesion(request)

    return JsonResponse(
        {
            'mensaje': 'Reporte publicado correctamente.',
            'reporte': serializar_reporte(
                reporte,
                usuario=request.user,
                confirmados_ids=confirmados_ids,
            ),
        },
        status=201,
    )


@require_GET
def detalle_reporte_view(request, reporte_id):
    """Devuelve en JSON el detalle completo de un reporte específico."""
    reporte = get_object_or_404(Reporte.objects.select_related('sala', 'autor'), pk=reporte_id)
    expirar_reportes_vencidos(sala=reporte.sala)
    reporte.refresh_from_db()
    confirmados_ids = _obtener_confirmados_sesion(request)
    return JsonResponse(
        {
            'reporte': serializar_reporte(
                reporte,
                usuario=request.user,
                confirmados_ids=confirmados_ids,
            )
        }
    )


@require_POST
def confirmar_reporte_view(request, reporte_id):
    """Confirma que un reporte activo sigue ocurriendo ('Sigue ahí') y extiende su expiración."""
    if not request.user.is_authenticated:
        return JsonResponse(
            {'error': 'Debes iniciar sesión para confirmar un reporte.'},
            status=401,
        )

    reporte = get_object_or_404(Reporte.objects.select_related('sala', 'autor'), pk=reporte_id)
    confirmados_ids = _obtener_confirmados_sesion(request)
    ya_confirmado = reporte.id in confirmados_ids

    try:
        reporte = confirmar_reporte(
            reporte,
            usuario=request.user,
            ya_confirmado=ya_confirmado,
        )
    except ReporteInvalidoError as exc:
        return JsonResponse({'error': str(exc)}, status=400)

    _registrar_confirmado_sesion(request, reporte.id)
    confirmados_ids = _obtener_confirmados_sesion(request)

    return JsonResponse(
        {
            'mensaje': 'Confirmación registrada. Se renovó la vigencia del reporte.',
            'reporte': serializar_reporte(
                reporte,
                usuario=request.user,
                confirmados_ids=confirmados_ids,
            ),
        }
    )


@require_POST
def cerrar_reporte_view(request, reporte_id):
    """Cierra un reporte activo cuando lo solicita el usuario que lo creó."""
    if not request.user.is_authenticated:
        return JsonResponse(
            {'error': 'Debes iniciar sesión para cerrar un reporte.'},
            status=401,
        )

    reporte = get_object_or_404(Reporte.objects.select_related('sala', 'autor'), pk=reporte_id)

    try:
        reporte = cerrar_reporte(reporte, usuario=request.user)
    except ReportePermisoError as exc:
        return JsonResponse({'error': str(exc)}, status=403)
    except ReporteInvalidoError as exc:
        return JsonResponse({'error': str(exc)}, status=400)

    confirmados_ids = _obtener_confirmados_sesion(request)
    return JsonResponse(
        {
            'mensaje': 'Reporte cerrado correctamente.',
            'reporte': serializar_reporte(
                reporte,
                usuario=request.user,
                confirmados_ids=confirmados_ids,
            ),
        }
    )
