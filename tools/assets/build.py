"""Builds the game atlases from assets/ (see docs/assets.md)."""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageChops, ImageFilter


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS = os.path.join(ROOT, "assets")
OUTPUT = os.path.join(ROOT, "client", "public", "atlas")
HERE = os.path.dirname(os.path.abspath(__file__))

def load_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def image(path):
    return Image.open(os.path.join(ASSETS, path)).convert("RGBA")


def hex_color(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (255,)


def recolor(img, ops, palette):
    for op in ops:
        if op["op"] != "outline":
            raise ValueError(f"Unknown recolor op {op['op']}")
    if ops:
        return outline(img, hex_color(palette["outline"]))
    return img


def outline(img, color):
    grown = Image.new("RGBA", (img.width + 2, img.height + 2), (0, 0, 0, 0))
    grown.alpha_composite(img, (1, 1))
    solid = grown.getchannel("A").point(lambda p: 255 if p > 96 else 0)
    ring = ImageChops.subtract(solid.filter(ImageFilter.MaxFilter(3)), solid)
    border = Image.new("RGBA", grown.size, color)
    border.putalpha(ring)
    border.alpha_composite(grown)
    return border


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


def generated_frames(recipe, palette):
    from draw import MODELS

    return MODELS[recipe["model"]](recipe["name"], recipe.get("params", {}))


BUILDERS = {
    "generated": generated_frames,
    "legacy": legacy_frames,
}


def collect(recipes, palette):
    frames = {}
    for recipe in recipes:
        built = BUILDERS[recipe["kind"]](recipe, palette)
        ops = recipe.get("recolor", [])
        scale = recipe.get("scale", 1)
        for name, frame in built.items():
            frame = recolor(frame, ops, palette) if ops else frame
            if scale != 1:
                frame = frame.resize(
                    (frame.width * scale, frame.height * scale), Image.NEAREST
                )
            frames[name] = frame
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


def main():
    settings = load_json(os.path.join(HERE, "recipes.json"))
    palette = load_json(os.path.join(HERE, "palette.json"))
    listed = list(settings["recipes"])
    for include in settings.get("includes", []):
        listed.extend(
            {"scale": settings.get("generatedScale", 1), **recipe}
            for recipe in load_json(os.path.join(HERE, include))
        )
    frames = collect(listed, palette)
    pages = pack(frames, settings["maxSize"], settings["padding"])
    sheets = write(pages, settings["maxSize"])
    print(f"{len(frames)} frames in {len(sheets)} atlas")


if __name__ == "__main__":
    sys.exit(main())
