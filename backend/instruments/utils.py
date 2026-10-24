from datetime import date
from django.db import transaction
from .models import FDRInstrument, FDRAlert, FDRAuditLog


def sync_alerts():
    """
    Scans FDR instruments and synchronizes alert records without duplicate alerts
    for the same instrument and condition.
    """
    today = date.today()
    created_count = 0

    instruments = FDRInstrument.objects.exclude(status__in=["Released", "Rejected"])
    for fdr in instruments:
        days = (fdr.maturity_date - today).days

        # Check matured / overdue
        if days < 0:
            _, created = FDRAlert.objects.get_or_create(
                fdr=fdr,
                alert_type='MATURED',
                defaults={
                    'title': f'{fdr.fdr_number} Matured ({abs(days)}d Overdue)',
                    'message': f'FDR for {fdr.institution_name} ({fdr.bank_name}) matured on {fdr.maturity_date}. Urgent renewal or release action required.',
                    'severity': 'danger',
                }
            )
            if created:
                created_count += 1
        elif 0 <= days <= 7:
            _, created = FDRAlert.objects.get_or_create(
                fdr=fdr,
                alert_type='EXPIRING_7',
                defaults={
                    'title': f'{fdr.fdr_number} Matures in {days} Days',
                    'message': f'FDR amount ₹{fdr.amount:,.2f} for {fdr.institution_name} reaches maturity on {fdr.maturity_date}. Initiate renewal immediately.',
                    'severity': 'danger',
                }
            )
            if created:
                created_count += 1
        elif 8 <= days <= 15:
            _, created = FDRAlert.objects.get_or_create(
                fdr=fdr,
                alert_type='EXPIRING_15',
                defaults={
                    'title': f'{fdr.fdr_number} Matures in {days} Days',
                    'message': f'FDR for {fdr.institution_name} maturing in {days} days on {fdr.maturity_date}. Review renewal readiness.',
                    'severity': 'warning',
                }
            )
            if created:
                created_count += 1
        elif 16 <= days <= 30:
            _, created = FDRAlert.objects.get_or_create(
                fdr=fdr,
                alert_type='EXPIRING_30',
                defaults={
                    'title': f'{fdr.fdr_number} Matures in {days} Days',
                    'message': f'FDR for {fdr.institution_name} maturing in {days} days on {fdr.maturity_date}. Scheduled follow-up advised.',
                    'severity': 'info',
                }
            )
            if created:
                created_count += 1

        # Check discrepancy
        if fdr.verification_status == 'Discrepancy detected':
            _, created = FDRAlert.objects.get_or_create(
                fdr=fdr,
                alert_type='DISCREPANCY',
                defaults={
                    'title': f'Discrepancy on {fdr.fdr_number}',
                    'message': f'Bureau reviewer flagged discrepancy on FDR for {fdr.institution_name}: {fdr.remarks or "Requires document rectification"}.',
                    'severity': 'danger',
                }
            )
            if created:
                created_count += 1

    return created_count


def record_audit(fdr, user, action, details="", request=None):
    """
    Safely records an immutable audit log entry.
    """
    ip = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')

    user_repr = "System Automation"
    if user and user.is_authenticated:
        role_label = getattr(getattr(user, 'profile', None), 'get_role_display', lambda: 'User')()
        user_repr = f"{user.get_full_name() or user.username} ({role_label})"

    return FDRAuditLog.objects.create(
        fdr=fdr,
        user=user if (user and user.is_authenticated) else None,
        user_repr=user_repr,
        action=action,
        details=details,
        ip_address=ip
    )
