"""
NASA Earthdata Client & Connectivity Verification Service.

Responsible for authenticated readiness checks and preparing spatial query
structures for NASA GPM / IMERG rainfall precipitation products.

SECURITY NOTICE:
Never log, print, or expose NASA_EARTHDATA_TOKEN in API responses.
"""
from typing import Any, Dict, Optional
import httpx
from floodlab.config.settings import get_settings

CMR_ENDPOINT = "https://cmr.earthdata.nasa.gov/search/collections.json"


class NASAEarthdataService:
    def __init__(self, token: Optional[str] = None):
        settings = get_settings()
        self._token = token or settings.nasa_earthdata_token

    @property
    def is_token_configured(self) -> bool:
        return bool(self._token and len(self._token) > 15)

    async def verify_connectivity(self, timeout_sec: float = 6.0) -> Dict[str, Any]:
        """
        Lightweight authentication readiness check against NASA Earthdata CMR.
        Performs a query for GPM product collections with Authorization header.
        Does NOT download large rainfall datasets.
        """
        if not self.is_token_configured:
            return {
                "status": "TOKEN_MISSING",
                "auth_ready": False,
                "provider": "NASA Earthdata CMR",
                "message": "NASA_EARTHDATA_TOKEN is not configured in backend environment.",
            }

        headers = {
            "Authorization": f"Bearer {self._token}",
            "User-Agent": "FloodLab-Himalayan-Hydrology/1.0",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                response = await client.get(
                    CMR_ENDPOINT,
                    params={"keyword": "GPM", "page_size": 1},
                    headers=headers,
                )

                if response.status_code == 200:
                    data = response.json()
                    total_hits = data.get("feed", {}).get("hits", 0)
                    return {
                        "status": "CONNECTED",
                        "auth_ready": True,
                        "provider": "NASA Earthdata CMR (GPM Catalog)",
                        "message": "NASA Earthdata token authenticated successfully.",
                        "collections_available": total_hits,
                    }
                elif response.status_code in (401, 403):
                    return {
                        "status": "AUTH_FAILED",
                        "auth_ready": False,
                        "provider": "NASA Earthdata",
                        "message": "NASA Earthdata authentication rejected (Invalid or expired token).",
                    }
                else:
                    return {
                        "status": "AUTH_READY",
                        "auth_ready": True,
                        "provider": "NASA Earthdata",
                        "message": f"NASA Earthdata responded with status {response.status_code}.",
                    }

        except httpx.TimeoutException:
            return {
                "status": "NETWORK_TIMEOUT",
                "auth_ready": True,
                "provider": "NASA Earthdata",
                "message": "Authentication token present. NASA endpoint timed out.",
            }
        except Exception as e:
            return {
                "status": "NETWORK_ERROR",
                "auth_ready": True,
                "provider": "NASA Earthdata",
                "message": f"Network error connecting to NASA Earthdata: {type(e).__name__}",
            }

    def get_service_status(self) -> Dict[str, Any]:
        """
        Fast non-network status representation for service status endpoint.
        """
        if not self.is_token_configured:
            return {"configured": False, "status": "NOT_CONFIGURED"}
        return {"configured": True, "status": "AUTH_READY"}


nasa_service = NASAEarthdataService()
