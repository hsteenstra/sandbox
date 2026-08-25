"""
CodeForMe sandbox drawing + input API.

This module is loaded into the in-browser Python runtime before your
code runs, so you can just do:

    import sandbox
    sandbox.clear()
    sandbox.rect(20, 20, 80, 40)

See the "Examples" dropdown in the sandbox for more.
"""

import js

_canvas = js.document.getElementById("sandbox-canvas")
_ctx = _canvas.getContext("2d")

WIDTH = _canvas.width
HEIGHT = _canvas.height

_tick_callback = None
_tick_hz = 30


def clear(color="#ffffff"):
    """Fill the whole canvas with a solid color (default: sandbox background)."""
    _ctx.fillStyle = color
    _ctx.fillRect(0, 0, WIDTH, HEIGHT)


def rect(x, y, w, h, color="#16a34a", fill=True):
    if fill:
        _ctx.fillStyle = color
        _ctx.fillRect(x, y, w, h)
    else:
        _ctx.strokeStyle = color
        _ctx.strokeRect(x, y, w, h)


def circle(x, y, r, color="#16a34a", fill=True):
    _ctx.beginPath()
    _ctx.arc(x, y, r, 0, 6.283185307179586)
    if fill:
        _ctx.fillStyle = color
        _ctx.fill()
    else:
        _ctx.strokeStyle = color
        _ctx.stroke()


def line(x1, y1, x2, y2, color="#16a34a", width=2):
    _ctx.strokeStyle = color
    _ctx.lineWidth = width
    _ctx.beginPath()
    _ctx.moveTo(x1, y1)
    _ctx.lineTo(x2, y2)
    _ctx.stroke()


def text(x, y, s, color="#1f2937", size=16, font="monospace"):
    _ctx.fillStyle = color
    _ctx.font = f"{size}px {font}"
    _ctx.fillText(str(s), x, y)


def key_down(key):
    """Return True if `key` is currently held (e.g. 'ArrowLeft', 'a', ' ')."""
    try:
        return bool(js.window.__sandboxKeys.has(key))
    except Exception:
        return False


def on_tick(func, hz=30):
    """Register `func` to be called ~hz times per second, for animation/games."""
    global _tick_callback, _tick_hz
    _tick_callback = func
    _tick_hz = hz


def stop():
    """Stop the running animation/game loop."""
    global _tick_callback
    _tick_callback = None


def _dispatch_tick():
    if _tick_callback:
        _tick_callback()


def _has_tick():
    return _tick_callback is not None


def _tick_interval_ms():
    return int(1000 / max(1, _tick_hz))
