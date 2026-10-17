#!/usr/bin/env python3
"""
Dev-only: turns the banner's lettering into SVG paths so the README art looks
identical on every machine (GitHub renders SVGs without web fonts).
Output: src/lettering.json  ->  { key: { d, w, size } }
Fonts: Latin Modern (GUST font license), installed with TeX Live.
"""
import json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

LM = "/usr/share/texmf/fonts/opentype/public/lm/"
FONTS = {
    "bold": LM + "lmroman10-bold.otf",
    "display": LM + "lmroman17-regular.otf",
    "italic": LM + "lmroman12-italic.otf",
    "caps": LM + "lmromancaps10-regular.otf",
    "mono": LM + "lmmono10-regular.otf",
}

TEXT = {
    "title":   ("bold", "PRovidence", 120, -2),
    "tagline": ("italic", "Eight legs. One eye that never closes.", 30, 0),
    "trust":   ("caps", "IN REPRO WE TRUST", 22, 7),
    "annuit":  ("caps", "ANNUIT COMMITTIS", 17, 5),
    "novus":   ("caps", "NOVUS ORDO NOCTIS", 15, 5),
    "night":   ("caps", "THE NIGHT SHIFT NOTE", 15, 6),
    "n1337":   ("bold", "1337", 46, 0),
    "serial":  ("mono", "PR 0107 1337 A", 20, 2),
    "one":     ("display", "ONE EYE", 15, 6),
    "eight":   ("display", "EIGHT LEGS", 15, 6),
    "anatomy": ("caps", "ANATOMY OF A NIGHT SHIFT", 22, 6),
    "a_eye":   ("italic", "one eye that never closes", 21, 0),
    "a_tri":   ("italic", "the triangle: every PR it opens", 21, 0),
    "a_lid":   ("italic", "the dark lid: what it hasn't seen yet", 21, 0),
    "a_knee":  ("italic", "white knees: where it changes its mind", 21, 0),
    "a_rivet": ("italic", "rivets: one per reproduced bug", 21, 0),
    "a_shadow":("italic", "the shadow: it works at night", 21, 0),
    "fig":     ("caps", "FIG. 1 \u2014 PRovidence, life size", 14, 3),
    "h_cap": ("caps", "NIGHT-SHIFT CAP", 15, 4), "h_beanie": ("caps", "HACKER BEANIE", 15, 4),
    "h_crown": ("caps", "MERGE KING", 15, 4), "h_wizard": ("caps", "REGEX WIZARD", 15, 4),
    "h_headphones": ("caps", "LO-FI MODE", 15, 4), "h_hardhat": ("caps", "PROD SAFETY HELMET", 15, 4),
    "h_party": ("caps", "SHIP-IT PARTY HAT", 15, 4), "h_tophat": ("caps", "THE MAINTAINER", 15, 4),
    "h_grad": ("caps", "PHD IN BUG HUNTING", 15, 4),
    "wardrobe": ("caps", "THE WARDROBE \u00b7 NINE STAMPS, ONE SPIDER", 22, 6),
}

def shape(font_path, text, size, tracking):
    f = TTFont(font_path)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    upm = f["head"].unitsPerEm
    k = size / upm
    hmtx = f["hmtx"]
    pen = SVGPathPen(gs)
    x = 0.0
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            continue
        # flip y: font units are y-up, SVG is y-down. baseline at y=0
        tp = TransformPen(pen, (k, 0, 0, -k, x, 0))
        gs[g].draw(tp)
        x += hmtx[g][0] * k + tracking
    return {"d": pen.getCommands(), "w": round(x - tracking, 2), "size": size}

out = {key: shape(FONTS[f], t, s, tr) for key, (f, t, s, tr) in TEXT.items()}
dst = os.path.join(os.path.dirname(__file__), "..", "src", "lettering.json")
with open(dst, "w") as fh:
    json.dump(out, fh)
print("lettering:", ", ".join(f"{k} {v['w']:.0f}px" for k, v in out.items()))
