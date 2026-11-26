# Documentación visual del prototipo

- **CajaEscudo-documentacion-prototipo.pdf**: documento técnico de 9 páginas.
- `generar_pdf.py`: fuente reproducible de los diagramas vectoriales y del documento.
- `assets/`: capturas completas de las seis vistas publicadas el 26/11/2026.

El PDF incorpora recortes de las pantallas reales para mantener la legibilidad;
no son wireframes de capacidades todavía no construidas. Los diagramas separan
el MVP actual de la arquitectura objetivo pendiente.

La versión 1.1 elimina la portada promocional, los lemas y los diagramas
redundantes. Organiza el contenido en objetivo y alcance, proceso, arquitectura,
modelo de impacto, seguimiento, interfaces y validación. Se guía por
[arc42](https://arc42.org/overview) y [C4 Model](https://c4model.com/diagrams),
sin afirmar conformidad completa con sus notaciones.

## Regenerar

Requiere Python, `reportlab` y `Pillow`:

```sh
python generar_pdf.py
```

No necesita credenciales ni conexiones externas para regenerarse. Las capturas
corresponden a datos sintéticos del prototipo publicado, no a clientes reales.
El documento se basa en la implementación de referencia `a54b62a` y en los
documentos de simulación, diseño operativo, fuentes y evolución del repositorio.
