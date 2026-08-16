import requests

url = "http://127.0.0.1:8000/api/documents/upload"
files = {'file': ('requirements.txt', open('requirements.txt', 'rb'))}
data = {'title': 'Test Doc', 'category': 'Test Category'}

response = requests.post(url, files=files, data=data)
print(response.status_code)
print(response.text)
