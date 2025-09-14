from django.urls import path
from . import views

urlpatterns = [
    path("projects/", views.project_list, name="project_list"),
    path("projects/<int:pk>/", views.project_detail, name="project_detail"),
    path("collections/", views.collection_list, name="collection_list"),
    path("collections/<int:pk>/", views.collection_detail, name="collection_detail"),
]