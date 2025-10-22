"""
Tests for security utilities (password hashing, JWT tokens).
"""
import pytest
from jose import JWTError, jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_password_hash_and_verify(self):
        """Test password hashing and verification."""
        password = "mySecurePassword123!"
        hashed = get_password_hash(password)

        assert hashed != password
        assert verify_password(password, hashed) is True

    def test_verify_password_wrong_password(self):
        """Test password verification with wrong password."""
        password = "correctPassword123"
        wrong_password = "wrongPassword456"
        hashed = get_password_hash(password)

        assert verify_password(wrong_password, hashed) is False

    def test_different_passwords_produce_different_hashes(self):
        """Test that same password produces different hashes (salt)."""
        password = "testPassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # Same password should produce different hashes due to salt
        assert hash1 != hash2
        # But both should verify successfully
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


class TestJWTTokens:
    """Test JWT token creation and decoding."""

    def test_create_and_decode_token(self):
        """Test JWT token creation and decoding."""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        token = create_access_token(subject=user_id)

        assert token is not None
        assert isinstance(token, str)

        payload = decode_access_token(token)
        assert payload["sub"] == user_id
        assert "exp" in payload
        assert "iat" in payload
        assert payload["type"] == "access"

    def test_decode_invalid_token(self):
        """Test decoding an invalid token."""
        invalid_token = "invalid.jwt.token"

        with pytest.raises(JWTError):
            decode_access_token(invalid_token)

    def test_decode_expired_token(self):
        """Test decoding an expired token."""
        from datetime import timedelta

        user_id = "123e4567-e89b-12d3-a456-426614174000"
        # Create token that expires immediately
        token = create_access_token(subject=user_id, expires_delta=timedelta(seconds=-1))

        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_decode_tampered_token(self):
        """Test decoding a tampered token."""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        token = create_access_token(subject=user_id)

        # Tamper with the token
        parts = token.split(".")
        tampered_token = f"{parts[0]}.{'x' * len(parts[1])}.{parts[2]}"

        with pytest.raises(JWTError):
            decode_access_token(tampered_token)

    def test_token_contains_correct_algorithm(self):
        """Test that token uses correct algorithm."""
        user_id = "test-user-id"
        token = create_access_token(subject=user_id)

        # Decode without verification to check header
        unverified_payload = jwt.get_unverified_header(token)
        assert unverified_payload["alg"] == settings.ALGORITHM

    def test_custom_expiration_time(self):
        """Test creating token with custom expiration time."""
        from datetime import timedelta

        user_id = "test-user-id"
        custom_delta = timedelta(hours=2)
        token = create_access_token(subject=user_id, expires_delta=custom_delta)

        payload = decode_access_token(token)
        assert payload["sub"] == user_id
        # Token should be valid
        assert "exp" in payload
