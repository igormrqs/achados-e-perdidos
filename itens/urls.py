from django.urls import path
from . import views

urlpatterns = [
    # Site público
    path('', views.home, name='home'),

    # Painel interno (HTML)
    path('interno/', views.internal_dashboard, name='internal_dashboard'),

    # APIs públicas de itens / blind claim
    path('api/itens/', views.item_list_create, name='item_list_create'),
    path('api/itens/<int:item_id>/', views.item_mark_returned, name='item_mark_returned'),
    path('api/itens/<int:item_id>/claim/', views.item_claim_create, name='item_claim_create'),

    # APIs internas (reivindicações)
    path(
        'api/interno/reivindicacoes/',
        views.internal_claims_list,
        name='internal_claims_list'
    ),
    path(
        'api/interno/reivindicacoes/<int:claim_id>/status/',
        views.internal_claim_update_status,
        name='internal_claim_update_status'
    ),
]
