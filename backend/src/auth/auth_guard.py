import logging
from typing import List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth

# --- Google Auth for Identity Platform ---
from google.auth.transport import requests as google_auth_requests
from google.oauth2 import id_token

from src.config.config_service import config_service
from src.users.user_model import UserModel, UserRoleEnum
from src.users.user_service import UserService

# Initialize the service once to be used by dependencies.
user_service = UserService()

# This scheme will require the client to send a token in the Authorization header.
# It tells FastAPI how to find the token but doesn't validate it itself.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


logger = logging.getLogger(__name__)


def get_current_user(token: str = Depends(oauth2_scheme)) -> UserModel:
    """
    Dependency that handles the entire authentication and user provisioning flow.

    1. Verifies the Firebase ID token.
    2. Extracts user information (id, email).
    3. Checks if a user document exists in Firestore.
    4. If the user is new, creates their document ("Just-In-Time Provisioning").
    5. Returns a Pydantic model with the user's data.
    """
    try:
        # Verify the Google-issued OIDC ID token from the Authorization header.
        # The audience (aud) must be the OAuth 2.0 client ID of the Identity Platform-protected resource.
        # This client ID must be configured as the GOOGLE_TOKEN_AUDIENCE environment variable.
        GOOGLE_TOKEN_AUDIENCE = config_service.GOOGLE_TOKEN_AUDIENCE
        decoded_token = id_token.verify_oauth2_token(
            token,
            google_auth_requests.Request(),  # Use google.auth.transport.requests for fetching public keys
            audience=GOOGLE_TOKEN_AUDIENCE,
        )

        email = decoded_token.get("email")
        name = decoded_token.get("name")
        picture = decoded_token.get("picture")
        token_info_hd = decoded_token.get("hd")

        # Restrict by particular organizations if it's a closed environment
        if not email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: User identity could not be confirmed from token.",
            )

        # If ALLOWED_ORGS is configured, check the user's organization.
        if config_service.ALLOWED_ORGS:
            if (
                not token_info_hd
                or token_info_hd not in config_service.ALLOWED_ORGS
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"User from '{token_info_hd}' is not part of an allowed organization.",
                )

        # Just-In-Time (JIT) User Provisioning:
        # Create a user profile in our database on their first API call.
        user_doc = user_service.create_user_if_not_exists(
            email=email, name=name, picture=picture
        )

        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not create or retrieve user profile.",
            )

        return user_doc

    except auth.ExpiredIdTokenError:
        logger.error(f"[get_current_user - auth.ExpiredIdTokenError]")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
        )
    except auth.InvalidIdTokenError as e:
        logger.error(f"[get_current_user - auth.InvalidIdTokenError]: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {e}",
        )
    except HTTPException as e:
        logger.error(f"[get_current_user - Exception]: {e}")
        raise e
    except Exception as e:
        logger.error(f"[get_current_user - Exception]: {e}")
        raise HTTPException(
            status_code=getattr(
                e, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=f"An unexpected error occurred during authentication: {e}",
        )


class RoleChecker:
    """
    Dependency that checks if the authenticated user has the required roles.
    It depends on `get_current_user` to ensure the user is authenticated first.
    """

    def __init__(self, allowed_roles: List[UserRoleEnum]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: UserModel = Depends(get_current_user)):
        """
        Checks the user's roles against the allowed roles.
        """
        is_authorized = any(role in self.allowed_roles for role in user.roles)

        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have sufficient permissions to perform this action.",
            )
