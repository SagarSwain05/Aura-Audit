"""
YouTube Data API v3 integration for learning resource fetching.
"""

import os
import httpx
from typing import Optional

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEO_URL = "https://www.googleapis.com/youtube/v3/videos"


async def search_tutorials(skill: str, max_results: int = 3) -> list[dict]:
    """
    Search YouTube for high-quality tutorials on a given skill.
    Returns list of {title, url, thumbnail, duration, channel}.
    """
    if not YOUTUBE_API_KEY:
        return _fallback_resources(skill)

    query = f"{skill} tutorial for beginners full course 2024"

    async with httpx.AsyncClient(timeout=10) as client:
        search_resp = await client.get(YOUTUBE_SEARCH_URL, params={
            "part": "snippet",
            "q": query,
            "type": "video",
            "videoDuration": "long",  # > 20 min
            "order": "relevance",
            "maxResults": max_results + 2,
            "key": YOUTUBE_API_KEY,
        })
        search_data = search_resp.json()

        if "items" not in search_data:
            return _fallback_resources(skill)

        video_ids = [item["id"]["videoId"] for item in search_data["items"]]

        # Get duration + stats
        video_resp = await client.get(YOUTUBE_VIDEO_URL, params={
            "part": "contentDetails,statistics,snippet",
            "id": ",".join(video_ids),
            "key": YOUTUBE_API_KEY,
        })
        video_data = video_resp.json()

        results = []
        for video in video_data.get("items", [])[:max_results]:
            snippet = video["snippet"]
            duration_iso = video["contentDetails"]["duration"]
            results.append({
                "title": snippet["title"],
                "url": f"https://www.youtube.com/watch?v={video['id']}",
                "thumbnail": snippet["thumbnails"].get("medium", {}).get("url"),
                "duration": _parse_duration(duration_iso),
                "channel": snippet["channelTitle"],
                "platform": "youtube",
                "type": "video",
            })

        return results


def _parse_duration(iso_duration: str) -> str:
    """Convert ISO 8601 duration to human-readable string."""
    import re
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso_duration)
    if not match:
        return "N/A"
    h, m, s = (int(x or 0) for x in match.groups())
    if h:
        return f"{h}h {m}m"
    return f"{m}m"


def _fallback_resources(skill: str) -> list[dict]:
    """Return curated fallback resources when API key is not set."""
    skill_lower = skill.lower()
    fallbacks = {
        "react": [
            {"title": "React Full Course 2024", "url": "https://www.youtube.com/watch?v=CgkZ7MvWUAA", "duration": "5h 30m", "platform": "youtube", "type": "video", "thumbnail": None},
        ],
        "node.js": [
            {"title": "Node.js Full Course", "url": "https://www.youtube.com/watch?v=f2EqECiTBL8", "duration": "3h 45m", "platform": "youtube", "type": "video", "thumbnail": None},
        ],
        "python": [
            {"title": "Python Full Course for Beginners", "url": "https://www.youtube.com/watch?v=_uQrJ0TkZlc", "duration": "6h", "platform": "youtube", "type": "video", "thumbnail": None},
        ],
        "docker": [
            {"title": "Docker Tutorial for Beginners", "url": "https://www.youtube.com/watch?v=3c-iBn73dDE", "duration": "2h 10m", "platform": "youtube", "type": "video", "thumbnail": None},
        ],
        "aws": [
            {"title": "AWS Certified Cloud Practitioner", "url": "https://www.youtube.com/watch?v=SOTamWNgDKc", "duration": "4h", "platform": "youtube", "type": "video", "thumbnail": None},
        ],
    }
    for key, resources in fallbacks.items():
        if key in skill_lower:
            return resources
    return [{
        "title": f"{skill} Complete Tutorial",
        "url": f"https://www.youtube.com/results?search_query={skill.replace(' ', '+')}+full+course",
        "duration": "Varies",
        "platform": "youtube",
        "type": "video",
        "thumbnail": None,
    }]
