"""Side view beasts, flyers and siege engines, and front view ghosts."""

import math

from .pixels import Canvas, rgba, shade

LEG_STEPS = [(0, 2), (1, 1), (2, 0), (1, 1)]


def color(params, key, fallback=None):
    value = params.get(key)
    return rgba(fallback) if value is None and fallback else (None if value is None else rgba(value))


def dog_head(canvas, params, x, y, tint):
    canvas.rounded(x, y, x + 7, y + 6, tint)
    canvas.rect(x + 6, y + 3, x + 9, y + 5, shade(tint, 0.9), True)
    canvas.dot(x + 9, y + 3, rgba("#141017"))
    canvas.rect(x + 1, y - 2, x + 2, y, shade(tint, 0.8))
    eyes = color(params, "eyes", "#e0605a")
    canvas.dot(x + 5, y + 2, eyes)
    canvas.rect(x + 6, y + 6, x + 8, y + 6, rgba("#e8e0cc"))


def quadruped_frame(params, step, attack):
    size = params.get("size", 0)
    canvas = Canvas(36 + 2 * size, 26 + size)
    body = color(params, "body")
    oy = 4 + size
    lunge = 2 if attack else 0
    tail = color(params, "tail") or shade(body, 0.8)
    canvas.line(4, oy + 6, 8, oy + 8, tail)
    canvas.line(3, oy + 5, 4, oy + 6, tail)
    for index, x in enumerate((10, 13, 20 + size, 23 + size)):
        lift = LEG_STEPS[(step + index * 2) % 4][0]
        canvas.rect(x, oy + 13 - lift, x + 1, oy + 17 + size - lift, shade(body, 0.8))
    canvas.ellipse(16 + size + lunge / 2, oy + 9, 9 + size, 4 + size / 2, body)
    if params.get("ribs", False):
        for x in range(12, 21 + size, 2):
            canvas.line(x + lunge // 2, oy + 7, x + lunge // 2, oy + 11, rgba("#e8e0cc"))
    flames = color(params, "flames")
    if flames is not None:
        for index, x in enumerate(range(9, 24 + size, 3)):
            height = 2 + (index + step) % 3
            canvas.line(x, oy + 5, x, oy + 5 - height, flames)
            canvas.dot(x, oy + 4 - height, rgba("#fbe3a2"))
    head_x = 23 + 2 * size + lunge
    for extra in range(params.get("heads", 1) - 1, 0, -1):
        dog_head(canvas, params, head_x - 3 * extra, oy - 1 - 3 * extra + extra * 2, shade(body, 0.8))
    dog_head(canvas, params, head_x, oy + 1, body)
    return canvas.image


def quadruped(name, params):
    frames = {f"{name}-walk-{step}": quadruped_frame(params, step, False) for step in range(4)}
    frames[f"{name}-attack-0"] = quadruped_frame(params, 0, True)
    frames[f"{name}-attack-1"] = quadruped_frame(params, 2, False)
    return frames


WING_TIPS = [(-7, -8), (-9, -2), (-7, 6), (-9, -2)]


def flyer_frame(params, step, attack):
    size = params.get("size", 0)
    canvas = Canvas(34 + 3 * size, 28 + 2 * size)
    body = color(params, "body")
    wing = color(params, "wing") or shade(body, 0.8)
    cx, cy = 16 + size, 13 + size
    tip_x, tip_y = WING_TIPS[step % 4]
    span = 1.4 + size / 4

    def wing_shape(shift):
        return [
            (cx + 2, cy - 1),
            (cx + tip_x * span + shift, cy + tip_y * span - 1),
            (cx + tip_x * span * 0.6 + shift, cy + tip_y * span * 0.3 + 3),
            (cx - 5 - size, cy + 3),
            (cx + 2, cy + 2),
        ]

    canvas.polygon(wing_shape(4), shade(wing, 0.65))
    neck = params.get("neck", 0)
    tail = params.get("tail", 0)
    if tail:
        canvas.line(cx - 4, cy + 1, cx - 4 - tail, cy + 3, body)
    canvas.ellipse(cx, cy + 1, 4 + size / 2, 2.5 + size / 3, body)
    if params.get("ribs", False):
        for x in range(cx - 3, cx + 4, 2):
            canvas.dot(x, cy + 1, shade(body, 0.6))
    head_x = cx + 4 + neck + (2 if attack else 0)
    head_y = cy - 2 - neck // 2
    if neck:
        canvas.line(cx + 3, cy, head_x, head_y + 1, body)
        canvas.line(cx + 3, cy + 1, head_x, head_y + 2, body)
    canvas.rounded(head_x - 1, head_y - 1, head_x + 3, head_y + 2, body)
    canvas.dot(head_x + 2, head_y, color(params, "eyes", "#e0605a"))
    beak = color(params, "beak")
    if beak is not None:
        canvas.rect(head_x + 4, head_y + 1, head_x + 5, head_y + 1, beak)
    ears = params.get("ears", False)
    if ears:
        canvas.dot(head_x, head_y - 2, body)
        canvas.dot(head_x + 2, head_y - 2, body)
    horns = color(params, "horns")
    if horns is not None:
        canvas.line(head_x, head_y - 1, head_x - 2, head_y - 4, horns)
    canvas.polygon(wing_shape(0), wing)
    for bone_step in (0.5, 0.8):
        canvas.line(
            cx + 1,
            cy,
            round(cx + tip_x * span * bone_step),
            round(cy + tip_y * span * bone_step),
            shade(wing, 0.75),
        )
    canvas.dot(cx, cy + 4 + size // 2, shade(body, 0.6))
    canvas.dot(cx + 2, cy + 4 + size // 2, shade(body, 0.6))
    return canvas.image


def flyer(name, params):
    frames = {f"{name}-walk-{step}": flyer_frame(params, step, False) for step in range(4)}
    frames[f"{name}-attack-0"] = flyer_frame(params, 1, True)
    frames[f"{name}-attack-1"] = flyer_frame(params, 3, False)
    return frames


def ghost_frame(params, step, attack):
    size = params.get("size", 0)
    canvas = Canvas(26 + 2 * size, 30 + 2 * size)
    body = color(params, "body")
    cx = 13 + size
    for y in range(4, 26 + size):
        half = 5 + size // 2 + (y - 4) // 5
        wave = math.sin((y + step * 2) / 3) * 1.2 if y > 16 else 0
        canvas.rect(cx - half + wave, y, cx + half + wave, y, body)
        canvas.dot(cx + half + wave, y, shade(body, 0.75))
    for x in range(cx - 8 - size // 2, cx + 9 + size // 2, 3):
        canvas.dot(x + step % 2, 26 + size, body)
    hood = color(params, "hood")
    if hood is not None:
        canvas.rect(cx - 6, 3, cx + 6, 6, hood, True)
        canvas.rect(cx - 6, 7, cx - 5, 14, hood)
        canvas.rect(cx + 5, 7, cx + 6, 14, shade(hood, 0.8))
    hair = color(params, "hair")
    if hair is not None:
        canvas.rect(cx - 7, 3, cx - 5, 20, hair)
        canvas.rect(cx + 5, 3, cx + 7, 20, hair)
    face = color(params, "face") or rgba("#141017")
    canvas.rect(cx - 3, 8, cx - 2, 10, face)
    canvas.rect(cx + 2, 8, cx + 3, 10, face)
    eyes = color(params, "eyes")
    if eyes is not None:
        canvas.dot(cx - 2, 9, eyes)
        canvas.dot(cx + 2, 9, eyes)
    if params.get("mouth", False) or attack:
        canvas.rect(cx - 1, 12, cx + 1, 14 if attack else 13, face)
    crown = color(params, "crown")
    if crown is not None:
        canvas.rect(cx - 4, 1, cx + 4, 2, crown)
        for x in (-4, 0, 4):
            canvas.dot(cx + x, 0, crown)
    weapon = params.get("weapon")
    lift = -3 if attack else 0
    if weapon == "scythe":
        canvas.rect(cx + 8, 2 + lift, cx + 8, 27, rgba("#5e452b"))
        canvas.polygon([(cx + 8, 2 + lift), (cx - 2, 4 + lift), (cx, 6 + lift), (cx + 8, 4 + lift)], rgba("#c7ccd1"))
    elif weapon == "lantern":
        canvas.rect(cx + 8, 16 + lift, cx + 10, 19 + lift, rgba("#5fd45a"))
    return canvas.image


def ghost(name, params):
    frames = {f"{name}-walk-{step}": ghost_frame(params, step, False) for step in range(4)}
    frames[f"{name}-attack-0"] = ghost_frame(params, 0, True)
    frames[f"{name}-attack-1"] = ghost_frame(params, 2, False)
    return frames


def engine_frame(params, step, attack):
    size = params.get("size", 0)
    canvas = Canvas(36 + 2 * size, 26 + size)
    wood = color(params, "wood")
    bone = color(params, "bone", "#e8e0cc")
    base = 18 + size
    for x in (8, 26 + size):
        canvas.ellipse(x, base + 2, 3, 3, shade(wood, 0.7))
        canvas.dot(x + (step % 2), base + 2, bone)
    canvas.rect(5, base - 3, 29 + size, base, wood, True)
    kind = params.get("kind")
    if kind == "ballista":
        canvas.rect(14, base - 7, 16, base - 3, wood)
        canvas.line(8, base - 9, 26 + size, base - 9, bone)
        canvas.line(10, base - 12, 12, base - 9, bone)
        canvas.line(10, base - 6, 12, base - 9, bone)
        if not attack:
            canvas.rect(14, base - 10, 30 + size, base - 10, rgba("#7a5a38"))
    elif kind == "catapult":
        angle = -1.2 if attack else -0.3
        pivot = (12, base - 4)
        end = (pivot[0] + math.cos(angle) * (16 + size), pivot[1] + math.sin(angle) * (16 + size))
        canvas.line(pivot[0], pivot[1], round(end[0]), round(end[1]), bone)
        canvas.ellipse(end[0], end[1] - 1, 2, 2, rgba("#a6adb6"))
    elif kind == "mortar":
        canvas.rect(14, base - 10, 20, base - 3, rgba("#3a4150"), True)
        canvas.rect(13, base - 11, 21, base - 10, rgba("#4e5666"))
    elif kind == "gun":
        canvas.rect(10, base - 8, 28 + size, base - 6, rgba("#2b2430"), True)
        canvas.line(12, base - 5, 9, base, rgba("#3a4150"))
        canvas.line(16, base - 5, 19, base, rgba("#3a4150"))
        if attack:
            canvas.dot(29 + size, base - 7, rgba("#ff9a1f"))
    skull = params.get("skulls", False)
    if skull:
        for x in range(8, 28 + size, 5):
            canvas.dot(x, base - 2, bone)
    return canvas.image


def engine(name, params):
    frames = {f"{name}-walk-{step}": engine_frame(params, step, False) for step in range(4)}
    frames[f"{name}-attack-0"] = engine_frame(params, 0, True)
    frames[f"{name}-attack-1"] = engine_frame(params, 1, False)
    return frames
