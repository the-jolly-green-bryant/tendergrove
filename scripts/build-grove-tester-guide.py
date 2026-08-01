#!/usr/bin/env python3
from pathlib import Path

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
OUT_PATH = OUT_DIR / "grove-beta-tester-guide.pdf"
FEATURE = ROOT / "pwa" / "store" / "google-play" / "feature-graphic.png"
WORDMARK = ROOT / "pwa" / "public" / "assets" / "brand" / "grove-wordmark.png"
LIVE_SCREENSHOT = ROOT / "pwa" / "store" / "google-play" / "source" / "grove-live-dashboard.jpg"

GROUP_URL = "https://groups.google.com/g/grove-care-testers"
TEST_URL = "https://play.google.com/apps/testing/com.bryantjames.tendergrove"

INK = HexColor("#173B35")
GREEN = HexColor("#2E6D5D")
MINT = HexColor("#E8F4EF")
CREAM = HexColor("#FBF8F1")
GOLD = HexColor("#E5B85C")
MUTED = HexColor("#52665F")
CORAL = HexColor("#D98262")


def rounded_image(c, path, x, y, w, h, radius=12):
    c.saveState()
    clip = c.beginPath()
    clip.roundRect(x, y, w, h, radius)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(
        ImageReader(path),
        x,
        y,
        width=w,
        height=h,
        preserveAspectRatio=True,
        anchor="c",
        mask="auto",
    )
    c.restoreState()


def draw_qr(c, url, x, y, size):
    code = qr.QrCodeWidget(url)
    bounds = code.getBounds()
    scale = size / (bounds[2] - bounds[0])
    drawing = Drawing(size, size, transform=[scale, 0, 0, scale, 0, 0])
    drawing.add(code)
    drawing.drawOn(c, x, y)


def paragraph(c, text, x, y, w, style):
    p = Paragraph(text, style)
    _, h = p.wrap(w, 200)
    p.drawOn(c, x, y - h)
    return h


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT_PATH), pagesize=letter)
    width, height = letter

    c.setFillColor(CREAM)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    # Botanical background accents
    c.setFillColor(HexColor("#DDECE4"))
    c.circle(575, 755, 78, stroke=0, fill=1)
    c.setFillColor(HexColor("#F2DCCF"))
    c.circle(20, 75, 70, stroke=0, fill=1)

    # Premium hero
    c.setFillColor(INK)
    c.roundRect(28, 615, 556, 151, 22, stroke=0, fill=1)
    c.setFillColor(HexColor("#214D43"))
    c.circle(552, 742, 92, stroke=0, fill=1)
    c.setFillColor(CREAM)
    c.roundRect(50, 712, 132, 36, 12, stroke=0, fill=1)
    rounded_image(c, WORDMARK, 61, 717, 110, 27, 0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 29)
    c.drawString(50, 678, "Help us grow Grove")
    c.setFont("Helvetica", 12)
    c.drawString(51, 651, "A few thoughtful check-ins can help bring Grove to more families.")

    body = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=9, leading=12.5, textColor=MUTED, alignment=TA_LEFT
    )
    small = ParagraphStyle(
        "small", fontName="Helvetica", fontSize=7.5, leading=10, textColor=MUTED, alignment=TA_LEFT
    )

    # Authentic app preview
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(38, 586, "See what families can notice")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(MUTED)
    c.drawString(39, 571, "Real household view from the Grove app")
    c.setFillColor(HexColor("#DCE9E3"))
    c.roundRect(37, 176, 226, 382, 19, stroke=0, fill=1)
    rounded_image(c, LIVE_SCREENSHOT, 43, 182, 214, 370, 14)

    # Right narrative and install flow
    card_x, card_y, card_w, card_h = 282, 176, 292, 410
    c.setFillColor(white)
    c.roundRect(card_x, card_y, card_w, card_h, 20, stroke=0, fill=1)
    c.setStrokeColor(HexColor("#DCE7E1"))
    c.roundRect(card_x, card_y, card_w, card_h, 20, stroke=1, fill=0)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(card_x + 20, card_y + card_h - 34, "Why Grove matters")

    why_items = [
        (
            CORAL,
            "ANALYTICS",
            "See meaningful patterns across everyday check-ins.",
        ),
        (
            GREEN,
            "APPOINTMENT PREP",
            "Turn those patterns into a clear, care-ready summary.",
        ),
    ]
    why_y = card_y + card_h - 72
    for color, title, desc in why_items:
        c.setFillColor(HexColor("#F4F8F5"))
        c.roundRect(card_x + 18, why_y - 27, card_w - 36, 37, 9, stroke=0, fill=1)
        c.setFillColor(color)
        c.circle(card_x + 32, why_y - 8, 4.5, stroke=0, fill=1)
        c.setFont("Helvetica-Bold", 7.3)
        c.drawString(card_x + 44, why_y, title)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 7.5)
        c.drawString(card_x + 44, why_y - 12, desc)
        why_y -= 44

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(card_x + 20, card_y + card_h - 160, "Install in 3 steps")

    steps = [
        ("1", "Join the tester group", "Scan the left code and tap <b>Join group</b>."),
        ("2", "Opt in on Google Play", "Scan the right code with the same Google account."),
        ("3", "Explore Grove anytime", "Check-ins, analytics, and appointment prep - anytime."),
    ]
    sy = card_y + card_h - 188
    step_colors = [CORAL, GOLD, GREEN]
    for i, (number, title, desc) in enumerate(steps):
        c.setFillColor(step_colors[i])
        c.circle(card_x + 34, sy + 2, 12, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawCentredString(card_x + 34, sy - 1.5, number)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(card_x + 54, sy + 5, title)
        paragraph(c, desc, card_x + 54, sy - 1, 205, small)
        sy -= 43

    c.setFillColor(MINT)
    c.roundRect(card_x + 16, card_y + 16, card_w - 32, 111, 15, stroke=0, fill=1)
    qr_y = card_y + 38
    draw_qr(c, GROUP_URL, card_x + 35, qr_y, 72)
    draw_qr(c, TEST_URL, card_x + 183, qr_y, 72)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 7.2)
    c.drawCentredString(card_x + 71, qr_y - 11, "1. JOIN GROUP")
    c.drawCentredString(card_x + 219, qr_y - 11, "2. OPT IN")

    # Tester checklist
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(38, 145, "What to try")
    tasks = [
        "Complete a check-in",
        "Review household trends",
        "Open appointment prep",
        "Share honest feedback",
    ]
    task_x = [38, 174, 311, 448]
    for x, item in zip(task_x, tasks):
        c.setFillColor(GREEN)
        c.circle(x + 5, 119, 5, stroke=0, fill=1)
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 7.8)
        c.drawString(x + 15, 116, item)

    c.setFillColor(GREEN)
    c.roundRect(28, 42, 556, 47, 14, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11.5)
    c.drawString(47, 69, "Thank you for helping Grove reach families on Google Play.")
    c.setFont("Helvetica", 7.4)
    c.drawString(47, 54, "Support & feedback: bryant@bryantjames.com")
    c.linkURL(
        "mailto:bryant@bryantjames.com",
        (46, 50, 235, 64),
        relative=0,
        thickness=0,
    )
    c.setFont("Helvetica-Bold", 7.5)
    c.drawRightString(566, 63, "GROVE CARE")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.8)
    c.drawCentredString(
        306,
        23,
        "Use the same Google account for the group, opt-in page, and Play Store. "
        "Grove is informational and not medical advice.",
    )

    c.setTitle("Grove Beta Tester Guide")
    c.setAuthor("Grove Care")
    c.save()
    print(OUT_PATH)


if __name__ == "__main__":
    build()
