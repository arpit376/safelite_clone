"""safeviewserver URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import include, url
from django.contrib import admin
from rest_framework.routers import DefaultRouter

from safeviewservice import views as safeviewviews
from cluster import views as clusterviews


router = DefaultRouter(schema_title='Safelite')
router.register(r'users', safeviewviews.UserViewSet)
router.register(r'cells', clusterviews.CellViewSet)
router.register(r'scans', clusterviews.ScanViewSet)

urlpatterns = [
    url(r'^', include(admin.site.urls)),
    url(r'^safeview/', include('safeviewservice.urls')),
]
