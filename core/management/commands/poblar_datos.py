"""
Comando de gestión maestro: poblar_datos

Carga de forma idempotente todas las semillas iniciales del sistema desde `data/`:
1. Pisos y Salas con su geometría SVG (`data/salas.csv`).
2. Profesores y su asignación de oficina (`data/profesores.csv`).
3. Grafo de navegación (Nodos y Aristas) y vinculación con puertas de salas (`data/nodos.csv` y `data/aristas.csv`).

Uso:
    python manage.py poblar_datos
"""
import csv
import os
import re

from django.conf import settings
from django.core.management.base import BaseCommand

from core.models import Arista, Nodo, Piso, Profesor, Sala


def inferir_tipo_sala(nombre):
    """Infiere la categoría de una sala a partir de su nombre."""
    n = nombre.lower()
    if n.startswith('baño'):
        return 'bano'
    if n.startswith('escalera'):
        return 'escalera'
    if n.startswith('conexion') or n.startswith('conexión'):
        return 'conexion'
    if n.startswith('laboratorio'):
        return 'lab'
    if re.fullmatch(r'[nop]\d{3}', n):
        return 'oficina'
    if n.startswith('sala') or n in ('la salita', 'dirección', 'entrada'):
        return 'sala'
    return 'otro'


class Command(BaseCommand):
    """Puebla la base de datos con pisos, salas, profesores y el grafo de rutas."""

    help = 'Puebla la base de datos con salas, profesores, nodos y aristas desde data/'

    def handle(self, *args, **kwargs):
        data_dir = os.path.join(settings.BASE_DIR, 'data')
        self._cargar_salas(os.path.join(data_dir, 'salas.csv'))
        self._cargar_profesores(os.path.join(data_dir, 'profesores.csv'))
        self._cargar_grafo(
            os.path.join(data_dir, 'nodos.csv'),
            os.path.join(data_dir, 'aristas.csv'),
        )

    def _cargar_salas(self, csv_path):
        """Importa pisos y salas junto con sus coordenadas geométricas."""
        creadas = actualizadas = 0
        with open(csv_path, encoding='utf-8-sig', newline='') as f:
            for fila in csv.reader(f):
                if len(fila) < 3:
                    continue
                nombre, piso_str, edificio = (c.strip() for c in fila[:3])
                if not nombre or nombre.lower() == 'nombre':
                    continue
                try:
                    numero = int(piso_str)
                except ValueError:
                    continue

                piso_obj, _ = Piso.objects.get_or_create(
                    edificio=edificio,
                    numero=numero,
                    defaults={'ancho': 1000, 'alto': 600},
                )
                defaults = {
                    'tipo': inferir_tipo_sala(nombre),
                    'edificio': edificio,
                }
                if len(fila) >= 7:
                    coords_raw = [c.strip() for c in fila[3:7]]
                    if all(coords_raw):
                        try:
                            defaults['x'] = float(coords_raw[0])
                            defaults['y'] = float(coords_raw[1])
                            defaults['ancho'] = float(coords_raw[2])
                            defaults['alto'] = float(coords_raw[3])
                        except ValueError:
                            pass

                _, creada = Sala.objects.update_or_create(
                    piso=piso_obj,
                    nombre=nombre,
                    defaults=defaults,
                )
                if creada:
                    creadas += 1
                else:
                    actualizadas += 1

        self.stdout.write(
            self.style.SUCCESS(f"Salas listas: {creadas} creadas, {actualizadas} actualizadas.")
        )

    def _cargar_profesores(self, csv_path):
        """Importa los profesores y los vincula con su oficina correspondiente."""
        total = 0
        with open(csv_path, encoding='utf-8', newline='') as f:
            lector = csv.reader(f)
            next(lector, None)
            for fila in lector:
                if len(fila) < 3:
                    continue
                nombre_profe = fila[0].strip()
                oficina_texto = fila[1].strip() if fila[1] else None
                jornada_profe = fila[2].strip()

                sala_asignada = None
                if oficina_texto:
                    sala_asignada = Sala.objects.filter(nombre=oficina_texto).first()

                Profesor.objects.update_or_create(
                    nombre=nombre_profe,
                    defaults={
                        'oficina': sala_asignada,
                        'jornada': jornada_profe,
                    },
                )
                total += 1

        self.stdout.write(self.style.SUCCESS(f"Profesores listos: {total} procesados."))

    def _cargar_grafo(self, ruta_nodos, ruta_aristas):
        """Importa nodos y aristas del grafo y enlaza cada sala con su nodo puerta."""
        if not (os.path.exists(ruta_nodos) and os.path.exists(ruta_aristas)):
            return

        with open(ruta_nodos, encoding='utf-8', newline='') as f:
            nodos_rows = list(csv.DictReader(f))
        with open(ruta_aristas, encoding='utf-8', newline='') as f:
            aristas_rows = list(csv.DictReader(f))

        for fila in nodos_rows:
            try:
                x = float(fila['x'])
                y = float(fila['y'])
                piso = Piso.objects.get(
                    edificio__iexact=fila['edificio'].strip(),
                    numero=int(fila['piso']),
                )
            except (ValueError, Piso.DoesNotExist):
                continue

            Nodo.objects.update_or_create(
                nombre=fila['nombre'].strip(),
                piso=piso,
                defaults={'x': x, 'y': y},
            )

        for fila in aristas_rows:
            try:
                origen = Nodo.objects.get(
                    piso__edificio__iexact=fila['edificio'].strip(),
                    piso__numero=int(fila['piso']),
                    nombre=fila['origen'].strip(),
                )
                destino = Nodo.objects.get(
                    piso__edificio__iexact=fila['edificio'].strip(),
                    piso__numero=int(fila['piso']),
                    nombre=fila['destino'].strip(),
                )
            except (ValueError, Nodo.DoesNotExist):
                continue

            Arista.objects.get_or_create(origen=origen, destino=destino)

        vinculadas = 0
        for sala in Sala.objects.select_related('piso'):
            nodo = Nodo.objects.filter(
                piso=sala.piso,
                nombre__iexact=sala.nombre,
            ).first()
            if nodo and sala.nodo_id != nodo.id:
                sala.nodo = nodo
                sala.save(update_fields=['nodo'])
                vinculadas += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Grafo listo: {Nodo.objects.count()} nodos, {Arista.objects.count()} aristas "
                f"({vinculadas} nuevas salas vinculadas)."
            )
        )
