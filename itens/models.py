from django.db import models

# Create your models here.

class Item(models.Model):
    STATUS_CHOICES = [
        ('Em estoque', 'Em estoque'),
        ('Reivindicado', 'Reivindicado'),
        ('Devolvido', 'Devolvido'),
    ]

    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True, null=True)
    categoria = models.CharField(max_length=50, blank=True, null=True)
    local_encontrado = models.CharField(max_length=100, blank=True, null=True)
    data_encontrado = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Em estoque')
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome