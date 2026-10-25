"""Builds the game atlases from assets/ (see docs/assets.md)."""

import json
import os
import sys

from PIL import Image, ImageChops, ImageFilter


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS = os.path.join(ROOT, "assets")
OUTPUT = os.path.join(ROOT, "client", "public", "atlas")
HERE = os.path.dirname(os.path.abspath(__file__))

DIRECTIONS = ["n", "w", "s", "e"]
CELL = 64
UNIVERSAL = {
    "cast": (0, 7),
    "thrust": (4, 8),
    "walk": (8, 9),
    "slash": (12, 6),
    "shoot": (16, 13),
    "hurt": (20, 6),
}
FOLDERS = {
    "cast": "spellcast",
    "thrust": "thrust",
    "walk": "walkcycle",
    "slash": "slash",
    "shoot": "bow",
    "hurt": "hurt",
}


def load_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def image(path):
    return Image.open(os.path.join(ASSETS, path)).convert("RGBA")


def hex_color(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (255,)


def hue_mask(hsv_bands, op):
    hue, saturation, _ = hsv_bands
    low, high = (round(d * 255 / 360) for d in op.get("hue", [0, 360]))
    inside = (
        (lambda p: 255 if low <= p <= high else 0)
        if low <= high
        else (lambda p: 255 if p >= low or p <= high else 0)
    )
    threshold = round(op.get("satMin", 0) * 255)
    return ImageChops.multiply(
        hue.point(inside),
        saturation.point(lambda p: 255 if p >= threshold else 0),
    )


def apply(img, op):
    alpha = img.getchannel("A")
    rgb = img.convert("RGB")
    bands = rgb.convert("HSV").split()
    mask = ImageChops.multiply(hue_mask(bands, op), alpha.point(lambda p: 255 if p else 0))
    kind = op["op"]
    if kind == "hsv":
        shift = round(op.get("shift", 0) * 255 / 360)
        sat, val = op.get("sat", 1), op.get("val", 1)
        hue, saturation, value = bands
        changed = Image.merge(
            "HSV",
            (
                hue.point(lambda p: (p + shift) % 256),
                saturation.point(lambda p: min(255, round(p * sat))),
                value.point(lambda p: min(255, round(p * val))),
            ),
        ).convert("RGB")
    elif kind == "multiply":
        changed = ImageChops.multiply(rgb, Image.new("RGB", rgb.size, hex_color(op["color"])[:3]))
    elif kind == "mix":
        changed = Image.blend(rgb, Image.new("RGB", rgb.size, hex_color(op["color"])[:3]), op["amount"])
    else:
        raise ValueError(f"Unknown recolor op {kind}")
    result = Image.composite(changed, rgb, mask).convert("RGBA")
    result.putalpha(alpha)
    return result


def recolor(img, ops, palette):
    for op in ops:
        if op["op"] == "palette":
            img = normalize(img, palette)
        elif op["op"] != "outline":
            img = apply(img, op)
    if any(op["op"] == "outline" for op in ops):
        return outline(img, hex_color(palette["outline"]))
    return img


def palette_image(palette):
    colors = [hex_color(color)[:3] for color in palette["colors"]]
    flat = [channel for color in colors for channel in color]
    flat += flat[:3] * (256 - len(colors))
    holder = Image.new("P", (1, 1))
    holder.putpalette(flat)
    return holder


def normalize(img, palette):
    alpha = img.getchannel("A")
    mapped = img.convert("RGB").quantize(
        palette=palette_image(palette), dither=Image.Dither.NONE
    ).convert("RGBA")
    mapped.putalpha(alpha)
    return mapped


def outline(img, color):
    grown = Image.new("RGBA", (img.width + 2, img.height + 2), (0, 0, 0, 0))
    grown.alpha_composite(img, (1, 1))
    solid = grown.getchannel("A").point(lambda p: 255 if p > 96 else 0)
    ring = ImageChops.subtract(solid.filter(ImageFilter.MaxFilter(3)), solid)
    border = Image.new("RGBA", grown.size, color)
    border.putalpha(ring)
    border.alpha_composite(grown)
    return border


def layer_path(recipe, layer, source_anim):
    if recipe["layout"] == "universal":
        return layer
    name = recipe.get("bodies", {}).get(source_anim, layer) if layer == "BODY" else layer
    return os.path.join(recipe["folder"], FOLDERS[source_anim], f"{name}.png")


def layer_stack(recipe, source_anim, palette):
    stack = []
    for entry in recipe["layers"]:
        layer = entry if isinstance(entry, str) else entry["layer"]
        path = layer_path(recipe, layer, source_anim)
        if os.path.exists(os.path.join(ASSETS, path)):
            loaded = image(path)
            ops = [] if isinstance(entry, str) else entry.get("recolor", [])
            stack.append(recolor(loaded, ops, palette) if ops else loaded)
    return stack


def character_frames(recipe, palette):
    frames = {}
    for anim, source_anim in recipe["anims"].items():
        stack = layer_stack(recipe, source_anim, palette)
        top, count = UNIVERSAL[source_anim]
        if recipe["layout"] != "universal":
            top = 0
        rows = 1 if source_anim == "hurt" else 4
        for row in range(rows):
            direction = "s" if rows == 1 else DIRECTIONS[row]
            for index in range(count):
                frame = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
                box = (index * CELL, (top + row) * CELL, (index + 1) * CELL, (top + row + 1) * CELL)
                for layer in stack:
                    if box[2] <= layer.width and box[3] <= layer.height:
                        frame.alpha_composite(layer.crop(box))
                frames[f"{recipe['name']}-{anim}-{direction}-{index}"] = frame
    return frames


def grid_frames(recipe, palette):
    sheet = image(recipe["file"])
    frames = {}
    for anim, directions in recipe["anims"].items():
        for direction, (x, y, w, h, count) in directions.items():
            for index in range(count):
                box = (x + index * w, y, x + (index + 1) * w, y + h)
                frames[f"{recipe['name']}-{anim}-{direction}-{index}"] = sheet.crop(box)
    return frames


def image_frames(recipe, palette):
    sheet = image(recipe["file"])
    frames = {}
    for name, (x, y, w, h) in recipe["rects"].items():
        frames[name] = sheet.crop((x, y, x + w, y + h))
    return frames


def legacy_frames(recipe, palette):
    data = load_json(os.path.join(ASSETS, recipe["file"]))
    sheet = image(os.path.join(os.path.dirname(recipe["file"]), data["meta"]["image"]))
    frames = {}
    for name, entry in data["frames"].items():
        if any(name.startswith(prefix) for prefix in recipe.get("drop", [])):
            continue
        f = entry["frame"]
        frames[name] = sheet.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
    return frames


BUILDERS = {
    "character": character_frames,
    "grid": grid_frames,
    "image": image_frames,
    "legacy": legacy_frames,
}


def resolve(recipe, by_name):
    if "base" not in recipe:
        return recipe
    merged = dict(resolve(by_name[recipe["base"]], by_name))
    merged.update({key: value for key, value in recipe.items() if key != "base"})
    return merged


def collect(recipes, palette):
    by_name = {recipe["name"]: recipe for recipe in recipes if "name" in recipe}
    frames = {}
    for raw in recipes:
        recipe = resolve(raw, by_name)
        built = BUILDERS[recipe["kind"]](recipe, palette)
        ops = recipe.get("recolor", [])
        for name, frame in built.items():
            frames[name] = recolor(frame, ops, palette) if ops else frame
    return frames


def trimmed(frame):
    box = frame.getbbox()
    if box is None:
        return frame.crop((0, 0, 1, 1)), (0, 0)
    return frame.crop(box), (box[0], box[1])


def pack(frames, max_size, padding):
    items = []
    for name, frame in frames.items():
        cut, offset = trimmed(frame)
        items.append((name, frame.size, cut, offset))
    items.sort(key=lambda item: (-item[2].height, item[0]))
    pages = [[]]
    x = y = row = 0
    for name, size, cut, offset in items:
        if x + cut.width + padding > max_size:
            x, y, row = 0, y + row + padding, 0
        if y + cut.height + padding > max_size:
            pages.append([])
            x = y = row = 0
        pages[-1].append((name, size, cut, offset, x, y))
        x += cut.width + padding
        row = max(row, cut.height)
    return pages


def write(pages, max_size):
    os.makedirs(OUTPUT, exist_ok=True)
    for old in os.listdir(OUTPUT):
        if old.startswith("atlas"):
            os.remove(os.path.join(OUTPUT, old))
    sheets = []
    for number, page in enumerate(pages):
        height = max(y + cut.height for _, _, cut, _, _, y in page) + 1
        sheet = Image.new("RGBA", (max_size, height), (0, 0, 0, 0))
        data = {"frames": {}, "meta": {"image": f"atlas-{number}.png", "format": "RGBA8888", "size": {"w": max_size, "h": height}, "scale": "1"}}
        for name, size, cut, offset, x, y in sorted(page, key=lambda item: item[0]):
            sheet.alpha_composite(cut, (x, y))
            data["frames"][name] = {
                "frame": {"x": x, "y": y, "w": cut.width, "h": cut.height},
                "rotated": False,
                "trimmed": cut.size != size,
                "spriteSourceSize": {"x": offset[0], "y": offset[1], "w": cut.width, "h": cut.height},
                "sourceSize": {"w": size[0], "h": size[1]},
            }
        sheet.save(os.path.join(OUTPUT, f"atlas-{number}.png"), optimize=True)
        with open(os.path.join(OUTPUT, f"atlas-{number}.json"), "w", encoding="utf-8") as handle:
            handle.write(json.dumps(data, indent=2) + "\n")
        sheets.append(f"atlas-{number}.json")
    with open(os.path.join(OUTPUT, "manifest.json"), "w", encoding="utf-8") as handle:
        handle.write(json.dumps({"sheets": sheets}, indent=2) + "\n")
    return sheets


def expand(ops, presets):
    expanded = []
    for op in ops:
        expanded.extend(expand(presets[op], presets) if isinstance(op, str) else [op])
    return expanded


def expand_recipe(recipe, presets):
    recipe = dict(recipe)
    if "recolor" in recipe:
        recipe["recolor"] = expand(recipe["recolor"], presets)
    if "layers" in recipe:
        recipe["layers"] = [
            layer
            if isinstance(layer, str)
            else {**layer, "recolor": expand(layer.get("recolor", []), presets)}
            for layer in recipe["layers"]
        ]
    return recipe


def main():
    settings = load_json(os.path.join(HERE, "recipes.json"))
    palette = load_json(os.path.join(HERE, "palette.json"))
    presets = settings.get("presets", {})
    recipes = [expand_recipe(recipe, presets) for recipe in settings["recipes"]]
    frames = collect(recipes, palette)
    pages = pack(frames, settings["maxSize"], settings["padding"])
    sheets = write(pages, settings["maxSize"])
    print(f"{len(frames)} frames in {len(sheets)} atlas")


if __name__ == "__main__":
    sys.exit(main())
