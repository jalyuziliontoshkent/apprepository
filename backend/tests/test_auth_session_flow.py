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
    def test_register_refresh_logout_flow(self, api_client):
        email = f"pytest_{uuid.uuid4().hex[:8]}@test.uz"
        password = 'pytest1234'

        register_response = api_client.post(
            f'{BASE_URL}/api/auth/register',
            json={
                'name': 'Pytest Dealer',
                'email': email,
                'password': password,
                'phone': '+998900000000',
                'address': 'Pytest address',
            },
        )
        assert register_response.status_code == 200, register_response.text
        register_data = register_response.json()
        assert register_data['user']['email'] == email
        assert register_data['user']['role'] == 'dealer'
        assert register_data['access_token']
        assert register_data['refresh_token']

        me_response = api_client.get(
            f'{BASE_URL}/api/auth/me',
            headers={'Authorization': f"Bearer {register_data['access_token']}"},
        )
        assert me_response.status_code == 200, me_response.text
        assert me_response.json()['user']['email'] == email

        refresh_response = api_client.post(
            f'{BASE_URL}/api/auth/refresh',
            json={'refresh_token': register_data['refresh_token']},
        )
        assert refresh_response.status_code == 200, refresh_response.text
        refresh_data = refresh_response.json()
        assert refresh_data['access_token'] != register_data['access_token']
        assert refresh_data['refresh_token'] != register_data['refresh_token']

        logout_response = api_client.post(
            f'{BASE_URL}/api/auth/logout',
            headers={'Authorization': f"Bearer {refresh_data['access_token']}"},
            json={'refresh_token': refresh_data['refresh_token']},
        )
        assert logout_response.status_code == 200, logout_response.text

        revoked_me_response = api_client.get(
            f'{BASE_URL}/api/auth/me',
            headers={'Authorization': f"Bearer {refresh_data['access_token']}"},
        )
        assert revoked_me_response.status_code == 401, revoked_me_response.text

        revoked_refresh_response = api_client.post(
            f'{BASE_URL}/api/auth/refresh',
            json={'refresh_token': refresh_data['refresh_token']},
        )
        assert revoked_refresh_response.status_code == 401, revoked_refresh_response.text

    def test_login_missing_fields_returns_400(self, api_client):
        response = api_client.post(f'{BASE_URL}/api/auth/login', json={'email': '', 'password': ''})
        assert response.status_code == 400, response.text
