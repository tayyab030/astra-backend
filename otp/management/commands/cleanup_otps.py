from django.core.management.base import BaseCommand
from otp.utils import cleanup_expired_otps


class Command(BaseCommand):
    help = 'Clean up expired OTPs from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        if options['dry_run']:
            from otp.models import OTP
            from django.utils import timezone
            from datetime import timedelta
            
            cutoff_time = timezone.now() - timedelta(hours=24)
            expired_otps = OTP.objects.filter(created_at__lt=cutoff_time)
            count = expired_otps.count()
            
            self.stdout.write(
                self.style.WARNING(f'Would delete {count} expired OTPs')
            )
        else:
            count = cleanup_expired_otps()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {count} expired OTPs')
            )
