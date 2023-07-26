from django.conf.urls import url

from safeviewservice import views
from rest_framework.urlpatterns import format_suffix_patterns

urlpatterns = [
    url(r'^$', views.SafeviewView.as_view(), name='index'),
    url(r'^systems/$', views.SystemList.as_view()),
    url(r'^toggle/$', views.toggle_data_collection, name='toggle'),
    url(r'^scan/$', views.ajax_scan_host, name='scan'),
    url(r'^scan_all/$', views.ajax_scan_all, name='scan_all'),
    url(r'^update_file/$', views.ajax_update_file, name='update_file'),
    url(r'^delete_file/$', views.ajax_delete_file, name='delete_file'),
    url(r'^upload_file/$', views.upload_file, name='upload_file'),
    url(r'^network_discovery/$', views.network_discovery, name='network_discovery'),
    url(r'^delete/$', views.ajax_delete_harm, name='delete'),
    url(r'^systems/(?P<system_id>[a-zA-Z0-9_]+)/$', views.SystemDetail.as_view()),
    url(r'^harms/(?P<system_id>[a-zA-Z0-9_]+)/(?P<harm_id>[a-zA-Z0-9_]+)/$', views.HarmDetail.as_view()),
]

urlpatterns = format_suffix_patterns(urlpatterns)
