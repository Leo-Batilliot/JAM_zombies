"""Front facing chibi humanoids: zombies, skeletons, mages, soldiers, champions."""

from .pixels import Canvas, rgba, shade

WIDTH = 24
HEIGHT = 30
WALK = [(0, 0), (-1, 1), (0, 0), (1, -1)]


def color(params, key):
    value = params.get(key)
    return None if value is None else rgba(value)


def draw_legs(canvas, params, step, ox, oy):
    legs = color(params, "legs")
    boots = color(params, "boots") or shade(legs, 0.6)
    left, right = WALK[step % len(WALK)]
    thin = params.get("bones", False)
    for x0, lift in ((8, left), (13, right)):
        width = 1 if thin else 2
        x = x0 + ox + (1 if thin else 0)
        canvas.rect(x, 22 + oy - max(lift, 0), x + width, 26 + oy, legs, True)
        canvas.rect(x - (0 if thin else 0), 27 + oy - max(lift, 0), x + width, 27 + oy - max(lift, 0), boots)


def draw_robe(canvas, params, step, ox, oy):
    robe = color(params, "robe")
    swing = (step % 2) * 1
    for y in range(14, 28):
        spread = (y - 14) // 3
        canvas.rect(6 + ox - spread, y + oy, 17 + ox + spread, y + oy, robe)
        canvas.dot(17 + ox + spread, y + oy, shade(robe, 0.7))
    for x in range(6 + ox - 4, 18 + ox + 4, 3):
        canvas.dot(x + swing, 27 + oy, shade(robe, 0.6))
    trim = color(params, "trim")
    if trim is not None:
        canvas.rect(11 + ox, 14 + oy, 12 + ox, 27 + oy, trim)


def draw_torso(canvas, params, ox, oy, wide):
    shirt = color(params, "shirt")
    canvas.rect(6 + ox - wide, 14 + oy, 17 + ox + wide, 22 + oy, shirt, True)
    belt = color(params, "belt")
    if belt is not None:
        canvas.rect(6 + ox - wide, 21 + oy, 17 + ox + wide, 21 + oy, belt)
    if params.get("bones", False):
        rib = shade(shirt, 0.55)
        for y in (16, 18, 20):
            canvas.rect(8 + ox, y + oy, 15 + ox, y + oy, rib)
        canvas.rect(11 + ox, 15 + oy, 12 + ox, 21 + oy, rib)
    cross = color(params, "cross")
    if cross is not None:
        canvas.rect(11 + ox, 15 + oy, 12 + ox, 20 + oy, cross)
        canvas.rect(9 + ox, 16 + oy, 14 + ox, 17 + oy, cross)
    stitches = color(params, "stitches")
    if stitches is not None:
        for x in range(7 + ox - wide, 17 + ox + wide, 2):
            canvas.dot(x, 18 + oy, stitches)
        canvas.line(9 + ox, 14 + oy, 13 + ox, 22 + oy, stitches)
    for x, y in params.get("wounds", []):
        canvas.dot(x + ox, y + oy, rgba("#7a1f1f"))


def draw_arms(canvas, params, ox, oy, wide, raised):
    sleeve = color(params, "sleeve") or color(params, "robe") or color(params, "shirt")
    skin = color(params, "skin")
    if params.get("reach", False):
        lift = -2 if raised else 0
        canvas.rect(1 + ox - wide, 15 + oy + lift, 5 + ox - wide, 16 + oy + lift, sleeve, True)
        canvas.rect(18 + ox + wide, 15 + oy + lift, 22 + ox + wide, 16 + oy + lift, sleeve, True)
        canvas.rect(0 + ox - wide, 15 + oy + lift, 0 + ox - wide, 16 + oy + lift, skin)
        canvas.rect(23 + ox + wide, 15 + oy + lift, 23 + ox + wide, 16 + oy + lift, skin)
        return
    lift = -3 if raised else 0
    canvas.rect(4 + ox - wide, 15 + oy, 5 + ox - wide, 20 + oy, sleeve, True)
    canvas.rect(4 + ox - wide, 21 + oy, 5 + ox - wide, 21 + oy, skin)
    canvas.rect(18 + ox + wide, 15 + oy + lift, 19 + ox + wide, 20 + oy + lift, sleeve, True)
    canvas.rect(18 + ox + wide, 21 + oy + lift, 19 + ox + wide, 21 + oy + lift, skin)


def draw_head(canvas, params, ox, oy):
    skin = color(params, "skin")
    canvas.rounded(6 + ox, 3 + oy, 17 + ox, 13 + oy, skin)
    eyes = color(params, "eyes") or rgba("#141017")
    if params.get("bones", False):
        canvas.rect(8 + ox, 7 + oy, 10 + ox, 9 + oy, rgba("#141017"))
        canvas.rect(13 + ox, 7 + oy, 15 + ox, 9 + oy, rgba("#141017"))
        canvas.dot(9 + ox, 8 + oy, eyes)
        canvas.dot(14 + ox, 8 + oy, eyes)
        for x in range(9 + ox, 15 + ox, 2):
            canvas.dot(x, 11 + oy, rgba("#141017"))
    else:
        canvas.rect(8 + ox, 7 + oy, 9 + ox, 8 + oy, eyes)
        canvas.rect(14 + ox, 7 + oy, 15 + ox, 8 + oy, eyes)
        mouth = color(params, "mouth")
        if mouth is not None:
            canvas.rect(10 + ox, 11 + oy, 13 + ox, 11 + oy, mouth)
            canvas.dot(11 + ox, 12 + oy, mouth)
    snout = color(params, "snout")
    if snout is not None:
        canvas.rect(9 + ox, 9 + oy, 14 + ox, 12 + oy, snout, True)
        canvas.rect(11 + ox, 9 + oy, 12 + ox, 9 + oy, rgba("#141017"))
        canvas.dot(7 + ox, 2 + oy, skin)
        canvas.dot(16 + ox, 2 + oy, skin)
        canvas.rect(6 + ox, 1 + oy, 7 + ox, 2 + oy, skin)
        canvas.rect(16 + ox, 1 + oy, 17 + ox, 2 + oy, skin)


def draw_headgear(canvas, params, ox, oy):
    kind = params.get("headgear")
    tint = color(params, "headgear_color")
    if kind == "hair":
        canvas.rect(6 + ox, 3 + oy, 17 + ox, 5 + oy, tint)
        canvas.rect(6 + ox, 6 + oy, 6 + ox, 9 + oy, tint)
        canvas.rect(17 + ox, 6 + oy, 17 + ox, 9 + oy, tint)
    elif kind == "long_hair":
        canvas.rect(5 + ox, 2 + oy, 18 + ox, 5 + oy, tint)
        canvas.rect(4 + ox, 6 + oy, 6 + ox, 17 + oy, tint)
        canvas.rect(17 + ox, 6 + oy, 19 + ox, 17 + oy, tint)
    elif kind == "hood":
        canvas.rect(5 + ox, 1 + oy, 18 + ox, 5 + oy, tint, True)
        canvas.rect(5 + ox, 6 + oy, 6 + ox, 13 + oy, tint)
        canvas.rect(17 + ox, 6 + oy, 18 + ox, 13 + oy, shade(tint, 0.8))
        canvas.dot(11 + ox, 0 + oy, tint)
        canvas.dot(12 + ox, 0 + oy, tint)
    elif kind == "helmet":
        canvas.rect(5 + ox, 2 + oy, 18 + ox, 6 + oy, tint, True)
        canvas.rect(11 + ox, 6 + oy, 12 + ox, 9 + oy, tint)
        plume = color(params, "plume")
        if plume is not None:
            canvas.rect(11 + ox, -1 + oy + 1, 12 + ox, 1 + oy, plume)
    elif kind == "hat":
        canvas.rect(3 + ox, 4 + oy, 20 + ox, 5 + oy, tint, True)
        canvas.rect(7 + ox, 0 + oy, 16 + ox, 4 + oy, tint, True)
    elif kind == "pointed_hat":
        canvas.rect(3 + ox, 4 + oy, 20 + ox, 5 + oy, tint, True)
        canvas.polygon([(7 + ox, 4 + oy), (16 + ox, 4 + oy), (13 + ox, -1 + oy)], tint)
    elif kind == "crown":
        canvas.rect(7 + ox, 1 + oy, 16 + ox, 3 + oy, tint, True)
        for x in (7, 10, 13, 16):
            canvas.dot(x + ox, 0 + oy, tint)
    elif kind == "mitre":
        canvas.polygon([(7 + ox, 4 + oy), (16 + ox, 4 + oy), (14 + ox, -2 + oy), (9 + ox, -2 + oy)], tint)
        canvas.rect(11 + ox, -1 + oy, 12 + ox, 3 + oy, color(params, "trim") or tint)
    elif kind == "antlers":
        for side in (-1, 1):
            base = 11.5 + ox + side * 4
            canvas.line(round(base), 3 + oy, round(base + side * 3), -1 + oy + 1, tint)
            canvas.line(round(base + side * 2), 1 + oy, round(base + side * 2), -1 + oy + 1, tint)
    beak = color(params, "beak")
    if beak is not None:
        canvas.rect(10 + ox, 8 + oy, 13 + ox, 13 + oy, beak, True)
        canvas.rect(11 + ox, 14 + oy, 12 + ox, 15 + oy, beak)


def draw_weapon(canvas, params, ox, oy, raised):
    kind = params.get("weapon")
    tint = color(params, "weapon_color") or rgba("#7a5a38")
    hand = 20 + ox + (params.get("width", 0))
    lift = -3 if raised else 0
    if kind == "bow":
        string = rgba("#d4c8b0")
        canvas.line(hand + 1, 10 + oy, hand + 3, 14 + oy, tint)
        canvas.line(hand + 3, 14 + oy, hand + 3, 20 + oy, tint)
        canvas.line(hand + 3, 20 + oy, hand + 1, 24 + oy, tint)
        canvas.line(hand + (0 if raised else 1), 11 + oy, hand + (0 if raised else 1), 23 + oy, string)
    elif kind == "crossbow":
        canvas.rect(hand - 6, 17 + oy, hand + 2, 18 + oy, tint, True)
        canvas.line(hand + 2, 14 + oy, hand + 2, 21 + oy, shade(tint, 0.8))
    elif kind == "staff":
        canvas.rect(hand, 4 + oy + lift, hand, 26 + oy, tint)
        orb = color(params, "orb") or rgba("#5fd45a")
        canvas.ellipse(hand, 3 + oy + lift, 1.5, 1.5, orb, False)
    elif kind == "sword":
        canvas.rect(hand, 8 + oy + lift, hand + 1, 19 + oy + lift, rgba("#c7ccd1"), True)
        canvas.rect(hand - 2, 19 + oy + lift, hand + 3, 19 + oy + lift, tint)
    elif kind == "axe":
        canvas.rect(hand, 6 + oy + lift, hand, 24 + oy + lift, tint)
        canvas.polygon([(hand + 1, 5 + oy + lift), (hand + 5, 3 + oy + lift), (hand + 5, 12 + oy + lift), (hand + 1, 10 + oy + lift)], rgba("#a6adb6"))
    elif kind == "scythe":
        canvas.rect(hand, 1 + oy + lift, hand, 27 + oy, tint)
        canvas.polygon([(hand, 1 + oy + lift), (hand - 9, 3 + oy + lift), (hand - 7, 5 + oy + lift), (hand, 3 + oy + lift)], rgba("#c7ccd1"))
    elif kind == "torch":
        canvas.rect(hand, 12 + oy + lift, hand, 20 + oy + lift, tint)
        canvas.ellipse(hand, 10 + oy + lift, 1.5, 2, rgba("#ff9a1f"), False)
        canvas.dot(hand, 9 + oy + lift, rgba("#fbe3a2"))
    elif kind == "gun":
        canvas.rect(hand - 4, 18 + oy, hand + 3, 19 + oy, rgba("#2b2430"), True)
    elif kind == "lantern":
        canvas.rect(hand, 20 + oy + lift, hand + 2, 23 + oy + lift, rgba("#f3c46d"), True)
    shield = color(params, "shield")
    if shield is not None:
        canvas.rect(0 + ox - params.get("width", 0), 13 + oy, 6 + ox - params.get("width", 0), 24 + oy, shield, True)
        canvas.rect(3 + ox - params.get("width", 0), 15 + oy, 3 + ox - params.get("width", 0), 22 + oy, shade(shield, 0.6))


def draw_extras(canvas, params, ox, oy):
    wings = color(params, "wings")
    if wings is not None:
        canvas.polygon([(6 + ox, 15 + oy), (-2 + ox + 2, 8 + oy), (1 + ox, 22 + oy)], wings)
        canvas.polygon([(17 + ox, 15 + oy), (25 + ox - 2, 8 + oy), (22 + ox, 22 + oy)], wings)
    cape = color(params, "cape")
    if cape is not None:
        canvas.rect(5 + ox, 14 + oy, 18 + ox, 25 + oy, cape, True)
    flames = color(params, "flames")
    if flames is not None:
        for x in (7, 11, 15):
            canvas.dot(x + ox, 13 + oy, flames)


def frame(params, step, raised):
    wide = params.get("width", 0)
    canvas = Canvas(WIDTH + 2 * wide + 6, HEIGHT + 4)
    ox = 3 + wide
    bob = 1 if step % 2 else 0
    oy = 3 + bob + params.get("crouch", 0)
    draw_extras(canvas, params, ox, oy)
    if params.get("robe") is not None:
        draw_robe(canvas, params, step, ox, oy)
        draw_torso(canvas, {**params, "shirt": params["robe"], "belt": params.get("belt")}, ox, oy, wide)
    else:
        draw_legs(canvas, params, step, ox, oy)
        draw_torso(canvas, params, ox, oy, wide)
    draw_arms(canvas, params, ox, oy, wide, raised)
    draw_head(canvas, params, ox, oy - params.get("hunch", 0))
    draw_headgear(canvas, params, ox, oy - params.get("hunch", 0))
    draw_weapon(canvas, params, ox, oy, raised)
    return canvas.image


def humanoid(name, params):
    frames = {}
    for step in range(4):
        frames[f"{name}-walk-{step}"] = frame(params, step, False)
    frames[f"{name}-attack-0"] = frame(params, 0, True)
    frames[f"{name}-attack-1"] = frame(params, 1, False)
    return frames
