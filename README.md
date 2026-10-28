# 2026-2-CC4401-grupo-6

Para mantener el orden y no volvernos locos buscando las cosas, esta es la estructura basica.

*   **`README.md`**: Es este mismo documento. Es la portada de nuestro proyecto, donde anotamos de qué trata, qué tareas estamos haciendo y cómo instalarlo.
*   **`.gitignore`**: Es un archivo invisible para nosotros, pero vital para Git. Su trabajo es bloquear y evitar que subamos "archivos basura" (como la base de datos local o archivos temporales de nuestros computadores). **No lo borren.**
*   **`requirements.txt`**: Es simplemente una lista de compras. Aquí anotamos las herramientas que usa el proyecto (por ejemplo, "Django"). Así, si alguien nuevo entra, instala todo de un golpe leyendo este archivo.

**Carpeta de Datos (`/data`)**
Aquí va todo lo relacionado con la información que estamos recopilando de la universidad antes de meterla a la base de datos web.
*   **`data/raw/`**: Significa "datos crudos". Aquí guardamos los archivos originales tal cual los creamos o descargamos (los Excel, CSV o JSON con las listas de salas y profesores). 
*   **`data/scripts/`**: Aquí guardaremos los pequeños códigos o scripts que hagamos para limpiar, arreglar o filtrar los datos de la carpeta "raw".

### Cómo iniciar el proyecto localmente y configurar la Base de Datos
Como la base de datos (`db.sqlite3`) está en el `.gitignore` para no generar conflictos ni subir "basura" a GitHub, cada miembro del equipo debe armar su propia base de datos local siguiendo estos pasos exactos en la terminal:

1. **Crear y activar el entorno virtual (venv):**
   * Para crearlo: `python -m venv venv`
   * Para activarlo (Windows): `.\venv\Scripts\activate`
   * Para activarlo (Mac/Linux): `source venv/bin/activate`
2. **Instalar las herramientas de Django:**
   `pip install -r requirements.txt`
3. **Crear las tablas vacías en tu computador:**
   `python manage.py migrate`
4. **Poblar la base de datos con los datos de la universidad:**
   `python manage.py poblar_datos`
5. **Asigna los nodos a las salas, si depende de los datos cargados en el paso anterior.**
   `python manage.py vincular_nodos data/raw/Nodo.csv data/raw/Arista.csv `
6. **Crear tu propio usuario administrador:**
   `python manage.py createsuperuser`
   *(Sigue las instrucciones en pantalla. La contraseña no se ve mientras escribes).*
7. **Levantar el proyecto para ver el resultado:**
   `python manage.py runserver` y luego entra en tu navegador a `http://127.0.0.1:8000/admin`.


Diagrama propenso a cambios.

![Diagrama del modelo de datos](imagenes/diagrama_v2.png)


BloqueHorario ➔ Profesor: La flecha indica que un profesor posee múltiples bloques de horario en la semana.

Reporte ➔ Sala: La flecha indica que una misma sala puede recibir múltiples reportes.

Profesor ➔ Sala: La flecha indica que muchos profesores pueden compartir una sola sala u oficina (Esto porque creo que hay salas que pueden tener mas de 1 profesor asi como
la sala de informacion que hay 3 personas, pero de lo anterior no estoy tan seguro). 

oficina_asignada: Puede no tener oficina asignada.

profesor_id y sala_nombre son Foreign Key

tipo_contrato: Completa, parcial y externo (esto porque en la pagina del dcc los separa asi a los profesores)

-----SE AGREGAN LAS SIGUIENTES ENTIDADES------------------------

User: entidad para manejar el sistema de perfiles y control de acceso

Piso: se crea para añadir dimensiones y poder implementar navegacion

Nodos y Aristas: se crean para hacer las conexiones y calcular la ruta más corta

Queda pendiente terminar de implementar los nodos y crear la vista del tercer piso poniente

Queda pendiente revision de el modelado de los datos para asegurarse de que no vamos a modificarlos una vez este mas avanzado el proyecto

