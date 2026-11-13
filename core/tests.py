"""
Pruebas automatizadas para modelos, servicios de rutas y endpoints de la API.
"""
from django.test import TestCase
from django.urls import reverse

from core.models import Arista, Nodo, Piso, Profesor, Sala, User
from core.services.rutas import calcular_ruta, calcular_ruta_nodos


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

    def test_vistas_autenticacion(self):
        res_login = self.client.get(reverse('core:login_user'))
        self.assertEqual(res_login.status_code, 200)

        res_register = self.client.get(reverse('core:register_user'))
        self.assertEqual(res_register.status_code, 200)

        user = User.objects.create_user(
            username='estudiante1', password=' TestPass123!', nombre='Estudiante', rol='ESTUDIANTE'
        )
        self.assertEqual(user.rol, 'ESTUDIANTE')


class RutaEntreMapasTests(TestCase):
    """Rutas que cruzan mapas: edificios distintos (Conexión) y pisos distintos (Escalera)."""

    def _sala(self, nombre, piso, nodo):
        return Sala.objects.create(nombre=nombre, piso=piso, nodo=nodo, x=0, y=0, ancho=10, alto=10)

    def setUp(self):
        norte3 = Piso.objects.create(edificio='Norte', numero=3, ancho=1000, alto=600)
        pon3 = Piso.objects.create(edificio='Poniente', numero=3, ancho=1000, alto=600)
        pon2 = Piso.objects.create(edificio='Poniente', numero=2, ancho=1000, alto=600)

        # Norte 3: N331 --10-- Conexión   (el acento distinto a propósito: se normaliza)
        n331 = Nodo.objects.create(piso=norte3, nombre='N331', x=0, y=0)
        con_n = Nodo.objects.create(piso=norte3, nombre='Conexión', x=0, y=10)
        Arista.objects.create(origen=n331, destino=con_n)
        # Poniente 3: Conexion --10-- Escalera
        con_p = Nodo.objects.create(piso=pon3, nombre='Conexion', x=0, y=0)
        esc3 = Nodo.objects.create(piso=pon3, nombre='Escalera', x=10, y=0)
        Arista.objects.create(origen=con_p, destino=esc3)
        # Poniente 2: Escalera --20-- P220
        esc2 = Nodo.objects.create(piso=pon2, nombre='Escalera', x=10, y=0)
        p220 = Nodo.objects.create(piso=pon2, nombre='P220', x=10, y=20)
        Arista.objects.create(origen=esc2, destino=p220)

        self.sala_n331 = self._sala('N331', norte3, n331)
        self.sala_p220 = self._sala('P220', pon2, p220)
        self.sala_esc3 = self._sala('Escalera', pon3, esc3)

    def test_ruta_cruza_edificio_y_piso_en_tramos(self):
        ruta = calcular_ruta(self.sala_n331, self.sala_p220)
        self.assertIsNotNone(ruta)
        # 10 (N331→Conexión) + 50 (conexión) + 10 + 150 (escalera) + 20
        self.assertEqual(ruta['distancia'], 240.0)
        self.assertEqual(
            [(t['edificio'], t['piso']) for t in ruta['tramos']],
            [('Norte', 3), ('Poniente', 3), ('Poniente', 2)],
        )
        self.assertEqual([len(t['puntos']) for t in ruta['tramos']], [2, 2, 2])

    def test_escalera_solo_une_pisos_del_mismo_edificio(self):
        ruta = calcular_ruta(self.sala_esc3, self.sala_p220)
        self.assertEqual([(t['edificio'], t['piso']) for t in ruta['tramos']],
                         [('Poniente', 3), ('Poniente', 2)])

    def test_sin_puentes_no_hay_ruta(self):
        Nodo.objects.filter(nombre__istartswith='conex').delete()
        self.assertIsNone(calcular_ruta(self.sala_n331, self.sala_p220))

    def test_endpoint_ruta_salas(self):
        res = self.client.get(reverse('core:ruta_salas', args=[self.sala_n331.id, self.sala_p220.id]))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()['tramos']), 3)

        res = self.client.get(reverse('core:piso_json', args=['Norte', 3]))
        self.assertIn('id', res.json()['salas'][0])

