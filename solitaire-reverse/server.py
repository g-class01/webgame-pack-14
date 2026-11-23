import os, webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8089
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def guess_type(self, path):
        if path.endswith('.wasm'): return 'application/wasm'
        if path.endswith('.js'): return 'application/javascript'
        if path.endswith('.data') or path.endswith('.bundle'): return 'application/octet-stream'
        if path.endswith('.mp4'): return 'video/mp4'
        if path.endswith('.ogg'): return 'audio/ogg'
        if path.endswith('.mp3'): return 'audio/mpeg'
        return super().guess_type(path)

    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()
        range_header = self.headers.get('Range')
        if not range_header or not range_header.startswith('bytes='):
            return super().send_head()
        try:
            total = os.path.getsize(path)
            parts = range_header.replace('bytes=', '').strip().split('-')
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if len(parts) > 1 and parts[1] else total - 1
            if start >= total or end >= total or start > end:
                self.send_error(416, 'Requested Range Not Satisfiable')
                return None
            f = open(path, 'rb')
            f.seek(start)
            self.send_response(206)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Range', f'bytes {start}-{end}/{total}')
            self.send_header('Content-Length', str(end - start + 1))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()
            return f
        except Exception:
            return super().send_head()

    def log_message(self, format, *args): pass

def main():
    try:
        httpd = HTTPServer(('127.0.0.1', PORT), Handler)
    except OSError:
        webbrowser.open(f"http://127.0.0.1:{PORT}/index.html")
        return
    url = f"http://127.0.0.1:{PORT}/index.html"
    print(f"[Offline Server] Running at: {url}")
    webbrowser.open(url)
    try: httpd.serve_forever()
    except KeyboardInterrupt: pass

if __name__ == "__main__": main()
