"""Servidor HTTPS exclusivamente local para o gate de navegador da Etapa 10.
Certificado efemero gerado no GitHub Actions; jamais publicar ou usar em producao.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import ssl

handler = partial(SimpleHTTPRequestHandler, directory="apps/web/dist-stage08-funcional-qa")
server = ThreadingHTTPServer(("127.0.0.1", 4175), handler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain("/tmp/meg-stage10-browser.crt", "/tmp/meg-stage10-browser.key")
server.socket = context.wrap_socket(server.socket, server_side=True)
server.serve_forever()
