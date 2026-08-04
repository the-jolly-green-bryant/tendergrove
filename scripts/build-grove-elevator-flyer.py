#!/usr/bin/env python3
from pathlib import Path

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "grove-elevator-pitch-flyer.pdf"
ASSETS = ROOT / "pwa" / "store" / "google-play"
WORDMARK = ROOT / "pwa" / "public" / "assets" / "brand" / "grove-wordmark.png"

GROUP_URL = "https://groups.google.com/g/grove-care-testers"
TEST_URL = "https://play.google.com/apps/testing/com.bryantjames.tendergrove"
SUPPORT = "bryant@bryantjames.com"

INK = HexColor("#173B35")
DEEP = HexColor("#214D43")
GREEN = HexColor("#2E6D5D")
MINT = HexColor("#E6F2EC")
CREAM = HexColor("#FBF8F1")
GOLD = HexColor("#E5B85C")
CORAL = HexColor("#D98262")
MUTED = HexColor("#52665F")
LINE = HexColor("#D9E5DF")


def rounded_image(c, source, x, y, width, height, radius=14):
    c.saveState()
    clip = c.beginPath()
    clip.roundRect(x, y, width, height, radius)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(
        ImageReader(source),
        x,
        y,
        width=width,
        height=height,
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


def pill(c, text, x, y, width, fill, color=INK):
    c.setFillColor(fill)
    c.roundRect(x, y, width, 25, 12.5, stroke=0, fill=1)
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(x + width / 2, y + 8.5, text)


def page_one(c):
    width, height = letter
    c.setFillColor(CREAM)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(MINT)
    c.circle(588, 760, 105, stroke=0, fill=1)
    c.setFillColor(HexColor("#F3DED2"))
    c.circle(-8, 92, 85, stroke=0, fill=1)

    rounded_image(c, WORDMARK, 42, 727, 145, 37, 0)
    pill(c, "FAMILY WELLBEING, MADE CLEARER", 390, 733, 174, MINT, GREEN)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(42, 672, "Care days blur together.")
    c.drawString(42, 637, "Grove helps you see the story.")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 13)
    c.drawString(43, 607, "Quick check-ins become useful analytics and appointment-ready summaries")
    c.drawString(43, 589, "for the people you care about.")

    # Three-step value story.
    cards = [
        (CORAL, "1", "CHECK IN", "Capture difficult signals, positive changes,\nand meaningful events in a few taps."),
        (GOLD, "2", "SEE THE PATTERN", "Notice trends, persistent stretches, and\nwhat may be changing over time."),
        (GREEN, "3", "ARRIVE PREPARED", "Bring clear charts, notes, and a concise\nsummary into care conversations."),
    ]
    for index, (color, number, title, body) in enumerate(cards):
        x = 42 + index * 177
        c.setFillColor(white)
        c.roundRect(x, 438, 160, 117, 15, stroke=0, fill=1)
        c.setStrokeColor(LINE)
        c.roundRect(x, 438, 160, 117, 15, stroke=1, fill=0)
        c.setFillColor(color)
        c.circle(x + 22, 532, 11, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(x + 22, 529, number)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x + 40, 528, title)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 8)
        for line_index, line in enumerate(body.split("\n")):
            c.drawString(x + 14, 495 - line_index * 12, line)

    # App previews.
    previews = [
        (ASSETS / "phone-screenshots" / "02-check-in.png", 42, "A QUICK CHECK-IN"),
        (ASSETS / "phone-screenshots" / "03-person-trend.png", 224, "ANALYTICS OVER TIME"),
        (ASSETS / "phone-screenshots" / "04-appointment-prep.png", 406, "APPOINTMENT PREP"),
    ]
    for source, x, label in previews:
        c.setFillColor(HexColor("#E0EBE5"))
        c.roundRect(x, 151, 160, 257, 18, stroke=0, fill=1)
        rounded_image(c, source, x + 6, 157, 148, 245, 13)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawCentredString(x + 80, 134, label)

    c.setFillColor(DEEP)
    c.roundRect(42, 52, 524, 58, 16, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(61, 83, "Less reconstructing. More useful conversations.")
    c.setFont("Helvetica", 8)
    c.drawString(61, 66, "For parents, caregivers, and anyone supporting another person's wellbeing.")
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(548, 74, "TURN OVER TO TRY GROVE")

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(width / 2, 24, "Grove organizes observations. It does not diagnose or replace professional care.")


def install_step(c, number, title, detail, x, y, color):
    c.setFillColor(color)
    c.circle(x + 15, y + 4, 15, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(x + 15, y, str(number))
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x + 42, y + 6, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(x + 42, y - 9, detail)


def page_two(c):
    width, height = letter
    c.setFillColor(CREAM)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    c.setFillColor(INK)
    c.roundRect(28, 628, 556, 136, 22, stroke=0, fill=1)
    c.setFillColor(DEEP)
    c.circle(558, 748, 90, stroke=0, fill=1)
    c.setFillColor(CREAM)
    c.roundRect(48, 714, 137, 35, 11, stroke=0, fill=1)
    rounded_image(c, WORDMARK, 58, 719, 117, 25, 0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 29)
    c.drawString(48, 676, "Try Grove on Android")
    c.setFont("Helvetica", 11)
    c.drawString(49, 652, "Use the same Google account for all three steps below.")

    install_step(c, 1, "Join the Grove tester group", "Scan the code, then tap Join group.", 46, 586, CORAL)
    install_step(c, 2, "Opt in through Google Play", "Scan the code using that same Google account.", 320, 586, GOLD)

    # QR cards.
    qr_cards = [
        (44, GROUP_URL, "JOIN THE GROUP", "groups.google.com/g/grove-care-testers"),
        (318, TEST_URL, "OPT IN TO GROVE", "play.google.com/apps/testing/\ncom.bryantjames.tendergrove"),
    ]
    for x, url, title, url_text in qr_cards:
        c.setFillColor(white)
        c.roundRect(x, 348, 250, 202, 18, stroke=0, fill=1)
        c.setStrokeColor(LINE)
        c.roundRect(x, 348, 250, 202, 18, stroke=1, fill=0)
        draw_qr(c, url, x + 66, 399, 118)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(x + 125, 379, title)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.8)
        for line_index, line in enumerate(url_text.split("\n")):
            c.drawCentredString(x + 125, 365 - line_index * 8, line)

    install_step(c, 3, "Install and explore", "Google Play will show an Install button after you opt in.", 46, 311, GREEN)

    c.setFillColor(MINT)
    c.roundRect(44, 166, 524, 111, 17, stroke=0, fill=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(64, 246, "A good first five minutes")
    checklist = [
        "Add or open a person",
        "Complete a check-in",
        "Review their trend",
        "Open appointment prep",
    ]
    positions = [(64, 216), (310, 216), (64, 190), (310, 190)]
    for item, (x, y) in zip(checklist, positions):
        c.setStrokeColor(GREEN)
        c.setLineWidth(1.2)
        c.roundRect(x, y - 2, 12, 12, 3, stroke=1, fill=0)
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(x + 20, y, item)

    c.setFillColor(DEEP)
    c.roundRect(44, 68, 524, 70, 17, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(64, 109, "Questions, support, or candid feedback?")
    c.setFont("Helvetica", 10)
    c.drawString(64, 86, SUPPORT)
    c.linkURL(f"mailto:{SUPPORT}", (63, 82, 235, 99), relative=0, thickness=0)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(548, 91, "GROVE CARE")

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(width / 2, 34, "If Google Play does not show Install, confirm every step used the same Google account.")


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=letter)
    c.setTitle("Grove - What It Is and How to Get It")
    c.setAuthor("Grove Care")
    page_one(c)
    c.showPage()
    page_two(c)
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
