"""
Servicio de dominio para la gestión de reportes comunitarios en el mapa.
"""
from django.utils import timezone

from core.models import Reporte


class ReporteError(Exception):
    """Excepción base de dominio para operaciones sobre reportes."""


class ReporteDuplicadoError(ReporteError):
    """Se lanza al intentar crear un reporte cuando ya existe uno activo del mismo tipo en la sala."""

    def __init__(self, mensaje, reporte_existente=None):
        super().__init__(mensaje)
        self.reporte_existente = reporte_existente


class ReporteInvalidoError(ReporteError):
    """Se lanza cuando los datos del reporte son inválidos o su estado no permite la operación."""


class ReportePermisoError(ReporteError):
    """Se lanza cuando el usuario no tiene permisos para modificar o cerrar el reporte."""


def expirar_reportes_vencidos(piso=None, sala=None):
    """
    Marca como EXPIRADO todo reporte ACTIVO cuya fecha `expira_en` ya se haya cumplido.
    Retorna la cantidad de reportes actualizados.
    """
    qs = Reporte.objects.filter(estado='ACTIVO', expira_en__lte=timezone.now())
    if sala is not None:
        qs = qs.filter(sala=sala)
    elif piso is not None:
        qs = qs.filter(sala__piso=piso)
    return qs.update(estado='EXPIRADO')


def serializar_reporte(reporte, usuario=None, confirmados_ids=None):
    """Convierte una instancia de Reporte en un diccionario listo para respuestas JSON."""
    ahora = timezone.now()
    tiempo_restante_min = 0
    if reporte.expira_en and reporte.estado == 'ACTIVO':
        segundos_restantes = (reporte.expira_en - ahora).total_seconds()
        tiempo_restante_min = max(0, int(segundos_restantes // 60))

    hace_min = 0
    if reporte.fecha:
        hace_min = max(0, int((ahora - reporte.fecha).total_seconds() // 60))

    es_autor = bool(
        usuario
        and getattr(usuario, 'is_authenticated', False)
        and reporte.autor_id is not None
        and reporte.autor_id == usuario.id
    )

    return {
        'id': reporte.id,
        'sala_id': reporte.sala_id,
        'sala_nombre': reporte.sala.nombre,
        'tipo': reporte.tipo,
        'tipo_display': reporte.get_tipo_display(),
        'descripcion': reporte.descripcion,
        'estado': reporte.estado,
        'estado_display': reporte.get_estado_display(),
        'fecha': reporte.fecha.isoformat() if reporte.fecha else None,
        'expira_en': reporte.expira_en.isoformat() if reporte.expira_en else None,
        'hace_min': hace_min,
        'tiempo_restante_min': tiempo_restante_min,
        'confirmaciones': reporte.confirmaciones,
        'ya_confirmado': bool(confirmados_ids and reporte.id in confirmados_ids),
        'es_autor': es_autor,
    }


def crear_reporte(sala, tipo, descripcion='', usuario=None):
    """
    Crea un nuevo reporte activo validando su categoría y bloqueando duplicados vigentes
    del mismo tipo en el mismo espacio.
    """
    tipos_validos = dict(Reporte.TIPO)
    if tipo not in tipos_validos:
        raise ReporteInvalidoError("La categoría de reporte seleccionada no es válida.")

    texto = (descripcion or '').strip()
    if len(texto) > 500:
        raise ReporteInvalidoError("La descripción no puede superar los 500 caracteres.")
    if tipo == 'otro' and not texto:
        raise ReporteInvalidoError("Describe el problema al elegir «Otro inconveniente».")

    expirar_reportes_vencidos(sala=sala)

    existente = (
        Reporte.objects.filter(
            sala=sala,
            tipo=tipo,
            estado='ACTIVO',
            expira_en__gt=timezone.now(),
        )
        .select_related('sala')
        .first()
    )
    if existente is not None:
        raise ReporteDuplicadoError(
            f"Ya existe un reporte activo de «{existente.get_tipo_display()}» en {sala.nombre}.",
            reporte_existente=existente,
        )

    autor = usuario if (usuario and getattr(usuario, 'is_authenticated', False)) else None

    return Reporte.objects.create(
        sala=sala,
        autor=autor,
        tipo=tipo,
        descripcion=texto,
        confirmaciones=1,
    )


def confirmar_reporte(reporte, usuario=None, ya_confirmado=False):
    """
    Incrementa las confirmaciones ('Sigue ahí') de un reporte activo
    y renueva su ventana de expiración.
    """
    expirar_reportes_vencidos(sala=reporte.sala)
    reporte.refresh_from_db()

    if reporte.estado != 'ACTIVO':
        raise ReporteInvalidoError("Este reporte ya expiró o no se encuentra activo.")

    if (
        usuario
        and getattr(usuario, 'is_authenticated', False)
        and reporte.autor_id is not None
        and reporte.autor_id == usuario.id
    ):
        raise ReporteInvalidoError("No puedes confirmar tu propio reporte.")

    if ya_confirmado:
        raise ReporteInvalidoError("Ya confirmaste este reporte anteriormente.")

    reporte.confirmaciones += 1
    nueva_expiracion = reporte.calcular_expiracion(desde=timezone.now())
    if not reporte.expira_en or nueva_expiracion > reporte.expira_en:
        reporte.expira_en = nueva_expiracion

    reporte.save(update_fields=['confirmaciones', 'expira_en'])
    return reporte


def cerrar_reporte(reporte, usuario):
    """Marca un reporte activo como resuelto cuando lo solicita el usuario que lo creó."""
    expirar_reportes_vencidos(sala=reporte.sala)
    reporte.refresh_from_db()

    if reporte.estado != 'ACTIVO':
        raise ReporteInvalidoError("Este reporte ya expiró o fue cerrado anteriormente.")

    if (
        not usuario
        or not getattr(usuario, 'is_authenticated', False)
        or reporte.autor_id is None
        or reporte.autor_id != usuario.id
    ):
        raise ReportePermisoError("Solo quien creó el reporte puede cerrarlo antes de su expiración.")

    reporte.estado = 'RESUELTO'
    reporte.save(update_fields=['estado'])
    return reporte
