from django.urls import path, include
from . import views
from rest_framework_nested import routers

router = routers.DefaultRouter()
router.register(r"projects", views.ProjectViewSet, basename="project")
# router.register(r"sections", views.SectionViewSet, basename="section")

projects_router = routers.NestedDefaultRouter(router, r"projects", lookup="project")
projects_router.register(r"sections", views.SectionViewSet, basename="project-section")
projects_router.register(r"tasks", views.TaskViewSet, basename="project-task")

urlpatterns = [
    path(r"", include(router.urls)),
    path(r"", include(projects_router.urls)),
    # Nested routing for sections under projects
    # path("projects/<int:project_id>/sections/", views.SectionViewSet.as_view({'get': 'list', 'post': 'create'}), name="project-sections"),
    ]
# [
#     path("projects/", views.ProjectList.as_view(), name="project_list"),
#     path("projects/<int:pk>/", views.ProjectDetail.as_view(), name="project_detail"),
#     path("projects/<int:project_id>/sections/", views.section_list, name="section_list"),
#     path("sections/<int:pk>/", views.section_detail, name="section_detail"),
# ]