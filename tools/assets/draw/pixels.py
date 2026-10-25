"""Small pixel canvas used by the sprite generators."""

from PIL import Image


def rgba(value, alpha=255):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def shade(color, factor):
    red, green, blue, alpha = color
    return (
        max(0, min(255, round(red * factor))),
        max(0, min(255, round(green * factor))),
        max(0, min(255, round(blue * factor))),
        alpha,
    )


class Canvas:
    def __init__(self, width, height):
        self.image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        self.width = width
        self.height = height

    def dot(self, x, y, color):
        if 0 <= x < self.width and 0 <= y < self.height and color is not None:
            self.image.putpixel((int(x), int(y)), color)

    def rect(self, x0, y0, x1, y1, color, shaded=False):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                tint = color
                if shaded and (x == int(x1) or y == int(y1)):
                    tint = shade(color, 0.75)
                elif shaded and (x == int(x0) or y == int(y0)):
                    tint = shade(color, 1.12)
                self.dot(x, y, tint)

    def rounded(self, x0, y0, x1, y1, color, shaded=True):
        self.rect(x0, y0, x1, y1, color, shaded)
        for x, y in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
            self.dot(x, y, (0, 0, 0, 0))

    def ellipse(self, cx, cy, rx, ry, color, shaded=True):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                dx = (x - cx) / max(rx, 0.5)
                dy = (y - cy) / max(ry, 0.5)
                inside = dx * dx + dy * dy
                if inside <= 1:
                    tint = color
                    if shaded and dx + dy > 0.6:
                        tint = shade(color, 0.75)
                    elif shaded and dx + dy < -0.9:
                        tint = shade(color, 1.12)
                    self.dot(x, y, tint)

    def line(self, x0, y0, x1, y1, color):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for step in range(steps + 1):
            self.dot(
                round(x0 + (x1 - x0) * step / steps),
                round(y0 + (y1 - y0) * step / steps),
                color,
            )

    def polygon(self, points, color):
        ys = [y for _, y in points]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            crossings = []
            for (ax, ay), (bx, by) in zip(points, points[1:] + points[:1]):
                if (ay <= y < by) or (by <= y < ay):
                    crossings.append(ax + (y - ay) * (bx - ax) / (by - ay))
            crossings.sort()
            for left, right in zip(crossings[::2], crossings[1::2]):
                for x in range(round(left), round(right) + 1):
                    self.dot(x, y, color)

    def paste(self, other, x, y):
        self.image.alpha_composite(other.image, (int(x), int(y)))
