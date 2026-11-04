import importlib.util
import tempfile
import unittest
import wave
from pathlib import Path

from pipeline.voice import check_text, synth


class CheckTextTest(unittest.TestCase):
    def test_check_text_flags_digits(self):
        self.assertGreaterEqual(len(check_text("Em 1831, 50% caiu")), 2)
        self.assertEqual(check_text("Em mil oitocentos e trinta e um"), [])

    def test_check_text_flags_symbols_and_urls(self):
        for bad in ["custa R$ dez", "isso & aquilo", "um/dois", "mais + menos", "veja www.site.com", "veja https://x.io"]:
            self.assertNotEqual(check_text(bad), [], bad)

    def test_synth_refuses_bad_text(self):
        with tempfile.TemporaryDirectory() as d, self.assertRaises(ValueError):
            synth("Em 1831", Path(d) / "x.wav")


@unittest.skipUnless(importlib.util.find_spec("kokoro_onnx"), "kokoro-onnx não instalado (scripts/setup_venv.sh)")
class SynthTest(unittest.TestCase):
    def test_synth_alex(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "v.wav"
            dur = synth("Teste rápido da voz.", out)
            with wave.open(str(out)) as w:
                self.assertEqual(w.getframerate(), 24000)
                self.assertGreater(w.getnframes() / w.getframerate(), 0.5)
            self.assertGreater(dur, 0.5)


if __name__ == "__main__":
    unittest.main()
