"""
Integration tests for tags API endpoints.
"""
import pytest
from httpx import AsyncClient

from app.tests.factories.tag_factory import TagFactory


@pytest.mark.asyncio
class TestTagsAPI:
    """Integration tests for tags API endpoints."""

    async def test_list_tags_unauthenticated(self, client: AsyncClient):
        """Test listing tags without authentication returns 401."""
        response = await client.get("/api/v1/tags")
        assert response.status_code == 401

    async def test_create_tag_success(
        self,
        authenticated_client: AsyncClient
    ):
        """Test creating a tag via API."""
        tag_data = {
            "name": "Work",
            "color": "#FF5733"
        }

        response = await authenticated_client.post(
            "/api/v1/tags",
            json=tag_data
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Work"
        assert data["color"] == "#FF5733"
        assert "id" in data

    async def test_create_tag_duplicate_name(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test creating a tag with duplicate name."""
        # Create existing tag
        await TagFactory.create(db_session, user_id=test_user.id, name="Work")

        tag_data = {
            "name": "Work",
            "color": "#FF5733"
        }

        response = await authenticated_client.post(
            "/api/v1/tags",
            json=tag_data
        )

        assert response.status_code == 400
        assert "Tag name already exists" in response.json()["detail"]

    async def test_create_tag_invalid_data(
        self,
        authenticated_client: AsyncClient
    ):
        """Test creating a tag with invalid data."""
        tag_data = {
            "name": "",  # Empty name
            "color": "invalid_color"  # Invalid color format
        }

        response = await authenticated_client.post(
            "/api/v1/tags",
            json=tag_data
        )

        assert response.status_code == 422

    async def test_get_tag_success(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test retrieving a specific tag."""
        tag = await TagFactory.create(db_session, user_id=test_user.id, name="Work")

        response = await authenticated_client.get(f"/api/v1/tags/{tag.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(tag.id)
        assert data["name"] == "Work"

    async def test_get_tag_not_found(
        self,
        authenticated_client: AsyncClient
    ):
        """Test retrieving a non-existent tag."""
        from uuid import uuid4
        fake_id = uuid4()

        response = await authenticated_client.get(f"/api/v1/tags/{fake_id}")

        assert response.status_code == 404

    async def test_update_tag_success(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test updating a tag."""
        tag = await TagFactory.create(db_session, user_id=test_user.id, name="Work")

        update_data = {
            "name": "Updated Work",
            "color": "#00FF00"
        }

        response = await authenticated_client.put(
            f"/api/v1/tags/{tag.id}",
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Work"
        assert data["color"] == "#00FF00"

    async def test_update_tag_duplicate_name(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test updating a tag with duplicate name."""
        await TagFactory.create(db_session, user_id=test_user.id, name="Work")
        tag = await TagFactory.create(db_session, user_id=test_user.id, name="Personal")

        update_data = {
            "name": "Work"  # Duplicate name
        }

        response = await authenticated_client.put(
            f"/api/v1/tags/{tag.id}",
            json=update_data
        )

        assert response.status_code == 400
        assert "Tag name already exists" in response.json()["detail"]

    async def test_delete_tag_success(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test deleting a tag."""
        tag = await TagFactory.create(db_session, user_id=test_user.id, name="Work")

        response = await authenticated_client.delete(f"/api/v1/tags/{tag.id}")

        assert response.status_code == 204

        # Verify tag is deleted
        get_response = await authenticated_client.get(f"/api/v1/tags/{tag.id}")
        assert get_response.status_code == 404

    async def test_list_tags_success(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test listing tags for current user."""
        await TagFactory.create(db_session, user_id=test_user.id, name="Work")
        await TagFactory.create(db_session, user_id=test_user.id, name="Personal")

        response = await authenticated_client.get("/api/v1/tags")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    async def test_list_tags_empty(
        self,
        authenticated_client: AsyncClient
    ):
        """Test listing tags when user has no tags."""
        response = await authenticated_client.get("/api/v1/tags")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert len(data["items"]) == 0

    async def test_pagination(
        self,
        authenticated_client: AsyncClient,
        test_user,
        db_session
    ):
        """Test tag list pagination."""
        # Create 25 tags
        for i in range(25):
            await TagFactory.create(
                db_session, user_id=test_user.id, name=f"Tag {i+1}"
            )

        # Get first page
        response = await authenticated_client.get(
            "/api/v1/tags?page=1&page_size=10"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 25
        assert len(data["items"]) == 10
        assert data["page"] == 1
        assert data["pages"] == 3
