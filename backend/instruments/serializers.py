from datetime import date
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, FDRInstrument, FDRVerificationLog,
    FDRRenewal, FDRReleaseRequest, FDRAlert, FDRAuditLog
)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'institution_name', 'designation', 'phone']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    role = serializers.SerializerMethodField()
    institution_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'institution_name', 'profile']

    def get_role(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.role if profile else ('ADMIN' if obj.is_superuser else 'REVIEWER')

    def get_institution_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.institution_name if profile else ''


class FDRVerificationLogSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = FDRVerificationLog
        fields = ['id', 'fdr', 'reviewer', 'reviewer_name', 'decision', 'remarks', 'verification_method', 'created_at']
        read_only_fields = ['id', 'created_at', 'reviewer_name']

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return obj.reviewer.get_full_name() or obj.reviewer.username
        return "Bureau Officer"


class FDRRenewalSerializer(serializers.ModelSerializer):
    old_fdr_number = serializers.ReadOnlyField(source='old_fdr.fdr_number')
    new_fdr_number = serializers.ReadOnlyField(source='new_fdr.fdr_number')
    institution_name = serializers.ReadOnlyField(source='old_fdr.institution_name')

    class Meta:
        model = FDRRenewal
        fields = ['id', 'old_fdr', 'old_fdr_number', 'new_fdr', 'new_fdr_number', 'institution_name', 'requested_by', 'renewal_date', 'remarks', 'created_at']
        read_only_fields = ['id', 'created_at', 'renewal_date']


class FDRReleaseRequestSerializer(serializers.ModelSerializer):
    fdr_number = serializers.ReadOnlyField(source='fdr.fdr_number')
    institution_name = serializers.ReadOnlyField(source='fdr.institution_name')
    bank_name = serializers.ReadOnlyField(source='fdr.bank_name')
    amount = serializers.ReadOnlyField(source='fdr.amount')
    requested_by_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = FDRReleaseRequest
        fields = [
            'id', 'fdr', 'fdr_number', 'institution_name', 'bank_name', 'amount',
            'requested_by', 'requested_by_name', 'reason', 'beneficiary_account',
            'supporting_document', 'status', 'reviewer', 'reviewer_name',
            'reviewer_remarks', 'decision_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'decision_date', 'reviewer', 'reviewer_name']

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return "Institution Representative"

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return obj.reviewer.get_full_name() or obj.reviewer.username
        return None


class FDRAlertSerializer(serializers.ModelSerializer):
    fdr_number = serializers.ReadOnlyField(source='fdr.fdr_number')
    institution_name = serializers.ReadOnlyField(source='fdr.institution_name')
    bank_name = serializers.ReadOnlyField(source='fdr.bank_name')

    class Meta:
        model = FDRAlert
        fields = ['id', 'fdr', 'fdr_number', 'institution_name', 'bank_name', 'alert_type', 'title', 'message', 'severity', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class FDRAuditLogSerializer(serializers.ModelSerializer):
    fdr_number = serializers.ReadOnlyField(source='fdr.fdr_number')

    class Meta:
        model = FDRAuditLog
        fields = ['id', 'fdr', 'fdr_number', 'user_repr', 'action', 'details', 'ip_address', 'created_at']
        read_only_fields = ['id', 'fdr', 'user_repr', 'action', 'details', 'ip_address', 'created_at']


class FDRInstrumentSerializer(serializers.ModelSerializer):
    days_to_maturity = serializers.ReadOnlyField()
    computed_status = serializers.ReadOnlyField()
    verification_logs = FDRVerificationLogSerializer(many=True, read_only=True)
    release_requests = FDRReleaseRequestSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    has_document = serializers.SerializerMethodField()

    class Meta:
        model = FDRInstrument
        fields = [
            'id', 'institution_name', 'fdr_number', 'bank_name', 'amount',
            'issue_date', 'maturity_date', 'interest_rate', 'status',
            'verification_status', 'document', 'document_name', 'has_document',
            'created_by', 'created_by_name', 'previous_fdr', 'is_renewed',
            'remarks', 'created_at', 'updated_at', 'days_to_maturity',
            'computed_status', 'verification_logs', 'release_requests'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'days_to_maturity', 'computed_status']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "Portal Administrator"

    def get_has_document(self, obj):
        return bool(obj.document)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Deposit amount must be a positive number greater than zero.")
        return value

    def validate_interest_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("Interest rate cannot be negative.")
        if value > 30:
            raise serializers.ValidationError("Interest rate seems unrealistically high (maximum 30%).")
        return value

    def validate(self, data):
        issue_date = data.get('issue_date', getattr(self.instance, 'issue_date', None))
        maturity_date = data.get('maturity_date', getattr(self.instance, 'maturity_date', None))

        if issue_date and maturity_date and maturity_date <= issue_date:
            raise serializers.ValidationError({
                'maturity_date': "Maturity date must be strictly later than the issue date."
            })

        # Check unique constraint between bank_name and fdr_number
        bank_name = data.get('bank_name', getattr(self.instance, 'bank_name', None))
        fdr_number = data.get('fdr_number', getattr(self.instance, 'fdr_number', None))
        
        if bank_name and fdr_number:
            qs = FDRInstrument.objects.filter(
                bank_name__iexact=bank_name.strip(),
                fdr_number__iexact=fdr_number.strip()
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'fdr_number': f"An FDR with number '{fdr_number}' already exists for '{bank_name}'. Duplicate FDRs are not permitted."
                })

        # Document validation if uploaded
        document = data.get('document')
        if document:
            max_size = 5 * 1024 * 1024  # 5MB
            if document.size > max_size:
                raise serializers.ValidationError({
                    'document': f"File size exceeds 5MB limit ({document.size / (1024*1024):.2f}MB provided)."
                })
            
            allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
            ext = '.' + document.name.split('.')[-1].lower() if '.' in document.name else ''
            if ext not in allowed_extensions:
                raise serializers.ValidationError({
                    'document': "Only PDF and standard image files (PNG, JPG) are accepted for security verification."
                })

        return data
