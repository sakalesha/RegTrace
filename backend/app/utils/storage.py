import cloudinary
import cloudinary.uploader
from app.config import config
import os

# Initialize Cloudinary
if config.CLOUDINARY_CLOUD_NAME and config.CLOUDINARY_API_KEY and config.CLOUDINARY_API_SECRET:
    cloudinary.config( 
      cloud_name = config.CLOUDINARY_CLOUD_NAME, 
      api_key = config.CLOUDINARY_API_KEY, 
      api_secret = config.CLOUDINARY_API_SECRET,
      secure = True
    )

class StorageUtility:
    @staticmethod
    def upload_file(file_path: str, public_id: str = None) -> str:
        """
        Uploads a file to Cloudinary and returns the secure URL.
        Falls back to returning the local file path if Cloudinary is not configured.
        """
        if config.CLOUDINARY_CLOUD_NAME:
            try:
                upload_result = cloudinary.uploader.upload(
                    file_path, 
                    public_id=public_id,
                    resource_type="raw"
                )
                return upload_result.get("secure_url")
            except Exception as e:
                raise Exception(f"Failed to upload to Cloudinary: {str(e)}")
        else:
            # Fallback for development if Cloudinary is not set up
            # In a real scenario, this might copy the file to a local static directory
            return file_path

    @staticmethod
    def download_file(file_path: str, document_id: str, local_destination: str):
        """
        Downloads a file from Cloudinary (or local fallback) to a local destination.
        """
        if not file_path.startswith("http"):
            import shutil
            shutil.copy2(file_path, local_destination)
            return local_destination

        import re
        import requests

        print(f"Downloading from: {file_path}")
        response = None
        try:
            response = requests.get(file_path, headers={"User-Agent": "Mozilla/5.0"})
        except requests.RequestException as e:
            print(f"Direct download failed: {e}")
            response = None

        # Retry with a signed URL derived from the real public_id embedded in the URL.
        if (response is None or response.status_code in (401, 403)) and config.CLOUDINARY_CLOUD_NAME:
            import cloudinary.utils
            m = re.search(r"/upload/(?:v\d+/)?(.+)$", file_path)
            public_id = m.group(1) if m else None
            if public_id:
                print(f"Attempting signed URL for public_id: {public_id}")
                signed_url, _ = cloudinary.utils.cloudinary_url(
                    public_id,
                    resource_type="raw",
                    sign_url=True,
                )
                print(f"Signed URL: {signed_url}")
                response = requests.get(signed_url, headers={"User-Agent": "Mozilla/5.0"})
                print(f"Signed URL download status: {response.status_code}")

        if response is None:
            raise Exception("Could not reach the evidence storage URL")
        response.raise_for_status()
        with open(local_destination, "wb") as f:
            f.write(response.content)
        return local_destination

