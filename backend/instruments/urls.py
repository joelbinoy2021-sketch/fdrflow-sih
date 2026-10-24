from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FDRInstrumentViewSet, FDRReleaseRequestViewSet,
    FDRAlertViewSet, FDRAuditLogViewSet,
    AuthLoginView, CurrentUserView, QuickSwitchUserView,
    DashboardStatsView
)

router = DefaultRouter()
router.register("fdrs", FDRInstrumentViewSet, basename="fdr")
router.register("release-requests", FDRReleaseRequestViewSet, basename="release-request")
router.register("alerts", FDRAlertViewSet, basename="alert")
router.register("audit-logs", FDRAuditLogViewSet, basename="audit-log")

urlpatterns = [
    path("auth/login/", AuthLoginView.as_view(), name="auth-login"),
    path("auth/me/", CurrentUserView.as_view(), name="auth-me"),
    path("auth/quick-switch/", QuickSwitchUserView.as_view(), name="auth-quick-switch"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("", include(router.urls)),
]
