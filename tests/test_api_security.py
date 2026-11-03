import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


class ApiSecurityTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_research_requires_bearer_token(self):
        response = self.client.post(
            "/api/research",
            json={"query": "test query", "thread_id": "thread_1"},
        )
        self.assertEqual(response.status_code, 401)

    @patch("main.verify_clerk_token", side_effect=main.HTTPException(status_code=401))
    def test_invalid_token_is_rejected(self, _verify):
        response = self.client.post(
            "/api/research",
            headers={"Authorization": "Bearer invalid"},
            json={"query": "test query", "thread_id": "thread_1"},
        )
        self.assertEqual(response.status_code, 401)

    @patch("main.run_research", return_value="A sourced test report.")
    @patch("main.verify_clerk_token", return_value={"sub": "user_123"})
    def test_verified_user_gets_user_scoped_thread(self, _verify, run_research):
        response = self.client.post(
            "/api/research",
            headers={"Authorization": "Bearer test-token"},
            json={"query": "test query", "thread_id": "thread_1"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["report"], "A sourced test report.")
        run_research.assert_called_once_with(
            "test query", thread_id="user_123::thread_1"
        )

    @patch("main.verify_clerk_token", return_value={"sub": "user_123"})
    def test_invalid_payload_is_rejected(self, _verify):
        response = self.client.post(
            "/api/research",
            headers={"Authorization": "Bearer test-token"},
            json={"query": " ", "thread_id": "thread_1"},
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
