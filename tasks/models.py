from django.db import models

from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator


class Project(models.Model):
    STATUS_CHOICES = [
        ("on_track", "On Track"),
        ("at_risk", "At Risk"),
        ("off_track", "Off Track"),
        ("on_hold", "On Hold"),
        ("complete", "Complete"),
    ]

    hex_color_validator = RegexValidator(
        regex=r'^#(?:[0-9a-fA-F]{3}){1,2}$',
        message="Color must be a valid HEX code like #RRGGBB or #RGB."
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects", null=True, blank=True)
    title = models.CharField(max_length=255)
    starred = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="on_track")
    color = models.CharField(
        max_length=7,  # "#RRGGBB" has 7 chars
        blank=True,
        null=True,
        default="#1E1E1E",  # dark gray, good for dark mode
        validators=[hex_color_validator]
    )  
    description = models.TextField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ["-created_at"]


class Section(models.Model):
    title = models.CharField(max_length=255)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="sections")
    order = models.IntegerField(default=10)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.project.title})"

    class Meta:
        unique_together = ('project', 'order')  # enforce per-project uniqueness
        ordering = ['order']


class Task(models.Model):
    STATUS_CHOICES = [
        ("incomplete", "Incomplete"),
        ("completed", "Completed"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)  # store HTML
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="incomplete")
    due_date = models.DateField(blank=True, null=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="tasks", blank=True, null=True)
    parent_task = models.ForeignKey("self", on_delete=models.CASCADE, related_name="subtasks", blank=True, null=True)

    attachments = models.JSONField(blank=True, null=True)  # store file paths or metadata as JSON

    tags = models.ManyToManyField("Tag", related_name="tasks", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ["-created_at"]


class Tag(models.Model):
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=20, blank=True, null=True)  # hex code or color name

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-created_at"]


class Comment(models.Model):
    content = models.TextField()  # store HTML comment
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment on {self.task.title} ({self.created_at:%Y-%m-%d})"

    class Meta:
        ordering = ["-created_at"]
