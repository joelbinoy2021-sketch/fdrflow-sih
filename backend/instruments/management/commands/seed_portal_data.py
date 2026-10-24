from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from instruments.models import (
    UserProfile, FDRInstrument, FDRVerificationLog,
    FDRRenewal, FDRReleaseRequest, FDRAlert, FDRAuditLog
)


class Command(BaseCommand):
    help = 'Seeds portal demo users and realistic FDR records for SIH demonstration'

    def handle(self, *args, **options):
        self.stdout.write("Seeding users and profiles...")
        
        # 1. Admin user
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@aicte-fdrflow.gov.in',
                'first_name': 'Ananya',
                'last_name': 'Ramesh',
                'is_staff': True,
                'is_superuser': True
            }
        )
        admin_user.set_password('Admin@12345')
        admin_user.save()
        UserProfile.objects.update_or_create(
            user=admin_user,
            defaults={
                'role': 'ADMIN',
                'institution_name': 'Regulation Bureau (AICTE HQ)',
                'designation': 'Director (Approval & Security)',
                'phone': '+91 11 2958 1000'
            }
        )

        # 2. Reviewer user
        reviewer_user, _ = User.objects.get_or_create(
            username='reviewer',
            defaults={
                'email': 'reviewer@aicte-fdrflow.gov.in',
                'first_name': 'Sanjay',
                'last_name': 'Verma',
                'is_staff': True,
                'is_superuser': False
            }
        )
        reviewer_user.set_password('Reviewer@12345')
        reviewer_user.save()
        UserProfile.objects.update_or_create(
            user=reviewer_user,
            defaults={
                'role': 'REVIEWER',
                'institution_name': 'Regulation Bureau - Verification Cell',
                'designation': 'Senior Verification Officer',
                'phone': '+91 11 2958 1024'
            }
        )

        # 3. Institution user
        inst_user, _ = User.objects.get_or_create(
            username='institute',
            defaults={
                'email': 'registrar@nvit.ac.in',
                'first_name': 'Prof. K.',
                'last_name': 'Natarajan',
                'is_staff': False,
                'is_superuser': False
            }
        )
        inst_user.set_password('Institute@12345')
        inst_user.save()
        UserProfile.objects.update_or_create(
            user=inst_user,
            defaults={
                'role': 'INSTITUTION',
                'institution_name': 'North Valley Institute of Technology',
                'designation': 'Registrar / Authorized Signatory',
                'phone': '+91 80 2345 6789'
            }
        )

        # 4. Another Institution user for multi-tenancy verification
        inst2_user, _ = User.objects.get_or_create(
            username='crescent',
            defaults={
                'email': 'finance@crescent.edu.in',
                'first_name': 'Rahul',
                'last_name': 'Nair',
                'is_staff': False,
                'is_superuser': False
            }
        )
        inst2_user.set_password('Crescent@12345')
        inst2_user.save()
        UserProfile.objects.update_or_create(
            user=inst2_user,
            defaults={
                'role': 'INSTITUTION',
                'institution_name': 'Crescent College of Engineering',
                'designation': 'Finance Controller',
                'phone': '+91 44 2233 4455'
            }
        )

        self.stdout.write("Seeding FDR records...")
        today = date.today()

        sample_fdrs = [
            {
                'institution_name': 'North Valley Institute of Technology',
                'fdr_number': 'SBI-FD-873401',
                'bank_name': 'State Bank of India',
                'amount': Decimal('500000.00'),
                'issue_date': today - timedelta(days=330),
                'maturity_date': today + timedelta(days=5),
                'interest_rate': Decimal('6.75'),
                'status': 'Active',
                'verification_status': 'Verified',
                'created_by': inst_user,
                'remarks': 'Initial approval security deposit for Engineering block B',
            },
            {
                'institution_name': 'Crescent College of Engineering',
                'fdr_number': 'CB-FD-449821',
                'bank_name': 'Canara Bank',
                'amount': Decimal('750000.00'),
                'issue_date': today - timedelta(days=190),
                'maturity_date': today + timedelta(days=7),
                'interest_rate': Decimal('7.10'),
                'status': 'Active',
                'verification_status': 'Pending verification',
                'created_by': inst2_user,
                'remarks': 'Annual compliance security deposit 2026',
            },
            {
                'institution_name': 'Lakeview Institute of Technology',
                'fdr_number': 'FB-FD-102783',
                'bank_name': 'Federal Bank',
                'amount': Decimal('400000.00'),
                'issue_date': today - timedelta(days=370),
                'maturity_date': today - timedelta(days=4),
                'interest_rate': Decimal('6.50'),
                'status': 'Matured',
                'verification_status': 'Verified',
                'created_by': None,
                'remarks': 'Instrument past maturity date; institution notified for renewal',
            },
            {
                'institution_name': 'Western Technical Campus',
                'fdr_number': 'HDFC-FD-552107',
                'bank_name': 'HDFC Bank',
                'amount': Decimal('1000000.00'),
                'issue_date': today - timedelta(days=120),
                'maturity_date': today + timedelta(days=185),
                'interest_rate': Decimal('7.25'),
                'status': 'Active',
                'verification_status': 'Verified',
                'created_by': None,
                'remarks': 'Fixed deposit receipt for AICTE mandatory endowment fund',
            },
            {
                'institution_name': 'Greenfield School of Engineering',
                'fdr_number': 'UBI-FD-774920',
                'bank_name': 'Union Bank of India',
                'amount': Decimal('600000.00'),
                'issue_date': today - timedelta(days=90),
                'maturity_date': today + timedelta(days=30),
                'interest_rate': Decimal('6.80'),
                'status': 'Active',
                'verification_status': 'Discrepancy detected',
                'created_by': None,
                'remarks': 'Discrepancy: Issuing branch IFSC code in receipt does not match branch seal',
            },
            {
                'institution_name': 'Metro Institute of Applied Sciences',
                'fdr_number': 'PNB-FD-990183',
                'bank_name': 'Punjab National Bank',
                'amount': Decimal('350000.00'),
                'issue_date': today - timedelta(days=60),
                'maturity_date': today + timedelta(days=240),
                'interest_rate': Decimal('6.60'),
                'status': 'Active',
                'verification_status': 'Pending verification',
                'created_by': None,
                'remarks': 'New PG course introduction deposit',
            },
            {
                'institution_name': 'Pioneer College of Technology',
                'fdr_number': 'BOB-FD-337192',
                'bank_name': 'Bank of Baroda',
                'amount': Decimal('850000.00'),
                'issue_date': today - timedelta(days=410),
                'maturity_date': today - timedelta(days=18),
                'interest_rate': Decimal('6.90'),
                'status': 'Renewal required',
                'verification_status': 'Verified',
                'created_by': None,
                'remarks': 'Renewal overdue by 18 days. Renewal reminder alert generated.',
            },
        ]

        created_fdr_objs = []
        for item in sample_fdrs:
            fdr, created = FDRInstrument.objects.update_or_create(
                bank_name=item['bank_name'],
                fdr_number=item['fdr_number'],
                defaults=item
            )
            created_fdr_objs.append(fdr)

        # Verification logs
        sbi_fdr = FDRInstrument.objects.filter(fdr_number='SBI-FD-873401').first()
        if sbi_fdr and not sbi_fdr.verification_logs.exists():
            FDRVerificationLog.objects.create(
                fdr=sbi_fdr,
                reviewer=reviewer_user,
                decision='Verified',
                remarks='Physical bank confirmation copy and AICTE joint lien verified against branch statement.',
                verification_method='Manual Bureau Verification (Branch statement cross-checked)'
            )

        ubi_fdr = FDRInstrument.objects.filter(fdr_number='UBI-FD-774920').first()
        if ubi_fdr and not ubi_fdr.verification_logs.exists():
            FDRVerificationLog.objects.create(
                fdr=ubi_fdr,
                reviewer=reviewer_user,
                decision='Discrepancy detected',
                remarks='Lien clause missing AICTE designation and IFSC mismatch on voucher.',
                verification_method='Manual Bureau Verification'
            )

        # Release requests
        if sbi_fdr and not sbi_fdr.release_requests.exists():
            FDRReleaseRequest.objects.create(
                fdr=sbi_fdr,
                requested_by=inst_user,
                reason='Mandatory 10-year lock-in period successfully completed. Course approval fulfilled.',
                beneficiary_account='A/C: 987654321012, IFSC: SBIN0001234, North Valley Trust',
                status='Pending',
            )

        # Audit logs
        if not FDRAuditLog.objects.exists():
            FDRAuditLog.objects.create(
                fdr=sbi_fdr,
                user=admin_user,
                user_repr='Ananya Ramesh (Admin)',
                action='PORTAL_INITIALIZATION',
                details='FDRFLOW portal database initialized with security verification rules.'
            )
            if ubi_fdr:
                FDRAuditLog.objects.create(
                    fdr=ubi_fdr,
                    user=reviewer_user,
                    user_repr='Sanjay Verma (Reviewer)',
                    action='DISCREPANCY_FLAGGED',
                    details='Lien clause missing AICTE designation and IFSC mismatch flagged on BOB-FD-774920.'
                )

        # Alerts generation
        self.stdout.write("Synchronizing alerts...")
        from instruments.utils import sync_alerts
        sync_alerts()

        self.stdout.write(self.style.SUCCESS('Successfully seeded database with prototype users and instruments.'))
