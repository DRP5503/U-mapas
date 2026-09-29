# 2026-2-CC4401-grupo-6

Para mantener el orden y no volvernos locos buscando las cosas, esta es la estructura basica.

*   **`README.md`**: Es este mismo documento. Es la portada de nuestro proyecto, donde anotamos de qué trata, qué tareas estamos haciendo y cómo instalarlo.
*   **`.gitignore`**: Es un archivo invisible para nosotros, pero vital para Git. Su trabajo es bloquear y evitar que subamos "archivos basura" (como la base de datos local o archivos temporales de nuestros computadores). **No lo borren.**
*   **`requirements.txt`**: Es simplemente una lista de compras. Aquí anotamos las herramientas que usa el proyecto (por ejemplo, "Django"). Así, si alguien nuevo entra, instala todo de un golpe leyendo este archivo.

**Carpeta de Datos (`/data`)**
Aquí va todo lo relacionado con la información que estamos recopilando de la universidad antes de meterla a la base de datos web.
*   **`data/raw/`**: Significa "datos crudos". Aquí guardamos los archivos originales tal cual los creamos o descargamos (los Excel, CSV o JSON con las listas de salas y profesores). 
*   **`data/scripts/`**: Aquí guardaremos los pequeños códigos o scripts que hagamos para limpiar, arreglar o filtrar los datos de la carpeta "raw".
