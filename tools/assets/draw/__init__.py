"""Procedural sprite models used by build.py."""

from . import beasts, city, humanoid


def single(draw):
    return lambda name, params: {name: draw(params)}


MODELS = {
    "humanoid": humanoid.humanoid,
    "quadruped": beasts.quadruped,
    "flyer": beasts.flyer,
    "ghost": beasts.ghost,
    "engine": beasts.engine,
    "ground": single(city.ground),
    "roof": single(city.roof),
    "facade": single(city.facade),
    "tower": single(city.tower),
    "tree": single(city.tree),
    "fountain": single(city.fountain),
    "prop": single(city.prop),
}
