from django.contrib import admin
from .models import (
    UserProfile, FDRInstrument, FDRVerificationLog,
    FDRRenewal, FDRReleaseRequest, FDRAlert, FDRAuditLog
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'institution_name', 'designation']
    list_filter = ['role']
    search_fields = ['user__username', 'institution_name']


class FDRVerificationLogInline(admin.TabularInline):
    model = FDRVerificationLog
    extra = 0
    readonly_fields = ['created_at']


class FDRReleaseRequestInline(admin.TabularInline):
    model = FDRReleaseRequest
    extra = 0
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FDRInstrument)
class FDRInstrumentAdmin(admin.ModelAdmin):
    list_display = ['fdr_number', 'institution_name', 'bank_name', 'amount', 'issue_date', 'maturity_date', 'status', 'verification_status']
    list_filter = ['status', 'verification_status', 'bank_name']
    search_fields = ['fdr_number', 'institution_name', 'bank_name']
    inlines = [FDRVerificationLogInline, FDRReleaseRequestInline]


@admin.register(FDRVerificationLog)
class FDRVerificationLogAdmin(admin.ModelAdmin):
    list_display = ['fdr', 'reviewer', 'decision', 'created_at']
    list_filter = ['decision']
    readonly_fields = ['created_at']


@admin.register(FDRRenewal)
class FDRRenewalAdmin(admin.ModelAdmin):
    list_display = ['old_fdr', 'new_fdr', 'requested_by', 'renewal_date']
    readonly_fields = ['created_at']


@admin.register(FDRReleaseRequest)
class FDRReleaseRequestAdmin(admin.ModelAdmin):
    list_display = ['fdr', 'status', 'requested_by', 'reviewer', 'created_at']
    list_filter = ['status']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FDRAlert)
class FDRAlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'fdr', 'alert_type', 'severity', 'is_read', 'created_at']
    list_filter = ['severity', 'is_read', 'alert_type']


@admin.register(FDRAuditLog)
class FDRAuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'fdr', 'user_repr', 'created_at']
    list_filter = ['action']
    readonly_fields = ['fdr', 'user', 'user_repr', 'action', 'details', 'ip_address', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
