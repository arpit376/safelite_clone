from django.contrib import admin
from cluster.models import Cell, Scan
from cluster.tools.scanner import get_progress

@admin.register(Cell)
class CellAdmin(admin.ModelAdmin):
    model = Cell
    list_display = ['name', 'ip', 'port']


class ScanAdmin(admin.ModelAdmin):
    model = Scan
    fields = [
        'name',
        'target',
        'cell',
        'scan_id',
        'progress',
        'xml_report',
        'json_report'
    ]
    readonly_fields = ['scan_id', 'progress', 'xml_report', 'json_report']
    list_display = ['name', 'target', 'xml_report', 'json_report']
    actions = ['delete_selected']

    def progress(self, obj):
        return '<a>%s%%</a>' % get_progress(obj.cell, obj.scan_id) if obj.pk else ''
    progress.allow_tags = True

    def xml_report(self, obj):
        return '<a href="/scans/%d/xml_report">XML Report</a>' % obj.pk if obj.pk else ''
    xml_report.allow_tags = True

    def json_report(self, obj):
        return '<a href="/scans/%d/json_report">JSON Report</a>' % obj.pk if obj.pk else ''
    json_report.allow_tags = True

    def delete_selected(self, request, obj):
        for o in obj.all():
            o.delete()
    delete_selected.short_description = 'Delete Selected'
