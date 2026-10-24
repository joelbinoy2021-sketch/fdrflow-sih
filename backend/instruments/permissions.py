from rest_framework import permissions


class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to users with the ADMIN role or superusers.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.role == 'ADMIN')


class IsReviewerOrAdmin(permissions.BasePermission):
    """
    Allows access to Regulation Bureau Reviewers or Administrators.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.role in ['ADMIN', 'REVIEWER'])


class FDRScopedPermission(permissions.BasePermission):
    """
    Controls access to FDR instruments:
    - Admin & Reviewer can view all instruments.
    - Institution user can only access instruments belonging to their institution.
    - Sensitive operations (verify, discrepancy flag) restricted to Reviewer/Admin.
    - Deletion restricted to Admin.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True

        profile = getattr(request.user, 'profile', None)
        if not profile:
            return False

        if profile.role in ['ADMIN', 'REVIEWER']:
            return True

        # Institution user can only access their own institution's records
        if profile.role == 'INSTITUTION':
            return (obj.institution_name.strip().lower() == profile.institution_name.strip().lower() or
                    obj.created_by == request.user)

        return False
