"""
Pruebas automatizadas para modelos, servicios de rutas y endpoints de la API.
"""
from django.test import TestCase
from django.urls import reverse

from core.models import Arista, Nodo, Piso, Profesor, Sala
from core.services.rutas import calcular_ruta_nodos


class MapaRutasTests(TestCase):
    """Verifica el modelo de datos, el servicio Dijkstra y los endpoints JSON."""

    def setUp(self):
        self.piso = Piso.objects.create(edificio='Norte', numero=3, ancho=1000, alto=600)
        self.nodo_a = Nodo.objects.create(piso=self.piso, nombre='Entrada', x=0, y=0)
        self.nodo_p = Nodo.objects.create(piso=self.piso, nombre='Pasillo', x=30, y=0)
        self.nodo_b = Nodo.objects.create(piso=self.piso, nombre='N331', x=30, y=40)

        Arista.objects.create(origen=self.nodo_a, destino=self.nodo_p)
        Arista.objects.create(origen=self.nodo_p, destino=self.nodo_b)

        self.sala_entrada = Sala.objects.create(
            nombre='Entrada', piso=self.piso, tipo='sala',
            x=0, y=0, ancho=20, alto=20, nodo=self.nodo_a,
        )
        self.sala_oficina = Sala.objects.create(
            nombre='N331', piso=self.piso, tipo='oficina',
            x=25, y=35, ancho=20, alto=20, nodo=self.nodo_b,
        )
        Profesor.objects.create(
            nombre='Docente Prueba', oficina=self.sala_oficina, jornada='Completa',
        )

    def test_arista_peso_euclidiano(self):
        arista = Arista.objects.get(origen=self.nodo_p, destino=self.nodo_b)
        self.assertAlmostEqual(arista.peso, 40.0)

    def test_servicio_calcular_ruta_nodos(self):
        resultado = calcular_ruta_nodos(self.piso, self.nodo_a, self.nodo_b)
        self.assertIsNotNone(resultado)
        self.assertEqual(resultado['distancia'], 70.0)
        self.assertEqual(len(resultado['puntos']), 3)

    def test_endpoint_pisos_y_piso_json(self):
        res_pisos = self.client.get(reverse('core:pisos_edificio', args=['Norte']))
        self.assertEqual(res_pisos.status_code, 200)
        self.assertEqual(res_pisos.json(), {'pisos': [3]})

        res_piso = self.client.get(reverse('core:piso_json', args=['Norte', 3]))
        self.assertEqual(res_piso.status_code, 200)
        data = res_piso.json()
        self.assertEqual(len(data['salas']), 2)

    def test_endpoint_ruta_json(self):
        res = self.client.get(reverse('core:ruta_json', args=['Norte', 3, 'Entrada', 'N331']))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['distancia'], 70.0)
