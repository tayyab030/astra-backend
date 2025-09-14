from django.urls import path
from . import views

urlpatterns = [
    path("projects/", views.project_list, name="project_list"),
    path("projects/<int:pk>/", views.project_detail, name="project_detail"),
    path("projects/<int:project_id>/collections/", views.section_list, name="section_list"),
    path("collections/<int:pk>/", views.section_detail, name="section_detail"),
]