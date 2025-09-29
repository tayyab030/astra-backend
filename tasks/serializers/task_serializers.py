from rest_framework import serializers
from django.db import models
from tasks.models import Task, Project, Section, Tag


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model with validation and custom logic"""
    
    # Make project and title required for create/update
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    title = serializers.CharField(max_length=255)
    
    # Optional fields
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.ChoiceField(choices=Task.STATUS_CHOICES, default="incomplete", required=False)
    due_date = serializers.DateField(required=False, allow_null=True)
    priority = serializers.ChoiceField(choices=Task.PRIORITY_CHOICES, default="medium", required=False)
    section = serializers.PrimaryKeyRelatedField(queryset=Section.objects.all(), required=False, allow_null=True)
    parent_task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all(), required=False, allow_null=True)
    order = serializers.IntegerField(default=10, required=False)
    attachments = serializers.JSONField(required=False, allow_null=True)
    tags = serializers.PrimaryKeyRelatedField(queryset=Tag.objects.all(), many=True, required=False)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'due_date', 'priority',
            'project', 'section', 'parent_task', 'order', 'attachments',
            'tags', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Custom validation for Task model"""
        # Validate that section belongs to the same project
        project = data.get('project')
        section = data.get('section')
        
        if section and project:
            if section.project != project:
                raise serializers.ValidationError({
                    'section': 'Section must belong to the same project as the task.'
                })
        
        # Validate that parent_task belongs to the same project
        parent_task = data.get('parent_task')
        if parent_task and project:
            if parent_task.project != project:
                raise serializers.ValidationError({
                    'parent_task': 'Parent task must belong to the same project as the task.'
                })
        
        # Validate order uniqueness
        order = data.get('order', 10)
        if section:
            # Check uniqueness within section
            existing_task = Task.objects.filter(section=section, order=order).exclude(
                id=self.instance.id if self.instance else None
            ).first()
            if existing_task:
                raise serializers.ValidationError({
                    'order': f'Order {order} already exists in this section.'
                })
        else:
            # Check uniqueness within project (for tasks without section)
            existing_task = Task.objects.filter(project=project, section__isnull=True, order=order).exclude(
                id=self.instance.id if self.instance else None
            ).first()
            if existing_task:
                raise serializers.ValidationError({
                    'order': f'Order {order} already exists in this project for tasks without section.'
                })
        
        return data
    
    def create(self, validated_data):
        """Override create to handle order assignment"""
        # If no order is provided, find the next available order
        if 'order' not in validated_data or validated_data['order'] is None:
            project = validated_data['project']
            section = validated_data.get('section')
            
            if section:
                # Find max order in section
                max_order = Task.objects.filter(section=section).aggregate(
                    max_order=models.Max('order')
                )['max_order'] or 0
                validated_data['order'] = max_order + 10
            else:
                # Find max order in project for tasks without section
                max_order = Task.objects.filter(project=project, section__isnull=True).aggregate(
                    max_order=models.Max('order')
                )['max_order'] or 0
                validated_data['order'] = max_order + 10
        
        return super().create(validated_data)


class TaskListSerializer(serializers.ModelSerializer):
    """Simplified serializer for task lists"""
    
    project_title = serializers.CharField(source='project.title', read_only=True)
    section_title = serializers.CharField(source='section.title', read_only=True)
    tags_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'status', 'priority', 'due_date', 'order',
            'project', 'project_title', 'section', 'section_title',
            'tags_count', 'created_at', 'updated_at'
        ]
    
    def get_tags_count(self, obj):
        return obj.tags.count()


class TaskDetailSerializer(TaskSerializer):
    """Detailed serializer for task detail view"""
    
    project_title = serializers.CharField(source='project.title', read_only=True)
    section_title = serializers.CharField(source='section.title', read_only=True)
    parent_task_title = serializers.CharField(source='parent_task.title', read_only=True)
    tags_detail = serializers.SerializerMethodField()
    subtasks_count = serializers.SerializerMethodField()
    
    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + [
            'project_title', 'section_title', 'parent_task_title',
            'tags_detail', 'subtasks_count'
        ]
    
    def get_tags_detail(self, obj):
        return [{'id': tag.id, 'name': tag.name, 'color': tag.color} for tag in obj.tags.all()]
    
    def get_subtasks_count(self, obj):
        return obj.subtasks.count()
