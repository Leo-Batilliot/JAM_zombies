"""Seamless ground tiles, roofs, walls and city props."""

import math
import random

from .pixels import Canvas, rgba, shade

TILE = 32


def speckle(canvas, base, rng, density, spread):
    for y in range(TILE):
        for x in range(TILE):
            canvas.dot(x, y, shade(base, 1 + (rng.random() - 0.5) * spread))
    for _ in range(int(TILE * TILE * density)):
        x, y = rng.randrange(TILE), rng.randrange(TILE)
        canvas.dot(x, y, shade(base, 0.7 + rng.random() * 0.5))


def stones(canvas, params, rng, rows, cols, jitter):
    mortar = rgba(params["mortar"])
    stone = rgba(params["color"])
    canvas.rect(0, 0, TILE - 1, TILE - 1, mortar)
    height = TILE // rows
    for row in range(rows):
        width = TILE // cols
        offset = (width // 2) * (row % 2)
        for col in range(-1, cols + 1):
            x0 = col * width + offset + 1
            y0 = row * height + 1
            tint = shade(stone, 1 + (rng.random() - 0.5) * jitter)
            for y in range(y0, y0 + height - 1):
                for x in range(x0, x0 + width - 1):
                    edge = y == y0 + height - 2 or x == x0 + width - 2
                    top = y == y0 or x == x0
                    canvas.dot(x % TILE, y % TILE, shade(tint, 0.82 if edge else 1.1 if top else 1))


def ground(params):
    rng = random.Random(params.get("seed", 1))
    canvas = Canvas(TILE, TILE)
    kind = params["kind"]
    if kind == "cobble":
        stones(canvas, params, rng, 4, 4, 0.25)
    elif kind == "flag":
        stones(canvas, params, rng, 2, 2, 0.15)
    else:
        speckle(canvas, rgba(params["color"]), rng, params.get("density", 0.1), params.get("spread", 0.2))
        for spot in params.get("spots", []):
            for _ in range(spot["count"]):
                x, y = rng.randrange(TILE), rng.randrange(TILE)
                tint = rgba(rng.choice(spot["colors"]))
                canvas.dot(x, y, tint)
                if spot.get("size", 1) > 1:
                    canvas.dot((x + 1) % TILE, y, tint)
                    canvas.dot(x, (y + 1) % TILE, shade(tint, 0.8))
    return canvas.image


def roof(params):
    canvas = Canvas(TILE, TILE)
    tint = rgba(params["color"])
    rng = random.Random(params.get("seed", 1))
    for row in range(0, TILE, 4):
        offset = 4 * ((row // 4) % 2)
        for x in range(TILE):
            shingle = (x + offset) % 8
            light = shade(tint, 1 + (rng.random() - 0.5) * 0.1)
            for y in range(row, row + 4):
                factor = 0.7 if y == row + 3 else 1.12 if y == row else 1
                if shingle == 0:
                    factor = 0.75
                canvas.dot(x, y, shade(light, factor))
    return canvas.image


def facade(params):
    canvas = Canvas(TILE, TILE)
    brick = rgba(params["color"])
    mortar = rgba(params["mortar"])
    canvas.rect(0, 0, TILE - 1, TILE - 1, mortar)
    for row in range(0, TILE, 4):
        offset = 4 * ((row // 4) % 2)
        for col in range(-1, 5):
            x0 = col * 8 + offset
            canvas.rect(x0 + 1, row + 1, x0 + 7, row + 3, brick, True)
    window = params.get("window")
    if window is not None:
        frame = rgba(params.get("frame", "#2e2219"))
        canvas.rect(10, 8, 21, 22, frame)
        canvas.rect(11, 9, 20, 21, rgba(window))
        canvas.rect(15, 9, 16, 21, frame)
        canvas.rect(11, 15, 20, 15, frame)
    return canvas.image


def tower(params):
    size = params.get("size", 48)
    canvas = Canvas(size, size)
    stone = rgba(params["color"])
    center = size / 2 - 0.5
    canvas.ellipse(center, center, size / 2 - 1, size / 2 - 1, shade(stone, 0.8))
    canvas.ellipse(center, center, size / 2 - 5, size / 2 - 5, stone)
    canvas.ellipse(center, center, size / 2 - 9, size / 2 - 9, shade(stone, 0.6), False)
    for index in range(12):
        angle = index * math.pi / 6
        x = center + math.cos(angle) * (size / 2 - 3)
        y = center + math.sin(angle) * (size / 2 - 3)
        canvas.rect(x - 1, y - 1, x + 1, y + 1, shade(stone, 1.15))
    return canvas.image


def tree(params):
    size = params.get("size", 40)
    canvas = Canvas(size, size + 8)
    trunk = rgba(params.get("trunk", "#45321f"))
    leaves = rgba(params["color"])
    center = size / 2 - 0.5
    canvas.ellipse(center, size + 4, size / 3, 3, rgba("#000000", 70), False)
    canvas.rect(center - 2, size / 2, center + 2, size + 3, trunk, True)
    if params.get("pine", False):
        for level in range(4):
            top = 2 + level * (size // 5)
            half = 4 + level * (size // 10)
            canvas.polygon([(center, top), (center - half, top + size // 4), (center + half, top + size // 4)], shade(leaves, 1 - level * 0.08))
        return canvas.image
    rng = random.Random(params.get("seed", 3))
    for _ in range(6):
        x = center + (rng.random() - 0.5) * size / 2.5
        y = size / 2.4 + (rng.random() - 0.5) * size / 3
        canvas.ellipse(x, y, size / 4, size / 4.5, shade(leaves, 0.85 + rng.random() * 0.3))
    accent = params.get("accent")
    if accent is not None:
        for _ in range(size):
            x = int(center + (rng.random() - 0.5) * size * 0.8)
            y = int(size / 2.4 + (rng.random() - 0.5) * size * 0.6)
            if canvas.image.getpixel((x, y))[3] > 0:
                canvas.dot(x, y, rgba(accent))
    return canvas.image


def fountain(params):
    canvas = Canvas(48, 40)
    stone = rgba(params["color"])
    water = rgba(params["water"])
    canvas.ellipse(23.5, 24, 22, 14, shade(stone, 0.85))
    canvas.ellipse(23.5, 23, 19, 11, water)
    for x, y in ((14, 21), (30, 26), (22, 18), (34, 20)):
        canvas.dot(x, y, shade(water, 1.4))
    canvas.ellipse(23.5, 20, 5, 4, stone)
    canvas.rect(22, 8, 25, 20, stone, True)
    canvas.ellipse(23.5, 8, 5, 2.5, shade(stone, 1.1))
    canvas.rect(23, 4, 24, 7, shade(water, 1.4))
    return canvas.image


def prop(params):
    kind = params["kind"]
    tint = rgba(params.get("color", "#7a5a38"))
    if kind == "lamp":
        canvas = Canvas(12, 40)
        canvas.rect(5, 8, 6, 38, tint, True)
        canvas.rect(3, 38, 8, 39, tint)
        canvas.rect(2, 2, 9, 9, shade(tint, 0.8))
        canvas.rect(3, 3, 8, 8, rgba(params.get("light", "#f3c46d")))
        return canvas.image
    if kind == "barrel":
        canvas = Canvas(14, 18)
        canvas.ellipse(6.5, 9, 6, 8, tint)
        for y in (4, 13):
            canvas.rect(1, y, 12, y, rgba("#3a4150"))
        canvas.ellipse(6.5, 3, 5, 2, shade(tint, 1.2), False)
        return canvas.image
    if kind == "car":
        canvas = Canvas(48, 26)
        canvas.rect(2, 10, 45, 19, tint, True)
        canvas.rect(10, 3, 34, 10, shade(tint, 0.9), True)
        canvas.rect(12, 5, 21, 9, rgba("#66707f"))
        canvas.rect(23, 5, 32, 9, rgba("#66707f"))
        for x in (11, 36):
            canvas.ellipse(x, 20, 4, 4, rgba("#1f1a22"))
            canvas.ellipse(x, 20, 1.5, 1.5, rgba("#858e9b"), False)
        for x, y in ((6, 12), (30, 15), (40, 11)):
            canvas.dot(x, y, rgba("#5a2a16"))
        return canvas.image
    if kind == "cross":
        canvas = Canvas(18, 34)
        canvas.rect(3, 28, 14, 33, shade(tint, 0.8), True)
        canvas.rect(7, 2, 10, 28, tint, True)
        canvas.rect(2, 8, 15, 11, tint, True)
        return canvas.image
    if kind == "grave":
        canvas = Canvas(16, 20)
        canvas.rect(1, 6, 14, 19, tint, True)
        canvas.ellipse(7.5, 6, 6.5, 5, tint)
        canvas.rect(7, 7, 8, 14, shade(tint, 0.6))
        canvas.rect(5, 9, 10, 10, shade(tint, 0.6))
        return canvas.image
    if kind == "palisade":
        canvas = Canvas(40, 30)
        for x in range(2, 38, 5):
            canvas.rect(x, 8, x + 3, 28, tint, True)
            canvas.polygon([(x, 8), (x + 3, 8), (x + 1.5, 3)], shade(tint, 1.1))
        canvas.rect(0, 14, 39, 15, shade(tint, 0.7))
        canvas.rect(0, 22, 39, 23, shade(tint, 0.7))
        return canvas.image
    if kind == "stall":
        canvas = Canvas(40, 32)
        stripe = rgba(params.get("stripe", "#e8e0cc"))
        canvas.rect(4, 14, 35, 30, shade(tint, 0.8), True)
        for x in range(0, 40, 4):
            canvas.rect(x, 4, x + 1, 13, stripe)
            canvas.rect(x + 2, 4, x + 3, 13, rgba(params.get("awning", "#a03030")))
        return canvas.image
    if kind == "gate":
        canvas = Canvas(40, 34)
        canvas.rect(0, 0, 39, 33, rgba(params.get("stone", "#66707f")), True)
        canvas.ellipse(19.5, 14, 13, 13, tint)
        canvas.rect(7, 14, 32, 33, tint, True)
        for x in range(9, 32, 5):
            canvas.rect(x, 4, x, 33, shade(tint, 0.7))
        return canvas.image
    raise ValueError(f"Unknown prop {kind}")
