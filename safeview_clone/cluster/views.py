from rest_framework import viewsets
from rest_framework.decorators import detail_route
from rest_framework import renderers
from rest_framework import permissions

from django.http import HttpResponse
from cluster.models import Cell, Scan
from cluster.serializers import CellSerializer, ScanSerializer
from cluster.tools.scanner import get_progress, get_xml_report, get_json_report


class CellViewSet(viewsets.ModelViewSet):
    queryset = Cell.objects.all()
    serializer_class = CellSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)


class ScanViewSet(viewsets.ModelViewSet):
    queryset = Scan.objects.all()
    serializer_class = ScanSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    @detail_route(renderer_classes=(renderers.StaticHTMLRenderer,))
    def xml_report(self, request, *args, **kwargs):
        if get_progress(self.get_object().cell, self.get_object().scan_id) != 100.0:
            return HttpResponse('still scanning', content_type="application/json")
        else:
            _xml = get_xml_report(self.get_object().cell, self.get_object().scan_id, self.get_object().target)
            response = HttpResponse(open(_xml, 'rb'), content_type='application/xml')
            response['Content-Disposition'] = 'attachment; filename="%s.xml"' % self.get_object().target
            return response

    @detail_route(renderer_classes=(renderers.StaticHTMLRenderer,))
    def json_report(self, request, *args, **kwargs):
        if get_progress(self.get_object().cell, self.get_object().scan_id) != 100.0:
            return HttpResponse('still scanning', content_type="application/json")
        else:
            _json = get_json_report(self.get_object().cell, self.get_object().scan_id, self.get_object().target)
            response = HttpResponse(open(_json, 'rb'), content_type='application/json')
            response['Content-Disposition'] = 'attachment; filename="%s.json"' % self.get_object().target
            return response

    @detail_route(renderer_classes=(renderers.StaticHTMLRenderer,))
    def progress(self, request, *args, **kwargs):
        _progress = get_progress(self.get_object().cell, self.get_object().scan_id)
        return HttpResponse('%.2f%%' % _progress, content_type='application/json')

    def perform_create(self, serializer):
        serializer.save()
