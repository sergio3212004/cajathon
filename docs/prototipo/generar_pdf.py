"""Documentación técnica concisa. Requiere reportlab y Pillow."""
from pathlib import Path
import math
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "CajaEscudo-documentacion-prototipo.pdf"
W, H = 841.89, 595.28
INK, MUTED, LINE = "#20333D", "#52616B", "#CFD8DD"
RED, GREEN = "#B8292B", "#327968"
c = canvas.Canvas(str(OUT), pagesize=(W,H))
c.setTitle("CajaEscudo | Documentación técnica del prototipo")
c.setAuthor("Equipo CajaEscudo")
page = 0

def text(s,x,y,w,size=10,bold=False,color=INK):
    p=Paragraph(s,ParagraphStyle("p",fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=size,leading=size*1.4,textColor=HexColor(color)))
    _,h=p.wrap(w,H)
    assert y+h < H-12, (page,s)
    p.drawOn(c,x,H-y-h)
    return h

def rect(x,y,w,h,fill="#FFFFFF",stroke=LINE):
    c.setFillColor(HexColor(fill)); c.setStrokeColor(HexColor(stroke))
    c.roundRect(x,H-y-h,w,h,4,fill=1,stroke=1)

def node(x,y,w,h,title,body="",human=False):
    rect(x,y,w,h,"#EDF5F1" if human else "#FFFFFF",GREEN if human else LINE)
    th=text(title,x+10,y+10,w-20,10,True)
    if body:
        bh=text(body,x+10,y+15+th,w-20,9,color=MUTED)
        assert 15+th+bh < h-3,(page,title)

def arrow(x1,y1,x2,y2):
    c.setStrokeColor(HexColor(MUTED)); c.setFillColor(HexColor(MUTED)); c.setLineWidth(1)
    c.line(x1,H-y1,x2,H-y2)
    a=math.atan2(y2-y1,x2-x1)
    p=c.beginPath(); p.moveTo(x2,H-y2)
    for b in (a+2.65,a-2.65): p.lineTo(x2+6*math.cos(b),H-y2-6*math.sin(b))
    p.close(); c.drawPath(p,fill=1,stroke=0)

def start(title):
    global page
    if page: c.showPage()
    page+=1
    text("CAJAESCUDO",36,22,300,11,True)
    text("DOCUMENTACIÓN TÉCNICA · CE-2.0 · v1.1",480,24,326,9,color=MUTED)
    c.setStrokeColor(HexColor(LINE)); c.line(36,H-47,W-36,H-47)
    text(title,36,65,770,23,True)
    c.line(36,38,W-36,38)
    text("26/11/2026 · Implementación de referencia: a54b62a · Datos sintéticos",36,H-28,700,8,color=MUTED)
    text(str(page),780,H-28,25,8)
    c.bookmarkPage(f"p{page}"); c.addOutlineEntry(title,f"p{page}",0)

def table(headers,rows,x=36,y=150,widths=None):
    widths=widths or [190,580]
    for row_i,row in enumerate([headers]+rows):
        ps=[]
        for value,w in zip(row,widths):
            p=Paragraph(value,ParagraphStyle("cell",
                fontName="Helvetica-Bold" if row_i==0 else "Helvetica",
                fontSize=9.5,leading=13.5,textColor=HexColor(INK)))
            _,h=p.wrap(w-20,H); ps.append((p,h))
        height=max(h for _,h in ps)+18
        assert y+height<535,(page,"table overflow",y)
        xx=x
        for w,(p,h) in zip(widths,ps):
            rect(xx,y,w,height,"#EEF2F4" if row_i==0 else "#FFFFFF")
            p.drawOn(c,xx+10,H-y-9-h); xx+=w
        y+=height
    return y

def paragraph(title,body,y):
    text(title,36,y,770,11,True)
    return y+20+text(body,36,y+20,770,10)

start("1. Objetivo y alcance")
paragraph("1.1 Objetivo",
    "Apoyar a analistas de riesgos, asesores de negocios y responsables de cartera en la identificación "
    "de exposición climática, la estimación de impactos y la priorización de intervenciones preventivas.",114)
table(["Aspecto","Especificación"],[
    ("Alcance funcional","Exposición territorial, abastecimiento, riesgo de cartera, presupuesto preventivo y seguimiento de casos."),
    ("Datos de demostración","60 clientes ficticios, cuatro regiones, cinco segmentos y tres cadenas de suministro sintéticas."),
    ("Implementación","Aplicación Vue/TypeScript alojada en Vercel. Cálculo en Web Worker; revisión y seguimiento en almacenamiento local."),
    ("Exclusiones","No consulta fuentes oficiales ni datos bancarios. No realiza comunicaciones, desembolsos, modificaciones crediticias ni decisiones automáticas."),
    ("Estado de los modelos","Parámetros ilustrativos; PD y LGD no calibradas. Los resultados no constituyen pronósticos verificados ni provisiones regulatorias."),
],y=191)
text("<b>Términos.</b> PD: probabilidad de incumplimiento. LGD: pérdida dado incumplimiento. "
     "EAD: exposición al incumplimiento. MVP: producto mínimo viable.",
     36,452,770,9,color=MUTED)
text('Prototipo: <link href="https://cajathon-mu.vercel.app" color="#B8292B">https://cajathon-mu.vercel.app</link>',
     36,497,770)
text("Contenido: proceso (p. 2), arquitectura (p. 3), modelo (p. 4), seguimiento (p. 5), interfaces (pp. 6–8), validación y referencias (p. 9).",
     36,520,770,9,color=MUTED)

start("2. Proceso de análisis")
text("Figura 1. Flujo del escenario y control de calidad. Las acciones humanas se muestran en verde.",36,112,770,10)
for x,t,b in [
    (36,"1. Configurar escenario","Amenaza, intensidad, ventana, cartera, canal y presupuesto."),
    (298,"2. Validar datos","Verificar calidad de red cuando se activa el canal indirecto."),
    (560,"3. Calcular resultados","Simular daño, suministro, caja, crédito y medidas preventivas.")]:
    node(x,155,246,95,t,b,human=x==36)
    if x<560: arrow(x+246,202,x+262,202)
node(298,293,246,84,"Datos no válidos","No generar salida nueva. Bloquear exportación, revisión y seguimiento.")
arrow(421,250,421,293)
text("Insuficientes o vencidos",431,265,200,8,color=MUTED)
text("Datos válidos",694,314,100,8,color=MUTED)
node(36,408,246,92,"6. Registrar seguimiento","Revisión, aprobación, constancia de entrega, ejecución y cierre.",True)
node(298,408,246,92,"5. Revisar propuesta","Validar el caso y la viabilidad de las medidas. Registrar evidencia.",True)
node(560,408,246,92,"4. Consultar y priorizar","Mapa, pérdidas, clientes prioritarios y asignación bajo presupuesto.",True)
arrow(683,250,683,408)
arrow(560,454,544,454); arrow(298,454,282,454)
text("El cambio de parámetros solicita un recálculo automático. La revisión requiere un resultado vigente. "
     "La calidad completa/insuficiente/vencida es un estado de prueba, no una consulta externa.",
     36,517,770,9,color=MUTED)

start("3. Arquitectura de ejecución")
text("Figura 2. Vista simplificada de despliegue y componentes. Todas las flechas representan transferencias de datos o recursos.",36,112,770,10)
node(36,154,220,70,"Usuario","Configura escenarios, consulta resultados y registra observaciones.",True)
node(298,154,246,70,"Vercel","Aloja y entrega los archivos estáticos de la aplicación.")
node(586,154,220,70,"OpenStreetMap","Proporciona mosaicos para el mapa base.")
rect(36,272,770,232,"#F6F8F9")
text("Navegador del usuario",50,281,700,10,True)
node(54,314,220,81,"Interfaz Vue / TypeScript","Filtros, visualizaciones, formularios y exportación CSV.")
node(312,314,220,81,"Web Worker","Simulación Monte Carlo, inventario, caja, crédito y mochila 0/1.")
node(570,314,218,81,"Datos locales incluidos","Cartera, dependencias, parámetros y escenarios sintéticos.")
arrow(274,348,312,348); arrow(532,376,274,376)
arrow(570,348,532,348)
node(54,425,220,58,"localStorage","Revisiones y eventos por cliente/escenario.")
node(312,425,476,58,"Huella del análisis","Checksum de versión, parámetros, presupuesto y contenido de cartera.")
arrow(164,395,164,425)
arrow(146,224,146,272); arrow(421,224,421,272); arrow(696,224,696,272)
text("El backend del repositorio no está conectado al MVP. No hay autenticación institucional, base bancaria, "
     "conector meteorológico ni LLM activo. La huella local no es una firma de seguridad.",
     36,519,770,9,color=MUTED)

start("4. Modelo de impacto")
text("Figura 3. Relación entre amenaza, afectación del negocio y estimación crediticia.",36,112,770,10)
node(286,151,270,63,"Escenario climático supuesto","Intensidad, ventana y severidad por trayectoria.")
node(36,249,345,74,"Canal directo","Daño físico y reducción de actividad.")
node(461,249,345,74,"Canal indirecto","Interrupción del origen, reserva de inventario, sustitución y sobrecostos.")
arrow(350,214,208,249); arrow(492,214,633,249)
node(36,360,345,83,"Impacto económico","Daño físico + pérdida operativa. La pérdida indirecta incluye margen no generado y sobrecostos.")
node(461,360,345,83,"Flujo de caja y riesgo crediticio","Capacidad de pago a 30 días; función logística supuesta; saldo como EAD y LGD configurable.")
arrow(208,323,208,360); arrow(633,323,633,360); arrow(381,401,461,401)
text("<b>Criterios de cálculo.</b> La afectación indirecta se aplica sobre la actividad que permanece tras el daño directo. "
     "La pérdida crediticia no se suma al impacto económico. Los canales crediticios aislados comparten riesgo base "
     "y no son aditivos. El histograma representa pérdida esperada condicional, no impagos realizados.",
     36,470,770,10)
text("<b>Plan preventivo.</b> Mochila 0/1 bajo presupuesto para maximizar impacto económico evitado. El paquete supone protección física, "
     "tres días adicionales de inventario y hasta 30 puntos de sustitución. Su efectividad no está validada empíricamente.",
     36,519,770,9)

start("5. Revisión y seguimiento")
text("Figura 4. Estados permitidos del registro de intervención.",36,112,770,10)
for i,t in enumerate(["Pendiente","Aprobada","Comunicada","Ejecutada","Cerrada"]):
    x=36+i*157
    node(x,163,142,44,t,human=True)
    if i<4: arrow(x+142,185,x+157,185)
node(193,249,218,61,"Entrega fallida","Resultado registrado de una gestión.")
arrow(264,207,264,249); arrow(411,279,421,279); arrow(421,279,421,207)
text("Reintento confirmado",433,257,200,9,color=MUTED)
table(["Control","Comportamiento"],[
    ("Revisión previa","Se exige revisión humana del mismo cliente y huella de análisis."),
    ("Vigencia","Se bloquean transiciones mientras el análisis esté pendiente, desactualizado o con error de calidad."),
    ("Evidencia","Cada transición exige un mínimo de ocho caracteres de observaciones."),
    ("Persistencia","Registro en este navegador, con fecha, estado y evidencia. Si falla localStorage, se informa persistencia solo en memoria."),
],y=336)
text("El registro de aprobación no equivale a autorización institucional. Registrar entrega no envía un mensaje. "
     "No se admiten saltos de estado ni modificaciones de contratos.",36,522,770,9,color=MUTED)

def screenshot(name,x,y,w,h,crop):
    image=Image.open(ROOT/"assets"/f"{name}.png").convert("RGB")
    image=image.crop((crop[0],crop[1],min(crop[2],image.width),min(crop[3],image.height)))
    iw,ih=image.size; scale=min(w/iw,h/ih)
    dw,dh=iw*scale,ih*scale
    rect(x,y,w,h,"#F6F8F9")
    c.drawImage(ImageReader(image),x+(w-dw)/2,H-y-(h-dh)/2-dh,dw,dh)

pairs=[
("6. Interfaces de exposición y abastecimiento",[
 ("monitoring","Monitoreo",(0,345,1281,1000),"Filtra cartera y compara capas de exposición. Presenta clientes prioritarios y permite abrir su expediente."),
 ("supply","Abastecimiento",(0,335,1217,1320),"Configura origen, duración, reserva y sustitución. Muestra cadena, inventario e impacto indirecto.")]),
("7. Interfaces de cartera e intervenciones",[
 ("portfolio","Riesgo de cartera",(0,373,1281,920),"Presenta saldo, pérdida base, estrés, percentiles y concentración. Compara el escenario con intervención."),
 ("interventions","Intervenciones",(0,322,1101,887),"Ajusta el presupuesto y presenta la asignación propuesta y el impacto económico estimado.")]),
("8. Interfaces de seguimiento y configuración",[
 ("followup","Seguimiento",(0,375,1281,1137),"Selecciona el cliente, guarda la revisión y registra las transiciones de la intervención."),
 ("settings","Configuración",(0,370,1281,814),"Modifica trayectorias, semilla, LGD y calidad de red. Permite consultar supuestos, fuentes y privacidad.")]),
]
for title,items in pairs:
    start(title)
    text("Capturas reales del prototipo publicado. Se recorta la zona de trabajo; las cifras corresponden a datos sintéticos.",36,112,770,10)
    for i,(name,label,crop,body) in enumerate(items):
        x=36+i*394
        text(f"Figura {5+(page-6)*2+i}. {label}",x,148,376,12,True)
        screenshot(name,x,180,376,281,crop)
        text(body,x,478,376,10)
    text("Las capturas completas están disponibles en docs/prototipo/assets/. No representan conexiones a fuentes oficiales ni datos de clientes reales.",
         36,529,770,9,color=MUTED)

start("9. Validación, limitaciones y referencias")
table(["Verificación","Evidencia de la entrega de referencia"],[
    ("Pruebas de dominio","52 pruebas aprobadas: inventario, aislamiento de canales, reproducibilidad, calidad, presupuesto, navegación y transiciones."),
    ("Compilación","Build Vite y chequeo Vue/TypeScript aprobados."),
    ("Revisión de interfaz","Seis vistas verificadas, navegación por enlace e historial y revisión a 390 px sin desborde horizontal del documento."),
    ("Validación pendiente","Desempeño predictivo, calibración por segmento, efectividad de intervenciones, pruebas de uso institucional y evaluación de sesgos."),
],y=115)
paragraph("9.1 Restricciones e integración futura",
    "El MVP no estima rutas reales ni capacidad compartida de proveedores. El piloto requiere fuentes autorizadas, "
    "vigencia y cobertura verificables, datos protegidos, roles y auditoría. FastAPI/PostGIS, conectores oficiales y "
    "orquestación forman parte del plan de evolución; no de la arquitectura activa.",335)
text("9.2 Referencias documentales",36,425,770,11,True)
text("Estructura adaptada de <link href='https://arc42.org/overview' color='#B8292B'>arc42</link> "
     "(alcance, estructura, ejecución, calidad y riesgos). Selección de vistas guiada por "
     "<link href='https://c4model.com/diagrams' color='#B8292B'>C4 Model</link>. "
     "Se utiliza notación simplificada; no se declara conformidad integral con estas referencias.",
     36,446,770,9.5)
text("Fuentes internas: docs/simulacion-red-ce2.md; docs/diseno-mvp-operativo.md; "
     "docs/plan-evolucion-rie01.md; docs/fuentes-integraciones-rie01.md; "
     "apps/web/src/domain/{escudo,supply,workflow}.ts.",36,491,770,9.5)
c.save()
print(f"{OUT}\n{page} páginas generadas.")
