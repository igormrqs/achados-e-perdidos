# ============================================================
# Achados e Perdidos - UnDF
# Arquivo: views.py
#
# Eu (estudante de CC) estou centralizando aqui as views simples
# do app "itens". A ideia é manter tudo em função baseada (FBV),
# com comentários explicando as decisões.
# ============================================================

from datetime import datetime
import json

from django.http import JsonResponse, HttpResponseBadRequest
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt

from .models import Item, Reivindicacao


# Helper para manter o formato de item consistente nas APIs internas
def serialize_item(item: Item) -> dict:
    """
    Converte um objeto Item em dicionário pronto para JSON.

    Uso em:
    - lista interna de itens;
    - criação/edição interna de itens.
    """
    return {
        "id": item.id,
        "nome": item.nome,
        "status": item.status,
        "aprovado": item.aprovado,
        "local_encontrado": item.local_encontrado or "",
        "data_encontrado": item.data_encontrado.isoformat(),
        "categoria": item.categoria or "",
        "descricao": item.descricao or "",
    }


# ----------------- Páginas HTML -----------------


@ensure_csrf_cookie
def home(request):
    """
    View da página principal do site externo.

    Renderiza o template itens/index.html.
    O decorator ensure_csrf_cookie garante que o navegador receba
    o cookie 'csrftoken', que posso usar no JavaScript quando
    eu decidir ativar CSRF nas APIs.
    """
    return render(request, "itens/index.html")


@ensure_csrf_cookie
def internal_dashboard(request):
    """
    Painel interno (colaborador da UnDF).

    Nesta página vou consumir APIs internas para:
    - listar/atualizar reivindicações;
    - listar, cadastrar e editar itens.
    """
    return render(request, "itens/internal_dashboard.html")


# ----------------- API pública de itens -----------------


@csrf_exempt  # por enquanto deixo sem CSRF para simplificar o desenvolvimento
@require_http_methods(["GET", "POST"])
def item_list_create(request):
    """
    API simples para lista/criação de itens (lado público).

    GET  -> retorna itens em estoque E aprovados, em JSON.
    POST -> cria um novo item vindo de uma futura interface interna
            (hoje não usamos pelo site público).

    Fluxo atual:
    - Itens são cadastrados por servidores internos (via admin ou painel);
    - Apenas itens com aprovado=True aparecem na listagem pública.
    """
    if request.method == "GET":
        itens = (
            Item.objects
            .filter(status="Em estoque", aprovado=True)
            .order_by("-data_encontrado", "-data_criacao")
        )

        data = []
        for item in itens:
            data.append({
                "id": item.id,
                "name": item.nome,
                "location": item.local_encontrado or "",
                "date": item.data_encontrado.isoformat(),  # 'YYYY-MM-DD'
                "category": item.categoria or "",
                "description": item.descricao or "",
                "status": item.status,
            })

        return JsonResponse(data, safe=False)

    # Se chegou aqui, é POST (por causa do decorator).
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    name = body.get("name")
    location = body.get("location")
    date_str = body.get("date")  # esperado 'YYYY-MM-DD'

    if not (name and location and date_str):
        return HttpResponseBadRequest("Campos obrigatórios faltando")

    try:
        data_encontrado = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return HttpResponseBadRequest("Formato de data inválido")

    item = Item.objects.create(
        nome=name,
        local_encontrado=location,
        data_encontrado=data_encontrado,
        # status padrão já é "Em estoque"
        # aprovado=False (revisão interna antes de publicar)
        aprovado=False,
    )

    data = {
        "id": item.id,
        "nome": item.nome,
        "mensagem": "Item criado e aguardando aprovação interna.",
    }
    return JsonResponse(data, status=201)


@csrf_exempt
@require_http_methods(["DELETE"])
def item_mark_returned(request, item_id):
    """
    Marca um item como 'Devolvido' (API pública, pensada para uso futuro).

    Hoje o fluxo de devolução é feito via painel interno, pela
    internal_item_mark_returned.
    """
    item = get_object_or_404(Item, id=item_id)
    item.status = "Devolvido"
    item.save(update_fields=["status"])

    return JsonResponse({"status": "ok", "new_status": item.status})


# ----------------- API pública de Blind Claim -----------------


@csrf_exempt
@require_http_methods(["POST"])
def item_claim_create(request, item_id):
    """
    Cria uma 'Reivindicação' (Blind Claim) para um item específico.

    Fluxo:
    - usuário externo seleciona um item na lista;
    - preenche nome, vínculo, identificação, contato e detalhes;
    - a equipe interna vê essa reivindicação no admin ou no painel interno.
    """
    item = get_object_or_404(Item, id=item_id)

    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    nome = body.get("nome")
    contato = body.get("contato")
    detalhes = body.get("detalhes")
    vinculo = body.get("vinculo")
    identificacao = body.get("identificacao")

    # nome e detalhes continuam obrigatórios
    if not (nome and detalhes):
        return HttpResponseBadRequest("Campos obrigatórios faltando")

    reivindicacao = Reivindicacao.objects.create(
        item=item,
        nome_requerente=nome,
        contato=contato or "",
        detalhes=detalhes,
        vinculo=vinculo or "",
        identificacao=identificacao or "",
    )

    data = {
        "id": reivindicacao.id,
        "mensagem": "Reivindicação registrada e enviada para análise da equipe interna.",
    }
    return JsonResponse(data, status=201)


# ----------------- API interna (painel de reivindicações) -----------------


@csrf_exempt
@require_http_methods(["GET"])
def internal_claims_list(request):
    """
    Retorna todas as reivindicações, com alguns dados do item associado.

    Essa API é usada pelo painel interno para o colaborador
    visualizar as solicitações feitas pelo site público.
    """
    reivindicacoes = (
        Reivindicacao.objects
        .select_related("item")
        .order_by("-data_envio")
    )

    data = []
    for rev in reivindicacoes:
        data.append({
            "id": rev.id,
            "status": rev.status,
            "data_envio": rev.data_envio.isoformat(),
            "nome_requerente": rev.nome_requerente,
            "contato": rev.contato or "",
            "detalhes": rev.detalhes,
            "vinculo": rev.vinculo or "",
            "identificacao": rev.identificacao or "",
            "item": {
                "id": rev.item.id,
                "nome": rev.item.nome,
                "local_encontrado": rev.item.local_encontrado or "",
                "data_encontrado": rev.item.data_encontrado.isoformat(),
                "status": rev.item.status,
                "aprovado": rev.item.aprovado,
            },
        })

    return JsonResponse(data, safe=False)


@csrf_exempt
@require_http_methods(["POST"])
def internal_claim_update_status(request, claim_id):
    """
    Atualiza o status de uma reivindicação via painel interno.

    Se a reivindicação for marcada como 'Aprovada', atualizo também
    o status do item para 'Reivindicado'.
    """
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    new_status = body.get("status")

    valid_status = {choice[0] for choice in Reivindicacao.STATUS_CHOICES}
    if new_status not in valid_status:
        return HttpResponseBadRequest("Status inválido")

    rev = get_object_or_404(Reivindicacao, id=claim_id)
    rev.status = new_status
    rev.save(update_fields=["status"])

    # se aprovado, atualizo item
    item = rev.item
    if new_status == "Aprovada":
        item.status = "Reivindicado"
        item.save(update_fields=["status"])

    return JsonResponse({
        "id": rev.id,
        "status": rev.status,
        "item_status": item.status,
    })


# ----------------- API interna (itens) -----------------


@csrf_exempt
@require_http_methods(["GET"])
def internal_items_list(request):
    """
    Retorna todos os itens cadastrados para uso interno no painel.

    Aqui não filtro por status ou aprovação, deixo a filtragem
    para o JavaScript no painel interno.
    """
    itens = Item.objects.order_by("-data_encontrado", "-data_criacao")
    data = [serialize_item(item) for item in itens]
    return JsonResponse(data, safe=False)


@csrf_exempt
@require_http_methods(["POST"])
def internal_item_create(request):
    """
    Uso interno: cadastra um novo item via painel.

    Campos esperados (JSON):
    - nome (obrigatório)
    - local_encontrado (obrigatório)
    - data_encontrado (obrigatório, 'YYYY-MM-DD')
    - categoria (opcional)
    - descricao (opcional)
    - aprovado (opcional, bool)
    """
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    nome = (body.get("nome") or "").strip()
    local_encontrado = (body.get("local_encontrado") or "").strip()
    data_str = (body.get("data_encontrado") or "").strip()

    if not (nome and local_encontrado and data_str):
        return HttpResponseBadRequest("Campos obrigatórios faltando")

    try:
        data_encontrado = datetime.strptime(data_str, "%Y-%m-%d").date()
    except ValueError:
        return HttpResponseBadRequest("Formato de data inválido")

    categoria = (body.get("categoria") or "").strip()
    descricao = (body.get("descricao") or "").strip()
    aprovado_raw = body.get("aprovado")

    if isinstance(aprovado_raw, bool):
        aprovado = aprovado_raw
    else:
        aprovado = False

    item = Item.objects.create(
        nome=nome,
        local_encontrado=local_encontrado,
        data_encontrado=data_encontrado,
        categoria=categoria or None,
        descricao=descricao or None,
        aprovado=aprovado,
        # status padrão é "Em estoque"
    )

    return JsonResponse(serialize_item(item), status=201)


@csrf_exempt
@require_http_methods(["POST"])
def internal_item_update(request, item_id):
    """
    Uso interno: edita campos de um item existente.

    Aceita JSON parcial. Campos aceitos:
    - nome
    - local_encontrado
    - data_encontrado
    - categoria
    - descricao
    - aprovado (bool)
    """
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    item = get_object_or_404(Item, id=item_id)

    if "nome" in body:
        nome = (body.get("nome") or "").strip()
        if nome:
            item.nome = nome

    if "local_encontrado" in body:
        local_encontrado = (body.get("local_encontrado") or "").strip()
        if local_encontrado:
            item.local_encontrado = local_encontrado

    if "data_encontrado" in body:
        data_str = (body.get("data_encontrado") or "").strip()
        if data_str:
            try:
                item.data_encontrado = datetime.strptime(data_str, "%Y-%m-%d").date()
            except ValueError:
                return HttpResponseBadRequest("Formato de data inválido")

    if "categoria" in body:
        categoria = (body.get("categoria") or "").strip()
        item.categoria = categoria or None

    if "descricao" in body:
        descricao = (body.get("descricao") or "").strip()
        item.descricao = descricao or None

    if "aprovado" in body:
        aprovado_raw = body.get("aprovado")
        if isinstance(aprovado_raw, bool):
            item.aprovado = aprovado_raw

    item.save()
    return JsonResponse(serialize_item(item))


@csrf_exempt
@require_http_methods(["POST"])
def internal_item_mark_returned(request, item_id):
    """
    Uso interno: marca um item como 'Devolvido' quando o bem é
    efetivamente entregue ao dono.
    """
    item = get_object_or_404(Item, id=item_id)
    item.status = "Devolvido"
    item.save(update_fields=["status"])

    return JsonResponse({
        "id": item.id,
        "status": item.status,
    })


@csrf_exempt
@require_http_methods(["POST"])
def internal_item_back_to_stock(request, item_id):
    """
    Uso interno: volta um item para 'Em estoque' em caso de erro.

    Exemplo de uso:
    - colaborador aprovou uma reivindicação errada;
    - depois ajusta o status da reivindicação e, se necessário,
      volta o item para 'Em estoque' manualmente.
    """
    item = get_object_or_404(Item, id=item_id)
    item.status = "Em estoque"
    item.save(update_fields=["status"])

    return JsonResponse({
        "id": item.id,
        "status": item.status,
    })
