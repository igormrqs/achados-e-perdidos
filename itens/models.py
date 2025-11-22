from django.db import models

# ============================================================
# Achados e Perdidos - UnDF
# Arquivo: models.py
#
# Aqui defino as estruturas principais do banco de dados.
# Tento manter os nomes em português (coerente com o domínio)
# e deixar comentários pensando em mim mesmo no futuro.
# ============================================================


class Item(models.Model):
    """
    Representa um item físico armazenado no Achados e Perdidos.
    Esse registro é controlado pela equipe interna.
    """

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

    # status atual do item dentro do fluxo interno
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Em estoque',
    )

    data_criacao = models.DateTimeField(auto_now_add=True)

    # itens cadastrados pelo site externo só aparecem para o público
    # depois que alguém da equipe marcar como aprovados.
    aprovado = models.BooleanField(default=False)

    class Meta:
        ordering = ['-data_encontrado', '-data_criacao']

    def __str__(self):
        return self.nome


class Reivindicacao(models.Model):
    """
    Requisição feita por um usuário externo dizendo:
    "acho que este item é meu".

    A ideia é registrar:
    - qual item ele está tentando recuperar;
    - quem é a pessoa;
    - como entrar em contato;
    - quais detalhes ela fornece para comprovar que o item é dela.
    """

    STATUS_CHOICES = [
        ('Pendente', 'Pendente'),
        ('Aprovada', 'Aprovada'),
        ('Recusada', 'Recusada'),
    ]

    # item alvo da reivindicação
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name='reivindicacoes',
    )

    nome_requerente = models.CharField(max_length=100)

    # pode ser email, telefone, matrícula... deixo como texto livre
    contato = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Email, telefone ou matrícula',
    )

    # aqui a pessoa descreve detalhes que comprovem que o item é dela
    detalhes = models.TextField(
        help_text='Detalhes que comprovem que o item é seu (sem ver a parte interna do item).'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Pendente',
    )

    data_envio = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_envio']

    def __str__(self):
        return f"Reivindicação de {self.nome_requerente} para {self.item.nome}"
