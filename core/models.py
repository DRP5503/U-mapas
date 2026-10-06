from django.db import models

class Piso(models.Model):
    edificio = models.CharField(max_length=50)
    numero = models.IntegerField()
    ancho = models.FloatField()
    alto = models.FloatField()
    # Para evitar que hayan pisos repetidos se ocupa lo siguiente.
    class Meta:
        unique_together = ('edificio', 'numero')

    def __str__(self):
        return f"{self.edificio} - Piso {self.numero}"

class Sala(models.Model):
    TIPO = [
        ('sala', 'Sala'),
        ('oficina', 'Oficina'),
        ('lab', 'Laboratorio'),
        ('bano', 'Baño'),
        ('escalera', 'Escalera'),
        ('otro', 'Otro'),
    ]
    nombre = models.CharField(max_length=10, primary_key=True)
    piso = models.ForeignKey(Piso, on_delete=models.CASCADE, related_name='salas')
    edificio = models.CharField(max_length=50)

    # para colorear/filtrar en el mapa.
    tipo = models.CharField(max_length=20, choices=TIPO, default='sala')

    # coordenadas para el mapa
    x = models.FloatField(null=True, blank=True)
    y = models.FloatField(null=True, blank=True)
    ancho = models.FloatField(null=True, blank=True)
    alto = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ('piso', 'nombre')

    def __str__(self):
        return self.nombre

class Profesor(models.Model):
    nombre = models.CharField(max_length=150)
    # related_name='profesores': permite sala.profesores.all(),
    # que usa la vista JSON para mostrar quién está en cada sala.
    oficina = models.ForeignKey(
        Sala, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='profesores',
    )
    jornada = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre

class Reporte(models.Model):
    sala = models.ForeignKey(Sala, on_delete=models.CASCADE)
    descripcion = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, default="Pendiente")

    def __str__(self):
        return f"Reporte en {self.sala.nombre} - {self.estado}"

class BloqueHorario(models.Model):
    profesor = models.ForeignKey(Profesor, on_delete=models.CASCADE)
    dia_semana = models.CharField(max_length=20)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    def __str__(self):
        return f"{self.profesor.nombre} - {self.dia_semana}"