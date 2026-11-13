# U-Mapas — Mapa Interactivo DCC (Beauchef 851)

Aplicación web interactiva para orientarse dentro del Departamento de Ciencias de la Computación (DCC — FCFM, Universidad de Chile), consultar oficinas y horarios de atención docente, y calcular rutas óptimas entre espacios.

---

## Historial de Cambios Recientes
* **12 de Noviembre de 2026:** Se implementó el sistema de **Lugares Favoritos** (Tarea 424), permitiendo a los usuarios guardar salas y acceder a ellas directamente desde una nueva vista. Además, se conectó el sistema de Login/Registro/Logout en la barra de navegación superior (Tarea 432).

---

## Estructura del Proyecto

```text
├── manage.py               # CLI de administración de Django
├── requirements.txt        # Dependencias de Python (Django, NetworkX)
├── config/                 # Configuración global del proyecto Django
├── core/                   # Backend (Modelos, Servicios, Vistas/API, Comandos, Tests)
│   ├── models.py           # Modelos (User, Piso, Sala, Profesor, BloqueHorario, Reporte, Nodo, Arista, LugarFavorito)
│   ├── forms.py            # Formularios de autenticación y registro (NewUserForm, LoginForm)
│   ├── services/           # Lógica de negocio (construcción de grafos y algoritmo Dijkstra en rutas.py)
│   ├── views/              # Controladores HTTP divididos por dominio (mapa.py, auth.py, favoritos.py)
│   ├── management/         # Comando maestro poblar_datos
│   ├── urls.py             # Rutas de vistas y endpoints de la API
│   └── tests.py            # Suite de pruebas automatizadas
├── frontend/               # Frontend (Plantillas HTML y archivos estáticos CSS/JS)
│   ├── templates/          # base.html, index.html, login.html, register.html, favoritos.html y partials/
│   └── static/             # Estilos (css/style.css, piso.css, auth.css) y scripts (js/api.js, js/map.js)
├── data/                   # Semillas de datos limpias en formato CSV
│   ├── salas.csv           # Salas y su geometría SVG (x, y, ancho, alto)
│   ├── profesores.csv      # Nómina docente y oficina asignada
│   ├── nodos.csv           # Nodos del grafo de navegación (puertas y pasillos)
│   └── aristas.csv         # Conexiones entre nodos
└── docs/                   # Documentación y diagramas del proyecto
    └── diagrama_modelo_datos.png
```

---

## Guía de Instalación Rápida (Paso a Paso)

Sigue estos pasos en orden para levantar el proyecto desde cero en tu computador local.


**Paso 1: Clonar el repositorio y entrar a la carpeta**
```bash
git clone <URL_DEL_REPOSITORIO>
cd 2026-2-CC4401-grupo-6
```

**Paso 2: Crear y activar el entorno virtual**
* Crear el entorno: `python -m venv venv`
* Activar en Windows: `.\venv\Scripts\activate`
* Activar en Mac/Linux: `source venv/bin/activate`
*(Sabrás que está activo porque verás un `(venv)` al inicio de tu línea de comandos).*

**Paso 3: Instalar las dependencias**
```bash
pip install -r requirements.txt
```

**Paso 4: Aplicar las migraciones de la base de datos**
```bash
python manage.py migrate
```

**Paso 5: Poblar la base de datos (¡PASO CRÍTICO!)**
Si no haces esto, el mapa se verá completamente vacío. Este comando carga las salas, profesores y el grafo de rutas desde los archivos CSV.
```bash
python manage.py poblar_datos
```
*Deberías ver mensajes en verde confirmando que se cargaron las salas, profesores y nodos.*

**Paso 6: (Opcional) Crear usuario administrador**
Para acceder al panel de Django (`/admin/`).
```bash
python manage.py createsuperuser
```

**Paso 7: Levantar el servidor**
```bash
python manage.py runserver
```
Abre tu navegador y ve a `http://127.0.0.1:8000/`.

**Paso 8: Ejecutar las pruebas automatizadas (Opcional)**
```bash
python manage.py test
```

---

## Rutas y Endpoints Disponibles

### Vistas Web
| Ruta | Descripción |
| :--- | :--- |
| `GET /` | Mapa interactivo principal (vista general del campus y visor de pisos). |
| `GET/POST /login` | Inicio de sesión de usuarios. |
| `GET/POST /register` | Registro de cuentas con rol (`Profesor`, `Estudiante`, `Auxiliar de aseo`). |
| `GET /logout` | Cierre de sesión activa. |
| `GET /favoritos/` | Vista de "Mis Lugares Favoritos" (requiere inicio de sesión). |
| `GET /admin/` | Panel de administración de Django. |

### API JSON
| Endpoint | Descripción |
| :--- | :--- |
| `GET /api/pisos/<edificio>/` | Lista de números de piso disponibles para un edificio (de mayor a menor). |
| `GET /api/piso/<edificio>/<numero>/` | Dimensiones del lienzo, salas con geometría (`x, y, ancho, alto`) y profesores asignados. |
| `GET /api/ruta/<edificio>/<numero>/<desde>/<hasta>/` | Ruta más corta entre dos salas del piso usando Dijkstra (`distancia` y lista de `puntos`). |
| `GET /api/ruta-nodos/<edificio>/<numero>/<desde>/<hasta>/` | Ruta más corta entre dos nodos cualesquiera del grafo del piso. |
| `POST /api/favoritos/toggle/<sala_id>/` | Agrega o quita una sala de los favoritos del usuario autenticado. |
| `GET /api/favoritos/estado/<sala_id>/` | Consulta si una sala específica es favorita del usuario. |

---

## Modelo de Datos

![Diagrama del modelo de datos](docs/diagrama_modelo_datos.png)

* **`User`**: Usuario autenticado que extiende `AbstractUser` con `nombre` y `rol` institucional (`PROFESOR`, `ESTUDIANTE`, `AUXILIAR`).
* **`Piso`**: Nivel de un edificio (`edificio` + `numero`) y dimensiones de su lienzo SVG (`ancho`, `alto`).
* **`Sala`**: Espacio físico dentro de un piso (`sala`, `oficina`, `lab`, `bano`, `escalera`, `otro`), con coordenadas (`x`, `y`, `ancho`, `alto`) y vínculo a su `Nodo` puerta.
* **`Profesor`** y **`BloqueHorario`**: Docentes asociados a su oficina (`Sala`) y bloques de atención semanal.
* **`Reporte`**: Reportes comunitarios de problemas o estado asociados a una `Sala`.
* **`Nodo`** y **`Arista`**: Grafo geométrico de navegación utilizado para calcular el camino más corto mediante Dijkstra (`networkx`).
* **`LugarFavorito`**: Relación entre un `User` y una `Sala` para guardar accesos rápidos personalizados.