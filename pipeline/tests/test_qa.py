import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from pipeline.qa import planned_frames, run


class QaTest(unittest.TestCase):
    def test_qa_flags_frozen(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            # 2 s of a moving test pattern, then the last frame held for 1 s; 1 kHz tone at a sane level
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=180x320:rate=30:duration=2",
                            "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-vf", "tpad=stop_mode=clone:stop_duration=1",
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(d / "final.mp4")], check=True)
            (d / "video.json").write_text(json.dumps({"fps": 30, "duration": 3, "shots": [{"id": 1, "start": 0, "end": 3}]}))
            problems = run(d)
            self.assertTrue(any("congelado" in p for p in problems), problems)
            self.assertTrue((d / "qa/report.md").exists())

    def test_qa_flags_missing_audio(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=180x320:rate=30:duration=1",
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", str(d / "final.mp4")], check=True)
            (d / "video.json").write_text(json.dumps({"fps": 30, "duration": 1, "shots": [{"id": 1, "start": 0, "end": 1}]}))
            self.assertTrue(any("áudio" in p for p in run(d)))

    def test_caption_swaps_are_planned(self):
        spec = {"fps": 30, "shots": [{"id": 1, "start": 0, "end": 3}]}
        p = planned_frames(spec, [{"text": "A", "start": 0.1, "end": 1.2}, {"text": "B", "start": 1.2, "end": 2.0}])
        self.assertTrue({3, 36, 60} <= p)


if __name__ == "__main__":
    unittest.main()
