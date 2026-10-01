from django.db import models

class Sala(models.Model):
    nombre = models.CharField(max_length=10, primary_key=True)
    piso = models.IntegerField()
    edificio = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre

class Profesor(models.Model):
    nombre = models.CharField(max_length=150)
    oficina = models.ForeignKey(Sala, on_delete=models.SET_NULL, null=True, blank=True)
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