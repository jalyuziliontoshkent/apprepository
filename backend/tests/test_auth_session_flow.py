import os
import uuid

import pytest
import requests


def get_backend_url():
    return os.environ.get('BACKEND_BASE_URL', 'http://127.0.0.1:8000').strip().rstrip('/')


BASE_URL = get_backend_url()


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    return session


class TestAuthSessionFlow:
    def test_public_registration_is_disabled(self, api_client):
        register_response = api_client.post(
            f'{BASE_URL}/api/auth/register',
            json={
                'name': 'Pytest Dealer',
                'email': f"pytest_{uuid.uuid4().hex[:8]}@test.uz",
                'password': 'pytest1234',
                'phone': '+998900000000',
                'address': 'Pytest address',
            },
        )
        assert register_response.status_code == 403, register_response.text
        assert "faqat administrator" in register_response.text.lower()

    def test_login_missing_fields_returns_400(self, api_client):
        response = api_client.post(f'{BASE_URL}/api/auth/login', json={'email': '', 'password': ''})
        assert response.status_code == 400, response.text
