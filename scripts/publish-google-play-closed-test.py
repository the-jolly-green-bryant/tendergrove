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
BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"


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
                }
            )
        )
    except Exception:
        session.delete(f"{app_url}/{edit_id}", timeout=60)
        raise


if __name__ == "__main__":
    main()
