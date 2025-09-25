from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet, CustomTokenCreateView

router = DefaultRouter()
router.register(r'users', CustomUserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path("jwt/create/", CustomTokenCreateView.as_view(), name="jwt-create"),
]
