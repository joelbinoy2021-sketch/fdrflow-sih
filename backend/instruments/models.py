from datetime import date, datetime
from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('REVIEWER', 'Regulation Bureau Reviewer'),
        ('INSTITUTION', 'Institution User'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='REVIEWER')
    institution_name = models.CharField(max_length=255, blank=True, default='')
    designation = models.CharField(max_length=150, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class FDRInstrument(models.Model):
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Pending", "Pending"),
        ("Matured", "Matured"),
        ("Renewal required", "Renewal required"),
        ("Released", "Released"),
        ("Rejected", "Rejected"),
        ("Renewed", "Renewed"),
    ]

    VERIFICATION_CHOICES = [
        ("Pending verification", "Pending verification"),
        ("Verified", "Verified"),
        ("Discrepancy detected", "Discrepancy detected"),
        ("Rejected", "Rejected"),
    ]

    institution_name = models.CharField(max_length=255)
    fdr_number = models.CharField(max_length=100)
    bank_name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    issue_date = models.DateField()
    maturity_date = models.DateField()
    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="Active",
    )
    verification_status = models.CharField(
        max_length=40,
        choices=VERIFICATION_CHOICES,
        default="Pending verification",
    )
    document = models.FileField(upload_to='fdr_documents/%Y/%m/', null=True, blank=True)
    document_name = models.CharField(max_length=255, blank=True, default='')
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='submitted_fdrs')
    previous_fdr = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='renewed_successors')
    is_renewed = models.BooleanField(default=False)
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["maturity_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["bank_name", "fdr_number"],
                name="unique_bank_fdr_number",
            )
        ]

    def __str__(self):
        return f"{self.institution_name} - {self.fdr_number}"

    @property
    def days_to_maturity(self):
        if not self.maturity_date:
            return 0
        mat_date = self.maturity_date
        if isinstance(mat_date, str):
            try:
                mat_date = datetime.strptime(mat_date[:10], "%Y-%m-%d").date()
            except Exception:
                return 0
        return (mat_date - date.today()).days

    @property
    def computed_status(self):
        if self.status == "Released":
            return "Released"
        if self.status == "Rejected":
            return "Rejected"
        if self.is_renewed:
            return "Renewed"
        days = self.days_to_maturity
        if days < 0:
            return "Matured"
        elif days <= 30 and self.status == "Renewal required":
            return "Renewal required"
        return self.status


class FDRVerificationLog(models.Model):
    DECISION_CHOICES = [
        ("Verified", "Verified"),
        ("Discrepancy detected", "Discrepancy detected"),
        ("Rejected", "Rejected"),
    ]

    fdr = models.ForeignKey(FDRInstrument, on_delete=models.CASCADE, related_name='verification_logs')
    reviewer = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='verification_actions')
    decision = models.CharField(max_length=30, choices=DECISION_CHOICES)
    remarks = models.TextField()
    verification_method = models.CharField(
        max_length=150, 
        default="Official Bureau Review (Independent bank confirmation pending)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.fdr.fdr_number} - {self.decision} ({self.created_at:%Y-%m-%d})"


class FDRRenewal(models.Model):
    old_fdr = models.ForeignKey(FDRInstrument, on_delete=models.CASCADE, related_name='renewal_history_as_old')
    new_fdr = models.ForeignKey(FDRInstrument, on_delete=models.CASCADE, related_name='renewal_history_as_new')
    requested_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    renewal_date = models.DateField(auto_now_add=True)
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Renewal {self.old_fdr.fdr_number} -> {self.new_fdr.fdr_number}"


class FDRReleaseRequest(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Under Review", "Under Review"),
        ("Approved", "Approved"),
        ("Rejected", "Rejected"),
        ("Released", "Released"),
    ]

    fdr = models.ForeignKey(FDRInstrument, on_delete=models.CASCADE, related_name='release_requests')
    requested_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='submitted_releases')
    reason = models.TextField()
    beneficiary_account = models.CharField(max_length=150, blank=True, default='')
    supporting_document = models.FileField(upload_to='release_documents/%Y/%m/', null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending')
    reviewer = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_releases')
    reviewer_remarks = models.TextField(blank=True, default='')
    decision_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Release for {self.fdr.fdr_number} - {self.status}"


class FDRAlert(models.Model):
    ALERT_TYPES = [
        ('EXPIRING_30', 'Matures in 30 Days'),
        ('EXPIRING_15', 'Matures in 15 Days'),
        ('EXPIRING_7', 'Matures in 7 Days'),
        ('MATURED', 'Instrument Matured / Overdue'),
        ('DISCREPANCY', 'Discrepancy Pending Attention'),
        ('PENDING_VERIFICATION', 'Pending Initial Verification'),
    ]

    fdr = models.ForeignKey(FDRInstrument, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=40, choices=ALERT_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(max_length=20, default='warning')  # info, warning, danger
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["fdr", "alert_type"],
                name="unique_fdr_alert_type",
            )
        ]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title}"


class FDRAuditLog(models.Model):
    fdr = models.ForeignKey(FDRInstrument, null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_entries')
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    user_repr = models.CharField(max_length=150, blank=True, default='System')
    action = models.CharField(max_length=100)
    details = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} - {self.action} by {self.user_repr}"
