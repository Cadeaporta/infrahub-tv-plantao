"""Local, read-only Qualitor dashboard. Standard library only."""
from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "static" / "index.html"

def load_env(path: Path) -> None:
    # Tiny .env reader; existing process environment takes precedence.
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

load_env(ROOT / ".env")

BASE = os.getenv("QUALITOR_BASE_URL", "").rstrip("/")
API_KEY = os.getenv("QUALITOR_API_KEY", "")
USERNAME = os.getenv("QUALITOR_USER", "")
PASSWORD = os.getenv("QUALITOR_PASSWORD", "")
SCOPE = os.getenv("QUALITOR_SCOPE", "")
POLL_SECONDS = max(30, int(os.getenv("POLL_SECONDS", "120")))
TICKET_LIMIT = min(500, max(1, int(os.getenv("TICKET_LIMIT", "100"))))
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8765"))

state = {
    "tickets": [],
    "last_success": None,
    "last_attempt": None,
    "error": "Ainda não houve consulta.",
    "loading": False,
}
lock = threading.Lock()
jwt_token = None

def request_json(path: str, method: str = "GET", payload=None, token: str | None = None):
    if not BASE or not API_KEY:
        raise RuntimeError("Configure QUALITOR_BASE_URL e QUALITOR_API_KEY no .env.")
    url = BASE + path
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Accept": "application/json", "X-apikey": API_KEY}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=25) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8"))

def login():
    global jwt_token
    result = request_json("/auth/login", "POST", {
        "user": USERNAME,
        "company": 0,
        "customer": 0,
        "password": PASSWORD,
        "scope": SCOPE,
    })
    token = result.get("token")
    if not result.get("success") or not token:
        raise RuntimeError("Login no Qualitor não retornou token válido; confira usuário/scope/permissões.")
    jwt_token = token
    return token

def fetch_tickets():
    global jwt_token
    if not USERNAME or not PASSWORD or not SCOPE:
        raise RuntimeError("Preencha QUALITOR_USER, QUALITOR_PASSWORD e QUALITOR_SCOPE no .env.")
    if not jwt_token:
        login()
    query = f"/ticket/list?limit={TICKET_LIMIT}&offset=0"
    try:
        result = request_json(query, "POST", {}, jwt_token)
    except urllib.error.HTTPError as exc:
        if exc.code not in (401, 403):
            raise
        login()
        result = request_json(query, "POST", {}, jwt_token)

    # API response can be an array or an object containing tickets/data.
    if isinstance(result, list):
        rows = result
    elif isinstance(result, dict):
        rows = result.get("tickets") or result.get("data") or result.get("items") or []
    else:
        rows = []
    if not isinstance(rows, list):
        raise RuntimeError("Formato inesperado na resposta de /ticket/list.")
    return rows

def poll_once():
    with lock:
        state["last_attempt"] = datetime.now(timezone.utc).isoformat()
        state["loading"] = True
    try:
        rows = fetch_tickets()
        with lock:
            state["tickets"] = rows
            state["last_success"] = datetime.now(timezone.utc).isoformat()
            state["error"] = None
    except Exception as exc:
        # Keep previous data on failure; avoid logging secrets or full response.
        with lock:
            state["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        with lock:
            state["loading"] = False

def poller():
    while True:
        poll_once()
        time.sleep(POLL_SECONDS)

class Handler(BaseHTTPRequestHandler):
    server_version = "QualitorLocalPanel/0.1"

    def do_GET(self):
        if self.path == "/api/status":
            with lock:
                payload = json.dumps(state, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path in ("/", "/index.html"):
            try:
                payload = INDEX.read_bytes()
            except OSError:
                self.send_error(500, "static/index.html não encontrado")
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_error(404)

    def log_message(self, fmt, *args):
        # Standard request log, no credentials.
        print("%s - %s" % (self.address_string(), fmt % args))

if __name__ == "__main__":
    threading.Thread(target=poller, daemon=True).start()
    print(f"Painel local: http://{HOST}:{PORT} | polling Qualitor a cada {POLL_SECONDS}s")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
