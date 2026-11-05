import tempfile
import unittest
import wave
from pathlib import Path

import numpy as np

from pipeline.audio.dsp import SR, integrated, read_wav, rng, true_peak
from pipeline.audio.mix import duck_curve, mix
from pipeline.audio.music import MOODS, bed
from pipeline.audio.sfx_lib import SFX


def fake_voice(path: Path, dur: float, sr: int = 24000):
    """speech-like test signal: band noise bursts with syllable-rate modulation, 16-bit mono like Kokoro's output"""
    t = np.arange(int(dur * sr)) / sr
    x = np.random.default_rng(1).standard_normal(len(t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * t)) * 0.2
    x[(t < 0.5) | (t > dur - 0.6)] = 0.0
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


WORDS = [{"id": f"w{i}", "text": "la", "start": 0.5 + i * 0.3, "end": 0.75 + i * 0.3} for i in range(7)]  # 0.5 .. 2.55


class MixTest(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.TemporaryDirectory()
        self.dir = Path(self.d.name)
        fake_voice(self.dir / "voice.wav", 3.2)

    def tearDown(self):
        self.d.cleanup()

    def run_mix(self, sfx=(), stop=None):
        return mix(self.dir / "voice.wav", WORDS, list(sfx), "curioso", 4.0, self.dir / "mix.wav", stop=stop)

    def test_music_stops(self):
        self.run_mix(stop=2.0)
        m, _ = read_wav(str(self.dir / "stem_music.wav"))
        self.assertGreater(np.abs(m[:, :int(1.9 * SR)]).max(), 1e-3)
        self.assertEqual(np.abs(m[:, int(2.0 * SR):]).max(), 0.0)

    def test_mix_exact_length(self):
        self.run_mix([{"t": 1.0, "name": "pop"}])
        x, sr = read_wav(str(self.dir / "mix.wav"))
        self.assertEqual(sr, SR)
        self.assertEqual(x.shape, (2, round(4.0 * SR)))

    def test_mix_loudness(self):
        rep = self.run_mix([{"t": 1.0, "name": "whoosh"}])
        x, _ = read_wav(str(self.dir / "mix.wav"))
        self.assertAlmostEqual(integrated(x), -14.0, delta=1.0)
        self.assertLessEqual(true_peak(x), -1.2 + 0.1)
        self.assertAlmostEqual(rep["lufs"], integrated(x), delta=0.2)

    def test_unknown_sfx(self):
        with self.assertRaises(KeyError) as e:
            self.run_mix([{"t": 1.0, "name": "trovao-magico"}])
        self.assertIn("trovao-magico", str(e.exception))


class DuckTest(unittest.TestCase):
    def test_duck_under_speech(self):
        c = duck_curve(WORDS, round(4.0 * SR))
        self.assertLessEqual(c[int(1.5 * SR)], -2.5)   # mid-speech
        self.assertGreaterEqual(c[int(3.6 * SR)], -0.1)  # well after the last word
        self.assertGreaterEqual(c[int(0.05 * SR)], -0.1)


class SourcesTest(unittest.TestCase):
    def test_every_sfx_renders(self):
        for name, make in SFX.items():
            x = make(rng(7))
            self.assertEqual(x.ndim, 2, name)
            self.assertEqual(x.shape[0], 2, name)
            self.assertTrue(np.isfinite(x).all(), name)
            self.assertGreater(np.abs(x).max(), 1e-3, name)

    def test_every_mood_renders(self):
        for mood in MOODS:
            x = bed(mood, 6.0, seed=3)
            self.assertEqual(x.shape, (2, round(6.0 * SR)), mood)
            self.assertTrue(np.isfinite(x).all(), mood)
            self.assertGreater(np.abs(x).max(), 1e-3, mood)
            self.assertLess(np.abs(x[:, -100:]).max(), 1e-3, mood)  # faded out at the end


if __name__ == "__main__":
    unittest.main()
