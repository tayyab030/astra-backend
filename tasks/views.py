from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q, Case, When, IntegerField
from tasks.serializers.project_serializers import ProjectSerializer
from tasks.models import Project, Task, Section
from tasks.serializers.section_serializers import SectionSerializer
from tasks.serializers.task_serializers import TaskSerializer, TaskListSerializer, TaskDetailSerializer
from core.utils import APIResponse, format_serializer_errors

# all projects api
# this viewset is used to create, retrieve, update and delete projects
class ProjectViewSet(ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter projects by authenticated user"""
        return Project.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Automatically set the user when creating a project"""
        serializer.save(user=self.request.user)

    def get_serializer_context(self):
        return {'request': self.request}
    
    def list(self, request, *args, **kwargs):
        """Override list to use standardized response"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(
            data=serializer.data,
            message="Projects retrieved successfully"
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to use standardized response"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return APIResponse.success(
                data=serializer.data,
                message="Project retrieved successfully"
            )
        except NotFound:
            return APIResponse.not_found(
                message="Project not found",
                resource="Project"
            )
    
    def create(self, request, *args, **kwargs):
        """Override create to use standardized response"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return APIResponse.created(
                data=serializer.data,
                message="Project created successfully"
            )
        return APIResponse.validation_error(
            errors=format_serializer_errors(serializer.errors),
            message="Project creation failed"
        )
    
    def update(self, request, *args, **kwargs):
        """Override update to use standardized response"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
            if serializer.is_valid():
                serializer.save()
                return APIResponse.updated(
                    data=serializer.data,
                    message="Project updated successfully"
                )
            return APIResponse.validation_error(
                errors=format_serializer_errors(serializer.errors),
                message="Project update failed"
            )
        except NotFound:
            return APIResponse.not_found(
                message="Project not found",
                resource="Project"
            )
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to use standardized response"""
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return APIResponse.deleted(
                message="Project deleted successfully"
            )
        except NotFound:
            return APIResponse.not_found(
                message="Project not found",
                resource="Project"
            )
    
# all sections api
class SectionViewSet(ModelViewSet):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter sections by project_id from nested URL and ensure project belongs to authenticated user"""
        project_id = self.kwargs.get('project_pk')  # Nested router uses 'project_pk'
        if project_id:
            # Validate that project_id is a valid integer
            try:
                project_id = int(project_id)
            except (ValueError, TypeError):
                raise NotFound("Invalid project ID. Expected a number.")
            
            # Validate that the project exists and belongs to the authenticated user
            project = get_object_or_404(Project, id=project_id, user=self.request.user)
            return Section.objects.filter(project_id=project_id).order_by('order')
        return Section.objects.none()  # Return empty queryset if no project_id
    
    def get_serializer_context(self):
        """Add request context and project_id to serializer"""
        context = {'request': self.request}
        project_id = self.kwargs.get('project_pk')  # Nested router uses 'project_pk'
        if project_id:
            # Validate that project_id is a valid integer
            try:
                project_id = int(project_id)
                context['project_id'] = project_id
            except (ValueError, TypeError):
                # Let the serializer handle the validation error
                pass
        return context
    
    def list(self, request, *args, **kwargs):
        """Override list to use standardized response"""
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse.success(
                data=serializer.data,
                message="Sections retrieved successfully"
            )
        except NotFound as e:
            return APIResponse.error(
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to use standardized response"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return APIResponse.success(
                data=serializer.data,
                message="Section retrieved successfully"
            )
        except NotFound:
            return APIResponse.not_found(
                message="Section not found",
                resource="Section"
            )
    
    def create(self, request, *args, **kwargs):
        """Override create to use standardized response"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return APIResponse.created(
                data=serializer.data,
                message="Section created successfully"
            )
        return APIResponse.validation_error(
            errors=format_serializer_errors(serializer.errors),
            message="Section creation failed"
        )
    
    def update(self, request, *args, **kwargs):
        """Override update to use standardized response"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
            if serializer.is_valid():
                serializer.save()
                return APIResponse.updated(
                    data=serializer.data,
                    message="Section updated successfully"
                )
            return APIResponse.validation_error(
                errors=format_serializer_errors(serializer.errors),
                message="Section update failed"
            )
        except NotFound:
            return APIResponse.not_found(
                message="Section not found",
                resource="Section"
            )
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to use standardized response"""
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return APIResponse.deleted(
                message="Section deleted successfully"
            )
        except NotFound:
            return APIResponse.not_found(
                message="Section not found",
                resource="Section"
            )


class TaskViewSet(ModelViewSet):
    """ViewSet for Task CRUD operations with custom ordering and filtering"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return TaskListSerializer
        elif self.action == 'retrieve':
            return TaskDetailSerializer
        return TaskSerializer
    
    def get_queryset(self):
        """Filter tasks by project_id and implement custom ordering"""
        project_id = self.kwargs.get('project_pk')
        
        if not project_id:
            return Task.objects.none()
        
        # Validate that project_id is a valid integer
        try:
            project_id = int(project_id)
        except (ValueError, TypeError):
            raise NotFound("Invalid project ID. Expected a number.")
        
        # Validate that the project exists and belongs to the authenticated user
        project = get_object_or_404(Project, id=project_id, user=self.request.user)
        
        # Get all tasks for this project
        queryset = Task.objects.filter(project_id=project_id)
        
        # Custom ordering logic:
        # 1. Tasks without section come first (ordered by their order field)
        # 2. Then tasks with sections (ordered by section order, then task order)
        queryset = queryset.annotate(
            section_order=Case(
                When(section__isnull=True, then=0),
                default='section__order',
                output_field=IntegerField()
            )
        ).order_by('section_order', 'order', '-created_at')
        
        return queryset
    
    def get_serializer_context(self):
        """Add request context and project_id to serializer"""
        context = {'request': self.request}
        project_id = self.kwargs.get('project_pk')
        if project_id:
            try:
                project_id = int(project_id)
                context['project_id'] = project_id
            except (ValueError, TypeError):
                pass
        return context
    
    def perform_create(self, serializer):
        """Automatically set the project when creating a task"""
        project_id = self.kwargs.get('project_pk')
        if project_id:
            try:
                project_id = int(project_id)
                project = get_object_or_404(Project, id=project_id, user=self.request.user)
                serializer.save(project=project)
            except (ValueError, TypeError):
                raise NotFound("Invalid project ID.")
    
    def list(self, request, *args, **kwargs):
        """Override list to use standardized response"""
        project_id = self.kwargs.get('project_pk')
        if not project_id:
            return APIResponse.error(
                message="Project ID is required",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse.success(
                data=serializer.data,
                message="Tasks retrieved successfully"
            )
        except NotFound as e:
            return APIResponse.error(
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def create(self, request, *args, **kwargs):
        """Override create to use standardized response"""
        project_id = self.kwargs.get('project_pk')
        if not project_id:
            return APIResponse.error(
                message="Project ID is required",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return APIResponse.created(
                data=serializer.data,
                message="Task created successfully"
            )
        return APIResponse.validation_error(
            errors=format_serializer_errors(serializer.errors),
            message="Task creation failed"
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to use standardized response"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return APIResponse.success(
                data=serializer.data,
                message="Task retrieved successfully"
            )
        except NotFound:
            return APIResponse.not_found(
                message="Task not found",
                resource="Task"
            )
    
    def update(self, request, *args, **kwargs):
        """Override update to use standardized response"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
            if serializer.is_valid():
                serializer.save()
                return APIResponse.updated(
                    data=serializer.data,
                    message="Task updated successfully"
                )
            return APIResponse.validation_error(
                errors=format_serializer_errors(serializer.errors),
                message="Task update failed"
            )
        except NotFound:
            return APIResponse.not_found(
                message="Task not found",
                resource="Task"
            )
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to use standardized response"""
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return APIResponse.deleted(
                message="Task deleted successfully"
            )
        except NotFound:
            return APIResponse.not_found(
                message="Task not found",
                resource="Task"
            )
