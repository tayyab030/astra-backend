from django.urls import path
from . import views

urlpatterns = [
    path("projects/", views.project_list, name="project_list"),
    path("projects/<int:pk>/", views.project_detail, name="project_detail"),
    path("projects/<int:project_id>/sections/", views.section_list, name="section_list"),
    path("sections/<int:pk>/", views.section_detail, name="section_detail"),
]