from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'otp'

# Create a router and register our ViewSet
router = DefaultRouter()
router.register(r'', views.OTPViewSet, basename='otp')

urlpatterns = [
    path('', include(router.urls)),
]
