from django.db import migrations, models


def marcar_conexiones(apps, schema_editor):
    Sala = apps.get_model('core', 'Sala')
    Sala.objects.filter(nombre__istartswith='conexi').update(tipo='conexion')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_lugarfavorito'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sala',
            name='tipo',
            field=models.CharField(
                choices=[('sala', 'Sala'), ('oficina', 'Oficina'), ('lab', 'Laboratorio'), ('bano', 'Baño'),
                         ('escalera', 'Escalera'), ('conexion', 'Conexión'), ('otro', 'Otro')],
                default='sala', max_length=20),
        ),
        migrations.RunPython(marcar_conexiones, migrations.RunPython.noop),
    ]
