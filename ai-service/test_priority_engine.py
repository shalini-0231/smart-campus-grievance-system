import unittest
from priority_engine import analyze_complaint

class TestPriorityEngine(unittest.TestCase):
    def test_normal_keywords(self):
        res = analyze_complaint("I have an exam issue")
        self.assertEqual(res['priority'], 'HIGH')
        self.assertIn('exam issue', res['matchedKeywords'])
        
        res2 = analyze_complaint("The fan is broken")
        self.assertEqual(res2['priority'], 'MEDIUM') # broken = 15 -> MEDIUM
        
    def test_multiple_keywords(self):
        res = analyze_complaint("There is a fire and the fan is broken")
        self.assertEqual(res['priority'], 'CRITICAL')
        self.assertIn('fire', res['matchedKeywords'])
        
    def test_food_safety_overrides(self):
        res = analyze_complaint("I found a cockroach in my food")
        self.assertEqual(res['priority'], 'CRITICAL')
        self.assertEqual(res['score'], 0.90)
        self.assertTrue(res['isFoodSafetyOverride'])

        res2 = analyze_complaint("The food is stale", issue_type="HYGIENE")
        self.assertEqual(res2['priority'], 'HIGH')
        self.assertGreaterEqual(res2['score'], 0.75)
        self.assertTrue(res2['isFoodSafetyOverride'])

    def test_empty_input(self):
        res = analyze_complaint("")
        self.assertEqual(res['priority'], 'LOW')
        self.assertEqual(res['score'], 0.15)
        
    def test_sentiment_adjustment(self):
        res_neg = analyze_complaint("This is a terrible bad exam issue")
        res_pos = analyze_complaint("Thanks for fixing the exam issue")
        self.assertGreater(res_neg['score'], res_pos['score'])

if __name__ == '__main__':
    unittest.main()
