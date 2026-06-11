#!/usr/bin/env python3
"""Favicon seti üretir: teal yuvarlatılmış kare üzerine beyaz Psi (Ψ) işareti.

Harici bağımlılık yok (PIL/ImageMagick gerekmez); PNG'ler stdlib zlib ile yazılır.
Üretilenler: favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png (180),
images/logo.png (512), favicon.ico (32'lik PNG'yi saran ICO).
"""
import math
import struct
import zlib

TEAL = (13, 148, 136)      # tailwind primary-600 (#0d9488)
TEAL_DARK = (15, 118, 110) # primary-700, hafif dikey degrade için
WHITE = (255, 255, 255)
SS = 4  # kenar yumuşatma için süper örnekleme katsayısı


def rounded_rect(x, y, s, radius):
    r = radius
    cx = min(max(x, r), s - r)
    cy = min(max(y, r), s - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def psi_glyph(x, y, s):
    """(x, y) noktası Ψ işaretinin içinde mi? Koordinatlar [0, s] aralığında."""
    u, v = x / s, y / s
    half_w = 0.055          # kol yarı kalınlığı
    cx, bowl_cy = 0.5, 0.46 # çanak merkezi
    r_mid = 0.21            # çanak orta yarıçapı
    top, stem_bot = 0.24, 0.80

    # orta gövde
    if abs(u - cx) <= half_w and top <= v <= stem_bot:
        return True
    # yan kollar (çanağın üstünden yukarı)
    if abs(abs(u - cx) - r_mid) <= half_w and top <= v <= bowl_cy:
        return True
    # çanak: alt yarım halka
    d = math.hypot(u - cx, v - bowl_cy)
    if v >= bowl_cy and abs(d - r_mid) <= half_w:
        return True
    return False


def render(size):
    big = size * SS
    radius = big * 0.22
    px = bytearray()
    for yy in range(size):
        row = bytearray()
        for xx in range(size):
            acc_r = acc_g = acc_b = acc_a = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = xx * SS + sx + 0.5
                    y = yy * SS + sy + 0.5
                    if rounded_rect(x, y, big, radius):
                        t = y / big
                        base = tuple(
                            round(TEAL[i] + (TEAL_DARK[i] - TEAL[i]) * t) for i in range(3)
                        )
                        c = WHITE if psi_glyph(x, y, big) else base
                        acc_r += c[0]; acc_g += c[1]; acc_b += c[2]; acc_a += 255
            n = SS * SS
            row += bytes((acc_r // n, acc_g // n, acc_b // n, acc_a // n))
        px += b"\x00" + row  # her satır başına filtre baytı
    return px


def write_png(path, size):
    raw = render(size)
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"✓ {path} ({size}x{size}, {len(png)} bayt)")
    return png


def write_ico(path, png_bytes, size):
    # Tek girdili, PNG gömülü ICO (modern tarayıcılar ve Google destekler)
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32,
                        len(png_bytes), 6 + 16)
    with open(path, "wb") as f:
        f.write(header + entry + png_bytes)
    print(f"✓ {path}")


if __name__ == "__main__":
    write_png("favicon-16x16.png", 16)
    png32 = write_png("favicon-32x32.png", 32)
    write_png("apple-touch-icon.png", 180)
    write_png("images/logo.png", 512)
    write_ico("favicon.ico", png32, 32)
