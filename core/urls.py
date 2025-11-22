from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('itens.urls')),  # manda as rotas raiz pro app "itens"
]
