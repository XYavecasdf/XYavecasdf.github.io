import importlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


class OpenCorpusPreparationTests(unittest.TestCase):
    def api(self):
        self.assertTrue(Path('vowelscope/validation/prepare_l2arctic.py').exists(),
                        'Pinned open-corpus preparation utility is missing')
        return importlib.import_module('prepare_l2arctic')

    def test_phone_tier_is_read_without_confusing_words_with_phone_labels(self):
        text='''item [1]:
 name = "words"
 intervals [1]:
 xmin = 0
 xmax = 1
 text = "eat"
item [2]:
 name = "phones"
 intervals: size = 2
 intervals [1]:
 xmin = 0.1
 xmax = 0.4
 text = "IY"
 intervals [2]:
 xmin = 0.4
 xmax = 0.5
 text = "T"
'''
        self.assertEqual(self.api().parse_phones(text),[(.1,.4,'IY'),(.4,.5,'T')])

    def test_declared_interval_count_and_indices_must_be_complete(self):
        text='''item [1]:
 name = "phones"
 intervals: size = 2
 intervals [1]:
 xmin = 0
 xmax = 0.2
 text = "IY"
'''
        with self.assertRaises(ValueError):self.api().parse_phones(text)
        with self.assertRaises(ValueError):self.api().parse_phones(text.replace('size = 2','size = 1').replace('[1]:\n xmin','[2]:\n xmin'))

    def test_actual_substituted_vowel_is_retained_but_deletion_is_not_invented_speech(self):
        module=self.api()
        self.assertEqual(module.perceived_vowel('AH, AA*, s'),('AA',True))
        self.assertEqual(module.perceived_vowel('AH,sil,d'),(None,True))
        self.assertEqual(module.perceived_vowel('IY1'),('IY',False))
        self.assertEqual(module.perceived_vowel('IH0,IY,S'),('IY',True))
        self.assertEqual(module.perceived_vowel('sil,AA,a'),('AA',True))
        for label in ('AH,AA,unknown','AH,AA,d','AH,AA,a','AH,AA'):
            with self.subTest(label=label), self.assertRaises(ValueError):module.perceived_vowel(label)

    def test_verified_cache_reuse_rejects_corruption_and_source_mismatch(self):
        module=self.api()
        with tempfile.TemporaryDirectory() as directory:
            cache=Path(directory);url=f'https://raw.githubusercontent.com/{module.REPO}/{module.REVISION}/test.wav'
            with patch.object(module.urllib.request,'urlopen',return_value=io.BytesIO(b'source bytes')):
                self.assertEqual(module.cached_get(cache,'test.wav',url,100),b'source bytes')
            with patch.object(module.urllib.request,'urlopen',side_effect=AssertionError('Cache reuse must not download')):
                self.assertEqual(module.cached_get(cache,'test.wav',url,100),b'source bytes')
                with self.assertRaises(ValueError):module.cached_get(cache,'test.wav',url+'different',100)
                (cache/'test.wav').write_bytes(b'tampered')
                with self.assertRaises(ValueError):module.cached_get(cache,'test.wav',url,100)

    def test_unverified_existing_cache_is_not_adopted_as_pinned_source(self):
        module=self.api()
        with tempfile.TemporaryDirectory() as directory:
            cache=Path(directory);(cache/'test.wav').write_bytes(b'unknown bytes')
            url=f'https://raw.githubusercontent.com/{module.REPO}/{module.REVISION}/test.wav'
            with self.assertRaisesRegex(ValueError,'Unverified existing cache'):
                module.cached_get(cache,'test.wav',url,100)

    def test_review_queue_never_fabricates_reference_frequencies(self):
        rows,reasons=self.api().candidate_windows([(0,.2,'IY'),(.2,.4,'AH, AA*, s'),(.4,.45,'UH'),(.45,.6,'T')])
        self.assertEqual(len(rows),2)
        for row in rows:
            self.assertIsNone(row['gt_f1_hz'])
            self.assertIsNone(row['gt_f2_hz'])
            self.assertEqual(row['reference_review_status'],'pending')
        self.assertEqual(rows[1]['actual_phone'],'AA')
        self.assertTrue(rows[1]['annotation_warning'])
        self.assertEqual(reasons['shorter_than_100_ms'],1)
        self.assertEqual(reasons['non_vowel_or_ambiguous'],1)

    def test_malformed_or_overlapping_intervals_fail_instead_of_disappearing(self):
        with self.assertRaises(ValueError):
            self.api().candidate_windows([(0,.3,'IY'),(.2,.4,'AA')])


if __name__=='__main__':unittest.main()
