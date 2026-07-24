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
    "Track family wellbeing with research-informed patterns and care-ready reports.",
)[:80]
LISTING_FULL_DESCRIPTION = os.environ.get(
    "PLAY_LISTING_FULL_DESCRIPTION",
    """Grove Care helps parents and caregivers turn everyday observations into an organized history for clearer conversations with clinicians, schools, and care teams.

When life is difficult, important details can blur together. Grove makes it easier to record quick check-ins, meaningful events, difficult signals, positive changes, and what may be helping. Missing days remain unknown rather than being treated as good or bad days.

RESEARCH-INFORMED PATTERN ANALYSIS

Grove looks beyond a single day or simple average. Its proprietary Pattern Strain model describes longitudinal features such as:

• Burden: how frequently recorded challenges appear or cluster together
• Instability: how sharply observations change between nearby days
• Persistence: whether difficult periods carry across multiple observations
• Recovery difficulty: how consistently observations return toward the person's established range

These concepts are informed by published research on affect and emotion dynamics, ecological momentary assessment, repeated real-world observation, and emotional variability in children and adolescents. Grove includes a transparent Research & Methodology library with the publications that inform its approach.

BUILT FOR REAL CARE CONVERSATIONS

• Personalize the signals and events that matter to your family
• See three-month wellbeing trends, observation calendars, and changes from personal history
• Identify sustained strain, volatility, difficult stretches, and possible event associations
• Keep missing or incomplete days out of pattern calculations
• Prepare concise, provider-ready appointment summaries
• Download organized PDF reports with charts and recorded evidence
• Track multiple household members and explore shared patterns

Grove helps families describe what they have observed without requiring a diagnosis or a perfect journal. Research informs the concepts behind Grove; it does not validate Grove's exact formulas, thresholds, labels, or recommendations.

Grove is an observation and organization tool. It does not diagnose a condition, predict an emergency, determine a level of care, or replace professional evaluation or treatment.""",
)[:4000]
LISTING_ICON_PATH = os.environ.get("PLAY_LISTING_ICON_PATH")
BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"
UPLOAD_BASE_URL = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications"


def request(session, method, url, **kwargs):
    response = session.request(method, url, timeout=60, **kwargs)
    if not response.ok:
        print(response.text, file=sys.stderr)
        response.raise_for_status()
    return response.json() if response.content else {}


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
                }
            )
        )
    except Exception:
        session.delete(f"{app_url}/{edit_id}", timeout=60)
        raise


if __name__ == "__main__":
    main()
