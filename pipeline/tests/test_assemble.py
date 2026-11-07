import contextlib
import io
import json
import re
import shutil
import tempfile
import unittest
from pathlib import Path

from pipeline.assemble import assemble, check, overlays_html, resolve_cast

MINI = Path(__file__).parent / "fixtures/mini"


def embedded_spec(index: Path) -> dict:
    m = re.search(r'<script type="application/json" id="video-spec">(.*?)</script>', index.read_text(encoding="utf-8"), re.S)
    return json.loads(m.group(1).replace("<\\/", "</"))


class AssembleTest(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.TemporaryDirectory()
        self.dir = Path(self.d.name) / "mini"
        shutil.copytree(MINI, self.dir)

    def tearDown(self):
        self.d.cleanup()

    def edit(self, fn):
        p = self.dir / "video.json"
        spec = json.loads(p.read_text(encoding="utf-8"))
        fn(spec)
        p.write_text(json.dumps(spec, ensure_ascii=False), encoding="utf-8")

    def test_missing_character(self):
        self.edit(lambda s: s["cast"].update({"homem": "fantasma"}))
        with self.assertRaises(SystemExit) as e:
            assemble(self.dir)
        self.assertIn("personagem não está no kit: fantasma", str(e.exception))

    def test_fiction_badge(self):
        index = assemble(self.dir)
        self.assertNotIn('id="fiction-badge"', index.read_text(encoding="utf-8"))
        self.edit(lambda s: s.update({"fiction": True}))
        html = assemble(self.dir).read_text(encoding="utf-8")
        self.assertIn('id="fiction-badge"', html)
        self.assertIn("FICÇÃO", html)

    def test_overlays_and_bw(self):
        self.edit(lambda s: s.update({"overlays": [{"start": 0, "end": 1, "text": "DIA <1>", "kind": "dia"}], "bw": [[0.2, 0.8]]}))
        html = assemble(self.dir).read_text(encoding="utf-8")
        self.assertIn('id="ov0"', html)
        self.assertIn("DIA &lt;1&gt;", html)  # text is escaped
        self.assertIn('tl.fromTo("#ov0"', html)
        self.assertIn("grayscale(1)", html)
        self.edit(lambda s: s.update({"overlays": [{"start": 0, "end": 99, "text": "x", "kind": "dia"}]}))
        with self.assertRaises(SystemExit):
            assemble(self.dir)

    def test_overlay_font_fits_safe_width(self):
        for kind, maximum, padding, stroke in (("termo", 92, 0, 0.22), ("placa", 56, 80, 0)):
            sizes = []
            for text in ("AÇO", "MARCA DE PLIMSOLL", "M" * 40):
                with self.subTest(kind=kind, text=text):
                    html, _ = overlays_html({"duration": 1, "overlays": [
                        {"start": 0, "end": 1, "kind": kind, "text": text}]})
                    size = float(re.search(r"font-size:([\d.]+)px", html).group(1))
                    sizes.append(size)
                    self.assertLessEqual(size, maximum)
                    self.assertLessEqual(size * (len(text) * 0.72 + stroke) + padding, 780)
            self.assertEqual(sizes[0], maximum)
            self.assertLessEqual(sizes[1], sizes[0])
            self.assertLess(sizes[2], sizes[1])

    def test_spec_embedded(self):
        index = assemble(self.dir)
        raw = json.loads((self.dir / "video.json").read_text(encoding="utf-8"))
        self.assertEqual(embedded_spec(index), resolve_cast(raw))
        self.assertIsInstance(embedded_spec(index)["cast"]["homem"], dict)
        html = index.read_text(encoding="utf-8")
        for marker in ("{{SPEC}}", "{{DURATION}}", "{{CAPTIONS_HOST}}", "{{FICTION_BADGE}}", "{{OVERLAYS}}", "{{OVERLAY_TWEENS}}"):
            self.assertNotIn(marker, html)
        self.assertIn('data-track-kind="captions"', html)
        for f in ("assets/mix.wav", "compositions/captions.html", "lib/engine.js", "hyperframes.json"):
            self.assertTrue((self.dir / f).exists(), f)
        self.assertTrue((self.dir / "assets/kenney").is_symlink())

    def test_invalid_spec_exits_1(self):
        self.edit(lambda s: s["shots"][1].update({"start": s["shots"][1]["start"] + 0.5}))
        err = io.StringIO()
        with self.assertRaises(SystemExit) as e, contextlib.redirect_stderr(err):
            assemble(self.dir)
        self.assertEqual(e.exception.code, 1)
        self.assertIn("cena 2", err.getvalue())
        self.assertFalse((self.dir / "index.html").exists())

    def test_check_only_validates(self):
        check(self.dir)  # cast by id is resolved, valid spec passes, nothing is written
        self.assertFalse((self.dir / "index.html").exists())
        self.assertFalse((self.dir / "assets/mix.wav").exists())
        self.edit(lambda s: s.update({"duration": s["duration"] + 5}))
        with self.assertRaises(SystemExit) as e, contextlib.redirect_stderr(io.StringIO()):
            check(self.dir)
        self.assertEqual(e.exception.code, 1)


if __name__ == "__main__":
    unittest.main()


class Assemble2dTest(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.TemporaryDirectory()
        self.dir = Path(self.d.name) / "mini2d"
        shutil.copytree(MINI, self.dir)
        spec = json.loads((self.dir / "video.json").read_text(encoding="utf-8"))
        (self.dir / "video.json").write_text(json.dumps({"mode": "2d", "duration": spec["duration"], "music": spec["music"]}), encoding="utf-8")

    def tearDown(self):
        self.d.cleanup()

    def test_scene_embedded_without_engine(self):
        (self.dir / "scene.html").write_text('<svg id="peca"></svg><script>tl.to("#peca", {x: 1}, at("{w}"));</script>', encoding="utf-8")
        html = assemble(self.dir).read_text(encoding="utf-8")
        self.assertIn('<svg id="peca">', html)
        self.assertNotIn("{{", html)
        self.assertIn('data-track-kind="captions"', html)
        self.assertTrue((self.dir / "assets/mix.wav").exists())
        self.assertFalse((self.dir / "lib/engine.js").exists())

    def test_missing_scene_exits_1(self):
        with self.assertRaises(SystemExit) as e, contextlib.redirect_stderr(io.StringIO()):
            check(self.dir)
        self.assertEqual(e.exception.code, 1)
