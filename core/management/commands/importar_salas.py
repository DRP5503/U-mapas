"""
Comando de gestión: carga las salas desde el CSV (nombre,piso,edificio).

Uso:
    python manage.py importar_salas salas.csv

- Crea el Piso (edificio + número) si no existe y luego la Sala dentro de él.
- Es idempotente: si lo corres dos veces no duplica nada (get_or_create).
- Infiere el `tipo` desde el nombre (baño, escalera, laboratorio, N/O/P###...).
  Es una heurística: revisa los tipos en el admin después de importar.
- Las salas quedan SIN geometría (x, y, ancho, alto vacíos); esa parte se
  completa al calcar el plano de cada piso (por ejemplo desde el admin).
"""
import csv
import re

from django.core.management.base import BaseCommand, CommandError

from core.models import Piso, Sala


def inferir_tipo(nombre):
    n = nombre.lower()
    if n.startswith('baño'):
        return 'bano'
    if n.startswith('escalera'):
        return 'escalera'
    if n.startswith('laboratorio'):
        return 'lab'
    if re.fullmatch(r'[nop]\d{3}', n):  # N331, P222, O518 -> oficinas
        return 'oficina'
    if n.startswith('sala') or n in ('la salita', 'dirección', 'entrada'):
        return 'sala'
    return 'otro'


class Command(BaseCommand):
    help = 'Importa salas desde un CSV con columnas nombre,piso,edificio'

    def add_arguments(self, parser):
        parser.add_argument('csv_path', help='Ruta al archivo CSV')

    def handle(self, *args, **opts):
        creadas = existentes = 0
        try:
            # utf-8-sig: tolera el BOM que agrega Excel al exportar CSV.
            f = open(opts['csv_path'], encoding='utf-8-sig', newline='')
        except OSError as e:
            raise CommandError(f'No se pudo abrir el CSV: {e}')

        with f:
            for fila in csv.reader(f):
                if len(fila) < 3:
                    continue
                # strip(): el CSV trae espacios sobrantes ("Norte, ") y una
                # cuarta columna vacía por las comas finales; se ignoran.
                nombre, piso, edificio = (c.strip() for c in fila[:3])
                if not nombre or nombre.lower() == 'nombre':  # cabecera/vacío
                    continue
                try:
                    numero = int(piso)
                except ValueError:
                    self.stderr.write(f'Piso inválido, se omite: {fila}')
                    continue

                piso_obj, _ = Piso.objects.get_or_create(
                    edificio=edificio, numero=numero,
                    defaults={'ancho': 1000, 'alto': 600},
                )               
                _, creada = Sala.objects.get_or_create(
                    piso=piso_obj,
                    nombre=nombre,
                    defaults={'tipo': inferir_tipo(nombre)},
                )
                if creada:
                    creadas += 1
                else:
                    existentes += 1

        self.stdout.write(self.style.SUCCESS(
            f'Listo: {creadas} salas creadas, {existentes} ya existían.'
        ))