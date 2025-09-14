from django.contrib import admin
from . import models

class ProjectAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "due_date", ]
    list_filter = ["status", "due_date"]
    search_fields = ["title"]
    list_per_page = 10
    list_display_links = ["title"]
    list_editable = ["status", "due_date"]

class SectionAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "order"]
    list_filter = ["project", "order"]
    search_fields = ["title"]
    list_per_page = 10
    list_display_links = ["title"]
    list_editable = ["order"]

class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "due_date", "priority"]
    list_filter = ["status", "due_date", "priority"]
    search_fields = ["title"]
    list_per_page = 10
    list_display_links = ["title"]
    list_editable = ["status", "due_date", "priority"]

class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "color"]
    list_filter = ["color"]
    search_fields = ["name"]
    list_per_page = 10
    list_display_links = ["name"]
    list_editable = ["color"]

class CommentAdmin(admin.ModelAdmin):
    list_display = ["content", "task"]
    list_filter = ["task"]
    search_fields = ["content"]
    list_per_page = 10
    list_display_links = ["content"]

admin.site.register(models.Project, ProjectAdmin)
admin.site.register(models.Section, SectionAdmin)
admin.site.register(models.Task, TaskAdmin)
admin.site.register(models.Tag, TagAdmin)
admin.site.register(models.Comment, CommentAdmin)

