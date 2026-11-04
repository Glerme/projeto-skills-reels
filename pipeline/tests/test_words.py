import unittest

from pipeline.words import align


def W(i, text, start, end):
    return {"id": f"h{i}", "text": text, "start": start, "end": end}


class AlignTest(unittest.TestCase):
    def test_align_digit_merge(self):
        heard = [W(0, "74", 0.0, 0.8), W(1, "soldados", 0.8, 1.4), W(2, "marcharam", 1.4, 2.0)]
        out = align("setenta e quatro soldados marcharam", heard)
        self.assertEqual([w["text"] for w in out], ["setenta", "e", "quatro", "soldados", "marcharam"])
        self.assertEqual(out[0]["start"], 0.0)
        for w in out[1:3]:
            self.assertGreaterEqual(w["start"], 0.0)
            self.assertLessEqual(w["end"], 0.8 + 1e-9)
        starts = [w["start"] for w in out]
        self.assertEqual(starts, sorted(starts))
        self.assertTrue(all(w["end"] > w["start"] for w in out))

    def test_align_identity(self):
        heard = [W(0, "Por", 0.1, 0.3), W(1, "sorte,", 0.3, 0.7), W(2, "o", 0.75, 0.8), W(3, "rio", 0.8, 1.1)]
        out = align("Por sorte, o rio", heard)
        self.assertEqual([(w["text"], w["start"], w["end"]) for w in out], [(h["text"], h["start"], h["end"]) for h in heard])

    def test_align_keeps_script_punctuation_and_accents(self):
        heard = [W(0, "acao", 0.0, 0.5), W(1, "ja", 0.5, 0.9)]
        out = align("Ação já!", heard)
        self.assertEqual([w["text"] for w in out], ["Ação", "já!"])

    def test_align_extra_heard_word_is_dropped(self):
        heard = [W(0, "o", 0.0, 0.2), W(1, "Obrigado.", 0.2, 0.9), W(2, "rio", 0.9, 1.3)]
        out = align("o rio", heard)
        self.assertEqual([w["text"] for w in out], ["o", "rio"])
        self.assertEqual(out[1]["start"], 0.9)


if __name__ == "__main__":
    unittest.main()
