"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def root_portal_view(request):
    host = request.get_host().split(':')[0]
    frontend_url = "https://joelbinoy2021-sketch.github.io/fdrflow-sih/"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>FDRFLOW Backend API | SIH 26265</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f5f7fa; color: #182b3a; margin: 0; padding: 40px 20px; display: grid; place-items: center; min-height: 80vh; }}
            .card {{ background: white; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-width: 580px; width: 100%; padding: 35px; border: 1px solid #e2e8f0; text-align: center; }}
            .brand {{ font-size: 24px; font-weight: 800; color: #102a43; margin-bottom: 8px; }}
            .brand span {{ color: #167e78; }}
            .badge {{ display: inline-block; background: #e6f6f0; color: #2c9771; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-bottom: 18px; }}
            p {{ color: #64748b; font-size: 14px; line-height: 1.6; margin: 10px 0 25px; }}
            .btn-primary {{ display: inline-block; background: #167e78; color: white; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 8px; font-size: 13px; transition: background .15s; }}
            .btn-primary:hover {{ background: #116b66; }}
            .links {{ margin-top: 25px; display: flex; justify-content: center; gap: 18px; font-size: 12px; }}
            .links a {{ color: #167e78; text-decoration: none; font-weight: 600; }}
            .links a:hover {{ text-decoration: underline; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="brand">FDR<span>FLOW</span> Backend API</div>
            <div class="badge">● Django 6.1.2 API Online</div>
            <p>You have opened the Django REST API server on <code>:8000</code>. To use the full interactive dashboard and security deposit portal, open the React frontend:</p>
            <a class="btn-primary" href="{frontend_url}">👉 Open FDRFLOW Dashboard ({frontend_url})</a>
            <div class="links">
                <a href="/admin/">Django Admin</a>
                <span>•</span>
                <a href="/api/fdrs/">FDR API Endpoint</a>
                <span>•</span>
                <a href="/api/dashboard/stats/">Dashboard Stats API</a>
            </div>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html)

urlpatterns = [
    path("", root_portal_view, name="root-portal"),
    path("admin/", admin.site.urls),
    path("api/", include("instruments.urls")),
]

