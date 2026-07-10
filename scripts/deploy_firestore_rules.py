"""Deploy Firestore security rules via Firebase Security Rules REST API.
Called from GitHub Actions. Reads SERVICE_ACCOUNT env var (JSON string).
"""
import json, time, base64, os, urllib.request, urllib.parse, urllib.error
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

sa = json.loads(os.environ['SERVICE_ACCOUNT'])
now = int(time.time())
project = sa['project_id']
print(f"Project ID: {project}")

def b64(data):
    if isinstance(data, str): data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

header = b64(json.dumps({"alg": "RS256", "typ": "JWT"}))
payload = b64(json.dumps({
    "iss": sa['client_email'], "sub": sa['client_email'],
    "aud": "https://oauth2.googleapis.com/token",
    "iat": now, "exp": now + 3600,
    "scope": "https://www.googleapis.com/auth/cloud-platform"
}))

private_key = serialization.load_pem_private_key(sa['private_key'].encode(), password=None)
signature = private_key.sign(f"{header}.{payload}".encode(), padding.PKCS1v15(), hashes.SHA256())
jwt_token = f"{header}.{payload}.{b64(signature)}"

req = urllib.request.Request(
    "https://oauth2.googleapis.com/token",
    data=urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": jwt_token
    }).encode(),
    method="POST"
)
with urllib.request.urlopen(req) as r:
    access_token = json.loads(r.read())['access_token']
print("Got access token")

def api(url, data=None, method='POST', allow_errors=False):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        method=method
    )
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        print(f"HTTP {e.code} {e.reason} for {method} {url}")
        # Strip HTML for cleaner output
        if body.strip().startswith('<'):
            print(f"Response: (HTML page - API not enabled?)")
        else:
            print(f"Response: {body[:1000]}")
        if allow_errors:
            return None
        raise

# Step 1: Try to enable the Firebase Security Rules API
print("Attempting to enable firebasesecurityrules.googleapis.com...")
result = api(
    f"https://serviceusage.googleapis.com/v1/projects/{project}/services/firebasesecurityrules.googleapis.com:enable",
    {}, method='POST', allow_errors=True
)
if result is not None:
    print(f"API enable result: {result}")
else:
    print("Could not enable API via Service Usage (insufficient permissions) - it may already be enabled")

# Step 2: Deploy the rules
with open('firestore.rules') as f:
    rules_content = f.read()

# Try v1 endpoint
print("Trying Firebase Security Rules API v1...")
ruleset = api(
    f"https://firebasesecurityrules.googleapis.com/v1/projects/{project}/rulesets",
    {"source": {"files": [{"name": "firestore.rules", "content": rules_content}]}},
    allow_errors=True
)

if ruleset is None:
    print("v1 failed, trying v1beta1...")
    ruleset = api(
        f"https://firebasesecurityrules.googleapis.com/v1beta1/projects/{project}/rulesets",
        {"source": {"files": [{"name": "firestore.rules", "content": rules_content}]}}
    )

print(f"Created ruleset: {ruleset['name']}")

release_name = f"projects/{project}/releases/cloud.firestore"
release_body = {"name": release_name, "rulesetName": ruleset['name']}
try:
    result = api(
        f"https://firebasesecurityrules.googleapis.com/v1/projects/{project}/releases/cloud.firestore",
        release_body, method='PATCH'
    )
except Exception:
    try:
        result = api(
            f"https://firebasesecurityrules.googleapis.com/v1/projects/{project}/releases/cloud.firestore",
            release_body, method='PUT'
        )
    except Exception:
        result = api(
            f"https://firebasesecurityrules.googleapis.com/v1/projects/{project}/releases",
            release_body, method='POST'
        )
print(f"Firestore rules deployed: {result.get('name', 'ok')}")
