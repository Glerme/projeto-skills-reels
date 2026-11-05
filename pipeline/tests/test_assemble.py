import contextlib
import io
import json
import re
import shutil
import tempfile
import unittest
from pathlib import Path

from pipeline.assemble import assemble, check, resolve_cast

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

    def test_spec_embedded(self):
        index = assemble(self.dir)
        raw = json.loads((self.dir / "video.json").read_text(encoding="utf-8"))
        self.assertEqual(embedded_spec(index), resolve_cast(raw))
        self.assertIsInstance(embedded_spec(index)["cast"]["homem"], dict)
        html = index.read_text(encoding="utf-8")
        for marker in ("{{SPEC}}", "{{DURATION}}", "{{CAPTIONS_HOST}}", "{{FICTION_BADGE}}"):
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
