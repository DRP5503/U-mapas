import csv
import os
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings
from core.models import Sala, Profesor

class Command(BaseCommand):
    help = 'Carga los datos de salas y profesores desde los archivos CSV'

    def handle(self, *args, **kwargs):
        # 1. Definir las rutas a los archivos (asumiendo que están en la carpeta principal)
        # Si los moviste a data/raw/, cambia los nombres aquí
        ruta_salas = os.path.join(settings.BASE_DIR, 'data', 'raw', 'Salas-DCC.csv')
        ruta_profes = os.path.join(settings.BASE_DIR, 'data', 'raw', 'Profesores.csv')

        # 2. Cargar Salas reutilizando importar_salas (crea los Piso y la Sala)
        self.stdout.write("Cargando Salas...")
        call_command('importar_salas', ruta_salas)
        self.stdout.write(self.style.SUCCESS("¡Salas cargadas con éxito!"))

        # 3. Cargar Profesores
        self.stdout.write("Cargando Profesores...")
        with open(ruta_profes, encoding='utf-8') as archivo:
            lector = csv.reader(archivo)
            next(lector) # Saltar encabezados
            for fila in lector:
                # fila[0] = nombre, fila[1] = oficina, fila[2] = jornada
                nombre_profe = fila[0].strip()
                oficina_texto = fila[1].strip() if fila[1] else None
                jornada_profe = fila[2].strip()

                # Buscar la sala en la base de datos si es que tiene una asignada
                sala_asignada = None
                if oficina_texto:
                    try:
                        sala_asignada = Sala.objects.get(nombre=oficina_texto)
                    except Sala.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f"Ojo: La sala {oficina_texto} no existe para el profe {nombre_profe}"))

                # Crear o actualizar el profesor
                Profesor.objects.get_or_create(
                    nombre=nombre_profe,
                    defaults={
                        'oficina': sala_asignada,
                        'jornada': jornada_profe
                    }
                )
        self.stdout.write(self.style.SUCCESS("¡Profesores cargados con éxito!"))

        # 4. Cargar grafo de nodos y aristas (si existen los CSV)
        ruta_nodos = os.path.join(settings.BASE_DIR, 'data', 'raw', 'Nodo.csv')
        ruta_aristas = os.path.join(settings.BASE_DIR, 'data', 'raw', 'Arista.csv')
        if os.path.exists(ruta_nodos) and os.path.exists(ruta_aristas):
            self.stdout.write("Cargando y vinculando nodos y aristas...")
            call_command('vincular_nodos', ruta_nodos, ruta_aristas)
            self.stdout.write(self.style.SUCCESS("¡Grafo de rutas cargado con éxito!"))