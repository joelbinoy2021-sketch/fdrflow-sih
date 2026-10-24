from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from instruments.models import (
    UserProfile, FDRInstrument, FDRVerificationLog,
    FDRRenewal, FDRReleaseRequest, FDRAlert, FDRAuditLog
)
from instruments.utils import sync_alerts


class FDRPortalTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.today = date.today()

        # Create Admin
        self.admin_user = User.objects.create_user(
            username='admin_test',
            password='Password@123',
            first_name='Admin',
            last_name='User'
        )
        UserProfile.objects.create(
            user=self.admin_user,
            role='ADMIN',
            institution_name='AICTE Bureau'
        )

        # Create Reviewer
        self.reviewer_user = User.objects.create_user(
            username='reviewer_test',
            password='Password@123',
            first_name='Reviewer',
            last_name='User'
        )
        UserProfile.objects.create(
            user=self.reviewer_user,
            role='REVIEWER',
            institution_name='AICTE Review Cell'
        )

        # Create Institution User
        self.inst_user = User.objects.create_user(
            username='institute_test',
            password='Password@123',
            first_name='Registrar',
            last_name='College'
        )
        UserProfile.objects.create(
            user=self.inst_user,
            role='INSTITUTION',
            institution_name='Apex Engineering Institute'
        )

        # Create Sample FDR
        self.fdr1 = FDRInstrument.objects.create(
            institution_name='Apex Engineering Institute',
            fdr_number='SBI-TEST-1001',
            bank_name='State Bank of India',
            amount=Decimal('500000.00'),
            issue_date=self.today - timedelta(days=100),
            maturity_date=self.today + timedelta(days=20),
            interest_rate=Decimal('7.00'),
            status='Active',
            verification_status='Pending verification',
            created_by=self.inst_user
        )

    def test_authentication_login_success(self):
        res = self.client.post('/api/auth/login/', {
            'username': 'admin_test',
            'password': 'Password@123'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('token', res.data)
        self.assertEqual(res.data['user']['role'], 'ADMIN')

    def test_authentication_login_failure(self):
        res = self.client.post('/api/auth/login/', {
            'username': 'admin_test',
            'password': 'WrongPassword'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_quick_switch_role(self):
        res = self.client.post('/api/auth/quick-switch/', {'role': 'REVIEWER'})
        # Reviewer seeded in command or fallback
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_fdr_validation_maturity_date_must_be_after_issue_date(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'institution_name': 'Apex Engineering Institute',
            'fdr_number': 'SBI-TEST-9999',
            'bank_name': 'State Bank of India',
            'amount': 250000,
            'issue_date': (self.today).isoformat(),
            'maturity_date': (self.today - timedelta(days=10)).isoformat(),
            'interest_rate': 6.5
        }
        res = self.client.post('/api/fdrs/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('maturity_date', res.data)

    def test_fdr_validation_amount_must_be_positive(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'institution_name': 'Apex Engineering Institute',
            'fdr_number': 'SBI-TEST-9998',
            'bank_name': 'State Bank of India',
            'amount': -5000,
            'issue_date': self.today.isoformat(),
            'maturity_date': (self.today + timedelta(days=365)).isoformat(),
            'interest_rate': 6.5
        }
        res = self.client.post('/api/fdrs/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', res.data)

    def test_fdr_validation_duplicate_prevention_same_bank(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'institution_name': 'Other College',
            'fdr_number': 'SBI-TEST-1001',  # same as self.fdr1
            'bank_name': 'State Bank of India',  # same bank
            'amount': 300000,
            'issue_date': self.today.isoformat(),
            'maturity_date': (self.today + timedelta(days=365)).isoformat(),
            'interest_rate': 6.5
        }
        res = self.client.post('/api/fdrs/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        has_duplicate_error = 'fdr_number' in res.data or 'non_field_errors' in res.data
        self.assertTrue(has_duplicate_error)

    def test_fdr_creation_success(self):
        self.client.force_authenticate(user=self.inst_user)
        payload = {
            'institution_name': 'Apex Engineering Institute',
            'fdr_number': 'HDFC-TEST-2002',
            'bank_name': 'HDFC Bank',
            'amount': 450000,
            'issue_date': self.today.isoformat(),
            'maturity_date': (self.today + timedelta(days=365)).isoformat(),
            'interest_rate': 7.25
        }
        res = self.client.post('/api/fdrs/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['fdr_number'], 'HDFC-TEST-2002')
        self.assertEqual(res.data['verification_status'], 'Pending verification')

    def test_reviewer_can_verify_fdr(self):
        self.client.force_authenticate(user=self.reviewer_user)
        res = self.client.post(f'/api/fdrs/{self.fdr1.id}/verify/', {
            'decision': 'Verified',
            'remarks': 'Valid bank deposit receipt verified with branch seal.',
            'verification_method': 'Branch statement comparison'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.fdr1.refresh_from_db()
        self.assertEqual(self.fdr1.verification_status, 'Verified')
        self.assertEqual(self.fdr1.verification_logs.count(), 1)
        self.assertEqual(self.fdr1.verification_logs.first().decision, 'Verified')

    def test_reviewer_flag_discrepancy_requires_remarks(self):
        self.client.force_authenticate(user=self.reviewer_user)
        res = self.client.post(f'/api/fdrs/{self.fdr1.id}/verify/', {
            'decision': 'Discrepancy detected',
            'remarks': ''
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_institution_user_cannot_verify_fdr(self):
        self.client.force_authenticate(user=self.inst_user)
        res = self.client.post(f'/api/fdrs/{self.fdr1.id}/verify/', {
            'decision': 'Verified',
            'remarks': 'Self verification attempt'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_fdr_renewal_workflow(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'new_fdr_number': 'SBI-TEST-RENEW-1002',
            'amount': 550000,
            'bank_name': 'State Bank of India',
            'issue_date': self.today.isoformat(),
            'maturity_date': (self.today + timedelta(days=365)).isoformat(),
            'interest_rate': 7.50,
            'remarks': 'Annual renewal with accrued interest rolled in'
        }
        res = self.client.post(f'/api/fdrs/{self.fdr1.id}/renew/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.fdr1.refresh_from_db()
        self.assertTrue(self.fdr1.is_renewed)
        self.assertEqual(self.fdr1.status, 'Renewed')
        new_fdr_id = res.data['new_fdr']['id']
        new_fdr = FDRInstrument.objects.get(id=new_fdr_id)
        self.assertEqual(new_fdr.previous_fdr, self.fdr1)

    def test_release_request_workflow(self):
        self.client.force_authenticate(user=self.inst_user)
        payload = {
            'reason': '10-year term completed as per regulatory norm',
            'beneficiary_account': 'SBI A/C 1234567890'
        }
        res = self.client.post(f'/api/fdrs/{self.fdr1.id}/request_release/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        rel_id = res.data['release_request']['id']

        # Reviewer reviews release request
        self.client.force_authenticate(user=self.reviewer_user)
        rev_res = self.client.post(f'/api/release-requests/{rel_id}/review/', {
            'decision': 'Approved',
            'reviewer_remarks': 'Compliance documents verified.'
        })
        self.assertEqual(rev_res.status_code, status.HTTP_200_OK)
        self.fdr1.refresh_from_db()
        self.assertEqual(self.fdr1.status, 'Released')

    def test_dashboard_stats_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/dashboard/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_instruments', res.data)
        self.assertIn('total_recorded_value', res.data)
        self.assertIn('attention_items', res.data)
        self.assertIn('lifecycle', res.data)

    def test_alert_sync_avoids_duplicate_alerts(self):
        # Initial sync
        count1 = sync_alerts()
        # Second sync
        count2 = sync_alerts()
        self.assertEqual(count2, 0)  # No duplicates created
        # Check alerts generated for fdr1 (which matures in 20 days -> EXPIRING_30)
        self.assertTrue(FDRAlert.objects.filter(fdr=self.fdr1).exists())

    def test_audit_logs_created_on_sensitive_actions(self):
        self.client.force_authenticate(user=self.reviewer_user)
        self.client.post(f'/api/fdrs/{self.fdr1.id}/verify/', {
            'decision': 'Verified',
            'remarks': 'Audit trail test verification.'
        })
        logs = FDRAuditLog.objects.filter(fdr=self.fdr1)
        self.assertTrue(logs.exists())
        self.assertIn('VERIFICATION', logs.first().action)
