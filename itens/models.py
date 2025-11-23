from django.db import models


class Item(models.Model):
    STATUS_CHOICES = [
        ("Em estoque", "Em estoque"),
        ("Reivindicado", "Reivindicado"),
        ("Devolvido", "Devolvido"),
    ]

    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True, null=True)
    categoria = models.CharField(max_length=50, blank=True, null=True)
    local_encontrado = models.CharField(max_length=100, blank=True, null=True)
    data_encontrado = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Em estoque",
    )
    aprovado = models.BooleanField(
        default=False,
        help_text="Se marcado, o item aparece na listagem pública.",
    )
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class Reivindicacao(models.Model):
    STATUS_CHOICES = [
        ("Pendente", "Pendente"),
        ("Aprovada", "Aprovada"),
        ("Recusada", "Recusada"),
    ]

    VINCULO_CHOICES = [
        ("Estudante", "Estudante"),
        ("Servidor", "Servidor"),
        ("Terceirizado", "Terceirizado"),
        ("Visitante", "Visitante"),
        ("Outro", "Outro"),
    ]

    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name="reivindicacoes",
    )

    nome_requerente = models.CharField(max_length=120)

    # novos campos mais estruturados
    vinculo = models.CharField(
        max_length=20,
        choices=VINCULO_CHOICES,
        blank=True,
        null=True,
    )
    identificacao = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Ex.: matrícula, SIAPE, RG etc.",
    )

    contato = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        help_text="E-mail ou telefone para contato.",
    )

    detalhes = models.TextField(
        help_text="Detalhes que comprovam que o item é do requerente."
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="Pendente",
    )

    data_envio = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome_requerente} - {self.item.nome}"
