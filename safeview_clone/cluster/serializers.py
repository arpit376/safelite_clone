from rest_framework import serializers
from cluster.models import Cell, Scan


class CellSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Cell
        fields = ['url', 'pk', 'name', 'ip', 'username', 'password', 'port', 'profile', 'vendor']


class ScanSerializer(serializers.HyperlinkedModelSerializer):
    progress = serializers.HyperlinkedIdentityField(
        view_name='scan-progress', format='json')
    xml_report = serializers.HyperlinkedIdentityField(
        view_name='scan-xml-report', format='xml')
    json_report = serializers.HyperlinkedIdentityField(
        view_name='scan-json-report', format='json')

    class Meta:
        model = Scan
        fields = ['url', 'pk', 'name', 'target', 'cell', 'progress', 'xml_report', 'json_report']
