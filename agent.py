#!/usr/bin/env python3
"""
SMOO Server Host - agent (version 1)

This single file does four things, and nothing else:
  1. asks the SMOO Server Host database for the settings of YOUR server, using your server key;
  2. writes those settings into the settings.json of your SMOO server (only the fields allowed
     in RULES below, and each value is checked first);
  3. starts your SMOO server program, and restarts it when the settings change;
  4. opens a free tunnel (bore, open source: github.com/ekzhang/bore) so your IP address stays hidden;
     the first time, with your OK, it downloads bore from its official GitHub release;
  5. tells the site that you are online, and the tunnel address your friends use.

It NEVER runs commands received from the site. The only programs it starts are your SMOO server
and bore.
Needs Python 3.8 or newer. No other library. Run it with:   python agent.py
Change the key or the path later with:                       python agent.py --setup
"""
import io
import ipaddress
import json
import os
import platform
import re
import subprocess
import sys
import tarfile
import threading
import time
import zipfile
import urllib.error
import urllib.request

SUPABASE_URL = "https://draueejvcijyluetbxtr.supabase.co"
SUPABASE_KEY = "sb_publishable_rR5Qfb2PKlVEK2NVyTSr_A_sa-R9bPC"   # public key, safe to share
POLL_SECONDS = 5

HERE = os.path.dirname(os.path.abspath(__file__))
CONF = os.path.join(HERE, "agent.json")


# ---------- talking to the site (two database functions, nothing else) ----------
def rpc(name, args):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/{name}",
        data=json.dumps(args).encode(),
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        body = r.read().decode()
        return json.loads(body) if body else None


# ---------- what the site is allowed to change in settings.json ----------
def boolean(v):
    if isinstance(v, bool):
        return v
    raise ValueError


def integer(lo, hi):
    def f(v):
        if isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi:
            return v
        raise ValueError
    return f


def one_of(*options):
    def f(v):
        if v in options:
            return v
        raise ValueError
    return f


def text(pattern):
    rx = re.compile(pattern)
    def f(v):
        if isinstance(v, str) and rx.fullmatch(v):
            return v
        raise ValueError
    return f


def items(ok):
    def f(v):
        if isinstance(v, list):
            return [x for x in v if isinstance(x, str) and ok(x)][:200]
        raise ValueError
    return f


def is_ip(x):
    try:
        ipaddress.ip_address(x)
        return True
    except ValueError:
        return False


RULES = {
    "Server": {"MaxPlayers": integer(1, 16)},          # Address and Port are never touched
    "Flip": {"Enabled": boolean, "Pov": one_of("both", "player", "other"),
             "Players": items(lambda x: 0 < len(x) <= 64)},
    "Scenario": {"MergeEnabled": boolean},
    "BanList": {"Enabled": boolean, "Players": items(lambda x: 0 < len(x) <= 64),
                "IpAddresses": items(is_ip),
                "Stages": items(lambda x: re.fullmatch(r"[A-Za-z0-9_-]{1,64}", x) is not None)},
    "Shines": {"Enabled": boolean},
    "PersistShines": {"Enabled": boolean, "Filename": text(r"\./[A-Za-z0-9_\-]{1,32}\.json")},
}


def write_settings(folder, remote):
    path = os.path.join(folder, "settings.json")
    try:
        with open(path, encoding="utf-8") as f:
            current = json.load(f)
    except (OSError, ValueError):
        current = {}
    for section, keys in RULES.items():
        for key, check in keys.items():
            try:
                value = check(remote[section][key])
            except (KeyError, TypeError, ValueError):
                continue                                   # missing or invalid: keep what is there
            current.setdefault(section, {})[key] = value
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)
    os.replace(tmp, path)


# ---------- tunnel: hides your IP (bore, open source) ----------
BORE_API = "https://api.github.com/repos/ekzhang/bore/releases/latest"
BORE_HOST = "bore.pub"
BORE_BIN = os.path.join(HERE, "bore.exe" if os.name == "nt" else "bore")


def bore_hint():
    system, machine = platform.system(), platform.machine().lower()
    arm = machine in ("arm64", "aarch64")
    if system == "Windows":
        return "x86_64-pc-windows-msvc"
    if system == "Darwin":
        return "aarch64-apple-darwin" if arm else "x86_64-apple-darwin"
    return "aarch64-unknown-linux-musl" if arm else "x86_64-unknown-linux-musl"


def ensure_bore():
    if os.path.isfile(BORE_BIN):
        return True
    try:
        req = urllib.request.Request(BORE_API, headers={"User-Agent": "smoo-agent"})
        with urllib.request.urlopen(req, timeout=20) as r:
            release = json.load(r)
        hint = bore_hint()
        asset = next(a for a in release["assets"] if hint in a["name"] and not a["name"].endswith(".sha256"))
        print("Downloading the tunnel program:", asset["browser_download_url"])
        with urllib.request.urlopen(asset["browser_download_url"], timeout=60) as r:
            blob = r.read()
        wanted = os.path.basename(BORE_BIN)
        if asset["name"].endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(blob)) as z:
                data = z.read(next(n for n in z.namelist() if os.path.basename(n) == wanted))
        else:
            with tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz") as t:
                member = next(m for m in t.getmembers() if os.path.basename(m.name) == wanted)
                data = t.extractfile(member).read()
        with open(BORE_BIN, "wb") as f:
            f.write(data)
        os.chmod(BORE_BIN, 0o755)
        return True
    except (StopIteration, KeyError, OSError, ValueError, zipfile.BadZipFile, tarfile.TarError) as e:
        print("Couldn't get the tunnel program:", e)
        return False


class Tunnel:
    def __init__(self):
        self.proc = None
        self.address = ""

    def start(self, port):
        self.stop()
        self.proc = subprocess.Popen([BORE_BIN, "local", str(port), "--to", BORE_HOST],
                                     stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                     text=True, errors="replace")
        threading.Thread(target=self._read, args=(self.proc,), daemon=True).start()

    def _read(self, proc):
        for line in proc.stdout:
            m = re.search(r"listening at ([\w.\-]+:\d+)", re.sub(r"\x1b\[[0-9;]*m", "", line))
            if m:
                self.address = m.group(1)
                print("Tunnel ready. Your friends join with:", self.address)

    def alive(self):
        return self.proc is not None and self.proc.poll() is None

    def stop(self):
        if self.alive():
            self.proc.terminate()
        self.proc = None
        self.address = ""


def server_port(folder):
    try:
        with open(os.path.join(folder, "settings.json"), encoding="utf-8") as f:
            port = json.load(f)["Server"]["Port"]
        return port if isinstance(port, int) and 0 < port < 65536 else 1027
    except (OSError, ValueError, KeyError, TypeError):
        return 1027


# ---------- first run ----------
def load_conf():
    try:
        with open(CONF, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def setup(conf):
    if not conf.get("key"):
        conf["key"] = input("Server key (site > your server > Connection tab): ").strip()
    while not os.path.isfile(conf.get("exe", "")):
        conf["exe"] = input("Path of the SMOO server program (Server.exe or Server): ").strip().strip('"')
    if "tunnel" not in conf:
        ans = input("Hide your IP with a free automatic tunnel (bore, open source)? [Y/n]: ").strip().lower()
        conf["tunnel"] = ans in ("", "y", "yes", "o", "oui", "s", "si", "sí")
        if not conf["tunnel"]:
            conf["address"] = input("Public address you already use (Enter to skip): ").strip()
    with open(CONF, "w", encoding="utf-8") as f:
        json.dump(conf, f, indent=2)
    return conf


# ---------- main loop ----------
def main():
    conf = {} if "--setup" in sys.argv else load_conf()
    conf = setup(conf)
    exe = os.path.abspath(conf["exe"])
    folder = os.path.dirname(exe)
    proc = None
    last = None
    tunnel = Tunnel()
    use_tunnel = bool(conf.get("tunnel")) and ensure_bore()
    if conf.get("tunnel") and not use_tunnel:
        print("No tunnel: friends can't join until you fix this. Run again, or use --setup to enter your own address.")

    def start():
        nonlocal proc
        proc = subprocess.Popen([exe], cwd=folder)
        print("Server started.")

    def stop():
        nonlocal proc
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
        proc = None

    def report(status):
        try:
            addr = tunnel.address if use_tunnel else conf.get("address", "")
            rpc("agent_push", {"k": conf["key"], "st": status, "addr": addr})
        except (urllib.error.URLError, OSError, ValueError):
            pass

    print("Agent running. Press Ctrl+C to stop.")
    try:
        while True:
            try:
                data = rpc("agent_pull", {"k": conf["key"]})
                if not data:
                    print("This key is not valid. Check it on the site, then run: python agent.py --setup")
                    break
                settings = data.get("settings") or {}
                snapshot = json.dumps(settings, sort_keys=True)
                if snapshot != last:
                    stop()
                    write_settings(folder, settings)
                    last = snapshot
                    start()
                elif proc is None or proc.poll() is not None:
                    print("The server stopped. Restarting...")
                    start()
                if use_tunnel and not tunnel.alive():
                    tunnel.start(server_port(folder))
                report("online")
            except (urllib.error.URLError, OSError, ValueError) as e:
                print("Can't reach the site, retrying:", getattr(e, "reason", e))
            time.sleep(POLL_SECONDS)
    except KeyboardInterrupt:
        pass
    finally:
        stop()
        tunnel.stop()
        report("offline")
        print("Stopped.")


if __name__ == "__main__":
    main()
