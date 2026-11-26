"""Generate editable SVG screens and a self-contained navigation preview.

These are design artifacts, not the analytical implementation.
Run: python design/cajaescudo/generate.py
"""

from html import escape
from pathlib import Path
import textwrap

ROOT = Path(__file__).parent
RED, YELLOW = "#FF0901", "#FFC200"
WINE, ACTION = "#801D2B", "#A51D24"
INK, MUTED, LINE = "#202C39", "#596775", "#DFE5EB"
BG, BLUE, GREEN, AMBER = "#F4F7FA", "#225A86", "#17634C", "#805600"
PAGES = [
    ("panorama", "Panorama territorial"),
    ("cliente", "Vulnerabilidad del cliente"),
    ("cartera", "Estrés de cartera"),
    ("prevencion", "Prevención priorizada"),
    ("alertas", "Alertas y seguimiento"),
    ("metodologia", "Fuentes y metodología"),
]


class Screen:
    def __init__(self, key, title, subtitle):
        self.key = key
        self.parts = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1080" '
            f'viewBox="0 0 1440 1080" role="img" aria-label="{escape(title)}">',
            "<title>" + escape(title) + "</title>",
        ]
        self.rect(0, 0, 1440, 1080, BG, radius=0)
        self.rect(0, 0, 230, 1080, WINE, radius=0)
        self.parts.append(
            '<path d="M43 34 59 41v13c0 9-7 16-16 20-9-4-16-11-16-20V41Z" '
            f'fill="none" stroke="{YELLOW}" stroke-width="2.5"/>'
            f'<path d="m35 52 6 6 11-12" fill="none" stroke="{YELLOW}" '
            'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
        )
        self.text(72, 49, "CajaEscudo", 19, "#FFFFFF", 800)
        self.text(72, 68, "Anticipar para proteger", 10, "#F6DDE1")
        self.text(26, 116, "Caja Trujillo", 14, "#FFFFFF", 700)
        self.line(26, 138, 204, 138, "#A6505C")
        for i, (route, label) in enumerate(PAGES):
            y = 166 + i * 65
            active = key == route
            self.link_start(route)
            self.rect(16, y, 198, 53, "#A13B47" if active else WINE, radius=8)
            self.text(28, y + 30, f"{i + 1:02}", 11, YELLOW if active else "#DCB8BF", 700)
            self.text(57, y + 23, label, 12, "#FFFFFF", 700 if active else 500, width=148)
            self.link_end()
        self.rect(20, 720, 190, 132, "#69202D", radius=10)
        self.text(34, 746, "RIE-01 · Riesgos", 13, YELLOW, 700)
        self.text(34, 774, "Inclusión financiera y resiliencia", 12, "#FFFFFF", width=157)
        self.text(34, 824, "Owner: Miriam", 11, "#F6DDE1")
        self.text(24, 1008, "Entorno demostrativo", 11, "#FFFFFF", 700)
        self.text(24, 1030, "Sin datos personales reales", 10, "#F6DDE1")
        self.rect(230, 0, 1210, 76, "#FFFFFF", radius=0)
        self.rect(230, 0, 1210, 3, RED, radius=0)
        self.text(266, 32, "Caja Trujillo / Inteligencia climática y crediticia", 12, MUTED, 700)
        self.text(266, 53, "Corte ilustrativo: 25 nov 2026 · Acceso interno", 10, MUTED)
        self.pill(1120, 23, "Datos sintéticos", "amber", 144)
        self.text(1290, 43, "Miriam · Riesgos", 11, MUTED, 700)
        self.text(266, 124, title, 29, INK, 800)
        self.text(266, 153, subtitle, 13, MUTED)
        self.text(266, 1054, "CajaEscudo · RIE-01     /     Diseño demostrativo; no ejecuta modelos ni decisiones crediticias.", 11, MUTED)
        self.link_start("metodologia")
        self.text(1280, 1054, "Ver metodología", 11, ACTION, 700)
        self.link_end()

    def rect(self, x, y, w, h, fill="#FFFFFF", stroke=None, radius=12):
        self.parts.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" '
            f'fill="{fill}"' + (f' stroke="{stroke}"' if stroke else "") + "/>"
        )

    def text(self, x, y, content, size=14, color=INK, weight=400, width=None, leading=None):
        # Fixed wrap widths keep every line editable, with no foreignObject.
        lines = []
        for paragraph in str(content).split("\n"):
            lines.extend(textwrap.wrap(paragraph, max(8, int(width / (size * .56)))) if width else [paragraph])
        leading = leading or size * 1.48
        self.parts.append(
            f'<text x="{x}" y="{y}" font-family="Manrope, Arial, sans-serif" '
            f'font-size="{size}" font-weight="{weight}" fill="{color}">'
        )
        for i, line in enumerate(lines):
            self.parts.append(f'<tspan x="{x}" dy="{0 if i == 0 else leading}">{escape(line)}</tspan>')
        self.parts.append("</text>")

    def line(self, x, y, x2, y2, color=LINE, weight=1):
        self.parts.append(f'<path d="M{x} {y}H{x2}" stroke="{color}" stroke-width="{weight}"/>' if y == y2 else
                          f'<path d="M{x} {y}L{x2} {y2}" stroke="{color}" stroke-width="{weight}"/>')

    def link_start(self, key):
        self.parts.append(f'<a href="#{key}" aria-label="Abrir {key}" style="cursor:pointer">')

    def link_end(self):
        self.parts.append("</a>")

    def button(self, x, y, label, target, width=220, secondary=False):
        self.link_start(target)
        self.rect(x, y, width, 42, "#FFFFFF" if secondary else ACTION, LINE if secondary else None, 8)
        self.text(x + 16, y + 26, label, 12, INK if secondary else "#FFFFFF", 700)
        self.link_end()

    def pill(self, x, y, label, tone="blue", width=160):
        colors = {"blue": ("#EDF4FA", BLUE), "red": ("#FFF0EE", ACTION),
                  "green": ("#EAF5EF", GREEN), "amber": ("#FFF5D6", AMBER)}
        bg, fg = colors[tone]
        self.rect(x, y, width, 27, bg, radius=6)
        self.text(x + 10, y + 18, label, 10, fg, 700)

    def panel(self, x, y, w, h, title=None):
        self.rect(x, y, w, h, "#FFFFFF", LINE)
        if title:
            self.text(x + 20, y + 32, title, 16, INK, 700)

    def stat(self, x, y, label, value, note, width=272, color=INK):
        self.panel(x, y, width, 110)
        self.text(x + 16, y + 25, label, 11, MUTED, 600)
        self.text(x + 16, y + 64, value, 27, color, 800)
        self.text(x + 16, y + 91, note, 10, MUTED)

    def notice(self, y, content, tone="blue"):
        self.rect(266, y, 1138, 48, "#FFF5D6" if tone == "amber" else "#EDF4FA", radius=8)
        self.text(280, y + 20, content, 11, AMBER if tone == "amber" else BLUE, 500, width=1100)

    def table(self, y, headings, rows, widths, row_h=47):
        self.panel(266, y, 1138, 44 + row_h * len(rows))
        x = 286
        for label, w in zip(headings, widths):
            self.text(x, y + 27, label, 11, MUTED, 700)
            x += w
        for i, row in enumerate(rows):
            yy = y + 44 + i * row_h
            self.line(286, yy, 1384, yy)
            x = 286
            for j, (value, w) in enumerate(zip(row, widths)):
                self.text(x, yy + 28, value, 11, INK, 700 if j == 0 else 400)
                x += w

    def finish(self):
        return "".join(self.parts) + "</svg>"


def panorama():
    s = Screen("panorama", "Panorama de riesgo", "Prioriza dónde actuar, no a quién excluir.")
    s.panel(266, 181, 1138, 62)
    for x, label, value in [(284, "Amenaza", "Lluvias e inundación"), (555, "Territorio", "La Libertad"),
                            (770, "Horizonte", "30 días"), (944, "Intensidad", "Severa")]:
        s.text(x, 202, label, 10, MUTED)
        s.text(x, 224, value, 12, INK, 700)
    s.pill(1207, 199, "Evento simulado", "amber", 173)
    for x, label, val, note, color in [
        (266, "Cartera analizada", "S/ 48.0 M", "2,400 clientes · 5 segmentos", INK),
        (555, "Saldo expuesto", "S/ 7.68 M", "384 clientes · 16% de cartera", INK),
        (844, "Presión de pago simulada", "126 clientes", "No equivale a incumplimiento", ACTION),
        (1133, "Alertas por revisar", "18", "6 altas · 12 moderadas", AMBER)]:
        s.stat(x, 261, label, val, note, width=271, color=color)
    s.panel(266, 391, 714, 397, "La Libertad · focos de exposición")
    s.text(286, 444, "Esquema territorial: no usar para decisiones de ubicación.", 10, MUTED)
    s.link_start("cliente")
    s.parts.append(
        '<g transform="translate(286 462)">'
        '<rect width="674" height="269" rx="8" fill="#EAF0F3"/>'
        '<path d="M0 0H190L167 46 182 87 150 129 163 172 138 218 152 269H0Z" fill="#D3E4EE"/>'
        '<g stroke="white" stroke-width="3">'
        '<path d="M190 0 264 22 300 8 327 63 288 109 221 98 182 87 167 46Z" fill="#EAC5A9"/>'
        '<path d="m182 87 39 11 67 11 30 46-43 42-70-22-55-46Z" fill="#CF806A"/>'
        '<path d="m150 129 55 46 70 22 25 41-57 31h-91l-14-51 25-46Z" fill="#F0C65B"/>'
        '<path d="m300 8 90-8h80l-13 62-68 42-62-41Z" fill="#D9E3D8"/>'
        '<path d="m327 63 62 41-7 80-64-29-30-46Z" fill="#F0C65B"/>'
        '<path d="m389 104 68-42 83 44-15 86-88 43-55-51Z" fill="#E5D7AD"/>'
        '<path d="m275 197 43-42 64 29 55 51-20 34H243l57-31Z" fill="#E5B1A0"/>'
        '<path d="m457 62 13-62h204v269H417l20-34 88-43 15-86Z" fill="#DEE6DC"/></g>'
        '<path d="M674 61C571 38 535 152 450 138S351 213 288 164 223 179 163 151" '
        'fill="none" stroke="#779FB4" stroke-width="5"/>'
        '<g fill="#A51D24" stroke="white" stroke-width="3">'
        '<circle cx="235" cy="132" r="8"/><circle cx="269" cy="156" r="6"/>'
        '<circle cx="344" cy="133" r="8"/><circle cx="283" cy="216" r="7"/>'
        '<circle cx="453" cy="159" r="6"/></g></g>'
    )
    for label, x, y in [("Océano Pacífico", 302, 680), ("Trujillo", 488, 566),
                        ("Laredo", 617, 565), ("Virú", 508, 712), ("Otuzco", 713, 587)]:
        s.text(x, y, label, 11, MUTED, 700)
    s.link_end()
    s.pill(286, 746, "Alta exposición", "red", 132)
    s.pill(430, 746, "Moderada", "amber", 110)
    s.pill(552, 746, "Menor", "green", 92)
    s.text(670, 764, "● Negocios sintéticos", 11, MUTED)
    s.panel(1000, 391, 404, 397, "Dónde empezar hoy")
    s.text(1020, 452, "El Porvenir y Laredo concentran negocios con poca liquidez y dependencia del inventario.",
           13, MUTED, width=360)
    s.pill(1020, 531, "6 alertas de prioridad alta", "red", 222)
    s.text(1020, 594, "Abarrotes El Porvenir", 19, INK, 800)
    s.text(1020, 626, "Microempresa · Comercio\nInterrupción estimada: 5–9 días\nCobertura bajo estrés: 0.83×",
           13, width=360)
    s.button(1020, 710, "Revisar vulnerabilidad", "cliente", 242)
    s.table(808, ["Cliente / negocio", "Zona", "Sector", "Saldo", "Prioridad"], [
        ["Abarrotes El Porvenir", "El Porvenir", "Comercio", "S/ 28,400", "Alta · revisar"],
        ["Agroindustrias El Valle", "Laredo", "Agricultura", "S/ 86,000", "Alta · revisar"],
        ["Transportes Santa Rosa", "Virú", "Transporte", "S/ 42,600", "Moderada"],
    ], [305, 210, 205, 180, 198], row_h=42)
    s.notice(990, "Exposición ≠ pérdida ≠ incumplimiento. Escenario ilustrativo, no aviso oficial. Las alertas requieren revisión humana.")
    return s


def cliente():
    s = Screen("cliente", "Vulnerabilidad del cliente", "Del evento climático a la capacidad de pago, con factores explicables.")
    s.panel(266, 185, 716, 205)
    s.pill(286, 203, "Alta prioridad de revisión", "red", 222)
    s.text(286, 269, "Abarrotes El Porvenir", 25, INK, 800)
    s.text(286, 300, "Cliente sintético C-0142 · Microempresa · Comercio minorista", 12, MUTED)
    s.text(286, 323, "El Porvenir, La Libertad · Ubicación aproximada y anonimizada", 12, MUTED)
    s.button(286, 340, "Preparar prevención", "prevencion", 218)
    s.button(516, 340, "Ver alerta A-018", "alertas", 190, True)
    s.panel(1002, 185, 402, 205, "Exposición financiera individual")
    s.text(1022, 260, "S/ 28,400", 29, INK, 800)
    s.text(1022, 292, "Obligaciones mensuales: S/ 1,410\nCaja: S/ 980 · Otras entidades: S/ 430\nHistorial: 0 días de atraso al corte", 12)
    for x, title, value, note in [
        (266, "Amenaza", "Lluvias severas", "Evento e intensidad simulados"),
        (555, "Negocio", "5–9 días", "Interrupción operativa"),
        (844, "Ingresos", "−18% a −32%", "Caída mensual ilustrativa"),
        (1133, "Pago", "0.83×", "Cobertura central bajo estrés")]:
        s.stat(x, 410, title, value, note, 271, ACTION if title == "Pago" else INK)
    s.panel(266, 540, 558, 335, "Por qué necesita atención")
    for i, (title, detail, tone) in enumerate([
        ("Inventario a nivel del suelo", "Mayor sensibilidad al ingreso de agua.", "red"),
        ("Liquidez para 4 días", "Reserva menor al rango de interrupción.", "amber"),
        ("Una sola ruta de abastecimiento", "Dependencia de continuidad del transporte.", "amber"),
        ("Pagos al día", "Resiliencia crediticia; no elimina la exposición.", "green")]):
        y = 600 + i * 65
        s.pill(286, y - 18, "Protege" if tone == "green" else "Expone", tone, 80)
        s.text(382, y, title, 12, INK, 700)
        s.text(382, y + 21, detail, 10, MUTED)
    s.panel(844, 540, 560, 335, "El flujo puede ser insuficiente")
    s.text(864, 600, "64% de las trayectorias ilustrativas presentan flujo disponible menor a las obligaciones del mes.",
           13, width=510)
    s.pill(864, 647, "No es probabilidad de incumplimiento", "amber", 340)
    for i, (label, value, length, color) in enumerate([
        ("Flujo base", "S/ 2,000", 470, BLUE), ("Obligaciones", "S/ 1,410", 331, MUTED),
        ("Flujo bajo estrés", "S/ 1,170", 275, ACTION)]):
        yy = 709 + i * 49
        s.text(864, yy, label, 12)
        s.text(1220, yy, value, 12, INK, 700)
        s.rect(864, yy + 11, length, 9, color, radius=4)
    s.notice(895, "Recomendación: verificar inventario, liquidez y rutas. Acordar medidas con el cliente; no inferir mora por su ubicación.")
    s.panel(266, 960, 1138, 65)
    s.text(284, 983, "Trazabilidad: corte mensual 25 nov 2026 · Escenario sintético · Ubicación aproximada · Versión conceptual CE-0.1", 11, MUTED)
    s.text(284, 1006, "Datos faltantes: seguro y reserva alternativa · Calidad limitada · Validación con el asesor requerida.", 11, MUTED)
    return s


def cartera():
    s = Screen("cartera", "Estrés climático de cartera", "Distingue exposición, daño al negocio y pérdida crediticia.")
    s.notice(182, "Ejercicio ilustrativo. No constituye estimación regulatoria, provisión contable ni pronóstico calibrado.", "amber")
    for x, label, value, note, color in [
        (266, "Saldo expuesto (EAD)", "S/ 7.68 M", "No representa pérdida", INK),
        (555, "Pérdida crediticia de estrés", "S/ 422 mil", "PD × LGD × EAD · supuestos", ACTION),
        (844, "Rango ilustrativo de pérdida", "S/ 230–610 mil", "Rango de ejemplo, no calibrado", INK),
        (1133, "Incremento frente a base", "S/ 249 mil", "Base: S/ 173 mil", AMBER)]:
        s.stat(x, 248, label, value, note, 271, color)
    s.panel(266, 380, 716, 328, "La exposición no es la pérdida")
    s.text(286, 438, "Mismo saldo expuesto; distinta afectación según el escenario.", 12, MUTED)
    for i, (label, value, length, color) in enumerate([
        ("Base · PD 5.0%", "S/ 173 mil", 185, BLUE),
        ("Estrés · PD 12.2%", "S/ 422 mil", 450, ACTION),
        ("Con prevención · supuesto", "S/ 310 mil", 331, GREEN)]):
        yy = 479 + i * 64
        s.text(286, yy, label, 12)
        s.text(824, yy, value, 12, INK, 700)
        s.rect(286, yy + 12, length, 22, color, radius=4)
    s.text(286, 685, "LGD 45% · EAD S/ 7.68 M · Efecto preventivo hipotético, no validado.", 10, MUTED)
    s.panel(1002, 380, 402, 328, "Efecto institucional")
    s.text(1022, 441, "PD de estrés: 12.2% · LGD: 45%\nPérdida base: S/ 172,800\nPérdida de estrés: S/ 421,632", 13)
    s.line(1022, 513, 1384, 513)
    s.text(1022, 545, "Sensibilidad del resultado", 13, INK, 700)
    s.text(1022, 581, "−S/ 248,832", 25, ACTION, 800)
    s.text(1022, 610, "Antes de impuestos, si la pérdida incremental se reconociera como gasto. No duplicar pérdidas ya reconocidas.",
           12, MUTED, width=350)
    s.table(730, ["Segmento", "Clientes expuestos", "Saldo expuesto", "% del saldo expuesto"], [
        ["Consumo", "120", "S/ 1.20 M", "15.6%"],
        ["Microempresa", "180", "S/ 2.88 M", "37.5%"],
        ["Pequeña empresa", "60", "S/ 2.40 M", "31.3%"],
        ["Hipotecario", "20", "S/ 0.80 M", "10.4%"],
        ["Mediana empresa", "4", "S/ 0.40 M", "5.2%"],
    ], [310, 260, 270, 258], row_h=41)
    s.button(266, 992, "Comparar medidas preventivas", "prevencion", 276)
    s.button(554, 992, "Revisar supuestos", "metodologia", 205, True)
    return s


def prevencion():
    s = Screen("prevencion", "Prevenir antes del impacto", "Asigna recursos limitados a medidas que sostienen el negocio.")
    s.panel(266, 184, 1138, 190, "Plan preventivo · escenario severo")
    s.pill(1124, 202, "Propuesta para revisión", "amber", 255)
    s.text(286, 245, "Priorizar continuidad operativa con presupuesto y cobertura territorial.", 12, MUTED)
    for x, label, value in [
        (286, "Presupuesto disponible", "S/ 48,000"), (563, "Intervención propuesta", "S/ 45,600"),
        (840, "Reserva sin asignar", "S/ 2,400"), (1117, "Clientes únicos cubiertos", "78")]:
        s.text(x, 294, label, 11, MUTED)
        s.text(x, 337, value, 27, INK, 800)
    s.table(394, ["Intervención", "Clientes", "Costo estimado", "Prioridad"], [
        ["Elevar inventario y proteger mercadería", "30", "S/ 18,000", "Alta"],
        ["Proteger equipos y puntos eléctricos", "26", "S/ 15,600", "Alta"],
        ["Asegurar abastecimiento alternativo", "22", "S/ 12,000", "Moderada"],
    ], [520, 150, 250, 178], row_h=57)
    s.panel(266, 630, 558, 272, "Comparar antes de aprobar")
    s.text(286, 695, "Pérdida crediticia de estrés", 12, MUTED)
    s.text(286, 738, "S/ 422 mil → S/ 310 mil", 26, GREEN, 800)
    s.text(286, 775, "Reducción hipotética: S/ 112 mil\nCosto separado: S/ 45,600 · No es ahorro garantizado.", 12)
    s.pill(286, 844, "Efectividad aún no validada", "amber", 254)
    s.panel(844, 630, 560, 272, "No priorizar solo por saldo")
    s.text(864, 695, "Objetivo: reducir afectación estimada del negocio.\nRestricciones: presupuesto, elegibilidad y ejecución.\nCobertura: al menos 3 zonas y revisión por segmento.\nControl: no duplicar clientes ni medidas incompatibles.",
           13, width=514, leading=25)
    s.text(864, 832, "Salida estática de ejemplo. El optimizador propuesto no se ejecuta en este prototipo de diseño.",
           12, MUTED, width=507)
    s.notice(922, "Antes de actuar: validar costos, factibilidad y consentimiento. El plan no cambia contratos ni envía mensajes al cliente.")
    s.button(266, 990, "Revisar alertas del plan", "alertas", 244)
    s.button(522, 990, "Consultar metodología", "metodologia", 226, True)
    return s


def alertas():
    s = Screen("alertas", "Alertas y seguimiento", "Cada alerta es una tarea revisable, no una decisión crediticia.")
    for x, label, value, note, color in [
        (266, "Pendientes de revisión", "18", "6 altas · 12 moderadas", ACTION),
        (652, "En seguimiento", "7", "Con responsable y fecha registrados", INK),
        (1038, "Cerradas con evidencia", "12", "Historial conservado", GREEN)]:
        s.stat(x, 184, label, value, note, 366, color)
    s.panel(266, 315, 410, 514, "Bandeja priorizada")
    for i, (code, name, detail) in enumerate([
        ("A-018", "Abarrotes El Porvenir", "Alta · revisar antes del 26 nov"),
        ("A-017", "Agroindustrias El Valle", "Alta · verificar acceso y liquidez"),
        ("A-016", "Transportes Santa Rosa", "Moderada · confirmar ruta alterna")]):
        y = 374 + i * 119
        if i == 0:
            s.link_start("cliente")
        s.rect(286, y, 370, 100, "#FFF0EE" if i == 0 else BG, radius=8)
        s.text(300, y + 23, code, 10, ACTION, 700)
        s.text(300, y + 49, name, 14, INK, 700)
        s.text(300, y + 75, detail, 11, MUTED)
        if i == 0:
            s.link_end()
    s.text(286, 794, "Otros casos son referencias visuales.", 10, MUTED)
    s.panel(696, 315, 708, 514)
    s.pill(716, 336, "Alta prioridad", "red", 130)
    s.pill(858, 336, "Pendiente de revisión", "amber", 201)
    s.text(716, 409, "A-018 · Interrupción y presión de pago", 21, INK, 800)
    s.text(716, 442, "Evento simulado: lluvias severas · Horizonte: 30 días", 12, MUTED)
    s.text(716, 465, "Cliente C-0142 · Analista responsable: Miriam", 12, MUTED)
    s.line(716, 486, 1384, 486)
    s.text(716, 518, "Motivo de la alerta", 13, INK, 700)
    s.text(716, 545, "Reserva de 4 días frente a 5–9 días de cierre. El flujo central bajo estrés cubre 0.83× las obligaciones mensuales.",
           13, width=650)
    s.text(716, 610, "Acción preventiva sugerida", 13, INK, 700)
    s.text(716, 637, "Verificar mercadería expuesta, acordar elevación del inventario y confirmar abastecimiento alternativo con el negocio.",
           13, width=650)
    s.rect(716, 693, 668, 62, "#EDF4FA", radius=8)
    s.text(730, 716, "Revisión humana requerida", 12, BLUE, 700)
    s.text(730, 739, "Validar → contactar con consentimiento → documentar → dar seguimiento.", 11, BLUE)
    s.button(716, 772, "Ver plan preventivo", "prevencion", 220)
    s.button(948, 772, "Ver ficha del cliente", "cliente", 220, True)
    s.panel(266, 849, 1138, 120, "Trazabilidad del caso")
    s.text(286, 906, "25 nov · 09:10  Generada con escenario sintético CE-0.1\n25 nov · 09:15  Asignada a Miriam · Revisión pendiente", 12, MUTED)
    s.notice(990, "No se emiten comunicaciones, aprobaciones, rechazos ni reprogramaciones. Registrar evidencia queda pendiente de implementación.", "amber")
    return s


def metodologia():
    s = Screen("metodologia", "Fuentes y uso responsable", "Datos visibles, supuestos explícitos y decisiones bajo revisión humana.")
    s.notice(183, "Prototipo de navegación: cifras estáticas. No ejecuta modelos predictivos, optimización ni integraciones externas.", "amber")
    s.table(252, ["Insumo", "Estado en prototipo", "Actualización / control"], [
        ["Cartera y comportamiento de pago", "Sintético y anonimizado", "Corte mensual ilustrativo"],
        ["Amenaza climática · SENAMHI", "Prevista, sin integración", "Vigencia por verificar"],
        ["Mapas · CENEPRED / INDECI", "Previstos, sin integración", "Escala y licencia por verificar"],
        ["Ubicación de negocios", "Esquemática y aproximada", "Consentimiento y precisión"],
        ["Sobreendeudamiento", "Sintético e incompleto", "Faltante no equivale a cero"],
    ], [428, 320, 350], row_h=45)
    s.panel(266, 544, 558, 284, "Motor analítico propuesto")
    s.text(286, 609, "1. Cruce geoespacial de amenazas y negocios.\n2. Curvas de daño e interrupción por actividad.\n3. Monte Carlo de ingresos y recuperación.\n4. Estrés crediticio con PD, LGD y EAD.\n5. Optimización preventiva bajo restricciones.",
           13, leading=26)
    s.text(286, 770, "Pendiente: backtesting temporal, calibración, sensibilidad y comparación con reglas base. Evaluar errores por zona y segmento.",
           11, MUTED, width=511)
    s.panel(844, 544, 560, 284, "La persona conserva la decisión")
    s.text(864, 609, "Privacidad: acceso por rol, minimización y auditoría.\nCalidad: mostrar faltantes y antigüedad del dato.\nEquidad: revisar falsos positivos por segmento.\nGobernanza: revisión humana y evidencia.\nCartera: mínimo mensual; clima según vigencia.",
           12, leading=26)
    s.text(864, 771, "Una fuente vencida debe generar una advertencia; nunca sustituirse silenciosamente.", 12, ACTION, 700, width=508)
    s.panel(266, 850, 1138, 166, "Identidad visual verificada")
    s.rect(286, 901, 28, 28, RED, radius=5)
    s.rect(324, 901, 28, 28, YELLOW, radius=5)
    s.text(370, 921, "Rojo #FF0901 · Amarillo #FFC200", 13, INK, 700)
    s.text(286, 951, "Fuente: cajatrujillo.com.pe/estilos/cssOutFit.css · Consulta: 25 nov 2026", 11, MUTED)
    s.text(286, 976, "Manrope mantiene continuidad con Cauce. Borgoña y colores semánticos son extensiones de interfaz, no una paleta oficial declarada.",
           11, MUTED, width=1080)
    return s


def main():
    screens = [f() for f in (panorama, cliente, cartera, prevencion, alertas, metodologia)]
    out = ROOT / "screens"
    out.mkdir(exist_ok=True)
    for s in screens:
        (out / f"{s.key}.svg").write_text(s.finish(), encoding="utf-8")
    views = "".join(
        f'<section id="view-{s.key}" class="view" aria-label="{dict(PAGES)[s.key]}">{s.finish()}</section>'
        for s in screens
    )
    html = """<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CajaEscudo · Prototipo RIE-01</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#dfe5eb;font-family:Arial,sans-serif}
.preview-notice{margin:0;padding:10px 20px;background:#202c39;color:white;font-size:12px;text-align:center}
.preview-notice a{color:#ffc200}main{max-width:1600px;margin:20px auto;padding:0 20px}
.view{display:none;background:white;box-shadow:0 8px 32px #202c3914}
.view.active{display:block}svg{display:block;width:100%;height:auto}a:focus-visible{outline:3px solid #225a86}
@media(max-width:900px){main{min-width:1050px}body{overflow-x:auto}.preview-notice{text-align:left}}
</style>
<p class="preview-notice">Prototipo de escritorio navegable · Datos sintéticos · Sin motor analítico.
Usa el menú o los botones para recorrer las seis vistas.</p><main>""" + views + """</main>
<script>
const routes=new Set(['panorama','cliente','cartera','prevencion','alertas','metodologia']);
function render(){
 const key=location.hash.slice(1);const route=routes.has(key)?key:'panorama';
 document.querySelectorAll('.view').forEach(v=>{v.classList.toggle('active',v.id==='view-'+route)});
 document.title='CajaEscudo · '+document.querySelector('.view.active').getAttribute('aria-label');
}
window.addEventListener('hashchange',render);render();
</script></html>"""
    (ROOT / "preview.html").write_text(html, encoding="utf-8")
    print(f"Generated {len(screens)} SVG screens and {ROOT / 'preview.html'}")


if __name__ == "__main__":
    main()
