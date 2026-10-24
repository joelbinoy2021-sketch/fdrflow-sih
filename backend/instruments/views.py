import csv
from datetime import date, timedelta
from decimal import Decimal
from django.db import transaction
from django.db.models import Q, Sum, Count
from django.http import HttpResponse, FileResponse, Http404
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import (
    UserProfile, FDRInstrument, FDRVerificationLog,
    FDRRenewal, FDRReleaseRequest, FDRAlert, FDRAuditLog
)
from .serializers import (
    UserSerializer, FDRInstrumentSerializer, FDRVerificationLogSerializer,
    FDRRenewalSerializer, FDRReleaseRequestSerializer, FDRAlertSerializer,
    FDRAuditLogSerializer
)
from .permissions import IsAdminUserRole, IsReviewerOrAdmin, FDRScopedPermission
from .utils import sync_alerts, record_audit


class AuthLoginView(APIView):
    """
    Standard login returning token and user details.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"error": "Invalid credentials provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        token, _ = Token.objects.get_or_create(user=user)
        user_serializer = UserSerializer(user)
        return Response({
            "token": token.key,
            "user": user_serializer.data,
            "message": "Authentication successful"
        })


class CurrentUserView(APIView):
    """
    Returns current authenticated user details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class QuickSwitchUserView(APIView):
    """
    Allows rapid role-switching for demo / evaluators without typing passwords.
    Supported targets: 'ADMIN', 'REVIEWER', 'INSTITUTION'
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        role_target = request.data.get("role", "ADMIN").upper()
        username_map = {
            "ADMIN": "admin",
            "REVIEWER": "reviewer",
            "INSTITUTION": "institute"
        }
        username = username_map.get(role_target, "admin")
        user = User.objects.filter(username=username).first()

        if not user:
            return Response(
                {"error": f"Demo user for {role_target} not found. Please run seed command."},
                status=status.HTTP_404_NOT_FOUND
            )

        token, _ = Token.objects.get_or_create(user=user)
        serializer = UserSerializer(user)
        return Response({
            "token": token.key,
            "user": serializer.data,
            "message": f"Switched to {role_target} role successfully"
        })


class DashboardStatsView(APIView):
    """
    Calculates live dashboard statistics and attention items from database.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Synchronize alerts in background
        sync_alerts()

        user = request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else ('ADMIN' if user.is_superuser else 'REVIEWER')

        qs = FDRInstrument.objects.all()
        if role == 'INSTITUTION' and profile and profile.institution_name:
            qs = qs.filter(
                Q(institution_name__iexact=profile.institution_name.strip()) |
                Q(created_by=user)
            )

        today = date.today()
        total_count = qs.count()
        total_value = qs.aggregate(val=Sum('amount'))['val'] or Decimal('0.00')

        active_count = qs.filter(status="Active").count()
        pending_verification = qs.filter(verification_status="Pending verification").count()
        discrepancies = qs.filter(verification_status="Discrepancy detected").count()
        
        # Expiring in next 30 days
        expiring_30 = qs.filter(
            maturity_date__gte=today,
            maturity_date__lte=today + timedelta(days=30)
        ).count()

        # Matured / Overdue
        matured_count = qs.filter(
            Q(status="Matured") | Q(maturity_date__lt=today)
        ).exclude(status__in=["Released", "Rejected"]).count()

        # Needs attention items (max 6)
        attention_qs = qs.filter(
            Q(verification_status__in=["Discrepancy detected", "Pending verification"]) |
            Q(maturity_date__lte=today + timedelta(days=7))
        ).exclude(status="Released").order_by('maturity_date')[:6]

        attention_items = []
        for item in attention_qs:
            days = (item.maturity_date - today).days
            attention_items.append({
                "id": item.id,
                "fdr_number": item.fdr_number,
                "institution": item.institution_name,
                "bank": item.bank_name,
                "amount": float(item.amount),
                "verification": item.verification_status,
                "status": item.status,
                "days_remaining": days,
                "reason": (
                    "Discrepancy flagged" if item.verification_status == "Discrepancy detected"
                    else f"Matured {abs(days)} days ago" if days < 0
                    else f"Matures in {days} days" if days <= 7
                    else "Awaiting verification"
                )
            })

        return Response({
            "total_instruments": total_count,
            "total_recorded_value": float(total_value),
            "active_count": active_count,
            "pending_verification_count": pending_verification,
            "discrepancies_count": discrepancies,
            "expiring_30_days_count": expiring_30,
            "matured_count": matured_count,
            "attention_items": attention_items,
            "lifecycle": {
                "active": active_count,
                "pending": pending_verification,
                "discrepancies": discrepancies,
                "matured": matured_count,
            }
        })


class FDRInstrumentViewSet(viewsets.ModelViewSet):
    """
    Complete CRUD, search, filtering, verification, renewal, and release management.
    """
    serializer_class = FDRInstrumentSerializer
    permission_classes = [FDRScopedPermission]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else ('ADMIN' if user.is_superuser else 'REVIEWER')

        qs = FDRInstrument.objects.all().select_related('created_by', 'previous_fdr').prefetch_related('verification_logs', 'release_requests')

        # Institution scoping
        if role == 'INSTITUTION' and profile and profile.institution_name:
            qs = qs.filter(
                Q(institution_name__iexact=profile.institution_name.strip()) |
                Q(created_by=user)
            )

        # Filters
        search = self.request.query_params.get('search')
        if search:
            s = search.strip()
            qs = qs.filter(
                Q(institution_name__icontains=s) |
                Q(fdr_number__icontains=s) |
                Q(bank_name__icontains=s)
            )

        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'All statuses':
            qs = qs.filter(Q(status=status_param) | Q(verification_status=status_param))

        bank = self.request.query_params.get('bank')
        if bank and bank != 'All banks':
            qs = qs.filter(bank_name__icontains=bank)

        maturity_filter = self.request.query_params.get('maturity')
        today = date.today()
        if maturity_filter == 'expiring_30':
            qs = qs.filter(maturity_date__gte=today, maturity_date__lte=today + timedelta(days=30))
        elif maturity_filter == 'matured':
            qs = qs.filter(maturity_date__lt=today)
        elif maturity_filter == 'active':
            qs = qs.filter(status="Active", maturity_date__gte=today)

        # Sorting
        ordering = self.request.query_params.get('ordering', '-created_at')
        valid_orderings = ['amount', '-amount', 'issue_date', '-issue_date', 'maturity_date', '-maturity_date', 'institution_name', '-institution_name', 'created_at', '-created_at']
        if ordering in valid_orderings:
            qs = qs.order_by(ordering)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        inst_name = serializer.validated_data.get('institution_name')

        # If institution user, lock institution_name to their profile
        if profile and profile.role == 'INSTITUTION' and profile.institution_name:
            inst_name = profile.institution_name

        instance = serializer.save(
            created_by=user,
            institution_name=inst_name,
            verification_status="Pending verification",
            status="Active" if serializer.validated_data.get('maturity_date') >= date.today() else "Matured"
        )

        record_audit(
            fdr=instance,
            user=user,
            action="FDR_REGISTERED",
            details=f"Registered FDR {instance.fdr_number} ({instance.bank_name}) for ₹{instance.amount:,.2f}",
            request=self.request
        )
        sync_alerts()

    def perform_update(self, serializer):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else ('ADMIN' if user.is_superuser else 'REVIEWER')

        if role == 'INSTITUTION':
            # Check if attempting to alter status or amount
            if 'status' in serializer.validated_data or 'verification_status' in serializer.validated_data:
                raise permissions.PermissionDenied("Institution users cannot alter verification or status flags.")

        instance = serializer.save()
        record_audit(
            fdr=instance,
            user=user,
            action="FDR_UPDATED",
            details=f"Updated instrument record details for {instance.fdr_number}",
            request=self.request
        )

    @action(detail=True, methods=['post'], permission_classes=[IsReviewerOrAdmin])
    def verify(self, request, pk=None):
        """
        Record an official verification decision (Verified, Discrepancy detected, Rejected).
        """
        fdr = self.get_object()
        decision = request.data.get('decision', 'Verified')
        remarks = request.data.get('remarks', '').strip()
        method = request.data.get('verification_method', 'Manual Bureau Verification (Bank branch statement cross-check)')

        if decision in ['Discrepancy detected', 'Rejected'] and not remarks:
            return Response(
                {"error": f"Remarks/Reason are mandatory when selecting '{decision}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            fdr.verification_status = decision
            if decision == 'Verified':
                if fdr.days_to_maturity < 0:
                    fdr.status = "Matured"
                else:
                    fdr.status = "Active"
            elif decision == 'Discrepancy detected':
                fdr.remarks = remarks
            elif decision == 'Rejected':
                fdr.status = "Rejected"
                fdr.remarks = remarks
            fdr.save()

            FDRVerificationLog.objects.create(
                fdr=fdr,
                reviewer=request.user,
                decision=decision,
                remarks=remarks or f"Marked {decision} by reviewer.",
                verification_method=method
            )

            record_audit(
                fdr=fdr,
                user=request.user,
                action=f"VERIFICATION_{decision.upper().replace(' ', '_')}",
                details=f"Decision: {decision}. Remarks: {remarks or 'None'}. Method: {method}",
                request=request
            )

            sync_alerts()

        return Response({
            "message": f"Instrument {fdr.fdr_number} successfully recorded as {decision}.",
            "fdr": FDRInstrumentSerializer(fdr).data
        })

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        """
        Renewal workflow: replaces existing FDR with a new instrument, preserving full history.
        """
        old_fdr = self.get_object()
        new_fdr_number = request.data.get('new_fdr_number', '').strip()
        amount = request.data.get('amount')
        bank_name = request.data.get('bank_name', old_fdr.bank_name).strip()
        issue_date_str = request.data.get('issue_date')
        maturity_date_str = request.data.get('maturity_date')
        interest_rate = request.data.get('interest_rate', old_fdr.interest_rate)
        remarks = request.data.get('remarks', '').strip()

        if not new_fdr_number or not amount or not issue_date_str or not maturity_date_str:
            return Response(
                {"error": "Please provide new FDR number, amount, issue date, and maturity date."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if FDRInstrument.objects.filter(bank_name__iexact=bank_name, fdr_number__iexact=new_fdr_number).exists():
            return Response(
                {"error": f"An FDR with number '{new_fdr_number}' already exists in {bank_name}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from datetime import datetime
            if isinstance(issue_date_str, str):
                issue_date_val = datetime.strptime(issue_date_str[:10], "%Y-%m-%d").date()
            else:
                issue_date_val = issue_date_str

            if isinstance(maturity_date_str, str):
                maturity_date_val = datetime.strptime(maturity_date_str[:10], "%Y-%m-%d").date()
            else:
                maturity_date_val = maturity_date_str

            amt = Decimal(str(amount))
            if amt <= 0:
                return Response({"error": "Amount must be positive."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"error": "Invalid date or amount format."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            new_fdr = FDRInstrument.objects.create(
                institution_name=old_fdr.institution_name,
                fdr_number=new_fdr_number,
                bank_name=bank_name,
                amount=amt,
                issue_date=issue_date_val,
                maturity_date=maturity_date_val,
                interest_rate=Decimal(str(interest_rate or 0)),
                status="Active",
                verification_status="Pending verification",
                created_by=request.user,
                previous_fdr=old_fdr,
                remarks=f"Renewed replacement for {old_fdr.fdr_number}. {remarks}"
            )

            old_fdr.is_renewed = True
            old_fdr.status = "Renewed"
            old_fdr.save()

            FDRRenewal.objects.create(
                old_fdr=old_fdr,
                new_fdr=new_fdr,
                requested_by=request.user,
                remarks=remarks or f"Renewed into {new_fdr.fdr_number}"
            )

            record_audit(
                fdr=new_fdr,
                user=request.user,
                action="FDR_RENEWED",
                details=f"Renewed from {old_fdr.fdr_number} to {new_fdr.fdr_number} for ₹{amt:,.2f}",
                request=request
            )

            sync_alerts()

        return Response({
            "message": f"FDR {old_fdr.fdr_number} successfully renewed as {new_fdr.fdr_number}.",
            "new_fdr": FDRInstrumentSerializer(new_fdr).data,
            "old_fdr": FDRInstrumentSerializer(old_fdr).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def request_release(self, request, pk=None):
        """
        Submits request for security deposit refund/release with reason and beneficiary info.
        """
        fdr = self.get_object()
        reason = request.data.get('reason', '').strip()
        beneficiary = request.data.get('beneficiary_account', '').strip()

        if not reason:
            return Response(
                {"error": "Please provide a justification / reason for release request."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            rel = FDRReleaseRequest.objects.create(
                fdr=fdr,
                requested_by=request.user,
                reason=reason,
                beneficiary_account=beneficiary,
                status="Pending"
            )

            fdr.status = "Renewal required" if fdr.days_to_maturity < 0 else "Active"
            fdr.save()

            record_audit(
                fdr=fdr,
                user=request.user,
                action="RELEASE_REQUESTED",
                details=f"Release requested: {reason}",
                request=request
            )

        return Response({
            "message": "Security deposit release request submitted for bureau review.",
            "release_request": FDRReleaseRequestSerializer(rel).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def download_document(self, request, pk=None):
        """
        Secure file download checking permissions.
        """
        fdr = self.get_object()
        if not fdr.document:
            raise Http404("No supporting document attached to this FDR.")

        try:
            return FileResponse(
                fdr.document.open('rb'),
                as_attachment=True,
                filename=fdr.document_name or fdr.document.name.split('/')[-1]
            )
        except Exception:
            raise Http404("Document could not be opened.")

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Exports filtered FDR list as CSV.
        """
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="fdr_export_{date.today().isoformat()}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'FDR ID', 'FDR Number', 'Institution Name', 'Bank Name',
            'Amount (INR)', 'Interest Rate (%)', 'Issue Date',
            'Maturity Date', 'Status', 'Verification Status',
            'Days Remaining', 'Remarks'
        ])

        for r in queryset:
            writer.writerow([
                f"FDR-{r.id:04d}",
                r.fdr_number,
                r.institution_name,
                r.bank_name,
                float(r.amount),
                float(r.interest_rate),
                r.issue_date.isoformat(),
                r.maturity_date.isoformat(),
                r.status,
                r.verification_status,
                r.days_to_maturity,
                r.remarks or ''
            ])

        return response


class FDRReleaseRequestViewSet(viewsets.ModelViewSet):
    """
    Manages security deposit release requests and official approval decisions.
    """
    serializer_class = FDRReleaseRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else ('ADMIN' if user.is_superuser else 'REVIEWER')

        qs = FDRReleaseRequest.objects.all().select_related('fdr', 'requested_by', 'reviewer')
        if role == 'INSTITUTION' and profile and profile.institution_name:
            qs = qs.filter(
                Q(fdr__institution_name__iexact=profile.institution_name.strip()) |
                Q(requested_by=user)
            )
        return qs

    @action(detail=True, methods=['post'], permission_classes=[IsReviewerOrAdmin])
    def review(self, request, pk=None):
        """
        Reviewer or Administrator approves or rejects a release request.
        """
        rel = self.get_object()
        decision = request.data.get('decision')  # 'Approved', 'Rejected', 'Under Review'
        remarks = request.data.get('reviewer_remarks', '').strip()

        if decision not in ['Approved', 'Rejected', 'Under Review']:
            return Response(
                {"error": "Decision must be 'Approved', 'Rejected', or 'Under Review'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if decision == 'Rejected' and not remarks:
            return Response(
                {"error": "Remarks are mandatory when rejecting a release request."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        with transaction.atomic():
            rel.status = decision
            rel.reviewer = request.user
            rel.reviewer_remarks = remarks
            rel.decision_date = timezone.now()
            rel.save()

            if decision == 'Approved':
                rel.fdr.status = "Released"
                rel.fdr.save()

            record_audit(
                fdr=rel.fdr,
                user=request.user,
                action=f"RELEASE_{decision.upper()}",
                details=f"Release request {decision}. Remarks: {remarks or 'None'}",
                request=request
            )

        return Response({
            "message": f"Release request marked as {decision}.",
            "release_request": FDRReleaseRequestSerializer(rel).data
        })


class FDRAlertViewSet(viewsets.ModelViewSet):
    """
    Manages notifications and alerts.
    """
    serializer_class = FDRAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        sync_alerts()
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else ('ADMIN' if user.is_superuser else 'REVIEWER')

        qs = FDRAlert.objects.all().select_related('fdr')
        if role == 'INSTITUTION' and profile and profile.institution_name:
            qs = qs.filter(
                Q(fdr__institution_name__iexact=profile.institution_name.strip()) |
                Q(fdr__created_by=user)
            )
        return qs

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save()
        return Response({"status": "marked as read"})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        qs = self.get_queryset()
        qs.update(is_read=True)
        return Response({"status": "all alerts marked as read"})

    @action(detail=False, methods=['post'])
    def sync(self, request):
        count = sync_alerts()
        return Response({"status": "synchronized", "new_alerts": count})


class FDRAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Immutable audit trail for compliance and tracking.
    """
    serializer_class = FDRAuditLogSerializer
    permission_classes = [IsReviewerOrAdmin]
    queryset = FDRAuditLog.objects.all().select_related('fdr', 'user')
