from django.urls import path, include
from . import views
from rest_framework.routers import SimpleRouter

router = SimpleRouter()
router.register(r"projects", views.ProjectViewSet, basename="project")
# router.register(r"sections", views.SectionViewSet, basename="section")
# router.register(r"tasks", views.TaskViewSet, basename="task")
# router.register(r"tags", views.TagViewSet, basename="tag")

urlpatterns = [
    path(r"", include(router.urls)),
    ]
# [
#     path("projects/", views.ProjectList.as_view(), name="project_list"),
#     path("projects/<int:pk>/", views.ProjectDetail.as_view(), name="project_detail"),
#     path("projects/<int:project_id>/sections/", views.section_list, name="section_list"),
#     path("sections/<int:pk>/", views.section_detail, name="section_detail"),
# ]