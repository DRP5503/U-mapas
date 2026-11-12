# U-Mapas — Mapa Interactivo DCC (Beauchef 851)

Aplicación web interactiva para orientarse dentro del Departamento de Ciencias de la Computación (DCC — FCFM, Universidad de Chile), consultar oficinas y horarios de atención docente, y calcular rutas óptimas entre espacios.

---

## Estructura del Proyecto

```text
├── manage.py               # CLI de administración de Django
├── requirements.txt        # Dependencias de Python (Django, NetworkX)
├── config/                 # Configuración global del proyecto Django
├── core/                   # 🔵 Backend (Modelos, Servicios, Vistas/API, Comandos, Tests)
│   ├── models.py           # Modelos relacionales (User, Piso, Sala, Profesor, BloqueHorario, Reporte, Nodo, Arista)
│   ├── forms.py            # Formularios de autenticación y registro (NewUserForm, LoginForm)
│   ├── services/           # Lógica de negocio (construcción de grafos y algoritmo Dijkstra en rutas.py)
│   ├── views/              # Controladores HTTP divididos por dominio (mapa.py, auth.py)
│   ├── management/         # Comando maestro poblar_datos
│   ├── urls.py             # Rutas de vistas y endpoints de la API
│   └── tests.py            # Suite de pruebas automatizadas
├── frontend/               # 🟢 Frontend (Plantillas HTML y archivos estáticos CSS/JS)
│   ├── templates/          # base.html, index.html, login.html, register.html y partials/ (navbar.html, floor_selector.html)
│   └── static/             # Estilos (css/style.css, piso.css, auth.css) y scripts (js/api.js, js/map.js)
├── data/                   # 🟡 Semillas de datos limpias en formato CSV
│   ├── salas.csv           # Salas y su geometría SVG (x, y, ancho, alto)
│   ├── profesores.csv      # Nómina docente y oficina asignada
│   ├── nodos.csv           # Nodos del grafo de navegación (puertas y pasillos)
│   └── aristas.csv         # Conexiones entre nodos
└── docs/                   # Documentación y diagramas del proyecto
    └── diagrama_modelo_datos.png
```

---

## Cómo iniciar el proyecto localmente

> **Importante si ya tenías una copia anterior del repositorio:** Tras integrar el modelo personalizado `User` (`AUTH_USER_MODEL = 'core.User'`) y las coordenadas de las salas en `data/salas.csv`, **elimina tu archivo `db.sqlite3` local** después de hacer `git pull` y ejecuta los pasos 3 y 4 para reconstruir la base de datos limpia.

1. **Crear y activar el entorno virtual (`venv`):**
   * Crear: `python -m venv venv`
   * Activar (Mac/Linux): `source venv/bin/activate`
   * Activar (Windows): `.\venv\Scripts\activate`
2. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Aplicar migraciones de base de datos:**
   ```bash
   python manage.py migrate
   ```
4. **Poblar la base de datos (salas con geometría, profesores y grafo de rutas):**
   ```bash
   python manage.py poblar_datos
   ```
5. **Asigna los nodos a las salas, si depende de los datos cargados en el paso anterior.**
    ```bash
   python manage.py vincular_nodos data/raw/Nodo.csv data/raw/Arista.csv
   ```
6. **(Opcional) Crear usuario administrador:**
   ```bash
   python manage.py createsuperuser
   ```
7. **Levantar el servidor de desarrollo:**
   ```bash
   python manage.py runserver
   ```
8. **Ejecutar las pruebas automatizadas:**
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
| `GET /admin/` | Panel de administración de Django. |

### API JSON
| Endpoint | Descripción |
| :--- | :--- |
| `GET /api/pisos/<edificio>/` | Lista de números de piso disponibles para un edificio (de mayor a menor). |
| `GET /api/piso/<edificio>/<numero>/` | Dimensiones del lienzo, salas con geometría (`x, y, ancho, alto`) y profesores asignados. |
| `GET /api/ruta/<edificio>/<numero>/<desde>/<hasta>/` | Ruta más corta entre dos salas del piso usando Dijkstra (`distancia` y lista de `puntos`). |
| `GET /api/ruta-nodos/<edificio>/<numero>/<desde>/<hasta>/` | Ruta más corta entre dos nodos cualesquiera del grafo del piso. |

---

## Modelo de Datos

![Diagrama del modelo de datos](docs/diagrama_modelo_datos.png)

* **`User`**: Usuario autenticado que extiende `AbstractUser` con `nombre` y `rol` institucional (`PROFESOR`, `ESTUDIANTE`, `AUXILIAR`).
* **`Piso`**: Nivel de un edificio (`edificio` + `numero`) y dimensiones de su lienzo SVG (`ancho`, `alto`).
* **`Sala`**: Espacio físico dentro de un piso (`sala`, `oficina`, `lab`, `bano`, `escalera`, `otro`), con coordenadas (`x`, `y`, `ancho`, `alto`) y vínculo a su `Nodo` puerta.
* **`Profesor`** y **`BloqueHorario`**: Docentes asociados a su oficina (`Sala`) y bloques de atención semanal.
* **`Reporte`**: Reportes comunitarios de problemas o estado asociados a una `Sala`.
* **`Nodo`** y **`Arista`**: Grafo geométrico de navegación utilizado para calcular el camino más corto mediante Dijkstra (`networkx`).
