# Isolated Android CapacitorHttp QA only. Never forwards to public network.
# mitmdump addon, all requests refused unless exact allowed API hostname.
from mitmproxy import http
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json, os, time
API="meg-platform-api.onrender.com"
LOCAL="http://127.0.0.1:3333"
def request(flow: http.HTTPFlow):
    if flow.request.pretty_host != API:
        flow.response=http.Response.make(403,b'QA_EGRESS_DENIED',{"Content-Type":"text/plain"})
        return
    request_path=flow.request.path
    try:
        payload=flow.request.raw_content or b''
        headers={k:v for k,v in flow.request.headers.items() if k.lower() not in ("host","content-length","content-encoding","accept-encoding","connection")}
        req=Request(LOCAL+request_path,data=payload if flow.request.method not in ('GET','HEAD') else None,headers=headers,method=flow.request.method)
        try:
            with urlopen(req,timeout=115) as r:
                status=r.status
                body=r.read()
                response_headers=dict(r.headers.items())
        except HTTPError as exc:
            status=exc.code
            body=exc.read()
            response_headers=dict(exc.headers.items())
        flow.response=http.Response.make(status,body,response_headers)
        print('ISSUE699_NATIVE_PROXY='+json.dumps({"method":flow.request.method,"path":flow.request.path,"status":status,"bytes":len(payload),"contentType":flow.request.headers.get("content-type"),"authScheme":flow.request.headers.get("authorization","").split(" ")[0] or None,"userAgent":flow.request.headers.get("user-agent","")[:120]},ensure_ascii=False),flush=True)
    except Exception as exc:
        flow.response=http.Response.make(502,b'QA_LOCAL_API_FAILURE',{"Content-Type":"text/plain"})
        print('ISSUE699_NATIVE_PROXY_ERROR='+type(exc).__name__+':'+str(exc)[:150],flush=True)
