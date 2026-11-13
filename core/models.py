"""
Modelos de datos principales del Mapa Interactivo DCC.
"""
import math
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Usuario del sistema con rol institucional dentro del DCC."""

    ROLES = [
        ('PROFESOR', 'Profesor'),
        ('ESTUDIANTE', 'Estudiante'),
        ('AUXILIAR', 'Auxiliar de aseo'),
    ]
    nombre = models.CharField(max_length=30)
    rol = models.CharField(max_length=20, choices=ROLES)

    def __str__(self):
        return f"{self.username} ({self.get_rol_display()})"


class Piso(models.Model):
    """Representa un nivel dentro de un edificio del campus y las dimensiones de su lienzo SVG."""

    edificio = models.CharField(max_length=50)
    numero = models.IntegerField()
    ancho = models.FloatField()
    alto = models.FloatField()

    class Meta:
        unique_together = ('edificio', 'numero')

    def __str__(self):
        return f"{self.edificio} - Piso {self.numero}"


class Sala(models.Model):
    """Representa un espacio físico (sala, oficina, laboratorio, baño o escalera) dentro de un piso."""

    TIPO = [
        ('sala', 'Sala'),
        ('oficina', 'Oficina'),
        ('lab', 'Laboratorio'),
        ('bano', 'Baño'),
        ('escalera', 'Escalera'),
        ('conexion', 'Conexión'),
        ('otro', 'Otro'),
    ]
    nombre = models.CharField(max_length=80)
    piso = models.ForeignKey(Piso, on_delete=models.CASCADE, related_name='salas')
    edificio = models.CharField(max_length=50)
    tipo = models.CharField(max_length=20, choices=TIPO, default='sala')

    # Coordenadas geométricas para dibujar el rectángulo en el plano SVG
    x = models.FloatField(null=True, blank=True)
    y = models.FloatField(null=True, blank=True)
    ancho = models.FloatField(null=True, blank=True)
    alto = models.FloatField(null=True, blank=True)

    # Nodo de acceso (puerta) asociado en el grafo de navegación
    nodo = models.ForeignKey(
        'Nodo', on_delete=models.SET_NULL, null=True, blank=True, related_name='salas'
    )

    class Meta:
        unique_together = ('piso', 'nombre')

    def save(self, *args, **kwargs):
        if not self.edificio and self.piso_id:
            self.edificio = self.piso.edificio
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre


class Profesor(models.Model):
    """Representa a un académico o docente del DCC y su oficina asignada."""

    nombre = models.CharField(max_length=150)
    oficina = models.ForeignKey(
        Sala,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='profesores',
    )
    jornada = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre


class Reporte(models.Model):
    """Representa un reporte comunitario de estado o incidencia asociado a una sala o baño."""

    sala = models.ForeignKey(Sala, on_delete=models.CASCADE)
    descripcion = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, default="Pendiente")

    def __str__(self):
        return f"Reporte en {self.sala.nombre} - {self.estado}"


class BloqueHorario(models.Model):
    """Representa un bloque semanal de horario de atención para un profesor."""

    profesor = models.ForeignKey(Profesor, on_delete=models.CASCADE)
    dia_semana = models.CharField(max_length=20)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    def __str__(self):
        return f"{self.profesor.nombre} - {self.dia_semana}"


class Nodo(models.Model):
    """Representa un punto de paso (puerta o intersección de pasillo) en el grafo de un piso."""

    piso = models.ForeignKey(Piso, on_delete=models.CASCADE, related_name='nodos')
    nombre = models.CharField(max_length=60)
    x = models.FloatField()
    y = models.FloatField()

    class Meta:
        unique_together = ('piso', 'nombre')

    def __str__(self):
        return f"{self.nombre} ({self.piso})"


class Arista(models.Model):
    """Representa un tramo transitable entre dos nodos del grafo."""

    origen = models.ForeignKey(Nodo, on_delete=models.CASCADE, related_name='salientes')
    destino = models.ForeignKey(Nodo, on_delete=models.CASCADE, related_name='entrantes')

    class Meta:
        unique_together = ('origen', 'destino')

    @property
    def peso(self):
        """Calcula la distancia euclidiana entre el nodo de origen y el de destino."""
        return math.dist((self.origen.x, self.origen.y), (self.destino.x, self.destino.y))


class LugarFavorito(models.Model):
    """Representa una sala guardada como favorita por un usuario."""
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lugares_favoritos')
    sala = models.ForeignKey(Sala, on_delete=models.CASCADE, related_name='favoritos')
    fecha_agregado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('usuario', 'sala')
        ordering = ['-fecha_agregado']
        verbose_name = 'Lugar favorito'
        verbose_name_plural = 'Lugares favoritos'

    def __str__(self):
        return f"{self.usuario.username} → {self.sala.nombre}"