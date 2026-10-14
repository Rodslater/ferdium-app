"""Generates every RodsHub icon from one geometry: app icon (png/ico), tray
icons and the in-app SVG logo. Run from the repository root:

    python build-helpers/rodshub/generate_icons.py
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
CANVAS = 1024
SUPERSAMPLE = 4

BACKGROUND_TOP = (18, 53, 91)
BACKGROUND_BOTTOM = (27, 153, 139)
HUB = (245, 165, 36)
SATELLITE = (255, 255, 255)
LINK = (255, 255, 255, 170)
UNREAD = (229, 57, 53)
INDIRECT = (30, 136, 229)

CORNER = 0.22
CENTER_RADIUS = 0.15
ORBIT = 0.30
SATELLITE_RADIUS = 0.075
LINK_WIDTH = 0.045
SATELLITES = 5


def satellite_points(size: float) -> list[tuple[float, float]]:
    center = size / 2
    return [
        (
            center + ORBIT * size * math.cos(math.radians(-90 + i * 360 / SATELLITES)),
            center + ORBIT * size * math.sin(math.radians(-90 + i * 360 / SATELLITES)),
        )
        for i in range(SATELLITES)
    ]


def gradient(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    pixels = image.load()
    assert pixels is not None
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            pixels[x, y] = tuple(
                round(top + (bottom - top) * t)
                for top, bottom in zip(BACKGROUND_TOP, BACKGROUND_BOTTOM)
            ) + (255,)
    return image


def draw_icon(size: int) -> Image.Image:
    big = size * SUPERSAMPLE
    mask = Image.new("L", (big, big))
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, big - 1, big - 1), radius=round(CORNER * big), fill=255
    )
    background = gradient(max(64, size)).resize((big, big))
    icon = Image.new("RGBA", (big, big))
    icon.paste(background, mask=mask)

    links = Image.new("RGBA", (big, big))
    draw_links = ImageDraw.Draw(links)
    center = big / 2
    for x, y in satellite_points(big):
        draw_links.line((center, center, x, y), fill=LINK, width=round(LINK_WIDTH * big))
    icon.alpha_composite(links)

    draw = ImageDraw.Draw(icon)
    for x, y in satellite_points(big):
        r = SATELLITE_RADIUS * big
        draw.ellipse((x - r, y - r, x + r, y + r), fill=SATELLITE)
    r = CENTER_RADIUS * big
    draw.ellipse((center - r, center - r, center + r, center + r), fill=HUB)
    return icon.resize((size, size), Image.Resampling.LANCZOS)


def with_badge(icon: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    size = icon.width
    big = size * SUPERSAMPLE
    badge = icon.resize((big, big), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(badge)
    r = big * 0.24
    cx, cy = big - r, r
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255))
    r *= 0.78
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    return badge.resize((size, size), Image.Resampling.LANCZOS)


def save_ico(path: Path, sizes: list[int], make) -> None:
    images = [make(size) for size in sizes]
    images[-1].save(path, sizes=[(s, s) for s in sizes], append_images=images[:-1])


def svg_logo() -> str:
    size = 1000
    center = size / 2
    links = "".join(
        f'<line x1="{center}" y1="{center}" x2="{x:.1f}" y2="{y:.1f}"/>'
        for x, y in satellite_points(size)
    )
    satellites = "".join(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{SATELLITE_RADIUS * size:.1f}"/>'
        for x, y in satellite_points(size)
    )

    def hex_color(rgb):
        return "#" + "".join(f"{c:02x}" for c in rgb[:3])

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">'
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{hex_color(BACKGROUND_TOP)}"/>'
        f'<stop offset="1" stop-color="{hex_color(BACKGROUND_BOTTOM)}"/>'
        "</linearGradient></defs>"
        f'<rect width="1000" height="1000" rx="{CORNER * size:.0f}" fill="url(#bg)"/>'
        f'<g stroke="#ffffff" stroke-opacity="{LINK[3] / 255:.2f}" '
        f'stroke-width="{LINK_WIDTH * size:.0f}" stroke-linecap="round">{links}</g>'
        f'<g fill="{hex_color(SATELLITE)}">{satellites}</g>'
        f'<circle cx="{center}" cy="{center}" r="{CENTER_RADIUS * size:.0f}" '
        f'fill="{hex_color(HUB)}"/>'
        "</svg>\n"
    )


def main() -> None:
    images = ROOT / "build-helpers" / "images"
    pngs = images / "icons"
    for size in (16, 24, 32, 48, 64, 96, 128, 256, 512, 1024):
        draw_icon(size).save(pngs / f"{size}x{size}.png")
    draw_icon(CANVAS).save(images / "icon.png")

    ico_sizes = [16, 24, 32, 48, 64, 128, 256]
    save_ico(images / "icon.ico", ico_sizes, draw_icon)
    save_ico(images / "win-app-ico.ico", ico_sizes, draw_icon)

    tray = ROOT / "src" / "assets" / "images" / "tray" / "win32"
    tray_sizes = [16, 32, 48, 64, 128, 256]
    save_ico(tray / "tray.ico", tray_sizes, draw_icon)
    save_ico(tray / "tray-unread.ico", tray_sizes, lambda s: with_badge(draw_icon(s), UNREAD))
    save_ico(tray / "tray-indirect.ico", tray_sizes, lambda s: with_badge(draw_icon(s), INDIRECT))

    logo = svg_logo()
    assets = ROOT / "src" / "assets" / "images"
    (assets / "logo.svg").write_text(logo, encoding="utf-8")
    (assets / "logo-beard-only.svg").write_text(logo, encoding="utf-8")


if __name__ == "__main__":
    main()
