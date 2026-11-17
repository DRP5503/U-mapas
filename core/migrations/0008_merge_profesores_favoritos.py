from django.db import migrations


class Migration(migrations.Migration):
    # Integra la migración del primer paquete de favoritos con el main actualizado.
    dependencies = [
        ('core', '0003_profesor_favorito'),
        ('core', '0007_merge_20261113_2043'),
    ]

    operations = []
