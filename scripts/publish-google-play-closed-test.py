#!/usr/bin/env python3
"""Publish the latest Google Play alpha draft to closed testers."""

import json
import os
import sys

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account


PACKAGE_NAME = os.environ["PLAY_PACKAGE_NAME"]
TRACK = os.environ.get("PLAY_TRACK", "alpha")
RELEASE_NAME = os.environ["PLAY_RELEASE_NAME"]
RELEASE_NOTES = os.environ["PLAY_RELEASE_NOTES"][:500]
LISTING_LANGUAGE = os.environ.get("PLAY_LISTING_LANGUAGE", "en-US")
LISTING_TITLE = os.environ.get("PLAY_LISTING_TITLE", "Grove")[:30]
LISTING_SHORT_DESCRIPTION = os.environ.get(
    "PLAY_LISTING_SHORT_DESCRIPTION",
    "See family wellbeing patterns. Turn quick check-ins into care-ready insights.",
)[:80]
LISTING_FULL_DESCRIPTION = os.environ.get(
    "PLAY_LISTING_FULL_DESCRIPTION",
    """Care days blur together. Grove helps you remember what changed, notice what may be connected, and walk into care conversations with a clearer story.

CHECK IN WITHOUT WRITING A JOURNAL

Capture the day in a few taps. Choose the signals and events that matter to your family, add a note when you want to, and leave missing days unknown—not automatically “good” or “bad.”

TURN DAILY MOMENTS INTO USEFUL PATTERNS

See wellbeing over time instead of relying on the hardest or most recent day. Grove organizes recorded check-ins into approachable trends, calendars, and observations that help you notice:

• Difficult stretches and positive changes
• Shifts from a person’s usual range
• Signals that often appear together
• Events that may be worth discussing
• Patterns shared across your household

ARRIVE PREPARED

Create an appointment-prep summary for a clinician, therapist, school, or care team. Bring the details that are easy to forget:

• Recent wellbeing trends
• Recorded signals and notes
• Meaningful events and possible associations
• Clear charts and observation calendars
• A downloadable PDF with supporting evidence

MADE FOR REAL FAMILY LIFE

• Track yourself, a child, a partner, a parent, or another person you support
• Personalize signals for each person
• Record difficult and positive observations
• Revisit past dates when you need to fill a gap
• Keep sensitive family information organized in one place

THOUGHTFUL, TRANSPARENT ANALYSIS

Grove’s pattern concepts are informed by published research on repeated real-world observation and emotional dynamics. The app includes a Research & Methodology library explaining how its summaries work and where their limits are.

Grove helps you organize observations; it does not diagnose, predict emergencies, determine care, or replace professional evaluation or treatment.""",
)[:4000]
LISTING_ICON_PATH = os.environ.get("PLAY_LISTING_ICON_PATH")
LISTING_FEATURE_GRAPHIC_PATH = os.environ.get("PLAY_LISTING_FEATURE_GRAPHIC_PATH")
LISTING_PHONE_SCREENSHOT_PATHS = [
    path.strip()
    for path in os.environ.get("PLAY_LISTING_PHONE_SCREENSHOT_PATHS", "").split(",")
    if path.strip()
]
BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"
UPLOAD_BASE_URL = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications"


def request(session, method, url, **kwargs):
    response = session.request(method, url, timeout=60, **kwargs)
    if not response.ok:
        print(response.text, file=sys.stderr)
        response.raise_for_status()
    return response.json() if response.content else {}


def replace_listing_images(session, edit_id, image_type, paths):
    if not paths:
        return 0

    listing_images_url = (
        f"{BASE_URL}/{PACKAGE_NAME}/edits/{edit_id}/listings/"
        f"{LISTING_LANGUAGE}/{image_type}"
    )
    request(session, "DELETE", listing_images_url)

    for source_path in paths:
        image_path = os.path.abspath(source_path)
        if not os.path.isfile(image_path):
            raise FileNotFoundError(f"Google Play {image_type} image not found: {image_path}")
        upload_url = (
            f"{UPLOAD_BASE_URL}/{PACKAGE_NAME}/edits/{edit_id}/listings/"
            f"{LISTING_LANGUAGE}/{image_type}?uploadType=media"
        )
        with open(image_path, "rb") as image_file:
            request(
                session,
                "POST",
                upload_url,
                data=image_file,
                headers={"Content-Type": "image/png"},
            )

    return len(paths)


def main():
    credentials_info = json.loads(os.environ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"])
    credentials = service_account.Credentials.from_service_account_info(
        credentials_info,
        scopes=["https://www.googleapis.com/auth/androidpublisher"],
    )
    session = AuthorizedSession(credentials)
    app_url = f"{BASE_URL}/{PACKAGE_NAME}/edits"

    edit = request(session, "POST", app_url, json={})
    edit_id = edit["id"]
    track_url = f"{app_url}/{edit_id}/tracks/{TRACK}"

    try:
        listing_url = f"{app_url}/{edit_id}/listings/{LISTING_LANGUAGE}"
        request(
            session,
            "PUT",
            listing_url,
            json={
                "language": LISTING_LANGUAGE,
                "title": LISTING_TITLE,
                "shortDescription": LISTING_SHORT_DESCRIPTION,
                "fullDescription": LISTING_FULL_DESCRIPTION,
            },
        )

        if LISTING_ICON_PATH:
            icon_path = os.path.abspath(LISTING_ICON_PATH)
            if not os.path.isfile(icon_path):
                raise FileNotFoundError(f"Google Play icon not found: {icon_path}")
            icon_url = f"{listing_url}/icon"
            request(session, "DELETE", icon_url)
            upload_url = (
                f"{UPLOAD_BASE_URL}/{PACKAGE_NAME}/edits/{edit_id}/listings/"
                f"{LISTING_LANGUAGE}/icon?uploadType=media"
            )
            with open(icon_path, "rb") as icon_file:
                request(
                    session,
                    "POST",
                    upload_url,
                    data=icon_file,
                    headers={"Content-Type": "image/png"},
                )

        feature_graphic_count = replace_listing_images(
            session,
            edit_id,
            "featureGraphic",
            [LISTING_FEATURE_GRAPHIC_PATH] if LISTING_FEATURE_GRAPHIC_PATH else [],
        )
        phone_screenshot_count = replace_listing_images(
            session,
            edit_id,
            "phoneScreenshots",
            LISTING_PHONE_SCREENSHOT_PATHS,
        )

        track = request(session, "GET", track_url)
        releases = track.get("releases", [])
        draft = next(
            (release for release in reversed(releases) if release.get("status") == "draft"),
            None,
        )
        if not draft or not draft.get("versionCodes"):
            raise RuntimeError(f"No draft release with version codes found on {TRACK}")

        version_codes = draft["versionCodes"]
        completed_release = {
            "name": RELEASE_NAME,
            "versionCodes": version_codes,
            "status": "completed",
            "releaseNotes": [{"language": "en-US", "text": RELEASE_NOTES}],
        }
        request(
            session,
            "PUT",
            track_url,
            json={"track": TRACK, "releases": [completed_release]},
        )
        request(session, "POST", f"{app_url}/{edit_id}:commit", json={})

        print(
            json.dumps(
                {
                    "packageName": PACKAGE_NAME,
                    "track": TRACK,
                    "status": "completed",
                    "versionCodes": version_codes,
                    "releaseName": RELEASE_NAME,
                    "listingTitle": LISTING_TITLE,
                    "listingLanguage": LISTING_LANGUAGE,
                    "listingIconUpdated": bool(LISTING_ICON_PATH),
                    "listingFeatureGraphicUpdated": feature_graphic_count == 1,
                    "listingPhoneScreenshotCount": phone_screenshot_count,
                }
            )
        )
    except Exception:
        session.delete(f"{app_url}/{edit_id}", timeout=60)
        raise


if __name__ == "__main__":
    main()
