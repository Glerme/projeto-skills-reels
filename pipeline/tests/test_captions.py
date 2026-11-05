import tempfile
import unittest
from pathlib import Path

from pipeline.captions import group, host_html, render_html


def words(spec):
    """[(text, start, end), ...] -> Word list"""
    return [{"id": f"w{i}", "text": t, "start": a, "end": b} for i, (t, a, b) in enumerate(spec)]


class GroupTest(unittest.TestCase):
    def test_group_sentence_break(self):
        g = group(words([("Era", 0.2, 0.4), ("tarde.", 0.4, 0.8), ("O", 0.8, 0.9), ("rio", 0.9, 1.2)]))
        self.assertEqual([x["text"] for x in g], ["ERA TARDE", "O RIO"])

    def test_group_pause_break(self):
        g = group(words([("um", 0.2, 0.4), ("dois", 0.4, 0.6), ("três", 0.9, 1.1)]))
        self.assertEqual([x["text"] for x in g], ["UM DOIS", "TRÊS"])

    def test_group_word_limit(self):
        w = words([(f"p{i}", 0.2 + i * 0.2, 0.4 + i * 0.2) for i in range(7)])
        self.assertEqual([x["text"] for x in group(w, max_words=5)], ["P0 P1 P2 P3 P4", "P5 P6"])

    def test_group_long_word(self):
        g = group(words([("a", 0.2, 0.3), ("anticonstitucionalissimamente", 0.3, 1.5), ("lei", 1.5, 1.7)]))
        self.assertEqual([x["text"] for x in g], ["A", "ANTICONSTITUCIONALISSIMAMENTE", "LEI"])

    def test_upper_accents(self):
        self.assertEqual(group(words([("ação", 0.2, 0.5), ("já!", 0.5, 0.8)]))[0]["text"], "AÇÃO JÁ")

    def test_first_starts_after_100ms(self):
        self.assertGreaterEqual(group(words([("oi", 0.0, 0.3)]))[0]["start"], 0.1)

    def test_groups_do_not_overlap(self):
        g = group(words([("um.", 0.2, 0.5), ("dois.", 0.55, 0.9), ("três", 0.95, 1.3)]))
        for a, b in zip(g, g[1:]):
            self.assertLessEqual(a["end"], b["start"])
        self.assertTrue(all(x["end"] > x["start"] for x in g))


class HtmlTest(unittest.TestCase):
    def test_html_has_kill_and_host(self):
        g = group(words([("Por", 0.2, 0.4), ("sorte,", 0.4, 0.8), ("o", 0.9, 1.0), ("rio.", 1.0, 1.4), ("Fim", 1.6, 2.0)]))
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "compositions/captions.html"
            render_html(g, out)
            html = out.read_text(encoding="utf-8")
        self.assertIn("<template>", html)
        self.assertIn('data-composition-id="captions"', html)
        self.assertEqual(html.count('class="clip'), len(g))
        self.assertEqual(html.count('visibility: "hidden"'), len(g))
        self.assertIn("Archivo Black", html)
        self.assertIn("bottom: 484px", html)
        self.assertIn("left: 150px; right: 150px", html)
        self.assertIn("maxWidth: 730", html)
        self.assertIn('window.__timelines["captions"]', html)
        host = host_html(12.5)
        self.assertIn('data-track-kind="captions"', host)
        self.assertIn('data-composition-src="compositions/captions.html"', host)
        self.assertIn('data-duration="12.5"', host)


if __name__ == "__main__":
    unittest.main()
